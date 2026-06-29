#!/bin/sh
# Build the whole app into one self-contained, offline index.html: the reach engine is compiled to
# wasm and base64-embedded; the TypeScript UI (built with web-kit) is typechecked, bundled, and
# inlined. No server, no fetch — nothing leaves the browser.
# Usage: sh tools/build.sh [--dev]   (--dev = faster wasm, no wasm-opt)
# Needs the sibling ../web-kit checked out (the UI imports it); CI does not run this.
set -e
cd "$(dirname "$0")/.."
. "$HOME/.cargo/env" 2>/dev/null || true
export PATH="/home/mansa/.nvm/versions/node/v24.16.0/bin:$PATH"

WK="../web-kit/src/tokens"
[ -d "$WK" ] || { echo "missing sibling ../web-kit"; exit 1; }

# 1. engine -> wasm
wasm-pack build crates/wasm --target no-modules --out-dir pkg-web --no-typescript "$@"

# 2. typecheck + bundle the TypeScript UI (web-kit is bundled in)
[ -d node_modules ] || npm install --silent
./node_modules/.bin/tsc --noEmit
mkdir -p .build
./node_modules/.bin/esbuild web/app.ts --bundle --format=iife --outfile=.build/app.js

# 3. assemble the single self-contained file
B64=$(base64 -w0 crates/wasm/pkg-web/rbac_wasm_bg.wasm)
{
  printf '<!doctype html><html lang="en"><head><meta charset="utf-8">'
  printf '<meta name="viewport" content="width=device-width,initial-scale=1">'
  printf '<title>rbac-explorer</title><style>'
  cat "$WK/base.css" "$WK/colors.css" "$WK/typography.css" "$WK/spacing.css" "$WK/elevation.css" "$WK/charts.css" "$WK/responsive.css"
  cat web/app.css
  printf '</style></head><body>'
  cat web/body.html
  printf '<script>'
  cat crates/wasm/pkg-web/rbac_wasm.js
  printf '</script>\n<script>const WASM_B64="%s";</script>\n<script>' "$B64"
  cat .build/app.js
  printf '</script></body></html>'
} > index.html

echo "built index.html ($(wc -c < index.html) bytes; wasm $(wc -c < crates/wasm/pkg-web/rbac_wasm_bg.wasm) bytes)"
