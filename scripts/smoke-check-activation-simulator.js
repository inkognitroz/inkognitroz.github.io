import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const fixturesPath = join(publicDir, 'activation-simulator-fixtures.json');
const progressDataPath = join(publicDir, 'progress-dashboard.json');
const files = {
  mmir: join(publicDir, 'mmir.html'),
  firstScreen: join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  nodeDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.js'),
  telemetry: join(publicDir, 'apps', 'mimir-chat-portal', 'activation-telemetry.js'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  progressCss: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.css')
};

const expectedScenarioIds = [
  'first-visit-free-guide',
  'missing-connector',
  'installer-return-checking',
  'connector-online-no-model',
  'verified-local-model'
];

const surfaceFiles = {
  'first-screen': files.firstScreen,
  'chat-runtime': files.chatRuntime,
  'node-dashboard': files.nodeDashboard,
  telemetry: files.telemetry,
  'progress-dashboard': files.progressDashboard
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing activation simulator file: ${relative(root, file)}`);
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

function selectorNeedle(selector) {
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

const fixture = json(fixturesPath);
const progressData = json(progressDataPath);
const combinedSource = Object.values(files).map(text).join('\n');
const scenarios = Array.isArray(fixture.scenarios) ? fixture.scenarios : [];
const requiredSurfaces = Array.isArray(fixture.required_surfaces) ? fixture.required_surfaces : [];

if (!String(fixture.public_repo_rule || '').includes('do not contain provider keys')) {
  fail('Activation simulator must keep the public repo secrecy rule explicit.');
}

if (!requiredSurfaces.length || !requiredSurfaces.every((surface) => surfaceFiles[surface])) {
  fail('Activation simulator must define the required first-screen/chat/node/telemetry/progress surfaces.');
}

for (const id of expectedScenarioIds) {
  if (!scenarios.some((scenario) => scenario.id === id)) {
    fail(`Activation simulator is missing scenario ${id}.`);
  }
}

for (const scenario of scenarios) {
  if (scenario.cost !== 'free' || scenario.no_paid_routes_started !== true) {
    fail(`Activation simulator scenario ${scenario.id} must remain free and must not start paid routes.`);
  }
  for (const field of ['provider_secrets_stored', 'raw_prompt_stored', 'raw_response_stored']) {
    if (scenario[field] !== false) {
      fail(`Activation simulator scenario ${scenario.id} must keep ${field}: false.`);
    }
  }
  if (!scenario.user_goal || !scenario.expected_next_action || !scenario.simulated_signal) {
    fail(`Activation simulator scenario ${scenario.id} must describe goal, signal and next action.`);
  }

  const surfaces = Array.isArray(scenario.surfaces) ? scenario.surfaces : [];
  for (const required of requiredSurfaces) {
    if (!surfaces.some((surface) => surface.surface === required)) {
      fail(`Scenario ${scenario.id} must cover ${required}.`);
    }
  }

  for (const surface of surfaces) {
    const source = text(surfaceFiles[surface.surface] || files.mmir);
    if (!surface.evidence || !source.includes(surface.evidence)) {
      fail(`Scenario ${scenario.id} surface ${surface.surface} lacks source evidence: ${surface.evidence}.`);
    }
    if (!selectorNeedle(surface.selector).some((needle) => combinedSource.includes(needle))) {
      fail(`Scenario ${scenario.id} selector is not present in public source: ${surface.selector}.`);
    }
  }
}

if (!progressData.activation_simulator || !Array.isArray(progressData.activation_simulator.scenarios)) {
  fail('Progress dashboard data must embed activation_simulator fixtures.');
}

if (progressData.activation_simulator?.scenarios?.length !== scenarios.length) {
  fail('Progress dashboard activation simulator scenario count must match the fixture file.');
}

if (!text(files.progressDashboard).includes('renderActivationSimulator')) {
  fail('Progress dashboard must render the activation simulator.');
}

if (!text(files.progressDashboard).includes('progress-activation-simulator')) {
  fail('Progress dashboard must expose the activation simulator panel id.');
}

if (!text(files.progressCss).includes('.progress-simulator-card')) {
  fail('Progress dashboard must style activation simulator cards.');
}

if (!process.exitCode) {
  console.log('Activation simulator smoke check passed.');
}
