import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'visual-qa-report.json'),
  mmir: join(publicDir, 'mmir.html'),
  progress: join(publicDir, 'progress-dashboard.json'),
  portal: join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.js'),
  portalCss: join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.css'),
  runtime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  runtimeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
  firstImpression: join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js'),
  firstScreenHydration: join(publicDir, 'apps', 'mimir-chat-portal', 'first-screen-activation-hydration.js'),
  modelCatalogUi: join(publicDir, 'apps', 'mimir-chat-portal', 'model-catalog-ui.js')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function read(file) {
  if (!existsSync(file)) {
    fail(`Missing D202 visual QA file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function json(file) {
  try {
    return JSON.parse(read(file));
  } catch (error) {
    fail(`Invalid JSON in ${relative(root, file)}: ${error.message}`);
    return {};
  }
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function forbidPattern(source, pattern, message) {
  if (pattern.test(source)) fail(message);
}

function requireBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  if (firstIndex === -1 || secondIndex === -1 || firstIndex > secondIndex) fail(message);
}

const report = json(files.report);
const progress = json(files.progress);
const mmir = read(files.mmir);
const portal = read(files.portal);
const runtime = read(files.runtime);
const firstImpression = read(files.firstImpression);
const firstScreenHydration = read(files.firstScreenHydration);
const modelCatalogUi = read(files.modelCatalogUi);
const css = `${read(files.portalCss)}\n${read(files.runtimeCss)}`.replace(/\r\n/g, '\n');

if (report.scope !== 'D202 first-screen visual verification' || report.status !== 'beta') {
  fail('D202 visual QA report must be beta and scoped to first-screen verification.');
}
if (!String(report.cost_policy || '').includes('free-first')) {
  fail('D202 visual QA report must keep the free-first cost policy explicit.');
}
if (!String(report.public_repo_rule || '').includes('no secrets')) {
  fail('D202 visual QA report must preserve the public repo secret boundary.');
}
if (!Array.isArray(report.viewports) || !report.viewports.some((item) => item.id === 'desktop-first-screen') || !report.viewports.some((item) => item.id === 'mobile-first-screen')) {
  fail('D202 visual QA report must include desktop and mobile first-screen evidence.');
}
if (!Array.isArray(report.critical_paths) || report.critical_paths.length < 5) {
  fail('D202 visual QA report must cover the critical first-screen paths.');
}

for (const needle of [
  'class="mimir-chat-main"',
  'class="mimir-chat-center"',
  'id="mimir-title"',
  'id="mimir-instant-start"',
  'class="mimir-composer"',
  'id="mimir-prompt"',
  'id="new-backend"',
  'id="primary-chat-link"',
  'class="quick-suggestions"',
  'id="try-demo-mode"',
  'id="model-library"',
  'id="model-library-grid"'
]) {
  requireIncludes(mmir, needle, `D202 first screen is missing required visible element: ${needle}`);
}

for (const needle of [
  'The orchestration layer for trusted AI.',
  'Ask now. MMIR chooses the safest free route automatically',
  'Open. Connect local AI. Ready.',
  'Start free chat',
  'Pick my best model',
  'Connect my models',
  'Create workflow'
]) {
  requireIncludes(mmir, needle, `D202 first screen copy must keep the WOW/free-first promise: ${needle}`);
}

requireBefore(mmir, 'class="mimir-composer"', '<details id="local-connector"', 'D202 composer must stay before secondary setup panels.');
requireBefore(mmir, 'class="quick-suggestions"', '<details id="local-connector"', 'D202 quick actions must stay before secondary setup panels.');
requireBefore(mmir, 'id="growth-demo"', '<details id="local-connector"', 'D202 demo/beta entry must stay before secondary setup panels.');

for (const needle of [
  './apps/mimir-chat-portal/demo-growth.js',
  './apps/mimir-chat-portal/model-catalog-ui.js',
  './apps/mimir-chat-portal/progress-dashboard.js',
  "event.target.closest('#try-demo-mode')",
  'loadDeferred().then(function(){demo.click();})'
]) {
  requireIncludes(mmir, needle, `D202 deferred first-screen behavior is missing: ${needle}`);
}
if (mmir.includes('<script src="./apps/mimir-chat-portal/demo-growth.js" defer></script>')) {
  fail('D202 demo growth must remain deferred out of the critical shell.');
}

for (const needle of [
  "const drawer=document.getElementById('model-library')",
  "newBtn.addEventListener('click',createProfile)",
  'ensureAutomaticDefaults();render();'
]) {
  requireIncludes(portal, needle, `D202 Connect Model/automatic profile path is missing: ${needle}`);
}

for (const needle of [
  'composer-mode-dock',
  'composer-add-model',
  'Add or connect model',
  'Private',
  'Boost 5.5',
  'MMIR++',
  'Vision',
  'runtime-model-chip',
  'runtime-resource-chip',
  "openPanel('#model-library')",
  "setStatus('Sending first verified answer...','loading')"
]) {
  requireIncludes(runtime, needle, `D202 Open WebUI-style composer/runtime evidence missing: ${needle}`);
}

for (const needle of [
  'renderActivationClosureStrip',
  'deviceStarterRecommendation',
  'mmir-model-library-focus-recommended'
]) {
  requireIncludes(firstImpression, needle, `D202 first impression activation closure missing: ${needle}`);
}

for (const needle of [
  'renderFirstScreenStarterFunnel',
  'runFirstScreenStarterFunnelAction',
  'primary-chat-link'
]) {
  requireIncludes(firstScreenHydration, needle, `D202 deferred first-screen hydration missing: ${needle}`);
}

for (const needle of [
  'starterModelToCatalog',
  'data-recommended-starter',
  'model-library-focus-recommended',
  'data-starter-action'
]) {
  requireIncludes(modelCatalogUi, needle, `D202 model library handoff/focus evidence missing: ${needle}`);
}

for (const needle of [
  '.mimir-chat-main{width:min(920px,92%);min-height:calc(100vh - 5rem)',
  '.mimir-composer{background:var(--mimir-surface)',
  '.composer-actions{display:flex;gap:.55rem;align-items:center;flex-wrap:wrap}',
  '@media(max-width:860px)',
  '.mimir-instant-start{grid-template-columns:1fr}',
  '.model-library-grid,.provider-status-grid,.model-library-section-grid{grid-template-columns:1fr}',
  '@media(max-width:720px)',
  '.mimir-topbar nav{display:flex;width:100%;overflow-x:auto',
  '.instant-map{grid-template-columns:1fr',
  '.instant-node{white-space:normal}',
  '@media(max-width:560px)',
  '.composer-bar{align-items:flex-start;flex-direction:column}',
  '.composer-actions,.composer-actions .btn{width:100%}',
  '.quick-suggestions a,.quick-suggestions button{width:100%;justify-content:center}',
  '.readiness-pill small{white-space:normal}',
  '.composer-mode-dock',
  '.composer-mode-dock {\n    align-items: stretch;\n    flex-direction: column;',
  '.composer-live-chip {\n    max-width: 100%;',
  '.runtime-message {\n    max-width: 100%;'
]) {
  requireIncludes(css, needle, `D202 mobile/visual CSS invariant missing: ${needle}`);
}

forbidPattern(css, /letter-spacing\s*:\s*-\d/i, 'D202 visual QA blocks negative letter spacing.');
forbidPattern(css, /font-size\s*:[^;]*\b(vw|vh|vmin|vmax)\b/i, 'D202 visual QA blocks viewport-scaled font sizes.');
forbidPattern(css, /overflow-x\s*:\s*scroll/i, 'D202 visual QA should use intentional overflow auto for navigation, not page-level scroll hacks.');

const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d202 = tasks.find((task) => task.seq === 'D202');
if (!d202 || d202.status !== 'beta') {
  fail('Progress dashboard task D202 must be beta after first-screen visual QA ships.');
}
const d203 = tasks.find((task) => task.seq === 'D203');
if (!d203 || d203.status !== 'beta') {
  fail('Progress dashboard task D203 must stay beta after composer model picker ships.');
}
const d206 = tasks.find((task) => task.seq === 'D206');
if (!d206 || d206.status !== 'beta') {
  fail('Progress dashboard task D206 must be beta after installer-to-live-model proof ships.');
}
if (!Array.isArray(progress.next_queue) || progress.next_queue[0] !== 'D248') {
  fail('Progress dashboard next queue must prioritize D248 after D236 ships.');
}

if (!process.exitCode) {
  console.log('First-screen visual QA smoke check passed.');
}
