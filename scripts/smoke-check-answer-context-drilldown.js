import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'answer-context-drilldown-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  answerReceipts: join(publicDir, 'apps', 'mimir-chat-portal', 'answer-context-receipts.js'),
  chatRuntimeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md')
};

const failures = [];

function fail(message) {
  failures.push(message);
  console.error(message);
}

function requireTrue(condition, message) {
  if (!condition) fail(message);
}

function raw(file) {
  if (!existsSync(file)) {
    fail(`Missing D224 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Answer Context Drill-Down QA', 'D224 report must name answer context drill-down QA.');
requireTrue(String(report.public_repo_rule || '').includes('do not store provider keys'), 'D224 report must preserve public-safe drill-down boundary.');
for (const target of ['#memory-panel', '#knowledge-panel', '#model-library', '#privacy-controls-panel']) {
  const scenario = (report.scenarios || []).find((item) => item.target === target);
  requireTrue(scenario?.status === 'ready', `D224 scenario ${target} must be ready.`);
  requireTrue(scenario?.no_paid_routes_started === true, `D224 scenario ${target} must not start paid routes.`);
}

for (const needle of [
  'function openReceiptTarget',
  'function actionButtons',
  'runtime-answer-context-actions',
  'data-receipt-open="#memory-panel"',
  'data-receipt-open="#knowledge-panel"',
  'data-receipt-open="#model-library"',
  'data-receipt-open="#privacy-controls-panel"',
  'MimirLoadDeferred',
  'scrollIntoView'
]) {
  requireIncludes(files.answerReceipts, needle, `D224 answer receipt renderer missing drill-down behavior: ${needle}`);
}

for (const needle of ['.runtime-answer-context-actions', '.runtime-answer-context-actions button']) {
  requireIncludes(files.chatRuntimeCss, needle, `D224 CSS missing drill-down styling: ${needle}`);
}

requireIncludes(files.progressDashboard, 'renderAnswerContextDrilldownReport', 'Progress Dashboard must render D224 drill-down evidence.');
requireIncludes(files.qualityWorkflow, 'smoke-check-answer-context-drilldown.js', 'Quality workflow must run D224 answer drill-down QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-answer-context-drilldown.js', 'Pages workflow must run D224 answer drill-down QA.');
requireIncludes(files.backlog, '| D225 |', 'Backlog must keep a next sequential work item after D224.');

const progress = json(files.progressData);
requireTrue(progress.answer_context_drilldown_report?.title === report.title, 'Progress dashboard data must embed D224 drill-down report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d224 = tasks.find((task) => task.seq === 'D224');
const d232 = tasks.find((task) => task.seq === 'D232');
requireTrue(d224?.status === 'beta', 'Progress dashboard task D224 must be beta after drill-down actions ship.');
requireTrue(d232?.status === 'next', 'Progress dashboard task D232 must become next after D231 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D232', 'Progress dashboard next queue must prioritize D232 after D231 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Answer context drill-down smoke check passed.');
}
