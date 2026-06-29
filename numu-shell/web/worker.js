/* numu-shell engine worker — the Polars→wasm engine off the main thread.
   Holds one resident Workbook (the open data source as table `t`) and answers
   ops; classic worker, the no-modules glue pulled in with importScripts (the
   `wasm_bindgen` global), glue + wasm resolved RELATIVE to this worker so it
   works under a path prefix. Adds `sql` (the qir data-spine entry point) on top
   of the csv-workbench op set.
   Protocol: { id, op, payload } -> { id, ok, result } | { id, ok:false, error }. */

let Workbook = null;
let wb = null;
let ready = null;

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
  // qir lowers to SQL; this runs it (read-only Polars SQL over the frame, table `t`).
  async sql({ query }) {
    return wb.sql(query);
  },
  async view({ query, offset, limit }) {
    return wb.view(query || undefined, offset, limit);
  },
  async columns_meta() {
    return wb.columns_meta();
  },
  async set_steps({ steps }) {
    wb.set_steps(steps);
    return { rows: wb.rows(), cols: wb.cols() };
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
