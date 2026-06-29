//! rbac-core — the pure reach resolver for a scoped-ownership access model.
//!
//! Objects form a scope tree (each node has an optional parent). A membership on a node grants reach
//! to that node **and everything scoped beneath it, transitively** — reach DESCENDS, and a membership
//! on a child never climbs to its parent. Given the seed (the nodes an actor is a member of),
//! [`Graph::reachable`] returns every node that actor can see.
//!
//! Pure (no IO), cycle-safe, and wasm-portable, so the identical rule runs in the browser. This is
//! the same rule the companion "build-engine" enforces server-side with a recursive SQL CTE.

use std::collections::{BTreeMap, BTreeSet};

/// A scope graph: node ids plus the parent→children edges derived from each node's parent.
pub struct Graph {
    ids: Vec<String>,
    children: BTreeMap<String, Vec<String>>,
}

impl Graph {
    /// Build from aligned `ids` and `parent_of` (each `None` = a root). Unknown parents are ignored.
    pub fn new(ids: Vec<String>, parent_of: Vec<Option<String>>) -> Graph {
        let mut children: BTreeMap<String, Vec<String>> = BTreeMap::new();
        for (i, id) in ids.iter().enumerate() {
            if let Some(Some(parent)) = parent_of.get(i) {
                children.entry(parent.clone()).or_default().push(id.clone());
            }
        }
        Graph { ids, children }
    }

    pub fn ids(&self) -> &[String] {
        &self.ids
    }

    /// Every node reachable from `seed` by descending the scope tree. Includes the seed nodes. The
    /// `reached.insert` guard makes it cycle-safe.
    pub fn reachable(&self, seed: &BTreeSet<String>) -> BTreeSet<String> {
        let mut reached = BTreeSet::new();
        let mut stack: Vec<String> = seed.iter().cloned().collect();
        while let Some(node) = stack.pop() {
            if reached.insert(node.clone()) {
                if let Some(children) = self.children.get(&node) {
                    for child in children {
                        if !reached.contains(child) {
                            stack.push(child.clone());
                        }
                    }
                }
            }
        }
        reached
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // acme ─ eng ─ {apollo, zephyr}
    //      └ sales ─ {eu, us}
    fn acme() -> Graph {
        let node = |id: &str, parent: Option<&str>| (id.to_string(), parent.map(str::to_string));
        let rows = [
            node("acme", None),
            node("eng", Some("acme")),
            node("apollo", Some("eng")),
            node("zephyr", Some("eng")),
            node("sales", Some("acme")),
            node("eu", Some("sales")),
            node("us", Some("sales")),
        ];
        Graph::new(rows.iter().map(|r| r.0.clone()).collect(), rows.iter().map(|r| r.1.clone()).collect())
    }
    fn seed(items: &[&str]) -> BTreeSet<String> {
        items.iter().map(|s| s.to_string()).collect()
    }

    #[test]
    fn membership_at_root_reaches_everything() {
        assert_eq!(
            acme().reachable(&seed(&["acme"])),
            seed(&["acme", "eng", "apollo", "zephyr", "sales", "eu", "us"])
        );
    }

    #[test]
    fn membership_descends_not_climbs() {
        let g = acme();
        assert_eq!(g.reachable(&seed(&["eng"])), seed(&["eng", "apollo", "zephyr"]));
        assert_eq!(g.reachable(&seed(&["apollo"])), seed(&["apollo"]));
        // a member of apollo can't see its parent eng or sibling zephyr
        let r = g.reachable(&seed(&["apollo"]));
        assert!(!r.contains("eng") && !r.contains("zephyr"));
    }

    #[test]
    fn unions_multiple_memberships() {
        assert_eq!(
            acme().reachable(&seed(&["apollo", "sales"])),
            seed(&["apollo", "sales", "eu", "us"])
        );
    }

    #[test]
    fn empty_seed_reaches_nothing() {
        assert!(acme().reachable(&seed(&[])).is_empty());
    }

    #[test]
    fn cycles_terminate() {
        let g = Graph::new(
            vec!["a".into(), "b".into()],
            vec![Some("b".into()), Some("a".into())],
        );
        assert_eq!(g.reachable(&seed(&["a"])), seed(&["a", "b"]));
    }
}
