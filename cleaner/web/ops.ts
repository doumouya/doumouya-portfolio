/* ops.ts — the cleaning catalog. Each op's `id` IS the engine's step kind; each
   op is BOTH an amenan-ui column-manager `CleanOp` (id/label/icon/scope/min/max/
   fields — what the component renders) AND the owner of `build` (what the
   component deliberately does NOT know: how selected columns + sheet values
   become engine steps). Ported from csv-workbench's catalog; icons added for the
   tools-panel grid (the SpreadSheet Paper mockup's icon-first palette). */
import type { CleanOp, CleanField } from "amenan-ui";
import type { Step } from "./engine.ts";
import { step } from "./engine.ts";

export interface OpDef extends CleanOp {
  id: string;
  label: string;
  icon: string;
  scope: "global" | "column";
  fields: CleanField[];
  /** Selected columns + collected sheet values → engine steps. */
  build: (sel: string[], v: Record<string, unknown>) => Step[];
  /** Ask before staging (destructive / type-changing ops). */
  confirm?: (sel: string[], v: Record<string, unknown>) => { title: string; message: string; danger?: boolean } | null;
}

const s = (v: unknown, d = ""): string => (v == null ? d : String(v));

export const OPS: OpDef[] = [
  // ── global (whole-file) ──
  { id: "unwrap_csv", label: "Unwrap embedded CSV", icon: "bi-box-arrow-down", scope: "global", fields: [],
    build: () => [step("unwrap_csv")] },
  { id: "snake_case_columns", label: "snake_case headers", icon: "bi-type-underline", scope: "global", fields: [],
    build: () => [step("snake_case_columns")] },
  { id: "replace_in_names", label: "Replace in names…", icon: "bi-input-cursor-text", scope: "global",
    fields: [
      { key: "find", type: "text", label: "Find" },
      { key: "replace", type: "text", label: "Replace with", placeholder: "(blank to remove)" },
    ],
    build: (_sel, v) => [step("replace_in_names", { find: s(v.find), replace: s(v.replace) })] },
  { id: "change_case", label: "Change case…", icon: "bi-fonts", scope: "global",
    fields: [{ key: "mode", type: "enum", label: "Case", options: [["lower", "lowercase"], ["upper", "UPPERCASE"]], default: "lower" }],
    build: (_sel, v) => [step("change_case", { mode: s(v.mode, "lower") })] },

  // ── column-scoped ──
  { id: "drop_columns", label: "Delete selected", icon: "bi-trash", scope: "column", min: 1, fields: [],
    build: (sel) => [step("drop_columns", { cols: sel })],
    confirm: (sel) => ({ title: "Delete columns?", message: `Remove ${sel.join(", ")} from the frame.`, danger: true }) },
  { id: "filter_columns", label: "Keep only selected", icon: "bi-funnel", scope: "column", min: 1, fields: [],
    build: (sel) => [step("filter_columns", { cols: sel })] },
  { id: "drop_nulls", label: "Drop rows with empty", icon: "bi-eraser", scope: "column", min: 1, fields: [],
    build: (sel) => [step("drop_nulls", { cols: sel })] },
  { id: "fill_nulls", label: "Fill empties…", icon: "bi-droplet", scope: "column", min: 1,
    fields: [
      { key: "strategy", type: "enum", label: "With", options: [["fixed", "a value"], ["forward", "previous value"], ["zero", "zero"]], default: "fixed" },
      { key: "value", type: "text", label: "Value", placeholder: 'when "a value"' },
    ],
    build: (sel, v) => sel.map((c) => step("fill_nulls", { column: c, strategy: s(v.strategy, "fixed"), value: s(v.value) })) },
  { id: "replace_text", label: "Find & replace…", icon: "bi-search", scope: "column", min: 1, max: 1,
    fields: [
      { key: "find", type: "text", label: "Find" },
      { key: "replace", type: "text", label: "Replace with", placeholder: "(blank to remove)" },
      { key: "is_regex", type: "bool", label: "Regular expression", default: false },
    ],
    build: (sel, v) => [step("replace_text", { column: sel[0], find: s(v.find), replace: s(v.replace), is_regex: !!v.is_regex })] },
  { id: "cast", label: "Change type…", icon: "bi-shuffle", scope: "column", min: 1, max: 1,
    fields: [{ key: "dtype", type: "enum", label: "To type", options: [["str", "Text"], ["int", "Integer"], ["float", "Decimal"], ["bool", "Boolean"], ["date", "Date"]], default: "str" }],
    build: (sel, v) => [step("cast", { column: sel[0], dtype: s(v.dtype, "str") })],
    confirm: (sel, v) => ({
      title: `Cast ${sel[0]} → ${s(v.dtype, "str")}?`,
      message: "Values that don't fit the new type become blank (the step is undoable).",
    }) },
  { id: "rename_column", label: "Rename…", icon: "bi-pencil", scope: "column", min: 1, max: 1,
    fields: [{ key: "to", type: "text", label: "New name" }],
    build: (sel, v) => [step("rename_column", { from: sel[0], to: s(v.to) })] },
  { id: "split_column", label: "Split…", icon: "bi-scissors", scope: "column", min: 1, max: 1,
    fields: [
      { key: "sep", type: "text", label: "Separator", default: "," },
      { key: "keep_original", type: "bool", label: "Keep original column", default: false },
    ],
    build: (sel, v) => [step("split_column", { column: sel[0], sep: s(v.sep, ","), keep_original: !!v.keep_original })] },
  { id: "join_columns", label: "Combine…", icon: "bi-link-45deg", scope: "column", min: 2, max: 2,
    fields: [
      { key: "sep", type: "text", label: "Separator", default: " " },
      { key: "new_name", type: "text", label: "New column name" },
    ],
    build: (sel, v) => [step("join_columns", { col1: sel[0], col2: sel[1], sep: s(v.sep, " "), new_name: s(v.new_name) || `${sel[0]}_${sel[1]}` })] },
  { id: "format_dates", label: "Format dates…", icon: "bi-calendar3", scope: "column", min: 1, max: 1,
    fields: [
      { key: "fmt", type: "text", label: "Format", default: "%Y-%m-%d", placeholder: "%Y-%m-%d" },
      { key: "on_incomplete", type: "enum", label: "If unparseable", options: [["null", "blank it"], ["drop", "drop the row"], ["keep", "keep as-is"]], default: "null" },
    ],
    build: (sel, v) => [step("format_dates", { column: sel[0], fmt: s(v.fmt) || "%Y-%m-%d", on_incomplete: s(v.on_incomplete, "null") })] },
  { id: "fix_invalid", label: "Fix invalid…", icon: "bi-bandaid", scope: "column", min: 1,
    fields: [{ key: "sentinels", type: "sentinels", label: "Treat as invalid", placeholder: "N/A, -, ??? …" }],
    build: (sel, v) => [step("fix_invalid", { columns: sel, sentinels: s(v.sentinels).split(",").map((x) => x.trim()).filter(Boolean) })] },
];

export const opById = (id: string): OpDef | undefined => OPS.find((o) => o.id === id);
