#!/usr/bin/env bash
set -euo pipefail

APP="MMIR Local Connector"
HOST="${HOST:-127.0.0.1}"
PORT="${MMIR_LOCAL_CONNECTOR_PORT:-3000}"
OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434}"
MMIR_SITE="${MMIR_SITE:-https://mmir.ai/#connect-options}"
ROOT="${XDG_DATA_HOME:-$HOME/.local/share}/mmir-local-connector"
NODE_DIR="$ROOT/node"
SERVER="$ROOT/server.mjs"
TOKEN_FILE="$ROOT/pairing-token"
MODEL_FILE="$ROOT/default-model"
LOG_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/mmir-local-connector"
SERVICE_DIR="$HOME/.config/systemd/user"
SERVICE="$SERVICE_DIR/mmir-local-connector.service"
SERVER_SOURCE="https://mmir.ai/downloads/mmir-local-connector-server.mjs"

log(){ printf '\n==> %s\n' "$1"; }
fail(){ printf '\nInstall failed: %s\n' "$1" >&2; exit 1; }
exists(){ command -v "$1" >/dev/null 2>&1; }

[ "$(uname -s)" = "Linux" ] || fail "this installer is for Linux."
mkdir -p "$ROOT" "$LOG_DIR"

node_major(){ "$1" -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || printf 0; }
node_arch(){
  case "$(uname -m)" in
    x86_64|amd64) printf x64;;
    aarch64|arm64) printf arm64;;
    *) fail "unsupported Linux architecture: $(uname -m)";;
  esac
}
latest_node(){ curl -fsSL https://nodejs.org/dist/index.json | awk -F'"' '/"lts":[[:space:]]*"/ { print $4; exit }'; }

ensure_node(){
  if exists node && [ "$(node_major "$(command -v node)")" -ge 20 ]; then NODE_BIN="$(command -v node)"; return; fi
  if [ -x "$NODE_DIR/bin/node" ] && [ "$(node_major "$NODE_DIR/bin/node")" -ge 20 ]; then NODE_BIN="$NODE_DIR/bin/node"; return; fi
  local version arch archive temp
  version="$(latest_node || true)"; [ -n "$version" ] || version="v22.21.1"
  arch="$(node_arch)"; archive="node-${version}-linux-${arch}.tar.xz"; temp="$(mktemp -d)"
  log "Installing private Node.js runtime $version"
  curl -fL --progress-bar "https://nodejs.org/dist/${version}/${archive}" -o "$temp/$archive"
  rm -rf "$NODE_DIR"; mkdir -p "$NODE_DIR"
  tar -xJf "$temp/$archive" -C "$NODE_DIR" --strip-components 1
  rm -rf "$temp"
  NODE_BIN="$NODE_DIR/bin/node"
}

find_ollama(){
  if exists ollama; then command -v ollama; return; fi
  [ -x /usr/local/bin/ollama ] && printf /usr/local/bin/ollama && return
  [ -x /usr/bin/ollama ] && printf /usr/bin/ollama && return
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
    if exists systemctl; then
      systemctl --user start ollama >/dev/null 2>&1 || true
      sudo systemctl start ollama >/dev/null 2>&1 || true
    fi
    ollama_ready || ("$OLLAMA_BIN" serve >>"$LOG_DIR/ollama.log" 2>&1 &)
  fi
  for _ in $(seq 1 40); do ollama_ready && return; sleep 1; done
  fail "Ollama did not become ready on $OLLAMA_URL."
}

recommended_model(){
  local kb gb
  kb="$(awk '/MemTotal/ {print $2}' /proc/meminfo 2>/dev/null || printf 0)"
  gb=$((kb/1024/1024))
  if [ "$gb" -ge 16 ]; then printf llama3.2:3b; elif [ "$gb" -ge 8 ]; then printf llama3.2:1b; else printf qwen2.5:0.5b; fi
}

ensure_model(){
  local model
  model="${MMIR_MODEL:-$(recommended_model)}"; printf '%s\n' "$model" > "$MODEL_FILE"
  if [ "${MMIR_SKIP_MODEL_PULL:-false}" = true ]; then log "Skipping model download"; return; fi
  if "$OLLAMA_BIN" list 2>/dev/null | awk '{print $1}' | grep -Fxq "$model"; then log "Starter model already installed: $model"; return; fi
  log "Downloading starter model: $model"
  "$OLLAMA_BIN" pull "$model"
}

write_server(){
  if [ ! -s "$TOKEN_FILE" ]; then "$NODE_BIN" -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url")+"\n")' > "$TOKEN_FILE"; chmod 600 "$TOKEN_FILE"; fi
  curl -fsSL "$SERVER_SOURCE" -o "$SERVER"
}

write_service(){
  mkdir -p "$SERVICE_DIR"
  cat > "$SERVICE" <<SERVICE
[Unit]
Description=MMIR Local Connector
After=network-online.target

[Service]
ExecStart=$NODE_BIN $SERVER
Restart=always
RestartSec=3
Environment=HOST=$HOST
Environment=PORT=$PORT
Environment=OLLAMA_URL=$OLLAMA_URL
Environment=MMIR_PAIRING_TOKEN_FILE=$TOKEN_FILE
Environment=MMIR_DEFAULT_MODEL_FILE=$MODEL_FILE
Environment=MMIR_CONNECTOR_PLATFORM=linux
WorkingDirectory=$ROOT

[Install]
WantedBy=default.target
SERVICE
}

start_connector(){
  if exists systemctl; then
    systemctl --user daemon-reload >/dev/null 2>&1 || true
    systemctl --user enable --now mmir-local-connector.service >/dev/null 2>&1 || true
  fi
  if ! curl -fsS --max-time 2 "http://$HOST:$PORT/health" >/dev/null 2>&1; then
    HOST="$HOST" PORT="$PORT" OLLAMA_URL="$OLLAMA_URL" MMIR_PAIRING_TOKEN_FILE="$TOKEN_FILE" MMIR_DEFAULT_MODEL_FILE="$MODEL_FILE" MMIR_CONNECTOR_PLATFORM=linux "$NODE_BIN" "$SERVER" >>"$LOG_DIR/local-connector.log" 2>>"$LOG_DIR/local-connector.err.log" &
  fi
  for _ in $(seq 1 30); do curl -fsS --max-time 2 "http://$HOST:$PORT/health" >/dev/null 2>&1 && return; sleep 1; done
  fail "local connector did not become ready on http://$HOST:$PORT."
}

write_uninstall(){
  cat > "$ROOT/uninstall.sh" <<UNINSTALL
#!/usr/bin/env bash
systemctl --user disable --now mmir-local-connector.service >/dev/null 2>&1 || true
rm -f "$SERVICE"
rm -rf "$ROOT"
printf "MMIR Local Connector removed. Ollama and models were left in place.\n"
UNINSTALL
  chmod +x "$ROOT/uninstall.sh"
}

log "Installing $APP"
ensure_node; log "Using Node: $NODE_BIN"
ensure_ollama
ensure_model
write_server
write_service
write_uninstall
start_connector
log "$APP is ready"
printf 'Health: http://%s:%s/health\nStatus: http://%s:%s/status\nInstall folder: %s\nLogs: %s\n' "$HOST" "$PORT" "$HOST" "$PORT" "$ROOT" "$LOG_DIR"
if exists xdg-open; then xdg-open "$MMIR_SITE" >/dev/null 2>&1 || true; fi
