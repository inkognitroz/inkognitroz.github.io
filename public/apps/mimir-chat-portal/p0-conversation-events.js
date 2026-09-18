/* Read-only presentation contract. The P0 shell remains the sole history,
 * routing, privacy and request owner. No text is persisted by this module. */
(function (w) {
  'use strict';
  const uid = () => w.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  const now = () => w.performance.now();
  const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  function create(readCore) {
    let conversationId = uid(), turn = null, last = null;
    const listeners = new Set();
    function snapshot() {
      const core = readCore(), mode = core.privacyMode;
      const known = ['public', 'private', 'superprivate'].includes(mode);
      return Object.freeze({
        version: 1, conversationId, turnId: turn?.id || null,
        phase: turn?.phase || 'idle', busy: core.busy === true,
        policy: Object.freeze({ mode: known ? mode : 'unknown', localSTT: known, remoteSTT: mode === 'public', localTTS: known }),
        selectedRoute: Object.freeze({ id: core.route?.id || '', label: core.route?.label || '', kind: core.route?.route || 'unknown' }),
        last: last ? Object.freeze({ ...last }) : null
      });
    }
    function emit(type, detail = {}) {
      const event = Object.freeze({ type, conversationId, turnId: turn?.id || null, at: now(), ...detail });
      for (const fn of listeners) { try { fn(event); } catch (_) { /* A skin cannot break the chat. */ } }
    }
    function request() {
      if (turn && ['preflight', 'waiting', 'streaming'].includes(turn.phase)) return null;
      turn = { id: uid(), phase: 'preflight', started: now(), messageId: null, tokens: null, firstTextMs: null };
      emit('turn-requested', { snapshot: snapshot() });
      return turn.id;
    }
    function begin() {
      if (!turn || turn.phase !== 'preflight') request();
      if (!turn) return;
      turn.phase = 'waiting'; emit('turn-start', { snapshot: snapshot() });
    }
    function attach(message) {
      if (!turn || !readCore().busy || message.role !== 'assistant') return;
      turn.messageId = message.id;
      emit('answer-bound', { messageId: message.id });
    }
    function delta(text) {
      if (!turn?.messageId || !['waiting', 'streaming'].includes(turn.phase) || typeof text !== 'string' || !text) return;
      turn.phase = 'streaming';
      if (turn.firstTextMs === null) turn.firstTextMs = now() - turn.started;
      emit('answer-delta', { messageId: turn.messageId, text });
    }
    function payload(data) {
      if (!turn) return;
      const n = data?.usage?.total_tokens;
      if (finite(n)) turn.tokens = n; // Only backend-reported usage; never estimates.
    }
    function complete(message, stopped = false) {
      if (!turn || !['waiting', 'streaming'].includes(turn.phase)) return;
      if (stopped || !message || message.id !== turn.messageId || message.answerState === 'pending') {
        cancel(stopped ? 'stopped' : 'no-final-answer'); return;
      }
      const failure = Boolean(message.failureDiagnostic || /failed$/.test(message.routeProvenance || ''));
      turn.phase = failure ? 'failed' : 'complete';
      last = { turnId: turn.id, messageId: message.id, elapsedMs: Math.round(now() - turn.started), firstTextMs: turn.firstTextMs, tokens: turn.tokens };
      emit(failure ? 'turn-failed' : 'answer-final', {
        messageId: message.id, text: String(message.content || ''),
        writer: Object.freeze({ ...(message.answerWriter || {}) }),
        receipt: String(message.receipt || ''), metrics: Object.freeze({ ...last }),
        errorCode: message.failureDiagnostic?.code || null,
        truncated: Boolean(message.truncated)
      });
    }
    function cancel(reason = 'stopped') {
      if (!turn || !['preflight', 'waiting', 'streaming'].includes(turn.phase)) return;
      turn.phase = 'cancelled'; emit('turn-cancelled', { reason });
    }
    function endRequest(id, statusText = '') {
      if (turn?.id === id && turn.phase === 'preflight') {
        turn.phase = 'rejected'; emit('turn-rejected', { statusText: String(statusText) });
      }
    }
    const reader = Object.freeze({
      version: 1, snapshot,
      subscribe(fn) { if (typeof fn !== 'function') throw new TypeError('Listener must be a function'); listeners.add(fn); return () => listeners.delete(fn); }
    });
    return Object.freeze({
      reader, request, begin, attach, delta, payload, complete, cancel, endRequest,
      isCurrent: id => turn?.id === id && ['preflight', 'waiting', 'streaming'].includes(turn.phase),
      messageId: () => turn?.messageId || null,
      policyChanged: () => emit('policy-changed', { snapshot: snapshot() }),
      reset() { cancel('conversation-changed'); conversationId = uid(); turn = last = null; emit('conversation-changed', { snapshot: snapshot() }); }
    });
  }
  w.MmirP0ConversationEvents = Object.freeze({ create });
})(window);
