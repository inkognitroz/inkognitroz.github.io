import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'correction-remediation-autopilot-rollback-readiness-report.json'),
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
    fail(`Missing D247 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Autopilot Rollback Readiness Cards', 'D247 report must name rollback readiness cards.');
requireTrue(report.task === 'D247', 'D247 report must be tied to task D247.');
requireTrue(report.backend_commit === 'e648af0', 'D247 report must reference the backend rollback readiness commit.');
requireTrue(report.backend_route?.path === '/context/corrections/remediation-autopilot/rollback-readiness', 'D247 report must document the readiness route.');
requireTrue(report.local_storage?.readiness_state === 'mimir-context-correction-autopilot-rollback-readiness-v1:{workspace}', 'D247 report must document readiness storage.');
requireTrue(report.readiness_policy?.preview_required === true, 'D247 readiness policy must require preview.');
requireTrue(report.readiness_policy?.confirm_required === true, 'D247 readiness policy must require explicit confirmation.');
requireTrue(report.readiness_policy?.execute_rollback_required === true, 'D247 readiness policy must require explicit rollback execution.');
requireTrue(report.readiness_policy?.backend_only_rollback === true, 'D247 rollback must stay backend-only.');
requireTrue(report.readiness_policy?.source_mutation_executed === false, 'D247 public readiness must not execute source mutation.');
requireTrue(report.readiness_policy?.public_frontend_authority === false, 'D247 readiness must deny public frontend authority.');
requireTrue(report.readiness_policy?.automatic_mutation_allowed === false, 'D247 readiness must deny automatic mutation.');
requireTrue(report.readiness_policy?.document_text_stored === false, 'D247 readiness must not store document text.');
requireTrue(report.readiness_policy?.no_paid_routes_started === true, 'D247 readiness must be no-spend.');

const before = (report.readiness_phases || []).find((item) => item.phase === 'before-source-mutation');
const after = (report.readiness_phases || []).find((item) => item.phase === 'after-source-mutation');
requireTrue(before?.status === 'planned', 'D247 before-source-mutation readiness must be planned.');
requireTrue(before?.rollback_available_now === false, 'D247 before-source-mutation must not expose immediate rollback.');
requireTrue(before?.rollback_available_after_execution === true, 'D247 before-source-mutation must promise rollback only after explicit execution.');
requireTrue(before?.source_mutation_already_executed === false, 'D247 before-source-mutation must mark source mutation as not executed yet.');
requireTrue(after?.status === 'ready', 'D247 after-source-mutation readiness must be ready.');
requireTrue(after?.rollback_available_now === true, 'D247 after-source-mutation must expose rollback availability.');
requireTrue(after?.source_mutation_already_executed === true, 'D247 after-source-mutation must report backend source mutation as already executed.');

for (const id of ['auto-check-after-handoff', 'memory-readiness-resume', 'knowledge-readiness-resume', 'no-secret-or-spend']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D247 scenario ${id} must be ready.`);
}

const routeManifest = json(files.routeManifest);
const route = (routeManifest.routes || []).find((item) => item.path === '/context/corrections/remediation-autopilot/rollback-readiness');
requireTrue(route?.auth === 'protected-backend-auth', 'Public API route manifest must register readiness as protected.');
requireTrue(route?.owner === 'managed-api', 'Public API route manifest must keep readiness owned by managed-api.');

for (const needle of [
  'ROLLBACK_READINESS_PREFIX',
  'mimir-context-correction-autopilot-rollback-readiness-v1:',
  'writeRollbackReadinessState',
  'readRollbackReadinessState',
  'prepareRollbackReadiness',
  '/context/corrections/remediation-autopilot/rollback-readiness',
  'data-correction-rollback-readiness="check"',
  'context-correction-rollback-readiness-status',
  'mmir-context-correction-rollback-readiness-updated',
  'source_mutation_already_executed',
  'document_text_stored:false',
  'public_frontend_authority:false'
]) {
  requireIncludes(files.module, needle, `D247 module missing ${needle}.`);
}

for (const needle of [
  '.context-correction-rollback-readiness-status',
  '[data-state="planned"]',
  '[data-state="checking"]',
  '[data-state="needs-handoff"]'
]) {
  requireIncludes(files.memoryCss, needle, `D247 readiness styling missing ${needle}.`);
}

for (const needle of [
  'renderCorrectionRemediationAutopilotRollbackReadinessReport',
  'correction_remediation_autopilot_rollback_readiness_report',
  'progress-correction-remediation-autopilot-rollback-readiness'
]) {
  requireIncludes(files.progressDashboard, needle, `D247 Progress Dashboard missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-correction-remediation-autopilot-rollback-readiness.js', 'Quality workflow must run D247 rollback readiness QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-correction-remediation-autopilot-rollback-readiness.js', 'Pages workflow must run D247 rollback readiness QA.');
requireIncludes(files.backlog, '| D249 |', 'Backlog must add D249 after D247.');
requireIncludes(files.implementationLog, 'D247 is now beta', 'Implementation log must mark D247 beta.');
requireIncludes(files.implementationLog, 'D249 is now next', 'Implementation log must mark D249 next.');

const progress = json(files.progressData);
requireTrue(progress.correction_remediation_autopilot_rollback_readiness_report?.title === report.title, 'Progress dashboard data must embed D247 rollback readiness report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d247 = tasks.find((task) => task.seq === 'D247');
const d248 = tasks.find((task) => task.seq === 'D249');
requireTrue(d247?.status === 'beta', 'Progress dashboard task D247 must be beta after rollback readiness ships.');
requireTrue(d248?.status === 'next', 'Progress dashboard task D249 must become next after D247 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D249', 'Progress dashboard next queue must prioritize D249 after D247 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Correction remediation autopilot rollback readiness smoke check passed.');
}
