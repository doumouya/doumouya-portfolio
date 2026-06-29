/* Temporary de-risk harness: prove the engine's `sql` op runs a real SELECT on a
   CSV in-browser (the qir data-spine path). Replaced by the shell UI later. */
const out = document.getElementById("out");
const log = (m) => { out.textContent += "\n" + m; };

const worker = new Worker(new URL("worker.js", location.href));
let seq = 0;
const pending = new Map();
worker.onmessage = (e) => {
  const { id, ok, result, error } = e.data;
  const p = pending.get(id);
  if (!p) return;
  pending.delete(id);
  ok ? p.resolve(result) : p.reject(new Error(error));
};
const call = (op, payload) => new Promise((res, rej) => {
  const id = ++seq; pending.set(id, { resolve: res, reject: rej });
  worker.postMessage({ id, op, payload });
});

const csv = `id,customer,region,mrr,active
1001,Acme,NA,1284,true
1002,Globex,EMEA,540.5,true
1003,Initech,APAC,96,false
1004,Umbra,NA,3210.75,true
1006,Stark,EMEA,1820,true
1007,Wayne,EMEA,2475.25,true
1010,Tyrell,EMEA,1390,true`;

(async () => {
  try {
    out.textContent = "loading engine (wasm)…";
    const dims = await call("load", { bytes: new TextEncoder().encode(csv).buffer });
    log("loaded: " + JSON.stringify(dims));
    const meta = JSON.parse(await call("columns_meta"));
    log("columns: " + meta.map((c) => c.name + ":" + c.dtype).join(", "));
    const q = "SELECT region, COUNT(*) AS n, SUM(mrr) AS total FROM t GROUP BY region ORDER BY total DESC";
    log("\nqir: read t  group region  select region, count(*) n, sum(mrr) total  order total desc");
    log("sql: " + q);
    const res = JSON.parse(await call("sql", { query: q }));
    log("\ncols: " + JSON.stringify(res.columns));
    log("rows:\n" + res.rows.map((r) => r.map((c) => (c == null ? "—" : c)).join(" | ")).join("\n"));
    window.__sqlOk = true;
    window.__sqlResult = res;
  } catch (e) {
    log("ERROR: " + e.message);
    window.__sqlErr = e.message;
  }
})();
