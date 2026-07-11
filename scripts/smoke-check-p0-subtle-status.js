import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const runtimePath = resolve(root, 'public/apps/mimir-chat-portal/p0-chat-shell.js');
const storagePath = resolve(root, 'public/apps/mimir-chat-portal/p0-storage.js');
const routeReceiptsPath = resolve(root, 'public/apps/mimir-chat-portal/p0-route-receipts.js');
const routeBenchmarksPath = resolve(root, 'public/apps/mimir-chat-portal/p0-route-benchmarks.js');
const historyPath = resolve(root, 'public/apps/mimir-chat-portal/p0-history.js');
const runtime = readFileSync(runtimePath, 'utf8');
const storageHelper = readFileSync(storagePath, 'utf8');
const routeReceiptsHelper = readFileSync(routeReceiptsPath, 'utf8');
const routeBenchmarksHelper = readFileSync(routeBenchmarksPath, 'utf8');
const historyHelper = readFileSync(historyPath, 'utf8');
const bootBlock = "  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});\n  else boot();";
const exportBlock = "  globalThis.__p0SubtleStatusTest={state,renderMicroStatus,compactStatusText,answerStatus,routeScore,routeMicroStatus,recordRouteBenchmark,effectiveModelScore};";

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
vm.runInContext(storageHelper, context, { filename: storagePath });
vm.runInContext(routeReceiptsHelper, context, { filename: routeReceiptsPath });
vm.runInContext(routeBenchmarksHelper, context, { filename: routeBenchmarksPath });
vm.runInContext(historyHelper, context, { filename: historyPath });
vm.runInContext(runtime.replace(bootBlock, exportBlock), context, { filename: runtimePath });

const testApi = context.__p0SubtleStatusTest;
if (!testApi) throw new Error('P0 subtle status smoke did not expose test API.');

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
const hostedScore = testApi.routeScore(
  hosted,
  'Who is president of USA?',
  'Donald J. Trump is the current president of the United States.',
  746
);
const topStatus = testApi.compactStatusText(testApi.answerStatus(hosted, hostedScore), 6);
assertIncludes(topStatus, 'Verifisert', 'Top-right green status must show the trust value first.');
assertIncludes(topStatus, 'beskyttet', 'Top-right green status must show hosted protection truth, not private.');
assertNotMatches(topStatus, /Verifisert\s*·\s*privat/i, 'Hosted top-right status must not claim private mode.');
assertExcludes(topStatus, '746ms', 'Top-right green status must keep answer latency behind details.');
assertExcludes(topStatus, 'Score ', 'Top-right green status must keep route score behind details.');
assertExcludes(topStatus, 'Supergenious', 'Public status text must use Supergeni branding.');

const bestAnswerEl = fakeElement();
testApi.renderMicroStatus(
  bestAnswerEl,
  'Supergeni ready · hosted · Best answer synthesis · No paid route · api.mmir.ai/routing/score · Winner: Supergeni · API score 84 · complete answer · hosted default route · acceptable latency · 746ms',
  'hosted'
);
assertIncludes(bestAnswerEl.innerHTML, 'Verifisert', 'Under-chat green micro-status must show verified value, not raw telemetry.');
assertIncludes(bestAnswerEl.innerHTML, 'beskyttet', 'Under-chat hosted micro-status must show protected value, not private.');
assertNotMatches(bestAnswerEl.innerHTML, /Verifisert\s*·\s*privat/i, 'Hosted under-chat status must not claim private mode.');
assertExcludes(bestAnswerEl.innerHTML, 'API score 84', 'Under-chat green micro-status must keep score evidence behind details.');
assertExcludes(bestAnswerEl.innerHTML, '746ms', 'Under-chat green micro-status must keep answer latency evidence behind details.');
assertExcludes(bestAnswerEl.innerHTML, 'api.mmir.ai', 'Under-chat green micro-status must keep API host in details, not visible first-user text.');
assertExcludes(bestAnswerEl.innerHTML, 'Winner:', 'Under-chat green micro-status must not show winner clutter.');
assertIncludes(bestAnswerEl.attrs['aria-label'], 'No paid route', 'Full route receipt must remain available through aria-label/title even when visible text is compact.');
assertIncludes(bestAnswerEl.attrs['aria-label'], 'Winner: Supergeni', 'Full route receipt must keep winner data inspectable outside visible text.');

const localEl = fakeElement();
testApi.renderMicroStatus(
  localEl,
  'Local node ready · 5 models · Private · This Mac · Score 82 · avg 650ms',
  'local'
);
assertIncludes(localEl.innerHTML, 'Verifisert', 'Local attach status must show verified value.');
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
testApi.renderMicroStatus(
  poolEl,
  'Best answer · 5 routes compared · 3 answered · 2 quiet · signed receipts · No paid route · 4 live provider routes · OpenRouter live + NVIDIA live + Google live + Groq live · 43 queued · 64 visible total · Winner: Supergeni · Score 96 · OpenRouter 1370ms Score 83',
  'hosted'
);
assertIncludes(poolEl.innerHTML, 'Spør 5 AI - beste vinner', 'Under-chat micro-status must show the swarm value in plain language.');
assertIncludes(poolEl.innerHTML, 'data-p0-route-action="boost-answer-live"', 'Under-chat micro-status must expose one direct multi-AI composer action.');
assertIncludes(poolEl.innerHTML, 'p0-route-cta', 'Under-chat micro-status must render the multi-AI action as a compact route CTA.');
assertIncludes(poolEl.innerHTML, 'Verifisert', 'Under-chat micro-status must show verified value.');
assertIncludes(poolEl.innerHTML, 'beskyttet', 'Under-chat hosted swarm status must show protected value.');
assertNotMatches(poolEl.innerHTML, /Verifisert\s*·\s*privat/i, 'Hosted swarm status must not claim private mode.');
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
