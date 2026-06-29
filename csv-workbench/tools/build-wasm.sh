#!/bin/bash
# Build the data crate's browser engine: cargo (wasm32 release) -> wasm-bindgen
# (--target no-modules, a global `wasm_bindgen` the classic Worker can use) ->
# wasm-opt -Oz. Output: web/wasm/{data.js, data_bg.wasm}.
set -euo pipefail
. "$HOME/.cargo/env" 2>/dev/null || true
cd "$(dirname "$0")/.."

OUT=web/wasm
TARGET=target/wasm32-unknown-unknown/release/data.wasm

echo "== 1/3 cargo build (wasm32 release) =="
RUSTFLAGS='--cfg getrandom_backend="wasm_js"' \
  cargo build --release --target wasm32-unknown-unknown -p data

echo "== 2/3 wasm-bindgen (no-modules) =="
rm -rf "$OUT"; mkdir -p "$OUT"
wasm-bindgen --target no-modules --no-typescript --out-dir "$OUT" --out-name data "$TARGET"

echo "== 3/3 wasm-opt -Oz =="
wasm-opt -Oz --strip-debug --enable-bulk-memory --enable-nontrapping-float-to-int \
  -o "$OUT/data_bg.opt.wasm" "$OUT/data_bg.wasm"
mv "$OUT/data_bg.opt.wasm" "$OUT/data_bg.wasm"

RAW=$(stat -c%s "$OUT/data_bg.wasm"); GZ=$(gzip -c "$OUT/data_bg.wasm" | wc -c)
echo "engine: data_bg.wasm  raw $((RAW/1024)) KiB · gz $((GZ/1024)) KiB"
