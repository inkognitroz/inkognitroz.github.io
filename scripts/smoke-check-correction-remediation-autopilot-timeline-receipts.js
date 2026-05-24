import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'correction-remediation-autopilot-timeline-receipts-report.json'),
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
    fail(`Missing D250 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Autopilot Timeline Post-Action Receipts', 'D250 report must name timeline receipts.');
requireTrue(report.task === 'D250', 'D250 report must be tied to task D250.');
requireTrue(report.local_storage?.receipt_state === 'mimir-context-correction-autopilot-trust-receipt-v1:{workspace}', 'D250 report must document receipt storage.');
requireTrue(report.receipt_policy?.browser_local_metadata_only === true, 'D250 receipts must be browser-local metadata only.');
requireTrue(report.receipt_policy?.protected_backend_route_required === true, 'D250 receipts must require protected backend route.');
requireTrue(report.receipt_policy?.explicit_user_action_required === true, 'D250 receipts must require explicit user action.');
requireTrue(report.receipt_policy?.public_frontend_authority === false, 'D250 receipts must deny public frontend authority.');
requireTrue(report.receipt_policy?.automatic_mutation_allowed === false, 'D250 receipts must deny automatic mutation.');
requireTrue(report.receipt_policy?.provider_secrets_stored === false, 'D250 receipts must not store provider secrets.');
requireTrue(report.receipt_policy?.document_text_stored === false, 'D250 receipts must not store document text.');
requireTrue(report.receipt_policy?.no_paid_routes_started === true, 'D250 receipts must be no-spend.');

for (const action of ['confirm-source', 'refresh-readiness', 'apply-rollback']) {
  const route = (report.routes || []).find((item) => item.action === action);
  requireTrue(Boolean(route?.next_action), `D250 route receipt for ${action} must define next action.`);
}

for (const id of ['confirm-source-receipt', 'refresh-readiness-receipt', 'apply-rollback-receipt', 'no-secret-or-spend']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D250 scenario ${id} must be ready.`);
}

for (const needle of [
  'TRUST_RECEIPT_PREFIX',
  'mimir-context-correction-autopilot-trust-receipt-v1:',
  'trustReceiptKey',
  'writeTrustReceiptState',
  'readTrustReceiptState',
  'mmir-context-correction-trust-receipt-updated',
  'context-correction-trust-receipt',
  "writeTrustReceiptState({status:'running'",
  "writeTrustReceiptState({status:resultStatus==='error'?'error':'ready'",
  "next_action:action==='confirm-source'?'refresh rollback'",
  'provider_secrets_stored:false',
  'document_text_stored:false',
  'no_paid_routes_started:true'
]) {
  requireIncludes(files.module, needle, `D250 module missing ${needle}.`);
}

for (const needle of [
  '.context-correction-trust-receipt',
  '[data-state="ready"]',
  '[data-state="running"]',
  '[data-state="error"]'
]) {
  requireIncludes(files.memoryCss, needle, `D250 receipt styling missing ${needle}.`);
}

for (const needle of [
  'renderCorrectionRemediationAutopilotTimelineReceiptsReport',
  'correction_remediation_autopilot_timeline_receipts_report',
  'progress-correction-remediation-autopilot-timeline-receipts'
]) {
  requireIncludes(files.progressDashboard, needle, `D250 Progress Dashboard missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-correction-remediation-autopilot-timeline-receipts.js', 'Quality workflow must run D250 timeline receipts QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-correction-remediation-autopilot-timeline-receipts.js', 'Pages workflow must run D250 timeline receipts QA.');
requireIncludes(files.backlog, '| D253 |', 'Backlog must add D253 after D250.');
requireIncludes(files.implementationLog, 'D250 is now beta', 'Implementation log must mark D250 beta.');
requireIncludes(files.implementationLog, 'D254 is now next', 'Implementation log must mark D254 next.');

const progress = json(files.progressData);
requireTrue(progress.correction_remediation_autopilot_timeline_receipts_report?.title === report.title, 'Progress dashboard data must embed D250 receipts report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d250 = tasks.find((task) => task.seq === 'D250');
const d251 = tasks.find((task) => task.seq === 'D254');
requireTrue(d250?.status === 'beta', 'Progress dashboard task D250 must be beta after timeline receipts ship.');
requireTrue(d251?.status === 'next', 'Progress dashboard task D254 must become next after D250 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D254', 'Progress dashboard next queue must prioritize D254 after D250 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Correction remediation autopilot timeline receipts smoke check passed.');
}
