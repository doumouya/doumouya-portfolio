import { el, ensureStyles, type Child } from "../el";

/* Datacore KindLabel — the column-type annotation from the datatable header
   (Int / Float / Bool / Text). The source renders it as small muted text
   beside the column name; we keep that as the default and add a subtle chip
   variant with a faint per-kind tint for denser layouts. */
const CSS = `
.dc-kind{ --k: var(--text-muted); font-family:var(--font-mono); font-size:var(--text-2xs); font-weight:var(--weight-regular); line-height:1; color:var(--k); white-space:nowrap; }
.dc-kind--text-only{ color:var(--text-subtle); }
.dc-kind--chip{
  display:inline-flex; align-items:center; gap:.28rem; height:1.25rem; padding:0 .4rem;
  border:var(--border-width) solid color-mix(in srgb, var(--k) 28%, transparent);
  border-radius:var(--radius-xs);
  background:color-mix(in srgb, var(--k) 10%, var(--surface)); color:var(--k);
}
.dc-kind__tick{ width:.34rem; height:.34rem; border-radius:1px; background:var(--k); flex:none; }
.dc-kind--int{   --k:#0e7490; } /* cyan-700  — integer */
.dc-kind--float{ --k:#7c3aed; } /* violet-600 — float   */
.dc-kind--bool{  --k:var(--amber-700); }
.dc-kind--text{  --k:var(--text-muted); }
`;

export type KindLabelKind = "Int" | "Float" | "Bool" | "Text";
export type KindLabelVariant = "text" | "chip";

const KEY: Record<KindLabelKind, string> = { Int: "int", Float: "float", Bool: "bool", Text: "text" };

export interface KindLabelOptions {
  kind?: KindLabelKind;
  variant?: KindLabelVariant;
  /** Extra class names appended to the component's own. */
  class?: string;
  /** Any extra attributes (e.g. `title`, `aria-*`). */
  attrs?: Record<string, string>;
}

/** A column-type annotation; pass `kind`/`variant` and extras via `opts`. */
export function kindLabel(opts: KindLabelOptions = {}): HTMLSpanElement {
  ensureStyles("kindlabel", CSS);
  const { kind = "Text", variant = "text" } = opts;
  const k = KEY[kind];

  let node: HTMLSpanElement;
  if (variant === "chip") {
    const classes = ["dc-kind", "dc-kind--chip", `dc-kind--${k}`, opts.class].filter(Boolean).join(" ");
    node = el(
      "span",
      { class: classes },
      el("span", { class: "dc-kind__tick", "aria-hidden": "true" }),
      kind as Child,
    );
  } else {
    const classes = ["dc-kind", "dc-kind--text-only", opts.class].filter(Boolean).join(" ");
    node = el("span", { class: classes }, kind as Child);
  }

  if (opts.attrs) for (const [k2, v] of Object.entries(opts.attrs)) node.setAttribute(k2, v);
  return node;
}
