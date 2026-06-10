(function () {
  const d = document;
  const w = window;
  const R = "#mimir-chat-runtime";
  const NOTE_ATTR = "data-mimir-fact-guard-note";
  const NOTE_TEXT =
    "Current fact guard: this looks time-sensitive. Verify with a live, source-aware route before relying on the answer. No hardcoded browser fact patch was applied.";
  const q = (selector) => d.querySelector(selector);

  function esc(value) {
    return String(value || "").replace(
      /[&<>"']/g,
      (match) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[match],
    );
  }

  function asksCurrentFact(value) {
    return /\b(current|today|now|latest|weather|news|stock|price|who is|what is|when is|where is|hvem er|hva er|nyheter|vær|pris)\b/i.test(
      String(value || ""),
    );
  }

  function resetFactPatch() {
    const runtime = q(R);
    if (runtime) delete runtime.dataset.factGuardNoted;
  }

  function patchFactAnswer() {
    const runtime = q(R);
    if (!runtime) return;
    const messages = [...runtime.querySelectorAll(".runtime-message")];
    if (
      !messages.some(
        (element) =>
          element.classList.contains("runtime-message-user") &&
          asksCurrentFact(element.textContent || ""),
      )
    )
      return;

    const last = [
      ...runtime.querySelectorAll(".runtime-message-assistant"),
    ].pop();
    const body = last?.querySelector?.(".runtime-message-body");
    if (!body || body.querySelector("[" + NOTE_ATTR + "]")) return;

    const note = d.createElement("p");
    note.setAttribute(NOTE_ATTR, "source-required");
    note.innerHTML = esc(NOTE_TEXT);
    body.appendChild(note);
    runtime.dataset.factGuardNoted = "source-required";
  }

  let factObserver = null;
  function observeFacts() {
    const runtime = q(R);
    if (!runtime || factObserver) return;
    factObserver = new MutationObserver(() => patchFactAnswer());
    factObserver.observe(runtime, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function run() {
    patchFactAnswer();
    observeFacts();
  }

  d.readyState === "loading"
    ? d.addEventListener("DOMContentLoaded", run)
    : run();
  d.addEventListener(
    "click",
    (event) => {
      if (event.target.closest?.("#primary-chat-link")) {
        resetFactPatch();
        setTimeout(patchFactAnswer, 1200);
      }
    },
    true,
  );
  [
    "mmir-backend-profiles-updated",
    "mmir-live-model-proof-updated",
    "mmir-chat-modes-updated",
    "mmir-route-chips-ready",
  ].forEach((name) => w.addEventListener(name, run));
  w.MimirRuntimeFactGuard = { patchFactAnswer, run };
})();
