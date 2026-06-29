import { el, ensureStyles, type Child } from "../el";

/* CSS lifted verbatim from the Datacore design system — the datatable's calm
   drop-zone / zero-data panel: centered, muted, optional large glyph, lead +
   supporting line + action; also doubles as a dashed drop target. */
const CSS = `
.dc-empty{
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:var(--space-3); text-align:center; color:var(--text-muted);
  padding:var(--space-12) var(--space-6); min-height:16rem;
}
.dc-empty--dropzone{
  border:2px dashed var(--border-strong); border-radius:var(--radius-lg);
  background:var(--surface-subtle); transition:var(--transition-control);
}
.dc-empty--dropzone.is-over{ border-color:var(--accent); background:var(--accent-tint); }
.dc-empty__glyph{ font-size:1.9rem; line-height:1; color:var(--text-subtle); }
.dc-empty__lead{ font-size:var(--text-xl); color:var(--text); margin:0; font-weight:var(--weight-medium); }
.dc-empty__desc{ font-size:var(--text-sm); color:var(--text-muted); margin:0; max-width:28rem; }
.dc-empty__action{ margin-top:var(--space-2); }
`;

export interface EmptyStateOptions {
  /** Large muted glyph above the lead line (aria-hidden). */
  glyph?: Child;
  /** The lead / headline line. */
  lead?: Child;
  /** Supporting description line. */
  description?: Child;
  /** An action node (e.g. a button) rendered below. */
  action?: Child;
  /** Render as a dashed drop target. */
  dropzone?: boolean;
  /** Active drag-over highlight (only meaningful with `dropzone`). */
  over?: boolean;
  /** Extra children placed between the description and the action. */
  children?: Child[];
  /** Extra class names appended to the component's own. */
  class?: string;
  /** Any extra attributes (e.g. `aria-*`, `data-*`). */
  attrs?: Record<string, string>;
}

/** A calm zero-data / drop-zone panel; configure glyph/lead/action via `opts`. */
export function emptyState(opts: EmptyStateOptions = {}): HTMLDivElement {
  ensureStyles("emptystate", CSS);
  const { glyph, lead, description, action, dropzone, over, children } = opts;
  const classes = [
    "dc-empty",
    dropzone && "dc-empty--dropzone",
    dropzone && over && "is-over",
    opts.class,
  ]
    .filter(Boolean)
    .join(" ");

  const node = el(
    "div",
    { class: classes },
    glyph !== null && glyph !== undefined && glyph !== false
      ? el("div", { class: "dc-empty__glyph", "aria-hidden": "true" }, glyph)
      : null,
    lead !== null && lead !== undefined && lead !== false
      ? el("p", { class: "dc-empty__lead" }, lead)
      : null,
    description !== null && description !== undefined && description !== false
      ? el("p", { class: "dc-empty__desc" }, description)
      : null,
    ...(children ?? []),
    action !== null && action !== undefined && action !== false
      ? el("div", { class: "dc-empty__action" }, action)
      : null,
  );
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  return node;
}
