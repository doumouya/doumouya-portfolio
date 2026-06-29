import { el, ensureStyles, type Child } from "../el";

const CSS = `
.dc-tip{ position:relative; display:inline-flex; }
.dc-tip__bubble{
  position:absolute; z-index:var(--z-popover); pointer-events:none;
  white-space:nowrap; max-width:18rem;
  padding:var(--space-1) var(--space-2);
  font-size:var(--text-xs); line-height:var(--leading-tight);
  color:var(--text); background:var(--surface-overlay);
  border:1px solid var(--border); border-radius:var(--radius-sm);
  box-shadow:var(--shadow-popover);
  opacity:0; transform:translateY(2px); transition:opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out);
}
.dc-tip:hover .dc-tip__bubble, .dc-tip:focus-within .dc-tip__bubble{ opacity:1; transform:translateY(0); }
.dc-tip__bubble--top{ bottom:calc(100% + 6px); left:50%; transform:translate(-50%, 2px); }
.dc-tip:hover .dc-tip__bubble--top, .dc-tip:focus-within .dc-tip__bubble--top{ transform:translate(-50%, 0); }
.dc-tip__bubble--bottom{ top:calc(100% + 6px); left:50%; transform:translate(-50%, -2px); }
.dc-tip:hover .dc-tip__bubble--bottom, .dc-tip:focus-within .dc-tip__bubble--bottom{ transform:translate(-50%, 0); }
.dc-tip__bubble--left{ right:calc(100% + 6px); top:50%; transform:translate(2px, -50%); }
.dc-tip:hover .dc-tip__bubble--left, .dc-tip:focus-within .dc-tip__bubble--left{ transform:translate(0, -50%); }
.dc-tip__bubble--right{ left:calc(100% + 6px); top:50%; transform:translate(-2px, -50%); }
.dc-tip:hover .dc-tip__bubble--right, .dc-tip:focus-within .dc-tip__bubble--right{ transform:translate(0, -50%); }
`;

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

export interface TooltipOptions {
  /** The bubble's content (revealed on hover/focus). */
  content: Child;
  /** Where the bubble sits relative to the trigger. Defaults to "top". */
  placement?: TooltipPlacement;
  class?: string;
  attrs?: Record<string, string>;
}

export function tooltip(children: Child, opts: TooltipOptions): HTMLSpanElement {
  ensureStyles("tooltip", CSS);
  const placement = opts.placement ?? "top";
  const classes = ["dc-tip", opts.class].filter(Boolean).join(" ");
  const bubble = el(
    "span",
    { class: `dc-tip__bubble dc-tip__bubble--${placement}`, role: "tooltip" },
    opts.content,
  );
  const node = el("span", { class: classes }, children, bubble);
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  return node;
}
