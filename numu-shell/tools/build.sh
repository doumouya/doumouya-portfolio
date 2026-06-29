#!/bin/bash
# Build the prototype UI into web/: web-kit tokens (web/tokens.css) + the typechecked,
# bundled TS (web/app.js). The engine wasm (web/wasm/*) + worker.js are copied in
# separately (from csv-workbench). Needs the sibling ../web-kit.
set -euo pipefail
export PATH="/home/mansa/.nvm/versions/node/v24.16.0/bin:$PATH"
cd "$(dirname "$0")/.."

WK=../web-kit/src/tokens
[ -d "$WK" ] || { echo "missing sibling ../web-kit"; exit 1; }

echo "== tokens -> web/tokens.css =="
cat "$WK/base.css" "$WK/colors.css" "$WK/typography.css" "$WK/spacing.css" "$WK/elevation.css" "$WK/charts.css" "$WK/responsive.css" > web/tokens.css

echo "== typecheck =="
[ -d node_modules ] || npm install --silent
./node_modules/.bin/tsc --noEmit

echo "== bundle web/app.ts -> web/app.js =="
./node_modules/.bin/esbuild web/app.ts --bundle --format=iife --outfile=web/app.js

echo "built: $(ls web | tr '\n' ' ')"
