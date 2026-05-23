import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'answer-context-knowledge-source-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  answerReceipts: join(publicDir, 'apps', 'mimir-chat-portal', 'answer-context-receipts.js'),
  knowledge: join(publicDir, 'apps', 'mimir-chat-portal', 'knowledge.js'),
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
    fail(`Missing D228 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Answer Context Knowledge Source QA', 'D228 report must name answer context knowledge source QA.');
requireTrue(String(report.public_repo_rule || '').includes('document IDs'), 'D228 report must preserve metadata-only document/collection IDs.');
for (const id of ['runtime-knowledge-use-snapshot', 'receipt-knowledge-source-ids', 'knowledge-panel-exact-match', 'safe-knowledge-boundary']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D228 scenario ${id} must be ready.`);
  requireTrue(scenario?.no_paid_routes_started === true, `D228 scenario ${id} must not start paid routes.`);
}

for (const needle of [
  'function knowledgeUseSummary',
  'lastKnowledgeUses',
  'lastBackendKnowledgeUses',
  'knowledge_use_ids',
  'knowledge_sources',
  'controls.knowledge===false?Promise.resolve',
  'if(!backendKnowledge)lastBackendKnowledgeUses=[]'
]) {
  requireIncludes(files.chatRuntime, needle, `D228 chat runtime missing knowledge-use metadata behavior: ${needle}`);
}

for (const needle of [
  'knowledge_use_ids',
  'knowledge_use_count',
  'knowledge_sources',
  'receiptFilterKnowledgeIds',
  'Knowledge sources'
]) {
  requireIncludes(files.answerReceipts, needle, `D228 receipt renderer missing knowledge source behavior: ${needle}`);
}

for (const needle of [
  'knowledge_use_count',
  'receiptFilterKnowledgeIds',
  'data-receipt-match',
  'matching knowledge item(s)'
]) {
  requireIncludes(files.knowledge, needle, `D228 Knowledge panel missing exact-source consumption behavior: ${needle}`);
}

requireIncludes(files.progressDashboard, 'renderAnswerContextKnowledgeSourceReport', 'Progress Dashboard must render D228 knowledge source evidence.');
requireIncludes(files.qualityWorkflow, 'smoke-check-answer-context-knowledge-source.js', 'Quality workflow must run D228 knowledge source QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-answer-context-knowledge-source.js', 'Pages workflow must run D228 knowledge source QA.');
requireIncludes(files.backlog, '| D235 |', 'Backlog must keep a next sequential work item after D234.');

const progress = json(files.progressData);
requireTrue(progress.answer_context_knowledge_source_report?.title === report.title, 'Progress dashboard data must embed D228 knowledge source report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d228 = tasks.find((task) => task.seq === 'D228');
const d236 = tasks.find((task) => task.seq === 'D236');
requireTrue(d228?.status === 'beta', 'Progress dashboard task D228 must be beta after knowledge source receipts ship.');
requireTrue(d236?.status === 'next', 'Progress dashboard task D236 must become next after D235 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D236', 'Progress dashboard next queue must prioritize D236 after D235 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Answer context knowledge source smoke check passed.');
}
