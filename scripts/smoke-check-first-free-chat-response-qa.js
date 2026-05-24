import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'first-free-chat-response-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  noModelReport: join(publicDir, 'no-model-dead-end-report.json'),
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
    fail(`Missing D212 file: ${relative(root, file)}`);
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
if (report.title !== 'First Free Chat Response QA') {
  fail('D212 report must name the first free chat response QA.');
}
if (!String(report.public_repo_rule || '').includes('no prompts')) {
  fail('D212 report must preserve the no prompt/no secret public boundary.');
}

const scenarios = Array.isArray(report.scenarios) ? report.scenarios : [];
for (const id of ['empty-first-prompt', 'connect-local-model', 'choose-free-model', 'business-growth']) {
  const scenario = scenarios.find((item) => item.id === id);
  if (!scenario) {
    fail(`D212 report missing scenario: ${id}`);
    continue;
  }
  if (scenario.status !== 'ready' || scenario.no_paid_routes_started !== true) {
    fail(`D212 scenario ${id} must be ready and no-spend.`);
  }
  if (!scenario.next_action) fail(`D212 scenario ${id} must expose one next action.`);
  for (const evidence of scenario.expected_response_evidence || []) {
    requireIncludes(files.chatRuntime, evidence, `D212 chat runtime missing response evidence: ${evidence}`);
  }
}

for (const evidence of [
  'guideResponseText',
  'Primary next action',
  'No paid route starts here',
  'Choose + Add model to activate a real model.',
  "starter.runtime==='browser-guide'?guideResponse(prompt,starter):installResponse(starter)"
]) {
  requireIncludes(files.chatRuntime, evidence, `D212 chat runtime must keep first free response behavior: ${evidence}`);
}

requireIncludes(files.noModelReport, 'Use free browser guide', 'D212 must build on the no-model free browser guide route.');
requireIncludes(files.progressDashboard, 'renderFirstFreeChatResponseReport', 'Progress Dashboard must render D212 first free chat response evidence.');
requireIncludes(files.qualityWorkflow, 'smoke-check-first-free-chat-response-qa.js', 'Quality workflow must run D212 first free chat response QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-first-free-chat-response-qa.js', 'Pages workflow must run D212 first free chat response QA.');
requireIncludes(files.backlog, '| D213 |', 'Backlog must keep a next sequential work item after D212.');
requireIncludes(files.backlog, '| D214 |', 'Backlog must keep a next sequential work item after D213.');
requireIncludes(files.backlog, '| D215 |', 'Backlog must keep a next sequential work item after D214.');

const progress = json(files.progressData);
if (!progress.first_free_chat_response_report || progress.first_free_chat_response_report.title !== report.title) {
  fail('Progress dashboard data must embed the D212 first free chat response report.');
}
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d212 = tasks.find((task) => task.seq === 'D212');
const d213 = tasks.find((task) => task.seq === 'D213');
const d214 = tasks.find((task) => task.seq === 'D214');
const d237 = tasks.find((task) => task.seq === 'D239');
if (!d212 || d212.status !== 'beta') {
  fail('Progress dashboard task D212 must be beta after first free chat response QA ships.');
}
if (!d213 || d213.status !== 'beta') {
  fail('Progress dashboard task D213 must be beta after composer action bar usefulness ships.');
}
if (!d214 || d214.status !== 'beta') {
  fail('Progress dashboard task D214 must be beta after composer action bar visual QA ships.');
}
if (!d237 || d237.status !== 'next') {
  fail('Progress dashboard task D239 must become the next work item after D236 ships.');
}
if (!Array.isArray(progress.next_queue) || progress.next_queue[0] !== 'D239') {
  fail('Progress dashboard next queue must prioritize D239 after D236 ships.');
}

if (!process.exitCode) {
  console.log('First free chat response QA smoke check passed.');
}
