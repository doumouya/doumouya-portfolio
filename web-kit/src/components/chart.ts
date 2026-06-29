import { el, ensureStyles } from "../el";

/* Datacore Chart — a thin DOM wrapper around ECharts that themes it from the
   live design tokens. It reads --chart-1..8 + the structural chart tokens off
   the computed style, registers an ECharts theme, and re-applies it on
   light/dark change — so charts always match the page. Manages init / setOption
   / resize (ResizeObserver) / dispose. ECharts itself is NOT bundled: the host
   must load it as the global `echarts` (the dashboard product vendors it; a kit
   may use the CDN). Pass a standard ECharts `option`. */

const CSS = `
.dc-chart{ width:100%; height:16rem; min-height:8rem; }
.dc-chart__missing{
  height:100%; display:flex; align-items:center; justify-content:center;
  color:var(--text-subtle); font-size:var(--text-sm); font-family:var(--font-mono);
}
`;

/* Minimal structural typing of the slice of the ECharts global we use — no
   `any`, just the surface this component touches. */
interface EChartsInstance {
  setOption(option: unknown, notMerge?: boolean): void;
  resize(): void;
  dispose(): void;
}
interface EChartsLike {
  init(el: HTMLElement, theme?: string, opts?: { renderer?: string }): EChartsInstance;
  registerTheme(name: string, theme: unknown): void;
}

let themeSeq = 0;

function readTheme(host: HTMLElement): Record<string, unknown> {
  const cs = getComputedStyle(host);
  const v = (n: string, f: string): string => cs.getPropertyValue(n).trim() || f;
  const colors = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => v(`--chart-${i}`, "#2563eb"));
  const axis = v("--chart-axis", "#6b7280");
  const grid = v("--chart-grid", "#e5e7eb");
  const text = v("--text", "#1f2937");
  const font = v("--font-sans", "system-ui, sans-serif");
  const tipBg = v("--chart-tooltip-bg", "#fff");
  const tipBorder = v("--chart-tooltip-border", "#e5e7eb");
  const tipText = v("--chart-tooltip-text", "#1f2937");

  const axisCommon = {
    axisLine: { lineStyle: { color: grid } },
    axisTick: { lineStyle: { color: grid } },
    axisLabel: { color: axis },
    splitLine: { lineStyle: { color: grid, type: "dashed" } },
  };

  return {
    color: colors,
    backgroundColor: "transparent",
    textStyle: { fontFamily: font, color: text },
    title: { textStyle: { color: text, fontWeight: 600 }, subtextStyle: { color: axis } },
    legend: { textStyle: { color: axis } },
    categoryAxis: { ...axisCommon, splitLine: { show: false } },
    valueAxis: axisCommon,
    grid: { borderColor: grid },
    tooltip: {
      backgroundColor: tipBg,
      borderColor: tipBorder,
      borderWidth: 1,
      textStyle: { color: tipText, fontFamily: font, fontSize: 12 },
      extraCssText: "box-shadow:0 4px 12px -2px rgba(15,23,42,.12); border-radius:8px;",
    },
    line: { symbolSize: 6, lineStyle: { width: 2 }, smooth: true },
    bar: { itemStyle: { borderRadius: [3, 3, 0, 0] } },
    pie: { itemStyle: { borderColor: v("--surface", "#fff"), borderWidth: 2 } },
  };
}

export interface ChartOptions {
  /** The ECharts `option` object. */
  option?: unknown;
  /** Pass `notMerge` to ECharts `setOption` (default true). */
  notMerge?: boolean;
  /** Initial inline width (CSS length). Defaults to the stylesheet's 100%. */
  width?: string;
  /** Initial inline height (CSS length). Defaults to the stylesheet's 16rem. */
  height?: string;
  /** Called with the ECharts instance once it is (re)built. */
  onReady?: (inst: EChartsInstance) => void;
  class?: string;
  attrs?: Record<string, string>;
}

/** A controlled chart host. The returned element exposes `setOption`,
 *  `rebuildTheme` and `destroy` so the host manages state/lifecycle. */
export interface ChartElement extends HTMLDivElement {
  /** Push a new ECharts option without re-creating the instance. */
  setOption(option: unknown, notMerge?: boolean): void;
  /** Re-read tokens and rebuild the instance (e.g. on a forced theme toggle). */
  rebuildTheme(): void;
  /** Dispose the instance and disconnect observers/listeners. */
  destroy(): void;
}

export function chart(opts: ChartOptions = {}): ChartElement {
  ensureStyles("chart", CSS);

  const notMerge = opts.notMerge ?? true;
  const themeName = "dc-chart-" + themeSeq++;

  const classes = ["dc-chart", opts.class].filter(Boolean).join(" ");
  const node = el("div", { class: classes }) as ChartElement;
  if (opts.width !== undefined) node.style.width = opts.width;
  if (opts.height !== undefined) node.style.height = opts.height;
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);

  let inst: EChartsInstance | null = null;
  let missing: HTMLDivElement | null = null;
  let currentOption = opts.option;

  const getEcharts = (): EChartsLike | undefined =>
    typeof window !== "undefined"
      ? (globalThis as { echarts?: EChartsLike }).echarts
      : undefined;

  const showMissing = (show: boolean): void => {
    if (show && !missing) {
      missing = el("div", { class: "dc-chart__missing" }, "echarts not loaded");
      node.appendChild(missing);
    } else if (!show && missing) {
      missing.remove();
      missing = null;
    }
  };

  const build = (): void => {
    const ec = getEcharts();
    if (!ec) {
      showMissing(true);
      return;
    }
    showMissing(false);
    ec.registerTheme(themeName, readTheme(node));
    if (inst) inst.dispose();
    inst = ec.init(node, themeName, { renderer: "canvas" });
    if (currentOption) inst.setOption(currentOption, notMerge);
    if (opts.onReady) opts.onReady(inst);
  };

  const mq =
    typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  const onScheme = (): void => build();
  if (mq && mq.addEventListener) mq.addEventListener("change", onScheme);

  const ro = new ResizeObserver(() => {
    if (inst) inst.resize();
  });
  ro.observe(node);

  build();

  node.setOption = (option: unknown, merge?: boolean): void => {
    currentOption = option;
    if (inst) inst.setOption(option, merge ?? notMerge);
  };
  node.rebuildTheme = build;
  node.destroy = (): void => {
    if (mq && mq.removeEventListener) mq.removeEventListener("change", onScheme);
    ro.disconnect();
    if (inst) {
      inst.dispose();
      inst = null;
    }
  };

  return node;
}

export type { EChartsInstance, EChartsLike };
