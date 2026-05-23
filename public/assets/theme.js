(function () {
  var STORAGE_KEY = "mmir-theme";

  var DEFAULTS = {
    "--bg": "#0a0f1f",
    "--bg-top": "#1f2f66",
    "--surface": "#111935",
    "--surface-elevated": "#151f42",
    "--panel": "#111935",
    "--panel-soft": "#1a2346",
    "--card-bg": "#141f40",
    "--text": "#edf2ff",
    "--muted": "#b8c1df",
    "--accent": "#6ea8ff",
    "--accent-2": "#9b7cff",
    "--accent-contrast": "#07111f",
    "--success": "#44d07b",
    "--warning": "#ffd166",
    "--danger": "#ff6b6b",
    "--border": "#24305e",
    "--border-soft": "#2a3768",
    "--header-bg": "rgba(10, 15, 31, 0.9)",
    "--focus-ring": "#8bb8ff",
    "--hero-start": "#6ea8ff",
    "--hero-end": "#9b7cff",
    "--hero-text": "#ffffff",
    "--button-bg": "#1a2346",
    "--button-text": "#edf2ff",
    "--button-hover-bg": "#24305e",
    "--nav-pill-bg": "rgba(20, 31, 64, 0.35)",
    "--nav-pill-active-bg": "rgba(110, 168, 255, 0.14)",
    "--input-bg": "#0a1230",
    "--radius": "14px",
    "--card-radius": "14px",
    "--button-radius": "10px",
    "--container-width": "1100px",
    "--density": "1",
    "--section-spacing": "2rem",
    "--font-family": "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    "--font-size-base": "16px",
    "--heading-scale": "1",
    "--shadow-strength": "0.35",
    "--glass-blur": "8px"
  };

  var PRESETS = [
    preset("Default", "Balanced MMIR dark theme", {}),
    preset("Deep Night", "High-contrast dark mode", {"--bg":"#05070d","--bg-top":"#111827","--surface":"#0b1020","--surface-elevated":"#111827","--panel":"#0b1020","--panel-soft":"#111827","--card-bg":"#111827","--text":"#f8fafc","--muted":"#cbd5e1","--accent":"#93c5fd","--accent-2":"#c084fc","--border":"#1f2937","--border-soft":"#334155","--header-bg":"rgba(5, 7, 13, 0.92)","--focus-ring":"#93c5fd","--hero-start":"#93c5fd","--hero-end":"#c084fc","--button-bg":"#111827","--button-hover-bg":"#1f2937","--input-bg":"#070b14"}),
    preset("Ocean", "Blue/teal product look", {"--bg":"#031525","--bg-top":"#073b5f","--surface":"#08233a","--surface-elevated":"#0b3454","--panel":"#08233a","--panel-soft":"#0d4268","--card-bg":"#0b304d","--text":"#ecfeff","--muted":"#a5d8e8","--accent":"#22d3ee","--accent-2":"#38bdf8","--accent-contrast":"#041014","--success":"#2dd4bf","--border":"#155e75","--border-soft":"#1f7a92","--header-bg":"rgba(3, 21, 37, 0.90)","--focus-ring":"#67e8f9","--hero-start":"#22d3ee","--hero-end":"#38bdf8","--button-bg":"#0d4268","--button-hover-bg":"#155e75","--input-bg":"#051c2f"}),
    preset("Forest", "Calm green operations theme", {"--bg":"#06140d","--bg-top":"#12321f","--surface":"#0d2015","--surface-elevated":"#14331f","--panel":"#0d2015","--panel-soft":"#183d27","--card-bg":"#132d1d","--text":"#f0fdf4","--muted":"#bbf7d0","--accent":"#4ade80","--accent-2":"#22c55e","--accent-contrast":"#052e16","--success":"#86efac","--border":"#1f5132","--border-soft":"#2f6f45","--header-bg":"rgba(6, 20, 13, 0.91)","--focus-ring":"#86efac","--hero-start":"#4ade80","--hero-end":"#22c55e","--button-bg":"#183d27","--button-hover-bg":"#225536","--input-bg":"#08180f"}),
    preset("Sunset", "Warm launch-page palette", {"--bg":"#180a05","--bg-top":"#451a0b","--surface":"#25110a","--surface-elevated":"#3a190d","--panel":"#25110a","--panel-soft":"#4a2112","--card-bg":"#33170d","--text":"#fff7ed","--muted":"#fed7aa","--accent":"#fb923c","--accent-2":"#f97316","--accent-contrast":"#431407","--border":"#7c2d12","--border-soft":"#9a3412","--header-bg":"rgba(24, 10, 5, 0.91)","--focus-ring":"#fdba74","--hero-start":"#fb923c","--hero-end":"#f97316","--button-bg":"#4a2112","--button-hover-bg":"#7c2d12","--input-bg":"#1f0c06"}),
    preset("Light", "Clean light mode", {"--bg":"#f6f8ff","--bg-top":"#dce7ff","--surface":"#ffffff","--surface-elevated":"#f8fbff","--panel":"#ffffff","--panel-soft":"#eef4ff","--card-bg":"#ffffff","--text":"#111827","--muted":"#4b5563","--accent":"#2563eb","--accent-2":"#7c3aed","--accent-contrast":"#ffffff","--success":"#047857","--warning":"#b45309","--danger":"#dc2626","--border":"#cbd5e1","--border-soft":"#dbe3ef","--header-bg":"rgba(246, 248, 255, 0.92)","--focus-ring":"#2563eb","--hero-start":"#2563eb","--hero-end":"#7c3aed","--hero-text":"#111827","--button-bg":"#ffffff","--button-text":"#111827","--button-hover-bg":"#eef4ff","--input-bg":"#ffffff","--shadow-strength":"0.12"}),
    preset("Arctic", "Nordic, crisp and bright", {"--bg":"#eef7fb","--bg-top":"#cfeeff","--surface":"#ffffff","--surface-elevated":"#f7fcff","--panel":"#ffffff","--panel-soft":"#e6f5fb","--card-bg":"#ffffff","--text":"#0f172a","--muted":"#475569","--accent":"#0284c7","--accent-2":"#0e7490","--accent-contrast":"#ffffff","--success":"#059669","--warning":"#b45309","--danger":"#dc2626","--border":"#bad7e6","--border-soft":"#d2e6ef","--header-bg":"rgba(238, 247, 251, 0.92)","--focus-ring":"#0ea5e9","--hero-start":"#0ea5e9","--hero-end":"#06b6d4","--hero-text":"#0f172a","--button-bg":"#ffffff","--button-text":"#0f172a","--button-hover-bg":"#e6f5fb","--input-bg":"#ffffff","--shadow-strength":"0.10"}),
    preset("Cyber", "Neon AI/agent style", {"--bg":"#050013","--bg-top":"#1e0b4b","--surface":"#0c0622","--surface-elevated":"#160a35","--panel":"#0c0622","--panel-soft":"#21104a","--card-bg":"#140b31","--text":"#f5f3ff","--muted":"#c4b5fd","--accent":"#22d3ee","--accent-2":"#a78bfa","--accent-contrast":"#030712","--border":"#4c1d95","--border-soft":"#6d28d9","--header-bg":"rgba(5, 0, 19, 0.92)","--focus-ring":"#22d3ee","--hero-start":"#22d3ee","--hero-end":"#a78bfa","--button-bg":"#21104a","--button-hover-bg":"#312060","--input-bg":"#09031a","--shadow-strength":"0.48"}),
    preset("Enterprise Blue", "Professional B2B palette", {"--bg":"#08111f","--bg-top":"#18345a","--surface":"#101b2e","--surface-elevated":"#172642","--panel":"#101b2e","--panel-soft":"#1d3154","--card-bg":"#15233b","--text":"#f8fbff","--muted":"#c6d3e1","--accent":"#5aa2ff","--accent-2":"#7dd3fc","--border":"#26476f","--border-soft":"#315986","--header-bg":"rgba(8, 17, 31, 0.91)","--focus-ring":"#7dd3fc","--hero-start":"#5aa2ff","--hero-end":"#7dd3fc","--button-bg":"#1d3154","--button-hover-bg":"#26476f","--input-bg":"#0b1728"}),
    preset("Minimal Slate", "Neutral and content-focused", {"--bg":"#0f172a","--bg-top":"#1e293b","--surface":"#111827","--surface-elevated":"#1f2937","--panel":"#111827","--panel-soft":"#1f2937","--card-bg":"#182235","--text":"#f9fafb","--muted":"#d1d5db","--accent":"#e5e7eb","--accent-2":"#94a3b8","--accent-contrast":"#111827","--border":"#374151","--border-soft":"#4b5563","--header-bg":"rgba(15, 23, 42, 0.92)","--focus-ring":"#e5e7eb","--hero-start":"#94a3b8","--hero-end":"#e5e7eb","--button-bg":"#1f2937","--button-hover-bg":"#374151","--input-bg":"#111827"}),
    preset("Warm Sand", "Soft founder/startup palette", {"--bg":"#fff7ed","--bg-top":"#fed7aa","--surface":"#fffaf5","--surface-elevated":"#fff7ed","--panel":"#fffaf5","--panel-soft":"#ffedd5","--card-bg":"#ffffff","--text":"#24140a","--muted":"#7c4a2d","--accent":"#c2410c","--accent-2":"#b45309","--accent-contrast":"#ffffff","--success":"#15803d","--warning":"#a16207","--danger":"#b91c1c","--border":"#fdba74","--border-soft":"#fed7aa","--header-bg":"rgba(255, 247, 237, 0.92)","--focus-ring":"#ea580c","--hero-start":"#c2410c","--hero-end":"#b45309","--hero-text":"#24140a","--button-bg":"#fffaf5","--button-text":"#24140a","--button-hover-bg":"#ffedd5","--input-bg":"#ffffff","--shadow-strength":"0.11"}),
    preset("Purple Gradient", "Modern creator/product style", {"--bg":"#16051f","--bg-top":"#3b0764","--surface":"#1f0b2e","--surface-elevated":"#2d1242","--panel":"#1f0b2e","--panel-soft":"#3b1a55","--card-bg":"#2a103d","--text":"#faf5ff","--muted":"#e9d5ff","--accent":"#d946ef","--accent-2":"#8b5cf6","--accent-contrast":"#250631","--border":"#6b21a8","--border-soft":"#7e22ce","--header-bg":"rgba(22, 5, 31, 0.91)","--focus-ring":"#e879f9","--hero-start":"#d946ef","--hero-end":"#8b5cf6","--button-bg":"#3b1a55","--button-hover-bg":"#4a2167","--input-bg":"#180721"})
  ];

  var COLOR_GROUPS = [
    group("Foundation", [["--bg", "Page background"], ["--bg-top", "Top glow"], ["--surface", "Main surface"], ["--surface-elevated", "Elevated surface"], ["--card-bg", "Card background"], ["--text", "Text"], ["--muted", "Muted text"]]),
    group("Brand and states", [["--accent", "Primary accent"], ["--accent-2", "Secondary accent"], ["--accent-contrast", "Accent text"], ["--success", "Success"], ["--warning", "Warning"], ["--danger", "Error"], ["--focus-ring", "Focus ring"]]),
    group("Components", [["--border", "Strong border"], ["--border-soft", "Soft border"], ["--button-bg", "Button background"], ["--button-text", "Button text"], ["--button-hover-bg", "Button hover"], ["--input-bg", "Input background"], ["--hero-text", "Hero text"]]),
    group("Hero gradient", [["--hero-start", "Hero start"], ["--hero-end", "Hero end"]])
  ];
  var COLOR_PICKER_KEYS = COLOR_GROUPS.reduce(function (keys, group) {
    group.fields.forEach(function (field) { keys[field.key] = true; });
    return keys;
  }, {});

  var FONT_OPTIONS = [
    ["Inter / system", "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"],
    ["System clean", "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"],
    ["Georgia editorial", "Georgia, 'Times New Roman', serif"],
    ["Mono builder", "'SFMono-Regular', Consolas, 'Liberation Mono', monospace"]
  ];

  var RANGE_FIELDS = [
    range("--font-size-base", "Base font size", 14, 20, 1, "px"),
    range("--heading-scale", "Heading scale", 0.85, 1.25, 0.05, ""),
    range("--container-width", "Content width", 900, 1360, 20, "px"),
    range("--card-radius", "Card radius", 8, 30, 1, "px"),
    range("--button-radius", "Button radius", 6, 24, 1, "px"),
    range("--density", "Spacing density", 0.8, 1.25, 0.05, ""),
    range("--section-spacing", "Section spacing", 1.2, 3.5, 0.1, "rem"),
    range("--shadow-strength", "Shadow strength", 0, 0.55, 0.05, ""),
    range("--glass-blur", "Header blur", 0, 18, 1, "px")
  ];

  function preset(name, description, vars) { return { name: name, description: description, vars: complete(vars) }; }
  function group(title, fields) { return { title: title, fields: fields.map(function (f) { return { key: f[0], label: f[1] }; }) }; }
  function range(key, label, min, max, step, suffix) { return { key: key, label: label, min: min, max: max, step: step, suffix: suffix }; }
  function complete(vars) { return Object.assign({}, DEFAULTS, vars || {}); }

  function apply(vars) {
    var full = complete(vars);
    Object.keys(DEFAULTS).forEach(function (key) { document.documentElement.style.setProperty(key, full[key]); });
    return full;
  }

  function save(vars) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(complete(vars))); } catch (_) {} }
  function load() { try { return complete(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")); } catch (_) { return complete(); } }
  function number(value) { var m = String(value).match(/-?\d+(\.\d+)?/); return m ? m[0] : "0"; }
  function hex(value) {
    var s = String(value || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(s)) return s;
    var m = s.match(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/);
    return m ? "#" + m[1] + m[1] + m[2] + m[2] + m[3] + m[3] : "";
  }

  function current(panel) {
    var vars = complete();
    panel.querySelectorAll("[data-var]").forEach(function (input) {
      vars[input.dataset.var] = input.type === "range" ? input.value + (input.dataset.suffix || "") : input.value;
    });
    return vars;
  }

  function sync(panel, vars) {
    var full = complete(vars);
    panel.querySelectorAll("[data-var]").forEach(function (input) {
      var value = full[input.dataset.var];
      if (input.type === "color") input.value = hex(value) || hex(DEFAULTS[input.dataset.var]) || "#000000";
      else if (input.type === "range") { input.value = number(value); updateRange(input); }
      else input.value = value;
    });
    updatePresets(panel, full);
    updateContrast(panel, full);
  }

  function updateRange(input) {
    var out = document.getElementById(input.getAttribute("aria-describedby"));
    if (out) out.textContent = input.value + (input.dataset.suffix || "");
  }

  function rgb(hexValue) {
    var h = hex(hexValue);
    return h ? [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255] : null;
  }

  function lumPart(c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function contrast(a, b) {
    var x = rgb(a), y = rgb(b);
    if (!x || !y) return null;
    var l1 = 0.2126 * lumPart(x[0]) + 0.7152 * lumPart(x[1]) + 0.0722 * lumPart(x[2]);
    var l2 = 0.2126 * lumPart(y[0]) + 0.7152 * lumPart(y[1]) + 0.0722 * lumPart(y[2]);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  function updateContrast(panel, vars) {
    var checks = [["Page", "--text", "--bg"], ["Surface", "--text", "--surface"], ["Card", "--text", "--card-bg"], ["Muted", "--muted", "--surface"], ["Button", "--button-text", "--button-bg"]];
    var box = panel.querySelector("#theme-contrast");
    var warn = panel.querySelector("#theme-warning");
    var failed = [];
    var unknown = [];
    box.innerHTML = checks.map(function (c) {
      var ratio = contrast(vars[c[1]], vars[c[2]]);
      var isUnknown = ratio === null;
      var pass = !isUnknown && ratio >= 4.5;
      if (isUnknown) unknown.push(c[0]);
      else if (!pass) failed.push(c[0]);
      return '<span class="theme-contrast-chip ' + (isUnknown ? "unknown" : (pass ? "pass" : "fail")) + '">' + esc(c[0]) + ': ' + (isUnknown ? "n/a" : ratio.toFixed(1) + ":1") + "</span>";
    }).join("");
    warn.hidden = failed.length === 0 && unknown.length === 0;
    warn.textContent = failed.length || unknown.length
      ? "Contrast warning: "
        + (failed.length ? "improve " + failed.join(", ") + " for readable UI" : "")
        + (failed.length && unknown.length ? "; " : "")
        + (unknown.length ? "unable to verify " + unknown.join(", ") + " due to unsupported color format" : "")
        + "."
      : "";
  }

  function subset(vars) { return ["--bg", "--bg-top", "--surface", "--card-bg", "--text", "--muted", "--accent", "--accent-2"].map(function (k) { return k + ":" + vars[k]; }).join("|"); }
  function updatePresets(panel, vars) {
    var now = subset(vars);
    panel.querySelectorAll(".theme-preset-btn").forEach(function (btn) {
      btn.setAttribute("aria-pressed", subset(PRESETS[Number(btn.dataset.preset)].vars) === now ? "true" : "false");
    });
  }

  function sanitise(obj) {
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) throw new Error("Theme file must be a JSON object.");
    var out = {};
    var invalidColorPickerKeys = [];
    Object.keys(DEFAULTS).forEach(function (key) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) return;
      var value = String(obj[key]).trim();
      var rangeField = RANGE_FIELDS.find(function (f) { return f.key === key; });
      if (key === "--font-family") {
        if (FONT_OPTIONS.some(function (o) { return o[1] === value; })) out[key] = value;
      } else if (rangeField) {
        var n = parseFloat(value);
        if (!Number.isNaN(n) && n >= rangeField.min && n <= rangeField.max) out[key] = n + rangeField.suffix;
      } else if (COLOR_PICKER_KEYS[key]) {
        var normalized = hex(value);
        if (normalized) out[key] = normalized;
        else invalidColorPickerKeys.push(key);
      } else if (/^(#[0-9a-fA-F]{3,8}|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(\s*,\s*[\d.]+)?\s*\))$/.test(value)) {
        out[key] = value;
      }
    });
    if (invalidColorPickerKeys.length) throw new Error("These colors must use #RRGGBB or #RGB: " + invalidColorPickerKeys.join(", "));
    if (!Object.keys(out).length) throw new Error("No recognised theme properties found.");
    return complete(out);
  }

  function exportTheme(vars) {
    var blob = new Blob([JSON.stringify(complete(vars), null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "mmir-theme.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function swatch(p) {
    return '<span class="theme-swatch" aria-hidden="true"><i style="background:' + attr(p.vars["--bg"]) + '"></i><i style="background:' + attr(p.vars["--surface"]) + '"></i><i style="background:' + attr(p.vars["--accent"]) + '"></i></span>';
  }

  function buildPanel() {
    var panel = document.createElement("div");
    panel.id = "theme-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Website customization panel");
    panel.hidden = true;

    var presetHtml = PRESETS.map(function (p, i) { return '<button type="button" class="theme-preset-btn" data-preset="' + i + '" aria-pressed="false" title="' + attr(p.description) + '">' + swatch(p) + '<span>' + esc(p.name) + "</span></button>"; }).join("");
    var colorHtml = COLOR_GROUPS.map(function (g) {
      return '<fieldset class="theme-group"><legend>' + esc(g.title) + '</legend><div class="theme-controls">' + g.fields.map(function (f) {
        return '<label class="theme-control theme-inline-control"><span>' + esc(f.label) + '</span><input type="color" data-var="' + attr(f.key) + '" value="' + attr(hex(DEFAULTS[f.key]) || "#000000") + '" /></label>';
      }).join("") + "</div></fieldset>";
    }).join("");
    var fontHtml = '<fieldset class="theme-group"><legend>Typography</legend><div class="theme-controls"><label class="theme-control"><span>Font family</span><select data-var="--font-family">' + FONT_OPTIONS.map(function (o) { return '<option value="' + attr(o[1]) + '">' + esc(o[0]) + '</option>'; }).join("") + "</select></label>" + RANGE_FIELDS.slice(0, 2).map(rangeControl).join("") + "</div></fieldset>";
    var layoutHtml = '<fieldset class="theme-group"><legend>Layout and widgets</legend><div class="theme-controls">' + RANGE_FIELDS.slice(2).map(rangeControl).join("") + "</div></fieldset>";

    panel.innerHTML = '<div class="theme-panel-header"><span>🎨 Website customizer</span><button type="button" id="theme-panel-close" aria-label="Close website customizer">✕</button></div>' +
      '<div class="theme-panel-body"><p class="theme-panel-hint">Choose a safe preset or adjust the design tokens below. Everything is saved in your browser automatically.</p>' +
      '<fieldset class="theme-group"><legend>Standard presets</legend><div class="theme-presets">' + presetHtml + '</div></fieldset>' + colorHtml + fontHtml + layoutHtml +
      '<fieldset class="theme-group"><legend>Readability check</legend><div id="theme-contrast" class="theme-contrast-grid" aria-live="polite"></div><p id="theme-warning" class="theme-warning" hidden></p></fieldset>' +
      '<div class="theme-panel-actions"><button type="button" id="theme-reset">Reset</button><button type="button" id="theme-export">Export</button><label class="theme-import-label">Import <input type="file" id="theme-import" accept=".json,application/json" /></label></div><p id="theme-error" class="theme-error" aria-live="polite" hidden></p></div>';
    return panel;
  }

  function rangeControl(f) {
    var id = "theme-value-" + f.key.replace(/[^a-z0-9]+/gi, "-");
    return '<label class="theme-control"><span>' + esc(f.label) + '</span><div class="theme-inline-control"><input type="range" data-var="' + attr(f.key) + '" data-suffix="' + attr(f.suffix) + '" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '" value="' + attr(number(DEFAULTS[f.key])) + '" aria-describedby="' + attr(id) + '" /><span class="theme-value" id="' + attr(id) + '">' + esc(DEFAULTS[f.key]) + '</span></div></label>';
  }

  function esc(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;"); }
  function attr(value) { return esc(value).replace(/`/g, "&#96;"); }

  function error(panel, msg) {
    var el = panel.querySelector("#theme-error");
    el.textContent = msg;
    el.hidden = false;
    setTimeout(function () { el.hidden = true; }, 5000);
  }

  function wire(panel) {
    panel.querySelectorAll("[data-var]").forEach(function (input) {
      input.addEventListener("input", function () {
        if (input.type === "range") updateRange(input);
        var vars = current(panel);
        apply(vars);
        save(vars);
        sync(panel, vars);
      });
    });

    panel.querySelectorAll(".theme-preset-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var vars = PRESETS[Number(btn.dataset.preset)].vars;
        apply(vars); sync(panel, vars); save(vars);
      });
    });

    panel.querySelector("#theme-reset").addEventListener("click", function () { var vars = complete(); apply(vars); sync(panel, vars); save(vars); });
    panel.querySelector("#theme-export").addEventListener("click", function () { exportTheme(current(panel)); });
    panel.querySelector("#theme-import").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      file.text().then(function (text) {
        try {
          var vars = sanitise(JSON.parse(text));
          apply(vars); sync(panel, vars); save(vars);
        } catch (err) {
          error(panel, "Import failed: " + err.message);
        }
      }).catch(function () { error(panel, "Import failed: could not read the file."); });
      e.target.value = "";
    });
  }

  function init() {
    var toggle = document.createElement("button");
    toggle.id = "theme-toggle";
    toggle.type = "button";
    toggle.setAttribute("aria-label", "Open website customizer");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("title", "Customize website");
    toggle.textContent = "🎨";
    document.body.appendChild(toggle);

    var panel = buildPanel();
    document.body.appendChild(panel);
    var initial = load();
    apply(initial); sync(panel, initial); wire(panel);

    toggle.addEventListener("click", function () {
      var open = !panel.hidden;
      panel.hidden = open;
      toggle.setAttribute("aria-expanded", String(!open));
      if (!open) (panel.querySelector("button, input, select") || toggle).focus();
    });
    panel.querySelector("#theme-panel-close").addEventListener("click", function () { panel.hidden = true; toggle.setAttribute("aria-expanded", "false"); toggle.focus(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !panel.hidden) { panel.hidden = true; toggle.setAttribute("aria-expanded", "false"); toggle.focus(); } });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
