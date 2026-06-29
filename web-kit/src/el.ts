/**
 * The one helper every component uses instead of JSX: a tiny, typed DOM builder.
 *
 * `el("button", { class: "dc-btn", onClick: save }, "Save")` returns a real
 * `HTMLButtonElement`. Special keys: `class` → className, `text` → textContent,
 * `on*` (a function) → an event listener; everything else is a normal attribute.
 * Children are appended as nodes or text — never via innerHTML, so it is XSS-safe
 * by construction.
 */

export type Child = Node | string | number | null | undefined | false;
export type Attrs = Record<string, string | number | boolean | EventListener | null | undefined>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = String(value);
    else if (key === "text") node.textContent = String(value);
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
    } else if (value === true) {
      node.setAttribute(key, "");
    } else {
      node.setAttribute(key, String(value));
    }
  }
  append(node, children);
  return node;
}

/** Append a list of children (skipping nullish/false), as nodes or text. */
export function append(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/**
 * Inject a component's CSS exactly once, keyed by `name` (mirrors Datacore's
 * `ensureStyles`). Components call this at construction so a page only needs to
 * link the tokens; component CSS rides along with the component.
 */
const injected = new Set<string>();
export function ensureStyles(name: string, css: string): void {
  if (injected.has(name) || typeof document === "undefined") return;
  injected.add(name);
  const style = document.createElement("style");
  style.dataset["dc"] = name;
  style.textContent = css;
  document.head.appendChild(style);
}
