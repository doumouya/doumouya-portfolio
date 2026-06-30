#!/bin/sh
# Build the dashboard into one self-contained, offline index.html: ECharts + the wasm aggregation
# engine (base64-embedded) + the TypeScript UI (typechecked, bundled on amenan-ui), all inlined. The
# UI wears amenan-ui's `portfolio` (Console) theme so the demo matches the portfolio front-door.
# Usage: sh tools/build.sh [--dev]   (--dev = faster wasm, no wasm-opt)
# Needs the sibling amenan-ui checked out (the UI imports it); CI does not run this.
set -e
cd "$(dirname "$0")/.."
. "$HOME/.cargo/env" 2>/dev/null || true
export PATH="/home/mansa/.nvm/versions/node/v24.16.0/bin:$PATH"

AMU="${AMU:-../../amenan-ui}"
[ -f "$AMU/src/index.ts" ] || { echo "missing sibling amenan-ui at $AMU (set AMU=…)"; exit 1; }

# Vendor ECharts on first build (kept out of git; the built index.html embeds it).
if [ ! -f web/vendor/echarts.min.js ]; then
  echo "fetching ECharts..."
  mkdir -p web/vendor
  curl -fsSL https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js -o web/vendor/echarts.min.js
fi

# 1. engine -> wasm. Reuse the committed prebuilt artifact (the Rust engine is theme-independent;
#    rm crates/wasm/pkg-web to force a fresh wasm-pack build).
if [ ! -f crates/wasm/pkg-web/dashboard_wasm_bg.wasm ]; then
  wasm-pack build crates/wasm --target no-modules --out-dir pkg-web --no-typescript "$@"
fi

# 2. typecheck + bundle the TypeScript UI (amenan-ui resolved to the sibling source; ECharts stays a
#    separate global, never bundled).
[ -d node_modules ] || npm install --silent
./node_modules/.bin/tsc --noEmit
mkdir -p .build
./node_modules/.bin/esbuild web/app.ts \
  --bundle --format=iife \
  --alias:amenan-ui="$AMU/src/index.ts" \
  --outfile=.build/app.js

# 3. assemble the single self-contained file (portfolio theme; mode from a shared amu-mode, default light).
#    Inlined CSS = amenan-ui base + portfolio palette + the component sheets used (atoms/card/empty-state/select).
B64=$(base64 -w0 crates/wasm/pkg-web/dashboard_wasm_bg.wasm)
{
  printf '<!doctype html><html lang="en" data-theme="portfolio" data-mode="light"><head><meta charset="utf-8">'
  printf '<meta name="viewport" content="width=device-width,initial-scale=1">'
  printf '<meta name="theme-color" content="#0B0B0C">'
  printf '<script>(function(){try{var m=localStorage.getItem("amu-mode");var d=document.documentElement;d.setAttribute("data-theme","portfolio");d.setAttribute("data-mode",(m==="dark"||m==="light")?m:"light");}catch(e){}})();</script>'
  printf '<title>echarts-dashboard</title><style>'
  cat "$AMU/src/theme/base.css" \
      "$AMU/src/theme/themes/portfolio.css" \
      "$AMU/src/components/atoms/atoms.css" \
      "$AMU/src/components/card/card.css" \
      "$AMU/src/components/empty-state/empty-state.css" \
      "$AMU/src/components/select/select.css"
  cat web/app.css
  printf '</style></head><body>'
  cat web/body.html
  # ECharts (guard any literal </script in the minified source so it can't close the tag early)
  printf '<script>'
  sed 's#</script#<\\/script#g' web/vendor/echarts.min.js
  printf '</script>\n<script>'
  cat crates/wasm/pkg-web/dashboard_wasm.js
  printf '</script>\n<script>const WASM_B64="%s";</script>\n<script>' "$B64"
  cat .build/app.js
  printf '</script></body></html>'
} > index.html

echo "built index.html ($(wc -c < index.html) bytes; wasm $(wc -c < crates/wasm/pkg-web/dashboard_wasm_bg.wasm) bytes)"
