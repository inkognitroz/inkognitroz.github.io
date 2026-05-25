import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const appDir = join(publicDir, 'apps', 'mimir-chat-portal');
const auditPath = join(publicDir, 'visible-control-audit.json');
const progressDataPath = join(publicDir, 'progress-dashboard.json');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing visible-control file: ${relative(root, file)}`);
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

function appFiles() {
  return readdirSync(appDir)
    .filter((name) => extname(name) === '.js')
    .map((name) => join(appDir, name));
}

const audit = json(auditPath);
const progressData = json(progressDataPath);
const source = [
  text(join(publicDir, 'mmir.html')),
  text(join(publicDir, 'ui-action-coverage.json')),
  text(join(publicDir, 'ai-model-catalog.json')),
  ...appFiles().map(text)
].join('\n');

const controls = Array.isArray(audit.controls) ? audit.controls : [];
if (controls.length < 10) fail('Visible-control audit must cover at least the main first-screen, chat, model, node and progress controls.');
if (!String(audit.public_repo_rule || '').includes('must not contain secrets')) fail('Visible-control audit must state the public repo secret boundary.');

for (const control of controls) {
  if (!control.id || !control.surface || !control.selector || !control.status || !control.result) {
    fail(`Visible-control audit item is incomplete: ${control.id || '<missing id>'}`);
  }
  if (!['wired', 'gated', 'disabled', 'planned'].includes(control.status)) {
    fail(`Visible-control audit item ${control.id} has unsupported status: ${control.status}`);
  }
  if (control.no_spend !== true) {
    fail(`Visible-control audit item ${control.id} must be no_spend:true until paid routes are approved.`);
  }
  const evidence = Array.isArray(control.source_evidence) ? control.source_evidence : [];
  if (!evidence.length) fail(`Visible-control audit item ${control.id} needs source evidence.`);
  for (const needle of evidence) {
    if (!source.includes(needle)) fail(`Visible-control audit evidence "${needle}" for ${control.id} is not present in source.`);
  }
}

for (const needle of [
  "openPanel('#model-library')",
  "document.getElementById('model-library')",
  'MimirChatRuntimeBridge?.openModelPicker',
  'openModelLibraryFallback',
  "newBtn.addEventListener('click',createProfile)",
  'firstAnswerNextStep',
  'proofRepairActions',
  'data-starter-action',
  'data-device-repair-action'
]) {
  if (!source.includes(needle)) fail(`D199 visible-control dead-end check missing source evidence: ${needle}`);
}

const tasks = Array.isArray(progressData.tasks) ? progressData.tasks : [];
const d199 = tasks.find((task) => task.seq === 'D199');
if (!d199 || d199.status !== 'beta') {
  fail('Progress dashboard task D199 must be beta after visible-control dead-end pass ships.');
}

if (!process.exitCode) {
  console.log('Visible-control dead-end smoke check passed.');
}
