import { el, ensureStyles, type Child } from "../el";

/* CSS lifted verbatim from the Datacore design system. A single transient
   notification: flat card, hairline border, a tone-colored leading icon, and a
   quiet dismiss. Tone picks the icon + hue; the host app manages stacking and
   auto-dismiss timing. */
const CSS = `
.dc-toast{
  --tone: var(--text-muted);
  display:flex; align-items:flex-start; gap:var(--space-3);
  width:min(24rem, 92vw); padding:var(--space-3) var(--space-3) var(--space-3) var(--space-4);
  background:var(--surface-overlay); color:var(--text);
  border:1px solid var(--border); border-left:3px solid var(--tone);
  border-radius:var(--radius); box-shadow:var(--shadow-popover);
}
.dc-toast--success{ --tone:var(--success); }
.dc-toast--danger{ --tone:var(--danger); }
.dc-toast--warning{ --tone:var(--warning); }
.dc-toast--info{ --tone:var(--accent); }
.dc-toast__icon{ color:var(--tone); font-size:1rem; margin-top:.05rem; }
.dc-toast__body{ flex:1; min-width:0; }
.dc-toast__title{ font-size:var(--text-sm); font-weight:var(--weight-semibold); }
.dc-toast__desc{ font-size:var(--text-sm); color:var(--text-muted); margin-top:1px; }
.dc-toast__close{
  flex:none; background:none; border:0; color:var(--text-subtle); cursor:pointer;
  padding:2px; border-radius:var(--radius-xs); line-height:0; transition:var(--transition-control);
}
.dc-toast__close:hover{ color:var(--text); background:var(--surface-subtle); }
`;

export type ToastTone = "success" | "danger" | "warning" | "info";

const ICONS: Record<ToastTone, string> = {
  success: "check-circle-fill",
  danger: "x-circle-fill",
  warning: "exclamation-triangle-fill",
  info: "info-circle-fill",
};

/* Datacore Icon language — Bootstrap Icons loaded from CDN, rendered at
   currentColor. Mirrors display/Icon.jsx; inlined here because the icon
   component is not yet ported and only `../el` may be imported. */
const BI_HREF = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css";

let fontLinked = false;
function ensureIconFont(): void {
  if (fontLinked || typeof document === "undefined") return;
  fontLinked = true;
  if (document.querySelector('link[data-dc="bootstrap-icons"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = BI_HREF;
  link.setAttribute("data-dc", "bootstrap-icons");
  document.head.appendChild(link);
}

function icon(name: string, opts: { size?: string; label?: string; class?: string } = {}): HTMLElement {
  ensureIconFont();
  const node = el("i", {
    class: `bi bi-${name}${opts.class ? ` ${opts.class}` : ""}`,
    ...(opts.label ? { role: "img", "aria-label": opts.label } : { "aria-hidden": "true" }),
  });
  node.style.display = "inline-flex";
  node.style.alignItems = "center";
  node.style.justifyContent = "center";
  node.style.flex = "none";
  if (opts.size) node.style.fontSize = opts.size;
  return node;
}

export interface ToastOptions {
  tone?: ToastTone;
  /** Terse headline, often a verifiable result ("Exported 1,237 rows"). */
  title?: Child;
  /** Optional secondary line. */
  description?: Child;
  /** When provided, renders a dismiss button wired to this handler. */
  onClose?: EventListener;
  /** Extra class names appended to the component's own. */
  class?: string;
  /** Any extra attributes (e.g. `id`, `aria-*`). */
  attrs?: Record<string, string>;
}

/** A single transient notification card; tone drives the icon + hue. */
export function toast(opts: ToastOptions = {}): HTMLDivElement {
  ensureStyles("toast", CSS);
  const { tone = "info", title, description, onClose } = opts;
  const classes = ["dc-toast", `dc-toast--${tone}`, opts.class].filter(Boolean).join(" ");

  const node = el(
    "div",
    { class: classes, role: "status" },
    el("span", { class: "dc-toast__icon" }, icon(ICONS[tone])),
    el(
      "div",
      { class: "dc-toast__body" },
      title !== null && title !== undefined && title !== false
        ? el("div", { class: "dc-toast__title" }, title)
        : null,
      description !== null && description !== undefined && description !== false
        ? el("div", { class: "dc-toast__desc" }, description)
        : null,
    ),
    onClose
      ? el(
          "button",
          { class: "dc-toast__close", "aria-label": "Dismiss", onClick: onClose },
          icon("x-lg", { size: ".8rem" }),
        )
      : null,
  );

  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  return node;
}
