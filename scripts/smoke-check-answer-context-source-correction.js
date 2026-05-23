import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'answer-context-source-correction-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  memory: join(publicDir, 'apps', 'mimir-chat-portal', 'memory.js'),
  knowledge: join(publicDir, 'apps', 'mimir-chat-portal', 'knowledge.js'),
  memoryCss: join(publicDir, 'apps', 'mimir-chat-portal', 'memory.css'),
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
    fail(`Missing D229 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Answer Context Source Correction QA', 'D229 report must name answer context source correction QA.');
requireTrue(String(report.public_repo_rule || '').includes('provider secrets'), 'D229 report must preserve public secret boundaries.');
for (const id of ['memory-correction-actions', 'knowledge-correction-actions', 'non-destructive-context-correction', 'clear-receipt-focus']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D229 scenario ${id} must be ready.`);
  requireTrue(scenario?.no_paid_routes_started === true, `D229 scenario ${id} must not start paid routes.`);
}

for (const needle of [
  'memory-receipt-filter-actions',
  'dataset.receiptCorrection',
  'clearReceiptFilter',
  'focusReceiptMatch',
  'editReceiptMatch',
  'disableReceiptMatches',
  'mmir-answer-context-source-filter-cleared',
  'Sync when ready'
]) {
  requireIncludes(files.memory, needle, `D229 Memory panel missing correction behavior: ${needle}`);
}

for (const needle of [
  'knowledge-receipt-filter-actions',
  'dataset.receiptCorrection',
  'clearReceiptFilter',
  'focusReceiptMatch',
  'toggleKnowledgeItem',
  'disableReceiptMatches',
  'focusedCollectionIds',
  'disabled document',
  'mmir-answer-context-source-filter-cleared'
]) {
  requireIncludes(files.knowledge, needle, `D229 Knowledge panel missing correction behavior: ${needle}`);
}

for (const needle of [
  '.receipt-correction-actions',
  'button[data-receipt-correction="disable"]'
]) {
  requireIncludes(files.memoryCss, needle, `D229 Memory CSS missing correction styling: ${needle}`);
}

for (const needle of [
  '.knowledge-collection-card[data-receipt-match="true"]',
  '.knowledge-item[data-state="disabled"]',
  '.knowledge-item-actions'
]) {
  requireIncludes(files.knowledgeCss, needle, `D229 Knowledge CSS missing correction styling: ${needle}`);
}

requireIncludes(files.progressDashboard, 'renderAnswerContextSourceCorrectionReport', 'Progress Dashboard must render D229 source correction evidence.');
requireIncludes(files.qualityWorkflow, 'smoke-check-answer-context-source-correction.js', 'Quality workflow must run D229 source correction QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-answer-context-source-correction.js', 'Pages workflow must run D229 source correction QA.');
requireIncludes(files.backlog, '| D230 |', 'Backlog must keep a next sequential work item after D229.');

const progress = json(files.progressData);
requireTrue(progress.answer_context_source_correction_report?.title === report.title, 'Progress dashboard data must embed D229 source correction report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d229 = tasks.find((task) => task.seq === 'D229');
const d230 = tasks.find((task) => task.seq === 'D230');
requireTrue(d229?.status === 'beta', 'Progress dashboard task D229 must be beta after source correction actions ship.');
requireTrue(d230?.status === 'next', 'Progress dashboard task D230 must become next after D229 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D230', 'Progress dashboard next queue must prioritize D230 after D229 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Answer context source correction smoke check passed.');
}
