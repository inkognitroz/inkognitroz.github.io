import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'message-action-completeness-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  runtime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  messageActions: join(publicDir, 'apps', 'mimir-chat-portal', 'message-actions.js'),
  runtimeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
  mmir: join(publicDir, 'mmir.html'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  visibleControlAudit: join(publicDir, 'visible-control-audit.json'),
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
    fail(`Missing D215 file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function compact(file) {
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
  if (!compact(file).includes(String(needle).replace(/\s+/g, ' '))) fail(message);
}

const report = json(files.report);
if (report.title !== 'Message Action Completeness QA') {
  fail('D215 report must name message action completeness QA.');
}
if (!String(report.public_repo_rule || '').includes('no user prompts')) {
  fail('D215 report must preserve the public no user prompt/no raw response boundary.');
}

const requiredActions = ['copy', 'retry', 'save', 'fork', 'share-safe', 'next-step'];
const actions = Array.isArray(report.actions) ? report.actions : [];
for (const id of requiredActions) {
  const action = actions.find((item) => item.id === id);
  if (!action) fail(`D215 report missing action: ${id}`);
  if (action && action.status !== 'ready') fail(`D215 action ${id} must be ready.`);
  if (action && action.no_paid_routes_started !== true) fail(`D215 action ${id} must keep no_paid_routes_started true.`);
  requireIncludes(files.runtime, `addAction('${id}'`, `D215 runtime missing message action wiring: ${id}`);
}

for (const needle of [
  'MimirChatRuntimeBridge',
  'runDeferredMessageAction',
  'MimirLoadDeferred',
  'mmir-chat-message-action'
]) {
  requireIncludes(files.runtime, needle, `D215 runtime missing deferred action bridge: ${needle}`);
}

for (const needle of [
  'function save',
  'function fork',
  'function shareSafe',
  'function nextStep',
  'mimir-conversations-v1:',
  'mimir-message-share-draft-v1:',
  'redacted token',
  'MimirMessageActions'
]) {
  requireIncludes(files.messageActions, needle, `D215 message action module missing contract: ${needle}`);
}
requireIncludes(files.mmir, './apps/mimir-chat-portal/message-actions.js', 'D215 message action module must load through the deferred queue.');

for (const needle of [
  '.runtime-message-action-status',
  '.runtime-message-actions button[data-message-action="next-step"]',
  'flex: 1 1 92px'
]) {
  requireIncludes(files.runtimeCss, needle, `D215 CSS missing transcript action styling: ${needle}`);
}

requireIncludes(files.progressDashboard, 'renderMessageActionCompletenessReport', 'Progress Dashboard must render D215 message action evidence.');
requireIncludes(files.visibleControlAudit, '"id": "message-actions"', 'Visible control audit must include message action coverage.');
requireIncludes(files.qualityWorkflow, 'smoke-check-message-action-completeness.js', 'Quality workflow must run D215 message action completeness.');
requireIncludes(files.pagesWorkflow, 'smoke-check-message-action-completeness.js', 'Pages workflow must run D215 message action completeness.');
requireIncludes(files.backlog, '| D216 |', 'Backlog must keep a next sequential work item after D215.');

const progress = json(files.progressData);
if (!progress.message_action_completeness_report || progress.message_action_completeness_report.title !== report.title) {
  fail('Progress dashboard data must embed the D215 message action completeness report.');
}
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d215 = tasks.find((task) => task.seq === 'D215');
const d216 = tasks.find((task) => task.seq === 'D216');
if (!d215 || d215.status !== 'beta') {
  fail('Progress dashboard task D215 must be beta after message action completeness ships.');
}
if (!d216 || d216.status !== 'next') {
  fail('Progress dashboard task D216 must become the next work item after D215 ships.');
}
if (!Array.isArray(progress.next_queue) || progress.next_queue[0] !== 'D216') {
  fail('Progress dashboard next queue must prioritize D216 after D215 ships.');
}

if (!process.exitCode) {
  console.log('Message action completeness smoke check passed.');
}
