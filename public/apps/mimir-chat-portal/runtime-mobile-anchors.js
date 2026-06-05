(function () {
  const d = document,
    w = window,
    P = "#mimir-prompt",
    R = "#mimir-chat-runtime",
    L = "#local-connector",
    C = "#connect-options",
    AS =
      'a[href="#mimir-prompt"],a[href="#mimir-chat-runtime"],a[href="#local-connector"],a[href="#connect-options"],a[href="#backend-settings"]',
    K = "__MimirLocalProbeAllowedUntil",
    FALLBACK = "Supergenious",
    q = (s) => d.querySelector(s),
    qa = (s) => d.querySelectorAll(s);

  function setAttr(element, name, value) {
    if (element && element.getAttribute(name) !== value) element.setAttribute(name, value);
  }

  function localReturnActive() {
    const params = new URLSearchParams(location.search);
    const hash = location.hash.toLowerCase();
    return (
      params.get("mmir_local_return") === "1" ||
      params.get("local_node_ready") === "1" ||
      hash.includes("local-connector-ready") ||
      hash.includes("mmir-local-ready")
    );
  }

  function fixPrimarySend() {
    const link = q("#primary-chat-link");
    if (!link) return;
    link.textContent = "↑";
    link.classList.remove("disabled");
    setAttr(link, "aria-disabled", "false");
    setAttr(link, "aria-label", "Send prompt to the active MMIR route");
    if (link.tagName === "BUTTON") {
      link.type = "submit";
      link.removeAttribute("href");
      link.removeAttribute("target");
      link.removeAttribute("rel");
      return;
    }
    setAttr(link, "href", R);
    setAttr(link, "role", "button");
    link.removeAttribute("target");
    link.removeAttribute("rel");
  }

  function normalizeTarget(target) {
    return target === C && !q(C) ? L : target;
  }

  function openEl(element) {
    if (!element) return false;
    for (let current = element; current; current = current.parentElement?.closest?.("details")) {
      if ("open" in current) current.open = true;
    }
    element.scrollIntoView({ block: "start", behavior: "smooth" });
    return true;
  }

  function openTarget(target) {
    const normalized = normalizeTarget(target);
    if (
      (target === L || target === C || normalized === L) &&
      w.MimirBackendProfiles?.ensureFreeLocalProfile
    ) {
      w.MimirBackendProfiles.ensureFreeLocalProfile();
    }
    const open = () => openEl(q(target) || q(normalized));
    if (!open() && w.MimirLoadDeferred) w.MimirLoadDeferred().then(open);
  }

  function openHash() {
    const hash = location.hash;
    if (hash && hash !== P && hash !== R) openTarget(hash);
  }

  function focusChatTarget() {
    const prompt = q(P),
      runtime = q(R);
    openEl(runtime || prompt);
    if (prompt) prompt.focus({ preventScroll: true });
    w.dispatchEvent(
      new CustomEvent("mmir-mobile-chat-target-opened", {
        detail: { target: runtime ? R : P },
      }),
    );
  }

  function send(value) {
    const prompt = q(P);
    if (!prompt) return false;
    prompt.value = String(value || "").trim();
    prompt.dispatchEvent(new Event("input", { bubbles: true }));
    prompt.dispatchEvent(new Event("change", { bubbles: true }));
    focusChatTarget();
    fixPrimarySend();
    if (!localReturnActive()) w[K] = 0;
    setTimeout(() => q("#primary-chat-link")?.click(), 40);
    return true;
  }

  function bindPrimaryAnchors() {
    qa('a[href="#mimir-chat-runtime"]').forEach((link) => {
      if (link.id !== "primary-chat-link") setAttr(link, "href", P);
    });
    qa('a[href="#connect-options"]').forEach((link) => {
      if (!q(C)) setAttr(link, "href", L);
    });
    qa(AS).forEach((link) => {
      link.dataset.runtimeAnchorBound = "true";
    });
  }

  function handleMobileTap(event) {
    if (event.target.closest?.("#primary-chat-link")) {
      w.MimirRuntimeTruth?.routeBlockedWebGpuToGuide?.("send");
      return;
    }
    const promptAction = event.target.closest?.("[data-prompt-action]");
    if (promptAction && promptAction.dataset.firstImpressionBound !== "true") {
      event.preventDefault();
      send(
        promptAction.dataset.prompt ||
          promptAction.textContent ||
          "Help me get started with MMIR.",
      );
      return;
    }
    const activation = event.target.closest?.(
      "#activation-chat-now,#activation-connect-local,#activation-open-models,#activation-open-node-dashboard",
    );
    if (activation && activation.dataset.firstImpressionBound !== "true") {
      event.preventDefault();
      activation.id === "activation-chat-now"
        ? send("Start " + FALLBACK + " instant chat.")
        : openTarget(
            activation.id === "activation-connect-local"
              ? C
              : activation.id === "activation-open-models"
                ? "#model-library"
                : "#node-dashboard",
          );
      return;
    }
    const anchor = event.target.closest?.(AS);
    if (!anchor || anchor.id === "primary-chat-link") return;
    const target = anchor.getAttribute("href") || P;
    if (target[0] !== "#") return;
    event.preventDefault();
    target === P || target === R ? focusChatTarget() : openTarget(target);
  }

  function markMobileFirstChatReady() {
    const composer = q(".mimir-composer");
    if (composer) composer.dataset.mobileFirstChatReady = "true";
  }

  w.MimirRuntimeMobileAnchors = {
    bindPrimaryAnchors,
    fixPrimarySend,
    focusChatTarget,
    handleMobileTap,
    markMobileFirstChatReady,
    openHash,
    openTarget,
  };
})();
