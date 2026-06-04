#!/usr/bin/env bash
set -euo pipefail

MODEL="${MMIR_MODEL:-gemma3:270m}"
TMP_DIR="$(mktemp -d)"
MANIFEST_URL="${MMIR_LOCAL_CONNECTOR_RELEASE_MANIFEST:-https://mmir.ai/downloads/mmir-local-connector-release.json}"

cleanup(){ rm -rf "$TMP_DIR"; }
trap cleanup EXIT

fail(){
  printf 'Install failed: %s\n' "$1" >&2
  exit 1
}

sha256_file(){
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
    return
  fi
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
    return
  fi
  fail "no SHA-256 tool found. Install shasum or sha256sum and retry."
}

artifact_sha256(){
  local manifest="$1" artifact_id="$2"
  awk -v id="$artifact_id" '
    $0 ~ "\"id\"[[:space:]]*:[[:space:]]*\"" id "\"" { found=1; next }
    found && $0 ~ "\"sha256\"[[:space:]]*:" {
      split($0, parts, "\"")
      print parts[4]
      exit
    }
  ' "$manifest"
}

download_verified(){
  local artifact_id="$1" url="$2" output="$3" manifest expected actual
  manifest="$TMP_DIR/mmir-local-connector-release.json"
  curl -fsSL "$MANIFEST_URL" -o "$manifest"
  expected="$(artifact_sha256 "$manifest" "$artifact_id")"
  [ -n "$expected" ] || fail "release manifest does not include SHA-256 for $artifact_id."
  curl -fsSL "$url" -o "$output"
  actual="$(sha256_file "$output")"
  if [ "$actual" != "$expected" ]; then
    rm -f "$output"
    fail "$artifact_id checksum mismatch. Expected $expected but got $actual."
  fi
  printf 'Verified %s sha256 %s\n' "$artifact_id" "$actual"
}

printf 'MMIR Local Node bootstrap is now MMIR Local Connector.\n'
printf 'This legacy entrypoint delegates to the one-click connector installer.\n'
printf 'Model: %s\n' "$MODEL"
export MMIR_MODEL="$MODEL"

case "$(uname -s)" in
  Darwin)
    INSTALLER="$TMP_DIR/mmir-local-connector-mac.command"
    download_verified "mac-command" "https://mmir.ai/downloads/mmir-local-connector-mac.command" "$INSTALLER"
    chmod +x "$INSTALLER"
    if [ "${MMIR_DRY_RUN:-false}" = "true" ]; then
      printf 'Dry run complete: verified Mac connector installer checksum. No installer was executed.\n'
      exit 0
    fi
    "$INSTALLER"
    ;;
  Linux)
    INSTALLER="$TMP_DIR/mmir-local-connector-linux.sh"
    download_verified "linux-shell" "https://mmir.ai/downloads/mmir-local-connector-linux.sh" "$INSTALLER"
    chmod +x "$INSTALLER"
    if [ "${MMIR_DRY_RUN:-false}" = "true" ]; then
      printf 'Dry run complete: verified Linux connector installer checksum. No installer was executed.\n'
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
