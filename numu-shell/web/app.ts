/* redpash — unified inbox shell. One conversational surface: the topbar + rail
   stay put while the header, thread and composer morph to the selected channel.
   Offline-first, no LLM. This bootstrap owns mutable state + the render loop;
   data.ts is the model, views.ts is the DOM. */
import { el } from "../../web-kit/src/el";
import { CHANNELS, composerKind, seedThreads, initials, tint, DENSITY_PX } from "./data";
import type { Msg } from "./data";
import { topbar, rail, header, thread, composer, settings, call, palette, buildPalette, activeChannel } from "./views";
import type { State, Actions, Ctx } from "./views";

const state: State = {
  activeId: "dm-amara",
  accent: "#2563eb",
  density: "cozy",
  theme: "light",
  settingsOpen: false,
  internalNote: false,
  call: null,
  callMuted: false,
  input: "",
  emailTo: "billing@acme.co",
  emailSubject: "Re: March invoice",
  seq: 100,
  threads: seedThreads(),
  hidden: {},
  collapsed: {},
  palette: { open: false, query: "", index: 0 },
};

let wantFocus = false;

function now(): string {
  const d = new Date();
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function append(id: string, m: Msg): void {
  m._k = ++state.seq;
  (state.threads[id] ??= []).push(m);
}

const actions: Actions = {
  open(id) {
    state.activeId = id; state.input = "";
    const ch = CHANNELS.find((c) => c.id === id); if (ch) ch.unread = 0;
    wantFocus = true; render();
  },
  toggleSettings() { state.settingsOpen = !state.settingsOpen; render(); },
  setAccent(c) { state.accent = c; render(); },
  setDensity(d) { state.density = d; render(); },
  setTheme(t) { state.theme = t; render(); },
  toggleInternal() { state.internalNote = !state.internalNote; render(); },
  hideChannel(id) {
    state.hidden[id] = true;
    if (state.activeId === id) {
      const next = CHANNELS.find((c) => !state.hidden[c.id]);
      if (next) state.activeId = next.id;
    }
    render();
  },
  restoreHidden() { state.hidden = {}; render(); },
  toggleGroup(name) { state.collapsed[name] = !state.collapsed[name]; render(); },
  startCall(kind) {
    const ch = activeChannel(state);
    state.call = { kind, name: ch.name, color: ch.color, initials: initials(ch.name) };
    render();
  },
  endCall() { state.call = null; state.callMuted = false; render(); },
  toggleMute() { state.callMuted = !state.callMuted; render(); },
  headerAction(a) {
    if (a.call) actions.startCall(a.call);
    // "Open full workspace" / "More" / "Star" / "Archive" — stubs in the mock
  },
  paletteOpen() { state.palette = { open: true, query: "", index: 0 }; render(); },
  paletteClose() { state.palette.open = false; render(); },
  paletteSetQuery(q) { state.palette.query = q; state.palette.index = 0; render(); },
  paletteMove(dir) {
    const n = buildPalette(state).length; if (!n) return;
    state.palette.index = ((state.palette.index + dir) % n + n) % n; render();
  },
  palettePick(i) {
    const it = buildPalette(state)[i];
    state.palette.open = false;
    if (!it) { render(); return; }
    if (it.channelId) actions.open(it.channelId);
    else if (it.command) runCommand(it.command);
    else render();
  },
  attach(type) {
    const t = now();
    const reg: Record<string, Msg> = {
      audio: { t: "audio", mine: true, who: "You", dur: "0:05", time: t },
      file: { t: "file", mine: true, who: "You", name: "document.pdf", size: "320 KB", fileKind: "pdf", time: t },
      csv: { t: "csv", mine: true, who: "You", name: "export.csv", rows: "48 rows · 6 cols", size: "7 KB", time: t },
      image: { t: "file", mine: true, who: "You", name: "screenshot.png", size: "1.2 MB", fileKind: "image", time: t },
      youtube: { t: "youtube", mine: true, who: "You", title: "Shared video", channel: "youtube.com", length: "2:14", time: t },
    };
    const m = reg[type as string];
    if (m) { append(state.activeId, m); wantFocus = true; render(); }
  },
  send() {
    const ch = activeChannel(state);
    const kind = composerKind(ch);
    const text = state.input.trim();
    if (!text) return;
    const t = now();
    if (kind === "data") {
      append(ch.id, { t: "datacmd", mine: true, text, time: t });
      append(ch.id, {
        t: "data", interp: "Preview", metaText: "ran on device", qir: text.split("\n"),
        head: ["customer", "region", "mrr"], dataRows: [["Globex", "EMEA", "540.5"], ["Toro Bank", "EMEA", "1180"]],
      });
    } else if (kind === "sms") {
      append(ch.id, { t: "sms", mine: true, who: "You", text, time: t, receipt: "Sent" });
    } else if (kind === "email") {
      append(ch.id, { t: "email", mine: true, who: "You", from: "You", addr: "you@redpash.io", to: state.emailTo, subject: state.emailSubject, body: text, time: t });
    } else if (kind === "comment") {
      append(ch.id, { t: "comment", mine: true, who: "You", text, internal: state.internalNote, time: t });
    } else {
      append(ch.id, { t: "text", mine: true, who: "You", text, time: t });
    }
    state.input = ""; wantFocus = true; render();
  },
};

// command palette → action dispatch (the keymap-driven omnisearch verbs)
function runCommand(id: string): void {
  if (id === "theme") actions.setTheme(state.theme === "dark" ? "light" : "dark");
  else if (id === "settings") { state.settingsOpen = true; render(); }
  else if (id === "hide") actions.hideChannel(state.activeId);
  else if (id === "restore") actions.restoreHidden();
  else if (id === "call") actions.startCall("voice");
}

function applyDisplay(): void {
  const de = document.documentElement;
  de.setAttribute("data-theme", state.theme);
  de.style.fontSize = DENSITY_PX[state.density] ?? "14px";
  de.style.setProperty("--accent", state.accent);
  de.style.setProperty("--accent-hover", state.accent);
  de.style.setProperty("--accent-tint", tint(state.accent, 12));
  de.style.setProperty("--accent-border", state.accent);
}

function render(): void {
  applyDisplay();
  const ctx: Ctx = { state, actions };
  const root = document.getElementById("root");
  if (!root) return;
  const shell = el("div", { class: "shell" },
    topbar(ctx),
    el("div", { class: "body-row" },
      rail(ctx),
      el("div", { class: "main" }, header(ctx), thread(ctx), composer(ctx))),
    ...settings(ctx),
    call(ctx),
    palette(ctx));
  root.replaceChildren(shell);

  const sc = shell.querySelector<HTMLElement>(".thread");
  if (sc) sc.scrollTop = sc.scrollHeight;
  const ta = shell.querySelector<HTMLTextAreaElement>(".composer-ta");
  if (ta) {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 128) + "px";
  }
  const pin = shell.querySelector<HTMLInputElement>(".palette-input");
  if (pin) {
    pin.focus();
    const n = pin.value.length; pin.setSelectionRange(n, n);
  } else if (ta && wantFocus) {
    ta.focus();
    const n = ta.value.length; ta.setSelectionRange(n, n);
  }
  wantFocus = false;
}

window.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
    e.preventDefault();
    if (state.palette.open) actions.paletteClose(); else actions.paletteOpen();
    return;
  }
  if (e.key === "Escape") {
    if (state.palette.open) actions.paletteClose();
    else if (state.call) actions.endCall();
    else if (state.settingsOpen) actions.toggleSettings();
  }
});

window.addEventListener("DOMContentLoaded", () => { render(); });
