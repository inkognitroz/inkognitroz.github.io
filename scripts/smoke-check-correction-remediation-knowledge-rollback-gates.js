import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'correction-remediation-knowledge-rollback-gates-report.json'),
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
    fail(`Missing D244 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Correction Remediation Knowledge Rollback Gates', 'D244 report must name correction remediation knowledge rollback gates.');
requireTrue(report.task === 'D244', 'D244 report must be tied to task D244.');
requireTrue(report.backend_commit === 'b0ee399', 'D244 report must reference the backend knowledge rollback commit.');
requireTrue(report.backend_route?.path === '/context/corrections/remediation-knowledge-rollbacks/apply', 'D244 report must document the knowledge rollback route.');
requireTrue(report.local_storage?.knowledge_rollback_state === 'mimir-context-correction-knowledge-rollback-v1:{workspace}', 'D244 report must document knowledge rollback storage.');
requireTrue(report.rollback_policy?.preview_required === true, 'D244 rollback policy must require preview.');
requireTrue(report.rollback_policy?.confirm_required === true, 'D244 rollback policy must require confirmation.');
requireTrue(report.rollback_policy?.execute_rollback_required === true, 'D244 rollback policy must require explicit rollback confirmation.');
requireTrue(report.rollback_policy?.backend_only_rollback === true, 'D244 rollback must be backend-only.');
requireTrue(report.rollback_policy?.knowledge_rollback_supported === true, 'D244 must support knowledge rollback for execution receipts.');
requireTrue(report.rollback_policy?.document_text_stored === false, 'D244 must not store document text.');
requireTrue(report.rollback_policy?.public_frontend_authority === false, 'D244 must deny public frontend authority.');
requireTrue(report.rollback_policy?.no_paid_routes_started === true, 'D244 must be no-spend.');

requireTrue(report.supported_rollback?.kind === 'knowledge-source-metadata-restore', 'D244 supported rollback must restore knowledge source metadata.');
requireTrue((report.supported_rollback?.restores || []).includes('knowledge.source_status'), 'D244 must restore source status only through protected backend.');
requireTrue((report.supported_rollback?.restores || []).includes('knowledge.collection_membership'), 'D244 must restore collection membership metadata only through protected backend.');
requireTrue(report.supported_rollback?.raw_text_included === false, 'D244 supported rollback must exclude raw text.');
requireTrue(report.supported_rollback?.requires_execution_receipt === true, 'D244 rollback must require an execution receipt.');

for (const check of ['execution-receipt', 'mutation-executed', 'before-metadata', 'backend-only', 'metadata-only', 'no-raw-or-paid-route']) {
  requireTrue((report.checks || []).includes(check), `D244 checks must include ${check}.`);
}

for (const id of ['auto-preview-after-knowledge-execution', 'apply-knowledge-rollback', 'restore-source-metadata-only', 'no-secret-or-spend']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D244 scenario ${id} must be ready.`);
}

const routeManifest = json(files.routeManifest);
const rollbackRoute = (routeManifest.routes || []).find((route) => route.path === '/context/corrections/remediation-knowledge-rollbacks/apply');
requireTrue(rollbackRoute?.auth === 'protected-backend-auth', 'Public API route manifest must register knowledge rollback as protected.');
requireTrue(rollbackRoute?.owner === 'managed-api', 'Public API route manifest must keep knowledge rollback owned by managed-api.');

for (const needle of [
  'KNOWLEDGE_ROLLBACK_PREFIX',
  'mimir-context-correction-knowledge-rollback-v1:',
  'writeKnowledgeRollbackState',
  'readKnowledgeRollbackState',
  'previewKnowledgeRollback',
  'applyKnowledgeRollback',
  '/context/corrections/remediation-knowledge-rollbacks/apply',
  'data-correction-knowledge-rollback="preview"',
  'data-correction-knowledge-rollback="apply"',
  'context-correction-knowledge-rollback-status',
  'context-correction-knowledge-rollback-checks',
  'mmir-context-correction-knowledge-rollback-updated',
  'backend_only_rollback:true',
  'execute_rollback_required:true',
  'document_text_stored:false',
  'public_frontend_authority:false'
]) {
  requireIncludes(files.module, needle, `D244 module missing ${needle}.`);
}

for (const needle of [
  '.context-correction-knowledge-rollback-status',
  '.context-correction-knowledge-rollback-checks',
  '.context-correction-knowledge-rollback-results',
  '[data-state="rolled-back"]',
  '[data-state="needs-execution"]'
]) {
  requireIncludes(files.memoryCss, needle, `D244 knowledge rollback styling missing ${needle}.`);
}

for (const needle of [
  'renderCorrectionRemediationKnowledgeRollbackGatesReport',
  'correction_remediation_knowledge_rollback_gates_report',
  'progress-correction-remediation-knowledge-rollback-gates'
]) {
  requireIncludes(files.progressDashboard, needle, `D244 Progress Dashboard missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-correction-remediation-knowledge-rollback-gates.js', 'Quality workflow must run D244 knowledge rollback QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-correction-remediation-knowledge-rollback-gates.js', 'Pages workflow must run D244 knowledge rollback QA.');
requireIncludes(files.backlog, '| D250 |', 'Backlog must add D250 after D244.');
requireIncludes(files.implementationLog, 'D244 is now beta', 'Implementation log must mark D244 beta.');
requireIncludes(files.implementationLog, 'D250 is now next', 'Implementation log must mark D250 next.');

const progress = json(files.progressData);
requireTrue(progress.correction_remediation_knowledge_rollback_gates_report?.title === report.title, 'Progress dashboard data must embed D244 knowledge rollback report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d244 = tasks.find((task) => task.seq === 'D244');
const d245 = tasks.find((task) => task.seq === 'D250');
requireTrue(d244?.status === 'beta', 'Progress dashboard task D244 must be beta after knowledge rollback ships.');
requireTrue(d245?.status === 'next', 'Progress dashboard task D250 must become next after D244 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D250', 'Progress dashboard next queue must prioritize D250 after D244 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Correction remediation knowledge rollback gates smoke check passed.');
}
