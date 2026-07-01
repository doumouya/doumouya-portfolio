/** icons — a tiny inline-SVG set (dependency-free, stroke = currentColor, so they
   inherit ink/paper + the Console line weight). Icons carry meaning without words,
   which keeps the UI near-textless — the labels that remain live in one place, so a
   second language (FR) is a small drop-in rather than a hunt through the DOM. */

export type IconName =
  | "sun" | "moon" | "contrast" | "motion" | "reading" | "textsize"
  | "comfortable" | "touch" | "compact" | "gear"
  | "home" | "work" | "writing" | "about" | "contact"
  | "back" | "external" | "code" | "docs" | "play" | "github" | "download";

const ATTRS =
  'xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

const PATHS: Record<IconName, string> = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/>',
  contrast: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none"/>',
  motion: '<path d="M3 12h4l3 7 4-14 3 7h4"/>',
  reading: '<path d="M4 5a2 2 0 0 1 2-2h13v15H6a2 2 0 0 0-2 2z"/><path d="M4 20a2 2 0 0 1 2-2h13"/>',
  textsize: '<path d="M4 20 9 5l5 15"/><path d="M6 15h6"/><path d="M15 20l3-9 3 9"/><path d="M16.2 17h3.6"/>',
  comfortable: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  touch: '<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10"/><path d="M12 10V4.5a1.5 1.5 0 0 1 3 0V11"/><path d="M15 6.5a1.5 1.5 0 0 1 3 0V14a6 6 0 0 1-6 6 6 6 0 0 1-5-2.6l-2.2-3a1.4 1.4 0 0 1 2.2-1.7L9 14"/>',
  compact: '<path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  work: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  writing: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  about: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  contact: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  back: '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4l-8 8"/><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/>',
  code: '<path d="M8 6l-6 6 6 6"/><path d="M16 6l6 6-6 6"/>',
  docs: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
  play: '<path d="M6 4l14 8-14 8z" fill="currentColor" stroke="none"/>',
  github:
    '<path d="M9 19c-5 1.4-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3-.3 6.1-1.5 6.1-6.6A5.1 5.1 0 0 0 19.9 5 4.8 4.8 0 0 0 19.8 1.5S18.7 1.2 16 3a12.3 12.3 0 0 0-6.6 0C6.7 1.2 5.6 1.5 5.6 1.5A4.8 4.8 0 0 0 5.5 5 5.1 5.1 0 0 0 4.1 8.6c0 5 3.1 6.3 6.1 6.6a3.4 3.4 0 0 0-.9 2.6V21"/>',
  download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',
};

/** Build an icon element. `title` (optional) becomes the accessible name + tooltip;
    without it the icon is decorative (aria-hidden). */
export function icon(name: IconName, title?: string): HTMLElement {
  const span = document.createElement("span");
  span.className = "icon";
  span.innerHTML = `<svg ${ATTRS}>${PATHS[name]}</svg>`;
  if (title) {
    span.setAttribute("role", "img");
    span.setAttribute("aria-label", title);
    span.setAttribute("title", title);
  } else {
    span.setAttribute("aria-hidden", "true");
  }
  return span;
}
