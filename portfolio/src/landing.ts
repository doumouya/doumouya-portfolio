/** The portfolio front-door: a card per project, built from data. Styled with web-kit's tokens. */

type Kind = "Data cleaning" | "Data table" | "Analytics" | "Access control" | "System";

interface Project {
  title: string;
  kind: Kind;
  blurb: string;
  stack: string;
  repo: string;
  demo?: string; // a local, offline-runnable single-file demo
  docs?: string;
}

const PROJECTS: Project[] = [
  {
    title: "csv-workbench",
    kind: "Data table",
    blurb:
      "Open a CSV and work it like a spreadsheet — live full-text search, click-to-sort, inline cell edits, and row select/delete — then clean it with a tools panel: normalize headers, change column types (locale-aware: it reads 1 234,56 and oui/non), fill or drop empties, split, combine, find & replace. Every change is an undoable step with a visible history; export when done. The full Polars data engine, compiled to WebAssembly and run in a Web Worker; your data never leaves the page.",
    stack: "Rust · Polars → wasm · Web Worker · TypeScript",
    repo: "https://github.com/doumouya/csv-workbench",
    demo: "https://doumouya.github.io/csv-workbench/",
    docs: "https://github.com/doumouya/csv-workbench/blob/main/README.md",
  },
  {
    title: "echarts-dashboard",
    kind: "Analytics",
    blurb:
      "Open a CSV, group and aggregate it, and chart it with ECharts — all client-side. The aggregation runs in a Rust→wasm engine on-device; nothing is uploaded.",
    stack: "Rust → wasm · ECharts · TypeScript",
    repo: "https://github.com/doumouya/echarts-dashboard",
    demo: "apps/echarts-dashboard/index.html",
    docs: "https://github.com/doumouya/echarts-dashboard/blob/main/docs/spec.md",
  },
  {
    title: "rbac-explorer",
    kind: "Access control",
    blurb:
      "An interactive picture of scoped-ownership access: pick an actor and watch what they can reach light up; grant or revoke and see it recompute live. The reach rule is a pure, cycle-safe Rust resolver.",
    stack: "Rust → wasm · TypeScript",
    repo: "https://github.com/doumouya/rbac-explorer",
    demo: "apps/rbac-explorer/index.html",
    docs: "https://github.com/doumouya/rbac-explorer/blob/main/docs/spec.md",
  },
  {
    title: "build-engine",
    kind: "System",
    blurb:
      "A self-hosting build system whose own database stores its build process — a workflow engine, an HTTP edge, and an MCP tool surface that share one validated core. It recorded its own RBAC feature as a Case. This is the system the demos are built through.",
    stack: "Rust · Axum · sqlx · Postgres · MCP",
    repo: "https://github.com/doumouya/build-engine-demo",
    docs: "https://github.com/doumouya/build-engine-demo/blob/main/docs/build-log/entity-rbac.md",
  },
];

type Attrs = Record<string, string | null | undefined>;
function el(tag: string, attrs: Attrs = {}, ...children: Array<Node | string>): HTMLElement {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) if (v != null) node.setAttribute(k, v);
  for (const c of children) node.append(c);
  return node;
}

/** A link styled as a button. External links open in a new tab (rel=noopener). */
function link(label: string, href: string, primary = false): HTMLElement {
  const external = href.startsWith("http");
  return el(
    "a",
    {
      class: primary ? "lnk lnk-primary" : "lnk",
      href,
      target: "_blank",
      rel: external ? "noopener noreferrer" : "noopener",
    },
    label,
  );
}

function card(p: Project): HTMLElement {
  const head = el("div", { class: "card-head" }, el("h3", {}, p.title), el("span", { class: "kind" }, p.kind));
  const links = el("div", { class: "links" });
  if (p.demo) links.append(link("Try it", p.demo, true));
  links.append(link("Code", p.repo));
  if (p.docs) links.append(link("Docs", p.docs));
  return el(
    "article",
    { class: "card" },
    head,
    el("p", { class: "blurb" }, p.blurb),
    el("p", { class: "stack" }, p.stack),
    links,
  );
}

const grid = document.getElementById("grid");
if (grid) for (const p of PROJECTS) grid.append(card(p));
