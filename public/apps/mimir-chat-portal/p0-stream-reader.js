/* Transport only: decode one existing MMIR response. No fetch, retry, routing,
 * provider selection, tool execution or persistence. JSON remains the fallback. */
(function (w) {
  'use strict';
  async function read(response, { signal, onDelta } = {}) {
    if (!/^text\/event-stream\b/i.test(response.headers.get('content-type') || '')) return response.json();
    if (!response.body?.getReader) throw new Error('stream_reader_unavailable');
    const reader = response.body.getReader(), decoder = new TextDecoder('utf-8', { fatal: true });
    let buffer = '', text = '', done = false, finish = null, bytes = 0, metadata = {};
    const fail = code => { const error = new Error(code); error.code = code; return error; };
    function frame(raw) {
      if (done) return;
      const lines = raw.split(/\r?\n/), data = lines.filter(s => s.startsWith('data:')).map(s => s.slice(5).replace(/^ /, '')).join('\n');
      if (!data) return;
      if (data.trim() === '[DONE]') { done = true; return; }
      let part;
      try { part = JSON.parse(data); } catch (_) { throw fail('invalid_stream_json'); }
      if (!part || typeof part !== 'object' || Array.isArray(part)) throw fail('invalid_stream_frame');
      if (part.error || lines.some(s => /^event:\s*error\s*$/.test(s))) throw fail('stream_upstream_error');
      const choice = Array.isArray(part.choices) ? part.choices.find(c => c.index === 0 || c.index == null) : null;
      const delta = choice?.delta?.content;
      if (typeof delta === 'string' && delta) {
        text += delta;
        if (text.length > 250000) throw fail('stream_text_limit');
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        onDelta?.(delta);
      }
      if (typeof choice?.message?.content === 'string') {
        const final = choice.message.content;
        if (final.length > 250000) throw fail('stream_text_limit');
        if (text && !final.startsWith(text)) throw fail('stream_answer_revised');
        const rest = final.slice(text.length); text = final;
        if (rest) onDelta?.(rest);
      }
      if (choice?.finish_reason != null) finish = choice.finish_reason;
      // Preserve the actual gateway receipt and writer-continuity envelope.
      for (const key of ['id', 'object', 'created', 'model', 'usage', 'mmir', 'writer_continuity', 'provider_called', 'answer_writer']) {
        if (Object.hasOwn(part, key)) metadata[key] = part[key];
      }
    }
    function consume() {
      let match;
      while ((match = /\r?\n\r?\n/.exec(buffer))) {
        const raw = buffer.slice(0, match.index); buffer = buffer.slice(match.index + match[0].length); frame(raw);
      }
      if (buffer.length > 262144) throw fail('stream_frame_limit');
    }
    const abort = () => { void reader.cancel().catch(() => {}); };
    signal?.addEventListener('abort', abort, { once: true });
    try {
      while (!done) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        const part = await reader.read();
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > 2097152) throw fail('stream_byte_limit');
        buffer += decoder.decode(part.value, { stream: true }); consume();
      }
      buffer += decoder.decode(); consume();
      if (buffer.trim()) frame(buffer);
      if (!done && finish === null) throw fail('incomplete_stream');
      return { ...metadata, choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: finish || 'stop' }] };
    } finally {
      signal?.removeEventListener('abort', abort);
      try { await reader.cancel(); } catch (_) {}
      reader.releaseLock();
    }
  }
  w.MmirP0StreamReader = Object.freeze({ read });
})(window);
