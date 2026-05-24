import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'answer-context-filter-consumption-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  memory: join(publicDir, 'apps', 'mimir-chat-portal', 'memory.js'),
  memoryCss: join(publicDir, 'apps', 'mimir-chat-portal', 'memory.css'),
  knowledge: join(publicDir, 'apps', 'mimir-chat-portal', 'knowledge.js'),
  knowledgeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'knowledge.css'),
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
    fail(`Missing D227 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Answer Context Filter Consumption QA', 'D227 report must name answer context filter consumption QA.');
requireTrue(String(report.public_repo_rule || '').includes('metadata-only'), 'D227 report must preserve the metadata-only public repo rule.');
for (const id of ['memory-panel-filter-state', 'memory-match-badges', 'knowledge-exact-id-explainer', 'safe-consumption-boundary']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D227 scenario ${id} must be ready.`);
  requireTrue(scenario?.no_paid_routes_started === true, `D227 scenario ${id} must not start paid routes.`);
}

for (const needle of [
  'HIGHLIGHT_PREFIX',
  'mimir-answer-context-highlight-v1:',
  'function activeReceiptFilter',
  'function matchesReceiptFilter',
  'memory-receipt-filter-status',
  'data-receipt-match',
  'used in selected answer',
  'mmir-answer-context-source-filter'
]) {
  requireIncludes(files.memory, needle, `D227 memory panel missing receipt-filter consumption behavior: ${needle}`);
}

for (const needle of [
  'HIGHLIGHT_PREFIX',
  'mimir-answer-context-highlight-v1:',
  'function activeReceiptFilter',
  'function matchesReceiptFilter',
  'knowledge-receipt-filter-status',
  'data-receipt-match',
  'Exact document IDs are not available yet',
  'mmir-answer-context-source-filter'
]) {
  requireIncludes(files.knowledge, needle, `D227 knowledge panel missing receipt-filter consumption behavior: ${needle}`);
}

requireIncludes(files.memoryCss, '[data-receipt-match="true"]', 'Memory CSS must visibly mark receipt-filter matches.');
requireIncludes(files.knowledgeCss, '[data-receipt-match="true"]', 'Knowledge CSS must visibly mark receipt-filter matches.');
requireIncludes(files.progressDashboard, 'renderAnswerContextFilterConsumptionReport', 'Progress Dashboard must render D227 filter consumption evidence.');
requireIncludes(files.qualityWorkflow, 'smoke-check-answer-context-filter-consumption.js', 'Quality workflow must run D227 filter consumption QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-answer-context-filter-consumption.js', 'Pages workflow must run D227 filter consumption QA.');
requireIncludes(files.backlog, '| D228 |', 'Backlog must keep a next sequential work item after D227.');

const progress = json(files.progressData);
requireTrue(progress.answer_context_filter_consumption_report?.title === report.title, 'Progress dashboard data must embed D227 filter consumption report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d227 = tasks.find((task) => task.seq === 'D227');
const d237 = tasks.find((task) => task.seq === 'D243');
requireTrue(d227?.status === 'beta', 'Progress dashboard task D227 must be beta after filter consumption ships.');
requireTrue(d237?.status === 'next', 'Progress dashboard task D243 must become next after D236 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D243', 'Progress dashboard next queue must prioritize D243 after D236 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Answer context filter consumption smoke check passed.');
}
