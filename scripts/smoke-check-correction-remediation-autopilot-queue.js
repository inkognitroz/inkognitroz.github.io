import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'correction-remediation-autopilot-queue-report.json'),
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
    fail(`Missing D245 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Correction Remediation Autopilot Queue', 'D245 report must name correction remediation autopilot queue.');
requireTrue(report.task === 'D245', 'D245 report must be tied to task D245.');
requireTrue(report.backend_commit === 'bc0ccc7', 'D245 report must reference the backend autopilot commit.');
requireTrue(report.backend_route?.path === '/context/corrections/remediation-autopilot/queue', 'D245 report must document the autopilot route.');
requireTrue(report.local_storage?.autopilot_state === 'mimir-context-correction-remediation-autopilot-v1:{workspace}', 'D245 report must document autopilot storage.');
requireTrue(report.autopilot_policy?.preview_required === true, 'D245 autopilot policy must require preview.');
requireTrue(report.autopilot_policy?.confirm_required_for_safe_receipts === true, 'D245 safe receipts must require confirmation.');
requireTrue(report.autopilot_policy?.source_mutation_allowed === false, 'D245 autopilot must not allow source mutation.');
requireTrue(report.autopilot_policy?.source_mutation_executed === false, 'D245 autopilot must not execute source mutation.');
requireTrue(report.autopilot_policy?.public_frontend_authority === false, 'D245 autopilot must deny public frontend authority.');
requireTrue(report.autopilot_policy?.document_text_stored === false, 'D245 autopilot must not store document text.');
requireTrue(report.autopilot_policy?.no_paid_routes_started === true, 'D245 autopilot must be no-spend.');
requireTrue(report.manual_stop?.required === true, 'D245 autopilot must return a manual stop before source mutation.');

for (const step of ['review-item', 'plan-preview', 'apply-step', 'adapter-draft', 'commit-receipt']) {
  requireTrue((report.safe_queue_steps || []).includes(step), `D245 safe queue must include ${step}.`);
}

for (const id of ['auto-preview-after-review-load', 'run-safe-remediation-queue', 'stop-before-source-mutation', 'no-secret-or-spend']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D245 scenario ${id} must be ready.`);
}

const routeManifest = json(files.routeManifest);
const route = (routeManifest.routes || []).find((item) => item.path === '/context/corrections/remediation-autopilot/queue');
requireTrue(route?.auth === 'protected-backend-auth', 'Public API route manifest must register autopilot as protected.');
requireTrue(route?.owner === 'managed-api', 'Public API route manifest must keep autopilot owned by managed-api.');

for (const needle of [
  'AUTOPILOT_PREFIX',
  'mimir-context-correction-remediation-autopilot-v1:',
  'writeAutopilotState',
  'readAutopilotState',
  'previewRemediationAutopilot',
  'runRemediationAutopilot',
  '/context/corrections/remediation-autopilot/queue',
  'data-correction-autopilot="preview"',
  'data-correction-autopilot="run"',
  'context-correction-autopilot-status',
  'context-correction-autopilot-queue',
  'mmir-context-correction-autopilot-updated',
  'run_safe_steps:isRun',
  'source_mutation_allowed:false',
  'document_text_stored:false',
  'public_frontend_authority:false'
]) {
  requireIncludes(files.module, needle, `D245 module missing ${needle}.`);
}

for (const needle of [
  '.context-correction-autopilot-status',
  '.context-correction-autopilot-queue',
  '.context-correction-autopilot-stop',
  '[data-state="safe-steps-complete"]',
  '[data-step-status="recorded"]'
]) {
  requireIncludes(files.memoryCss, needle, `D245 autopilot styling missing ${needle}.`);
}

for (const needle of [
  'renderCorrectionRemediationAutopilotQueueReport',
  'correction_remediation_autopilot_queue_report',
  'progress-correction-remediation-autopilot-queue'
]) {
  requireIncludes(files.progressDashboard, needle, `D245 Progress Dashboard missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-correction-remediation-autopilot-queue.js', 'Quality workflow must run D245 autopilot QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-correction-remediation-autopilot-queue.js', 'Pages workflow must run D245 autopilot QA.');
requireIncludes(files.backlog, '| D253 |', 'Backlog must add D253 after D245.');
requireIncludes(files.implementationLog, 'D245 is now beta', 'Implementation log must mark D245 beta.');
requireIncludes(files.implementationLog, 'D253 is now next', 'Implementation log must mark D253 next.');

const progress = json(files.progressData);
requireTrue(progress.correction_remediation_autopilot_queue_report?.title === report.title, 'Progress dashboard data must embed D245 autopilot report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d245 = tasks.find((task) => task.seq === 'D245');
const d246 = tasks.find((task) => task.seq === 'D253');
requireTrue(d245?.status === 'beta', 'Progress dashboard task D245 must be beta after autopilot ships.');
requireTrue(d246?.status === 'next', 'Progress dashboard task D253 must become next after D245 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D253', 'Progress dashboard next queue must prioritize D253 after D245 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Correction remediation autopilot queue smoke check passed.');
}
