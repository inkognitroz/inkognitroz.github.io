import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'correction-remediation-adapters-report.json'),
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
    fail(`Missing D238 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Correction Remediation Adapters', 'D238 report must name correction remediation adapters.');
requireTrue(report.task === 'D238', 'D238 report must be tied to task D238.');
requireTrue(report.backend_commit === '8cff2e0', 'D238 report must reference the backend adapter commit.');
requireTrue(report.backend_route?.path === '/context/corrections/remediation-adapters/prepare', 'D238 report must document the remediation adapter route.');
requireTrue(report.local_storage?.adapter_state === 'mimir-context-correction-remediation-adapter-v1:{workspace}', 'D238 report must document adapter state storage.');
requireTrue(report.adapter_policy?.execution_allowed === false, 'D238 adapter policy must block execution.');
requireTrue(report.adapter_policy?.automatic_mutation_allowed === false, 'D238 adapter policy must block automatic mutation.');
requireTrue(report.adapter_policy?.source_mutation_executed === false, 'D238 adapter policy must keep source mutation false.');
requireTrue(report.adapter_policy?.public_frontend_authority === false, 'D238 adapter policy must deny public frontend authority.');

for (const type of ['memory-scope-adapter', 'knowledge-source-review-adapter', 'knowledge-collection-split-adapter', 'context-policy-adapter']) {
  requireTrue((report.adapter_types || []).includes(type), `D238 adapter types must include ${type}.`);
}

for (const field of ['prompt', 'raw_prompt', 'response', 'raw_response', 'messages', 'transcript', 'api_key', 'access_token', 'refresh_token', 'secret', 'document_text']) {
  requireTrue((report.blocked_fields || []).includes(field), `D238 blocked fields must include ${field}.`);
}

for (const id of ['auto-prepare-after-apply', 'manual-prepare-retry', 'memory-repair-draft', 'knowledge-repair-draft']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D238 scenario ${id} must be ready.`);
}

const routeManifest = json(files.routeManifest);
const adapterRoute = (routeManifest.routes || []).find((route) => route.path === '/context/corrections/remediation-adapters/prepare');
requireTrue(adapterRoute?.auth === 'protected-backend-auth', 'Public API route manifest must register remediation adapters as protected.');
requireTrue(adapterRoute?.owner === 'managed-api', 'Public API route manifest must keep remediation adapters owned by managed-api.');

for (const needle of [
  'ADAPTER_PREFIX',
  'mimir-context-correction-remediation-adapter-v1:',
  'writeAdapterState',
  'readAdapterState',
  'prepareRemediationAdapter',
  '/context/corrections/remediation-adapters/prepare',
  'data-correction-adapter="prepare"',
  'context-correction-adapter-status',
  'context-correction-adapter-changes',
  'mmir-context-correction-adapter-updated',
  'source_mutation_executed:false',
  'public_frontend_authority:false'
]) {
  requireIncludes(files.module, needle, `D238 module missing ${needle}.`);
}

for (const needle of [
  '.context-correction-adapter-status',
  '.context-correction-adapter-changes',
  '[data-state="draft"]',
  '[data-state="needs-application"]'
]) {
  requireIncludes(files.memoryCss, needle, `D238 remediation adapter styling missing ${needle}.`);
}

for (const needle of [
  'renderCorrectionRemediationAdaptersReport',
  'correction_remediation_adapters_report',
  'progress-correction-remediation-adapters'
]) {
  requireIncludes(files.progressDashboard, needle, `D238 Progress Dashboard missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-correction-remediation-adapters.js', 'Quality workflow must run D238 correction remediation adapter QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-correction-remediation-adapters.js', 'Pages workflow must run D238 correction remediation adapter QA.');
requireIncludes(files.backlog, '| D239 |', 'Backlog must add D239 after D238.');
requireIncludes(files.implementationLog, 'D238 is now beta', 'Implementation log must mark D238 beta.');
requireIncludes(files.implementationLog, 'D239 is now next', 'Implementation log must mark D239 next.');

const progress = json(files.progressData);
requireTrue(progress.correction_remediation_adapters_report?.title === report.title, 'Progress dashboard data must embed D238 remediation adapters report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d238 = tasks.find((task) => task.seq === 'D238');
const d239 = tasks.find((task) => task.seq === 'D239');
requireTrue(d238?.status === 'beta', 'Progress dashboard task D238 must be beta after adapters ship.');
requireTrue(d239?.status === 'next', 'Progress dashboard task D239 must become next after D238 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D239', 'Progress dashboard next queue must prioritize D239 after D238 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Correction remediation adapters smoke check passed.');
}
