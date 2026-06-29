import { el, append, ensureStyles, type Child } from "../el";

/* Datacore Toolbar — the source header bar: a sticky, hairline-bottomed row
   with a left group, a flexible spacer, and a right group. Used for the app
   header, table toolbars (row counts + actions), and dialog footers. */

const CSS = `
.dc-toolbar{
  display:flex; align-items:center; gap:var(--space-3);
  padding:var(--pad-section-y) var(--pad-section-x);
  background:var(--surface); color:var(--text);
}
.dc-toolbar--bordered{ border-bottom:var(--border-width) solid var(--border); }
.dc-toolbar--subtle{ background:var(--surface-subtle); }
.dc-toolbar--sticky{ position:sticky; top:0; z-index:var(--z-sticky); }
.dc-toolbar--dense{ padding:var(--space-2) var(--pad-section-x); gap:var(--space-2); }
.dc-toolbar__group{ display:flex; align-items:center; gap:var(--space-3); min-width:0; }
.dc-toolbar__group--right{ gap:var(--space-2); }
.dc-toolbar__spacer{ flex:1 1 auto; }
.dc-toolbar__title{ font-size:var(--text-lg); font-weight:var(--weight-semibold); margin:0; white-space:nowrap; }
.dc-toolbar__meta{ font-size:var(--text-sm); color:var(--text-muted); }
`;

export interface ToolbarOptions {
  left?: Child | Child[];
  right?: Child | Child[];
  sticky?: boolean;
  bordered?: boolean;
  subtle?: boolean;
  dense?: boolean;
  class?: string;
  attrs?: Record<string, string>;
}

export function toolbar(children?: Child | Child[], opts: ToolbarOptions = {}): HTMLDivElement {
  ensureStyles("toolbar", CSS);
  const { left, right, sticky = false, bordered = true, subtle = false, dense = false } = opts;
  const classes = [
    "dc-toolbar",
    bordered && "dc-toolbar--bordered",
    subtle && "dc-toolbar--subtle",
    sticky && "dc-toolbar--sticky",
    dense && "dc-toolbar--dense",
    opts.class,
  ]
    .filter(Boolean)
    .join(" ");

  const node = el("div", { class: classes });
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);

  if (left != null || right != null) {
    const leftGroup = el("div", { class: "dc-toolbar__group" });
    append(leftGroup, Array.isArray(left) ? left : [left]);
    const spacer = el("div", { class: "dc-toolbar__spacer" });
    const rightGroup = el("div", { class: "dc-toolbar__group dc-toolbar__group--right" });
    append(rightGroup, Array.isArray(right) ? right : [right]);
    append(node, [leftGroup, spacer, rightGroup]);
    return node;
  }

  append(node, Array.isArray(children) ? children : [children]);
  return node;
}
