import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'correction-remediation-rollback-gates-report.json'),
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
    fail(`Missing D241 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Correction Remediation Rollback Gates', 'D241 report must name correction remediation rollback gates.');
requireTrue(report.task === 'D241', 'D241 report must be tied to task D241.');
requireTrue(report.backend_commit === 'b9de2d9', 'D241 report must reference the backend rollback gates commit.');
requireTrue(report.backend_route?.path === '/context/corrections/remediation-rollbacks/apply', 'D241 report must document the remediation rollback route.');
requireTrue(report.local_storage?.rollback_state === 'mimir-context-correction-remediation-rollback-v1:{workspace}', 'D241 report must document rollback state storage.');
requireTrue(report.rollback_policy?.preview_required === true, 'D241 rollback policy must require preview.');
requireTrue(report.rollback_policy?.confirm_required === true, 'D241 rollback policy must require confirmation.');
requireTrue(report.rollback_policy?.execute_rollback_required === true, 'D241 rollback policy must require explicit rollback execution flag.');
requireTrue(report.rollback_policy?.backend_only_rollback === true, 'D241 rollback policy must be backend-only.');
requireTrue(report.rollback_policy?.public_frontend_authority === false, 'D241 rollback policy must deny public frontend authority.');
requireTrue(report.rollback_policy?.automatic_mutation_allowed === false, 'D241 rollback policy must block automatic mutation.');
requireTrue(report.rollback_policy?.no_paid_routes_started === true, 'D241 rollback policy must be no-spend.');

requireTrue(report.supported_rollback?.kind === 'memory-scope-restore', 'D241 supported rollback must be memory-scope-restore.');
requireTrue((report.supported_rollback?.restores || []).includes('memory.scope'), 'D241 supported rollback must restore memory.scope.');
requireTrue((report.supported_rollback?.captures || []).includes('before.scope'), 'D241 supported rollback must capture before metadata.');
requireTrue((report.blocked_rollback?.targets || []).includes('execution-without-before-metadata'), 'D241 blocked rollback must include executions without before metadata.');

for (const check of ['execution-receipt', 'mutation-executed', 'before-metadata', 'backend-only', 'no-raw-or-paid-route']) {
  requireTrue((report.checks || []).includes(check), `D241 checks must include ${check}.`);
}

for (const id of ['auto-preview-after-execution', 'apply-memory-rollback', 'blocked-no-before-metadata', 'rollback-receipt-visible']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D241 scenario ${id} must be ready.`);
}

const routeManifest = json(files.routeManifest);
const rollbackRoute = (routeManifest.routes || []).find((route) => route.path === '/context/corrections/remediation-rollbacks/apply');
requireTrue(rollbackRoute?.auth === 'protected-backend-auth', 'Public API route manifest must register remediation rollbacks as protected.');
requireTrue(rollbackRoute?.owner === 'managed-api', 'Public API route manifest must keep remediation rollbacks owned by managed-api.');

for (const needle of [
  'ROLLBACK_PREFIX',
  'mimir-context-correction-remediation-rollback-v1:',
  'writeRollbackState',
  'readRollbackState',
  'previewRemediationRollback',
  'applyRemediationRollback',
  '/context/corrections/remediation-rollbacks/apply',
  'data-correction-rollback="preview"',
  'data-correction-rollback="apply"',
  'context-correction-rollback-status',
  'context-correction-rollback-checks',
  'mmir-context-correction-rollback-updated',
  'backend_only_rollback:true',
  'public_frontend_authority:false'
]) {
  requireIncludes(files.module, needle, `D241 module missing ${needle}.`);
}

for (const needle of [
  '.context-correction-rollback-status',
  '.context-correction-rollback-checks',
  '.context-correction-rollback-results',
  '[data-state="rolled-back"]',
  '[data-state="blocked"]',
  '[data-state="needs-execution"]'
]) {
  requireIncludes(files.memoryCss, needle, `D241 rollback gate styling missing ${needle}.`);
}

for (const needle of [
  'renderCorrectionRemediationRollbackGatesReport',
  'correction_remediation_rollback_gates_report',
  'progress-correction-remediation-rollback-gates'
]) {
  requireIncludes(files.progressDashboard, needle, `D241 Progress Dashboard missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-correction-remediation-rollback-gates.js', 'Quality workflow must run D241 correction remediation rollback gate QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-correction-remediation-rollback-gates.js', 'Pages workflow must run D241 correction remediation rollback gate QA.');
requireIncludes(files.backlog, '| D245 |', 'Backlog must add D245 after D241.');
requireIncludes(files.implementationLog, 'D241 is now beta', 'Implementation log must mark D241 beta.');
requireIncludes(files.implementationLog, 'D245 is now next', 'Implementation log must mark D245 next.');

const progress = json(files.progressData);
requireTrue(progress.correction_remediation_rollback_gates_report?.title === report.title, 'Progress dashboard data must embed D241 remediation rollback gates report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d241 = tasks.find((task) => task.seq === 'D241');
const d242 = tasks.find((task) => task.seq === 'D245');
requireTrue(d241?.status === 'beta', 'Progress dashboard task D241 must be beta after rollback gates ship.');
requireTrue(d242?.status === 'next', 'Progress dashboard task D245 must become next after D241 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D245', 'Progress dashboard next queue must prioritize D245 after D241 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Correction remediation rollback gates smoke check passed.');
}
