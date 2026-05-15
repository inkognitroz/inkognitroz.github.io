(function () {
  const ROADMAP_URL = "./roadmap.json";
  const STATUS_ORDER = ["idea", "planned", "in-progress", "review", "launched"];
  const PRIORITY_ORDER = ["high", "medium", "low"];

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function priorityWeight(value) {
    const index = PRIORITY_ORDER.indexOf(normalize(value));
    return index === -1 ? 99 : index;
  }

  function injectStyles() {
    if (document.getElementById("roadmap-board-styles")) return;
    const style = document.createElement("style");
    style.id = "roadmap-board-styles";
    style.textContent = `
      .roadmap-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: .65rem;
        align-items: end;
        margin: 1rem 0 1.25rem;
      }

      .roadmap-toolbar label {
        display: grid;
        gap: .25rem;
        min-width: 180px;
        color: var(--muted);
        font-size: .82rem;
      }

      .roadmap-board {
        display: grid;
        grid-template-columns: repeat(5, minmax(220px, 1fr));
        gap: .85rem;
        overflow-x: auto;
        padding-bottom: .35rem;
      }

      .roadmap-column {
        min-width: 220px;
        background: color-mix(in srgb, var(--surface-elevated) 70%, transparent);
        border: 1px solid var(--border-soft);
        border-radius: var(--card-radius);
        padding: .75rem;
      }

      .roadmap-column-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: .5rem;
        margin-bottom: .65rem;
      }

      .roadmap-column-header h3 {
        margin: 0;
        font-size: .95rem;
      }

      .roadmap-count {
        border: 1px solid var(--border-soft);
        border-radius: 999px;
        padding: .05rem .45rem;
        color: var(--muted);
        font-size: .72rem;
      }

      .roadmap-items {
        display: grid;
        gap: .6rem;
      }

      .roadmap-card {
        background: var(--card-bg);
        border: 1px solid var(--border-soft);
        border-radius: calc(var(--card-radius) - 4px);
        padding: .8rem;
        box-shadow: 0 8px 20px rgba(0, 0, 0, calc(var(--shadow-strength) * 0.45));
      }

      .roadmap-card h4 {
        margin: 0 0 .35rem;
        font-size: .95rem;
      }

      .roadmap-card p {
        color: var(--muted);
        margin: 0 0 .55rem;
        font-size: .84rem;
        line-height: 1.45;
      }

      .roadmap-meta {
        display: flex;
        flex-wrap: wrap;
        gap: .35rem;
        margin-bottom: .5rem;
      }

      .roadmap-chip {
        border: 1px solid var(--border-soft);
        border-radius: 999px;
        padding: .08rem .45rem;
        font-size: .68rem;
        color: var(--muted);
      }

      .roadmap-chip.priority-high {
        color: var(--danger);
        border-color: color-mix(in srgb, var(--danger) 55%, var(--border-soft));
      }

      .roadmap-chip.priority-medium {
        color: var(--warning);
        border-color: color-mix(in srgb, var(--warning) 55%, var(--border-soft));
      }

      .roadmap-chip.priority-low {
        color: var(--success);
        border-color: color-mix(in srgb, var(--success) 55%, var(--border-soft));
      }

      .roadmap-next {
        font-size: .78rem;
        color: var(--text);
        margin: .35rem 0 .55rem;
      }

      .roadmap-link {
        font-size: .8rem;
        font-weight: 700;
        text-decoration: none;
      }

      .roadmap-empty {
        color: var(--muted);
        font-size: .82rem;
        border: 1px dashed var(--border-soft);
        border-radius: calc(var(--card-radius) - 4px);
        padding: .7rem;
      }

      @media (max-width: 980px) {
        .roadmap-board {
          grid-template-columns: repeat(5, minmax(240px, 260px));
        }
      }
    `;
    document.head.appendChild(style);
  }

  function createShell(section) {
    const oldGrid = section.querySelector("[data-section='roadmap']");
    if (oldGrid) oldGrid.remove();

    const shell = document.createElement("div");
    shell.id = "roadmap-board-root";
    shell.innerHTML = `
      <div class="roadmap-toolbar" aria-label="Roadmap filters">
        <label>Priority
          <select id="roadmap-priority-filter">
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label>Search
          <input id="roadmap-search" type="search" placeholder="Search roadmap" />
        </label>
      </div>
      <div id="roadmap-board" class="roadmap-board" aria-live="polite"></div>
    `;
    section.appendChild(shell);
    return shell;
  }

  function render(board, columns, items, filters) {
    const filtered = items
      .filter((item) => filters.priority === "all" || normalize(item.priority) === filters.priority)
      .filter((item) => {
        if (!filters.search) return true;
        const haystack = [item.title, item.description, item.owner, item.nextAction].join(" ").toLowerCase();
        return haystack.includes(filters.search);
      })
      .sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority));

    board.innerHTML = columns.map((column) => {
      const columnItems = filtered.filter((item) => normalize(item.status) === column.key);
      const cards = columnItems.length ? columnItems.map((item) => `
        <article class="roadmap-card">
          <div class="roadmap-meta">
            <span class="roadmap-chip priority-${escapeHtml(normalize(item.priority) || "medium")}">${escapeHtml(item.priority || "medium")}</span>
            <span class="roadmap-chip">${escapeHtml(item.owner || "Unassigned")}</span>
          </div>
          <h4>${escapeHtml(item.title)}</h4>
          <p>${escapeHtml(item.description)}</p>
          <div class="roadmap-next"><strong>Next:</strong> ${escapeHtml(item.nextAction || "Define next action")}</div>
          ${item.link ? `<a class="roadmap-link" href="${escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">Open issue/PR →</a>` : ""}
        </article>
      `).join("") : '<div class="roadmap-empty">No items here yet.</div>';

      return `
        <section class="roadmap-column" aria-label="${escapeHtml(column.label)}">
          <div class="roadmap-column-header">
            <h3>${escapeHtml(column.label)}</h3>
            <span class="roadmap-count">${columnItems.length}</span>
          </div>
          <div class="roadmap-items">${cards}</div>
        </section>
      `;
    }).join("");
  }

  async function init() {
    const roadmapSection = document.getElementById("roadmap");
    if (!roadmapSection) return;
    injectStyles();
    const shell = createShell(roadmapSection);
    const board = shell.querySelector("#roadmap-board");
    const priorityFilter = shell.querySelector("#roadmap-priority-filter");
    const searchInput = shell.querySelector("#roadmap-search");

    try {
      const response = await fetch(ROADMAP_URL, { cache: "default" });
      if (!response.ok) throw new Error("Could not load roadmap.json");
      const data = await response.json();
      const columns = Array.isArray(data.columns) && data.columns.length
        ? data.columns
        : STATUS_ORDER.map((key) => ({ key, label: key }));
      const items = Array.isArray(data.items) ? data.items : [];

      function rerender() {
        render(board, columns, items, {
          priority: normalize(priorityFilter.value || "all"),
          search: normalize(searchInput.value)
        });
      }

      priorityFilter.addEventListener("change", rerender);
      searchInput.addEventListener("input", rerender);
      rerender();
    } catch (error) {
      board.innerHTML = `<div class="roadmap-empty">${escapeHtml(error.message)}</div>`;
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
