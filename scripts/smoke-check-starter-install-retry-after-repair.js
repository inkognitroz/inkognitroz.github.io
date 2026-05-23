import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  progressData: join(publicDir, 'progress-dashboard.json'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  nodeDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.js'),
  hydration: join(publicDir, 'apps', 'mimir-chat-portal', 'first-screen-activation-hydration.js'),
  coverage: join(publicDir, 'ui-action-coverage.json')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing starter install retry-after-repair file: ${relative(root, file)}`);
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

const chatRuntime = text(files.chatRuntime);
const nodeDashboard = text(files.nodeDashboard);
const hydration = text(files.hydration);
const coverage = text(files.coverage);
const progressData = json(files.progressData);

for (const needle of [
  'function handleRepairResumeChecked(event)',
  "resume.action!=='starter-install-repair'",
  "resume.status!=='needs-model'",
  'Number(resume.retry_count||0)>=1',
  "status:'retrying'",
  'retry_count:Number(resume.retry_count||0)+1',
  'starter-install-retry',
  'Retrying preserved starter install once after repair',
  'runStarterHandoff({starter_id:next.starter_id'
]) {
  if (!chatRuntime.includes(needle)) fail(`Chat runtime missing starter retry-after-repair evidence: ${needle}`);
}

for (const needle of [
  "status==='retrying'",
  'Retrying starter install',
  '#mimir-chat-runtime'
]) {
  if (!nodeDashboard.includes(needle)) fail(`Node Dashboard missing retrying starter visibility evidence: ${needle}`);
  if (!hydration.includes(needle)) fail(`First-screen hydration missing retrying starter visibility evidence: ${needle}`);
}

for (const needle of [
  'starter-install-retry',
  'retrying',
  'pendingStarterHandoff',
  'no_paid_routes_started:true'
]) {
  if (!coverage.includes(needle)) fail(`UI action coverage missing starter retry-after-repair evidence: ${needle}`);
}

const tasks = Array.isArray(progressData.tasks) ? progressData.tasks : [];
const d195 = tasks.find((task) => task.seq === 'D195');
if (!d195 || d195.status !== 'beta') {
  fail('Progress dashboard task D195 must be beta after starter install retry-after-repair ships.');
}

const d196 = tasks.find((task) => task.seq === 'D196');
if (!d196 || d196.status !== 'beta') {
  fail('Progress dashboard task D196 must stay beta after starter retry success closure ships.');
}

const d197 = tasks.find((task) => task.seq === 'D197');
if (!d197 || d197.status !== 'beta') {
  fail('Progress dashboard task D197 must stay beta after first-answer send handoff ships.');
}

const d198 = tasks.find((task) => task.seq === 'D198');
if (!d198 || d198.status !== 'beta') {
  fail('Progress dashboard task D198 must stay beta after first-answer success next-step ships.');
}

const d199 = tasks.find((task) => task.seq === 'D199');
if (!d199 || d199.status !== 'beta') {
  fail('Progress dashboard task D199 must stay beta after visible-control reliability ships.');
}

const d200 = tasks.find((task) => task.seq === 'D200');
if (!d200 || d200.status !== 'beta') {
  fail('Progress dashboard task D200 must stay beta after critical-shell headroom recovery ships.');
}

const d201 = tasks.find((task) => task.seq === 'D201');
if (!d201 || d201.status !== 'beta') {
  fail('Progress dashboard task D201 must stay beta after deploy QA verification ships.');
}

const d202 = tasks.find((task) => task.seq === 'D202');
if (!d202 || d202.status !== 'next') {
  fail('Progress dashboard must expose D202 as the next visual QA work item.');
}

if (!process.exitCode) {
  console.log('Starter install retry-after-repair smoke check passed.');
}
