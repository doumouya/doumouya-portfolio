/* Ambient types for the wasm reach resolver. wasm-pack's no-modules build exposes a global
   `wasm_bindgen` initializer plus a `WasmGraph` class under the same name; `WASM_B64` is the base64
   wasm the build inlines. This file types that boundary so the UI calls the Rust engine type-safely.
   (The build runs wasm-pack with `--no-typescript`, so crates/wasm/src/lib.rs is the source of truth.) */

declare global {
  /** Initialize the wasm module from the embedded bytes, then read `wasm_bindgen.WasmGraph`.
      The no-modules glue takes a single options object; positional bytes are deprecated. */
  function wasm_bindgen(input?: { module_or_path: ArrayBufferView }): Promise<unknown>;

  namespace wasm_bindgen {
    class WasmGraph {
      /** Build from aligned `ids` and `parents` (an empty string = a root node). */
      constructor(ids: string[], parents: string[]);
      /** The node ids reachable from `seed` (the nodes an actor is a member of), descending the tree. */
      reachable(seed: string[]): string[];
    }
  }

  const WASM_B64: string;
}

export {};
