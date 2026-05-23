import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'composer-action-bar-visual-report.json'),
  visualQa: join(publicDir, 'visual-qa-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  runtime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  runtimeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function raw(file) {
  if (!existsSync(file)) {
    fail(`Missing D214 file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function text(file) {
  return raw(file).replace(/\s+/g, ' ');
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
  if (!text(file).includes(String(needle).replace(/\s+/g, ' '))) fail(message);
}

const report = json(files.report);
if (report.title !== 'Composer Action Bar Visual QA') {
  fail('D214 report must name composer action bar visual QA.');
}
if (!String(report.public_repo_rule || '').includes('no prompts')) {
  fail('D214 report must preserve the public no prompt/no secret boundary.');
}

const viewports = Array.isArray(report.viewports) ? report.viewports : [];
if (!viewports.some((viewport) => viewport.id === 'desktop-composer' && viewport.width >= 1024)) {
  fail('D214 visual report must include desktop composer viewport.');
}
if (!viewports.some((viewport) => viewport.id === 'mobile-composer' && viewport.width <= 430)) {
  fail('D214 visual report must include mobile composer viewport.');
}
for (const viewport of viewports) {
  if (!Array.isArray(viewport.expected) || !viewport.expected.some((item) => /send|feedback|wrap|stack|resource/i.test(String(item)))) {
    fail(`D214 viewport ${viewport.id || 'unknown'} must assert visible composer behavior.`);
  }
}

for (const selector of report.selector_contract || []) {
  const selectorId = String(selector).replace(/^#/, '');
  requireIncludes(files.runtime, selectorId, `D214 runtime missing selector contract: ${selector}`);
}
for (const needle of report.css_contract || []) {
  requireIncludes(files.runtimeCss, needle, `D214 CSS missing visual contract: ${needle}`);
}
for (const needle of report.copy_contract || []) {
  requireIncludes(files.runtime, needle, `D214 runtime missing copy contract: ${needle}`);
}

requireIncludes(files.visualQa, 'D214 composer action bar visual QA', 'Visual QA report must include the D214 composer visual path.');
requireIncludes(files.progressDashboard, 'renderComposerActionBarVisualReport', 'Progress Dashboard must render D214 composer visual evidence.');
requireIncludes(files.qualityWorkflow, 'smoke-check-composer-action-bar-visual.js', 'Quality workflow must run D214 composer visual QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-composer-action-bar-visual.js', 'Pages workflow must run D214 composer visual QA.');
requireIncludes(files.backlog, '| D215 |', 'Backlog must keep a next sequential work item after D214.');

const progress = json(files.progressData);
if (!progress.composer_action_bar_visual_report || progress.composer_action_bar_visual_report.title !== report.title) {
  fail('Progress dashboard data must embed the D214 composer action bar visual report.');
}
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d214 = tasks.find((task) => task.seq === 'D214');
const d222 = tasks.find((task) => task.seq === 'D222');
if (!d214 || d214.status !== 'beta') {
  fail('Progress dashboard task D214 must be beta after composer action bar visual QA ships.');
}
if (!d222 || d222.status !== 'next') {
  fail('Progress dashboard task D222 must become the next work item after D221 ships.');
}
if (!Array.isArray(progress.next_queue) || progress.next_queue[0] !== 'D222') {
  fail('Progress dashboard next queue must prioritize D222 after D221 ships.');
}

if (!process.exitCode) {
  console.log('Composer action bar visual smoke check passed.');
}
