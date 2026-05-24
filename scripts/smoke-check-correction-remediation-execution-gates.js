import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'correction-remediation-execution-gates-report.json'),
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
    fail(`Missing D240 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Correction Remediation Execution Gates', 'D240 report must name correction remediation execution gates.');
requireTrue(report.task === 'D240', 'D240 report must be tied to task D240.');
requireTrue(report.backend_commit === '2f41c94', 'D240 report must reference the backend execution gates commit.');
requireTrue(report.backend_route?.path === '/context/corrections/remediation-executions/apply', 'D240 report must document the remediation execution route.');
requireTrue(report.local_storage?.execution_state === 'mimir-context-correction-remediation-execution-v1:{workspace}', 'D240 report must document execution state storage.');
requireTrue(report.execution_policy?.preview_required === true, 'D240 execution policy must require preview.');
requireTrue(report.execution_policy?.confirm_required === true, 'D240 execution policy must require confirmation.');
requireTrue(report.execution_policy?.execute_source_mutation_required === true, 'D240 execution policy must require explicit source mutation flag.');
requireTrue(report.execution_policy?.backend_only_execution === true, 'D240 execution policy must be backend-only.');
requireTrue(report.execution_policy?.source_mutation_allowed_for_memory_scope === true, 'D240 must allow supported memory source mutation.');
requireTrue(report.execution_policy?.knowledge_execution_supported === false, 'D240 must keep knowledge execution blocked.');
requireTrue(report.execution_policy?.public_frontend_authority === false, 'D240 execution policy must deny public frontend authority.');
requireTrue(report.execution_policy?.automatic_mutation_allowed === false, 'D240 execution policy must block automatic mutation.');

requireTrue(report.supported_execution?.adapter === 'memory-scope-adapter', 'D240 supported execution must be memory-scope-adapter.');
requireTrue((report.supported_execution?.mutates || []).includes('memory.scope'), 'D240 supported execution must mutate memory.scope.');
requireTrue((report.supported_execution?.captures || []).includes('before.scope'), 'D240 supported execution must capture before metadata.');
requireTrue((report.blocked_execution?.targets || []).includes('knowledge'), 'D240 blocked execution must include knowledge.');

for (const check of ['commit-receipt', 'backend-only', 'target-supported', 'rollback-before-after', 'no-paid-route']) {
  requireTrue((report.checks || []).includes(check), `D240 checks must include ${check}.`);
}

for (const id of ['auto-preview-after-commit', 'memory-scope-execution', 'knowledge-execution-blocked', 'rollback-metadata-captured']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D240 scenario ${id} must be ready.`);
}

const routeManifest = json(files.routeManifest);
const executionRoute = (routeManifest.routes || []).find((route) => route.path === '/context/corrections/remediation-executions/apply');
requireTrue(executionRoute?.auth === 'protected-backend-auth', 'Public API route manifest must register remediation executions as protected.');
requireTrue(executionRoute?.owner === 'managed-api', 'Public API route manifest must keep remediation executions owned by managed-api.');

for (const needle of [
  'EXECUTION_PREFIX',
  'mimir-context-correction-remediation-execution-v1:',
  'writeExecutionState',
  'readExecutionState',
  'previewRemediationExecution',
  'executeRemediationCommit',
  '/context/corrections/remediation-executions/apply',
  'data-correction-execution="preview"',
  'data-correction-execution="execute"',
  'context-correction-execution-status',
  'context-correction-execution-checks',
  'mmir-context-correction-execution-updated',
  'backend_only_execution:true',
  'public_frontend_authority:false'
]) {
  requireIncludes(files.module, needle, `D240 module missing ${needle}.`);
}

for (const needle of [
  '.context-correction-execution-status',
  '.context-correction-execution-checks',
  '.context-correction-execution-results',
  '[data-state="applied"]',
  '[data-state="blocked"]',
  '[data-state="needs-commit"]'
]) {
  requireIncludes(files.memoryCss, needle, `D240 execution gate styling missing ${needle}.`);
}

for (const needle of [
  'renderCorrectionRemediationExecutionGatesReport',
  'correction_remediation_execution_gates_report',
  'progress-correction-remediation-execution-gates'
]) {
  requireIncludes(files.progressDashboard, needle, `D240 Progress Dashboard missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-correction-remediation-execution-gates.js', 'Quality workflow must run D240 correction remediation execution gate QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-correction-remediation-execution-gates.js', 'Pages workflow must run D240 correction remediation execution gate QA.');
requireIncludes(files.backlog, '| D246 |', 'Backlog must add D246 after D240.');
requireIncludes(files.implementationLog, 'D240 is now beta', 'Implementation log must mark D240 beta.');
requireIncludes(files.implementationLog, 'D246 is now next', 'Implementation log must mark D246 next.');

const progress = json(files.progressData);
requireTrue(progress.correction_remediation_execution_gates_report?.title === report.title, 'Progress dashboard data must embed D240 remediation execution gates report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d240 = tasks.find((task) => task.seq === 'D240');
const d241 = tasks.find((task) => task.seq === 'D246');
requireTrue(d240?.status === 'beta', 'Progress dashboard task D240 must be beta after execution gates ship.');
requireTrue(d241?.status === 'next', 'Progress dashboard task D246 must become next after D240 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D246', 'Progress dashboard next queue must prioritize D246 after D240 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Correction remediation execution gates smoke check passed.');
}
