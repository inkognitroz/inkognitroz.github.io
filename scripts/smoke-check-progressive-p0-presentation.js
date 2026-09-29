import assert from 'node:assert/strict';
import { runProgressiveP0, progressivePresentation } from '../public/apps/mimir-chat-portal/p0-progressive-publication.mjs';

const requestId = 'p0-request', runId = requestId + ':progressive';
const identity = { request_id: requestId, run_id: runId };
const source = 'https://example.org/fixture';
const evidence = { observed_at: '2026-09-29T08:00:00Z', source_coverage: { source_ids: [source] } };
const publication = (version, answer) => ({ ...identity, publication_version: version, answer, evidence });
const first = publication(1, 'First supported excerpt.');
let controller, cancelled = false, complete = false, sentBody;
const seen = [];
const encoder = new TextEncoder();
const send = event => controller.enqueue(encoder.encode('data: '+JSON.stringify(event)+'\n\n'));
const pending = runProgressiveP0({
  endpoint: 'https://backend.test/l5/progressive-publication/stream', requestId,
  payload: { messages: [{ role: 'user', content: 'A public fixture question' }] },
  prepareRequest: async (_url, options) => ({ ...options, headers: { ...options.headers, Authorization: 'Bearer synthetic-user' } }),
  fetchImpl: async (_url, options) => {
    sentBody = JSON.parse(options.body);
    return new Response(new ReadableStream({ start(c) { controller = c; }, cancel() { cancelled = true; } }),
      { headers: { 'Content-Type': 'text/event-stream' } });
  },
  onPublication: value => seen.push(value)
}).then(value => { complete = true; return value; });
await new Promise(resolve => setImmediate(resolve));
send({ ...identity, type: 'publication_published', publication: first });
await new Promise(resolve => setImmediate(resolve));
assert.equal(seen[0].content, first.answer, 'First answer must render while later candidates are still pending.');
assert.equal(complete, false, 'First render must not wait for closure.');
send({ ...identity, type: 'publication_corrected', publication: publication(2, 'First supported excerpt. Additional supported detail.') });
send({ ...identity, type: 'publication_corrected', publication: first });
send({ ...identity, type: 'publication_closed' });
const result = await pending;
assert.equal(result.publication_version, 2);
assert.equal(seen.length, 2);
assert.equal(cancelled, true);
assert.deepEqual(sentBody, { ...identity, payload: { messages: [{ role: 'user', content: 'A public fixture question' }] } });
assert.equal(seen[0].routeReceipt, null);
assert.equal(seen[0].aiGenerated, false);
assert.equal(seen[0].proofLine.status, 'unverified');
assert.equal(seen[0].proofLine.sources[0].url, source);
assert.equal(seen[0].proofLine.searchObservedAt, evidence.observed_at);
assert.match(seen[0].receipt, /rutebevis ikke mottatt/);
assert.doesNotMatch(seen[0].receipt, /no paid|verified|signed/i);
const unsafe = progressivePresentation({ ...first, evidence: { source_coverage: { source_ids: ['javascript:alert(1)', 'https://user:password@example.org/'] } } });
assert.deepEqual(unsafe.proofLine.sources, []);
assert.equal(unsafe.proofLine.searchObservedAt, '', 'Do not fabricate missing source time.');
console.log('progressive P0 incremental presentation and truthful proof: PASS (synthetic events only)');
