import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'correction-remediation-plan-report.json'),
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
    fail(`Missing D236 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Correction Remediation Plan Handoff', 'D236 report must name correction remediation plan handoff.');
requireTrue(report.task === 'D236', 'D236 report must be tied to task D236.');
requireTrue(report.backend_commit === '5d44915', 'D236 report must reference the backend remediation-plan commit.');
requireTrue(report.backend_route?.path === '/context/corrections/remediation-plans', 'D236 report must document /context/corrections/remediation-plans.');
requireTrue(report.local_storage?.plan_state === 'mimir-context-correction-remediation-plan-v1:{workspace}', 'D236 report must use a remediation plan localStorage key.');
requireTrue(report.plan_policy?.execution_allowed === false, 'D236 plan policy must block execution.');
requireTrue(report.plan_policy?.automatic_mutation_allowed === false, 'D236 plan policy must block automatic mutation.');

for (const field of ['prompt', 'raw_prompt', 'response', 'raw_response', 'messages', 'transcript', 'api_key', 'access_token', 'refresh_token', 'secret', 'document_text']) {
  requireTrue((report.blocked_fields || []).includes(field), `D236 blocked fields must include ${field}.`);
}

for (const id of ['plan-single-review-item', 'plan-memory', 'plan-knowledge', 'approve-or-defer-note']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D236 scenario ${id} must be ready.`);
  requireTrue(scenario?.execution_allowed === false, `D236 scenario ${id} must keep execution disabled.`);
  requireTrue(scenario?.no_paid_routes_started === true, `D236 scenario ${id} must not start paid routes.`);
  requireTrue(scenario?.provider_secrets_stored === false, `D236 scenario ${id} must store no provider secrets.`);
  requireTrue(scenario?.raw_prompt_stored === false, `D236 scenario ${id} must store no raw prompts.`);
  requireTrue(scenario?.raw_response_stored === false, `D236 scenario ${id} must store no raw responses.`);
}

const routeManifest = json(files.routeManifest);
const planRoute = (routeManifest.routes || []).find((route) => route.path === '/context/corrections/remediation-plans');
requireTrue(planRoute?.auth === 'protected-backend-auth', 'Public API route manifest must register remediation plans as protected.');
requireTrue(planRoute?.owner === 'managed-api', 'Public API route manifest must keep remediation plans owned by managed-api.');

for (const needle of [
  'PLAN_PREFIX',
  'mimir-context-correction-remediation-plan-v1:',
  'writePlanState',
  'readPlanState',
  'createRemediationPlan',
  'approvePlan',
  'deferPlan',
  '/context/corrections/remediation-plans',
  'context-correction-plan-panel',
  'data-correction-plan="create"',
  'data-correction-plan="approve"',
  'data-correction-plan="defer"',
  'execution_allowed:false',
  'public_frontend_authority:false'
]) {
  requireIncludes(files.module, needle, `D236 module missing ${needle}.`);
}

for (const needle of [
  '.context-correction-plan-panel',
  '.context-correction-plan-actions',
  '.context-correction-plan-steps',
  '.context-correction-review-row-actions'
]) {
  requireIncludes(files.memoryCss, needle, `D236 remediation UI styling missing ${needle}.`);
}

for (const needle of [
  'renderCorrectionRemediationPlanReport',
  'correction_remediation_plan_report',
  'progress-correction-remediation-plan'
]) {
  requireIncludes(files.progressDashboard, needle, `D236 Progress Dashboard missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-correction-remediation-plan.js', 'Quality workflow must run D236 correction remediation plan QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-correction-remediation-plan.js', 'Pages workflow must run D236 correction remediation plan QA.');
requireIncludes(files.backlog, '| D237 |', 'Backlog must add D237 after D236.');
requireIncludes(files.implementationLog, 'D236 is now beta', 'Implementation log must mark D236 beta.');
requireIncludes(files.implementationLog, 'D237 is now next', 'Implementation log must mark D237 next.');

const progress = json(files.progressData);
requireTrue(progress.correction_remediation_plan_report?.title === report.title, 'Progress dashboard data must embed D236 remediation report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d236 = tasks.find((task) => task.seq === 'D236');
const d237 = tasks.find((task) => task.seq === 'D237');
requireTrue(d236?.status === 'beta', 'Progress dashboard task D236 must be beta after remediation plans ship.');
requireTrue(d237?.status === 'next', 'Progress dashboard task D237 must become next after D236 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D237', 'Progress dashboard next queue must prioritize D237 after D236 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Correction remediation plan smoke check passed.');
}
