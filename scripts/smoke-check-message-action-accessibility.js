import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'message-action-accessibility-report.json'),
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
    fail(`Missing D218 file: ${relative(root, file)}`);
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
if (report.title !== 'Message Action Accessibility QA') {
  fail('D218 report must name message action accessibility QA.');
}
if (!String(report.public_repo_rule || '').includes('no prompts')) {
  fail('D218 report must preserve the public no prompt/no secret boundary.');
}
for (const id of ['group-label', 'button-labels', 'status-announcement', 'keyboard-focus']) {
  const check = (report.checks || []).find((item) => item.id === id);
  if (!check || check.status !== 'ready') fail(`D218 report check ${id} must be ready.`);
}

for (const needle of [
  "actions.setAttribute('role','group')",
  "actions.setAttribute('aria-label','Message actions')",
  "actions.setAttribute('aria-describedby',note.id)",
  "note.setAttribute('role','status')",
  "note.setAttribute('aria-live','polite')",
  "button.setAttribute('aria-label',aria)"
]) {
  requireIncludes(files.runtime, needle, `D218 runtime missing accessibility contract: ${needle}`);
}

for (const needle of [
  '.runtime-message-actions button:focus-visible',
  'outline: 3px solid',
  'outline-offset: 2px',
  'min-height: 30px'
]) {
  requireIncludes(files.runtimeCss, needle, `D218 CSS missing keyboard focus contract: ${needle}`);
}

requireIncludes(files.progressDashboard, 'renderMessageActionAccessibilityReport', 'Progress Dashboard must render D218 accessibility evidence.');
requireIncludes(files.qualityWorkflow, 'smoke-check-message-action-accessibility.js', 'Quality workflow must run D218 accessibility QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-message-action-accessibility.js', 'Pages workflow must run D218 accessibility QA.');
requireIncludes(files.backlog, '| D219 |', 'Backlog must keep a next sequential work item after D218.');

const progress = json(files.progressData);
if (!progress.message_action_accessibility_report || progress.message_action_accessibility_report.title !== report.title) {
  fail('Progress dashboard data must embed D218 accessibility report.');
}
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d218 = tasks.find((task) => task.seq === 'D218');
const d237 = tasks.find((task) => task.seq === 'D252');
if (!d218 || d218.status !== 'beta') {
  fail('Progress dashboard task D218 must be beta after accessibility pass ships.');
}
if (!d237 || d237.status !== 'next') {
  fail('Progress dashboard task D252 must become next after D236 ships.');
}
if (!Array.isArray(progress.next_queue) || progress.next_queue[0] !== 'D252') {
  fail('Progress dashboard next queue must prioritize D252 after D236 ships.');
}

if (!process.exitCode) {
  console.log('Message action accessibility smoke check passed.');
}
