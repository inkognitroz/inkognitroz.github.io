import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'correction-remediation-knowledge-source-model-report.json'),
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
    fail(`Missing D242 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Correction Remediation Knowledge Source Model', 'D242 report must name correction remediation knowledge source model.');
requireTrue(report.task === 'D242', 'D242 report must be tied to task D242.');
requireTrue(report.backend_commit === 'bff2c3f', 'D242 report must reference the backend knowledge source model commit.');
requireTrue(report.backend_route?.path === '/context/corrections/remediation-knowledge-sources/model', 'D242 report must document the knowledge source model route.');
requireTrue(report.local_storage?.knowledge_source_state === 'mimir-context-correction-knowledge-source-model-v1:{workspace}', 'D242 report must document knowledge source model storage.');
requireTrue(report.source_model_policy?.preview_required === true, 'D242 source model policy must require preview.');
requireTrue(report.source_model_policy?.confirm_required === true, 'D242 source model policy must require confirmation.');
requireTrue(report.source_model_policy?.source_model_record_allowed === true, 'D242 must allow model record receipts.');
requireTrue(report.source_model_policy?.knowledge_execution_supported === false, 'D242 must keep knowledge execution blocked.');
requireTrue(report.source_model_policy?.source_mutation_allowed === false, 'D242 must deny source mutation.');
requireTrue(report.source_model_policy?.source_mutation_executed === false, 'D242 must not execute source mutation.');
requireTrue(report.source_model_policy?.document_text_stored === false, 'D242 must not store document text.');
requireTrue(report.source_model_policy?.public_frontend_authority === false, 'D242 must deny public frontend authority.');
requireTrue(report.source_model_policy?.no_paid_routes_started === true, 'D242 must be no-spend.');

requireTrue((report.supported_model?.decisions || []).includes('split-collection'), 'D242 supported model must include split-collection decision.');
requireTrue((report.supported_model?.captures || []).includes('current_collection_id'), 'D242 supported model must capture current collection metadata.');
requireTrue(report.supported_model?.raw_text_included === false, 'D242 supported model must exclude raw text.');
requireTrue((report.blocked_execution?.targets || []).includes('knowledge-source-mutation'), 'D242 blocked execution must include knowledge source mutation.');

for (const check of ['knowledge-correction', 'source-ids', 'source-ownership', 'metadata-only', 'mutation-disabled']) {
  requireTrue((report.checks || []).includes(check), `D242 checks must include ${check}.`);
}

for (const id of ['auto-preview-after-knowledge-commit', 'record-source-model', 'knowledge-execution-remains-blocked', 'no-document-text']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D242 scenario ${id} must be ready.`);
}

const routeManifest = json(files.routeManifest);
const sourceModelRoute = (routeManifest.routes || []).find((route) => route.path === '/context/corrections/remediation-knowledge-sources/model');
requireTrue(sourceModelRoute?.auth === 'protected-backend-auth', 'Public API route manifest must register knowledge source models as protected.');
requireTrue(sourceModelRoute?.owner === 'managed-api', 'Public API route manifest must keep knowledge source models owned by managed-api.');

for (const needle of [
  'KNOWLEDGE_SOURCE_PREFIX',
  'mimir-context-correction-knowledge-source-model-v1:',
  'writeKnowledgeSourceState',
  'readKnowledgeSourceState',
  'previewKnowledgeSourceModel',
  'recordKnowledgeSourceModel',
  '/context/corrections/remediation-knowledge-sources/model',
  'data-correction-knowledge-source="preview"',
  'data-correction-knowledge-source="record"',
  'context-correction-knowledge-source-status',
  'context-correction-knowledge-source-checks',
  'mmir-context-correction-knowledge-source-model-updated',
  'knowledge_execution_supported:false',
  'source_mutation_allowed:false',
  'document_text_stored:false',
  'public_frontend_authority:false'
]) {
  requireIncludes(files.module, needle, `D242 module missing ${needle}.`);
}

for (const needle of [
  '.context-correction-knowledge-source-status',
  '.context-correction-knowledge-source-checks',
  '.context-correction-knowledge-source-results',
  '[data-state="recorded"]',
  '[data-state="needs-knowledge-commit"]'
]) {
  requireIncludes(files.memoryCss, needle, `D242 knowledge source model styling missing ${needle}.`);
}

for (const needle of [
  'renderCorrectionRemediationKnowledgeSourceModelReport',
  'correction_remediation_knowledge_source_model_report',
  'progress-correction-remediation-knowledge-source-model'
]) {
  requireIncludes(files.progressDashboard, needle, `D242 Progress Dashboard missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-correction-remediation-knowledge-source-model.js', 'Quality workflow must run D242 knowledge source model QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-correction-remediation-knowledge-source-model.js', 'Pages workflow must run D242 knowledge source model QA.');
requireIncludes(files.backlog, '| D248 |', 'Backlog must add D248 after D242.');
requireIncludes(files.implementationLog, 'D242 is now beta', 'Implementation log must mark D242 beta.');
requireIncludes(files.implementationLog, 'D248 is now next', 'Implementation log must mark D248 next.');

const progress = json(files.progressData);
requireTrue(progress.correction_remediation_knowledge_source_model_report?.title === report.title, 'Progress dashboard data must embed D242 knowledge source model report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d242 = tasks.find((task) => task.seq === 'D242');
const d243 = tasks.find((task) => task.seq === 'D248');
requireTrue(d242?.status === 'beta', 'Progress dashboard task D242 must be beta after knowledge source model ships.');
requireTrue(d243?.status === 'next', 'Progress dashboard task D248 must become next after D242 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D248', 'Progress dashboard next queue must prioritize D248 after D242 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Correction remediation knowledge source model smoke check passed.');
}
