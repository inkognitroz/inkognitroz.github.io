import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'no-model-dead-end-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  progressCss: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.css'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  composer: join(publicDir, 'apps', 'mimir-chat-portal', 'composer-model-picker.js'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing D209 file: ${relative(root, file)}`);
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

function requireIncludes(file, needle, message) {
  if (!text(file).includes(needle)) fail(message);
}

const report = json(files.report);
const scenarios = Array.isArray(report.scenarios) ? report.scenarios : [];
const requiredSurfaces = Array.isArray(report.required_surfaces) ? report.required_surfaces : [];
const requiredActions = Array.isArray(report.required_actions) ? report.required_actions : [];

if (scenarios.length < 3) fail('D209 report must cover loading, offline-node and no-live-model states.');
for (const id of ['loading-free-routes', 'offline-local-node', 'no-live-model-after-refresh']) {
  if (!scenarios.some((scenario) => scenario.id === id)) fail(`D209 report missing scenario ${id}.`);
}
for (const surface of ['first-screen', 'chat-runtime', 'composer-model-picker', 'model-helper', 'progress-dashboard']) {
  if (!requiredSurfaces.includes(surface)) fail(`D209 report missing required surface ${surface}.`);
}
for (const action of ['Use free browser guide', 'Open free model picker', 'Install/prove free local model', 'Refresh local node proof']) {
  if (!requiredActions.includes(action)) fail(`D209 report missing required action ${action}.`);
}
for (const scenario of scenarios) {
  if (!scenario.primary_action || !scenario.target || scenario.free !== true || scenario.no_paid_routes_started !== true) {
    fail(`D209 scenario ${scenario.id || 'unknown'} must have one free primary action and no-spend evidence.`);
  }
  if (!Array.isArray(scenario.expected_dom_evidence) || !scenario.expected_dom_evidence.length) {
    fail(`D209 scenario ${scenario.id || 'unknown'} must list expected DOM evidence.`);
  }
}

for (const needle of [
  'no_model_dead_end_report',
  'renderNoModelDeadEndReport',
  'progress-no-model-fixture',
  'progress-no-model-scenario',
  'no_paid_routes_started'
]) {
  requireIncludes(files.progressDashboard, needle, `D209 Progress Dashboard must render no-model fixture evidence: ${needle}`);
}
for (const needle of [
  '.progress-no-model-fixture',
  '.progress-no-model-grid',
  '.progress-no-model-scenario'
]) {
  requireIncludes(files.progressCss, needle, `D209 Progress Dashboard CSS missing no-model fixture styling: ${needle}`);
}
requireIncludes(files.chatRuntime, 'noModelFallbackStarter', 'D209 chat runtime must keep no-model fallback behavior.');
requireIncludes(files.composer, 'freeRouteFloor', 'D209 composer picker must keep free route floor behavior.');
requireIncludes(files.qualityWorkflow, 'smoke-check-first-chat-no-model-dom-fixture.js', 'D209 quality workflow must run the first-chat no-model DOM fixture gate.');
requireIncludes(files.pagesWorkflow, 'smoke-check-first-chat-no-model-dom-fixture.js', 'D209 Pages workflow must run the first-chat no-model DOM fixture gate.');
requireIncludes(files.backlog, '| D210 |', 'Backlog must keep D210 as the no-model visual pass after D209.');
requireIncludes(files.backlog, '| D211 |', 'Backlog must keep a next sequential work item after D210.');
requireIncludes(files.backlog, '| D212 |', 'Backlog must keep a next sequential work item after D211.');
requireIncludes(files.backlog, '| D213 |', 'Backlog must keep a next sequential work item after D212.');
requireIncludes(files.backlog, '| D214 |', 'Backlog must keep a next sequential work item after D213.');
requireIncludes(files.backlog, '| D215 |', 'Backlog must keep a next sequential work item after D214.');

const progress = json(files.progressData);
if (!progress.no_model_dead_end_report || progress.no_model_dead_end_report.title !== report.title) {
  fail('Progress dashboard data must embed the no-model dead-end report for owner visibility.');
}
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d209 = tasks.find((task) => task.seq === 'D209');
const d210 = tasks.find((task) => task.seq === 'D210');
const d211 = tasks.find((task) => task.seq === 'D211');
const d212 = tasks.find((task) => task.seq === 'D212');
const d213 = tasks.find((task) => task.seq === 'D213');
const d214 = tasks.find((task) => task.seq === 'D214');
const d234 = tasks.find((task) => task.seq === 'D234');
if (!d209 || d209.status !== 'beta') {
  fail('Progress dashboard task D209 must be beta after first-chat no-model DOM fixture ships.');
}
if (!d210 || d210.status !== 'beta') {
  fail('Progress dashboard task D210 must be beta after no-model visual pass ships.');
}
if (!d211 || d211.status !== 'beta') {
  fail('Progress dashboard task D211 must be beta after public no-model deploy verification ships.');
}
if (!d212 || d212.status !== 'beta') {
  fail('Progress dashboard task D212 must be beta after first free chat response QA ships.');
}
if (!d213 || d213.status !== 'beta') {
  fail('Progress dashboard task D213 must be beta after composer action bar usefulness ships.');
}
if (!d214 || d214.status !== 'beta') {
  fail('Progress dashboard task D214 must be beta after composer action bar visual QA ships.');
}
if (!d234 || d234.status !== 'next') {
  fail('Progress dashboard task D234 must become the next work item after D233 ships.');
}
if (!Array.isArray(progress.next_queue) || progress.next_queue[0] !== 'D234') {
  fail('Progress dashboard next queue must prioritize D234 after D233 ships.');
}

if (!process.exitCode) {
  console.log('First-chat no-model DOM fixture smoke check passed.');
}
