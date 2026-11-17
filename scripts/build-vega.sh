#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VEGA_APP_DIR="$ROOT_DIR/apps/vega"
DEFAULT_VEGA_HOME="$HOME/vega"
DEFAULT_VEGA_BIN="$DEFAULT_VEGA_HOME/bin"
DEFAULT_VEGA_SDK="$DEFAULT_VEGA_HOME/sdk"

if ! command -v vega >/dev/null 2>&1 && [[ -f "$HOME/vega/env" ]]; then
  # Load the default Vega SDK environment when the installer added it there.
  # shellcheck disable=SC1090
  source "$HOME/vega/env"
fi

if ! command -v vega >/dev/null 2>&1 && [[ -x "$DEFAULT_VEGA_BIN/vega" ]]; then
  export PATH="$DEFAULT_VEGA_BIN:$PATH"
fi

if [[ -z "${KEPLER_SDK_PATH:-}" && -d "$DEFAULT_VEGA_SDK" ]]; then
  export KEPLER_SDK_PATH="$DEFAULT_VEGA_SDK"
fi

if ! command -v vega >/dev/null 2>&1 && [[ -z "${KEPLER_SDK_PATH:-}" ]]; then
  printf '%s\n' \
    "Vega CLI was not found." \
    "Install Amazon Vega Developer Tools or export KEPLER_SDK_PATH, then rerun:" \
    "  bun run eas:prod:vega" \
    "" \
    "Official installer:" \
    "  curl -fsSL https://sdk-installer.vega.labcollab.net/get_vvm.sh | bash && source ~/vega/env" >&2
  exit 1
fi

# Keep installs reproducible without reinstalling unchanged dependencies.
if [[ ! -d "$VEGA_APP_DIR/node_modules" || \
  "$VEGA_APP_DIR/package.json" -nt "$VEGA_APP_DIR/node_modules" || \
  "$VEGA_APP_DIR/package-lock.json" -nt "$VEGA_APP_DIR/node_modules" ]]; then
  npm --prefix "$VEGA_APP_DIR" ci
fi

APP_VERSION="$(node -p "require('$ROOT_DIR/package.json').version")"
BUILD_NUMBER="${VEGA_BUILD_NUMBER:-$(date +%s)}"

printf 'Building Martie Vega VPKG version %s build %s\n' "$APP_VERSION" "$BUILD_NUMBER"
npm --prefix "$VEGA_APP_DIR" run build:release -- \
  --build-version "$APP_VERSION" \
  --build-number "$BUILD_NUMBER" \
  --reset-cache

printf '\nRelease VPKG should be under:\n'
printf '  %s/build/armv7-release/\n' "$VEGA_APP_DIR"
