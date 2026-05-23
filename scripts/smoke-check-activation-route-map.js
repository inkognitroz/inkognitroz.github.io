import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  fixtures: join(publicDir, 'activation-simulator-fixtures.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  progressCss: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.css'),
  coverage: join(publicDir, 'ui-action-coverage.json')
};

const expectedScenarioIds = [
  'first-visit-free-guide',
  'missing-connector',
  'installer-return-checking',
  'connector-online-no-model',
  'verified-local-model'
];

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing activation route-map file: ${relative(root, file)}`);
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

const fixtures = json(files.fixtures);
const progressData = json(files.progressData);
const progress = text(files.progressDashboard);
const css = text(files.progressCss);
const coverage = text(files.coverage);
const scenarios = Array.isArray(fixtures.scenarios) ? fixtures.scenarios : [];
const progressTasks = Array.isArray(progressData.tasks) ? progressData.tasks : [];
const requiredSurfaces = Array.isArray(fixtures.required_surfaces) ? fixtures.required_surfaces : [];

if (!requiredSurfaces.includes('first-screen') || !requiredSurfaces.includes('chat-runtime') || !requiredSurfaces.includes('progress-dashboard')) {
  fail('Activation route map must inherit required activation surfaces from the fixture.');
}

for (const id of expectedScenarioIds) {
  const scenario = scenarios.find((item) => item.id === id);
  if (!scenario) {
    fail(`Activation route map is missing scenario ${id}.`);
    continue;
  }
  if (!String(scenario.next_target || '').startsWith('#')) {
    fail(`Scenario ${id} must keep a same-page next_target for route-map links.`);
  }
  if (!scenario.simulated_signal || !scenario.expected_next_action) {
    fail(`Scenario ${id} must describe simulated signal and next action for owner route-map reporting.`);
  }
  if (scenario.cost !== 'free' || scenario.no_paid_routes_started !== true) {
    fail(`Scenario ${id} must remain free/no-spend in the route map.`);
  }
  const surfaces = Array.isArray(scenario.surfaces) ? scenario.surfaces.map((surface) => surface.surface) : [];
  for (const surface of requiredSurfaces) {
    if (!surfaces.includes(surface)) {
      fail(`Scenario ${id} route map must include ${surface}.`);
    }
  }
}

for (const needle of [
  'renderReplayRouteMap',
  'scenarioLiveProofGap',
  'progress-replay-route-map',
  'progress-replay-route-row',
  'data-replay-route-target',
  'activation-simulator-fixtures.json',
  'demo_only:true / no_paid_routes_started:true',
  'Opened replay route target',
  'This did not mutate connector, token or provider state.'
]) {
  if (!progress.includes(needle)) fail(`Progress Dashboard route map missing evidence: ${needle}`);
}

for (const needle of [
  '.progress-replay-route-map',
  '.progress-route-map-head',
  '.progress-route-map-table',
  '.progress-replay-route-row',
  '.progress-replay-route-row a'
]) {
  if (!css.includes(needle)) fail(`Route map styling missing: ${needle}`);
}

for (const needle of [
  '#progress-replay-route-map',
  '[data-replay-route-target]',
  'renderReplayRouteMap',
  'scenarioLiveProofGap',
  'progress-replay-route-map'
]) {
  if (!coverage.includes(needle)) fail(`UI action coverage missing route-map evidence: ${needle}`);
}

const d182 = progressTasks.find((task) => task.seq === 'D182');
if (!d182 || d182.status !== 'beta') {
  fail('Progress dashboard task D182 must be beta after the route-map report ships.');
}

const d183 = progressTasks.find((task) => task.seq === 'D183');
if (!d183 || !['beta', 'next'].includes(d183.status)) {
  fail('Progress dashboard must expose D183 as beta or next after D182 ships.');
}

const d184 = progressTasks.find((task) => task.seq === 'D184');
if (!d184 || !['beta', 'next'].includes(d184.status)) {
  fail('Progress dashboard must expose D184 as beta or next after D183 ships.');
}

const d185 = progressTasks.find((task) => task.seq === 'D185');
if (!d185 || !['beta', 'next'].includes(d185.status)) {
  fail('Progress dashboard must expose D185 as beta or next after D184 ships.');
}

const d186 = progressTasks.find((task) => task.seq === 'D186');
if (!d186 || d186.status !== 'next') {
  fail('Progress dashboard must expose D186 as the next activation work item after D185 ships.');
}

if (!process.exitCode) {
  console.log('Activation route map smoke check passed.');
}
