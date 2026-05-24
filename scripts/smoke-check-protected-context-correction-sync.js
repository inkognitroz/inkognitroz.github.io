import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'protected-context-correction-sync-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
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
    fail(`Missing D233 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Protected Context Correction Sync Contract', 'D233 report must name the protected sync contract.');
requireTrue(report.task === 'D233', 'D233 report must be tied to task D233.');
requireTrue(report.backend_repository === 'mimir-backend-template', 'D233 report must reference the protected backend repo.');
requireTrue(report.backend_commit === 'df9fefb', 'D233 report must reference the pushed backend commit.');
requireTrue(String(report.public_repo_rule || '').includes('No raw prompts'), 'D233 report must state raw prompt/response safety.');
requireTrue(String(report.public_repo_rule || '').includes('paid route'), 'D233 report must state no paid route execution.');

for (const route of [
  ['GET', '/context/corrections'],
  ['POST', '/context/corrections'],
  ['POST', '/context/corrections/:id/undo']
]) {
  const match = (report.routes || []).find((item) => item.method === route[0] && item.path === route[1]);
  requireTrue(match?.auth === 'protected-backend-auth', `D233 route ${route.join(' ')} must be protected.`);
}

for (const field of ['workspace_id', 'target', 'action', 'source_ids', 'source_count', 'undo', 'suggestions', 'undone_at']) {
  requireTrue((report.metadata_contract || []).includes(field), `D233 metadata contract must include ${field}.`);
}

for (const check of ['Backend unit and contract tests', 'Managed API route manifest', 'JSON/OpenAPI validation', 'Backend secret scan']) {
  const item = (report.backend_checks || []).find((entry) => entry.name === check);
  requireTrue(item?.result === 'pass', `D233 backend check must pass: ${check}`);
}

for (const id of ['protected-route-manifest', 'metadata-only-sync', 'undo-state', 'portable-private-data']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D233 scenario ${id} must be ready.`);
  requireTrue(scenario?.no_paid_routes_started === true, `D233 scenario ${id} must not start paid routes.`);
  requireTrue(scenario?.provider_secrets_stored === false, `D233 scenario ${id} must store no provider secrets.`);
  requireTrue(scenario?.raw_prompt_stored === false, `D233 scenario ${id} must store no raw prompts.`);
  requireTrue(scenario?.raw_response_stored === false, `D233 scenario ${id} must store no raw responses.`);
}

for (const needle of [
  'protected_context_correction_sync_report',
  'readProtectedContextCorrectionSyncReport',
  'D235',
  'Managed backend now has protected /context/corrections'
]) {
  requireIncludes(join(root, 'scripts', 'build-progress-dashboard.js'), needle, `D233 dashboard build missing ${needle}.`);
}

for (const needle of [
  'renderProtectedContextCorrectionSyncReport',
  'progress-protected-context-correction-sync',
  'protected_context_correction_sync_report',
  'provider_secrets_stored',
  'raw_prompt_stored',
  'raw_response_stored'
]) {
  requireIncludes(files.progressDashboard, needle, `D233 Progress Dashboard missing protected sync rendering: ${needle}`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-protected-context-correction-sync.js', 'Quality workflow must run D233 protected correction sync QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-protected-context-correction-sync.js', 'Pages workflow must run D233 protected correction sync QA.');
requireIncludes(files.backlog, '| D235 |', 'Backlog must keep D235 as next sequential work after D234.');
requireIncludes(files.implementationLog, 'D233 is now beta', 'Implementation log must mark D233 beta.');
requireIncludes(files.implementationLog, 'D249 is now next', 'Implementation log must mark D249 next.');

const progress = json(files.progressData);
requireTrue(progress.protected_context_correction_sync_report?.title === report.title, 'Progress dashboard data must embed D233 protected sync report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d233 = tasks.find((task) => task.seq === 'D233');
const d237 = tasks.find((task) => task.seq === 'D249');
requireTrue(d233?.status === 'beta', 'Progress dashboard task D233 must be beta after backend contract ships.');
requireTrue(d237?.status === 'next', 'Progress dashboard task D249 must become next after D236 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D249', 'Progress dashboard next queue must prioritize D249 after D236 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Protected context correction sync smoke check passed.');
}
