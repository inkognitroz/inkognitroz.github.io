(function () {
  "use strict";

  /* ── DOM refs ── */
  const ollamaUrl     = document.getElementById("ollama-url");
  const modelInput    = document.getElementById("model-input");
  const apiKeyInput   = document.getElementById("api-key");
  const testBtn       = document.getElementById("test-connection");
  const statusDot     = document.getElementById("status-dot");
  const statusText    = document.getElementById("status-text");
  const modelChips    = document.getElementById("model-chips");
  const modelDetails  = document.getElementById("model-details");
  const chatWindow    = document.getElementById("chat-window");
  const emptyState    = document.getElementById("chat-empty");
  const userInput     = document.getElementById("user-input");
  const sendBtn       = document.getElementById("send-btn");
  const clearBtn      = document.getElementById("clear-btn");
  const systemPrompt  = document.getElementById("system-prompt");

  /* ── State ── */
  const STORAGE_KEY = "owg-config";
  let messages = [];         /* { role, content }[] */
  let streaming = false;

  /* ── Persistence ── */
  function saveConfig() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        url:    ollamaUrl.value.trim(),
        model:  modelInput.value.trim(),
        system: systemPrompt.value.trim()
      }));
    } catch (_) {}
  }

  function loadConfig() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved) return;
      if (saved.url)    ollamaUrl.value    = saved.url;
      if (saved.model)  modelInput.value   = saved.model;
      if (saved.system) systemPrompt.value = saved.system;
    } catch (_) {}
  }

  /* ── Helpers ── */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setStatus(state, text) {
    statusDot.dataset.state = state;
    statusText.textContent  = text;
  }

  function getBaseUrl() {
    return (ollamaUrl.value.trim() || "http://localhost:11434").replace(/\/$/, "");
  }

  function getHeaders() {
    const headers = { "Content-Type": "application/json" };
    const key = apiKeyInput.value.trim();
    if (key) headers["Authorization"] = "Bearer " + key;
    return headers;
  }

  /* ── Connection test ── */
  async function testConnection() {
    const base = getBaseUrl();
    setStatus("busy", "Testing connection…");
    testBtn.disabled = true;

    try {
      /* Ollama exposes GET /api/tags — also works as a health probe */
      const res = await fetch(base + "/api/tags", {
        method: "GET",
        headers: getHeaders(),
        signal: AbortSignal.timeout(8000)
      });

      if (!res.ok) throw new Error("HTTP " + res.status);

      const data = await res.json();
      const models = (data.models || []).map(m => m.name || m.model || String(m)).filter(Boolean);
      setStatus("ok", "Connected · " + models.length + " model(s) available");
      renderModelChips(models);
    } catch (err) {
      const msg = err.name === "TimeoutError"
        ? "Connection timed out. Is Ollama running?"
        : "Could not reach " + base + ". " + (err.message || "Check the URL and CORS settings.");
      setStatus("err", msg);
      renderModelChips([]);
    } finally {
      testBtn.disabled = false;
      saveConfig();
    }
  }

  /* ── Model chips ── */
  function renderModelChips(models) {
    modelChips.innerHTML = "";
    if (!models.length) {
      modelChips.innerHTML = '<span style="color:var(--muted);font-size:.82rem">No models found — check connection first.</span>';
      modelDetails.open = false;
      return;
    }
    models.forEach(name => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "model-chip";
      btn.textContent = name;
      btn.title = "Use " + name;
      if (name === modelInput.value.trim()) btn.setAttribute("aria-selected", "true");
      btn.addEventListener("click", () => {
        modelInput.value = name;
        modelChips.querySelectorAll(".model-chip").forEach(c => c.removeAttribute("aria-selected"));
        btn.setAttribute("aria-selected", "true");
        saveConfig();
      });
      modelChips.appendChild(btn);
    });
    modelDetails.open = true;
  }

  /* ── Chat rendering ── */
  function renderMessages() {
    const existingMsgs = chatWindow.querySelectorAll(".msg");
    existingMsgs.forEach(el => el.remove());

    const empty = !messages.length;
    emptyState.hidden = !empty;

    messages.forEach((msg, idx) => {
      const wrap = document.createElement("div");
      wrap.className = "msg " + msg.role;
      wrap.dataset.idx = idx;

      const bubble = document.createElement("div");
      bubble.className = "msg-bubble";
      bubble.textContent = msg.content;

      const meta = document.createElement("div");
      meta.className = "msg-meta";
      meta.textContent = msg.role === "user" ? "You" : (modelInput.value.trim() || "Assistant");

      wrap.appendChild(bubble);
      wrap.appendChild(meta);
      chatWindow.appendChild(wrap);
    });

    scrollBottom();
  }

  function scrollBottom() {
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  /* ── Streaming response ── */
  async function sendMessage() {
    if (streaming) return;
    const text = userInput.value.trim();
    if (!text) return;

    const model = modelInput.value.trim();
    if (!model) {
      setStatus("err", "Enter a model name before chatting.");
      return;
    }

    userInput.value = "";
    autoGrow(userInput);

    messages.push({ role: "user", content: text });
    renderMessages();

    /* placeholder assistant message */
    const assistantMsg = { role: "assistant", content: "" };
    messages.push(assistantMsg);

    /* append placeholder element */
    const wrap = document.createElement("div");
    wrap.className = "msg assistant";
    const bubble = document.createElement("div");
    bubble.className = "msg-bubble cursor-blink";
    const meta = document.createElement("div");
    meta.className = "msg-meta";
    meta.textContent = model;
    wrap.appendChild(bubble);
    wrap.appendChild(meta);
    chatWindow.appendChild(wrap);
    scrollBottom();

    streaming = true;
    sendBtn.disabled = true;
    setStatus("busy", "Generating…");

    const base = getBaseUrl();
    const body = {
      model,
      messages: buildPayload(),
      stream: true
    };

    try {
      const res = await fetch(base + "/api/chat", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000)
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error("HTTP " + res.status + (errText ? ": " + errText : ""));
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter(l => l.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            const token  = parsed.message && parsed.message.content ? parsed.message.content : "";
            accumulated += token;
            bubble.textContent = accumulated;
            scrollBottom();
          } catch (_) { /* partial line */ }
        }
      }

      bubble.classList.remove("cursor-blink");
      assistantMsg.content = accumulated;
      setStatus("ok", "Done");
    } catch (err) {
      bubble.classList.remove("cursor-blink");
      const errMsg = err.name === "TimeoutError"
        ? "Request timed out. The model may be loading — try again."
        : (err.message || "Unknown error");
      bubble.textContent = "⚠ " + errMsg;
      bubble.style.color = "var(--danger, #ff6b6b)";
      assistantMsg.content = "⚠ " + errMsg;
      setStatus("err", errMsg);
    } finally {
      streaming = false;
      sendBtn.disabled = false;
      saveConfig();
    }
  }

  function buildPayload() {
    const sys = systemPrompt.value.trim();
    const base = sys ? [{ role: "system", content: sys }] : [];
    return base.concat(messages.slice(0, -1)); /* exclude placeholder */
  }

  /* ── Auto-grow textarea ── */
  function autoGrow(el) {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 140) + "px";
  }

  /* ── Clear chat ── */
  function clearChat() {
    if (streaming) return;
    messages = [];
    renderMessages();
    setStatus("", "");
    statusDot.dataset.state = "";
  }

  /* ── Event listeners ── */
  testBtn.addEventListener("click", testConnection);

  sendBtn.addEventListener("click", sendMessage);

  clearBtn.addEventListener("click", clearChat);

  userInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  userInput.addEventListener("input", () => autoGrow(userInput));

  [ollamaUrl, modelInput, apiKeyInput].forEach(el => {
    el.addEventListener("change", saveConfig);
  });

  /* ── Init ── */
  loadConfig();
  renderMessages();
})();
