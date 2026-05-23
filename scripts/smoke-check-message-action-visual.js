import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'message-action-visual-report.json'),
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
    fail(`Missing D216 file: ${relative(root, file)}`);
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
if (report.title !== 'Message Action Visual QA') {
  fail('D216 report must name message action visual QA.');
}
if (!String(report.public_repo_rule || '').includes('no prompts')) {
  fail('D216 visual report must preserve the public no prompt/no secret boundary.');
}

const viewports = Array.isArray(report.viewports) ? report.viewports : [];
if (!viewports.some((viewport) => viewport.id === 'desktop-transcript-actions' && viewport.width >= 1024)) {
  fail('D216 report must cover desktop transcript actions.');
}
if (!viewports.some((viewport) => viewport.id === 'mobile-transcript-actions' && viewport.width <= 430)) {
  fail('D216 report must cover mobile transcript actions.');
}
for (const viewport of viewports) {
  if (!Array.isArray(viewport.expected) || !viewport.expected.some((item) => /wrap|touch|visible|status|overlap/i.test(String(item)))) {
    fail(`D216 viewport ${viewport.id || 'unknown'} must assert visible transcript behavior.`);
  }
}

for (const selector of report.selector_contract || []) {
  if (selector.startsWith('[data-message-action=')) {
    const id = selector.match(/"([^"]+)"/)?.[1] || '';
    requireIncludes(files.runtime, `addAction('${id}'`, `D216 runtime missing transcript action wiring: ${selector}`);
  } else {
    requireIncludes(files.runtimeCss, selector.replace(/^\./, '.'), `D216 CSS missing selector contract: ${selector}`);
  }
}

for (const needle of report.css_contract || []) {
  requireIncludes(files.runtimeCss, needle, `D216 CSS missing visual contract: ${needle}`);
}
for (const needle of report.copy_contract || []) {
  requireIncludes(files.runtime, needle, `D216 runtime missing transcript copy contract: ${needle}`);
}

requireIncludes(files.progressDashboard, 'renderMessageActionVisualReport', 'Progress Dashboard must render D216 message action visual evidence.');
requireIncludes(files.qualityWorkflow, 'smoke-check-message-action-visual.js', 'Quality workflow must run D216 message action visual QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-message-action-visual.js', 'Pages workflow must run D216 message action visual QA.');
requireIncludes(files.backlog, '| D217 |', 'Backlog must keep a next sequential work item after D216.');

const progress = json(files.progressData);
if (!progress.message_action_visual_report || progress.message_action_visual_report.title !== report.title) {
  fail('Progress dashboard data must embed the D216 message action visual report.');
}
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d216 = tasks.find((task) => task.seq === 'D216');
const d230 = tasks.find((task) => task.seq === 'D230');
if (!d216 || d216.status !== 'beta') {
  fail('Progress dashboard task D216 must be beta after message action visual QA ships.');
}
if (!d230 || d230.status !== 'next') {
  fail('Progress dashboard task D230 must become the next work item after D229 ships.');
}
if (!Array.isArray(progress.next_queue) || progress.next_queue[0] !== 'D230') {
  fail('Progress dashboard next queue must prioritize D230 after D229 ships.');
}

if (!process.exitCode) {
  console.log('Message action visual smoke check passed.');
}
