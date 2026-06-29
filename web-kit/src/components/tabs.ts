import { el, ensureStyles, type Child } from "../el";

/* Datacore Tabs — calm view switcher. Underline variant (default) is the quiet
   in-page switch (list ⇄ board); `segmented` is a bordered pill group for
   compact toolbars. Controlled via `value`/`onChange`, or uncontrolled with
   `defaultValue`. Each tab is { id, label, icon?, count? }. */

const CSS = `
.dc-tabs{ display:inline-flex; }
.dc-tabs--block{ display:flex; }
.dc-tabs__tab{
  display:inline-flex; align-items:center; gap:var(--space-2);
  font:var(--font-body); font-weight:var(--weight-medium); color:var(--text-muted);
  background:none; border:0; cursor:pointer; white-space:nowrap;
  transition:var(--transition-control);
}
.dc-tabs__count{ font-size:var(--text-2xs); color:var(--text-subtle); font-variant-numeric:tabular-nums; }

/* underline */
.dc-tabs--underline{ gap:var(--space-4); border-bottom:1px solid var(--border); }
.dc-tabs--underline .dc-tabs__tab{
  padding:var(--space-2) 2px; margin-bottom:-1px;
  border-bottom:2px solid transparent;
}
.dc-tabs--underline .dc-tabs__tab:hover{ color:var(--text); }
.dc-tabs--underline .dc-tabs__tab[aria-selected="true"]{ color:var(--accent); border-bottom-color:var(--accent); }
.dc-tabs--underline .dc-tabs__tab[aria-selected="true"] .dc-tabs__count{ color:var(--accent); }

/* segmented */
.dc-tabs--segmented{ gap:0; padding:3px; background:var(--surface-subtle); border:1px solid var(--border); border-radius:var(--radius); }
.dc-tabs--segmented .dc-tabs__tab{ padding:var(--space-1) var(--pad-control-x); border-radius:var(--radius-sm); height:calc(var(--control-h) - 6px); }
.dc-tabs--segmented .dc-tabs__tab:hover{ color:var(--text); }
.dc-tabs--segmented .dc-tabs__tab[aria-selected="true"]{ color:var(--text); background:var(--surface); box-shadow:var(--shadow-popover); }

.dc-tabs__tab:focus-visible{ outline:var(--focus-ring); outline-offset:2px; border-radius:var(--radius-xs); }
`;

export type TabsVariant = "underline" | "segmented";

export interface TabItem {
  id: string;
  label: Child;
  icon?: Node;
  count?: number;
}

export interface TabsOptions {
  /** Controlled active tab id; pair with `onChange`. */
  value?: string;
  /** Initial active tab id when uncontrolled (defaults to the first tab). */
  defaultValue?: string;
  /** Called with the picked tab id on every selection. */
  onChange?: (id: string) => void;
  variant?: TabsVariant;
  block?: boolean;
  /** Extra class names appended to the component's own. */
  class?: string;
  /** Any extra attributes (e.g. `aria-*`). */
  attrs?: Record<string, string>;
}

/** A row of tabs; pass variant/block/controlled state via `opts`. */
export function tabs(items: TabItem[], opts: TabsOptions = {}): HTMLDivElement {
  ensureStyles("tabs", CSS);
  const { value, defaultValue, onChange, variant = "underline", block } = opts;

  const first = items[0];
  let internal = defaultValue != null ? defaultValue : first ? first.id : undefined;

  const classes = ["dc-tabs", `dc-tabs--${variant}`, block && "dc-tabs--block", opts.class]
    .filter(Boolean)
    .join(" ");

  const root = el("div", { class: classes, role: "tablist" });

  const buttons = new Map<string, HTMLButtonElement>();

  function render(): void {
    const active = value != null ? value : internal;
    for (const [id, node] of buttons) {
      node.setAttribute("aria-selected", String(active === id));
    }
  }

  function pick(id: string): void {
    if (value == null) internal = id;
    if (onChange) onChange(id);
    render();
  }

  for (const t of items) {
    const node = el(
      "button",
      {
        class: "dc-tabs__tab",
        role: "tab",
        type: "button",
        onClick: () => pick(t.id),
      },
      t.icon ?? null,
      t.label,
      t.count != null ? el("span", { class: "dc-tabs__count" }, t.count) : null,
    );
    if (block) {
      node.style.flex = "1";
      node.style.justifyContent = "center";
    }
    buttons.set(t.id, node);
    root.appendChild(node);
  }

  render();

  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) root.setAttribute(k, v);
  return root;
}
