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
    fail(`Missing starter install repair fallback file: ${relative(root, file)}`);
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
  "REPAIR_RESUME_PREFIX='mimir-repair-resume-v1:'",
  'function starterInstallRepairTarget(error)',
  'function starterInstallRepairFallback(starter,model,error)',
  "action:'starter-install-repair'",
  'starter_id:starter?.id',
  'mmir-starter-install-repair-opened',
  'starter-install-repair',
  'pendingStarterHandoff={starter_id:resume.starter_id',
  'MMIR opened repair and kept'
]) {
  if (!chatRuntime.includes(needle)) fail(`Chat runtime missing starter install repair fallback evidence: ${needle}`);
}

for (const needle of [
  "resume?.action==='starter-install-repair'",
  'Starter install needs repair',
  'mmir-starter-install-repair-opened'
]) {
  if (!nodeDashboard.includes(needle)) fail(`Node Dashboard missing starter install repair visibility evidence: ${needle}`);
}

for (const needle of [
  "resume?.action==='starter-install-repair'",
  'Starter install needs repair',
  'MMIR kept'
]) {
  if (!hydration.includes(needle)) fail(`First-screen hydration missing starter install repair banner evidence: ${needle}`);
}

for (const needle of [
  'starter-install-repair',
  'mmir-starter-install-repair-opened',
  'mimir-repair-resume-v1:',
  'pendingStarterHandoff',
  'no_paid_routes_started:true'
]) {
  if (!coverage.includes(needle)) fail(`UI action coverage missing starter install repair evidence: ${needle}`);
}

const tasks = Array.isArray(progressData.tasks) ? progressData.tasks : [];
const d194 = tasks.find((task) => task.seq === 'D194');
if (!d194 || d194.status !== 'beta') {
  fail('Progress dashboard task D194 must be beta after starter install repair fallback ships.');
}

const d195 = tasks.find((task) => task.seq === 'D195');
if (!d195 || d195.status !== 'beta') {
  fail('Progress dashboard task D195 must stay beta after starter install retry-after-repair ships.');
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
  console.log('Starter install repair fallback smoke check passed.');
}
