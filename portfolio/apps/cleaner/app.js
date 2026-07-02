"use strict";
(() => {
  // ../../amenan-ui/src/kernel/dom.ts
  function esc(v) {
    return String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
  }
  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs ?? {})) {
      if (v == null) continue;
      if (k === "class") node.className = String(v);
      else if (k.startsWith("on") && typeof v === "function") {
        node.addEventListener(k.slice(2), v);
      } else node.setAttribute(k, String(v));
    }
    for (const c of children.flat(Infinity)) {
      if (c == null) continue;
      const isNode = typeof c === "object" && c !== null && "nodeType" in c;
      node.appendChild(isNode ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  // ../../amenan-ui/src/theme/theme.ts
  var THEME_KEY = "amu-theme";
  var MODE_KEY = "amu-mode";
  var DEFAULT_THEME = "redpash";
  var DEFAULT_MODE = "dark";
  var listeners = /* @__PURE__ */ new Set();
  function isMode(v) {
    return v === "dark" || v === "light";
  }
  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  function appliedMode() {
    try {
      const m = document.documentElement?.dataset?.mode;
      return isMode(m) ? m : null;
    } catch {
      return null;
    }
  }
  function getTheme() {
    const t = read(THEME_KEY);
    if (t && !isMode(t)) return t;
    return DEFAULT_THEME;
  }
  function getMode() {
    const m = read(MODE_KEY);
    if (isMode(m)) return m;
    const applied = appliedMode();
    if (applied) return applied;
    const legacy = read(THEME_KEY);
    if (isMode(legacy)) return legacy;
    return DEFAULT_MODE;
  }
  function setMode(mode) {
    try {
      document.documentElement.dataset.mode = mode;
    } catch {
    }
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
    }
    const theme = getTheme();
    for (const fn of listeners) fn(theme, mode);
  }
  function toggleMode() {
    setMode(getMode() === "dark" ? "light" : "dark");
  }
  function onThemeChange(fn) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }
  var prePaintSnippet = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");var m=localStorage.getItem("${MODE_KEY}");var d=document.documentElement;var isMode=function(v){return v==="dark"||v==="light";};if(!isMode(m)){m=isMode(t)?t:"${DEFAULT_MODE}";}var theme=(t&&!isMode(t))?t:"${DEFAULT_THEME}";d.setAttribute("data-theme",theme);d.setAttribute("data-mode",m);}catch(e){}})();`;

  // ../../amenan-ui/src/components/tabs/tabs.ts
  function mountTabs(host, cfg) {
    const { items, value, defaultValue, onChange: onChange2, variant = "underline", block } = cfg;
    const first = items[0];
    let internal = defaultValue != null ? defaultValue : first ? first.id : void 0;
    let controlled = value;
    const classes = [
      "amu-tabs",
      `amu-tabs--${variant}`,
      block ? "amu-tabs--block" : null
    ].filter(Boolean).join(" ");
    const root2 = el("div", { class: classes, role: "tablist" });
    const buttons = /* @__PURE__ */ new Map();
    function render() {
      const active2 = controlled != null ? controlled : internal;
      for (const [id, node] of buttons) {
        node.setAttribute("aria-selected", String(active2 === id));
      }
    }
    function pick(id) {
      if (controlled == null) internal = id;
      onChange2?.(id);
      render();
    }
    for (const t of items) {
      const node = el(
        "button",
        {
          class: "amu-tabs-tab",
          role: "tab",
          type: "button",
          onclick: () => pick(t.id)
        },
        t.icon ?? null,
        t.label,
        t.count != null ? el("span", { class: "amu-tabs-count" }, t.count) : null
      );
      buttons.set(t.id, node);
      root2.appendChild(node);
    }
    render();
    host.appendChild(root2);
    return {
      el: root2,
      update(p) {
        if ("value" in p) {
          controlled = p.value;
          render();
        }
      },
      destroy() {
        root2.remove();
      }
    };
  }

  // ../../amenan-ui/src/components/atoms/atoms.ts
  function button(cfg) {
    const cls = ["amu-btn"];
    if (cfg.variant) cls.push(`amu-btn--${cfg.variant}`);
    if (cfg.size) cls.push(`amu-btn--${cfg.size}`);
    if (cfg.icon && cfg.label == null) cls.push("amu-btn--icon");
    const b = el(
      "button",
      {
        class: cls.join(" "),
        type: cfg.type ?? "button",
        onclick: cfg.onClick,
        title: cfg.title ?? null,
        "aria-label": cfg.ariaLabel ?? cfg.title ?? null
      },
      cfg.icon ? el("i", { class: "bi " + cfg.icon }) : null,
      cfg.label ?? null
    );
    if (cfg.disabled) b.disabled = true;
    return b;
  }
  function input(cfg = {}) {
    const i = el("input", {
      class: "amu-input",
      type: cfg.type ?? "text",
      placeholder: cfg.placeholder ?? ""
    });
    if (cfg.value != null) i.value = cfg.value;
    const onInput = cfg.onInput;
    if (onInput) i.addEventListener("input", () => onInput(i.value));
    const onEnter = cfg.onEnter;
    if (onEnter) {
      i.addEventListener("keydown", (e) => {
        if (e.key === "Enter") onEnter(i.value);
      });
    }
    return i;
  }
  function badge(cfg) {
    return el(
      "span",
      { class: `amu-badge${cfg.tone ? ` amu-badge--${cfg.tone}` : ""}` },
      cfg.label
    );
  }
  function spinner() {
    return el("span", { class: "amu-spinner", role: "status", "aria-label": "Loading" });
  }

  // ../../amenan-ui/src/components/empty-state/empty-state.ts
  function mountEmptyState(host, cfg) {
    const node = el(
      "div",
      { class: "amu-empty" },
      el("h3", { class: "amu-empty-title" }, cfg.title),
      cfg.line ? el("p", { class: "amu-empty-line" }, cfg.line) : null,
      cfg.action ? button({ variant: "accent", ...cfg.action }) : null
    );
    host.append(node);
    return { el: node, update() {
    }, destroy: () => node.remove() };
  }

  // ../../amenan-ui/src/components/modal/modal.ts
  function openModal(cfg) {
    const overlay = el("div", { class: "amu-modal-overlay", role: "dialog", "aria-modal": "true" });
    const foot = el("div", { class: "amu-modal-foot" });
    const box = el(
      "div",
      { class: "amu-modal" },
      el("h2", { class: "amu-modal-title" }, cfg.title),
      el("div", { class: "amu-modal-body" }, cfg.body ?? ""),
      foot
    );
    function close() {
      overlay.remove();
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) {
      if (e.key === "Escape") close();
    }
    for (const a of cfg.actions ?? []) {
      const action = a;
      foot.append(
        button({
          label: action.label,
          variant: action.variant,
          onClick: () => action.onClick?.({ close })
        })
      );
    }
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener("keydown", onKey);
    overlay.append(box);
    document.body.append(overlay);
    box.querySelector("input, select, button")?.focus();
    return { el: overlay, close };
  }
  function confirmModal(cfg) {
    return new Promise((resolve) => {
      openModal({
        title: cfg.title,
        body: el("p", { class: "amu-modal-text" }, cfg.message ?? ""),
        actions: [
          {
            label: "Cancel",
            variant: "ghost",
            onClick: ({ close }) => {
              close();
              resolve(false);
            }
          },
          {
            label: cfg.confirmLabel ?? "Confirm",
            variant: cfg.danger ? "danger" : "accent",
            onClick: ({ close }) => {
              close();
              resolve(true);
            }
          }
        ]
      });
    });
  }

  // ../../amenan-ui/src/components/menu/menu.ts
  var delegated = false;
  function installDelegation() {
    if (delegated) return;
    delegated = true;
    document.addEventListener("click", (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const trigger = target?.closest("[data-dd]") ?? null;
      const openMenus = document.querySelectorAll(".amu-menu.is-open");
      for (const m of openMenus) {
        if (!trigger || m.previousElementSibling !== trigger) m.classList.remove("is-open");
      }
      if (trigger) {
        const menu = trigger.nextElementSibling;
        if (menu?.classList.contains("amu-menu")) menu.classList.toggle("is-open");
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        for (const m of document.querySelectorAll(".amu-menu.is-open")) m.classList.remove("is-open");
      }
    });
  }
  function isHeading(it) {
    return "heading" in it && it.heading === true;
  }
  function isSep(it) {
    return "sep" in it && it.sep === true;
  }
  function mountMenu(host, cfg) {
    installDelegation();
    const wrap = el("div", { class: "amu-menu-wrap" });
    const trigger = cfg.trigger;
    trigger.setAttribute("data-dd", "");
    const menu = el("div", { class: "amu-menu", role: "menu" });
    function renderItems(items) {
      menu.replaceChildren(
        ...items.map((it) => {
          if (isSep(it)) return el("div", { class: "amu-menu-sep" });
          if (isHeading(it)) return el("div", { class: "amu-menu-label" }, it.label);
          const action = it;
          return el(
            "button",
            {
              class: `amu-menu-item${action.selected ? " is-selected" : ""}`,
              type: "button",
              role: "menuitem",
              onclick: () => {
                menu.classList.remove("is-open");
                action.onSelect?.();
              }
            },
            // icon + label grouped as a left cluster (the item is space-between).
            el(
              "span",
              { class: "amu-menu-item-label" },
              action.icon ? el("i", { class: "amu-menu-item-icon bi " + action.icon }) : null,
              action.label
            )
          );
        })
      );
    }
    renderItems(cfg.items ?? []);
    wrap.append(trigger, menu);
    host.append(wrap);
    return {
      el: wrap,
      update: (partial) => {
        if (partial.items) renderItems(partial.items);
      },
      destroy: () => wrap.remove()
    };
  }

  // ../../amenan-ui/src/components/select/select.ts
  function mountSelect(host, cfg) {
    const sel = el("select", { class: "amu-select" });
    function render(options, value) {
      sel.replaceChildren(
        ...options.map((o) => {
          const opt = el("option", { value: o.value }, o.label);
          if (o.value === value) opt.selected = true;
          return opt;
        })
      );
    }
    render(cfg.options ?? [], cfg.value);
    sel.addEventListener("change", () => cfg.onChange?.(sel.value));
    host.append(sel);
    return {
      el: sel,
      update: (p) => render(p.options ?? cfg.options ?? [], p.value ?? sel.value),
      destroy: () => sel.remove()
    };
  }

  // ../../amenan-ui/src/components/toast/toast.ts
  var stack = null;
  function ensureStack() {
    if (!stack || !stack.isConnected) {
      stack = el("div", { class: "amu-toast-stack", role: "status", "aria-live": "polite" });
      document.body.append(stack);
    }
    return stack;
  }
  function toast(cfg) {
    const action = cfg.action;
    const node = el(
      "div",
      { class: `amu-toast${cfg.tone ? ` amu-toast--${cfg.tone}` : ""}` },
      el("span", {}, cfg.message),
      action ? el(
        "button",
        {
          class: "amu-toast-action",
          type: "button",
          onclick: () => {
            action.onClick?.();
            node.remove();
          }
        },
        action.label
      ) : null
    );
    ensureStack().append(node);
    const ttl = cfg.ttl ?? (action ? 6e3 : 3e3);
    setTimeout(() => node.remove(), ttl);
    return { el: node, destroy: () => node.remove() };
  }

  // ../../amenan-ui/src/components/field/field.ts
  function mountField(host, cfg) {
    const cls = ["amu-field"];
    if (cfg.inline) cls.push("amu-field--inline");
    if (cfg.bare) cls.push("amu-field--bare");
    const row = el(
      "label",
      { class: cls.join(" ") },
      el("span", { class: "amu-field-label" }, cfg.label),
      cfg.control,
      cfg.help ? el("span", { class: "amu-field-help" }, cfg.help) : null
    );
    const error = el("span", { class: "amu-field-error" });
    host.append(row);
    return {
      el: row,
      update: (p) => {
        if ("error" in p) {
          error.textContent = p.error ?? "";
          if (p.error && !error.isConnected) row.append(error);
          if (!p.error) error.remove();
        }
      },
      destroy: () => row.remove()
    };
  }

  // ../../amenan-ui/src/components/pager/pager.ts
  function mountPager(host, cfg) {
    const node = el("div", { class: "amu-pager" });
    function render({ page, pages, total }) {
      const btn = (label, p, opts = {}) => {
        const b = el(
          "button",
          {
            class: `amu-pager-btn${opts.active ? " is-active" : ""}`,
            type: "button",
            onclick: () => cfg.onPage?.(p)
          },
          label
        );
        if (opts.disabled) b.disabled = true;
        return b;
      };
      const start = Math.max(1, Math.min(page - 2, pages - 4));
      const end = Math.min(pages, start + 4);
      const numbers = [];
      for (let p = start; p <= end; p++) numbers.push(btn(String(p), p, { active: p === page }));
      node.replaceChildren(
        el("span", {}, `${total.toLocaleString()} rows`),
        el(
          "span",
          { class: "amu-pager-pages" },
          btn("\u2039", page - 1, { disabled: page <= 1 }),
          ...numbers,
          btn("\u203A", page + 1, { disabled: page >= pages })
        )
      );
    }
    render(cfg);
    host.append(node);
    return {
      el: node,
      update: (p) => render({ ...cfg, ...p }),
      destroy: () => node.remove()
    };
  }

  // ../../amenan-ui/src/components/uploader/uploader.ts
  function mountUploader(host, cfg) {
    const defaultLabel = cfg.label ?? (cfg.multiple ? "Drop CSVs here, or click to choose" : "Drop a CSV here, or click to choose");
    const fileInput = el("input", { type: "file", accept: cfg.accept ?? ".csv,.tsv,.txt" });
    if (cfg.multiple) fileInput.multiple = true;
    const label = el("div", {}, defaultLabel);
    const zone = el(
      "div",
      { class: "amu-uploader", role: "button", tabindex: "0" },
      label,
      cfg.hint ? el("div", { class: "amu-uploader-hint" }, cfg.hint) : null,
      fileInput
    );
    function pick(fileList) {
      const files2 = [...fileList ?? []].filter(Boolean);
      fileInput.value = "";
      if (!files2.length) return;
      if (cfg.onFiles) cfg.onFiles(files2);
      else if (files2[0]) cfg.onFile?.(files2[0]);
    }
    zone.addEventListener("click", () => fileInput.click());
    zone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") fileInput.click();
    });
    fileInput.addEventListener("change", () => pick(fileInput.files));
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("is-over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("is-over"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("is-over");
      pick(e.dataTransfer?.files);
    });
    host.append(zone);
    return {
      el: zone,
      busy(on, msg) {
        zone.classList.toggle("is-busy", on);
        fileInput.disabled = on;
        label.replaceChildren(on ? spinner() : document.createTextNode(defaultLabel));
        if (on && msg) label.append(document.createTextNode(" " + msg));
      },
      update() {
      },
      destroy: () => zone.remove()
    };
  }

  // ../../amenan-ui/src/components/score-badge/score-badge.ts
  function toneFor(score) {
    if (score >= 90) return "ok";
    if (score >= 70) return "warn";
    return "danger";
  }
  var REPORT_LABELS = {
    completeness: "Completeness",
    type_consistency: "Type consistency",
    value_hygiene: "Value hygiene",
    row_uniqueness: "Row uniqueness",
    structural: "Structure gate"
  };
  function mountScoreBadge(host, cfg) {
    const wrap = el("span", { class: "amu-score" });
    const pill = el("button", { class: "amu-score-pill", type: "button" });
    const pop = el("div", { class: "amu-score-pop" });
    function render({ score, report }) {
      pill.className = `amu-score-pill is-${toneFor(score ?? 0)}`;
      pill.replaceChildren(
        el("span", {}, score == null ? "\u2014" : String(Math.round(score))),
        el("span", { class: "amu-score-unit" }, "/100")
      );
      pop.replaceChildren(
        ...Object.entries(report ?? {}).map(
          ([k, v]) => el(
            "div",
            { class: "amu-score-row" },
            el("span", {}, REPORT_LABELS[k] ?? k),
            el("b", {}, k === "structural" ? `\xD7${Number(v).toFixed(2)}` : String(Math.round(Number(v))))
          )
        )
      );
      pill.disabled = !report;
    }
    render(cfg);
    pill.addEventListener("click", () => wrap.classList.toggle("is-open"));
    wrap.append(pill, pop);
    host.append(wrap);
    return {
      el: wrap,
      update: (p) => render({ ...cfg, ...p }),
      destroy: () => wrap.remove()
    };
  }

  // ../../amenan-ui/src/components/side-panel/side-panel.ts
  function mountSidePanel(host, cfg) {
    const side = cfg.side === "right" ? "right" : "left";
    const tabs = cfg.tabs ?? [];
    let active2 = cfg.active ?? tabs[0]?.id ?? null;
    let open = !cfg.collapsed;
    const bodies = /* @__PURE__ */ new Map();
    const root2 = el("div", { class: `amu-sidepanel amu-sidepanel--${side}` });
    const strip = el("div", { class: "amu-sidepanel-tabs", role: "tablist" });
    const collapseBtn = button({
      icon: side === "right" ? "bi-chevron-right" : "bi-chevron-left",
      title: "Collapse panel",
      variant: "ghost",
      size: "sm",
      onClick: () => api.toggle()
    });
    collapseBtn.classList.add("amu-sidepanel-collapse");
    const tabEls = /* @__PURE__ */ new Map();
    for (const t of tabs) {
      const chip2 = el(
        "button",
        {
          class: "amu-sidepanel-tab",
          type: "button",
          role: "tab",
          "data-tab": t.id,
          title: t.label,
          "aria-selected": "false"
        },
        t.icon ? el("i", { class: "amu-sidepanel-tab-icon bi " + t.icon }) : null,
        el("span", { class: "amu-sidepanel-tab-label" }, t.label)
      );
      chip2.addEventListener("click", () => api.setActive(t.id));
      tabEls.set(t.id, chip2);
      strip.append(chip2);
    }
    if (side === "right") strip.prepend(collapseBtn);
    else strip.append(collapseBtn);
    const body = el("div", { class: "amu-sidepanel-body" });
    root2.append(strip, body);
    function ensureBody(id) {
      let entry = bodies.get(id);
      if (entry) return entry;
      const tab = tabs.find((t) => t.id === id);
      const bh = el("div", { class: "amu-sidepanel-pane", "data-pane": id });
      body.append(bh);
      entry = { host: bh, handle: null };
      if (tab?.mount) entry.handle = tab.mount(bh) ?? null;
      bodies.set(id, entry);
      return entry;
    }
    function paintTabs() {
      for (const [id, chip2] of tabEls) {
        const on = id === active2 && open;
        chip2.classList.toggle("is-active", on);
        chip2.setAttribute("aria-selected", on ? "true" : "false");
      }
    }
    function paintPanes() {
      for (const [id, entry] of bodies) {
        entry.host.classList.toggle("is-active", open && id === active2);
      }
    }
    const api = {
      el: root2,
      body: (id) => ensureBody(id).host,
      setActive: (id) => {
        if (!tabEls.has(id)) return;
        active2 = id;
        if (open) ensureBody(id);
        paintTabs();
        paintPanes();
        cfg.onTab?.(id);
      },
      setOpen: (want) => {
        const next = !!want;
        if (next === open) return;
        open = next;
        root2.classList.toggle("is-collapsed", !open);
        if (open && active2) ensureBody(active2);
        paintTabs();
        paintPanes();
        cfg.onToggle?.(open);
      },
      toggle: () => api.setOpen(!open),
      tab: (id) => bodies.get(id)?.handle ?? null,
      destroy: () => {
        for (const { handle } of bodies.values()) handle?.destroy?.();
        root2.remove();
      }
    };
    root2.classList.toggle("is-collapsed", !open);
    if (open && active2) ensureBody(active2);
    paintTabs();
    paintPanes();
    host.append(root2);
    return api;
  }

  // ../../amenan-ui/src/components/grid-toolbar/grid-toolbar.ts
  function mountGridToolbar(host, cfg) {
    let controls2 = cfg.controls ?? [];
    let state = cfg.state;
    const root2 = el("div", { class: "amu-gtb", role: "toolbar" });
    const reg = /* @__PURE__ */ new Map();
    function render() {
      reg.clear();
      const nodes = controls2.map(buildControl).filter((n2) => n2 != null);
      root2.replaceChildren(...nodes);
      refresh2();
    }
    function buildControl(spec) {
      if (spec.kind === "sep") {
        return el("span", { class: "amu-gtb-sep", "aria-hidden": "true" });
      }
      if (spec.kind === "search") {
        const field = input({
          type: "search",
          placeholder: spec.placeholder ?? "Search\u2026",
          onInput: (q) => {
            spec.onInput?.(q);
            cfg.onAction?.(spec.id, { value: q });
          }
        });
        if (spec.value != null) field.value = spec.value;
        field.classList.add("amu-gtb-input");
        const wrap = el(
          "div",
          { class: "amu-gtb-search" },
          el("i", { class: "amu-gtb-search-icon bi bi-search" }),
          field
        );
        reg.set(spec.id, { spec, node: wrap, kind: "search", searchInput: field });
        return wrap;
      }
      if (spec.kind === "chip") {
        const c = el("button", { class: "amu-gtb-chip", type: "button", "data-gtb": spec.id }, "");
        reg.set(spec.id, { spec, node: c, kind: "chip" });
        return c;
      }
      if (spec.kind === "menu") {
        const trigger = button({
          icon: spec.icon,
          label: spec.label,
          title: spec.title,
          variant: spec.variant ?? "ghost"
        });
        const wrap = el("div", { class: "amu-gtb-item" });
        const handle = mountMenu(wrap, {
          trigger,
          items: (spec.items ?? []).map((it) => ({
            label: it.label,
            icon: it.icon,
            onSelect: () => cfg.onAction?.(it.id, { menu: spec.id })
          }))
        });
        reg.set(spec.id, { spec, node: wrap, kind: "menu", menuHandle: handle });
        return wrap;
      }
      const btn = button({
        icon: spec.icon,
        label: spec.label,
        title: spec.title,
        variant: spec.variant ?? "ghost"
      });
      btn.dataset.gtb = spec.id;
      if (spec.kind === "toggle") {
        btn.classList.add("amu-gtb-toggle");
        if (spec.group != null) btn.dataset.gtbGroup = spec.group;
        btn.setAttribute("aria-pressed", "false");
      }
      reg.set(spec.id, { spec, node: btn, kind: spec.kind });
      return btn;
    }
    function refresh2() {
      for (const entry of reg.values()) {
        const { spec, node, kind } = entry;
        if (kind === "button" && spec.kind === "button") {
          const ok = spec.when ? !!spec.when(state) : true;
          node.classList.toggle("is-hidden", !ok);
          node.disabled = !ok;
        } else if (kind === "toggle" && spec.kind === "toggle") {
          const on = spec.active ? !!spec.active(state) : node.classList.contains("is-active");
          node.classList.toggle("is-active", on);
          node.setAttribute("aria-pressed", on ? "true" : "false");
        } else if (kind === "chip" && spec.kind === "chip") {
          const vis = spec.visible ? !!spec.visible(state) : true;
          node.classList.toggle("is-hidden", !vis);
          node.textContent = spec.label ? spec.label(state) : "";
        }
      }
    }
    root2.addEventListener("click", (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const t = target?.closest("[data-gtb]");
      if (!t || !root2.contains(t) || t.disabled) return;
      const id = t.dataset.gtb;
      if (id == null) return;
      const r = cfg.onAction?.(id, {});
      if (isPromiseLike(r) && !t.classList.contains("is-spinning")) {
        t.classList.add("is-spinning");
        const minSpin = new Promise((res) => setTimeout(res, 700));
        Promise.allSettled([Promise.resolve(r), minSpin]).then(
          () => t.classList.remove("is-spinning")
        );
      }
    });
    render();
    host.append(root2);
    return {
      el: root2,
      update: (p = {}) => {
        if ("state" in p) state = p.state;
        if (p.controls) {
          controls2 = p.controls;
          render();
        } else refresh2();
      },
      /** Reflect a toggle's on/off (the consumer enforces group exclusivity). */
      setActive: (id, on) => {
        const e = reg.get(id);
        if (!e) return;
        e.node.classList.toggle("is-active", !!on);
        e.node.setAttribute("aria-pressed", on ? "true" : "false");
      },
      setDisabled: (id, off) => {
        const e = reg.get(id);
        if (e) e.node.disabled = !!off;
      },
      destroy: () => {
        for (const { menuHandle } of reg.values()) menuHandle?.destroy?.();
        root2.remove();
      }
    };
  }
  function isPromiseLike(v) {
    return v != null && typeof v.then === "function";
  }

  // ../../amenan-ui/src/components/chart/build.ts
  var TYPES = {
    cartesian: [
      ["bar", "bi-bar-chart", "Bar"],
      ["line", "bi-graph-up", "Line"],
      ["area", "bi-graph-up-arrow", "Area"]
    ],
    barh: [["barh", "bi-bar-chart-steps", "Horizontal"]],
    scatter: [["scatter", "bi-circle", "Scatter"]],
    pie: [
      ["pie", "bi-pie-chart-fill", "Pie"],
      ["donut", "bi-circle", "Donut"],
      ["half_donut", "bi-circle-half", "Half-donut"],
      ["rose", "bi-flower2", "Rose"]
    ],
    radar: [["radar", "bi-pentagon", "Radar"]],
    gauge: [["gauge", "bi-speedometer", "Gauge"]],
    pictorial: [["pictorial", "bi-dice-3", "Pictorial"]]
  };
  var TYPE_TO_KIND = {};
  Object.entries(TYPES).forEach(
    ([kind, list]) => list.forEach(([t]) => {
      TYPE_TO_KIND[t] = kind;
    })
  );
  var TYPE_LIST = Object.values(TYPES).flat();

  // ../../amenan-ui/src/components/filter-panel/filter-node.ts
  var PRED_OPS = [
    { value: "eq", label: "equals" },
    { value: "neq", label: "does not equal" },
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "does not contain" },
    { value: "starts_with", label: "starts with" },
    { value: "ends_with", label: "ends with" },
    { value: "gt", label: "greater than" },
    { value: "gte", label: "greater than or equal" },
    { value: "lt", label: "less than" },
    { value: "lte", label: "less than or equal" },
    { value: "between", label: "is between" },
    { value: "in", label: "is one of" },
    { value: "is_null", label: "is empty" },
    { value: "not_null", label: "is not empty" }
  ];
  var VALUELESS_OPS = /* @__PURE__ */ new Set(["is_null", "not_null"]);
  var RANGE_OPS = /* @__PURE__ */ new Set(["between"]);
  var LIST_OPS = /* @__PURE__ */ new Set(["in", "not_in"]);
  function blankRow() {
    return { col: "", op: "eq", value: "", from: "", to: "", caseSensitive: false };
  }
  function isGroupRow(row) {
    return !!row && row.group === true;
  }
  function rowComplete(row) {
    if (!row || !row.col || !row.op) return false;
    if (VALUELESS_OPS.has(row.op)) return true;
    if (RANGE_OPS.has(row.op)) {
      return String(row.from ?? "").trim() !== "" && String(row.to ?? "").trim() !== "";
    }
    return String(row.value ?? "").trim() !== "";
  }
  function predValue(row) {
    const op = row.op ?? "";
    if (VALUELESS_OPS.has(op)) return void 0;
    if (RANGE_OPS.has(op)) {
      return [coerceNumber(row.from), coerceNumber(row.to)];
    }
    if (LIST_OPS.has(op)) {
      return String(row.value ?? "").split(",").map((s3) => s3.trim()).filter((s3) => s3 !== "");
    }
    return String(row.value ?? "");
  }
  function coerceNumber(v) {
    const s3 = String(v ?? "").trim();
    if (s3 === "") return s3;
    const n2 = Number(s3);
    return Number.isFinite(n2) && String(n2) === s3 ? n2 : s3;
  }
  function rowToPred(row) {
    const pred = { node: "pred", col: row.col ?? "", op: row.op ?? "" };
    const value = predValue(row);
    if (value !== void 0) pred.value = value;
    if (row.caseSensitive) pred.case_sensitive = true;
    return pred;
  }
  function blankGroup() {
    return { group: true, op: "and", children: [blankRow()] };
  }
  function rowToNode(row) {
    if (isGroupRow(row)) {
      const children = (row.children ?? []).map(rowToNode).filter((c) => c !== null);
      return children.length ? { node: "group", op: row.op === "or" ? "or" : "and", children } : null;
    }
    return rowComplete(row) ? rowToPred(row) : null;
  }
  function assembleFilter(rows, combinator) {
    const children = (rows ?? []).map(rowToNode).filter((c) => c !== null);
    return { node: "group", op: combinator === "or" ? "or" : "and", children };
  }
  function nodeToRow(child) {
    if (child && child.node === "group") {
      return {
        group: true,
        op: child.op === "or" ? "or" : "and",
        children: (child.children ?? []).map(nodeToRow)
      };
    }
    return predToRow(child);
  }
  function decomposeFilter(node) {
    if (!node || node.node !== "group" || !Array.isArray(node.children) || node.children.length === 0) {
      return { combinator: "and", rows: [blankRow()] };
    }
    const combinator = node.op === "or" ? "or" : "and";
    const rows = node.children.map(nodeToRow);
    return { combinator, rows: rows.length ? rows : [blankRow()] };
  }
  function predToRow(pred) {
    const row = blankRow();
    if (!pred || pred.node !== "pred") return row;
    row.col = pred.col ?? "";
    row.op = pred.op ?? "eq";
    row.caseSensitive = pred.case_sensitive === true;
    const op = row.op;
    if (RANGE_OPS.has(op) && Array.isArray(pred.value)) {
      row.from = pred.value[0] != null ? String(pred.value[0]) : "";
      row.to = pred.value[1] != null ? String(pred.value[1]) : "";
    } else if (LIST_OPS.has(op) && Array.isArray(pred.value)) {
      row.value = pred.value.join(", ");
    } else if (!VALUELESS_OPS.has(op) && pred.value != null) {
      row.value = String(pred.value);
    }
    return row;
  }

  // ../../amenan-ui/src/components/filter-panel/filter-panel.ts
  var MAX_GROUP_DEPTH = 2;
  function isGroupRow2(row) {
    return row.group === true;
  }
  function mountFilterPanel(host, cfg) {
    let columns = cfg.columns ?? [];
    const rows = [];
    let combinator = "and";
    const root2 = el("div", { class: "amu-fp" });
    const combo = el("div", { class: "amu-fp-combo" });
    const list = el("div", { class: "amu-fp-rows" });
    const topAdd = addBar(rows, 0);
    const foot = el(
      "div",
      { class: "amu-fp-foot" },
      button({ label: "Clear", variant: "ghost", onClick: clearAll }),
      button({ label: "Apply", variant: "accent", onClick: apply })
    );
    root2.append(combo, list, topAdd, foot);
    function setRows(next) {
      rows.length = 0;
      rows.push(...next);
    }
    function seed2(value) {
      const d = decomposeFilter(value);
      setRows(d.rows);
      combinator = d.combinator;
    }
    function columnOptions() {
      return columns.map((c) => ({ value: c.key, label: c.label ?? c.key }));
    }
    function valueCell(row) {
      const cell = el("span", { class: "amu-fp-value" });
      const op = row.op ?? "";
      if (VALUELESS_OPS.has(op)) {
        return cell;
      }
      if (RANGE_OPS.has(op)) {
        const lo = input({
          type: "number",
          placeholder: "min",
          value: row.from,
          onInput: (v) => row.from = v
        });
        const hi = input({
          type: "number",
          placeholder: "max",
          value: row.to,
          onInput: (v) => row.to = v
        });
        lo.classList.add("amu-fp-num");
        hi.classList.add("amu-fp-num");
        cell.append(lo, el("span", { class: "amu-fp-and" }, "and"), hi);
        return cell;
      }
      const placeholder = LIST_OPS.has(op) ? "a, b, c" : "value";
      const txt = input({ placeholder, value: row.value, onInput: (v) => row.value = v });
      txt.classList.add("amu-fp-text");
      cell.append(txt);
      return cell;
    }
    function comboSeg(activeOp, onChange2) {
      const seg = el("div", { class: "amu-fp-seg", role: "group", "aria-label": "Match" });
      for (const opt of [
        { v: "and", l: "All" },
        { v: "or", l: "Any" }
      ]) {
        seg.append(
          el(
            "button",
            {
              class: `amu-fp-seg-btn${activeOp === opt.v ? " is-active" : ""}`,
              type: "button",
              "aria-pressed": activeOp === opt.v ? "true" : "false",
              onclick: () => onChange2(opt.v)
            },
            opt.l
          )
        );
      }
      return seg;
    }
    function predRow(row, arr, i) {
      const colHost = el("span", { class: "amu-fp-col" });
      mountSelect(colHost, {
        options: [{ value: "", label: "Column\u2026" }, ...columnOptions()],
        value: row.col,
        onChange: (v) => row.col = v
      });
      const opHost = el("span", { class: "amu-fp-op" });
      mountSelect(opHost, {
        options: PRED_OPS,
        value: row.op,
        onChange: (v) => {
          row.op = v;
          render();
        }
      });
      const remove = button({
        label: "\u2715",
        variant: "ghost",
        size: "sm",
        onClick: () => removeAt(arr, i)
      });
      remove.classList.add("amu-fp-remove");
      remove.setAttribute("aria-label", "Remove condition");
      return el("div", { class: "amu-fp-row" }, colHost, opHost, valueCell(row), remove);
    }
    function groupRow(row, arr, i, depth) {
      const remove = button({
        label: "\u2715",
        variant: "ghost",
        size: "sm",
        onClick: () => removeAt(arr, i)
      });
      remove.classList.add("amu-fp-remove");
      remove.setAttribute("aria-label", "Remove group");
      const head = el(
        "div",
        { class: "amu-fp-group-head" },
        comboSeg(row.op, (v) => {
          row.op = v;
          render();
        }),
        remove
      );
      const childList = el("div", { class: "amu-fp-rows" });
      renderInto(childList, row.children, depth + 1);
      return el("div", { class: "amu-fp-group" }, head, childList, addBar(row.children, depth + 1));
    }
    function buildRow(row, arr, i, depth) {
      return isGroupRow2(row) ? groupRow(row, arr, i, depth) : predRow(row, arr, i);
    }
    function renderInto(container, arr, depth) {
      container.replaceChildren(...arr.map((r, i) => buildRow(r, arr, i, depth)));
    }
    function addBar(arr, depth) {
      const bar = el("div", { class: "amu-fp-add" });
      bar.append(
        button({
          label: "+ Add condition",
          variant: "ghost",
          size: "sm",
          onClick: () => {
            arr.push(blankRow());
            render();
          }
        })
      );
      if (depth < MAX_GROUP_DEPTH) {
        bar.append(
          button({
            label: "+ Add group",
            variant: "ghost",
            size: "sm",
            onClick: () => {
              arr.push(blankGroup());
              render();
            }
          })
        );
      }
      return bar;
    }
    function removeAt(arr, i) {
      arr.splice(i, 1);
      if (arr === rows && rows.length === 0) rows.push(blankRow());
      render();
    }
    function renderCombo() {
      combo.replaceChildren();
      if (rows.length <= 1) return;
      combo.append(
        el("span", { class: "amu-fp-combo-label" }, "Match"),
        comboSeg(combinator, (v) => {
          combinator = v;
          renderCombo();
        })
      );
    }
    function render() {
      renderInto(list, rows, 0);
      renderCombo();
    }
    function clearAll() {
      setRows([blankRow()]);
      combinator = "and";
      render();
      cfg.onClear?.();
    }
    function apply() {
      cfg.onApply?.(assembleFilter(rows, combinator));
    }
    seed2(cfg.value);
    render();
    host.append(root2);
    return {
      el: root2,
      update: (p = {}) => {
        if (p.columns) columns = p.columns;
        if ("value" in p) seed2(p.value);
        render();
      },
      destroy: () => root2.remove()
    };
  }

  // ../../amenan-ui/src/components/column-manager/column-manager.ts
  function enabled(op, n2) {
    if (op.scope === "global") return true;
    const min = op.min ?? 1;
    const max = op.max ?? Infinity;
    return n2 >= min && n2 <= max;
  }
  function disabledReason(op, n2) {
    const min = op.min ?? 1;
    const max = op.max ?? Infinity;
    if (min === max) return `Select exactly ${min} column${min > 1 ? "s" : ""}`;
    if (n2 < min) return `Select at least ${min} column${min > 1 ? "s" : ""}`;
    return `Select at most ${max} columns`;
  }
  var splitList = (v) => String(v ?? "").split(",").map((s3) => s3.trim()).filter((s3) => s3 !== "");
  function mountColumnManager(host, cfg) {
    let columns = cfg.columns ?? [];
    const ops = cfg.ops ?? [];
    const selected = /* @__PURE__ */ new Set();
    let activeOp = null;
    let values = {};
    const root2 = el("div", { class: "amu-colmgr" });
    const head = el("div", { class: "amu-colmgr-head" });
    const colsEl = el("div", { class: "amu-colmgr-cols" });
    const opsEl = el("div", { class: "amu-colmgr-ops" });
    const sheetEl = el("div", { class: "amu-colmgr-sheet" });
    root2.append(head, colsEl, opsEl, sheetEl);
    function defaults(op) {
      const v = {};
      for (const f of op.fields ?? []) {
        v[f.key] = f.default ?? (f.type === "bool" ? false : f.type === "sentinels" ? [] : "");
      }
      return v;
    }
    function controlFor(f) {
      if (f.type === "enum") {
        const hostEl = el("span", { class: "amu-colmgr-control" });
        mountSelect(hostEl, {
          options: (f.options ?? []).map(([value, label]) => ({ value, label })),
          value: typeof values[f.key] === "string" ? values[f.key] : void 0,
          onChange: (v) => values[f.key] = v
        });
        return hostEl;
      }
      if (f.type === "bool") {
        const box = el("input", { type: "checkbox" });
        box.checked = !!values[f.key];
        box.addEventListener("change", () => values[f.key] = box.checked);
        return box;
      }
      if (f.type === "sentinels") {
        return input({
          placeholder: f.placeholder ?? "N/A, -, ???",
          value: (Array.isArray(values[f.key]) ? values[f.key] : []).join(", "),
          onInput: (v) => values[f.key] = splitList(v)
        });
      }
      return input({
        type: f.type === "number" ? "number" : "text",
        placeholder: f.placeholder,
        value: typeof values[f.key] === "string" ? values[f.key] : "",
        onInput: (v) => values[f.key] = v
      });
    }
    function openOp(op) {
      if (!enabled(op, selected.size)) return;
      if (!(op.fields && op.fields.length)) {
        cfg.onApply?.(op, [...selected], {});
        return;
      }
      activeOp = op;
      values = defaults(op);
      render();
    }
    function opButton(op) {
      const on = enabled(op, selected.size);
      const b = button({
        label: op.label,
        icon: op.icon,
        variant: activeOp === op ? "accent" : "ghost",
        disabled: !on,
        title: on ? void 0 : disabledReason(op, selected.size),
        onClick: () => openOp(op)
      });
      b.classList.add("amu-colmgr-op");
      return b;
    }
    function renderHead() {
      head.replaceChildren(el("span", { class: "amu-colmgr-title" }, "Columns"));
      if (selected.size) {
        head.append(
          el("span", { class: "amu-colmgr-count" }, `${selected.size} selected`),
          button({
            label: "Clear",
            variant: "ghost",
            size: "sm",
            onClick: () => {
              selected.clear();
              render();
            }
          })
        );
      }
    }
    function renderCols() {
      colsEl.replaceChildren(
        ...columns.map((c) => {
          const box = el("input", { type: "checkbox" });
          box.checked = selected.has(c.key);
          box.addEventListener("change", () => {
            if (box.checked) selected.add(c.key);
            else selected.delete(c.key);
            render();
          });
          return el(
            "label",
            { class: "amu-colmgr-col" },
            box,
            el("span", { class: "amu-colmgr-col-name" }, c.label ?? c.key)
          );
        })
      );
      if (!columns.length) {
        colsEl.append(el("p", { class: "amu-colmgr-empty" }, "No columns."));
      }
    }
    function renderOps() {
      const global = ops.filter((o) => o.scope === "global");
      const column = ops.filter((o) => o.scope !== "global");
      opsEl.replaceChildren(
        el("div", { class: "amu-colmgr-group-label" }, "Whole file"),
        el("div", { class: "amu-colmgr-op-row" }, ...global.map(opButton)),
        el("div", { class: "amu-colmgr-group-label" }, "Selected columns"),
        selected.size ? el("div", { class: "amu-colmgr-op-row" }, ...column.map(opButton)) : el("p", { class: "amu-colmgr-empty" }, "Select one or more columns to clean them.")
      );
    }
    function renderSheet() {
      sheetEl.replaceChildren();
      if (!activeOp) return;
      const op = activeOp;
      sheetEl.append(el("div", { class: "amu-colmgr-sheet-title" }, op.label));
      for (const f of op.fields ?? []) {
        mountField(sheetEl, { label: f.label, control: controlFor(f) });
      }
      sheetEl.append(
        el(
          "div",
          { class: "amu-colmgr-sheet-foot" },
          button({
            label: "Cancel",
            variant: "ghost",
            onClick: () => {
              activeOp = null;
              render();
            }
          }),
          button({
            label: "Apply",
            variant: "accent",
            onClick: () => {
              cfg.onApply?.(op, [...selected], values);
              activeOp = null;
              render();
            }
          })
        )
      );
    }
    function render() {
      if (activeOp && !enabled(activeOp, selected.size)) activeOp = null;
      renderHead();
      renderCols();
      renderOps();
      renderSheet();
    }
    render();
    host.append(root2);
    return {
      el: root2,
      update: (p = {}) => {
        if (p.columns) {
          columns = p.columns;
          const keys = new Set(columns.map((c) => c.key));
          for (const k of [...selected]) if (!keys.has(k)) selected.delete(k);
        }
        render();
      },
      destroy: () => root2.remove()
    };
  }

  // ../../amenan-ui/src/components/steps-panel/steps-panel.ts
  function describe(step2) {
    const p = step2.params ?? {};
    if (p.column) return String(p.column);
    if (Array.isArray(p.cols)) return p.cols.join(", ");
    if (p.mode) return String(p.mode);
    return "";
  }
  function mountStepsPanel(host, cfg) {
    let current = cfg;
    const root2 = el("div", { class: "amu-steps" });
    const list = el("ul", { class: "amu-steps-list" });
    const undoBtn = button({ label: "Undo", size: "sm", onClick: () => current.onUndo?.() });
    const redoBtn = button({ label: "Redo", size: "sm", onClick: () => current.onRedo?.() });
    root2.append(
      el(
        "div",
        { class: "amu-steps-head" },
        el("h3", { class: "amu-steps-title" }, "Cleaning steps"),
        el("div", { class: "amu-steps-actions" }, undoBtn, redoBtn)
      ),
      list
    );
    function render(c) {
      undoBtn.disabled = !c.canUndo;
      redoBtn.disabled = !c.canRedo;
      const steps = c.steps ?? [];
      if (!steps.length) {
        list.replaceChildren(
          el("li", { class: "amu-steps-none" }, "No steps yet \u2014 the file is untouched.")
        );
        return;
      }
      list.replaceChildren(
        ...steps.map(
          (s3) => el(
            "li",
            { class: `amu-steps-item${s3.applied ? "" : " is-undone"}` },
            el("span", { class: "amu-steps-kind" }, s3.kind),
            el("span", { class: "amu-steps-detail" }, describe(s3))
          )
        )
      );
    }
    render(current);
    host.append(root2);
    return {
      el: root2,
      update: (p) => {
        current = { ...current, ...p };
        render(current);
      },
      destroy: () => root2.remove()
    };
  }

  // ../../amenan-ui/src/components/workspace-panels/workspace-panels.ts
  function mountWorkspacePanels(host) {
    const root2 = el("div", { class: "amu-wsp" });
    const left = el("div", { class: "amu-wsp-region amu-wsp-left" });
    const center = el("div", { class: "amu-wsp-region amu-wsp-center" });
    const right = el("div", { class: "amu-wsp-region amu-wsp-right" });
    const scrim = el("div", { class: "amu-wsp-scrim" });
    root2.append(left, center, right, scrim);
    const narrow = window.matchMedia("(max-width: 80rem)");
    function regionFor(side) {
      return side === "left" ? left : right;
    }
    function isOpen(side) {
      return regionFor(side).classList.contains("is-open");
    }
    function setPanelOpen(side, want) {
      const region = regionFor(side);
      const open = !!want;
      if (open) {
        const other = side === "left" ? right : left;
        other.classList.remove("is-open");
      }
      region.classList.toggle("is-open", open);
      scrim.classList.toggle(
        "is-open",
        left.classList.contains("is-open") || right.classList.contains("is-open")
      );
    }
    function togglePanel(side) {
      setPanelOpen(side, !isOpen(side));
    }
    scrim.addEventListener("click", () => {
      left.classList.remove("is-open");
      right.classList.remove("is-open");
      scrim.classList.remove("is-open");
    });
    const onWideChange = (e) => {
      if (!e.matches) {
        left.classList.remove("is-open");
        right.classList.remove("is-open");
        scrim.classList.remove("is-open");
      }
    };
    narrow.addEventListener("change", onWideChange);
    host.append(root2);
    return {
      el: root2,
      left,
      center,
      right,
      togglePanel,
      setPanelOpen,
      isOpen,
      destroy: () => {
        narrow.removeEventListener("change", onWideChange);
        root2.remove();
      }
    };
  }

  // ../../amenan-ui/src/components/redtable/virtual-rows.ts
  var WINDOW = 40;
  var OVERSCAN = 10;
  function createVirtualRows({
    scrollHost,
    tbody,
    rowCount,
    rowHeight,
    renderRow
  }) {
    const topSpacer = document.createElement("tr");
    const bottomSpacer = document.createElement("tr");
    const topCell = document.createElement("td");
    const bottomCell = document.createElement("td");
    topSpacer.appendChild(topCell);
    bottomSpacer.appendChild(bottomCell);
    for (const cell of [topCell, bottomCell]) {
      cell.colSpan = 999;
      cell.style.padding = "0";
      cell.style.border = "0";
    }
    let count = rowCount;
    function paint() {
      const scrollTop = scrollHost.scrollTop;
      const first = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
      const last = Math.min(count, first + WINDOW + OVERSCAN * 2);
      topCell.style.height = `${first * rowHeight}px`;
      bottomCell.style.height = `${Math.max(0, (count - last) * rowHeight)}px`;
      const frag = document.createDocumentFragment();
      frag.append(topSpacer);
      for (let i = first; i < last; i++) frag.append(renderRow(i));
      frag.append(bottomSpacer);
      tbody.replaceChildren(frag);
    }
    let raf = 0;
    function onScroll() {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        paint();
      });
    }
    scrollHost.addEventListener("scroll", onScroll, { passive: true });
    paint();
    return {
      repaint: paint,
      setCount(n2) {
        count = n2;
        paint();
      },
      destroy() {
        scrollHost.removeEventListener("scroll", onScroll);
        if (raf) cancelAnimationFrame(raf);
      }
    };
  }

  // ../../amenan-ui/src/components/redtable/editor-registry.ts
  var editors = /* @__PURE__ */ new Map();
  function registerEditor(dtype, factory) {
    editors.set(dtype, factory);
  }
  function defaultEditorFor(col) {
    return (col?.editor != null ? editors.get(col.editor) : void 0) ?? (col?.dtype != null ? editors.get(col.dtype) : void 0) ?? editors.get("text") ?? makeEditor();
  }
  function makeEditor({ type = "text", parse = (s3) => s3 } = {}) {
    return (td, { value, onCommit }) => {
      const prev = [...td.childNodes];
      const field = el("input", { class: "amu-input amu-redtable-editor", type });
      field.value = value == null ? "" : String(value);
      td.replaceChildren(field);
      field.focus();
      field.select();
      let done = false;
      const restore = () => td.replaceChildren(...prev);
      const commit = () => {
        if (done) return;
        done = true;
        const next = parse(field.value);
        restore();
        if (next !== void 0) onCommit?.(next);
      };
      const cancel = () => {
        if (done) return;
        done = true;
        restore();
      };
      field.addEventListener("blur", commit);
      field.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancel();
          field.blur();
        }
      });
      return { commit, cancel, el: field };
    };
  }
  function parseNumber(s3) {
    const t = s3.trim();
    if (t === "") return "";
    const n2 = Number(t);
    return Number.isFinite(n2) ? n2 : void 0;
  }
  registerEditor("text", makeEditor());
  registerEditor("int", makeEditor({ type: "number", parse: parseNumber }));
  registerEditor("float", makeEditor({ type: "number", parse: parseNumber }));

  // ../../amenan-ui/src/components/redtable/redtable.ts
  var AUTO_VIRTUAL_AT = 200;
  function cellHTML(row, col) {
    const v = row[col.key];
    if (v == null || v === "") return `<span class="amu-redtable-null">\u2014</span>`;
    return esc(v);
  }
  function mountRedTable(host, cfg) {
    if (typeof cfg.rowKey !== "function") {
      throw new Error("redtable: rowKey(row) is required");
    }
    let rows = cfg.rows ?? [];
    let interaction = cfg.interaction ?? (cfg.selectable ? "select" : "browse");
    const selected = /* @__PURE__ */ new Set();
    let activeEditor = null;
    const resolveEditor = cfg.editorFor ?? defaultEditorFor;
    const root2 = el("div", { class: "amu-redtable" });
    const scroll = el("div", { class: "amu-redtable-scroll" });
    const table = el("table");
    const thead = el("thead");
    const tbody = el("tbody");
    table.append(thead, tbody);
    scroll.append(table);
    root2.append(scroll);
    const foot = el("div", { class: "amu-redtable-foot" });
    let footMounted = false;
    let virt = null;
    let page = 1;
    const pageSize = cfg.pageSize ?? 50;
    let emptyHandle = null;
    function applyInteractionClass() {
      root2.classList.toggle("is-select", interaction === "select");
      root2.classList.toggle("is-edit", interaction === "edit");
      root2.classList.toggle("is-delete", interaction === "delete");
    }
    function mode() {
      if (cfg.mode && cfg.mode !== "auto") return cfg.mode;
      return rows.length > AUTO_VIRTUAL_AT ? "virtual" : "pager";
    }
    function colCount() {
      return cfg.columns.length + (interaction === "select" ? 1 : 0) + (cfg.rowNumbers ? 1 : 0);
    }
    function renderHead() {
      const ths = cfg.columns.map((c) => {
        if (!cfg.sortable) return el("th", { scope: "col" }, c.label ?? c.key);
        const sorted = cfg.sort != null && cfg.sort.col === c.key;
        const chev = !sorted ? "bi-chevron-expand" : cfg.sort?.descending ? "bi-chevron-down" : "bi-chevron-up";
        return el(
          "th",
          {
            scope: "col",
            class: `amu-redtable-th-sort${sorted ? " is-sorted" : ""}`,
            "data-col": c.key
          },
          c.label ?? c.key,
          el("i", { class: `amu-redtable-sort bi ${chev}`, "aria-hidden": "true" })
        );
      });
      const lead = [];
      if (cfg.rowNumbers) lead.push(el("th", { class: "amu-redtable-rownum", scope: "col" }, "#"));
      if (interaction === "select") {
        lead.push(
          el(
            "th",
            { class: "amu-redtable-check-cell", scope: "col" },
            el("input", {
              type: "checkbox",
              class: "amu-redtable-check amu-redtable-check-all",
              "aria-label": "Select all"
            })
          )
        );
      }
      thead.replaceChildren(el("tr", {}, ...lead, ...ths));
      syncSelectAll();
    }
    function rowEl(row, absIndex = 0) {
      const key = cfg.rowKey(row);
      const tr = el("tr", { "data-key": key });
      if (selected.has(key)) tr.classList.add("is-selected");
      const cells = cfg.columns.map(
        (c) => `<td data-col="${esc(c.key)}"${c.dtype === "int" || c.dtype === "float" ? ' class="amu-redtable-num"' : ""}>${cellHTML(row, c)}</td>`
      ).join("");
      const hasLead = cfg.rowNumbers || interaction === "select";
      if (!hasLead) {
        tr.innerHTML = cells;
        return tr;
      }
      if (cfg.rowNumbers) {
        tr.append(el("td", { class: "amu-redtable-rownum" }, String(absIndex + 1)));
      }
      if (interaction === "select") {
        const box = el("input", {
          type: "checkbox",
          class: "amu-redtable-check",
          "aria-label": "Select row"
        });
        box.checked = selected.has(key);
        tr.append(el("td", { class: "amu-redtable-check-cell" }, box));
      }
      const holder = el("template");
      holder.innerHTML = cells;
      tr.append(holder.content);
      return tr;
    }
    function paint() {
      virt?.destroy();
      virt = null;
      emptyHandle?.destroy?.();
      emptyHandle = null;
      if (!rows.length) {
        tbody.replaceChildren();
        foot.replaceChildren();
        if (cfg.empty) {
          const holder = el("td", { colspan: String(colCount()) });
          emptyHandle = mountEmptyState(holder, cfg.empty);
          tbody.append(el("tr", {}, holder));
        }
        return;
      }
      if (mode() === "virtual") {
        foot.replaceChildren();
        const rowHeight = parseFloat(getComputedStyle(document.documentElement).fontSize) * 2.25;
        virt = createVirtualRows({
          scrollHost: scroll,
          tbody,
          rowCount: rows.length,
          rowHeight,
          renderRow: (i) => {
            const r = rows[i];
            return r ? rowEl(r, i) : document.createElement("tr");
          }
        });
      } else {
        const pages = Math.max(1, Math.ceil(rows.length / pageSize));
        page = Math.min(page, pages);
        const slice = rows.slice((page - 1) * pageSize, page * pageSize);
        tbody.replaceChildren(...slice.map((r, j) => rowEl(r, (page - 1) * pageSize + j)));
        foot.replaceChildren();
        mountPager(foot, {
          page,
          pages,
          total: rows.length,
          onPage: (p) => {
            page = p;
            paint();
          }
        });
        if (!footMounted) {
          root2.append(foot);
          footMounted = true;
        }
      }
      syncSelectAll();
    }
    function syncSelectAll() {
      const box = thead.querySelector(".amu-redtable-check-all");
      if (!box) return;
      const total = rows.length;
      const n2 = selected.size;
      box.checked = total > 0 && n2 === total;
      box.indeterminate = n2 > 0 && n2 < total;
    }
    function emitSelection() {
      cfg.onSelectChange?.([...selected]);
    }
    tbody.addEventListener("click", (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const tr = target?.closest("tr[data-key]");
      if (!tr) return;
      const key = tr.dataset.key ?? "";
      const row = rows.find((r) => cfg.rowKey(r) === key);
      if (interaction === "edit") {
        const td = target?.closest("td[data-col]");
        if (td && row) beginEdit(td, row);
        cfg.onRowClick?.(row, key);
        return;
      }
      if (interaction === "delete") {
        cfg.onRowDelete?.(key);
        cfg.onRowClick?.(row, key);
        return;
      }
      if (interaction === "select") {
        if (selected.has(key)) selected.delete(key);
        else selected.add(key);
        tr.classList.toggle("is-selected", selected.has(key));
        const box = tr.querySelector(".amu-redtable-check");
        if (box) box.checked = selected.has(key);
        syncSelectAll();
        emitSelection();
      }
      cfg.onRowClick?.(row, key);
    });
    thead.addEventListener("click", (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const box = target?.closest(".amu-redtable-check-all");
      if (box) {
        if (box.checked) for (const r of rows) selected.add(cfg.rowKey(r));
        else selected.clear();
        for (const tr of tbody.querySelectorAll("tr[data-key]")) {
          const on = selected.has(tr.dataset.key ?? "");
          tr.classList.toggle("is-selected", on);
          const c = tr.querySelector(".amu-redtable-check");
          if (c) c.checked = on;
        }
        syncSelectAll();
        emitSelection();
        return;
      }
      if (cfg.sortable) {
        const th = target?.closest("th[data-col]");
        if (th?.dataset.col != null) cfg.onSort?.(th.dataset.col);
      }
    });
    function beginEdit(td, row) {
      if (activeEditor) {
        activeEditor.commit();
        activeEditor = null;
      }
      const colKey = td.dataset.col ?? "";
      const col = cfg.columns.find((c) => c.key === colKey);
      if (!col) return;
      const key = cfg.rowKey(row);
      const factory = resolveEditor(col);
      activeEditor = factory(td, {
        value: row[colKey],
        onCommit: (value) => {
          activeEditor = null;
          cfg.onCellCommit?.(key, colKey, value);
        }
      }) ?? null;
    }
    applyInteractionClass();
    renderHead();
    paint();
    host.append(root2);
    return {
      el: root2,
      update: (p = {}) => {
        if (p.rows) {
          rows = p.rows;
          page = 1;
          if (selected.size) {
            const live = new Set(rows.map((r) => cfg.rowKey(r)));
            for (const k of [...selected]) if (!live.has(k)) selected.delete(k);
          }
        }
        if ("sort" in p) cfg.sort = p.sort;
        if ("rowNumbers" in p && p.rowNumbers !== void 0) cfg.rowNumbers = p.rowNumbers;
        if (p.columns) cfg.columns = p.columns;
        if (p.columns || "sort" in p || "rowNumbers" in p) renderHead();
        paint();
      },
      selection: () => [...selected],
      clearSelection: () => {
        selected.clear();
        for (const tr of tbody.querySelectorAll("tr.is-selected")) {
          tr.classList.remove("is-selected");
          const c = tr.querySelector(".amu-redtable-check");
          if (c) c.checked = false;
        }
        syncSelectAll();
        emitSelection();
      },
      /** Flip the interaction axis live (browse↔select↔edit↔delete). Re-renders
          head + body so the checkbox column appears/disappears in one pass. */
      setInteraction: (m) => {
        if (m === interaction) return;
        if (activeEditor) {
          activeEditor.cancel();
          activeEditor = null;
        }
        interaction = m;
        applyInteractionClass();
        renderHead();
        paint();
      },
      destroy: () => {
        virt?.destroy();
        root2.remove();
      }
    };
  }

  // ../../amenan-ui/src/components/grid-view/grid-view.ts
  function mountGridView(host, cfg) {
    const root2 = el("div", { class: "amu-gridview" });
    let toolbar = null;
    if (cfg.toolbar) {
      const tbHost = el("div", { class: "amu-gridview-toolbar" });
      root2.append(tbHost);
      toolbar = mountGridToolbar(tbHost, cfg.toolbar);
    }
    const sheetHost = el("div", { class: "amu-gridview-sheet" });
    root2.append(sheetHost);
    function setSheet(node) {
      if (node) sheetHost.replaceChildren(node);
      else sheetHost.replaceChildren();
      sheetHost.classList.toggle("is-empty", !node);
    }
    setSheet(cfg.sheet ?? null);
    const tableHost = el("div", { class: "amu-gridview-table" });
    root2.append(tableHost);
    const table = mountRedTable(
      tableHost,
      cfg.table ?? { columns: [], rows: [], rowKey: (r) => String(r) }
    );
    host.append(root2);
    return {
      el: root2,
      table,
      toolbar,
      setSheet,
      update: (p = {}) => {
        const t = {};
        if ("rows" in p) t.rows = p.rows;
        if ("columns" in p) t.columns = p.columns;
        if (Object.keys(t).length) table.update?.(t);
        if ("state" in p) toolbar?.update?.({ state: p.state });
      },
      destroy: () => {
        toolbar?.destroy?.();
        table.destroy?.();
        root2.remove();
      }
    };
  }

  // web/engine.ts
  var step = (kind, params = {}) => ({ kind, params });
  var FileEngine = class {
    worker;
    seq = 0;
    inflight = /* @__PURE__ */ new Map();
    dead = false;
    constructor(workerUrl = "engine/worker.js") {
      this.worker = new Worker(workerUrl);
      this.worker.onmessage = (e) => {
        const { id, ok, result, error } = e.data;
        const p = this.inflight.get(id);
        if (!p) return;
        this.inflight.delete(id);
        if (ok) p.resolve(result);
        else p.reject(new Error(error || "engine error"));
      };
    }
    call(op, payload) {
      if (this.dead) return Promise.reject(new Error("engine destroyed"));
      return new Promise((resolve, reject) => {
        const id = ++this.seq;
        this.inflight.set(id, { resolve, reject });
        this.worker.postMessage({ id, op, payload });
      });
    }
    /** Parse CSV bytes into the resident Workbook. `tld` is the encoding hint ("fr"). */
    load(bytes, tld) {
      return this.call("load", { bytes, tld });
    }
    /** Re-derive the current frame: replay `steps` from the immutable base. */
    async setSteps(steps) {
      return this.call("set_steps", { steps: JSON.stringify(steps) });
    }
    /** A window of the current frame. */
    async view(query, offset, limit) {
      const live = query && (query.filter || query.search || query.sort && query.sort.length);
      const q = live ? JSON.stringify(query) : void 0;
      return JSON.parse(await this.call("view", { query: q, offset, limit }));
    }
    async columnsMeta() {
      return JSON.parse(await this.call("columns_meta"));
    }
    /** The cleanness report over the current frame (the slow one — off-thread). */
    async score() {
      return JSON.parse(await this.call("score"));
    }
    /** Read-only SQL over the current frame (table `t`), capped at 500 rows. */
    async sql(query) {
      return JSON.parse(await this.call("sql", { query }));
    }
    toCsv() {
      return this.call("to_csv");
    }
    destroy() {
      this.dead = true;
      for (const { reject } of this.inflight.values()) reject(new Error("engine destroyed"));
      this.inflight.clear();
      this.worker.terminate();
    }
  };
  var MAX_LIVE = 3;
  var EnginePool = class {
    // insertion order = LRU order
    constructor(bytesOf2, onEvict) {
      this.bytesOf = bytesOf2;
      this.onEvict = onEvict;
    }
    live = /* @__PURE__ */ new Map();
    /** The engine for a file — reused when warm, else parsed fresh (steps replayed). */
    async open(fileId, tld, steps) {
      const hit = this.live.get(fileId);
      if (hit) {
        this.live.delete(fileId);
        this.live.set(fileId, hit);
        return { engine: hit.engine, raw: hit.raw, fresh: false };
      }
      while (this.live.size >= MAX_LIVE) {
        const [oldId, old] = this.live.entries().next().value;
        this.live.delete(oldId);
        old.engine.destroy();
        this.onEvict?.(oldId);
      }
      const engine = new FileEngine();
      const bytes = await this.bytesOf(fileId);
      const raw = await engine.load(bytes, tld);
      if (steps && steps.length) await engine.setSteps(steps);
      this.live.set(fileId, { engine, raw });
      return { engine, raw, fresh: true };
    }
    peek(fileId) {
      return this.live.get(fileId)?.engine ?? null;
    }
    close(fileId) {
      const e = this.live.get(fileId);
      if (!e) return;
      this.live.delete(fileId);
      e.engine.destroy();
    }
    destroyAll() {
      for (const { engine } of this.live.values()) engine.destroy();
      this.live.clear();
    }
  };

  // web/ops.ts
  var s = (v, d = "") => v == null ? d : String(v);
  var OPS = [
    // ── global (whole-file) ──
    {
      id: "unwrap_csv",
      label: "Unwrap embedded CSV",
      icon: "bi-box-arrow-down",
      scope: "global",
      fields: [],
      build: () => [step("unwrap_csv")]
    },
    {
      id: "snake_case_columns",
      label: "snake_case headers",
      icon: "bi-type-underline",
      scope: "global",
      fields: [],
      build: () => [step("snake_case_columns")]
    },
    {
      id: "replace_in_names",
      label: "Replace in names\u2026",
      icon: "bi-input-cursor-text",
      scope: "global",
      fields: [
        { key: "find", type: "text", label: "Find" },
        { key: "replace", type: "text", label: "Replace with", placeholder: "(blank to remove)" }
      ],
      build: (_sel, v) => [step("replace_in_names", { find: s(v.find), replace: s(v.replace) })]
    },
    {
      id: "change_case",
      label: "Change case\u2026",
      icon: "bi-fonts",
      scope: "global",
      fields: [{ key: "mode", type: "enum", label: "Case", options: [["lower", "lowercase"], ["upper", "UPPERCASE"]], default: "lower" }],
      build: (_sel, v) => [step("change_case", { mode: s(v.mode, "lower") })]
    },
    // ── column-scoped ──
    {
      id: "drop_columns",
      label: "Delete selected",
      icon: "bi-trash",
      scope: "column",
      min: 1,
      fields: [],
      build: (sel) => [step("drop_columns", { cols: sel })],
      confirm: (sel) => ({ title: "Delete columns?", message: `Remove ${sel.join(", ")} from the frame.`, danger: true })
    },
    {
      id: "filter_columns",
      label: "Keep only selected",
      icon: "bi-funnel",
      scope: "column",
      min: 1,
      fields: [],
      build: (sel) => [step("filter_columns", { cols: sel })]
    },
    {
      id: "drop_nulls",
      label: "Drop rows with empty",
      icon: "bi-eraser",
      scope: "column",
      min: 1,
      fields: [],
      build: (sel) => [step("drop_nulls", { cols: sel })]
    },
    {
      id: "fill_nulls",
      label: "Fill empties\u2026",
      icon: "bi-droplet",
      scope: "column",
      min: 1,
      fields: [
        { key: "strategy", type: "enum", label: "With", options: [["fixed", "a value"], ["forward", "previous value"], ["zero", "zero"]], default: "fixed" },
        { key: "value", type: "text", label: "Value", placeholder: 'when "a value"' }
      ],
      build: (sel, v) => sel.map((c) => step("fill_nulls", { column: c, strategy: s(v.strategy, "fixed"), value: s(v.value) }))
    },
    {
      id: "replace_text",
      label: "Find & replace\u2026",
      icon: "bi-search",
      scope: "column",
      min: 1,
      max: 1,
      fields: [
        { key: "find", type: "text", label: "Find" },
        { key: "replace", type: "text", label: "Replace with", placeholder: "(blank to remove)" },
        { key: "is_regex", type: "bool", label: "Regular expression", default: false }
      ],
      build: (sel, v) => [step("replace_text", { column: sel[0], find: s(v.find), replace: s(v.replace), is_regex: !!v.is_regex })]
    },
    {
      id: "cast",
      label: "Change type\u2026",
      icon: "bi-shuffle",
      scope: "column",
      min: 1,
      max: 1,
      fields: [{ key: "dtype", type: "enum", label: "To type", options: [["str", "Text"], ["int", "Integer"], ["float", "Decimal"], ["bool", "Boolean"], ["date", "Date"]], default: "str" }],
      build: (sel, v) => [step("cast", { column: sel[0], dtype: s(v.dtype, "str") })],
      confirm: (sel, v) => ({
        title: `Cast ${sel[0]} \u2192 ${s(v.dtype, "str")}?`,
        message: "Values that don't fit the new type become blank (the step is undoable)."
      })
    },
    {
      id: "rename_column",
      label: "Rename\u2026",
      icon: "bi-pencil",
      scope: "column",
      min: 1,
      max: 1,
      fields: [{ key: "to", type: "text", label: "New name" }],
      build: (sel, v) => [step("rename_column", { from: sel[0], to: s(v.to) })]
    },
    {
      id: "split_column",
      label: "Split\u2026",
      icon: "bi-scissors",
      scope: "column",
      min: 1,
      max: 1,
      fields: [
        { key: "sep", type: "text", label: "Separator", default: "," },
        { key: "keep_original", type: "bool", label: "Keep original column", default: false }
      ],
      build: (sel, v) => [step("split_column", { column: sel[0], sep: s(v.sep, ","), keep_original: !!v.keep_original })]
    },
    {
      id: "join_columns",
      label: "Combine\u2026",
      icon: "bi-link-45deg",
      scope: "column",
      min: 2,
      max: 2,
      fields: [
        { key: "sep", type: "text", label: "Separator", default: " " },
        { key: "new_name", type: "text", label: "New column name" }
      ],
      build: (sel, v) => [step("join_columns", { col1: sel[0], col2: sel[1], sep: s(v.sep, " "), new_name: s(v.new_name) || `${sel[0]}_${sel[1]}` })]
    },
    {
      id: "format_dates",
      label: "Format dates\u2026",
      icon: "bi-calendar3",
      scope: "column",
      min: 1,
      max: 1,
      fields: [
        { key: "fmt", type: "text", label: "Format", default: "%Y-%m-%d", placeholder: "%Y-%m-%d" },
        { key: "on_incomplete", type: "enum", label: "If unparseable", options: [["null", "blank it"], ["drop", "drop the row"], ["keep", "keep as-is"]], default: "null" }
      ],
      build: (sel, v) => [step("format_dates", { column: sel[0], fmt: s(v.fmt) || "%Y-%m-%d", on_incomplete: s(v.on_incomplete, "null") })]
    },
    {
      id: "fix_invalid",
      label: "Fix invalid\u2026",
      icon: "bi-bandaid",
      scope: "column",
      min: 1,
      fields: [{ key: "sentinels", type: "sentinels", label: "Treat as invalid", placeholder: "N/A, -, ??? \u2026" }],
      build: (sel, v) => [step("fix_invalid", { columns: sel, sentinels: s(v.sentinels).split(",").map((x) => x.trim()).filter(Boolean) })]
    }
  ];

  // web/session.ts
  function newSession() {
    return {
      applied: [],
      redo: [],
      filter: null,
      search: "",
      sort: null,
      offset: 0,
      pageLimit: 100,
      hiddenCols: /* @__PURE__ */ new Set(),
      selectedRows: /* @__PURE__ */ new Set(),
      mode: "",
      rowNumbers: false,
      cols: [],
      totalRows: 0,
      score: null
    };
  }
  function querySpec(s3) {
    const q = {};
    if (s3.filter) q.filter = s3.filter;
    if (s3.search) q.search = s3.search;
    if (s3.sort) q.sort = [s3.sort];
    return q.filter || q.search || q.sort ? q : null;
  }
  function pruneToColumns(s3) {
    const names = new Set(s3.cols.map((c) => c.name));
    for (const h of [...s3.hiddenCols]) if (!names.has(h)) s3.hiddenCols.delete(h);
    if (s3.sort && !names.has(s3.sort.col)) s3.sort = null;
    if (s3.offset >= s3.totalRows) s3.offset = 0;
    s3.selectedRows.clear();
  }

  // web/service-local.ts
  var KEY = "cleaner-store-v1";
  var rid = (prefix) => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
  function seed() {
    const project = {
      id: rid("CLP"),
      name: "dossier",
      status: "cleaning",
      description: "The Fleury case extract \u2014 101k wrapped rows, Windows-1252, sentinels."
    };
    const file = {
      id: rid("CLF"),
      projectId: project.id,
      filename: "dossier.csv",
      sourceUrl: "data/dossier.csv",
      sizeBytes: 14118431,
      steps: []
    };
    return { projects: [project], files: [file], views: [] };
  }
  var LocalStore = class {
    mode = "local";
    bag;
    constructor() {
      let bag = null;
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) bag = JSON.parse(raw);
      } catch {
      }
      this.bag = bag && Array.isArray(bag.projects) && bag.projects.length ? bag : seed();
      this.save();
    }
    save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(this.bag));
      } catch {
      }
    }
    async listProjects() {
      return [...this.bag.projects];
    }
    async createProject(name, description) {
      const p = { id: rid("CLP"), name, status: "ready", ...description ? { description } : {} };
      this.bag.projects.push(p);
      this.save();
      return p;
    }
    async deleteProject(id) {
      this.bag.projects = this.bag.projects.filter((p) => p.id !== id);
      const dead = new Set(this.bag.files.filter((f) => f.projectId === id).map((f) => f.id));
      this.bag.files = this.bag.files.filter((f) => f.projectId !== id);
      this.bag.views = this.bag.views.filter((v) => !dead.has(v.fileId));
      this.save();
    }
    async listFiles(projectId) {
      return this.bag.files.filter((f) => f.projectId === projectId).map((f) => ({ ...f }));
    }
    async createFile(meta) {
      const f = { ...meta, id: rid("CLF") };
      this.bag.files.push(f);
      this.save();
      return { ...f };
    }
    async patchFile(id, patch) {
      const f = this.bag.files.find((x) => x.id === id);
      if (!f) throw new Error(`no such file: ${id}`);
      Object.assign(f, patch);
      this.save();
    }
    async deleteFile(id) {
      this.bag.files = this.bag.files.filter((f) => f.id !== id);
      this.bag.views = this.bag.views.filter((v) => v.fileId !== id);
      this.save();
    }
    async listViews(fileId) {
      return this.bag.views.filter((v) => v.fileId === fileId).map((v) => ({ ...v }));
    }
    async createView(v) {
      const view = { ...v, id: rid("CLV") };
      this.bag.views.push(view);
      this.save();
      return { ...view };
    }
    async deleteView(id) {
      this.bag.views = this.bag.views.filter((v) => v.id !== id);
      this.save();
    }
  };

  // web/service-birama.ts
  var s2 = (v) => typeof v === "string" && v ? v : void 0;
  var n = (v) => typeof v === "number" ? v : void 0;
  var BiramaStore = class _BiramaStore {
    constructor(base) {
      this.base = base;
    }
    mode = "birama";
    etags = /* @__PURE__ */ new Map();
    /** Probe the objects surface (registering auth on the way); null = not usable
        (API up but the cleaner types aren't registered → the caller falls back). */
    static async connect(base) {
      const store2 = new _BiramaStore(base);
      let r = await store2.raw("GET", "/api/objects/cleaner_project");
      if (r.status === 401) {
        const login = await store2.raw("POST", "/auth/dev-login", {});
        if (!login.ok) return null;
        r = await store2.raw("GET", "/api/objects/cleaner_project");
      }
      return r.ok ? store2 : null;
    }
    raw(method, path, body, etag) {
      return fetch(this.base + path, {
        method,
        credentials: "include",
        headers: {
          ...body !== void 0 ? { "content-type": "application/json" } : {},
          ...etag ? { "if-match": etag } : {}
        },
        ...body !== void 0 ? { body: JSON.stringify(body) } : {}
      });
    }
    async json(r) {
      if (!r.ok) {
        const detail = await r.text().catch(() => "");
        throw new Error(`birama ${r.status}: ${detail.slice(0, 200)}`);
      }
      return await r.json();
    }
    remember(e) {
      this.etags.set(e.id, e.etag);
      return e;
    }
    async list(type) {
      const out = [];
      let offset = 0;
      for (; ; ) {
        const page = await this.json(
          await this.raw("GET", `/api/objects/${type}?limit=200&offset=${offset}`)
        );
        out.push(...page.items.map((e) => this.remember(e)));
        if (page.items.length < 200) return out;
        offset += 200;
      }
    }
    async create(type, data) {
      return this.remember(await this.json(await this.raw("POST", `/api/objects/${type}`, data)));
    }
    /** PATCH with the cached etag; one refetch-and-retry on a 412 race. */
    async patch(type, id, data) {
      for (let attempt = 0; ; attempt++) {
        const r = await this.raw("PATCH", `/api/objects/${type}/${id}`, data, this.etags.get(id) ?? 'W/"0"');
        if (r.ok) {
          this.remember(await r.json());
          return;
        }
        if ((r.status === 412 || r.status === 428) && attempt === 0) {
          this.remember(await this.json(await this.raw("GET", `/api/objects/${type}/${id}`)));
          continue;
        }
        throw new Error(`birama patch ${r.status}`);
      }
    }
    async del(type, id) {
      for (let attempt = 0; ; attempt++) {
        const r = await this.raw("DELETE", `/api/objects/${type}/${id}`, void 0, this.etags.get(id) ?? 'W/"0"');
        if (r.ok || r.status === 404) return;
        if ((r.status === 412 || r.status === 428) && attempt === 0) {
          this.remember(await this.json(await this.raw("GET", `/api/objects/${type}/${id}`)));
          continue;
        }
        throw new Error(`birama delete ${r.status}`);
      }
    }
    // ── projects ──
    async listProjects() {
      return (await this.list("cleaner_project")).map((e) => ({
        id: e.id,
        name: s2(e.data["name"]) ?? e.id,
        status: s2(e.data["status"]) ?? "ready",
        ...s2(e.data["description"]) ? { description: s2(e.data["description"]) } : {}
      }));
    }
    async createProject(name, description) {
      const e = await this.create("cleaner_project", { name, status: "ready", ...description ? { description } : {} });
      return { id: e.id, name, status: "ready", ...description ? { description } : {} };
    }
    deleteProject(id) {
      return this.del("cleaner_project", id);
    }
    // ── files ──
    async listFiles(projectId) {
      return (await this.list("cleaner_file")).filter((e) => e.data["project_id"] === projectId).map((e) => ({
        id: e.id,
        projectId,
        filename: s2(e.data["filename"]) ?? e.id,
        ...s2(e.data["source_url"]) ? { sourceUrl: s2(e.data["source_url"]) } : {},
        ...n(e.data["rows"]) !== void 0 ? { rows: n(e.data["rows"]) } : {},
        ...n(e.data["cols"]) !== void 0 ? { cols: n(e.data["cols"]) } : {},
        ...n(e.data["size_bytes"]) !== void 0 ? { sizeBytes: n(e.data["size_bytes"]) } : {},
        ...n(e.data["score"]) !== void 0 ? { score: n(e.data["score"]) } : {},
        steps: Array.isArray(e.data["steps"]) ? e.data["steps"] : []
      }));
    }
    async createFile(meta) {
      const e = await this.create("cleaner_file", {
        project_id: meta.projectId,
        filename: meta.filename,
        ...meta.sourceUrl ? { source_url: meta.sourceUrl } : {},
        ...meta.sizeBytes !== void 0 ? { size_bytes: meta.sizeBytes } : {},
        steps: meta.steps
      });
      return { ...meta, id: e.id };
    }
    patchFile(id, patch) {
      const data = {};
      if (patch.filename !== void 0) data["filename"] = patch.filename;
      if (patch.rows !== void 0) data["rows"] = patch.rows;
      if (patch.cols !== void 0) data["cols"] = patch.cols;
      if (patch.score !== void 0) data["score"] = patch.score == null ? null : Math.round(patch.score);
      if (patch.steps !== void 0) data["steps"] = patch.steps;
      return this.patch("cleaner_file", id, data);
    }
    deleteFile(id) {
      return this.del("cleaner_file", id);
    }
    // ── saved views ──
    async listViews(fileId) {
      return (await this.list("cleaner_view")).filter((e) => e.data["file_id"] === fileId).map((e) => ({
        id: e.id,
        fileId,
        name: s2(e.data["name"]) ?? e.id,
        query: e.data["query"] ?? {}
      }));
    }
    async createView(v) {
      const e = await this.create("cleaner_view", { file_id: v.fileId, name: v.name, query: v.query });
      return { ...v, id: e.id };
    }
    deleteView(id) {
      return this.del("cleaner_view", id);
    }
  };

  // web/store.ts
  async function connectStore() {
    const base = new URLSearchParams(location.search).get("api") ?? (() => {
      try {
        return localStorage.getItem("cleaner-api") ?? "";
      } catch {
        return "";
      }
    })();
    try {
      const r = await fetch(`${base}/healthz`, { signal: AbortSignal.timeout(800) });
      if (r.ok) {
        const body = await r.json();
        if (body.status === "ok") {
          const birama = await BiramaStore.connect(base);
          if (birama) return birama;
        }
      }
    } catch {
    }
    return new LocalStore();
  }

  // web/app.ts
  var store;
  var projects = [];
  var files = [];
  var activeProjectId = null;
  var activeFileId = null;
  var sessions = /* @__PURE__ */ new Map();
  var lastViewTotal = 0;
  var sessionBytes = /* @__PURE__ */ new Map();
  async function bytesOf(fileId) {
    const held = sessionBytes.get(fileId);
    if (held) return held;
    const meta = files.find((f) => f.id === fileId);
    if (meta?.sourceUrl) {
      const b = await (await fetch(meta.sourceUrl)).arrayBuffer();
      sessionBytes.set(fileId, b);
      return b;
    }
    throw new Error("bytes for this import live in the session \u2014 re-import the file");
  }
  var pool = new EnginePool(bytesOf);
  var active = () => activeFileId ? sessions.get(activeFileId) ?? null : null;
  var activeMeta = () => files.find((f) => f.id === activeFileId) ?? null;
  async function engineFor(fileId) {
    const sess = sessions.get(fileId);
    return (await pool.open(fileId, "fr", sess?.applied)).engine;
  }
  var root = document.getElementById("root");
  var status = el("span", { class: "cl-status" }, "booting\u2026");
  var modeBadgeHost = el("span", { class: "cl-mode" });
  var themeIcon = el("i", { class: `bi ${getMode() === "dark" ? "bi-sun" : "bi-moon"}` });
  var themeBtn = button({ variant: "ghost", title: "Toggle theme", ariaLabel: "Toggle theme", onClick: () => toggleMode() });
  themeBtn.replaceChildren(themeIcon);
  onThemeChange((_t, mode) => themeIcon.className = `bi ${mode === "dark" ? "bi-sun" : "bi-moon"}`);
  var topbar = el(
    "div",
    { class: "cl-topbar" },
    button({ icon: "bi-arrow-left", variant: "ghost", title: "Back", ariaLabel: "Back", onClick: () => history.back() }),
    el("h1", { class: "cl-title" }, el("i", { class: "bi bi-magic" }), " Cleaner"),
    el("span", { class: "cl-spacer" }),
    status,
    modeBadgeHost,
    button({ icon: "bi-person-circle", variant: "ghost", title: "Profile", ariaLabel: "Profile" }),
    button({ icon: "bi-book", variant: "ghost", title: "Docs", ariaLabel: "Docs" }),
    themeBtn
  );
  var projTabsHost = el("div", { class: "cl-projtabs" });
  var fileTabsHost = el("div", { class: "cl-filetabs" });
  var fileChip = el("span", { class: "cl-file" });
  var scoreHost = el("span", { class: "cl-score" });
  var menuHost = el("span", { class: "cl-menu" });
  var header = el(
    "div",
    { class: "cl-header" },
    fileChip,
    scoreHost,
    el("span", { class: "cl-spacer" }),
    button({ icon: "bi-bookmark-plus", label: "Save view", variant: "ghost", onClick: () => void saveViewModal() }),
    button({ icon: "bi-download", label: "Export CSV", variant: "ghost", onClick: () => void exportCsv() }),
    menuHost
  );
  var wspHost = el("div", { class: "cl-body" });
  root.append(topbar, projTabsHost, fileTabsHost, header, wspHost);
  var mapDtype = (d) => {
    const t = d.toLowerCase();
    if (t.includes("float") || t.includes("f64") || t.includes("f32")) return "float";
    if (t.includes("int")) return "int";
    return void 0;
  };
  function tableColumns(s3) {
    return s3.cols.filter((c) => !s3.hiddenCols.has(c.name)).map((c) => {
      const dtype = mapDtype(c.dtype);
      return { key: c.name, label: c.name, ...dtype ? { dtype } : {} };
    });
  }
  function rowsOf(page) {
    return page.rows.map((r, i) => {
      const o = { __idx: page.indices[i] ?? i };
      page.columns.forEach((c, j) => o[c] = r[j]);
      return o;
    });
  }
  var fpColumns = (s3) => s3.cols.map((c) => ({ key: c.name }));
  var persistTimer;
  function schedulePersist() {
    const id = activeFileId;
    if (!id) return;
    window.clearTimeout(persistTimer);
    persistTimer = window.setTimeout(() => {
      const s3 = sessions.get(id);
      const meta = files.find((f) => f.id === id);
      if (!s3 || !meta) return;
      const scoreVal = s3.score?.score ?? null;
      meta.steps = [...s3.applied];
      meta.rows = s3.totalRows;
      meta.cols = s3.cols.length;
      meta.score = scoreVal;
      store.patchFile(id, { steps: meta.steps, rows: meta.rows, cols: meta.cols, score: scoreVal }).catch((e) => toast({ message: `Save failed: ${String(e?.message || e)}`, tone: "danger" }));
    }, 500);
  }
  function stageSteps(steps) {
    const s3 = active();
    if (!s3) return;
    s3.applied.push(...steps);
    s3.redo.length = 0;
    void refresh();
  }
  async function runOp(op, cols, values) {
    const ask = op.confirm?.(cols, values);
    if (ask && !await confirmModal({ title: ask.title, message: ask.message, ...ask.danger ? { danger: true } : {} })) return;
    stageSteps(op.build(cols, values));
  }
  function undo() {
    const s3 = active();
    if (!s3 || !s3.applied.length) return;
    s3.redo.push([s3.applied.pop()]);
    void refresh();
  }
  function redoAction() {
    const s3 = active();
    const grp = s3?.redo.pop();
    if (!s3 || !grp) return;
    s3.applied.push(...grp);
    void refresh();
  }
  var searchDebounce;
  function controls() {
    const s3 = active() ?? newSession();
    return [
      { kind: "button", id: "filters", icon: "bi-funnel", title: "Filters & views" },
      { kind: "search", id: "search", placeholder: "Search rows\u2026", value: s3.search, onInput: (q) => {
        window.clearTimeout(searchDebounce);
        searchDebounce = window.setTimeout(() => {
          const cur = active();
          if (!cur) return;
          cur.search = q;
          cur.offset = 0;
          void renderTable();
        }, 250);
      } },
      { kind: "sep" },
      { kind: "toggle", id: "mode-edit", icon: "bi-pencil-square", title: "Edit cells", group: "mode", active: (x) => x.mode === "edit" },
      { kind: "toggle", id: "mode-select", icon: "bi-check2-square", title: "Select rows", group: "mode", active: (x) => x.mode === "select" },
      { kind: "toggle", id: "mode-delete", icon: "bi-x-square", title: "Delete rows", group: "mode", active: (x) => x.mode === "delete" },
      { kind: "chip", id: "sel", label: (x) => `${x.selectedRows.size} selected`, visible: (x) => x.selectedRows.size > 0 },
      { kind: "button", id: "drop-selected", icon: "bi-trash", title: "Delete selected rows", variant: "danger", when: (x) => x.selectedRows.size > 0 },
      { kind: "sep" },
      { kind: "button", id: "refresh", icon: "bi-arrow-clockwise", title: "Refresh" },
      { kind: "toggle", id: "rownums", icon: "bi-list-ol", title: "Row numbers", active: (x) => x.rowNumbers },
      {
        kind: "menu",
        id: "rows",
        label: `${s3.pageLimit}/page`,
        title: "Rows per page",
        items: [25, 50, 100, 500].map((x) => ({ id: String(x), label: `${x} rows` }))
      },
      {
        kind: "menu",
        id: "cols",
        icon: "bi-layout-three-columns",
        title: "Show / hide columns",
        items: s3.cols.map((c) => ({ id: c.name, label: `${s3.hiddenCols.has(c.name) ? "\u25CB" : "\u25CF"} ${c.name}` }))
      },
      { kind: "sep" },
      { kind: "button", id: "undo", icon: "bi-arrow-counterclockwise", title: "Undo (Ctrl+Z)" },
      { kind: "button", id: "redo", icon: "bi-arrow-clockwise", title: "Redo (Ctrl+Shift+Z)" },
      { kind: "button", id: "tools", icon: "bi-tools", title: "Cleaning tools" }
    ];
  }
  function onToolbarAction(id, ctx) {
    const s3 = active();
    if (!s3) return;
    switch (id) {
      case "filters":
        panels.togglePanel("left");
        break;
      case "tools":
        panels.togglePanel("right");
        break;
      case "refresh":
        void refresh();
        break;
      case "undo":
        undo();
        break;
      case "redo":
        redoAction();
        break;
      case "rownums":
        s3.rowNumbers = !s3.rowNumbers;
        grid.table.update?.({ rowNumbers: s3.rowNumbers });
        syncToolbar();
        break;
      case "mode-edit":
      case "mode-select":
      case "mode-delete": {
        const m = id.slice(5);
        s3.mode = s3.mode === m ? "" : m;
        grid.table.setInteraction(s3.mode === "" ? "browse" : s3.mode);
        if (s3.mode !== "select") {
          s3.selectedRows.clear();
          grid.table.clearSelection();
        }
        syncToolbar();
        break;
      }
      case "drop-selected": {
        const indices = [...s3.selectedRows].map(Number);
        void confirmModal({ title: `Delete ${indices.length} rows?`, message: "The step is undoable.", danger: true }).then((ok) => {
          if (ok) stageSteps([step("drop_rows", { indices })]);
        });
        break;
      }
      case "rows":
        if (ctx.menu) {
          s3.pageLimit = Number(ctx.menu);
          s3.offset = 0;
          void renderTable();
          syncToolbar(true);
        }
        break;
      case "cols":
        if (ctx.menu) {
          if (s3.hiddenCols.has(ctx.menu)) s3.hiddenCols.delete(ctx.menu);
          else s3.hiddenCols.add(ctx.menu);
          void renderTable();
          syncToolbar(true);
        }
        break;
    }
  }
  var panels = mountWorkspacePanels(wspHost);
  var gridWrap = el("div", { class: "cl-grid" });
  var overviewHost = el("div", { class: "cl-overview" });
  panels.center.append(gridWrap, overviewHost);
  var grid = mountGridView(gridWrap, {
    toolbar: { controls: controls(), onAction: onToolbarAction, state: newSession() },
    table: {
      columns: [],
      rows: [],
      rowKey: (r) => String(r["__idx"]),
      mode: "virtual",
      sortable: true,
      empty: { title: "No rows match", line: "Adjust the filters or the search." },
      onSort: (col) => {
        const s3 = active();
        if (!s3) return;
        s3.sort = s3.sort?.col !== col ? { col, descending: false } : s3.sort.descending ? null : { col, descending: true };
        s3.offset = 0;
        void renderTable();
      },
      onSelectChange: (keys) => {
        const s3 = active();
        if (!s3) return;
        s3.selectedRows = new Set(keys);
        syncToolbar();
      },
      onRowDelete: (key) => stageSteps([step("drop_rows", { indices: [Number(key)] })]),
      onCellCommit: (rowKey, colKey, value) => stageSteps([step("set_cell", { row: Number(rowKey), column: colKey, value })])
    }
  });
  var pagerHost = el("div", { class: "cl-pager" });
  gridWrap.append(pagerHost);
  var pager = mountPager(pagerHost, {
    page: 1,
    pages: 1,
    total: 0,
    onPage: (p) => {
      const s3 = active();
      if (!s3) return;
      s3.offset = (p - 1) * s3.pageLimit;
      void renderTable();
    }
  });
  var filterPanel = null;
  var viewsHost = null;
  var leftPanel = mountSidePanel(panels.left, {
    side: "left",
    active: "filters",
    tabs: [
      {
        id: "filters",
        label: "Filters",
        icon: "bi-funnel",
        mount: (host) => {
          filterPanel = mountFilterPanel(host, {
            columns: [],
            onApply: (node) => {
              const s3 = active();
              if (!s3) return;
              s3.filter = node;
              s3.offset = 0;
              void renderTable();
            },
            onClear: () => {
              const s3 = active();
              if (!s3) return;
              s3.filter = null;
              s3.offset = 0;
              void renderTable();
            }
          });
          return filterPanel;
        }
      },
      {
        id: "views",
        label: "Views",
        icon: "bi-bookmark",
        mount: (host) => {
          viewsHost = el("div", { class: "cl-views" });
          host.append(viewsHost);
          void renderViews();
        }
      }
    ]
  });
  leftPanel.body("filters");
  leftPanel.body("views");
  var colMgr = null;
  var stepsPanel = null;
  var rightPanel = mountSidePanel(panels.right, {
    side: "right",
    active: "tools",
    tabs: [
      {
        id: "tools",
        label: "Tools",
        icon: "bi-tools",
        mount: (host) => {
          colMgr = mountColumnManager(host, {
            columns: [],
            ops: OPS,
            onApply: (op, cols, values) => void runOp(op, cols, values)
          });
          return colMgr;
        }
      },
      {
        id: "history",
        label: "History",
        icon: "bi-clock-history",
        mount: (host) => {
          stepsPanel = mountStepsPanel(host, { steps: [], canUndo: false, canRedo: false, onUndo: undo, onRedo: redoAction });
          return stepsPanel;
        }
      }
    ]
  });
  rightPanel.body("tools");
  rightPanel.body("history");
  var scoreBadge = mountScoreBadge(scoreHost, {});
  var menuTrigger = button({ icon: "bi-three-dots", variant: "ghost", title: "More", ariaLabel: "More" });
  menuHost.append(menuTrigger);
  mountMenu(menuHost, {
    trigger: menuTrigger,
    items: [
      { label: "Delete file", icon: "bi-trash", onSelect: () => void deleteActiveFile() },
      { sep: true },
      { label: "Delete project", icon: "bi-folder-x", onSelect: () => void deleteActiveProject() }
    ]
  });
  var fileTabs = null;
  function renderProjectTabs() {
    projTabsHost.replaceChildren();
    const items = projects.map((p) => ({ id: p.id, label: p.name }));
    const strip = el("div", { class: "cl-tabsrow" });
    projTabsHost.append(strip);
    const tabsHost = el("span", { class: "cl-tabs" });
    strip.append(
      el("i", { class: "bi bi-folder2-open cl-tabsicon" }),
      tabsHost,
      button({ icon: "bi-plus-lg", variant: "ghost", size: "sm", title: "New project", ariaLabel: "New project", onClick: () => void newProjectModal() })
    );
    if (items.length) {
      mountTabs(tabsHost, {
        items,
        value: activeProjectId ?? items[0]?.id ?? "",
        onChange: (id) => void openProject(id)
      });
    }
  }
  var dotTone = (score) => score == null ? "" : score >= 90 ? "cl-dot--ok" : score >= 70 ? "cl-dot--warn" : "cl-dot--danger";
  function renderFileTabs() {
    fileTabsHost.replaceChildren();
    const strip = el("div", { class: "cl-tabsrow" });
    fileTabsHost.append(strip);
    const tabsHost = el("span", { class: "cl-tabs" });
    strip.append(el("i", { class: "bi bi-files cl-tabsicon" }), tabsHost);
    const items = [
      { id: "__overview", label: "Overview" },
      ...files.map((f) => ({
        id: f.id,
        label: el("span", { class: "cl-filetab" }, el("i", { class: `cl-dot ${dotTone(f.score)}` }), f.filename)
      }))
    ];
    fileTabs = mountTabs(tabsHost, {
      items,
      value: activeFileId ?? "__overview",
      onChange: (id) => id === "__overview" ? openOverview() : void openFile(id)
    });
  }
  function renderOverview() {
    overviewHost.replaceChildren();
    const tableHost = el("div", { class: "cl-overview-table" });
    const upHost = el("div", { class: "cl-overview-upload" });
    overviewHost.append(
      el("h2", { class: "cl-overview-title" }, "Files"),
      tableHost,
      upHost
    );
    mountRedTable(tableHost, {
      columns: [
        { key: "filename", label: "File" },
        { key: "rows", label: "Rows", dtype: "int" },
        { key: "cols", label: "Cols", dtype: "int" },
        { key: "score", label: "Cleanness", dtype: "int" },
        { key: "steps", label: "Steps", dtype: "int" },
        { key: "src", label: "Bytes" }
      ],
      rows: files.map((f) => ({
        __idx: f.id,
        filename: f.filename,
        rows: f.rows ?? null,
        cols: f.cols ?? null,
        score: f.score ?? null,
        steps: f.steps.length,
        src: f.sourceUrl ? "asset" : sessionBytes.has(f.id) ? "session" : "re-import"
      })),
      rowKey: (r) => String(r["__idx"]),
      mode: "pager",
      pageSize: 50,
      onRowClick: (_row, key) => void openFile(key),
      empty: { title: "No files yet", line: "Import a CSV below." }
    });
    mountUploader(upHost, {
      label: "Drop CSVs here \u2014 or click to pick",
      hint: "Parsed in your browser; nothing is uploaded.",
      accept: ".csv,.tsv,.txt",
      multiple: true,
      onFiles: (list) => void importFiles(list)
    });
  }
  async function importFiles(list) {
    if (!activeProjectId) return;
    let firstId = null;
    for (const f of list) {
      const bytes = await f.arrayBuffer();
      const meta = await store.createFile({
        projectId: activeProjectId,
        filename: f.name,
        sizeBytes: f.size,
        steps: []
      });
      sessionBytes.set(meta.id, bytes);
      files.push(meta);
      firstId = firstId ?? meta.id;
    }
    renderFileTabs();
    renderOverview();
    if (firstId) await openFile(firstId);
  }
  function showOverview(show) {
    overviewHost.hidden = !show;
    gridWrap.hidden = show;
    header.hidden = show;
  }
  function openOverview() {
    activeFileId = null;
    showOverview(true);
    renderOverview();
    fileTabs?.update?.({ value: "__overview" });
    status.textContent = `${files.length} file${files.length === 1 ? "" : "s"}`;
  }
  async function openFile(fileId) {
    const meta = files.find((f) => f.id === fileId);
    if (!meta) return;
    activeFileId = fileId;
    showOverview(false);
    fileTabs?.update?.({ value: fileId });
    fileChip.replaceChildren(el("i", { class: "bi bi-file-earmark-spreadsheet" }), ` ${meta.filename}`);
    status.textContent = "opening\u2026";
    let s3 = sessions.get(fileId);
    if (!s3) {
      s3 = newSession();
      s3.applied = [...meta.steps];
      sessions.set(fileId, s3);
    }
    try {
      const opened = await pool.open(fileId, "fr", s3.applied);
      if (opened.raw.cols === 1 && !s3.applied.some((x) => x.kind === "unwrap_csv")) {
        s3.applied.unshift(step("unwrap_csv"));
      }
    } catch (e) {
      status.textContent = String(e?.message || e);
      status.classList.add("is-error");
      toast({ message: status.textContent, tone: "danger" });
      openOverview();
      return;
    }
    status.classList.remove("is-error");
    grid.table.setInteraction(s3.mode === "" ? "browse" : s3.mode);
    filterPanel?.update?.({ value: s3.filter ?? null });
    await refresh();
    void renderViews();
  }
  async function openProject(projectId) {
    activeProjectId = projectId;
    files = await store.listFiles(projectId);
    renderFileTabs();
    openOverview();
  }
  async function renderTable() {
    const s3 = active();
    if (!s3 || !activeFileId) return;
    const eng = await engineFor(activeFileId);
    const page = await eng.view(querySpec(s3), s3.offset, s3.pageLimit);
    lastViewTotal = page.total;
    grid.table.update?.({
      rows: rowsOf(page),
      columns: tableColumns(s3),
      sort: s3.sort,
      rowNumbers: s3.rowNumbers
    });
    const pages = Math.max(1, Math.ceil(page.total / s3.pageLimit));
    pager.update?.({ page: Math.floor(s3.offset / s3.pageLimit) + 1, pages, total: page.total });
  }
  function syncToolbar(rebuild = false) {
    const s3 = active();
    if (!s3) return;
    if (rebuild) grid.toolbar?.update?.({ controls: controls() });
    grid.update?.({ state: s3 });
    grid.toolbar?.setDisabled("undo", s3.applied.length === 0);
    grid.toolbar?.setDisabled("redo", s3.redo.length === 0);
  }
  function syncSteps() {
    const s3 = active();
    if (!s3) return;
    const timeline = [
      ...s3.applied.map((x) => ({ kind: x.kind, params: x.params, applied: true })),
      ...[...s3.redo].reverse().flat().map((x) => ({ kind: x.kind, params: x.params, applied: false }))
    ];
    stepsPanel?.update?.({ steps: timeline, canUndo: s3.applied.length > 0, canRedo: s3.redo.length > 0 });
  }
  async function rescore() {
    const s3 = active();
    if (!s3 || !activeFileId) return;
    try {
      const eng = await engineFor(activeFileId);
      const rep = await eng.score();
      s3.score = rep;
      scoreBadge.update?.({
        ...rep.score != null ? { score: rep.score } : {},
        ...rep.report ? { report: rep.report } : {}
      });
    } catch {
      s3.score = null;
    }
    schedulePersist();
  }
  async function refresh() {
    const s3 = active();
    if (!s3 || !activeFileId) return;
    const eng = await engineFor(activeFileId);
    try {
      const dims = await eng.setSteps(s3.applied);
      s3.totalRows = dims.rows;
      s3.cols = await eng.columnsMeta();
    } catch (e) {
      toast({ message: `Step failed: ${String(e?.message || e)}`, tone: "danger" });
      s3.applied.pop();
      return refresh();
    }
    pruneToColumns(s3);
    filterPanel?.update?.({ columns: fpColumns(s3) });
    colMgr?.update?.({ columns: fpColumns(s3) });
    await renderTable();
    syncSteps();
    syncToolbar(true);
    void rescore();
    schedulePersist();
    status.textContent = `${s3.totalRows.toLocaleString()} rows \xD7 ${s3.cols.length} cols`;
  }
  async function renderViews() {
    if (!viewsHost) return;
    viewsHost.replaceChildren();
    if (!activeFileId) {
      viewsHost.append(el("p", { class: "cl-views-empty" }, "Open a file to see its saved views."));
      return;
    }
    const views = await store.listViews(activeFileId).catch(() => []);
    if (!views.length) {
      viewsHost.append(el("p", { class: "cl-views-empty" }, "No saved views \u2014 filter something and Save view."));
      return;
    }
    for (const v of views) {
      viewsHost.append(
        el(
          "div",
          { class: "cl-view" },
          button({ label: v.name, variant: "ghost", size: "sm", onClick: () => void applyView(v) }),
          button({ icon: "bi-x", variant: "ghost", size: "sm", title: "Delete view", ariaLabel: "Delete view", onClick: () => {
            void store.deleteView(v.id).then(() => renderViews());
          } })
        )
      );
    }
  }
  async function applyView(v) {
    const s3 = active();
    if (!s3) return;
    s3.filter = v.query.filter ?? null;
    s3.search = v.query.search ?? "";
    s3.sort = v.query.sort?.[0] ?? null;
    s3.offset = 0;
    filterPanel?.update?.({ value: s3.filter ?? null });
    syncToolbar(true);
    await renderTable();
    toast({ message: `View "${v.name}" applied` });
  }
  async function saveViewModal() {
    const s3 = active();
    if (!s3 || !activeFileId) return;
    const name = input({ placeholder: "View name" });
    openModal({
      title: "Save view",
      body: el("div", {}, el("p", {}, "Saves the current filter, search, and sort."), name),
      actions: [
        { label: "Cancel", variant: "ghost", onClick: (api) => api.close() },
        { label: "Save", variant: "accent", onClick: (api) => {
          const label = name.value.trim() || "view";
          void store.createView({
            fileId: activeFileId,
            name: label,
            query: {
              ...s3.filter ? { filter: s3.filter } : {},
              ...s3.search ? { search: s3.search } : {},
              ...s3.sort ? { sort: [s3.sort] } : {}
            }
          }).then(() => {
            api.close();
            toast({ message: `View "${label}" saved` });
            void renderViews();
          });
        } }
      ]
    });
  }
  async function newProjectModal() {
    const name = input({ placeholder: "Project name" });
    const desc = input({ placeholder: "Description (optional)" });
    openModal({
      title: "New project",
      body: el("div", { class: "cl-form" }, name, desc),
      actions: [
        { label: "Cancel", variant: "ghost", onClick: (api) => api.close() },
        { label: "Create", variant: "accent", onClick: (api) => {
          const label = name.value.trim();
          if (!label) return;
          void store.createProject(label, desc.value.trim() || void 0).then((p) => {
            projects.push(p);
            api.close();
            renderProjectTabs();
            void openProject(p.id);
          });
        } }
      ]
    });
  }
  async function deleteActiveFile() {
    const meta = activeMeta();
    if (!meta) return;
    if (!await confirmModal({ title: `Delete ${meta.filename}?`, message: "Its steps and saved views go with it.", danger: true })) return;
    await store.deleteFile(meta.id);
    pool.close(meta.id);
    sessions.delete(meta.id);
    sessionBytes.delete(meta.id);
    files = files.filter((f) => f.id !== meta.id);
    renderFileTabs();
    openOverview();
  }
  async function deleteActiveProject() {
    const p = projects.find((x) => x.id === activeProjectId);
    if (!p) return;
    if (!await confirmModal({ title: `Delete project ${p.name}?`, message: "Every file and view in it goes too.", danger: true })) return;
    await store.deleteProject(p.id);
    for (const f of files) {
      pool.close(f.id);
      sessions.delete(f.id);
      sessionBytes.delete(f.id);
    }
    projects = projects.filter((x) => x.id !== p.id);
    renderProjectTabs();
    const next = projects[0];
    if (next) await openProject(next.id);
    else {
      files = [];
      renderFileTabs();
      openOverview();
    }
  }
  async function exportCsv() {
    const meta = activeMeta();
    if (!meta || !activeFileId) return;
    const eng = await engineFor(activeFileId);
    const csv = await eng.toCsv();
    const blob = new Blob([csv], { type: "text/csv" });
    const stem = meta.filename.replace(/\.[^.]+$/, "");
    const a = el("a", { href: URL.createObjectURL(blob), download: `${stem}.cleaned.csv` });
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ message: `Exported ${stem}.cleaned.csv` });
  }
  window.addEventListener("keydown", (e) => {
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== "z") return;
    e.preventDefault();
    if (e.shiftKey) redoAction();
    else undo();
  });
  async function main() {
    status.textContent = "connecting\u2026";
    store = await connectStore();
    modeBadgeHost.append(
      badge({ label: store.mode === "birama" ? "birama-engine" : "local", tone: store.mode === "birama" ? "ok" : "info" })
    );
    projects = await store.listProjects();
    if (!projects.length) {
      const p = await store.createProject("dossier", "The Fleury case extract \u2014 101k wrapped rows.");
      projects = [p];
      await store.createFile({ projectId: p.id, filename: "dossier.csv", sourceUrl: "data/dossier.csv", sizeBytes: 14118431, steps: [] });
    }
    renderProjectTabs();
    activeProjectId = projects[0]?.id ?? null;
    if (activeProjectId) {
      files = await store.listFiles(activeProjectId);
      renderFileTabs();
      const first = files[0];
      if (first) await openFile(first.id);
      else openOverview();
    }
    window.__cleanerSmoke = {
      mode: store.mode,
      projects: projects.length,
      files: files.length,
      rows: active()?.totalRows ?? 0,
      cols: active()?.cols.length ?? 0,
      viewTotal: lastViewTotal
    };
  }
  void main().catch((e) => {
    status.textContent = `boot failed: ${String(e?.message || e)}`;
    status.classList.add("is-error");
  });
})();
