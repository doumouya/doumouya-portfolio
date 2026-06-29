"use strict";
(() => {
  // ../web-kit/src/el.ts
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === void 0 || value === false) continue;
      if (key === "class") node.className = String(value);
      else if (key === "text") node.textContent = String(value);
      else if (key.startsWith("on") && typeof value === "function") {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (value === true) {
        node.setAttribute(key, "");
      } else {
        node.setAttribute(key, String(value));
      }
    }
    append(node, children);
    return node;
  }
  function append(parent, children) {
    for (const child of children) {
      if (child === null || child === void 0 || child === false) continue;
      parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
    }
  }
  var injected = /* @__PURE__ */ new Set();
  function ensureStyles(name, css) {
    if (injected.has(name) || typeof document === "undefined") return;
    injected.add(name);
    const style = document.createElement("style");
    style.dataset["dc"] = name;
    style.textContent = css;
    document.head.appendChild(style);
  }

  // ../web-kit/src/components/button.ts
  var CSS = `
.dc-btn{
  font: var(--font-body); font-weight: var(--weight-medium);
  display:inline-flex; align-items:center; justify-content:center; gap:var(--space-2);
  height:var(--control-h); padding:0 var(--pad-control-x);
  border:var(--border-width) solid var(--border); border-radius:var(--radius);
  background:var(--surface-subtle); color:var(--text);
  cursor:pointer; white-space:nowrap; user-select:none; line-height:1;
  transition:var(--transition-control);
}
.dc-btn:hover{ border-color:var(--accent); }
.dc-btn:active{ background:var(--surface-sunken); }
.dc-btn:focus-visible{ outline:var(--focus-ring); outline-offset:1px; }
.dc-btn[disabled],.dc-btn[aria-disabled="true"]{ opacity:.5; cursor:not-allowed; }
.dc-btn[disabled]:hover,.dc-btn[aria-disabled="true"]:hover{ border-color:var(--border); }

.dc-btn--primary{ background:var(--accent); border-color:var(--accent); color:var(--text-on-accent); }
.dc-btn--primary:hover{ background:var(--accent-hover); border-color:var(--accent-hover); }
.dc-btn--primary:active{ background:var(--accent-hover); }

.dc-btn--ghost{ background:transparent; border-color:transparent; }
.dc-btn--ghost:hover{ background:var(--surface-subtle); border-color:transparent; }
.dc-btn--ghost:active{ background:var(--surface-sunken); }

.dc-btn--danger{ background:var(--danger); border-color:var(--danger); color:#fff; }
.dc-btn--danger:hover{ filter:brightness(.94); border-color:var(--danger); }

.dc-btn--sm{ height:var(--control-h-sm); padding:0 var(--space-2); font-size:var(--text-sm); border-radius:var(--radius-sm); }
.dc-btn--lg{ height:var(--control-h-lg); padding:0 var(--space-4); }
.dc-btn--block{ width:100%; }
.dc-btn svg{ width:1em; height:1em; flex:none; }
`;
  function button(label, opts = {}) {
    ensureStyles("button", CSS);
    const { variant = "secondary", size = "md", block, leadingIcon, trailingIcon, disabled, onClick } = opts;
    const classes = [
      "dc-btn",
      variant !== "secondary" && `dc-btn--${variant}`,
      size !== "md" && `dc-btn--${size}`,
      block && "dc-btn--block",
      opts.class
    ].filter(Boolean).join(" ");
    const node = el(
      "button",
      { class: classes, disabled, ...onClick ? { onClick } : {} },
      leadingIcon ?? null,
      label !== null && label !== void 0 && label !== false ? el("span", {}, label) : null,
      trailingIcon ?? null
    );
    if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
    return node;
  }

  // ../web-kit/src/components/iconButton.ts
  var CSS2 = `
.dc-iconbtn{
  display:inline-flex; align-items:center; justify-content:center;
  width:var(--control-h); height:var(--control-h); padding:0;
  border:var(--border-width) solid transparent; border-radius:var(--radius);
  background:transparent; color:var(--text-muted);
  cursor:pointer; line-height:1; font-size:var(--text-md);
  transition:var(--transition-control);
}
.dc-iconbtn:hover{ background:var(--surface-subtle); color:var(--text); }
.dc-iconbtn:active{ background:var(--surface-sunken); }
.dc-iconbtn:focus-visible{ outline:var(--focus-ring); outline-offset:1px; }
.dc-iconbtn[disabled]{ opacity:.45; cursor:not-allowed; }
.dc-iconbtn[disabled]:hover{ background:transparent; color:var(--text-muted); }
.dc-iconbtn[aria-pressed="true"],.dc-iconbtn.is-active{ color:var(--accent); background:var(--accent-tint); }
.dc-iconbtn--bordered{ border-color:var(--border); }
.dc-iconbtn--bordered:hover{ border-color:var(--accent); background:transparent; color:var(--text); }
.dc-iconbtn--sm{ width:var(--control-h-sm); height:var(--control-h-sm); font-size:var(--text-sm); border-radius:var(--radius-sm); }
.dc-iconbtn--lg{ width:var(--control-h-lg); height:var(--control-h-lg); }
.dc-iconbtn svg{ width:1.05em; height:1.05em; }
`;
  function iconButton(icon, opts) {
    ensureStyles("iconbutton", CSS2);
    const { label, size = "md", bordered, active, disabled, title, onClick } = opts;
    const classes = [
      "dc-iconbtn",
      bordered && "dc-iconbtn--bordered",
      active && "is-active",
      size !== "md" && `dc-iconbtn--${size}`,
      opts.class
    ].filter(Boolean).join(" ");
    const node = el(
      "button",
      {
        class: classes,
        "aria-label": label,
        title: title ?? label,
        disabled,
        ...onClick ? { onClick } : {}
      },
      icon
    );
    if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
    return node;
  }

  // ../web-kit/src/components/select.ts
  var CSS3 = `
.dc-select{ display:inline-flex; flex-direction:column; gap:var(--space-1); }
.dc-select--block{ display:flex; width:100%; }
.dc-select__label{ font-size:var(--text-sm); font-weight:var(--weight-medium); color:var(--text); }
.dc-select__shell{ position:relative; display:inline-flex; align-items:center; }
.dc-select--block .dc-select__shell{ display:flex; width:100%; }
.dc-select select{
  appearance:none; -webkit-appearance:none;
  font:var(--font-body); color:var(--text);
  height:var(--control-h); width:100%;
  padding:0 calc(var(--space-6)) 0 var(--pad-control-x);
  border:var(--border-width) solid var(--border); border-radius:var(--radius-sm);
  background:var(--surface); cursor:pointer;
  transition:var(--transition-control);
}
.dc-select select:hover{ border-color:var(--border-strong); }
.dc-select select:focus-visible{ outline:var(--focus-ring); outline-offset:var(--focus-offset); border-color:var(--accent); }
.dc-select select:disabled{ opacity:.55; background:var(--surface-subtle); cursor:not-allowed; }
.dc-select--sm select{ height:var(--control-h-sm); font-size:var(--text-sm); padding-right:var(--space-5); }
.dc-select__chevron{
  position:absolute; right:var(--space-2); pointer-events:none;
  color:var(--text-subtle); font-size:.7em; line-height:1;
}
`;
  function select(opts = {}) {
    ensureStyles("select", CSS3);
    const { label, options = [], size = "md", block, id, children } = opts;
    const fieldId = id || (label ? `dc-${Math.random().toString(36).slice(2, 8)}` : void 0);
    const classes = [
      "dc-select",
      size !== "md" && `dc-select--${size}`,
      block && "dc-select--block",
      opts.class
    ].filter(Boolean).join(" ");
    const selectEl = el("select", fieldId ? { id: fieldId } : {});
    if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) selectEl.setAttribute(k, v);
    if (children && children.length > 0) {
      append(selectEl, children);
    } else {
      for (const o of options) {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        append(selectEl, [el("option", { value: opt.value }, opt.label)]);
      }
    }
    return el(
      "div",
      { class: classes },
      label ? el("label", { class: "dc-select__label", ...fieldId ? { for: fieldId } : {} }, label) : null,
      el(
        "span",
        { class: "dc-select__shell" },
        selectEl,
        el("span", { class: "dc-select__chevron", "aria-hidden": "true" }, "\u25BC")
      )
    );
  }

  // ../web-kit/src/components/stat.ts
  var CSS4 = `
.dc-stat{ display:flex; flex-direction:column; gap:2px; min-width:0; }
.dc-stat--bordered{ padding:var(--space-3) var(--space-4); border:1px solid var(--border); border-radius:var(--radius); background:var(--surface); }
.dc-stat__label{ font-size:var(--text-xs); color:var(--text-muted); font-weight:var(--weight-medium); letter-spacing:var(--tracking-wide); text-transform:uppercase; white-space:nowrap; }
.dc-stat__value{ font-size:var(--text-3xl); font-weight:var(--weight-bold); line-height:1.05; color:var(--text); font-variant-numeric:var(--numeric-tabular); letter-spacing:var(--tracking-tight); }
.dc-stat--accent .dc-stat__value{ color:var(--accent); }
.dc-stat--success .dc-stat__value{ color:var(--success); }
.dc-stat--sm .dc-stat__value{ font-size:var(--text-2xl); }
.dc-stat__unit{ font-size:.5em; font-weight:var(--weight-medium); color:var(--text-muted); margin-left:.25em; letter-spacing:0; }
.dc-stat__foot{ display:flex; align-items:center; gap:var(--space-2); margin-top:1px; }
.dc-stat__caption{ font-size:var(--text-xs); color:var(--text-subtle); }
.dc-stat__delta{ display:inline-flex; align-items:center; gap:2px; font-size:var(--text-xs); font-weight:var(--weight-medium); font-variant-numeric:var(--numeric-tabular); }
.dc-stat__delta--up{ color:var(--success); }
.dc-stat__delta--down{ color:var(--danger); }
.dc-stat__delta--flat{ color:var(--text-muted); }
`;
  function stat(value, opts = {}) {
    ensureStyles("stat", CSS4);
    const { label, unit, caption, delta, tone = "default", size = "md", bordered } = opts;
    const classes = [
      "dc-stat",
      tone !== "default" && `dc-stat--${tone}`,
      size !== "md" && `dc-stat--${size}`,
      bordered && "dc-stat--bordered",
      opts.class
    ].filter(Boolean).join(" ");
    const dir = delta === null || delta === void 0 ? null : delta > 0 ? "up" : delta < 0 ? "down" : "flat";
    const footer = caption !== null && caption !== void 0 && caption !== false ? true : delta !== null && delta !== void 0;
    const node = el(
      "div",
      { class: classes },
      label !== null && label !== void 0 && label !== false ? el("div", { class: "dc-stat__label" }, label) : null,
      el(
        "div",
        { class: "dc-stat__value" },
        value,
        unit !== null && unit !== void 0 && unit !== false ? el("span", { class: "dc-stat__unit" }, unit) : null
      ),
      footer ? el(
        "div",
        { class: "dc-stat__foot" },
        dir !== null ? el(
          "span",
          { class: `dc-stat__delta dc-stat__delta--${dir}` },
          `${dir === "up" ? "\u25B2" : dir === "down" ? "\u25BC" : "\u2014"} ${Math.abs(delta)}%`
        ) : null,
        caption !== null && caption !== void 0 && caption !== false ? el("span", { class: "dc-stat__caption" }, caption) : null
      ) : null
    );
    if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
    return node;
  }

  // ../web-kit/src/components/emptyState.ts
  var CSS5 = `
.dc-empty{
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:var(--space-3); text-align:center; color:var(--text-muted);
  padding:var(--space-12) var(--space-6); min-height:16rem;
}
.dc-empty--dropzone{
  border:2px dashed var(--border-strong); border-radius:var(--radius-lg);
  background:var(--surface-subtle); transition:var(--transition-control);
}
.dc-empty--dropzone.is-over{ border-color:var(--accent); background:var(--accent-tint); }
.dc-empty__glyph{ font-size:1.9rem; line-height:1; color:var(--text-subtle); }
.dc-empty__lead{ font-size:var(--text-xl); color:var(--text); margin:0; font-weight:var(--weight-medium); }
.dc-empty__desc{ font-size:var(--text-sm); color:var(--text-muted); margin:0; max-width:28rem; }
.dc-empty__action{ margin-top:var(--space-2); }
`;
  function emptyState(opts = {}) {
    ensureStyles("emptystate", CSS5);
    const { glyph, lead, description, action, dropzone, over, children } = opts;
    const classes = [
      "dc-empty",
      dropzone && "dc-empty--dropzone",
      dropzone && over && "is-over",
      opts.class
    ].filter(Boolean).join(" ");
    const node = el(
      "div",
      { class: classes },
      glyph !== null && glyph !== void 0 && glyph !== false ? el("div", { class: "dc-empty__glyph", "aria-hidden": "true" }, glyph) : null,
      lead !== null && lead !== void 0 && lead !== false ? el("p", { class: "dc-empty__lead" }, lead) : null,
      description !== null && description !== void 0 && description !== false ? el("p", { class: "dc-empty__desc" }, description) : null,
      ...children ?? [],
      action !== null && action !== void 0 && action !== false ? el("div", { class: "dc-empty__action" }, action) : null
    );
    if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
    return node;
  }

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
      host.replaceChildren(emptyState({
        dropzone: true,
        glyph: "\u25A6",
        lead: "Open a CSV \u2014 it stays on your device.",
        description: "Parsed and cleaned entirely in your browser by a Polars\u2192WebAssembly engine. Nothing is uploaded. No file handy? Click \u201CLoad sample\u201D to try it on a messy French dataset."
      }));
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
      const rowCb = el("input", { type: "checkbox", class: "row-chk", checked: selectedRows.has(absIdx), "aria-label": "select row" });
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
      nav.append(iconButton("\u2039", { label: "previous page", size: "sm", onClick: () => goTo(current - 1) }));
      for (const p of pageWindow(current, pageCount)) {
        if (p === 0) {
          nav.append(el("span", { class: "pager-gap" }, "\u2026"));
          continue;
        }
        const b = button(String(p), { variant: p === current ? "primary" : "ghost", size: "sm", onClick: () => goTo(p) });
        b.classList.add("pager-page");
        if (p === current) b.setAttribute("aria-current", "page");
        nav.append(b);
      }
      nav.append(iconButton("\u203A", { label: "next page", size: "sm", onClick: () => goTo(current + 1) }));
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
      const cb = el("input", { type: "checkbox", checked: selection.has(c.name) });
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
      return button(op.label, {
        variant: activeOp?.id === op.id ? "primary" : "secondary",
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
        n ? button(`Clear (${n})`, { variant: "ghost", size: "sm", onClick: () => {
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
        const field = select({ size: "sm", children: (f.options ?? []).map(([val, lab]) => el("option", { value: val, selected: val === f.default }, lab)) });
        const sel = field.querySelector("select");
        values[f.key] = sel.value;
        sel.addEventListener("change", () => {
          values[f.key] = sel.value;
        });
        return el("label", { class: "field" }, el("span", {}, f.label), field);
      }
      if (f.type === "bool") {
        const cb = el("input", { type: "checkbox", checked: !!f.default });
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
        button("Cancel", { variant: "ghost", size: "sm", onClick: () => {
          activeOp = null;
          renderTools();
        } }),
        button("Apply", { variant: "primary", size: "sm", onClick: () => runOp(op, values) })
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
    const b = iconButton(glyph, { label: title, size: "sm", onClick: () => {
      if (m === "delete" && selectedRows.size) {
        stageSteps([step("drop_rows", { indices: [...selectedRows] })]);
        return;
      }
      setMode(mode === m ? "" : m);
    } });
    b.classList.add("dt-mode");
    b.setAttribute("data-mode", m);
    b.setAttribute("title", title);
    return b;
  }
  function setMode(m) {
    mode = m;
    selectedRows.clear();
    document.querySelectorAll(".dt-mode").forEach((b) => b.classList.toggle("is-active", b.getAttribute("data-mode") === m && m !== ""));
    syncSelChip();
    void renderTable();
  }
  function rowsPerPage() {
    const field = select({ size: "sm", children: [50, 100, 200, 500].map((nn) => el("option", { value: String(nn), selected: nn === pageLimit }, `${nn}/page`)) });
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
    const toggle = iconButton("\u25A6", { label: "Show / hide columns", size: "sm", onClick: () => {
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
      const cb = el("input", { type: "checkbox", checked: !hiddenCols.has(c.name) });
      cb.addEventListener("change", () => {
        cb.checked ? hiddenCols.delete(c.name) : hiddenCols.add(c.name);
        void renderTable();
      });
      return el("label", { class: "dt-menu-item" }, cb, el("span", { class: "dt-menu-name" }, c.name));
    }));
  }
  function syncSelChip() {
    const chip = byId("selChip");
    const n = selectedRows.size;
    chip.classList.toggle("show", n > 0);
    setKids(
      chip,
      n ? el("span", { class: "sel-n" }, `${n} selected`) : null,
      n ? button("Delete rows", { variant: "secondary", size: "sm", onClick: () => {
        if (selectedRows.size) stageSteps([step("drop_rows", { indices: [...selectedRows] })]);
      } }) : null,
      n ? iconButton("\u2715", { label: "clear selection", size: "sm", onClick: clearSelection }) : null
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
      cleanness != null ? stat(`${Math.round(cleanness)}%`, { label: "clean", size: "sm", tone: cleanness >= 80 ? "success" : "default" }) : el("span", {})
    );
  }
  function setStatus(msg) {
    byId("status").textContent = msg;
  }
  function buildChrome() {
    const file = el("input", { type: "file", accept: ".csv,text/csv" });
    file.hidden = true;
    file.addEventListener("change", () => void openFile(file.files?.[0]));
    undoBtn = iconButton("\u21B6", { label: "undo", size: "sm", onClick: undo });
    redoBtn = iconButton("\u21B7", { label: "redo", size: "sm", onClick: redoAction });
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
      button("Load sample", { onClick: loadSample }),
      button("Open CSV", { variant: "primary", onClick: () => file.click() }),
      button("Export CSV", { onClick: () => void exportCsv() }),
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
      button("Clean tools", { variant: "secondary", size: "sm", onClick: openToolsDrawer })
    );
    const drawer = el(
      "dialog",
      { id: "tools-drawer", class: "tools-drawer" },
      el(
        "div",
        { class: "drawer-head" },
        iconButton("\u2715", { label: "close tools", size: "sm", onClick: () => drawer.close() })
      ),
      el("aside", { id: "tools", class: "tools-pane" })
    );
    drawer.addEventListener("click", (e) => {
      if (e.target === drawer) drawer.close();
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
      drawer
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
