import { el, ensureStyles, type Child } from "../el";

const CSS = `
.dc-code{
  font-family:var(--font-mono); font-size:var(--text-sm);
  font-variant-numeric:var(--numeric-tabular);
}
.dc-code--inline{
  padding:.05rem .3rem; border-radius:var(--radius-xs);
  background:var(--surface-subtle); border:var(--border-width) solid var(--border-subtle);
  color:var(--text); white-space:nowrap;
}
.dc-code--accent{ color:var(--accent); background:var(--accent-tint); border-color:transparent; }
.dc-code--muted{ color:var(--text-muted); }
.dc-code--block{
  display:block; padding:var(--space-3) var(--space-4); margin:0;
  background:var(--surface-subtle); border:var(--border-width) solid var(--border);
  border-radius:var(--radius); color:var(--text);
  font-size:var(--text-sm); line-height:var(--leading); overflow:auto; white-space:pre;
}
.dc-code--truncate{ max-width:14rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; vertical-align:bottom; display:inline-block; }
`;

export type CodeTone = "default" | "accent" | "muted";

export interface CodeOptions {
  block?: boolean;
  tone?: CodeTone;
  truncate?: boolean;
  class?: string;
  attrs?: Record<string, string>;
}

export function code(children: Child, opts: CodeOptions = {}): HTMLElement {
  ensureStyles("code", CSS);
  if (opts.block) {
    const classes = ["dc-code", "dc-code--block", opts.class].filter(Boolean).join(" ");
    const node = el("pre", { class: classes }, children);
    if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
    return node;
  }
  const classes = [
    "dc-code",
    "dc-code--inline",
    opts.tone && opts.tone !== "default" && `dc-code--${opts.tone}`,
    opts.truncate && "dc-code--truncate",
    opts.class,
  ]
    .filter(Boolean)
    .join(" ");
  const node = el("code", { class: classes }, children);
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  return node;
}
