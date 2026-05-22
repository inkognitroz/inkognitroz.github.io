#!/bin/bash
set -euo pipefail

APP="MMIR Local Connector"
HOST="127.0.0.1"
PORT="${MMIR_LOCAL_CONNECTOR_PORT:-3000}"
OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434}"
MMIR_SITE="${MMIR_SITE:-https://mmir.ai/#connect-options}"
SERVER_SOURCE="${MMIR_LOCAL_CONNECTOR_SERVER_SOURCE:-https://mmir.ai/downloads/mmir-local-connector-server.mjs}"
SERVER_SHA256="${MMIR_LOCAL_CONNECTOR_SERVER_SHA256:-1b25a4ebb4f1311144cb03c04a98e11239e5c93e978e93c3a8028fd2ab6f873c}"
TUNNEL_CONTROL="${MMIR_ENABLE_TUNNEL_CONTROL:-false}"
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
  local temp actual_sha
  temp="$(mktemp)"
  log "Downloading MMIR connector server"
  curl -fsSL "$SERVER_SOURCE" -o "$temp"
  actual_sha="$(shasum -a 256 "$temp" | awk '{print $1}')"
  if [ "$actual_sha" != "$SERVER_SHA256" ]; then
    rm -f "$temp"
    fail "connector server checksum mismatch. Expected $SERVER_SHA256 but got $actual_sha."
  fi
  "$NODE_BIN" --check "$temp" >/dev/null
  mv "$temp" "$SERVER"
  chmod 600 "$SERVER"
}

write_plist(){
  cat > "$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>Label</key><string>ai.mmir.local-connector</string><key>ProgramArguments</key><array><string>$NODE_BIN</string><string>$SERVER</string></array><key>EnvironmentVariables</key><dict><key>HOST</key><string>$HOST</string><key>PORT</key><string>$PORT</string><key>OLLAMA_URL</key><string>$OLLAMA_URL</string><key>MMIR_PAIRING_TOKEN_FILE</key><string>$TOKEN_FILE</string><key>MMIR_DEFAULT_MODEL_FILE</key><string>$MODEL_FILE</string><key>MMIR_ENABLE_TUNNEL_CONTROL</key><string>$TUNNEL_CONTROL</string></dict><key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>StandardOutPath</key><string>$LOG_DIR/local-connector.log</string><key>StandardErrorPath</key><string>$LOG_DIR/local-connector.err.log</string></dict></plist>
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
