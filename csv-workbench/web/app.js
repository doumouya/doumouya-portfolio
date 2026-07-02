"use strict";
(() => {
  // ../../amenan-ui/src/kernel/dom.ts
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs ?? {})) {
      if (v == null) continue;
      if (k === "class") node.className = String(v);
      else if (k.startsWith("on") && typeof v === "function") {
        node.addEventListener(k.slice(2), v);
      } else node.setAttribute(k, String(v));
    }
    for (const c of children.flat(Infinity)) {
      if (c == null) continue;
      const isNode = typeof c === "object" && c !== null && "nodeType" in c;
      node.appendChild(isNode ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  // ../../amenan-ui/src/theme/theme.ts
  var THEME_KEY = "amu-theme";
  var MODE_KEY = "amu-mode";
  var DEFAULT_THEME = "redpash";
  var DEFAULT_MODE = "dark";
  var prePaintSnippet = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var m=localStorage.getItem("${MODE_KEY}");var d=document.documentElement;var isMode=function(v){return v==="dark"||v==="light";};if(!isMode(m)){m=isMode(t)?t:"${DEFAULT_MODE}";}var theme=(t&&!isMode(t))?t:"${DEFAULT_THEME}";d.setAttribute("data-theme",theme);d.setAttribute("data-mode",m);}catch(e){}})();`;

  // ../../amenan-ui/src/components/atoms/atoms.ts
  function button(cfg) {
    const cls = ["amu-btn"];
    if (cfg.variant) cls.push(`amu-btn--${cfg.variant}`);
    if (cfg.size) cls.push(`amu-btn--${cfg.size}`);
    if (cfg.icon && cfg.label == null) cls.push("amu-btn--icon");
    const b = el(
      "button",
      {
        class: cls.join(" "),
        type: cfg.type ?? "button",
        onclick: cfg.onClick,
        title: cfg.title ?? null,
        "aria-label": cfg.ariaLabel ?? cfg.title ?? null
      },
      cfg.icon ? el("i", { class: "bi " + cfg.icon }) : null,
      cfg.label ?? null
    );
    if (cfg.disabled) b.disabled = true;
    return b;
  }
  function input(cfg = {}) {
    const i = el("input", {
      class: "amu-input",
      type: cfg.type ?? "text",
      placeholder: cfg.placeholder ?? ""
    });
    if (cfg.value != null) i.value = cfg.value;
    const onInput = cfg.onInput;
    if (onInput) i.addEventListener("input", () => onInput(i.value));
    const onEnter = cfg.onEnter;
    if (onEnter) {
      i.addEventListener("keydown", (e) => {
        if (e.key === "Enter") onEnter(i.value);
      });
    }
    return i;
  }
  function badge(cfg) {
    return el(
      "span",
      { class: `amu-badge${cfg.tone ? ` amu-badge--${cfg.tone}` : ""}` },
      cfg.label
    );
  }

  // ../../amenan-ui/src/components/empty-state/empty-state.ts
  function mountEmptyState(host, cfg) {
    const node = el(
      "div",
      { class: "amu-empty" },
      el("h3", { class: "amu-empty-title" }, cfg.title),
      cfg.line ? el("p", { class: "amu-empty-line" }, cfg.line) : null,
      cfg.action ? button({ variant: "accent", ...cfg.action }) : null
    );
    host.append(node);
    return { el: node, update() {
    }, destroy: () => node.remove() };
  }

  // ../../amenan-ui/src/components/select/select.ts
  function mountSelect(host, cfg) {
    const sel = el("select", { class: "amu-select" });
    function render(options, value) {
      sel.replaceChildren(
        ...options.map((o) => {
          const opt = el("option", { value: o.value }, o.label);
          if (o.value === value) opt.selected = true;
          return opt;
        })
      );
    }
    render(cfg.options ?? [], cfg.value);
    sel.addEventListener("change", () => cfg.onChange?.(sel.value));
    host.append(sel);
    return {
      el: sel,
      update: (p) => render(p.options ?? cfg.options ?? [], p.value ?? sel.value),
      destroy: () => sel.remove()
    };
  }

  // ../../amenan-ui/src/components/chart/build.ts
  var TYPES = {
    cartesian: [
      ["bar", "bi-bar-chart", "Bar"],
      ["line", "bi-graph-up", "Line"],
      ["area", "bi-graph-up-arrow", "Area"]
    ],
    barh: [["barh", "bi-bar-chart-steps", "Horizontal"]],
    scatter: [["scatter", "bi-circle", "Scatter"]],
    pie: [
      ["pie", "bi-pie-chart-fill", "Pie"],
      ["donut", "bi-circle", "Donut"],
      ["half_donut", "bi-circle-half", "Half-donut"],
      ["rose", "bi-flower2", "Rose"]
    ],
    radar: [["radar", "bi-pentagon", "Radar"]],
    gauge: [["gauge", "bi-speedometer", "Gauge"]],
    pictorial: [["pictorial", "bi-dice-3", "Pictorial"]]
  };
  var TYPE_TO_KIND = {};
  Object.entries(TYPES).forEach(
    ([kind, list]) => list.forEach(([t]) => {
      TYPE_TO_KIND[t] = kind;
    })
  );
  var TYPE_LIST = Object.values(TYPES).flat();

  // ../../amenan-ui/src/components/sql-editor/sql-editor.ts
  function mountSqlEditor(host, cfg) {
    const root = el("div", { class: "amu-sqleditor" });
    const area = el("textarea", {
      class: "amu-sqleditor-input",
      placeholder: "SELECT * FROM t LIMIT 100",
      spellcheck: "false",
      rows: "6"
    });
    area.value = cfg.value ?? "";
    const status = el("div", { class: "amu-sqleditor-status" });
    const setStatus2 = (msg, tone) => {
      status.textContent = msg ?? "";
      status.dataset.tone = tone ?? "";
    };
    const name = input({ placeholder: "result name", value: cfg.suggestName?.() ?? "" });
    name.classList.add("amu-sqleditor-name");
    const run = button({ label: "Run", variant: "accent", onClick: doRun });
    const save = button({ label: "Save as file", variant: "ghost", onClick: doSave });
    const actions = cfg.onMaterialize ? el("div", { class: "amu-sqleditor-actions" }, name, save, run) : el("div", { class: "amu-sqleditor-actions" }, run);
    root.append(
      el(
        "div",
        { class: "amu-sqleditor-hint" },
        "Query the open file as table ",
        el("code", { class: "amu-sqleditor-t" }, "t"),
        " \u2014 read-only."
      ),
      area,
      el("div", { class: "amu-sqleditor-foot" }, status, actions)
    );
    async function doRun() {
      const q = area.value.trim();
      if (!q) return;
      setStatus2("Running\u2026", "muted");
      run.disabled = true;
      try {
        await cfg.onRun?.(q);
        setStatus2("");
      } catch (e) {
        setStatus2(e instanceof Error ? e.message : "Query failed", "danger");
      } finally {
        run.disabled = false;
      }
    }
    async function doSave() {
      const q = area.value.trim();
      if (!q) return;
      setStatus2("Saving\u2026", "muted");
      save.disabled = true;
      try {
        await cfg.onMaterialize?.(q, name.value.trim() || "query_result");
        setStatus2("Saved as a new file.", "ok");
      } catch (e) {
        setStatus2(e instanceof Error ? e.message : "Save failed", "danger");
      } finally {
        save.disabled = false;
      }
    }
    host.append(root);
    return { el: root, query: () => area.value, destroy: () => root.remove() };
  }

  // ../../amenan-ui/src/components/redtable/editor-registry.ts
  var editors = /* @__PURE__ */ new Map();
  function registerEditor(dtype, factory) {
    editors.set(dtype, factory);
  }
  function makeEditor({ type = "text", parse = (s) => s } = {}) {
    return (td, { value, onCommit }) => {
      const prev = [...td.childNodes];
      const field = el("input", { class: "amu-input amu-redtable-editor", type });
      field.value = value == null ? "" : String(value);
      td.replaceChildren(field);
      field.focus();
      field.select();
      let done = false;
      const restore = () => td.replaceChildren(...prev);
      const commit = () => {
        if (done) return;
        done = true;
        const next = parse(field.value);
        restore();
        if (next !== void 0) onCommit?.(next);
      };
      const cancel = () => {
        if (done) return;
        done = true;
        restore();
      };
      field.addEventListener("blur", commit);
      field.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancel();
          field.blur();
        }
      });
      return { commit, cancel, el: field };
    };
  }
  function parseNumber(s) {
    const t = s.trim();
    if (t === "") return "";
    const n = Number(t);
    return Number.isFinite(n) ? n : void 0;
  }
  registerEditor("text", makeEditor());
  registerEditor("int", makeEditor({ type: "number", parse: parseNumber }));
  registerEditor("float", makeEditor({ type: "number", parse: parseNumber }));

  // web/app.ts
  var step = (kind, params) => ({ kind, params });
  var OPS = [
    { id: "snake_case_columns", label: "snake_case headers", scope: "global", fields: [], build: () => [step("snake_case_columns", {})] },
    {
      id: "replace_in_names",
      label: "Replace in names\u2026",
      scope: "global",
      fields: [{ key: "find", type: "text", label: "Find" }, { key: "replace", type: "text", label: "Replace with", placeholder: "(blank to remove)" }],
      build: (_s, v) => [step("replace_in_names", { find: v.find ?? "", replace: v.replace ?? "" })]
    },
    {
      id: "change_case",
      label: "Change case\u2026",
      scope: "global",
      fields: [{ key: "mode", type: "enum", label: "Case", options: [["lower", "lowercase"], ["upper", "UPPERCASE"]], default: "lower" }],
      build: (_s, v) => [step("change_case", { mode: v.mode ?? "lower" })]
    },
    { id: "unwrap_csv", label: "Unwrap embedded CSV", scope: "global", fields: [], build: () => [step("unwrap_csv", {})] },
    { id: "drop_columns", label: "Delete selected", scope: "column", min: 1, fields: [], build: (sel) => [step("drop_columns", { cols: sel })] },
    { id: "filter_columns", label: "Keep only selected", scope: "column", min: 1, fields: [], build: (sel) => [step("filter_columns", { cols: sel })] },
    { id: "drop_nulls", label: "Drop rows with empty", scope: "column", min: 1, fields: [], build: (sel) => [step("drop_nulls", { cols: sel })] },
    {
      id: "fill_nulls",
      label: "Fill empties\u2026",
      scope: "column",
      min: 1,
      fields: [{ key: "strategy", type: "enum", label: "With", options: [["fixed", "a value"], ["forward", "previous value"], ["zero", "zero"]], default: "fixed" }, { key: "value", type: "text", label: "Value", placeholder: 'when "a value"' }],
      build: (sel, v) => sel.map((c) => step("fill_nulls", { column: c, strategy: v.strategy ?? "fixed", value: v.value ?? "" }))
    },
    {
      id: "replace_text",
      label: "Find & replace\u2026",
      scope: "column",
      min: 1,
      max: 1,
      fields: [{ key: "find", type: "text", label: "Find" }, { key: "replace", type: "text", label: "Replace with", placeholder: "(blank to remove)" }, { key: "is_regex", type: "bool", label: "Regular expression", default: false }],
      build: (sel, v) => [step("replace_text", { column: sel[0], find: v.find ?? "", replace: v.replace ?? "", is_regex: !!v.is_regex })]
    },
    {
      id: "cast",
      label: "Change type\u2026",
      scope: "column",
      min: 1,
      max: 1,
      fields: [{ key: "dtype", type: "enum", label: "To type", options: [["str", "Text"], ["int", "Integer"], ["float", "Decimal"], ["bool", "Boolean"], ["date", "Date"]], default: "str" }],
      build: (sel, v) => [step("cast", { column: sel[0], dtype: v.dtype ?? "str" })]
    },
    {
      id: "rename_column",
      label: "Rename\u2026",
      scope: "column",
      min: 1,
      max: 1,
      fields: [{ key: "to", type: "text", label: "New name" }],
      build: (sel, v) => [step("rename_column", { from: sel[0], to: v.to ?? "" })]
    },
    {
      id: "split_column",
      label: "Split\u2026",
      scope: "column",
      min: 1,
      max: 1,
      fields: [{ key: "sep", type: "text", label: "Separator", default: "," }, { key: "keep_original", type: "bool", label: "Keep original column", default: false }],
      build: (sel, v) => [step("split_column", { column: sel[0], sep: v.sep ?? ",", keep_original: !!v.keep_original })]
    },
    {
      id: "join_columns",
      label: "Combine\u2026",
      scope: "column",
      min: 2,
      max: 2,
      fields: [{ key: "sep", type: "text", label: "Separator", default: " " }, { key: "new_name", type: "text", label: "New column name" }],
      build: (sel, v) => [step("join_columns", { col1: sel[0], col2: sel[1], sep: v.sep ?? " ", new_name: v.new_name || `${sel[0]}_${sel[1]}` })]
    },
    {
      id: "format_dates",
      label: "Format dates\u2026",
      scope: "column",
      min: 1,
      max: 1,
      fields: [{ key: "fmt", type: "text", label: "Format", default: "%Y-%m-%d", placeholder: "%Y-%m-%d" }, { key: "on_incomplete", type: "enum", label: "If unparseable", options: [["null", "blank it"], ["drop", "drop the row"], ["keep", "keep as-is"]], default: "null" }],
      build: (sel, v) => [step("format_dates", { column: sel[0], fmt: v.fmt || "%Y-%m-%d", on_incomplete: v.on_incomplete ?? "null" })]
    },
    {
      id: "fix_invalid",
      label: "Fix invalid\u2026",
      scope: "column",
      min: 1,
      fields: [{ key: "sentinels", type: "sentinels", label: "Treat as invalid", placeholder: "N/A, -, ??? \u2026" }],
      build: (sel, v) => [step("fix_invalid", { columns: sel, sentinels: String(v.sentinels ?? "").split(",").map((s) => s.trim()).filter(Boolean) })]
    }
  ];
  var GLOBAL_OPS = OPS.filter((o) => o.scope === "global");
  var COLUMN_OPS = OPS.filter((o) => o.scope === "column");
  var opEnabled = (o, n) => o.scope === "global" || n >= (o.min ?? 1) && n <= (o.max ?? Infinity);
  var worker;
  var seq = 0;
  var inflight = /* @__PURE__ */ new Map();
  function engineCall(op, payload) {
    return new Promise((resolve, reject) => {
      const id = ++seq;
      inflight.set(id, { resolve, reject });
      worker.postMessage({ id, op, payload });
    });
  }
  var pageLimit = 100;
  var cols = [];
  var applied = [];
  var redo = [];
  var selection = /* @__PURE__ */ new Set();
  var selectedRows = /* @__PURE__ */ new Set();
  var rowIndices = [];
  var hiddenCols = /* @__PURE__ */ new Set();
  var mode = "";
  var searchQ = "";
  var searchDebounce;
  var sort = null;
  var offset = 0;
  var totalRows = 0;
  var cleanness = null;
  var activeOp = null;
  var undoBtn;
  var redoBtn;
  var byId = (id) => document.getElementById(id);
  function setKids(host, ...kids) {
    host.replaceChildren(...kids.filter((k) => k != null && k !== false));
  }
  var SAMPLE_CSV = `ID Client,Nom complet,Ville,R\xE9gion,Chiffre d'affaires,Actif ?,Date d'inscription
1,Marie Dupont,Paris,\xCEle-de-France,"12 500,00",oui,14/03/2024
2,Liam O'Brien ,Rennes,Bretagne,"8 750,50",non,02/11/2023
3,Sofia Rossi,Toulouse,Occitanie,"1 299,90",OUI,28/02/2024
4,Hans Becker,Strasbourg,Grand Est,"23 400,00",oui,
5,Am\xE9lie Laurent,Paris,\xCEle-de-France,"5 600,75",non,07/07/2023
6,Lucas Martin,Nantes,Pays de la Loire,"940,20",oui,19/09/2024
7,,Lyon,Auvergne-Rh\xF4ne-Alpes,"15 250,00",oui,11/01/2024
8,Chen Wei,Paris,\xEEle-de-france,"3 420,10",non,05/05/2024
9,Olivia Brown,Bordeaux,Nouvelle-Aquitaine,,Oui,23/08/2023
10,L\xE9a Moreau,Rennes,Bretagne,"7 800,00",oui,30/04/2024
11,Thomas Petit,Marseille,PACA,"19 999,99",NON,12/12/2023
12,Camille Roux,Toulouse,Occitanie,"2 150,40",oui,08/06/2024
`;
  function loadSample() {
    void openFile(new File([SAMPLE_CSV], "sample-clients-fr.csv", { type: "text/csv" }));
  }
  async function openFile(file) {
    if (!file) return;
    setStatus(`Parsing ${file.name}\u2026`);
    const buf = await file.arrayBuffer();
    try {
      const dims = await engineCall("load", { bytes: buf, tld: void 0 });
      applied.length = 0;
      redo.length = 0;
      selection.clear();
      selectedRows.clear();
      hiddenCols.clear();
      sort = null;
      offset = 0;
      searchQ = "";
      mode = "";
      totalRows = dims.rows;
      document.getElementById("sql-result")?.replaceChildren();
      resetToolbarUi();
      await refresh();
      setStatus("");
    } catch (e) {
      setStatus(`Could not parse: ${e.message}`);
    }
  }
  async function refresh() {
    const dims = await engineCall("set_steps", { steps: JSON.stringify(applied) });
    totalRows = dims.rows;
    cols = JSON.parse(await engineCall("columns_meta"));
    const names = new Set(cols.map((c) => c.name));
    for (const s of [...selection]) if (!names.has(s)) selection.delete(s);
    for (const h of [...hiddenCols]) if (!names.has(h)) hiddenCols.delete(h);
    if (sort && !names.has(sort.col)) sort = null;
    if (offset >= totalRows) offset = 0;
    selectedRows.clear();
    renderTools();
    await renderTable();
    syncToolbar();
    syncSelChip();
    rescore();
  }
  async function rescore() {
    try {
      const rep = JSON.parse(await engineCall("score"));
      cleanness = rep.score;
    } catch {
      cleanness = null;
    }
    renderChip();
  }
  function stageSteps(steps) {
    applied.push(...steps);
    redo.length = 0;
    activeOp = null;
    void refresh();
  }
  function runOp(op, values) {
    const sel = [...selection];
    if (!opEnabled(op, sel.length)) return;
    stageSteps(op.build(sel, values));
  }
  function undo() {
    if (!applied.length) return;
    redo.push([applied.pop()]);
    void refresh();
  }
  function redoAction() {
    const grp = redo.pop();
    if (!grp) return;
    applied.push(...grp);
    void refresh();
  }
  function undoTo(n) {
    while (applied.length > n) redo.push([applied.pop()]);
    void refresh();
  }
  function redoTo(k) {
    for (let i = 0; i < k && redo.length; i++) applied.push(...redo.pop());
    void refresh();
  }
  async function exportCsv() {
    const csv = await engineCall("to_csv");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = el("a", { href: URL.createObjectURL(blob), download: "cleaned.csv" });
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function renderTable() {
    const host = byId("table");
    if (!cols.length) {
      host.replaceChildren();
      mountEmptyState(host, {
        title: "Open a CSV \u2014 it stays on your device.",
        line: "Parsed and cleaned entirely in your browser by a Polars\u2192WebAssembly engine. Nothing is uploaded. No file handy? Click \u201CLoad sample\u201D to try it on a messy French dataset.",
        action: { label: "Load sample", onClick: loadSample }
      });
      return;
    }
    const q = {};
    if (searchQ) q.search = searchQ;
    if (sort) q.sort = [{ col: sort.col, descending: sort.descending }];
    const query = Object.keys(q).length ? JSON.stringify(q) : null;
    const page = JSON.parse(await engineCall("view", { query, offset, limit: pageLimit }));
    rowIndices = page.indices ?? page.rows.map((_, i) => offset + i);
    const visible = page.columns.map((name, i) => ({ name, i })).filter(({ name }) => !hiddenCols.has(name));
    const headRow = el("tr");
    const selAll = el("input", { type: "checkbox", id: "selAll", class: "row-chk", "aria-label": "select all rows on this page" });
    const onPage = rowIndices.filter((ix) => selectedRows.has(ix)).length;
    selAll.checked = rowIndices.length > 0 && onPage === rowIndices.length;
    selAll.indeterminate = onPage > 0 && onPage < rowIndices.length;
    headRow.append(el("th", { class: "col-chk" }, selAll));
    const numericCols = new Set(cols.filter((c) => c.dtype === "int" || c.dtype === "float").map((c) => c.name));
    visible.forEach(({ name }) => {
      const meta = cols.find((c) => c.name === name);
      const arrow = sort?.col === name ? sort.descending ? "\u25BC" : "\u25B2" : "";
      headRow.append(el(
        "th",
        { class: numericCols.has(name) ? "sortable num" : "sortable", "data-col": name, title: `Sort by ${name}` },
        el("span", { class: "th-name" }, name),
        meta ? el("span", { class: `dtype dtype-${meta.dtype}` }, meta.dtype) : null,
        el("span", { class: "th-sort" }, arrow)
      ));
    });
    const editable = mode === "edit";
    const body = el("tbody");
    page.rows.forEach((row, r) => {
      const absIdx = rowIndices[r];
      const tr = el("tr", { "data-idx": String(absIdx), class: selectedRows.has(absIdx) ? "is-selected" : "" });
      const rowCb = el("input", { type: "checkbox", class: "row-chk", "aria-label": "select row" });
      rowCb.checked = selectedRows.has(absIdx);
      tr.append(el("td", { class: "col-chk" }, rowCb));
      visible.forEach(({ name, i }) => {
        const cell = row[i];
        const isNull = cell == null;
        const display = isNull ? editable ? "" : "\u2014" : cell;
        const cls = `${isNull ? "null cell" : "cell"}${numericCols.has(name) ? " num" : ""}`;
        tr.append(el("td", {
          class: cls,
          "data-col": name,
          "data-orig": display,
          title: isNull ? null : String(display),
          // native tooltip reveals truncated values
          contenteditable: editable ? "true" : null
        }, display));
      });
      body.append(tr);
    });
    host.replaceChildren(el(
      "div",
      { class: "wrap" },
      el("table", { class: `dt mode-${mode || "view"}` }, el("thead", {}, headRow), body)
    ));
    renderPager(page.total);
  }
  function renderPager(total) {
    const limit = Math.max(1, pageLimit);
    const to = Math.min(offset + limit, total);
    const pageCount = Math.max(1, Math.ceil(total / limit));
    const current = Math.min(pageCount, Math.floor(offset / limit) + 1);
    const goTo = (p) => {
      const np = Math.min(pageCount, Math.max(1, p));
      offset = (np - 1) * limit;
      void renderTable();
    };
    const summary = el(
      "div",
      { class: "pager-summary" },
      el("span", {}, `${total.toLocaleString()} rows \xD7 ${cols.length} cols`),
      total ? el("span", { class: "muted" }, ` \xB7 showing ${(offset + 1).toLocaleString()}\u2013${to.toLocaleString()} of ${total.toLocaleString()}`) : null,
      searchQ ? el("span", { class: "muted" }, ` \xB7 matching \u201C${searchQ}\u201D`) : null
    );
    const nav = el("div", { class: "pager-nav" });
    if (pageCount > 1) {
      nav.append(button({ label: "\u2039", variant: "ghost", size: "sm", ariaLabel: "previous page", title: "previous page", onClick: () => goTo(current - 1) }));
      for (const p of pageWindow(current, pageCount)) {
        if (p === 0) {
          nav.append(el("span", { class: "pager-gap" }, "\u2026"));
          continue;
        }
        const b = button({ label: String(p), variant: p === current ? "accent" : "ghost", size: "sm", onClick: () => goTo(p) });
        b.classList.add("pager-page");
        if (p === current) b.setAttribute("aria-current", "page");
        nav.append(b);
      }
      nav.append(button({ label: "\u203A", variant: "ghost", size: "sm", ariaLabel: "next page", title: "next page", onClick: () => goTo(current + 1) }));
    }
    setKids(byId("pager"), summary, el("span", { class: "spacer" }), nav, rowsPerPage());
  }
  function pageWindow(current, count) {
    if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
    const keep = [1, 2, count - 1, count, current - 1, current, current + 1].filter((p) => p >= 1 && p <= count);
    const sorted = [...new Set(keep)].sort((a, b) => a - b);
    const out = [];
    let prev = 0;
    for (const p of sorted) {
      if (p - prev > 1) out.push(0);
      out.push(p);
      prev = p;
    }
    return out;
  }
  function openToolsDrawer() {
    renderTools();
    if (!cols.length) setKids(byId("tools"), el("div", { class: "tools-section" }, el("p", { class: "muted" }, "Load a CSV to use the cleaning tools.")));
    byId("tools-drawer").showModal();
  }
  var sqlMounted = false;
  var lastSql = "";
  function openSqlDrawer() {
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
          const raw = await engineCall("sql", { query });
          renderSqlResult(result, JSON.parse(raw));
        }
      });
      setKids(
        host,
        el("div", { class: "tools-head" }, el("h2", {}, "SQL")),
        editorHost,
        result
      );
    }
    byId("sql-drawer").showModal();
  }
  function renderSqlResult(host, page) {
    const shown = page.rows.length;
    const note = shown < page.total ? ` \xB7 showing first ${shown}` : "";
    const head = el("tr", {}, ...page.columns.map((c) => el("th", {}, c)));
    const body = page.rows.map((r) => el("tr", {}, ...r.map((v) => el("td", {}, v ?? "\u2014"))));
    setKids(
      host,
      el("div", { class: "sql-result-meta" }, `${page.total} row${page.total === 1 ? "" : "s"} \xD7 ${page.columns.length} col${page.columns.length === 1 ? "" : "s"}${note}`),
      el(
        "div",
        { class: "sql-result-scroll" },
        el("table", {}, el("thead", {}, head), el("tbody", {}, ...body))
      )
    );
  }
  function wireTable() {
    const host = byId("table");
    host.addEventListener("click", (e) => {
      const t = e.target;
      if (t.closest("input")) return;
      const th = t.closest("th.sortable");
      if (th) {
        onSort(th.getAttribute("data-col"));
        return;
      }
      if (mode === "delete") {
        const tr = t.closest("tr[data-idx]");
        if (tr) stageSteps([step("drop_rows", { indices: [Number(tr.getAttribute("data-idx"))] })]);
      }
    });
    host.addEventListener("change", (e) => {
      const t = e.target;
      if (t.id === "selAll") {
        toggleSelectAll(t.checked);
        return;
      }
      if (t.classList.contains("row-chk")) {
        const tr = t.closest("tr[data-idx]");
        const idx = Number(tr.getAttribute("data-idx"));
        if (t.checked) selectedRows.add(idx);
        else selectedRows.delete(idx);
        tr.classList.toggle("is-selected", t.checked);
        syncSelChip();
        syncSelAll();
      }
    });
    host.addEventListener("focusout", (e) => {
      if (mode !== "edit") return;
      const td = e.target.closest("td.cell");
      if (!td || td.getAttribute("contenteditable") !== "true") return;
      const orig = td.getAttribute("data-orig") ?? "";
      const next = (td.textContent ?? "").trim();
      if (next === orig) return;
      td.setAttribute("data-orig", next);
      const tr = td.closest("tr[data-idx]");
      stageSteps([step("set_cell", {
        row: Number(tr.getAttribute("data-idx")),
        column: td.getAttribute("data-col"),
        value: next === "" ? null : next
      })]);
    });
  }
  function onSort(colName) {
    sort = sort?.col === colName ? { col: colName, descending: !sort.descending } : { col: colName, descending: false };
    offset = 0;
    void renderTable();
  }
  function toggleSelectAll(checked) {
    for (const ix of rowIndices) {
      if (checked) selectedRows.add(ix);
      else selectedRows.delete(ix);
    }
    byId("table").querySelectorAll("tbody .row-chk").forEach((cb) => {
      cb.checked = checked;
      cb.closest("tr")?.classList.toggle("is-selected", checked);
    });
    syncSelChip();
  }
  function syncSelAll() {
    const selAll = document.getElementById("selAll");
    if (!selAll) return;
    const onPage = rowIndices.filter((ix) => selectedRows.has(ix)).length;
    selAll.checked = rowIndices.length > 0 && onPage === rowIndices.length;
    selAll.indeterminate = onPage > 0 && onPage < rowIndices.length;
  }
  function clearSelection() {
    selectedRows.clear();
    byId("table").querySelectorAll(".row-chk").forEach((cb) => {
      cb.checked = false;
      cb.indeterminate = false;
    });
    byId("table").querySelectorAll(".is-selected").forEach((r) => r.classList.remove("is-selected"));
    syncSelChip();
  }
  function renderTools() {
    const host = byId("tools");
    if (!cols.length) {
      host.replaceChildren();
      return;
    }
    const n = selection.size;
    const list = el("div", { class: "col-list" });
    cols.forEach((c) => {
      const cb = el("input", { type: "checkbox" });
      cb.checked = selection.has(c.name);
      cb.addEventListener("change", () => {
        cb.checked ? selection.add(c.name) : selection.delete(c.name);
        renderTools();
      });
      const nullBadge = c.null_pct && c.null_pct > 0 ? el("span", { class: "col-null" }, `${Math.round(c.null_pct)}% empty`) : null;
      list.append(el(
        "label",
        { class: "col-row" },
        cb,
        el("span", { class: "col-name" }, c.name),
        el("span", { class: `dtype dtype-${c.dtype}` }, c.dtype),
        nullBadge
      ));
    });
    const opBtn = (op) => {
      const enabled = opEnabled(op, n);
      return button({
        label: op.label,
        variant: activeOp?.id === op.id ? "accent" : void 0,
        size: "sm",
        disabled: !enabled,
        onClick: () => {
          if (op.fields.length) {
            activeOp = activeOp?.id === op.id ? null : op;
            renderTools();
          } else runOp(op, {});
        }
      });
    };
    setKids(
      host,
      el(
        "div",
        { class: "tools-head" },
        el("h2", {}, "Tools"),
        el("span", { class: "spacer" }),
        n ? button({ label: `Clear (${n})`, variant: "ghost", size: "sm", onClick: () => {
          selection.clear();
          activeOp = null;
          renderTools();
        } }) : null
      ),
      el(
        "div",
        { class: "tools-body" },
        el("div", { class: "tools-section" }, el("h3", {}, "Columns"), list),
        el("div", { class: "tools-section" }, el("h3", {}, "Whole file"), el("div", { class: "op-grid" }, ...GLOBAL_OPS.map(opBtn))),
        el(
          "div",
          { class: "tools-section" },
          el("h3", {}, "Selected columns", n ? el("span", { class: "sel-count" }, ` \xB7 ${n} selected`) : null),
          el("div", { class: "op-grid" }, ...COLUMN_OPS.map(opBtn))
        ),
        activeOp ? actionSheet(activeOp) : null
      ),
      historySection()
    );
  }
  function actionSheet(op) {
    const values = {};
    op.fields.forEach((f) => {
      if (f.default !== void 0) values[f.key] = f.default;
    });
    const controls = op.fields.map((f) => {
      if (f.type === "enum") {
        const field = el("span", { class: "sel-field" });
        mountSelect(field, { options: (f.options ?? []).map(([val, lab]) => ({ value: val, label: lab })), value: typeof f.default === "string" ? f.default : void 0 });
        const sel = field.querySelector("select");
        values[f.key] = sel.value;
        sel.addEventListener("change", () => {
          values[f.key] = sel.value;
        });
        return el("label", { class: "field" }, el("span", {}, f.label), field);
      }
      if (f.type === "bool") {
        const cb = el("input", { type: "checkbox" });
        cb.checked = !!f.default;
        cb.addEventListener("change", () => {
          values[f.key] = cb.checked;
        });
        return el("label", { class: "field field-bool" }, cb, el("span", {}, f.label));
      }
      const inp = el("input", { class: "field-input", type: "text", placeholder: f.placeholder ?? "", value: f.default ?? "" });
      inp.addEventListener("input", () => {
        values[f.key] = inp.value;
      });
      return el("label", { class: "field" }, el("span", {}, f.label), inp);
    });
    return el(
      "div",
      { class: "sheet" },
      el("div", { class: "sheet-title" }, op.label),
      ...controls,
      el(
        "div",
        { class: "sheet-actions" },
        button({ label: "Cancel", variant: "ghost", size: "sm", onClick: () => {
          activeOp = null;
          renderTools();
        } }),
        button({ label: "Apply", variant: "accent", size: "sm", onClick: () => runOp(op, values) })
      )
    );
  }
  function historySection() {
    const items = [];
    items.push(histRow("Original dataset", () => undoTo(0), applied.length === 0 ? "is-current" : "is-done"));
    applied.forEach((s, i) => items.push(histRow(stepLabel(s), () => undoTo(i + 1), i === applied.length - 1 ? "is-current" : "is-done")));
    const redoable = [...redo].reverse().flatMap((g) => g);
    redoable.forEach((s, i) => items.push(histRow(stepLabel(s), () => redoTo(i + 1), "is-future")));
    return el(
      "div",
      { class: "tools-section history" },
      el(
        "div",
        { class: "history-head" },
        el("h3", {}, "History"),
        el("span", { class: "sel-count" }, ` \xB7 ${applied.length} step${applied.length === 1 ? "" : "s"}`)
      ),
      el("div", { class: "hist-list" }, ...items)
    );
  }
  function histRow(label, onClick, cls) {
    return el(
      "button",
      { class: `hist-item ${cls}`, type: "button", title: "Revert to this point", onclick: onClick },
      el("span", { class: "hist-dot" }),
      el("span", { class: "hist-label" }, label)
    );
  }
  function stepLabel(s) {
    const op = OPS.find((o) => o.id === s.kind);
    if (op) return op.label.replace(/…$/, "");
    switch (s.kind) {
      case "set_cell":
        return `Edit cell \xB7 ${String(s.params.column ?? "")}`;
      case "drop_rows": {
        const k = s.params.indices?.length ?? 0;
        return `Delete ${k} row${k === 1 ? "" : "s"}`;
      }
      case "original":
        return "Original";
      default:
        return s.kind.replace(/_/g, " ");
    }
  }
  function searchBox() {
    const inp = el("input", { type: "search", class: "dt-search-input", placeholder: "Search all columns\u2026", "aria-label": "search the table" });
    inp.addEventListener("input", () => {
      const v = inp.value.trim();
      if (v === searchQ) return;
      searchQ = v;
      if (searchDebounce !== void 0) clearTimeout(searchDebounce);
      searchDebounce = window.setTimeout(() => {
        offset = 0;
        void renderTable();
      }, 180);
    });
    return el("div", { class: "dt-search" }, el("span", { class: "dt-search-ico" }, "\u2315"), inp);
  }
  function modeButton(m, glyph, title) {
    const b = button({ label: glyph, variant: "ghost", size: "sm", ariaLabel: title, title, onClick: () => {
      if (m === "delete" && selectedRows.size) {
        stageSteps([step("drop_rows", { indices: [...selectedRows] })]);
        return;
      }
      setMode2(mode === m ? "" : m);
    } });
    b.classList.add("dt-mode");
    b.setAttribute("data-mode", m);
    b.setAttribute("title", title);
    return b;
  }
  function setMode2(m) {
    mode = m;
    selectedRows.clear();
    document.querySelectorAll(".dt-mode").forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-mode") === m && m !== ""));
    syncSelChip();
    void renderTable();
  }
  function rowsPerPage() {
    const field = el("span", { class: "sel-field" });
    mountSelect(field, { options: [50, 100, 200, 500].map((nn) => ({ value: String(nn), label: `${nn}/page` })), value: String(pageLimit) });
    const sel = field.querySelector("select");
    sel.addEventListener("change", () => {
      pageLimit = Number(sel.value);
      offset = 0;
      void renderTable();
    });
    field.classList.add("dt-rows");
    return field;
  }
  function columnsDropdown() {
    const menu = el("div", { class: "dt-menu", hidden: true });
    const toggle = button({ label: "\u25A6", variant: "ghost", size: "sm", ariaLabel: "Show / hide columns", title: "Show / hide columns", onClick: () => {
      if (menu.hasAttribute("hidden")) {
        fillColumnsMenu(menu);
        menu.removeAttribute("hidden");
      } else menu.setAttribute("hidden", "");
    } });
    toggle.setAttribute("title", "Show / hide columns");
    const wrap = el("div", { class: "dt-dd" }, toggle, menu);
    document.addEventListener("click", (e) => {
      if (!wrap.contains(e.target)) menu.setAttribute("hidden", "");
    });
    return wrap;
  }
  function fillColumnsMenu(menu) {
    setKids(menu, ...cols.map((c) => {
      const cb = el("input", { type: "checkbox" });
      cb.checked = !hiddenCols.has(c.name);
      cb.addEventListener("change", () => {
        cb.checked ? hiddenCols.delete(c.name) : hiddenCols.add(c.name);
        void renderTable();
      });
      return el("label", { class: "dt-menu-item" }, cb, el("span", { class: "dt-menu-name" }, c.name));
    }));
  }
  function syncSelChip() {
    const chip2 = byId("selChip");
    const n = selectedRows.size;
    chip2.classList.toggle("show", n > 0);
    setKids(
      chip2,
      n ? el("span", { class: "sel-n" }, `${n} selected`) : null,
      n ? button({ label: "Delete rows", size: "sm", onClick: () => {
        if (selectedRows.size) stageSteps([step("drop_rows", { indices: [...selectedRows] })]);
      } }) : null,
      n ? button({ label: "\u2715", variant: "ghost", size: "sm", ariaLabel: "clear selection", title: "clear selection", onClick: clearSelection }) : null
    );
  }
  function syncToolbar() {
    undoBtn?.classList.toggle("is-off", applied.length === 0);
    redoBtn?.classList.toggle("is-off", redo.length === 0);
  }
  function resetToolbarUi() {
    const si = document.querySelector(".dt-search-input");
    if (si) si.value = "";
    document.querySelectorAll(".dt-mode").forEach((b) => b.classList.remove("is-active"));
  }
  function renderChip() {
    const host = byId("chip");
    host.replaceChildren(
      cleanness != null ? badge({ label: `${Math.round(cleanness)}% clean`, tone: cleanness >= 80 ? "ok" : void 0 }) : el("span", {})
    );
  }
  function setStatus(msg) {
    byId("status").textContent = msg;
  }
  function buildChrome() {
    const file = el("input", { type: "file", accept: ".csv,text/csv" });
    file.hidden = true;
    file.addEventListener("change", () => void openFile(file.files?.[0]));
    undoBtn = button({ label: "\u21B6", variant: "ghost", size: "sm", ariaLabel: "undo", title: "undo", onClick: undo });
    redoBtn = button({ label: "\u21B7", variant: "ghost", size: "sm", ariaLabel: "redo", title: "redo", onClick: redoAction });
    undoBtn.setAttribute("title", "Undo");
    redoBtn.setAttribute("title", "Redo");
    const header = el(
      "header",
      { class: "app-header" },
      el("h1", {}, "csv-workbench"),
      el("span", { class: "muted" }, "clean & transform CSVs in your browser"),
      el("span", { id: "status", class: "status" }),
      el("span", { class: "spacer" }),
      el("span", { id: "chip", class: "chip" }),
      button({ label: "Load sample", onClick: loadSample }),
      button({ label: "Open CSV", variant: "accent", onClick: () => file.click() }),
      button({ label: "Export CSV", onClick: () => void exportCsv() }),
      file
    );
    const toolbar = el(
      "div",
      { class: "dt-toolbar" },
      searchBox(),
      el("span", { class: "dt-sep" }),
      modeButton("edit", "\u270E", "Edit cells"),
      modeButton("select", "\u2611", "Select rows"),
      modeButton("delete", "\u{1F5D1}", "Delete rows"),
      el("span", { class: "dt-sep" }),
      undoBtn,
      redoBtn,
      el("span", { class: "dt-sep" }),
      columnsDropdown(),
      el("span", { id: "selChip", class: "dt-selchip" }),
      el("span", { class: "spacer" }),
      button({ label: "SQL", size: "sm", onClick: openSqlDrawer }),
      button({ label: "Clean tools", size: "sm", onClick: openToolsDrawer })
    );
    const drawer = el(
      "dialog",
      { id: "tools-drawer", class: "tools-drawer" },
      el(
        "div",
        { class: "drawer-head" },
        button({ label: "\u2715", variant: "ghost", size: "sm", ariaLabel: "close tools", title: "close tools", onClick: () => drawer.close() })
      ),
      el("aside", { id: "tools", class: "tools-pane" })
    );
    drawer.addEventListener("click", (e) => {
      if (e.target === drawer) drawer.close();
    });
    const sqlDrawer = el(
      "dialog",
      { id: "sql-drawer", class: "tools-drawer sql-drawer" },
      el(
        "div",
        { class: "drawer-head" },
        button({ label: "\u2715", variant: "ghost", size: "sm", ariaLabel: "close SQL", title: "close SQL", onClick: () => sqlDrawer.close() })
      ),
      el("aside", { id: "sql-pane", class: "tools-pane" })
    );
    sqlDrawer.addEventListener("click", (e) => {
      if (e.target === sqlDrawer) sqlDrawer.close();
    });
    byId("root").append(
      header,
      el(
        "main",
        { class: "page" },
        el(
          "div",
          { class: "table-card" },
          toolbar,
          // the toolbar is the card's top — coupled to the table it drives
          el("section", { id: "table", class: "table-pane" }),
          el("div", { id: "pager", class: "pager" })
        )
      ),
      drawer,
      sqlDrawer
    );
    wireTable();
  }
  window.addEventListener("DOMContentLoaded", () => {
    worker = new Worker(new URL("worker.js", location.href).href);
    worker.onmessage = (e) => {
      const { id, ok, result, error } = e.data;
      const p = inflight.get(id);
      if (!p) return;
      inflight.delete(id);
      ok ? p.resolve(result) : p.reject(new Error(error));
    };
    buildChrome();
    void renderTable();
    document.addEventListener("dragover", (e) => e.preventDefault());
    document.addEventListener("drop", (e) => {
      e.preventDefault();
      void openFile(e.dataTransfer?.files?.[0]);
    });
  });
})();
