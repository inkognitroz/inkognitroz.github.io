#!/bin/bash
set -euo pipefail

APP="MMIR Local Connector"
HOST="127.0.0.1"
PORT="${MMIR_LOCAL_CONNECTOR_PORT:-3000}"
OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434}"
MMIR_SITE="${MMIR_SITE:-https://mmir.ai/#connect-options}"
ROOT="$HOME/Library/Application Support/MMIR Local Connector"
NODE_DIR="$ROOT/node"
SERVER="$ROOT/server.mjs"
TOKEN_FILE="$ROOT/pairing-token"
MODEL_FILE="$ROOT/default-model"
LOG_DIR="$HOME/Library/Logs/MMIR Local Connector"
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST="$PLIST_DIR/ai.mmir.local-connector.plist"

log(){ printf "\n==> %s\n" "$1"; }
fail(){ printf "\n%s\n" "Install failed: $1" >&2; exit 1; }
exists(){ command -v "$1" >/dev/null 2>&1; }

[ "$(uname -s)" = "Darwin" ] || fail "this installer is for macOS."
mkdir -p "$ROOT" "$LOG_DIR" "$PLIST_DIR"

node_major(){ "$1" -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || printf 0; }
node_arch(){ case "$(uname -m)" in arm64) printf arm64;; x86_64) printf x64;; *) fail "unsupported Mac architecture: $(uname -m)";; esac; }
latest_node(){ curl -fsSL https://nodejs.org/dist/index.json | awk -F'"' '/"lts":[[:space:]]*"/ { print $4; exit }'; }

ensure_node(){
  if exists node && [ "$(node_major "$(command -v node)")" -ge 20 ]; then NODE_BIN="$(command -v node)"; return; fi
  if [ -x "$NODE_DIR/bin/node" ] && [ "$(node_major "$NODE_DIR/bin/node")" -ge 20 ]; then NODE_BIN="$NODE_DIR/bin/node"; return; fi
  local version arch archive temp
  version="$(latest_node || true)"; [ -n "$version" ] || version="v22.21.1"
  arch="$(node_arch)"; archive="node-${version}-darwin-${arch}.tar.xz"; temp="$(mktemp -d)"
  log "Installing private Node.js runtime $version"
  curl -fL --progress-bar "https://nodejs.org/dist/${version}/${archive}" -o "$temp/$archive"
  rm -rf "$NODE_DIR"; mkdir -p "$NODE_DIR"
  tar -xJf "$temp/$archive" -C "$NODE_DIR" --strip-components 1
  rm -rf "$temp"
  NODE_BIN="$NODE_DIR/bin/node"
}

find_ollama(){
  if exists ollama; then command -v ollama; return; fi
  if [ -x /Applications/Ollama.app/Contents/Resources/ollama ]; then printf /Applications/Ollama.app/Contents/Resources/ollama; return; fi
  return 1
}
ollama_ready(){ curl -fsS --max-time 2 "$OLLAMA_URL/api/version" >/dev/null 2>&1; }

ensure_ollama(){
  if ! OLLAMA_BIN="$(find_ollama)"; then
    log "Installing Ollama"
    curl -fsSL https://ollama.com/install.sh | sh
    OLLAMA_BIN="$(find_ollama)" || fail "Ollama installed but the CLI was not found."
  fi
  if ! ollama_ready; then
    log "Starting Ollama"
    [ -d /Applications/Ollama.app ] && open -gj -a Ollama || true
    ollama_ready || ("$OLLAMA_BIN" serve >>"$LOG_DIR/ollama.log" 2>&1 &)
  fi
  for _ in $(seq 1 30); do ollama_ready && return; sleep 1; done
  fail "Ollama did not become ready on $OLLAMA_URL."
}

recommended_model(){
  local bytes gb
  bytes="$(sysctl -n hw.memsize 2>/dev/null || printf 0)"; gb=$((bytes/1024/1024/1024))
  if [ "$gb" -ge 16 ]; then printf llama3.2:3b; elif [ "$gb" -ge 8 ]; then printf llama3.2:1b; else printf qwen2.5:0.5b; fi
}

ensure_model(){
  local model
  model="${MMIR_MODEL:-$(recommended_model)}"; printf "%s\n" "$model" > "$MODEL_FILE"
  if [ "${MMIR_SKIP_MODEL_PULL:-false}" = true ]; then log "Skipping model download"; return; fi
  if "$OLLAMA_BIN" list 2>/dev/null | awk '{print $1}' | grep -Fxq "$model"; then log "Starter model already installed: $model"; return; fi
  log "Downloading starter model: $model"
  "$OLLAMA_BIN" pull "$model"
}

write_server(){
  if [ ! -s "$TOKEN_FILE" ]; then "$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url")+"\n")' > "$TOKEN_FILE"; chmod 600 "$TOKEN_FILE"; fi
  cat > "$SERVER" <<'SERVER_JS'
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
const HOST=process.env.HOST||'127.0.0.1';
const PORT=Number(process.env.PORT||3000);
const OLLAMA_URL=(process.env.OLLAMA_URL||'http://127.0.0.1:11434').replace(/\/$/,'');
const TOKEN=fs.readFileSync(process.env.MMIR_PAIRING_TOKEN_FILE,'utf8').trim();
const MODEL=fs.readFileSync(process.env.MMIR_DEFAULT_MODEL_FILE,'utf8').trim()||'llama3.2:1b';
const allowed=new Set(['https://mmir.ai','https://www.mmir.ai','https://inkognitroz.github.io','http://localhost:3000','http://127.0.0.1:3000','http://localhost:5173','http://127.0.0.1:5173']);
function okOrigin(o){return !o||allowed.has(o)||/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(o)}
function cors(o){return {'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization,x-mmir-local-token','access-control-allow-origin':okOrigin(o)?(o||'https://mmir.ai'):'null'}}
function send(res,code,obj,o,type='application/json; charset=utf-8'){res.writeHead(code,{'content-type':type,'cache-control':'no-store',...cors(o)});res.end(type.startsWith('application/json')?JSON.stringify(obj):obj)}
function err(res,code,message,o){send(res,code,{error:{code:code===401?'unauthorized':'runtime_unavailable',message}},o)}
function token(req){const h=req.headers['x-mmir-local-token'];if(typeof h==='string'&&h.trim())return h.trim();const m=String(req.headers.authorization||'').match(/^Bearer\s+(.+)$/i);return m?m[1].trim():''}
function paired(req,res,o){const supplied=token(req);if(!supplied||supplied.length!==TOKEN.length){err(res,401,'Pair with this local connector before using models or chat.',o);return false}const yes=crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(TOKEN));if(!yes)err(res,401,'Pair with this local connector before using models or chat.',o);return yes}
function body(req){return new Promise((resolve,reject)=>{let s='';req.on('data',c=>{s+=c;if(Buffer.byteLength(s)>512*1024){reject(new Error('Request body is too large.'));req.destroy()}});req.on('end',()=>{try{resolve(s?JSON.parse(s):{})}catch{reject(new Error('Invalid JSON.'))}});req.on('error',reject)})}
function hardware(){const gb=Math.round(os.totalmem()/1024/1024/1024);return {platform:os.platform(),arch:os.arch(),cpu_count:os.cpus().length,memory_gb:gb,memory_tier:gb>=48?'workstation':gb>=16?'medium':gb>=8?'entry':'small',recommended_model:MODEL,starter_models:[{id:MODEL,label:MODEL,fit:'recommended'}],warnings:gb<8?['Low memory machine. Use the smallest starter model.']:[]}}
async function ollama(path,opts={}){const r=await fetch(OLLAMA_URL+path,{...opts,signal:AbortSignal.timeout(opts.timeoutMs||60000)});if(!r.ok)throw new Error('Ollama returned '+r.status);return r.json()}
function completion(model,text,raw={}){return {id:'chatcmpl_mmir_'+Date.now(),object:'chat.completion',created:Math.floor(Date.now()/1000),model,provider:'local-node',choices:[{index:0,message:{role:'assistant',content:text||''},finish_reason:raw.done_reason||'stop'}],usage:{prompt_tokens:raw.prompt_eval_count||null,completion_tokens:raw.eval_count||null,total_tokens:null}}}
async function chat(req,res,o){if(!paired(req,res,o))return;const b=await body(req);const messages=Array.isArray(b.messages)?b.messages.filter(m=>m&&typeof m.content==='string'&&m.content.trim()).map(m=>({role:m.role||'user',content:m.content})):[];if(!messages.length){err(res,400,'Messages must be a non-empty array.',o);return}const model=String(b.model||MODEL);const data=await ollama('/api/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({model,messages,stream:false})});send(res,200,completion(model,data?.message?.content||'',data),o)}
http.createServer(async(req,res)=>{const o=req.headers.origin||'';const u=new URL(req.url||'/',`http://${HOST}:${PORT}`);if(!okOrigin(o)){err(res,403,'Origin is not allowed.',o);return}if(req.method==='OPTIONS'){res.writeHead(204,cors(o));res.end();return}try{if(req.method==='GET'&&u.pathname==='/health'){send(res,200,{status:'online',service:'mmir-local-node',version:'0.1.0-mac-command',mode:'local',timestamp:new Date().toISOString()},o);return}if(req.method==='GET'&&u.pathname==='/status'){let runtime;try{runtime={provider:'ollama',status:'online',...(await ollama('/api/version',{timeoutMs:2500}))}}catch{runtime={provider:'ollama',status:'offline',reason:'unreachable'}}send(res,200,{status:runtime.status==='online'?'online':'degraded',service:'mmir-local-node',version:'0.1.0-mac-command',provider:'local-node',runtime,pairing:{required:true,configured:true},node:{id:'mmir-local-mac',name:'MMIR Local Connector',type:'local',registration:'mac-command'},capabilities:['health','status','pairing','hardware','models','chat.completions']},o);return}if(req.method==='POST'&&u.pathname==='/pair'){send(res,200,{paired:true,service:'mmir-local-node',version:'0.1.0-mac-command',token:TOKEN,header:'x-mmir-local-token',required:true},o);return}if(req.method==='GET'&&u.pathname==='/hardware'){if(paired(req,res,o))send(res,200,hardware(),o);return}if(req.method==='GET'&&u.pathname==='/models'){if(!paired(req,res,o))return;const tags=await ollama('/api/tags',{timeoutMs:8000});send(res,200,{object:'list',provider:'local-node',source:'ollama',hardware:hardware(),data:(tags.models||[]).map(m=>({id:m.name||m.model,name:m.name||m.model,provider:'ollama',status:'available',source:'local',capabilities:['chat']}))},o);return}if(req.method==='POST'&&(u.pathname==='/chat/completions'||u.pathname==='/chat')){await chat(req,res,o);return}err(res,404,'Route not found.',o)}catch(e){err(res,503,e.message||'Local connector failed.',o)}}).listen(PORT,HOST,()=>console.log(`MMIR Local Connector listening on http://${HOST}:${PORT}`));
SERVER_JS
}

write_plist(){
  cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>Label</key><string>ai.mmir.local-connector</string><key>ProgramArguments</key><array><string>$NODE_BIN</string><string>$SERVER</string></array><key>EnvironmentVariables</key><dict><key>HOST</key><string>$HOST</string><key>PORT</key><string>$PORT</string><key>OLLAMA_URL</key><string>$OLLAMA_URL</string><key>MMIR_PAIRING_TOKEN_FILE</key><string>$TOKEN_FILE</string><key>MMIR_DEFAULT_MODEL_FILE</key><string>$MODEL_FILE</string></dict><key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>StandardOutPath</key><string>$LOG_DIR/local-connector.log</string><key>StandardErrorPath</key><string>$LOG_DIR/local-connector.err.log</string></dict></plist>
PLIST
}

start_connector(){
  local domain="gui/$(id -u)"
  launchctl bootout "$domain" "$PLIST" >/dev/null 2>&1 || true
  launchctl bootstrap "$domain" "$PLIST" >/dev/null 2>&1 || launchctl load "$PLIST" >/dev/null 2>&1 || true
  launchctl kickstart -k "$domain/ai.mmir.local-connector" >/dev/null 2>&1 || true
  for _ in $(seq 1 20); do curl -fsS --max-time 2 "http://$HOST:$PORT/health" >/dev/null 2>&1 && return; sleep 1; done
  fail "local connector did not become ready on http://$HOST:$PORT."
}

write_uninstall(){
  cat > "$ROOT/uninstall.command" <<UNINSTALL
#!/bin/bash
launchctl bootout "gui/\$(id -u)" "$PLIST" >/dev/null 2>&1 || true
launchctl unload "$PLIST" >/dev/null 2>&1 || true
rm -f "$PLIST"
rm -rf "$ROOT"
printf "MMIR Local Connector removed. Ollama and models were left in place.\n"
UNINSTALL
  chmod +x "$ROOT/uninstall.command"
}

log "Installing $APP"
ensure_node; log "Using Node: $NODE_BIN"
ensure_ollama
ensure_model
write_server
write_plist
write_uninstall
start_connector
log "$APP is ready"
printf "Health: http://$HOST:$PORT/health\nStatus: http://$HOST:$PORT/status\nInstall folder: $ROOT\nLogs: $LOG_DIR\n"
open "$MMIR_SITE" >/dev/null 2>&1 || true
