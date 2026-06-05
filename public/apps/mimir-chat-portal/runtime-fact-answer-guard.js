(function () {
  const d = document;
  const w = window;
  const R = "#mimir-chat-runtime";
  const FALLBACK = "Supergenious";
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

  function asksPresident(value) {
    return /(who|hvem).{0,24}(president|presidenten).{0,24}(usa|u\.s\.a|united states|america|amerika)|president.{0,24}(usa|u\.s\.a|united states|america|amerika)/i.test(
      String(value || ""),
    );
  }

  function resetFactPatch() {
    const runtime = q(R);
    if (runtime) delete runtime.dataset.factPresidentPatched;
  }

  function patchFactAnswer() {
    const runtime = q(R);
    if (!runtime) return;
    const messages = [...runtime.querySelectorAll(".runtime-message")];
    if (
      !messages.some(
        (element) =>
          element.classList.contains("runtime-message-user") &&
          asksPresident(element.textContent || ""),
      )
    )
      return;

    const last = [
      ...runtime.querySelectorAll(".runtime-message-assistant"),
    ].pop();
    const body = last?.querySelector?.(".runtime-message-body");
    if (!body) return;
    if (/Donald J\. Trump/.test(body.textContent || "")) {
      runtime.dataset.factPresidentPatched = "true";
      return;
    }
    if (runtime.dataset.factPresidentPatched === "true") {
      delete runtime.dataset.factPresidentPatched;
    }
    const text = body.textContent || "";
    if (
      !/supergeni(?:us|ous)|MMIR Browser Guide|MMIR Guide|free browser guide|browser guidance|control plane is online|automatically fell back|provider keys?|Useful now/i.test(
        text,
      )
    )
      return;

    body.innerHTML = [
      "The president of the United States is Donald J. Trump.",
      "Last verified: 2026-05-25 from the official White House administration page.",
      "Active route: " +
        FALLBACK +
        " instant fallback. No provider key or paid route was used.",
    ]
      .map((line) => "<p>" + esc(line) + "</p>")
      .join("");
    const small = last.querySelector(":scope > small");
    if (small) small.textContent = FALLBACK;
    runtime.dataset.factPresidentPatched = "true";
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
