(function () {
  const d = document,
    w = window,
    q = (s) => d.querySelector(s);
  function p0ReadyShell() {
    return Boolean(
      d.body?.classList.contains("mmir-p0-ready") && q("#mmir-p0-app"),
    );
  }
  function routeBlockedWebGpuToGuide(reason) {
    return !!w.MimirRuntimeTruth?.routeBlockedWebGpuToGuide?.(reason);
  }
  function patchWebGpuFallbackAnswer() {
    w.MimirRuntimeTruth?.patchWebGpuFallbackAnswer?.();
  }
  function label() {
    w.MimirRuntimeLabels?.normalizeLegacyLabels?.();
  }
  function run() {
    if (p0ReadyShell()) {
      d.body?.classList.remove("mimir-clean-chat-shell", "mimir-send-in-dock");
      return;
    }
    w.MimirRuntimeCleanShell?.applyCleanShell?.();
    w.MimirRuntimeMobileAnchors?.fixPrimarySend?.();
    w.MimirRuntimeCleanShell?.dockPrimarySend?.();
    routeBlockedWebGpuToGuide("run");
    label();
    patchWebGpuFallbackAnswer();
    w.MimirRuntimeMobileAnchors?.markMobileFirstChatReady?.();
    w.MimirRuntimeMobileAnchors?.bindPrimaryAnchors?.();
    w.MimirRuntimeMobileAnchors?.openHash?.();
  }
  d.readyState === "loading"
    ? d.addEventListener("DOMContentLoaded", run)
    : run();
  d.addEventListener(
    "click",
    (event) => w.MimirRuntimeMobileAnchors?.handleMobileTap?.(event),
    true,
  );
  w.addEventListener("hashchange", () =>
    w.MimirRuntimeMobileAnchors?.openHash?.(),
  );
  w.addEventListener("load", run, { once: true });
  [
    "mmir-backend-profiles-updated",
    "mmir-live-model-proof-updated",
    "mmir-chat-modes-updated",
    "mmir-route-chips-ready",
  ].forEach((n) => w.addEventListener(n, run));
  let i = 0,
    t = setInterval(() => {
      run();
      if (++i >= 600) clearInterval(t);
    }, 500);
})();
