import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'no-model-visual-report.json'),
  noModelReport: join(publicDir, 'no-model-dead-end-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  composerCss: join(publicDir, 'apps', 'mimir-chat-portal', 'composer-model-picker.css'),
  composer: join(publicDir, 'apps', 'mimir-chat-portal', 'composer-model-picker.js'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  progressCss: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.css'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  visualQa: join(publicDir, 'visual-qa-report.json'),
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
    fail(`Missing D210 file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8').replace(/\s+/g, ' ');
}

function raw(file) {
  if (!existsSync(file)) {
    fail(`Missing D210 file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function json(file) {
  try {
    return JSON.parse(raw(file));
  } catch (error) {
    fail(`Invalid JSON in ${relative(root, file)}: ${error.message}`);
    return {};
  }
}

function requireIncludes(file, needle, message) {
  if (!text(file).includes(needle.replace(/\s+/g, ' '))) fail(message);
}

const report = json(files.report);
const viewports = Array.isArray(report.viewports) ? report.viewports : [];
if (!viewports.some((viewport) => viewport.id === 'desktop-first-chat' && viewport.width >= 1024)) {
  fail('D210 visual report must include desktop first-chat viewport.');
}
if (!viewports.some((viewport) => viewport.id === 'mobile-first-chat' && viewport.width <= 430)) {
  fail('D210 visual report must include mobile first-chat viewport.');
}
for (const viewport of viewports) {
  if (!Array.isArray(viewport.surfaces) || !viewport.surfaces.includes('#composer-model-picker') || !viewport.surfaces.includes('#progress-no-model-fixture')) {
    fail(`D210 viewport ${viewport.id || 'unknown'} must cover composer picker and progress fixture.`);
  }
  if (!Array.isArray(viewport.expected) || !viewport.expected.some((item) => String(item).includes('free'))) {
    fail(`D210 viewport ${viewport.id || 'unknown'} must assert visible free action behavior.`);
  }
}
for (const needle of report.css_contract || []) {
  const target = String(needle).includes('progress-no-model') || String(needle).includes('auto-fit') ? files.progressCss : files.composerCss;
  requireIncludes(target, needle, `D210 CSS contract missing ${needle}`);
}
for (const needle of report.copy_contract || []) {
  const target = String(needle).includes('No live backend') ? files.chatRuntime : files.composer;
  requireIncludes(target, needle, `D210 copy contract missing ${needle}`);
}

requireIncludes(files.noModelReport, 'no-live-model-after-refresh', 'D210 visual pass must build on the no-model DOM report.');
requireIncludes(files.progressDashboard, 'renderNoModelDeadEndReport', 'D210 Progress Dashboard must render the no-model fixture.');
requireIncludes(files.progressCss, '.progress-no-model-scenario', 'D210 Progress Dashboard must style no-model fixture cards.');
requireIncludes(files.visualQa, 'D210 no-model fixture visual pass', 'D210 visual QA report must name the no-model visual pass.');
requireIncludes(files.qualityWorkflow, 'smoke-check-no-model-visual-pass.js', 'D210 quality workflow must run no-model visual pass.');
requireIncludes(files.pagesWorkflow, 'smoke-check-no-model-visual-pass.js', 'D210 Pages workflow must run no-model visual pass.');
requireIncludes(files.backlog, '| D211 |', 'Backlog must keep a next sequential work item after D210.');
requireIncludes(files.backlog, '| D212 |', 'Backlog must keep a next sequential work item after D211.');
requireIncludes(files.backlog, '| D213 |', 'Backlog must keep a next sequential work item after D212.');
requireIncludes(files.backlog, '| D214 |', 'Backlog must keep a next sequential work item after D213.');
requireIncludes(files.backlog, '| D215 |', 'Backlog must keep a next sequential work item after D214.');

const progress = json(files.progressData);
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d210 = tasks.find((task) => task.seq === 'D210');
const d211 = tasks.find((task) => task.seq === 'D211');
const d212 = tasks.find((task) => task.seq === 'D212');
const d213 = tasks.find((task) => task.seq === 'D213');
const d214 = tasks.find((task) => task.seq === 'D214');
const d237 = tasks.find((task) => task.seq === 'D238');
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
if (!d237 || d237.status !== 'next') {
  fail('Progress dashboard task D238 must become the next work item after D236 ships.');
}
if (!Array.isArray(progress.next_queue) || progress.next_queue[0] !== 'D238') {
  fail('Progress dashboard next queue must prioritize D238 after D236 ships.');
}

if (!process.exitCode) {
  console.log('No-model visual pass smoke check passed.');
}
