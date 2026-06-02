import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const runtimePath = resolve(root, 'public/apps/mimir-chat-portal/p0-chat-shell.js');
const runtime = readFileSync(runtimePath, 'utf8');
const bootBlock = "  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});\n  else boot();";
const exportBlock = "  globalThis.__p0RouteTagTest={state,explicitMentionDecision,smartDecision,cleanComparePrompt,routeReason,localMentionModel,hostedMentioned};";

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

testApi.state.models = [hosted, gemma];
testApi.state.activeModelId = hosted.id;

const compare = testApi.explicitMentionDecision('@supergenius @gemma who is president of USA?');
assertEqual(compare.mode, 'compare', 'Explicit hosted + local tags must compare routes');
assertEqual(compare.model.id, gemma.id, 'Explicit compare must preserve requested local model');
assertEqual(compare.prompt, 'who is president of USA?', 'Explicit compare must remove route tags from model prompt');

const bestAnswer = testApi.smartDecision('Give me the best answer in parallel: what is the capital of Japan?');
assertEqual(bestAnswer.mode, 'compare', 'Best Answer wording must trigger the two-route compare/synthesis path');
assertEqual(bestAnswer.model.id, gemma.id, 'Best Answer must use the best discovered local model alongside Supergenious');

const localOnly = testApi.explicitMentionDecision('@gemma who is president of USA?');
assertEqual(localOnly.mode, 'single', 'Explicit local tag must route to local model');
assertEqual(localOnly.model.id, gemma.id, 'Explicit local tag must preserve requested local model');
assertIncludes(localOnly.reason, 'Local-only: public facts may be outdated', 'Explicit local public-fact route must warn');
assertEqual(localOnly.prompt, 'who is president of USA?', 'Explicit local prompt must remove route tag');

const hostedOnly = testApi.explicitMentionDecision('@supergenius hi');
assertEqual(hostedOnly.mode, 'single', 'Explicit hosted tag must route to hosted model');
assertEqual(hostedOnly.model.id, hosted.id, 'Explicit hosted tag must preserve Supergenious route');
assertEqual(hostedOnly.prompt, 'hi', 'Explicit hosted prompt must remove route tag');

testApi.state.activeModelId = gemma.id;
const guarded = testApi.smartDecision('Who is president of USA?');
assertEqual(guarded.mode, 'single', 'Public fact guard must stay single-route');
assertEqual(guarded.model.id, hosted.id, 'Public fact guard must route local-selected public facts to hosted Supergenious');
assertIncludes(guarded.reason, 'Quality guard: public facts', 'Public fact guard must label the hosted route');

testApi.state.models = [hosted];
const missingLocal = testApi.explicitMentionDecision('@supergenius @gemma compare this');
assertEqual(missingLocal.mode, 'missing-local', 'Explicit compare must fail clearly before local model discovery');

console.log('P0 explicit route tag smoke check passed.');
