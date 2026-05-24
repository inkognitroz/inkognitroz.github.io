import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'correction-remediation-apply-gates-report.json'),
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
    fail(`Missing D237 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Correction Remediation Apply Gates', 'D237 report must name correction remediation apply gates.');
requireTrue(report.task === 'D237', 'D237 report must be tied to task D237.');
requireTrue(report.backend_commit === '85617d8', 'D237 report must reference the backend apply-gate commit.');
requireTrue(report.backend_route?.path === '/context/corrections/remediation-steps/apply', 'D237 report must document the remediation apply route.');
requireTrue(report.local_storage?.apply_state === 'mimir-context-correction-remediation-apply-v1:{workspace}', 'D237 report must document the apply state localStorage key.');
requireTrue(report.apply_policy?.confirm_required === true, 'D237 apply policy must require confirmation.');
requireTrue(report.apply_policy?.public_frontend_authority === false, 'D237 apply policy must deny public frontend authority.');
requireTrue(report.apply_policy?.automatic_mutation_allowed === false, 'D237 apply policy must block automatic mutation.');
requireTrue(report.apply_policy?.source_mutation_executed === false, 'D237 apply policy must keep source mutation false from public UI.');

for (const field of ['prompt', 'raw_prompt', 'response', 'raw_response', 'messages', 'transcript', 'api_key', 'access_token', 'refresh_token', 'secret', 'document_text']) {
  requireTrue((report.blocked_fields || []).includes(field), `D237 blocked fields must include ${field}.`);
}

for (const id of ['apply-gate-visible', 'protected-apply-route', 'manual-target-receipt', 'undo-follow-through']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D237 scenario ${id} must be ready.`);
}

const routeManifest = json(files.routeManifest);
const applyRoute = (routeManifest.routes || []).find((route) => route.path === '/context/corrections/remediation-steps/apply');
requireTrue(applyRoute?.auth === 'protected-backend-auth', 'Public API route manifest must register remediation apply as protected.');
requireTrue(applyRoute?.owner === 'managed-api', 'Public API route manifest must keep remediation apply owned by managed-api.');

for (const needle of [
  'APPLY_PREFIX',
  'mimir-context-correction-remediation-apply-v1:',
  'writeApplyState',
  'readApplyState',
  'applyRemediationStep',
  '/context/corrections/remediation-steps/apply',
  'data-correction-apply="apply"',
  'data-step-id',
  'data-correction-id',
  'confirm:true',
  'source_mutation_executed:false',
  'public_frontend_authority:false',
  'mmir-context-correction-apply-updated'
]) {
  requireIncludes(files.module, needle, `D237 module missing ${needle}.`);
}

for (const needle of [
  '.context-correction-apply-status',
  '.context-correction-plan-steps button',
  '[data-state="recorded"]',
  '[data-state="applied"]'
]) {
  requireIncludes(files.memoryCss, needle, `D237 remediation apply styling missing ${needle}.`);
}

for (const needle of [
  'renderCorrectionRemediationApplyGatesReport',
  'correction_remediation_apply_gates_report',
  'progress-correction-remediation-apply-gates'
]) {
  requireIncludes(files.progressDashboard, needle, `D237 Progress Dashboard missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-correction-remediation-apply-gates.js', 'Quality workflow must run D237 correction remediation apply QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-correction-remediation-apply-gates.js', 'Pages workflow must run D237 correction remediation apply QA.');
requireIncludes(files.backlog, '| D251 |', 'Backlog must add D251 after D237.');
requireIncludes(files.implementationLog, 'D237 is now beta', 'Implementation log must mark D237 beta.');
requireIncludes(files.implementationLog, 'D251 is now next', 'Implementation log must mark D251 next.');

const progress = json(files.progressData);
requireTrue(progress.correction_remediation_apply_gates_report?.title === report.title, 'Progress dashboard data must embed D237 remediation apply report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d237 = tasks.find((task) => task.seq === 'D237');
const d238 = tasks.find((task) => task.seq === 'D251');
requireTrue(d237?.status === 'beta', 'Progress dashboard task D237 must be beta after apply gates ship.');
requireTrue(d238?.status === 'next', 'Progress dashboard task D251 must become next after D237 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D251', 'Progress dashboard next queue must prioritize D251 after D237 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Correction remediation apply gates smoke check passed.');
}
