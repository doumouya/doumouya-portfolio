/* session.ts — per-file UI + pipeline state (one FileSession per open file tab).
   csv-workbench's module-level state, objectified so W2's file tabs can hold
   many and switch by update()ing mounted handles instead of remounting. The
   step pipeline (applied/redo) IS the undo model: undo = replay a shorter list. */
import type { ColumnMeta, Step, SortKey, QuerySpec, ScoreReport } from "./engine.ts";

export type RowMode = "" | "edit" | "select" | "delete";

export interface FileSession {
  /** the committed cleaning pipeline (replayed from the immutable base) */
  applied: Step[];
  /** undone step GROUPS, newest-first (each group = one undo's payload) */
  redo: Step[][];

  // the view window
  filter: unknown | null; // FilterNode from the panel (shape-identical to the engine's)
  search: string;
  sort: SortKey | null; // single-key UI over the engine's Vec<SortKey>
  offset: number;
  pageLimit: number;

  // table chrome
  hiddenCols: Set<string>;
  selectedRows: Set<string>; // rowKeys = stable frame indices (as strings)
  mode: RowMode;
  rowNumbers: boolean;

  // derived from the engine after each replay
  cols: ColumnMeta[];
  totalRows: number;
  score: ScoreReport | null;
}

export function newSession(): FileSession {
  return {
    applied: [],
    redo: [],
    filter: null,
    search: "",
    sort: null,
    offset: 0,
    pageLimit: 100,
    hiddenCols: new Set(),
    selectedRows: new Set(),
    mode: "",
    rowNumbers: false,
    cols: [],
    totalRows: 0,
    score: null,
  };
}

/** The engine window query for the session's current filter/search/sort. */
export function querySpec(s: FileSession): QuerySpec | null {
  const q: QuerySpec = {};
  if (s.filter) q.filter = s.filter;
  if (s.search) q.search = s.search;
  if (s.sort) q.sort = [s.sort];
  return q.filter || q.search || q.sort ? q : null;
}

/** Prune state that no longer resolves after a frame re-derive. */
export function pruneToColumns(s: FileSession): void {
  const names = new Set(s.cols.map((c) => c.name));
  for (const h of [...s.hiddenCols]) if (!names.has(h)) s.hiddenCols.delete(h);
  if (s.sort && !names.has(s.sort.col)) s.sort = null;
  if (s.offset >= s.totalRows) s.offset = 0;
  s.selectedRows.clear(); // frame indices are stale after any replay
}
