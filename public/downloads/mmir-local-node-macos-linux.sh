#!/usr/bin/env bash
set -euo pipefail

MODEL="${MMIR_MODEL:-gemma3:270m}"
TARGET_DIR="${MMIR_TARGET_DIR:-$HOME/.mmir/local-node}"
ARCHIVE_URL="https://github.com/inkognitroz/mmir-local-node/archive/refs/heads/main.tar.gz"
TMP_DIR="$(mktemp -d)"

printf 'MMIR Local Node bootstrap for macOS/Linux\n'
printf 'Model: %s\n' "$MODEL"
printf 'Target: %s\n' "$TARGET_DIR"

if [ "$(uname -s)" = "Linux" ]; then
  case "$(uname -m)" in
    aarch64|arm64)
      export MMIR_NODE_DEVICE_CLASS="${MMIR_NODE_DEVICE_CLASS:-linux-arm64-edge}"
      printf 'Device class: %s\n' "$MMIR_NODE_DEVICE_CLASS"
      ;;
    armv7l|armv6l|armhf)
      printf '32-bit ARM is not supported yet. Use 64-bit Raspberry Pi OS (arm64/aarch64) for MMIR Local Node.\n' >&2
      exit 1
      ;;
  esac
fi

if ! command -v node >/dev/null 2>&1; then
  printf 'Node.js 20+ is required. Install Node.js, then rerun this script.\n' >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"
printf 'Downloading MMIR Local Node package...\n'
curl -fsSL "$ARCHIVE_URL" -o "$TMP_DIR/mmir-local-node.tar.gz"
tar -xzf "$TMP_DIR/mmir-local-node.tar.gz" -C "$TMP_DIR"
cp -R "$TMP_DIR/mmir-local-node-main/." "$TARGET_DIR/"

cd "$TARGET_DIR"
export MMIR_MODEL="$MODEL"

if [ "${MMIR_DRY_RUN:-false}" = "true" ]; then
  printf 'Dry run: dependencies, model pull, processes and chat smoke will not run.\n'
  printf 'Would run: ./install/mmir-install.sh\n'
  printf 'Use MMIR_MODEL=%s ./install/mmir-install.sh when ready.\n' "$MODEL"
else
  ./install/mmir-install.sh
fi
