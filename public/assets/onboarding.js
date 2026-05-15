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
    title: "SaaS Fabric Admin",
    subtitle: "Trygg lokal innholdsredigering før publisering via pull request.",
    steps: [
      { title: "Last inn innhold", text: "Hent content.json, rediger kort og bruk validering før du eksporterer." },
      { title: "Bruk draft/published", text: "Hold uferdige kort som draft. Bare published-kort vises offentlig på hovedsiden." },
      { title: "Ta backup", text: "Admin lagrer nettleserutkast og lar deg opprette restore points før større endringer." },
      { title: "Publiser trygt", text: "Eksporter content.json og publiser via PR. Ikke legg GitHub-tokens eller andre secrets i frontend." }
    ]
  } : {
    title: "SaaS Fabric",
    subtitle: "En statisk app-fabrikk for ideer, mini-apper, templates, roadmap og kommersialisering.",
    steps: [
      { title: "Utforsk appene", text: "Start i App Factory, Projects og Tools for å åpne det som allerede er bygget." },
      { title: "Fang nye ideer", text: "Bruk SaaS Ideas, Templates og Prompt Inbox for å gjøre ideer om til klare PR-oppgaver." },
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

  function build() {
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
