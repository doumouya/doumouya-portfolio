# rbac-explorer — front-end brief (for Claude Design)

Build the UI for an interactive access-control explorer. The reach resolver already exists as a wasm
module (`WasmGraph`, see [`spec.md`](spec.md)); your job is the visualization. No backend, no framework
— vanilla HTML/CSS/JS.

## The experience
- An **org scope tree** (Company → Department → Project/Team), rendered clearly — the reference build
  uses a nested/indented tree; a **proper node-link or force-directed layout** would be a strong upgrade.
- An **actor picker**. Selecting an actor highlights every node they can **reach** (call
  `graph.reachable([...theirMemberships])`), marks their **direct memberships** distinctly, and dims the
  rest. A side panel summarizes "reaches N of M" and lists the nodes.
- **Click a node** to grant/revoke the selected actor's membership there; reach recomputes instantly.
  This is the core "aha" — show the subtree lighting up the moment a membership is added to a parent.
- **Member badges** on each node (who is a member here), the selected actor emphasized.
- Worth adding: a **reverse lookup** ("who can reach this node?"), editing the org structure
  (add/remove/move nodes), a role distinction (viewer/admin), and import/export of the org as JSON.

## Look & feel
- Clear, diagrammatic, calm. The reach highlight should read instantly (one strong colour for
  reachable, an accent ring for direct membership, dimming for no-access).
- **Relative units only**; responsive down to a **14-inch laptop**. Keyboard-operable controls,
  visible focus, good contrast; respect light/dark via CSS variables.
- Animate reach changes subtly (a quick highlight transition) so the descent is legible.

## Wiring notes
- Load the wasm with `wasm-pack`'s generated JS (`init()` then `WasmGraph`). I'll provide the built
  module; stub `WasmGraph` against the spec'd signatures until then.
- Hold the membership state in JS (actor → set of node ids); the engine is stateless beyond the graph
  structure. Rebuild `WasmGraph` only if the org structure itself changes.

## Non-goals
No upload, no auth, no network. Nothing referencing any source project. Keep everything inlineable so it
ships as one double-clickable, offline `index.html`.
