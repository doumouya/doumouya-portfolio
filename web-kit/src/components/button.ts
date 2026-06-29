import { el, ensureStyles, type Child } from "../el";

/* CSS lifted verbatim from the Datacore design system (token-driven, hairline
   secondary default; primary / ghost / danger variants; sm/md/lg sizes). */
const CSS = `
.dc-btn{
  font: var(--font-body); font-weight: var(--weight-medium);
  display:inline-flex; align-items:center; justify-content:center; gap:var(--space-2);
  height:var(--control-h); padding:0 var(--pad-control-x);
  border:var(--border-width) solid var(--border); border-radius:var(--radius);
  background:var(--surface-subtle); color:var(--text);
  cursor:pointer; white-space:nowrap; user-select:none; line-height:1;
  transition:var(--transition-control);
}
.dc-btn:hover{ border-color:var(--accent); }
.dc-btn:active{ background:var(--surface-sunken); }
.dc-btn:focus-visible{ outline:var(--focus-ring); outline-offset:1px; }
.dc-btn[disabled],.dc-btn[aria-disabled="true"]{ opacity:.5; cursor:not-allowed; }
.dc-btn[disabled]:hover,.dc-btn[aria-disabled="true"]:hover{ border-color:var(--border); }

.dc-btn--primary{ background:var(--accent); border-color:var(--accent); color:var(--text-on-accent); }
.dc-btn--primary:hover{ background:var(--accent-hover); border-color:var(--accent-hover); }
.dc-btn--primary:active{ background:var(--accent-hover); }

.dc-btn--ghost{ background:transparent; border-color:transparent; }
.dc-btn--ghost:hover{ background:var(--surface-subtle); border-color:transparent; }
.dc-btn--ghost:active{ background:var(--surface-sunken); }

.dc-btn--danger{ background:var(--danger); border-color:var(--danger); color:#fff; }
.dc-btn--danger:hover{ filter:brightness(.94); border-color:var(--danger); }

.dc-btn--sm{ height:var(--control-h-sm); padding:0 var(--space-2); font-size:var(--text-sm); border-radius:var(--radius-sm); }
.dc-btn--lg{ height:var(--control-h-lg); padding:0 var(--space-4); }
.dc-btn--block{ width:100%; }
.dc-btn svg{ width:1em; height:1em; flex:none; }
`;

export type ButtonVariant = "secondary" | "primary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  leadingIcon?: Node;
  trailingIcon?: Node;
  disabled?: boolean;
  /** Extra class names appended to the component's own. */
  class?: string;
  onClick?: EventListener;
  /** Any extra attributes (e.g. `type`, `aria-*`). */
  attrs?: Record<string, string>;
}

/** A hairline button; pass extra variants/sizes/icons via `opts`. */
export function button(label: Child, opts: ButtonOptions = {}): HTMLButtonElement {
  ensureStyles("button", CSS);
  const { variant = "secondary", size = "md", block, leadingIcon, trailingIcon, disabled, onClick } = opts;
  const classes = [
    "dc-btn",
    variant !== "secondary" && `dc-btn--${variant}`,
    size !== "md" && `dc-btn--${size}`,
    block && "dc-btn--block",
    opts.class,
  ]
    .filter(Boolean)
    .join(" ");

  const node = el(
    "button",
    { class: classes, disabled, ...(onClick ? { onClick } : {}) },
    leadingIcon ?? null,
    label !== null && label !== undefined && label !== false ? el("span", {}, label) : null,
    trailingIcon ?? null,
  );
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  return node;
}
