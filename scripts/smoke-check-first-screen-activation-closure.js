import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  progressData: join(publicDir, 'progress-dashboard.json'),
  firstScreen: join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js'),
  repairCss: join(publicDir, 'apps', 'mimir-chat-portal', 'repair-resume.css'),
  coverage: join(publicDir, 'ui-action-coverage.json')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing first-screen activation closure file: ${relative(root, file)}`);
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
const first = text(files.firstScreen);
const css = text(files.repairCss);
const coverage = text(files.coverage);
const tasks = Array.isArray(progressData.tasks) ? progressData.tasks : [];

for (const needle of [
  "const FIRST_CHAT_RECEIPT_PREFIX='mimir-first-chat-receipt-v1:'",
  'function firstScreenClosureState()',
  'function renderActivationClosureStrip()',
  'function handleActivationClosureAction(copy)',
  'activation-closure-strip',
  'data-activation-closure-action',
  'Create the free local profile',
  'Connect this device',
  "kind:'install-starter'",
  "title:'Install '+starter.label",
  'Get the first useful answer',
  'no_paid_routes_started:true / provider_secrets_stored:false',
  'window.MimirBackendProfiles?.ensureFreeLocalProfile?.()',
  'document.querySelector(\'#runtime-live-proof [data-proof-action="retry"]\')',
  'mmir-live-model-proof-updated',
  'mmir-first-chat-receipt-updated'
]) {
  if (!first.includes(needle)) fail(`First-screen activation closure missing evidence: ${needle}`);
}

for (const needle of [
  '.activation-closure-strip',
  '.activation-closure-strip button',
  '.activation-closure-strip[data-state="watch"]',
  '.activation-closure-strip[data-state="error"]'
]) {
  if (!css.includes(needle)) fail(`First-screen activation closure missing styling: ${needle}`);
}

for (const needle of [
  '#activation-closure-strip',
  '[data-activation-closure-action]',
  'renderActivationClosureStrip',
  'firstScreenClosureState',
  'provider_secrets_stored:false'
]) {
  if (!coverage.includes(needle)) fail(`UI action coverage missing first-screen closure evidence: ${needle}`);
}

const d184 = tasks.find((task) => task.seq === 'D184');
if (!d184 || d184.status !== 'beta') {
  fail('Progress dashboard task D184 must be beta after the first-screen closure strip ships.');
}

const d185 = tasks.find((task) => task.seq === 'D185');
if (!d185 || !['beta', 'next'].includes(d185.status)) {
  fail('Progress dashboard must expose D185 as beta or next after D184 ships.');
}

const d186 = tasks.find((task) => task.seq === 'D186');
if (!d186 || !['beta', 'next'].includes(d186.status)) {
  fail('Progress dashboard must expose D186 as beta or next after D185 ships.');
}

if (!process.exitCode) {
  console.log('First-screen activation closure smoke check passed.');
}
