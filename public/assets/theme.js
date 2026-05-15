(function () {
  var STORAGE_KEY = "saas-fabric-theme";

  var DEFAULT_VARS = {
    "--bg": "#0b1022",
    "--surface": "#101938",
    "--surface-elevated": "#1a254a",
    "--text": "#edf2ff",
    "--muted": "#b6c2e2",
    "--border": "#2b3765",
    "--accent": "#6ea8ff",
    "--accent-2": "#8b7dff",
    "--success": "#2fbf71",
    "--warning": "#f5b942",
    "--error": "#f16b6b",
    "--button-bg": "#6ea8ff",
    "--button-text": "#081128",
    "--card-bg": "#141f43",
    "--hero-start": "#4f7ee8",
    "--hero-end": "#8a67ff",
    "--focus-ring": "#8cc0ff",
    "--font-family": 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    "--font-size-scale": "1",
    "--heading-scale": "1",
    "--content-width": "1100px",
    "--radius": "14px",
    "--button-radius": "10px",
    "--spacing-density": "1",
    "--section-spacing": "2rem"
  };

  var DEFAULT_STYLES = {
    bgStyle: "gradient",
    buttonStyle: "soft",
    cardStyle: "elevated",
    navStyle: "outlined",
    heroStyle: "gradient"
  };

  var FONT_CHOICES = {
    inter: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    georgia: 'Georgia, "Times New Roman", serif',
    mono: '"SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
  };

  function withDefaults(overrides) {
    return Object.assign({}, DEFAULT_VARS, overrides || {});
  }

  var PRESETS = [
    {
      name: "Default / SaaS Fabric",
      vars: withDefaults()
    },
    {
      name: "Deep Night",
      vars: withDefaults({
        "--bg": "#06080f",
        "--surface": "#0d1224",
        "--surface-elevated": "#141d38",
        "--text": "#eef2ff",
        "--muted": "#9ea9cd",
        "--border": "#273154",
        "--accent": "#86a6ff",
        "--accent-2": "#6f8cff",
        "--success": "#41c98e",
        "--warning": "#f9c45a",
        "--error": "#ef7b88",
        "--button-bg": "#7e98ff",
        "--button-text": "#050a1a",
        "--card-bg": "#111939",
        "--hero-start": "#2f4e97",
        "--hero-end": "#5a3e9b",
        "--focus-ring": "#96b3ff"
      })
    },
    {
      name: "Ocean",
      vars: withDefaults({
        "--bg": "#031a2f",
        "--surface": "#072541",
        "--surface-elevated": "#0d3457",
        "--text": "#e8f6ff",
        "--muted": "#9ec8dd",
        "--border": "#265073",
        "--accent": "#4fc9ff",
        "--accent-2": "#5de6cc",
        "--success": "#49d4a0",
        "--warning": "#f7cb67",
        "--error": "#ff8181",
        "--button-bg": "#43c4ff",
        "--button-text": "#022235",
        "--card-bg": "#0c3153",
        "--hero-start": "#0a4e80",
        "--hero-end": "#1278a7",
        "--focus-ring": "#7cdbff"
      })
    },
    {
      name: "Forest",
      vars: withDefaults({
        "--bg": "#08180f",
        "--surface": "#11271b",
        "--surface-elevated": "#1a3726",
        "--text": "#ecf9ef",
        "--muted": "#a3c4ae",
        "--border": "#33563f",
        "--accent": "#5ccf7a",
        "--accent-2": "#7be29f",
        "--success": "#47d37f",
        "--warning": "#e7c75c",
        "--error": "#ef7a7a",
        "--button-bg": "#59ca79",
        "--button-text": "#072111",
        "--card-bg": "#163323",
        "--hero-start": "#225f39",
        "--hero-end": "#1f7f4e",
        "--focus-ring": "#9be5b2"
      })
    },
    {
      name: "Sunset",
      vars: withDefaults({
        "--bg": "#1d0d0e",
        "--surface": "#32161a",
        "--surface-elevated": "#442126",
        "--text": "#fff1e8",
        "--muted": "#d8ae98",
        "--border": "#69403d",
        "--accent": "#ff9260",
        "--accent-2": "#ff6fa0",
        "--success": "#6fd7a8",
        "--warning": "#ffc06a",
        "--error": "#ff7d7d",
        "--button-bg": "#ff9364",
        "--button-text": "#321109",
        "--card-bg": "#3e1c20",
        "--hero-start": "#b24e39",
        "--hero-end": "#d46a4e",
        "--focus-ring": "#ffc2a6"
      })
    },
    {
      name: "Light",
      vars: withDefaults({
        "--bg": "#f4f7ff",
        "--surface": "#ffffff",
        "--surface-elevated": "#edf2ff",
        "--text": "#1c2440",
        "--muted": "#516088",
        "--border": "#cbd5ec",
        "--accent": "#3467e7",
        "--accent-2": "#6d57f2",
        "--success": "#1f9d66",
        "--warning": "#b57a12",
        "--error": "#cf3c55",
        "--button-bg": "#3467e7",
        "--button-text": "#ffffff",
        "--card-bg": "#f7f9ff",
        "--hero-start": "#c6d7ff",
        "--hero-end": "#f0f4ff",
        "--focus-ring": "#5b86ff"
      })
    },
    {
      name: "Arctic / Nordic",
      vars: withDefaults({
        "--bg": "#e9f3fb",
        "--surface": "#f9fcff",
        "--surface-elevated": "#edf6ff",
        "--text": "#1d2d45",
        "--muted": "#4f6784",
        "--border": "#c2d5e8",
        "--accent": "#2f7fbf",
        "--accent-2": "#4f9bd1",
        "--success": "#2b9f7c",
        "--warning": "#ba7e2a",
        "--error": "#cb5a66",
        "--button-bg": "#2f7fbf",
        "--button-text": "#ffffff",
        "--card-bg": "#f2f8ff",
        "--hero-start": "#b7d6ee",
        "--hero-end": "#dceaf7",
        "--focus-ring": "#579ed8"
      })
    },
    {
      name: "Cyber / Neon",
      vars: withDefaults({
        "--bg": "#080716",
        "--surface": "#14112a",
        "--surface-elevated": "#211b44",
        "--text": "#f8f3ff",
        "--muted": "#b8afd3",
        "--border": "#3a2f68",
        "--accent": "#33f6ff",
        "--accent-2": "#ff4dce",
        "--success": "#42e8a8",
        "--warning": "#ffd166",
        "--error": "#ff6f91",
        "--button-bg": "#35e9ff",
        "--button-text": "#07101d",
        "--card-bg": "#1b1640",
        "--hero-start": "#3f2c82",
        "--hero-end": "#7b29a4",
        "--focus-ring": "#8bf7ff"
      })
    },
    {
      name: "Enterprise Blue",
      vars: withDefaults({
        "--bg": "#0c1328",
        "--surface": "#131e3d",
        "--surface-elevated": "#1d2a54",
        "--text": "#f0f4ff",
        "--muted": "#aebcdc",
        "--border": "#31497a",
        "--accent": "#4a8cff",
        "--accent-2": "#7aa7ff",
        "--success": "#3fc08a",
        "--warning": "#f2be5c",
        "--error": "#ef7a88",
        "--button-bg": "#4a8cff",
        "--button-text": "#07132c",
        "--card-bg": "#1a274f",
        "--hero-start": "#2d58a3",
        "--hero-end": "#3f7ac0",
        "--focus-ring": "#8db7ff"
      })
    },
    {
      name: "Minimal Slate",
      vars: withDefaults({
        "--bg": "#15181d",
        "--surface": "#1f242c",
        "--surface-elevated": "#2b313a",
        "--text": "#edf1f7",
        "--muted": "#b5bcc8",
        "--border": "#404956",
        "--accent": "#8ea2be",
        "--accent-2": "#a7b8d1",
        "--success": "#6cc39b",
        "--warning": "#d3b574",
        "--error": "#d38392",
        "--button-bg": "#8ea2be",
        "--button-text": "#0f141e",
        "--card-bg": "#242a33",
        "--hero-start": "#3a424e",
        "--hero-end": "#565f6f",
        "--focus-ring": "#b4c4da"
      })
    },
    {
      name: "Warm Sand",
      vars: withDefaults({
        "--bg": "#f6eee2",
        "--surface": "#fff9f0",
        "--surface-elevated": "#f6ebdb",
        "--text": "#3a2e24",
        "--muted": "#7a6452",
        "--border": "#d7c4ad",
        "--accent": "#c67a43",
        "--accent-2": "#b85b6d",
        "--success": "#4fa879",
        "--warning": "#b27c1e",
        "--error": "#bb4b5a",
        "--button-bg": "#c67a43",
        "--button-text": "#fff7f0",
        "--card-bg": "#fbf2e4",
        "--hero-start": "#e4c9a2",
        "--hero-end": "#f4debe",
        "--focus-ring": "#d29463"
      })
    },
    {
      name: "Purple Gradient",
      vars: withDefaults({
        "--bg": "#120a24",
        "--surface": "#1d1139",
        "--surface-elevated": "#2b1854",
        "--text": "#f5efff",
        "--muted": "#c3b2e6",
        "--border": "#4b357b",
        "--accent": "#b486ff",
        "--accent-2": "#8fddff",
        "--success": "#61d7a0",
        "--warning": "#f0c06a",
        "--error": "#f482b5",
        "--button-bg": "#b486ff",
        "--button-text": "#180b30",
        "--card-bg": "#26144a",
        "--hero-start": "#6b3cc7",
        "--hero-end": "#9e45de",
        "--focus-ring": "#d5b3ff"
      })
    }
  ];

  var COLOR_GROUPS = [
    {
      title: "Core palette",
      fields: [
        { key: "--bg", label: "Background" },
        { key: "--surface", label: "Surface" },
        { key: "--surface-elevated", label: "Elevated surface" },
        { key: "--text", label: "Text" },
        { key: "--muted", label: "Muted text" },
        { key: "--border", label: "Border" }
      ]
    },
    {
      title: "Brand + feedback",
      fields: [
        { key: "--accent", label: "Primary accent" },
        { key: "--accent-2", label: "Secondary accent" },
        { key: "--success", label: "Success" },
        { key: "--warning", label: "Warning" },
        { key: "--error", label: "Error" },
        { key: "--focus-ring", label: "Focus ring" }
      ]
    },
    {
      title: "Component colours",
      fields: [
        { key: "--button-bg", label: "Button background" },
        { key: "--button-text", label: "Button text" },
        { key: "--card-bg", label: "Card background" },
        { key: "--hero-start", label: "Hero gradient start" },
        { key: "--hero-end", label: "Hero gradient end" }
      ]
    }
  ];

  var TYPOGRAPHY_FIELDS = [
    {
      key: "--font-family",
      label: "Font family",
      type: "select",
      options: [
        { value: FONT_CHOICES.inter, label: "Inter" },
        { value: FONT_CHOICES.system, label: "System UI" },
        { value: FONT_CHOICES.georgia, label: "Georgia Serif" },
        { value: FONT_CHOICES.mono, label: "Mono" }
      ]
    },
    { key: "--font-size-scale", label: "Font size scale", type: "range", min: 0.85, max: 1.2, step: 0.01 },
    { key: "--heading-scale", label: "Heading scale", type: "range", min: 0.9, max: 1.3, step: 0.01 }
  ];

  var LAYOUT_FIELDS = [
    { key: "--content-width", label: "Content width (px)", type: "range", min: 900, max: 1280, step: 10, unit: "px" },
    { key: "--radius", label: "Card radius (px)", type: "range", min: 8, max: 28, step: 1, unit: "px" },
    { key: "--button-radius", label: "Button radius (px)", type: "range", min: 8, max: 24, step: 1, unit: "px" },
    { key: "--spacing-density", label: "Spacing density", type: "range", min: 0.85, max: 1.25, step: 0.01 },
    { key: "--section-spacing", label: "Section spacing (rem)", type: "range", min: 1.25, max: 3.5, step: 0.05, unit: "rem" }
  ];

  var STYLE_FIELDS = [
    {
      key: "buttonStyle",
      label: "Button style",
      options: [
        { value: "soft", label: "Soft" },
        { value: "solid", label: "Solid" },
        { value: "outline", label: "Outline" }
      ]
    },
    {
      key: "cardStyle",
      label: "Card style",
      options: [
        { value: "elevated", label: "Elevated" },
        { value: "flat", label: "Flat" },
        { value: "glass", label: "Glass" }
      ]
    },
    {
      key: "navStyle",
      label: "Nav pills",
      options: [
        { value: "outlined", label: "Outlined" },
        { value: "solid", label: "Solid" },
        { value: "minimal", label: "Minimal" }
      ]
    },
    {
      key: "heroStyle",
      label: "Hero style",
      options: [
        { value: "gradient", label: "Gradient" },
        { value: "solid", label: "Solid" },
        { value: "glass", label: "Glass" }
      ]
    },
    {
      key: "bgStyle",
      label: "Background",
      options: [
        { value: "gradient", label: "Gradient" },
        { value: "solid", label: "Solid" },
        { value: "glass", label: "Glass" },
        { value: "pattern", label: "Subtle pattern" }
      ]
    }
  ];

  var COLOR_KEYS = COLOR_GROUPS.reduce(function (list, group) {
    group.fields.forEach(function (field) { list.push(field.key); });
    return list;
  }, []);
  var FONT_VALUES = Object.keys(FONT_CHOICES).map(function (k) { return FONT_CHOICES[k]; });
  var RANGE_SCHEMA_FIELDS = LAYOUT_FIELDS.concat(TYPOGRAPHY_FIELDS);

  function normalizeHex(value) {
    var str = String(value || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(str)) return str.toLowerCase();
    var m = str.match(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/);
    if (m) return ("#" + m[1] + m[1] + m[2] + m[2] + m[3] + m[3]).toLowerCase();
    return "";
  }

  function parseColor(value) {
    var str = String(value || "").trim();
    var hex = normalizeHex(str);
    if (hex) {
      return {
        r: parseInt(hex.slice(1, 3), 16),
        g: parseInt(hex.slice(3, 5), 16),
        b: parseInt(hex.slice(5, 7), 16)
      };
    }
    var rgb = str.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(\s*,\s*[\d.]+)?\s*\)$/i);
    if (!rgb) return null;
    var r = Math.max(0, Math.min(255, Number(rgb[1])));
    var g = Math.max(0, Math.min(255, Number(rgb[2])));
    var b = Math.max(0, Math.min(255, Number(rgb[3])));
    if ([r, g, b].some(function (x) { return Number.isNaN(x); })) return null;
    return { r: r, g: g, b: b };
  }

  function luminance(rgb) {
    function channel(c) {
      var v = c / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
  }

  function contrastRatio(a, b) {
    var c1 = parseColor(a);
    var c2 = parseColor(b);
    if (!c1 || !c2) return null;
    var l1 = luminance(c1);
    var l2 = luminance(c2);
    var max = Math.max(l1, l2);
    var min = Math.min(l1, l2);
    return (max + 0.05) / (min + 0.05);
  }

  function validateContrast(vars) {
    var checks = [
      { fg: "--text", bg: "--bg", label: "Main text" },
      { fg: "--muted", bg: "--surface", label: "Muted text" },
      { fg: "--button-text", bg: "--button-bg", label: "Button text" },
      { fg: "--accent", bg: "--bg", label: "Link/accent text" }
    ];
    return checks
      .map(function (check) {
        var ratio = contrastRatio(vars[check.fg], vars[check.bg]);
        return ratio !== null && ratio < 4.5
          ? check.label + " contrast is low (" + ratio.toFixed(1) + ":1)."
          : "";
      })
      .filter(Boolean);
  }

  function applyThemeState(state) {
    var root = document.documentElement;
    Object.keys(state.vars).forEach(function (key) {
      root.style.setProperty(key, state.vars[key]);
    });
    Object.keys(state.styles).forEach(function (key) {
      root.dataset[key] = state.styles[key];
    });
  }

  function serializeState(state) {
    return {
      version: 2,
      vars: Object.assign({}, state.vars),
      styles: Object.assign({}, state.styles)
    };
  }

  function saveTheme(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeState(state)));
    } catch (_) {}
  }

  function isObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function toState(raw) {
    var state = {
      vars: Object.assign({}, DEFAULT_VARS),
      styles: Object.assign({}, DEFAULT_STYLES)
    };

    if (!isObject(raw)) return state;

    if (raw.vars && raw.styles) {
      Object.keys(DEFAULT_VARS).forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(raw.vars, key)) {
          state.vars[key] = String(raw.vars[key]);
        }
      });
      Object.keys(DEFAULT_STYLES).forEach(function (key) {
        if (Object.prototype.hasOwnProperty.call(raw.styles, key)) {
          state.styles[key] = String(raw.styles[key]);
        }
      });
      return state;
    }

    /* Legacy format: flat CSS variable object */
    Object.keys(DEFAULT_VARS).forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(raw, key)) {
        state.vars[key] = String(raw[key]);
      }
    });

    return state;
  }

  function loadSavedTheme() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      return stored ? toState(JSON.parse(stored)) : null;
    } catch (_) {
      return null;
    }
  }

  function getPreset(index) {
    return PRESETS[Number(index)] || null;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function createRangeField(field, value) {
    return (
      '<label class="theme-row" for="' + escapeHtml(field.key) + '">' +
      '<span>' + escapeHtml(field.label) + '</span>' +
      '<input id="' + escapeHtml(field.key) + '" data-var="' + escapeHtml(field.key) + '" type="range" min="' +
      field.min +
      '" max="' + field.max + '" step="' + field.step + '" value="' + escapeHtml(String(value)) + '" />' +
      '<output data-output="' + escapeHtml(field.key) + '"></output>' +
      "</label>"
    );
  }

  function createSelectField(field, value) {
    var options = field.options.map(function (opt) {
      var selected = opt.value === value ? ' selected="selected"' : "";
      return '<option value="' + escapeHtml(opt.value) + '"' + selected + '>' + escapeHtml(opt.label) + "</option>";
    }).join("");

    return (
      '<label class="theme-row" for="' + escapeHtml(field.key) + '">' +
      '<span>' + escapeHtml(field.label) + '</span>' +
      '<select id="' + escapeHtml(field.key) + '" data-var="' + escapeHtml(field.key) + '">' + options + "</select>" +
      "</label>"
    );
  }

  function buildPresetButtons() {
    return PRESETS.map(function (preset, idx) {
      var chips = ["--bg", "--surface", "--accent", "--hero-end"].map(function (key) {
        return '<span class="theme-swatch" style="background:' + escapeHtml(preset.vars[key]) + '"></span>';
      }).join("");

      return (
        '<button type="button" class="theme-preset-btn" data-preset="' + idx + '">' +
        '<span class="theme-preset-name">' + escapeHtml(preset.name) + "</span>" +
        '<span class="theme-swatch-row" aria-hidden="true">' + chips + "</span>" +
        "</button>"
      );
    }).join("");
  }

  function buildColourGroups(state) {
    return COLOR_GROUPS.map(function (group) {
      var rows = group.fields.map(function (field) {
        var value = normalizeHex(state.vars[field.key]) || normalizeHex(DEFAULT_VARS[field.key]);
        return (
          '<label class="theme-row" for="' + escapeHtml(field.key) + '">' +
          '<span>' + escapeHtml(field.label) + '</span>' +
          '<input id="' + escapeHtml(field.key) + '" type="color" data-var="' + escapeHtml(field.key) + '" value="' + escapeHtml(value) + '" />' +
          "</label>"
        );
      }).join("");
      return '<fieldset class="theme-group"><legend>' + escapeHtml(group.title) + "</legend>" + rows + "</fieldset>";
    }).join("");
  }

  function buildPanel(state) {
    var panel = document.createElement("aside");
    panel.id = "theme-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Theme customization panel");
    panel.hidden = true;

    var typography = TYPOGRAPHY_FIELDS.map(function (field) {
      var value = state.vars[field.key] || DEFAULT_VARS[field.key];
      return field.type === "range" ? createRangeField(field, value) : createSelectField(field, value);
    }).join("");

    var layout = LAYOUT_FIELDS.map(function (field) {
      var current = state.vars[field.key] || DEFAULT_VARS[field.key];
      var numeric = parseFloat(String(current).replace(/[a-z%]+/gi, ""));
      var value = Number.isFinite(numeric) ? numeric : field.min;
      return createRangeField(field, value);
    }).join("");

    var styles = STYLE_FIELDS.map(function (field) {
      var value = state.styles[field.key] || DEFAULT_STYLES[field.key];
      return createSelectField({ key: field.key, label: field.label, options: field.options }, value);
    }).join("");

    panel.innerHTML =
      '<div class="theme-panel-header">' +
      '<h2>Theme customizer</h2>' +
      '<button id="theme-panel-close" type="button" aria-label="Close theme panel">✕</button>' +
      "</div>" +
      '<div class="theme-panel-body">' +
      '<p class="theme-panel-hint">Every control is labeled. Changes preview instantly and are saved automatically.</p>' +
      '<section class="theme-block"><h3>Theme presets</h3><div class="theme-presets">' + buildPresetButtons() + "</div></section>" +
      '<section class="theme-block"><h3>Colour tokens</h3>' + buildColourGroups(state) + "</section>" +
      '<section class="theme-block"><h3>Typography</h3>' + typography + "</section>" +
      '<section class="theme-block"><h3>Layout</h3>' + layout + "</section>" +
      '<section class="theme-block"><h3>Components + background</h3>' + styles + "</section>" +
      '<div class="theme-panel-actions">' +
      '<button id="theme-reset" type="button">Reset</button>' +
      '<button id="theme-export" type="button">Export JSON</button>' +
      '<label class="theme-import-label">Import JSON<input type="file" id="theme-import" accept="application/json,.json" /></label>' +
      "</div>" +
      '<p id="theme-status" class="theme-status" aria-live="polite"></p>' +
      "</div>";

    return panel;
  }

  function showStatus(panel, msg, isWarning) {
    var el = panel.querySelector("#theme-status");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("is-warning", Boolean(isWarning));
  }

  function updateRangeOutputs(panel) {
    panel.querySelectorAll("[data-output]").forEach(function (output) {
      var key = output.getAttribute("data-output");
      var input = panel.querySelector('[data-var="' + key + '"]');
      if (!input) return;
      var unit = "";
      var field = RANGE_SCHEMA_FIELDS.find(function (item) { return item.key === key; });
      if (field && field.unit) unit = field.unit;
      output.textContent = input.value + unit;
    });
  }

  function exportTheme(state) {
    var json = JSON.stringify(serializeState(state), null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "saas-fabric-theme.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function isColorLiteral(value) {
    return /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(\s*,\s*[\d.]+)?\s*\))$/.test(String(value).trim());
  }

  function clampNumber(value, min, max) {
    var n = Number(value);
    if (!Number.isFinite(n)) return null;
    if (n < min || n > max) return null;
    return n;
  }

  function sanitizeThemeImport(raw) {
    if (!isObject(raw)) throw new Error("Theme file must be a JSON object.");
    var imported = toState(raw);

    COLOR_KEYS.forEach(function (key) {
      if (!isColorLiteral(imported.vars[key])) {
        imported.vars[key] = DEFAULT_VARS[key];
      }
    });

    imported.vars["--font-family"] = FONT_VALUES.includes(imported.vars["--font-family"])
      ? imported.vars["--font-family"]
      : DEFAULT_VARS["--font-family"];

    var size = clampNumber(imported.vars["--font-size-scale"], 0.85, 1.2);
    imported.vars["--font-size-scale"] = size === null ? DEFAULT_VARS["--font-size-scale"] : String(size);

    var heading = clampNumber(imported.vars["--heading-scale"], 0.9, 1.3);
    imported.vars["--heading-scale"] = heading === null ? DEFAULT_VARS["--heading-scale"] : String(heading);

    var width = clampNumber(String(imported.vars["--content-width"]).replace("px", ""), 900, 1280);
    imported.vars["--content-width"] = width === null ? DEFAULT_VARS["--content-width"] : String(width) + "px";

    var radius = clampNumber(String(imported.vars["--radius"]).replace("px", ""), 8, 28);
    imported.vars["--radius"] = radius === null ? DEFAULT_VARS["--radius"] : String(radius) + "px";

    var density = clampNumber(imported.vars["--spacing-density"], 0.85, 1.25);
    imported.vars["--spacing-density"] = density === null ? DEFAULT_VARS["--spacing-density"] : String(density);

    var section = clampNumber(String(imported.vars["--section-spacing"]).replace("rem", ""), 1.25, 3.5);
    imported.vars["--section-spacing"] = section === null ? DEFAULT_VARS["--section-spacing"] : String(section) + "rem";

    var buttonRadius = clampNumber(String(imported.vars["--button-radius"]).replace("px", ""), 8, 24);
    imported.vars["--button-radius"] = buttonRadius === null ? DEFAULT_VARS["--button-radius"] : String(buttonRadius) + "px";

    STYLE_FIELDS.forEach(function (field) {
      var allowed = field.options.map(function (opt) { return opt.value; });
      if (allowed.indexOf(imported.styles[field.key]) === -1) {
        imported.styles[field.key] = DEFAULT_STYLES[field.key];
      }
    });

    return imported;
  }

  function applyPreset(state, preset) {
    state.vars = Object.assign({}, preset.vars, {
      "--font-family": state.vars["--font-family"],
      "--font-size-scale": state.vars["--font-size-scale"],
      "--heading-scale": state.vars["--heading-scale"],
      "--content-width": state.vars["--content-width"],
      "--radius": state.vars["--radius"],
      "--spacing-density": state.vars["--spacing-density"],
      "--section-spacing": state.vars["--section-spacing"],
      "--button-radius": state.vars["--button-radius"]
    });
  }

  function bindStyleRecipes(panel, state) {
    function applyButtonStyle(value) {
      if (value === "solid") {
        if (!isColorLiteral(state.vars["--button-text"])) {
          state.vars["--button-text"] = "#ffffff";
        }
      }
      if (value === "outline") {
        state.vars["--button-bg"] = state.vars["--surface"];
      }
    }

    function applyCardStyle(value) {
      if (value === "glass") state.vars["--card-bg"] = state.vars["--surface-elevated"];
      if (value === "flat") state.vars["--card-bg"] = state.vars["--surface"];
    }

    function applyHeroStyle(value) {
      if (value === "solid") state.vars["--hero-end"] = state.vars["--hero-start"];
      if (value === "glass") state.vars["--hero-end"] = state.vars["--surface-elevated"];
    }

    panel.querySelectorAll("select[data-var]").forEach(function (select) {
      select.addEventListener("change", function () {
        var key = select.getAttribute("data-var");
        if (Object.prototype.hasOwnProperty.call(state.vars, key)) {
          state.vars[key] = select.value;
        } else if (Object.prototype.hasOwnProperty.call(state.styles, key)) {
          state.styles[key] = select.value;
          if (key === "buttonStyle") applyButtonStyle(select.value);
          if (key === "cardStyle") applyCardStyle(select.value);
          if (key === "heroStyle") applyHeroStyle(select.value);
        }
        applyThemeState(state);
        saveTheme(state);
        updateRangeOutputs(panel);
        renderContrastFeedback(panel, state);
      });
    });
  }

  function renderContrastFeedback(panel, state) {
    var warnings = validateContrast(state.vars);
    if (warnings.length) {
      showStatus(panel, "Accessibility warning: " + warnings.join(" "), true);
    } else {
      showStatus(panel, "Theme looks good. Contrast checks passed.", false);
    }
  }

  function init() {
    var state = loadSavedTheme() || {
      vars: Object.assign({}, DEFAULT_VARS),
      styles: Object.assign({}, DEFAULT_STYLES)
    };

    var toggleBtn = document.createElement("button");
    toggleBtn.id = "theme-toggle";
    toggleBtn.type = "button";
    toggleBtn.setAttribute("aria-label", "Open theme customization");
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.setAttribute("title", "Customise theme");
    toggleBtn.textContent = "🎨";
    document.body.appendChild(toggleBtn);

    var panel;

    function renderPanel(isOpen) {
      if (panel) panel.remove();
      panel = buildPanel(state);
      panel.hidden = !isOpen;
      document.body.appendChild(panel);
      toggleBtn.setAttribute("aria-expanded", String(isOpen));
      updateRangeOutputs(panel);
      renderContrastFeedback(panel, state);

      panel.querySelector("#theme-panel-close").addEventListener("click", function () {
        panel.hidden = true;
        toggleBtn.setAttribute("aria-expanded", "false");
        toggleBtn.focus();
      });

      panel.querySelectorAll("input[type=\"color\"][data-var]").forEach(function (input) {
        input.addEventListener("input", function () {
          state.vars[input.dataset.var] = input.value;
          applyThemeState(state);
          saveTheme(state);
          renderContrastFeedback(panel, state);
        });
      });

      panel.querySelectorAll("input[type=\"range\"][data-var]").forEach(function (input) {
        input.addEventListener("input", function () {
          var key = input.dataset.var;
          var field = RANGE_SCHEMA_FIELDS.find(function (item) { return item.key === key; });
          if (!field) return;
          state.vars[key] = field.unit ? input.value + field.unit : input.value;
          applyThemeState(state);
          saveTheme(state);
          updateRangeOutputs(panel);
          renderContrastFeedback(panel, state);
        });
      });

      bindStyleRecipes(panel, state);

      panel.querySelectorAll(".theme-preset-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var preset = getPreset(btn.dataset.preset);
          if (!preset) return;
          applyPreset(state, preset);
          applyThemeState(state);
          saveTheme(state);
          renderPanel(true);
        });
      });

      panel.querySelector("#theme-reset").addEventListener("click", function () {
        state = { vars: Object.assign({}, DEFAULT_VARS), styles: Object.assign({}, DEFAULT_STYLES) };
        applyThemeState(state);
        saveTheme(state);
        renderPanel(true);
      });

      panel.querySelector("#theme-export").addEventListener("click", function () {
        exportTheme(state);
      });

      panel.querySelector("#theme-import").addEventListener("change", function (event) {
        var file = event.target.files && event.target.files[0];
        if (!file) return;
        file.text().then(function (text) {
          var parsed;
          try {
            parsed = JSON.parse(text);
          } catch (_) {
            showStatus(panel, "Import failed: invalid JSON format.", true);
            return;
          }
          try {
            state = sanitizeThemeImport(parsed);
            applyThemeState(state);
            saveTheme(state);
            renderPanel(true);
          } catch (err) {
            showStatus(panel, "Import failed: " + err.message, true);
          }
        }).catch(function () {
          showStatus(panel, "Import failed: unable to read file.", true);
        });
        event.target.value = "";
      });
    }

    applyThemeState(state);
    renderPanel(false);

    toggleBtn.addEventListener("click", function () {
      var open = panel.hidden;
      panel.hidden = !open;
      toggleBtn.setAttribute("aria-expanded", String(open));
      if (open) {
        var firstInput = panel.querySelector("button, input, select");
        if (firstInput) firstInput.focus();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !panel.hidden) {
        panel.hidden = true;
        toggleBtn.setAttribute("aria-expanded", "false");
        toggleBtn.focus();
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
