/** designer — the drag-and-resize chart builder: amenan-ui's dashboard-grid holding
   live ECharts tiles (mountChart + buildOption), built from the same mock data.
   ECharts is heavy and the rest of the site is zero-dep/offline, so it's LAZY-loaded
   from a CDN only when this route opens. Chart themes come from the user's own
   ECharts theme exports (dark.project.json / shine.project.json), registered as
   theme-dark / theme-light so the charts reskin with the site's light/dark toggle.

   The chart "chrome" (legend / tooltip / axis / grid lines / smooth) is NOT baked —
   it's a live options bar; toggling any option re-renders every tile via setOption. */

import {
  el,
  mountDashboardGrid,
  mountChart,
  buildOption,
  THEMES,
  configureChartThemes,
  ensureRegisteredThemes,
  getEcharts,
} from "amenan-ui";
import type {
  Mount,
  RouteMap,
  ChartCfg,
  ChartTheme,
  DashboardGridHandle,
  ChartTileHandle,
} from "amenan-ui";
import { icon } from "./icons.ts";
import { genRows } from "./lab.ts";

/* ── ECharts: lazy CDN load (once) ─────────────────────────────────────────*/
let echartsP: Promise<void> | null = null;
function loadECharts(): Promise<void> {
  if (getEcharts()) return Promise.resolve();
  if (echartsP) return echartsP;
  echartsP = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/echarts@5/dist/echarts.min.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("echarts failed to load"));
    document.head.appendChild(s);
  });
  return echartsP;
}

/* ── chart themes ← the user's ECharts theme JSONs ─────────────────────────*/
let themesConfigured = false;
function configureThemes(): void {
  if (themesConfigured) return;
  themesConfigured = true;
  const MAP: Record<string, string> = {
    "theme-dark": "/themes/dark.project.json",
    "theme-light": "/themes/shine.project.json",
  };
  configureChartThemes({
    load: async (query) => {
      const name = String(query?.["name"] ?? "");
      const url = MAP[name];
      if (!url) return null;
      try {
        const json = (await fetch(url).then((r) => r.json())) as { theme?: unknown };
        return json.theme ?? null;
      } catch {
        return null;
      }
    },
  });
}

/* ── aggregations over the mock people table ───────────────────────────────*/
const ROWS = genRows(240);

function countBy(key: string): { labels: string[]; values: number[] } {
  const m = new Map<string, number>();
  for (const r of ROWS) {
    const k = String(r[key]);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  const labels = [...m.keys()];
  return { labels, values: labels.map((l) => m.get(l) ?? 0) };
}

function avgBy(key: string, valKey: string): { labels: string[]; values: number[] } {
  const sum = new Map<string, number>();
  const cnt = new Map<string, number>();
  for (const r of ROWS) {
    const k = String(r[key]);
    sum.set(k, (sum.get(k) ?? 0) + Number(r[valKey]));
    cnt.set(k, (cnt.get(k) ?? 0) + 1);
  }
  const labels = [...sum.keys()];
  return { labels, values: labels.map((l) => Math.round((sum.get(l) ?? 0) / (cnt.get(l) || 1))) };
}

const CT: ChartTheme = THEMES["theme-dark"] ?? { name: "d", series: [], registered: true };

/* ── tile specs + the live chrome options ──────────────────────────────────*/
interface Baked {
  xAxis?: { data?: unknown[] };
  series?: { name?: string; data?: unknown[] }[];
}
interface TileSpec {
  id: string;
  title: string;
  kind: string;
  type: string;
  baked: Baked;
}

interface Chrome {
  legend: boolean;
  tooltip: boolean;
  axisLine: boolean;
  splitLines: boolean;
  smooth: boolean;
}

function baseSpecs(): TileSpec[] {
  const team = countBy("team");
  const role = avgBy("role", "salary");
  const city = countBy("city");
  return [
    {
      id: "team",
      title: "Headcount by team",
      kind: "cartesian",
      type: "bar",
      baked: { xAxis: { data: team.labels }, series: [{ name: "Headcount", data: team.values }] },
    },
    {
      id: "city",
      title: "Distribution by city",
      kind: "pie",
      type: "donut",
      baked: {
        series: [{ data: city.labels.map((n, i) => ({ name: n, value: city.values[i] ?? 0 })) }],
      },
    },
    {
      id: "role",
      title: "Avg salary by role",
      kind: "cartesian",
      type: "line",
      baked: { xAxis: { data: role.labels }, series: [{ name: "Avg salary (€)", data: role.values }] },
    },
  ];
}

const designerView: Mount = (host: Element) => {
  const chrome: Chrome = {
    legend: false,
    tooltip: true,
    axisLine: true,
    splitLines: false,
    smooth: true,
  };
  const charts: { spec: TileSpec; handle: ChartTileHandle }[] = [];

  const optionFor = (spec: TileSpec): unknown => {
    const cfg: ChartCfg = {
      kind: spec.kind,
      type: spec.type,
      legend: chrome.legend,
      legendPos: "bottom",
      tooltip: chrome.tooltip,
      axisLine: chrome.axisLine,
      splitLines: chrome.splitLines,
      smooth: chrome.smooth,
      option: spec.baked,
    };
    return buildOption(cfg, CT);
  };

  const tileMount = (spec: TileSpec) => (body: HTMLElement): ChartTileHandle => {
    const h = mountChart(body, { title: spec.title, option: optionFor(spec) });
    charts.push({ spec, handle: h });
    requestAnimationFrame(() => h.resize());
    return h;
  };

  const reRenderAll = (): void => {
    for (const c of charts) c.handle.setOption(optionFor(c.spec));
  };

  const section = el("section", { class: "route lab designer" });
  section.append(
    el(
      "div",
      { class: "lab-head" },
      el("a", { class: "amu-btn", href: "#/work" }, icon("back"), el("span", {}, "Work")),
      el(
        "div",
        { class: "lab-head-txt" },
        el("h1", {}, "chart designer"),
        el(
          "p",
          { class: "sub" },
          "amenan-ui's dashboard-grid — drag to move, drag the corner to resize. Live ECharts tiles from the mock data; toggle the chrome options below, and switch ☀/☾ in Display to reskin (dark & shine ECharts palettes).",
        ),
      ),
    ),
  );

  const stage = el("div", { class: "designer-grid" });
  const loading = el("p", { class: "lab-note" }, "Loading ECharts…");
  section.append(loading, stage);
  host.appendChild(section);

  let grid: DashboardGridHandle | null = null;
  let editable = false;
  let added = 0;

  configureThemes();
  loadECharts()
    .then(() => ensureRegisteredThemes())
    .then(() => {
      loading.remove();

      // layout controls
      const editBtn = el("button", { class: "amu-btn", type: "button" }, icon("writing"), el("span", {}, "Edit layout"));
      editBtn.addEventListener("click", () => {
        editable = !editable;
        grid?.setEditable(editable);
        editBtn.classList.toggle("amu-btn--accent", editable);
      });
      const addBtn = el("button", { class: "amu-btn", type: "button" }, icon("play"), el("span", {}, "Add chart"));
      addBtn.addEventListener("click", () => {
        added += 1;
        const spec: TileSpec = { ...baseSpecs()[0]!, id: `extra-${added}` };
        grid?.addElement({ id: spec.id, x: 0, y: 0, w: 5, h: 4, mount: tileMount(spec) });
        if (!editable) {
          editable = true;
          grid?.setEditable(true);
          editBtn.classList.add("amu-btn--accent");
        }
      });

      // the live chrome options bar
      const optBar = el("div", { class: "opt-bar", role: "group", "aria-label": "Chart options" });
      optBar.append(el("span", { class: "opt-label" }, "Show:"));
      const optionDefs: { key: keyof Chrome; label: string }[] = [
        { key: "legend", label: "Legend" },
        { key: "tooltip", label: "Tooltip" },
        { key: "axisLine", label: "Axis" },
        { key: "splitLines", label: "Grid lines" },
        { key: "smooth", label: "Smooth" },
      ];
      for (const od of optionDefs) {
        const chip = el(
          "button",
          { class: "opt-chip", type: "button", "aria-pressed": chrome[od.key] ? "true" : "false" },
          od.label,
        );
        chip.addEventListener("click", () => {
          chrome[od.key] = !chrome[od.key];
          chip.setAttribute("aria-pressed", chrome[od.key] ? "true" : "false");
          reRenderAll();
        });
        optBar.append(chip);
      }

      const toolbar = el("div", { class: "lab-toolbar designer-toolbar" }, editBtn, addBtn, optBar);
      section.insertBefore(toolbar, stage);

      grid = mountDashboardGrid(stage, {
        cols: 15,
        rows: 10,
        editable: false,
        onRemove: (id) => {
          const i = charts.findIndex((c) => c.spec.id === id);
          if (i >= 0) charts.splice(i, 1);
        },
        elements: [
          { id: "team", x: 0, y: 0, w: 8, h: 5, mount: tileMount(baseSpecs()[0]!) },
          { id: "city", x: 8, y: 0, w: 7, h: 5, mount: tileMount(baseSpecs()[1]!) },
          { id: "role", x: 0, y: 5, w: 15, h: 5, mount: tileMount(baseSpecs()[2]!) },
        ],
      });
    })
    .catch(() => {
      loading.textContent =
        "Charts need a network connection to load ECharts. The echarts-dashboard demo (Work) carries its own copy and runs offline.";
    });

  return {
    el: section,
    destroy: () => {
      grid?.destroy?.();
      section.remove();
    },
  };
};

export const designerRoutes: RouteMap = {
  "lab/designer": { mount: designerView },
};
export const DESIGNER_TITLE: Record<string, string> = {
  "lab/designer": "chart designer — Emmanuel Doumouya",
};
