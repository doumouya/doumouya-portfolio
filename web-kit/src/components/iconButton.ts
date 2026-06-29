import { el, ensureStyles, type Child } from "../el";

/* CSS lifted verbatim from the Datacore design system. Square, icon-only
   control for toolbars and table headers (sort toggles, close, overflow);
   same hairline language as Button. */
const CSS = `
.dc-iconbtn{
  display:inline-flex; align-items:center; justify-content:center;
  width:var(--control-h); height:var(--control-h); padding:0;
  border:var(--border-width) solid transparent; border-radius:var(--radius);
  background:transparent; color:var(--text-muted);
  cursor:pointer; line-height:1; font-size:var(--text-md);
  transition:var(--transition-control);
}
.dc-iconbtn:hover{ background:var(--surface-subtle); color:var(--text); }
.dc-iconbtn:active{ background:var(--surface-sunken); }
.dc-iconbtn:focus-visible{ outline:var(--focus-ring); outline-offset:1px; }
.dc-iconbtn[disabled]{ opacity:.45; cursor:not-allowed; }
.dc-iconbtn[disabled]:hover{ background:transparent; color:var(--text-muted); }
.dc-iconbtn[aria-pressed="true"],.dc-iconbtn.is-active{ color:var(--accent); background:var(--accent-tint); }
.dc-iconbtn--bordered{ border-color:var(--border); }
.dc-iconbtn--bordered:hover{ border-color:var(--accent); background:transparent; color:var(--text); }
.dc-iconbtn--sm{ width:var(--control-h-sm); height:var(--control-h-sm); font-size:var(--text-sm); border-radius:var(--radius-sm); }
.dc-iconbtn--lg{ width:var(--control-h-lg); height:var(--control-h-lg); }
.dc-iconbtn svg{ width:1.05em; height:1.05em; }
`;

export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonOptions {
  /** Accessible label; also used as the default tooltip (`title`). */
  label: string;
  size?: IconButtonSize;
  bordered?: boolean;
  active?: boolean;
  disabled?: boolean;
  /** Tooltip text; falls back to `label` when omitted. */
  title?: string;
  onClick?: EventListener;
  /** Extra class names appended to the component's own. */
  class?: string;
  /** Any extra attributes (e.g. `type`, `aria-*`). */
  attrs?: Record<string, string>;
}

/** A square, icon-only button. Icon content (glyph or inline SVG) is the first arg. */
export function iconButton(icon: Child, opts: IconButtonOptions): HTMLButtonElement {
  ensureStyles("iconbutton", CSS);
  const { label, size = "md", bordered, active, disabled, title, onClick } = opts;
  const classes = [
    "dc-iconbtn",
    bordered && "dc-iconbtn--bordered",
    active && "is-active",
    size !== "md" && `dc-iconbtn--${size}`,
    opts.class,
  ]
    .filter(Boolean)
    .join(" ");

  const node = el(
    "button",
    {
      class: classes,
      "aria-label": label,
      title: title ?? label,
      disabled,
      ...(onClick ? { onClick } : {}),
    },
    icon,
  );
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  return node;
}
