/* redpash unified shell — view layer. Pure render functions: each takes the
   shell Ctx (state + actions) and returns DOM via web-kit's el()/icon()/badge().
   app.ts owns state + the render loop; nothing here mutates state directly. */
import { el } from "../../web-kit/src/el";
import { icon } from "../../web-kit/src/components/icon";
import { badge } from "../../web-kit/src/components/badge";
import {
  CHANNELS, GROUP_ORDER, composerFor, headerFor,
  ACCENTS, DENSITIES, THEMES, BARS, PALETTE_COMMANDS, tint, initials, internalLabel, internalHint,
} from "./data";
import type { Channel, Msg, MsgKind, HeaderAction } from "./data";

// ---------- shell state + actions (owned by app.ts) ----------
export interface CallState { kind: string; name: string; color: string; initials: string; }
export interface State {
  activeId: string;
  accent: string;
  density: string;
  theme: string;
  settingsOpen: boolean;
  internalNote: boolean;
  call: CallState | null;
  callMuted: boolean;
  input: string;
  emailTo: string;
  emailSubject: string;
  seq: number;
  threads: Record<string, Msg[]>;
  hidden: Record<string, boolean>;
  collapsed: Record<string, boolean>;
  palette: { open: boolean; query: string; index: number };
}
export interface Actions {
  open(id: string): void;
  toggleSettings(): void;
  setAccent(c: string): void;
  setDensity(d: string): void;
  setTheme(t: string): void;
  send(): void;
  attach(type: MsgKind): void;
  startCall(kind: "voice" | "video"): void;
  endCall(): void;
  toggleMute(): void;
  toggleInternal(): void;
  hideChannel(id: string): void;
  restoreHidden(): void;
  toggleGroup(name: string): void;
  headerAction(a: HeaderAction): void;
  paletteOpen(): void;
  paletteClose(): void;
  paletteSetQuery(q: string): void;
  paletteMove(dir: number): void;
  palettePick(i: number): void;
}
export interface Ctx { state: State; actions: Actions; }

export function activeChannel(state: State): Channel {
  return CHANNELS.find((c) => c.id === state.activeId) ?? (CHANNELS[0] as Channel);
}

// ---------- topbar (invariant) ----------
export function topbar(ctx: Ctx): HTMLElement {
  return el("header", { class: "topbar" },
    el("span", { class: "tb-logo" }),
    el("strong", { class: "tb-word" }, "redpash"),
    el("span", { class: "tb-sub" }, "· unified inbox"),
    el("div", { class: "tb-center" },
      el("button", { class: "tb-search", onClick: () => ctx.actions.paletteOpen() },
        icon("search", { size: ".85rem" }),
        el("span", { class: "tb-search-label" }, "Search…"),
        el("span", { class: "tb-kbd" }, "⌘K"))),
    el("span", { class: "pill" }, el("span", { class: "pill-dot" }), "local · offline-ready"),
    el("button", { class: "tb-btn", onClick: () => ctx.actions.toggleSettings() }, icon("sliders", { size: "1rem" }), "Display"));
}

// ---------- rail (by-system; hide/restore + group collapse are net-new) ----------
interface Group { name: string; items: Channel[]; }
function groups(state: State): Group[] {
  const visible = CHANNELS.filter((c) => !state.hidden[c.id]);
  return GROUP_ORDER
    .map((name) => ({ name, items: visible.filter((c) => c.group === name) }))
    .filter((g) => g.items.length > 0);
}

function channelRow(ctx: Ctx, c: Channel): HTMLElement {
  const { state, actions } = ctx;
  const active = c.id === state.activeId;
  const row = el("div", {
    class: "chan" + (active ? " active" : ""),
    role: "button", tabindex: "0",
    style: active ? "background:color-mix(in srgb, var(--accent) 9%, var(--surface))" : "",
    onClick: () => actions.open(c.id),
  },
    el("span", { class: "chan-tile", style: `background:${tint(c.color, 16)}; color:${c.color}` },
      icon(c.icon, { size: "1rem" }),
      c.presence ? el("span", { class: "chan-presence" }) : null),
    el("span", { class: "chan-text" },
      el("span", { class: "chan-name" }, c.name),
      el("span", { class: "chan-sub" }, c.sub)),
    c.unread > 0 ? el("span", { class: "chan-unread", style: `background:${c.color}` }, String(c.unread)) : null,
    el("button", { class: "chan-hide", title: "Hide channel", onClick: (e: Event) => { e.stopPropagation(); actions.hideChannel(c.id); } }, "×"));
  return row;
}

export function rail(ctx: Ctx): HTMLElement {
  const { state, actions } = ctx;
  const gs = groups(state);
  const hiddenCount = Object.keys(state.hidden).filter((k) => state.hidden[k]).length;
  return el("aside", { class: "rail" },
    el("div", { class: "rail-search-wrap" },
      el("div", { class: "rail-search", title: "Search all channels (⌘K)", onClick: () => actions.paletteOpen() }, icon("search", { size: ".9rem" }), "Search all channels")),
    ...gs.map((g) => {
      const collapsed = !!state.collapsed[g.name];
      return el("div", {},
        el("div", { class: "rg-head", role: "button", onClick: () => actions.toggleGroup(g.name) },
          icon(collapsed ? "chevron-right" : "chevron-down", { size: ".7rem", class: "rg-chevron" }),
          el("span", { class: "rg-name" }, g.name),
          el("span", { class: "rg-line" }),
          el("span", { class: "rg-count" }, String(g.items.length))),
        collapsed ? null : el("div", {}, ...g.items.map((c) => channelRow(ctx, c))));
    }),
    hiddenCount > 0
      ? el("div", { class: "rail-restore" }, el("button", { onClick: () => actions.restoreHidden() }, `restore ${hiddenCount} hidden`))
      : null);
}

// ---------- context header (morphs) ----------
export function header(ctx: Ctx): HTMLElement {
  const { actions } = ctx;
  const ch = activeChannel(ctx.state);
  const h = headerFor(ch);
  return el("div", { class: "ctx-header" },
    el("div", { class: "ctx-icon", style: `background:${tint(h.color, 16)}; color:${h.color}` }, icon(h.icon, { size: "1.1rem" })),
    el("div", { class: "ctx-title-block" },
      el("div", { class: "ctx-name-row" },
        el("span", { class: "ctx-name" }, h.name),
        h.hasBadge ? badge(h.badge, { tone: "warning", variant: "soft", dot: true }) : null),
      el("div", { class: "ctx-sub-row" },
        h.presence ? el("span", { class: "ctx-presence" }) : null,
        el("span", { class: "ctx-sub" }, h.sub))),
    el("span", { class: "spacer" }),
    el("div", { class: "ctx-actions" }, ...h.actions.map((a) =>
      el("button", { class: "ctx-action", title: a.label, onClick: () => actions.headerAction(a) }, icon(a.icon, { size: "1rem" })))));
}

// ---------- thread + the 12 message cards ----------
function dataTable(head: string[], rows: (string | null)[][]): HTMLElement {
  return el("table", { class: "data-table" },
    el("thead", {}, el("tr", {}, ...head.map((h) => el("th", {}, h)))),
    el("tbody", {}, ...rows.map((r) => el("tr", {}, ...r.map((cell) =>
      el("td", { class: cell == null ? "null" : "" }, cell == null ? "—" : cell))))));
}

function card(ctx: Ctx, m: Msg, ch: Channel, mine: boolean): HTMLElement {
  const radius = mine ? "12px 12px 4px 12px" : "12px 12px 12px 4px";
  switch (m.t) {
    case "event":
      return el("div", { class: "event-pill", style: `color:${m.tone ?? "var(--text-muted)"}` }, `${m.text} · ${m.time ?? ""}`);
    case "text": {
      const bg = mine ? "var(--accent)" : "var(--surface-subtle)";
      const color = mine ? "var(--text-on-accent)" : "var(--text)";
      const bd = mine ? "transparent" : "var(--border)";
      return el("div", { class: "bubble", style: `background:${bg}; color:${color}; border:1px solid ${bd}; border-radius:${radius}` }, m.text);
    }
    case "sms": {
      const bg = mine ? "var(--accent)" : "var(--surface-subtle)";
      const color = mine ? "var(--text-on-accent)" : "var(--text)";
      const bd = mine ? "transparent" : "var(--border)";
      return el("div", { style: `display:flex; flex-direction:column; gap:.2rem; align-items:${mine ? "flex-end" : "flex-start"}` },
        el("div", { class: "bubble mono", style: `background:${bg}; color:${color}; border:1px solid ${bd}; border-radius:${radius}` }, m.text),
        m.receipt ? el("div", { class: "receipt" }, m.receipt) : null);
    }
    case "comment": {
      const internal = !!m.internal;
      const bg = mine ? (internal ? "var(--warning-tint)" : "var(--accent)") : "var(--surface-subtle)";
      const color = mine && !internal ? "var(--text-on-accent)" : "var(--text)";
      const bd = internal ? "color-mix(in srgb, var(--warning) 30%, transparent)" : (mine ? "transparent" : "var(--border)");
      return el("div", { class: "bubble", style: `background:${bg}; color:${color}; border:1px solid ${bd}; border-radius:${radius}` },
        internal ? el("span", { class: "internal-chip" }, icon("lock-fill", { size: ".7rem" }), " internal") : null,
        internal ? " " : null, m.text);
    }
    case "checks":
      return el("div", { class: "checks-card" },
        el("div", { class: "checks-title" }, "close-checks"),
        ...(m.checks ?? []).map((ck) => el("div", { class: "check-row", style: `color:${ck.ok ? "var(--text)" : "var(--text-muted)"}` },
          icon(ck.ok ? "check-circle-fill" : "circle", { size: ".85rem", style: { color: ck.ok ? "var(--success)" : "var(--text-subtle)" } }),
          ck.label)));
    case "audio": {
      const bg = mine ? "var(--accent)" : "var(--surface-subtle)";
      const btnBg = mine ? "rgba(255,255,255,.2)" : "var(--accent)";
      const btnColor = mine ? "#fff" : "var(--text-on-accent)";
      const barColor = mine ? "rgba(255,255,255,.9)" : "var(--accent)";
      return el("div", { class: "audio-pill", style: `background:${bg}; border-radius:${radius}; color:${mine ? "var(--text-on-accent)" : "var(--text)"}` },
        el("button", { class: "audio-btn", style: `background:${btnBg}; color:${btnColor}` }, icon("play-fill", { size: ".9rem" })),
        el("div", { class: "waveform" }, ...BARS.map((h) => el("span", { class: "wave-bar", style: `height:${h}px; background:${barColor}` }))),
        el("span", { class: "audio-dur" }, m.dur));
    }
    case "csv":
    case "file": {
      const isCsv = m.t === "csv";
      const fileIcon = isCsv ? "filetype-csv" : m.fileKind === "image" ? "image" : m.fileKind === "pdf" ? "filetype-pdf" : "file-earmark";
      const fileColor = isCsv ? "var(--chart-4)" : m.fileKind === "pdf" ? "var(--danger)" : "var(--chart-1)";
      const meta = [m.rows, m.size].filter(Boolean).join(" · ");
      return el("div", { class: "file-card" },
        el("div", { class: "file-tile", style: `background:${tint(fileColor, 16)}; color:${fileColor}` }, icon(fileIcon, { size: "1.05rem" })),
        el("div", { class: "file-text" }, el("div", { class: "file-name" }, m.name), el("div", { class: "file-meta" }, meta)),
        isCsv ? el("button", { class: "file-action", onClick: () => ctx.actions.open("data-acme") }, "Open in data workspace", icon("arrow-right-short", { size: "1rem" })) : null,
        icon("download", { class: "file-dl", size: ".95rem" }));
    }
    case "youtube":
      return el("div", { class: "yt-card" },
        el("div", { class: "yt-thumb" },
          el("div", { class: "yt-play" }, icon("play-fill")),
          el("span", { class: "yt-badge" }, "YouTube"),
          el("span", { class: "yt-len" }, m.length),
          el("span", { class: "yt-progress" })),
        el("div", { class: "yt-foot" }, el("div", { class: "yt-title" }, m.title), el("div", { class: "yt-channel" }, m.channel)));
    case "call": {
      const answered = !!m.answered;
      const callColor = answered ? "var(--success)" : "var(--danger)";
      const callIcon = m.callKind === "video" ? "camera-video-fill" : "telephone-fill";
      return el("div", { class: "call-pill" },
        el("div", { class: "call-tile", style: `background:${tint(callColor, 16)}; color:${callColor}` }, icon(callIcon, { size: ".9rem" })),
        el("div", {}, el("div", { class: "call-title" }, m.callTitle), el("div", { class: "call-meta" }, m.callMeta)));
    }
    case "email": {
      const emColor = mine ? "var(--accent)" : ch.color;
      return el("div", { class: "email-card" },
        el("div", { class: "email-head" },
          el("div", { class: "email-av", style: `background:${tint(emColor, 18)}; color:${emColor}` }, initials(m.from ?? "")),
          el("div", { style: "flex:1; min-width:0" }, el("div", { class: "email-from" }, m.from), el("div", { class: "email-addr" }, m.addr)),
          el("span", { class: "email-addr" }, m.time),
          icon("star", { class: "file-dl", size: ".95rem" })),
        el("div", { class: "email-body" },
          el("div", { class: "email-to" }, "to " + (m.to ?? "")),
          el("div", { class: "email-subject" }, m.subject),
          el("div", { class: "email-text" }, m.body),
          m.attachName ? el("div", { class: "email-attach" },
            el("div", { class: "email-attach-tile" }, icon("filetype-pdf", { size: ".95rem" })),
            el("div", { style: "flex:1; min-width:0" }, el("div", { class: "email-attach-name" }, m.attachName), el("div", { class: "email-attach-size" }, m.attachSize)),
            icon("download", { class: "file-dl", size: ".95rem" })) : null));
    }
    case "datacmd":
      return el("div", { class: "datacmd", style: `border-radius:${mine ? "12px 12px 4px 12px" : "12px"}` }, m.text);
    case "data":
      return el("div", { class: "data-card" },
        el("div", { class: "data-head" },
          el("span", { class: "data-interp" }, m.interp),
          el("span", { class: "spacer" }),
          el("span", { class: "data-meta" }, m.metaText)),
        m.qir && m.qir.length ? el("div", { class: "qir-strip" }, ...m.qir.map((l) => el("div", { class: "qir-line" }, l))) : null,
        el("div", { class: "data-table-wrap" }, dataTable(m.head ?? [], m.dataRows ?? [])));
    default:
      return el("div", {});
  }
}

function messageRow(ctx: Ctx, m: Msg, ch: Channel): HTMLElement {
  const centered = m.t === "event" || m.t === "call";
  const mine = !!m.mine;
  const showAvatar = !mine && !m.sys && !centered;
  const justify = centered ? "center" : mine ? "flex-end" : "flex-start";
  const showMeta = !!m.who && !m.sys && !centered && m.t !== "email" && m.t !== "datacmd";
  return el("div", { class: "msg-row", style: `justify-content:${justify}` },
    showAvatar ? el("span", { class: "msg-avatar", style: `background:${tint(m.avColor ?? ch.color, 18)}; color:${m.avColor ?? ch.color}` }, initials(m.who ?? "")) : null,
    el("div", { class: "msg-col", style: `align-items:${justify}` },
      showMeta ? el("div", { class: "msg-meta" },
        el("span", { class: "msg-meta-name" }, mine ? "You" : m.who),
        el("span", { class: "msg-time" }, m.time ?? "")) : null,
      card(ctx, m, ch, mine)));
}

export function thread(ctx: Ctx): HTMLElement {
  const ch = activeChannel(ctx.state);
  const msgs = ctx.state.threads[ch.id] ?? [];
  return el("div", { class: "thread" },
    el("div", { class: "thread-inner" }, ...msgs.map((m) => messageRow(ctx, m, ch))));
}

// ---------- composer (morphs across 5 modes) ----------
function autoGrow(ta: HTMLTextAreaElement): void {
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 128) + "px";
}

export function composer(ctx: Ctx): HTMLElement {
  const { state, actions } = ctx;
  const ch = activeChannel(state);
  const v = composerFor(ch);

  const ta = el("textarea", { class: "composer-ta" + (v.mono ? " mono" : ""), rows: "1", spellcheck: false, placeholder: v.placeholder }) as HTMLTextAreaElement;
  ta.value = state.input;
  const count = v.showCharCount ? el("span", { class: "composer-count" }, `${state.input.length}/160`) : null;
  ta.addEventListener("input", () => {
    state.input = ta.value;
    autoGrow(ta);
    if (count) count.textContent = `${ta.value.length}/160`;
  });
  ta.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); actions.send(); }
  });

  const shell = el("div", { class: "composer-shell", style: `border-radius:${v.shellRadius}` },
    ...v.attaches.map((a) => el("button", { class: "composer-attach", title: a.label, onClick: () => actions.attach(a.type) }, icon(a.icon, { size: ".95rem" }))),
    ta,
    count,
    el("button", { class: "composer-send", onClick: () => actions.send() }, v.sendLabel, icon(v.sendIcon, { size: ".85rem" })));

  const emailHead = v.showTo
    ? el("div", { class: "composer-email-head" },
      el("div", { class: "composer-email-row" }, el("span", { class: "composer-email-label" }, "To"), el("span", { class: "composer-email-val" }, state.emailTo)),
      el("div", { class: "composer-email-row" }, el("span", { class: "composer-email-label" }, "Subject"), el("span", { class: "composer-email-val" }, state.emailSubject)))
    : null;

  const internalRow = v.showInternal
    ? el("div", { class: "composer-internal" },
      el("button", {
        class: "internal-toggle",
        style: state.internalNote ? "border-color:color-mix(in srgb, var(--warning) 40%, transparent); background:var(--warning-tint); color:var(--warning)" : "",
        onClick: () => actions.toggleInternal(),
      }, icon("lock-fill", { size: ".8rem" }), internalLabel(state.internalNote)),
      el("span", { class: "internal-hint" }, internalHint(state.internalNote)))
    : null;

  return el("div", { class: "composer" },
    el("div", { class: "composer-inner" },
      emailHead,
      internalRow,
      shell,
      el("div", { class: "composer-foot" },
        el("span", { class: "composer-tag", style: `color:${ch.color}` }, v.contextTag),
        " · " + v.hint)));
}

// ---------- settings popover ----------
function section(label: string, body: HTMLElement): HTMLElement {
  return el("div", {}, el("div", { class: "settings-section-label" }, label), body);
}
function segmented(items: [string, string][], val: string, onPick: (v: string) => void): HTMLElement {
  return el("div", { class: "segmented" }, ...items.map(([v, lbl]) =>
    el("button", { class: val === v ? "on" : "", onClick: () => onPick(v) }, lbl)));
}
export function settings(ctx: Ctx): HTMLElement[] {
  const { state, actions } = ctx;
  if (!state.settingsOpen) return [];
  const scrim = el("div", { class: "scrim", onClick: () => actions.toggleSettings() });

  const accentRow = el("div", { class: "accent-row" },
    ...ACCENTS.map((a) => el("button", {
      class: "accent-swatch" + (state.accent === a.c ? " selected" : ""),
      title: a.name,
      style: `background:${a.c}; color:${a.c}`,
      onClick: () => actions.setAccent(a.c),
    }, state.accent === a.c ? icon("check-lg", { size: ".8rem", style: { color: "#fff" } }) : null)));

  const head = el("div", { class: "settings-head" },
    icon("sliders", { size: ".9rem" }),
    el("span", { class: "settings-title" }, "Display"),
    el("button", { class: "settings-close", title: "Close", onClick: () => actions.toggleSettings() }, icon("x-lg", { size: ".9rem" })));

  const body = el("div", { class: "settings-body" },
    section("Accent", accentRow),
    section("Size · density", segmented(DENSITIES, state.density, (v) => actions.setDensity(v))),
    section("Theme", segmented(THEMES, state.theme, (v) => actions.setTheme(v))),
    el("div", { class: "settings-foot" }, "Size scales the whole rem-based system — type, spacing and controls — from one root variable. Nothing here leaves your device."));

  const panel = el("div", { class: "settings" }, head, body);
  return [scrim, panel];
}

// ---------- call overlay ----------
export function call(ctx: Ctx): HTMLElement | null {
  const { state, actions } = ctx;
  if (!state.call) return null;
  const c = state.call;
  const isVideo = c.kind === "video";
  return el("div", { class: "call-overlay" },
    el("div", { class: "call-card" },
      el("div", { class: "call-top" },
        el("div", { class: "call-av", style: `background:${tint(c.color, 20)}; color:${c.color}` }, c.initials),
        el("div", { class: "call-name" }, c.name),
        el("div", { class: "call-status" },
          icon(isVideo ? "camera-video-fill" : "telephone-fill", { size: ".85rem" }),
          isVideo ? "Video call · ringing…" : "Voice call · ringing…")),
      isVideo ? el("div", { class: "call-cam" }, "camera preview") : null,
      el("div", { class: "call-controls" },
        el("button", { class: "call-ctl mute" + (state.callMuted ? " on" : ""), title: "Mute", onClick: () => actions.toggleMute() },
          icon(state.callMuted ? "mic-mute-fill" : "mic-fill", { size: ".95rem" })),
        el("button", { class: "call-ctl end", title: "End call", onClick: () => actions.endCall() }, icon("telephone-x-fill")),
        el("button", { class: "call-ctl keypad", title: "Keypad" }, icon("grid-3x3-gap-fill", { size: ".95rem" })))));
}

// ---------- omnisearch palette (⌘K) ----------
export interface PaletteItem { kind: "channel" | "command" | "message"; icon: string; label: string; hint: string; channelId?: string; command?: string; }

export function buildPalette(state: State): PaletteItem[] {
  const q = state.palette.query.trim().toLowerCase();
  const items: PaletteItem[] = [];
  for (const c of CHANNELS) {
    if (state.hidden[c.id]) continue;
    if (!q || c.name.toLowerCase().includes(q) || c.group.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q))
      items.push({ kind: "channel", icon: c.icon, label: c.name, hint: c.group, channelId: c.id });
  }
  for (const cmd of PALETTE_COMMANDS) {
    if (!q || cmd.label.toLowerCase().includes(q))
      items.push({ kind: "command", icon: cmd.icon, label: cmd.label, hint: cmd.hint, command: cmd.id });
  }
  if (q) {
    let count = 0;
    for (const c of CHANNELS) {
      for (const m of state.threads[c.id] ?? []) {
        if (count >= 6) break;
        const txt = m.text ?? m.body ?? m.subject ?? "";
        if (txt && txt.toLowerCase().includes(q)) {
          items.push({ kind: "message", icon: "chat-text", label: txt.length > 56 ? txt.slice(0, 56) + "…" : txt, hint: c.name, channelId: c.id });
          count++;
        }
      }
    }
  }
  return items;
}

export function palette(ctx: Ctx): HTMLElement | null {
  const { state, actions } = ctx;
  if (!state.palette.open) return null;
  const items = buildPalette(state);
  const idx = items.length ? Math.max(0, Math.min(state.palette.index, items.length - 1)) : 0;
  const input = el("input", { class: "palette-input", placeholder: "Search channels, messages, commands…", spellcheck: "false" }) as HTMLInputElement;
  input.value = state.palette.query;
  input.addEventListener("input", () => actions.paletteSetQuery(input.value));
  input.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); actions.paletteMove(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); actions.paletteMove(-1); }
    else if (e.key === "Enter") { e.preventDefault(); actions.palettePick(idx); }
    else if (e.key === "Escape") { e.preventDefault(); actions.paletteClose(); }
  });
  const rows = items.map((it, i) => {
    const row = el("div", { class: "palette-item" + (i === idx ? " active" : "") },
      el("span", { class: "palette-item-icon" }, icon(it.icon, { size: ".9rem" })),
      el("span", { class: "palette-label" }, it.label),
      el("span", { class: "palette-kind" }, it.kind),
      el("span", { class: "palette-hint" }, it.hint));
    row.addEventListener("mousedown", (e: Event) => { e.preventDefault(); actions.palettePick(i); });
    return row;
  });
  const box = el("div", { class: "palette" },
    el("div", { class: "palette-input-row" }, icon("search", { size: "1rem" }), input, el("span", { class: "tb-kbd" }, "esc")),
    el("div", { class: "palette-list" }, items.length ? null : el("div", { class: "palette-empty" }, "No matches"), ...rows));
  box.addEventListener("click", (e: Event) => e.stopPropagation());
  return el("div", { class: "palette-scrim", onClick: () => actions.paletteClose() }, box);
}
