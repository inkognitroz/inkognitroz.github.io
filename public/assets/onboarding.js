(function () {
  const STORAGE_KEY = "saas-fabric-onboarding-dismissed";
  const AUTO_OPEN_KEY = "saas-fabric-onboarding-auto-opened";

  const path = window.location.pathname;
  const isAdmin = document.body.dataset.page === "admin";
  const isFootball = path.includes("/apps/football-evolution-matrix/");

  const copy = isFootball ? {
    title: "Football Evolution Matrix",
    subtitle: "Kom raskt i gang med redigerbar fotballanalyse, lokal lagring og trygg eksport.",
    steps: [
      { title: "Velg datasett", text: "Start med standardinnholdet eller bruk en av malene for spillerutvikling, kampanalyse, scouting eller historisk sammenligning." },
      { title: "Rediger tabellene", text: "Klikk direkte i cellene, legg til rader/kolonner og fyll ut metadata slik at analysen får tydelig kontekst." },
      { title: "Lagre og sikre data", text: "Bruk lokal lagring mens du jobber, og eksporter JSON eller pakke når du trenger backup eller deling." },
      { title: "Tilpass design", text: "Åpne palett-knappen for å bytte tema, kontrast, typografi og layout uten å endre kode." }
    ]
  } : isAdmin ? {
    title: "Mimir Admin",
    subtitle: "Trygg lokal innholdsredigering før publisering via pull request.",
    steps: [
      { title: "Last inn innhold", text: "Hent content.json, rediger kort og bruk validering før du eksporterer." },
      { title: "Bruk draft/published", text: "Hold uferdige kort som draft. Bare published-kort vises offentlig på hovedsiden." },
      { title: "Ta backup", text: "Admin lagrer nettleserutkast og lar deg opprette restore points før større endringer." },
      { title: "Publiser trygt", text: "Eksporter content.json og publiser via PR. Ikke legg GitHub-tokens eller andre secrets i frontend." }
    ]
  } : {
    title: "Mimir Internal Tools",
    subtitle: "Mimir er en statisk plattform for chat, interne verktøy, roadmap og app-utvikling.",
    steps: [
      { title: "Utforsk appene", text: "Start i App Factory, Projects og Tools for å åpne det som allerede er bygget." },
      { title: "Fang nye ideer", text: "Bruk Ideas Backlog, Templates og Prompt Inbox for å gjøre ideer om til klare PR-oppgaver." },
      { title: "Tilpass utseendet", text: "Bruk palett-widgeten for standardtemaer, farger, typografi, spacing og import/eksport av theme." },
      { title: "Publiser stegvis", text: "Hold v1 statisk og trygg. Bruk Admin og GitHub PR-er før Supabase, betaling og ekte backend legges til." }
    ]
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function injectStyles() {
    if (document.getElementById("onboarding-styles")) return;
    const style = document.createElement("style");
    style.id = "onboarding-styles";
    style.textContent = `
      #onboarding-toggle {
        position: fixed;
        right: max(1.5rem, env(safe-area-inset-right));
        bottom: calc(5.1rem + env(safe-area-inset-bottom));
        width: 2.55rem;
        height: 2.55rem;
        border-radius: 999px;
        z-index: 101;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 850;
        font-size: 1rem;
        background: var(--surface-elevated);
        color: var(--accent);
        border: 1px solid var(--border-soft);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
      }
      #onboarding-toggle:hover,
      #onboarding-toggle:focus-visible {
        border-color: var(--accent);
        background: var(--button-hover-bg);
      }
      .onboarding-panel {
        position: fixed;
        right: max(1.5rem, env(safe-area-inset-right));
        bottom: calc(8.35rem + env(safe-area-inset-bottom));
        width: min(440px, calc(100vw - 2rem));
        max-height: min(76vh, 720px);
        overflow: auto;
        z-index: 101;
        background: var(--surface);
        color: var(--text);
        border: 1px solid var(--border);
        border-radius: var(--card-radius);
        box-shadow: 0 24px 72px rgba(0, 0, 0, 0.55);
        padding: 1rem;
      }
      .onboarding-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: .8rem;
        border-bottom: 1px solid var(--border-soft);
        padding-bottom: .75rem;
        margin-bottom: .75rem;
      }
      .onboarding-header h2 {
        margin: 0;
        font-size: calc(1.35rem * var(--heading-scale));
      }
      .onboarding-kicker {
        margin: 0 0 .25rem;
        color: var(--accent);
        font-size: .72rem;
        letter-spacing: .1em;
        text-transform: uppercase;
        font-weight: 800;
      }
      #onboarding-close {
        width: 2rem;
        height: 2rem;
        padding: 0;
        border-radius: 999px;
        flex: 0 0 auto;
      }
      .onboarding-subtitle {
        color: var(--muted);
        margin: 0 0 .9rem;
      }
      .onboarding-steps {
        display: grid;
        gap: .75rem;
        list-style: none;
        margin: 0;
        padding: 0;
      }
      .onboarding-steps li {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: .75rem;
        align-items: flex-start;
        padding: .75rem;
        border: 1px solid var(--border-soft);
        border-radius: calc(var(--card-radius) - 4px);
        background: color-mix(in srgb, var(--surface-elevated) 72%, transparent);
      }
      .onboarding-step-number {
        width: 1.7rem;
        height: 1.7rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: color-mix(in srgb, var(--accent) 18%, transparent);
        border: 1px solid color-mix(in srgb, var(--accent) 45%, var(--border));
        color: var(--accent);
        font-size: .78rem;
        font-weight: 850;
      }
      .onboarding-steps h3 {
        margin: 0 0 .2rem;
        font-size: 1rem;
      }
      .onboarding-steps p {
        color: var(--muted);
        margin: 0;
        font-size: .9rem;
      }
      .onboarding-actions {
        display: flex;
        flex-wrap: wrap;
        gap: .55rem;
        margin-top: 1rem;
      }
      .onboarding-actions .btn { border: 1px solid var(--border-soft); }
      @media (max-width: 560px) {
        #onboarding-toggle {
          right: max(1rem, env(safe-area-inset-right));
          bottom: calc(4.7rem + env(safe-area-inset-bottom));
        }
        .onboarding-panel {
          inset: auto .65rem calc(7.75rem + env(safe-area-inset-bottom)) .65rem;
          width: auto;
          max-height: min(74vh, 640px);
        }
      }
    `;
    document.head.appendChild(style);
  }

  function build() {
    injectStyles();

    const trigger = document.createElement("button");
    trigger.id = "onboarding-toggle";
    trigger.type = "button";
    trigger.textContent = "?";
    trigger.setAttribute("aria-label", "Open guided onboarding");
    trigger.setAttribute("aria-expanded", "false");

    const panel = document.createElement("section");
    panel.id = "onboarding-panel";
    panel.className = "onboarding-panel";
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "false");
    panel.setAttribute("aria-labelledby", "onboarding-title");

    panel.innerHTML = `
      <div class="onboarding-header">
        <div>
          <p class="onboarding-kicker">Guided start</p>
          <h2 id="onboarding-title">${escapeHtml(copy.title)}</h2>
        </div>
        <button type="button" id="onboarding-close" aria-label="Close onboarding">✕</button>
      </div>
      <p class="onboarding-subtitle">${escapeHtml(copy.subtitle)}</p>
      <ol class="onboarding-steps">
        ${copy.steps.map((step, index) => `
          <li>
            <span class="onboarding-step-number">${index + 1}</span>
            <div>
              <h3>${escapeHtml(step.title)}</h3>
              <p>${escapeHtml(step.text)}</p>
            </div>
          </li>
        `).join("")}
      </ol>
      <div class="onboarding-actions">
        <button type="button" id="onboarding-dismiss" class="btn btn-primary">Got it</button>
        <button type="button" id="onboarding-later" class="btn btn-secondary">Close for now</button>
      </div>
    `;

    document.body.append(trigger, panel);

    function open() {
      panel.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      panel.querySelector("#onboarding-close").focus();
    }

    function close() {
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
    }

    function dismiss() {
      try { localStorage.setItem(STORAGE_KEY, "true"); } catch (_) {}
      close();
    }

    trigger.addEventListener("click", open);
    panel.querySelector("#onboarding-close").addEventListener("click", close);
    panel.querySelector("#onboarding-later").addEventListener("click", close);
    panel.querySelector("#onboarding-dismiss").addEventListener("click", dismiss);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) close();
    });

    try {
      const dismissed = localStorage.getItem(STORAGE_KEY) === "true";
      const autoOpened = localStorage.getItem(AUTO_OPEN_KEY) === "true";
      if (!dismissed && !autoOpened) {
        localStorage.setItem(AUTO_OPEN_KEY, "true");
        window.setTimeout(open, 700);
      }
    } catch (_) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
