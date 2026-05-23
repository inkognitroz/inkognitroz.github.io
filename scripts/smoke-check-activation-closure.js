import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  progressData: join(publicDir, 'progress-dashboard.json'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  progressCss: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.css'),
  coverage: join(publicDir, 'ui-action-coverage.json')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing activation closure file: ${relative(root, file)}`);
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
const progress = text(files.progressDashboard);
const css = text(files.progressCss);
const coverage = text(files.coverage);
const tasks = Array.isArray(progressData.tasks) ? progressData.tasks : [];

for (const needle of [
  "const PROFILE_KEY='mimir-chat-backend-profiles'",
  "const ACTIVE_KEY='mimir-chat-active-backend'",
  'function liveGapItems()',
  'function renderLiveGapChecklist()',
  'function bindLiveGapChecklist()',
  'progress-live-gap-checklist',
  'data-live-gap-action',
  'no_paid_routes_started:true / provider_secrets_stored:false',
  'window.MimirBackendProfiles?.ensureFreeLocalProfile?.()',
  'document.querySelector(\'#runtime-live-proof [data-proof-action=\"retry\"]\')',
  'runFirstChatRecovery();',
  'This checklist reads local MMIR state and DOM proof only'
]) {
  if (!progress.includes(needle)) fail(`Activation closure checklist missing source evidence: ${needle}`);
}

for (const id of ['browser-guide', 'local-profile', 'local-node', 'live-proof', 'first-chat']) {
  if (!progress.includes(`id:'${id}'`)) {
    fail(`Activation closure checklist missing gap id: ${id}`);
  }
}

for (const needle of [
  '.progress-live-gap-checklist',
  '.progress-live-gap-grid',
  '.progress-live-gap-item',
  '.progress-live-gap-item[data-state="ready"]',
  '.progress-live-gap-item[data-state="error"]',
  '.progress-live-gap-item button'
]) {
  if (!css.includes(needle)) fail(`Activation closure checklist missing styling: ${needle}`);
}

for (const needle of [
  '#progress-live-gap-checklist',
  '[data-live-gap-action]',
  'renderLiveGapChecklist',
  'liveGapItems',
  'bindLiveGapChecklist',
  'provider_secrets_stored:false'
]) {
  if (!coverage.includes(needle)) fail(`UI action coverage missing activation closure evidence: ${needle}`);
}

const d183 = tasks.find((task) => task.seq === 'D183');
if (!d183 || d183.status !== 'beta') {
  fail('Progress dashboard task D183 must be beta after the live gap checklist ships.');
}

const d184 = tasks.find((task) => task.seq === 'D184');
if (!d184 || !['beta', 'next'].includes(d184.status)) {
  fail('Progress dashboard must expose D184 as beta or next after D183 ships.');
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
  console.log('Activation closure smoke check passed.');
}
