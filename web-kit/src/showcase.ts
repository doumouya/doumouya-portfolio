/** A specimen gallery rendering every component — the framework's visual proof. */
import {
  el, button, iconButton, input, select, checkbox,
  badge, kindLabel, card, toolbar, emptyState, code, avatar, icon, stat,
  tabs, dialog, toast, tooltip, chart, device, breakpoint,
} from "./index";

const root: HTMLElement = document.getElementById("app") ?? document.body;

function section(title: string, nodes: Array<Node | null>): void {
  const sec = el("section", { class: "demo-section" }, el("h2", { class: "demo-h", text: title }));
  const row = el("div", { class: "demo-row" });
  for (const n of nodes) if (n) row.append(n);
  sec.append(row);
  root.append(sec);
}

section("Buttons", [
  button("Secondary"),
  button("Primary", { variant: "primary" }),
  button("Ghost", { variant: "ghost" }),
  button("Danger", { variant: "danger" }),
  button("Small", { size: "sm" }),
  button("Large", { size: "lg" }),
  iconButton(icon("gear"), { label: "Settings" }),
]);

section("Badges & kind labels", [
  badge("neutral"),
  badge("accent", { tone: "accent" }),
  badge("success", { tone: "success", dot: true }),
  badge("warning", { tone: "warning" }),
  badge("danger", { tone: "danger" }),
  kindLabel({ kind: "Int" }),
  kindLabel({ kind: "Float" }),
  kindLabel({ kind: "Bool" }),
  kindLabel({ kind: "Text" }),
]);

section("Forms", [
  input({ label: "Name", attrs: { placeholder: "Ada Lovelace" } }),
  input({ label: "Email", error: "Required", attrs: { placeholder: "you@example.com" } }),
  select({ label: "Role", options: ["Viewer", "Member", "Admin"] }),
  checkbox("I agree", { defaultChecked: true }),
]);

section("Display", [
  stat("1,240", { label: "rows" }),
  stat("98%", { label: "uptime" }),
  avatar({ name: "Ada Lovelace" }),
  code("npm run build"),
]);

section("Cards", [
  card(el("p", { text: "A flat, hairline-bordered surface." }), { title: "Card title", subtitle: "with a subtitle" }),
  card(el("p", { text: "Hover for the interactive border." }), { title: "Interactive", interactive: true }),
]);

section("Tabs", [
  tabs([{ id: "a", label: "Overview" }, { id: "b", label: "Activity", count: 3 }, { id: "c", label: "Settings" }], { defaultValue: "a" }),
]);

section("Empty state", [
  emptyState({ glyph: "inbox", lead: "Open a CSV — it stays on your device.", description: "All processing happens in your browser." }),
]);

section("Feedback", [
  toast({ tone: "success", title: "Saved", description: "Your changes are saved." }),
  toast({ tone: "danger", title: "Failed", description: "Could not reach the server." }),
  tooltip(button("Hover for a tip"), { content: "A quiet hint." }),
  button("Open dialog", {
    variant: "primary",
    onClick: () => {
      const d = dialog(el("p", { text: "A modal panel over a dimmed scrim. Esc or click outside to close." }), {
        open: true,
        title: "Hello",
        onClose: () => d?.remove(),
      });
      if (d) document.body.append(d);
    },
  }),
]);

section("Chart (ECharts optional)", [chart()]);

// Responsive readout — proves the device-class helper across viewport sizes.
const readout = el("p", { class: "demo-readout" });
const update = (): void => {
  readout.textContent = `device: ${device()} · breakpoint: ${breakpoint()} · ${innerWidth}×${innerHeight}`;
};
update();
addEventListener("resize", update);
root.append(el("section", { class: "demo-section" }, el("h2", { class: "demo-h", text: "Responsive" }), readout));

void toolbar; // exported for apps; not shown here
