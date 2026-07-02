#!/bin/sh
# Stage the committed, pre-built front-door into dist/ for Firebase Hosting.
# Deliberately does NOT rebuild — it only copies files that are committed to the repo,
# so it works in CI without the sibling repos (web-kit / echarts-dashboard / rbac-explorer).
# build.sh calls this after assembling index.html; CI calls it directly.
set -e
cd "$(dirname "$0")/.."

rm -rf dist
mkdir -p dist
cp index.html            dist/index.html
cp manifest.webmanifest  dist/manifest.webmanifest
cp service-worker.js     dist/service-worker.js
cp -r icons              dist/icons
cp -r apps               dist/apps
[ -d cv ] && cp -r cv    dist/cv
[ -d themes ] && cp -r themes dist/themes

# the cleaner reuses csv-workbench's committed wasm (ONE 17MB blob in git, ever;
# Firebase content-hash dedup uploads it once too).
if [ -d dist/apps/cleaner ] && [ -f dist/apps/csv-workbench/wasm/data_bg.wasm ]; then
  mkdir -p dist/apps/cleaner/engine/wasm
  cp dist/apps/csv-workbench/wasm/data.js dist/apps/csv-workbench/wasm/data_bg.wasm \
     dist/apps/cleaner/engine/wasm/
fi

echo "staged dist/ for firebase hosting: $(ls dist | tr '\n' ' ')"
