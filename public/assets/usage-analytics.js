(function () {
  if (document.body?.dataset?.page !== "home") return;

  const STORAGE_KEY = "saas-fabric-usage-events-v1";
  const MAX_EVENTS = 800;
  const trackedSectionViews = new Set();

  const sectionsList = document.getElementById("usage-analytics-sections");
  const appsList = document.getElementById("usage-analytics-apps");
  const note = document.getElementById("usage-analytics-note");
  const resetButton = document.getElementById("usage-analytics-reset");

  if (!sectionsList || !appsList || !note || !resetButton) return;

  function readEvents() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function writeEvents(events) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-MAX_EVENTS)));
  }

  function normalizeLabel(value, fallback) {
    const normalized = String(value || "").replace(/\s+/g, " ").trim();
    return normalized || fallback;
  }

  function logEvent(type, details = {}) {
    const event = {
      type,
      section: normalizeLabel(details.section, ""),
      app: normalizeLabel(details.app, ""),
      at: new Date().toISOString()
    };
    const events = readEvents();
    events.push(event);
    writeEvents(events);
    renderDashboard(events);
  }

  function countBy(events, field, type) {
    const counts = new Map();
    events.forEach((event) => {
      if (event.type !== type || !event[field]) return;
      counts.set(event[field], (counts.get(event[field]) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }

  function renderList(list, rows, emptyText) {
    if (!rows.length) {
      list.innerHTML = `<li class="usage-analytics-empty">${emptyText}</li>`;
      return;
    }
    list.innerHTML = rows.map(([label, count]) => `<li>${label} (${count})</li>`).join("");
  }

  function renderDashboard(events = readEvents()) {
    renderList(sectionsList, countBy(events, "section", "section_view"), "No section views yet.");
    renderList(appsList, countBy(events, "app", "app_open"), "No app clicks yet.");
  }

  function sectionTitle(sectionEl) {
    return normalizeLabel(sectionEl?.querySelector("h2")?.textContent, sectionEl?.id || "Section");
  }

  function observeSectionViews() {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.35) return;
        const sectionEl = entry.target.closest("section[id]");
        if (!sectionEl?.id || trackedSectionViews.has(sectionEl.id)) return;
        trackedSectionViews.add(sectionEl.id);
        logEvent("section_view", { section: sectionTitle(sectionEl) });
      });
    }, { threshold: [0.35] });

    document.querySelectorAll("main section[id]").forEach((sectionEl) => observer.observe(sectionEl));
  }

  document.addEventListener("click", (event) => {
    const link = event.target.closest(".card-item a");
    if (!link) return;
    const card = link.closest(".card-item");
    const sectionEl = link.closest("section[id]");
    logEvent("app_open", {
      app: normalizeLabel(card?.querySelector("h3")?.textContent, "Card"),
      section: sectionTitle(sectionEl)
    });
  });

  resetButton.addEventListener("click", () => {
    if (!window.confirm("Reset local analytics on this device?")) return;
    localStorage.removeItem(STORAGE_KEY);
    trackedSectionViews.clear();
    renderDashboard([]);
    note.textContent = "Local analytics reset on this device.";
  });

  try {
    renderDashboard();
    observeSectionViews();
    note.textContent = "Tracking section views and app link clicks in your browser only.";
  } catch (_) {
    note.textContent = "Local analytics is unavailable in this browser context.";
  }
})();
