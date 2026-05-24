import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'context-correction-audit-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  memory: join(publicDir, 'apps', 'mimir-chat-portal', 'memory.js'),
  knowledge: join(publicDir, 'apps', 'mimir-chat-portal', 'knowledge.js'),
  memoryCss: join(publicDir, 'apps', 'mimir-chat-portal', 'memory.css'),
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
    fail(`Missing D230 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Context Correction Audit Trail QA', 'D230 report must name context correction audit trail QA.');
requireTrue(report.storage_key === 'mimir-context-corrections-v1:{workspace}', 'D230 report must define the browser-local correction storage key.');
requireTrue(String(report.public_repo_rule || '').includes('Raw prompts'), 'D230 report must reject raw prompt/response storage.');
for (const id of ['memory-correction-log', 'knowledge-correction-log', 'undo-last-correction', 'progress-dashboard-trail']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D230 scenario ${id} must be ready.`);
  requireTrue(scenario?.no_paid_routes_started === true, `D230 scenario ${id} must not start paid routes.`);
}

for (const needle of [
  'CORRECTION_PREFIX',
  'mimir-context-corrections-v1:',
  'correctionEntry',
  'recordCorrection',
  'latestUndoableCorrection',
  'undoLatestCorrection',
  'memory-correction-trail',
  'Undo last correction',
  'raw_prompt_stored:false',
  'raw_response_stored:false',
  'provider_secrets_stored:false'
]) {
  requireIncludes(files.memory, needle, `D230 Memory panel missing correction audit behavior: ${needle}`);
}

for (const needle of [
  'CORRECTION_PREFIX',
  'correctionEntry',
  'recordCorrection',
  'latestUndoableCorrection',
  'undoLatestCorrection',
  'knowledge-correction-trail',
  'knowledge-document',
  'knowledge-collection',
  'Undo last correction',
  'provider_secrets_stored:false'
]) {
  requireIncludes(files.knowledge, needle, `D230 Knowledge panel missing correction audit behavior: ${needle}`);
}

for (const needle of [
  '.context-correction-trail',
  'button[data-receipt-correction="undo"]'
]) {
  requireIncludes(files.memoryCss, needle, `D230 correction CSS missing audit/undo styling: ${needle}`);
}

for (const needle of [
  'CONTEXT_CORRECTION_PREFIX',
  'readContextCorrections',
  'progress-context-correction-trail',
  'renderContextCorrectionAuditReport',
  'mmir-context-corrections-updated'
]) {
  requireIncludes(files.progressDashboard, needle, `D230 Progress Dashboard missing correction audit behavior: ${needle}`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-context-correction-audit.js', 'Quality workflow must run D230 context correction audit QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-context-correction-audit.js', 'Pages workflow must run D230 context correction audit QA.');
requireIncludes(files.backlog, '| D235 |', 'Backlog must keep a next sequential work item after D234.');

const progress = json(files.progressData);
requireTrue(progress.context_correction_audit_report?.title === report.title, 'Progress dashboard data must embed D230 context correction audit report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d230 = tasks.find((task) => task.seq === 'D230');
const d237 = tasks.find((task) => task.seq === 'D247');
requireTrue(d230?.status === 'beta', 'Progress dashboard task D230 must be beta after correction audit ships.');
requireTrue(d237?.status === 'next', 'Progress dashboard task D247 must become next after D236 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D247', 'Progress dashboard next queue must prioritize D247 after D236 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Context correction audit smoke check passed.');
}
