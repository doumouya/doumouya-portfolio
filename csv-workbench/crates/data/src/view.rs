//! Purpose: server-side row windowing for the /page endpoint — the over-cap
//! fallback (client-side shaping via the wasm engine is the default path).
//! Pure + wasm-safe; cells are stringified for the JSON wire.

use polars::prelude::*;

pub struct Page {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<Option<String>>>,
    pub total: usize,
}

fn cell(c: &Column, i: usize) -> Option<String> {
    match c.get(i) {
        Ok(AnyValue::Null) => None,
        Ok(AnyValue::String(s)) => Some(s.to_string()),
        Ok(AnyValue::StringOwned(s)) => Some(s.to_string()),
        Ok(other) => Some(other.to_string()),
        Err(_) => None,
    }
}

/// A `[offset, offset+limit)` window of rows, cells stringified. `total` is the
/// full row count so the client can show "N of M".
pub fn page(df: &DataFrame, offset: usize, limit: usize) -> Page {
    let total = df.height();
    let cols = df.columns();
    let columns: Vec<String> = cols.iter().map(|c| c.name().to_string()).collect();
    let end = offset.saturating_add(limit).min(total);
    let start = offset.min(total);
    let mut rows = Vec::with_capacity(end.saturating_sub(start));
    for i in start..end {
        rows.push(cols.iter().map(|c| cell(c, i)).collect());
    }
    Page { columns, rows, total }
}

impl Page {
    /// The wire shape `{ columns, rows, total }` — the ONE page JSON both the
    /// server POST/GET /page handlers and the wasm `Workbook` return, so a
    /// client-rendered page is byte-identical to a server-rendered one.
    pub fn to_json(&self) -> serde_json::Value {
        serde_json::json!({
            "columns": self.columns,
            "rows": self.rows,
            "total": self.total,
        })
    }
}

/// A page that also carries each row's STABLE index in the current frame. The caller stamps an `idx_col`
/// (a `with_row_index` column) on the frame BEFORE any ephemeral filter/sort; `page_indexed` then splits it
/// out into `indices` and excludes it from `columns`/`rows`. That lets a UI map a displayed row back to its
/// real position in the frame — so cell-edit / row-delete hit the right row even after a sort or search.
pub struct PageIndexed {
    pub columns: Vec<String>,
    pub rows: Vec<Vec<Option<String>>>,
    pub total: usize,
    pub indices: Vec<u32>,
}

pub fn page_indexed(df: &DataFrame, idx_col: &str, offset: usize, limit: usize) -> PageIndexed {
    let total = df.height();
    let all = df.columns();
    let data: Vec<&Column> = all.iter().filter(|c| c.name().as_str() != idx_col).collect();
    let idx = df.column(idx_col).ok();
    let columns: Vec<String> = data.iter().map(|c| c.name().to_string()).collect();
    let end = offset.saturating_add(limit).min(total);
    let start = offset.min(total);
    let mut rows = Vec::with_capacity(end.saturating_sub(start));
    let mut indices = Vec::with_capacity(end.saturating_sub(start));
    for i in start..end {
        rows.push(data.iter().copied().map(|c| cell(c, i)).collect());
        let ix = idx
            .and_then(|c| c.get(i).ok())
            .and_then(|v| v.extract::<u64>())
            .unwrap_or(0);
        indices.push(ix as u32);
    }
    PageIndexed { columns, rows, total, indices }
}

impl PageIndexed {
    /// `{ columns, rows, total, indices }` — `page`'s shape plus the per-row stable frame index.
    pub fn to_json(&self) -> serde_json::Value {
        serde_json::json!({
            "columns": self.columns,
            "rows": self.rows,
            "total": self.total,
            "indices": self.indices,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn windows_and_clamps() {
        let df = crate::parse::from_text("id,name\n1,A\n2,B\n3,C\n4,D\n").unwrap();
        let p = page(&df, 1, 2);
        assert_eq!(p.total, 4);
        assert_eq!(p.columns, vec!["id", "name"]);
        assert_eq!(p.rows.len(), 2);
        assert_eq!(p.rows[0][1], Some("B".into()));
        // offset past the end → empty, total still reported.
        let p2 = page(&df, 99, 10);
        assert!(p2.rows.is_empty());
        assert_eq!(p2.total, 4);
    }
}
