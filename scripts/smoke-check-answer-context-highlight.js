import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'answer-context-highlight-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  answerReceipts: join(publicDir, 'apps', 'mimir-chat-portal', 'answer-context-receipts.js'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md')
};

const failures = [];

function fail(message) {
  failures.push(message);
  console.error(message);
}

function requireTrue(condition, message) {
  if (!condition) fail(message);
}

function raw(file) {
  if (!existsSync(file)) {
    fail(`Missing D225 file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function compact(file) {
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
  if (!compact(file).includes(String(needle).replace(/\s+/g, ' '))) fail(message);
}

const report = json(files.report);
requireTrue(report.title === 'Answer Context Highlight QA', 'D225 report must name answer context highlight QA.');
requireTrue(String(report.public_repo_rule || '').includes('no prompts'), 'D225 report must preserve prompt-free highlight boundary.');
for (const target of ['#memory-panel', '#knowledge-panel', '#model-library', '#privacy-controls-panel']) {
  const scenario = (report.scenarios || []).find((item) => item.target === target);
  requireTrue(scenario?.status === 'ready', `D225 scenario ${target} must be ready.`);
  requireTrue(scenario?.no_paid_routes_started === true, `D225 scenario ${target} must not start paid routes.`);
}

for (const needle of [
  'HIGHLIGHT_PREFIX',
  'mimir-answer-context-highlight-v1:',
  'function writeHighlight',
  'function renderHighlight',
  'runtime-answer-context-highlight',
  'mmir-answer-context-highlight-updated',
  'raw_prompt_stored_in_highlight:false',
  'raw_response_stored_in_highlight:false',
  'Receipt context: model'
]) {
  requireIncludes(files.answerReceipts, needle, `D225 answer receipt renderer missing highlight behavior: ${needle}`);
}

requireIncludes(files.progressDashboard, 'renderAnswerContextHighlightReport', 'Progress Dashboard must render D225 highlight evidence.');
requireIncludes(files.qualityWorkflow, 'smoke-check-answer-context-highlight.js', 'Quality workflow must run D225 answer highlight QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-answer-context-highlight.js', 'Pages workflow must run D225 answer highlight QA.');
requireIncludes(files.backlog, '| D226 |', 'Backlog must keep a next sequential work item after D225.');

const progress = json(files.progressData);
requireTrue(progress.answer_context_highlight_report?.title === report.title, 'Progress dashboard data must embed D225 highlight report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d225 = tasks.find((task) => task.seq === 'D225');
const d237 = tasks.find((task) => task.seq === 'D238');
requireTrue(d225?.status === 'beta', 'Progress dashboard task D225 must be beta after highlights ship.');
requireTrue(d237?.status === 'next', 'Progress dashboard task D238 must become next after D236 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D238', 'Progress dashboard next queue must prioritize D238 after D236 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Answer context highlight smoke check passed.');
}
