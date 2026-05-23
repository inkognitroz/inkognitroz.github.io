import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  deploy: join(publicDir, 'deploy-verification.json'),
  platform: join(publicDir, 'platform-status.json'),
  progress: join(publicDir, 'progress-dashboard.json')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing deploy verification file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function json(file) {
  try {
    return JSON.parse(text(file));
  } catch (error) {
    fail(`Invalid JSON in ${relative(root, file)}: ${error.message}`);
    return {};
  }
}

const deploy = json(files.deploy);
const platform = json(files.platform);
const progress = json(files.progress);

if (deploy.commit_short !== 'c140ad6') fail('Deploy verification must record latest verified commit c140ad6.');
if (!String(deploy.public_repo_rule || '').includes('No secrets')) fail('Deploy verification must state the public no-secrets boundary.');

const runs = Array.isArray(deploy.ci) ? deploy.ci : [];
for (const required of ['Static quality gates', 'MMIR public branding migration', 'Deploy GitHub Pages']) {
  const run = runs.find((item) => item.name === required);
  if (!run) fail(`Deploy verification missing CI run: ${required}`);
  if (run && (run.status !== 'completed' || run.conclusion !== 'success')) {
    fail(`Deploy verification CI run must be green: ${required}`);
  }
}

const checks = Array.isArray(deploy.public_url_checks) ? deploy.public_url_checks : [];
if (!checks.some((check) => check.source === 'external web fetch' && check.status === 'online' && /MMIR/.test(check.evidence || ''))) {
  fail('Deploy verification must record an external online mmir.ai content check.');
}
if (!checks.some((check) => check.source === 'local PowerShell network' && check.status === 'watch' && /newly-registered-domain/.test(check.evidence || ''))) {
  fail('Deploy verification must record the local URL-filter watch state without treating it as a code failure.');
}

if (platform.latest_verified_commit !== 'c140ad6') fail('Platform status must expose latest verified commit c140ad6.');
if (platform.deploy_verification !== './deploy-verification.json') fail('Platform status must link deploy-verification.json.');
const components = Array.isArray(platform.components) ? platform.components : [];
for (const id of ['latest-deploy-verification', 'public-url-health']) {
  if (!components.some((component) => component.id === id)) fail(`Platform status missing component ${id}.`);
}

const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d201 = tasks.find((task) => task.seq === 'D201');
if (!d201 || d201.status !== 'beta') {
  fail('Progress dashboard task D201 must be beta after deploy verification ships.');
}
const d202 = tasks.find((task) => task.seq === 'D202');
if (!d202 || d202.status !== 'beta') {
  fail('Progress dashboard task D202 must stay beta after first-screen visual QA ships.');
}
const d203 = tasks.find((task) => task.seq === 'D203');
if (!d203 || d203.status !== 'beta') {
  fail('Progress dashboard task D203 must stay beta after composer model picker ships.');
}
const d206 = tasks.find((task) => task.seq === 'D206');
if (!d206 || d206.status !== 'beta') {
  fail('Progress dashboard must expose D206 as beta after installer-to-live-model proof ships.');
}

if (!process.exitCode) {
  console.log('Deploy verification smoke check passed.');
}
