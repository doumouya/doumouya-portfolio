# Design handoff — em.numu.im (amenan-ui / Console)

*For Claude Design. This describes the LIVE, shipped system so a Figma file can be built from it and kept
in sync. The single source of truth on both sides is the **token contract** (the CSS custom properties):
Figma **variables** map 1:1 to these `--*` tokens, and every component below maps to one amenan-ui component.
Live reference: <https://em.numu.im/> · framework repo: <https://github.com/doumouya/amenan-ui>.*

---

## 0. The sync model (read first)

- **Tokens are the contract.** Build Figma **variables** with the exact names + values in §2–§4. When a
  token changes in code, change the matching variable (and vice-versa) — that's the whole sync.
- **Two-axis theming.** A "look" = two attributes on `<html>`: **theme** (`data-theme`, currently only
  `portfolio` = *Console*) × **mode** (`data-mode` = `light | dark`). In Figma this is **two variable
  modes** (Light / Dark) under one collection. Every color token has a Light and a Dark value (§2).
- **Preference axes** (§5) are additional attribute switches (density, text-size, motion, contrast,
  reading-font). Model them as Figma variable modes or component variants where visual.
- **One component each.** Don't fork; each Figma component = one amenan-ui component (`.amu-*` class).

---

## 1. Identity — "Console"

Near-monochrome **ink/paper** with **one green signal**. Monospace-first. Hard **1.5px ink rules** and a
**4px offset block shadow** (`4px 4px 0 0` of the rule color) — flat, terminal-like, no soft elevation
except dialogs. Wordmark `doumouya`, a terminal "termbar" top strip with traffic-light dots.

---

## 2. Color tokens (Figma variable collection: `color`, modes: Light / Dark)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#FFFFFF` | `#0B0B0C` | page background (ink in dark) |
| `--surface` | `#FFFFFF` | `#161618` | cards, panels, controls |
| `--surface-2` | `#ECECEE` | `#000000` | sunken (matrix header, code bg) |
| `--border` | `#E0E0E3` | `#232327` | hairline dividers / soft borders |
| `--text` | `#0B0B0C` | `#F2F2F3` | primary text |
| `--text-dim` | `#717177` | `#A1A1A6` | secondary text |
| `--text-mute` | `#A1A1A6` | `#54545A` | tertiary / hints |
| `--accent` | `#0B0B0C` | `#F2F2F3` | primary action (ink on paper / paper on ink) |
| `--on-accent` | `#FFFFFF` | `#0B0B0C` | text on accent fills |
| `--accent-soft` | `#ECECEE` | `#232327` | accent tint |
| `--signal` | `#1E9E5A` | `#34C77B` | THE green — reach/success/active icon |
| `--signal-hover` | `#16864B` | `#1E9E5A` | signal hover |
| `--signal-tint` | `mix(signal 12%, surface)` | `mix(signal 16%, surface)` | switch-on bg, reached row |
| `--ok` | `#1E9E5A` | `#34C77B` | success |
| `--warn` | `#B7791F` | `#B7791F` | warning |
| `--danger` | `#D63B3B` | `#D63B3B` | destructive |
| `--rule` | `#0B0B0C` | `#F2F2F3` | HARD 1.5px structural line |
| `--focus-ring` | `#1E9E5A` | `#34C77B` | focus outline (green) |

**Effect:** `--rule-shadow` = `4px 4px 0 0 var(--rule)` (the Console offset block — apply to cards/modals).
Dialog elevation only: `--shadow-dialog` (soft drop). Base surfaces carry **no** drop shadow.

---

## 3. Type · spacing · radius (Figma collection: `scale`, mode-independent)

**Font family** `--font` (both modes): `ui-monospace, SFMono-Regular, "SF Mono", Menlo, Monaco, Consolas, monospace`.
The UI is mono-first; `--font-mono` is the same stack (data/identifiers).

| Type token | rem / px@16 |
|---|---|
| `--text-xs` | 0.75 / 12 |
| `--text-sm` | 0.8125 / 13 |
| `--text-md` | 0.9375 / 15 |
| `--text-lg` | 1.125 / 18 |
| `--text-xl` | 1.5 / 24 |
| `--text-2xl` | 2.25 / 36 |

Spacing: `--sp-1..8` = 0.25 / 0.5 / 0.75 / 1 / 1.5 / 2 / 3 rem (sp-1,2,3,4,5,6,8).
Radius: `--radius-sm` 7px · `--radius` 10px · `--radius-lg` 16px · `--radius-pill` 999px.
Density rhythm: `--ctl-h` 2rem (control height) · `--row-h` 2.25rem · `--pad-x` 0.75rem · `--gap` 0.5rem.
Motion: `--ease` `cubic-bezier(.4,0,.2,1)` · `--fast` 120ms · `--slow` 220ms.
Breakpoints: `--bp-sm` 48rem · `--bp-md` 64rem · `--bp-lg` 80rem. Content container = 64rem.

---

## 4. Layout — the shell

Sticky **chrome** header = **termbar** (row 1) + **nav** (row 2), both inside one sticky block, bottom
1.5px rule. Below it a routed content area (max-width 64rem, centered), except demo/designer pages go
full-bleed.

- **termbar**: 3 traffic-light dots · `doumouya` wordmark · `~/portfolio` cwd · light/dark toggle (`☀/☾`)
  · status pill `● open source · runs offline`. Full-width, sticky.
- **nav**: icon + label links — Home · Work · Writing · About · Contact — active link has a 1.5px rule
  border + green icon (`--signal`). A right-aligned `⚙` gear icon-button opens **Display** (§6.13).

---

## 5. Preference axes (attributes on `<html>`; model as variable modes / variants)

| Axis | Attribute | Values → effect |
|---|---|---|
| Text size | `data-fontsize` | `sm`=93.75% · (default 100%) · `lg`=112.5% · `xl`=125% root font-size (scales the whole rem UI) |
| Density | `data-density` | `touch` → `--ctl-h`/`--row-h` = 3rem (48px), `--pad-x` 1rem, `--gap` .75rem, taller nav · `compact` → 1.75rem etc. |
| Motion | `data-motion` | `reduced` → transitions/animations ~0 |
| Contrast | `data-contrast` | `high` → `--text-dim`=`--text`, `--text-mute`=`--text-dim`, `--border`=`--rule` |
| Reading font | `data-readfont` | `on` → legible system sans on long-form (`.post` / `.prose`), code stays mono |

Persisted per visitor + applied pre-paint (no flash). Touch auto-defaults on coarse pointers.

---

## 6. Components (anatomy + states → `.amu-*`)

Each is one amenan-ui component; build one Figma component with variants for its states.

1. **Button** `.amu-btn` — height `--ctl-h`, 1px `--border`, radius `--radius`, mono `--text-sm`. Variants:
   *default* (surface), *accent* (`--accent` fill, `--on-accent` text), *ghost* (transparent, dim),
   *danger* (danger text), *sm* (1.625rem), *icon* (square `--ctl-h`). States: hover (`--hover` bg),
   disabled (0.45 opacity). Icon + label allowed (gap).
2. **Badge** `.amu-badge` — pill, `--surface-2` bg, dim text, `--text-xs`; tones ok/warn/danger/info/accent.
3. **Card** `.amu-card` — surface, 1.5px `--rule`, radius, the `4px 4px 0` offset block shadow; title `h3`
   + optional sub + body slot.
4. **Input / textarea** `.amu-input` / `.amu-textarea` — height `--ctl-h`, 1px border, focus = 2px green ring.
5. **kbd** `.amu-kbd` — key cap (double bottom border).
6. **Segmented control** (`.seg` / `.seg-btn`) — a hard-ruled inline group; the pressed segment fills
   `--accent`/`--on-accent`. Used for Display prefs + the designer options + the filter All/Any + interaction switch.
7. **Switch** (`.switch`) — pill toggle; on = `--signal-tint` bg + `--signal` knob shifted right.
8. **Modal** `.amu-modal` — centered, `min(26rem,92vw)`, 1.5px rule, radius-lg, soft dialog shadow;
   overlay `rgba(0,0,0,.5)`; title `--text-lg`, body, right-aligned footer buttons. Focus-trap + ESC + overlay-dismiss.
9. **Select** `.amu-select` — a styled listbox trigger + menu.
10. **Stat** `.amu-stat` — big value + small label; tone `ok` = green value.
11. **perm-cell** `.amu-perm-cell` — a cycling permission cell: shows `—` / `r` / `rw`; `data-locked` → a
    lock glyph + not-allowed cursor. Used in the RBAC matrix.
12. **redtable** `.amu-redtable` — data grid; header (sortable chevrons ↑/↓/⇅), zebra rows, right-aligned
    numerics, virtual-scroll body, pager foot; interaction states browse/select(checkboxes)/edit/delete.
13. **Display pop-up** (composed) — the modal titled *Display* with, top→bottom: appearance segmented
    (`☀`/`☾`), text-size segmented (`A− A A+ A++`), density segmented (comfortable / tap-hand / compact
    icons), then a 3-up row of icon-over-switch toggles (motion `∿` / contrast `◐` / reading `▭`), and a
    `Done` accent button. Essentially textless — icons + tooltips.
14. **filter-panel** `.amu-fp` — query builder: rows of `column ▸ operator ▸ value` + a remove ✕, an
    All/Any segmented, `+ Add condition` / `+ Add group`, and Clear / Apply footer.
15. **omni** `.amu-omni` — search pill (⌕ + input + `Ctrl K` kbd) with a results dropdown (section headers,
    highlighted match, per-kind glyph).
16. **chart tile** `.amu-chart-card` + **dashboard-grid** `.amu-dg` — a titled ECharts canvas card placed
    on a 15×10 drag-move / corner-resize grid (edit mode shows a grip bar + resize handle + remove ×).

---

## 7. Icon set (inline SVG, 24×24 stroke, `currentColor`, ~1.15em)

`sun · moon · contrast(◐) · motion(∿) · reading(book) · textsize(Aa) · comfortable(≡) · touch(tap-hand) ·
compact(≣) · gear · home · work(grid) · writing(pen) · about(user) · contact(mail) · back(←) ·
external · code(</>) · docs(file) · play(▶) · github · download(↓)`. Stroke width 2, round caps.
Nav uses home/grid/pen/user/mail; buttons use play/code/docs/download/github/back; Display uses the
sun..reading set. Redtable/omni also use a small Bootstrap-Icons→Unicode shim (chevrons ↑↓⇅, ⌕, •, ▸).

---

## 8. Screens (routes → frames)

- **Home** `#/home` — hero (name, tagline, sub, CTA buttons: Explore the work · Read the story · CV · GitHub),
  a "Featured work" card grid (csv-workbench, echarts-dashboard, rbac-explorer, + amenan-ui headline card),
  a "How these were built" method note.
- **Work** `#/work` — full project grid + a "Framework & components" section (amenan-ui, redtable,
  filter-panel, chart designer) each with an Open / Code action.
- **Writing** `#/writing` → **post** `#/writing/immune-system` — long-form article (h1/h2/h3, prose,
  reading-width ~42rem, back link).
- **About** / **Contact** — prose pages; About ends with the "On the name" colophon.
- **Demo** `#/demo/<name>` — a `← Work | title | Code · Docs` bar + the app embedded full-height (iframe).
- **Design system** `#/design-system` — amenan-ui tour: live omni search, theme-axes note (button into
  Display), a component gallery (buttons/badges/kbd/cards), links to the component demos.
- **lab/redtable · lab/filter-panel · lab/designer** — the component demo pages (§6.12/14/16).
- **rbac-explorer** (embedded app) — top: org scope tree with reach highlight + a person/role picker +
  a reach/guardrail panel; bottom: the field-permission matrix (fields × CEO/Manager/Member/Admin,
  perm-cells, selected column highlighted, scope line). Full scenario in `rbac-explorer/docs/corporate-scenario.md`.

---

## 9. Responsive

Container 64rem. Below **40rem**: nav collapses to **icon-only** (labels hidden) in a horizontally
scrollable strip; card grid reflows to 1 col; demo/designer grids stack. Touch density enlarges targets to 48px.

---

## 10. What to deliver back (for sync)

A Figma file with: (a) the `color` collection (Light/Dark modes) + `scale` collection matching §2–§4
exactly by name; (b) one component per §6 with the listed variants/states; (c) the §7 icon set as
components; (d) the §8 screens at desktop + mobile (§9). Keeping the variable **names + values** identical
to the CSS tokens is what makes the design and the live site sync — change one, mirror it in the other.
