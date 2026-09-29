// MMIR-owned browser consumer for the backend progressive-publication stream.
// The browser supplies only its existing user Authorization header and the
// ordinary request payload. Candidate proof, scores and source claims remain
// backend-owned and are deliberately not accepted here.

const FORBIDDEN_PROOF_FIELDS = ['verified', 'score', 'source', 'generation_id', 'candidate_id'];

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
  const publication = event.publication;
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
  onEvent = () => {}
} = {}) {
  const target = text(url, 2000);
  const identity = { requestId: text(requestId), runId: text(runId) };
  if (!target || !identity.requestId || !identity.runId) throw new Error('progressive_identity_required');
  if (!fetchImpl || typeof fetchImpl !== 'function') throw new Error('fetch_unavailable');
  const authorization = headers.Authorization || headers.authorization;
  if (!authorization) throw new Error('user_authorization_required');
  assertNoClientProof(payload);
  const response = await fetchImpl(target, {
    method: 'POST',
    headers: { ...headers, Accept: 'text/event-stream', 'content-type': 'application/json', 'x-request-id': identity.requestId },
    body: JSON.stringify({ request_id: identity.requestId, run_id: identity.runId, payload }),
    signal
  });
  if (!response.ok) throw new Error(`progressive_request_failed:${response.status}`);
  if (!response.body?.getReader) throw new Error('progressive_stream_unavailable');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let lastPublicationVersion = 0;
  const accepted = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() || '';
    for (const block of blocks) {
      const event = parseEventBlock(block);
      const decision = acceptEvent(event, identity, lastPublicationVersion);
      if (!decision.accepted) continue;
      lastPublicationVersion = decision.version;
      accepted.push(event);
      onEvent(event);
    }
  }
  return { events: accepted, publication_version: lastPublicationVersion };
}

export default consumeProgressivePublication;
