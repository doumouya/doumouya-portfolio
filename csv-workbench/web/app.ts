/* csv-workbench — a Polars→WebAssembly CSV cleaning workbench that runs entirely
   in the browser. The engine (the `data` crate compiled to wasm) lives in a Web
   Worker (web/worker.js); this file is the UI: a windowed data table with a
   workspace-style toolbar (live search · edit/select/delete row modes · undo/redo)
   and a Clean-tools side panel that ends in an always-visible step-History strip.
   All edits are non-destructive engine steps (replayed from an immutable base),
   so undo/redo and "revert to here" are just "replay a shorter list". Built on
   amenan-ui components + its `portfolio` (Console) theme; the DOM is built with
   el() — no innerHTML. */
import { el, button, mountSelect, mountEmptyState, mountSqlEditor, badge } from "amenan-ui";

// ---------- types ----------
interface ColumnMeta {
  name: string;
  dtype: string;
  semantic_dtype: string;
  null_pct: number | null;
  unique_pct: number | null;
  sample: string | null;
}
interface Step {
  kind: string;
  params: Record<string, unknown>;
}
interface Page {
  columns: string[];
  rows: (string | null)[][];
  total: number;
  indices: number[]; // each row's STABLE index in the current frame (pre filter/sort)
}
interface Field {
  key: string;
  type: "text" | "enum" | "bool" | "sentinels";
  label: string;
  options?: [string, string][];
  default?: string | boolean;
  placeholder?: string;
}
interface OpDef {
  id: string;
  label: string;
  scope: "global" | "column";
  min?: number;
  max?: number;
  fields: Field[];
  build: (sel: string[], v: Record<string, string | boolean>) => Step[];
}
type Mode = "" | "edit" | "select" | "delete";

const step = (kind: string, params: Record<string, unknown>): Step => ({ kind, params });

// ---------- the cleaning catalog (each id = the engine's step kind) ----------
const OPS: OpDef[] = [
  { id: "snake_case_columns", label: "snake_case headers", scope: "global", fields: [], build: () => [step("snake_case_columns", {})] },
  { id: "replace_in_names", label: "Replace in names…", scope: "global",
    fields: [{ key: "find", type: "text", label: "Find" }, { key: "replace", type: "text", label: "Replace with", placeholder: "(blank to remove)" }],
    build: (_s, v) => [step("replace_in_names", { find: v.find ?? "", replace: v.replace ?? "" })] },
  { id: "change_case", label: "Change case…", scope: "global",
    fields: [{ key: "mode", type: "enum", label: "Case", options: [["lower", "lowercase"], ["upper", "UPPERCASE"]], default: "lower" }],
    build: (_s, v) => [step("change_case", { mode: v.mode ?? "lower" })] },
  { id: "unwrap_csv", label: "Unwrap embedded CSV", scope: "global", fields: [], build: () => [step("unwrap_csv", {})] },

  { id: "drop_columns", label: "Delete selected", scope: "column", min: 1, fields: [], build: (sel) => [step("drop_columns", { cols: sel })] },
  { id: "filter_columns", label: "Keep only selected", scope: "column", min: 1, fields: [], build: (sel) => [step("filter_columns", { cols: sel })] },
  { id: "drop_nulls", label: "Drop rows with empty", scope: "column", min: 1, fields: [], build: (sel) => [step("drop_nulls", { cols: sel })] },
  { id: "fill_nulls", label: "Fill empties…", scope: "column", min: 1,
    fields: [{ key: "strategy", type: "enum", label: "With", options: [["fixed", "a value"], ["forward", "previous value"], ["zero", "zero"]], default: "fixed" }, { key: "value", type: "text", label: "Value", placeholder: 'when "a value"' }],
    build: (sel, v) => sel.map((c) => step("fill_nulls", { column: c, strategy: v.strategy ?? "fixed", value: v.value ?? "" })) },
  { id: "replace_text", label: "Find & replace…", scope: "column", min: 1, max: 1,
    fields: [{ key: "find", type: "text", label: "Find" }, { key: "replace", type: "text", label: "Replace with", placeholder: "(blank to remove)" }, { key: "is_regex", type: "bool", label: "Regular expression", default: false }],
    build: (sel, v) => [step("replace_text", { column: sel[0], find: v.find ?? "", replace: v.replace ?? "", is_regex: !!v.is_regex })] },
  { id: "cast", label: "Change type…", scope: "column", min: 1, max: 1,
    fields: [{ key: "dtype", type: "enum", label: "To type", options: [["str", "Text"], ["int", "Integer"], ["float", "Decimal"], ["bool", "Boolean"], ["date", "Date"]], default: "str" }],
    build: (sel, v) => [step("cast", { column: sel[0], dtype: v.dtype ?? "str" })] },
  { id: "rename_column", label: "Rename…", scope: "column", min: 1, max: 1,
    fields: [{ key: "to", type: "text", label: "New name" }],
    build: (sel, v) => [step("rename_column", { from: sel[0], to: v.to ?? "" })] },
  { id: "split_column", label: "Split…", scope: "column", min: 1, max: 1,
    fields: [{ key: "sep", type: "text", label: "Separator", default: "," }, { key: "keep_original", type: "bool", label: "Keep original column", default: false }],
    build: (sel, v) => [step("split_column", { column: sel[0], sep: v.sep ?? ",", keep_original: !!v.keep_original })] },
  { id: "join_columns", label: "Combine…", scope: "column", min: 2, max: 2,
    fields: [{ key: "sep", type: "text", label: "Separator", default: " " }, { key: "new_name", type: "text", label: "New column name" }],
    build: (sel, v) => [step("join_columns", { col1: sel[0], col2: sel[1], sep: v.sep ?? " ", new_name: (v.new_name as string) || `${sel[0]}_${sel[1]}` })] },
  { id: "format_dates", label: "Format dates…", scope: "column", min: 1, max: 1,
    fields: [{ key: "fmt", type: "text", label: "Format", default: "%Y-%m-%d", placeholder: "%Y-%m-%d" }, { key: "on_incomplete", type: "enum", label: "If unparseable", options: [["null", "blank it"], ["drop", "drop the row"], ["keep", "keep as-is"]], default: "null" }],
    build: (sel, v) => [step("format_dates", { column: sel[0], fmt: (v.fmt as string) || "%Y-%m-%d", on_incomplete: v.on_incomplete ?? "null" })] },
  { id: "fix_invalid", label: "Fix invalid…", scope: "column", min: 1,
    fields: [{ key: "sentinels", type: "sentinels", label: "Treat as invalid", placeholder: "N/A, -, ??? …" }],
    build: (sel, v) => [step("fix_invalid", { columns: sel, sentinels: String(v.sentinels ?? "").split(",").map((s) => s.trim()).filter(Boolean) })] },
];
const GLOBAL_OPS = OPS.filter((o) => o.scope === "global");
const COLUMN_OPS = OPS.filter((o) => o.scope === "column");
const opEnabled = (o: OpDef, n: number): boolean => o.scope === "global" || (n >= (o.min ?? 1) && n <= (o.max ?? Infinity));

// ---------- worker client ----------
let worker!: Worker;
let seq = 0;
const inflight = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
function engineCall<T = unknown>(op: string, payload?: unknown): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = ++seq;
    inflight.set(id, { resolve: resolve as (v: unknown) => void, reject });
    worker.postMessage({ id, op, payload });
  });
}

// ---------- state ----------
let pageLimit = 100;                         // rows per page (toolbar pill)
let cols: ColumnMeta[] = [];
const applied: Step[] = [];                  // the committed cleaning pipeline
const redo: Step[][] = [];                   // undone steps, newest-first (each group = one undo)
const selection = new Set<string>();         // selected COLUMN names (tools panel)
const selectedRows = new Set<number>();      // selected ROW indices in the current frame
let rowIndices: number[] = [];               // displayed row → its frame index (from view.indices)
const hiddenCols = new Set<string>();        // columns toggled off in the table (client-side only)
let mode: Mode = "";                         // table interaction mode
let searchQ = "";                            // free-text view filter
let searchDebounce: number | undefined;
let sort: { col: string; descending: boolean } | null = null;
let offset = 0;
let totalRows = 0;
let cleanness: number | null = null;
let activeOp: OpDef | null = null;           // op whose action-sheet is open
let undoBtn: HTMLElement;
let redoBtn: HTMLElement;

const byId = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;
/** replaceChildren that drops nullish/false children (unlike the native one). */
function setKids(host: HTMLElement, ...kids: (Node | string | null | undefined | false)[]): void {
  host.replaceChildren(...kids.filter((k): k is Node | string => k != null && k !== false));
}

// ---------- sample data ----------
// A synthetic French clients extract — deliberately messy (accented/spaced headers, French
// decimals like "12 500,00", mixed oui/non casing, day-first dates, blank cells) so the
// cleaning engine has something real to fix. Synthetic on purpose: no real data ships here.
const SAMPLE_CSV = `ID Client,Nom complet,Ville,Région,Chiffre d'affaires,Actif ?,Date d'inscription
1,Marie Dupont,Paris,Île-de-France,"12 500,00",oui,14/03/2024
2,Liam O'Brien ,Rennes,Bretagne,"8 750,50",non,02/11/2023
3,Sofia Rossi,Toulouse,Occitanie,"1 299,90",OUI,28/02/2024
4,Hans Becker,Strasbourg,Grand Est,"23 400,00",oui,
5,Amélie Laurent,Paris,Île-de-France,"5 600,75",non,07/07/2023
6,Lucas Martin,Nantes,Pays de la Loire,"940,20",oui,19/09/2024
7,,Lyon,Auvergne-Rhône-Alpes,"15 250,00",oui,11/01/2024
8,Chen Wei,Paris,île-de-france,"3 420,10",non,05/05/2024
9,Olivia Brown,Bordeaux,Nouvelle-Aquitaine,,Oui,23/08/2023
10,Léa Moreau,Rennes,Bretagne,"7 800,00",oui,30/04/2024
11,Thomas Petit,Marseille,PACA,"19 999,99",NON,12/12/2023
12,Camille Roux,Toulouse,Occitanie,"2 150,40",oui,08/06/2024
`;
function loadSample(): void {
  void openFile(new File([SAMPLE_CSV], "sample-clients-fr.csv", { type: "text/csv" }));
}

// ---------- import / refresh ----------
async function openFile(file: File | undefined): Promise<void> {
  if (!file) return;
  setStatus(`Parsing ${file.name}…`);
  const buf = await file.arrayBuffer();
  try {
    const dims = await engineCall<{ rows: number; cols: number }>("load", { bytes: buf, tld: undefined });
    applied.length = 0; redo.length = 0;
    selection.clear(); selectedRows.clear(); hiddenCols.clear();
    sort = null; offset = 0; searchQ = ""; mode = "";
    totalRows = dims.rows;
    document.getElementById("sql-result")?.replaceChildren(); // a result from the previous file is stale
    resetToolbarUi();
    await refresh();
    setStatus("");
  } catch (e) {
    setStatus(`Could not parse: ${(e as Error).message}`);
  }
}

// Re-derive the current frame (set_steps), then repaint headers + table + tools + score.
async function refresh(): Promise<void> {
  const dims = await engineCall<{ rows: number; cols: number }>("set_steps", { steps: JSON.stringify(applied) });
  totalRows = dims.rows;
  cols = JSON.parse(await engineCall<string>("columns_meta"));
  // prune selection / hidden / sort that no longer exist
  const names = new Set(cols.map((c) => c.name));
  for (const s of [...selection]) if (!names.has(s)) selection.delete(s);
  for (const h of [...hiddenCols]) if (!names.has(h)) hiddenCols.delete(h);
  if (sort && !names.has(sort.col)) sort = null;
  if (offset >= totalRows) offset = 0;
  selectedRows.clear(); // a step re-derived the frame, so any held row indices are stale
  renderTools();
  await renderTable();
  syncToolbar();
  syncSelChip();
  rescore();
}

async function rescore(): Promise<void> {
  try {
    const rep = JSON.parse(await engineCall<string>("score")) as { score: number | null };
    cleanness = rep.score;
  } catch {
    cleanness = null;
  }
  renderChip();
}

// ---------- step pipeline (apply / undo / redo / revert) ----------
function stageSteps(steps: Step[]): void {
  applied.push(...steps);
  redo.length = 0;
  activeOp = null;
  void refresh();
}
function runOp(op: OpDef, values: Record<string, string | boolean>): void {
  const sel = [...selection];
  if (!opEnabled(op, sel.length)) return;
  stageSteps(op.build(sel, values));
}
function undo(): void {
  if (!applied.length) return;
  redo.push([applied.pop() as Step]);
  void refresh();
}
function redoAction(): void {
  const grp = redo.pop();
  if (!grp) return;
  applied.push(...grp);
  void refresh();
}
/** Revert to a point in the timeline: keep the first `n` applied steps, send the rest to redo. */
function undoTo(n: number): void {
  while (applied.length > n) redo.push([applied.pop() as Step]);
  void refresh();
}
/** Replay `k` undone groups back onto the pipeline (forward in the timeline). */
function redoTo(k: number): void {
  for (let i = 0; i < k && redo.length; i++) applied.push(...(redo.pop() as Step[]));
  void refresh();
}
async function exportCsv(): Promise<void> {
  const csv = await engineCall<string>("to_csv");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = el("a", { href: URL.createObjectURL(blob), download: "cleaned.csv" });
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- rendering: table ----------
async function renderTable(): Promise<void> {
  const host = byId("table");
  if (!cols.length) {
    host.replaceChildren();
    mountEmptyState(host, {
      title: "Open a CSV — it stays on your device.",
      line: "Parsed and cleaned entirely in your browser by a Polars→WebAssembly engine. Nothing is uploaded. No file handy? Click “Load sample” to try it on a messy French dataset.",
      action: { label: "Load sample", onClick: loadSample },
    });
    return;
  }
  const q: Record<string, unknown> = {};
  if (searchQ) q.search = searchQ;
  if (sort) q.sort = [{ col: sort.col, descending: sort.descending }];
  const query = Object.keys(q).length ? JSON.stringify(q) : null;
  const page = JSON.parse(await engineCall<string>("view", { query, offset, limit: pageLimit })) as Page;
  rowIndices = page.indices ?? page.rows.map((_, i) => offset + i);

  // columns the user has not toggled off, keeping the original cell index
  const visible = page.columns.map((name, i) => ({ name, i })).filter(({ name }) => !hiddenCols.has(name));

  // header: a select-all checkbox cell (CSS shows it only in select mode) + sortable columns
  const headRow = el("tr");
  const selAll = el("input", { type: "checkbox", id: "selAll", class: "row-chk", "aria-label": "select all rows on this page" }) as HTMLInputElement;
  const onPage = rowIndices.filter((ix) => selectedRows.has(ix)).length;
  selAll.checked = rowIndices.length > 0 && onPage === rowIndices.length;
  selAll.indeterminate = onPage > 0 && onPage < rowIndices.length;
  headRow.append(el("th", { class: "col-chk" }, selAll));
  // numeric columns (int/float) get right-aligned tabular-mono cells
  const numericCols = new Set(cols.filter((c) => c.dtype === "int" || c.dtype === "float").map((c) => c.name));
  visible.forEach(({ name }) => {
    const meta = cols.find((c) => c.name === name);
    const arrow = sort?.col === name ? (sort.descending ? "▼" : "▲") : "";
    headRow.append(el("th", { class: numericCols.has(name) ? "sortable num" : "sortable", "data-col": name, title: `Sort by ${name}` },
      el("span", { class: "th-name" }, name),
      meta ? el("span", { class: `dtype dtype-${meta.dtype}` }, meta.dtype) : null,
      el("span", { class: "th-sort" }, arrow)));
  });

  // body: each row carries its frame index; cells are editable in edit mode
  const editable = mode === "edit";
  const body = el("tbody");
  page.rows.forEach((row, r) => {
    const absIdx = rowIndices[r]!; // rowIndices is built parallel to page.rows (see above), so r is always in range
    const tr = el("tr", { "data-idx": String(absIdx), class: selectedRows.has(absIdx) ? "is-selected" : "" });
    // set .checked as a PROPERTY (amenan-ui's el renders any non-null attr value, so checked={false} would wrongly check it)
    const rowCb = el("input", { type: "checkbox", class: "row-chk", "aria-label": "select row" }) as HTMLInputElement;
    rowCb.checked = selectedRows.has(absIdx);
    tr.append(el("td", { class: "col-chk" }, rowCb));
    visible.forEach(({ name, i }) => {
      const cell = row[i];
      const isNull = cell == null;
      const display = isNull ? (editable ? "" : "—") : cell;
      const cls = `${isNull ? "null cell" : "cell"}${numericCols.has(name) ? " num" : ""}`;
      tr.append(el("td", {
        class: cls,
        "data-col": name,
        "data-orig": display,
        title: isNull ? null : String(display),  // native tooltip reveals truncated values
        contenteditable: editable ? "true" : null,
      }, display));
    });
    body.append(tr);
  });

  host.replaceChildren(el("div", { class: "wrap" },
    el("table", { class: `dt mode-${mode || "view"}` }, el("thead", {}, headRow), body)));
  renderPager(page.total);
}

function renderPager(total: number): void {
  const limit = Math.max(1, pageLimit);
  const to = Math.min(offset + limit, total);
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const current = Math.min(pageCount, Math.floor(offset / limit) + 1);
  const goTo = (p: number) => { const np = Math.min(pageCount, Math.max(1, p)); offset = (np - 1) * limit; void renderTable(); };

  const summary = el("div", { class: "pager-summary" },
    el("span", {}, `${total.toLocaleString()} rows × ${cols.length} cols`),
    total ? el("span", { class: "muted" }, ` · showing ${(offset + 1).toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}` ) : null,
    searchQ ? el("span", { class: "muted" }, ` · matching “${searchQ}”`) : null);

  const nav = el("div", { class: "pager-nav" });
  if (pageCount > 1) {
    nav.append(button({ label: "‹", variant: "ghost", size: "sm", ariaLabel: "previous page", title: "previous page", onClick: () => goTo(current - 1) }));
    for (const p of pageWindow(current, pageCount)) {
      if (p === 0) { nav.append(el("span", { class: "pager-gap" }, "…")); continue; }
      const b = button({ label: String(p), variant: p === current ? "accent" : "ghost", size: "sm", onClick: () => goTo(p) });
      b.classList.add("pager-page");
      if (p === current) b.setAttribute("aria-current", "page");
      nav.append(b);
    }
    nav.append(button({ label: "›", variant: "ghost", size: "sm", ariaLabel: "next page", title: "next page", onClick: () => goTo(current + 1) }));
  }

  setKids(byId("pager"), summary, el("span", { class: "spacer" }), nav, rowsPerPage());
}

// Windowed page list: first two, last two, and current±1, with 0 marking an elided gap (…).
function pageWindow(current: number, count: number): number[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const keep = [1, 2, count - 1, count, current - 1, current, current + 1].filter((p) => p >= 1 && p <= count);
  const sorted = [...new Set(keep)].sort((a, b) => a - b);
  const out: number[] = [];
  let prev = 0;
  for (const p of sorted) { if (p - prev > 1) out.push(0); out.push(p); prev = p; }
  return out;
}

function openToolsDrawer(): void {
  renderTools();
  if (!cols.length) setKids(byId("tools"), el("div", { class: "tools-section" }, el("p", { class: "muted" }, "Load a CSV to use the cleaning tools.")));
  (byId("tools-drawer") as HTMLDialogElement).showModal();
}

// ---------- SQL console (read-only Polars SQL over the current frame) ----------
let sqlMounted = false;
let lastSql = "";

function openSqlDrawer(): void {
  const host = byId("sql-pane");
  if (!cols.length) {
    sqlMounted = false;
    setKids(host, el("div", { class: "tools-section" }, el("p", { class: "muted" }, "Load a CSV to query it with SQL.")));
  } else if (!sqlMounted) {
    sqlMounted = true;
    const result = el("div", { id: "sql-result", class: "sql-result" });
    const editorHost = el("div", { class: "sql-editor-host" });
    mountSqlEditor(editorHost, {
      value: lastSql,
      onRun: async (query) => {
        lastSql = query;
        // engine errors (parse / non-read-only / row cap) reject → the editor's
        // own status line shows the message and keeps the panel open
        const raw = await engineCall<string>("sql", { query });
        renderSqlResult(result, JSON.parse(raw) as Page);
      },
    });
    setKids(host,
      el("div", { class: "tools-head" }, el("h2", {}, "SQL")),
      editorHost,
      result);
  }
  (byId("sql-drawer") as HTMLDialogElement).showModal();
}

// A compact read-only result grid. The engine caps the payload at 500 rows —
// `total` is the full result size, so the truncation is stated, never silent.
function renderSqlResult(host: HTMLElement, page: Page): void {
  const shown = page.rows.length;
  const note = shown < page.total ? ` · showing first ${shown}` : "";
  const head = el("tr", {}, ...page.columns.map((c) => el("th", {}, c)));
  const body = page.rows.map((r) => el("tr", {}, ...r.map((v) => el("td", {}, v ?? "—"))));
  setKids(host,
    el("div", { class: "sql-result-meta" }, `${page.total} row${page.total === 1 ? "" : "s"} × ${page.columns.length} col${page.columns.length === 1 ? "" : "s"}${note}`),
    el("div", { class: "sql-result-scroll" },
      el("table", {}, el("thead", {}, head), el("tbody", {}, ...body))));
}

// Delegated table interactions — attached once to the persistent #table host, so they
// survive every renderTable() repaint and read the live state at event time.
function wireTable(): void {
  const host = byId("table");
  host.addEventListener("click", (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("input")) return; // checkboxes are handled on 'change'
    const th = t.closest("th.sortable") as HTMLElement | null;
    if (th) { onSort(th.getAttribute("data-col") as string); return; }
    if (mode === "delete") {
      const tr = t.closest("tr[data-idx]") as HTMLElement | null;
      if (tr) stageSteps([step("drop_rows", { indices: [Number(tr.getAttribute("data-idx"))] })]);
    }
  });
  host.addEventListener("change", (e) => {
    const t = e.target as HTMLInputElement;
    if (t.id === "selAll") { toggleSelectAll(t.checked); return; }
    if (t.classList.contains("row-chk")) {
      const tr = t.closest("tr[data-idx]") as HTMLElement;
      const idx = Number(tr.getAttribute("data-idx"));
      if (t.checked) selectedRows.add(idx); else selectedRows.delete(idx);
      tr.classList.toggle("is-selected", t.checked);
      syncSelChip();
      syncSelAll();
    }
  });
  host.addEventListener("focusout", (e) => {
    if (mode !== "edit") return;
    const td = (e.target as HTMLElement).closest("td.cell") as HTMLElement | null;
    if (!td || td.getAttribute("contenteditable") !== "true") return;
    const orig = td.getAttribute("data-orig") ?? "";
    const next = (td.textContent ?? "").trim();
    if (next === orig) return;
    // Stamp the new value as the baseline BEFORE staging: committing re-renders the table, and if this
    // cell still holds focus the browser fires a second focusout on the (now stale) node — making that
    // re-fire a no-op (next === orig) so one edit can't commit twice.
    td.setAttribute("data-orig", next);
    const tr = td.closest("tr[data-idx]") as HTMLElement;
    stageSteps([step("set_cell", {
      row: Number(tr.getAttribute("data-idx")),
      column: td.getAttribute("data-col"),
      value: next === "" ? null : next,
    })]);
  });
}

function onSort(colName: string): void {
  sort = sort?.col === colName ? { col: colName, descending: !sort.descending } : { col: colName, descending: false };
  offset = 0;
  void renderTable();
}

function toggleSelectAll(checked: boolean): void {
  for (const ix of rowIndices) { if (checked) selectedRows.add(ix); else selectedRows.delete(ix); }
  byId("table").querySelectorAll<HTMLInputElement>("tbody .row-chk").forEach((cb) => {
    cb.checked = checked;
    cb.closest("tr")?.classList.toggle("is-selected", checked);
  });
  syncSelChip();
}
function syncSelAll(): void {
  const selAll = document.getElementById("selAll") as HTMLInputElement | null;
  if (!selAll) return;
  const onPage = rowIndices.filter((ix) => selectedRows.has(ix)).length;
  selAll.checked = rowIndices.length > 0 && onPage === rowIndices.length;
  selAll.indeterminate = onPage > 0 && onPage < rowIndices.length;
}
function clearSelection(): void {
  selectedRows.clear();
  byId("table").querySelectorAll<HTMLInputElement>(".row-chk").forEach((cb) => { cb.checked = false; cb.indeterminate = false; });
  byId("table").querySelectorAll(".is-selected").forEach((r) => r.classList.remove("is-selected"));
  syncSelChip();
}

// ---------- rendering: tools panel (Clean ops + the History strip) ----------
function renderTools(): void {
  const host = byId("tools");
  if (!cols.length) { host.replaceChildren(); return; }
  const n = selection.size;

  const list = el("div", { class: "col-list" });
  cols.forEach((c) => {
    const cb = el("input", { type: "checkbox" }) as HTMLInputElement;
    cb.checked = selection.has(c.name);
    cb.addEventListener("change", () => { cb.checked ? selection.add(c.name) : selection.delete(c.name); renderTools(); });
    const nullBadge = c.null_pct && c.null_pct > 0 ? el("span", { class: "col-null" }, `${Math.round(c.null_pct)}% empty`) : null;
    list.append(el("label", { class: "col-row" }, cb,
      el("span", { class: "col-name" }, c.name),
      el("span", { class: `dtype dtype-${c.dtype}` }, c.dtype), nullBadge));
  });

  const opBtn = (op: OpDef): HTMLElement => {
    const enabled = opEnabled(op, n);
    return button({
      label: op.label,
      variant: activeOp?.id === op.id ? "accent" : undefined, size: "sm", disabled: !enabled,
      onClick: () => { if (op.fields.length) { activeOp = activeOp?.id === op.id ? null : op; renderTools(); } else runOp(op, {}); },
    });
  };

  setKids(host,
    el("div", { class: "tools-head" }, el("h2", {}, "Tools"),
      el("span", { class: "spacer" }),
      n ? button({ label: `Clear (${n})`, variant: "ghost", size: "sm", onClick: () => { selection.clear(); activeOp = null; renderTools(); } }) : null),
    el("div", { class: "tools-body" },
      el("div", { class: "tools-section" }, el("h3", {}, "Columns"), list),
      el("div", { class: "tools-section" }, el("h3", {}, "Whole file"), el("div", { class: "op-grid" }, ...GLOBAL_OPS.map(opBtn))),
      el("div", { class: "tools-section" },
        el("h3", {}, "Selected columns", n ? el("span", { class: "sel-count" }, ` · ${n} selected`) : null),
        el("div", { class: "op-grid" }, ...COLUMN_OPS.map(opBtn))),
      activeOp ? actionSheet(activeOp) : null),
    historySection(),
  );
}

function actionSheet(op: OpDef): HTMLElement {
  const values: Record<string, string | boolean> = {};
  op.fields.forEach((f) => { if (f.default !== undefined) values[f.key] = f.default; });
  const controls = op.fields.map((f) => {
    if (f.type === "enum") {
      const field = el("span", { class: "sel-field" });
      mountSelect(field, { options: (f.options ?? []).map(([val, lab]) => ({ value: val, label: lab })), value: typeof f.default === "string" ? f.default : undefined });
      const sel = field.querySelector("select") as HTMLSelectElement;
      values[f.key] = sel.value;
      sel.addEventListener("change", () => { values[f.key] = sel.value; });
      return el("label", { class: "field" }, el("span", {}, f.label), field);
    }
    if (f.type === "bool") {
      const cb = el("input", { type: "checkbox" }) as HTMLInputElement;
      cb.checked = !!f.default;
      cb.addEventListener("change", () => { values[f.key] = cb.checked; });
      return el("label", { class: "field field-bool" }, cb, el("span", {}, f.label));
    }
    const inp = el("input", { class: "field-input", type: "text", placeholder: f.placeholder ?? "", value: (f.default as string) ?? "" }) as HTMLInputElement;
    inp.addEventListener("input", () => { values[f.key] = inp.value; });
    return el("label", { class: "field" }, el("span", {}, f.label), inp);
  });
  return el("div", { class: "sheet" },
    el("div", { class: "sheet-title" }, op.label),
    ...controls,
    el("div", { class: "sheet-actions" },
      button({ label: "Cancel", variant: "ghost", size: "sm", onClick: () => { activeOp = null; renderTools(); } }),
      button({ label: "Apply", variant: "accent", size: "sm", onClick: () => runOp(op, values) })));
}

// The always-visible step timeline pinned to the bottom of the tools panel. Past steps are solid,
// the current point is highlighted, undone steps are faint — click any to jump there (undo/redo-to).
function historySection(): HTMLElement {
  const items: HTMLElement[] = [];
  items.push(histRow("Original dataset", () => undoTo(0), applied.length === 0 ? "is-current" : "is-done"));
  applied.forEach((s, i) => items.push(histRow(stepLabel(s), () => undoTo(i + 1), i === applied.length - 1 ? "is-current" : "is-done")));
  // undone steps, in forward order, so the user can replay them
  const redoable = [...redo].reverse().flatMap((g) => g);
  redoable.forEach((s, i) => items.push(histRow(stepLabel(s), () => redoTo(i + 1), "is-future")));
  return el("div", { class: "tools-section history" },
    el("div", { class: "history-head" },
      el("h3", {}, "History"),
      el("span", { class: "sel-count" }, ` · ${applied.length} step${applied.length === 1 ? "" : "s"}`)),
    el("div", { class: "hist-list" }, ...items));
}
function histRow(label: string, onClick: () => void, cls: string): HTMLElement {
  return el("button", { class: `hist-item ${cls}`, type: "button", title: "Revert to this point", onclick: onClick },
    el("span", { class: "hist-dot" }),
    el("span", { class: "hist-label" }, label));
}
function stepLabel(s: Step): string {
  const op = OPS.find((o) => o.id === s.kind);
  if (op) return op.label.replace(/…$/, "");
  switch (s.kind) {
    case "set_cell": return `Edit cell · ${String(s.params.column ?? "")}`;
    case "drop_rows": { const k = (s.params.indices as unknown[])?.length ?? 0; return `Delete ${k} row${k === 1 ? "" : "s"}`; }
    case "original": return "Original";
    default: return s.kind.replace(/_/g, " ");
  }
}

// ---------- toolbar pieces ----------
function searchBox(): HTMLElement {
  const inp = el("input", { type: "search", class: "dt-search-input", placeholder: "Search all columns…", "aria-label": "search the table" }) as HTMLInputElement;
  inp.addEventListener("input", () => {
    const v = inp.value.trim();
    if (v === searchQ) return;
    searchQ = v;
    if (searchDebounce !== undefined) clearTimeout(searchDebounce);
    searchDebounce = window.setTimeout(() => { offset = 0; void renderTable(); }, 180);
  });
  return el("div", { class: "dt-search" }, el("span", { class: "dt-search-ico" }, "⌕"), inp);
}

function modeButton(m: Mode, glyph: string, title: string): HTMLElement {
  const b = button({ label: glyph, variant: "ghost", size: "sm", ariaLabel: title, title, onClick: () => {
    // bulk shortcut: hitting Delete with rows selected removes them in one step
    if (m === "delete" && selectedRows.size) { stageSteps([step("drop_rows", { indices: [...selectedRows] })]); return; }
    setMode(mode === m ? "" : m);
  } });
  b.classList.add("dt-mode");
  b.setAttribute("data-mode", m as string);
  b.setAttribute("title", title);
  return b;
}
function setMode(m: Mode): void {
  mode = m;
  selectedRows.clear();
  document.querySelectorAll<HTMLElement>(".dt-mode").forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-mode") === m && m !== ""));
  syncSelChip();
  void renderTable();
}

function rowsPerPage(): HTMLElement {
  const field = el("span", { class: "sel-field" });
  mountSelect(field, { options: [50, 100, 200, 500].map((nn) => ({ value: String(nn), label: `${nn}/page` })), value: String(pageLimit) });
  const sel = field.querySelector("select") as HTMLSelectElement;
  sel.addEventListener("change", () => { pageLimit = Number(sel.value); offset = 0; void renderTable(); });
  field.classList.add("dt-rows");
  return field;
}

function columnsDropdown(): HTMLElement {
  const menu = el("div", { class: "dt-menu", hidden: true });
  const toggle = button({ label: "▦", variant: "ghost", size: "sm", ariaLabel: "Show / hide columns", title: "Show / hide columns", onClick: () => {
    if (menu.hasAttribute("hidden")) { fillColumnsMenu(menu); menu.removeAttribute("hidden"); }
    else menu.setAttribute("hidden", "");
  } });
  toggle.setAttribute("title", "Show / hide columns");
  const wrap = el("div", { class: "dt-dd" }, toggle, menu);
  document.addEventListener("click", (e) => { if (!wrap.contains(e.target as Node)) menu.setAttribute("hidden", ""); });
  return wrap;
}
function fillColumnsMenu(menu: HTMLElement): void {
  setKids(menu, ...cols.map((c) => {
    const cb = el("input", { type: "checkbox" }) as HTMLInputElement;
    cb.checked = !hiddenCols.has(c.name);
    cb.addEventListener("change", () => { cb.checked ? hiddenCols.delete(c.name) : hiddenCols.add(c.name); void renderTable(); });
    return el("label", { class: "dt-menu-item" }, cb, el("span", { class: "dt-menu-name" }, c.name));
  }));
}

function syncSelChip(): void {
  const chip = byId("selChip");
  const n = selectedRows.size;
  chip.classList.toggle("show", n > 0);
  setKids(chip,
    n ? el("span", { class: "sel-n" }, `${n} selected`) : null,
    n ? button({ label: "Delete rows", size: "sm", onClick: () => { if (selectedRows.size) stageSteps([step("drop_rows", { indices: [...selectedRows] })]); } }) : null,
    n ? button({ label: "✕", variant: "ghost", size: "sm", ariaLabel: "clear selection", title: "clear selection", onClick: clearSelection }) : null,
  );
}
function syncToolbar(): void {
  undoBtn?.classList.toggle("is-off", applied.length === 0);
  redoBtn?.classList.toggle("is-off", redo.length === 0);
}
function resetToolbarUi(): void {
  const si = document.querySelector(".dt-search-input") as HTMLInputElement | null;
  if (si) si.value = "";
  document.querySelectorAll<HTMLElement>(".dt-mode").forEach((b) => b.classList.remove("is-active"));
}

// ---------- chrome ----------
function renderChip(): void {
  const host = byId("chip");
  // a compact amenan-ui badge (the header chip context suits a pill, not a KPI tile)
  host.replaceChildren(
    cleanness != null ? badge({ label: `${Math.round(cleanness)}% clean`, tone: cleanness >= 80 ? "ok" : undefined }) : el("span", {}),
  );
}
function setStatus(msg: string): void { byId("status").textContent = msg; }

function buildChrome(): void {
  const file = el("input", { type: "file", accept: ".csv,text/csv" }) as HTMLInputElement;
  file.hidden = true;
  file.addEventListener("change", () => void openFile(file.files?.[0]));

  undoBtn = button({ label: "↶", variant: "ghost", size: "sm", ariaLabel: "undo", title: "undo", onClick: undo });
  redoBtn = button({ label: "↷", variant: "ghost", size: "sm", ariaLabel: "redo", title: "redo", onClick: redoAction });
  undoBtn.setAttribute("title", "Undo");
  redoBtn.setAttribute("title", "Redo");

  const header = el("header", { class: "app-header" },
    el("h1", {}, "csv-workbench"),
    el("span", { class: "muted" }, "clean & transform CSVs in your browser"),
    el("span", { id: "status", class: "status" }),
    el("span", { class: "spacer" }),
    el("span", { id: "chip", class: "chip" }),
    button({ label: "Load sample", onClick: loadSample }),
    button({ label: "Open CSV", variant: "accent", onClick: () => file.click() }),
    button({ label: "Export CSV", onClick: () => void exportCsv() }),
    file);

  const toolbar = el("div", { class: "dt-toolbar" },
    searchBox(),
    el("span", { class: "dt-sep" }),
    modeButton("edit", "✎", "Edit cells"),
    modeButton("select", "☑", "Select rows"),
    modeButton("delete", "🗑", "Delete rows"),
    el("span", { class: "dt-sep" }),
    undoBtn, redoBtn,
    el("span", { class: "dt-sep" }),
    columnsDropdown(),
    el("span", { id: "selChip", class: "dt-selchip" }),
    el("span", { class: "spacer" }),
    button({ label: "SQL", size: "sm", onClick: openSqlDrawer }),
    button({ label: "Clean tools", size: "sm", onClick: openToolsDrawer }));

  // The cleaning tools live in a right slide-over so the centered table card stays the hero.
  const drawer = el("dialog", { id: "tools-drawer", class: "tools-drawer" },
    el("div", { class: "drawer-head" },
      button({ label: "✕", variant: "ghost", size: "sm", ariaLabel: "close tools", title: "close tools", onClick: () => drawer.close() })),
    el("aside", { id: "tools", class: "tools-pane" })) as HTMLDialogElement;
  // a backdrop click lands on the <dialog> itself (never an inner node) — use that to close
  drawer.addEventListener("click", (e) => { if (e.target === drawer) drawer.close(); });

  // The SQL console gets its own (wider) slide-over — same pattern, its own pane.
  const sqlDrawer = el("dialog", { id: "sql-drawer", class: "tools-drawer sql-drawer" },
    el("div", { class: "drawer-head" },
      button({ label: "✕", variant: "ghost", size: "sm", ariaLabel: "close SQL", title: "close SQL", onClick: () => sqlDrawer.close() })),
    el("aside", { id: "sql-pane", class: "tools-pane" })) as HTMLDialogElement;
  sqlDrawer.addEventListener("click", (e) => { if (e.target === sqlDrawer) sqlDrawer.close(); });

  byId("root").append(
    header,
    el("main", { class: "page" },
      el("div", { class: "table-card" },
        toolbar,                                                  // the toolbar is the card's top — coupled to the table it drives
        el("section", { id: "table", class: "table-pane" }),
        el("div", { id: "pager", class: "pager" }))),
    drawer,
    sqlDrawer);

  wireTable();
}

// ---------- init ----------
window.addEventListener("DOMContentLoaded", () => {
  worker = new Worker(new URL("worker.js", location.href).href);
  worker.onmessage = (e: MessageEvent) => {
    const { id, ok, result, error } = e.data as { id: number; ok: boolean; result: unknown; error: string };
    const p = inflight.get(id);
    if (!p) return;
    inflight.delete(id);
    ok ? p.resolve(result) : p.reject(new Error(error));
  };
  buildChrome();
  void renderTable(); // empty state
  document.addEventListener("dragover", (e) => e.preventDefault());
  document.addEventListener("drop", (e) => { e.preventDefault(); void openFile(e.dataTransfer?.files?.[0]); });
});
