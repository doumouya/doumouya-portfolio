/* qir.ts — the qir lowering engine, ported from the qir Correspondence design.
   One expression → canonical qir + SQL + HTTP. Lexicons (qir · English · Français ·
   your-own) are a localizable SKIN over one IR; "your own" renames every keyword
   (the custom_label mechanism). The IR is the truth; SQL/HTTP are projections. */

export type LexId = "qir" | "en" | "fr" | "custom";
export type Dialect = "postgres" | "mysql" | "sqlite";

export interface Clause {
  source: string | null;
  where: string | null;
  select: string[];
  order: { col: string | null; dir: "asc" | "desc" } | null;
  limit: number | null;
  offset: number;
  notes: string[];
}
export interface Completion { label: string; snippet: string; hint: string; }
interface Rule { re: RegExp; apply: (m: RegExpExecArray, c: Clause) => void }
export interface Lexicon {
  rules: Rule[];
  completions: Completion[];
  mapping: { label: string; canon: string }[] | null;
  normalize?: (line: string) => string;
}
export type CustomMap = Record<string, string>;

const cols = (s: string): string[] => s.split(",").map((x) => x.trim()).filter(Boolean);

export const CANON_KEYS = ["read", "where", "select", "order", "limit", "offset", "asc", "desc", "=", ">", "<"];
export const IDENT: CustomMap = { read: "read", where: "where", select: "select", order: "order", limit: "limit", offset: "offset", asc: "asc", desc: "desc", "=": "=", ">": ">", "<": "<" };

function qirRules(): Rule[] {
  return [
    { re: /^read\s+(\w+)/i, apply: (m, c) => { c.source = m[1] ?? null; } },
    { re: /^where\s+(.+)/i, apply: (m, c) => { c.where = (m[1] ?? "").trim(); } },
    { re: /^select\s+(.+)/i, apply: (m, c) => { c.select = cols(m[1] ?? ""); } },
    { re: /^order\s+(\w+)\s+(asc|desc)/i, apply: (m, c) => { c.order = { col: m[1] ?? null, dir: (m[2] ?? "asc").toLowerCase() as "asc" | "desc" }; } },
    { re: /^limit\s+(\d+)(?:\s+offset\s+(\d+))?/i, apply: (m, c) => { c.limit = +(m[1] ?? 0); c.offset = m[2] ? +m[2] : 0; } },
  ];
}

function comps(a: CustomMap): Completion[] {
  const S = [
    { id: "read", hint: "source → FROM · GET /‹table›", snip: a["read"] + " ‹table›" },
    { id: "where", hint: "filter rows → WHERE · ?field=value", snip: a["where"] + " ‹field› " + a["="] + ' "‹value›"' },
    { id: "select", hint: "project columns → SELECT · ?fields", snip: a["select"] + " ‹col›, ‹col›" },
    { id: "order", hint: "sort → ORDER BY · ?sort", snip: a["order"] + " ‹col› " + a["desc"] },
    { id: "limit", hint: "window → LIMIT / OFFSET", snip: a["limit"] + " ‹n› " + a["offset"] + " ‹m›" },
  ];
  const out: Completion[] = S.map((s) => ({ label: a[s.id] ?? "", snippet: s.snip, hint: s.hint }));
  out.push({ label: a["desc"] ?? "", snippet: a["desc"] ?? "", hint: "descending (with order)" });
  out.push({ label: a["asc"] ?? "", snippet: a["asc"] ?? "", hint: "ascending (with order)" });
  out.push({ label: a[">"] ?? "", snippet: a[">"] ?? "", hint: "greater-than (in where)" });
  out.push({ label: a["<"] ?? "", snippet: a["<"] ?? "", hint: "less-than (in where)" });
  return out.filter((x) => x.label);
}

function normalizeCustom(line: string, custom: CustomMap): string {
  const rev: Record<string, string> = {};
  for (const k in custom) { const w = custom[k]; if (w) { rev[w] = k; rev[w.toLowerCase()] = k; } }
  return line.split(/\s+/).map((tok) => rev[tok] ?? rev[tok.toLowerCase()] ?? tok).join(" ");
}

export function buildLexicons(custom: CustomMap): Record<LexId, Lexicon> {
  return {
    qir: {
      rules: qirRules(),
      completions: comps(IDENT),
      mapping: [
        { label: "read ‹table›", canon: "FROM · source" },
        { label: "where ‹pred›", canon: "WHERE" },
        { label: "select ‹cols›", canon: "SELECT" },
        { label: "order ‹col› ‹dir›", canon: "ORDER BY" },
        { label: "limit ‹n› offset ‹m›", canon: "LIMIT / OFFSET" },
      ],
    },
    en: {
      completions: [
        { label: "of", snippet: "of ‹table›", hint: "source → FROM" },
        { label: "in", snippet: 'in ‹field› "‹value›"', hint: "filter → WHERE" },
        { label: "show", snippet: "show ‹col›, ‹col›", hint: "project → SELECT" },
        { label: "sort", snippet: "sort from z to a on ‹col›", hint: "sort desc → ORDER BY" },
        { label: "from", snippet: "from rank ‹a› to ‹b›", hint: "window → LIMIT / OFFSET" },
      ],
      mapping: [
        { label: "of ‹table›", canon: "read → FROM" },
        { label: 'in ‹field› "‹v›"', canon: "where → WHERE" },
        { label: "show ‹cols›", canon: "select → SELECT" },
        { label: "sort from z to a on ‹col›", canon: "order → ORDER BY desc" },
        { label: "from rank ‹a› to ‹b›", canon: "limit → LIMIT / OFFSET" },
      ],
      rules: [
        { re: /^show\s+(.+)/i, apply: (m, c) => { c.select = cols(m[1] ?? ""); } },
        { re: /^of\s+(\w+)/i, apply: (m, c) => { c.source = m[1] ?? null; } },
        { re: /^in\s+(\w+)\s+"?([^"]+?)"?$/i, apply: (m, c) => { c.where = m[1] + ' = "' + (m[2] ?? "").trim() + '"'; } },
        { re: /^from\s+rank\s+(\d+)\s+to\s+(\d+)/i, apply: (m, c) => { const a = +(m[1] ?? 0), b = +(m[2] ?? 0); c.offset = a - 1; c.limit = b - a + 1; } },
        { re: /^sort\s+from\s+z\s+to\s+a\s+on\s+(\w+)/i, apply: (m, c) => { c.order = { col: m[1] ?? null, dir: "desc" }; } },
        { re: /^sort\s+from\s+a\s+to\s+z\s+on\s+(\w+)/i, apply: (m, c) => { c.order = { col: m[1] ?? null, dir: "asc" }; } },
      ],
    },
    fr: {
      completions: [
        { label: "de", snippet: "de ‹table›", hint: "source → FROM" },
        { label: "en", snippet: 'en région "‹value›"', hint: "filtre → WHERE" },
        { label: "montre", snippet: "montre ‹col›, ‹col›", hint: "projection → SELECT" },
        { label: "ordre", snippet: "ordre décroissant sur ‹col›", hint: "tri desc → ORDER BY" },
        { label: "du", snippet: "du numéro ‹a› au numéro ‹b›", hint: "fenêtre → LIMIT / OFFSET" },
      ],
      mapping: [
        { label: "de ‹table›", canon: "read → FROM" },
        { label: 'en région "‹v›"', canon: "where → WHERE" },
        { label: "montre ‹cols›", canon: "select → SELECT" },
        { label: "ordre décroissant sur ‹col›", canon: "order → ORDER BY desc" },
        { label: "du numéro ‹a› au numéro ‹b›", canon: "limit → LIMIT / OFFSET" },
      ],
      rules: [
        { re: /^montre\s+(.+)/i, apply: (m, c) => { c.select = cols(m[1] ?? ""); } },
        { re: /^de\s+(\w+)/i, apply: (m, c) => { c.source = m[1] ?? null; } },
        { re: /^en\s+r[ée]gion\s+"?([^"]+?)"?$/i, apply: (m, c) => { c.where = 'region = "' + (m[1] ?? "").trim() + '"'; } },
        { re: /^ordre\s+d[ée]croissant(?:\s+sur\s+(\w+))?/i, apply: (m, c) => { c.order = { col: m[1] ?? null, dir: "desc" }; } },
        { re: /^ordre\s+croissant(?:\s+sur\s+(\w+))?/i, apply: (m, c) => { c.order = { col: m[1] ?? null, dir: "asc" }; } },
        { re: /^du\s+num[ée]ro\s+(\d+)\s+au\s+num[ée]ro\s+(\d+)/i, apply: (m, c) => { const a = +(m[1] ?? 0), b = +(m[2] ?? 0); c.offset = a - 1; c.limit = b - a + 1; } },
      ],
    },
    custom: {
      rules: qirRules(),
      normalize: (line: string) => normalizeCustom(line, custom),
      completions: comps(custom),
      mapping: null,
    },
  };
}

export function resolve(text: string, lex: Lexicon): Clause {
  const c: Clause = { source: null, where: null, select: [], order: null, limit: null, offset: 0, notes: [] };
  (text || "").split("\n").forEach((raw) => {
    let line = raw.trim();
    if (!line) return;
    if (lex.normalize) line = lex.normalize(line);
    let matched = false;
    for (const rule of lex.rules) {
      const m = rule.re.exec(line);
      if (m) { rule.apply(m, c); matched = true; break; }
    }
    if (!matched) c.notes.push('ignored · "' + line + '" matched no stage');
  });
  if (c.order && !c.order.col) { c.order.col = c.select[0] ?? "id"; c.notes.push("order had no column → defaulted to " + c.order.col); }
  if (!c.source) c.notes.push("no source yet — add a read / of / de line");
  return c;
}

export function lowerQir(c: Clause): string {
  const L: string[] = [];
  if (c.source) L.push("read   " + c.source);
  if (c.where) L.push("where  " + c.where);
  if (c.select.length) L.push("select " + c.select.join(", "));
  if (c.order) L.push("order  " + c.order.col + " " + c.order.dir);
  if (c.limit != null) L.push("limit  " + c.limit + (c.offset ? " offset " + c.offset : ""));
  return L.join("\n") || "—";
}

export function lowerSql(c: Clause, dialect: Dialect, table?: string): string {
  const colsOut = c.select.length ? c.select.join(", ") : "*";
  let s = "SELECT " + colsOut + "\nFROM   " + (table ?? c.source ?? "?");
  if (c.where) s += "\nWHERE  " + c.where.replace(/"/g, "'");
  if (c.order) s += "\nORDER  BY " + c.order.col + " " + c.order.dir.toUpperCase();
  if (c.limit != null) {
    const m = c.offset || 0;
    s += "\n" + (m ? (dialect === "mysql" ? "LIMIT " + m + ", " + c.limit : "LIMIT " + c.limit + " OFFSET " + m) : "LIMIT " + c.limit);
  }
  return s + ";";
}

export function lowerHttp(c: Clause): string {
  const L = ["GET /" + (c.source ?? "?")];
  const p: string[] = [];
  if (c.where) {
    const wm = /^(\w+)\s*(=|!=|>=|<=|>|<)\s*"?([^"]*?)"?$/.exec(c.where);
    if (wm) {
      const opq = wm[2] === "=" ? "" : (({ ">": "gt:", "<": "lt:", ">=": "gte:", "<=": "lte:", "!=": "ne:" } as Record<string, string>)[wm[2] ?? ""] ?? "");
      p.push(wm[1] + "=" + opq + (wm[3] ?? "").trim());
    } else p.push("filter=" + c.where);
  }
  if (c.select.length) p.push("fields=" + c.select.join(","));
  if (c.order) p.push("sort=" + (c.order.dir === "desc" ? "-" : "") + c.order.col);
  if (c.limit != null) p.push("limit=" + c.limit);
  if (c.offset) p.push("offset=" + c.offset);
  p.forEach((x, i) => L.push("    " + (i === 0 ? "?" : "&") + x));
  return L.join("\n");
}

/** SQL to actually RUN on the engine (table `t`), independent of display dialect. */
export function runnableSql(c: Clause): string {
  return lowerSql(c, "postgres", "t");
}
