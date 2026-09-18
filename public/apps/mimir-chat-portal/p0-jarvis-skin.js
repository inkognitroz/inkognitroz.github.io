/* JARVIS is a presentation client of the existing MMIR conversation contract.
 * No provider, credential, history, fallback route or microphone starts here
 * without the existing MMIR policy and an explicit per-session user action. */
(function (w, d) {
  'use strict';
  if (w.MmirJarvisSkin) return;
  const VERSION = '20260918-jarvis-v3';
  const source = d.currentScript?.src, U = w.MmirSpeechUtils;
  const byId = id => d.getElementById(id);
  const timers = { mic: null, answer: null, resume: null, speech: null, voices: null };
  let app, panel, status, talk, micConsent, ttsConsent, auto, transcript, options;
  let enabled = false, epoch = 0, session = false, recognition = null, probing = false;
  let speaking = false, output = null, current = null, capture = null, waitingVoice = null;
  let cssPromise = null, skinRequest = 0, lastMetrics = null, lastWriter = null;
  let backend = null, prefs = { voice: '', rate: 1, inputMode: 'send', processing: 'auto', readMode: 'full', early: true };
  const active = () => enabled && d.visibilityState !== 'hidden';
  const busy = () => backend?.snapshot().busy || backend?.snapshot().phase === 'preflight' || byId('p0-composer')?.getAttribute('aria-busy') === 'true';
  const field = name => panel?.querySelector('[data-jarvis="' + name + '"]');
  const clock = () => w.performance.now();
  function clear(name) { w.clearTimeout(timers[name]); timers[name] = null; }
  function policy() { return backend?.snapshot().policy || { mode: 'unknown', remoteSTT: false, localSTT: false, localTTS: false }; }
  function settings() {
    try {
      const saved = JSON.parse(w.localStorage.getItem('mmir-jarvis-preferences-v1') || '{}');
      for (const key of ['voice', 'inputMode', 'processing', 'readMode']) if (typeof saved[key] === 'string') prefs[key] = saved[key];
      if (typeof saved.rate === 'number' && saved.rate >= .7 && saved.rate <= 1.4) prefs.rate = saved.rate;
      prefs.early = saved.early !== false;
    } catch (_) {}
    if (!['send', 'review'].includes(prefs.inputMode)) prefs.inputMode = 'send';
    if (!['auto', 'local'].includes(prefs.processing)) prefs.processing = 'auto';
    if (!['full', 'excerpt'].includes(prefs.readMode)) prefs.readMode = 'full';
  }
  function savePrefs() { try { w.localStorage.setItem('mmir-jarvis-preferences-v1', JSON.stringify(prefs)); } catch (_) {} }
  function notify(text, phase = 'idle') {
    if (!panel) return;
    status.textContent = text; panel.dataset.phase = phase;
    talk.textContent = recognition ? 'Stopp lytting' : speaking ? 'Avbryt og snakk' : 'Snakk med MMIR';
    talk.setAttribute('aria-pressed', recognition ? 'true' : 'false');
    field('mic-state').textContent = recognition ? 'Mikrofon på' : 'Mikrofon av';
    field('mic-state').dataset.active = recognition ? 'true' : 'false';
  }
  function stopAudio() {
    epoch++;
    for (const key of ['mic', 'speech', 'resume', 'voices']) clear(key);
    if (waitingVoice) { const cancel = waitingVoice; waitingVoice = null; cancel(); }
    const old = recognition; recognition = null; probing = false;
    if (old) { old.onstart = old.onresult = old.onerror = old.onend = null; try { old.abort(); } catch (_) {} }
    if (speaking || output) { try { w.speechSynthesis?.cancel(); } catch (_) {} }
    speaking = false; output = null;
  }
  function pause(text = 'Tale er stoppet. Samtalen og utkastet er beholdt.') {
    session = false; current = null; clear('answer'); stopAudio(); notify(text);
  }
  function ordinaryMicIdle() {
    const state = byId('p0-mic')?.dataset.voiceState;
    return w.MmirJarvisCoreVoice?.isIdle() === true &&
      ['available', 'unavailable', 'error', 'denied', 'blocked', 'transcribed'].includes(state);
  }
  function localVoices() {
    try { return w.speechSynthesis.getVoices().filter(v => v.localService === true && /^(nb|nn|no)(-|$)/i.test(v.lang)); }
    catch (_) { return []; }
  }
  function refreshVoices() {
    const select = field('voice'); if (!select) return;
    select.replaceChildren();
    const voices = localVoices(), def = d.createElement('option');
    def.value = ''; def.textContent = voices.length ? 'Automatisk lokal norsk stemme' : 'Venter på lokal norsk stemme'; select.append(def);
    for (const voice of voices) { const o = d.createElement('option'); o.value = voice.voiceURI || voice.name; o.textContent = voice.name + ' (' + voice.lang + ')'; select.append(o); }
    select.value = prefs.voice;
    if (select.selectedIndex < 0) select.value = '';
  }
  function chooseVoice() { const voices = localVoices(); return voices.find(v => (v.voiceURI || v.name) === prefs.voice) || voices[0] || null; }
  function waitForVoice(ticket) {
    const ready = chooseVoice(); if (ready) return Promise.resolve(ready);
    return new Promise(resolve => {
      const synth = w.speechSynthesis;
      const finish = value => { clear('voices'); synth?.removeEventListener?.('voiceschanged', changed); if (waitingVoice === cancel) waitingVoice = null; resolve(value); };
      const cancel = () => finish(null);
      const changed = () => { refreshVoices(); const voice = chooseVoice(); if (voice || ticket !== epoch) finish(voice); };
      waitingVoice = cancel;
      synth?.addEventListener?.('voiceschanged', changed);
      timers.voices = w.setTimeout(() => finish(null), 2500);
      changed();
    });
  }
  function resume() {
    if (active() && session && auto.checked && micConsent.checked && !busy() && !byId('p0-input')?.value.trim()) {
      clear('resume'); const ticket = epoch;
      timers.resume = w.setTimeout(() => { if (ticket === epoch && active() && session && auto.checked) listen(); }, 450);
    } else session = false;
  }
  function renderTruth() {
    if (!panel) return;
    const s = backend?.snapshot(); if (!s) return;
    field('privacy').textContent = ({ public: 'Offentlig', private: 'Privat', superprivate: 'Superprivat' })[s.policy.mode] || 'Ukjent – tale sperret';
    field('route').textContent = 'Valgt rute: ' + (s.selectedRoute.label || 'Ikke tilgjengelig');
    field('writer').textContent = lastWriter?.identity_verified === true
      ? 'Svarforfatter: ' + (lastWriter.model_display_name || lastWriter.model_id || 'Ukjent')
      : 'Svarforfatter: ikke verifisert';
    field('conversation').textContent = 'Økt ' + s.conversationId.slice(0, 8) + (s.turnId ? ' · tur ' + s.turnId.slice(0, 8) : '');
    const m = lastMetrics;
    field('latency').textContent = m ? 'Svar: ' + (m.elapsedMs / 1000).toFixed(1) + ' s' + (m.firstTextMs != null ? ' · første tekst: ' + (m.firstTextMs / 1000).toFixed(1) + ' s' : '') + (m.firstAudioMs != null ? ' · første lyd: ' + (m.firstAudioMs / 1000).toFixed(1) + ' s' : '') : 'Svartid: ikke målt';
    field('usage').textContent = 'Tokens: ' + (typeof m?.tokens === 'number' ? m.tokens + ' (rapportert)' : 'ikke tilgjengelig') + ' · kostnad: ikke tilgjengelig';
  }
  async function drain() {
    const item = output;
    if (!item || item.running || !active() || !ttsConsent.checked || !policy().localTTS) return;
    item.running = true;
    if (!item.voice) {
      notify('Venter på lokal norsk stemme …', 'preparing');
      item.voice = await waitForVoice(item.epoch);
      if (item !== output || item.epoch !== epoch || !active() || !ttsConsent.checked || !policy().localTTS) return;
      if (!item.voice) return pause('Ingen lokal norsk stemme er tilgjengelig. Installer en norsk systemstemme og bruk Test stemmen. Svaret står i chatten.');
    }
    const part = item.queue.shift();
    if (!part) {
      item.running = false; speaking = false;
      if (item.done) { output = null; notify('Svaret er ferdig.'); resume(); }
      else notify('Venter på neste setning fra MMIR …', 'thinking');
      return;
    }
    const utterance = new w.SpeechSynthesisUtterance(part);
    utterance.lang = item.voice.lang || 'nb-NO'; utterance.voice = item.voice; utterance.rate = prefs.rate;
    speaking = true; notify('Leser MMIR-svaret. Du kan stoppe når som helst.', 'speaking');
    utterance.onstart = () => {
      if (item !== output || item.epoch !== epoch) return;
      if (current && current.firstAudioMs == null) current.firstAudioMs = clock() - current.startedAt;
      if (lastMetrics && current?.firstAudioMs != null) { lastMetrics.firstAudioMs = current.firstAudioMs; renderTruth(); }
    };
    utterance.onend = () => { if (item === output && item.epoch === epoch) { clear('speech'); item.running = false; drain(); } };
    utterance.onerror = () => { if (item === output && item.epoch === epoch) pause('Opplesningen feilet. Svaret er bevart. Prøv Test stemmen eller les i chatten.'); };
    timers.speech = w.setTimeout(() => { if (item === output) pause('Opplesningen ble tidsavbrutt. Svaret er bevart i chatten.'); }, 30000);
    try { w.speechSynthesis.speak(utterance); } catch (_) { pause('Nettleseren blokkerte opplesningen. Bruk Test stemmen med et nytt trykk.'); }
  }
  function enqueue(raw, done = false) {
    if (!active() || !ttsConsent.checked || !policy().localTTS) return;
    if (!w.speechSynthesis || !w.SpeechSynthesisUtterance) return pause('Opplesning støttes ikke her. Svaret står i chatten.');
    if (!output) output = { epoch, queue: [], running: false, voice: null, done: false, length: 0, capped: false };
    let formatted = U.text(raw);
    if (output.length + formatted.length > 32000) {
      if (output.capped) formatted = '';
      else { formatted = 'Opplesningsgrensen er nådd. Resten av svaret står i chatten.'; output.capped = true; }
    }
    output.length += formatted.length; output.queue.push(...U.chunks(formatted)); output.done = output.done || done;
    drain();
  }
  function onCore(event) {
    if (!enabled) return;
    if (event.type === 'conversation-changed') { lastMetrics = lastWriter = null; capture = null; showCapture(''); pause('Ny samtale. Mikrofonen er av.'); renderTruth(); return; }
    if (event.type === 'policy-changed') { pause('Personvernmodus er endret. Tale er stoppet. Start på nytt med den nye policyen.'); renderTruth(); return; }
    if (event.type === 'turn-requested') {
      stopAudio(); clear('answer');
      current = { turnId: event.turnId, conversationId: event.conversationId, messageId: null, startedAt: event.at, firstAudioMs: null, received: '', rest: '', streamed: false };
      lastWriter = lastMetrics = null;
      const ticket = current;
      timers.answer = w.setTimeout(() => { if (current === ticket) pause('Ingen ferdig svartekst innen tre minutter. Kontroller MMIR-ruten i chatten.'); }, 180000);
      notify('MMIR kontrollerer forespørselen …', 'thinking'); renderTruth(); return;
    }
    if (!current || event.conversationId !== current.conversationId || event.turnId !== current.turnId) return;
    if (event.type === 'answer-bound') { current.messageId = event.messageId; return; }
    if (event.type === 'turn-start') { notify('Venter på svar fra MMIR …', 'thinking'); renderTruth(); return; }
    if (event.type === 'turn-rejected' || event.type === 'turn-cancelled' || event.type === 'turn-failed') {
      const text = event.type === 'turn-rejected' ? (event.statusText || 'MMIR sendte ikke forespørselen. Kontroller ruten og utkastet.')
        : event.type === 'turn-failed' ? 'MMIR-ruten feilet. Svaret og feildetaljene står i chatten. Et nytt forsøk må startes med Prøv igjen ved svaret.' : 'Forespørselen er stoppet.';
      pause(text); renderTruth(); return;
    }
    if (event.messageId !== current.messageId) return;
    if (event.type === 'answer-delta') {
      if (current.finalized) return;
      current.received += event.text; current.rest += event.text;
      if (current.received.length > 250000) return pause('Svaret er for stort for tale. Det fortsetter i chatten.');
      if (prefs.early && prefs.readMode === 'full' && ttsConsent.checked) {
        const parts = U.sentences(current.rest); current.rest = parts.rest;
        for (const part of parts.complete) { current.streamed = true; enqueue(part); }
      }
      return;
    }
    if (event.type === 'answer-final') {
      if (current.finalized) return;
      current.finalized = true; clear('answer');
      lastMetrics = { ...event.metrics, firstAudioMs: current.firstAudioMs }; lastWriter = event.writer; renderTruth();
      if (!ttsConsent.checked) { session = false; notify('Svaret står i samtalen. Lokal opplesning er av.'); return; }
      let text = event.text;
      if (current.streamed) {
        if (!text.startsWith(current.received)) return pause('MMIR oppdaterte svarteksten. Opplesningen er stoppet; les det endelige svaret i chatten.');
        text = current.rest + text.slice(current.received.length);
      } else if (prefs.readMode === 'excerpt') {
        const full = U.text(text), first = full.split(/\n\s*\n/)[0];
        if (full.length > first.length) text = 'Utdrag, ikke hele svaret. ' + first + ' Resten, inkludert eventuelle forbehold, står i chatten. Velg Hele svaret for full opplesning.';
      }
      enqueue(text, true);
    }
  }
  function setDraft(text) {
    const input = byId('p0-input'); if (!input) return false;
    input.value = text; input.dispatchEvent(new w.Event('input', { bubbles: true })); return true;
  }
  function showCapture(text, final = false) {
    transcript.value = text; transcript.readOnly = !final;
    field('capture').hidden = !text; field('send-capture').hidden = !final; field('draft-capture').hidden = !final;
  }
  function submitCapture() {
    if (!capture || capture.sent || !active() || capture.conversation !== backend.snapshot().conversationId) return;
    const text = transcript.value.trim(), input = byId('p0-input');
    if (!text) return;
    if (!input || input.value !== capture.originalDraft) return notify('Utkastet ble endret. Taleteksten er bevart separat og er ikke sendt.', 'attention');
    if (busy()) return notify('MMIR svarer fortsatt. Taleteksten er bevart; vent før du sender.', 'attention');
    if (!micConsent.checked || !policy().localSTT) return pause('Samtykke eller personvernpolicy er endret. Taleteksten er ikke sendt.');
    if (/^(?:jarvis[, ]+)?(?:tilbake til (?:vanlig )?chat|avslutt jarvis)[.!?]*$/i.test(text)) { setSkin('chat'); return; }
    setDraft(text); capture.sent = true;
    const form = byId('p0-composer'), send = byId('p0-send');
    if (!form?.requestSubmit || !send || send.disabled) { session = false; return notify('Taleteksten ligger i skrivefeltet. Kontroller ruten før du trykker Send.', 'attention'); }
    form.requestSubmit(); // All privacy, routing, context and spend gates remain in P0.
  }
  async function verifyLocal(Recognition, rec) {
    if (!('processLocally' in rec) || typeof Recognition.available !== 'function') return 'unsupported';
    let timer;
    try { return await Promise.race([Recognition.available({ langs: ['nb-NO'], processLocally: true, quality: 'dictation' }), new Promise(resolve => { timer = w.setTimeout(() => resolve('unknown'), 2500); })]); }
    catch (_) { return 'unknown'; } finally { w.clearTimeout(timer); }
  }
  async function listen() {
    if (!active()) return;
    // Stopping owned output always precedes ALL draft, permission and mic gates.
    if (recognition || probing) return pause();
    const wasSpeaking = speaking || output;
    stopAudio(); current = null; clear('answer');
    if (!micConsent.checked) return notify('Godkjenn mikrofonbruk i denne økten før du snakker.', 'attention');
    if (!ordinaryMicIdle()) return pause('Den vanlige mikrofonen er aktiv. Vent til den er ferdig.');
    if (busy()) { backend.stop?.(); return pause('MMIR-svaret stoppes. Trykk Snakk igjen når chatten er klar.'); }
    const input = byId('p0-input');
    if (!input || input.value.trim()) return notify((wasSpeaking ? 'Opplesningen er stoppet. ' : '') + 'Send eller tøm utkastet før et nytt opptak.', 'attention');
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) return pause('Talegjenkjenning støttes ikke her. Skriv i chatten.');
    if (w.isSecureContext === false) return pause('Mikrofon krever HTTPS eller localhost.');
    if (!policy().localSTT) return pause('Personvernmodus er ukjent. Tale er sperret; skriv i chatten.');
    const ticket = epoch, conversation = backend.snapshot().conversationId;
    let rec;
    try { rec = new Recognition(); } catch (_) { return pause('Mikrofonen kunne ikke klargjøres. Bruk tekst.'); }
    probing = true; notify('Kontrollerer norsk talegjenkjenning …', 'preparing');
    const local = await verifyLocal(Recognition, rec);
    if (ticket !== epoch || !active() || !micConsent.checked || backend.snapshot().conversationId !== conversation) return;
    probing = false;
    const mustBeLocal = prefs.processing === 'local' || !policy().remoteSTT;
    if (local === 'available') {
      try { rec.processLocally = true; } catch (_) { return pause('Nettleseren avviste lokal behandling. Ingen lyd er sendt.'); }
      if (rec.processLocally !== true) return pause('Lokal behandling kunne ikke bekreftes. Ingen lyd er sendt.');
      field('provider').textContent = 'Tale inn: norsk på enheten (nettleseren bekrefter språkpakken)';
    } else if (mustBeLocal) {
      return pause('Lokal norsk talegjenkjenning er ikke bekreftet (' + local + '). Ingen ekstern tjeneste ble startet. Lokal opplesning kan fortsatt brukes.');
    } else {
      try { if ('processLocally' in rec) rec.processLocally = false; } catch (_) { return pause('Talegjenkjenningen kunne ikke konfigureres. Ingen lyd er sendt.'); }
      field('provider').textContent = 'Tale inn: nettleserens tjeneste – lyd kan sendes eksternt';
    }
    if (!ordinaryMicIdle() || busy() || input.value.trim()) return pause('Chatten eller mikrofonen endret tilstand. Utkastet er beholdt; prøv igjen.');
    session = true; recognition = rec; capture = { originalDraft: input.value, sent: false, conversation };
    rec.lang = 'nb-NO'; rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    const finals = new Map(); let finalText = '';
    rec.onstart = () => { if (ticket === epoch) notify('Lytter … ' + (prefs.inputMode === 'review' ? 'du ser over teksten før sending.' : 'ett spørsmål sendes når du er ferdig.'), 'listening'); };
    rec.onresult = event => {
      if (ticket !== epoch || !active()) return;
      const interim = [];
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finals.set(i, result[0].transcript); else interim.push(result[0].transcript);
      }
      finalText = [...finals.entries()].sort((a, b) => a[0] - b[0]).map(([, value]) => value).join(' ').trim();
      showCapture([finalText, ...interim].filter(Boolean).join(' '));
    };
    rec.onerror = event => {
      if (ticket !== epoch) return;
      showCapture(transcript.value, Boolean(transcript.value));
      pause(U.errors[event.error] || 'Talegjenkjenningen feilet. Teksten er bevart; prøv et nytt opptak eller skriv i chatten.');
    };
    rec.onend = () => {
      if (ticket !== epoch || !active()) return;
      recognition = null; clear('mic'); rec.onresult = rec.onend = rec.onerror = null;
      if (!finalText) { showCapture(transcript.value, Boolean(transcript.value)); return pause(U.errors['no-speech']); }
      showCapture(finalText, true);
      if (prefs.inputMode === 'review') { session = false; notify('Se over taleteksten før du sender.', 'review'); }
      else submitCapture();
    };
    timers.mic = w.setTimeout(() => { if (ticket === epoch) { showCapture(transcript.value, Boolean(transcript.value)); pause('Opptaket ble tidsavbrutt etter 45 sekunder. Taleteksten er bevart, men ikke sendt.'); } }, 45000);
    notify('Venter på mikrofontillatelse …', 'listening');
    try { rec.start(); } catch (_) { pause('Mikrofonen kunne ikke startes. Kontroller nettlesertillatelsen eller bruk tekst.'); }
  }
  async function doctor() {
    const ticket = epoch, Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    let local = 'unsupported';
    if (Recognition) { try { local = await verifyLocal(Recognition, new Recognition()); } catch (_) {} }
    if (ticket !== epoch || !active()) return;
    let permission = 'ukjent – kontrolleres ved oppstart';
    try { permission = (await w.navigator.permissions.query({ name: 'microphone' })).state; } catch (_) {}
    if (ticket !== epoch || !active()) return;
    field('diagnostic').textContent = 'HTTPS: ' + (w.isSecureContext ? 'ja' : 'nei') + ' · gjenkjenning: ' + (Recognition ? 'støttet' : 'ikke støttet') + ' · norsk lokalt: ' + local + ' · lokale norske stemmer: ' + localVoices().length + ' · mikrofontillatelse: ' + permission + '. Ingen opptak eller modellkall er startet.';
    renderTruth(); refreshVoices();
  }
  function mount() {
    app = byId('mmir-p0-app'); backend = w.MmirP0Conversation;
    if (!U || backend?.version !== 1 || !app || !byId('p0-composer') || !app.querySelector('.p0-chat')) throw new Error('MMIRs samtalekontrakt er ikke klar. Last siden på nytt; vanlig chat er beholdt.');
    if (panel) return;
    settings();
    panel = d.createElement('section'); panel.className = 'mmir-jarvis-panel'; panel.hidden = true; panel.setAttribute('aria-label', 'Jarvis-visning av MMIR');
    panel.innerHTML = '<div class="mmir-jarvis-reactor" aria-hidden="true"><span></span></div><div class="mmir-jarvis-info">' +
      '<p class="mmir-jarvis-kicker">J.A.R.V.I.S. / MMIR</p><h2>Samme samtale. Med stemme.</h2><span class="mmir-jarvis-mic-state" data-jarvis="mic-state">Mikrofon av</span>' +
      '<div class="mmir-jarvis-actions">' +
      '<button type="button" data-jarvis="talk">Snakk med MMIR</button><button type="button" data-jarvis="pause">Stopp tale</button><button type="button" data-jarvis="chat">Tilbake til chat</button></div><p class="mmir-jarvis-status" role="status" aria-live="polite">Mikrofonen er av.</p>' +
      '<div class="mmir-jarvis-capture" data-jarvis="capture" hidden><label>Dette hører Jarvis<textarea data-jarvis="transcript" rows="2" readonly aria-live="off"></textarea></label>' +
      '<div class="mmir-jarvis-actions"><button type="button" data-jarvis="send-capture" hidden>Send taleteksten</button><button type="button" data-jarvis="draft-capture" hidden>Legg i skrivefeltet</button></div></div>' +
      '<details data-jarvis="options" open><summary>Talevalg og samtykke</summary>' +
      '<label class="mmir-jarvis-consent"><input type="checkbox" data-jarvis="consent"> Tillat mikrofon i denne økten. I offentlig modus kan nettleseren sende lyd til sin taleleverandør. Ferdig tekst sendes gjennom den valgte MMIR-ruten.</label>' +
      '<label class="mmir-jarvis-consent"><input type="checkbox" data-jarvis="tts"> Les svar med en lokal norsk stemme (ingen ekstern taletjeneste).</label>' +
      '<label class="mmir-jarvis-consent"><input type="checkbox" data-jarvis="auto"> Lytt igjen etter opplesning, bare i synlig fane og etter at jeg startet et opptak.</label>' +
      '<div class="mmir-jarvis-settings"><label>Sending<select data-jarvis="input-mode"><option value="send">Send når jeg er ferdig</option><option value="review">La meg se over først</option></select></label>' +
      '<label>Tale inn<select data-jarvis="processing"><option value="auto">Lokal først, ekstern bare i offentlig modus</option><option value="local">Kun verifisert lokal norsk</option></select></label>' +
      '<label>Stemme<select data-jarvis="voice"></select></label><label>Hastighet<select data-jarvis="rate"><option value="0.8">0,8×</option><option value="1">1×</option><option value="1.2">1,2×</option><option value="1.4">1,4×</option></select></label>' +
      '<label>Opplesning<select data-jarvis="read-mode"><option value="full">Hele svaret</option><option value="excerpt">Første avsnitt (merket utdrag)</option></select></label></div>' +
      '<label class="mmir-jarvis-consent"><input type="checkbox" data-jarvis="early"> Les komplette setninger fortløpende når MMIR-ruten bekrefter støtte.</label>' +
      '<label class="mmir-jarvis-consent"><input type="checkbox" data-jarvis="remember"> Husk Jarvis-visningen. Samtykke lagres aldri, og mikrofonen starter aldri automatisk ved åpning.</label>' +
      '<div class="mmir-jarvis-actions"><button type="button" data-jarvis="doctor">Kontroller tale</button><button type="button" data-jarvis="test-voice">Test stemmen</button></div><p data-jarvis="diagnostic"></p></details>' +
      '<details class="mmir-jarvis-truth"><summary>MMIR-status</summary><dl>' +
      '<dt>Personvern</dt><dd data-jarvis="privacy"></dd><dt>Ruting</dt><dd data-jarvis="route"></dd><dt>Faktisk svar</dt><dd data-jarvis="writer"></dd><dt>Identitet</dt><dd data-jarvis="conversation"></dd><dt>Tale</dt><dd data-jarvis="provider">Tale inn: ikke startet · tale ut: kun lokal norsk</dd><dt>Tid</dt><dd data-jarvis="latency"></dd><dt>Ressurser</dt><dd data-jarvis="usage"></dd></dl></details></div>';
    app.querySelector('.p0-chat').prepend(panel);
    status = panel.querySelector('.mmir-jarvis-status'); talk = field('talk'); micConsent = field('consent'); ttsConsent = field('tts'); auto = field('auto'); transcript = field('transcript'); options = field('options');
    talk.addEventListener('click', listen); field('pause').addEventListener('click', () => pause()); field('chat').addEventListener('click', () => setSkin('chat'));
    field('send-capture').addEventListener('click', submitCapture);
    field('draft-capture').addEventListener('click', () => {
      if (!capture || capture.conversation !== backend.snapshot().conversationId) return;
      if (byId('p0-input')?.value.trim()) return notify('Det eksisterende utkastet er beholdt. Kopier taleteksten manuelt eller send utkastet først.', 'attention');
      setDraft(transcript.value); notify('Taleteksten ligger i skrivefeltet. Ingen melding er sendt.');
    });
    for (const box of [micConsent, ttsConsent]) box.addEventListener('change', () => {
      if (!box.checked) pause();
      else if (micConsent.checked && ttsConsent.checked && w.matchMedia('(max-width: 600px)').matches) options.open = false;
    });
    auto.addEventListener('change', () => { if (!auto.checked) { clear('resume'); session = false; } });
    for (const [key, name] of [['inputMode','input-mode'],['processing','processing'],['voice','voice'],['rate','rate'],['readMode','read-mode']]) {
      const control = field(name); control.value = String(prefs[key]); control.addEventListener('change', () => { pause('Talevalget er oppdatert. Start et nytt opptak når du er klar.'); prefs[key] = key === 'rate' ? Number(control.value) : control.value; savePrefs(); });
    }
    field('early').checked = prefs.early; field('early').addEventListener('change', () => { prefs.early = field('early').checked; savePrefs(); pause('Valg for fortløpende opplesning er endret.'); });
    try { field('remember').checked = w.localStorage.getItem('mmir-preferred-skin') === 'jarvis'; } catch (_) {}
    field('remember').addEventListener('change', () => { try { if (field('remember').checked) w.localStorage.setItem('mmir-preferred-skin', 'jarvis'); else w.localStorage.removeItem('mmir-preferred-skin'); } catch (_) {} });
    field('doctor').addEventListener('click', doctor);
    field('test-voice').addEventListener('click', () => {
      if (!ttsConsent.checked) return notify('Tillat lokal opplesning før du tester stemmen.', 'attention');
      if (!policy().localTTS || busy()) return notify('Vent til chatten er klar og personvernmodus er kjent.', 'attention');
      pause(); enqueue('Hei. Dette er en lokal norsk stemmetest for MMIR.', true);
    });
    backend.subscribe(onCore);
    w.speechSynthesis?.addEventListener?.('voiceschanged', refreshVoices); refreshVoices();
    d.addEventListener('click', event => {
      if (!enabled) return;
      const target = event.target.closest?.('#p0-mic,[data-p0-sidebar-action="voice-input"],[data-p0-action="voice-input"]');
      if (target) { event.preventDefault(); event.stopImmediatePropagation(); listen(); }
    }, true);
    d.addEventListener('keydown', event => { if (enabled && event.key === 'Escape') pause(); }, true);
    w.addEventListener('mmir-p0-voice-state-updated', () => { if (enabled && !ordinaryMicIdle() && recognition) pause('Den vanlige mikrofonfunksjonen tok over. Jarvis-opptaket er stoppet.'); });
    d.addEventListener('visibilitychange', () => { if (d.visibilityState === 'hidden') pause(); });
    w.addEventListener('pagehide', () => pause());
    w.addEventListener('resize', updateViewport);
    if (w.visualViewport) {
      w.visualViewport.addEventListener('resize', updateViewport);
      w.visualViewport.addEventListener('scroll', updateViewport);
    }
    renderTruth();
  }
  function updateViewport() {
    if (!enabled || !app) return;
    const height = Math.round(w.visualViewport?.height || w.innerHeight);
    // Resize only this skin. Never request mic permission or focus on resize.
    app.style.setProperty('--jarvis-viewport-height', height + 'px');
    const cramped = height < 620;
    app.dataset.jarvisCramped = String(cramped);
    if (cramped && options) options.open = false;
  }
  async function setSkin(skin) {
    if (!['chat', 'jarvis'].includes(skin)) throw new Error('Ukjent visning.');
    const request = ++skinRequest; mount();
    if ((skin === 'jarvis') === enabled) return skin;
    if (skin === 'jarvis' && !ordinaryMicIdle()) throw new Error('Vent til den vanlige mikrofonen er ferdig.');
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
    pause(); enabled = skin === 'jarvis'; panel.hidden = !enabled; app.dataset.mmirSkin = skin;
    micConsent.checked = ttsConsent.checked = auto.checked = false; options.open = true;
    if (!enabled) { field('remember').checked = false; delete app.dataset.jarvisCramped; app.style.removeProperty('--jarvis-viewport-height'); try { w.localStorage.removeItem('mmir-preferred-skin'); } catch (_) {} }
    else updateViewport();
    notify(enabled ? 'Mikrofonen er av. Velg mikrofon og lokal opplesning separat nedenfor.' : 'Tale er stoppet.'); renderTruth();
    w.dispatchEvent(new w.CustomEvent('mmir-skin-changed', { detail: { skin, conversationPreserved: true } }));
    if (w.matchMedia('(pointer: fine)').matches) byId('p0-input')?.focus({ preventScroll: true });
    return skin;
  }
  w.MmirJarvisSkin = Object.freeze({ version: VERSION, setSkin, stop: pause, wantsStreaming: () => active() && ttsConsent?.checked === true && prefs.early && prefs.readMode === 'full' });
})(window, document);
