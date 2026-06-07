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
  'const compareModel=bestLocalModel();',
  'Add menu must decide Compare/Best Answer from the best proven local route'
);
requireText(
  addMenu,
  "compareModel?(",
  'Compare/Best Answer actions must stay hidden until a local route exists'
);
requireText(
  addMenu,
  "menuButton('best-answer-live','Best Answer'",
  'Add menu must expose one simple Best Answer action after local discovery'
);
requireText(
  addMenu,
  "menuButton('compare-live','Compare answers'",
  'Add menu must expose one simple Compare answers action after local discovery'
);
requireText(
  addMenu,
  "menuButton('connect-local','Add model'",
  'Add menu must expose local setup once as Add model'
);
requireText(
  addMenu,
  "menuButton('check-local','Refresh models'",
  'Add menu must keep a clear refresh path after connector install'
);
requireText(
  runtime,
  'Press + -> Add model to connect this computer.',
  'Model menu local hint must stay short and avoid repeating platform strategy copy'
);
forbidText(
  runtime,
  'expand the intelligence pool',
  'Model menu must not repeat intelligence-pool strategy copy in the compact route picker'
);
forbidText(
  addMenu,
  'Intelligence pool',
  'Add menu must not bring back dashboard-style Intelligence pool cards'
);
forbidText(
  addMenu,
  'Smart routing',
  'Add menu must not bring back dashboard-style Smart routing cards'
);
forbidText(
  addMenu,
  'Connect local model',
  'Add menu should use one user-facing Add model label instead of repeating local-connector wording'
);
forbidText(
  addMenu,
  'Connect this computer as a private local node from chat.',
  'Add menu should avoid technical local-node detail in the compact toolbar menu'
);

const addModelCount = (addMenu.match(/'Add model'/g) || []).length;
if (addModelCount !== 1) {
  fail(`Add menu should contain exactly one Add model action, found ${addModelCount}`);
}

requireText(
  runtime,
  "status(title+' is asking Supergenious and '+localModel.label+' in parallel...'",
  'Compare flow must make parallel routing visible while running'
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
  'recordRouteBenchmark(localModel,localScore)',
  'Compare flow must feed local route benchmark data back into ranking'
);
requireText(
  runtime,
  "return {mode:'compare',model:local,prompt:cleanSmartPrompt(prompt)||prompt};",
  'Best Answer language must trigger the compare/synthesis path when a local route exists'
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
requireText(
  css,
  '.p0-menu .p0-featured-action',
  'Best Answer action must have a focused menu treatment when live'
);
forbidText(
  css,
  '.p0-routing-hint',
  'P0 compare UX must not depend on old routing-hint dashboard cards'
);

console.log('P0 compare / Best Answer UX smoke check passed.');
