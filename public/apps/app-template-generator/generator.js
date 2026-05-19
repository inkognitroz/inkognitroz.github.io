(function () {
  const form = document.getElementById("template-form");
  const copyStatus = document.getElementById("copy-status");
  const outputs = {
    issue: document.getElementById("issueOutput"),
    folder: document.getElementById("folderOutput"),
    card: document.getElementById("cardOutput"),
    checklist: document.getElementById("checklistOutput")
  };

  function toSlug(value) {
    return (value || "new-app")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "new-app";
  }

  function toLines(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function withFallback(value, fallback) {
    const trimmed = String(value || "").trim();
    return trimmed || fallback;
  }

  function formData() {
    const data = new FormData(form);
    const appName = withFallback(data.get("appName"), "New SaaS App");
    const slug = toSlug(appName);
    const targetUser = withFallback(data.get("targetUser"), "Target users");
    const problemSolved = withFallback(data.get("problemSolved"), "Problem statement");
    const coreFeatures = toLines(data.get("coreFeatures"));
    const dataModel = toLines(data.get("dataModel"));
    const monetizationIdea = withFallback(data.get("monetizationIdea"), "Monetization idea");
    const hostingTarget = withFallback(data.get("hostingTarget"), "GitHub Pages (/public)");
    const firstPrPrompt = withFallback(data.get("firstPrPrompt"), "Add implementation prompt");

    return {
      appName,
      slug,
      targetUser,
      problemSolved,
      coreFeatures,
      dataModel,
      monetizationIdea,
      hostingTarget,
      firstPrPrompt
    };
  }

  function buildIssue(d) {
    const featureList = d.coreFeatures.length ? d.coreFeatures : ["Define core feature set"];
    const dataModelList = d.dataModel.length ? d.dataModel : ["Define minimal content/data model"];
    return [
      `## Goal`,
      `Ship **${d.appName}** as a static-first Mimir app with a clear v1 scope.`,
      ``,
      `## App brief`,
      `- **App name:** ${d.appName}`,
      `- **Target user:** ${d.targetUser}`,
      `- **Problem solved:** ${d.problemSolved}`,
      `- **Monetization idea:** ${d.monetizationIdea}`,
      `- **Hosting target:** ${d.hostingTarget}`,
      ``,
      `## Core features`,
      ...featureList.map((line) => `- ${line}`),
      ``,
      `## Data model`,
      ...dataModelList.map((line) => `- ${line}`),
      ``,
      `## Implementation requirements`,
      `- Keep v1 fully static and GitHub Pages-compatible.`,
      `- Publish from \`/public\` only (no backend required).`,
      `- Add app page at \`/public/apps/${d.slug}/\`.`,
      `- Add/confirm \`public/content.json\` card in \`sections.appFactory\`.`,
      `- No secrets in frontend files.`,
      ``,
      `## First PR prompt`,
      d.firstPrPrompt,
      ``,
      `## Acceptance criteria`,
      `- Mobile-friendly layout and usable controls.`,
      `- App route is accessible at \`/apps/${d.slug}/\`.`,
      `- Content card appears in App Factory.`,
      `- JSON/JS quality checks pass.`
    ].join("\n");
  }

  function buildFolderStructure(d) {
    return [
      `public/apps/${d.slug}/`,
      `├── index.html`,
      `├── ${d.slug}.css`,
      `└── ${d.slug}.js`,
      ``,
      `public/content.json`,
      `└── sections.appFactory[]`,
      `    └── card link: "./apps/${d.slug}/"`
    ].join("\n");
  }

  function buildCard(d) {
    const tags = ["app", "saas", d.slug.split("-")[0]].filter(Boolean);
    return JSON.stringify({
      title: d.appName,
      description: d.problemSolved,
      link: `./apps/${d.slug}/`,
      badge: "WIP",
      tags
    }, null, 2);
  }

  function buildChecklist(d) {
    return [
      `- [ ] Create \`/public/apps/${d.slug}/index.html\``,
      `- [ ] Add app-specific CSS and JS files`,
      `- [ ] Implement v1 core features: ${d.coreFeatures.join(", ") || "define features"}`,
      `- [ ] Implement data model: ${d.dataModel.join(", ") || "define model"}`,
      `- [ ] Add App Factory card in \`public/content.json\``,
      `- [ ] Validate JSON files (\`python -m json.tool\`)`,
      `- [ ] Validate JS syntax (\`node --check\`)`,
      `- [ ] Manual mobile smoke test`,
      `- [ ] Confirm no frontend secrets`,
      `- [ ] Open first PR with prompt: ${d.firstPrPrompt}`
    ].join("\n");
  }

  function updateOutputs() {
    const d = formData();
    outputs.issue.value = buildIssue(d);
    outputs.folder.value = buildFolderStructure(d);
    outputs.card.value = buildCard(d);
    outputs.checklist.value = buildChecklist(d);
  }

  async function copyText(value) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const fallback = document.createElement("textarea");
    fallback.value = value;
    fallback.setAttribute("readonly", "readonly");
    fallback.style.position = "absolute";
    fallback.style.left = "-9999px";
    document.body.appendChild(fallback);
    fallback.select();
    const didCopy = document.execCommand("copy");
    document.body.removeChild(fallback);
    if (!didCopy) {
      throw new Error("Copy command failed.");
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    updateOutputs();
    copyStatus.textContent = "Outputs refreshed. Use Copy on any section.";
  });

  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", async function () {
      const targetId = button.getAttribute("data-copy-target");
      const target = document.getElementById(targetId);
      if (!target) return;

      try {
        await copyText(target.value);
        copyStatus.textContent = "Copied to clipboard.";
      } catch (_) {
        copyStatus.textContent = "Copy failed. Select the text manually and copy.";
      }
    });
  });

  updateOutputs();
})();
