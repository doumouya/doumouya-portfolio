#!/bin/bash
# Build the whole static site into web/: the Polars->wasm engine (web/wasm/), the
# web-kit design tokens (web/tokens.css), and the typechecked + bundled TS UI
# (web/app.js). Serve web/ as the site root (its own GitHub Pages). Needs the
# sibling ../web-kit checked out (the UI imports it).
set -euo pipefail
. "$HOME/.cargo/env" 2>/dev/null || true
export PATH="/home/mansa/.nvm/versions/node/v24.16.0/bin:$PATH"
cd "$(dirname "$0")/.."

WK=../web-kit/src/tokens
[ -d "$WK" ] || { echo "missing sibling ../web-kit"; exit 1; }

echo "== 1/4 engine -> wasm =="
sh tools/build-wasm.sh

echo "== 2/4 web-kit tokens -> web/tokens.css =="
cat "$WK/base.css" "$WK/colors.css" "$WK/typography.css" "$WK/spacing.css" "$WK/elevation.css" "$WK/charts.css" "$WK/responsive.css" > web/tokens.css

echo "== 3/4 typecheck =="
[ -d node_modules ] || npm install --silent
./node_modules/.bin/tsc --noEmit

echo "== 4/4 bundle the UI -> web/app.js =="
./node_modules/.bin/esbuild web/app.ts --bundle --format=iife --outfile=web/app.js

echo "built web/ : $(ls web | tr '\n' ' ')"
echo "wasm: $(du -h web/wasm/data_bg.wasm | cut -f1) · app.js: $(du -h web/app.js | cut -f1)"
