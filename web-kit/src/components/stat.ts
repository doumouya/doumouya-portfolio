import { el, ensureStyles, type Child } from "../el";

/* Datacore Stat — a single metric/KPI: a big tabular number with a label and an
   optional caption or delta. The brand's "big number" pattern (the rbac panel's
   reach count, the dashboard KPI strip) made reusable. Flat by default; `bordered`
   boxes it as a tile. Delta arrows use the semantic success/danger hues. */

const CSS = `
.dc-stat{ display:flex; flex-direction:column; gap:2px; min-width:0; }
.dc-stat--bordered{ padding:var(--space-3) var(--space-4); border:1px solid var(--border); border-radius:var(--radius); background:var(--surface); }
.dc-stat__label{ font-size:var(--text-xs); color:var(--text-muted); font-weight:var(--weight-medium); letter-spacing:var(--tracking-wide); text-transform:uppercase; white-space:nowrap; }
.dc-stat__value{ font-size:var(--text-3xl); font-weight:var(--weight-bold); line-height:1.05; color:var(--text); font-variant-numeric:var(--numeric-tabular); letter-spacing:var(--tracking-tight); }
.dc-stat--accent .dc-stat__value{ color:var(--accent); }
.dc-stat--success .dc-stat__value{ color:var(--success); }
.dc-stat--sm .dc-stat__value{ font-size:var(--text-2xl); }
.dc-stat__unit{ font-size:.5em; font-weight:var(--weight-medium); color:var(--text-muted); margin-left:.25em; letter-spacing:0; }
.dc-stat__foot{ display:flex; align-items:center; gap:var(--space-2); margin-top:1px; }
.dc-stat__caption{ font-size:var(--text-xs); color:var(--text-subtle); }
.dc-stat__delta{ display:inline-flex; align-items:center; gap:2px; font-size:var(--text-xs); font-weight:var(--weight-medium); font-variant-numeric:var(--numeric-tabular); }
.dc-stat__delta--up{ color:var(--success); }
.dc-stat__delta--down{ color:var(--danger); }
.dc-stat__delta--flat{ color:var(--text-muted); }
`;

export type StatTone = "default" | "accent" | "success";
export type StatSize = "md" | "sm";

export interface StatOptions {
  /** Small uppercase label above the value. */
  label?: Child;
  /** Optional unit (e.g. "%", "k") rendered small after the value. */
  unit?: Child;
  /** Optional caption in the footer row. */
  caption?: Child;
  /** Signed delta; sign drives the up/down/flat arrow and is rendered as a percentage. */
  delta?: number;
  tone?: StatTone;
  size?: StatSize;
  bordered?: boolean;
  /** Extra class names appended to the component's own. */
  class?: string;
  /** Any extra attributes (e.g. `id`, `aria-*`). */
  attrs?: Record<string, string>;
}

/** A single big-number metric; the value is the primary content, everything else via `opts`. */
export function stat(value: Child, opts: StatOptions = {}): HTMLDivElement {
  ensureStyles("stat", CSS);
  const { label, unit, caption, delta, tone = "default", size = "md", bordered } = opts;
  const classes = [
    "dc-stat",
    tone !== "default" && `dc-stat--${tone}`,
    size !== "md" && `dc-stat--${size}`,
    bordered && "dc-stat--bordered",
    opts.class,
  ]
    .filter(Boolean)
    .join(" ");

  const dir =
    delta === null || delta === undefined ? null : delta > 0 ? "up" : delta < 0 ? "down" : "flat";

  const footer =
    caption !== null && caption !== undefined && caption !== false
      ? true
      : delta !== null && delta !== undefined;

  const node = el(
    "div",
    { class: classes },
    label !== null && label !== undefined && label !== false
      ? el("div", { class: "dc-stat__label" }, label)
      : null,
    el(
      "div",
      { class: "dc-stat__value" },
      value,
      unit !== null && unit !== undefined && unit !== false
        ? el("span", { class: "dc-stat__unit" }, unit)
        : null,
    ),
    footer
      ? el(
          "div",
          { class: "dc-stat__foot" },
          dir !== null
            ? el(
                "span",
                { class: `dc-stat__delta dc-stat__delta--${dir}` },
                `${dir === "up" ? "▲" : dir === "down" ? "▼" : "—"} ${Math.abs(delta as number)}%`,
              )
            : null,
          caption !== null && caption !== undefined && caption !== false
            ? el("span", { class: "dc-stat__caption" }, caption)
            : null,
        )
      : null,
  );

  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  return node;
}
