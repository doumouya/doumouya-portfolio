#!/bin/bash
# Build the Cleaner into web/: the REUSED csv-workbench Polars→wasm engine
# (web/engine/, copied — never forked), the dossier.csv sample (web/data/),
# the amenan-ui Console theme + component CSS (web/tokens.css), and the
# typechecked + bundled TS UI (web/app.js). Serve web/ as the site root.
# Needs the sibling amenan-ui + csv-workbench checkouts.
set -euo pipefail
. "$HOME/.cargo/env" 2>/dev/null || true
export PATH="/home/mansa/.nvm/versions/node/v24.16.0/bin:$PATH"
cd "$(dirname "$0")/.."

AMU="${AMU:-../../amenan-ui}"
CW="${CW:-../csv-workbench}"
DOSSIER_CSV="${DOSSIER_CSV:-/mnt/c/Users/edoum/OneDrive/Apps/fleury_data_project/Datacore/uploads/dossier.csv}"
[ -f "$AMU/src/index.ts" ] || { echo "missing sibling amenan-ui at $AMU (set AMU=…)"; exit 1; }
[ -f "$CW/web/worker.js" ] || { echo "missing sibling csv-workbench at $CW (set CW=…)"; exit 1; }

echo "== 1/4 engine (reused from csv-workbench) + sample data =="
# The worker resolves its wasm RELATIVE TO ITSELF, so a verbatim copy works.
# One 17MB wasm is committed in csv-workbench; here it's a build artifact.
if [ ! -f "$CW/web/wasm/data_bg.wasm" ]; then
  (cd "$CW" && sh tools/build-wasm.sh)
fi
mkdir -p web/engine/wasm web/data
cp "$CW/web/worker.js" web/engine/worker.js
cp "$CW/web/wasm/data.js" "$CW/web/wasm/data_bg.wasm" web/engine/wasm/
if [ ! -f web/data/dossier.csv ]; then
  if [ -f "$DOSSIER_CSV" ]; then
    cp "$DOSSIER_CSV" web/data/dossier.csv
  elif [ -f "../portfolio/apps/cleaner/data/dossier.csv" ]; then
    cp "../portfolio/apps/cleaner/data/dossier.csv" web/data/dossier.csv
  else
    echo "missing dossier.csv (set DOSSIER_CSV=…)"; exit 1
  fi
fi

echo "== 2/4 amenan-ui theme + component CSS -> web/tokens.css =="
cat "$AMU/src/theme/base.css" \
    "$AMU/src/theme/themes/portfolio.css" \
    "$AMU/src/components/atoms/atoms.css" \
    "$AMU/src/components/select/select.css" \
    "$AMU/src/components/field/field.css" \
    "$AMU/src/components/menu/menu.css" \
    "$AMU/src/components/toast/toast.css" \
    "$AMU/src/components/modal/modal.css" \
    "$AMU/src/components/tabs/tabs.css" \
    "$AMU/src/components/empty-state/empty-state.css" \
    "$AMU/src/components/uploader/uploader.css" \
    "$AMU/src/components/pager/pager.css" \
    "$AMU/src/components/redtable/redtable.css" \
    "$AMU/src/components/grid-toolbar/grid-toolbar.css" \
    "$AMU/src/components/grid-view/grid-view.css" \
    "$AMU/src/components/filter-panel/filter-panel.css" \
    "$AMU/src/components/column-manager/column-manager.css" \
    "$AMU/src/components/steps-panel/steps-panel.css" \
    "$AMU/src/components/score-badge/score-badge.css" \
    "$AMU/src/components/side-panel/side-panel.css" \
    "$AMU/src/components/workspace-panels/workspace-panels.css" \
    "$AMU/src/components/kindLabel/kindLabel.css" > web/tokens.css

echo "== 3/4 typecheck =="
[ -d node_modules ] || npm install --silent
./node_modules/.bin/tsc --noEmit

echo "== 4/4 bundle the UI -> web/app.js =="
./node_modules/.bin/esbuild web/app.ts --bundle --format=iife \
  --alias:amenan-ui="$AMU/src/index.ts" --outfile=web/app.js

# cache-bust the shell's asset tags (the hosting immutable-caches unhashed js)
V="$(date +%s)"
sed -i -E "s/(app\.js|app\.css|tokens\.css)(\?v=[0-9]+)?/\1?v=$V/g" web/index.html

echo "built web/ : $(ls web | tr '\n' ' ')"
echo "wasm: $(du -h web/engine/wasm/data_bg.wasm | cut -f1) · data: $(du -h web/data/dossier.csv | cut -f1) · app.js: $(du -h web/app.js | cut -f1)"
