//! W0 gate for the `cleaner` demo — the REAL dossier.csv (101k quote-wrapped
//! rows, Windows-1252, 17 columns once unwrapped) must survive the
//! load → unwrap_csv path end-to-end with zero row loss.
//!
//! Env-gated so the default `cargo test` stays hermetic:
//!   DOSSIER_CSV=/path/to/dossier.csv cargo test -p data --test dossier_smoke
//! Skips with a note when the variable is unset.

use data::parse::{from_csv_bytes, RescueDiag};

#[test]
fn dossier_survives_load_and_unwrap() {
    let Ok(path) = std::env::var("DOSSIER_CSV") else {
        eprintln!("dossier_smoke: SKIPPED (set DOSSIER_CSV=/path/to/dossier.csv to run)");
        return;
    };
    let bytes = std::fs::read(&path).expect("read DOSSIER_CSV");

    // ── 1 · the load: wrapped shape detected, EVERY row preserved, encoding right ──
    let (df, diag, enc) = from_csv_bytes(&bytes, Some("fr")).expect("the loader must not refuse");
    assert!(
        matches!(diag, RescueDiag::WrapDetected { .. }),
        "expected WrapDetected (the safe line-literal path), got {diag:?}"
    );
    assert_eq!(df.width(), 1, "the wrapped load must be the 1-column line-literal frame");
    assert!(
        df.height() >= 101_000,
        "rows silently lost in the load: {} (the zero-row gap?)",
        df.height()
    );
    assert_eq!(enc, "windows-1252", "encoding sniff drifted: {enc}");

    // The Windows-1252 é must decode (not U+FFFD): "Panne mécanique" is in the data.
    let name = df.get_column_names()[0].to_string();
    let lines = df.column(&name).unwrap().str().unwrap();
    let sample: String = lines.iter().take(50).flatten().collect();
    assert!(
        sample.contains("mécanique"),
        "windows-1252 decode lost the accents (sample: {})",
        &sample[..sample.len().min(200)]
    );

    // ── 2 · the rescue: unwrap_csv peels the wrapper into the real table ──
    let out =
        data::steps::apply(df, "unwrap_csv", &serde_json::Value::Null).expect("unwrap_csv");
    assert_eq!(out.width(), 17, "expected 17 columns after unwrap, got {}", out.width());
    assert!(out.height() >= 101_000, "rows lost in unwrap: {}", out.height());
}
