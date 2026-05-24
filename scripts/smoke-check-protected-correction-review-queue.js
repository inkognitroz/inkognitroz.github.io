import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'protected-correction-review-queue-report.json'),
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
    fail(`Missing D235 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Protected Correction Review Queue', 'D235 report must name the protected correction review queue.');
requireTrue(report.task === 'D235', 'D235 report must be tied to task D235.');
requireTrue(report.backend_commit === '8b61243', 'D235 report must reference the backend review queue commit.');
requireTrue(report.backend_route?.path === '/context/corrections/review', 'D235 report must document /context/corrections/review.');
requireTrue(report.frontend_module === './apps/mimir-chat-portal/context-correction-sync.js', 'D235 report must reference the sync/review module.');
requireTrue(report.local_storage?.review_state === 'mimir-context-correction-review-v1:{workspace}', 'D235 report must use a review-state localStorage key.');
requireTrue(String(report.public_repo_rule || '').includes('raw prompts'), 'D235 report must state raw prompt safety.');

for (const id of ['all', 'memory', 'knowledge', 'include-undone']) {
  const filter = (report.filters || []).find((item) => item.id === id);
  requireTrue(Boolean(filter?.selector), `D235 filter ${id} must have a selector.`);
}

for (const field of ['review_status', 'review_priority', 'review_reason', 'next_actions', 'source_ids', 'source_count', 'undone_at']) {
  requireTrue((report.safe_fields || []).includes(field), `D235 safe fields must include ${field}.`);
}

for (const field of ['prompt', 'raw_prompt', 'response', 'raw_response', 'messages', 'transcript', 'api_key', 'access_token', 'refresh_token', 'secret', 'document_text']) {
  requireTrue((report.blocked_fields || []).includes(field), `D235 blocked fields must include ${field}.`);
}

for (const id of ['load-review-queue', 'filter-memory', 'filter-knowledge', 'open-target']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D235 scenario ${id} must be ready.`);
  requireTrue(scenario?.no_paid_routes_started === true, `D235 scenario ${id} must not start paid routes.`);
  requireTrue(scenario?.provider_secrets_stored === false, `D235 scenario ${id} must store no provider secrets.`);
  requireTrue(scenario?.raw_prompt_stored === false, `D235 scenario ${id} must store no raw prompts.`);
  requireTrue(scenario?.raw_response_stored === false, `D235 scenario ${id} must store no raw responses.`);
}

const routeManifest = json(files.routeManifest);
const reviewRoute = (routeManifest.routes || []).find((route) => route.path === '/context/corrections/review');
requireTrue(reviewRoute?.auth === 'protected-backend-auth', 'Public API route manifest must register protected review queue auth.');
requireTrue(reviewRoute?.owner === 'managed-api', 'Public API route manifest must keep review queue owned by managed-api.');

for (const needle of [
  'REVIEW_PREFIX',
  'mimir-context-correction-review-v1:',
  'writeReviewState',
  'readReviewState',
  'loadReviewQueue',
  '/context/corrections/review?',
  'context-correction-review-panel',
  'data-correction-review="load"',
  'data-target-filter="memory"',
  'data-target-filter="knowledge"',
  'data-include-undone="true"',
  'public_frontend_authority:false',
  'no_paid_routes_started:true'
]) {
  requireIncludes(files.module, needle, `D235 sync/review module missing ${needle}.`);
}

for (const needle of [
  '.context-correction-review-panel',
  '.context-correction-review-filters',
  '.context-correction-review-summary',
  '.context-correction-review-list'
]) {
  requireIncludes(files.memoryCss, needle, `D235 review UI styling missing ${needle}.`);
}

for (const needle of [
  'renderProtectedCorrectionReviewQueueReport',
  'protected_correction_review_queue_report',
  'progress-protected-correction-review-queue'
]) {
  requireIncludes(files.progressDashboard, needle, `D235 Progress Dashboard missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-protected-correction-review-queue.js', 'Quality workflow must run D235 protected correction review queue QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-protected-correction-review-queue.js', 'Pages workflow must run D235 protected correction review queue QA.');
requireIncludes(files.backlog, '| D236 |', 'Backlog must add D236 after D235.');
requireIncludes(files.implementationLog, 'D235 is now beta', 'Implementation log must mark D235 beta.');
requireIncludes(files.implementationLog, 'D238 is now next', 'Implementation log must mark D238 next.');

const progress = json(files.progressData);
requireTrue(progress.protected_correction_review_queue_report?.title === report.title, 'Progress dashboard data must embed D235 review queue report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d235 = tasks.find((task) => task.seq === 'D235');
const d237 = tasks.find((task) => task.seq === 'D238');
requireTrue(d235?.status === 'beta', 'Progress dashboard task D235 must be beta after review queue ships.');
requireTrue(d237?.status === 'next', 'Progress dashboard task D238 must become next after D236 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D238', 'Progress dashboard next queue must prioritize D238 after D236 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Protected correction review queue smoke check passed.');
}
