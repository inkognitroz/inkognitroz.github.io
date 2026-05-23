import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'answer-context-source-filter-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  answerReceipts: join(publicDir, 'apps', 'mimir-chat-portal', 'answer-context-receipts.js'),
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
    fail(`Missing D226 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Answer Context Source Filter QA', 'D226 report must name answer context source filter QA.');
requireTrue(String(report.public_repo_rule || '').includes('memory text'), 'D226 report must preserve raw memory/knowledge exclusion.');
for (const id of ['memory-use-ids', 'memory-use-count', 'model-filter', 'safe-filter-boundary']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D226 scenario ${id} must be ready.`);
  requireTrue(scenario?.no_paid_routes_started === true, `D226 scenario ${id} must not start paid routes.`);
}

for (const needle of [
  'MEMORY_USE_PREFIX',
  'mimir-memory-use-v1:',
  'function memoryUseSummary',
  'memory_use_ids',
  'memory_use_count',
  'memory_sources',
  'receiptFilterMemoryIds',
  'receiptFilterModel',
  'mmir-answer-context-source-filter',
  'memory matches'
]) {
  requireIncludes(files.answerReceipts, needle, `D226 receipt renderer missing source-filter behavior: ${needle}`);
}

requireIncludes(files.progressDashboard, 'renderAnswerContextSourceFilterReport', 'Progress Dashboard must render D226 source-filter evidence.');
requireIncludes(files.qualityWorkflow, 'smoke-check-answer-context-source-filter.js', 'Quality workflow must run D226 source-filter QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-answer-context-source-filter.js', 'Pages workflow must run D226 source-filter QA.');
requireIncludes(files.backlog, '| D227 |', 'Backlog must keep a next sequential work item after D226.');

const progress = json(files.progressData);
requireTrue(progress.answer_context_source_filter_report?.title === report.title, 'Progress dashboard data must embed D226 source-filter report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d226 = tasks.find((task) => task.seq === 'D226');
const d228 = tasks.find((task) => task.seq === 'D228');
requireTrue(d226?.status === 'beta', 'Progress dashboard task D226 must be beta after source filters ship.');
requireTrue(d228?.status === 'next', 'Progress dashboard task D228 must become next after D227 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D228', 'Progress dashboard next queue must prioritize D228 after D227 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Answer context source-filter smoke check passed.');
}
