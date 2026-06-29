import { el } from "../el";

/* Datacore Icon — the brand icon language. Wraps Bootstrap Icons (loaded from
   CDN, rendered at currentColor) so glyphs inherit text color and sit on the
   baseline. Thin, geometric, single-weight — it matches the hairline aesthetic.
   Pass any Bootstrap Icons name without the `bi-` prefix (e.g. "search",
   "funnel", "arrow-down-up").

   The React source carries no component CSS (styling is inline + the CDN font),
   so there is no `ensureStyles` call here — instead we keep its `ensureIconFont`
   logic verbatim and apply the same inline styles. */

const BI_HREF =
  "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css";

let fontLinked = false;
function ensureIconFont(): void {
  if (fontLinked || typeof document === "undefined") return;
  fontLinked = true;
  if (document.querySelector('link[data-dc="bootstrap-icons"]')) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = BI_HREF;
  l.setAttribute("data-dc", "bootstrap-icons");
  document.head.appendChild(l);
}

export interface IconOptions {
  /** Any CSS font-size value; controls the glyph size (inherits when omitted). */
  size?: string | number;
  /** Accessible label — sets role="img" + aria-label; omit for decorative (aria-hidden). */
  label?: string;
  /** Extra style overrides merged over the base inline styles. */
  style?: Partial<CSSStyleDeclaration>;
  /** Extra class names appended to the component's own. */
  class?: string;
  /** Any extra attributes (e.g. `title`, `data-*`). */
  attrs?: Record<string, string>;
}

/** A Bootstrap Icons glyph rendered at currentColor; pass options via `opts`. */
export function icon(name: string, opts: IconOptions = {}): HTMLElement {
  ensureIconFont();
  const { size, label, style } = opts;
  const classes = `bi bi-${name} ${opts.class ?? ""}`.trim();

  const node = el("i", { class: classes });

  node.style.display = "inline-flex";
  node.style.alignItems = "center";
  node.style.justifyContent = "center";
  node.style.flex = "none";
  if (size !== undefined) node.style.fontSize = typeof size === "number" ? `${size}px` : size;
  if (style) Object.assign(node.style, style);

  if (label) {
    node.setAttribute("role", "img");
    node.setAttribute("aria-label", label);
  } else {
    node.setAttribute("aria-hidden", "true");
  }

  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  return node;
}
