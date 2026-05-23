import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'composer-action-bar-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  runtime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  runtimeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
  visibleAudit: join(publicDir, 'visible-control-audit.json'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function raw(file) {
  if (!existsSync(file)) {
    fail(`Missing D213 file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function text(file) {
  return raw(file).replace(/\s+/g, ' ');
}

function json(file) {
  try {
    return JSON.parse(raw(file));
  } catch (error) {
    fail(`Invalid JSON in ${relative(root, file)}: ${error.message}`);
    return {};
  }
}

function requireIncludes(file, needle, message) {
  if (!text(file).includes(String(needle).replace(/\s+/g, ' '))) fail(message);
}

const report = json(files.report);
if (report.title !== 'Composer Action Bar Usefulness Pass') {
  fail('D213 report must name the composer action bar usefulness pass.');
}
if (!String(report.public_repo_rule || '').includes('no prompts')) {
  fail('D213 report must preserve the public no prompt/no secret boundary.');
}

const controls = Array.isArray(report.controls) ? report.controls : [];
for (const id of ['composer-add-model', 'mode-buttons', 'runtime-model-chip', 'runtime-resource-chip', 'composer-voice-input', 'composer-action-feedback']) {
  const control = controls.find((item) => item.id === id);
  if (!control) {
    fail(`D213 report missing control: ${id}`);
    continue;
  }
  if (control.status !== 'ready' || control.no_paid_routes_started !== true) {
    fail(`D213 control ${id} must be ready and no-spend.`);
  }
  for (const evidence of control.evidence || []) {
    const target = evidence.startsWith('.') ? files.runtimeCss : files.runtime;
    requireIncludes(target, evidence, `D213 control ${id} missing evidence: ${evidence}`);
  }
}

for (const needle of report.mobile_contract || []) {
  requireIncludes(files.runtimeCss, needle, `D213 mobile/action-bar CSS missing: ${needle}`);
}

for (const needle of [
  'runtime-resource-chip',
  'afterComposerModeToggle',
  "openPanel('#node-dashboard')",
  "openPanel('#voice-controls')",
  'composer-action-feedback'
]) {
  requireIncludes(files.visibleAudit, needle, `D213 visible-control audit missing: ${needle}`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-composer-action-bar-usefulness.js', 'Quality workflow must run D213 composer action bar usefulness QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-composer-action-bar-usefulness.js', 'Pages workflow must run D213 composer action bar usefulness QA.');
requireIncludes(files.backlog, '| D214 |', 'Backlog must keep a next sequential work item after D213.');
requireIncludes(files.backlog, '| D215 |', 'Backlog must keep a next sequential work item after D214.');

const progress = json(files.progressData);
if (!progress.composer_action_bar_report || progress.composer_action_bar_report.title !== report.title) {
  fail('Progress dashboard data must embed the D213 composer action bar report.');
}
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d213 = tasks.find((task) => task.seq === 'D213');
const d214 = tasks.find((task) => task.seq === 'D214');
const d222 = tasks.find((task) => task.seq === 'D222');
if (!d213 || d213.status !== 'beta') {
  fail('Progress dashboard task D213 must be beta after composer action bar usefulness ships.');
}
if (!d214 || d214.status !== 'beta') {
  fail('Progress dashboard task D214 must be beta after composer action bar visual QA ships.');
}
if (!d222 || d222.status !== 'next') {
  fail('Progress dashboard task D222 must become the next work item after D221 ships.');
}
if (!Array.isArray(progress.next_queue) || progress.next_queue[0] !== 'D222') {
  fail('Progress dashboard next queue must prioritize D222 after D221 ships.');
}

if (!process.exitCode) {
  console.log('Composer action bar usefulness smoke check passed.');
}
