/* app.ts — the Cleaner: SpreadSheet Paper's cleaner page reborn on amenan-ui's
   Console theme, LIVE on the reused Polars-wasm engine, with a dual metadata
   plane (birama-engine when its API answers, localStorage otherwise).

   The mockup's regions → component mounts:
     topbar        back · ✨ Cleaner · status · store-mode · profile/docs/theme
     project tabs  one tab per project + a "+" (create modal)
     file tabs     Overview · one tab per file (cleanness dot) — per project
     header        file chip · score-badge · save-view · export · ⋯ menu
     body          [left: Filters · Views] [toolbar + table + pager | Overview]
                   [right: Tools (column-manager) · History (steps-panel)]

   Data plane: one engine worker PER OPEN FILE (LRU 3). Metadata plane: the
   CleanerStore seam — projects/files (steps persisted per file) + saved views.
   Bytes: the seed file re-fetches from its static asset; imports are session
   memory (steps survive a reload, bytes are re-imported). */
import {
  el,
  button,
  badge,
  toast,
  openModal,
  confirmModal,
  toggleMode,
  getMode,
  onThemeChange,
  mountWorkspacePanels,
  mountSidePanel,
  mountGridView,
  mountPager,
  mountFilterPanel,
  mountColumnManager,
  mountStepsPanel,
  mountScoreBadge,
  mountRedTable,
  mountTabs,
  mountUploader,
  mountMenu,
  input,
} from "amenan-ui";
import type {
  RedTableRow,
  RedTableColumn,
  ControlSpec,
  CleanOp,
  CleanValues,
  FilterNode,
  MountHandle,
  GridViewHandle,
} from "amenan-ui";
import { EnginePool, step } from "./engine.ts";
import type { FileEngine, Page, Step } from "./engine.ts";
import { OPS, type OpDef } from "./ops.ts";
import { newSession, querySpec, pruneToColumns, type FileSession } from "./session.ts";
import { connectStore } from "./store.ts";
import type { CleanerStore, ProjectMeta, FileMeta, ViewMeta } from "./store.ts";

// ---------- state ----------
let store!: CleanerStore;
let projects: ProjectMeta[] = [];
let files: FileMeta[] = [];
let activeProjectId: string | null = null;
let activeFileId: string | null = null; // null = the Overview tab
const sessions = new Map<string, FileSession>();
let lastViewTotal = 0;

const sessionBytes = new Map<string, ArrayBuffer>();
async function bytesOf(fileId: string): Promise<ArrayBuffer> {
  const held = sessionBytes.get(fileId);
  if (held) return held;
  const meta = files.find((f) => f.id === fileId);
  if (meta?.sourceUrl) {
    const b = await (await fetch(meta.sourceUrl)).arrayBuffer();
    sessionBytes.set(fileId, b);
    return b;
  }
  throw new Error("bytes for this import live in the session — re-import the file");
}
const pool = new EnginePool(bytesOf);

const active = (): FileSession | null => (activeFileId ? (sessions.get(activeFileId) ?? null) : null);
const activeMeta = (): FileMeta | null => files.find((f) => f.id === activeFileId) ?? null;
async function engineFor(fileId: string): Promise<FileEngine> {
  const sess = sessions.get(fileId);
  return (await pool.open(fileId, "fr", sess?.applied)).engine;
}

// ---------- shell ----------
const root = document.getElementById("root")!;
const status = el("span", { class: "cl-status" }, "booting…");
const modeBadgeHost = el("span", { class: "cl-mode" });

const themeIcon = el("i", { class: `bi ${getMode() === "dark" ? "bi-sun" : "bi-moon"}` });
const themeBtn = button({ variant: "ghost", title: "Toggle theme", ariaLabel: "Toggle theme", onClick: () => toggleMode() });
themeBtn.replaceChildren(themeIcon);
onThemeChange((_t, mode) => (themeIcon.className = `bi ${mode === "dark" ? "bi-sun" : "bi-moon"}`));

const topbar = el(
  "div",
  { class: "cl-topbar" },
  button({ icon: "bi-arrow-left", variant: "ghost", title: "Back", ariaLabel: "Back", onClick: () => history.back() }),
  el("h1", { class: "cl-title" }, el("i", { class: "bi bi-magic" }), " Cleaner"),
  el("span", { class: "cl-spacer" }),
  status,
  modeBadgeHost,
  button({ icon: "bi-person-circle", variant: "ghost", title: "Profile", ariaLabel: "Profile" }),
  button({ icon: "bi-book", variant: "ghost", title: "Docs", ariaLabel: "Docs" }),
  themeBtn,
);

const projTabsHost = el("div", { class: "cl-projtabs" });
const fileTabsHost = el("div", { class: "cl-filetabs" });

const fileChip = el("span", { class: "cl-file" });
const scoreHost = el("span", { class: "cl-score" });
const menuHost = el("span", { class: "cl-menu" });
const header = el(
  "div",
  { class: "cl-header" },
  fileChip,
  scoreHost,
  el("span", { class: "cl-spacer" }),
  button({ icon: "bi-bookmark-plus", label: "Save view", variant: "ghost", onClick: () => void saveViewModal() }),
  button({ icon: "bi-download", label: "Export CSV", variant: "ghost", onClick: () => void exportCsv() }),
  menuHost,
);

const wspHost = el("div", { class: "cl-body" });
root.append(topbar, projTabsHost, fileTabsHost, header, wspHost);

// ---------- shared table shapes ----------
const mapDtype = (d: string): "int" | "float" | undefined => {
  const t = d.toLowerCase();
  if (t.includes("float") || t.includes("f64") || t.includes("f32")) return "float";
  if (t.includes("int")) return "int";
  return undefined;
};
function tableColumns(s: FileSession): RedTableColumn[] {
  return s.cols
    .filter((c) => !s.hiddenCols.has(c.name))
    .map((c) => {
      const dtype = mapDtype(c.dtype);
      return { key: c.name, label: c.name, ...(dtype ? { dtype } : {}) };
    });
}
function rowsOf(page: Page): RedTableRow[] {
  return page.rows.map((r, i) => {
    const o: RedTableRow = { __idx: page.indices[i] ?? i };
    page.columns.forEach((c, j) => (o[c] = r[j]));
    return o;
  });
}
const fpColumns = (s: FileSession): { key: string; label?: string }[] => s.cols.map((c) => ({ key: c.name }));

// ---------- persistence (debounced steps/dims/score → the store) ----------
let persistTimer: number | undefined;
function schedulePersist(): void {
  const id = activeFileId;
  if (!id) return;
  window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    const s = sessions.get(id);
    const meta = files.find((f) => f.id === id);
    if (!s || !meta) return;
    const scoreVal = s.score?.score ?? null;
    meta.steps = [...s.applied];
    meta.rows = s.totalRows;
    meta.cols = s.cols.length;
    meta.score = scoreVal;
    store
      .patchFile(id, { steps: meta.steps, rows: meta.rows, cols: meta.cols, score: scoreVal })
      .catch((e: unknown) => toast({ message: `Save failed: ${String((e as Error)?.message || e)}`, tone: "danger" }));
  }, 500);
}

// ---------- the step pipeline ----------
function stageSteps(steps: Step[]): void {
  const s = active();
  if (!s) return;
  s.applied.push(...steps);
  s.redo.length = 0;
  void refresh();
}
async function runOp(op: OpDef, cols: string[], values: CleanValues): Promise<void> {
  const ask = op.confirm?.(cols, values);
  if (ask && !(await confirmModal({ title: ask.title, message: ask.message, ...(ask.danger ? { danger: true } : {}) }))) return;
  stageSteps(op.build(cols, values));
}
function undo(): void {
  const s = active();
  if (!s || !s.applied.length) return;
  s.redo.push([s.applied.pop() as Step]);
  void refresh();
}
function redoAction(): void {
  const s = active();
  const grp = s?.redo.pop();
  if (!s || !grp) return;
  s.applied.push(...grp);
  void refresh();
}

// ---------- toolbar ----------
let searchDebounce: number | undefined;
function controls(): ControlSpec<FileSession>[] {
  const s = active() ?? newSession();
  return [
    { kind: "button", id: "filters", icon: "bi-funnel", title: "Filters & views" },
    { kind: "search", id: "search", placeholder: "Search rows…", value: s.search, onInput: (q) => {
      window.clearTimeout(searchDebounce);
      searchDebounce = window.setTimeout(() => {
        const cur = active();
        if (!cur) return;
        cur.search = q;
        cur.offset = 0;
        void renderTable();
      }, 250);
    } },
    { kind: "sep" },
    { kind: "toggle", id: "mode-edit", icon: "bi-pencil-square", title: "Edit cells", group: "mode", active: (x) => x.mode === "edit" },
    { kind: "toggle", id: "mode-select", icon: "bi-check2-square", title: "Select rows", group: "mode", active: (x) => x.mode === "select" },
    { kind: "toggle", id: "mode-delete", icon: "bi-x-square", title: "Delete rows", group: "mode", active: (x) => x.mode === "delete" },
    { kind: "chip", id: "sel", label: (x) => `${x.selectedRows.size} selected`, visible: (x) => x.selectedRows.size > 0 },
    { kind: "button", id: "drop-selected", icon: "bi-trash", title: "Delete selected rows", variant: "danger", when: (x) => x.selectedRows.size > 0 },
    { kind: "sep" },
    { kind: "button", id: "refresh", icon: "bi-arrow-clockwise", title: "Refresh" },
    { kind: "toggle", id: "rownums", icon: "bi-list-ol", title: "Row numbers", active: (x) => x.rowNumbers },
    { kind: "menu", id: "rows", label: `${s.pageLimit}/page`, title: "Rows per page",
      items: [25, 50, 100, 500].map((x) => ({ id: String(x), label: `${x} rows` })) },
    { kind: "menu", id: "cols", icon: "bi-layout-three-columns", title: "Show / hide columns",
      items: s.cols.map((c) => ({ id: c.name, label: `${s.hiddenCols.has(c.name) ? "○" : "●"} ${c.name}` })) },
    { kind: "sep" },
    { kind: "button", id: "undo", icon: "bi-arrow-counterclockwise", title: "Undo (Ctrl+Z)" },
    { kind: "button", id: "redo", icon: "bi-arrow-clockwise", title: "Redo (Ctrl+Shift+Z)" },
    { kind: "button", id: "tools", icon: "bi-tools", title: "Cleaning tools" },
  ];
}

function onToolbarAction(id: string, ctx: { value?: string; menu?: string }): void {
  const s = active();
  if (!s) return;
  switch (id) {
    case "filters": panels.togglePanel("left"); break;
    case "tools": panels.togglePanel("right"); break;
    case "refresh": void refresh(); break;
    case "undo": undo(); break;
    case "redo": redoAction(); break;
    case "rownums":
      s.rowNumbers = !s.rowNumbers;
      grid.table.update?.({ rowNumbers: s.rowNumbers });
      syncToolbar();
      break;
    case "mode-edit":
    case "mode-select":
    case "mode-delete": {
      const m = id.slice(5) as FileSession["mode"];
      s.mode = s.mode === m ? "" : m;
      grid.table.setInteraction(s.mode === "" ? "browse" : s.mode);
      if (s.mode !== "select") {
        s.selectedRows.clear();
        grid.table.clearSelection();
      }
      syncToolbar();
      break;
    }
    case "drop-selected": {
      const indices = [...s.selectedRows].map(Number);
      void confirmModal({ title: `Delete ${indices.length} rows?`, message: "The step is undoable.", danger: true }).then((ok) => {
        if (ok) stageSteps([step("drop_rows", { indices })]);
      });
      break;
    }
    case "rows":
      if (ctx.menu) {
        s.pageLimit = Number(ctx.menu);
        s.offset = 0;
        void renderTable();
        syncToolbar(true);
      }
      break;
    case "cols":
      if (ctx.menu) {
        if (s.hiddenCols.has(ctx.menu)) s.hiddenCols.delete(ctx.menu);
        else s.hiddenCols.add(ctx.menu);
        void renderTable();
        syncToolbar(true);
      }
      break;
  }
}

// ---------- the body frame ----------
const panels = mountWorkspacePanels(wspHost);

const gridWrap = el("div", { class: "cl-grid" });
const overviewHost = el("div", { class: "cl-overview" });
panels.center.append(gridWrap, overviewHost);

const grid: GridViewHandle<FileSession> = mountGridView<FileSession>(gridWrap, {
  toolbar: { controls: controls(), onAction: onToolbarAction, state: newSession() },
  table: {
    columns: [],
    rows: [],
    rowKey: (r) => String(r["__idx"]),
    mode: "virtual",
    sortable: true,
    empty: { title: "No rows match", line: "Adjust the filters or the search." },
    onSort: (col) => {
      const s = active();
      if (!s) return;
      s.sort =
        s.sort?.col !== col ? { col, descending: false }
        : s.sort.descending ? null
        : { col, descending: true };
      s.offset = 0;
      void renderTable();
    },
    onSelectChange: (keys) => {
      const s = active();
      if (!s) return;
      s.selectedRows = new Set(keys);
      syncToolbar();
    },
    onRowDelete: (key) => stageSteps([step("drop_rows", { indices: [Number(key)] })]),
    onCellCommit: (rowKey, colKey, value) =>
      stageSteps([step("set_cell", { row: Number(rowKey), column: colKey, value })]),
  },
});
const pagerHost = el("div", { class: "cl-pager" });
gridWrap.append(pagerHost);
const pager = mountPager(pagerHost, {
  page: 1,
  pages: 1,
  total: 0,
  onPage: (p) => {
    const s = active();
    if (!s) return;
    s.offset = (p - 1) * s.pageLimit;
    void renderTable();
  },
});

// left panel — Filters + saved Views
let filterPanel: MountHandle<{ columns?: { key: string; label?: string }[]; value?: FilterNode | null }> | null = null;
let viewsHost: HTMLElement | null = null;
const leftPanel = mountSidePanel(panels.left, {
  side: "left",
  active: "filters",
  tabs: [
    {
      id: "filters",
      label: "Filters",
      icon: "bi-funnel",
      mount: (host) => {
        filterPanel = mountFilterPanel(host, {
          columns: [],
          onApply: (node: FilterNode) => {
            const s = active();
            if (!s) return;
            s.filter = node;
            s.offset = 0;
            void renderTable();
          },
          onClear: () => {
            const s = active();
            if (!s) return;
            s.filter = null;
            s.offset = 0;
            void renderTable();
          },
        });
        return filterPanel;
      },
    },
    {
      id: "views",
      label: "Views",
      icon: "bi-bookmark",
      mount: (host) => {
        viewsHost = el("div", { class: "cl-views" });
        host.append(viewsHost);
        void renderViews();
      },
    },
  ],
});
leftPanel.body("filters");
leftPanel.body("views");

// right panel — Tools + History
let colMgr: MountHandle<{ columns?: { key: string; label?: string }[] }> | null = null;
let stepsPanel: MountHandle<Record<string, unknown>> | null = null;
const rightPanel = mountSidePanel(panels.right, {
  side: "right",
  active: "tools",
  tabs: [
    {
      id: "tools",
      label: "Tools",
      icon: "bi-tools",
      mount: (host) => {
        colMgr = mountColumnManager(host, {
          columns: [],
          ops: OPS,
          onApply: (op: CleanOp, cols: string[], values: CleanValues) => void runOp(op as OpDef, cols, values),
        });
        return colMgr;
      },
    },
    {
      id: "history",
      label: "History",
      icon: "bi-clock-history",
      mount: (host) => {
        stepsPanel = mountStepsPanel(host, { steps: [], canUndo: false, canRedo: false, onUndo: undo, onRedo: redoAction });
        return stepsPanel;
      },
    },
  ],
});
rightPanel.body("tools");
rightPanel.body("history");

const scoreBadge = mountScoreBadge(scoreHost, {});

// header ⋯ menu — destructive file/project management
const menuTrigger = button({ icon: "bi-three-dots", variant: "ghost", title: "More", ariaLabel: "More" });
menuHost.append(menuTrigger);
mountMenu(menuHost, {
  trigger: menuTrigger,
  items: [
    { label: "Delete file", icon: "bi-trash", onSelect: () => void deleteActiveFile() },
    { sep: true },
    { label: "Delete project", icon: "bi-folder-x", onSelect: () => void deleteActiveProject() },
  ],
});

// ---------- tabs (projects · files) ----------
let fileTabs: MountHandle<{ value?: string }> | null = null;

function renderProjectTabs(): void {
  projTabsHost.replaceChildren();
  const items = projects.map((p) => ({ id: p.id, label: p.name }));
  const strip = el("div", { class: "cl-tabsrow" });
  projTabsHost.append(strip);
  const tabsHost = el("span", { class: "cl-tabs" });
  strip.append(
    el("i", { class: "bi bi-folder2-open cl-tabsicon" }),
    tabsHost,
    button({ icon: "bi-plus-lg", variant: "ghost", size: "sm", title: "New project", ariaLabel: "New project", onClick: () => void newProjectModal() }),
  );
  if (items.length) {
    mountTabs(tabsHost, {
      items,
      value: activeProjectId ?? items[0]?.id ?? "",
      onChange: (id) => void openProject(id),
    });
  }
}

const dotTone = (score: number | null | undefined): string =>
  score == null ? "" : score >= 90 ? "cl-dot--ok" : score >= 70 ? "cl-dot--warn" : "cl-dot--danger";

function renderFileTabs(): void {
  fileTabsHost.replaceChildren();
  const strip = el("div", { class: "cl-tabsrow" });
  fileTabsHost.append(strip);
  const tabsHost = el("span", { class: "cl-tabs" });
  strip.append(el("i", { class: "bi bi-files cl-tabsicon" }), tabsHost);
  const items = [
    { id: "__overview", label: "Overview" as const },
    ...files.map((f) => ({
      id: f.id,
      label: el("span", { class: "cl-filetab" }, el("i", { class: `cl-dot ${dotTone(f.score)}` }), f.filename) as Node,
    })),
  ];
  fileTabs = mountTabs(tabsHost, {
    items,
    value: activeFileId ?? "__overview",
    onChange: (id) => (id === "__overview" ? openOverview() : void openFile(id)),
  });
}

// ---------- the Overview tab (files table + import) ----------
function renderOverview(): void {
  overviewHost.replaceChildren();
  const tableHost = el("div", { class: "cl-overview-table" });
  const upHost = el("div", { class: "cl-overview-upload" });
  overviewHost.append(
    el("h2", { class: "cl-overview-title" }, "Files"),
    tableHost,
    upHost,
  );
  mountRedTable(tableHost, {
    columns: [
      { key: "filename", label: "File" },
      { key: "rows", label: "Rows", dtype: "int" },
      { key: "cols", label: "Cols", dtype: "int" },
      { key: "score", label: "Cleanness", dtype: "int" },
      { key: "steps", label: "Steps", dtype: "int" },
      { key: "src", label: "Bytes" },
    ],
    rows: files.map((f) => ({
      __idx: f.id,
      filename: f.filename,
      rows: f.rows ?? null,
      cols: f.cols ?? null,
      score: f.score ?? null,
      steps: f.steps.length,
      src: f.sourceUrl ? "asset" : sessionBytes.has(f.id) ? "session" : "re-import",
    })),
    rowKey: (r) => String(r["__idx"]),
    mode: "pager",
    pageSize: 50,
    onRowClick: (_row, key) => void openFile(key),
    empty: { title: "No files yet", line: "Import a CSV below." },
  });
  mountUploader(upHost, {
    label: "Drop CSVs here — or click to pick",
    hint: "Parsed in your browser; nothing is uploaded.",
    accept: ".csv,.tsv,.txt",
    multiple: true,
    onFiles: (list) => void importFiles(list),
  });
}

async function importFiles(list: File[]): Promise<void> {
  if (!activeProjectId) return;
  let firstId: string | null = null;
  for (const f of list) {
    const bytes = await f.arrayBuffer();
    const meta = await store.createFile({
      projectId: activeProjectId,
      filename: f.name,
      sizeBytes: f.size,
      steps: [],
    });
    sessionBytes.set(meta.id, bytes);
    files.push(meta);
    firstId = firstId ?? meta.id;
  }
  renderFileTabs();
  renderOverview();
  if (firstId) await openFile(firstId);
}

// ---------- open / switch ----------
function showOverview(show: boolean): void {
  overviewHost.hidden = !show;
  gridWrap.hidden = show;
  header.hidden = show;
}

function openOverview(): void {
  activeFileId = null;
  showOverview(true);
  renderOverview();
  fileTabs?.update?.({ value: "__overview" });
  status.textContent = `${files.length} file${files.length === 1 ? "" : "s"}`;
}

async function openFile(fileId: string): Promise<void> {
  const meta = files.find((f) => f.id === fileId);
  if (!meta) return;
  activeFileId = fileId;
  showOverview(false);
  fileTabs?.update?.({ value: fileId });
  fileChip.replaceChildren(el("i", { class: "bi bi-file-earmark-spreadsheet" }), ` ${meta.filename}`);
  status.textContent = "opening…";

  let s = sessions.get(fileId);
  if (!s) {
    s = newSession();
    s.applied = [...meta.steps]; // the persisted pipeline replays on open
    sessions.set(fileId, s);
  }

  try {
    const opened = await pool.open(fileId, "fr", s.applied);
    // The wrapped-CSV rescue as an explicit, undoable FIRST step (once).
    if (opened.raw.cols === 1 && !s.applied.some((x) => x.kind === "unwrap_csv")) {
      s.applied.unshift(step("unwrap_csv"));
    }
  } catch (e) {
    status.textContent = String((e as Error)?.message || e);
    status.classList.add("is-error");
    toast({ message: status.textContent, tone: "danger" });
    openOverview();
    return;
  }
  status.classList.remove("is-error");

  // re-target the mounted handles at this session
  grid.table.setInteraction(s.mode === "" ? "browse" : s.mode);
  filterPanel?.update?.({ value: (s.filter as FilterNode | null) ?? null });
  await refresh();
  void renderViews();
}

async function openProject(projectId: string): Promise<void> {
  activeProjectId = projectId;
  files = await store.listFiles(projectId);
  renderFileTabs();
  openOverview();
}

// ---------- rendering ----------
async function renderTable(): Promise<void> {
  const s = active();
  if (!s || !activeFileId) return;
  const eng = await engineFor(activeFileId);
  const page = await eng.view(querySpec(s), s.offset, s.pageLimit);
  lastViewTotal = page.total;
  grid.table.update?.({
    rows: rowsOf(page),
    columns: tableColumns(s),
    sort: s.sort,
    rowNumbers: s.rowNumbers,
  });
  const pages = Math.max(1, Math.ceil(page.total / s.pageLimit));
  pager.update?.({ page: Math.floor(s.offset / s.pageLimit) + 1, pages, total: page.total });
}

function syncToolbar(rebuild = false): void {
  const s = active();
  if (!s) return;
  if (rebuild) grid.toolbar?.update?.({ controls: controls() });
  grid.update?.({ state: s });
  grid.toolbar?.setDisabled("undo", s.applied.length === 0);
  grid.toolbar?.setDisabled("redo", s.redo.length === 0);
}

function syncSteps(): void {
  const s = active();
  if (!s) return;
  const timeline = [
    ...s.applied.map((x) => ({ kind: x.kind, params: x.params, applied: true })),
    ...[...s.redo].reverse().flat().map((x) => ({ kind: x.kind, params: x.params, applied: false })),
  ];
  stepsPanel?.update?.({ steps: timeline, canUndo: s.applied.length > 0, canRedo: s.redo.length > 0 });
}

async function rescore(): Promise<void> {
  const s = active();
  if (!s || !activeFileId) return;
  try {
    const eng = await engineFor(activeFileId);
    const rep = await eng.score();
    s.score = rep;
    scoreBadge.update?.({
      ...(rep.score != null ? { score: rep.score } : {}),
      ...(rep.report ? { report: rep.report } : {}),
    });
  } catch {
    s.score = null;
  }
  schedulePersist(); // the score belongs in the persisted meta
}

async function refresh(): Promise<void> {
  const s = active();
  if (!s || !activeFileId) return;
  const eng = await engineFor(activeFileId);
  try {
    const dims = await eng.setSteps(s.applied);
    s.totalRows = dims.rows;
    s.cols = await eng.columnsMeta();
  } catch (e) {
    toast({ message: `Step failed: ${String((e as Error)?.message || e)}`, tone: "danger" });
    s.applied.pop();
    return refresh();
  }
  pruneToColumns(s);
  filterPanel?.update?.({ columns: fpColumns(s) });
  colMgr?.update?.({ columns: fpColumns(s) });
  await renderTable();
  syncSteps();
  syncToolbar(true);
  void rescore();
  schedulePersist();
  status.textContent = `${s.totalRows.toLocaleString()} rows × ${s.cols.length} cols`;
}

// ---------- saved views ----------
async function renderViews(): Promise<void> {
  if (!viewsHost) return;
  viewsHost.replaceChildren();
  if (!activeFileId) {
    viewsHost.append(el("p", { class: "cl-views-empty" }, "Open a file to see its saved views."));
    return;
  }
  const views = await store.listViews(activeFileId).catch(() => [] as ViewMeta[]);
  if (!views.length) {
    viewsHost.append(el("p", { class: "cl-views-empty" }, "No saved views — filter something and Save view."));
    return;
  }
  for (const v of views) {
    viewsHost.append(
      el(
        "div",
        { class: "cl-view" },
        button({ label: v.name, variant: "ghost", size: "sm", onClick: () => void applyView(v) }),
        button({ icon: "bi-x", variant: "ghost", size: "sm", title: "Delete view", ariaLabel: "Delete view", onClick: () => {
          void store.deleteView(v.id).then(() => renderViews());
        } }),
      ),
    );
  }
}

async function applyView(v: ViewMeta): Promise<void> {
  const s = active();
  if (!s) return;
  s.filter = v.query.filter ?? null;
  s.search = v.query.search ?? "";
  s.sort = v.query.sort?.[0] ?? null;
  s.offset = 0;
  filterPanel?.update?.({ value: (s.filter as FilterNode | null) ?? null });
  syncToolbar(true); // the search box re-seeds from session
  await renderTable();
  toast({ message: `View "${v.name}" applied` });
}

async function saveViewModal(): Promise<void> {
  const s = active();
  if (!s || !activeFileId) return;
  const name = input({ placeholder: "View name" });
  openModal({
    title: "Save view",
    body: el("div", {}, el("p", {}, "Saves the current filter, search, and sort."), name),
    actions: [
      { label: "Cancel", variant: "ghost", onClick: (api) => api.close() },
      { label: "Save", variant: "accent", onClick: (api) => {
        const label = name.value.trim() || "view";
        void store
          .createView({
            fileId: activeFileId as string,
            name: label,
            query: {
              ...(s.filter ? { filter: s.filter } : {}),
              ...(s.search ? { search: s.search } : {}),
              ...(s.sort ? { sort: [s.sort] } : {}),
            },
          })
          .then(() => {
            api.close();
            toast({ message: `View "${label}" saved` });
            void renderViews();
          });
      } },
    ],
  });
}

// ---------- create / delete ----------
async function newProjectModal(): Promise<void> {
  const name = input({ placeholder: "Project name" });
  const desc = input({ placeholder: "Description (optional)" });
  openModal({
    title: "New project",
    body: el("div", { class: "cl-form" }, name, desc),
    actions: [
      { label: "Cancel", variant: "ghost", onClick: (api) => api.close() },
      { label: "Create", variant: "accent", onClick: (api) => {
        const label = name.value.trim();
        if (!label) return;
        void store.createProject(label, desc.value.trim() || undefined).then((p) => {
          projects.push(p);
          api.close();
          renderProjectTabs();
          void openProject(p.id);
        });
      } },
    ],
  });
}

async function deleteActiveFile(): Promise<void> {
  const meta = activeMeta();
  if (!meta) return;
  if (!(await confirmModal({ title: `Delete ${meta.filename}?`, message: "Its steps and saved views go with it.", danger: true }))) return;
  await store.deleteFile(meta.id);
  pool.close(meta.id);
  sessions.delete(meta.id);
  sessionBytes.delete(meta.id);
  files = files.filter((f) => f.id !== meta.id);
  renderFileTabs();
  openOverview();
}

async function deleteActiveProject(): Promise<void> {
  const p = projects.find((x) => x.id === activeProjectId);
  if (!p) return;
  if (!(await confirmModal({ title: `Delete project ${p.name}?`, message: "Every file and view in it goes too.", danger: true }))) return;
  await store.deleteProject(p.id);
  for (const f of files) {
    pool.close(f.id);
    sessions.delete(f.id);
    sessionBytes.delete(f.id);
  }
  projects = projects.filter((x) => x.id !== p.id);
  renderProjectTabs();
  const next = projects[0];
  if (next) await openProject(next.id);
  else {
    files = [];
    renderFileTabs();
    openOverview();
  }
}

async function exportCsv(): Promise<void> {
  const meta = activeMeta();
  if (!meta || !activeFileId) return;
  const eng = await engineFor(activeFileId);
  const csv = await eng.toCsv();
  const blob = new Blob([csv], { type: "text/csv" });
  const stem = meta.filename.replace(/\.[^.]+$/, "");
  const a = el("a", { href: URL.createObjectURL(blob), download: `${stem}.cleaned.csv` });
  a.click();
  URL.revokeObjectURL(a.href);
  toast({ message: `Exported ${stem}.cleaned.csv` });
}

// ---------- keyboard ----------
window.addEventListener("keydown", (e) => {
  const t = e.target as HTMLElement | null;
  if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
  if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
  e.preventDefault();
  if (e.shiftKey) redoAction();
  else undo();
});

// ---------- boot ----------
async function main(): Promise<void> {
  status.textContent = "connecting…";
  store = await connectStore();
  modeBadgeHost.append(
    badge({ label: store.mode === "birama" ? "birama-engine" : "local", tone: store.mode === "birama" ? "ok" : "info" }),
  );
  projects = await store.listProjects();
  if (!projects.length) {
    // a fresh birama backend: seed the demo project on the fly
    const p = await store.createProject("dossier", "The Fleury case extract — 101k wrapped rows.");
    projects = [p];
    await store.createFile({ projectId: p.id, filename: "dossier.csv", sourceUrl: "data/dossier.csv", sizeBytes: 14_118_431, steps: [] });
  }
  renderProjectTabs();
  activeProjectId = projects[0]?.id ?? null;
  if (activeProjectId) {
    files = await store.listFiles(activeProjectId);
    renderFileTabs();
    const first = files[0];
    if (first) await openFile(first.id);
    else openOverview();
  }
  (window as unknown as { __cleanerSmoke: unknown }).__cleanerSmoke = {
    mode: store.mode,
    projects: projects.length,
    files: files.length,
    rows: active()?.totalRows ?? 0,
    cols: active()?.cols.length ?? 0,
    viewTotal: lastViewTotal,
  };
}

void main().catch((e: unknown) => {
  status.textContent = `boot failed: ${String((e as Error)?.message || e)}`;
  status.classList.add("is-error");
});
