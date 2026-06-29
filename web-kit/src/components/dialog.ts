import { el, append, ensureStyles, type Child } from "../el";

/* Datacore Dialog — a modal panel over a dimmed scrim. Flat, hairline-bordered,
   soft dialog shadow (one of the few places the brand floats). Closes on scrim
   click and Escape. Header (title + close), body, and an optional footer action
   row. Renders nothing when `open` is false.

   CSS lifted verbatim from the React source (same .dc-dialog__* classes/tokens). */
const CSS = `
.dc-dialog__scrim{
  position:fixed; inset:0; z-index:var(--z-dialog);
  background:color-mix(in srgb, var(--neutral-950) 45%, transparent);
  display:flex; align-items:center; justify-content:center; padding:var(--space-6);
  animation:dc-dialog-fade var(--dur) var(--ease-out);
}
.dc-dialog{
  width:100%; max-width:32rem; max-height:calc(100vh - 4rem);
  display:flex; flex-direction:column;
  background:var(--surface-overlay); color:var(--text);
  border:1px solid var(--border); border-radius:var(--radius-lg);
  box-shadow:var(--shadow-dialog); overflow:hidden;
  animation:dc-dialog-rise var(--dur) var(--ease-out);
}
.dc-dialog--sm{ max-width:24rem; } .dc-dialog--lg{ max-width:44rem; }
.dc-dialog__head{
  display:flex; align-items:center; gap:var(--space-3);
  padding:var(--space-3) var(--space-3) var(--space-3) var(--space-4);
  border-bottom:1px solid var(--border);
}
.dc-dialog__title{ font-size:var(--text-lg); font-weight:var(--weight-semibold); margin:0; }
.dc-dialog__close{ margin-left:auto; }
.dc-dialog__body{ padding:var(--space-4); overflow:auto; }
.dc-dialog__foot{
  display:flex; align-items:center; justify-content:flex-end; gap:var(--space-2);
  padding:var(--space-3) var(--space-4); border-top:1px solid var(--border);
  background:var(--surface-subtle);
}
@keyframes dc-dialog-fade{ from{ opacity:0 } }
@keyframes dc-dialog-rise{ from{ opacity:0; transform:translateY(8px) } }
@media (prefers-reduced-motion: reduce){
  .dc-dialog__scrim,.dc-dialog{ animation:none; }
}
`;

/* The close affordance reuses IconButton + Icon from the React source. Those
   ports don't exist as standalone modules here yet, so their hairline classes
   and Bootstrap Icons font loading are inlined to keep behaviour identical. */
const ICONBTN_CSS = `
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

const BI_HREF =
  "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css";

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

/** A Bootstrap Icons glyph (`<i class="bi bi-x-lg">`), aria-hidden like the source. */
function icon(name: string): HTMLElement {
  ensureIconFont();
  const node = el("i", { class: `bi bi-${name}`, "aria-hidden": "true" });
  node.style.display = "inline-flex";
  node.style.alignItems = "center";
  node.style.justifyContent = "center";
  node.style.flex = "none";
  return node;
}

export type DialogSize = "sm" | "md" | "lg";

export interface DialogOptions {
  /** Whether the dialog is mounted; when false the factory returns `null`. */
  open: boolean;
  /** Close handler — wired to scrim click, the close button, and Escape. */
  onClose?: () => void;
  /** Header title; when a string it also becomes the dialog's aria-label. */
  title?: Child;
  /** Footer action row; omitted when nullish. */
  footer?: Child;
  size?: DialogSize;
  /** Extra class names appended to the dialog panel. */
  class?: string;
  /** Any extra attributes set on the dialog panel (e.g. `id`, `aria-*`). */
  attrs?: Record<string, string>;
}

/**
 * A modal dialog over a dimmed scrim. Stateless/controlled like the React
 * version: the host owns `open` and provides `onClose`. Returns the scrim
 * element when open, or `null` when closed.
 *
 * The Escape-key listener is attached to `document` while open and removed when
 * the returned node is disconnected (observed via a MutationObserver), mirroring
 * the React effect cleanup.
 */
export function dialog(children: Child, opts: DialogOptions): HTMLDivElement | null {
  ensureStyles("dialog", CSS);
  ensureStyles("iconbutton", ICONBTN_CSS);

  const { open, onClose, title, footer, size = "md" } = opts;
  if (!open) return null;

  const close = (): void => {
    if (onClose) onClose();
  };

  const head: HTMLDivElement | null =
    title != null || onClose
      ? el(
          "div",
          { class: "dc-dialog__head" },
          title != null ? el("h2", { class: "dc-dialog__title" }, title) : null,
          onClose
            ? el(
                "span",
                { class: "dc-dialog__close" },
                el(
                  "button",
                  {
                    class: "dc-iconbtn",
                    "aria-label": "Close",
                    title: "Close",
                    onClick: () => close(),
                  },
                  icon("x-lg"),
                ),
              )
            : null,
        )
      : null;

  const panelClasses = ["dc-dialog", size !== "md" && `dc-dialog--${size}`, opts.class]
    .filter(Boolean)
    .join(" ");

  const panel = el("div", {
    class: panelClasses,
    role: "dialog",
    "aria-modal": "true",
    "aria-label": typeof title === "string" ? title : undefined,
  });
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) panel.setAttribute(k, v);

  append(panel, [head, el("div", { class: "dc-dialog__body" }, children)]);
  if (footer != null) append(panel, [el("div", { class: "dc-dialog__foot" }, footer)]);

  const scrim = el(
    "div",
    {
      class: "dc-dialog__scrim",
      onMousedown: (e: Event) => {
        if (e.target === e.currentTarget) close();
      },
    },
    panel,
  );

  if (typeof document !== "undefined") {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const observer = new MutationObserver(() => {
      if (!scrim.isConnected) {
        document.removeEventListener("keydown", onKey);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  return scrim;
}
