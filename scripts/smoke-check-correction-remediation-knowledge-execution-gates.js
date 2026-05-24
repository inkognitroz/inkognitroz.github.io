import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'correction-remediation-knowledge-execution-gates-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  routeManifest: join(publicDir, 'mmir-api-routes.json'),
  module: join(publicDir, 'apps', 'mimir-chat-portal', 'context-correction-sync.js'),
  memoryCss: join(publicDir, 'apps', 'mimir-chat-portal', 'memory.css'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md'),
  implementationLog: join(root, 'docs', 'MMIR_IMPLEMENTATION_LOG.md')
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
    fail(`Missing D243 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Correction Remediation Knowledge Execution Gates', 'D243 report must name correction remediation knowledge execution gates.');
requireTrue(report.task === 'D243', 'D243 report must be tied to task D243.');
requireTrue(report.backend_commit === '54adcaa', 'D243 report must reference the backend knowledge execution commit.');
requireTrue(report.backend_route?.path === '/context/corrections/remediation-knowledge-executions/apply', 'D243 report must document the knowledge execution route.');
requireTrue(report.local_storage?.knowledge_execution_state === 'mimir-context-correction-knowledge-execution-v1:{workspace}', 'D243 report must document knowledge execution storage.');
requireTrue(report.execution_policy?.preview_required === true, 'D243 execution policy must require preview.');
requireTrue(report.execution_policy?.confirm_required === true, 'D243 execution policy must require confirmation.');
requireTrue(report.execution_policy?.execute_source_mutation_required === true, 'D243 execution policy must require explicit source mutation confirmation.');
requireTrue(report.execution_policy?.backend_only_execution === true, 'D243 execution must be backend-only.');
requireTrue(report.execution_policy?.knowledge_execution_supported === true, 'D243 must support knowledge execution for recorded source models.');
requireTrue(report.execution_policy?.source_mutation_allowed === true, 'D243 must allow only the protected backend to mutate source metadata.');
requireTrue(report.execution_policy?.document_text_stored === false, 'D243 must not store document text.');
requireTrue(report.execution_policy?.public_frontend_authority === false, 'D243 must deny public frontend authority.');
requireTrue(report.execution_policy?.no_paid_routes_started === true, 'D243 must be no-spend.');

requireTrue(report.supported_execution?.kind === 'knowledge-source-metadata-update', 'D243 supported execution must be knowledge source metadata update.');
requireTrue((report.supported_execution?.mutates || []).includes('knowledge.source_status'), 'D243 must mutate source status only through protected backend.');
requireTrue((report.supported_execution?.mutates || []).includes('knowledge.collection_membership'), 'D243 must mutate collection membership metadata only through protected backend.');
requireTrue(report.supported_execution?.raw_text_included === false, 'D243 supported execution must exclude raw text.');
requireTrue(report.rollback_metadata?.captured === true, 'D243 must capture rollback metadata.');

for (const check of ['source-model', 'owner-scope', 'backend-only', 'metadata-only', 'rollback-before-after']) {
  requireTrue((report.checks || []).includes(check), `D243 checks must include ${check}.`);
}

for (const id of ['auto-preview-after-source-model', 'execute-metadata-repair', 'capture-rollback-metadata', 'no-document-text-or-spend']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D243 scenario ${id} must be ready.`);
}

const routeManifest = json(files.routeManifest);
const executionRoute = (routeManifest.routes || []).find((route) => route.path === '/context/corrections/remediation-knowledge-executions/apply');
requireTrue(executionRoute?.auth === 'protected-backend-auth', 'Public API route manifest must register knowledge execution as protected.');
requireTrue(executionRoute?.owner === 'managed-api', 'Public API route manifest must keep knowledge execution owned by managed-api.');

for (const needle of [
  'KNOWLEDGE_EXECUTION_PREFIX',
  'mimir-context-correction-knowledge-execution-v1:',
  'writeKnowledgeExecutionState',
  'readKnowledgeExecutionState',
  'previewKnowledgeExecution',
  'executeKnowledgeExecution',
  '/context/corrections/remediation-knowledge-executions/apply',
  'data-correction-knowledge-execution="preview"',
  'data-correction-knowledge-execution="execute"',
  'context-correction-knowledge-execution-status',
  'context-correction-knowledge-execution-checks',
  'mmir-context-correction-knowledge-execution-updated',
  'backend_only_execution:true',
  'execute_source_mutation_required:true',
  'document_text_stored:false',
  'public_frontend_authority:false'
]) {
  requireIncludes(files.module, needle, `D243 module missing ${needle}.`);
}

for (const needle of [
  '.context-correction-knowledge-execution-status',
  '.context-correction-knowledge-execution-checks',
  '.context-correction-knowledge-execution-results',
  '[data-state="applied"]',
  '[data-state="needs-source-model"]'
]) {
  requireIncludes(files.memoryCss, needle, `D243 knowledge execution styling missing ${needle}.`);
}

for (const needle of [
  'renderCorrectionRemediationKnowledgeExecutionGatesReport',
  'correction_remediation_knowledge_execution_gates_report',
  'progress-correction-remediation-knowledge-execution-gates'
]) {
  requireIncludes(files.progressDashboard, needle, `D243 Progress Dashboard missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-correction-remediation-knowledge-execution-gates.js', 'Quality workflow must run D243 knowledge execution QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-correction-remediation-knowledge-execution-gates.js', 'Pages workflow must run D243 knowledge execution QA.');
requireIncludes(files.backlog, '| D253 |', 'Backlog must add D253 after D243.');
requireIncludes(files.implementationLog, 'D243 is now beta', 'Implementation log must mark D243 beta.');
requireIncludes(files.implementationLog, 'D253 is now next', 'Implementation log must mark D253 next.');

const progress = json(files.progressData);
requireTrue(progress.correction_remediation_knowledge_execution_gates_report?.title === report.title, 'Progress dashboard data must embed D243 knowledge execution report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d243 = tasks.find((task) => task.seq === 'D243');
const d244 = tasks.find((task) => task.seq === 'D253');
requireTrue(d243?.status === 'beta', 'Progress dashboard task D243 must be beta after knowledge execution ships.');
requireTrue(d244?.status === 'next', 'Progress dashboard task D253 must become next after D243 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D253', 'Progress dashboard next queue must prioritize D253 after D243 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Correction remediation knowledge execution gates smoke check passed.');
}
