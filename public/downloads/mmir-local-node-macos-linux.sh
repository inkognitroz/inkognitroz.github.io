#!/usr/bin/env bash
set -euo pipefail

MODEL="${MMIR_MODEL:-gemma3:270m}"
TMP_DIR="$(mktemp -d)"

printf 'MMIR Local Node bootstrap is now MMIR Local Connector.\n'
printf 'This legacy entrypoint delegates to the one-click connector installer.\n'
printf 'Model: %s\n' "$MODEL"
export MMIR_MODEL="$MODEL"

case "$(uname -s)" in
  Darwin)
    INSTALLER="$TMP_DIR/mmir-local-connector-mac.command"
    curl -fsSL "https://mmir.ai/downloads/mmir-local-connector-mac.command" -o "$INSTALLER"
    chmod +x "$INSTALLER"
    if [ "${MMIR_DRY_RUN:-false}" = "true" ]; then
      printf 'Downloaded connector installer to %s\n' "$INSTALLER"
      printf 'Run it when ready: %s\n' "$INSTALLER"
      exit 0
    fi
    "$INSTALLER"
    ;;
  Linux)
    INSTALLER="$TMP_DIR/mmir-local-connector-linux.sh"
    curl -fsSL "https://mmir.ai/downloads/mmir-local-connector-linux.sh" -o "$INSTALLER"
    chmod +x "$INSTALLER"
    if [ "${MMIR_DRY_RUN:-false}" = "true" ]; then
      printf 'Downloaded connector installer to %s\n' "$INSTALLER"
      printf 'Run it when ready: MMIR_MODEL=%s %s\n' "$MODEL" "$INSTALLER"
      exit 0
    fi
    "$INSTALLER"
    ;;
  *)
    printf 'Unsupported OS: %s\n' "$(uname -s)" >&2
    printf 'Open https://mmir.ai/downloads/mmir-local-connector-install.html to choose the right installer.\n' >&2
    exit 1
    ;;
esac
