import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  progressData: join(publicDir, 'progress-dashboard.json'),
  firstScreen: join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js'),
  telemetry: join(publicDir, 'apps', 'mimir-chat-portal', 'activation-telemetry.js'),
  progress: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  coverage: join(publicDir, 'ui-action-coverage.json')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing recommended starter telemetry file: ${relative(root, file)}`);
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
const telemetry = text(files.telemetry);
const progress = text(files.progress);
const coverage = text(files.coverage);
const tasks = Array.isArray(progressData.tasks) ? progressData.tasks : [];

for (const needle of [
  "MimirActivationTelemetry?.record?.('recommended-starter'",
  '{...copy.starter,free:true}',
  "kind:'install-starter'",
  "select.value='starter:'+starterId"
]) {
  if (!first.includes(needle)) fail(`First screen missing recommended starter telemetry evidence: ${needle}`);
}

for (const needle of [
  "if(type==='recommended-starter')",
  "route:'recommended starter'",
  "free:true",
  'no_paid_routes_started:true',
  'raw_prompt_stored:false',
  'raw_response_stored:false',
  'secrets_stored:false'
]) {
  if (!telemetry.includes(needle)) fail(`Activation telemetry missing recommended starter evidence: ${needle}`);
}

for (const needle of [
  "event.type==='recommended-starter'",
  'starterSelected',
  'starter selected',
  'Local only: raw_prompt_stored:false, raw_response_stored:false, secrets_stored:false.'
]) {
  if (!progress.includes(needle)) fail(`Progress dashboard missing recommended starter evidence: ${needle}`);
}

for (const needle of [
  'recommended-starter',
  'starterSelected',
  'raw_prompt_stored:false',
  'secrets_stored:false'
]) {
  if (!coverage.includes(needle)) fail(`UI action coverage missing recommended starter telemetry evidence: ${needle}`);
}

const d186 = tasks.find((task) => task.seq === 'D186');
if (!d186 || d186.status !== 'beta') {
  fail('Progress dashboard task D186 must be beta after recommended starter telemetry ships.');
}

const d187 = tasks.find((task) => task.seq === 'D187');
if (!d187 || d187.status !== 'next') {
  fail('Progress dashboard must expose D187 as the next activation hardening work item.');
}

if (!process.exitCode) {
  console.log('Recommended starter telemetry smoke check passed.');
}
