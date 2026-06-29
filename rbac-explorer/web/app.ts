/* Interactive reference UI for scoped-ownership reach. A sample org tree + memberships; pick an actor
   and the nodes they can reach light up. Click a node to grant/revoke that actor's membership and watch
   reach recompute. The reach itself is the wasm engine (WasmGraph.reachable); this file only renders and
   edits the membership state — built with web-kit components and tokens, no innerHTML. */
import { el } from "../../web-kit/src/el";
import { select } from "../../web-kit/src/components/select";
import { badge } from "../../web-kit/src/components/badge";
import { stat } from "../../web-kit/src/components/stat";

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

  const memberBadges = membersAt(n.id).map((a) =>
    badge(a.slice(0, 1), {
      tone: a === actor ? "accent" : "neutral",
      variant: a === actor ? "solid" : "soft",
      attrs: { title: a },
    }),
  );

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
  byId("panel").replaceChildren(
    stat(String(reachable.length), {
      unit: `/ ${NODES.length}`,
      caption: "reachable nodes",
      tone: "success",
      size: "sm",
      class: "reach-stat",
    }),
    el("p", {}, el("b", {}, actor), " is a member of:", el("br"),
      memberOf.length ? memberOf.map(labelOf).join(", ") : el("i", {}, "nothing")),
    el("p", {}, "Reaches:", el("br"),
      reachable.length ? reachable.map((n) => labelOf(n.id)).join(", ") : el("i", {}, "nothing")),
  );
}

function buildChrome(): void {
  const actorField = select({ size: "sm", children: ACTORS.map((a) => el("option", { selected: a === actor }, a)) });
  const sel = actorField.querySelector("select") as HTMLSelectElement;
  sel.addEventListener("change", () => { actor = sel.value as Actor; render(); });

  const header = el(
    "header",
    { class: "app-header" },
    el("h1", {}, "rbac-explorer"),
    el("span", { class: "muted" }, "scoped-ownership access, resolved in your browser"),
    el("span", { class: "spacer" }),
    el("label", { class: "actor-field" }, "Actor", actorField),
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
