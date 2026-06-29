/* redpash unified shell — model layer.
   Channels, the composer/header/message registries, the settings registries and
   the seed threads, ported verbatim from the RedPash Inbox design mock. The view
   layer (views.ts) turns these records into DOM; app.ts owns mutable state. */

// ---------- channels ----------
export interface Channel {
  id: string;
  group: string;
  name: string;
  sub: string;
  icon: string;       // Bootstrap Icons name
  color: string;      // CSS color / var() — the channel's identity hue
  presence?: boolean;
  badge?: string;     // header badge label (e.g. "review")
  unread: number;
}

export const CHANNELS: Channel[] = [
  { id: "case-rbac",    group: "Cases",           name: "entity-rbac",      sub: "workflow · in review", icon: "kanban",         color: "var(--chart-5)", badge: "review", unread: 0 },
  { id: "dm-amara",     group: "Direct messages", name: "Amara N.",         sub: "Acme Corp · customer", icon: "person-fill",    color: "var(--accent)",  presence: true,  unread: 2 },
  { id: "dm-kee",       group: "Direct messages", name: "kee",              sub: "teammate",             icon: "person-fill",    color: "var(--chart-1)", presence: true,  unread: 0 },
  { id: "mail-billing", group: "Email",           name: "billing@acme.co",  sub: "Re: March invoice",    icon: "envelope-fill",  color: "var(--chart-3)", unread: 1 },
  { id: "sms-otp",      group: "SMS",             name: "+254 712 555 019", sub: "OTP & alerts",         icon: "chat-dots-fill", color: "var(--chart-2)", unread: 0 },
  { id: "data-acme",    group: "Data workspace",  name: "acme_analytics",   sub: "3 files · ETL",        icon: "table",          color: "var(--chart-4)", unread: 0 },
];

export const GROUP_ORDER = ["Cases", "Direct messages", "Email", "SMS", "Data workspace"];

export type ComposerKind = "chat" | "email" | "sms" | "data" | "comment";
export function composerKind(ch: Channel): ComposerKind {
  return ch.group === "Cases" ? "comment"
    : ch.group === "Email" ? "email"
    : ch.group === "SMS" ? "sms"
    : ch.group === "Data workspace" ? "data"
    : "chat";
}

// ---------- messages ----------
export type MsgKind =
  | "event" | "text" | "sms" | "comment" | "audio" | "csv" | "file"
  | "youtube" | "call" | "email" | "checks" | "datacmd" | "data";

export interface Check { label: string; ok: boolean; }

export interface Msg {
  _k?: number;
  t: MsgKind;
  mine?: boolean;   // sent by "you" → right-aligned, accent bubble
  sys?: boolean;    // system line → no avatar / no meta
  who?: string;     // sender display name (meta line + avatar initials)
  avColor?: string; // avatar tint
  time?: string;
  text?: string;
  tone?: string;        // event color
  receipt?: string;     // sms delivery receipt
  internal?: boolean;   // case comment internal note
  checks?: Check[];
  dur?: string;         // audio duration
  // file / csv
  name?: string; size?: string; rows?: string; fileKind?: string;
  // youtube
  title?: string; channel?: string; length?: string;
  // call
  callKind?: string; answered?: boolean; callTitle?: string; callMeta?: string;
  // email
  from?: string; addr?: string; to?: string; subject?: string; body?: string;
  attachName?: string; attachSize?: string;
  // data
  interp?: string; metaText?: string; qir?: string[]; head?: string[]; dataRows?: (string | null)[][];
}

// ---------- composer registry ----------
export interface Attach { icon: string; label: string; type: MsgKind; }
export interface ComposerVM {
  kind: ComposerKind;
  placeholder: string;
  hint: string;
  font: string;
  sendIcon: string;
  sendLabel: string;
  attaches: Attach[];
  showTo: boolean;
  showInternal: boolean;
  showCharCount: boolean;
  contextTag: string;
  shellRadius: string;
  mono: boolean;
}

export function composerFor(ch: Channel): ComposerVM {
  const kind = composerKind(ch);
  const base = {
    font: "system-ui, sans-serif", sendIcon: "send-fill", sendLabel: "Send",
    attaches: [] as Attach[], showTo: false, showInternal: false, showCharCount: false,
    contextTag: ch.name, mono: false,
  };
  let v: Partial<ComposerVM> = {};
  if (kind === "chat") {
    v = {
      placeholder: `Message ${ch.name}…`,
      hint: "attach audio · pdf · csv · image · video link",
      attaches: [
        { icon: "mic-fill", label: "Voice message", type: "audio" },
        { icon: "filetype-pdf", label: "PDF", type: "file" },
        { icon: "filetype-csv", label: "CSV", type: "csv" },
        { icon: "image", label: "Image", type: "file" },
        { icon: "youtube", label: "Video link", type: "youtube" },
      ],
    };
  } else if (kind === "email") {
    v = { placeholder: "Write your reply…", hint: "rich email · attachments supported", showTo: true,
      attaches: [{ icon: "paperclip", label: "Attach", type: "file" }] };
  } else if (kind === "sms") {
    v = { placeholder: "Text message…", hint: "plain SMS · 160 chars / segment", font: "var(--font-mono)", mono: true, showCharCount: true };
  } else if (kind === "data") {
    v = { placeholder: "filter region = EMEA   ·   group mrr by region", font: "var(--font-mono)", mono: true,
      sendLabel: "Run", sendIcon: "play-fill", hint: "qir command → runs on the in-browser engine", contextTag: "qir" };
  } else { // comment
    v = { placeholder: "Write a comment…", hint: "comments post to the case thread", sendLabel: "Comment",
      showInternal: true, attaches: [{ icon: "paperclip", label: "Attach", type: "file" }] };
  }
  const merged = { kind, ...base, ...v } as ComposerVM;
  merged.shellRadius = merged.showTo ? "0 0 .6rem .6rem" : ".7rem";
  return merged;
}

export function internalLabel(internalNote: boolean): string { return internalNote ? "Internal note" : "Public comment"; }
export function internalHint(internalNote: boolean): string { return internalNote ? "visible to your team only" : "visible to everyone on the case"; }

// ---------- header registry ----------
export interface HeaderAction { icon: string; label: string; call?: "voice" | "video"; }
export interface HeaderVM {
  icon: string; color: string; name: string; sub: string; presence: boolean;
  hasBadge: boolean; badge: string; badgeTone: string; actions: HeaderAction[];
}

export function headerFor(ch: Channel): HeaderVM {
  const kind = composerKind(ch);
  let actions: HeaderAction[];
  if (kind === "chat") actions = [
    { icon: "telephone-fill", label: "Voice call", call: "voice" },
    { icon: "camera-video-fill", label: "Video call", call: "video" },
    { icon: "three-dots", label: "More" },
  ];
  else if (kind === "email") actions = [
    { icon: "star", label: "Star" }, { icon: "archive-fill", label: "Archive" }, { icon: "three-dots", label: "More" },
  ];
  else if (kind === "sms") actions = [
    { icon: "telephone-fill", label: "Call", call: "voice" }, { icon: "three-dots", label: "More" },
  ];
  else if (kind === "data") actions = [
    { icon: "box-arrow-up-right", label: "Open full workspace" }, { icon: "three-dots", label: "More" },
  ];
  else actions = [{ icon: "three-dots", label: "More" }];
  return {
    icon: ch.icon, color: ch.color, name: ch.name, sub: ch.sub, presence: !!ch.presence,
    hasBadge: !!ch.badge, badge: ch.badge ?? "", badgeTone: "warning", actions,
  };
}

// ---------- settings registries ----------
export const ACCENTS: { c: string; name: string }[] = [
  { c: "#2563eb", name: "Datacore blue" }, { c: "#4f46e5", name: "Indigo" },
  { c: "#0d9488", name: "Teal" }, { c: "#e11d48", name: "Rose" },
];
export const DENSITIES: [string, string][] = [["compact", "Compact"], ["cozy", "Cozy"], ["roomy", "Roomy"]];
export const THEMES: [string, string][] = [["light", "Light"], ["dark", "Dark"]];
export const DENSITY_PX: Record<string, string> = { compact: "13px", cozy: "14px", roomy: "16px" };

// audio waveform (30 bars, px heights)
export const BARS = [6,11,16,9,14,21,18,12,8,15,22,25,18,10,7,13,20,24,16,9,14,8,6,12,19,23,15,9,12,7];

// ---------- omnisearch command registry ----------
export interface PaletteCommand { id: string; label: string; hint: string; icon: string; }
export const PALETTE_COMMANDS: PaletteCommand[] = [
  { id: "theme", label: "Toggle light / dark theme", hint: "display", icon: "circle-half" },
  { id: "settings", label: "Open Display settings", hint: "display", icon: "sliders" },
  { id: "hide", label: "Hide current channel", hint: "rail", icon: "eye-slash" },
  { id: "restore", label: "Restore hidden channels", hint: "rail", icon: "arrow-counterclockwise" },
  { id: "call", label: "Start a voice call", hint: "action", icon: "telephone" },
];

// ---------- helpers ----------
export function tint(color: string, pct: number): string { return `color-mix(in srgb, ${color} ${pct}%, transparent)`; }
export function initials(name: string): string {
  if (!name) return "·";
  if (name[0] === "+" || /^[0-9]/.test(name)) return "#";
  const words = name.trim().split(/\s+/);
  if (words.length > 1) return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// ---------- seed threads (verbatim from the mock) ----------
export function seedThreads(): Record<string, Msg[]> {
  return {
    "case-rbac": [
      { t: "event", text: "workflow · backlog → progress", time: "Mon 09:01" },
      { t: "comment", who: "Sol Rivera", avColor: "var(--chart-5)", time: "Mon 09:04",
        text: "Heads up — the revoke needs to cascade to descendants or we leak access after a parent role is pulled. Can you fold that into the close?" },
      { t: "comment", mine: true, who: "You", time: "Mon 09:18",
        text: "Added revoke_cascades_to_descendants — green now. Pushing close-checks." },
      { t: "checks", who: "redpash", sys: true, checks: [
        { label: "tests-green", ok: true }, { label: "spec-updated", ok: true }, { label: "reviewed", ok: false } ] },
      { t: "event", tone: "var(--danger)", text: "blocked · close_preconditions_unmet · missing: reviewed", time: "Mon 09:21" },
      { t: "comment", who: "Sol Rivera", avColor: "var(--chart-5)", time: "Mon 09:24", text: "Reviewing now — give me ten." },
    ],
    "dm-amara": [
      { t: "text", who: "Amara N.", avColor: "var(--accent)", time: "09:32",
        text: "Hey! Could you pull the EMEA signups for Q1? Board deck is due this afternoon 🙏" },
      { t: "text", mine: true, who: "You", time: "09:33", text: "On it — running it now." },
      { t: "csv", mine: true, who: "You", time: "09:35", name: "emea_q1.csv", rows: "48 rows · 6 cols", size: "7 KB" },
      { t: "audio", who: "Amara N.", avColor: "var(--accent)", time: "09:37", dur: "0:18" },
      { t: "text", mine: true, who: "You", time: "09:40", text: "Here's a 90-second walkthrough of the reach numbers." },
      { t: "youtube", mine: true, who: "You", time: "09:40", title: "EMEA reach — 90-second walkthrough", channel: "redpash · 1.2K views", length: "1:32" },
      { t: "text", who: "Amara N.", avColor: "var(--accent)", time: "09:42", text: "This is perfect. Calling you in 2." },
      { t: "call", callKind: "voice", answered: true, callTitle: "Voice call", callMeta: "4:32 · ended", time: "09:44" },
    ],
    "dm-kee": [
      { t: "text", who: "kee", avColor: "var(--chart-1)", time: "08:10", text: "pushed the wasm bench numbers — parser does 1,240 rows in 11ms cold." },
      { t: "text", mine: true, who: "You", time: "08:11", text: "nice. offline still green?" },
      { t: "text", who: "kee", avColor: "var(--chart-1)", time: "08:12", text: "yep. airplane mode, full pipeline, zero network." },
    ],
    "mail-billing": [
      { t: "email", who: "Acme Billing", avColor: "var(--chart-3)", from: "Acme Billing", addr: "billing@acme.co",
        to: "you@redpash.io", subject: "Re: March invoice", time: "08:54",
        body: "Hi — we issued a corrected March invoice. The line count is now 48 seats (was 52); the three removed seats were never activated. Updated PDF attached. Let us know if the totals reconcile on your side.",
        attachName: "invoice-2024-03.pdf", attachSize: "142 KB" },
      { t: "email", mine: true, who: "You", from: "You", addr: "you@redpash.io", to: "billing@acme.co",
        subject: "Re: March invoice", time: "09:12",
        body: "Confirmed — totals match. Approving for payment today. Thanks for the quick turnaround." },
    ],
    "sms-otp": [
      { t: "sms", who: "RedPash", sys: true, time: "07:01", text: "Your RedPash verification code is 448-201. It expires in 10 minutes." },
      { t: "sms", mine: true, who: "You", time: "07:01", text: "448201" },
      { t: "sms", who: "RedPash", sys: true, time: "07:01", text: "Verified. Welcome back." },
      { t: "sms", mine: true, who: "You", time: "07:02", text: "Send the EMEA report when it's ready.", receipt: "Delivered" },
    ],
    "data-acme": [
      { t: "datacmd", mine: true, text: "open:csv customers", time: "09:50" },
      { t: "data", interp: "customers.csv", metaText: "1,240 rows · 6 cols · on your device",
        head: ["id", "customer", "region", "mrr"], dataRows: [
          ["1001", "Acme", "NA", "1284"], ["1002", "Globex", "EMEA", "540.5"],
          ["1006", "Stark", "EMEA", "1820"], ["1007", "Wayne", "EMEA", "2475.25"] ] },
      { t: "datacmd", mine: true, text: "filter region = EMEA\nlast 5", time: "09:51" },
      { t: "data", interp: "Pipeline · 2 stages", metaText: "1,240 → 5 rows",
        qir: ['filter region = "EMEA"', "order signup desc"],
        head: ["id", "customer", "region", "mrr"], dataRows: [
          ["1010", "Tyrell", "EMEA", "1390"], ["1007", "Wayne", "EMEA", "2475.25"],
          ["1006", "Stark", "EMEA", "1820"], ["1002", "Globex", "EMEA", "540.5"],
          ["1014", "Initrode", "EMEA", "905"] ] },
    ],
  };
}
