//! Purpose: the wasm-bindgen boundary — thin JSON-string in/out wrappers over
//! the SAME engine functions, so the wasm binary's content == the engine's
//! content (no Polars types cross the boundary).
//!
//! Client-side cleaning lives here too: the resident Workbook holds the
//! immutable parsed `base` plus the current `df` (= base + applied steps).
//! `set_steps` re-derives `df` from `base` (Polars clone is Arc-shared, so this
//! is cheap until a step actually mutates a column), which gives the UI a
//! non-destructive undo/redo + staged-preview model with no server.

#![cfg(target_arch = "wasm32")]

use polars::prelude::*;
use shared::query::QuerySpec;
use shared::Step;
use wasm_bindgen::prelude::*;

/// Install the panic hook once at module init so a Rust panic surfaces in the
/// browser console with file+line+payload instead of a bare `unreachable`.
#[wasm_bindgen(start)]
pub fn start() {
    console_error_panic_hook::set_once();
}

/// Transient name for the row-index column `view` stamps on the current frame before any ephemeral
/// filter/sort. It is split back out by `page_indexed` and never reaches the wire — chosen to be
/// unlikely to collide with a real CSV column.
const ROW_IDX: &str = "__cw_row_idx";

/// The quality report over a frame — `summarize` → `cleanness_report` +
/// sentinels. Shared by `parse_score` (which adds encoding + rescue) and
/// `Workbook::score`, so the payload is the SAME object on both paths.
fn score_json(df: &DataFrame) -> Result<serde_json::Value, JsError> {
    let cols = crate::dtype::summarize(df).map_err(|e| JsError::new(&e.to_string()))?;
    let report = crate::stats::cleanness_report(df, &cols, &[]);
    let sentinels = crate::stats::find_sentinels(df, &[]);
    Ok(serde_json::json!({
        "rows": df.height(),
        "cols": df.width(),
        "score": report.map(|r| r.score),
        "report": report.map(|r| serde_json::json!({
            "completeness": r.completeness,
            "type_consistency": r.type_consistency,
            "value_hygiene": r.value_hygiene,
            "row_uniqueness": r.row_uniqueness,
            "structural": r.structural,
        })),
        "columns": cols,
        "sentinels": sentinels,
    }))
}

/// Parse + score a CSV given as raw bytes, in the browser — the SAME engine the
/// server's upload path runs, so the client-side quality report is byte-identical.
/// `bytes never leave the device` is a real property here.
#[wasm_bindgen]
pub fn parse_score(bytes: &[u8], tld: Option<String>) -> Result<String, JsError> {
    let (df, diag, enc) = crate::parse::from_csv_bytes(bytes, tld.as_deref())
        .map_err(|e| JsError::new(&e.to_string()))?;
    let mut out = score_json(&df)?;
    if let Some(obj) = out.as_object_mut() {
        obj.insert("encoding".into(), serde_json::json!(enc));
        obj.insert("rescue".into(), serde_json::json!(format!("{diag:?}")));
    }
    Ok(out.to_string())
}

/// The resident client-side data engine: the immutable parsed `base` plus the
/// current `df` (= base with the applied cleaning steps replayed). Cleaning is
/// non-destructive — `set_steps` rebuilds `df` from `base`, so undo/redo is just
/// "replay a shorter list" and a staged preview is "replay applied + pending".
#[wasm_bindgen]
pub struct Workbook {
    base: DataFrame,
    df: DataFrame,
}

#[wasm_bindgen]
impl Workbook {
    /// Parse raw CSV bytes into a resident workbook (decode + sniff + read).
    /// `tld` is the encoding hint (e.g. "fr") for the locale-aware decode.
    #[wasm_bindgen(js_name = from_csv)]
    pub fn from_csv(bytes: &[u8], tld: Option<String>) -> Result<Workbook, JsError> {
        let (base, _diag, _enc) = crate::parse::from_csv_bytes(bytes, tld.as_deref())
            .map_err(|e| JsError::new(&e.to_string()))?;
        let df = base.clone();
        Ok(Workbook { base, df })
    }

    /// Re-derive the current frame from the immutable base by replaying `steps`
    /// (a JSON array of `{ kind, params }`). This IS the non-destructive model:
    /// apply = longer list, undo = shorter list, preview = applied + pending.
    #[wasm_bindgen(js_name = set_steps)]
    pub fn set_steps(&mut self, steps_json: &str) -> Result<(), JsError> {
        let steps: Vec<Step> =
            serde_json::from_str(steps_json).map_err(|e| JsError::new(&e.to_string()))?;
        self.df = crate::steps::replay(self.base.clone(), &steps)
            .map_err(|e| JsError::new(&e.to_string()))?;
        Ok(())
    }

    /// Per-column metadata of the CURRENT frame (name, storage + semantic dtype,
    /// null%/unique%, a sample) as a JSON array — the table headers and the tools
    /// panel read this.
    #[wasm_bindgen(js_name = columns_meta)]
    pub fn columns_meta(&self) -> Result<String, JsError> {
        let cols = crate::dtype::summarize(&self.df).map_err(|e| JsError::new(&e.to_string()))?;
        serde_json::to_string(&cols).map_err(|e| JsError::new(&e.to_string()))
    }

    /// A `[offset, offset+limit)` window of the current frame as the canonical
    /// page JSON `{ columns, rows, total }`.
    pub fn page(&self, offset: usize, limit: usize) -> Result<String, JsError> {
        let p = crate::view::page(&self.df, offset, limit);
        Ok(p.to_json().to_string())
    }

    /// The composable window over the current frame. `query_json` is the
    /// canonical `QuerySpec` `{ filter?, search?, sort? }` (null/`{}` = whole
    /// frame). Applies **(filter AND search) → sort → page**, and returns each
    /// row's STABLE index in the current frame (`indices`) alongside the cells —
    /// so a cell-edit / row-delete maps back to the right `df` row even after a
    /// sort or search reorders/hides rows.
    pub fn view(
        &self,
        query_json: Option<String>,
        offset: usize,
        limit: usize,
    ) -> Result<String, JsError> {
        let q: QuerySpec = match query_json.as_deref() {
            Some(j) => serde_json::from_str(j).map_err(|e| JsError::new(&e.to_string()))?,
            None => QuerySpec::default(),
        };
        // Stamp a stable row index over the CURRENT frame BEFORE any ephemeral filter/sort, so the
        // page can report each surviving row's position in `df` (what set_cell/drop_rows address).
        let indexed = self
            .df
            .clone()
            .lazy()
            .with_row_index(ROW_IDX, None)
            .collect()
            .map_err(|e| JsError::new(&e.to_string()))?;
        let filtered: Option<DataFrame> =
            match crate::search::effective_filter(&self.df, q.filter.as_ref(), q.search.as_deref()) {
                Some(f) => Some(
                    crate::filter::apply_filter(&indexed, &f)
                        .map_err(|e| JsError::new(&e.to_string()))?,
                ),
                None => None,
            };
        let base: &DataFrame = filtered.as_ref().unwrap_or(&indexed);
        let sorted: Option<DataFrame> = if q.sort.is_empty() {
            None
        } else {
            Some(crate::sort::apply_sort(base, &q.sort).map_err(|e| JsError::new(&e.to_string()))?)
        };
        let out: &DataFrame = sorted.as_ref().unwrap_or(base);
        let p = crate::view::page_indexed(out, ROW_IDX, offset, limit);
        Ok(p.to_json().to_string())
    }

    /// The cleanness report over the current frame (same payload as `parse_score`
    /// minus the parse-time encoding/rescue diag). The heavy op — run off-thread.
    pub fn score(&self) -> Result<String, JsError> {
        Ok(score_json(&self.df)?.to_string())
    }

    /// Read-only SQL over the current frame, exposed as table `t`. Returns the
    /// first page of the result; capped at `ROW_CAP` (add a LIMIT to narrow).
    pub fn sql(&self, query: &str) -> Result<String, JsError> {
        let frame = crate::sql::run_sql(vec![("t".to_string(), self.df.clone())], query)
            .map_err(|e| JsError::new(&e.to_string()))?;
        let p = crate::view::page(&frame, 0, 500);
        Ok(p.to_json().to_string())
    }

    /// Export the current frame as CSV text (for download). Pure compute — writes
    /// to an in-memory buffer; nothing leaves the device until the user saves.
    #[wasm_bindgen(js_name = to_csv)]
    pub fn to_csv(&self) -> Result<String, JsError> {
        let mut buf: Vec<u8> = Vec::new();
        let mut df = self.df.clone();
        CsvWriter::new(&mut buf)
            .finish(&mut df)
            .map_err(|e| JsError::new(&e.to_string()))?;
        String::from_utf8(buf).map_err(|e| JsError::new(&e.to_string()))
    }

    /// Row count of the current frame.
    pub fn rows(&self) -> usize {
        self.df.height()
    }

    /// Column count of the current frame.
    pub fn cols(&self) -> usize {
        self.df.width()
    }
}
