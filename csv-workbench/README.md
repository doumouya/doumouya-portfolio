# csv-workbench

![ci](https://github.com/doumouya/csv-workbench/actions/workflows/ci.yml/badge.svg)

**Clean and transform CSVs entirely in your browser.** Import a file, clean it with a tools panel
(normalize headers, change column types, fill/​drop empties, split/​combine, find-&-replace, …), and export
— with non-destructive undo/redo. The data engine is **Polars compiled to WebAssembly**; your data never
leaves the page (there is no backend).

- **Live:** https://doumouya.github.io/csv-workbench/
- **Offline:** clone and serve `web/` — no server, no upload, no telemetry.

## Why it's interesting

- **A real engine, in the browser.** The same Rust data engine you'd run on a server (built on
  [Polars](https://pola.rs)) is compiled to `wasm32` and run client-side. Parsing, filtering, sorting,
  aggregation and the cleaning operations all happen on-device.
- **Locale-aware type coercion** (the part naive CSV tools get wrong). "Change type → Decimal" recovers
  `1 234,56` → `1234.56` and `€99,90` → `99.9`; "→ Boolean" reads `yes/oui/vrai` and `no/non/faux`;
  "→ Date" tries day-first (FR/EU) formats before US.
- **Off the main thread.** The engine lives in a Web Worker, so a 50k-row parse or a cleanness scan never
  freezes the page.
- **Non-destructive editing.** The uploaded CSV is the immutable base; every cleaning step is replayed over
  it, so undo/redo is just "replay a shorter list" — and the original is always one click away.
- **Memory-aware.** The engine targets the wasm32 4 GB address space; large files are handled with windowed
  rendering (200 rows/page) so the DOM never holds the whole frame.

## The tools

Headers: `snake_case`, replace-in-names. Whole-file: change case, unwrap an embedded/​wrapped CSV.
Per column: delete / keep-only, drop rows with empties, fill empties, find-&-replace, **change type**
(locale-aware), rename, split, combine, format dates, fix invalid/​sentinel values.

## How it's built

```
crates/data     Rust pure-compute engine (Polars) -> compiles to wasm32   ("one engine, two surfaces")
crates/shared   serde wire DTOs (Step, QuerySpec, ColumnMeta)
web/app.ts      the UI: a windowed table + the tools panel (TypeScript + web-kit, no framework)
web/worker.js   the engine, off the main thread
tools/          build-wasm.sh (cargo -> wasm-bindgen -> wasm-opt) + build.sh (engine + tokens + bundle)
```

Polars is built for wasm via the [`polars-rp`](https://github.com/doumouya/polars-rp) fork (it gates
tokio/`mio` off `wasm32`). The UI is built with [`web-kit`](https://github.com/doumouya/web-kit), a
dependency-free TypeScript component kit.

## Build it yourself

Needs the Rust `wasm32-unknown-unknown` target, `wasm-bindgen-cli`, `wasm-opt` (binaryen), Node, and the
sibling [`web-kit`](https://github.com/doumouya/web-kit) checked out alongside this repo.

```sh
sh tools/build.sh          # engine -> wasm, web-kit tokens, typecheck + bundle the UI
python3 -m http.server -d web 8000   # then open http://localhost:8000
```

## Privacy

Everything runs client-side. The file you open is read with the browser's File API and processed in
WebAssembly in this tab. Nothing is uploaded, logged, or sent anywhere.
