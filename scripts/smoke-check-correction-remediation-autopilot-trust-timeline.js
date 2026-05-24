import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'correction-remediation-autopilot-trust-timeline-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
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
    fail(`Missing D248 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Autopilot Guided Trust Timeline', 'D248 report must name the guided trust timeline.');
requireTrue(report.task === 'D248', 'D248 report must be tied to task D248.');
requireTrue((report.backend_commits || []).includes('e648af0'), 'D248 report must reference rollback readiness backend commit.');

for (const route of [
  '/context/corrections/remediation-autopilot/queue',
  '/context/corrections/remediation-autopilot/handoff',
  '/context/corrections/remediation-autopilot/rollback-readiness'
]) {
  requireTrue((report.uses_existing_routes || []).some((item) => item.path === route && item.auth === 'protected-backend-auth'), `D248 report must include protected route ${route}.`);
}

requireTrue(report.timeline_policy?.automatic_safe_steps === true, 'D248 timeline must allow automatic safe metadata steps.');
requireTrue(report.timeline_policy?.explicit_source_confirmation_required === true, 'D248 timeline must require explicit source confirmation.');
requireTrue(report.timeline_policy?.explicit_rollback_confirmation_required === true, 'D248 timeline must require explicit rollback confirmation.');
requireTrue(report.timeline_policy?.public_frontend_authority === false, 'D248 timeline must deny public frontend authority.');
requireTrue(report.timeline_policy?.automatic_mutation_allowed === false, 'D248 timeline must deny automatic mutation.');
requireTrue(report.timeline_policy?.backend_only_source_mutation === true, 'D248 source mutation must be backend-only.');
requireTrue(report.timeline_policy?.backend_only_rollback === true, 'D248 rollback must be backend-only.');
requireTrue(report.timeline_policy?.provider_secrets_stored === false, 'D248 timeline must not store provider secrets.');
requireTrue(report.timeline_policy?.document_text_stored === false, 'D248 timeline must not store document text.');
requireTrue(report.timeline_policy?.no_paid_routes_started === true, 'D248 timeline must be no-spend.');

for (const id of ['safe-queue', 'handoff', 'confirm-source', 'readiness', 'undo']) {
  const step = (report.timeline_steps || []).find((item) => item.id === id);
  requireTrue(Boolean(step?.label), `D248 timeline step ${id} must be documented.`);
}

for (const id of ['one-lane-after-autopilot', 'explicit-source-confirmation', 'refresh-readiness-no-mutation', 'undo-disabled-until-preview', 'no-secret-or-spend']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D248 scenario ${id} must be ready.`);
}

for (const needle of [
  'context-correction-trust-timeline',
  'context-correction-trust-steps',
  'data-correction-trust-timeline="confirm-source"',
  'data-correction-trust-timeline="refresh-readiness"',
  'data-correction-trust-timeline="apply-rollback"',
  'executeRemediationCommit(handoff?.commit_id||',
  'executeKnowledgeExecution(handoff?.model_id||',
  'prepareRollbackReadiness()',
  'applyRemediationRollback()',
  'applyKnowledgeRollback()',
  'automatic_mutation_allowed:false',
  'public_frontend_authority:false',
  'no_paid_routes_started:true'
]) {
  requireIncludes(files.module, needle, `D248 module missing ${needle}.`);
}

for (const needle of [
  '.context-correction-trust-timeline',
  '.context-correction-trust-steps',
  '[data-state="confirm-ready"]',
  '[data-state="undo-ready"]',
  'grid-template-columns: repeat(auto-fit'
]) {
  requireIncludes(files.memoryCss, needle, `D248 trust timeline styling missing ${needle}.`);
}

for (const needle of [
  'renderCorrectionRemediationAutopilotTrustTimelineReport',
  'correction_remediation_autopilot_trust_timeline_report',
  'progress-correction-remediation-autopilot-trust-timeline'
]) {
  requireIncludes(files.progressDashboard, needle, `D248 Progress Dashboard missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-correction-remediation-autopilot-trust-timeline.js', 'Quality workflow must run D248 trust timeline QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-correction-remediation-autopilot-trust-timeline.js', 'Pages workflow must run D248 trust timeline QA.');
requireIncludes(files.backlog, '| D251 |', 'Backlog must add D251 after D248.');
requireIncludes(files.implementationLog, 'D248 is now beta', 'Implementation log must mark D248 beta.');
requireIncludes(files.implementationLog, 'D251 is now next', 'Implementation log must mark D251 next.');

const progress = json(files.progressData);
requireTrue(progress.correction_remediation_autopilot_trust_timeline_report?.title === report.title, 'Progress dashboard data must embed D248 trust timeline report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d248 = tasks.find((task) => task.seq === 'D248');
const d249 = tasks.find((task) => task.seq === 'D251');
requireTrue(d248?.status === 'beta', 'Progress dashboard task D248 must be beta after trust timeline ships.');
requireTrue(d249?.status === 'next', 'Progress dashboard task D251 must become next after D248 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D251', 'Progress dashboard next queue must prioritize D251 after D248 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Correction remediation autopilot trust timeline smoke check passed.');
}
