#!/bin/sh
# Assemble the front-door into a self-contained, offline site:
#   index.html      = the landing (amenan-ui theme + component CSS + landing.css +
#                     the bundled TS, all inlined; <html data-theme="portfolio">)
#   apps/<name>/    = each app's committed single-file demo, copied in
# The landing is RE-AUTHORED on amenan-ui — it imports the package (card / termbar /
# badge / el) and wears its `portfolio` (Console) theme; this is the work-sample
# "built on my own framework". The result is committed, so GitHub Pages / Firebase
# serve it and a downloaded repo zip runs offline. CI never rebuilds — it stages the
# committed, fully-inlined index.html (stage.sh), so amenan-ui is a LOCAL build input.
set -e
cd "$(dirname "$0")/.."
export PATH="/home/mansa/.nvm/versions/node/v24.16.0/bin:$PATH"

# amenan-ui source (sibling checkout; override with AMU=… for a different path).
AMU="${AMU:-../../amenan-ui}"
[ -f "$AMU/src/index.ts" ] || { echo "missing amenan-ui source at $AMU (set AMU=…)"; exit 1; }

mkdir -p .build apps

# 1. bundle the landing TypeScript, resolving the bare `amenan-ui` import to the
#    sibling source (zero runtime deps, so the bundle is self-contained).
./node_modules/.bin/esbuild src/landing.ts \
  --bundle --format=esm \
  --alias:amenan-ui="$AMU/src/index.ts" \
  --outfile=.build/landing.js

# 2. assemble the single-file landing. The <head> pins the portfolio theme and a
#    no-FOUC prepaint that keeps the theme = portfolio while honouring the visitor's
#    persisted light/dark choice (amu-mode; default light = paper Console).
#    Inlined CSS = amenan-ui's base (structure) + portfolio palette + the component
#    sheets the page uses (atoms/card/termbar) + landing.css (page chrome).
{
  printf '<!doctype html><html lang="en" data-theme="portfolio" data-mode="light"><head><meta charset="utf-8">'
  # Canonicalize: bounce the default Firebase hostnames to the custom domain. Runs first &
  # synchronously (location.replace stops parsing), so the default URLs never render. No-op on
  # em.numu.im / localhost / preview channels (exact-host match only). Firebase can'\''t do this
  # host-conditionally in firebase.json (redirects are path-based and would loop on em.numu.im).
  printf '<script>(function(){var h=location.hostname;if(h==="doumouya-portfolio.web.app"||h==="doumouya-portfolio.firebaseapp.com"){location.replace("https://em.numu.im"+location.pathname+location.search+location.hash);}})();</script>'
  printf '<meta name="viewport" content="width=device-width,initial-scale=1">'
  printf '<meta name="theme-color" content="#0B0B0C">'
  printf '<script>(function(){try{var m=localStorage.getItem("amu-mode");var d=document.documentElement;d.setAttribute("data-theme","portfolio");d.setAttribute("data-mode",(m==="dark"||m==="light")?m:"light");}catch(e){}})();</script>'
  printf '<link rel="canonical" href="https://em.numu.im/">'
  printf '<link rel="icon" href="/icons/favicon.svg"><link rel="apple-touch-icon" href="/icons/icon-192.png"><link rel="manifest" href="/manifest.webmanifest">'
  printf '<title>Emmanuel Doumouya — portfolio</title><style>'
  cat "$AMU/src/theme/base.css" \
      "$AMU/src/theme/themes/portfolio.css" \
      "$AMU/src/components/atoms/atoms.css" \
      "$AMU/src/components/card/card.css" \
      "$AMU/src/components/termbar/termbar.css"
  cat src/landing.css
  printf '</style></head><body>'
  cat src/body.html
  printf '\n<script type="module">'
  cat .build/landing.js
  printf '</script>'
  printf '<script>if("serviceWorker" in navigator)addEventListener("load",function(){navigator.serviceWorker.register("/service-worker.js")});</script>'
  printf '</body></html>'
} > index.html

# 3. copy each app's offline demo (their own repos build/commit these); if a sibling
#    isn't present, keep the demo already committed under apps/.
for app in echarts-dashboard rbac-explorer; do
  if [ -f "../$app/index.html" ]; then
    mkdir -p "apps/$app"
    cp "../$app/index.html" "apps/$app/index.html"
  else
    echo "WARN: ../$app/index.html not found — keeping committed apps/$app"
  fi
done

echo "built index.html ($(wc -c < index.html) bytes) + apps: $(ls apps 2>/dev/null | tr '\n' ' ')"

# 4. stage the assembled site into dist/ for Firebase Hosting (no rebuild needed downstream)
sh tools/stage.sh
