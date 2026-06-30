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

echo "staged dist/ for firebase hosting: $(ls dist | tr '\n' ' ')"
