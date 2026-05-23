import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  progressData: join(publicDir, 'progress-dashboard.json'),
  progress: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  css: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.css'),
  coverage: join(publicDir, 'ui-action-coverage.json')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing starter funnel file: ${relative(root, file)}`);
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
const progress = text(files.progress);
const css = text(files.css);
const coverage = text(files.coverage);
const tasks = Array.isArray(progressData.tasks) ? progressData.tasks : [];

for (const needle of [
  'function starterFunnelState()',
  'function renderStarterFunnel()',
  'progress-starter-funnel',
  "event.type==='recommended-starter'",
  "event.type==='model-install'",
  "event.type==='live-proof'",
  "event.type==='first-chat-receipt'",
  'raw_prompt_stored:false, raw_response_stored:false, secrets_stored:false, no_paid_routes_started:true',
  'renderActivationTelemetry()+renderStarterFunnel()'
]) {
  if (!progress.includes(needle)) fail(`Progress Dashboard missing starter funnel evidence: ${needle}`);
}

for (const needle of [
  '.progress-starter-funnel',
  '.progress-starter-step',
  '.progress-starter-steps',
  '.progress-starter-step[data-state="ready"]'
]) {
  if (!css.includes(needle)) fail(`Starter funnel styling missing: ${needle}`);
}

for (const needle of [
  '#progress-starter-funnel',
  'starterFunnelState',
  'renderStarterFunnel',
  'Starter funnel',
  'no_paid_routes_started:true'
]) {
  if (!coverage.includes(needle)) fail(`UI action coverage missing starter funnel evidence: ${needle}`);
}

const d188 = tasks.find((task) => task.seq === 'D188');
if (!d188 || d188.status !== 'beta') {
  fail('Progress dashboard task D188 must be beta after starter-to-proof funnel ships.');
}

const d189 = tasks.find((task) => task.seq === 'D189');
if (!d189 || !['beta', 'next'].includes(d189.status)) {
  fail('Progress dashboard must expose D189 as beta or next after starter funnel ships.');
}

if (!process.exitCode) {
  console.log('Starter-to-proof funnel smoke check passed.');
}
