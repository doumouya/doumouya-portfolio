/* engine.ts — the data-plane client. One csv-workbench worker (Polars→wasm) PER
   OPEN FILE: `worker.js` is the UNMODIFIED csv-workbench engine worker, which
   holds one resident Workbook — multi-file is therefore multiple workers, not a
   protocol fork. An LRU pool caps live engines (wasm heaps are heavy); evicting
   terminates the worker, and reopening re-parses from the file's bytes.

   Protocol (worker.js): { id, op, payload } in → { id, ok, result | error } out.
   `view`/`columns_meta`/`score`/`sql` return the engine's JSON STRING verbatim —
   this client parses them into typed shapes. */

// ---------- wire shapes (mirror crates/shared + the engine's JSON) ----------
export interface ColumnMeta {
  name: string;
  dtype: string;
  semantic_dtype: string;
  null_pct: number | null;
  unique_pct: number | null;
  sample: string | null;
}
export interface Step {
  kind: string;
  params: Record<string, unknown>;
}
export interface Page {
  columns: string[];
  rows: (string | null)[][];
  total: number;
  indices: number[]; // each row's STABLE index in the current frame (pre filter/sort)
}
export interface EngineDims {
  rows: number;
  cols: number;
}
/** One column's sort direction (shared::sort::SortKey — first key is primary). */
export interface SortKey {
  col: string;
  descending: boolean;
}
/** The view-window query — filter is a FilterNode tree (amenan-ui's algebra is
    shape-identical to the engine's shared::filter::FilterNode); `sort` is a
    Vec<SortKey> on the wire (multi-column; empty = no sort). */
export interface QuerySpec {
  filter?: unknown;
  search?: string;
  sort?: SortKey[];
}
/** The wasm score() envelope: dims + the headline + the sub-score breakdown. */
export interface ScoreReport {
  rows: number;
  cols: number;
  score: number | null;
  report: {
    completeness?: number;
    type_consistency?: number;
    value_hygiene?: number;
    row_uniqueness?: number;
    /** a multiplier gate (×N.NN), not a 0–100 score */
    structural?: number;
  } | null;
}

export const step = (kind: string, params: Record<string, unknown> = {}): Step => ({ kind, params });

// ---------- one worker = one file ----------
export class FileEngine {
  private worker: Worker;
  private seq = 0;
  private inflight = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private dead = false;

  constructor(workerUrl = "engine/worker.js") {
    this.worker = new Worker(workerUrl);
    this.worker.onmessage = (e: MessageEvent) => {
      const { id, ok, result, error } = e.data as { id: number; ok: boolean; result?: unknown; error?: string };
      const p = this.inflight.get(id);
      if (!p) return;
      this.inflight.delete(id);
      if (ok) p.resolve(result);
      else p.reject(new Error(error || "engine error"));
    };
  }

  private call<T = unknown>(op: string, payload?: unknown): Promise<T> {
    if (this.dead) return Promise.reject(new Error("engine destroyed"));
    return new Promise<T>((resolve, reject) => {
      const id = ++this.seq;
      this.inflight.set(id, { resolve: resolve as (v: unknown) => void, reject });
      this.worker.postMessage({ id, op, payload });
    });
  }

  /** Parse CSV bytes into the resident Workbook. `tld` is the encoding hint ("fr"). */
  load(bytes: ArrayBuffer, tld?: string): Promise<EngineDims> {
    return this.call<EngineDims>("load", { bytes, tld });
  }
  /** Re-derive the current frame: replay `steps` from the immutable base. */
  async setSteps(steps: Step[]): Promise<EngineDims> {
    return this.call<EngineDims>("set_steps", { steps: JSON.stringify(steps) });
  }
  /** A window of the current frame. */
  async view(query: QuerySpec | null, offset: number, limit: number): Promise<Page> {
    const live = query && (query.filter || query.search || (query.sort && query.sort.length));
    const q = live ? JSON.stringify(query) : undefined;
    return JSON.parse(await this.call<string>("view", { query: q, offset, limit })) as Page;
  }
  async columnsMeta(): Promise<ColumnMeta[]> {
    return JSON.parse(await this.call<string>("columns_meta")) as ColumnMeta[];
  }
  /** The cleanness report over the current frame (the slow one — off-thread). */
  async score(): Promise<ScoreReport> {
    return JSON.parse(await this.call<string>("score")) as ScoreReport;
  }
  /** Read-only SQL over the current frame (table `t`), capped at 500 rows. */
  async sql(query: string): Promise<Page> {
    return JSON.parse(await this.call<string>("sql", { query })) as Page;
  }
  toCsv(): Promise<string> {
    return this.call<string>("to_csv");
  }

  destroy(): void {
    this.dead = true;
    for (const { reject } of this.inflight.values()) reject(new Error("engine destroyed"));
    this.inflight.clear();
    this.worker.terminate();
  }
}

// ---------- the LRU pool (cap live wasm heaps) ----------
const MAX_LIVE = 3;

interface PoolEntry {
  engine: FileEngine;
  /** the BASE frame's dims (before steps) — cols===1 flags the wrapped shape */
  raw: EngineDims;
}

export interface OpenedEngine {
  engine: FileEngine;
  raw: EngineDims;
  /** true when this open PARSED the file (vs a warm pool hit) */
  fresh: boolean;
}

/** Live engines keyed by file id, LRU-evicted at MAX_LIVE. `bytesOf` re-supplies
    a file's bytes on (re)open — eviction is safe because the base is re-parseable
    and the steps replay from the store. */
export class EnginePool {
  private live = new Map<string, PoolEntry>(); // insertion order = LRU order
  constructor(
    private bytesOf: (fileId: string) => Promise<ArrayBuffer>,
    private onEvict?: (fileId: string) => void,
  ) {}

  /** The engine for a file — reused when warm, else parsed fresh (steps replayed). */
  async open(fileId: string, tld?: string, steps?: Step[]): Promise<OpenedEngine> {
    const hit = this.live.get(fileId);
    if (hit) {
      // refresh recency
      this.live.delete(fileId);
      this.live.set(fileId, hit);
      return { engine: hit.engine, raw: hit.raw, fresh: false };
    }
    while (this.live.size >= MAX_LIVE) {
      const [oldId, old] = this.live.entries().next().value as [string, PoolEntry];
      this.live.delete(oldId);
      old.engine.destroy();
      this.onEvict?.(oldId);
    }
    const engine = new FileEngine();
    const bytes = await this.bytesOf(fileId);
    const raw = await engine.load(bytes, tld);
    if (steps && steps.length) await engine.setSteps(steps);
    this.live.set(fileId, { engine, raw });
    return { engine, raw, fresh: true };
  }

  peek(fileId: string): FileEngine | null {
    return this.live.get(fileId)?.engine ?? null;
  }

  close(fileId: string): void {
    const e = this.live.get(fileId);
    if (!e) return;
    this.live.delete(fileId);
    e.engine.destroy();
  }

  destroyAll(): void {
    for (const { engine } of this.live.values()) engine.destroy();
    this.live.clear();
  }
}
