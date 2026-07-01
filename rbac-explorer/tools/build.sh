#!/bin/sh
# Build the whole app into one self-contained, offline index.html: the reach engine is compiled to
# wasm and base64-embedded; the TypeScript UI (built on amenan-ui) is typechecked, bundled, and inlined.
# The UI wears amenan-ui's `portfolio` (Console) theme so the demo matches the portfolio front-door.
# Usage: sh tools/build.sh [--dev]   (--dev = faster wasm, no wasm-opt)
# Needs the sibling amenan-ui checked out (the UI imports it); CI does not run this.
set -e
cd "$(dirname "$0")/.."
. "$HOME/.cargo/env" 2>/dev/null || true
export PATH="/home/mansa/.nvm/versions/node/v24.16.0/bin:$PATH"

AMU="${AMU:-../../amenan-ui}"
[ -f "$AMU/src/index.ts" ] || { echo "missing sibling amenan-ui at $AMU (set AMU=…)"; exit 1; }

# 1. engine -> wasm. Reuse the committed prebuilt artifact (the Rust engine is theme-independent;
#    rm crates/wasm/pkg-web to force a fresh wasm-pack build).
if [ ! -f crates/wasm/pkg-web/rbac_wasm_bg.wasm ]; then
  wasm-pack build crates/wasm --target no-modules --out-dir pkg-web --no-typescript "$@"
fi

# 2. typecheck + bundle the TypeScript UI (amenan-ui resolved to the sibling source, bundled in)
[ -d node_modules ] || npm install --silent
./node_modules/.bin/tsc --noEmit
mkdir -p .build
./node_modules/.bin/esbuild web/app.ts \
  --bundle --format=iife \
  --alias:amenan-ui="$AMU/src/index.ts" \
  --outfile=.build/app.js

# 3. assemble the single self-contained file. The <head> pins the portfolio theme + a mode-only
#    prepaint (honours a shared amu-mode when embedded same-origin under the front-door; default light).
#    Inlined CSS = amenan-ui base + portfolio palette + the component sheets used (atoms/select/stat).
B64=$(base64 -w0 crates/wasm/pkg-web/rbac_wasm_bg.wasm)
{
  printf '<!doctype html><html lang="en" data-theme="portfolio" data-mode="light"><head><meta charset="utf-8">'
  printf '<meta name="viewport" content="width=device-width,initial-scale=1">'
  printf '<meta name="theme-color" content="#0B0B0C">'
  printf '<script>(function(){try{var m=localStorage.getItem("amu-mode");var d=document.documentElement;d.setAttribute("data-theme","portfolio");d.setAttribute("data-mode",(m==="dark"||m==="light")?m:"light");}catch(e){}})();</script>'
  printf '<title>rbac-explorer</title><style>'
  cat "$AMU/src/theme/base.css" \
      "$AMU/src/theme/themes/portfolio.css" \
      "$AMU/src/components/atoms/atoms.css" \
      "$AMU/src/components/select/select.css" \
      "$AMU/src/components/stat/stat.css" \
      "$AMU/src/components/perm-cell/perm-cell.css"
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
