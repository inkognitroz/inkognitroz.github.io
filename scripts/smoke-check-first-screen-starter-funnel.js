import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  progressData: join(publicDir, 'progress-dashboard.json'),
  hydration: join(publicDir, 'apps', 'mimir-chat-portal', 'first-screen-activation-hydration.js'),
  css: join(publicDir, 'apps', 'mimir-chat-portal', 'repair-resume.css'),
  coverage: join(publicDir, 'ui-action-coverage.json')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing first-screen starter funnel file: ${relative(root, file)}`);
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
const hydration = text(files.hydration);
const css = text(files.css);
const coverage = text(files.coverage);
const tasks = Array.isArray(progressData.tasks) ? progressData.tasks : [];

for (const needle of [
  "const ACTIVATION_EVENTS_PREFIX='mimir-activation-events-v1:'",
  'function firstScreenStarterFunnelState()',
  'function renderFirstScreenStarterFunnel()',
  'first-screen-starter-funnel',
  'data-first-screen-starter-funnel',
  'Starter progress',
  'local_only:true / no_paid_routes_started:true / raw_prompt_stored:false / secrets_stored:false',
  'mmir-activation-telemetry-updated',
  'MimirFirstScreenActivationHydration={renderRepairResumeBanner,renderActivationReplayBanner,renderFirstScreenStarterFunnel,clearActivationReplay}'
]) {
  if (!hydration.includes(needle)) fail(`Deferred first-screen hydration missing starter funnel evidence: ${needle}`);
}

for (const needle of [
  '.first-screen-starter-funnel',
  '.first-screen-starter-funnel[hidden]',
  '.first-screen-starter-funnel[data-state="ready"]',
  '.first-screen-starter-funnel a'
]) {
  if (!css.includes(needle)) fail(`First-screen starter funnel styling missing: ${needle}`);
}

for (const needle of [
  '#first-screen-starter-funnel',
  '[data-first-screen-starter-funnel]',
  'renderFirstScreenStarterFunnel',
  'Starter progress',
  'no_paid_routes_started:true'
]) {
  if (!coverage.includes(needle)) fail(`UI action coverage missing first-screen starter funnel evidence: ${needle}`);
}

const d190 = tasks.find((task) => task.seq === 'D190');
if (!d190 || d190.status !== 'beta') {
  fail('Progress dashboard task D190 must be beta after first-screen starter funnel ships.');
}

const d191 = tasks.find((task) => task.seq === 'D191');
if (!d191 || d191.status !== 'next') {
  fail('Progress dashboard must expose D191 as the next first-screen starter funnel action work item.');
}

if (!process.exitCode) {
  console.log('First-screen starter funnel smoke check passed.');
}
