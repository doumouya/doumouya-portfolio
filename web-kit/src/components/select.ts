import { el, ensureStyles, append, type Child } from "../el";

/* CSS lifted verbatim from the Datacore design system. A native <select> in the
   brand's hairline shell with a Unicode chevron — column-kind ops, status
   pickers, page size. */
const CSS = `
.dc-select{ display:inline-flex; flex-direction:column; gap:var(--space-1); }
.dc-select--block{ display:flex; width:100%; }
.dc-select__label{ font-size:var(--text-sm); font-weight:var(--weight-medium); color:var(--text); }
.dc-select__shell{ position:relative; display:inline-flex; align-items:center; }
.dc-select--block .dc-select__shell{ display:flex; width:100%; }
.dc-select select{
  appearance:none; -webkit-appearance:none;
  font:var(--font-body); color:var(--text);
  height:var(--control-h); width:100%;
  padding:0 calc(var(--space-6)) 0 var(--pad-control-x);
  border:var(--border-width) solid var(--border); border-radius:var(--radius-sm);
  background:var(--surface); cursor:pointer;
  transition:var(--transition-control);
}
.dc-select select:hover{ border-color:var(--border-strong); }
.dc-select select:focus-visible{ outline:var(--focus-ring); outline-offset:var(--focus-offset); border-color:var(--accent); }
.dc-select select:disabled{ opacity:.55; background:var(--surface-subtle); cursor:not-allowed; }
.dc-select--sm select{ height:var(--control-h-sm); font-size:var(--text-sm); padding-right:var(--space-5); }
.dc-select__chevron{
  position:absolute; right:var(--space-2); pointer-events:none;
  color:var(--text-subtle); font-size:.7em; line-height:1;
}
`;

export type SelectSize = "sm" | "md";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectOptions {
  /** Visible field label; when set, a generated id wires the `<label htmlFor>`. */
  label?: string;
  /** Option list as `{ value, label }` objects or bare strings. */
  options?: ReadonlyArray<SelectOption | string>;
  size?: SelectSize;
  block?: boolean;
  id?: string;
  /** Pre-built `<option>` children; overrides `options` when provided. */
  children?: Child[];
  /** Extra class names appended to the component's own. */
  class?: string;
  /** Any extra attributes on the `<select>` (e.g. `name`, `value`, `aria-*`). */
  attrs?: Record<string, string>;
}

/** A native select in the hairline shell; pass options/size/label via `opts`. */
export function select(opts: SelectOptions = {}): HTMLDivElement {
  ensureStyles("select", CSS);
  const { label, options = [], size = "md", block, id, children } = opts;
  const fieldId = id || (label ? `dc-${Math.random().toString(36).slice(2, 8)}` : undefined);
  const classes = [
    "dc-select",
    size !== "md" && `dc-select--${size}`,
    block && "dc-select--block",
    opts.class,
  ]
    .filter(Boolean)
    .join(" ");

  const selectEl = el("select", fieldId ? { id: fieldId } : {});
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) selectEl.setAttribute(k, v);

  if (children && children.length > 0) {
    append(selectEl, children);
  } else {
    for (const o of options) {
      const opt = typeof o === "string" ? { value: o, label: o } : o;
      append(selectEl, [el("option", { value: opt.value }, opt.label)]);
    }
  }

  return el(
    "div",
    { class: classes },
    label ? el("label", { class: "dc-select__label", ...(fieldId ? { for: fieldId } : {}) }, label) : null,
    el(
      "span",
      { class: "dc-select__shell" },
      selectEl,
      el("span", { class: "dc-select__chevron", "aria-hidden": "true" }, "▼"),
    ),
  );
}
