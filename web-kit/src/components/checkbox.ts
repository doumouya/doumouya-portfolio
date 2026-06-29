import { el, ensureStyles, type Child } from "../el";

const CSS = `
.dc-check{ display:inline-flex; align-items:center; gap:var(--space-2); cursor:pointer; user-select:none; font:var(--font-body); color:var(--text); }
.dc-check input{ position:absolute; opacity:0; width:1px; height:1px; }
.dc-check__box{
  position:relative; flex:none; width:1.05rem; height:1.05rem;
  border:var(--border-width) solid var(--border-strong); border-radius:var(--radius-xs);
  background:var(--surface); transition:var(--transition-control);
}
.dc-check__box::after{
  content:""; position:absolute; left:0.3rem; top:0.13rem;
  width:0.28rem; height:0.55rem; border:solid #fff; border-width:0 2px 2px 0;
  transform:rotate(45deg) scale(0); transform-origin:center; transition:transform var(--dur-fast) var(--ease-standard);
}
.dc-check:hover .dc-check__box{ border-color:var(--accent); }
.dc-check input:checked + .dc-check__box{ background:var(--accent); border-color:var(--accent); }
.dc-check input:checked + .dc-check__box::after{ transform:rotate(45deg) scale(1); }
.dc-check input:indeterminate + .dc-check__box{ background:var(--accent); border-color:var(--accent); }
.dc-check input:indeterminate + .dc-check__box::after{
  transform:none; left:0.2rem; top:0.45rem; width:0.5rem; height:0; border-width:0 0 2px 0; border-color:#fff;
}
.dc-check input:focus-visible + .dc-check__box{ outline:var(--focus-ring); outline-offset:2px; }
.dc-check--disabled{ opacity:.5; cursor:not-allowed; }
.dc-check__label{ font-size:var(--text-md); }
.dc-check__label--mono{ font-family:var(--font-mono); font-size:var(--text-sm); }
`;

export interface CheckboxOptions {
  checked?: boolean;
  defaultChecked?: boolean;
  indeterminate?: boolean;
  onChange?: (event: Event) => void;
  mono?: boolean;
  disabled?: boolean;
  class?: string;
  attrs?: Record<string, string>;
}

export function checkbox(label: Child = null, opts: CheckboxOptions = {}): HTMLLabelElement {
  ensureStyles("checkbox", CSS);

  const indeterminate = opts.indeterminate ?? false;
  const disabled = opts.disabled ?? false;
  const mono = opts.mono ?? false;

  const classes = ["dc-check", disabled && "dc-check--disabled", opts.class]
    .filter(Boolean)
    .join(" ");

  const input = el("input", { type: "checkbox" });
  if (opts.checked !== undefined) input.checked = opts.checked;
  if (opts.defaultChecked !== undefined) input.defaultChecked = opts.defaultChecked;
  if (disabled) input.disabled = true;
  if (opts.onChange) input.addEventListener("change", opts.onChange);
  input.indeterminate = indeterminate;
  if (opts.attrs) {
    for (const [k, v] of Object.entries(opts.attrs)) input.setAttribute(k, v);
  }

  const box = el("span", { class: "dc-check__box", "aria-hidden": "true" });

  const children: Child[] = [input, box];
  if (label != null) {
    const labelClasses = ["dc-check__label", mono && "dc-check__label--mono"]
      .filter(Boolean)
      .join(" ");
    children.push(el("span", { class: labelClasses }, label));
  }

  return el("label", { class: classes }, ...children);
}
