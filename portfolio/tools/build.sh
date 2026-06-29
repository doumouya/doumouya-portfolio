#!/bin/sh
# Assemble the front-door into a self-contained, offline site:
#   index.html      = the landing (web-kit tokens + styles + bundled TS, all inlined)
#   apps/<name>/    = each app's committed single-file demo, copied in
# The result is committed, so GitHub Pages serves it and a downloaded repo zip runs offline.
set -e
cd "$(dirname "$0")/.."
export PATH="/home/mansa/.nvm/versions/node/v24.16.0/bin:$PATH"

WK="../web-kit/src/tokens"
[ -d "$WK" ] || { echo "missing sibling web-kit at $WK"; exit 1; }

mkdir -p .build apps

# 1. bundle the landing TypeScript
./node_modules/.bin/esbuild src/landing.ts --bundle --format=esm --outfile=.build/landing.js

# 2. assemble the single-file landing (tokens + landing.css + body + bundle, inlined)
{
  printf '<!doctype html><html lang="en"><head><meta charset="utf-8">'
  printf '<meta name="viewport" content="width=device-width,initial-scale=1">'
  printf '<title>Emmanuel Doumouya — portfolio</title><style>'
  cat "$WK/base.css" "$WK/colors.css" "$WK/typography.css" "$WK/spacing.css" "$WK/elevation.css" "$WK/charts.css" "$WK/responsive.css"
  cat src/landing.css
  printf '</style></head><body>'
  cat src/body.html
  printf '\n<script type="module">'
  cat .build/landing.js
  printf '</script></body></html>'
} > index.html

# 3. copy each app's offline demo (their own repos build/commit these)
for app in echarts-dashboard rbac-explorer; do
  if [ -f "../$app/index.html" ]; then
    mkdir -p "apps/$app"
    cp "../$app/index.html" "apps/$app/index.html"
  else
    echo "WARN: ../$app/index.html not found — skipping"
  fi
done

echo "built index.html ($(wc -c < index.html) bytes) + apps: $(ls apps 2>/dev/null | tr '\n' ' ')"
