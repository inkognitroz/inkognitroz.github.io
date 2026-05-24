import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'correction-remediation-commit-policy-report.json'),
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
    fail(`Missing D239 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Correction Remediation Commit Policy', 'D239 report must name correction remediation commit policy.');
requireTrue(report.task === 'D239', 'D239 report must be tied to task D239.');
requireTrue(report.backend_commit === '038766f', 'D239 report must reference the backend commit policy commit.');
requireTrue(report.backend_route?.path === '/context/corrections/remediation-adapters/commit', 'D239 report must document the remediation commit route.');
requireTrue(report.local_storage?.commit_state === 'mimir-context-correction-remediation-commit-v1:{workspace}', 'D239 report must document commit state storage.');
requireTrue(report.commit_policy?.preview_required === true, 'D239 commit policy must require preview.');
requireTrue(report.commit_policy?.confirm_required === true, 'D239 commit policy must require confirmation.');
requireTrue(report.commit_policy?.commit_record_allowed === true, 'D239 commit policy must allow commit receipts.');
requireTrue(report.commit_policy?.source_mutation_allowed === false, 'D239 commit policy must block source mutation.');
requireTrue(report.commit_policy?.automatic_mutation_allowed === false, 'D239 commit policy must block automatic mutation.');
requireTrue(report.commit_policy?.public_frontend_authority === false, 'D239 commit policy must deny public frontend authority.');
requireTrue(report.commit_policy?.source_mutation_executed === false, 'D239 commit policy must keep source mutation false.');

for (const check of ['owner-scope', 'metadata-only', 'no-raw-or-secrets', 'no-automatic-mutation', 'rollback-captured']) {
  requireTrue((report.checks || []).includes(check), `D239 checks must include ${check}.`);
}

for (const field of ['prompt', 'raw_prompt', 'response', 'raw_response', 'messages', 'transcript', 'document_text', 'private_document', 'api_key', 'access_token', 'refresh_token', 'secret', 'signed_url']) {
  requireTrue((report.blocked_fields || []).includes(field), `D239 blocked fields must include ${field}.`);
}

for (const id of ['auto-preview-after-adapter', 'manual-preview-retry', 'record-commit-receipt', 'rollback-metadata-visible']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D239 scenario ${id} must be ready.`);
}

const routeManifest = json(files.routeManifest);
const commitRoute = (routeManifest.routes || []).find((route) => route.path === '/context/corrections/remediation-adapters/commit');
requireTrue(commitRoute?.auth === 'protected-backend-auth', 'Public API route manifest must register remediation commits as protected.');
requireTrue(commitRoute?.owner === 'managed-api', 'Public API route manifest must keep remediation commits owned by managed-api.');

for (const needle of [
  'COMMIT_PREFIX',
  'mimir-context-correction-remediation-commit-v1:',
  'writeCommitState',
  'readCommitState',
  'previewRemediationCommit',
  'commitRemediationAdapter',
  '/context/corrections/remediation-adapters/commit',
  'data-correction-commit="preview"',
  'data-correction-commit="commit"',
  'context-correction-commit-status',
  'context-correction-commit-checks',
  'mmir-context-correction-commit-updated',
  'source_mutation_allowed:false',
  'public_frontend_authority:false'
]) {
  requireIncludes(files.module, needle, `D239 module missing ${needle}.`);
}

for (const needle of [
  '.context-correction-commit-status',
  '.context-correction-commit-checks',
  '.context-correction-commit-changes',
  '[data-state="preview"]',
  '[data-state="committed"]',
  '[data-state="needs-preview"]'
]) {
  requireIncludes(files.memoryCss, needle, `D239 commit policy styling missing ${needle}.`);
}

for (const needle of [
  'renderCorrectionRemediationCommitPolicyReport',
  'correction_remediation_commit_policy_report',
  'progress-correction-remediation-commit-policy'
]) {
  requireIncludes(files.progressDashboard, needle, `D239 Progress Dashboard missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-correction-remediation-commit-policy.js', 'Quality workflow must run D239 correction remediation commit policy QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-correction-remediation-commit-policy.js', 'Pages workflow must run D239 correction remediation commit policy QA.');
requireIncludes(files.backlog, '| D244 |', 'Backlog must add D244 after D239.');
requireIncludes(files.implementationLog, 'D239 is now beta', 'Implementation log must mark D239 beta.');
requireIncludes(files.implementationLog, 'D244 is now next', 'Implementation log must mark D244 next.');

const progress = json(files.progressData);
requireTrue(progress.correction_remediation_commit_policy_report?.title === report.title, 'Progress dashboard data must embed D239 remediation commit policy report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d239 = tasks.find((task) => task.seq === 'D239');
const d240 = tasks.find((task) => task.seq === 'D244');
requireTrue(d239?.status === 'beta', 'Progress dashboard task D239 must be beta after commit policy ships.');
requireTrue(d240?.status === 'next', 'Progress dashboard task D244 must become next after D239 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D244', 'Progress dashboard next queue must prioritize D244 after D239 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Correction remediation commit policy smoke check passed.');
}
