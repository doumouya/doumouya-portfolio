import { el, ensureStyles, type Child } from "../el";

/* Datacore Badge — a compact status pill. Neutral + semantic tones, plus the
   four build-engine workflow states (backlog / progress / review / done).
   Three fills: soft (tinted, default), solid, outline. Optional leading dot.
   CSS lifted verbatim from the React source. */
const CSS = `
.dc-badge{
  --tone: var(--text-muted);
  display:inline-flex; align-items:center; gap:var(--space-1);
  height:1.4rem; padding:0 var(--space-2);
  font-size:var(--text-2xs); font-weight:var(--weight-medium); line-height:1;
  letter-spacing:var(--tracking-wide); white-space:nowrap;
  border:var(--border-width) solid transparent; border-radius:var(--radius-full);
}
.dc-badge--square{ border-radius:var(--radius-xs); letter-spacing:0; }
.dc-badge--mono{ font-family:var(--font-mono); letter-spacing:0; text-transform:none; }
.dc-badge__dot{ width:.42rem; height:.42rem; border-radius:var(--radius-full); background:var(--tone); flex:none; }

/* fills */
.dc-badge--soft{ background:color-mix(in srgb, var(--tone) 13%, var(--surface)); color:var(--tone); border-color:color-mix(in srgb, var(--tone) 22%, transparent); }
.dc-badge--solid{ background:var(--tone); color:#fff; border-color:var(--tone); }
.dc-badge--outline{ background:transparent; color:var(--tone); border-color:color-mix(in srgb, var(--tone) 45%, transparent); }

/* tones */
.dc-badge--neutral{ --tone: var(--text-muted); }
.dc-badge--accent{ --tone: var(--accent); }
.dc-badge--success{ --tone: var(--success); }
.dc-badge--warning{ --tone: var(--warning); }
.dc-badge--danger{ --tone: var(--danger); }
.dc-badge--backlog{ --tone: var(--status-backlog); }
.dc-badge--progress{ --tone: var(--status-progress); }
.dc-badge--review{ --tone: var(--status-review); }
.dc-badge--done{ --tone: var(--status-done); }
.dc-badge--neutral.dc-badge--soft{ background:var(--surface-subtle); border-color:var(--border); color:var(--text-muted); }
`;

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "backlog"
  | "progress"
  | "review"
  | "done";
export type BadgeVariant = "soft" | "solid" | "outline";

export interface BadgeOptions {
  tone?: BadgeTone;
  variant?: BadgeVariant;
  /** Render a leading status dot. */
  dot?: boolean;
  /** Square (xs-radius) instead of pill. */
  square?: boolean;
  /** Monospace, no letter-spacing/uppercase tweaks. */
  mono?: boolean;
  /** Extra class names appended to the component's own. */
  class?: string;
  /** Any extra attributes (e.g. `title`, `aria-*`). */
  attrs?: Record<string, string>;
}

/** A compact status pill; pass tone/variant/dot/square/mono via `opts`. */
export function badge(label: Child, opts: BadgeOptions = {}): HTMLSpanElement {
  ensureStyles("badge", CSS);
  const { tone = "neutral", variant = "soft", dot, square, mono } = opts;
  const classes = [
    "dc-badge",
    `dc-badge--${tone}`,
    `dc-badge--${variant}`,
    square && "dc-badge--square",
    mono && "dc-badge--mono",
    opts.class,
  ]
    .filter(Boolean)
    .join(" ");

  const node = el(
    "span",
    { class: classes },
    dot ? el("span", { class: "dc-badge__dot", "aria-hidden": "true" }) : null,
    label,
  );
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  return node;
}
