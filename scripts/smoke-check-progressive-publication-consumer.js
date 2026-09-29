import assert from 'node:assert/strict';
import { consumeProgressivePublication } from '../public/apps/mimir-chat-portal/progressive-publication-consumer.mjs';

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
