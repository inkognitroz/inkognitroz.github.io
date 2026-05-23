import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  fixtures: join(publicDir, 'activation-simulator-fixtures.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  firstScreen: join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js'),
  firstScreenHydration: join(publicDir, 'apps', 'mimir-chat-portal', 'first-screen-activation-hydration.js'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  nodeDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.js'),
  nodeDashboardCss: join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.css'),
  telemetry: join(publicDir, 'apps', 'mimir-chat-portal', 'activation-telemetry.js'),
  repairCss: join(publicDir, 'apps', 'mimir-chat-portal', 'repair-resume.css'),
  runtimeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
  coverage: join(publicDir, 'ui-action-coverage.json'),
  mmir: join(publicDir, 'mmir.html')
};

const expectedScenarioIds = [
  'first-visit-free-guide',
  'missing-connector',
  'installer-return-checking',
  'connector-online-no-model',
  'verified-local-model'
];

const requiredSurfaces = ['first-screen', 'chat-runtime', 'node-dashboard', 'telemetry', 'progress-dashboard'];

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing replay render file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function json(file) {
  try {
    return JSON.parse(text(file));
  } catch (error) {
    fail(`Invalid JSON in ${relative(root, file)}: ${error.message}`);
    return {};
  }
}

function selectorNeedles(selector) {
  const value = String(selector || '').trim();
  if (value.startsWith('#')) {
    const id = value.slice(1);
    return [`id="${id}"`, `id='${id}'`, `getElementById('${id}')`, `getElementById("${id}")`, `.id='${id}'`, `.id="${id}"`, value];
  }
  if (value.startsWith('[')) {
    return [value.slice(1, -1).replace(/\\"/g, '"'), value];
  }
  if (value.startsWith('.')) {
    return [value.slice(1), value];
  }
  return [value];
}

function selectorExists(selector, source) {
  return selectorNeedles(selector).some((needle) => source.includes(needle));
}

const fixtures = json(files.fixtures);
const progressData = json(files.progressData);
const scenarios = Array.isArray(fixtures.scenarios) ? fixtures.scenarios : [];
const progress = text(files.progressDashboard);
const first = [text(files.firstScreen), text(files.firstScreenHydration)].join('\n');
const runtime = text(files.chatRuntime);
const combined = [
  text(files.mmir),
  progress,
  first,
  runtime,
  text(files.nodeDashboard),
  text(files.nodeDashboardCss),
  text(files.telemetry)
].join('\n');
const coverage = text(files.coverage);

if (scenarios.length < 5) {
  fail('Replay render harness needs all activation simulator scenarios.');
}

if (!String(fixtures.public_repo_rule || '').includes('do not contain provider keys')) {
  fail('Activation replay fixtures must keep the public repo secrecy rule explicit.');
}

for (const id of expectedScenarioIds) {
  if (!scenarios.some((scenario) => scenario.id === id)) {
    fail(`Replay render harness is missing activation scenario ${id}.`);
  }
}

if (!progressData.activation_simulator || !Array.isArray(progressData.activation_simulator.scenarios)) {
  fail('Progress dashboard data must embed activation simulator scenarios for replay QA.');
}

if (progressData.activation_simulator?.scenarios?.length !== scenarios.length) {
  fail('Progress dashboard embedded simulator scenario count must match fixture scenario count.');
}

for (const scenario of scenarios) {
  if (!scenario.id || !scenario.state || !scenario.label || !scenario.expected_next_action || !scenario.next_target) {
    fail(`Replay scenario is missing id/state/label/expected_next_action/next_target: ${scenario.id || '<unknown>'}`);
    continue;
  }
  if (!String(scenario.next_target).startsWith('#')) {
    fail(`Replay scenario ${scenario.id} next_target must be a same-page hash target.`);
  }
  if (!selectorExists(scenario.next_target, combined)) {
    fail(`Replay scenario ${scenario.id} next_target does not exist in public source: ${scenario.next_target}`);
  }
  if (scenario.cost !== 'free' || scenario.no_paid_routes_started !== true) {
    fail(`Replay scenario ${scenario.id} must remain free and no-spend.`);
  }
  for (const field of ['provider_secrets_stored', 'raw_prompt_stored', 'raw_response_stored']) {
    if (scenario[field] !== false) {
      fail(`Replay scenario ${scenario.id} must keep ${field}: false.`);
    }
  }
  const surfaces = Array.isArray(scenario.surfaces) ? scenario.surfaces : [];
  for (const required of requiredSurfaces) {
    if (!surfaces.some((surface) => surface.surface === required)) {
      fail(`Replay scenario ${scenario.id} must cover required surface ${required}.`);
    }
  }
  for (const surface of surfaces) {
    if (!surface.selector || !selectorExists(surface.selector, combined)) {
      fail(`Replay scenario ${scenario.id} selector is missing from public source: ${surface.selector || '<missing>'}`);
    }
    if (!surface.evidence || !combined.includes(surface.evidence)) {
      fail(`Replay scenario ${scenario.id} evidence is missing from public source: ${surface.evidence || '<missing>'}`);
    }
  }
}

for (const needle of [
  'next_target:String(scenario.next_target',
  'demo_only:true',
  'no_paid_routes_started:true',
  'provider_secrets_stored:false',
  'raw_prompt_stored:false',
  'raw_response_stored:false',
  'mutated_real_connector:false',
  'mutated_pairing_tokens:false',
  'data-activation-replay',
  'progress-activation-replay-clear'
]) {
  if (!progress.includes(needle)) fail(`Replay writer is missing safe field: ${needle}`);
}

for (const needle of [
  'data-activation-replay-jump',
  'data-activation-replay-reset',
  'data-activation-replay-open',
  'clearActivationReplay',
  'localStorage.removeItem(ACTIVATION_REPLAY_PREFIX+activeWorkspaceId())',
  "if(target==='#mimir-prompt')document.getElementById('mimir-prompt')?.focus()",
  'renderActivationReplayBanner',
  'Go to next step',
  'Reset replay',
  'mutated_real_connector:false'
]) {
  if (!first.includes(needle)) fail(`First-screen replay render is missing: ${needle}`);
}

for (const needle of [
  'runtime-activation-replay',
  'renderActivationReplayGate',
  'real live proof unchanged',
  'window.addEventListener(\'mmir-activation-replay-updated\',renderActivationReplayGate)'
]) {
  if (!runtime.includes(needle)) fail(`Runtime replay gate is missing: ${needle}`);
}

for (const forbidden of [
  'verifiedLiveModel=readActivationReplay',
  'modelSelect.value=readActivationReplay',
  'writeActiveProfilePatch(readActivationReplay'
]) {
  if (runtime.includes(forbidden) || first.includes(forbidden) || progress.includes(forbidden)) {
    fail(`Replay code must not mutate real proof/profile/model state: ${forbidden}`);
  }
}

if (!text(files.repairCss).includes('.activation-replay-actions')) {
  fail('First-screen replay controls must keep visible action styling.');
}

if (!text(files.runtimeCss).includes('.runtime-activation-replay')) {
  fail('Runtime replay gate must keep visible styling.');
}

for (const selector of ['[data-activation-replay-jump]', '[data-activation-replay-reset]', '[data-runtime-replay-open]']) {
  if (!coverage.includes(selector)) fail(`UI action coverage must include replay selector ${selector}.`);
}

if (!coverage.includes('renderActivationReplayGate')) {
  fail('UI action coverage must include runtime replay render evidence.');
}

if (!process.exitCode) {
  console.log('Activation replay render smoke check passed.');
}
