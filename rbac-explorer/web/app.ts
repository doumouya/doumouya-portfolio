/* Interactive reference UI for a realistic corporate access model. Two dimensions:

   1. SCOPED REACH (the wasm engine): people are seeded by ROLE — a Member sits on their
      sub-department leaf (reaches only it), a Manager on the department (the whole subtree),
      the CEO/Admin at the root (everything). The pure Rust `reachable()` then descends the
      scope tree, so "a Sales EU member reaches only EU" falls out of correct seeding — the
      US region is simply out of their scope. Click a node to grant/revoke and watch it recompute.

   2. FIELD PERMISSIONS (the policy layer): a record (a Sales project / an Engineering case) is
      scoped to a node; scope gates whether you see the record at all, and per-field CAPS gate the
      columns. Admin is org-wide but guardrailed — a hard cap ("") on SSN/PII shows the lock glyph.
      Rendered with amenan-ui's own `perm-cell` (rw / r / 🔒), so cells cycle but never exceed the cap.

   Built on amenan-ui + its `portfolio` (Console) theme; the reach is the wasm engine, no innerHTML. */
import { el, mountSelect, badge, mountStat, mountPermCell } from "amenan-ui";

interface OrgNode {
  id: string;
  label: string;
  kind: string;
  parent: string;
}

const NODES: OrgNode[] = [
  { id: "acme", label: "Acme Corp", kind: "Company", parent: "" },
  { id: "eng", label: "Engineering", kind: "Department", parent: "acme" },
  { id: "apollo", label: "Platform squad", kind: "Team", parent: "eng" },
  { id: "zephyr", label: "Apps squad", kind: "Team", parent: "eng" },
  { id: "sales", label: "Sales", kind: "Department", parent: "acme" },
  { id: "eu", label: "Region EU", kind: "Sub-dept", parent: "sales" },
  { id: "us", label: "Region US", kind: "Sub-dept", parent: "sales" },
];

type Tier = "ceo" | "manager" | "member" | "admin";
interface Person {
  id: string;
  name: string;
  title: string;
  tier: Tier;
  home: string; // the node their role seats them at
}

const PEOPLE: Person[] = [
  { id: "dana", name: "Dana Okoye", title: "CEO", tier: "ceo", home: "acme" },
  { id: "ada", name: "Ada Rossi", title: "Admin (IT)", tier: "admin", home: "acme" },
  { id: "priya", name: "Priya Patel", title: "Engineering Manager", tier: "manager", home: "eng" },
  { id: "marcus", name: "Marcus Bell", title: "Sales Manager", tier: "manager", home: "sales" },
  { id: "amina", name: "Amina Traoré", title: "Sales — Region EU", tier: "member", home: "eu" },
  { id: "tom", name: "Tom Chen", title: "Sales — Region US", tier: "member", home: "us" },
  { id: "owen", name: "Owen Silva", title: "Engineer — Platform", tier: "member", home: "apollo" },
  { id: "noa", name: "Noa Kelly", title: "Engineer — Apps", tier: "member", home: "zephyr" },
];

const TIER_LABEL: Record<Tier, string> = {
  ceo: "CEO",
  manager: "Manager",
  member: "Member",
  admin: "Admin",
};
const TIER_COLS: Tier[] = ["ceo", "manager", "member", "admin"];

// each person starts seeded at their role's home node; grant/revoke edits this set live.
const memberships: Record<string, Set<string>> = Object.fromEntries(
  PEOPLE.map((p): [string, Set<string>] => [p.id, new Set<string>([p.home])]),
);

type Perm = "" | "r" | "rw";
interface RecField {
  key: string;
  label: string;
}
interface DemoRecord {
  id: string;
  label: string;
  kind: string;
  scope: string; // the node this record is scoped under
  fields: RecField[];
  caps: Record<Tier, Record<string, Perm>>;
}

const RECORDS: DemoRecord[] = [
  {
    id: "sales-eu",
    label: "Q3 EU Pipeline",
    kind: "Sales data project",
    scope: "eu",
    fields: [
      { key: "name", label: "Project name" },
      { key: "owner", label: "Owner" },
      { key: "forecast", label: "Forecast €" },
      { key: "email", label: "Customer email (PII)" },
      { key: "ssn", label: "Rep SSN" },
    ],
    caps: {
      ceo: { name: "rw", owner: "rw", forecast: "rw", email: "rw", ssn: "r" },
      manager: { name: "rw", owner: "rw", forecast: "rw", email: "r", ssn: "" },
      member: { name: "r", owner: "r", forecast: "r", email: "r", ssn: "" },
      admin: { name: "rw", owner: "rw", forecast: "r", email: "", ssn: "" },
    },
  },
  {
    id: "eng-4412",
    label: "Incident #4412",
    kind: "Engineering case",
    scope: "apollo",
    fields: [
      { key: "title", label: "Title / summary" },
      { key: "severity", label: "Severity" },
      { key: "root", label: "Root cause" },
      { key: "assignee", label: "Assignee" },
      { key: "pii", label: "Customer data (PII)" },
    ],
    caps: {
      ceo: { title: "rw", severity: "rw", root: "rw", assignee: "rw", pii: "rw" },
      manager: { title: "rw", severity: "rw", root: "rw", assignee: "rw", pii: "r" },
      member: { title: "rw", severity: "rw", root: "r", assignee: "r", pii: "" },
      admin: { title: "rw", severity: "rw", root: "r", assignee: "rw", pii: "" },
    },
  },
];

const GUARDRAIL: Record<Tier, string> = {
  ceo: "Unrestricted reach across the whole org.",
  admin:
    "Org-wide operational access — but guardrailed: can't delete the CEO (protected principal), can't read SSN / restricted PII (capped).",
  manager: "Their department only — both sub-teams, nothing in other departments.",
  member: "Their own sub-department only — a sibling region/squad is out of scope.",
};

let WasmGraph: typeof wasm_bindgen.WasmGraph;
let graph: wasm_bindgen.WasmGraph;
let personId = "amina";
let recordId = "sales-eu";

const person = (): Person => PEOPLE.find((p) => p.id === personId) ?? PEOPLE[0]!;
const record = (): DemoRecord => RECORDS.find((r) => r.id === recordId) ?? RECORDS[0]!;

const byId = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}

const labelOf = (id: string): string => NODES.find((n) => n.id === id)?.label ?? id;
const childrenOf = (pid: string): OrgNode[] => NODES.filter((n) => n.parent === pid);
const peopleAt = (id: string): Person[] => PEOPLE.filter((p) => memberships[p.id]!.has(id));
const reachOf = (pid: string): Set<string> =>
  new Set(graph.reachable([...memberships[pid]!]));

/** A node row plus (if any) its children block. Highlights the selected person's reach. */
function nodeFrag(n: OrgNode, reach: Set<string>): DocumentFragment {
  const frag = document.createDocumentFragment();
  const p = person();
  const isMember = memberships[p.id]!.has(n.id);
  const reached = reach.has(n.id);
  const cls = ["node", reached ? "reached" : "dim", isMember && "member"].filter(Boolean).join(" ");

  const memberBadges = peopleAt(n.id).map((m) => {
    const b = badge({ label: m.name.slice(0, 1), tone: m.id === p.id ? "accent" : undefined });
    b.title = `${m.name} — ${m.title}`;
    return b;
  });

  const row = el(
    "div",
    { class: cls, title: `click to ${isMember ? "revoke" : "grant"} ${p.name}'s membership here` },
    el("span", { class: "nlabel" }, n.label, el("span", { class: "kind" }, n.kind)),
    el("span", { class: "badges" }, ...memberBadges),
  );
  row.addEventListener("click", () => {
    const set = memberships[p.id]!;
    if (set.has(n.id)) set.delete(n.id);
    else set.add(n.id);
    render();
  });
  frag.append(row);

  const kids = childrenOf(n.id);
  if (kids.length) {
    const wrap = el("div", { class: "children" });
    kids.forEach((k) => wrap.append(nodeFrag(k, reach)));
    frag.append(wrap);
  }
  return frag;
}

function renderTreeAndPanel(): void {
  const p = person();
  const reach = reachOf(p.id);
  byId("tree").replaceChildren(...NODES.filter((n) => !n.parent).map((n) => nodeFrag(n, reach)));

  const reachable = NODES.filter((n) => reach.has(n.id));
  const memberOf = [...memberships[p.id]!];

  const panel = byId("panel");
  panel.replaceChildren();
  const idRow = el(
    "div",
    { class: "who" },
    el("b", {}, p.name),
    badge({ label: TIER_LABEL[p.tier], tone: "accent" }),
    el("span", { class: "muted" }, p.title),
  );
  panel.append(idRow);
  mountStat(panel, {
    label: "reachable nodes",
    value: `${reachable.length} / ${NODES.length}`,
    tone: "ok",
  });
  panel.append(
    el("p", {}, "Seeded at: ", el("b", {}, labelOf(p.home)),
      memberOf.length > 1 ? ` (+ ${memberOf.length - 1} granted)` : ""),
    el("p", {}, "Reaches: ", el("br"),
      reachable.length ? reachable.map((n) => labelOf(n.id)).join(", ") : el("i", {}, "nothing")),
    el("p", { class: "guardrail" }, el("b", {}, "Guardrails: "), GUARDRAIL[p.tier]),
  );
}

/** The field-permission matrix: fields × tiers, each cell a perm-cell showing the cap. The
    selected person's tier column is highlighted; a scope line ties it to the reach dimension. */
function renderMatrix(): void {
  const rec = record();
  const p = person();
  const canReach = reachOf(p.id).has(rec.scope);
  const host = byId("fields");
  host.replaceChildren();

  host.append(
    el(
      "div",
      { class: "rec-scope" },
      "Scoped under ",
      el("b", {}, labelOf(rec.scope)),
      " · ",
      el("span", { class: canReach ? "ok" : "no" }, canReach ? `${p.name} reaches it ✓` : `out of scope for ${p.name} ✗`),
    ),
  );

  const grid = el("div", { class: "perm-matrix" });
  // header
  grid.append(el("div", { class: "pm-head pm-corner" }, "Field"));
  for (const t of TIER_COLS) {
    grid.append(el("div", { class: `pm-head${t === p.tier ? " is-sel" : ""}` }, TIER_LABEL[t]));
  }
  // rows
  for (const f of rec.fields) {
    grid.append(el("div", { class: "pm-field" }, f.label));
    for (const t of TIER_COLS) {
      const cell = el("div", { class: `pm-cell${t === p.tier ? " is-sel" : ""}` });
      const cap = rec.caps[t][f.key] ?? "";
      mountPermCell(cell, { value: cap, cap });
      grid.append(cell);
    }
  }
  host.append(grid);
  host.append(
    el(
      "p",
      { class: "muted pm-note" },
      "Cells show each role's ceiling (cap) for the field — click to cycle, but a cell never exceeds its cap. ",
      el("b", {}, "🔒"),
      " = locked: a hard cap even the Admin can't lift (e.g. SSN / PII), or out of scope.",
    ),
  );
}

function render(): void {
  renderTreeAndPanel();
  renderMatrix();
}

function buildChrome(): void {
  const personField = el("label", { class: "actor-field" }, "Who");
  mountSelect(personField, {
    options: PEOPLE.map((p) => ({ value: p.id, label: `${p.name} · ${p.title}` })),
    value: personId,
    onChange: (v) => {
      personId = v;
      render();
    },
  });

  const header = el(
    "header",
    { class: "app-header" },
    el("h1", {}, "rbac-explorer"),
    el("span", { class: "muted" }, "scoped-ownership + field permissions, resolved in your browser"),
    el("span", { class: "spacer" }),
    personField,
  );
  const legend = el(
    "div",
    { class: "legend" },
    el("span", {}, el("b", { class: "swatch sw-reached" }, "●"), " reachable"),
    el("span", {}, el("b", { class: "swatch sw-member" }, "▢"), " seeded here"),
    el("span", {}, el("b", { class: "swatch sw-dim" }, "●"), " out of scope"),
    el("span", {}, "Role decides the seat: ", el("b", {}, "Member"), " → sub-dept · ", el("b", {}, "Manager"), " → department · ", el("b", {}, "CEO/Admin"), " → root."),
    el("span", {}, "Membership reaches the node ", el("b", {}, "and everything beneath it"), " — never the parent. Click a node to grant / revoke."),
  );
  const main = el("main", {}, el("section", { id: "tree" }), el("aside", { id: "panel" }));

  const recordField = el("label", { class: "actor-field" }, "Record");
  mountSelect(recordField, {
    options: RECORDS.map((r) => ({ value: r.id, label: `${r.label} · ${r.kind}` })),
    value: recordId,
    onChange: (v) => {
      recordId = v;
      renderMatrix();
    },
  });
  const fieldSection = el(
    "section",
    { class: "fieldperms" },
    el(
      "div",
      { class: "fp-head" },
      el("h2", {}, "Field permissions"),
      el("span", { class: "muted" }, "scope gates the record · caps gate the fields"),
      el("span", { class: "spacer" }),
      recordField,
    ),
    el("div", { id: "fields" }),
  );

  byId("root").append(header, legend, main, fieldSection);
}

window.addEventListener("DOMContentLoaded", async () => {
  await wasm_bindgen({ module_or_path: b64ToBytes(WASM_B64) });
  WasmGraph = wasm_bindgen.WasmGraph;
  graph = new WasmGraph(NODES.map((n) => n.id), NODES.map((n) => n.parent));
  buildChrome();
  render();
});
