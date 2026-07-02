/** The portfolio front-door — an SPA authored on amenan-ui, the framework this
   site is itself a work-sample of. A persistent Console shell (termbar + nav) wraps
   a hash-routed content area; every route is an amenan-ui `Mount`. Project demos are
   embedded IN-SITE (an iframe of the committed offline app) with a "← Work" back
   link — no more `target="_blank"` orphaning, working Back, deep-links. No second
   design system: `el`, the cards, the badge, the markdown renderer, the router, and
   the theme seam all come from the package. */

import { el, mountTermbar, mountCard, badge, renderMarkdown, createRouter } from "amenan-ui";
import type { Mount, RouteMap } from "amenan-ui";
import { IMMUNE_SYSTEM_MD } from "./posts/immune-system.ts";
import { initPrefs, openDisplayModal } from "./prefs.ts";
import { icon } from "./icons.ts";
import type { IconName } from "./icons.ts";
import { labRoutes, LAB_PROJECTS, LAB_TITLES } from "./lab.ts";
import type { LabProject } from "./lab.ts";
import { designerRoutes, DESIGNER_TITLE } from "./designer.ts";

type Kind =
  | "Data cleaning"
  | "Data table"
  | "Analytics"
  | "Access control"
  | "System"
  | "Framework";

interface Project {
  title: string;
  kind: Kind;
  blurb: string;
  stack: string;
  repo: string;
  demo?: string; // a local, offline-runnable demo, embedded in-site
  docs?: string;
  docsLabel?: string; // override the generic "Docs" when the doc is a specific artifact
}

const PROJECTS: Project[] = [
  {
    title: "csv-workbench",
    kind: "Data table",
    blurb:
      "Open a CSV and work it like a spreadsheet — live full-text search, click-to-sort, inline cell edits, row select/delete — then clean it with a tools panel: normalize headers, change column types (locale-aware: it reads 1 234,56 and oui/non), fill or drop empties, split, combine, find & replace. Or query it with SQL, right in the browser. Every change is an undoable step with a visible history; export when done. The full Polars data engine (SQL included), compiled to WebAssembly in a Web Worker.",
    stack: "Rust · Polars → wasm · Web Worker · TypeScript",
    repo: "https://github.com/doumouya/doumouya-portfolio/tree/main/csv-workbench",
    demo: "apps/csv-workbench/index.html",
    docs: "https://github.com/doumouya/doumouya-portfolio/blob/main/csv-workbench/README.md",
  },
  {
    title: "echarts-dashboard",
    kind: "Analytics",
    blurb:
      "The same engine family pointed at analytics: open a CSV, pick a group-by and a measure, and chart the aggregate with ECharts — instant chart cards, all client-side.",
    stack: "Rust → wasm · ECharts · TypeScript",
    repo: "https://github.com/doumouya/doumouya-portfolio/tree/main/echarts-dashboard",
    demo: "apps/echarts-dashboard/index.html",
    docs: "https://github.com/doumouya/doumouya-portfolio/blob/main/echarts-dashboard/docs/spec.md",
  },
  {
    title: "rbac-explorer",
    kind: "Access control",
    blurb:
      "The build-engine's scoped-ownership access model, made visible: pick an actor and watch what they can reach light up; grant or revoke and see it recompute live. The same pure, cycle-safe Rust reach resolver the engine enforces.",
    stack: "Rust → wasm · TypeScript",
    repo: "https://github.com/doumouya/doumouya-portfolio/tree/main/rbac-explorer",
    demo: "apps/rbac-explorer/index.html",
    docs: "https://github.com/doumouya/doumouya-portfolio/blob/main/rbac-explorer/docs/spec.md",
  },
  {
    title: "build-engine",
    kind: "System",
    blurb:
      "A self-hosting build system: AI agents drive development through its MCP tool surface, and every feature lands as a Case in its own database — a workflow engine, an HTTP edge, and an agent tool surface over one validated core. This is the system the apps here are built through; the Case where it built its own RBAC is public.",
    stack: "Rust · Axum · sqlx · Postgres · MCP",
    repo: "https://github.com/doumouya/build-engine-demo",
    docs: "https://github.com/doumouya/build-engine-demo/blob/main/docs/build-log/entity-rbac.md",
    docsLabel: "Read the RBAC Case",
  },
];

/* ── link affordances ─────────────────────────────────────────────────────
   External links (Code / Docs / GitHub) open in a new tab. In-site links (nav,
   "Open demo", "Read") are plain hash routes — no target, so Back works and the
   shell persists. Both wear amenan-ui's `.amu-btn`; `accent` is the filled primary. */

function extBtn(label: string, href: string, accent = false, ico?: IconName): HTMLAnchorElement {
  return el(
    "a",
    { class: accent ? "amu-btn amu-btn--accent" : "amu-btn", href, target: "_blank", rel: "noopener noreferrer" },
    ico ? icon(ico) : null,
    el("span", {}, label),
  );
}

function routeBtn(label: string, hash: string, accent = false, ico?: IconName): HTMLAnchorElement {
  return el(
    "a",
    { class: accent ? "amu-btn amu-btn--accent" : "amu-btn", href: hash },
    ico ? icon(ico) : null,
    el("span", {}, label),
  );
}

const demoHash = (p: Project): string => `#/demo/${p.title}`;
const demoRoute = (p: Project): string => `demo/${p.title}`;

/* ── the project card body: kind badge, blurb, stack, and links ───────────── */

function cardBody(p: Project): HTMLElement {
  const links = el("div", { class: "links" });
  if (p.demo) links.append(routeBtn("Demo", demoHash(p), true, "play"));
  links.append(extBtn("Code", p.repo, false, "code"));
  if (p.docs) links.append(extBtn(p.docsLabel ?? "Docs", p.docs, false, "docs"));
  return el(
    "div",
    { class: "card-body" },
    badge({ label: p.kind }),
    el("p", { class: "blurb" }, p.blurb),
    el("p", { class: "stack" }, p.stack),
    links,
  );
}

/** Card body for a framework/component project — Open (in-site page) + Code. */
function labCardBody(p: LabProject): HTMLElement {
  return el(
    "div",
    { class: "card-body" },
    badge({ label: p.kind }),
    el("p", { class: "blurb" }, p.blurb),
    el("p", { class: "stack" }, p.stack),
    el(
      "div",
      { class: "links" },
      routeBtn("Open", `#/${p.route}`, true, "play"),
      extBtn("Code", p.repo, false, "code"),
    ),
  );
}

/* ── views (each an amenan-ui `Mount`) ─────────────────────────────────────
   A view builds one container, appends it to the route host, and hands back a
   handle whose destroy() removes it. The router tears the previous one down. */

function view(build: () => HTMLElement): Mount {
  return (host: Element) => {
    const node = build();
    host.appendChild(node);
    return { el: node, destroy: () => node.remove() };
  };
}

function section(cls: string, ...children: (Node | string | null)[]): HTMLElement {
  return el("section", { class: `route ${cls}` }, ...children);
}

const homeView = view(() => {
  const s = section("home");
  const hero = el(
    "header",
    { class: "hero" },
    el("h1", {}, "Emmanuel Doumouya"),
    el(
      "p",
      { class: "sub" },
      "AI-native engineer. I build end-to-end — a dependency-free UI framework, Rust → wasm apps whose data never leaves your browser, and the AI-agent build system that constructs them — behind CI guardrails that keep the work honest.",
    ),
    el(
      "p",
      { class: "note" },
      "Everything here runs entirely on your device: no server, no upload, no account. All of it is open source and built to be read.",
    ),
    el(
      "div",
      { class: "cta" },
      routeBtn("Explore the work", "#/work", true, "work"),
      routeBtn("Read the story", "#/writing/immune-system", false, "writing"),
      extBtn("CV", "/cv/Emmanuel_Doumouya_CV.pdf", false, "download"),
      extBtn("GitHub", "https://github.com/doumouya", false, "github"),
    ),
  );
  s.append(hero);

  // One card per pillar — the app, the framework it's rendered with, the system
  // it's built through. Everything else lives on Work; no story told twice.
  const featured = el("div", { class: "grid" });
  const app = PROJECTS.find((p) => p.title === "csv-workbench");
  const framework = LAB_PROJECTS.find((p) => p.route === "design-system");
  const method = PROJECTS.find((p) => p.title === "build-engine");
  if (app) mountCard(featured, { title: app.title, body: cardBody(app) });
  if (framework) mountCard(featured, { title: framework.title, body: labCardBody(framework) });
  if (method) mountCard(featured, { title: method.title, body: cardBody(method) });
  s.append(
    el("div", { class: "section-head" }, el("h2", {}, "Featured work"), routeBtn("See all →", "#/work")),
    featured,
  );

  s.append(
    el(
      "section",
      { class: "method" },
      el("h2", {}, "How these were built"),
      el(
        "p",
        {},
        "The projects share one spine: a self-hosting ",
        el("a", { href: "https://github.com/doumouya/build-engine-demo", target: "_blank", rel: "noopener noreferrer" }, "build-engine"),
        " — a workflow engine whose own database stores its build process, with an HTTP edge and an MCP tool surface over one validated core; AI agents drove each feature through it. Each app carries a Rust → WebAssembly engine, so computation happens on your device and your data never leaves the page. The UI layer is ",
        el("a", { href: "#/design-system" }, "amenan-ui"),
        ", a dependency-free TypeScript framework I built from scratch — this site runs on it. The CI gates that keep AI-built code honest are the story of ",
        el("a", { href: "#/writing/immune-system" }, "the immune system"),
        ". Each repository is small, tested, and CI-green.",
      ),
    ),
  );
  return s;
});

const workView = view(() => {
  const s = section("work");
  s.append(
    el(
      "header",
      { class: "page-head" },
      el("h1", {}, "Work"),
      el(
        "p",
        { class: "sub" },
        "Live, in-browser demos — open any one in place, no download. Code and docs open on GitHub.",
      ),
    ),
  );
  // Two groups, five cards. Apps = the demos (each has a `demo`); Systems = what
  // they're made with (the framework) and made through (the build system). The
  // shared wasm/privacy claim lives here ONCE, not in every blurb; the component
  // demos live on the design-system tour, their single home.
  const apps = el("div", { class: "grid" });
  for (const p of PROJECTS.filter((x) => x.demo)) mountCard(apps, { title: p.title, body: cardBody(p) });
  s.append(
    el("div", { class: "section-head" }, el("h2", {}, "Apps")),
    el(
      "p",
      { class: "group-intro" },
      "Three apps, each carrying its own Rust → WebAssembly engine — computation happens on your device, and your data never leaves the page.",
    ),
    apps,
  );

  const systems = el("div", { class: "grid" });
  const framework = LAB_PROJECTS.find((p) => p.route === "design-system");
  if (framework) mountCard(systems, { title: framework.title, body: labCardBody(framework) });
  for (const p of PROJECTS.filter((x) => !x.demo)) mountCard(systems, { title: p.title, body: cardBody(p) });
  s.append(
    el("div", { class: "section-head" }, el("h2", {}, "Systems")),
    el(
      "p",
      { class: "group-intro" },
      "What the apps are made with — and made through: the UI framework they're rendered in, and the AI-agent build system that constructed them.",
    ),
    systems,
  );
  return s;
});

function demoView(p: Project): Mount {
  return view(() => {
    const s = section("demo");
    const bar = el(
      "div",
      { class: "demo-bar" },
      routeBtn("Work", "#/work", false, "back"),
      el("span", { class: "demo-title" }, p.title),
      el("span", { class: "spacer" }),
      extBtn("Code", p.repo, false, "code"),
      ...(p.docs ? [extBtn("Docs", p.docs, false, "docs")] : []),
    );
    const frame = el("iframe", {
      class: "demo-frame",
      src: p.demo ?? "",
      title: `${p.title} — live demo`,
      loading: "lazy",
      allow: "clipboard-read; clipboard-write; fullscreen",
    });
    s.append(bar, frame);
    return s;
  });
}

const writingIndexView = view(() => {
  const s = section("writing");
  s.append(el("header", { class: "page-head" }, el("h1", {}, "Writing")));
  const grid = el("div", { class: "grid" });
  mountCard(grid, {
    title: "The immune system",
    body: el(
      "div",
      { class: "card-body" },
      badge({ label: "Case study" }),
      el(
        "p",
        { class: "blurb" },
        "Building a vanilla-JS SPA without a framework — and the gates that kept it honest. 137 same-class CSS divergences turned into a CI failure; measure, don't assert.",
      ),
      el("div", { class: "links" }, routeBtn("Read", "#/writing/immune-system", true, "writing")),
    ),
  });
  s.append(grid);
  return s;
});

/** Render a long-form post. amenan-ui's `renderMarkdown` is built for message
    bodies and doesn't do ATX headings or rules, so we peel off `#`/`---` lines
    here (as real h1–h6 / hr) and delegate every prose block to it — keeping its
    safe inline rendering (bold/italic/code/links/lists) for the body. */
function renderPost(md: string): HTMLElement {
  const art = el("article", { class: "post" });
  const isHeading = (l: string): boolean => /^#{1,6}\s/.test(l);
  const isHr = (l: string): boolean => /^---+\s*$/.test(l);
  const isFence = (l: string): boolean => /^```/.test(l);
  const isListStart = (l: string): boolean => /^\s*([-*]|\d+\.)\s+/.test(l);
  const blank = (l: string): boolean => l.trim() === "";

  // Reflow soft-wrapped paragraph/list-item lines into one line each, so inline
  // spans (**bold**, *italic*, `code`) that straddle a source wrap stay intact —
  // amenan-ui's renderMarkdown parses line-by-line, so a split span would leak
  // its delimiters. Blank lines, headings, rules, fences and list markers break
  // the join, preserving block structure.
  const src = md.replace(/\r\n/g, "\n").split("\n");
  const lines: string[] = [];
  for (const line of src) {
    const prev = lines[lines.length - 1];
    const cont =
      !blank(line) && !isHeading(line) && !isHr(line) && !isFence(line) && !isListStart(line);
    const joinable =
      prev !== undefined && !blank(prev) && !isHeading(prev) && !isHr(prev) && !isFence(prev);
    if (cont && joinable) lines[lines.length - 1] = `${prev} ${line.trim()}`;
    else lines.push(line);
  }

  let buf: string[] = [];
  const flush = (): void => {
    const block = buf.join("\n").trim();
    buf = [];
    if (block) art.appendChild(renderMarkdown(block));
  };
  for (const line of lines) {
    if (isHeading(line)) {
      flush();
      const h = /^(#{1,6})\s+(.*)$/.exec(line);
      const level = Math.min((h?.[1] ?? "").length, 6);
      const tag = (["h1", "h2", "h3", "h4", "h5", "h6"] as const)[level - 1] ?? "h6";
      art.appendChild(el(tag, {}, h?.[2] ?? ""));
    } else if (isHr(line)) {
      flush();
      art.appendChild(el("hr", {}));
    } else {
      buf.push(line);
    }
  }
  flush();
  return art;
}

const immuneSystemView = view(() => {
  const s = section("post-route");
  s.append(el("div", { class: "post-nav" }, routeBtn("Writing", "#/writing", false, "back")));
  s.append(renderPost(IMMUNE_SYSTEM_MD));
  return s;
});

const aboutView = view(() => {
  const s = section("about prose");
  s.append(el("header", { class: "page-head" }, el("h1", {}, "About")));
  s.append(
    el("p", {}, "I'm Emmanuel Doumouya — a data engineer in Dublin who builds production-discipline software with AI."),
    el(
      "p",
      {},
      "For about three years I was the technical advisor to enterprise data teams at Salesforce and Informatica — root-causing complex integrations across SQL, ETL/ELT pipelines, REST/SOAP APIs, and distributed systems, and turning them into reliable outcomes for high-stakes customers. Then I started building. Solo and part-time, alongside the day job, I designed and shipped a multi-crate Rust / WebAssembly platform by directing a team of AI coding agents — and turned every hard-won lesson into a mechanical guardrail. That drift-prevention system — the “immune system” — is written up in the ",
      el("a", { href: "#/writing/immune-system" }, "writing"),
      ".",
    ),
    el(
      "p",
      {},
      "The projects here are the proof: a Polars→WebAssembly CSV workbench, an in-browser analytics dashboard, an access-control explorer, a self-hosting build engine, and amenan-ui — a dependency-free TypeScript UI framework I built from scratch (this site runs on it). All open source, all client-side, all built to be read.",
    ),
    el(
      "p",
      {},
      el("strong", {}, "What I'm good at: "),
      "turning a fuzzy quality nobody has measured into an enforced gate — measure, don't assert; building with Claude at production discipline (MCP, sub-agents, CI guardrails for AI output); SQL and data engineering; Rust→wasm; and shipping fast without eroding quality.",
    ),
    el(
      "p",
      {},
      el("strong", {}, "Honest framing: "),
      "it's early. The builds are pre-production and solo — what they show is how I work, not scale. I'm finishing a BSc (final year), I'm a native French speaker and fluent in English, EU-authorized, and open to relocation or remote-EU. A part-time-to-full-time start suits me while I finish the degree.",
    ),
    el(
      "div",
      { class: "cta" },
      routeBtn("Contact", "#/contact", true, "contact"),
      extBtn("CV", "/cv/Emmanuel_Doumouya_CV.pdf", false, "download"),
      extBtn("GitHub", "https://github.com/doumouya", false, "github"),
      extBtn("LinkedIn", "https://www.linkedin.com/in/doumouya", false, "external"),
    ),
    el(
      "section",
      { class: "colophon" },
      el("h2", {}, "On the name"),
      el(
        "p",
        {},
        "numu is the Mandé word for the blacksmith caste of West Africa — the makers, the forgers who turn raw iron into the tools a whole village depends on. I'm a Numu by ancestry; Doumouya is the name that carries it. I don't forge iron — I forge software — but it's the same craft, a few generations on. The framework this site runs on is amenan-ui, named for my mother, Amenan.",
      ),
    ),
  );
  return s;
});

const contactView = view(() => {
  const s = section("contact prose");
  s.append(el("header", { class: "page-head" }, el("h1", {}, "Contact")));
  s.append(
    el("p", {}, "The fastest way to reach me is email — I read everything."),
    el(
      "p",
      { class: "contact-lines" },
      el("a", { class: "email", href: "mailto:em.doumouya@gmail.com" }, "em.doumouya@gmail.com"),
      el("br"),
      el("a", { href: "https://github.com/doumouya", target: "_blank", rel: "noopener noreferrer" }, "GitHub — github.com/doumouya"),
      el("br"),
      el("a", { href: "https://www.linkedin.com/in/doumouya", target: "_blank", rel: "noopener noreferrer" }, "LinkedIn — linkedin.com/in/doumouya"),
    ),
    el(
      "p",
      { class: "avail" },
      el("strong", {}, "Currently: "),
      "open to roles in data / AI / software engineering — Dublin, relocation, or remote-EU. Native French, fluent English, EU work authorization, ~4 weeks' notice. If a part-time-to-full-time start helps while I finish the BSc, I'm glad to talk about it.",
    ),
  );
  return s;
});

/* ── routes ────────────────────────────────────────────────────────────────
   Hash routes (#/id). Demo routes are generated from the project data so the
   card link, the route key, and the "← Work" back link can never disagree. */

const routes: RouteMap = {
  home: { mount: homeView },
  work: { mount: workView },
  writing: { mount: writingIndexView },
  "writing/immune-system": { mount: immuneSystemView },
  about: { mount: aboutView },
  contact: { mount: contactView },
};
for (const p of PROJECTS) {
  if (p.demo) routes[demoRoute(p)] = { mount: demoView(p) };
}
Object.assign(routes, labRoutes, designerRoutes);

const TITLES: Record<string, string> = {
  home: "Emmanuel Doumouya — AI-native engineer",
  work: "Work — Emmanuel Doumouya",
  writing: "Writing — Emmanuel Doumouya",
  "writing/immune-system": "The immune system — Emmanuel Doumouya",
  about: "About — Emmanuel Doumouya",
  contact: "Contact — Emmanuel Doumouya",
};
Object.assign(TITLES, LAB_TITLES, DESIGNER_TITLE);

/** The section a route highlights in the nav (demo/* → work, writing/* → writing). */
function navSection(id: string): string {
  if (id.startsWith("demo/") || id.startsWith("lab/") || id === "design-system") return "work";
  if (id.startsWith("writing")) return "writing";
  return id;
}

function currentRouteId(): string {
  return (location.hash || "").replace(/^#\//, "").split("?")[0] ?? "";
}

/* ── the persistent shell ──────────────────────────────────────────────────*/

const root = document.getElementById("root");
if (!root) throw new Error("portfolio: missing #root");

const termbarHost = el("div", { id: "termbar" });

const NAV: { id: string; label: string; icon: IconName }[] = [
  { id: "home", label: "Home", icon: "home" },
  { id: "work", label: "Work", icon: "work" },
  { id: "writing", label: "Writing", icon: "writing" },
  { id: "about", label: "About", icon: "about" },
  { id: "contact", label: "Contact", icon: "contact" },
];
const navLinks = NAV.map((n) =>
  el(
    "a",
    { class: "nav-link", href: `#/${n.id}`, "data-route": n.id, title: n.label },
    icon(n.icon),
    el("span", { class: "nav-txt" }, n.label),
  ),
);
const prefBtn = el(
  "button",
  {
    class: "nav-pref amu-btn amu-btn--icon",
    type: "button",
    "aria-haspopup": "dialog",
    "aria-label": "Display preferences",
    title: "Display preferences",
  },
  icon("gear"),
);
prefBtn.addEventListener("click", () => openDisplayModal());
const nav = el(
  "nav",
  { class: "nav", "aria-label": "Primary" },
  el("div", { class: "nav-inner" }, ...navLinks, el("span", { class: "nav-spacer" }), prefBtn),
);

const appHost = el("main", { id: "app", class: "app" });

const chrome = el("header", { class: "chrome" }, termbarHost, nav);
root.append(chrome, appHost);
mountTermbar(termbarHost, { cwd: "~/portfolio", status: "● open source · runs offline" });
initPrefs();

/** Reflect the active route into the nav (aria-current) + the document title. */
function updateChrome(): void {
  const active = navSection(currentRouteId());
  for (const a of navLinks) {
    if (a.dataset.route === active) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  }
  const id = currentRouteId();
  const demo = id.startsWith("demo/") ? id.slice("demo/".length) : "";
  document.title =
    TITLES[id] ?? (demo ? `${demo} — Emmanuel Doumouya` : "Emmanuel Doumouya — portfolio");
}

const router = createRouter({
  routes,
  host: appHost,
  mount(host, def, ctx) {
    host.replaceChildren();
    const handle = def.mount?.(host, ctx);
    updateChrome();
    window.scrollTo(0, 0);
    return handle ?? undefined;
  },
  resolveLanding: () => "home",
});
router.start();
