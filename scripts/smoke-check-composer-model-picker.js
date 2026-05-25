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
  if (!source.replace(/\s+/g, '').includes(String(needle).replace(/\s+/g, ''))) fail(message);
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
  'function starterByValue(value)',
  'function autoStartComposerRecommendation',
  'function openStarterInstaller(model,source)',
  'mmir-local-connector-install.html',
  'next_action:\'installer-download\'',
  'starter-install-installer-opened',
  'function card(option)',
  'function recommendationCards()',
  'function selectedValue()',
  'function searchText(option)',
  'function applySearchFilter(el)',
  'function wireSearch(el)',
  'function recommendedWebGpuIds()',
  'function webGpuStarterModels()',
  'data-picker-recommend',
  'data-picker-runtime',
  'data-picker-search',
  'data-picker-search-text',
  'data-picker-search-count',
  'data-picker-search-empty',
  'data-picker-selected',
  'aria-pressed',
  'aria-current',
  'Selected route',
  'data-picker-close',
  'Close model picker',
  'Search model routes',
  'No matching route',
  ".composer-model-card:not([hidden]) [data-picker-model-value]",
  "event.key!=='Escape'",
  'closePicker(true)',
  "event.target?.closest?.('#composer-add-model,#runtime-model-chip')",
  'picker.contains(event.target)',
  'promptEl()?.focus({preventScroll:true})',
  "action:'chat'",
  'primary-chat-link',
  'Chat now',
  'Browser LLM',
  'webllm-gemma3-1b',
  'webllm-llama32-1b',
  'webllm-phi35-mini',
  'Install local',
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
  './apps/mimir-chat-portal/composer-model-picker.js',
  'composer-model-picker.css?v=20260525-picker-search-v1',
  'composer-model-picker.js?v=20260525-picker-search-v1'
]) {
  requireIncludes(mmir, needle, `D203 product page must load composer model picker asset: ${needle}`);
}

for (const needle of [
  '.composer-model-picker{',
  '.composer-model-picker[hidden]',
  '.composer-model-picker-head',
  '.composer-model-picker-head-actions',
  '.composer-model-picker-head-actions button',
  '.composer-model-search',
  '.composer-model-search input',
  '.composer-model-card[hidden]',
  '.composer-model-empty',
  '.composer-model-recommendations',
  'repeat(auto-fit,minmax(150px,1fr))',
  '.composer-model-recommendations button[data-picker-state="ready"]',
  '.composer-model-recommendations button[data-picker-state="install"]',
  '.composer-model-recommendations button[data-picker-selected="true"]',
  '.composer-model-selected-badge',
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
  'data-picker-search',
  'data-picker-search-text',
  'applySearchFilter',
  'data-picker-selected',
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
  'data-picker-runtime',
  'data-picker-search',
  'data-picker-search-text',
  'applySearchFilter',
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
if (!Array.isArray(progress.next_queue) || progress.next_queue[0] !== 'D254') {
  fail('Progress dashboard next queue must prioritize D254 after D236 ships.');
}

if (!process.exitCode) {
  console.log('Composer model picker smoke check passed.');
}
