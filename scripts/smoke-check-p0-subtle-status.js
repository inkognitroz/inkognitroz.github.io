import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const runtimePath = resolve(root, 'public/apps/mimir-chat-portal/p0-chat-shell.js');
const stateCopyPath = resolve(root, 'public/apps/mimir-chat-portal/chat-state-copy.js');
const legacyRuntimePath = resolve(root, 'public/apps/mimir-chat-portal/chat-runtime.js');
const htmlPath = resolve(root, 'public/mmir.html');
const manifestPath = resolve(root, 'public/apps/mimir-chat-portal/asset-versions.json');
const storagePath = resolve(root, 'public/apps/mimir-chat-portal/p0-storage.js');
const routeReceiptsPath = resolve(root, 'public/apps/mimir-chat-portal/p0-route-receipts.js');
const routeBenchmarksPath = resolve(root, 'public/apps/mimir-chat-portal/p0-route-benchmarks.js');
const historyPath = resolve(root, 'public/apps/mimir-chat-portal/p0-history.js');
const runtime = readFileSync(runtimePath, 'utf8');
const stateCopy = readFileSync(stateCopyPath, 'utf8');
const legacyRuntime = readFileSync(legacyRuntimePath, 'utf8');
const html = readFileSync(htmlPath, 'utf8');
const manifest = readFileSync(manifestPath, 'utf8');
const storageHelper = readFileSync(storagePath, 'utf8');
const routeReceiptsHelper = readFileSync(routeReceiptsPath, 'utf8');
const routeBenchmarksHelper = readFileSync(routeBenchmarksPath, 'utf8');
const historyHelper = readFileSync(historyPath, 'utf8');
const bootBlock = "  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});\n  else boot();";
const exportBlock = "  globalThis.__p0SubtleStatusTest={state,renderMicroStatus,compactStatusText,answerStatus,routeScore,routeMicroStatus,recordRouteBenchmark,effectiveModelScore,answerProofLine,proofTrustLabel,noteAnswerProof};";

if (!runtime.includes(bootBlock)) {
  throw new Error('P0 subtle status smoke cannot find boot block.');
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
vm.runInContext(stateCopy, context, { filename: stateCopyPath });
vm.runInContext(storageHelper, context, { filename: storagePath });
vm.runInContext(routeReceiptsHelper, context, { filename: routeReceiptsPath });
vm.runInContext(routeBenchmarksHelper, context, { filename: routeBenchmarksPath });
vm.runInContext(historyHelper, context, { filename: historyPath });
vm.runInContext(runtime.replace(bootBlock, exportBlock), context, { filename: runtimePath });

const testApi = context.__p0SubtleStatusTest;
if (!testApi) throw new Error('P0 subtle status smoke did not expose test API.');
const chatState = context.MimirChatStateCopy;
if (chatState?.version !== '20260714-truthful-chat-state-v1') throw new Error('Shared chat-state copy must expose an explicit version.');
if (chatState.pending('Supergeni') !== 'Supergeni tenker …') throw new Error('Pending state must be short and Norwegian.');
if (chatState.comparing('Supergeni') !== 'Supergeni sammenligner svar …') throw new Error('Compare state must be short and Norwegian.');
if (chatState.synthesizing() !== 'Supergeni velger beste svar …') throw new Error('Synthesis state must be short and Norwegian.');
if (!chatState.transient(chatState.pending('Supergeni')) || !chatState.transient(chatState.comparing('Supergeni')) || !chatState.transient(chatState.synthesizing())) throw new Error('Transient chat states must stay out of memory and answer actions.');
if (chatState.errorText({ status: 503 }).includes('503')) throw new Error('Public error copy must not expose raw status codes.');
if (!chatState.errorText({ status: 503 }).includes('Prøv igjen')) throw new Error('Temporary provider failures must offer a retry action.');
if (chatState.errorText(new TypeError('secret upstream detail')).includes('secret')) throw new Error('Raw runtime/provider errors must never reach users.');
if (chatState.errorText({ name: 'AbortError' }) !== chatState.stoppedText()) throw new Error('Abort state must use canonical stopped copy.');
if (!runtime.includes('const CHAT_STATE=window.MimirChatStateCopy||{};')) throw new Error('P0 shell must consume shared chat-state copy.');
if (!legacyRuntime.includes('const chatState=window.MimirChatStateCopy||{};')) throw new Error('Legacy runtime must consume shared chat-state copy.');
if (!legacyRuntime.includes('isPendingContent(message.content)')) throw new Error('Translated pending copy must stay out of persisted context.');
if (!runtime.includes('!CHAT_STATE.transient?.(message.content)')) throw new Error('P0 feedback context must exclude transient chat state.');
if (runtime.includes("status(title+' failed: '+(error?.message")) throw new Error('P0 chat must not expose raw error messages.');
if (!html.includes('chat-state-copy.js?v=20260714-truthful-chat-state-v1')) throw new Error('Public shell must load cache-busted chat-state copy.');
if (html.indexOf('chat-state-copy.js?v=') > html.indexOf('p0-chat-shell.js?v=')) throw new Error('Chat-state copy must load before the P0 shell.');
if (!manifest.includes('"chat-state-copy.js": "20260714-truthful-chat-state-v1"')) throw new Error('Asset manifest must track chat-state copy.');

function fail(message) {
  throw new Error(message);
}

function assertIncludes(actual, needle, message) {
  if (!String(actual).includes(needle)) fail(`${message}: missing ${needle}`);
}

function assertExcludes(actual, needle, message) {
  if (String(actual).includes(needle)) fail(`${message}: should not include ${needle}`);
}

function assertNotMatches(actual, pattern, message) {
  if (pattern.test(String(actual))) fail(`${message}: matched ${pattern}`);
}

function fakeElement() {
  return {
    attrs: {},
    dataset: {},
    title: '',
    innerHTML: '',
    setAttribute(name, value) {
      this.attrs[name] = String(value);
    }
  };
}

const hosted = testApi.state.models[0];
testApi.state.releaseReadiness = {
  state: 'ready',
  hostedReady: true,
  compareReady: true,
  swarmPreviewReady: true,
  verifiedRoutes: 5
};
hosted.liveE2EVerified = true;
hosted.executable = true;
hosted.selectable = true;
const hostedScore = testApi.routeScore(
  hosted,
  'Who is president of USA?',
  'Donald J. Trump is the current president of the United States.',
  746
);

// Real gateway payload shapes (measured live on api.mmir.ai 2026-07-15):
// string form from capability routes, object form (v2) from synthesis routes, or absent.
const verifiedProof = testApi.answerProofLine({
  mmir: {
    answer_proof_line: 'Verifisert med live-kilde',
    sources: [{
      id: 'norges-bank-policy-rate',
      title: 'Norges Bank styringsrente',
      url: 'https://data.norges-bank.no/api/data/IR/B.KPRA.SD.R?lastNObservations=1&format=sdmx-json'
    }]
  }
});
if (testApi.proofTrustLabel(verifiedProof) !== 'Verifisert') fail('Capability proof string must map to the verified trust value.');
const consensusProof = testApi.answerProofLine({
  mmir: {
    answer_proof_line: {
      object: 'mmir.answer_proof_line',
      schema_version: '2026-07-02-answer-proof-line-v2',
      status: 'consensus_signed',
      label: 'Bevis: 2/3 enige · signert kvittering',
      consensus: { status: 'high', agree_count: 2, total: 3, public_ui_label: 'Høy tillit - 2/3 ruter enige' },
      verification: { deterministic: false, source_count: 0, source_hosts: [], source_trust: [], primary_source_trust: null },
      receipt: { signed: true, keyed: true }
    }
  }
});
if (testApi.proofTrustLabel(consensusProof) !== 'Signert kvittering') fail('consensus_signed proof must map to the signed-receipt value, never a verified badge.');
if (testApi.answerProofLine({ mmir: {} }) !== null) fail('Missing answer_proof_line must parse to null, not a fabricated proof.');

const topStatus = testApi.compactStatusText(testApi.answerStatus(hosted, hostedScore, '', verifiedProof), 6);
assertIncludes(topStatus, 'Verifisert', 'Top-right green status must show the trust value when the gateway proof is verified.');
assertIncludes(topStatus, 'beskyttet', 'Top-right green status must show hosted protection truth, not private.');
assertNotMatches(topStatus, /Verifisert\s*·\s*privat/i, 'Hosted top-right status must not claim private mode.');
assertExcludes(topStatus, '746ms', 'Top-right green status must keep answer latency behind details.');
assertExcludes(topStatus, 'Score ', 'Top-right green status must keep route score behind details.');
assertExcludes(topStatus, 'Supergenious', 'Public status text must use Supergeni branding.');
const unprovenStatus = testApi.compactStatusText(testApi.answerStatus(hosted, hostedScore, '', null), 6);
assertExcludes(unprovenStatus, 'Verifisert', 'Top-right status must never fabricate a verified badge without gateway proof.');
assertIncludes(unprovenStatus, 'beskyttet', 'Top-right status keeps the true privacy value even without proof.');

const bestAnswerEl = fakeElement();
testApi.noteAnswerProof(verifiedProof);
testApi.renderMicroStatus(
  bestAnswerEl,
  'Supergeni ready · hosted · Best answer synthesis · No paid route · api.mmir.ai/routing/score · Winner: Supergeni · API score 84 · complete answer · hosted default route · acceptable latency · 746ms',
  'hosted'
);
assertIncludes(bestAnswerEl.innerHTML, 'Verifisert', 'Under-chat green micro-status must show verified value when the gateway proof is verified.');
assertIncludes(bestAnswerEl.innerHTML, 'beskyttet', 'Under-chat hosted micro-status must show protected value, not private.');
assertNotMatches(bestAnswerEl.innerHTML, /Verifisert\s*·\s*privat/i, 'Hosted under-chat status must not claim private mode.');
assertExcludes(bestAnswerEl.innerHTML, 'API score 84', 'Under-chat green micro-status must keep score evidence behind details.');
assertExcludes(bestAnswerEl.innerHTML, '746ms', 'Under-chat green micro-status must keep answer latency evidence behind details.');
assertExcludes(bestAnswerEl.innerHTML, 'api.mmir.ai', 'Under-chat green micro-status must keep API host in details, not visible first-user text.');
assertExcludes(bestAnswerEl.innerHTML, 'Winner:', 'Under-chat green micro-status must not show winner clutter.');
assertIncludes(bestAnswerEl.attrs['aria-label'], 'No paid route', 'Full route receipt must remain available through aria-label/title even when visible text is compact.');
assertIncludes(bestAnswerEl.attrs['aria-label'], 'Winner: Supergeni', 'Full route receipt must keep winner data inspectable outside visible text.');

const unprovenEl = fakeElement();
testApi.noteAnswerProof(null);
testApi.renderMicroStatus(
  unprovenEl,
  'Supergeni ready · hosted · Best answer synthesis · No paid route · api.mmir.ai/routing/score · Winner: Supergeni · API score 84 · complete answer · hosted default route · acceptable latency · 746ms',
  'hosted'
);
assertExcludes(unprovenEl.innerHTML, 'Verifisert', 'Under-chat status must never fabricate a verified badge without gateway proof.');

const localEl = fakeElement();
testApi.noteAnswerProof(verifiedProof);
testApi.renderMicroStatus(
  localEl,
  'Local node ready · 5 models · Private · This Mac · Score 82 · avg 650ms',
  'local'
);
assertExcludes(localEl.innerHTML, 'Verifisert', 'Local attach status must not inherit a hosted answer proof.');
assertIncludes(localEl.innerHTML, 'Local node ready', 'Local attach status must show the plain readiness value.');
assertIncludes(localEl.innerHTML, 'privat', 'Local attach status must show privacy value.');
assertExcludes(localEl.innerHTML, 'Score 82', 'Local attach status must keep route score behind details.');
assertExcludes(localEl.innerHTML, 'avg 650ms', 'Local attach status must keep measured latency behind details.');
assertIncludes(localEl.attrs['aria-label'], '5 models', 'Full local route receipt must keep model count inspectable.');
assertIncludes(localEl.attrs['aria-label'], 'avg 650ms', 'Full local route receipt must keep measured latency inspectable.');
assertIncludes(localEl.innerHTML, 'data-p0-route-action="model-health"', 'Local-ready route status must keep Model health one tap away.');
assertIncludes(localEl.innerHTML, 'Model health', 'Local-ready route status must label the fallback CTA clearly.');

const singleRouteEl = fakeElement();
testApi.renderMicroStatus(
  singleRouteEl,
  'Supergeni ready · hosted default route · No paid route · complete answer',
  'hosted'
);
assertIncludes(singleRouteEl.innerHTML, 'data-p0-route-action="connect-local"', 'Single-route hosted status must keep local setup one tap away.');
assertIncludes(singleRouteEl.innerHTML, 'Connect local', 'Single-route hosted status must label the local setup CTA clearly.');

testApi.recordRouteBenchmark(hosted, { score: 84, elapsedMs: 746, answer_class: 'complete', latency_class: 'responsive' });
assertIncludes(testApi.routeMicroStatus(hosted), 'Score ', 'Route micro-status helper must preserve effective score.');
assertIncludes(testApi.routeMicroStatus(hosted), 'avg 746ms', 'Route micro-status helper must preserve benchmark latency.');

testApi.state.models.push(
  {
    id: 'poolside/laguna-xs.2:free',
    label: 'OpenRouter: poolside/laguna-xs.2:free',
    route: 'hosted',
    model: 'poolside/laguna-xs.2:free',
    provider: 'OpenRouter',
    routeClass: 'external-untrusted-free',
    trustLevel: 'external-untrusted-free',
    executable: true,
    selectable: true,
    liveE2EVerified: true,
    score: 86
  },
  {
    id: 'gemini-2.5-flash',
    label: 'Google: gemini-2.5-flash',
    route: 'hosted',
    model: 'gemini-2.5-flash',
    provider: 'Google',
    routeClass: 'external-untrusted-free',
    trustLevel: 'external-untrusted-free',
    executable: true,
    selectable: true,
    liveE2EVerified: true,
    score: 86
  },
  {
    id: 'nvidia/nemotron-mini-4b-instruct',
    label: 'NVIDIA: nemotron-mini-4b-instruct',
    route: 'hosted',
    model: 'nvidia/nemotron-mini-4b-instruct',
    provider: 'NVIDIA',
    routeClass: 'external-untrusted-free',
    trustLevel: 'external-untrusted-free',
    executable: true,
    selectable: true,
    liveE2EVerified: true,
    score: 86
  },
  {
    id: 'qwen/qwen3-32b',
    label: 'Groq: qwen/qwen3-32b',
    route: 'hosted',
    model: 'qwen/qwen3-32b',
    provider: 'Groq',
    routeClass: 'external-untrusted-free',
    trustLevel: 'external-untrusted-free',
    routeType: 'external_provider',
    routeState: 'public_untrusted_free_available',
    availability: 'available',
    executable: true,
    selectable: true,
    liveE2EVerified: true,
    score: 86
  }
);
testApi.state.routeInventory = {
  activeRoutes: 5,
  futureRoutes: 43,
  totalRoutes: 64,
  activePublicProviderRoutes: 4,
  activeExternalNodeRoutes: 0,
  visibleCandidateCount: 43
};
assertIncludes(testApi.routeMicroStatus(hosted), '5 live routes', 'Route micro-status must surface connected route capacity in subtle green text.');
assertIncludes(testApi.routeMicroStatus(hosted), '43 queued', 'Route micro-status must surface queued intelligence in subtle green text.');
assertIncludes(testApi.routeMicroStatus(hosted), '64 visible total', 'Route micro-status must surface total visible model inventory in subtle green text.');
assertIncludes(testApi.routeMicroStatus(hosted), 'OpenRouter live', 'Route micro-status must name active OpenRouter intelligence.');
assertIncludes(testApi.routeMicroStatus(hosted), 'NVIDIA live', 'Route micro-status must name active NVIDIA intelligence.');
assertIncludes(testApi.routeMicroStatus(hosted), 'Google live', 'Route micro-status must name active Google intelligence.');
assertIncludes(testApi.routeMicroStatus(hosted), 'Groq live', 'Route micro-status must name active Groq intelligence.');
const poolEl = fakeElement();
testApi.noteAnswerProof(consensusProof);
testApi.renderMicroStatus(
  poolEl,
  'Best answer · 5 routes compared · 3 answered · 2 quiet · signed receipts · No paid route · 4 live provider routes · OpenRouter live + NVIDIA live + Google live + Groq live · 43 queued · 64 visible total · Winner: Supergeni · Score 96 · OpenRouter 1370ms Score 83',
  'hosted'
);
assertExcludes(poolEl.innerHTML, 'Spør 5 AI - beste vinner', 'Under-chat micro-status must not present MMIR orchestration as the answer writer.');
assertIncludes(poolEl.innerHTML, '>Spør 5 AI<', 'Under-chat micro-status may expose multi-model comparison as an explicit user tool.');
assertIncludes(poolEl.innerHTML, 'data-p0-route-action="boost-answer-live"', 'Under-chat micro-status must expose one direct multi-AI composer action.');
assertIncludes(poolEl.innerHTML, 'p0-route-cta', 'Under-chat micro-status must render the multi-AI action as a compact route CTA.');
assertIncludes(poolEl.innerHTML, 'Signert kvittering', 'Under-chat micro-status must show the gateway-proven trust value.');
assertExcludes(poolEl.innerHTML, 'Verifisert', 'consensus_signed swarm proof must not be inflated to a verified badge.');
assertIncludes(poolEl.innerHTML, 'beskyttet', 'Under-chat hosted swarm status must show protected value.');
assertNotMatches(poolEl.innerHTML, /(Verifisert|Signert kvittering)\s*·\s*privat/i, 'Hosted swarm status must not claim private mode.');
assertExcludes(poolEl.innerHTML, '3 answered', 'Under-chat micro-status must keep successful-provider count behind details.');
assertExcludes(poolEl.innerHTML, '2 quiet', 'Under-chat micro-status must keep quiet throttled routes behind details.');
assertExcludes(poolEl.innerHTML, 'signed receipts', 'Under-chat micro-status must keep signed receipt proof behind details.');
assertExcludes(poolEl.innerHTML, 'No paid route', 'Under-chat micro-status must keep no-paid proof behind details.');
assertIncludes(poolEl.attrs['aria-label'], '43 queued', 'Full gateway compare receipt must keep queued route data inspectable.');
assertIncludes(poolEl.attrs['aria-label'], '64 visible total', 'Full gateway compare receipt must keep visible route data inspectable.');
assertIncludes(poolEl.attrs['aria-label'], 'Groq live', 'Full gateway compare receipt must preserve active Groq truth.');
assertExcludes(poolEl.innerHTML, 'demoted', 'Under-chat micro-status must avoid demoted/error language for hidden quiet routes.');
assertExcludes(poolEl.innerHTML, 'Winner:', 'Under-chat micro-status must keep winner detail out of visible text.');
assertIncludes(poolEl.attrs['aria-label'], 'Winner: Supergeni', 'Full gateway compare receipt must keep winner detail inspectable.');

console.log('P0 subtle status smoke passed.');
