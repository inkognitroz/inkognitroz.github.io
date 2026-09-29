import { consumeProgressivePublication } from './progressive-publication-consumer.mjs?v=20260929-progressive-bounded-v2';

// Presentation only: the backend owns candidate admission and publication order.
// This extractive lane does not imply synthesis, independent fact verification,
// a signed execution receipt, or a measured improvement over a baseline.
export function progressivePresentation(publication) {
  const evidence = publication.evidence || {};
  const sources = (evidence.source_coverage?.source_ids || []).flatMap((value) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password
        ? [{ name: url.hostname, url: url.href }] : [];
    } catch { return []; }
  });
  const observedAt = typeof evidence.observed_at === 'string' && Number.isFinite(Date.parse(evidence.observed_at))
    ? evidence.observed_at : '';
  return {
    content: publication.answer,
    label: 'MMIR · Kildeutdrag',
    receipt: `Best Answer · versjon ${publication.publication_version} · ekstraktivt svar · rutebevis ikke mottatt`,
    routeReceipt: null,
    answerWriter: { type: 'capability', model_display_name: 'MMIR · Kildeutdrag',
      identity_source: 'backend-extractive-publication', publication_version: publication.publication_version },
    answerState: 'live',
    aiGenerated: false,
    proofLine: { status: 'unverified', label: 'Kildeutdrag · ikke uavhengig faktasjekket', sources, searchObservedAt: observedAt }
  };
}

export async function runProgressiveP0({ endpoint, requestId, payload, signal, prepareRequest, onPublication, fetchImpl }) {
  if (typeof prepareRequest !== 'function') throw new Error('backend_user_identity_unavailable');
  const runId = `${requestId}:progressive`;
  const prepared = await prepareRequest(endpoint, {
    method: 'POST',
    headers: { Accept: 'text/event-stream', 'Content-Type': 'application/json', 'x-request-id': requestId },
    body: JSON.stringify({ request_id: requestId, run_id: runId, payload }), signal, identityFetch: fetchImpl || globalThis.fetch
  });
  let latest = null;
  const result = await consumeProgressivePublication({
    url: endpoint, requestId, runId, payload, headers: prepared.headers || {}, signal, fetchImpl,
    onEvent(event) {
      if (event.type !== 'publication_published' && event.type !== 'publication_corrected') return;
      latest = progressivePresentation(event.publication);
      onPublication(latest);
    }
  });
  if (!latest) throw new Error('no_supported_publication');
  return { ...result, latest };
}
