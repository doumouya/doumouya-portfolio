#!/bin/bash
# Build the whole static site into web/: the Polars->wasm engine (web/wasm/), the
# amenan-ui design tokens + component CSS (web/tokens.css), and the typechecked +
# bundled TS UI (web/app.js). The UI is authored on amenan-ui and wears its
# `portfolio` (Console) theme. Serve web/ as the site root (its own GitHub Pages).
# Needs the sibling amenan-ui checked out (the UI imports it).
set -euo pipefail
. "$HOME/.cargo/env" 2>/dev/null || true
export PATH="/home/mansa/.nvm/versions/node/v24.16.0/bin:$PATH"
cd "$(dirname "$0")/.."

AMU="${AMU:-../../amenan-ui}"
[ -f "$AMU/src/index.ts" ] || { echo "missing sibling amenan-ui at $AMU (set AMU=…)"; exit 1; }

echo "== 1/4 engine -> wasm =="
# reuse the committed prebuilt Polars wasm (rm web/wasm/data_bg.wasm to force a rebuild)
if [ ! -f web/wasm/data_bg.wasm ]; then
  sh tools/build-wasm.sh
fi

echo "== 2/4 amenan-ui theme + component CSS -> web/tokens.css =="
cat "$AMU/src/theme/base.css" \
    "$AMU/src/theme/themes/portfolio.css" \
    "$AMU/src/components/atoms/atoms.css" \
    "$AMU/src/components/select/select.css" \
    "$AMU/src/components/empty-state/empty-state.css" \
    "$AMU/src/components/sql-editor/sql-editor.css" > web/tokens.css

echo "== 3/4 typecheck =="
[ -d node_modules ] || npm install --silent
./node_modules/.bin/tsc --noEmit

echo "== 4/4 bundle the UI -> web/app.js =="
./node_modules/.bin/esbuild web/app.ts --bundle --format=iife \
  --alias:amenan-ui="$AMU/src/index.ts" --outfile=web/app.js

echo "built web/ : $(ls web | tr '\n' ' ')"
echo "wasm: $(du -h web/wasm/data_bg.wasm | cut -f1) · app.js: $(du -h web/app.js | cut -f1)"
