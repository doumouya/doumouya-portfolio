import { el, append, ensureStyles, type Child } from "../el";

/* Datacore Card — a flat, hairline-bordered surface (no drop shadow; depth is
   the border + a subtle surface step, per the brand). Optional header (title +
   actions) and footer. `interactive` highlights the border on hover. */

const CSS = `
.dc-card{
  display:flex; flex-direction:column;
  background:var(--surface); border:var(--border-width) solid var(--border);
  border-radius:var(--radius); overflow:clip;
}
.dc-card--interactive{ cursor:pointer; transition:var(--transition-control); }
.dc-card--interactive:hover{ border-color:var(--accent); }
.dc-card--interactive:focus-visible{ outline:var(--focus-ring); outline-offset:1px; }
.dc-card--raised{ box-shadow:var(--shadow-popover); border-color:transparent; }
.dc-card__header{
  display:flex; align-items:center; gap:var(--space-3);
  padding:var(--space-3) var(--space-4);
  border-bottom:var(--border-width) solid var(--border);
  background:var(--surface-subtle);
}
.dc-card__title{ font-size:var(--text-md); font-weight:var(--weight-semibold); color:var(--text); margin:0; }
.dc-card__subtitle{ font-size:var(--text-sm); color:var(--text-muted); margin:0; }
.dc-card__titles{ display:flex; flex-direction:column; gap:.1rem; min-width:0; }
.dc-card__actions{ margin-left:auto; display:flex; align-items:center; gap:var(--space-2); }
.dc-card__body{ padding:var(--space-4); }
.dc-card__body--flush{ padding:0; }
.dc-card__footer{
  padding:var(--space-3) var(--space-4);
  border-top:var(--border-width) solid var(--border);
  background:var(--surface-subtle);
  font-size:var(--text-sm); color:var(--text-muted);
}
`;

export interface CardOptions {
  title?: Child;
  subtitle?: Child;
  actions?: Child;
  footer?: Child;
  interactive?: boolean;
  raised?: boolean;
  flush?: boolean;
  class?: string;
  attrs?: Record<string, string>;
}

export function card(children?: Child | Child[], opts: CardOptions = {}): HTMLDivElement {
  ensureStyles("card", CSS);

  const hasHeader = opts.title != null || opts.actions != null;
  const classes = [
    "dc-card",
    opts.interactive && "dc-card--interactive",
    opts.raised && "dc-card--raised",
    opts.class,
  ]
    .filter(Boolean)
    .join(" ");

  const node = el("div", {
    class: classes,
    tabindex: opts.interactive ? "0" : undefined,
  });

  if (hasHeader) {
    const header = el("div", { class: "dc-card__header" });
    if (opts.title != null || opts.subtitle != null) {
      const titles = el("div", { class: "dc-card__titles" });
      if (opts.title != null) {
        append(titles, [el("h3", { class: "dc-card__title" }, opts.title)]);
      }
      if (opts.subtitle != null) {
        append(titles, [el("p", { class: "dc-card__subtitle" }, opts.subtitle)]);
      }
      append(header, [titles]);
    }
    if (opts.actions != null) {
      append(header, [el("div", { class: "dc-card__actions" }, opts.actions)]);
    }
    append(node, [header]);
  }

  const bodyClass = `dc-card__body${opts.flush ? " dc-card__body--flush" : ""}`;
  const body = el("div", { class: bodyClass });
  append(body, Array.isArray(children) ? children : [children]);
  append(node, [body]);

  if (opts.footer != null) {
    append(node, [el("div", { class: "dc-card__footer" }, opts.footer)]);
  }

  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  return node;
}
