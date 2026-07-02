# portfolio — em.numu.im

The front door: a hash-routed SPA authored on [amenan-ui](https://github.com/doumouya/amenan-ui)
(the dependency-free TypeScript framework this repo showcases), embedding three offline,
privacy-by-design app demos. Everything client-side — there is no backend to any of the demos.

- **Live:** https://em.numu.im (Firebase Hosting; `doumouya-portfolio.web.app` redirects here)
- **Offline:** *Code → Download ZIP*, unzip, serve `portfolio/dist/` (or open the committed
  `index.html`), and open any demo. Each app carries its Rust→WebAssembly engine with it — your
  data never leaves the page.

## The monorepo

| Path | What it is |
|---|---|
| `portfolio/` | this app — the landing SPA (Home · Work · Writing · About · Contact) |
| [`csv-workbench/`](../csv-workbench) | spreadsheet-grade CSV cleaning — full Polars→wasm engine in a Web Worker |
| [`echarts-dashboard/`](../echarts-dashboard) | client-side analytics (group/aggregate → ECharts) on a Rust→wasm engine |
| [`rbac-explorer/`](../rbac-explorer) | interactive scoped-ownership access-control visualization |
| [build-engine](https://github.com/doumouya/build-engine-demo) | (external) the self-hosting build system the apps are built through |

The site itself is a work sample: every route, card, table, and modal is an amenan-ui mount —
no second design system.

## What's in `portfolio/`

```
index.html              # the built landing SPA (committed pre-built — the deployable)
apps/<name>/…           # each app's self-contained offline demo, copied in at build time
cv/, icons/, themes/    # static assets staged verbatim
src/                    # the SPA source (TypeScript + CSS; landing.ts is the entry)
tools/build.sh          # assembles index.html + refreshes the app demos
tools/stage.sh          # stages dist/ for Firebase Hosting (this is ALL CI runs)
```

## Build contract (read before pushing)

CI (`.github/workflows/firebase-hosting.yml` at the repo root) **never rebuilds** — it runs
`stage.sh` and deploys the committed `index.html` + `apps/`. Two consequences:

1. **Commit what you build.** A change that isn't reflected in the committed `index.html`/`apps/`
   ships stale. In particular `apps/csv-workbench/wasm/data_bg.wasm` (~17 MB) is a **committed
   artifact** (`.gitignore` has an explicit un-ignore for it) — deleting it breaks the live demo.
2. **amenan-ui is a local build input.** `build.sh` reads the framework from a sibling checkout
   (default `../../amenan-ui`, override with `AMU=<path>`); it is not an npm dependency.

```sh
npm install
npm run typecheck   # strict tsc — keep it green
npm run build       # bundle landing + inline amenan-ui CSS + copy app demos + stage dist/
```

To refresh the csv-workbench engine: `bash ../csv-workbench/tools/build-wasm.sh` first
(wasm32 + wasm-bindgen + wasm-opt), then `npm run build`.
