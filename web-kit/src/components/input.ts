import { el, ensureStyles, type Child } from "../el";

/* Datacore Input — text field matching the source filter control: hairline
   border, compact padding, a 2px inset accent outline on focus. Supports an
   optional leading adornment (e.g. a search glyph), sizes, and an invalid state.
   CSS lifted verbatim from the React source. */
const CSS = `
.dc-field{ display:inline-flex; flex-direction:column; gap:var(--space-1); }
.dc-field--block{ display:flex; width:100%; }
.dc-field__label{ font-size:var(--text-sm); font-weight:var(--weight-medium); color:var(--text); }
.dc-field__hint{ font-size:var(--text-xs); color:var(--text-muted); }
.dc-field__hint--error{ color:var(--danger); }

.dc-input{
  display:flex; align-items:center; gap:var(--space-2);
  height:var(--control-h); padding:0 var(--pad-control-x);
  border:var(--border-width) solid var(--border); border-radius:var(--radius-sm);
  background:var(--surface); color:var(--text);
  transition:var(--transition-control);
}
.dc-input:hover{ border-color:var(--border-strong); }
.dc-input:focus-within{ outline:var(--focus-ring); outline-offset:var(--focus-offset); border-color:var(--accent); }
.dc-input--invalid{ border-color:var(--danger); }
.dc-input--invalid:focus-within{ outline-color:var(--danger); border-color:var(--danger); }
.dc-input--sm{ height:var(--control-h-sm); padding:0 var(--space-2); }
.dc-input--disabled{ opacity:.55; background:var(--surface-subtle); cursor:not-allowed; }

.dc-input__adorn{ color:var(--text-subtle); font-size:var(--text-sm); display:inline-flex; flex:none; }
.dc-input input{
  flex:1; min-width:0; border:0; outline:0; background:transparent;
  font:var(--font-body); color:inherit;
}
.dc-input input::placeholder{ color:var(--text-subtle); }
.dc-input--block{ width:100%; }
`;

export type InputSize = "sm" | "md";

export interface InputOptions {
  /** Field label rendered above the box; when present the input gets a generated id. */
  label?: Child;
  /** Helper text shown below the box (suppressed when `error` is set). */
  hint?: Child;
  /** Error message; shows the invalid state and overrides `hint`. */
  error?: Child;
  size?: InputSize;
  block?: boolean;
  leadingIcon?: Node;
  trailingIcon?: Node;
  disabled?: boolean;
  /** Explicit id; otherwise one is generated when a `label` is present. */
  id?: string;
  /** Extra class names appended to the box. */
  class?: string;
  /** Any extra attributes spread onto the `<input>` (e.g. `placeholder`, `value`, `type`, `aria-*`). */
  attrs?: Record<string, string>;
}

/** A hairline text field; pass label/hint/error/icons via `opts`. Returns the
    bare box when no label/hint/error, else a labelled field wrapper. */
export function input(opts: InputOptions = {}): HTMLDivElement {
  ensureStyles("input", CSS);
  const { label, hint, error, size = "md", block, leadingIcon, trailingIcon, disabled } = opts;
  const fieldId = opts.id ?? (label ? `dc-${Math.random().toString(36).slice(2, 8)}` : undefined);

  const boxClasses = [
    "dc-input",
    size !== "md" && `dc-input--${size}`,
    block && "dc-input--block",
    error && "dc-input--invalid",
    disabled && "dc-input--disabled",
    opts.class,
  ]
    .filter(Boolean)
    .join(" ");

  const field = el(
    "input",
    {
      id: fieldId ?? null,
      disabled,
      "aria-invalid": error ? "true" : null,
    },
  );
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) field.setAttribute(k, v);

  const box = el(
    "div",
    { class: boxClasses },
    leadingIcon ? el("span", { class: "dc-input__adorn" }, leadingIcon) : null,
    field,
    trailingIcon ? el("span", { class: "dc-input__adorn" }, trailingIcon) : null,
  );

  if (!label && !hint && !error) return box;

  return el(
    "div",
    { class: `dc-field${block ? " dc-field--block" : ""}` },
    label
      ? el("label", { class: "dc-field__label", for: fieldId ?? null }, label)
      : null,
    box,
    error || hint
      ? el(
          "span",
          { class: `dc-field__hint${error ? " dc-field__hint--error" : ""}` },
          error || hint,
        )
      : null,
  );
}
