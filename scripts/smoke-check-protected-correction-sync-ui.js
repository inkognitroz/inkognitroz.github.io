import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'protected-correction-sync-ui-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  mmir: join(publicDir, 'mmir.html'),
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
    fail(`Missing D234 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Protected Correction Sync UI Handoff', 'D234 report must name protected correction sync UI handoff.');
requireTrue(report.task === 'D234', 'D234 report must be tied to task D234.');
requireTrue(report.module === './apps/mimir-chat-portal/context-correction-sync.js', 'D234 report must reference the new sync module.');
requireTrue(report.local_storage?.source === 'mimir-context-corrections-v1:{workspace}', 'D234 report must read local correction metadata.');
requireTrue(report.local_storage?.sync_state === 'mimir-context-correction-sync-v1:{workspace}', 'D234 report must store only sync state metadata.');
requireTrue(String(report.public_repo_rule || '').includes('raw prompts'), 'D234 report must state raw prompt safety.');

for (const id of ['memory', 'knowledge', 'progress']) {
  const surface = (report.ui_surfaces || []).find((item) => item.id === id);
  requireTrue(Boolean(surface?.anchor), `D234 surface ${id} must have an anchor.`);
}

for (const action of ['check-backend', 'sync-metadata', 'keep-local', 'backend-settings', 'session-token']) {
  const item = (report.actions || []).find((entry) => entry.id === action);
  requireTrue(Boolean(item?.selector), `D234 action ${action} must have a selector.`);
}

for (const field of ['id', 'workspace_id', 'target', 'action', 'source_ids', 'source_count', 'undo', 'suggestions', 'undone_at']) {
  requireTrue((report.payload_contract?.allowed_fields || []).includes(field), `D234 payload contract must allow ${field}.`);
}

for (const field of ['prompt', 'raw_prompt', 'response', 'raw_response', 'messages', 'transcript', 'api_key', 'access_token', 'refresh_token', 'secret']) {
  requireTrue((report.payload_contract?.blocked_fields || []).includes(field), `D234 payload contract must block ${field}.`);
}

for (const id of ['metadata-preview', 'capability-check', 'protected-post', 'defer-local']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D234 scenario ${id} must be ready.`);
  requireTrue(scenario?.no_paid_routes_started === true, `D234 scenario ${id} must not start paid routes.`);
  requireTrue(scenario?.provider_secrets_stored === false, `D234 scenario ${id} must store no provider secrets.`);
  requireTrue(scenario?.raw_prompt_stored === false, `D234 scenario ${id} must store no raw prompts.`);
  requireTrue(scenario?.raw_response_stored === false, `D234 scenario ${id} must store no raw responses.`);
}

requireIncludes(files.mmir, 'context-correction-sync.js', 'MMIR deferred script queue must load D234 correction sync module.');

for (const needle of [
  'MimirContextCorrectionSync',
  'syncPreview',
  'checkRoute',
  'syncNow',
  'deferSync',
  '/context/corrections',
  '/status',
  'context.corrections',
  'raw_prompt_stored:false',
  'raw_response_stored:false',
  'provider_secrets_stored:false',
  'mimir-context-correction-sync-v1:',
  'mmir-progress-dashboard-rendered',
  'data-correction-sync="sync"'
]) {
  requireIncludes(files.module, needle, `D234 sync module missing ${needle}.`);
}

for (const needle of [
  '.context-correction-sync-panel',
  '.context-correction-sync-preview',
  '.context-correction-sync-actions'
]) {
  requireIncludes(files.memoryCss, needle, `D234 sync UI styling missing ${needle}.`);
}

for (const needle of [
  'renderProtectedCorrectionSyncUiReport',
  'protected_correction_sync_ui_report',
  'progress-protected-correction-sync-ui',
  'mmir-progress-dashboard-rendered'
]) {
  requireIncludes(files.progressDashboard, needle, `D234 Progress Dashboard missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-protected-correction-sync-ui.js', 'Quality workflow must run D234 protected correction sync UI QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-protected-correction-sync-ui.js', 'Pages workflow must run D234 protected correction sync UI QA.');
requireIncludes(files.backlog, '| D235 |', 'Backlog must keep D235 as next sequential work after D234.');
requireIncludes(files.implementationLog, 'D234 is now beta', 'Implementation log must mark D234 beta.');
requireIncludes(files.implementationLog, 'D235 is now beta', 'Implementation log must mark D235 beta after review queue ships.');
requireIncludes(files.implementationLog, 'D250 is now next', 'Implementation log must mark D236 next after D235 ships.');

const progress = json(files.progressData);
requireTrue(progress.protected_correction_sync_ui_report?.title === report.title, 'Progress dashboard data must embed D234 sync UI report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d234 = tasks.find((task) => task.seq === 'D234');
const d235 = tasks.find((task) => task.seq === 'D235');
const d237 = tasks.find((task) => task.seq === 'D250');
requireTrue(d234?.status === 'beta', 'Progress dashboard task D234 must be beta after UI handoff ships.');
requireTrue(d235?.status === 'beta', 'Progress dashboard task D235 must be beta after review queue ships.');
requireTrue(d237?.status === 'next', 'Progress dashboard task D250 must become next after D236 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D250', 'Progress dashboard next queue must prioritize D250 after D236 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Protected correction sync UI smoke check passed.');
}
