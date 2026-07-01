/** lab — the "mini-projects": live, in-site pages that mount amenan-ui's OWN
   components with mock data, so the framework the site runs on is also on display.
   No iframes here — these are the real components (redtable, filter-panel, omni)
   composed on the page. Each view is an amenan-ui `Mount`; landing.ts merges the
   routes and renders the Work cards. */

import { el, badge, button, kbd, mountCard, mountRedTable, mountFilterPanel, mountOmni } from "amenan-ui";
import type { Mount, RouteMap, RedTableColumn, RedTableSort, RedTableRow, OmniResult, FilterNode } from "amenan-ui";
import { icon } from "./icons.ts";
import type { IconName } from "./icons.ts";
import { openDisplayModal } from "./prefs.ts";

/* ── project metadata (Work cards + featured) ──────────────────────────────*/
export interface LabProject {
  title: string;
  kind: string;
  blurb: string;
  stack: string;
  route: string;
  repo: string;
}

export const LAB_PROJECTS: LabProject[] = [
  {
    title: "amenan-ui",
    kind: "Framework",
    blurb:
      "The dependency-free TypeScript UI framework this whole site runs on — a two-axis theme platform (O(1) switching), a component library, and page-assembly + router primitives. This page is a live tour of it.",
    stack: "TypeScript · zero runtime deps",
    route: "design-system",
    repo: "https://github.com/doumouya/amenan-ui",
  },
  {
    title: "redtable",
    kind: "Component",
    blurb:
      "amenan-ui's data grid: one component, virtual-scrolling ~600 rows here, with click-to-sort and a live interaction switch — browse, select, edit, delete. Mounted below with mock data.",
    stack: "TypeScript · amenan-ui",
    route: "lab/redtable",
    repo: "https://github.com/doumouya/amenan-ui",
  },
  {
    title: "filter-panel",
    kind: "Component",
    blurb:
      "A visual query builder over a shared filter-node algebra: nested All/Any groups compile to a typed predicate tree. Build a filter and watch the assembled query update live.",
    stack: "TypeScript · amenan-ui",
    route: "lab/filter-panel",
    repo: "https://github.com/doumouya/amenan-ui",
  },
];

/* ── mock dataset (a plausible people table) ───────────────────────────────*/
const FIRST = ["Amina", "Liam", "Noa", "Kwame", "Sofia", "Yuki", "Ravi", "Elena", "Tomas", "Fatou", "Owen", "Mei", "Idris", "Clara", "Diego", "Aoife"];
const LAST = ["Traoré", "Byrne", "Cohen", "Mensah", "Rossi", "Tanaka", "Patel", "Novak", "Silva", "Diallo", "Murphy", "Chen", "Okoye", "Weber", "Costa", "Kelly"];
const ROLES = ["Data Engineer", "Analyst", "SRE", "Product Manager", "Designer", "ML Engineer"];
const TEAMS = ["Platform", "Growth", "Payments", "Search", "Infra"];
const CITIES = ["Dublin", "Paris", "Berlin", "London", "Lisbon", "Remote"];

const pick = <T,>(arr: T[], i: number): T => arr[i % arr.length] as T;

export function genRows(n: number): RedTableRow[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `E${1000 + i}`,
    name: `${pick(FIRST, i * 7)} ${pick(LAST, i * 13)}`,
    role: pick(ROLES, i * 5),
    team: pick(TEAMS, i * 3),
    city: pick(CITIES, i * 11),
    salary: 45000 + ((i * 137) % 65) * 1000,
    joined: `20${15 + (i % 9)}-${String(1 + (i % 12)).padStart(2, "0")}-${String(1 + (i % 27)).padStart(2, "0")}`,
  }));
}

const COLUMNS: RedTableColumn[] = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "role", label: "Role" },
  { key: "team", label: "Team" },
  { key: "city", label: "City" },
  { key: "salary", label: "Salary (€)", dtype: "int" },
  { key: "joined", label: "Joined" },
];

/* ── shared page chrome for a lab view ─────────────────────────────────────*/
function labView(build: () => HTMLElement): Mount {
  return (host: Element) => {
    const node = build();
    host.appendChild(node);
    return { el: node, destroy: () => node.remove() };
  };
}

function labHeader(title: string, sub: string): HTMLElement {
  return el(
    "div",
    { class: "lab-head" },
    el("a", { class: "amu-btn", href: "#/work" }, icon("back"), el("span", {}, "Work")),
    el("div", { class: "lab-head-txt" }, el("h1", {}, title), el("p", { class: "sub" }, sub)),
  );
}

/* ── redtable page ─────────────────────────────────────────────────────────*/
const redtableView = labView(() => {
  const base = genRows(600);
  let rows = base;
  let sort: RedTableSort | null = null;
  // forward reference to the handle for onSort (fires only after mount).
  let handle: ReturnType<typeof mountRedTable> | null = null;

  const cmp = (a: RedTableRow, b: RedTableRow, s: RedTableSort): number => {
    const col = COLUMNS.find((c) => c.key === s.col);
    const av = a[s.col];
    const bv = b[s.col];
    let r: number;
    if (col?.dtype === "int") r = Number(av) - Number(bv);
    else r = String(av).localeCompare(String(bv));
    return s.descending ? -r : r;
  };

  const status = el("span", { class: "lab-status" }, `${base.length} rows`);
  const tableHost = el("div", { class: "lab-table" });

  const modes: { m: "browse" | "select" | "edit" | "delete"; label: string; ico: IconName }[] = [
    { m: "browse", label: "Browse", ico: "reading" },
    { m: "select", label: "Select", ico: "comfortable" },
    { m: "edit", label: "Edit", ico: "writing" },
    { m: "delete", label: "Delete", ico: "back" },
  ];
  const seg = el("div", { class: "seg lab-seg", role: "group", "aria-label": "Interaction" });
  modes.forEach((opt, idx) => {
    const b = el("button", { class: "seg-btn", type: "button", title: opt.label }, icon(opt.ico), el("span", {}, opt.label));
    if (idx === 0) b.setAttribute("aria-pressed", "true");
    b.addEventListener("click", () => {
      for (const c of Array.from(seg.children)) c.removeAttribute("aria-pressed");
      b.setAttribute("aria-pressed", "true");
      handle?.setInteraction(opt.m);
      status.textContent = opt.m === "select" ? "0 selected" : `${rows.length} rows`;
    });
    seg.appendChild(b);
  });

  handle = mountRedTable(tableHost, {
    columns: COLUMNS,
    rows,
    rowKey: (r) => String(r["id"]),
    mode: "virtual",
    sortable: true,
    sort,
    interaction: "browse",
    onSort: (col) => {
      if (!sort || sort.col !== col) sort = { col, descending: false };
      else if (!sort.descending) sort = { col, descending: true };
      else sort = null;
      rows = sort ? [...base].sort((a, b) => cmp(a, b, sort as RedTableSort)) : base;
      handle?.update({ rows, sort });
    },
    onSelectChange: (keys) => {
      status.textContent = `${keys.length} selected`;
    },
    onRowDelete: (key) => {
      rows = rows.filter((r) => String(r["id"]) !== key);
      handle?.update({ rows });
      status.textContent = `${rows.length} rows`;
    },
  });

  return el(
    "section",
    { class: "route lab" },
    labHeader("redtable", "amenan-ui's data grid — virtual scrolling, click-to-sort, and a live interaction switch. Mock data; your clicks stay on the page."),
    el("div", { class: "lab-toolbar" }, seg, status),
    tableHost,
    el("p", { class: "lab-note" }, "Click a header to sort. Switch interaction to select rows, edit a cell inline, or delete on click. One component, four behaviours — config, not forks."),
  );
});

/* ── filter-panel page ─────────────────────────────────────────────────────*/
function describe(node: FilterNode | null, depth = 0): string {
  if (!node) return "(empty)";
  const pad = "  ".repeat(depth);
  const n = node as unknown as {
    op?: string;
    children?: FilterNode[];
    col?: string;
    value?: unknown;
    from?: unknown;
    to?: unknown;
  };
  if (Array.isArray(n.children)) {
    const join = (n.op ?? "and").toUpperCase();
    const kids = n.children.map((c) => describe(c, depth + 1)).join("\n");
    return `${pad}${join} {\n${kids}\n${pad}}`;
  }
  const val = n.from != null || n.to != null ? `${n.from ?? ""}…${n.to ?? ""}` : String(n.value ?? "");
  return `${pad}${n.col ?? "?"} ${n.op ?? "?"} ${val}`.trimEnd();
}

const filterPanelView = labView(() => {
  const out = el("pre", { class: "lab-query" }, "(build a filter, then Apply)");
  const panelHost = el("div", { class: "lab-fp" });
  mountFilterPanel(panelHost, {
    columns: COLUMNS.map((c) => ({ key: c.key, label: c.label })),
    onApply: (node) => {
      out.textContent = describe(node);
    },
    onClear: () => {
      out.textContent = "(cleared)";
    },
  });
  return el(
    "section",
    { class: "route lab" },
    labHeader("filter-panel", "A visual query builder over a shared filter-node algebra. Nested All/Any groups compile to a typed predicate tree — shown live on the right."),
    el("div", { class: "lab-fp-grid" }, panelHost, el("div", { class: "lab-query-wrap" }, el("div", { class: "lab-query-label" }, "Assembled query"), out)),
  );
});

/* ── design-system showcase (with a live omni over the site) ────────────────*/
interface SiteEntry {
  kind: string;
  label: string;
  sub: string;
  hash: string;
}
const SITE_INDEX: SiteEntry[] = [
  { kind: "page", label: "Home", sub: "The front door", hash: "#/home" },
  { kind: "page", label: "Work", sub: "All projects", hash: "#/work" },
  { kind: "page", label: "About", sub: "Bio & CV", hash: "#/about" },
  { kind: "page", label: "Contact", sub: "Get in touch", hash: "#/contact" },
  { kind: "project", label: "csv-workbench", sub: "Polars → wasm CSV tool", hash: "#/demo/csv-workbench" },
  { kind: "project", label: "echarts-dashboard", sub: "Client-side analytics", hash: "#/demo/echarts-dashboard" },
  { kind: "project", label: "rbac-explorer", sub: "Scoped-ownership access", hash: "#/demo/rbac-explorer" },
  { kind: "project", label: "redtable", sub: "The data grid", hash: "#/lab/redtable" },
  { kind: "project", label: "filter-panel", sub: "Visual query builder", hash: "#/lab/filter-panel" },
  { kind: "writing", label: "The immune system", sub: "Case study", hash: "#/writing/immune-system" },
];

const designSystemView = labView(() => {
  const s = el("section", { class: "route lab prose-wide" });
  s.append(
    labHeader("amenan-ui", "The framework this site runs on. Dependency-free TypeScript: a two-axis theme platform, a component library, and page-assembly + router primitives — all on display here."),
  );

  // live omni search over the site's own index
  const omniHost = el("div", { class: "ds-omni" });
  mountOmni(omniHost, {
    placeholder: "Search the site…  (Ctrl-K)",
    kinds: {
      page: { label: "Pages", icon: "bi-folder" },
      project: { label: "Projects", icon: "bi-folder" },
      writing: { label: "Writing", icon: "bi-folder" },
    },
    source: ({ q }) => {
      const needle = q.toLowerCase();
      const hits = SITE_INDEX.filter(
        (e) => e.label.toLowerCase().includes(needle) || e.sub.toLowerCase().includes(needle),
      ).map<OmniResult>((e) => ({ kind: e.kind, label: e.label, sub: e.sub, hash: e.hash }));
      return Promise.resolve(hits);
    },
    onSelect: (r) => {
      if (r.hash) location.hash = r.hash;
    },
  });
  s.append(el("div", { class: "ds-block" }, el("h2", {}, "Omnisearch"), el("p", { class: "ds-sub" }, "amenan-ui's ", el("code", {}, "omni"), " — injected search source, keyboard nav, debounced. This one indexes the site; press Enter to jump."), omniHost));

  // theme axes
  s.append(
    el(
      "div",
      { class: "ds-block" },
      el("h2", {}, "One platform, many looks"),
      el(
        "p",
        { class: "ds-sub" },
        "Theme, light/dark, text size, density and motion are all attributes on ",
        el("code", {}, "<html>"),
        " filling a frozen token contract — switching is one attribute write + the CSS cascade (O(1)), persisted and applied before paint.",
      ),
      el("div", { class: "ds-actions" }, (() => {
        const b = el("button", { class: "amu-btn amu-btn--accent", type: "button" }, icon("gear"), el("span", {}, "Open Display settings"));
        b.addEventListener("click", () => openDisplayModal());
        return b;
      })()),
    ),
  );

  // component gallery
  const gallery = el("div", { class: "ds-gallery" });
  gallery.append(
    galleryCard("Buttons", el(
      "div",
      { class: "ds-row" },
      button({ label: "Primary", variant: "accent" }),
      button({ label: "Default" }),
      button({ label: "Ghost", variant: "ghost" }),
      button({ label: "Danger", variant: "danger" }),
    )),
    galleryCard("Badges", el(
      "div",
      { class: "ds-row" },
      badge({ label: "Data table" }),
      badge({ label: "Analytics" }),
      badge({ label: "Framework" }),
      badge({ label: "Case study" }),
    )),
    galleryCard("Keyboard", el("div", { class: "ds-row" }, kbd("Ctrl"), kbd("K"), el("span", { class: "ds-sub" }, "focuses omni"))),
    galleryCard("Cards", (() => {
      const h = el("div", { class: "ds-mini-cards" });
      mountCard(h, { title: "A card", sub: "with a subtitle", body: el("p", { class: "ds-sub" }, "The tile the project grid is built from.") });
      return h;
    })()),
  );
  s.append(el("div", { class: "ds-block" }, el("h2", {}, "Component gallery"), gallery));

  // links to the component demos
  const grid = el("div", { class: "grid" });
  for (const p of LAB_PROJECTS.filter((x) => x.route.startsWith("lab/"))) {
    mountCard(grid, {
      title: p.title,
      body: el(
        "div",
        { class: "card-body" },
        badge({ label: p.kind }),
        el("p", { class: "blurb" }, p.blurb),
        el(
          "div",
          { class: "links" },
          el("a", { class: "amu-btn amu-btn--accent", href: `#/${p.route}` }, icon("play"), el("span", {}, "Open")),
        ),
      ),
    });
  }
  s.append(el("div", { class: "ds-block" }, el("h2", {}, "Live component demos"), grid));
  return s;
});

function galleryCard(title: string, body: HTMLElement): HTMLElement {
  return el("div", { class: "ds-card" }, el("h3", {}, title), body);
}

/* ── exported routes + titles ──────────────────────────────────────────────*/
export const labRoutes: RouteMap = {
  "design-system": { mount: designSystemView },
  "lab/redtable": { mount: redtableView },
  "lab/filter-panel": { mount: filterPanelView },
};

export const LAB_TITLES: Record<string, string> = {
  "design-system": "amenan-ui — Emmanuel Doumouya",
  "lab/redtable": "redtable — Emmanuel Doumouya",
  "lab/filter-panel": "filter-panel — Emmanuel Doumouya",
};
