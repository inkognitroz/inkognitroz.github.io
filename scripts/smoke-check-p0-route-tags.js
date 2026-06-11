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
const exportBlock = "  globalThis.__p0RouteTagTest={state,explicitMentionDecision,smartDecision,cleanComparePrompt,routeReason,localMentionModel,hostedMentioned,routeScore,winningRoute,scoreSummary,apiScoreForModel,apiWinner,routeScoreCandidate,latencyTargetMs,latencyTargetReceipt,recordRouteBenchmark,effectiveModelScore,routeBenchmarkSummary,routeRankState,routeRankSummary,routeMicroStatus,routeRankMap,bestLocalModel,intelligencePoolSummary};";

if (!runtime.includes(bootBlock)) {
  throw new Error('P0 route tag smoke cannot find boot block.');
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

const testApi = context.__p0RouteTagTest;
if (!testApi) throw new Error('P0 route tag smoke did not expose test API.');

function fail(message) {
  throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) fail(`${message}: expected ${expected}, got ${actual}`);
}

function assertIncludes(actual, needle, message) {
  if (!String(actual).includes(needle)) fail(`${message}: missing ${needle}`);
}

const hosted = testApi.state.models[0];
const gemma = {
  id: 'local-gemma3-270m',
  label: 'gemma3:270m',
  route: 'local',
  detail: 'This Mac',
  tags: ['Private', 'Local'],
  score: 90,
  model: 'gemma3:270m'
};
const qwenTiny = {
  id: 'local-qwen2-05b',
  label: 'qwen2.5:0.5b',
  route: 'local',
  detail: 'Tiny private model',
  tags: ['Private', 'Local', 'Weak'],
  quality: 'weak-facts',
  score: 45,
  model: 'qwen2.5:0.5b'
};

testApi.state.models = [hosted, gemma, qwenTiny];
testApi.state.activeModelId = hosted.id;

const pool = testApi.intelligencePoolSummary();
assertEqual(pool.liveRoutes, 3, 'Intelligence pool must count hosted plus discovered local routes');
assertEqual(pool.localRoutes, 2, 'Intelligence pool must count local routes separately');
assertEqual(pool.compareReady, true, 'Intelligence pool must mark Best Answer ready after local discovery');
assertEqual(pool.stateLabel, 'Best Answer ready', 'Intelligence pool summary must expose parallel answer readiness without rendering dropdown clutter');
if (/earn|credit|payout|money/i.test(pool.details)) {
  fail('Public intelligence pool summary must not expose unproven marketplace or earning claims');
}

const compare = testApi.explicitMentionDecision('@supergenius @gemma who is president of USA?');
assertEqual(compare.mode, 'compare', 'Explicit hosted + local tags must compare routes');
assertEqual(compare.model.id, gemma.id, 'Explicit compare must preserve requested local model');
assertEqual(compare.prompt, 'who is president of USA?', 'Explicit compare must remove route tags from model prompt');

const bestAnswer = testApi.smartDecision('Give me the best answer in parallel: what is the capital of Japan?');
assertEqual(bestAnswer.mode, 'compare', 'Best Answer wording must trigger the two-route compare/synthesis path');
assertEqual(bestAnswer.model.id, gemma.id, 'Best Answer must use the best discovered local model alongside Supergeni');

const hostedPublicScore = testApi.routeScore(hosted, 'Who is president of USA?', 'Donald J. Trump is the current president.', 400);
const localPublicScore = testApi.routeScore(gemma, 'Who is president of USA?', 'Joe Biden', 700);
if (hostedPublicScore.score <= localPublicScore.score) {
  fail(`Public facts must prefer hosted route score: hosted ${hostedPublicScore.score}, local ${localPublicScore.score}`);
}
const publicWinner = testApi.winningRoute(hosted, hostedPublicScore, gemma, localPublicScore);
assertEqual(publicWinner.model.id, hosted.id, 'Public fact Best Answer winner must be Supergeni');
assertIncludes(publicWinner.summary, 'Winner: Supergeni', 'Winner summary must name the hosted route');
assertIncludes(testApi.scoreSummary(hostedPublicScore), 'Score ', 'Score summary must expose the score');
assertIncludes(testApi.scoreSummary(hostedPublicScore), 'target 2.5s met', 'Hosted first answer receipt must show the answer-time target compactly.');
assertIncludes(testApi.scoreSummary(localPublicScore), 'target 8.0s met', 'Local first answer receipt must show its local answer-time target compactly.');

const apiScoring = {
  scores: [
    { node_id: 'browser-guide', model_id: 'mmir-supergenius', score: 100, latency_ms: 300, freshness_state: 'verified', factuality_guardrail_action: 'allow_verified_answer', reasons: ['complete answer', 'public fact fit'] },
    { route_class: 'local', model_id: 'gemma3:270m', score: 77, latency_ms: 1200, freshness_state: 'stale', factuality_guardrail_action: 'demote_stale_answer', reasons: ['complete answer', 'small local model may be stale'] }
  ],
  winner: { route_class: 'free', node_id: 'browser-guide', model_id: 'mmir-supergenius', score: 100, reason: 'Best fit: complete answer' }
};
const apiHostedScore = testApi.apiScoreForModel(apiScoring, hosted, hostedPublicScore);
const apiLocalScore = testApi.apiScoreForModel(apiScoring, gemma, localPublicScore);
const apiPublicWinner = testApi.apiWinner(apiScoring, hosted, apiHostedScore, gemma, apiLocalScore);
assertIncludes(testApi.scoreSummary(apiHostedScore), 'API score ', 'API scoring summary must be visible when server scoring is available');
assertIncludes(testApi.scoreSummary(apiHostedScore), 'verified fact', 'Verified public fact guardrail must be visible in compact route receipts');
assertIncludes(testApi.scoreSummary(apiLocalScore), 'stale fact demoted', 'Stale local public fact guardrail must be visible before selecting a weak route');
assertIncludes(apiPublicWinner.summary, 'API score 100', 'API winner summary must use server-side route scoring');

const hostedCandidate = testApi.routeScoreCandidate(hosted, 'The capital of Japan is Tokyo.', 300, false);
assertEqual(hostedCandidate.route_id, 'browser-guide/free', 'Hosted scoring candidate must use the API route id');
assertEqual(hostedCandidate.provider, 'mmir', 'Hosted scoring candidate must not use browser/provider secrets');
assertEqual(hostedCandidate.latency_target_ms, 3000, 'Hosted compare scoring candidate must include the compare latency target.');
assertEqual(hostedCandidate.latency_target_state, 'met', 'Hosted compare scoring candidate must mark the target as met when in budget.');

const hostedCompareScore = testApi.routeScore(hosted, 'compare quickly', 'This is a complete hosted answer.', 2800, false, 'compare');
assertIncludes(testApi.scoreSummary(hostedCompareScore), 'target 3.0s met', 'Hosted compare answer must carry its compare latency target.');
const slowLocalCompareScore = testApi.routeScore(gemma, 'compare privately', 'This is a complete local answer.', 9500, false, 'compare');
assertIncludes(testApi.scoreSummary(slowLocalCompareScore), 'over 9.0s target', 'Slow local compare answer must be labeled over target without blocking chat.');

testApi.recordRouteBenchmark(gemma, { score: 82, elapsedMs: 650, answer_class: 'complete', latency_class: 'fast' });
testApi.recordRouteBenchmark(qwenTiny, { score: 34, elapsedMs: 3600, answer_class: 'thin', latency_class: 'acceptable' });
const rankMap = testApi.routeRankMap(testApi.state.models);
if (rankMap[gemma.id] >= rankMap[qwenTiny.id]) {
  fail(`Route benchmark ranking must demote weak/slow local routes: gemma rank ${rankMap[gemma.id]}, qwen rank ${rankMap[qwenTiny.id]}`);
}
assertEqual(testApi.bestLocalModel().id, gemma.id, 'Best local model must use benchmark-adjusted route ranking');
assertIncludes(testApi.routeBenchmarkSummary(gemma), 'avg 650ms', 'Route benchmark summary must expose measured latency');
assertIncludes(testApi.routeMicroStatus(gemma), 'Score ', 'Route micro-status must expose effective route score in the compact composer line');
assertIncludes(testApi.routeMicroStatus(gemma), 'avg 650ms', 'Route micro-status must expose measured route latency without opening a dashboard');
assertEqual(testApi.routeRankState(qwenTiny), 'demoted', 'Route rank state must demote weak or slow routes.');
assertIncludes(testApi.routeRankSummary(qwenTiny), 'Demoted', 'Demoted route summary must stay compact but explicit.');
assertIncludes(testApi.routeRankSummary(qwenTiny), 'weak score', 'Demoted route summary must explain weak scores.');
assertIncludes(testApi.routeRankSummary(qwenTiny), 'slow avg 3.6s', 'Demoted route summary must explain slow average latency.');
assertIncludes(testApi.routeMicroStatus(qwenTiny), 'Demoted', 'Composer micro-status must surface demotion without adding buttons.');
assertIncludes(testApi.routeMicroStatus(qwenTiny), 'weak score', 'Composer micro-status must keep the demotion reason visible.');
if (testApi.effectiveModelScore(qwenTiny) >= testApi.effectiveModelScore(gemma)) {
  fail('Effective route score must keep slow/weak local model below stronger measured local model');
}

const hostedPrivateScore = testApi.routeScore(hosted, 'Answer privately using this Mac only', 'I can answer.', 400);
const localPrivateScore = testApi.routeScore(gemma, 'Answer privately using this Mac only', 'I can answer locally.', 700);
if (localPrivateScore.score <= hostedPrivateScore.score) {
  fail(`Private/local prompts must prefer local route score: local ${localPrivateScore.score}, hosted ${hostedPrivateScore.score}`);
}

const localOnly = testApi.explicitMentionDecision('@gemma who is president of USA?');
assertEqual(localOnly.mode, 'single', 'Explicit local tag must route to local model');
assertEqual(localOnly.model.id, gemma.id, 'Explicit local tag must preserve requested local model');
assertIncludes(localOnly.reason, 'Local-only: public facts may be outdated', 'Explicit local public-fact route must warn');
assertEqual(localOnly.prompt, 'who is president of USA?', 'Explicit local prompt must remove route tag');

const hostedOnly = testApi.explicitMentionDecision('@supergenius hi');
assertEqual(hostedOnly.mode, 'single', 'Explicit hosted tag must route to hosted model');
assertEqual(hostedOnly.model.id, hosted.id, 'Explicit hosted tag must preserve Supergeni route');
assertEqual(hostedOnly.prompt, 'hi', 'Explicit hosted prompt must remove route tag');

testApi.state.activeModelId = gemma.id;
const guarded = testApi.smartDecision('Who is president of USA?');
assertEqual(guarded.mode, 'single', 'Public fact guard must stay single-route');
assertEqual(guarded.model.id, hosted.id, 'Public fact guard must route local-selected public facts to hosted Supergeni');
assertIncludes(guarded.reason, 'Quality guard: public facts', 'Public fact guard must label the hosted route');

testApi.state.models = [hosted];
const singleRoutePool = testApi.intelligencePoolSummary();
assertEqual(singleRoutePool.liveRoutes, 1, 'Hosted-only intelligence pool must stay single-route');
assertEqual(singleRoutePool.compareReady, false, 'Hosted-only intelligence pool must not claim parallel readiness');
assertEqual(singleRoutePool.stateLabel, 'Single route now', 'Hosted-only summary must be honest before local discovery');
const missingLocal = testApi.explicitMentionDecision('@supergenius @gemma compare this');
assertEqual(missingLocal.mode, 'missing-local', 'Explicit compare must fail clearly before local model discovery');

console.log('P0 explicit route tag smoke check passed.');
