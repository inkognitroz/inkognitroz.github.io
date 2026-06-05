(function () {
  const d = document,
    w = window,
    q = (selector) => d.querySelector(selector);

  function ensureWorkspaceCss() {
    if (q("#mmir-chat-workspace-css")) return;
    const link = d.createElement("link");
    link.id = "mmir-chat-workspace-css";
    link.rel = "stylesheet";
    link.href =
      "./apps/mimir-chat-portal/chat-workspace.css?v=20260525-toolbar-v2";
    d.head.appendChild(link);
  }

  function applyCleanShell() {
    d.body?.classList.add("mimir-clean-chat-shell");
    ensureWorkspaceCss();
    let style = q("#mmir-clean-chat-shell-hotfix");
    if (!style) {
      style = d.createElement("style");
      style.id = "mmir-clean-chat-shell-hotfix";
      d.head.appendChild(style);
    }
    style.textContent =
      '.mimir-composer{display:flex;flex-direction:column;gap:.75rem}.mimir-composer textarea{min-height:9rem}.mimir-composer .composer-bar{display:flex!important;align-items:center!important;gap:.65rem!important;justify-content:flex-end!important;flex-wrap:nowrap!important;white-space:nowrap!important;overflow:visible!important;padding-top:0!important;border-top:0!important}.mimir-composer .composer-context{display:none!important}.mimir-composer .composer-actions{display:flex!important;align-items:center!important;gap:.5rem!important;flex:0 0 auto!important;flex-wrap:nowrap!important;margin-left:auto!important}.mimir-public-chat .mimir-topbar nav a:not([href="#mimir-prompt"]){display:none!important}.mimir-public-chat:not(.mimir-local-return) :is(#mmir-quick-suggestions,#mimir-instant-start,#local-connector,#node-dashboard,#pwa-install,#platform-status,#backend-settings){display:none!important}.mimir-public-chat .runtime-transcript{overflow-y:auto!important;overscroll-behavior:contain}.mimir-public-chat .composer-mode-dock,.mimir-chat-first .composer-mode-dock{display:flex!important;align-items:center!important;gap:.5rem!important;grid-template-areas:none!important;grid-template-columns:none!important;flex-wrap:nowrap!important;white-space:nowrap!important;overflow-x:auto!important;overflow-y:hidden!important;scrollbar-width:none!important}.mimir-public-chat .composer-mode-dock::-webkit-scrollbar,.mimir-chat-first .composer-mode-dock::-webkit-scrollbar{display:none!important}.composer-tool-cluster,.composer-live-cluster{display:flex!important;align-items:center!important;gap:.45rem!important;flex-wrap:nowrap!important;white-space:nowrap!important;flex:0 0 auto!important}.composer-action-feedback{display:none!important}.composer-live-chip{display:inline-flex!important;align-items:center!important;white-space:nowrap!important;flex:0 0 auto}.mimir-clean-chat-shell #primary-chat-link{border-radius:999px;min-width:3rem;min-height:3rem}.mimir-clean-chat-shell #new-backend{border-radius:999px;min-width:2.75rem;min-height:2.75rem}';
    style.textContent +=
      ".mimir-public-chat.mimir-clean-chat-shell #composer-mode-dock,.mimir-public-chat.mimir-clean-chat-shell:not(.mimir-has-chat) #composer-mode-dock{display:flex!important;align-items:center!important;gap:.45rem!important;grid-template-areas:none!important;grid-template-columns:none!important;flex-wrap:nowrap!important;white-space:nowrap!important;overflow:hidden!important}.mimir-public-chat.mimir-send-in-dock .composer-bar{display:none!important}.mimir-public-chat.mimir-send-in-dock #new-backend{display:none!important}.mimir-public-chat.mimir-clean-chat-shell #primary-chat-link{display:inline-flex!important;align-items:center!important;justify-content:center!important;flex:0 0 auto!important;margin-left:auto!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;padding:0!important}.mimir-public-chat.mimir-clean-chat-shell #composer-mode-dock :is(.composer-tool-cluster,.composer-live-cluster){display:flex!important;align-items:center!important;gap:.42rem!important;flex-wrap:nowrap!important;white-space:nowrap!important;flex:0 0 auto!important;width:auto!important;min-width:0!important;max-width:none!important}.mimir-public-chat.mimir-clean-chat-shell #composer-new-chat,.mimir-public-chat.mimir-clean-chat-shell #runtime-node-chip,.mimir-public-chat.mimir-clean-chat-shell #runtime-privacy-chip,.mimir-public-chat.mimir-clean-chat-shell #runtime-tunnel-chip,.mimir-public-chat.mimir-clean-chat-shell #runtime-resource-chip{display:none!important}.mimir-public-chat.mimir-clean-chat-shell #runtime-model-chip{max-width:136px!important;overflow:hidden!important;text-overflow:ellipsis!important}";
  }

  function dockPrimarySend() {
    const dock = q("#composer-mode-dock"),
      send = q("#primary-chat-link"),
      legacy = q("#new-backend");
    if (legacy) {
      legacy.hidden = true;
      legacy.style.display = "none";
    }
    if (dock && send && !dock.contains(send)) {
      dock.appendChild(send);
    }
    if (dock && send) d.body?.classList.add("mimir-send-in-dock");
  }

  w.MimirRuntimeCleanShell = {
    applyCleanShell,
    dockPrimarySend,
  };
})();
