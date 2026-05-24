import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  progressData: join(publicDir, 'progress-dashboard.json'),
  mmir: join(publicDir, 'mmir.html'),
  firstScreen: join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js'),
  hydration: join(publicDir, 'apps', 'mimir-chat-portal', 'first-screen-activation-hydration.js'),
  coverage: join(publicDir, 'ui-action-coverage.json'),
  performance: join(root, 'scripts', 'smoke-check-performance-budget.js')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing critical shell file: ${relative(root, file)}`);
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

const progressData = json(files.progressData);
const mmir = text(files.mmir);
const first = text(files.firstScreen);
const hydration = text(files.hydration);
const coverage = text(files.coverage);
const tasks = Array.isArray(progressData.tasks) ? progressData.tasks : [];

if (!mmir.includes('"./apps/mimir-chat-portal/first-screen-activation-hydration.js"')) {
  fail('MMIR page must load first-screen activation hydration through the deferred queue.');
}

if (mmir.includes('<script src="./apps/mimir-chat-portal/first-screen-activation-hydration.js')) {
  fail('First-screen activation hydration must not be an initial blocking script.');
}

for (const forbidden of [
  'renderRepairResumeBanner',
  'renderActivationReplayBanner',
  'clearActivationReplay',
  'mimir-activation-replay-v1:',
  'repair-resume-action'
]) {
  if (first.includes(forbidden)) fail(`Critical first-screen script still contains deferred hydration evidence: ${forbidden}`);
}

for (const needle of [
  'MimirFirstScreenActivationHydration',
  'renderRepairResumeBanner',
  'renderActivationReplayBanner',
  'clearActivationReplay',
  'mimir-activation-replay-v1:',
  'repair-resume-action',
  'Demo replay active',
  'Repair resume',
  'no_paid_routes_started:true'
]) {
  if (!hydration.includes(needle)) fail(`Deferred hydration file missing first-screen QA evidence: ${needle}`);
}

for (const needle of [
  'initialJsByteBudget = 155000',
  'first-impression.js?v=20260523-mobile-buttons-v2',
  'Critical first-journey script must load immediately'
]) {
  if (!text(files.performance).includes(needle)) fail(`Performance budget guard missing evidence: ${needle}`);
}

for (const needle of [
  'first-screen-activation-hydration.js',
  'MimirFirstScreenActivationHydration',
  'renderActivationClosureStrip'
]) {
  if (!coverage.includes(needle)) fail(`UI action coverage missing critical-shell evidence: ${needle}`);
}

const d187 = tasks.find((task) => task.seq === 'D187');
if (!d187 || d187.status !== 'beta') {
  fail('Progress dashboard task D187 must be beta after critical-shell headroom ships.');
}

const d188 = tasks.find((task) => task.seq === 'D188');
if (!d188 || !['beta', 'next'].includes(d188.status)) {
  fail('Progress dashboard must expose D188 as beta or next after critical-shell headroom ships.');
}

if (!process.exitCode) {
  console.log('Critical shell headroom smoke check passed.');
}
