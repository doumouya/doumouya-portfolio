// Unit test for the device-class logic. Mocks matchMedia + the viewport so we can
// assert the cases a desktop preview can't emulate (touch, landscape phone, fold).
// Run via `npm test` (builds src/responsive.ts -> dist/responsive.mjs first).
import assert from "node:assert/strict";

function setEnv({ w, h, touch }) {
  globalThis.innerWidth = w;
  globalThis.innerHeight = h;
  globalThis.matchMedia = (q) => ({
    matches:
      q.includes("pointer: coarse") || q.includes("hover: none")
        ? touch
        : q.includes("max-height: 480px")
          ? h <= 480
          : false,
    addEventListener() {},
    removeEventListener() {},
  });
}

const { device, breakpoint, isShort, isTouch } = await import("../dist/responsive.mjs");
let pass = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); pass++; };

setEnv({ w: 390, h: 844, touch: true }); // iPhone 15 portrait
ok(device() === "phone", "phone portrait → phone");
ok(breakpoint() === "xs", "390 → xs");
ok(isTouch() === true, "coarse pointer → touch");

setEnv({ w: 844, h: 390, touch: true }); // iPhone 15 LANDSCAPE (wide but short)
ok(device() === "phone", "landscape phone stays a phone (not desktop)");
ok(isShort() === true, "landscape phone is short");

setEnv({ w: 768, h: 1024, touch: true }); // iPad portrait
ok(device() === "tablet", "iPad → tablet");
ok(breakpoint() === "lg", "768 → lg");

setEnv({ w: 1280, h: 800, touch: false }); // laptop
ok(device() === "desktop", "laptop → desktop");
ok(breakpoint() === "2xl", "1280 → 2xl");

setEnv({ w: 544, h: 900, touch: false }); // narrow desktop window
ok(device() === "desktop", "narrow desktop window is NOT a phone");

setEnv({ w: 320, h: 568, touch: true }); // iPhone SE
ok(breakpoint() === "base", "320 (< xs) → base");

console.log(`responsive.ts OK — ${pass} assertions (phone/landscape-phone/tablet/desktop classified correctly)`);
