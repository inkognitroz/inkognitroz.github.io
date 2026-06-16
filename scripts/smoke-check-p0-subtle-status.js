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
assertIncludes(topStatus, 'Supergeni answered in 746ms', 'Top-right green status must keep answer latency visible.');
assertIncludes(topStatus, 'hosted route', 'Top-right green status must keep the route class visible as subtle text.');
assertIncludes(topStatus, 'Score ', 'Top-right green status must keep route score visible.');
assertExcludes(topStatus, 'Supergenious', 'Public status text must use Supergeni branding.');

const bestAnswerEl = fakeElement();
testApi.renderMicroStatus(
  bestAnswerEl,
  'Supergeni ready · hosted · Best answer synthesis · No paid route · api.mmir.ai/routing/score · Winner: Supergeni · API score 84 · complete answer · hosted default route · acceptable latency · 746ms',
  'hosted'
);
assertIncludes(bestAnswerEl.innerHTML, 'Supergeni', 'Under-chat green micro-status must keep the active route label.');
assertIncludes(bestAnswerEl.innerHTML, 'API score 84', 'Under-chat green micro-status must keep score evidence.');
assertIncludes(bestAnswerEl.innerHTML, '746ms', 'Under-chat green micro-status must keep answer latency evidence.');
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
assertIncludes(localEl.innerHTML, 'Local node ready', 'Local attach status must be condensed, not repeated as a large chip.');
assertIncludes(localEl.innerHTML, '5 models', 'Local attach status must keep model count in subtle text.');
assertIncludes(localEl.innerHTML, 'Private', 'Local attach status must keep privacy state in subtle text.');
assertIncludes(localEl.innerHTML, 'Score 82', 'Local attach status must keep route score in subtle text.');
assertIncludes(localEl.innerHTML, 'avg 650ms', 'Local attach status must keep measured latency in subtle text.');

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
  }
);
testApi.state.routeInventory = {
  activeRoutes: 3,
  futureRoutes: 43,
  totalRoutes: 63,
  activePublicProviderRoutes: 2,
  activeExternalNodeRoutes: 0,
  visibleCandidateCount: 43
};
assertIncludes(testApi.routeMicroStatus(hosted), '3 live routes', 'Route micro-status must surface connected route capacity in subtle green text.');
assertIncludes(testApi.routeMicroStatus(hosted), '43 queued', 'Route micro-status must surface queued intelligence in subtle green text.');
assertIncludes(testApi.routeMicroStatus(hosted), '63 visible total', 'Route micro-status must surface total visible model inventory in subtle green text.');
const poolEl = fakeElement();
testApi.renderMicroStatus(
  poolEl,
  'Best answer · 5 routes compared · 3 answered · 2 quiet · signed receipts · No paid route · 3 live provider routes · 43 queued · 63 visible total · Winner: Supergeni · Score 96 · OpenRouter 1370ms Score 83',
  'hosted'
);
assertIncludes(poolEl.innerHTML, '5 routes compared', 'Under-chat micro-status must keep compared route count visible as subtle text.');
assertIncludes(poolEl.innerHTML, '3 answered', 'Under-chat micro-status must show successful provider answer count as subtle text.');
assertIncludes(poolEl.innerHTML, '2 quiet', 'Under-chat micro-status must show quiet throttled routes without noisy failure text.');
assertIncludes(poolEl.innerHTML, 'signed receipts', 'Under-chat micro-status must keep signed receipt proof visible as subtle text.');
assertIncludes(poolEl.innerHTML, 'No paid route', 'Under-chat micro-status must keep no-paid proof visible as subtle text.');
assertIncludes(poolEl.attrs['aria-label'], '43 queued', 'Full gateway compare receipt must keep queued route data inspectable.');
assertIncludes(poolEl.attrs['aria-label'], '63 visible total', 'Full gateway compare receipt must keep visible route data inspectable.');
assertExcludes(poolEl.innerHTML, 'demoted', 'Under-chat micro-status must avoid demoted/error language for hidden quiet routes.');
assertExcludes(poolEl.innerHTML, 'Winner:', 'Under-chat micro-status must keep winner detail out of visible text.');
assertIncludes(poolEl.attrs['aria-label'], 'Winner: Supergeni', 'Full gateway compare receipt must keep winner detail inspectable.');

console.log('P0 subtle status smoke passed.');
