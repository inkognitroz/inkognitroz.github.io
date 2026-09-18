/* JARVIS presentation adapter. P0 remains the only conversation/router owner.
 * No model calls, auth tokens, history copies, device tools or camera access.
 */
(function (w, d) {
  'use strict';
  if (w.MmirJarvisSkin) return;
  const source = d.currentScript && d.currentScript.src;
  const VERSION = '20260918-jarvis-v1';
  let app, panel, message, talk, consent, autoListen, recognition = null;
  let enabled = false, session = false, generation = 0, speaking = false;
  let pending = null, timer = null, speechTimer = null, observer = null;
  let skinRequest = 0, cssPromise = null, turnDeadline = null;
  const byId = id => d.getElementById(id);
  const busy = () => byId('p0-composer')?.getAttribute('aria-busy') === 'true';
  const assistants = () => Array.from(byId('p0-transcript')?.querySelectorAll('.p0-message-assistant') || []);
  const idOf = el => el.getAttribute('data-p0-message-id');
  const active = () => enabled && d.visibilityState !== 'hidden';

  function notify(text, phase = 'idle') {
    if (message) message.textContent = text;
    if (panel) panel.dataset.phase = phase;
    if (talk) {
      talk.textContent = recognition ? 'Stopp lytting' : speaking ? 'Avbryt og snakk' : 'Snakk med MMIR';
      talk.setAttribute('aria-pressed', recognition ? 'true' : 'false');
    }
  }
  function stopAudio() {
    generation++;
    w.clearTimeout(timer); w.clearTimeout(speechTimer);
    timer = speechTimer = null;
    const previous = recognition;
    recognition = null;
    if (previous) {
      previous.onstart = previous.onresult = previous.onerror = previous.onend = null;
      try { previous.abort(); } catch (_) { /* already ended */ }
    }
    if (speaking) { try { w.speechSynthesis?.cancel(); } catch (_) {} }
    speaking = false;
  }
  function pause(text = 'Tale er stoppet. Samtalen er beholdt.') {
    session = false; pending = null; w.clearTimeout(turnDeadline); stopAudio(); notify(text);
  }
  // SpeechRecognition may be remote, even when the selected LLM is local.
  // Require an explicitly public privacy mode; never silently weaken it.
  function publicSpeechAllowed() {
    const label = byId('p0-privacy')?.getAttribute('aria-label') || '';
    return /offentlig modus/i.test(label);
  }
  function ordinaryMicIdle() {
    const state = byId('p0-mic')?.dataset.voiceState;
    return ['available', 'unavailable', 'error', 'denied', 'blocked', 'transcribed'].includes(state);
  }
  function prepareTurn() {
    w.clearTimeout(turnDeadline);
    pending = { ids: new Set(assistants().map(idOf)) };
    turnDeadline = w.setTimeout(() => {
      if (pending) { pending = null; notify('Ingen ferdig svartekst innen tre minutter. Samtalen fortsetter i chatten.'); }
    }, 180000);
  }
  function setDraft(text) {
    const input = byId('p0-input');
    if (!input) return false;
    input.value = text;
    input.dispatchEvent(new w.Event('input', { bubbles: true }));
    return true;
  }
  function sendRecognized(text, previousDraft) {
    const input = byId('p0-input'), form = byId('p0-composer'), send = byId('p0-send');
    if (!active() || !session || !publicSpeechAllowed()) return pause();
    if (/^(?:jarvis[, ]+)?(?:tilbake til (?:vanlig )?chat|avslutt jarvis)[.!?]*$/i.test(text)) { setSkin('chat'); return; }
    // Never overwrite a draft edited while the microphone was listening.
    if (!input || input.value !== previousDraft) return pause('Utkastet ble endret. Taleteksten ble ikke sendt.');
    if (!setDraft(text)) return pause();
    if (busy() || !send || send.disabled || !form?.requestSubmit) {
      return pause('Taleteksten ligger i feltet. Kontroller ruten og trykk Send når den er klar.');
    }
    prepareTurn();
    notify('MMIR behandler spørsmålet …', 'thinking');
    // Goes through the existing P0 submit handler, including all its gates.
    form.requestSubmit();
    scheduleCheck();
  }
  function resumeAfterAnswer() {
    if (active() && session && autoListen?.checked && !busy()) {
      timer = w.setTimeout(() => { if (active() && session && autoListen.checked) listen(); }, 450);
    } else session = false;
  }
  function speak(text) {
    if (!active() || !consent.checked) return;
    if (!publicSpeechAllowed()) return pause('Tale er stoppet fordi personvernmodus ble endret.');
    const synth = w.speechSynthesis;
    if (!synth || !w.SpeechSynthesisUtterance) return pause('Opplesning støttes ikke her. Svaret står i chatten.');
    const voices = synth.getVoices().filter(v => v.localService === true);
    const voice = voices.find(v => /^(nb|nn|no)(-|$)/i.test(v.lang));
    if (!voice) return pause('Ingen lokal norsk stemme er tilgjengelig. Svaret står i chatten.');
    stopAudio();
    const ticket = generation;
    const chunks = text.replace(/https?:\/\/\S+/g, 'lenke i chatten').match(/[\s\S]{1,220}(?:\s|$)|[\s\S]{1,220}/g) || [];
    // Keep spoken output bounded without silently presenting it as the full answer.
    const bounded = text.length > 4800 ? chunks.join('').slice(0,4600) + ' Resten av svaret står i chatten.' : text;
    const queue = bounded.replace(/https?:\/\/\S+/g, 'lenke i chatten').match(/[\s\S]{1,220}(?:\s|$)|[\s\S]{1,220}/g) || [];
    speaking = true;
    notify('Leser MMIR-svaret. Trykk mikrofonen for å avbryte.', 'speaking');
    const next = () => {
      if (ticket !== generation || !active()) return;
      const part = queue.shift();
      if (!part) { speaking = false; notify('Svaret er ferdig.'); resumeAfterAnswer(); return; }
      const utterance = new w.SpeechSynthesisUtterance(part);
      utterance.lang = 'nb-NO'; utterance.voice = voice; utterance.rate = 1;
      utterance.onend = () => { w.clearTimeout(speechTimer); next(); };
      utterance.onerror = () => { if (ticket === generation) pause('Opplesning feilet. Svaret er bevart i chatten.'); };
      speechTimer = w.setTimeout(() => { if (ticket === generation) pause('Opplesningen stoppet. Svaret er bevart i chatten.'); }, 30000);
      try { synth.speak(utterance); } catch (_) { pause('Opplesning er blokkert i nettleseren.'); }
    };
    next();
  }
  function checkAnswer() {
    if (!enabled || !pending) return;
    if (busy()) return;
    const fresh = assistants().filter(el => !pending.ids.has(idOf(el)));
    // A slow P0 preflight may run before aria-busy changes. Wait for its
    // real transcript/busy mutations; do not time out or poll every 50 ms.
    if (!fresh.length) return;
    const answer = fresh[fresh.length - 1].querySelector('.p0-message-body');
    const text = answer?.textContent?.trim();
    if (!text) { pending = null; return pause('MMIR returnerte ikke svartekst.'); }
    pending = null; w.clearTimeout(turnDeadline);
    if (consent.checked) speak(text);
    else notify('Svaret står i samtalen. Slå på tale for opplesning.');
  }
  function scheduleCheck() {
    w.clearTimeout(timer);
    timer = w.setTimeout(checkAnswer, 50);
  }
  function listen() {
    if (!active()) return;
    if (!consent.checked) return notify('Godkjenn talebruk nedenfor før mikrofonen startes.', 'attention');
    if (!publicSpeechAllowed()) return pause('Nettlesertale er sperret i privat eller ukjent modus. Skriv spørsmålet i chatten.');
    if (!ordinaryMicIdle()) return pause('Den vanlige mikrofonen er fortsatt aktiv. Vent til den er ferdig.');
    if (recognition) return pause();
    if (busy()) {
      byId('p0-send')?.click();
      return pause('Det pågående svaret stoppes. Trykk Snakk igjen når chatten er klar.');
    }
    const input = byId('p0-input');
    if (!input || input.value.trim()) return notify('Send eller tøm det eksisterende utkastet før du snakker.', 'attention');
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) return pause('Talegjenkjenning støttes ikke her. Skriv i chatten.');
    if (w.isSecureContext === false) return pause('Mikrofon krever HTTPS eller localhost.');
    stopAudio();
    session = true;
    const ticket = generation, previousDraft = input.value;
    let finalText = '', gotResult = false;
    try {
      const rec = new Recognition(); recognition = rec;
      rec.lang = 'nb-NO'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
      rec.onstart = () => { if (ticket === generation) notify('Lytter … ett spørsmål sendes når du er ferdig.', 'listening'); };
      rec.onresult = event => {
        if (ticket !== generation || !active()) return;
        for (let i = event.resultIndex || 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) { finalText += event.results[i][0].transcript + ' '; gotResult = true; }
        }
      };
      rec.onerror = event => {
        if (ticket !== generation) return;
        const denied = /not-allowed|service-not-allowed/.test(event.error || '');
        pause(denied ? 'Mikrofontillatelse ble ikke gitt. Skriv i chatten eller endre nettlesertillatelsen.' : 'Talegjenkjenning feilet. Ingen ny melding ble sendt.');
      };
      rec.onend = () => {
        if (ticket !== generation) return;
        recognition = null; w.clearTimeout(timer);
        if (!gotResult || !finalText.trim()) return pause('Ingen taletekst registrert. Trykk Snakk for å prøve igjen.');
        sendRecognized(finalText.trim(), previousDraft);
      };
      notify('Venter på mikrofontillatelse …', 'listening');
      timer = w.setTimeout(() => { if (ticket === generation) pause('Lyttingen ble tidsavbrutt. Ingen melding ble sendt.'); }, 45000);
      rec.start();
    } catch (_) { pause('Mikrofonen kunne ikke startes. Skriv i chatten.'); }
  }
  function mount() {
    app = byId('mmir-p0-app');
    if (!app || !byId('p0-composer') || !byId('p0-input') || !byId('p0-transcript') || !app.querySelector('.p0-chat')) throw new Error('MMIR-chatten er ikke klar.');
    if (panel) return;
    // Warm the local voice inventory before the first spoken answer.
    try { w.speechSynthesis?.getVoices(); } catch (_) {}
    panel = d.createElement('section'); panel.className = 'mmir-jarvis-panel'; panel.hidden = true;
    panel.setAttribute('aria-label', 'Jarvis-visning av MMIR');
    panel.innerHTML = '<div class="mmir-jarvis-reactor" aria-hidden="true"><span></span></div>' +
      '<div class="mmir-jarvis-info"><p class="mmir-jarvis-kicker">J.A.R.V.I.S. / MMIR</p><h2>Samme samtale. Med stemme.</h2>' +
      '<p class="mmir-jarvis-status" role="status" aria-live="polite">Mikrofonen er av.</p>' +
      '<div class="mmir-jarvis-actions"><button type="button" data-jarvis="talk">Snakk med MMIR</button>' +
      '<button type="button" data-jarvis="pause">Stopp tale</button><button type="button" data-jarvis="chat">Tilbake til chat</button></div>' +
      '<label class="mmir-jarvis-consent"><input type="checkbox" data-jarvis="consent"> Tillat tale i denne økten. Nettleseren kan sende lyd til sin taleleverandør. Ferdig taletekst sendes som en vanlig MMIR-melding; svar leses med lokal norsk stemme.</label>' +
      '<label class="mmir-jarvis-consent"><input type="checkbox" data-jarvis="auto"> Lytt igjen etter opplesning (bare mens denne fanen er synlig).</label></div>';
    app.querySelector('.p0-chat').prepend(panel);
    message = panel.querySelector('.mmir-jarvis-status');
    talk = panel.querySelector('[data-jarvis="talk"]');
    consent = panel.querySelector('[data-jarvis="consent"]');
    autoListen = panel.querySelector('[data-jarvis="auto"]');
    talk.addEventListener('click', listen);
    panel.querySelector('[data-jarvis="pause"]').addEventListener('click', () => pause());
    panel.querySelector('[data-jarvis="chat"]').addEventListener('click', () => setSkin('chat'));
    consent.addEventListener('change', () => { if (!consent.checked) pause(); });
    autoListen.addEventListener('change', () => { if (!autoListen.checked && !recognition && !speaking) session = false; });
    // Intercept only voice controls while JARVIS owns them. P0 remains untouched otherwise.
    d.addEventListener('click', event => {
      if (!enabled) return;
      const target = event.target.closest?.('#p0-mic,[data-p0-sidebar-action="voice-input"],[data-p0-action="voice-input"]');
      if (target) { event.preventDefault(); event.stopImmediatePropagation(); listen(); }
    }, true);
    d.addEventListener('keydown', event => { if (enabled && event.key === 'Escape') pause(); }, true);
    // Pending-turn evidence is derived from the original transcript and busy flag.
    observer = new w.MutationObserver(() => {
      if (enabled && !publicSpeechAllowed() && (recognition || session || speaking)) pause('Tale er stoppet fordi personvernmodus ble endret.');
      if (pending) scheduleCheck();
    });
    observer.observe(byId('p0-transcript'), { childList: true, subtree: true, characterData: true });
    observer.observe(byId('p0-composer'), { attributes: true, attributeFilter: ['aria-busy'] });
    if (byId('p0-privacy')) observer.observe(byId('p0-privacy'), { attributes: true, attributeFilter: ['aria-label'] });
    d.addEventListener('visibilitychange', () => { if (d.visibilityState === 'hidden') pause(); });
    w.addEventListener('pagehide', () => pause());
    d.addEventListener('submit', observeSend, true);
    d.addEventListener('keydown', event => {
      if (event.target === byId('p0-input') && event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) observeSend(event);
    }, true);
  }
  function observeSend(event) {
    if (!enabled || busy() || event.defaultPrevented) return;
    if (event.type === 'submit' && event.target !== byId('p0-composer')) return;
    if (!byId('p0-input')?.value.trim()) return;
    stopAudio(); prepareTurn(); scheduleCheck();
  }
  async function setSkin(skin) {
    if (!['chat', 'jarvis'].includes(skin)) throw new Error('Ukjent visning.');
    const request = ++skinRequest;
    mount();
    if ((skin === 'jarvis') === enabled) return skin;
    if (skin === 'jarvis' && !enabled && !ordinaryMicIdle()) throw new Error('Vent til den vanlige mikrofonen er ferdig.');
    if (skin === 'jarvis') {
      if (!cssPromise) cssPromise = new Promise((resolve, reject) => {
        const css = d.createElement('link'); css.id = 'mmir-jarvis-css'; css.rel = 'stylesheet';
        css.href = new URL('p0-jarvis-skin.css?v=' + VERSION, source || d.baseURI).href;
        const timeout = w.setTimeout(() => { css.remove(); reject(new Error('Jarvis-stilen tok for lang tid å laste.')); }, 10000);
        css.onload = () => { w.clearTimeout(timeout); resolve(); };
        css.onerror = () => { w.clearTimeout(timeout); css.remove(); reject(new Error('Jarvis-stilen kunne ikke lastes.')); };
        d.head.append(css);
      }).catch(error => { cssPromise = null; throw error; });
      await cssPromise;
      if (request !== skinRequest) return enabled ? 'jarvis' : 'chat';
    }
    pause(); enabled = skin === 'jarvis'; panel.hidden = !enabled;
    app.dataset.mmirSkin = skin;
    notify(enabled ? 'Mikrofonen er av. Godkjenn tale og trykk Snakk for å starte.' : 'Tale er stoppet.');
    if (!enabled) { consent.checked = false; autoListen.checked = false; }
    w.dispatchEvent(new w.CustomEvent('mmir-skin-changed', { detail: { skin, conversationPreserved: true } }));
    byId('p0-input')?.focus({ preventScroll: true });
    return skin;
  }
  w.MmirJarvisSkin = Object.freeze({ version: VERSION, setSkin, stop: pause });
})(window, document);
