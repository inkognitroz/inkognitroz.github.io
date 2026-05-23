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
    fail(`Missing first-screen starter funnel continue file: ${relative(root, file)}`);
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
  'function runFirstScreenStarterFunnelAction(action)',
  'data-first-screen-starter-funnel',
  "record?.('first-screen-starter-funnel-action'",
  "kind:'install'",
  "kind:'live-proof'",
  "kind:'first-chat'",
  'retry?.click?.()',
  'primary-chat-link',
  'no_paid_routes_started:true'
]) {
  if (!hydration.includes(needle)) fail(`Deferred hydration missing first-screen starter continue evidence: ${needle}`);
}

for (const needle of [
  '.first-screen-starter-funnel button',
  '.first-screen-starter-funnel[data-state="ready"]'
]) {
  if (!css.includes(needle)) fail(`First-screen starter continue styling missing: ${needle}`);
}

for (const needle of [
  '[data-first-screen-starter-funnel]',
  'runFirstScreenStarterFunnelAction',
  'first-screen-starter-funnel-action',
  'no_paid_routes_started:true'
]) {
  if (!coverage.includes(needle)) fail(`UI action coverage missing first-screen starter continue evidence: ${needle}`);
}

const d191 = tasks.find((task) => task.seq === 'D191');
if (!d191 || d191.status !== 'beta') {
  fail('Progress dashboard task D191 must be beta after first-screen starter funnel continue ships.');
}

const d192 = tasks.find((task) => task.seq === 'D192');
if (!d192 || d192.status !== 'beta') {
  fail('Progress dashboard task D192 must stay beta after model-library starter focus ships.');
}

const d193 = tasks.find((task) => task.seq === 'D193');
if (!d193 || d193.status !== 'next') {
  fail('Progress dashboard must expose D193 as the next recommended starter install handoff work item.');
}

if (!process.exitCode) {
  console.log('First-screen starter funnel continue smoke check passed.');
}
