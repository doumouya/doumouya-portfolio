# cleaner

**SpreadSheet Paper reborn.** The Cleaner page from the `spreadsheet-paper` sandbox — the
first-ever draft of the Console theme, a static HTML mockup — rebuilt as a **live,
full-stack app**: the same page, painted with the canonical Console theme
([amenan-ui](https://github.com/doumouya/amenan-ui)'s `portfolio` theme), running the
real Polars→WebAssembly cleaning engine, with a
[birama-engine](https://github.com/doumouya/birama-engine) metadata plane behind an
injectable seam.

Live demo: `/apps/cleaner/` on the portfolio (static mode). The same committed artifact
runs full-stack locally — see [Full-stack mode](#full-stack-mode).

## The three planes

```
amenan-ui front (Console theme — the page the mockup drew)
├── DATA:      csv-workbench's Polars wasm, REUSED verbatim (one Worker per open
│              file, LRU 3). Cleaning ops really run; nothing leaves the browser.
└── METADATA:  the CleanerStore seam, picked by a runtime probe:
    ├── localStorage        the deployed static demo (no backend)
    └── birama-engine       full-stack: projects/files/views are REGISTERED TYPES
                            (cleaner_project/CLP · cleaner_file/CLF · cleaner_view/CLV),
                            steps PATCH with If-Match, every edit an `events` audit row
```

CSV **bytes never enter the store**: the seed file rides a static asset; imports live in
session memory (their *steps* persist; re-import the bytes after a reload).

## The sample: dossier.csv

A real 14MB case extract — 101,235 rows that arrive **quote-wrapped** (the whole record
inside quotes, doubled inner quotes), Windows-1252 encoded, with `???`/`NA` sentinels and
day-first dates. The engine diagnoses the wrap and preserves every row; `unwrap_csv` is
staged as the pipeline's explicit, undoable first step → 17 real columns. The cleanness
score (95/100 on arrival) itemizes what's still dirty.

## Run

```sh
sh tools/build.sh                      # engine copy + theme CSS + typecheck + bundle
python3 -m http.server -d web 8000     # static mode (localStorage)
```

### Full-stack mode

```sh
# 1. birama-engine (debug build — dev-login) + Postgres
DATABASE_URL=postgres://…/birama_cleaner BIRAMA_BIND=127.0.0.1:8098 cargo run -p api

# 2. register the metadata types (three POST /api/types — rows, not migrations)
BIRAMA_URL=http://127.0.0.1:8098 sh tools/seed-birama.sh

# 3. the dev front door (static + same-origin /api proxy; birama ships no CORS)
BIRAMA_URL=http://127.0.0.1:8098 node tools/dev-server.mjs 8932
```

The probe (`/healthz` → `status:"ok"` → the objects surface) flips the badge to
**birama-engine**; on static hosting it falls back to **local** cleanly. Kill the API
mid-session and cleaning keeps working — persistence degrades to a "Save failed" toast.

## Parity vs the SpreadSheet Paper mockup

| Mockup region | Here | Status |
|---|---|---|
| Topbar (back · ✨ Cleaner · profile/docs/theme) | composed from atoms + `toggleMode()` | ✓ |
| Project tabs | `mountTabs` + create/delete (modal + ⋯ menu) | ✓ (drag-reorder **dropped**) |
| Per-project header + cleanness | file chip · `mountScoreBadge` (breakdown popover) | ✓ (upgraded: popover) |
| File tabs w/ cleanness dots | `mountTabs`, dot from the persisted score | ✓ |
| Toolbar (funnel · search · edit/select/delete · sel-chip · refresh · rownums · rows-pill · cols · tools) | `mountGridToolbar`, data-driven | ✓ (date-format pill **dropped** — the `format_dates` op covers it) |
| Filter panel (AND/OR predicate tree) | `mountFilterPanel` → `QuerySpec.filter` (shape-identical to the engine's FilterNode) | ✓ + saved views |
| The table | `mountRedTable` (virtual) + engine-windowed `mountPager` | ✓ |
| Tools panel (~18 param surfaces) | `mountColumnManager` over the 15-op catalog + `set_cell`/`drop_rows` from table modes | ✓ (encoding override **deferred** — the wasm `from_csv` takes no encoding arg yet) |
| Applied history | `mountStepsPanel` (persistent tab; undone steps struck through) | ✓ |
| Modals (open-project · save-view · cast-confirm · history) | `openModal`/`confirmModal`; history is a panel tab | ✓ |
| Join Preparation | — | **deferred** (cross-worker joins need engine design) |
| Overview (file list) | redtable of files + `mountUploader` | ✓ |

## Layout

```
web/
├── app.ts              the page (composition + the step pipeline + persistence)
├── engine.ts           FileEngine (worker client) + EnginePool (LRU, worker-per-file)
├── ops.ts              the cleaning catalog (CleanOp + build() → engine steps)
├── session.ts          per-file UI/pipeline state (FileSession)
├── store.ts            the metadata seam + the runtime probe
├── service-local.ts    localStorage impl
├── service-birama.ts   birama-engine impl (ETag/If-Match, 412 retry, dev-login)
├── engine/             (build-copied) csv-workbench's worker.js + wasm — never forked
└── data/               (build-copied) dossier.csv
tools/
├── build.sh            engine copy → theme CSS → tsc → esbuild (+ cache-bust)
├── dev-server.mjs      static + same-origin /api proxy (full-stack dev)
└── seed-birama.sh      the three type registrations + auth bootstrap
```

The wasm is committed ONCE (in csv-workbench); the front-door `stage.sh` shares it into
`dist/apps/cleaner/engine/wasm/` at deploy time.
