//! The JavaScript binding for the reach resolver. The UI builds a `WasmGraph` from the scope tree
//! once, then calls `reachable(seed)` every time memberships change to repaint who-can-see-what. The
//! engine stays pure; this layer only converts arrays at the boundary.

use std::collections::BTreeSet;

use rbac_core::Graph;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct WasmGraph {
    inner: Graph,
}

#[wasm_bindgen]
impl WasmGraph {
    /// Build from aligned `ids` and `parents` (an empty string = a root node).
    #[wasm_bindgen(constructor)]
    pub fn new(ids: Vec<String>, parents: Vec<String>) -> WasmGraph {
        let parent_of = parents
            .into_iter()
            .map(|p| if p.is_empty() { None } else { Some(p) })
            .collect();
        WasmGraph {
            inner: Graph::new(ids, parent_of),
        }
    }

    /// The node ids reachable from `seed` (the nodes an actor is a member of), descending the tree.
    pub fn reachable(&self, seed: Vec<String>) -> Vec<String> {
        let set: BTreeSet<String> = seed.into_iter().collect();
        self.inner.reachable(&set).into_iter().collect()
    }
}
