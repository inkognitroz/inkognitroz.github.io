(async function () {
  const PAGE = document.body.dataset.page;
  const SECTION_KEYS = ["appFactory", "saasIdeas", "projects", "templates", "tools", "dashboards", "uploads", "promptInbox", "monetization", "roadmap", "about"];
  const SITE_FIELDS = ["title", "subtitle", "heroTitle", "heroDescription", "promptWorkflow"];
  const STATUS_VALUES = new Set(["draft", "published"]);
  const ADMIN_BACKUPS_KEY = "saas-fabric-admin-backups";
  const ADMIN_DRAFT_KEY = "saas-fabric-admin-draft";
  const EXPORT_BUNDLE_VERSION = "1.0.0";
  const MAX_BACKUPS = 12;
  let backupIdCounter = 0;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function normalizeStatus(value) {
    return String(value || "published").trim().toLowerCase() === "draft" ? "draft" : "published";
  }

  function isPublished(item) {
    return normalizeStatus(item?.status) === "published";
  }

  function cardTemplate(item, options = {}) {
    const title = escapeHtml(item.title || "Untitled");
    const description = escapeHtml(item.description || "");
    const link = item.link && item.link !== "#" ? `<a href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Open →</a>` : "";
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const tagsHtml = tags.length ? `<div class="tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : "";
    const badge = item.badge ? `<span class="card-badge badge-${escapeHtml(item.badge.toLowerCase().replace(/\s+/g, "-"))}">${escapeHtml(item.badge)}</span>` : "";
    const status = normalizeStatus(item.status);
    const statusHtml = options.showStatus ? `<div class="card-meta"><span class="status-chip ${status}">${escapeHtml(status)}</span></div>` : "";
    return `<article class="card-item">${statusHtml}<div class="card-item-header"><h3>${title}</h3>${badge}</div><p>${description}</p>${link}${tagsHtml}</article>`;
  }

  function renderIntoContainer(container, items, options = {}) {
    if (!container) return;
    const visibleItems = Array.isArray(items)
      ? items.filter((item) => options.includeDrafts || isPublished(item))
      : [];
    if (!visibleItems.length) {
      container.innerHTML = '<article class="card-item"><p>No items yet.</p></article>';
      return;
    }
    container.innerHTML = visibleItems.map((item) => cardTemplate(item, options)).join("");
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
    if (heroTitleEl) heroTitleEl.textContent = site.heroTitle || "Build, Launch & Monetize Your SaaS Products";
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

  function parseCsvRows(text) {
    const source = String(text || "").replace(/^\uFEFF/, "");
    const rows = [];
    let row = [];
    let value = "";
    let inQuotes = false;

    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];

      if (inQuotes) {
        if (char === '"') {
          if (source[index + 1] === '"') {
            value += '"';
            index += 1;
          } else {
            inQuotes = false;
          }
        } else {
          value += char;
        }
        continue;
      }

      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(value);
        value = "";
      } else if (char === "\n") {
        row.push(value);
        if (row.some((cell) => cell.trim() !== "")) rows.push(row);
        row = [];
        value = "";
      } else if (char === "\r") {
        if (source[index + 1] === "\n") index += 1;
        row.push(value);
        if (row.some((cell) => cell.trim() !== "")) rows.push(row);
        row = [];
        value = "";
      } else {
        value += char;
      }
    }

    if (inQuotes) {
      throw new Error("CSV contains an unclosed quoted value.");
    }

    if (value.length || row.length) {
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    }

    return rows;
  }

  function parseCsv(text) {
    const rows = parseCsvRows(text);
    if (!rows.length) return [];
    const headers = rows[0].map((header) => header.trim().toLowerCase());
    if (!headers.includes("title")) {
      throw new Error("CSV must include a title header.");
    }

    return rows.slice(1).map((cols, rowIndex) => {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = String(cols[index] ?? "").trim();
      });

      if (!row.title) {
        throw new Error(`CSV row ${rowIndex + 2} is missing a title.`);
      }

      return {
        title: row.title,
        description: row.description || "",
        link: row.link || "#",
        tags: (row.tags || "").split("|").map((tag) => tag.trim()).filter(Boolean),
        status: normalizeStatus(row.status || "draft")
      };
    });
  }

  function downloadFile(content, filename, type = "application/json;charset=utf-8") {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function escapeCsvValue(value) {
    const text = String(value ?? "");
    if (/["\n\r,]/.test(text)) {
      return `"${text.replaceAll('"', '""')}"`;
    }
    return text;
  }

  function cardsToCsv(cards) {
    const headers = ["title", "description", "link", "tags", "status"];
    const rows = [headers.join(",")];
    (Array.isArray(cards) ? cards : []).forEach((card) => {
      rows.push([
        escapeCsvValue(card?.title || ""),
        escapeCsvValue(card?.description || ""),
        escapeCsvValue(card?.link || "#"),
        escapeCsvValue(Array.isArray(card?.tags) ? card.tags.join("|") : ""),
        escapeCsvValue(normalizeStatus(card?.status || "published"))
      ].join(","));
    });
    return rows.join("\n");
  }

  function toSafePathName(value) {
    const sanitized = String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return sanitized || "section";
  }

  function buildBundleReadme(metadata) {
    return [
      "SaaS Fabric export bundle",
      "",
      `Generated: ${metadata.generatedAt}`,
      `Bundle version: ${metadata.bundleVersion}`,
      `Selected section: ${metadata.selectedSection}`,
      "",
      "How to use this export:",
      "1. Restore content.json by copying content.json into /public/content.json.",
      "2. Review apps/<selected-section>.json for selected app/section backup.",
      "3. Review csv/*.csv for card data exports.",
      "4. Open metadata.json for export details and compatibility info.",
      "",
      "Notes:",
      "- This v1 export is browser-generated and backend-free.",
      "- UTF-8 text is preserved, including Norwegian characters: æ, ø, å.",
      "- Future path: optional server-side ZIP export endpoint with signed downloads."
    ].join("\n");
  }

  function createExportBundle(content, selectedSectionKey) {
    const sections = content.sections && typeof content.sections === "object" ? content.sections : {};
    const selectedCards = Array.isArray(sections[selectedSectionKey]) ? sections[selectedSectionKey] : [];
    const generatedAt = new Date().toISOString();
    const metadata = {
      bundleVersion: EXPORT_BUNDLE_VERSION,
      generatedAt,
      selectedSection: selectedSectionKey,
      sectionCount: Object.keys(sections).length,
      format: "structured-json-bundle",
      futureZipPath: "Add a server-side ZIP export endpoint for authenticated or signed downloads."
    };

    const files = [
      {
        path: "content.json",
        type: "application/json",
        content: JSON.stringify(content, null, 2)
      },
      {
        path: `apps/${toSafePathName(selectedSectionKey)}.json`,
        type: "application/json",
        content: JSON.stringify(selectedCards, null, 2)
      }
    ];

    Object.keys(sections).forEach((sectionKey) => {
      files.push({
        path: `csv/${toSafePathName(sectionKey)}.csv`,
        type: "text/csv",
        content: cardsToCsv(sections[sectionKey])
      });
    });

    files.push({
      path: "README.txt",
      type: "text/plain",
      content: buildBundleReadme(metadata)
    });
    files.push({
      path: "metadata.json",
      type: "application/json",
      content: JSON.stringify(metadata, null, 2)
    });

    return {
      type: "saas-fabric-export-bundle",
      version: EXPORT_BUNDLE_VERSION,
      generatedAt,
      files
    };
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
  const validateButton = document.querySelector("#validate-json");
  const previewButton = document.querySelector("#preview-json");
  const downloadButton = document.querySelector("#download-json");
  const downloadBundleButton = document.querySelector("#download-bundle");
  const previewRoot = document.querySelector("#admin-preview");
  const adminMessage = document.querySelector("#admin-message");
  const validationSummary = document.querySelector("#validation-summary");
  const validationResults = document.querySelector("#validation-results");
  const sectionSelect = document.querySelector("#section-select");
  const cardSelect = document.querySelector("#card-select");
  const cardTitle = document.querySelector("#card-title");
  const cardLink = document.querySelector("#card-link");
  const cardStatus = document.querySelector("#card-status");
  const cardDescription = document.querySelector("#card-description");
  const cardTags = document.querySelector("#card-tags");
  const newCardButton = document.querySelector("#new-card");
  const saveCardButton = document.querySelector("#save-card");
  const deleteCardButton = document.querySelector("#delete-card");
  const csvInput = document.querySelector("#csv-input");
  const importCsvButton = document.querySelector("#import-csv");
  const xlsxInput = document.querySelector("#xlsx-input");
  const importXlsxButton = document.querySelector("#import-xlsx");
  const restoreBrowserDraftButton = document.querySelector("#restore-browser-draft");
  const clearBrowserDraftButton = document.querySelector("#clear-browser-draft");
  const backupSelect = document.querySelector("#backup-select");
  const saveBackupButton = document.querySelector("#save-backup");
  const restoreBackupButton = document.querySelector("#restore-backup");
  const deleteBackupButton = document.querySelector("#delete-backup");

  function createEmptyContent() {
    return {
      site: {},
      sections: Object.fromEntries(SECTION_KEYS.map((key) => [key, []]))
    };
  }

  function cloneValue(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function setNotice(type, message) {
    adminMessage.hidden = !message;
    adminMessage.className = message ? `notice ${type}` : "notice";
    adminMessage.textContent = message || "";
  }

  function setValidationState(errors) {
    if (!errors.length) {
      validationSummary.textContent = "Content validation passed.";
      validationSummary.className = "validation-summary valid";
      validationResults.hidden = true;
      validationResults.innerHTML = "";
      return;
    }

    validationSummary.textContent = `${errors.length} validation issue${errors.length === 1 ? "" : "s"} found. Fix them before export.`;
    validationSummary.className = "validation-summary invalid";
    validationResults.hidden = false;
    validationResults.innerHTML = errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("");
  }

  function validateCard(item, path) {
    const errors = [];
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [`${path} must be an object.`];
    }
    if (typeof item.title !== "string" || !item.title.trim()) errors.push(`${path}.title is required.`);
    if ("description" in item && typeof item.description !== "string") errors.push(`${path}.description must be a string.`);
    if ("link" in item && typeof item.link !== "string") errors.push(`${path}.link must be a string.`);
    if (!Array.isArray(item.tags)) {
      errors.push(`${path}.tags must be an array of strings.`);
    } else if (item.tags.some((tag) => typeof tag !== "string")) {
      errors.push(`${path}.tags must only contain strings.`);
    }
    if ("status" in item && !STATUS_VALUES.has(String(item.status).trim().toLowerCase())) {
      errors.push(`${path}.status must be "draft" or "published".`);
    }
    return errors;
  }

  function validateContentModel(content) {
    if (!content || typeof content !== "object" || Array.isArray(content)) {
      return ["Root content must be a JSON object."];
    }

    const errors = [];
    if (!content.site || typeof content.site !== "object" || Array.isArray(content.site)) {
      errors.push("site must be an object.");
    } else {
      SITE_FIELDS.forEach((field) => {
        if (field in content.site && typeof content.site[field] !== "string") {
          errors.push(`site.${field} must be a string.`);
        }
      });
    }

    if (!content.sections || typeof content.sections !== "object" || Array.isArray(content.sections)) {
      errors.push("sections must be an object.");
      return errors;
    }

    Object.keys(content.sections).forEach((sectionKey) => {
      const items = content.sections[sectionKey];
      if (!Array.isArray(items)) {
        errors.push(`sections.${sectionKey} must be an array.`);
        return;
      }
      items.forEach((item, index) => {
        errors.push(...validateCard(item, `sections.${sectionKey}[${index}]`));
      });
    });

    SECTION_KEYS.forEach((sectionKey) => {
      if (!(sectionKey in content.sections)) {
        errors.push(`sections.${sectionKey} is required and must be an array.`);
      }
    });

    return errors;
  }

  function validateEditorContent(content) {
    const errors = validateContentModel(content);
    setValidationState(errors);
    return errors;
  }

  function persistEditorDraft(text = editor.value) {
    localStorage.setItem(ADMIN_DRAFT_KEY, text);
  }

  function readEditorDraft() {
    return localStorage.getItem(ADMIN_DRAFT_KEY) || "";
  }

  function readBackups() {
    try {
      const backups = JSON.parse(localStorage.getItem(ADMIN_BACKUPS_KEY) || "[]");
      return Array.isArray(backups) ? backups : [];
    } catch (error) {
      return [];
    }
  }

  function refreshBackupSelect() {
    const backups = readBackups();
    if (!backups.length) {
      backupSelect.innerHTML = '<option value="">No restore points yet</option>';
      backupSelect.value = "";
      return;
    }

    backupSelect.innerHTML = backups.map((backup) => {
      const label = backup.label || "Restore point";
      const date = backup.createdAt ? new Date(backup.createdAt).toLocaleString() : "Unknown time";
      return `<option value="${escapeHtml(backup.id)}">${escapeHtml(`${label} — ${date}`)}</option>`;
    }).join("");
    backupSelect.value = backups[0].id;
  }

  function writeBackups(backups) {
    localStorage.setItem(ADMIN_BACKUPS_KEY, JSON.stringify(backups.slice(0, MAX_BACKUPS)));
    refreshBackupSelect();
  }

  function saveBackupSnapshot(content, label) {
    const backups = readBackups();
    backupIdCounter += 1;
    const fallbackId = `backup-${Date.now()}-${backupIdCounter}`;
    backups.unshift({
      id: globalThis.crypto?.randomUUID?.() || fallbackId,
      label,
      createdAt: new Date().toISOString(),
      content: cloneValue(content)
    });
    writeBackups(backups);
  }

  function getSelectedBackup() {
    const backupId = backupSelect.value;
    return readBackups().find((backup) => backup.id === backupId) || null;
  }

  function getSectionCards(content) {
    if (!content) return [];
    const cards = content.sections?.[sectionSelect.value];
    return Array.isArray(cards) ? cards : [];
  }

  function getEditorContent() {
    try {
      return parseEditorJson(editor);
    } catch (error) {
      setNotice("error", "Invalid JSON. Please fix syntax in the editor before continuing.");
      setValidationState([error.message]);
      return null;
    }
  }

  function setEditorContent(content) {
    editor.value = JSON.stringify(content, null, 2);
    persistEditorDraft(editor.value);
  }

  function refreshCardSelect(content, preferredIndex = null) {
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
      cardStatus.value = "draft";
      return;
    }

    const nextIndex = preferredIndex !== null && preferredIndex >= 0 && preferredIndex < cards.length ? preferredIndex : 0;
    cardSelect.value = String(nextIndex);
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
    cardStatus.value = normalizeStatus(card.status);
  }

  function saveCurrentCard(content) {
    content.sections = content.sections || {};
    const cards = getSectionCards(content);
    let index = Number(cardSelect.value);
    if (Number.isNaN(index) || index < 0 || index >= cards.length) {
      cards.push({});
      index = cards.length - 1;
    }
    cards[index] = {
      title: cardTitle.value.trim(),
      description: cardDescription.value.trim(),
      link: cardLink.value.trim() || "#",
      tags: cardTags.value.split(",").map((tag) => tag.trim()).filter(Boolean),
      status: normalizeStatus(cardStatus.value || "draft")
    };
    content.sections[sectionSelect.value] = cards;
    return { content, index };
  }

  function renderAdminPreview(content) {
    const site = content.site || {};
    const sections = content.sections || {};
    previewRoot.innerHTML = `
      <h3>${escapeHtml(site.title || "Preview")}</h3>
      <p>${escapeHtml(site.promptWorkflow || "")}</p>
      <div class="grid" data-section="${escapeHtml(sectionSelect.value)}"></div>
    `;
    renderIntoContainer(previewRoot.querySelector("[data-section]"), sections[sectionSelect.value], { includeDrafts: true, showStatus: true });
  }

  function applyContentUpdate(content, options = {}) {
    setEditorContent(content);
    refreshCardSelect(content, options.preferredIndex ?? null);
    renderAdminPreview(content);
    validateEditorContent(content);
    if (options.backupLabel) saveBackupSnapshot(content, options.backupLabel);
    if (options.message) setNotice("success", options.message);
  }

  async function loadInitialContent() {
    const content = await loadContent();
    setEditorContent(content);
    refreshCardSelect(content);
    renderAdminPreview(content);
    validateEditorContent(content);
    return content;
  }

  function exportValidatedContent() {
    const content = formatJson(editor);
    const errors = validateEditorContent(content);
    if (errors.length) {
      setNotice("error", "Export blocked until validation passes.");
      return;
    }
    downloadFile(JSON.stringify(content, null, 2), "content.json");
    saveBackupSnapshot(content, "Exported content.json");
    setNotice("success", "Exported validated content.json. Next step: commit it in a PR.");
  }

  function exportValidatedBundle() {
    const content = formatJson(editor);
    const errors = validateEditorContent(content);
    if (errors.length) {
      setNotice("error", "Bundle export blocked until validation passes.");
      return;
    }
    const bundle = createExportBundle(content, sectionSelect.value);
    const fileDate = bundle.generatedAt.replace(/[:.]/g, "-");
    downloadFile(
      JSON.stringify(bundle, null, 2),
      `saas-fabric-export-bundle-${fileDate}.json`,
      "application/json;charset=utf-8"
    );
    saveBackupSnapshot(content, "Exported backup bundle");
    setNotice("success", "Exported backup bundle with content.json, selected section JSON, CSV files, README, and metadata.");
  }

  loadButton.addEventListener("click", async () => {
    try {
      const content = await loadInitialContent();
      saveBackupSnapshot(content, "Loaded content.json");
      setNotice("success", "Loaded content.json into the admin editor.");
    } catch (error) {
      setNotice("error", `Could not load content.json. ${error.message}`);
    }
  });

  formatButton.addEventListener("click", () => {
    try {
      const content = formatJson(editor);
      validateEditorContent(content);
      setNotice("success", "Formatted JSON in the editor.");
    } catch (error) {
      setNotice("error", "Invalid JSON. Please fix syntax before formatting.");
    }
  });

  validateButton.addEventListener("click", () => {
    const content = getEditorContent();
    if (!content) return;
    const errors = validateEditorContent(content);
    setNotice(errors.length ? "error" : "success", errors.length ? "Validation found issues to fix before export." : "Validation passed. Content is ready to export.");
  });

  previewButton.addEventListener("click", () => {
    const content = getEditorContent();
    if (!content) return;
    const errors = validateEditorContent(content);
    if (errors.length) {
      setNotice("error", "Preview blocked until validation passes.");
      return;
    }
    renderAdminPreview(content);
    setNotice("success", "Preview updated from validated content.");
  });

  downloadButton.addEventListener("click", () => {
    try {
      exportValidatedContent();
    } catch (error) {
      setNotice("error", "Invalid JSON. Please fix syntax before export.");
    }
  });

  downloadBundleButton.addEventListener("click", () => {
    try {
      exportValidatedBundle();
    } catch (error) {
      setNotice("error", "Invalid JSON. Please fix syntax before bundle export.");
    }
  });

  editor.addEventListener("input", () => {
    persistEditorDraft();
  });

  restoreBrowserDraftButton.addEventListener("click", () => {
    const draft = readEditorDraft();
    if (draft.length === 0) {
      setNotice("error", "No browser draft is saved yet.");
      return;
    }
    editor.value = draft;
    const content = getEditorContent();
    if (content) {
      refreshCardSelect(content);
      renderAdminPreview(content);
      validateEditorContent(content);
      setNotice("success", "Restored the latest browser draft.");
    }
  });

  clearBrowserDraftButton.addEventListener("click", () => {
    localStorage.removeItem(ADMIN_DRAFT_KEY);
    setNotice("success", "Cleared the saved browser draft.");
  });

  saveBackupButton.addEventListener("click", () => {
    const content = getEditorContent();
    if (!content) return;
    saveBackupSnapshot(content, "Manual restore point");
    setNotice("success", "Created a browser restore point.");
  });

  restoreBackupButton.addEventListener("click", () => {
    const backup = getSelectedBackup();
    if (!backup) {
      setNotice("error", "Choose a restore point first.");
      return;
    }
    applyContentUpdate(backup.content, {
      message: `Restored "${backup.label || "restore point"}".`
    });
  });

  deleteBackupButton.addEventListener("click", () => {
    const backup = getSelectedBackup();
    if (!backup) {
      setNotice("error", "Choose a restore point first.");
      return;
    }
    writeBackups(readBackups().filter((entry) => entry.id !== backup.id));
    setNotice("success", "Deleted the selected restore point.");
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
    cardStatus.value = "draft";
  });

  saveCardButton.addEventListener("click", () => {
    const currentContent = getEditorContent();
    if (!currentContent) return;
    const result = saveCurrentCard(currentContent);
    applyContentUpdate(result.content, {
      preferredIndex: result.index,
      backupLabel: "Saved card",
      message: `Saved ${normalizeStatus(cardStatus.value)} card in ${sectionSelect.options[sectionSelect.selectedIndex].text}.`
    });
  });

  deleteCardButton.addEventListener("click", () => {
    const content = getEditorContent();
    if (!content) return;
    const cards = getSectionCards(content);
    const index = Number(cardSelect.value);
    if (index >= 0 && cards[index] && window.confirm("Delete this card from the selected section?")) {
      cards.splice(index, 1);
      content.sections[sectionSelect.value] = cards;
      applyContentUpdate(content, {
        preferredIndex: Math.max(0, index - 1),
        backupLabel: "Deleted card",
        message: "Deleted the selected card."
      });
    }
  });

  importCsvButton.addEventListener("click", async () => {
    const csvFile = csvInput.files?.[0];
    if (!csvFile) {
      setNotice("error", "Please choose a CSV file first.");
      return;
    }

    try {
      const csvText = await csvFile.text();
      const rows = parseCsv(csvText);
      const content = getEditorContent();
      if (!content) return;
      content.sections = content.sections || {};
      content.sections[sectionSelect.value] = [...getSectionCards(content), ...rows];
      applyContentUpdate(content, {
        preferredIndex: getSectionCards(content).length - 1,
        backupLabel: "Imported CSV",
        message: `Imported ${rows.length} CSV row${rows.length === 1 ? "" : "s"} into ${sectionSelect.options[sectionSelect.selectedIndex].text}.`
      });
    } catch (error) {
      setNotice("error", error.message || "Could not import the CSV file.");
    }
  });

  importXlsxButton.addEventListener("click", () => {
    const xlsxFile = xlsxInput.files?.[0];
    const name = xlsxFile ? `"${xlsxFile.name}"` : "your XLSX file";
    setNotice("success", `XLSX import remains a safe placeholder: convert ${name} to CSV, then import it here. A future backend or browser parser can handle XLSX directly.`);
  });

  refreshBackupSelect();

  try {
    await loadInitialContent();
    setNotice("success", "Admin is ready. Drafts stay local until you export and publish through a PR.");
  } catch (error) {
    const emptyContent = createEmptyContent();
    setEditorContent(emptyContent);
    refreshCardSelect(emptyContent);
    renderAdminPreview(emptyContent);
    validateEditorContent(emptyContent);
    setNotice("error", "Loaded an empty fallback because content.json could not be fetched. You can still edit locally and export safely.");
  }
})();
