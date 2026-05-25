import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  progressData: join(publicDir, 'progress-dashboard.json'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  progressCss: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.css'),
  mmir: join(publicDir, 'mmir.html'),
  serviceWorker: join(publicDir, 'sw.js'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md'),
  buildDashboard: join(root, 'scripts', 'build-progress-dashboard.js'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing launch progress file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function json(file) {
  try {
    return JSON.parse(text(file));
  } catch (error) {
    fail(`Could not parse ${relative(root, file)}: ${error.message}`);
    return {};
  }
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function requireTrue(value, message) {
  if (!value) fail(message);
}

const data = json(files.progressData);
const launch = data.launch_progress || {};
const checkpoints = Array.isArray(launch.checkpoints) ? launch.checkpoints : [];
const evidence = Array.isArray(launch.last_green_evidence) ? launch.last_green_evidence : [];
const next = Array.isArray(launch.next_actions) ? launch.next_actions : [];
const blockers = Array.isArray(launch.blockers) ? launch.blockers : [];
const percent = Number(launch.percent);

requireTrue(launch.title === 'P0 launch progress', 'Launch progress data must expose the P0 launch progress title.');
requireTrue(Number.isFinite(percent) && percent >= 60 && percent < 100, 'Launch progress must be visible, truthful and not claim 100%.');
requireTrue(launch.public_url === './mmir.html#progress-dashboard', 'Launch progress must link to the public dashboard anchor.');
requireTrue(checkpoints.length >= 8, 'Launch progress must track at least eight launch-critical checkpoints.');
requireTrue(checkpoints.some((item) => item.id === 'open-webui-polish' && item.status === 'next'), 'Launch progress must keep Open WebUI polish as next work.');
requireTrue(checkpoints.some((item) => item.id === 'real-browser-qa' && item.status === 'watch'), 'Launch progress must keep real browser QA visible as a watch item.');
requireTrue(evidence.some((item) => item.commit === 'acab3a2'), 'Launch progress must include the latest public green commit evidence.');
requireTrue(evidence.some((item) => item.repo === 'mmir-local-node' && item.commit === '54fe834'), 'Launch progress must include local-node package evidence.');
requireTrue(next.some((item) => item.id === 'D254-openwebui-polish'), 'Launch progress next queue must include D254 Open WebUI polish.');
requireTrue(blockers.some((item) => item.status === 'blocked' && String(item.detail || '').includes('No-spend')), 'Launch progress must explain why paid live cloud nodes are blocked.');
requireTrue(String(launch.completion_rule || '').includes('first free chat'), 'Launch progress must define a real completion rule.');

for (const needle of [
  'buildLaunchProgress',
  'progressWeight',
  'P0 launch progress',
  'Open WebUI / ChatGPT smoothness polish',
  'No-spend policy blocks paid live cloud nodes'
]) {
  requireIncludes(text(files.buildDashboard), needle, `Dashboard build must generate launch-progress evidence: ${needle}`);
}

for (const needle of [
  'renderLaunchProgress',
  'progress-launch-progress',
  'role="meter"',
  'Latest green evidence',
  'Next queue',
  'Blockers'
]) {
  requireIncludes(text(files.progressDashboard), needle, `Progress Dashboard must render launch progress: ${needle}`);
}

for (const needle of [
  '.progress-launch-progress',
  '.progress-launch-meter',
  '.progress-launch-score',
  '.progress-launch-columns'
]) {
  requireIncludes(text(files.progressCss), needle, `Launch progress needs visible styling: ${needle}`);
}

requireIncludes(text(files.mmir), 'Track progress', 'MMIR first screen must offer a direct progress link.');
requireIncludes(text(files.mmir), 'progress-dashboard.js?v=20260525-progress-window-v1', 'MMIR page must cache-bust the updated progress dashboard script.');
requireIncludes(text(files.serviceWorker), 'mmir-pwa-d296-20260525-runtime-css-headroom-v1', 'Service worker cache must rotate for progress-window and composer-affordance assets.');
requireIncludes(text(files.backlog), '| D257 | Owner Ops / Progress | P0 | P0 launch progress dashboard |', 'Backlog must include D257 launch progress tracking.');
requireIncludes(`${text(files.qualityWorkflow)}\n${text(files.pagesWorkflow)}`, 'smoke-check-launch-progress-dashboard.js', 'GitHub workflows must run the launch progress smoke gate.');

for (const needle of [
  'TASK_RENDER_LIMIT=72',
  'progress-task-window',
  'progress-show-all-tasks',
  'showAllTasks=false',
  'scheduleRender'
]) {
  requireIncludes(text(files.progressDashboard), needle, `Progress Dashboard must render the backlog progressively: ${needle}`);
}

requireIncludes(text(files.progressCss), '.progress-task-window', 'Progress Dashboard needs visible styling for the progressive backlog window.');

if (!process.exitCode) {
  console.log('Launch progress dashboard smoke check passed.');
}
