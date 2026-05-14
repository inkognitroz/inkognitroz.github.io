(function () {
  var STORAGE_KEY = "saas-fabric-theme";

  var DEFAULTS = {
    "--bg": "#0a0f1f",
    "--bg-top": "#1f2f66",
    "--panel": "#111935",
    "--panel-soft": "#1a2346",
    "--text": "#edf2ff",
    "--muted": "#b8c1df",
    "--accent": "#6ea8ff",
    "--border": "#24305e",
    "--border-soft": "#2a3768",
    "--header-bg": "rgba(10, 15, 31, 0.9)"
  };

  var PRESETS = [
    {
      name: "Default",
      vars: {
        "--bg": "#0a0f1f",
        "--bg-top": "#1f2f66",
        "--panel": "#111935",
        "--panel-soft": "#1a2346",
        "--text": "#edf2ff",
        "--muted": "#b8c1df",
        "--accent": "#6ea8ff",
        "--border": "#24305e",
        "--border-soft": "#2a3768",
        "--header-bg": "rgba(10, 15, 31, 0.9)"
      }
    },
    {
      name: "Deep Night",
      vars: {
        "--bg": "#000000",
        "--bg-top": "#0d0d1a",
        "--panel": "#0d0d0d",
        "--panel-soft": "#1a1a1a",
        "--text": "#f0f0f0",
        "--muted": "#888888",
        "--accent": "#7c9eff",
        "--border": "#2a2a2a",
        "--border-soft": "#333333",
        "--header-bg": "rgba(0, 0, 0, 0.95)"
      }
    },
    {
      name: "Ocean",
      vars: {
        "--bg": "#051e3e",
        "--bg-top": "#083060",
        "--panel": "#072a52",
        "--panel-soft": "#0d3666",
        "--text": "#e0f4ff",
        "--muted": "#80b8d4",
        "--accent": "#00d4ff",
        "--border": "#1a4a70",
        "--border-soft": "#205580",
        "--header-bg": "rgba(5, 20, 50, 0.9)"
      }
    },
    {
      name: "Forest",
      vars: {
        "--bg": "#0a1a0a",
        "--bg-top": "#0f2a10",
        "--panel": "#0f2410",
        "--panel-soft": "#1a3620",
        "--text": "#e0ffe0",
        "--muted": "#80b090",
        "--accent": "#4caf50",
        "--border": "#1e4020",
        "--border-soft": "#254d28",
        "--header-bg": "rgba(10, 26, 10, 0.9)"
      }
    },
    {
      name: "Sunset",
      vars: {
        "--bg": "#1a0a05",
        "--bg-top": "#2a1208",
        "--panel": "#2a1208",
        "--panel-soft": "#3a1e0f",
        "--text": "#fff0e0",
        "--muted": "#c4906a",
        "--accent": "#ff8c42",
        "--border": "#4a2010",
        "--border-soft": "#5a2a18",
        "--header-bg": "rgba(20, 8, 4, 0.9)"
      }
    },
    {
      name: "Light",
      vars: {
        "--bg": "#f4f7ff",
        "--bg-top": "#c8d8ff",
        "--panel": "#ffffff",
        "--panel-soft": "#eef1f9",
        "--text": "#1a1e2e",
        "--muted": "#505878",
        "--accent": "#2b5fd9",
        "--border": "#c0c8e0",
        "--border-soft": "#d0d8f0",
        "--header-bg": "rgba(244, 247, 255, 0.92)"
      }
    }
  ];

  /* Colour pickers shown in the panel (subset of DEFAULTS for a clean UI) */
  var COLOR_FIELDS = [
    { key: "--bg", label: "Background" },
    { key: "--panel", label: "Panel" },
    { key: "--panel-soft", label: "Card" },
    { key: "--text", label: "Text" },
    { key: "--muted", label: "Muted Text" },
    { key: "--accent", label: "Accent" }
  ];

  /* ── Helpers ── */

  function applyTheme(vars) {
    var root = document.documentElement;
    Object.keys(vars).forEach(function (key) {
      root.style.setProperty(key, vars[key]);
    });
  }

  function saveTheme(vars) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vars));
    } catch (_) {}
  }

  function loadSavedTheme() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  }

  function getCurrentVars(panel) {
    var vars = Object.assign({}, DEFAULTS);
    panel.querySelectorAll("[data-var]").forEach(function (input) {
      vars[input.dataset.var] = input.value;
    });
    return vars;
  }

  function syncPickers(panel, vars) {
    panel.querySelectorAll("[data-var]").forEach(function (input) {
      var v = vars[input.dataset.var];
      if (v) {
        /* <input type="color"> requires a valid #rrggbb hex string */
        input.value = normaliseHex(v) || input.value;
      }
    });
  }

  /* Ensure the value is a 6-digit hex colour (#rrggbb). Returns "" on failure. */
  function normaliseHex(value) {
    var str = String(value || "").trim();
    if (/^#[0-9a-fA-F]{6}$/.test(str)) return str;
    /* Expand shorthand #rgb → #rrggbb */
    var m = str.match(/^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/);
    if (m) return "#" + m[1] + m[1] + m[2] + m[2] + m[3] + m[3];
    return "";
  }

  /* Validate and sanitise an imported theme object.
   * Only recognises keys present in DEFAULTS and only accepts values that look
   * like CSS colour literals (#hex or rgb/rgba) to prevent property injection. */
  function sanitiseThemeImport(obj) {
    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
      throw new Error("Theme file must be a JSON object.");
    }
    var validKeys = Object.keys(DEFAULTS);
    /* Matches #rgb, #rrggbb, #rrggbbaa and rgb()/rgba() colour literals */
    var colourPattern = /^(#[0-9a-fA-F]{3,8}|rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(\s*,\s*[\d.]+)?\s*\))$/;
    var result = {};
    validKeys.forEach(function (key) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        var value = String(obj[key]).trim();
        if (colourPattern.test(value)) {
          result[key] = value;
        }
      }
    });
    if (Object.keys(result).length === 0) {
      throw new Error("No recognised theme properties found in the file.");
    }
    return result;
  }

  function exportTheme(vars) {
    var json = JSON.stringify(vars, null, 2);
    var blob = new Blob([json], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "theme.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ── Build panel DOM ── */

  function buildPanel() {
    var panel = document.createElement("div");
    panel.id = "theme-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Theme customisation panel");
    panel.hidden = true;

    var presetsHtml = PRESETS.map(function (p, i) {
      return '<button class="theme-preset-btn" data-preset="' + i + '">' + escapeHtml(p.name) + "</button>";
    }).join("");

    var colorsHtml = COLOR_FIELDS.map(function (field) {
      return (
        '<label class="theme-color-row">' +
        "<span>" + escapeHtml(field.label) + "</span>" +
        '<input type="color" data-var="' + escapeHtml(field.key) + '" value="' + escapeHtml(DEFAULTS[field.key]) + '" />' +
        "</label>"
      );
    }).join("");

    panel.innerHTML =
      '<div class="theme-panel-header">' +
      "<span>🎨 Customise Theme</span>" +
      '<button id="theme-panel-close" aria-label="Close theme panel">✕</button>' +
      "</div>" +
      '<div class="theme-panel-body">' +
      '<p class="theme-panel-hint">Pick a preset or adjust colours below. Changes are saved automatically.</p>' +
      '<div class="theme-presets">' + presetsHtml + "</div>" +
      '<div class="theme-colors">' + colorsHtml + "</div>" +
      '<div class="theme-panel-actions">' +
      '<button id="theme-reset">Reset</button>' +
      '<button id="theme-export">Export</button>' +
      '<label class="theme-import-label">Import <input type="file" id="theme-import" accept=".json" /></label>' +
      "</div>" +
      '<p id="theme-error" class="theme-error" aria-live="polite" hidden></p>' +
      "</div>";

    return panel;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ── Initialise ── */

  function showError(panel, msg) {
    var el = panel.querySelector("#theme-error");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    setTimeout(function () { el.hidden = true; }, 5000);
  }

  function init() {
    /* Floating toggle button */
    var toggleBtn = document.createElement("button");
    toggleBtn.id = "theme-toggle";
    toggleBtn.setAttribute("aria-label", "Open theme customisation");
    toggleBtn.setAttribute("aria-expanded", "false");
    toggleBtn.setAttribute("title", "Customise theme");
    toggleBtn.textContent = "🎨";
    document.body.appendChild(toggleBtn);

    /* Panel */
    var panel = buildPanel();
    document.body.appendChild(panel);

    /* Apply saved or default theme */
    var saved = loadSavedTheme();
    var initialVars = saved || Object.assign({}, DEFAULTS);
    applyTheme(initialVars);
    syncPickers(panel, initialVars);

    /* Toggle open/close */
    toggleBtn.addEventListener("click", function () {
      var isOpen = !panel.hidden;
      panel.hidden = isOpen;
      toggleBtn.setAttribute("aria-expanded", String(!isOpen));
    });

    /* Close button */
    panel.querySelector("#theme-panel-close").addEventListener("click", function () {
      panel.hidden = true;
      toggleBtn.setAttribute("aria-expanded", "false");
    });

    /* Close on Escape key */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !panel.hidden) {
        panel.hidden = true;
        toggleBtn.setAttribute("aria-expanded", "false");
        toggleBtn.focus();
      }
    });

    /* Colour picker inputs */
    panel.querySelectorAll("[data-var]").forEach(function (input) {
      input.addEventListener("input", function () {
        var vars = getCurrentVars(panel);
        applyTheme(vars);
        saveTheme(vars);
      });
    });

    /* Preset buttons */
    panel.querySelectorAll(".theme-preset-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var preset = PRESETS[Number(btn.dataset.preset)];
        if (!preset) return;
        applyTheme(preset.vars);
        syncPickers(panel, preset.vars);
        saveTheme(preset.vars);
      });
    });

    /* Reset to defaults */
    panel.querySelector("#theme-reset").addEventListener("click", function () {
      applyTheme(DEFAULTS);
      syncPickers(panel, DEFAULTS);
      saveTheme(DEFAULTS);
    });

    /* Export theme as JSON */
    panel.querySelector("#theme-export").addEventListener("click", function () {
      exportTheme(getCurrentVars(panel));
    });

    /* Import theme from JSON file */
    panel.querySelector("#theme-import").addEventListener("change", function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      file.text().then(function (text) {
        var parsed;
        try {
          parsed = JSON.parse(text);
        } catch (_) {
          showError(panel, "Import failed: invalid JSON format.");
          return;
        }
        var vars;
        try {
          vars = sanitiseThemeImport(parsed);
        } catch (err) {
          showError(panel, "Import failed: " + err.message);
          return;
        }
        applyTheme(vars);
        syncPickers(panel, vars);
        saveTheme(vars);
      }).catch(function () {
        showError(panel, "Import failed: could not read the file.");
      });
      /* Reset input so the same file can be re-imported */
      e.target.value = "";
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
