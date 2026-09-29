import assert from 'node:assert/strict';
const { consumeProgressivePublication } = process.env.PROGRESSIVE_CONSUMER_BASE
  ? await import(process.env.PROGRESSIVE_CONSUMER_BASE)
  : await import('../public/apps/mimir-chat-portal/progressive-publication-consumer.mjs');

function stream(events) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const event of events) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      controller.close();
    }
  });
}

const events = [
  { type: 'publication_started', request_id: 'req-1', run_id: 'run-1' },
  { type: 'publication_published', publication: { publication_version: 1, request_id: 'req-1', run_id: 'run-1', answer: 'first' } },
  { type: 'publication_corrected', publication: { publication_version: 2, request_id: 'req-1', run_id: 'run-1', answer: 'stronger' } },
  { type: 'publication_corrected', publication: { publication_version: 1, request_id: 'req-1', run_id: 'run-1', answer: 'stale' } },
  { type: 'publication_closed', request_id: 'req-1', run_id: 'run-1' }
];
const seen = [];
const result = await consumeProgressivePublication({
  url: 'https://backend.test/l5/progressive-publication',
  requestId: 'req-1', runId: 'run-1', payload: { prompt: 'compare two answers' },
  headers: { Authorization: 'Bearer user-token' },
  fetchImpl: async () => new Response(stream(events), { status: 200, headers: { 'content-type': 'text/event-stream' } }),
  onEvent: (event) => seen.push(event)
});
assert.equal(result.publication_version, 2);
assert.deepEqual(seen.filter((event) => event.publication).map((event) => event.publication.answer), ['first', 'stronger']);
await assert.rejects(() => consumeProgressivePublication({
  url: 'https://backend.test/l5/progressive-publication', requestId: 'req-2', runId: 'run-2',
  payload: { prompt: 'bad', verified: true }, headers: { Authorization: 'Bearer user-token' }, fetchImpl: async () => null
}), /client_proof_field/);
console.log('progressive-publication-consumer: PASS');

const options = {
  url: 'https://backend.test/l5/progressive-publication/stream', requestId: 'req-1', runId: 'run-1',
  payload: { messages: [{ role: 'user', content: 'A public question' }] },
  headers: { Authorization: 'Bearer synthetic-user' }
};
const response = (rows) => new Response(stream(rows), { headers: { 'content-type': 'text/event-stream' } });
const start = events[0], first = events[1], close = events.at(-1);
const forged = { ...first, publication: { ...first.publication, request_id: 'another-request', answer: 'forged' } };
const missing = { ...first, publication: { publication_version: 3, answer: 'missing identity' } };
const crossRun = { ...first, publication: { ...first.publication, run_id: 'another-run' } };
const nestedSeen = [];
const nested = await consumeProgressivePublication({ ...options,
  fetchImpl: async () => response([start, forged, missing, crossRun, first, close, events[2]]),
  onEvent: event => nestedSeen.push(event)
});
assert.equal(nested.publication_version, 1, 'identity-invalid and post-close versions must not publish');
assert.deepEqual(nestedSeen.filter(event => event.publication).map(event => event.publication.answer), ['first']);
await assert.rejects(() => consumeProgressivePublication({ ...options, fetchImpl: async () => response([start, first]) }), /incomplete/);
await assert.rejects(() => consumeProgressivePublication({ ...options, fetchImpl: async () => new Response('{}') }), /content_type/);
await assert.rejects(() => consumeProgressivePublication({ ...options,
  fetchImpl: async () => new Response('data: '+ 'x'.repeat(65537), { headers: { 'content-type': 'text/event-stream' } })
}), /frame_limit/);
await assert.rejects(() => consumeProgressivePublication({ ...options,
  fetchImpl: async () => response(Array.from({ length: 65 }, () => start))
}), /frame_limit/);
const stopped = new AbortController(); stopped.abort();
let started = false;
await assert.rejects(() => consumeProgressivePublication({ ...options, signal: stopped.signal,
  fetchImpl: async () => { started = true; return response([]); }
}), { name: 'AbortError' });
assert.equal(started, false, 'an already cancelled request must not fetch');
let cancelled = false;
await assert.rejects(() => consumeProgressivePublication({ ...options, timeoutMs: 5,
  fetchImpl: async () => new Response(new ReadableStream({ cancel() { cancelled = true; } }), { headers: { 'content-type': 'text/event-stream' } })
}), { name: 'TimeoutError' });
assert.equal(cancelled, true, 'timeout must cancel the stream, not only discard its result');
console.log('progressive-publication identity/terminal/budget/abort negatives: PASS');
