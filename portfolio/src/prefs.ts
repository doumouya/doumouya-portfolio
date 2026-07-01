/** Display preferences — a touch-friendly, icon-first pop-up over the SAME O(1)
   mechanism amenan-ui uses for theming: each preference is one attribute on <html>
   plus a localStorage mirror (`amu-pref-<key>`), applied pre-paint (no flash).

   Icon-first on purpose: the controls read as pictograms, so the only words are the
   tooltips/labels in the `T` map below — a single place to add French later. Light/
   dark routes through amenan-ui's theme seam (`setMode`/`getMode`) so this and the
   termbar toggle never disagree. The pop-up is amenan-ui's `modal` (focus-trap + ESC
   + overlay-dismiss); controls are segmented buttons and switches with ≥44px targets. */

import { el, openModal, getMode, setMode } from "amenan-ui";
import { icon } from "./icons.ts";
import type { IconName } from "./icons.ts";

type PrefKey = "fontsize" | "density" | "motion" | "contrast" | "readfont";
type Mode = "light" | "dark";

/** The only user-facing strings in the pop-up. Swap/extend for i18n (e.g. add a
    `fr` variant keyed the same way). Kept tiny on purpose — the icons carry meaning. */
const T = {
  display: "Display",
  light: "Light",
  dark: "Dark",
  smaller: "Smaller text",
  sizeDefault: "Default text size",
  larger: "Larger text",
  largest: "Largest text",
  comfortable: "Comfortable",
  touch: "Touch",
  compact: "Compact",
  reduceMotion: "Reduce motion",
  highContrast: "High contrast",
  readableFont: "Readable font",
  done: "Done",
};

interface Opt {
  value: string;
  title: string;
  icon?: IconName;
  label?: string; // language-neutral glyphs only (A−/A/A+); prefer `icon`
}

const lsKey = (k: PrefKey): string => `amu-pref-${k}`;

/** The value currently APPLIED to <html> (empty string = the default). */
function current(k: PrefKey): string {
  return document.documentElement.getAttribute(`data-${k}`) ?? "";
}

/** Apply + persist one pref: set (or, for the default, clear) `html[data-<k>]`
    and its mirror. One attribute write — the rest re-resolves via CSS. */
function setPref(k: PrefKey, value: string): void {
  const d = document.documentElement;
  if (value) d.setAttribute(`data-${k}`, value);
  else d.removeAttribute(`data-${k}`);
  try {
    if (value) localStorage.setItem(lsKey(k), value);
    else localStorage.removeItem(lsKey(k));
  } catch {
    /* private mode / quota — the attribute is set regardless */
  }
}

/** Re-apply persisted prefs at boot (the pre-paint snippet already did this for the
    first paint; this keeps runtime + storage in agreement). On a coarse pointer with
    no stored density, start in touch mode — applied, NOT persisted, so it re-evaluates
    per device. */
export function initPrefs(): void {
  const keys: PrefKey[] = ["fontsize", "density", "motion", "contrast", "readfont"];
  for (const k of keys) {
    let v = "";
    try {
      v = localStorage.getItem(lsKey(k)) ?? "";
    } catch {
      v = "";
    }
    if (v) document.documentElement.setAttribute(`data-${k}`, v);
  }
  if (!current("density")) {
    try {
      if (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) {
        document.documentElement.setAttribute("data-density", "touch");
      }
    } catch {
      /* no matchMedia — stay at comfortable */
    }
  }
}

/* ── controls ──────────────────────────────────────────────────────────────*/

function seg(active: string, opts: Opt[], onPick: (v: string) => void): HTMLElement {
  const row = el("div", { class: "seg", role: "group" });
  for (const o of opts) {
    const b = el("button", { class: "seg-btn", type: "button", title: o.title, "aria-label": o.title });
    if (o.icon) b.appendChild(icon(o.icon));
    else if (o.label) b.appendChild(document.createTextNode(o.label));
    if (o.value === active) b.setAttribute("aria-pressed", "true");
    b.addEventListener("click", () => {
      for (const c of Array.from(row.children)) c.removeAttribute("aria-pressed");
      b.setAttribute("aria-pressed", "true");
      onPick(o.value);
    });
    row.appendChild(b);
  }
  return row;
}

function segRow(control: HTMLElement): HTMLElement {
  return el("div", { class: "pref-seg-row" }, control);
}

function toggleRow(
  iconName: IconName,
  title: string,
  on: boolean,
  onChange: (v: boolean) => void,
): HTMLElement {
  const sw = el("button", { class: "switch", type: "button", role: "switch", title, "aria-label": title });
  sw.setAttribute("aria-checked", on ? "true" : "false");
  sw.addEventListener("click", () => {
    const next = sw.getAttribute("aria-checked") !== "true";
    sw.setAttribute("aria-checked", next ? "true" : "false");
    onChange(next);
  });
  return el("div", { class: "pref-row" }, icon(iconName, title), sw);
}

/** Open the Display pop-up. */
export function openDisplayModal(): void {
  const body = el(
    "div",
    { class: "prefs" },
    segRow(
      seg(
        getMode(),
        [
          { value: "light", icon: "sun", title: T.light },
          { value: "dark", icon: "moon", title: T.dark },
        ],
        (v) => setMode(v as Mode),
      ),
    ),
    segRow(
      seg(
        current("fontsize") || "default",
        [
          { value: "sm", label: "A−", title: T.smaller },
          { value: "default", label: "A", title: T.sizeDefault },
          { value: "lg", label: "A+", title: T.larger },
          { value: "xl", label: "A++", title: T.largest },
        ],
        (v) => setPref("fontsize", v === "default" ? "" : v),
      ),
    ),
    segRow(
      seg(
        current("density") || "comfortable",
        [
          { value: "comfortable", icon: "comfortable", title: T.comfortable },
          { value: "touch", icon: "touch", title: T.touch },
          { value: "compact", icon: "compact", title: T.compact },
        ],
        (v) => setPref("density", v === "comfortable" ? "" : v),
      ),
    ),
    el(
      "div",
      { class: "pref-toggles" },
      toggleRow("motion", T.reduceMotion, current("motion") === "reduced", (on) =>
        setPref("motion", on ? "reduced" : ""),
      ),
      toggleRow("contrast", T.highContrast, current("contrast") === "high", (on) =>
        setPref("contrast", on ? "high" : ""),
      ),
      toggleRow("reading", T.readableFont, current("readfont") === "on", (on) =>
        setPref("readfont", on ? "on" : ""),
      ),
    ),
  );

  openModal({
    title: T.display,
    body,
    actions: [{ label: T.done, variant: "accent", onClick: ({ close }) => close() }],
  });
}
