// MMIR-owned browser consumer for the backend progressive-publication stream.
// The browser supplies only its existing user Authorization header and the
// ordinary request payload. Candidate proof, scores and source claims remain
// backend-owned and are deliberately not accepted here.

const FORBIDDEN_PROOF_FIELDS = ['verified', 'score', 'source', 'generation_id', 'candidate_id'];
const MAX_STREAM_BYTES = 512 * 1024;
const MAX_FRAME_CHARS = 64 * 1024;
const MAX_EVENTS = 64;

function text(value, max = 200) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : '';
}

function assertNoClientProof(value, path = 'payload') {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoClientProof(item, `${path}[${index}]`));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_PROOF_FIELDS.includes(key)) throw new Error(`client_proof_field:${path}.${key}`);
    assertNoClientProof(child, `${path}.${key}`);
  }
}

function parseEventBlock(block) {
  const data = block.split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim())
    .filter(Boolean)
    .join('\n');
  if (!data || data === '[DONE]') return null;
  try { return JSON.parse(data); } catch { return null; }
}

function acceptEvent(event, identity, lastPublicationVersion) {
  if (!event || typeof event !== 'object') return { accepted: false, version: lastPublicationVersion };
  if (event.request_id && event.request_id !== identity.requestId) return { accepted: false, version: lastPublicationVersion };
  if (event.run_id && event.run_id !== identity.runId) return { accepted: false, version: lastPublicationVersion };
  const isPublication = event.type === 'publication_published' || event.type === 'publication_corrected';
  if (!isPublication && !['publication_started', 'publication_closed', 'candidate_rejected'].includes(event.type)) {
    return { accepted: false, version: lastPublicationVersion };
  }
  const publication = isPublication ? event.publication : null;
  if (isPublication && (!publication || publication.request_id !== identity.requestId || publication.run_id !== identity.runId
    || typeof publication.answer !== 'string' || !publication.answer.trim())) {
    return { accepted: false, version: lastPublicationVersion };
  }
  if (!isPublication && (event.request_id !== identity.requestId || event.run_id !== identity.runId)) {
    return { accepted: false, version: lastPublicationVersion };
  }
  const version = Number(publication?.publication_version || 0);
  if (publication && (!Number.isInteger(version) || version <= lastPublicationVersion)) {
    return { accepted: false, version: lastPublicationVersion };
  }
  return { accepted: true, version: publication ? version : lastPublicationVersion };
}

export async function consumeProgressivePublication({
  url,
  requestId,
  runId,
  payload,
  headers = {},
  signal,
  fetchImpl = globalThis.fetch,
  onEvent = () => {},
  timeoutMs = 30000
} = {}) {
  const target = text(url, 2000);
  const identity = { requestId: text(requestId), runId: text(runId) };
  if (!target || !identity.requestId || !identity.runId) throw new Error('progressive_identity_required');
  if (!fetchImpl || typeof fetchImpl !== 'function') throw new Error('fetch_unavailable');
  const authorization = headers.Authorization || headers.authorization;
  if (!authorization) throw new Error('user_authorization_required');
  assertNoClientProof(payload);
  const controller = new AbortController();
  let reader;
  const abort = () => {
    controller.abort(signal?.reason || new DOMException('Request stopped', 'AbortError'));
    reader?.cancel(controller.signal.reason).catch(() => {});
  };
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(() => {
    controller.abort(new DOMException('Progressive request timed out', 'TimeoutError'));
    reader?.cancel(controller.signal.reason).catch(() => {});
  }, Math.min(30000, Math.max(1, Number(timeoutMs) || 30000)));
  try {
    controller.signal.throwIfAborted();
    const response = await fetchImpl(target, {
      method: 'POST',
      headers: { ...headers, Accept: 'text/event-stream', 'content-type': 'application/json', 'x-request-id': identity.requestId },
      body: JSON.stringify({ request_id: identity.requestId, run_id: identity.runId, payload }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`progressive_request_failed:${response.status}`);
    if (!String(response.headers.get('content-type') || '').toLowerCase().startsWith('text/event-stream')) throw new Error('progressive_content_type_invalid');
    if (!response.body?.getReader) throw new Error('progressive_stream_unavailable');

    reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let lastPublicationVersion = 0;
    let bytes = 0;
    let eventCount = 0;
    let closed = false;
    const accepted = [];
    while (!closed) {
      const { value, done } = await reader.read();
      controller.signal.throwIfAborted();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_STREAM_BYTES) throw new Error('progressive_stream_limit');
      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || '';
      if (buffer.length > MAX_FRAME_CHARS) throw new Error('progressive_frame_limit');
      for (const block of blocks) {
        if (block.length > MAX_FRAME_CHARS || ++eventCount > MAX_EVENTS) throw new Error('progressive_frame_limit');
        const event = parseEventBlock(block);
        const decision = acceptEvent(event, identity, lastPublicationVersion);
        if (!decision.accepted) continue;
        lastPublicationVersion = decision.version;
        accepted.push(event);
        onEvent(event);
        if (event.type === 'publication_closed') { closed = true; break; }
      }
    }
    if (!closed) throw new Error('progressive_stream_incomplete');
    return { events: accepted, publication_version: lastPublicationVersion };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
    if (reader) {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
}

export default consumeProgressivePublication;
