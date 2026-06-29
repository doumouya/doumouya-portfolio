# rbac-explorer — spec

## What it is
An interactive picture of a scoped-ownership access model. Objects form a scope tree (Company →
Department → Project/Team). A user gets a **membership** at some node, which grants them access to that
node and everything beneath it. The app lets you pick an actor, see their reachable set highlighted,
and edit memberships by clicking — so the "reach descends, never climbs" rule becomes something you can
*see*. Everything is computed in the browser.

## The access rule
`reachable(actor) = ⋃ over each node the actor is a member of, of that node's subtree`. A membership on
a child never grants the parent or siblings. Resolved by a depth-first descent that is cycle-safe (a
visited-set guard), so even a malformed graph terminates.

## Architecture (three thin layers)
1. **`rbac-core` (Rust)** — the resolver. `Graph::new(ids, parent_of)` builds the scope edges;
   `Graph::reachable(seed) → set` descends. No IO, no deps.
2. **`rbac-wasm` (Rust → JS)** — the `WasmGraph` binding (below). The integration seam.
3. **Front-end (vanilla JS/CSS)** — renders the tree, highlights reach, and edits memberships. Built
   via Claude Design from [`fe-brief.md`](fe-brief.md).

Then **packaged as one file**: the wasm resolver is base64-embedded and instantiated in-page. Offline.

## The engine API (Rust)
```rust
Graph::new(ids: Vec<String>, parent_of: Vec<Option<String>>) -> Graph   // None parent = a root
graph.reachable(&BTreeSet<String> /* seed */) -> BTreeSet<String>        // descends; includes the seed
```

## The JS API (wasm-bindgen, the FE codes against this)
```ts
class WasmGraph {
  constructor(ids: string[], parents: string[]);   // parents[i] = "" for a root
  reachable(seed: string[]): string[];             // node ids reachable from the seed memberships
}
```
The UI holds the membership state (actor → set of node ids) and calls `reachable([...members])` on every
change to repaint. Labels/kinds live only in the UI; the engine needs nothing but ids + parent edges.

## Relationship to build-engine
This is the **client-portable mirror** of the build-engine's reach resolver. There, the identical rule
runs server-side as a recursive SQL CTE and is proven (by a test) to agree with the pure resolver. Here
the pure resolver runs in the browser — same rule, two deployments.

## Scope
- **v1 (this build):** a sample org, an actor selector, reach highlighting, click-to-grant/revoke.
- **Later:** a proper graph/force layout, editing the org structure, multiple roles (viewer/admin),
  "who can reach this node?" (reverse lookup), and importing a real org from CSV/JSON.

## Non-goals
No backend, no accounts, no network. An independent tool — no references to any source project.
