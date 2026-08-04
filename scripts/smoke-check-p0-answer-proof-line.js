// Smoke: the trust surface must mirror the gateway's mmir.answer_proof_line contract.
// Payload shapes below are measured live on api.mmir.ai (2026-07-15):
// - capability routes return a plain string ("Verifisert med live-kilde") plus mmir.sources
// - synthesis routes return the v2 object (status verified | consensus_signed | signed | unverified)
// - tool-verify routes return a top-level string ('Verifisert med deterministisk tool-verify')
// - /chat/compare returns no proof line at all (measured)
// The UI must never fabricate a "Verifisert" badge when the proof is weaker or missing.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const runtimePath = resolve(root, 'public/apps/mimir-chat-portal/p0-chat-shell.js');
const taxonomyPath = resolve(root, 'public/release-route-taxonomy.js');
const stateCopyPath = resolve(root, 'public/apps/mimir-chat-portal/chat-state-copy.js');
const storagePath = resolve(root, 'public/apps/mimir-chat-portal/p0-storage.js');
const routeReceiptsPath = resolve(root, 'public/apps/mimir-chat-portal/p0-route-receipts.js');
const routeBenchmarksPath = resolve(root, 'public/apps/mimir-chat-portal/p0-route-benchmarks.js');
const historyPath = resolve(root, 'public/apps/mimir-chat-portal/p0-history.js');
const runtime = readFileSync(runtimePath, 'utf8');
const bootBlock = "  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});\n  else boot();";
const exportBlock = "  globalThis.__p0ProofLineTest={state,answerProofLine,proofTrustLabel,trustValueSummary,quietReceiptStatus,renderProofLine,renderReceipt,answerStatus,noteAnswerProof};";

if (!runtime.includes(bootBlock)) {
  throw new Error('P0 answer-proof-line smoke cannot find boot block.');
}

const storage = new Map();
const context = {
  console,
  URL,
  URLSearchParams,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  performance: { now: () => 0 },
  location: { href: 'https://mmir.ai/mmir.html', hash: '', search: '' },
  document: { readyState: 'loading', addEventListener() {} },
  localStorage: {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: (key) => storage.delete(key)
  }
};
context.window = context;
context.globalThis = context;

vm.createContext(context);
vm.runInContext(readFileSync(taxonomyPath, 'utf8'), context, { filename: taxonomyPath });
vm.runInContext(readFileSync(stateCopyPath, 'utf8'), context, { filename: stateCopyPath });
vm.runInContext(readFileSync(storagePath, 'utf8'), context, { filename: storagePath });
vm.runInContext(readFileSync(routeReceiptsPath, 'utf8'), context, { filename: routeReceiptsPath });
vm.runInContext(readFileSync(routeBenchmarksPath, 'utf8'), context, { filename: routeBenchmarksPath });
vm.runInContext(readFileSync(historyPath, 'utf8'), context, { filename: historyPath });
vm.runInContext(runtime.replace(bootBlock, exportBlock), context, { filename: runtimePath });

const api = context.__p0ProofLineTest;
if (!api) throw new Error('P0 answer-proof-line smoke did not expose test API.');

function fail(message) {
  throw new Error(message);
}

// 1) Capability route, string form + live source (measured: styringsrente via mmir-live-data).
const capabilityPayload = {
  mmir: {
    answer_proof_line: 'Verifisert med live-kilde',
    sources: [{
      id: 'norges-bank-policy-rate',
      title: 'Norges Bank styringsrente',
      url: 'https://data.norges-bank.no/api/data/IR/B.KPRA.SD.R?lastNObservations=1&format=sdmx-json',
      topic: 'Norges Bank styringsrente'
    }]
  }
};
const capabilityProof = api.answerProofLine(capabilityPayload);
if (!capabilityProof || capabilityProof.status !== 'verified') fail('Capability "Verifisert med live-kilde" must parse as verified.');
if (api.proofTrustLabel(capabilityProof) !== 'Verifisert') fail('Verified proof must map to the Verifisert value.');
if (capabilityProof.sources.length !== 1) fail('Capability proof must surface its live source.');
if (capabilityProof.sources[0].name !== 'Norges Bank styringsrente') fail('Source badge must use the source title.');
if (!capabilityProof.sources[0].url.startsWith('https://data.norges-bank.no/')) fail('Source badge must keep the https source URL.');
const capabilityHtml = api.renderProofLine({ role: 'assistant', proofLine: capabilityProof });
if (!capabilityHtml.includes('p0-proof-line')) fail('Proof line must render when the gateway sent one.');
if (!capabilityHtml.includes('<a class="p0-proof-source"')) fail('Source with URL must render as a clickable badge.');
if (!capabilityHtml.includes('rel="noopener noreferrer"')) fail('Source links must carry rel=noopener noreferrer.');
if (!capabilityHtml.includes('Verifisert med live-kilde')) fail('The gateway proof label must stay visible.');

// 2) Synthesis route, v2 object with consensus_signed (measured: creative prompt on supergeni).
const consensusPayload = {
  mmir: {
    answer_proof_line: {
      object: 'mmir.answer_proof_line',
      schema_version: '2026-07-02-answer-proof-line-v2',
      status: 'consensus_signed',
      label: 'Bevis: 1/3 enige · signert kvittering',
      consensus: { status: 'split', agree_count: 1, total: 3, public_ui_label: 'Delt svar - 1/3 ruter enige' },
      verification: { deterministic: false, source_count: 0, source_hosts: [], source_trust: [], primary_source_trust: null },
      receipt: { signed: true, keyed: true, id: 'receipt_mmir_mistral_candidate_x', route_id: 'mistral/mistral-small-latest', node_id: 'mistral-candidate', signature_authority: 'mmir-keyed-hmac', signature_key_id: 'mmir-live-route-receipt-key-v1' }
    }
  }
};
const consensusProof = api.answerProofLine(consensusPayload);
if (api.proofTrustLabel(consensusProof) !== 'Signert kvittering') fail('consensus_signed must map to Signert kvittering, never Verifisert.');
const consensusSummary = api.trustValueSummary('Supergeni · hosted route · Score 92 · 746ms', consensusProof, { explicitUnverified: true });
if (!consensusSummary.includes('Signert kvittering')) fail('Receipt summary must show the signed-receipt value for consensus_signed proof.');
if (consensusSummary.includes('Verifisert')) fail('Receipt summary must not inflate consensus_signed to Verifisert.');

// 3) Deterministic verified v2 object (measured: superboost preview, tool-verify arithmetic).
const verifiedObjectProof = api.answerProofLine({
  answer_proof_line: {
    object: 'mmir.answer_proof_line',
    schema_version: '2026-07-02-answer-proof-line-v2',
    status: 'verified',
    label: 'Bevis: verifisert · signert kvittering',
    consensus: { status: 'high', agree_count: 5, total: 5, public_ui_label: 'Høy tillit - 5/5 ruter enige' },
    verification: { deterministic: true, source_count: 0, source_hosts: [], source_trust: [], primary_source_trust: null },
    receipt: { signed: true, keyed: true, route_id: 'capability/tool-verify/arithmetic', node_id: 'mmir-tool-verify' }
  }
});
if (api.proofTrustLabel(verifiedObjectProof) !== 'Verifisert') fail('Deterministic verified proof must map to Verifisert.');

// 4) Missing proof line (measured: /chat/compare) must never produce a badge.
if (api.answerProofLine({ mmir: {} }) !== null) fail('Missing proof line must parse to null.');
if (api.answerProofLine(null) !== null) fail('Missing payload must parse to null.');
if (api.answerProofLine({ mmir: { answer_proof_line: '' } }) !== null) fail('Empty-string proof must parse to null.');
const unprovenStatus = api.answerStatus(api.state.models[0], { score: 90 }, '', null);
if (unprovenStatus.includes('Verifisert')) fail('answerStatus must never fabricate Verifisert without proof.');
const unprovenSummary = api.trustValueSummary('Supergeni · hosted route · Score 92 · 746ms', null, { explicitUnverified: true });
if (!unprovenSummary.includes('Ubekreftet')) fail('Message receipts without proof must show the honest Ubekreftet state.');
if (unprovenSummary.includes('Verifisert')) fail('Message receipts without proof must not show Verifisert.');
const ambientSummary = api.trustValueSummary('Supergeni · hosted route · Score 92 · 746ms', null);
if (ambientSummary.includes('Verifisert') || ambientSummary.includes('Ubekreftet')) fail('Ambient status without proof must simply omit the trust badge.');
if (api.renderProofLine({ role: 'assistant', proofLine: null }) !== '') fail('No proof line means no proof row.');

// 5) Receipt rendering: one quiet, model-visible line must own trust; evidence stays expandable.
const unverifiedReceipt = api.renderReceipt('Supergeni · hosted route · Score 92 · 746ms', null, 'Supergeni');
if (!unverifiedReceipt.includes('p0-message-receipt-proof-unverified')) fail('Unproven receipts must use the muted unverified style.');
if (!unverifiedReceipt.match(/<summary[^>]*>.*Ubekreftet.*<\/summary>/)) fail('Unproven receipt summary must disclose Ubekreftet once.');
const verifiedReceipt = api.renderReceipt('Supergeni · hosted route · Score 92 · 746ms', capabilityProof, 'Mistral Small', 'Søk · 1 kilde · Mistral Small');
if (verifiedReceipt.includes('p0-message-receipt-proof-unverified')) fail('Verified receipts must not use the muted unverified style.');
if (!verifiedReceipt.includes('p0-receipt-details')) fail('Technical receipts must remain available behind Details.');
if (!verifiedReceipt.includes('p0-receipt-summary-main')) fail('The single receipt line must expose its quiet status.');
if (!verifiedReceipt.includes('<span class="p0-receipt-model">Mistral Small</span>')) fail('The answer-writer model must remain visible in the receipt line.');
if (!verifiedReceipt.includes('<div class="p0-receipt-expanded">')) fail('Technical evidence must remain inside expandable receipt details.');
if (!verifiedReceipt.includes('p0-connected-intelligence-label')) fail('Answer mode must remain available inside receipt details.');
if (!verifiedReceipt.includes('<a class="p0-proof-source"')) fail('Source links must remain available inside receipt details.');
const verifiedSummary = verifiedReceipt.match(/<summary[^>]*>(.*?)<\/summary>/)?.[1] || '';
if ((verifiedSummary.match(/Verifisert/g) || []).length !== 1) fail('Default receipt line must show the verified state exactly once.');
if (/spr[aå]k\s*guard|language\s*guard|bevis\s*:/i.test(verifiedSummary)) fail('Default receipt line must not repeat language-guard or proof labels.');

const legacyReceipt = api.renderReceipt(
  'Supergeni · Norsk språkguard · Verifisert · beskyttet · Verifisert med norsk språkguard',
  null,
  'Supergeni'
);
const legacySummary = legacyReceipt.match(/<summary[^>]*>(.*?)<\/summary>/)?.[1] || '';
if (/spr[aå]k\s*guard|language\s*guard|bevis\s*:/i.test(legacySummary)) fail('Legacy language/proof chrome must be deduplicated from the default receipt line.');
if (/Verifisert/i.test(legacySummary)) fail('A legacy receipt string must not fabricate verified status without structured proof.');
if (!legacyReceipt.includes('Norsk språkguard')) fail('Legacy technical receipt text must remain available on demand.');

const modelOnlyReceipt = api.renderReceipt('', null, 'Mistral Small');
if (!modelOnlyReceipt.includes('p0-message-receipt-static')) fail('Answers without technical evidence must still keep one quiet status line.');
if (!modelOnlyReceipt.includes('Mistral Small')) fail('Model visibility must survive when no technical receipt is available.');

// 6) Injection safety: hostile source fields must never become markup or javascript: links.
const hostileProof = api.answerProofLine({
  mmir: {
    answer_proof_line: 'Verifisert med live-kilde',
    sources: [{ title: '<img src=x onerror=alert(1)>', url: 'javascript:alert(1)' }]
  }
});
const hostileHtml = api.renderProofLine({ role: 'assistant', proofLine: hostileProof });
if (hostileHtml.includes('<img')) fail('Source titles must be escaped.');
if (hostileHtml.toLowerCase().includes('javascript:')) fail('Non-http(s) source URLs must not render as links.');
if (hostileHtml.includes('<a ')) fail('A source without a safe URL must fall back to a non-link badge.');

// 7) Dedupe: when the receipt already shows the trust value, the proof row must not repeat the badge.
const dedupedHtml = api.renderProofLine({ role: 'assistant', proofLine: consensusProof }, true);
if (dedupedHtml.includes('p0-proof-badge')) fail('Proof row must not duplicate the badge already shown in the receipt.');
if (!dedupedHtml.includes('Bevis: 1/3 enige')) fail('Proof row must keep the gateway evidence label.');

console.log('P0 answer-proof-line smoke passed.');
