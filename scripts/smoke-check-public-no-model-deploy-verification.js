import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  manifest: join(publicDir, 'no-model-public-deploy-verification.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  deploy: join(publicDir, 'deploy-verification.json'),
  platform: join(publicDir, 'platform-status.json'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function raw(file) {
  if (!existsSync(file)) {
    fail(`Missing D211 file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function text(file) {
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
  if (!text(file).includes(String(needle).replace(/\s+/g, ' '))) fail(message);
}

const manifest = json(files.manifest);
if (manifest.scope !== 'D211 public no-model fixture deploy verification') {
  fail('D211 manifest must name the public no-model deploy verification scope.');
}
if (manifest.verified_commit_short !== 'c140ad6') {
  fail('D211 manifest must record the deployed D210 commit c140ad6.');
}
if (!String(manifest.public_repo_rule || '').includes('No secrets')) {
  fail('D211 manifest must preserve the public no-secrets boundary.');
}
if (manifest.result !== 'green_with_network_watch') {
  fail('D211 manifest must distinguish green deploy evidence from local network watch state.');
}

const ci = Array.isArray(manifest.ci) ? manifest.ci : [];
for (const required of ['Static quality gates', 'MMIR public branding migration', 'Deploy GitHub Pages']) {
  const run = ci.find((item) => item.name === required);
  if (!run) fail(`D211 manifest missing CI run: ${required}`);
  if (run && (run.status !== 'completed' || run.conclusion !== 'success')) {
    fail(`D211 manifest CI run must be green: ${required}`);
  }
}

const artifacts = Array.isArray(manifest.public_artifact_contract) ? manifest.public_artifact_contract : [];
for (const id of ['no-model-dead-end-report', 'no-model-visual-report', 'progress-dashboard', 'composer-route-floor', 'chat-no-model-fallback']) {
  const artifact = artifacts.find((item) => item.id === id);
  if (!artifact) {
    fail(`D211 manifest missing artifact contract: ${id}`);
    continue;
  }
  if (!String(artifact.public_url || '').startsWith('https://mmir.ai/')) {
    fail(`D211 artifact ${id} must expose the mmir.ai public URL.`);
  }
  if (!artifact.github_blob_sha || String(artifact.github_blob_sha).length < 20) {
    fail(`D211 artifact ${id} must record a GitHub blob sha from the deployed commit.`);
  }
  const sourcePath = resolve(root, String(artifact.source_path || ''));
  const source = text(sourcePath);
  for (const required of artifact.required_evidence || []) {
    if (!source.includes(String(required).replace(/\s+/g, ' '))) {
      fail(`D211 artifact ${id} missing required evidence: ${required}`);
    }
  }
}

const publicChecks = Array.isArray(manifest.public_url_checks) ? manifest.public_url_checks : [];
if (!publicChecks.some((check) => check.source === 'external web fetch' && check.status === 'online' && /Trusted AI Control Plane/.test(check.evidence || ''))) {
  fail('D211 manifest must include an external online root page check.');
}
if (!publicChecks.some((check) => check.source === 'local PowerShell network' && check.status === 'watch' && /newly-registered-domain/.test(check.evidence || ''))) {
  fail('D211 manifest must keep the local network URL-filter watch visible.');
}
if (text(files.manifest).match(/ghp_|sk_live_|sk_test_|OPENAI_API_KEY|ANTHROPIC_API_KEY|Bearer\s+[A-Za-z0-9._-]+/)) {
  fail('D211 manifest must not expose token-like or provider-key strings.');
}

requireIncludes(files.deploy, 'c140ad6', 'Deploy verification should record the D210 commit used by D211.');
requireIncludes(files.platform, 'no-model-deploy-verification', 'Platform status must surface the no-model deploy verification.');
requireIncludes(files.progressDashboard, 'renderNoModelPublicDeployVerification', 'Progress Dashboard must render the no-model public deploy verification.');
requireIncludes(files.qualityWorkflow, 'smoke-check-public-no-model-deploy-verification.js', 'Quality workflow must run D211 deploy verification.');
requireIncludes(files.pagesWorkflow, 'smoke-check-public-no-model-deploy-verification.js', 'Pages workflow must run D211 deploy verification.');
requireIncludes(files.backlog, '| D212 |', 'Backlog must keep a next sequential work item after D211.');
requireIncludes(files.backlog, '| D213 |', 'Backlog must keep a next sequential work item after D212.');
requireIncludes(files.backlog, '| D214 |', 'Backlog must keep a next sequential work item after D213.');
requireIncludes(files.backlog, '| D215 |', 'Backlog must keep a next sequential work item after D214.');

const progress = json(files.progressData);
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d211 = tasks.find((task) => task.seq === 'D211');
const d212 = tasks.find((task) => task.seq === 'D212');
const d213 = tasks.find((task) => task.seq === 'D213');
const d214 = tasks.find((task) => task.seq === 'D214');
const d237 = tasks.find((task) => task.seq === 'D247');
if (!d211 || d211.status !== 'beta') {
  fail('Progress dashboard task D211 must be beta after public deploy verification ships.');
}
if (!d212 || d212.status !== 'beta') {
  fail('Progress dashboard task D212 must be beta after first free chat response QA ships.');
}
if (!d213 || d213.status !== 'beta') {
  fail('Progress dashboard task D213 must be beta after composer action bar usefulness ships.');
}
if (!d214 || d214.status !== 'beta') {
  fail('Progress dashboard task D214 must be beta after composer action bar visual QA ships.');
}
if (!d237 || d237.status !== 'next') {
  fail('Progress dashboard task D247 must become the next work item after D236 ships.');
}
if (!Array.isArray(progress.next_queue) || progress.next_queue[0] !== 'D247') {
  fail('Progress dashboard next queue must prioritize D247 after D236 ships.');
}

if (!process.exitCode) {
  console.log('Public no-model deploy verification smoke check passed.');
}
