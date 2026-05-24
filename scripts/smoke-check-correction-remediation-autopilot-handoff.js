import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'correction-remediation-autopilot-handoff-report.json'),
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
    fail(`Missing D246 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Autopilot Source-Mutation Handoff Gates', 'D246 report must name autopilot handoff gates.');
requireTrue(report.task === 'D246', 'D246 report must be tied to task D246.');
requireTrue(report.backend_commit === '6c83644', 'D246 report must reference the backend handoff commit.');
requireTrue(report.backend_route?.path === '/context/corrections/remediation-autopilot/handoff', 'D246 report must document the handoff route.');
requireTrue(report.local_storage?.handoff_state === 'mimir-context-correction-autopilot-handoff-v1:{workspace}', 'D246 report must document handoff storage.');
requireTrue(report.handoff_policy?.preview_required === true, 'D246 handoff policy must require preview.');
requireTrue(report.handoff_policy?.confirm_required === true, 'D246 handoff policy must require explicit confirmation.');
requireTrue(report.handoff_policy?.backend_only_execution === true, 'D246 handoff execution must stay backend-only.');
requireTrue(report.handoff_policy?.source_mutation_executed === false, 'D246 handoff must not execute source mutation.');
requireTrue(report.handoff_policy?.public_frontend_authority === false, 'D246 handoff must deny public frontend authority.');
requireTrue(report.handoff_policy?.document_text_stored === false, 'D246 handoff must not store document text.');
requireTrue(report.handoff_policy?.no_paid_routes_started === true, 'D246 handoff must be no-spend.');

for (const id of ['auto-handoff-after-safe-run', 'memory-handoff-resume', 'knowledge-handoff-resume', 'no-secret-or-spend']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D246 scenario ${id} must be ready.`);
}

for (const target of ['memory', 'knowledge']) {
  const handoffTarget = (report.handoff_targets || []).find((item) => item.target === target);
  requireTrue(Boolean(handoffTarget?.route), `D246 must document ${target} handoff route.`);
  requireTrue((handoffTarget?.confirmation_body_fields || []).includes('confirm'), `D246 ${target} handoff must require confirm.`);
  requireTrue((handoffTarget?.confirmation_body_fields || []).includes('execute_source_mutation'), `D246 ${target} handoff must require execute_source_mutation.`);
}

const routeManifest = json(files.routeManifest);
const route = (routeManifest.routes || []).find((item) => item.path === '/context/corrections/remediation-autopilot/handoff');
requireTrue(route?.auth === 'protected-backend-auth', 'Public API route manifest must register handoff as protected.');
requireTrue(route?.owner === 'managed-api', 'Public API route manifest must keep handoff owned by managed-api.');

for (const needle of [
  'HANDOFF_PREFIX',
  'mimir-context-correction-autopilot-handoff-v1:',
  'writeHandoffState',
  'readHandoffState',
  'prepareAutopilotHandoff',
  '/context/corrections/remediation-autopilot/handoff',
  'data-correction-handoff="prepare"',
  'context-correction-handoff-status',
  'mmir-context-correction-handoff-updated',
  'document_text_stored:false',
  'public_frontend_authority:false'
]) {
  requireIncludes(files.module, needle, `D246 module missing ${needle}.`);
}

for (const needle of [
  '.context-correction-handoff-status',
  '[data-state="ready"]',
  '[data-state="preparing"]',
  '[data-state="needs-autopilot-run"]'
]) {
  requireIncludes(files.memoryCss, needle, `D246 handoff styling missing ${needle}.`);
}

for (const needle of [
  'renderCorrectionRemediationAutopilotHandoffReport',
  'correction_remediation_autopilot_handoff_report',
  'progress-correction-remediation-autopilot-handoff'
]) {
  requireIncludes(files.progressDashboard, needle, `D246 Progress Dashboard missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-correction-remediation-autopilot-handoff.js', 'Quality workflow must run D246 handoff QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-correction-remediation-autopilot-handoff.js', 'Pages workflow must run D246 handoff QA.');
requireIncludes(files.backlog, '| D251 |', 'Backlog must add D251 after D246.');
requireIncludes(files.implementationLog, 'D246 is now beta', 'Implementation log must mark D246 beta.');
requireIncludes(files.implementationLog, 'D251 is now next', 'Implementation log must mark D251 next.');

const progress = json(files.progressData);
requireTrue(progress.correction_remediation_autopilot_handoff_report?.title === report.title, 'Progress dashboard data must embed D246 handoff report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d246 = tasks.find((task) => task.seq === 'D246');
const d247 = tasks.find((task) => task.seq === 'D251');
requireTrue(d246?.status === 'beta', 'Progress dashboard task D246 must be beta after handoff ships.');
requireTrue(d247?.status === 'next', 'Progress dashboard task D251 must become next after D246 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D251', 'Progress dashboard next queue must prioritize D251 after D246 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Correction remediation autopilot handoff smoke check passed.');
}
