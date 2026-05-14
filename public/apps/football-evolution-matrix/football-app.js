(function () {
  const STORAGE_KEY = "football-evolution-matrix-v1";

  const sectionOrder = [
    { key: "oversikt", label: "Oversikt" },
    { key: "perioder", label: "Perioder" },
    { key: "datadefinisjoner", label: "Datadefinisjoner" },
    { key: "matrise", label: "Matrise" },
    { key: "langdata", label: "Langdata" },
    { key: "kilder", label: "Kilder" }
  ];

  const defaultData = {
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

  const appState = {
    activeSection: "oversikt",
    data: loadData()
  };

  const tabButtons = document.getElementById("tab-buttons");
  const tableSection = document.getElementById("table-section");
  const statusEl = document.getElementById("status");

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return deepClone(defaultData);

    try {
      const parsed = JSON.parse(saved);
      return parsed && typeof parsed === "object" ? parsed : deepClone(defaultData);
    } catch (error) {
      return deepClone(defaultData);
    }
  }

  function setStatus(message) {
    statusEl.textContent = message;
  }

  function saveLocal() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.data));
    setStatus("Lokal lagring oppdatert.");
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

  function toCsv(section) {
    const lines = [section.columns, ...section.rows].map((row) => row.map((cell) => {
      const value = String(cell ?? "").replace(/"/g, '""');
      return `"${value}"`;
    }).join(","));
    return "\uFEFF" + lines.join("\n");
  }

  function syncSectionFromTable() {
    const table = tableSection.querySelector("table");
    if (!table) return;

    const headers = Array.from(table.querySelectorAll("thead th"))
      .map((cell) => cell.textContent);

    const rows = Array.from(table.querySelectorAll("tbody tr"))
      .map((row) => Array.from(row.querySelectorAll("td")).map((cell) => cell.textContent));

    appState.data[appState.activeSection] = { columns: headers, rows };
  }

  function renderTabs() {
    tabButtons.innerHTML = sectionOrder.map((section) => (
      `<button type="button" data-tab="${section.key}" class="${section.key === appState.activeSection ? "active" : ""}" role="tab" aria-selected="${section.key === appState.activeSection}">${section.label}</button>`
    )).join("");
  }

  function renderTable() {
    const section = appState.data[appState.activeSection] || { columns: [], rows: [] };
    const sectionMeta = sectionOrder.find((item) => item.key === appState.activeSection);

    const headerHtml = section.columns
      .map((column) => `<th contenteditable="true" spellcheck="false">${escapeHtml(column)}</th>`)
      .join("");

    const rowHtml = section.rows
      .map((row) => `
        <tr>${section.columns.map((_, index) => `<td contenteditable="true" spellcheck="false">${escapeHtml(row[index] || "")}</td>`).join("")}</tr>
      `)
      .join("");

    tableSection.innerHTML = `
      <h2 class="section-title">${sectionMeta ? sectionMeta.label : "Seksjon"}</h2>
      <p class="section-description">Klikk i cellene for å redigere innholdet direkte.</p>
      <div class="table-wrap">
        <table class="matrix-table">
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowHtml}</tbody>
        </table>
      </div>
    `;
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

  document.getElementById("save-local").addEventListener("click", () => {
    syncSectionFromTable();
    saveLocal();
  });

  document.getElementById("export-json").addEventListener("click", () => {
    syncSectionFromTable();
    downloadFile(JSON.stringify(appState.data, null, 2), "football-evolution-matrix.json", "application/json");
    setStatus("JSON eksportert.");
  });

  const importFile = document.getElementById("import-file");
  document.getElementById("import-json").addEventListener("click", () => {
    importFile.click();
  });

  importFile.addEventListener("change", async () => {
    const file = importFile.files && importFile.files[0];
    if (!file) return;

    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Ugyldig filformat");
      }
      const merged = deepClone(defaultData);
      for (const { key } of sectionOrder) {
        const section = parsed[key];
        if (section && typeof section === "object" &&
            Array.isArray(section.columns) && Array.isArray(section.rows)) {
          merged[key] = section;
        }
      }
      appState.data = merged;
      renderTabs();
      renderTable();
      saveLocal();
      setStatus("JSON importert.");
    } catch (error) {
      setStatus("Kunne ikke importere JSON.");
    } finally {
      importFile.value = "";
    }
  });

  document.getElementById("export-csv").addEventListener("click", () => {
    syncSectionFromTable();
    const section = appState.data[appState.activeSection];
    if (!section) return;
    const csv = toCsv(section);
    downloadFile(csv, `football-evolution-${appState.activeSection}.csv`, "text/csv;charset=utf-8");
    setStatus("CSV eksportert for aktiv seksjon.");
  });

  document.getElementById("add-row").addEventListener("click", () => {
    syncSectionFromTable();
    const section = appState.data[appState.activeSection];
    const row = section.columns.map((_, index) => (index === 0 ? "Ny rad" : ""));
    section.rows.push(row);
    renderTable();
    setStatus("Ny rad lagt til.");
  });

  document.getElementById("add-column").addEventListener("click", () => {
    syncSectionFromTable();
    const section = appState.data[appState.activeSection];
    section.columns.push("Ny kolonne");
    section.rows = section.rows.map((row) => {
      const nextRow = row.slice();
      nextRow.push("");
      return nextRow;
    });
    renderTable();
    setStatus("Ny kolonne lagt til.");
  });

  document.getElementById("print").addEventListener("click", () => {
    syncSectionFromTable();
    window.print();
  });

  renderTabs();
  renderTable();
})();
