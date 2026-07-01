/* engine-worker — the Polars→wasm data engine, OFF the main thread.

   Holds ONE resident Workbook (the parsed CSV + its applied cleaning steps) and
   answers ops against it, so the page never freezes — parse, every window
   `view`, the cleanness `score`, and CSV export all run here, not on the UI
   thread. Classic worker: the no-modules wasm glue is pulled in with
   importScripts (giving the `wasm_bindgen` global), and both the glue and the
   wasm binary are resolved RELATIVE TO THIS WORKER so it works under a GitHub
   Pages project subpath (…/csv-workbench/).

   Protocol: { id, op, payload } in -> { id, ok, result } | { id, ok:false, error } out.
   `view`/`columns_meta`/`score`/`to_csv` return the engine's JSON/CSV STRING
   verbatim; the main thread parses. */

let Workbook = null; // the wasm class
let wb = null; // the resident workbook
let ready = null; // init promise (once)

function init() {
  if (ready) return ready;
  const glue = new URL("wasm/data.js", self.location.href).href;
  const bin = new URL("wasm/data_bg.wasm", self.location.href).href;
  importScripts(glue); // defines the global `wasm_bindgen`
  ready = wasm_bindgen({ module_or_path: bin }).then(() => {
    Workbook = wasm_bindgen.Workbook;
  });
  return ready;
}

const HANDLERS = {
  async load({ bytes, tld }) {
    await init();
    wb = Workbook.from_csv(new Uint8Array(bytes), tld || undefined);
    return { rows: wb.rows(), cols: wb.cols() };
  },
  // Re-derive the current frame from the immutable base by replaying `steps`
  // (the whole undo/redo + staged-preview model). Returns the new dimensions.
  async set_steps({ steps }) {
    wb.set_steps(steps);
    return { rows: wb.rows(), cols: wb.cols() };
  },
  // A window of the current frame; `query` is a QuerySpec JSON string or null.
  async view({ query, offset, limit }) {
    return wb.view(query || undefined, offset, limit);
  },
  async columns_meta() {
    return wb.columns_meta();
  },
  // the cleanness report over the current frame — the slow one (that's why it's here).
  async score() {
    return wb.score();
  },
  async to_csv() {
    return wb.to_csv();
  },
};

self.onmessage = async (e) => {
  const { id, op, payload } = e.data;
  try {
    const handler = HANDLERS[op];
    if (!handler) throw new Error("unknown op: " + op);
    self.postMessage({ id, ok: true, result: await handler(payload || {}) });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) });
  }
};
