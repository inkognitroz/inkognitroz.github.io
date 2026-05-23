import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  runtime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  runtimeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
  picker: join(publicDir, 'apps', 'mimir-chat-portal', 'composer-model-picker.js'),
  pickerCss: join(publicDir, 'apps', 'mimir-chat-portal', 'composer-model-picker.css'),
  mmir: join(publicDir, 'mmir.html'),
  uiCoverage: join(publicDir, 'ui-action-coverage.json'),
  visibleAudit: join(publicDir, 'visible-control-audit.json'),
  progress: join(publicDir, 'progress-dashboard.json')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function read(file) {
  if (!existsSync(file)) {
    fail(`Missing D203 composer model picker file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function json(file) {
  try {
    return JSON.parse(read(file));
  } catch (error) {
    fail(`Invalid JSON in ${relative(root, file)}: ${error.message}`);
    return {};
  }
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

const runtime = read(files.runtime);
const picker = read(files.picker);
const css = `${read(files.runtimeCss)}\n${read(files.pickerCss)}`.replace(/\r\n/g, '\n');
const mmir = read(files.mmir);
const uiCoverage = read(files.uiCoverage);
const visibleAudit = read(files.visibleAudit);
const progress = json(files.progress);

for (const needle of [
  'id="composer-add-model"',
  'aria-controls="composer-model-picker"',
  'id="runtime-model-chip"',
  'Open model picker',
  'openComposerModelPicker',
  'MimirComposerModelPicker',
  'MimirLoadDeferred',
  'openPanel(\'#model-library\')'
]) {
  requireIncludes(runtime, needle, `D203 chat runtime model picker trigger evidence missing: ${needle}`);
}

for (const needle of [
  'window.MimirComposerModelPicker',
  'function render()',
  'function selectModel(value,action)',
  'function card(option)',
  'picker.id=\'composer-model-picker\'',
  'data-picker-model-value',
  'composer-model-picker',
  'Composer model picker selected',
  'source:\'composer-model-picker\'',
  'no_paid_routes_started:true',
  'mmir-runtime-starter-handoff'
]) {
  requireIncludes(picker, needle, `D203 composer model picker module evidence missing: ${needle}`);
}

for (const needle of [
  './apps/mimir-chat-portal/composer-model-picker.css',
  './apps/mimir-chat-portal/composer-model-picker.js'
]) {
  requireIncludes(mmir, needle, `D203 product page must load composer model picker asset: ${needle}`);
}

for (const needle of [
  '.composer-model-picker{',
  '.composer-model-picker[hidden]',
  '.composer-model-picker-head',
  '.composer-model-picker-grid',
  '.composer-model-card',
  '.composer-model-card.is-selected',
  '.composer-model-card[data-picker-state="ready"] button',
  '.composer-model-card[data-picker-state="install"] button',
  '.composer-chip-button',
  '@media (max-width: 720px)',
  '.composer-model-picker-grid{grid-template-columns:1fr;'
]) {
  requireIncludes(css, needle, `D203 composer model picker CSS evidence missing: ${needle}`);
}

for (const needle of [
  '#composer-model-picker',
  '#runtime-model-chip',
  '[data-picker-model-value]',
  'MimirComposerModelPicker',
  'selectModel(value,action)',
  'openComposerModelPicker'
]) {
  requireIncludes(uiCoverage, needle, `D203 UI action coverage must include: ${needle}`);
}

for (const needle of [
  '"id": "composer-model-picker"',
  'compact composer model picker',
  'data-picker-model-value',
  'no_paid_routes_started:true'
]) {
  requireIncludes(visibleAudit, needle, `D203 visible-control audit must include: ${needle}`);
}

const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d203 = tasks.find((task) => task.seq === 'D203');
if (!d203 || d203.status !== 'beta') {
  fail('Progress dashboard task D203 must be beta after composer model picker ships.');
}
const d206 = tasks.find((task) => task.seq === 'D206');
if (!d206 || d206.status !== 'beta') {
  fail('Progress dashboard task D206 must be beta after installer-to-live-model proof ships.');
}
const d207 = tasks.find((task) => task.seq === 'D207');
if (!d207 || d207.status !== 'beta') {
  fail('Progress dashboard task D207 must be beta after free live-route hardening ships.');
}
if (!Array.isArray(progress.next_queue) || progress.next_queue[0] !== 'D214') {
  fail('Progress dashboard next queue must prioritize D214 after D213 ships.');
}

if (!process.exitCode) {
  console.log('Composer model picker smoke check passed.');
}
