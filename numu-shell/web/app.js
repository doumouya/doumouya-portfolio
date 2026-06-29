"use strict";
(() => {
  // ../web-kit/src/el.ts
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === void 0 || value === false) continue;
      if (key === "class") node.className = String(value);
      else if (key === "text") node.textContent = String(value);
      else if (key.startsWith("on") && typeof value === "function") {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (value === true) {
        node.setAttribute(key, "");
      } else {
        node.setAttribute(key, String(value));
      }
    }
    append(node, children);
    return node;
  }
  function append(parent, children) {
    for (const child of children) {
      if (child === null || child === void 0 || child === false) continue;
      parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
    }
  }
  var injected = /* @__PURE__ */ new Set();
  function ensureStyles(name, css) {
    if (injected.has(name) || typeof document === "undefined") return;
    injected.add(name);
    const style = document.createElement("style");
    style.dataset["dc"] = name;
    style.textContent = css;
    document.head.appendChild(style);
  }

  // web/data.ts
  var CHANNELS = [
    { id: "case-rbac", group: "Cases", name: "entity-rbac", sub: "workflow \xB7 in review", icon: "kanban", color: "var(--chart-5)", badge: "review", unread: 0 },
    { id: "dm-amara", group: "Direct messages", name: "Amara N.", sub: "Acme Corp \xB7 customer", icon: "person-fill", color: "var(--accent)", presence: true, unread: 2 },
    { id: "dm-kee", group: "Direct messages", name: "kee", sub: "teammate", icon: "person-fill", color: "var(--chart-1)", presence: true, unread: 0 },
    { id: "mail-billing", group: "Email", name: "billing@acme.co", sub: "Re: March invoice", icon: "envelope-fill", color: "var(--chart-3)", unread: 1 },
    { id: "sms-otp", group: "SMS", name: "+254 712 555 019", sub: "OTP & alerts", icon: "chat-dots-fill", color: "var(--chart-2)", unread: 0 },
    { id: "data-acme", group: "Data workspace", name: "acme_analytics", sub: "3 files \xB7 ETL", icon: "table", color: "var(--chart-4)", unread: 0 }
  ];
  var GROUP_ORDER = ["Cases", "Direct messages", "Email", "SMS", "Data workspace"];
  function composerKind(ch) {
    return ch.group === "Cases" ? "comment" : ch.group === "Email" ? "email" : ch.group === "SMS" ? "sms" : ch.group === "Data workspace" ? "data" : "chat";
  }
  function composerFor(ch) {
    const kind = composerKind(ch);
    const base = {
      font: "system-ui, sans-serif",
      sendIcon: "send-fill",
      sendLabel: "Send",
      attaches: [],
      showTo: false,
      showInternal: false,
      showCharCount: false,
      contextTag: ch.name,
      mono: false
    };
    let v = {};
    if (kind === "chat") {
      v = {
        placeholder: `Message ${ch.name}\u2026`,
        hint: "attach audio \xB7 pdf \xB7 csv \xB7 image \xB7 video link",
        attaches: [
          { icon: "mic-fill", label: "Voice message", type: "audio" },
          { icon: "filetype-pdf", label: "PDF", type: "file" },
          { icon: "filetype-csv", label: "CSV", type: "csv" },
          { icon: "image", label: "Image", type: "file" },
          { icon: "youtube", label: "Video link", type: "youtube" }
        ]
      };
    } else if (kind === "email") {
      v = {
        placeholder: "Write your reply\u2026",
        hint: "rich email \xB7 attachments supported",
        showTo: true,
        attaches: [{ icon: "paperclip", label: "Attach", type: "file" }]
      };
    } else if (kind === "sms") {
      v = { placeholder: "Text message\u2026", hint: "plain SMS \xB7 160 chars / segment", font: "var(--font-mono)", mono: true, showCharCount: true };
    } else if (kind === "data") {
      v = {
        placeholder: "filter region = EMEA   \xB7   group mrr by region",
        font: "var(--font-mono)",
        mono: true,
        sendLabel: "Run",
        sendIcon: "play-fill",
        hint: "qir command \u2192 runs on the in-browser engine",
        contextTag: "qir"
      };
    } else {
      v = {
        placeholder: "Write a comment\u2026",
        hint: "comments post to the case thread",
        sendLabel: "Comment",
        showInternal: true,
        attaches: [{ icon: "paperclip", label: "Attach", type: "file" }]
      };
    }
    const merged = { kind, ...base, ...v };
    merged.shellRadius = merged.showTo ? "0 0 .6rem .6rem" : ".7rem";
    return merged;
  }
  function internalLabel(internalNote) {
    return internalNote ? "Internal note" : "Public comment";
  }
  function internalHint(internalNote) {
    return internalNote ? "visible to your team only" : "visible to everyone on the case";
  }
  function headerFor(ch) {
    const kind = composerKind(ch);
    let actions2;
    if (kind === "chat") actions2 = [
      { icon: "telephone-fill", label: "Voice call", call: "voice" },
      { icon: "camera-video-fill", label: "Video call", call: "video" },
      { icon: "three-dots", label: "More" }
    ];
    else if (kind === "email") actions2 = [
      { icon: "star", label: "Star" },
      { icon: "archive-fill", label: "Archive" },
      { icon: "three-dots", label: "More" }
    ];
    else if (kind === "sms") actions2 = [
      { icon: "telephone-fill", label: "Call", call: "voice" },
      { icon: "three-dots", label: "More" }
    ];
    else if (kind === "data") actions2 = [
      { icon: "box-arrow-up-right", label: "Open full workspace" },
      { icon: "three-dots", label: "More" }
    ];
    else actions2 = [{ icon: "three-dots", label: "More" }];
    return {
      icon: ch.icon,
      color: ch.color,
      name: ch.name,
      sub: ch.sub,
      presence: !!ch.presence,
      hasBadge: !!ch.badge,
      badge: ch.badge ?? "",
      badgeTone: "warning",
      actions: actions2
    };
  }
  var ACCENTS = [
    { c: "#2563eb", name: "Datacore blue" },
    { c: "#4f46e5", name: "Indigo" },
    { c: "#0d9488", name: "Teal" },
    { c: "#e11d48", name: "Rose" }
  ];
  var DENSITIES = [["compact", "Compact"], ["cozy", "Cozy"], ["roomy", "Roomy"]];
  var THEMES = [["light", "Light"], ["dark", "Dark"]];
  var DENSITY_PX = { compact: "13px", cozy: "14px", roomy: "16px" };
  var BARS = [6, 11, 16, 9, 14, 21, 18, 12, 8, 15, 22, 25, 18, 10, 7, 13, 20, 24, 16, 9, 14, 8, 6, 12, 19, 23, 15, 9, 12, 7];
  var PALETTE_COMMANDS = [
    { id: "theme", label: "Toggle light / dark theme", hint: "display", icon: "circle-half" },
    { id: "settings", label: "Open Display settings", hint: "display", icon: "sliders" },
    { id: "hide", label: "Hide current channel", hint: "rail", icon: "eye-slash" },
    { id: "restore", label: "Restore hidden channels", hint: "rail", icon: "arrow-counterclockwise" },
    { id: "call", label: "Start a voice call", hint: "action", icon: "telephone" }
  ];
  function tint(color, pct) {
    return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
  }
  function initials(name) {
    if (!name) return "\xB7";
    if (name[0] === "+" || /^[0-9]/.test(name)) return "#";
    const words = name.trim().split(/\s+/);
    if (words.length > 1) return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  function seedThreads() {
    return {
      "case-rbac": [
        { t: "event", text: "workflow \xB7 backlog \u2192 progress", time: "Mon 09:01" },
        {
          t: "comment",
          who: "Sol Rivera",
          avColor: "var(--chart-5)",
          time: "Mon 09:04",
          text: "Heads up \u2014 the revoke needs to cascade to descendants or we leak access after a parent role is pulled. Can you fold that into the close?"
        },
        {
          t: "comment",
          mine: true,
          who: "You",
          time: "Mon 09:18",
          text: "Added revoke_cascades_to_descendants \u2014 green now. Pushing close-checks."
        },
        { t: "checks", who: "redpash", sys: true, checks: [
          { label: "tests-green", ok: true },
          { label: "spec-updated", ok: true },
          { label: "reviewed", ok: false }
        ] },
        { t: "event", tone: "var(--danger)", text: "blocked \xB7 close_preconditions_unmet \xB7 missing: reviewed", time: "Mon 09:21" },
        { t: "comment", who: "Sol Rivera", avColor: "var(--chart-5)", time: "Mon 09:24", text: "Reviewing now \u2014 give me ten." }
      ],
      "dm-amara": [
        {
          t: "text",
          who: "Amara N.",
          avColor: "var(--accent)",
          time: "09:32",
          text: "Hey! Could you pull the EMEA signups for Q1? Board deck is due this afternoon \u{1F64F}"
        },
        { t: "text", mine: true, who: "You", time: "09:33", text: "On it \u2014 running it now." },
        { t: "csv", mine: true, who: "You", time: "09:35", name: "emea_q1.csv", rows: "48 rows \xB7 6 cols", size: "7 KB" },
        { t: "audio", who: "Amara N.", avColor: "var(--accent)", time: "09:37", dur: "0:18" },
        { t: "text", mine: true, who: "You", time: "09:40", text: "Here's a 90-second walkthrough of the reach numbers." },
        { t: "youtube", mine: true, who: "You", time: "09:40", title: "EMEA reach \u2014 90-second walkthrough", channel: "redpash \xB7 1.2K views", length: "1:32" },
        { t: "text", who: "Amara N.", avColor: "var(--accent)", time: "09:42", text: "This is perfect. Calling you in 2." },
        { t: "call", callKind: "voice", answered: true, callTitle: "Voice call", callMeta: "4:32 \xB7 ended", time: "09:44" }
      ],
      "dm-kee": [
        { t: "text", who: "kee", avColor: "var(--chart-1)", time: "08:10", text: "pushed the wasm bench numbers \u2014 parser does 1,240 rows in 11ms cold." },
        { t: "text", mine: true, who: "You", time: "08:11", text: "nice. offline still green?" },
        { t: "text", who: "kee", avColor: "var(--chart-1)", time: "08:12", text: "yep. airplane mode, full pipeline, zero network." }
      ],
      "mail-billing": [
        {
          t: "email",
          who: "Acme Billing",
          avColor: "var(--chart-3)",
          from: "Acme Billing",
          addr: "billing@acme.co",
          to: "you@redpash.io",
          subject: "Re: March invoice",
          time: "08:54",
          body: "Hi \u2014 we issued a corrected March invoice. The line count is now 48 seats (was 52); the three removed seats were never activated. Updated PDF attached. Let us know if the totals reconcile on your side.",
          attachName: "invoice-2024-03.pdf",
          attachSize: "142 KB"
        },
        {
          t: "email",
          mine: true,
          who: "You",
          from: "You",
          addr: "you@redpash.io",
          to: "billing@acme.co",
          subject: "Re: March invoice",
          time: "09:12",
          body: "Confirmed \u2014 totals match. Approving for payment today. Thanks for the quick turnaround."
        }
      ],
      "sms-otp": [
        { t: "sms", who: "RedPash", sys: true, time: "07:01", text: "Your RedPash verification code is 448-201. It expires in 10 minutes." },
        { t: "sms", mine: true, who: "You", time: "07:01", text: "448201" },
        { t: "sms", who: "RedPash", sys: true, time: "07:01", text: "Verified. Welcome back." },
        { t: "sms", mine: true, who: "You", time: "07:02", text: "Send the EMEA report when it's ready.", receipt: "Delivered" }
      ],
      "data-acme": [
        { t: "datacmd", mine: true, text: "open:csv customers", time: "09:50" },
        {
          t: "data",
          interp: "customers.csv",
          metaText: "1,240 rows \xB7 6 cols \xB7 on your device",
          head: ["id", "customer", "region", "mrr"],
          dataRows: [
            ["1001", "Acme", "NA", "1284"],
            ["1002", "Globex", "EMEA", "540.5"],
            ["1006", "Stark", "EMEA", "1820"],
            ["1007", "Wayne", "EMEA", "2475.25"]
          ]
        },
        { t: "datacmd", mine: true, text: "filter region = EMEA\nlast 5", time: "09:51" },
        {
          t: "data",
          interp: "Pipeline \xB7 2 stages",
          metaText: "1,240 \u2192 5 rows",
          qir: ['filter region = "EMEA"', "order signup desc"],
          head: ["id", "customer", "region", "mrr"],
          dataRows: [
            ["1010", "Tyrell", "EMEA", "1390"],
            ["1007", "Wayne", "EMEA", "2475.25"],
            ["1006", "Stark", "EMEA", "1820"],
            ["1002", "Globex", "EMEA", "540.5"],
            ["1014", "Initrode", "EMEA", "905"]
          ]
        }
      ]
    };
  }

  // ../web-kit/src/components/icon.ts
  var BI_HREF = "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css";
  var fontLinked = false;
  function ensureIconFont() {
    if (fontLinked || typeof document === "undefined") return;
    fontLinked = true;
    if (document.querySelector('link[data-dc="bootstrap-icons"]')) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = BI_HREF;
    l.setAttribute("data-dc", "bootstrap-icons");
    document.head.appendChild(l);
  }
  function icon(name, opts = {}) {
    ensureIconFont();
    const { size, label, style } = opts;
    const classes = `bi bi-${name} ${opts.class ?? ""}`.trim();
    const node = el("i", { class: classes });
    node.style.display = "inline-flex";
    node.style.alignItems = "center";
    node.style.justifyContent = "center";
    node.style.flex = "none";
    if (size !== void 0) node.style.fontSize = typeof size === "number" ? `${size}px` : size;
    if (style) Object.assign(node.style, style);
    if (label) {
      node.setAttribute("role", "img");
      node.setAttribute("aria-label", label);
    } else {
      node.setAttribute("aria-hidden", "true");
    }
    if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
    return node;
  }

  // ../web-kit/src/components/badge.ts
  var CSS = `
.dc-badge{
  --tone: var(--text-muted);
  display:inline-flex; align-items:center; gap:var(--space-1);
  height:1.4rem; padding:0 var(--space-2);
  font-size:var(--text-2xs); font-weight:var(--weight-medium); line-height:1;
  letter-spacing:var(--tracking-wide); white-space:nowrap;
  border:var(--border-width) solid transparent; border-radius:var(--radius-full);
}
.dc-badge--square{ border-radius:var(--radius-xs); letter-spacing:0; }
.dc-badge--mono{ font-family:var(--font-mono); letter-spacing:0; text-transform:none; }
.dc-badge__dot{ width:.42rem; height:.42rem; border-radius:var(--radius-full); background:var(--tone); flex:none; }

/* fills */
.dc-badge--soft{ background:color-mix(in srgb, var(--tone) 13%, var(--surface)); color:var(--tone); border-color:color-mix(in srgb, var(--tone) 22%, transparent); }
.dc-badge--solid{ background:var(--tone); color:#fff; border-color:var(--tone); }
.dc-badge--outline{ background:transparent; color:var(--tone); border-color:color-mix(in srgb, var(--tone) 45%, transparent); }

/* tones */
.dc-badge--neutral{ --tone: var(--text-muted); }
.dc-badge--accent{ --tone: var(--accent); }
.dc-badge--success{ --tone: var(--success); }
.dc-badge--warning{ --tone: var(--warning); }
.dc-badge--danger{ --tone: var(--danger); }
.dc-badge--backlog{ --tone: var(--status-backlog); }
.dc-badge--progress{ --tone: var(--status-progress); }
.dc-badge--review{ --tone: var(--status-review); }
.dc-badge--done{ --tone: var(--status-done); }
.dc-badge--neutral.dc-badge--soft{ background:var(--surface-subtle); border-color:var(--border); color:var(--text-muted); }
`;
  function badge(label, opts = {}) {
    ensureStyles("badge", CSS);
    const { tone = "neutral", variant = "soft", dot, square, mono } = opts;
    const classes = [
      "dc-badge",
      `dc-badge--${tone}`,
      `dc-badge--${variant}`,
      square && "dc-badge--square",
      mono && "dc-badge--mono",
      opts.class
    ].filter(Boolean).join(" ");
    const node = el(
      "span",
      { class: classes },
      dot ? el("span", { class: "dc-badge__dot", "aria-hidden": "true" }) : null,
      label
    );
    if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
    return node;
  }

  // web/views.ts
  function activeChannel(state2) {
    return CHANNELS.find((c) => c.id === state2.activeId) ?? CHANNELS[0];
  }
  function topbar(ctx) {
    return el(
      "header",
      { class: "topbar" },
      el("span", { class: "tb-logo" }),
      el("strong", { class: "tb-word" }, "redpash"),
      el("span", { class: "tb-sub" }, "\xB7 unified inbox"),
      el(
        "div",
        { class: "tb-center" },
        el(
          "button",
          { class: "tb-search", onClick: () => ctx.actions.paletteOpen() },
          icon("search", { size: ".85rem" }),
          el("span", { class: "tb-search-label" }, "Search\u2026"),
          el("span", { class: "tb-kbd" }, "\u2318K")
        )
      ),
      el("span", { class: "pill" }, el("span", { class: "pill-dot" }), "local \xB7 offline-ready"),
      el("button", { class: "tb-btn", onClick: () => ctx.actions.toggleSettings() }, icon("sliders", { size: "1rem" }), "Display")
    );
  }
  function groups(state2) {
    const visible = CHANNELS.filter((c) => !state2.hidden[c.id]);
    return GROUP_ORDER.map((name) => ({ name, items: visible.filter((c) => c.group === name) })).filter((g) => g.items.length > 0);
  }
  function channelRow(ctx, c) {
    const { state: state2, actions: actions2 } = ctx;
    const active = c.id === state2.activeId;
    const row = el(
      "div",
      {
        class: "chan" + (active ? " active" : ""),
        role: "button",
        tabindex: "0",
        style: active ? "background:color-mix(in srgb, var(--accent) 9%, var(--surface))" : "",
        onClick: () => actions2.open(c.id)
      },
      el(
        "span",
        { class: "chan-tile", style: `background:${tint(c.color, 16)}; color:${c.color}` },
        icon(c.icon, { size: "1rem" }),
        c.presence ? el("span", { class: "chan-presence" }) : null
      ),
      el(
        "span",
        { class: "chan-text" },
        el("span", { class: "chan-name" }, c.name),
        el("span", { class: "chan-sub" }, c.sub)
      ),
      c.unread > 0 ? el("span", { class: "chan-unread", style: `background:${c.color}` }, String(c.unread)) : null,
      el("button", { class: "chan-hide", title: "Hide channel", onClick: (e) => {
        e.stopPropagation();
        actions2.hideChannel(c.id);
      } }, "\xD7")
    );
    return row;
  }
  function rail(ctx) {
    const { state: state2, actions: actions2 } = ctx;
    const gs = groups(state2);
    const hiddenCount = Object.keys(state2.hidden).filter((k) => state2.hidden[k]).length;
    return el(
      "aside",
      { class: "rail" },
      el(
        "div",
        { class: "rail-search-wrap" },
        el("div", { class: "rail-search", title: "Search all channels (\u2318K)", onClick: () => actions2.paletteOpen() }, icon("search", { size: ".9rem" }), "Search all channels")
      ),
      ...gs.map((g) => {
        const collapsed = !!state2.collapsed[g.name];
        return el(
          "div",
          {},
          el(
            "div",
            { class: "rg-head", role: "button", onClick: () => actions2.toggleGroup(g.name) },
            icon(collapsed ? "chevron-right" : "chevron-down", { size: ".7rem", class: "rg-chevron" }),
            el("span", { class: "rg-name" }, g.name),
            el("span", { class: "rg-line" }),
            el("span", { class: "rg-count" }, String(g.items.length))
          ),
          collapsed ? null : el("div", {}, ...g.items.map((c) => channelRow(ctx, c)))
        );
      }),
      hiddenCount > 0 ? el("div", { class: "rail-restore" }, el("button", { onClick: () => actions2.restoreHidden() }, `restore ${hiddenCount} hidden`)) : null
    );
  }
  function header(ctx) {
    const { actions: actions2 } = ctx;
    const ch = activeChannel(ctx.state);
    const h = headerFor(ch);
    return el(
      "div",
      { class: "ctx-header" },
      el("div", { class: "ctx-icon", style: `background:${tint(h.color, 16)}; color:${h.color}` }, icon(h.icon, { size: "1.1rem" })),
      el(
        "div",
        { class: "ctx-title-block" },
        el(
          "div",
          { class: "ctx-name-row" },
          el("span", { class: "ctx-name" }, h.name),
          h.hasBadge ? badge(h.badge, { tone: "warning", variant: "soft", dot: true }) : null
        ),
        el(
          "div",
          { class: "ctx-sub-row" },
          h.presence ? el("span", { class: "ctx-presence" }) : null,
          el("span", { class: "ctx-sub" }, h.sub)
        )
      ),
      el("span", { class: "spacer" }),
      el("div", { class: "ctx-actions" }, ...h.actions.map((a) => el("button", { class: "ctx-action", title: a.label, onClick: () => actions2.headerAction(a) }, icon(a.icon, { size: "1rem" }))))
    );
  }
  function dataTable(head, rows) {
    return el(
      "table",
      { class: "data-table" },
      el("thead", {}, el("tr", {}, ...head.map((h) => el("th", {}, h)))),
      el("tbody", {}, ...rows.map((r) => el("tr", {}, ...r.map((cell) => el("td", { class: cell == null ? "null" : "" }, cell == null ? "\u2014" : cell)))))
    );
  }
  function card(ctx, m, ch, mine) {
    const radius = mine ? "12px 12px 4px 12px" : "12px 12px 12px 4px";
    switch (m.t) {
      case "event":
        return el("div", { class: "event-pill", style: `color:${m.tone ?? "var(--text-muted)"}` }, `${m.text} \xB7 ${m.time ?? ""}`);
      case "text": {
        const bg = mine ? "var(--accent)" : "var(--surface-subtle)";
        const color = mine ? "var(--text-on-accent)" : "var(--text)";
        const bd = mine ? "transparent" : "var(--border)";
        return el("div", { class: "bubble", style: `background:${bg}; color:${color}; border:1px solid ${bd}; border-radius:${radius}` }, m.text);
      }
      case "sms": {
        const bg = mine ? "var(--accent)" : "var(--surface-subtle)";
        const color = mine ? "var(--text-on-accent)" : "var(--text)";
        const bd = mine ? "transparent" : "var(--border)";
        return el(
          "div",
          { style: `display:flex; flex-direction:column; gap:.2rem; align-items:${mine ? "flex-end" : "flex-start"}` },
          el("div", { class: "bubble mono", style: `background:${bg}; color:${color}; border:1px solid ${bd}; border-radius:${radius}` }, m.text),
          m.receipt ? el("div", { class: "receipt" }, m.receipt) : null
        );
      }
      case "comment": {
        const internal = !!m.internal;
        const bg = mine ? internal ? "var(--warning-tint)" : "var(--accent)" : "var(--surface-subtle)";
        const color = mine && !internal ? "var(--text-on-accent)" : "var(--text)";
        const bd = internal ? "color-mix(in srgb, var(--warning) 30%, transparent)" : mine ? "transparent" : "var(--border)";
        return el(
          "div",
          { class: "bubble", style: `background:${bg}; color:${color}; border:1px solid ${bd}; border-radius:${radius}` },
          internal ? el("span", { class: "internal-chip" }, icon("lock-fill", { size: ".7rem" }), " internal") : null,
          internal ? " " : null,
          m.text
        );
      }
      case "checks":
        return el(
          "div",
          { class: "checks-card" },
          el("div", { class: "checks-title" }, "close-checks"),
          ...(m.checks ?? []).map((ck) => el(
            "div",
            { class: "check-row", style: `color:${ck.ok ? "var(--text)" : "var(--text-muted)"}` },
            icon(ck.ok ? "check-circle-fill" : "circle", { size: ".85rem", style: { color: ck.ok ? "var(--success)" : "var(--text-subtle)" } }),
            ck.label
          ))
        );
      case "audio": {
        const bg = mine ? "var(--accent)" : "var(--surface-subtle)";
        const btnBg = mine ? "rgba(255,255,255,.2)" : "var(--accent)";
        const btnColor = mine ? "#fff" : "var(--text-on-accent)";
        const barColor = mine ? "rgba(255,255,255,.9)" : "var(--accent)";
        return el(
          "div",
          { class: "audio-pill", style: `background:${bg}; border-radius:${radius}; color:${mine ? "var(--text-on-accent)" : "var(--text)"}` },
          el("button", { class: "audio-btn", style: `background:${btnBg}; color:${btnColor}` }, icon("play-fill", { size: ".9rem" })),
          el("div", { class: "waveform" }, ...BARS.map((h) => el("span", { class: "wave-bar", style: `height:${h}px; background:${barColor}` }))),
          el("span", { class: "audio-dur" }, m.dur)
        );
      }
      case "csv":
      case "file": {
        const isCsv = m.t === "csv";
        const fileIcon = isCsv ? "filetype-csv" : m.fileKind === "image" ? "image" : m.fileKind === "pdf" ? "filetype-pdf" : "file-earmark";
        const fileColor = isCsv ? "var(--chart-4)" : m.fileKind === "pdf" ? "var(--danger)" : "var(--chart-1)";
        const meta = [m.rows, m.size].filter(Boolean).join(" \xB7 ");
        return el(
          "div",
          { class: "file-card" },
          el("div", { class: "file-tile", style: `background:${tint(fileColor, 16)}; color:${fileColor}` }, icon(fileIcon, { size: "1.05rem" })),
          el("div", { class: "file-text" }, el("div", { class: "file-name" }, m.name), el("div", { class: "file-meta" }, meta)),
          isCsv ? el("button", { class: "file-action", onClick: () => ctx.actions.open("data-acme") }, "Open in data workspace", icon("arrow-right-short", { size: "1rem" })) : null,
          icon("download", { class: "file-dl", size: ".95rem" })
        );
      }
      case "youtube":
        return el(
          "div",
          { class: "yt-card" },
          el(
            "div",
            { class: "yt-thumb" },
            el("div", { class: "yt-play" }, icon("play-fill")),
            el("span", { class: "yt-badge" }, "YouTube"),
            el("span", { class: "yt-len" }, m.length),
            el("span", { class: "yt-progress" })
          ),
          el("div", { class: "yt-foot" }, el("div", { class: "yt-title" }, m.title), el("div", { class: "yt-channel" }, m.channel))
        );
      case "call": {
        const answered = !!m.answered;
        const callColor = answered ? "var(--success)" : "var(--danger)";
        const callIcon = m.callKind === "video" ? "camera-video-fill" : "telephone-fill";
        return el(
          "div",
          { class: "call-pill" },
          el("div", { class: "call-tile", style: `background:${tint(callColor, 16)}; color:${callColor}` }, icon(callIcon, { size: ".9rem" })),
          el("div", {}, el("div", { class: "call-title" }, m.callTitle), el("div", { class: "call-meta" }, m.callMeta))
        );
      }
      case "email": {
        const emColor = mine ? "var(--accent)" : ch.color;
        return el(
          "div",
          { class: "email-card" },
          el(
            "div",
            { class: "email-head" },
            el("div", { class: "email-av", style: `background:${tint(emColor, 18)}; color:${emColor}` }, initials(m.from ?? "")),
            el("div", { style: "flex:1; min-width:0" }, el("div", { class: "email-from" }, m.from), el("div", { class: "email-addr" }, m.addr)),
            el("span", { class: "email-addr" }, m.time),
            icon("star", { class: "file-dl", size: ".95rem" })
          ),
          el(
            "div",
            { class: "email-body" },
            el("div", { class: "email-to" }, "to " + (m.to ?? "")),
            el("div", { class: "email-subject" }, m.subject),
            el("div", { class: "email-text" }, m.body),
            m.attachName ? el(
              "div",
              { class: "email-attach" },
              el("div", { class: "email-attach-tile" }, icon("filetype-pdf", { size: ".95rem" })),
              el("div", { style: "flex:1; min-width:0" }, el("div", { class: "email-attach-name" }, m.attachName), el("div", { class: "email-attach-size" }, m.attachSize)),
              icon("download", { class: "file-dl", size: ".95rem" })
            ) : null
          )
        );
      }
      case "datacmd":
        return el("div", { class: "datacmd", style: `border-radius:${mine ? "12px 12px 4px 12px" : "12px"}` }, m.text);
      case "data":
        return el(
          "div",
          { class: "data-card" },
          el(
            "div",
            { class: "data-head" },
            el("span", { class: "data-interp" }, m.interp),
            el("span", { class: "spacer" }),
            el("span", { class: "data-meta" }, m.metaText)
          ),
          m.qir && m.qir.length ? el("div", { class: "qir-strip" }, ...m.qir.map((l) => el("div", { class: "qir-line" }, l))) : null,
          el("div", { class: "data-table-wrap" }, dataTable(m.head ?? [], m.dataRows ?? []))
        );
      default:
        return el("div", {});
    }
  }
  function messageRow(ctx, m, ch) {
    const centered = m.t === "event" || m.t === "call";
    const mine = !!m.mine;
    const showAvatar = !mine && !m.sys && !centered;
    const justify = centered ? "center" : mine ? "flex-end" : "flex-start";
    const showMeta = !!m.who && !m.sys && !centered && m.t !== "email" && m.t !== "datacmd";
    return el(
      "div",
      { class: "msg-row", style: `justify-content:${justify}` },
      showAvatar ? el("span", { class: "msg-avatar", style: `background:${tint(m.avColor ?? ch.color, 18)}; color:${m.avColor ?? ch.color}` }, initials(m.who ?? "")) : null,
      el(
        "div",
        { class: "msg-col", style: `align-items:${justify}` },
        showMeta ? el(
          "div",
          { class: "msg-meta" },
          el("span", { class: "msg-meta-name" }, mine ? "You" : m.who),
          el("span", { class: "msg-time" }, m.time ?? "")
        ) : null,
        card(ctx, m, ch, mine)
      )
    );
  }
  function thread(ctx) {
    const ch = activeChannel(ctx.state);
    const msgs = ctx.state.threads[ch.id] ?? [];
    return el(
      "div",
      { class: "thread" },
      el("div", { class: "thread-inner" }, ...msgs.map((m) => messageRow(ctx, m, ch)))
    );
  }
  function autoGrow(ta) {
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 128) + "px";
  }
  function composer(ctx) {
    const { state: state2, actions: actions2 } = ctx;
    const ch = activeChannel(state2);
    const v = composerFor(ch);
    const ta = el("textarea", { class: "composer-ta" + (v.mono ? " mono" : ""), rows: "1", spellcheck: false, placeholder: v.placeholder });
    ta.value = state2.input;
    const count = v.showCharCount ? el("span", { class: "composer-count" }, `${state2.input.length}/160`) : null;
    ta.addEventListener("input", () => {
      state2.input = ta.value;
      autoGrow(ta);
      if (count) count.textContent = `${ta.value.length}/160`;
    });
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        actions2.send();
      }
    });
    const shell = el(
      "div",
      { class: "composer-shell", style: `border-radius:${v.shellRadius}` },
      ...v.attaches.map((a) => el("button", { class: "composer-attach", title: a.label, onClick: () => actions2.attach(a.type) }, icon(a.icon, { size: ".95rem" }))),
      ta,
      count,
      el("button", { class: "composer-send", onClick: () => actions2.send() }, v.sendLabel, icon(v.sendIcon, { size: ".85rem" }))
    );
    const emailHead = v.showTo ? el(
      "div",
      { class: "composer-email-head" },
      el("div", { class: "composer-email-row" }, el("span", { class: "composer-email-label" }, "To"), el("span", { class: "composer-email-val" }, state2.emailTo)),
      el("div", { class: "composer-email-row" }, el("span", { class: "composer-email-label" }, "Subject"), el("span", { class: "composer-email-val" }, state2.emailSubject))
    ) : null;
    const internalRow = v.showInternal ? el(
      "div",
      { class: "composer-internal" },
      el("button", {
        class: "internal-toggle",
        style: state2.internalNote ? "border-color:color-mix(in srgb, var(--warning) 40%, transparent); background:var(--warning-tint); color:var(--warning)" : "",
        onClick: () => actions2.toggleInternal()
      }, icon("lock-fill", { size: ".8rem" }), internalLabel(state2.internalNote)),
      el("span", { class: "internal-hint" }, internalHint(state2.internalNote))
    ) : null;
    return el(
      "div",
      { class: "composer" },
      el(
        "div",
        { class: "composer-inner" },
        emailHead,
        internalRow,
        shell,
        el(
          "div",
          { class: "composer-foot" },
          el("span", { class: "composer-tag", style: `color:${ch.color}` }, v.contextTag),
          " \xB7 " + v.hint
        )
      )
    );
  }
  function section(label, body) {
    return el("div", {}, el("div", { class: "settings-section-label" }, label), body);
  }
  function segmented(items, val, onPick) {
    return el("div", { class: "segmented" }, ...items.map(([v, lbl]) => el("button", { class: val === v ? "on" : "", onClick: () => onPick(v) }, lbl)));
  }
  function settings(ctx) {
    const { state: state2, actions: actions2 } = ctx;
    if (!state2.settingsOpen) return [];
    const scrim = el("div", { class: "scrim", onClick: () => actions2.toggleSettings() });
    const accentRow = el(
      "div",
      { class: "accent-row" },
      ...ACCENTS.map((a) => el("button", {
        class: "accent-swatch" + (state2.accent === a.c ? " selected" : ""),
        title: a.name,
        style: `background:${a.c}; color:${a.c}`,
        onClick: () => actions2.setAccent(a.c)
      }, state2.accent === a.c ? icon("check-lg", { size: ".8rem", style: { color: "#fff" } }) : null))
    );
    const head = el(
      "div",
      { class: "settings-head" },
      icon("sliders", { size: ".9rem" }),
      el("span", { class: "settings-title" }, "Display"),
      el("button", { class: "settings-close", title: "Close", onClick: () => actions2.toggleSettings() }, icon("x-lg", { size: ".9rem" }))
    );
    const body = el(
      "div",
      { class: "settings-body" },
      section("Accent", accentRow),
      section("Size \xB7 density", segmented(DENSITIES, state2.density, (v) => actions2.setDensity(v))),
      section("Theme", segmented(THEMES, state2.theme, (v) => actions2.setTheme(v))),
      el("div", { class: "settings-foot" }, "Size scales the whole rem-based system \u2014 type, spacing and controls \u2014 from one root variable. Nothing here leaves your device.")
    );
    const panel = el("div", { class: "settings" }, head, body);
    return [scrim, panel];
  }
  function call(ctx) {
    const { state: state2, actions: actions2 } = ctx;
    if (!state2.call) return null;
    const c = state2.call;
    const isVideo = c.kind === "video";
    return el(
      "div",
      { class: "call-overlay" },
      el(
        "div",
        { class: "call-card" },
        el(
          "div",
          { class: "call-top" },
          el("div", { class: "call-av", style: `background:${tint(c.color, 20)}; color:${c.color}` }, c.initials),
          el("div", { class: "call-name" }, c.name),
          el(
            "div",
            { class: "call-status" },
            icon(isVideo ? "camera-video-fill" : "telephone-fill", { size: ".85rem" }),
            isVideo ? "Video call \xB7 ringing\u2026" : "Voice call \xB7 ringing\u2026"
          )
        ),
        isVideo ? el("div", { class: "call-cam" }, "camera preview") : null,
        el(
          "div",
          { class: "call-controls" },
          el(
            "button",
            { class: "call-ctl mute" + (state2.callMuted ? " on" : ""), title: "Mute", onClick: () => actions2.toggleMute() },
            icon(state2.callMuted ? "mic-mute-fill" : "mic-fill", { size: ".95rem" })
          ),
          el("button", { class: "call-ctl end", title: "End call", onClick: () => actions2.endCall() }, icon("telephone-x-fill")),
          el("button", { class: "call-ctl keypad", title: "Keypad" }, icon("grid-3x3-gap-fill", { size: ".95rem" }))
        )
      )
    );
  }
  function buildPalette(state2) {
    const q = state2.palette.query.trim().toLowerCase();
    const items = [];
    for (const c of CHANNELS) {
      if (state2.hidden[c.id]) continue;
      if (!q || c.name.toLowerCase().includes(q) || c.group.toLowerCase().includes(q) || c.sub.toLowerCase().includes(q))
        items.push({ kind: "channel", icon: c.icon, label: c.name, hint: c.group, channelId: c.id });
    }
    for (const cmd of PALETTE_COMMANDS) {
      if (!q || cmd.label.toLowerCase().includes(q))
        items.push({ kind: "command", icon: cmd.icon, label: cmd.label, hint: cmd.hint, command: cmd.id });
    }
    if (q) {
      let count = 0;
      for (const c of CHANNELS) {
        for (const m of state2.threads[c.id] ?? []) {
          if (count >= 6) break;
          const txt = m.text ?? m.body ?? m.subject ?? "";
          if (txt && txt.toLowerCase().includes(q)) {
            items.push({ kind: "message", icon: "chat-text", label: txt.length > 56 ? txt.slice(0, 56) + "\u2026" : txt, hint: c.name, channelId: c.id });
            count++;
          }
        }
      }
    }
    return items;
  }
  function palette(ctx) {
    const { state: state2, actions: actions2 } = ctx;
    if (!state2.palette.open) return null;
    const items = buildPalette(state2);
    const idx = items.length ? Math.max(0, Math.min(state2.palette.index, items.length - 1)) : 0;
    const input = el("input", { class: "palette-input", placeholder: "Search channels, messages, commands\u2026", spellcheck: "false" });
    input.value = state2.palette.query;
    input.addEventListener("input", () => actions2.paletteSetQuery(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        actions2.paletteMove(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        actions2.paletteMove(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        actions2.palettePick(idx);
      } else if (e.key === "Escape") {
        e.preventDefault();
        actions2.paletteClose();
      }
    });
    const rows = items.map((it, i) => {
      const row = el(
        "div",
        { class: "palette-item" + (i === idx ? " active" : "") },
        el("span", { class: "palette-item-icon" }, icon(it.icon, { size: ".9rem" })),
        el("span", { class: "palette-label" }, it.label),
        el("span", { class: "palette-kind" }, it.kind),
        el("span", { class: "palette-hint" }, it.hint)
      );
      row.addEventListener("mousedown", (e) => {
        e.preventDefault();
        actions2.palettePick(i);
      });
      return row;
    });
    const box = el(
      "div",
      { class: "palette" },
      el("div", { class: "palette-input-row" }, icon("search", { size: "1rem" }), input, el("span", { class: "tb-kbd" }, "esc")),
      el("div", { class: "palette-list" }, items.length ? null : el("div", { class: "palette-empty" }, "No matches"), ...rows)
    );
    box.addEventListener("click", (e) => e.stopPropagation());
    return el("div", { class: "palette-scrim", onClick: () => actions2.paletteClose() }, box);
  }

  // web/app.ts
  var state = {
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
    palette: { open: false, query: "", index: 0 }
  };
  var wantFocus = false;
  function now() {
    const d = /* @__PURE__ */ new Date();
    return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
  }
  function append2(id, m) {
    m._k = ++state.seq;
    (state.threads[id] ??= []).push(m);
  }
  var actions = {
    open(id) {
      state.activeId = id;
      state.input = "";
      const ch = CHANNELS.find((c) => c.id === id);
      if (ch) ch.unread = 0;
      wantFocus = true;
      render();
    },
    toggleSettings() {
      state.settingsOpen = !state.settingsOpen;
      render();
    },
    setAccent(c) {
      state.accent = c;
      render();
    },
    setDensity(d) {
      state.density = d;
      render();
    },
    setTheme(t) {
      state.theme = t;
      render();
    },
    toggleInternal() {
      state.internalNote = !state.internalNote;
      render();
    },
    hideChannel(id) {
      state.hidden[id] = true;
      if (state.activeId === id) {
        const next = CHANNELS.find((c) => !state.hidden[c.id]);
        if (next) state.activeId = next.id;
      }
      render();
    },
    restoreHidden() {
      state.hidden = {};
      render();
    },
    toggleGroup(name) {
      state.collapsed[name] = !state.collapsed[name];
      render();
    },
    startCall(kind) {
      const ch = activeChannel(state);
      state.call = { kind, name: ch.name, color: ch.color, initials: initials(ch.name) };
      render();
    },
    endCall() {
      state.call = null;
      state.callMuted = false;
      render();
    },
    toggleMute() {
      state.callMuted = !state.callMuted;
      render();
    },
    headerAction(a) {
      if (a.call) actions.startCall(a.call);
    },
    paletteOpen() {
      state.palette = { open: true, query: "", index: 0 };
      render();
    },
    paletteClose() {
      state.palette.open = false;
      render();
    },
    paletteSetQuery(q) {
      state.palette.query = q;
      state.palette.index = 0;
      render();
    },
    paletteMove(dir) {
      const n = buildPalette(state).length;
      if (!n) return;
      state.palette.index = ((state.palette.index + dir) % n + n) % n;
      render();
    },
    palettePick(i) {
      const it = buildPalette(state)[i];
      state.palette.open = false;
      if (!it) {
        render();
        return;
      }
      if (it.channelId) actions.open(it.channelId);
      else if (it.command) runCommand(it.command);
      else render();
    },
    attach(type) {
      const t = now();
      const reg = {
        audio: { t: "audio", mine: true, who: "You", dur: "0:05", time: t },
        file: { t: "file", mine: true, who: "You", name: "document.pdf", size: "320 KB", fileKind: "pdf", time: t },
        csv: { t: "csv", mine: true, who: "You", name: "export.csv", rows: "48 rows \xB7 6 cols", size: "7 KB", time: t },
        image: { t: "file", mine: true, who: "You", name: "screenshot.png", size: "1.2 MB", fileKind: "image", time: t },
        youtube: { t: "youtube", mine: true, who: "You", title: "Shared video", channel: "youtube.com", length: "2:14", time: t }
      };
      const m = reg[type];
      if (m) {
        append2(state.activeId, m);
        wantFocus = true;
        render();
      }
    },
    send() {
      const ch = activeChannel(state);
      const kind = composerKind(ch);
      const text = state.input.trim();
      if (!text) return;
      const t = now();
      if (kind === "data") {
        append2(ch.id, { t: "datacmd", mine: true, text, time: t });
        append2(ch.id, {
          t: "data",
          interp: "Preview",
          metaText: "ran on device",
          qir: text.split("\n"),
          head: ["customer", "region", "mrr"],
          dataRows: [["Globex", "EMEA", "540.5"], ["Toro Bank", "EMEA", "1180"]]
        });
      } else if (kind === "sms") {
        append2(ch.id, { t: "sms", mine: true, who: "You", text, time: t, receipt: "Sent" });
      } else if (kind === "email") {
        append2(ch.id, { t: "email", mine: true, who: "You", from: "You", addr: "you@redpash.io", to: state.emailTo, subject: state.emailSubject, body: text, time: t });
      } else if (kind === "comment") {
        append2(ch.id, { t: "comment", mine: true, who: "You", text, internal: state.internalNote, time: t });
      } else {
        append2(ch.id, { t: "text", mine: true, who: "You", text, time: t });
      }
      state.input = "";
      wantFocus = true;
      render();
    }
  };
  function runCommand(id) {
    if (id === "theme") actions.setTheme(state.theme === "dark" ? "light" : "dark");
    else if (id === "settings") {
      state.settingsOpen = true;
      render();
    } else if (id === "hide") actions.hideChannel(state.activeId);
    else if (id === "restore") actions.restoreHidden();
    else if (id === "call") actions.startCall("voice");
  }
  function applyDisplay() {
    const de = document.documentElement;
    de.setAttribute("data-theme", state.theme);
    de.style.fontSize = DENSITY_PX[state.density] ?? "14px";
    de.style.setProperty("--accent", state.accent);
    de.style.setProperty("--accent-hover", state.accent);
    de.style.setProperty("--accent-tint", tint(state.accent, 12));
    de.style.setProperty("--accent-border", state.accent);
  }
  function render() {
    applyDisplay();
    const ctx = { state, actions };
    const root = document.getElementById("root");
    if (!root) return;
    const shell = el(
      "div",
      { class: "shell" },
      topbar(ctx),
      el(
        "div",
        { class: "body-row" },
        rail(ctx),
        el("div", { class: "main" }, header(ctx), thread(ctx), composer(ctx))
      ),
      ...settings(ctx),
      call(ctx),
      palette(ctx)
    );
    root.replaceChildren(shell);
    const sc = shell.querySelector(".thread");
    if (sc) sc.scrollTop = sc.scrollHeight;
    const ta = shell.querySelector(".composer-ta");
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 128) + "px";
    }
    const pin = shell.querySelector(".palette-input");
    if (pin) {
      pin.focus();
      const n = pin.value.length;
      pin.setSelectionRange(n, n);
    } else if (ta && wantFocus) {
      ta.focus();
      const n = ta.value.length;
      ta.setSelectionRange(n, n);
    }
    wantFocus = false;
  }
  window.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
      e.preventDefault();
      if (state.palette.open) actions.paletteClose();
      else actions.paletteOpen();
      return;
    }
    if (e.key === "Escape") {
      if (state.palette.open) actions.paletteClose();
      else if (state.call) actions.endCall();
      else if (state.settingsOpen) actions.toggleSettings();
    }
  });
  window.addEventListener("DOMContentLoaded", () => {
    render();
  });
})();
