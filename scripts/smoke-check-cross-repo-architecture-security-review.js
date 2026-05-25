import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'cross-repo-architecture-security-review-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  reviewDoc: join(root, 'docs', 'MMIR_CROSS_REPO_REVIEW_D252.md'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  buildDashboard: join(root, 'scripts', 'build-progress-dashboard.js'),
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
    fail(`Missing D252 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Cross-Repo Architecture and Security Review Gate', 'D252 report must name cross-repo review gate.');
requireTrue(report.task === 'D252', 'D252 report must be tied to task D252.');
requireTrue(report.status === 'beta', 'D252 report must be beta.');
requireTrue(report.public_repo_rule?.includes('no secrets'), 'D252 report must document no-secret public rule.');
requireTrue(report.no_spend?.paid_services_used === false, 'D252 must not use paid services.');
requireTrue(report.no_spend?.requires_user_money === false, 'D252 must not require user money.');

for (const repoName of ['inkognitroz.github.io', 'mmir-local-node', 'mimir-backend-template', 'iac-autoprov', 'iac-autoprov-aws']) {
  const repo = (report.reviewed_repos || []).find((item) => item.name === repoName);
  requireTrue(repo?.status === 'pass', `D252 reviewed repo ${repoName} must pass.`);
  requireTrue(Boolean(repo?.commit), `D252 reviewed repo ${repoName} must include commit evidence.`);
}

for (const evidenceId of [
  'public-smoke-suite',
  'public-js-syntax',
  'public-safety-audit',
  'public-route-manifest',
  'local-node-tests',
  'local-node-release',
  'local-node-conformance',
  'backend-tests',
  'backend-route-contract',
  'backend-node-fixtures',
  'backend-secrets',
  'oci-proxy-check',
  'aws-proxy-check',
  'github-actions-d251',
  'github-actions-latest'
]) {
  const evidence = (report.evidence || []).find((item) => item.id === evidenceId);
  requireTrue(evidence?.status === 'pass', `D252 evidence ${evidenceId} must pass.`);
}

const publicSmoke = (report.evidence || []).find((item) => item.id === 'public-smoke-suite');
requireTrue(String(publicSmoke?.result || '').includes('97'), 'D252 public smoke evidence must include 97 workflow smoke scripts.');
const backendTests = (report.evidence || []).find((item) => item.id === 'backend-tests');
requireTrue(String(backendTests?.result || '').includes('211'), 'D252 backend evidence must include 211 passing tests.');
const localNodeTests = (report.evidence || []).find((item) => item.id === 'local-node-tests');
requireTrue(String(localNodeTests?.result || '').includes('66'), 'D252 local-node evidence must include 66 passing tests.');
const publicRoutes = (report.evidence || []).find((item) => item.id === 'public-route-manifest');
requireTrue(String(publicRoutes?.result || '').includes('74'), 'D252 public route evidence must include 74 route entries.');
const backendRoutes = (report.evidence || []).find((item) => item.id === 'backend-route-contract');
requireTrue(String(backendRoutes?.result || '').includes('127'), 'D252 backend route evidence must include 127 route entries.');

for (const area of ['Public/private boundary', 'Zero-trust workflow gates', 'No-spend defaults', 'Route ownership', 'Browser visual QA']) {
  const item = (report.architecture_scorecard || []).find((candidate) => candidate.area === area);
  requireTrue(Boolean(item?.status && item?.finding && item?.next_action), `D252 scorecard must include ${area}.`);
}

for (const findingId of ['CR-001', 'CR-002', 'CR-003', 'CR-004']) {
  const finding = (report.code_review_findings || []).find((item) => item.id === findingId);
  requireTrue(Boolean(finding?.severity && finding?.status && finding?.next_action), `D252 code review finding ${findingId} must be complete.`);
}

requireTrue(report.security_review?.status === 'pass', 'D252 security review must pass.');
requireTrue(report.ux_review?.status === 'watch', 'D252 UX review must be watch, not falsely complete.');
requireTrue(report.next?.task === 'D254', 'D252 report must hand off to D254 after the fresh D302 review refresh.');

for (const needle of [
  'renderCrossRepoArchitectureSecurityReviewReport',
  'cross_repo_architecture_security_review_report',
  'progress-cross-repo-architecture-security-review',
  'Code + architecture review'
]) {
  requireIncludes(files.progressDashboard, needle, `D252 Progress Dashboard missing ${needle}.`);
}

for (const needle of [
  'crossRepoArchitectureSecurityReviewReportPath',
  'readCrossRepoArchitectureSecurityReviewReport',
  "['D252', { status: 'beta'",
  "['D254', { status: 'next'",
  "['D284', { status: 'beta'"
]) {
  requireIncludes(files.buildDashboard, needle, `D252 dashboard build missing ${needle}.`);
}

for (const needle of [
  'MMIR Cross-Repo Review Gate D252',
  'D302',
  '66 tests',
  '211 tests',
  '11/11 checks',
  'AWS proxy',
  'CR-003',
  'D254'
]) {
  requireIncludes(files.reviewDoc, needle, `D252 review doc missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-cross-repo-architecture-security-review.js', 'Quality workflow must run D252 cross-repo review QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-cross-repo-architecture-security-review.js', 'Pages workflow must run D252 cross-repo review QA.');
requireIncludes(files.backlog, '| D253 |', 'Backlog must add D253 after D252.');
requireIncludes(files.backlog, '| D284 |', 'Backlog must add D284 fresh full-project review snapshot.');
requireIncludes(files.implementationLog, 'D252 is now beta', 'Implementation log must mark D252 beta.');
requireIncludes(files.implementationLog, 'D254 is now next', 'Implementation log must mark D254 next.');
requireIncludes(files.implementationLog, 'D284 is now beta', 'Implementation log must mark D284 beta.');

const progress = json(files.progressData);
requireTrue(progress.cross_repo_architecture_security_review_report?.title === report.title, 'Progress dashboard data must embed D252 review report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d252 = tasks.find((task) => task.seq === 'D252');
const d254 = tasks.find((task) => task.seq === 'D254');
const d284 = tasks.find((task) => task.seq === 'D284');
requireTrue(d252?.status === 'beta', 'Progress dashboard task D252 must be beta after review gate ships.');
requireTrue(d254?.status === 'next', 'Progress dashboard task D254 must become next after D252 ships.');
requireTrue(d284?.status === 'beta', 'Progress dashboard task D284 must be beta after fresh full-project review refresh.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D254', 'Progress dashboard next queue must prioritize D254 after D252 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Cross-repo architecture and security review smoke check passed.');
}
