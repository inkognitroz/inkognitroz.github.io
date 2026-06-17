(function () {
  const d = document,
    w = window,
    FALLBACK = "Supergeni",
    q = (s) => d.querySelector(s),
    qa = (s) => d.querySelectorAll(s);

  function canon(value) {
    let text = String(value || "");
    text = text.replace(/\bmmir[-_\s]+supergeni(?:us|ous)?(?:\s+free)?\b/gi, FALLBACK);
    text = text.replace(
      /MMIR Free Control Plane|MMIR Browser Guide|MMIR Guide|free browser guide/gi,
      FALLBACK,
    );
    text = text.replace(
      /(^|[^A-Za-z])supergeni(?:us|ous)?(?:\s+free)?/gi,
      (match, prefix) => prefix + FALLBACK,
    );
    text = text.replace(/(?:MMIR\s+){2,}Supergeni(?:us|ous)?/gi, FALLBACK);
    return text;
  }

  function replaceTextNode(node) {
    if (!node || node.nodeType !== 3) return;
    const next = canon(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  }

  function patchVisibleNames(root = d.body) {
    if (!root) return;
    const walker = d.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        return /MMIR Browser Guide|MMIR Guide|supergeni(?:us|ous)|(?:\bMMIR\b\s*){2,}/i.test(
          node.nodeValue || "",
        )
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      },
    });
    const nodes = [];
    while (nodes.length < 500) {
      const node = walker.nextNode();
      if (!node) break;
      nodes.push(node);
    }
    nodes.forEach(replaceTextNode);
    qa("option").forEach((option) => {
      option.textContent = canon(option.textContent);
    });
    patchElementAttributes(root);
  }

  function patchElementAttributes(root = d.body) {
    if (!root || !root.querySelectorAll) return;
    root
      .querySelectorAll("[title],[aria-label],[placeholder]")
      .forEach((element) => {
        ["title", "aria-label", "placeholder"].forEach((name) => {
          if (!element.hasAttribute(name)) return;
          const current = element.getAttribute(name);
          const next = canon(current);
          if (next !== current) element.setAttribute(name, next);
        });
      });
  }

  function normalizeLegacyLabels() {
    patchVisibleNames();
    const privateMode = q('[data-chat-mode="private"]');
    if (privateMode) {
      privateMode.textContent = "Privacy";
      privateMode.title = "Security and privacy route mode";
      privateMode.setAttribute("aria-label", "Toggle private route review mode");
    }
    const badge = q("#active-badge");
    const badgeText = String(badge?.textContent || "").trim();
    if (badge) {
      if (
        !badgeText ||
        /No backend|MMIR Browser Guide|MMIR Guide|supergeni(?:us|ous)/i.test(
          badgeText,
        )
      ) {
        badge.textContent = "Node: " + FALLBACK;
      } else if (/MMIR Free Control Plane/i.test(badgeText)) {
        badge.textContent = "Node: api.mmir.ai free route";
      } else if (/^Active:\s*/i.test(badgeText)) {
        badge.textContent = canon(badge.textContent.replace(/^Active:\s*/i, "Node: "));
      }
    }
    [
      ["#runtime-model-chip", "model"],
      ["#runtime-node-chip", "node"],
      ["#runtime-privacy-chip", "privacy"],
      ["#runtime-tunnel-chip", "tunnel"],
      ["#runtime-resource-chip", "resources"],
    ].forEach(([selector, role]) => {
      const element = q(selector);
      if (!element) return;
      let full = String(element.textContent || "").trim();
      if (
        selector === "#runtime-model-chip" &&
        (!full || /^(No model|Model checking|Loading free routes)$/i.test(full))
      ) {
        element.textContent = FALLBACK;
        element.dataset.state = "ready";
        full = FALLBACK;
      }
      element.dataset.toolbarRole = role;
      element.title = element.title || full || role;
    });
  }

  w.MimirRuntimeLabels = {
    canon,
    normalizeLegacyLabels,
    patchVisibleNames,
  };
})();
