/* Interactive reference UI for scoped-ownership reach. A sample org tree + memberships; pick an actor
   and the nodes they can reach light up. Click a node to grant/revoke that actor's membership and watch
   reach recompute. The reach itself is the wasm engine (WasmGraph.reachable); this file only renders and
   edits the membership state — built on amenan-ui components + its `portfolio` (Console) theme, no innerHTML. */
import { el, mountSelect, badge, mountStat } from "amenan-ui";

interface OrgNode {
  id: string;
  label: string;
  kind: string;
  parent: string;
}

const NODES: OrgNode[] = [
  { id: "acme", label: "Acme Corp", kind: "Company", parent: "" },
  { id: "eng", label: "Engineering", kind: "Department", parent: "acme" },
  { id: "apollo", label: "Project Apollo", kind: "Project", parent: "eng" },
  { id: "zephyr", label: "Project Zephyr", kind: "Project", parent: "eng" },
  { id: "sales", label: "Sales", kind: "Department", parent: "acme" },
  { id: "eu", label: "Region EU", kind: "Team", parent: "sales" },
  { id: "us", label: "Region US", kind: "Team", parent: "sales" },
];
const ACTORS = ["Alice", "Bob", "Carol", "Dave", "Erin"] as const;
type Actor = (typeof ACTORS)[number];
const memberships: Record<Actor, Set<string>> = {
  Alice: new Set(["acme"]), // company-wide
  Bob: new Set(["eng"]), //     engineering
  Carol: new Set(["apollo"]), // one project
  Dave: new Set(["sales"]), //  sales
  Erin: new Set<string>(), //   none
};

let WasmGraph: typeof wasm_bindgen.WasmGraph;
let graph: wasm_bindgen.WasmGraph;
let actor: Actor = "Bob";

const byId = (id: string): HTMLElement => document.getElementById(id) as HTMLElement;

function b64ToBytes(b64: string): Uint8Array {
  const s = atob(b64);
  const u = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
  return u;
}

const labelOf = (id: string): string => NODES.find((n) => n.id === id)?.label ?? id;
const childrenOf = (pid: string): OrgNode[] => NODES.filter((n) => n.parent === pid);
const membersAt = (id: string): Actor[] => ACTORS.filter((a) => memberships[a].has(id));

/** A node row plus (if any) its children block, as siblings — mirrors the original tree shape. */
function nodeFrag(n: OrgNode, reach: Set<string>): DocumentFragment {
  const frag = document.createDocumentFragment();
  const isMember = memberships[actor].has(n.id);
  const reached = reach.has(n.id);
  const cls = ["node", reached ? "reached" : "dim", isMember && "member"].filter(Boolean).join(" ");

  // amenan-ui's badge: accent-toned for the selected actor, default for the rest; the
  // full name rides on the title attribute (set after build — badge takes label/tone only).
  const memberBadges = membersAt(n.id).map((a) => {
    const b = badge({ label: a.slice(0, 1), tone: a === actor ? "accent" : undefined });
    b.title = a;
    return b;
  });

  const row = el(
    "div",
    { class: cls, title: `click to ${isMember ? "revoke" : "grant"} ${actor}'s membership here` },
    el("span", { class: "nlabel" }, n.label, el("span", { class: "kind" }, n.kind)),
    el("span", { class: "badges" }, ...memberBadges),
  );
  row.addEventListener("click", () => {
    const set = memberships[actor];
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

function render(): void {
  const reach = new Set(graph.reachable([...memberships[actor]]));
  byId("tree").replaceChildren(...NODES.filter((n) => !n.parent).map((n) => nodeFrag(n, reach)));

  const reachable = NODES.filter((n) => reach.has(n.id));
  const memberOf = [...memberships[actor]];

  // amenan-ui's stat is mount-based, so clear the panel, mount the metric, then append the prose.
  const panel = byId("panel");
  panel.replaceChildren();
  mountStat(panel, {
    label: "reachable nodes",
    value: `${reachable.length} / ${NODES.length}`,
    tone: "ok",
  });
  panel.append(
    el("p", {}, el("b", {}, actor), " is a member of:", el("br"),
      memberOf.length ? memberOf.map(labelOf).join(", ") : el("i", {}, "nothing")),
    el("p", {}, "Reaches:", el("br"),
      reachable.length ? reachable.map((n) => labelOf(n.id)).join(", ") : el("i", {}, "nothing")),
  );
}

function buildChrome(): void {
  // amenan-ui's mountSelect renders the <select> into a host; the <label> is that host.
  const actorField = el("label", { class: "actor-field" }, "Actor");
  mountSelect(actorField, {
    options: ACTORS.map((a) => ({ value: a, label: a })),
    value: actor,
    onChange: (v) => {
      actor = v as Actor;
      render();
    },
  });

  const header = el(
    "header",
    { class: "app-header" },
    el("h1", {}, "rbac-explorer"),
    el("span", { class: "muted" }, "scoped-ownership access, resolved in your browser"),
    el("span", { class: "spacer" }),
    actorField,
  );
  const legend = el(
    "div",
    { class: "legend" },
    el("span", {}, el("b", { class: "swatch sw-reached" }, "●"), " reachable"),
    el("span", {}, el("b", { class: "swatch sw-member" }, "▢"), " direct membership"),
    el("span", {}, el("b", { class: "swatch sw-dim" }, "●"), " no access"),
    el("span", {}, "Membership grants the node ", el("b", {}, "and everything beneath it"), " — never the parent."),
    el("span", {}, "Click any node to grant / revoke the selected actor's membership."),
  );
  const main = el("main", {}, el("section", { id: "tree" }), el("aside", { id: "panel" }));
  byId("root").append(header, legend, main);
}

window.addEventListener("DOMContentLoaded", async () => {
  await wasm_bindgen({ module_or_path: b64ToBytes(WASM_B64) });
  WasmGraph = wasm_bindgen.WasmGraph;
  graph = new WasmGraph(NODES.map((n) => n.id), NODES.map((n) => n.parent));
  buildChrome();
  render();
});
