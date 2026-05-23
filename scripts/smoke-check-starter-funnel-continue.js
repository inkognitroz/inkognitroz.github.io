import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  progressData: join(publicDir, 'progress-dashboard.json'),
  progress: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  coverage: join(publicDir, 'ui-action-coverage.json')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing starter funnel continue file: ${relative(root, file)}`);
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
const coverage = text(files.coverage);
const tasks = Array.isArray(progressData.tasks) ? progressData.tasks : [];

for (const needle of [
  'progress-starter-continue',
  'data-starter-funnel-action',
  'function runStarterFunnelContinue()',
  'function bindStarterFunnel()',
  "record?.('starter-funnel-action'",
  "kind:'install'",
  "kind:'live-proof'",
  "kind:'first-chat'",
  'retry?.click?.()',
  'runFirstChatRecovery();',
  'no_paid_routes_started:true'
]) {
  if (!progress.includes(needle)) fail(`Progress Dashboard missing starter funnel continue evidence: ${needle}`);
}

for (const needle of [
  '#progress-starter-continue',
  'data-starter-funnel-action',
  'runStarterFunnelContinue',
  'starter-funnel-action',
  'no_paid_routes_started:true'
]) {
  if (!coverage.includes(needle)) fail(`UI action coverage missing starter funnel continue evidence: ${needle}`);
}

const d189 = tasks.find((task) => task.seq === 'D189');
if (!d189 || d189.status !== 'beta') {
  fail('Progress dashboard task D189 must be beta after starter funnel continue action ships.');
}

const d190 = tasks.find((task) => task.seq === 'D190');
if (!d190 || d190.status !== 'next') {
  fail('Progress dashboard must expose D190 as the next first-screen starter funnel work item.');
}

if (!process.exitCode) {
  console.log('Starter funnel continue smoke check passed.');
}
