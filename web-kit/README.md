# web-kit

![ci](https://github.com/doumouya/web-kit/actions/workflows/ci.yml/badge.svg)

A dependency-free **TypeScript** front-end kit — design tokens + typed component
factories, **no framework**. Each component is a function that returns a real DOM
node and injects its own CSS once; the only thing a page links is the tokens
stylesheet. Built to dress the portfolio's data apps, whose Rust→wasm engines ship
typed `.d.ts` bindings — so the UI layer is typed end to end.

## Why no framework

The web platform is the framework. `el("button", { class, onClick }, "Save")` is a
typed `HTMLButtonElement`; state is the host's; there is no runtime, no build of the
library itself (apps import the TS source and bundle it). The result inlines into a
single offline `index.html` — the same packaging the apps use.

## What's inside

- **Tokens** (`src/tokens/`, pure CSS): a cool-neutral palette + one blue accent, a
  rem type scale, spacing/elevation/chart ramps, and a hand-authored **dark theme**
  via `prefers-color-scheme`. Link `src/tokens.css` once.
- **Components** (`src/components/`, 19 typed factories): `button`, `iconButton`,
  `input`, `select`, `checkbox`, `badge`, `kindLabel`, `card`, `toolbar`,
  `emptyState`, `code`, `avatar`, `icon`, `stat`, `tabs`, `dialog`, `toast`,
  `tooltip`, `chart`. Hairline, flat, accessible (semantic elements, focus-visible,
  ARIA, reduced-motion).
- **Responsive** (`src/responsive.ts` + `src/tokens/responsive.css`): device-aligned
  breakpoints, and a `device()` helper that classifies by **pointer/hover + the short
  viewport dimension**, not width — so a landscape phone reads as a phone and a narrow
  desktop window does not. See the `vanilla-web` skill's `references/responsive.md`.

## Use

```ts
import { button, badge, card } from "web-kit"; // (link src/tokens.css once)
document.body.append(
  card(badge("done", { tone: "success", dot: true }), { title: "Ready" }),
  button("Save", { variant: "primary", onClick: save }),
);
```

## Develop

```sh
npm install
npm run typecheck   # strict tsc, no emit
npm run build       # esbuild the specimen gallery -> dist/showcase.js
npm test            # device-class unit test (matchMedia mocked)
# open index.html for the live component gallery
```

## Provenance

The visual language and component set are a vanilla-TS realization of a design system
("Datacore") whose pure-CSS tokens are lifted verbatim here; the React wrappers were
re-implemented as typed DOM factories. No source-project identity (CI-enforced).
