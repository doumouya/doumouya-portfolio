/** The portfolio front-door — re-authored on amenan-ui, the very framework this
   site is a work-sample of. The project grid is built from amenan-ui's own `card`
   component, topped by the Console `termbar` (traffic-lights + wordmark + a live
   light/dark toggle wired straight to the framework's theme seam). The page wears
   amenan-ui's `portfolio` theme (set on <html> at build time). No bespoke DOM
   helpers, no second design system — `el`, the cards, the badge, and the button
   affordance all come from the package. */

import { el, mountTermbar, mountCard, badge } from "amenan-ui";

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
    repo: "https://github.com/doumouya/doumouya-portfolio/tree/main/csv-workbench",
    demo: "apps/csv-workbench/index.html",
    docs: "https://github.com/doumouya/doumouya-portfolio/blob/main/csv-workbench/README.md",
  },
  {
    title: "echarts-dashboard",
    kind: "Analytics",
    blurb:
      "Open a CSV, group and aggregate it, and chart it with ECharts — all client-side. The aggregation runs in a Rust→wasm engine on-device; nothing is uploaded.",
    stack: "Rust → wasm · ECharts · TypeScript",
    repo: "https://github.com/doumouya/doumouya-portfolio/tree/main/echarts-dashboard",
    demo: "apps/echarts-dashboard/index.html",
    docs: "https://github.com/doumouya/doumouya-portfolio/blob/main/echarts-dashboard/docs/spec.md",
  },
  {
    title: "rbac-explorer",
    kind: "Access control",
    blurb:
      "An interactive picture of scoped-ownership access: pick an actor and watch what they can reach light up; grant or revoke and see it recompute live. The reach rule is a pure, cycle-safe Rust resolver.",
    stack: "Rust → wasm · TypeScript",
    repo: "https://github.com/doumouya/doumouya-portfolio/tree/main/rbac-explorer",
    demo: "apps/rbac-explorer/index.html",
    docs: "https://github.com/doumouya/doumouya-portfolio/blob/main/rbac-explorer/docs/spec.md",
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

/** A link wearing amenan-ui's button affordance (`.amu-btn`). External links open
    in a new tab (rel=noopener). `accent` renders the filled primary action (ink in
    the Console theme); the rest are the quiet default. */
function linkButton(label: string, href: string, accent = false): HTMLAnchorElement {
  const external = href.startsWith("http");
  return el(
    "a",
    {
      class: accent ? "amu-btn amu-btn--accent" : "amu-btn",
      href,
      target: "_blank",
      rel: external ? "noopener noreferrer" : "noopener",
    },
    label,
  );
}

/** The body of a project card: a kind badge, the blurb, the stack line, and the
    action links. `mountCard` paints the title; this fills everything beneath it. */
function cardBody(p: Project): HTMLElement {
  const links = el("div", { class: "links" });
  if (p.demo) links.append(linkButton("Try it", p.demo, true));
  links.append(linkButton("Code", p.repo));
  if (p.docs) links.append(linkButton("Docs", p.docs));
  return el(
    "div",
    { class: "card-body" },
    badge({ label: p.kind }),
    el("p", { class: "blurb" }, p.blurb),
    el("p", { class: "stack" }, p.stack),
    links,
  );
}

// The Console top strip — amenan-ui's `termbar`: three traffic-lights, the
// "doumouya" wordmark, the cwd, a status pill, and a light/dark toggle the
// framework wires to its theme seam (toggleMode/onThemeChange). Mounted above the hero.
const termbarHost = document.getElementById("termbar");
if (termbarHost) {
  mountTermbar(termbarHost, { cwd: "~/portfolio", status: "● open source · runs offline" });
}

// One amenan-ui card per project; the body holds the kind, blurb, stack, and links.
const grid = document.getElementById("grid");
if (grid) {
  for (const p of PROJECTS) mountCard(grid, { title: p.title, body: cardBody(p) });
}
