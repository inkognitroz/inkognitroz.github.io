(async function () {
  const PAGE = document.body.dataset.page;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function cardTemplate(item) {
    const title = escapeHtml(item.title || "Untitled");
    const description = escapeHtml(item.description || "");
    const link = item.link && item.link !== "#" ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Open →</a>` : "";
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const tagsHtml = tags.length ? `<div class="tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : "";
    const badge = item.badge ? `<span class="card-badge badge-${escapeHtml(item.badge.toLowerCase().replace(/\s+/g, "-"))}">${escapeHtml(item.badge)}</span>` : "";
    return `<article class="card-item"><div class="card-item-header"><h3>${title}</h3>${badge}</div><p>${description}</p>${link}${tagsHtml}</article>`;
  }

  function renderIntoContainer(container, items) {
    if (!container) return;
    if (!Array.isArray(items) || !items.length) {
      container.innerHTML = '<article class="card-item"><p>No items yet.</p></article>';
      return;
    }
    container.innerHTML = items.map(cardTemplate).join("");
  }

  async function loadContent() {
    const response = await fetch("./content.json", { cache: "default" });
    if (!response.ok) {
      throw new Error("Could not load content.json");
    }
    return response.json();
  }

  function renderSite(content, root = document) {
    const sections = content.sections || {};
    const site = content.site || {};

    const titleEl = root.querySelector("#site-title");
    const subtitleEl = root.querySelector("#site-subtitle");
    const heroLabelEl = root.querySelector("#hero-label");
    const heroTitleEl = root.querySelector("#hero-title");
    const heroDescEl = root.querySelector("#hero-description");
    const heroCtas = root.querySelector("#hero-ctas");
    const trustBar = root.querySelector("#trust-bar");
    const footerSubtitle = root.querySelector("#footer-subtitle");

    if (titleEl) titleEl.textContent = site.title || "SaaS Fabric";
    if (subtitleEl) subtitleEl.textContent = site.subtitle || "Build, publish and monetize apps, tools and SaaS products.";
    if (heroLabelEl && site.heroLabel) heroLabelEl.textContent = site.heroLabel;
    if (heroTitleEl) heroTitleEl.innerHTML = site.heroTitle || "Build, Launch &amp; Monetize<br>Your SaaS Products";
    if (heroDescEl) heroDescEl.textContent = site.heroDescription || "";

    if (heroCtas && Array.isArray(site.heroCtas) && site.heroCtas.length) {
      heroCtas.innerHTML = site.heroCtas.map((cta) => {
        const cls = cta.style === "secondary" ? "btn btn-secondary" : "btn btn-primary";
        return `<a href="${escapeHtml(cta.href || "#")}" class="${cls}">${escapeHtml(cta.text || "")}</a>`;
      }).join("");
    }

    if (trustBar && Array.isArray(site.trustBadges) && site.trustBadges.length) {
      trustBar.innerHTML = site.trustBadges.map((badge) =>
        `<span class="trust-badge">${escapeHtml(badge)}</span>`
      ).join("");
    }

    if (footerSubtitle && site.subtitle) footerSubtitle.textContent = site.subtitle;

    root.querySelectorAll("[data-section]").forEach((el) => {
      const sectionKey = el.dataset.section;
      renderIntoContainer(el, sections[sectionKey]);
    });
  }

  function parseEditorJson(editor) {
    return JSON.parse(editor.value);
  }

  function formatJson(editor) {
    const content = parseEditorJson(editor);
    editor.value = JSON.stringify(content, null, 2);
    return content;
  }

  function parseCsv(text) {
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (!lines.length) return [];
    const headers = lines[0].split(",").map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const cols = line.split(",").map((c) => c.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = cols[index] || "";
      });
      if (row.tags) {
        row.tags = row.tags.split("|").map((tag) => tag.trim()).filter(Boolean);
      }
      return row;
    });
  }

  function downloadFile(content, filename) {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (PAGE === "home") {
    try {
      const content = await loadContent();
      renderSite(content);
    } catch (error) {
      const home = document.querySelector("main");
      if (home) {
        home.innerHTML = `<section class="card"><h2>Failed to load content</h2><p>${escapeHtml(error.message)}</p></section>`;
      }
    }
    return;
  }

  if (PAGE !== "admin") {
    return;
  }

  const editor = document.querySelector("#json-editor");
  const loadButton = document.querySelector("#load-content");
  const formatButton = document.querySelector("#format-json");
  const previewButton = document.querySelector("#preview-json");
  const downloadButton = document.querySelector("#download-json");
  const previewRoot = document.querySelector("#admin-preview");
  const sectionSelect = document.querySelector("#section-select");
  const cardSelect = document.querySelector("#card-select");
  const cardTitle = document.querySelector("#card-title");
  const cardLink = document.querySelector("#card-link");
  const cardDescription = document.querySelector("#card-description");
  const cardTags = document.querySelector("#card-tags");
  const newCardButton = document.querySelector("#new-card");
  const saveCardButton = document.querySelector("#save-card");
  const deleteCardButton = document.querySelector("#delete-card");
  const csvInput = document.querySelector("#csv-input");
  const importCsvButton = document.querySelector("#import-csv");
  const xlsxInput = document.querySelector("#xlsx-input");
  const importXlsxButton = document.querySelector("#import-xlsx");

  function getEditorContent() {
    try {
      return parseEditorJson(editor);
    } catch (error) {
      alert("Invalid JSON. Please fix syntax in the editor before continuing.");
      return null;
    }
  }

  function setEditorContent(content) {
    editor.value = JSON.stringify(content, null, 2);
  }

  function getSectionCards(content) {
    if (!content) return [];
    return content.sections?.[sectionSelect.value] || [];
  }

  function refreshCardSelect(content) {
    const cards = getSectionCards(content);
    cardSelect.innerHTML = cards
      .map((card, index) => `<option value="${index}">${escapeHtml(card.title || `Card ${index + 1}`)}</option>`)
      .join("");
    if (!cards.length) {
      cardSelect.innerHTML = '<option value="-1">No cards</option>';
      cardSelect.value = "-1";
      cardTitle.value = "";
      cardDescription.value = "";
      cardLink.value = "";
      cardTags.value = "";
      return;
    }
    cardSelect.value = "0";
    syncCardFields(content);
  }

  function syncCardFields(content) {
    const index = Number(cardSelect.value);
    const cards = getSectionCards(content);
    const card = cards[index];
    if (!card) return;
    cardTitle.value = card.title || "";
    cardDescription.value = card.description || "";
    cardLink.value = card.link || "";
    cardTags.value = Array.isArray(card.tags) ? card.tags.join(", ") : "";
  }

  function saveCurrentCard(content) {
    content.sections = content.sections || {};
    const cards = getSectionCards(content);
    let index = Number(cardSelect.value);
    if (Number.isNaN(index) || index < 0 || index >= cards.length) {
      cards.push({});
      index = cards.length - 1;
      cardSelect.value = String(index);
    }
    cards[index] = {
      title: cardTitle.value.trim(),
      description: cardDescription.value.trim(),
      link: cardLink.value.trim() || "#",
      tags: cardTags.value.split(",").map((tag) => tag.trim()).filter(Boolean)
    };
    content.sections[sectionSelect.value] = cards;
    return content;
  }

  function renderAdminPreview(content) {
    const site = content.site || {};
    const sections = content.sections || {};
    previewRoot.innerHTML = `
      <h3>${escapeHtml(site.title || "Preview")}</h3>
      <p>${escapeHtml(site.promptWorkflow || "")}</p>
      <div class="grid" data-section="${escapeHtml(sectionSelect.value)}"></div>
    `;
    renderIntoContainer(previewRoot.querySelector("[data-section]"), sections[sectionSelect.value]);
  }

  async function loadInitialContent() {
    const content = await loadContent();
    setEditorContent(content);
    refreshCardSelect(content);
    renderAdminPreview(content);
  }

  loadButton.addEventListener("click", async () => {
    await loadInitialContent();
  });

  formatButton.addEventListener("click", () => {
    try {
      formatJson(editor);
    } catch (error) {
      alert("Invalid JSON. Please fix syntax before formatting.");
    }
  });

  previewButton.addEventListener("click", () => {
    const content = getEditorContent();
    if (!content) return;
    renderAdminPreview(content);
  });

  downloadButton.addEventListener("click", () => {
    try {
      const content = formatJson(editor);
      downloadFile(JSON.stringify(content, null, 2), "content.json");
    } catch (error) {
      alert("Invalid JSON. Please fix syntax before export.");
    }
  });

  sectionSelect.addEventListener("change", () => {
    const content = getEditorContent();
    if (!content) return;
    refreshCardSelect(content);
    renderAdminPreview(content);
  });

  cardSelect.addEventListener("change", () => {
    const content = getEditorContent();
    if (!content) return;
    syncCardFields(content);
  });

  newCardButton.addEventListener("click", () => {
    cardSelect.value = "-1";
    cardTitle.value = "";
    cardDescription.value = "";
    cardLink.value = "";
    cardTags.value = "";
  });

  saveCardButton.addEventListener("click", () => {
    const currentContent = getEditorContent();
    if (!currentContent) return;
    const content = saveCurrentCard(currentContent);
    setEditorContent(content);
    refreshCardSelect(content);
    renderAdminPreview(content);
  });

  deleteCardButton.addEventListener("click", () => {
    const content = getEditorContent();
    if (!content) return;
    const cards = getSectionCards(content);
    const index = Number(cardSelect.value);
    if (index >= 0 && cards[index]) {
      cards.splice(index, 1);
      content.sections[sectionSelect.value] = cards;
      setEditorContent(content);
      refreshCardSelect(content);
      renderAdminPreview(content);
    }
  });

  importCsvButton.addEventListener("click", async () => {
    const csvFile = csvInput.files?.[0];
    if (!csvFile) {
      alert("Please choose a CSV file first.");
      return;
    }
    const csvText = await csvFile.text();
    const rows = parseCsv(csvText);
    const content = getEditorContent();
    if (!content) return;
    content.sections = content.sections || {};
    content.sections[sectionSelect.value] = [...getSectionCards(content), ...rows];
    setEditorContent(content);
    refreshCardSelect(content);
    renderAdminPreview(content);
  });

  importXlsxButton.addEventListener("click", () => {
    const xlsxFile = xlsxInput.files?.[0];
    const name = xlsxFile ? `"${xlsxFile.name}"` : "your XLSX file";
    alert(`XLSX import placeholder: convert ${name} to CSV, then import with the CSV button. Future version can add a browser XLSX parser.`);
  });

  try {
    await loadInitialContent();
  } catch (error) {
    editor.value = JSON.stringify({
      site: {},
      sections: {
        appFactory: [],
        saasIdeas: [],
        projects: [],
        templates: [],
        tools: [],
        dashboards: [],
        uploads: [],
        promptInbox: [],
        monetization: [],
        roadmap: [],
        about: []
      }
    }, null, 2);
  }
})();
