(function () {
  const STORAGE_KEY = "football-evolution-matrix-v2";
  const LEGACY_STORAGE_KEY = "football-evolution-matrix-v1";
  // Migration strategy: v2 first loads v2 payload; if missing, it reads v1 data and normalizes into v2 shape.
  // Legacy v1 localStorage key is kept to avoid destructive cleanup in shared browsers.

  const sectionOrder = [
    { key: "oversikt", label: "Oversikt" },
    { key: "perioder", label: "Perioder" },
    { key: "datadefinisjoner", label: "Datadefinisjoner" },
    { key: "matrise", label: "Matrise" },
    { key: "langdata", label: "Langdata" },
    { key: "kilder", label: "Kilder" }
  ];

  const defaultMetadata = {
    title: "Football Evolution Matrix",
    owner: "",
    version: "v2.0",
    updatedAt: "",
    notes: ""
  };

  const defaultSections = {
    oversikt: {
      columns: ["Felt", "Verdi", "Kommentar"],
      rows: [
        ["Formål", "Sammenligne historisk fotballutvikling", "Brukes for analyse og diskusjon"],
        ["Dekning", "Fysikk, teknikk, defensivt, taktikk, mentalitet, data/teknologi", "Utvid ved behov"],
        ["Skala", "1-10 (normalisert)", "Kombiner med datakode per periode"],
        ["Datakoder", "DATA, EST, UKJ, N/A, PROG", "Se Datadefinisjoner"]
      ]
    },
    perioder: {
      columns: ["Periode", "Beskrivelse", "Primær datastatus"],
      rows: [
        ["1900–1950", "Tidlig strukturert fotball", "UKJ/EST"],
        ["1950–1980", "Mer organisert trening", "EST/DATA"],
        ["1980–2000", "Profesjonalisering", "DATA"],
        ["2000–2010", "Analyse og video blir standard", "DATA"],
        ["2011–2015", "GPS og belastningsstyring", "DATA"],
        ["2016–2020", "Datadrevet prestasjonsmodell", "DATA"],
        ["2021–2025", "Integrert performance stack", "DATA"],
        ["2030 prognose", "Prediktiv og AI-støttet utvikling", "PROG"]
      ]
    },
    datadefinisjoner: {
      columns: ["Kode", "Betydning", "Bruk"],
      rows: [
        ["DATA", "dokumentert data", "Verifiserte kilder"],
        ["EST", "estimat", "Historiske anslag"],
        ["UKJ", "ukjent", "Manglende datagrunnlag"],
        ["N/A", "ikke relevant", "Ikke anvendelig for indikator"],
        ["PROG", "prognose", "Fremtidige scenarier"],
        ["A", "høy", "Kildesikkerhet"],
        ["B", "god", "Kildesikkerhet"],
        ["C", "moderat", "Kildesikkerhet"],
        ["D", "lav/historisk", "Kildesikkerhet"],
        ["P", "prognose", "Kildesikkerhet"],
      ]
    },
    matrise: {
      columns: [
        "Kategori",
        "Indikator",
        "Kort definisjon",
        "Enhet",
        "Normalisering",
        "1900–1950",
        "1950–1980",
        "1980–2000",
        "2000–2010",
        "2011–2015",
        "2016–2020",
        "2021–2025",
        "2030 prognose",
        "Kildesikkerhet",
        "Kommentar"
      ],
      rows: [
        ["Fysikk", "Topphastighet", "Maks sprintfart", "km/t", "1-10", "4 EST", "5 EST", "6 DATA", "7 DATA", "8 DATA", "8 DATA", "9 DATA", "9 PROG", "B", "Økt spesialisering"],
        ["Fysikk", "Sprintaksjoner", "Antall sprint per kamp", "antall", "1-10", "3 EST", "4 EST", "5 DATA", "6 DATA", "7 DATA", "8 DATA", "8 DATA", "9 PROG", "B", "Høyere intensitet"],
        ["Fysikk", "Høyintensitetsdistanse", "Distanse i høy fart", "meter", "1-10", "2 UKJ", "3 EST", "5 DATA", "6 DATA", "7 DATA", "8 DATA", "8 DATA", "9 PROG", "C", "Målemetoder utviklet"],
        ["Fysikk", "Akselerasjon/nedbremsing", "Eksplosive retningsendringer", "score", "1-10", "2 UKJ", "3 EST", "5 DATA", "6 DATA", "7 DATA", "8 DATA", "8 DATA", "9 PROG", "C", "Mer relevant i moderne press"],
        ["Fysikk", "Agilitet", "Evne til raske retningsskift", "score", "1-10", "4 EST", "5 EST", "6 DATA", "7 DATA", "7 DATA", "8 DATA", "8 DATA", "9 PROG", "B", "Bedre individuelle ferdigheter"],
        ["Teknikk", "Skuddhastighet", "Hastighet i avslutning", "km/t", "1-10", "5 EST", "5 EST", "6 DATA", "7 DATA", "7 DATA", "8 DATA", "8 DATA", "9 PROG", "B", "Teknologi forbedrer analyse"],
        ["Teknikk", "Skuddkvalitet", "Kvalitet på avslutninger", "score", "1-10", "4 EST", "5 EST", "6 DATA", "7 DATA", "7 DATA", "8 DATA", "8 DATA", "9 PROG", "B", "Bedre treningsmetoder"],
        ["Teknikk", "Langpasningspresisjon", "Treffsikkerhet lange pasninger", "%", "1-10", "3 EST", "4 EST", "6 DATA", "7 DATA", "7 DATA", "8 DATA", "8 DATA", "9 PROG", "B", "Mer strukturert pasningsspill"],
        ["Teknikk", "Progressive pasninger", "Pasninger som flytter spillet frem", "antall", "1-10", "2 UKJ", "3 UKJ", "5 EST", "6 DATA", "7 DATA", "8 DATA", "8 DATA", "9 PROG", "C", "Datadrevet definisjon"],
        ["Teknikk", "1v1-driblinger", "Vellykkede driblinger", "%", "1-10", "5 EST", "5 EST", "6 DATA", "6 DATA", "7 DATA", "7 DATA", "7 DATA", "8 PROG", "C", "Taktisk rolle varierer"],
        ["Teknikk", "Førstetouch under press", "Ballkontroll med motstand", "score", "1-10", "3 EST", "4 EST", "6 DATA", "7 DATA", "8 DATA", "8 DATA", "8 DATA", "9 PROG", "B", "Høyere tempo krever bedre touch"],
        ["Defensivt", "Dueller vunnet", "Andel vunne dueller", "%", "1-10", "5 EST", "5 EST", "6 DATA", "6 DATA", "7 DATA", "7 DATA", "8 DATA", "8 PROG", "B", "Fysikk og timing"],
        ["Defensivt", "Taklinger", "Vellykkede taklinger", "%", "1-10", "6 EST", "6 EST", "6 DATA", "7 DATA", "7 DATA", "7 DATA", "7 DATA", "8 PROG", "B", "Dommerlinje påvirker"],
        ["Defensivt", "Interceptions", "Avskjæringer", "antall", "1-10", "3 UKJ", "4 EST", "5 DATA", "6 DATA", "7 DATA", "7 DATA", "8 DATA", "8 PROG", "C", "Bedre posisjonsforståelse"],
        ["Taktikk", "Pressintensitet", "Kollektivt pressnivå", "score", "1-10", "2 EST", "3 EST", "5 DATA", "6 DATA", "7 DATA", "8 DATA", "8 DATA", "9 PROG", "B", "Stor utvikling i moderne spill"],
        ["Taktikk", "Posisjonering", "Lagets struktur uten ball", "score", "1-10", "4 EST", "5 EST", "6 DATA", "7 DATA", "8 DATA", "8 DATA", "8 DATA", "9 PROG", "B", "Analytisk coaching"],
        ["Taktikk", "Overgangsspill", "Effektivitet i transitions", "score", "1-10", "3 EST", "4 EST", "5 DATA", "6 DATA", "7 DATA", "8 DATA", "8 DATA", "9 PROG", "B", "Raskere kamptempo"],
        ["Mentalitet", "Beslutningskvalitet", "Valg under tidspress", "score", "1-10", "4 EST", "5 EST", "6 DATA", "7 DATA", "7 DATA", "8 DATA", "8 DATA", "9 PROG", "C", "Bedre spillforståelse"],
        ["Mentalitet", "Konsentrasjon", "Stabilitet gjennom kamp", "score", "1-10", "5 EST", "5 EST", "6 DATA", "7 DATA", "7 DATA", "8 DATA", "8 DATA", "9 PROG", "C", "Mental trening viktigere"],
        ["Mentalitet", "Lederskap", "Påvirkning i lagdynamikk", "score", "1-10", "5 EST", "6 EST", "6 DATA", "7 DATA", "7 DATA", "8 DATA", "8 DATA", "9 PROG", "C", "Mer profesjonelt støtteapparat"],
        ["Data/teknologi", "Datatilgjengelighet", "Tilgang til relevante målinger", "score", "1-10", "1 UKJ", "2 UKJ", "4 EST", "6 DATA", "7 DATA", "8 DATA", "9 DATA", "10 PROG", "A", "Kraftig vekst i datadekning"]
      ]
    },
    langdata: {
      columns: ["Kategori", "Indikator", "Periode", "Verdi", "Datakode", "Kommentar"],
      rows: [
        ["Fysikk", "Topphastighet", "2016–2020", "8", "DATA", "Normalisert verdi"],
        ["Teknikk", "Langpasningspresisjon", "2000–2010", "7", "DATA", "Estimert fra kampdata"],
        ["Taktikk", "Pressintensitet", "2021–2025", "8", "DATA", "Basert på moderne pressystemer"],
        ["Data/teknologi", "Datatilgjengelighet", "2030 prognose", "10", "PROG", "Forventet videre utvikling"]
      ]
    },
    kilder: {
      columns: ["Kilde", "Type", "Periode", "Kildesikkerhet", "Notat"],
      rows: [
        ["FIFA Technical Reports", "Rapport", "1980–2025", "A", "Offisiell dokumentasjon"],
        ["UEFA Benchmarking", "Rapport", "2000–2025", "A", "Europeisk toppfotball"],
        ["Historiske kampanalyser", "Sekundærkilde", "1900–1980", "D", "Mindre fullstendig datagrunnlag"],
        ["Egne prognoser", "Prognose", "2030 prognose", "P", "Scenario for planlegging"]
      ]
    }
  };

  const templatePresets = {
    "player-development": {
      metadata: {
        title: "Spillerutvikling Matrix",
        owner: "Akademi",
        version: "v2.0"
      },
      oversiktRows: [
        ["Formål", "Følge spillerutvikling per fase", "Brukes i ukentlig oppfølging"],
        ["Dekning", "Teknikk, fysisk profil, taktisk forståelse, mentalitet", "Akademi og A-lag"],
        ["Skala", "1-10 + vurderingstekst", "Kombiner med video"],
        ["Datakoder", "DATA, EST, PROG", "Se Datadefinisjoner"]
      ]
    },
    "match-analysis": {
      metadata: {
        title: "Kampanalyse Matrix",
        owner: "Analyseavdeling",
        version: "v2.0"
      },
      oversiktRows: [
        ["Formål", "Evaluere kampytelse mot plan", "Før/etter kamp"],
        ["Dekning", "Press, struktur, overgangsspill, sjansekvalitet", "Knytter mot video"],
        ["Skala", "1-10 per kampperiode", "Kan sammenlignes over tid"],
        ["Datakoder", "DATA, EST", "Rådata + manuell koding"]
      ]
    },
    scouting: {
      metadata: {
        title: "Scouting Matrix",
        owner: "Rekruttering",
        version: "v2.0"
      },
      oversiktRows: [
        ["Formål", "Sammenligne kandidater med samme rammeverk", "Brukes i shortlisting"],
        ["Dekning", "Rollekrav, potensial, risiko, datastøtte", "Kombiner med live-rapporter"],
        ["Skala", "1-10 + risikokode", "Lik skala på tvers av ligaer"],
        ["Datakoder", "DATA, EST, UKJ, PROG", "Dokumenter kildene"]
      ]
    },
    "historical-comparison": {
      metadata: {
        title: "Historisk Sammenligning Matrix",
        owner: "Historieprosjekt",
        version: "v2.0"
      },
      oversiktRows: [
        ["Formål", "Sammenligne epoker på samme indikatorer", "Gir kontekst i diskusjoner"],
        ["Dekning", "Spillestil, fysikk, teknologi, datakvalitet", "Vis utviklingstrender"],
        ["Skala", "1-10 normalisert", "Behold samme tolkning"],
        ["Datakoder", "DATA, EST, UKJ, N/A, PROG", "Transparens i usikkerhet"]
      ]
    }
  };

  const requiredColumns = sectionOrder.reduce((acc, section) => {
    acc[section.key] = deepClone(defaultSections[section.key].columns);
    return acc;
  }, {});

  const appState = {
    activeSection: "oversikt",
    payload: loadPayload(),
    lastBackup: null
  };

  const tabButtons = document.getElementById("tab-buttons");
  const tableSection = document.getElementById("table-section");
  const statusEl = document.getElementById("status");
  const importFile = document.getElementById("import-file");
  const templateSelect = document.getElementById("template-select");
  const restoreBackupBtn = document.getElementById("restore-backup");

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizePayload(parsed) {
    const metadata = { ...defaultMetadata, ...(parsed.metadata || {}) };
    const sectionsSource = parsed.sections && typeof parsed.sections === "object"
      ? parsed.sections
      : parsed;

    const sections = deepClone(defaultSections);
    for (const { key } of sectionOrder) {
      const section = sectionsSource[key];
      if (section && typeof section === "object" && Array.isArray(section.columns) && Array.isArray(section.rows)) {
        sections[key] = {
          columns: section.columns.map((column) => String(column ?? "")),
          rows: section.rows.map((row) => Array.isArray(row) ? row.map((cell) => String(cell ?? "")) : [])
        };
      }
    }

    return {
      metadata,
      sections
    };
  }

  function loadPayload() {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!saved) {
      return normalizePayload({ metadata: deepClone(defaultMetadata), sections: deepClone(defaultSections) });
    }

    try {
      return normalizePayload(JSON.parse(saved));
    } catch (error) {
      return normalizePayload({ metadata: deepClone(defaultMetadata), sections: deepClone(defaultSections) });
    }
  }

  function getCurrentIsoDate() {
    return new Date().toISOString().slice(0, 10);
  }

  function setStatus(message, tone) {
    statusEl.textContent = message;
    statusEl.className = "status";
    if (tone) {
      statusEl.classList.add(`status--${tone}`);
    }
  }

  function touchUpdatedAt() {
    appState.payload.metadata.updatedAt = getCurrentIsoDate();
    document.getElementById("meta-updated").value = appState.payload.metadata.updatedAt;
  }

  function syncMetadataFromForm(markTouched) {
    appState.payload.metadata.title = document.getElementById("meta-title").value.trim();
    appState.payload.metadata.owner = document.getElementById("meta-owner").value.trim();
    appState.payload.metadata.version = document.getElementById("meta-version").value.trim();
    appState.payload.metadata.notes = document.getElementById("meta-notes").value.trim();
    if (markTouched) {
      touchUpdatedAt();
    }
  }

  function renderMetadata() {
    document.getElementById("meta-title").value = appState.payload.metadata.title || "";
    document.getElementById("meta-owner").value = appState.payload.metadata.owner || "";
    document.getElementById("meta-version").value = appState.payload.metadata.version || "";
    document.getElementById("meta-updated").value = appState.payload.metadata.updatedAt || "";
    document.getElementById("meta-notes").value = appState.payload.metadata.notes || "";
  }

  function saveLocal(message) {
    syncSectionFromTable();
    syncMetadataFromForm(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.payload));
    setStatus(message || "Lokal lagring oppdatert.", "success");
  }

  function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatCsvRow(cells) {
    // RFC 4180: escape embedded quotes by doubling them, then wrap each cell in quotes.
    return cells.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",");
  }

  function toCsv(section) {
    const lines = [section.columns, ...section.rows].map(formatCsvRow);
    return "\uFEFF" + lines.join("\n");
  }

  function toBundleCsv() {
    const lines = [];
    for (const sectionRef of sectionOrder) {
      const section = appState.payload.sections[sectionRef.key];
      lines.push(formatCsvRow([`Seksjon: ${sectionRef.label}`]));
      lines.push(formatCsvRow(section.columns));
      for (const row of section.rows) {
        lines.push(formatCsvRow(row));
      }
      lines.push("");
    }
    return "\uFEFF" + lines.join("\n");
  }

  function toPrintableHtml() {
    const metadata = appState.payload.metadata;
    const sectionsHtml = sectionOrder.map((sectionRef) => {
      const section = appState.payload.sections[sectionRef.key];
      const header = section.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
      const rows = section.rows.map((row) => `<tr>${section.columns.map((_, index) => `<td>${escapeHtml(row[index] || "")}</td>`).join("")}</tr>`).join("");
      return `
        <section>
          <h2>${escapeHtml(sectionRef.label)}</h2>
          <table>
            <thead><tr>${header}</tr></thead>
            <tbody>${rows || `<tr><td colspan="${section.columns.length || 1}">Ingen rader.</td></tr>`}</tbody>
          </table>
        </section>
      `;
    }).join("\n");

    return `<!doctype html>
<html lang="no">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(metadata.title || "Football Evolution Matrix")}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 20px; }
    h1 { margin: 0 0 10px; }
    p { margin: 0 0 6px; }
    section { margin-top: 18px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid #888; text-align: left; padding: 6px; vertical-align: top; }
    thead th { background: #efefef; }
  </style>
</head>
<body>
  <h1>${escapeHtml(metadata.title || "Football Evolution Matrix")}</h1>
  <p><strong>Eier:</strong> ${escapeHtml(metadata.owner || "-")}</p>
  <p><strong>Versjon:</strong> ${escapeHtml(metadata.version || "-")}</p>
  <p><strong>Sist oppdatert:</strong> ${escapeHtml(metadata.updatedAt || "-")}</p>
  <p><strong>Notater:</strong> ${escapeHtml(metadata.notes || "-")}</p>
  ${sectionsHtml}
</body>
</html>`;
  }

  function sanitizeFilename(value) {
    const sanitized = String(value || "football-evolution-matrix")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return sanitized || "football-evolution-matrix";
  }

  function syncSectionFromTable() {
    const table = tableSection.querySelector("table");
    if (!table) return;

    const headers = Array.from(table.querySelectorAll("thead th")).map((cell) => cell.textContent);
    const rows = Array.from(table.querySelectorAll("tbody tr.data-row"))
      .map((row) => Array.from(row.querySelectorAll("td")).map((cell) => cell.textContent));

    appState.payload.sections[appState.activeSection] = { columns: headers, rows };
  }

  function createTemplatePayload(templateKey) {
    const template = templatePresets[templateKey];
    if (!template) return null;
    const payload = normalizePayload({ metadata: deepClone(defaultMetadata), sections: deepClone(defaultSections) });
    payload.metadata = {
      ...payload.metadata,
      ...template.metadata,
      updatedAt: getCurrentIsoDate()
    };
    payload.sections.oversikt.rows = deepClone(template.oversiktRows);
    return payload;
  }

  function stashBackup() {
    appState.lastBackup = deepClone(appState.payload);
    restoreBackupBtn.disabled = false;
  }

  function validateImportedPayload(parsed) {
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Ugyldig filformat.");
    }

    const allowedKeys = new Set(["metadata", "sections", ...sectionOrder.map((section) => section.key)]);
    for (const key of Object.keys(parsed)) {
      if (!allowedKeys.has(key)) {
        throw new Error(`Ukjent toppnivå-felt: ${key}`);
      }
    }

    const source = parsed.sections && typeof parsed.sections === "object" ? parsed.sections : parsed;
    for (const { key, label } of sectionOrder) {
      const section = source[key];
      if (!section || typeof section !== "object" || Array.isArray(section)) {
        throw new Error(`Mangler seksjon: ${label}`);
      }
      if (!Array.isArray(section.columns) || section.columns.length === 0) {
        throw new Error(`Seksjon ${label} må ha kolonner.`);
      }
      if (!Array.isArray(section.rows)) {
        throw new Error(`Seksjon ${label} må ha rader.`);
      }

      const required = requiredColumns[key];
      const missingColumns = required.filter((column) => !section.columns.includes(column));
      if (missingColumns.length > 0) {
        throw new Error(`Seksjon ${label} mangler kolonner: ${missingColumns.join(", ")}`);
      }

      section.rows.forEach((row, index) => {
        if (!Array.isArray(row)) {
          throw new Error(`Seksjon ${label}, rad ${index + 1} er ikke en radliste.`);
        }
        if (row.length !== section.columns.length) {
          throw new Error(`Seksjon ${label}, rad ${index + 1} har ${row.length} felt. Forventet ${section.columns.length}.`);
        }
      });
    }

    return normalizePayload(parsed);
  }

  function renderTabs() {
    tabButtons.innerHTML = sectionOrder.map((section) => (
      `<button type="button" data-tab="${section.key}" class="${section.key === appState.activeSection ? "active" : ""}" role="tab" aria-selected="${section.key === appState.activeSection}">${section.label}</button>`
    )).join("");
  }

  function renderTable() {
    const section = appState.payload.sections[appState.activeSection] || { columns: [], rows: [] };
    const sectionMeta = sectionOrder.find((item) => item.key === appState.activeSection);
    const hasColumns = section.columns.length > 0;

    const headerHtml = section.columns
      .map((column) => `<th contenteditable="true" spellcheck="false">${escapeHtml(column)}</th>`)
      .join("");

    const rowHtml = section.rows
      .map((row) => (
        `<tr class="data-row">${section.columns.map((_, index) => `<td contenteditable="true" spellcheck="false">${escapeHtml(row[index] || "")}</td>`).join("")}</tr>`
      ))
      .join("");

    const emptyState = !hasColumns
      ? `<tr><td colspan="1" class="empty-state">Ingen kolonner ennå. Bruk «Legg til kolonne» for å starte.</td></tr>`
      : !section.rows.length
        ? `<tr><td colspan="${section.columns.length}" class="empty-state">Ingen rader i denne seksjonen ennå. Bruk «Legg til rad».</td></tr>`
        : "";

    tableSection.innerHTML = `
      <h2 class="section-title">${sectionMeta ? sectionMeta.label : "Seksjon"}</h2>
      <p class="section-description">Klikk i cellene for å redigere innholdet direkte. Aktiv seksjon har ${section.columns.length} kolonner og ${section.rows.length} rader.</p>
      <div class="table-wrap">
        <table class="matrix-table">
          <thead><tr>${headerHtml || "<th contenteditable='true' spellcheck='false'>Ny kolonne</th>"}</tr></thead>
          <tbody>${rowHtml || emptyState}</tbody>
        </table>
      </div>
    `;
  }

  function rerenderAll() {
    renderMetadata();
    renderTabs();
    renderTable();
  }

  tabButtons.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-tab]");
    if (!button) return;
    syncSectionFromTable();
    appState.activeSection = button.dataset.tab;
    renderTabs();
    renderTable();
  });

  tableSection.addEventListener("input", () => {
    syncSectionFromTable();
  });

  ["meta-title", "meta-owner", "meta-version", "meta-notes"].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => {
      syncMetadataFromForm(false);
      setStatus("Metadata oppdatert. Husk å lagre lokalt.", "info");
    });
  });

  document.getElementById("save-local").addEventListener("click", () => {
    saveLocal();
  });

  document.getElementById("export-json").addEventListener("click", () => {
    syncSectionFromTable();
    syncMetadataFromForm(true);
    downloadFile(JSON.stringify(appState.payload, null, 2), "football-evolution-matrix.json", "application/json");
    setStatus("JSON eksportert.", "success");
  });

  document.getElementById("import-json").addEventListener("click", () => {
    importFile.click();
  });

  importFile.addEventListener("change", async () => {
    const file = importFile.files && importFile.files[0];
    if (!file) return;

    try {
      syncSectionFromTable();
      const rawText = await file.text();
      const parsed = JSON.parse(rawText);
      const validated = validateImportedPayload(parsed);

      const shouldImport = window.confirm("Import erstatter dagens datasett. Forrige versjon lagres som backup. Vil du fortsette?");
      if (!shouldImport) {
        setStatus("Import avbrutt.", "info");
        return;
      }

      stashBackup();
      appState.payload = validated;
      if (!appState.payload.metadata.updatedAt) {
        touchUpdatedAt();
      }
      rerenderAll();
      saveLocal("JSON importert og lagret lokalt. Du kan gjenopprette forrige datasett.");
    } catch (error) {
      setStatus(`Kunne ikke importere JSON: ${error.message}`, "error");
    } finally {
      importFile.value = "";
    }
  });

  document.getElementById("export-csv").addEventListener("click", () => {
    syncSectionFromTable();
    const section = appState.payload.sections[appState.activeSection];
    if (!section) return;
    const csv = toCsv(section);
    downloadFile(csv, `football-evolution-${appState.activeSection}.csv`, "text/csv;charset=utf-8");
    setStatus("CSV eksportert for aktiv seksjon.", "success");
  });

  document.getElementById("export-bundle").addEventListener("click", () => {
    syncSectionFromTable();
    syncMetadataFromForm(true);
    const fileBase = sanitizeFilename(appState.payload.metadata.title);
    downloadFile(JSON.stringify(appState.payload, null, 2), `${fileBase}.json`, "application/json");
    downloadFile(toBundleCsv(), `${fileBase}-bundle.csv`, "text/csv;charset=utf-8");
    downloadFile(toPrintableHtml(), `${fileBase}-print.html`, "text/html;charset=utf-8");
    setStatus("Eksportpakke klar: JSON, CSV-bundle og utskriftsvennlig HTML.", "success");
  });

  document.getElementById("add-row").addEventListener("click", () => {
    syncSectionFromTable();
    const section = appState.payload.sections[appState.activeSection];
    const row = section.columns.map((_, index) => (index === 0 ? "Ny rad" : ""));
    section.rows.push(row);
    renderTable();
    setStatus("Ny rad lagt til.", "success");
  });

  document.getElementById("add-column").addEventListener("click", () => {
    syncSectionFromTable();
    const section = appState.payload.sections[appState.activeSection];
    section.columns.push("Ny kolonne");
    section.rows = section.rows.map((row) => {
      const nextRow = row.slice();
      nextRow.push("");
      return nextRow;
    });
    renderTable();
    setStatus("Ny kolonne lagt til.", "success");
  });

  document.getElementById("apply-template").addEventListener("click", () => {
    syncSectionFromTable();
    const templateKey = templateSelect.value;
    const templatePayload = createTemplatePayload(templateKey);
    if (!templatePayload) {
      setStatus("Kunne ikke finne valgt mal.", "error");
      return;
    }

    const shouldApply = window.confirm("Valgt mal erstatter dagens datasett. Forrige versjon lagres som backup. Vil du fortsette?");
    if (!shouldApply) {
      setStatus("Malvalg avbrutt.", "info");
      return;
    }

    stashBackup();
    appState.payload = templatePayload;
    appState.activeSection = "oversikt";
    rerenderAll();
    saveLocal("Mal brukt og lagret lokalt. Du kan gjenopprette forrige datasett.");
  });

  document.getElementById("reset-data").addEventListener("click", () => {
    syncSectionFromTable();
    const shouldReset = window.confirm("Nullstill datasettet til standard v2? Dette kan angres med «Gjenopprett backup»-knappen.");
    if (!shouldReset) {
      setStatus("Nullstilling avbrutt.", "info");
      return;
    }

    stashBackup();
    appState.payload = normalizePayload({ metadata: deepClone(defaultMetadata), sections: deepClone(defaultSections) });
    touchUpdatedAt();
    appState.activeSection = "oversikt";
    rerenderAll();
    saveLocal("Datasett nullstilt og lagret lokalt.");
  });

  restoreBackupBtn.addEventListener("click", () => {
    if (!appState.lastBackup) {
      setStatus("Ingen backup tilgjengelig.", "info");
      return;
    }

    appState.payload = deepClone(appState.lastBackup);
    appState.lastBackup = null;
    restoreBackupBtn.disabled = true;
    appState.activeSection = "oversikt";
    rerenderAll();
    saveLocal("Forrige datasett gjenopprettet.");
  });

  document.getElementById("print").addEventListener("click", () => {
    syncSectionFromTable();
    syncMetadataFromForm(false);
    window.print();
  });

  // Ensure both fresh installs and normalized v1 payloads have an initial timestamp.
  if (!appState.payload.metadata.updatedAt) {
    touchUpdatedAt();
  }
  rerenderAll();
})();
