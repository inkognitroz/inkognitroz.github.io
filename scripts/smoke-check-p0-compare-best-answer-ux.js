import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const runtimePath = join(root, 'public', 'apps', 'mimir-chat-portal', 'p0-chat-shell.js');
const cssPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'p0-chat-shell.css');
const runtime = readFileSync(runtimePath, 'utf8');
const css = readFileSync(cssPath, 'utf8');

function fail(message) {
  throw new Error(message);
}

function requireText(haystack, needle, message) {
  if (!haystack.includes(needle)) fail(`${message}: missing ${needle}`);
}

function forbidText(haystack, needle, message) {
  if (haystack.includes(needle)) fail(`${message}: found ${needle}`);
}

function functionBody(source, name) {
  const startNeedle = `function ${name}(`;
  const start = source.indexOf(startNeedle);
  if (start < 0) fail(`Could not find ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  fail(`Could not parse ${name}`);
}

const addMenu = functionBody(runtime, 'renderAddMenu');

requireText(
  addMenu,
  "menuButton('connect-local','Connect local model'",
  'Add menu must expose local setup once as Connect local model'
);
requireText(
  addMenu,
  "menuButton('check-local','Refresh models'",
  'Add menu must keep a clear refresh path after connector install'
);
requireText(
  runtime,
  'Press + -> Connect local model to connect this computer.',
  'Model menu local hint must stay short and avoid repeating platform strategy copy'
);
forbidText(
  runtime,
  'expand the intelligence pool',
  'Model menu must not repeat intelligence-pool strategy copy in the compact route picker'
);
requireText(
  addMenu,
  "gatewayCompareAvailable()?'Intelligence pool':'Two models'",
  'Add menu may show a compact Intelligence pool section only when hosted compare routes are active'
);
forbidText(
  addMenu,
  'Smart routing',
  'Add menu must not bring back dashboard-style Smart routing cards'
);
requireText(
  addMenu,
  'pool.compareReady',
  'Add menu must truth-gate two-model tools behind a second active route'
);
requireText(
  addMenu,
  "menuSection(gatewayCompareAvailable()?'Intelligence pool':'Two models')",
  'Add menu must group parallel tools only when the intelligence pool is ready'
);
requireText(
  addMenu,
  "menuButton('compare-live','Compare answers'",
  'Add menu must expose Compare answers after Supergeni plus a local model are ready'
);
requireText(
  addMenu,
  "menuButton('best-answer-live','Best answer benchmark'",
  'Add menu must expose a scored Best Answer benchmark after two live routes are ready'
);
requireText(
  addMenu,
  "menuButton('discuss-topic','Model discussion'",
  'Add menu must expose model discussion through the proven compare/synthesis path'
);
forbidText(
  addMenu,
  'Add model',
  'Add menu should not reintroduce repeated Add model wording'
);
forbidText(
  addMenu,
  'Connect this computer as a private local node from chat.',
  'Add menu should avoid technical local-node detail in the compact toolbar menu'
);

const connectLocalCount = (addMenu.match(/'Connect local model'/g) || []).length;
if (connectLocalCount !== 1) {
  fail(`Add menu should contain exactly one Connect local model action, found ${connectLocalCount}`);
}

requireText(
  runtime,
  'function compareLiveRoutes(comparePrompt',
  'Compare flow must remain implemented behind prompt intent and explicit @model tags'
);
requireText(
  runtime,
  "const COMPARE_PATH=ROUTE_ADAPTER_CONFIG.comparePath||'/chat/compare';",
  'Gateway compare path must be configurable through the route adapter boundary'
);
requireText(
  runtime,
  'function compareGatewayRoutes(comparePrompt',
  'Active hosted/provider routes must use the gateway compare path'
);
requireText(
  runtime,
  'function compareAttemptIssueSummary(attempt)',
  'Gateway compare receipts must expose blocked/partial provider routes instead of hiding them'
);
requireText(
  runtime,
  'function gatewayComparePreferred(preferredModel=null)',
  'Gateway compare must be preferred in public mode without stealing private/local compare flows'
);
requireText(
  runtime,
  'fetchJson(API_URL+COMPARE_PATH',
  'Gateway compare must call the live API compare endpoint'
);
requireText(
  runtime,
  'function runTwoModelTool(action)',
  'Two-model menu tools must use the existing compare flow instead of separate unproven UI'
);
requireText(
  runtime,
  "compareLiveRoutes(prompt,partner,{mode:'compare'});",
  'Compare answers menu action must run the proven compare path'
);
requireText(
  runtime,
  "compareLiveRoutes(prompt,partner,{mode:'best-answer'});",
  'Best answer benchmark menu action must run the proven synthesis path'
);
requireText(
  runtime,
  'Discuss this topic from two model perspectives',
  'Model discussion must be implemented as a structured prompt over the proven synthesis path'
);
requireText(
  runtime,
  'function wantsCompareRoute(prompt)',
  'Best Answer language must trigger compare without adding toolbar buttons'
);
requireText(
  runtime,
  "status(title+' is asking '+hostedModel.label+' and '+localModel.label+' in parallel...'",
  'Compare flow must make dynamic parallel routing visible while running'
);
requireText(
  runtime,
  'Compare answer 1/2',
  'Compare flow must render the hosted route answer separately'
);
requireText(
  runtime,
  'Compare answer 2/2',
  'Compare flow must render the local route answer separately'
);
requireText(
  runtime,
  'scoreRoutesWithApi(prompt,hostedModel,hostedAnswerText',
  'Compare flow must ask the API scoring route for winner/demotion metadata'
);
requireText(
  runtime,
  'Best answer synthesis · No paid route',
  'Best Answer synthesis must keep the no-paid route receipt visible'
);
requireText(
  runtime,
  "latencyTargetReceipt(hostedModel,synthesisElapsedMs,'synthesis')",
  'Best Answer synthesis must carry a compact answer-time target receipt'
);
requireText(
  runtime,
  'recordRouteBenchmark(localModel,localScore)',
  'Compare flow must feed local route benchmark data back into ranking'
);
requireText(
  runtime,
  "return {mode:'compare',model:partner,prompt:cleanSmartPrompt(prompt)||prompt};",
  'Best Answer language must trigger the compare/synthesis path when a second active route exists'
);
requireText(
  runtime,
  "return {mode:'missing-local'",
  'Explicit multi-route tags must fail clearly before local discovery'
);
requireText(
  css,
  '.p0-message-compare',
  'Compare answers must have a distinguishable but non-dashboard message style'
);
forbidText(
  css,
  '.p0-featured-action',
  'P0 compare must not reserve special menu styling for removed compare buttons'
);
forbidText(
  css,
  '.p0-routing-hint',
  'P0 compare UX must not depend on old routing-hint dashboard cards'
);

console.log('P0 compare / Best Answer UX smoke check passed.');
