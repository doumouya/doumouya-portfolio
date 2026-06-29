import { el, ensureStyles, type Child } from "../el";

/* Datacore Avatar — a small identity chip for case assignees and thread authors.
   Shows an image if given, else initials from `name`, else a fallback icon. A
   rounded square by default (matches the brand's small radii); `circle` for
   people. Optional tone tints the fallback. CSS lifted verbatim. */
const CSS = `
.dc-avatar{
  display:inline-flex; align-items:center; justify-content:center; flex:none;
  width:1.75rem; height:1.75rem; border-radius:var(--radius-sm);
  background:var(--surface-subtle); color:var(--text-muted);
  border:1px solid var(--border); overflow:hidden;
  font-weight:var(--weight-semibold); font-size:var(--text-2xs); line-height:1;
  text-transform:uppercase; letter-spacing:.01em; user-select:none;
}
.dc-avatar--circle{ border-radius:var(--radius-full); }
.dc-avatar--sm{ width:1.4rem; height:1.4rem; font-size:.6rem; }
.dc-avatar--lg{ width:2.25rem; height:2.25rem; font-size:var(--text-sm); }
.dc-avatar img{ width:100%; height:100%; object-fit:cover; }
.dc-avatar--toned{
  background:color-mix(in srgb, var(--tone) 14%, var(--surface));
  color:var(--tone); border-color:color-mix(in srgb, var(--tone) 26%, transparent);
}
`;

const BI_HREF =
  "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css";

/* Bootstrap Icons font, loaded once from CDN (mirrors the Datacore Icon). */
function ensureIconFont(): void {
  if (typeof document === "undefined") return;
  if (document.querySelector('link[data-dc="bootstrap-icons"]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = BI_HREF;
  link.setAttribute("data-dc", "bootstrap-icons");
  document.head.appendChild(link);
}

function initials(name: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  const first = parts[0];
  if (!first) return "";
  const second = parts[1];
  return (first.charAt(0) + (second ? second.charAt(0) : "")).slice(0, 2);
}

export type AvatarShape = "rounded" | "circle";
export type AvatarSize = "sm" | "md" | "lg";

export interface AvatarOptions {
  /** Display name — drives initials and the title/alt text. */
  name?: string;
  /** Image URL; takes precedence over initials and the fallback icon. */
  src?: string;
  /** Bootstrap Icons name (no `bi-` prefix) for the fallback. */
  icon?: string;
  shape?: AvatarShape;
  size?: AvatarSize;
  /** Tint color for the fallback (sets `--tone` and toggles the toned variant). */
  tone?: string;
  /** Extra class names appended to the component's own. */
  class?: string;
  /** Any extra attributes (e.g. `data-*`, `aria-*`). */
  attrs?: Record<string, string>;
}

/** A small identity chip: image, then initials, then a fallback icon. */
export function avatar(opts: AvatarOptions = {}): HTMLSpanElement {
  ensureStyles("avatar", CSS);
  const { name, src, icon = "person-fill", shape = "rounded", size = "md", tone } = opts;

  const classes = [
    "dc-avatar",
    shape === "circle" && "dc-avatar--circle",
    size !== "md" && `dc-avatar--${size}`,
    tone && "dc-avatar--toned",
    opts.class,
  ]
    .filter(Boolean)
    .join(" ");

  let content: Child;
  if (src) {
    content = el("img", { src, alt: name ?? "" });
  } else if (name) {
    content = initials(name);
  } else {
    ensureIconFont();
    content = el("i", { class: `bi bi-${icon}`, "aria-hidden": "true" });
  }

  const node = el("span", { class: classes, title: name ?? null }, content);
  if (tone) node.style.setProperty("--tone", tone);
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  return node;
}
