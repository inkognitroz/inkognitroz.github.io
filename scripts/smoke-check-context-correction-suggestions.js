import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'context-correction-suggestions-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  mmir: join(publicDir, 'mmir.html'),
  suggestions: join(publicDir, 'apps', 'mimir-chat-portal', 'context-correction-suggestions.js'),
  memoryCss: join(publicDir, 'apps', 'mimir-chat-portal', 'memory.css'),
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
    fail(`Missing D232 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Context Correction Suggestions QA', 'D232 report must name context correction suggestions QA.');
requireTrue(report.source_storage_key === 'mimir-context-corrections-v1:{workspace}', 'D232 report must derive suggestions from local correction metadata.');
requireTrue(String(report.public_repo_rule || '').includes('document text'), 'D232 report must reject raw document/prompt/response storage.');
for (const id of ['memory-hygiene-suggestions', 'knowledge-hygiene-suggestions', 'manual-review-only', 'progress-dashboard-suggestions']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D232 scenario ${id} must be ready.`);
  requireTrue(scenario?.no_paid_routes_started === true, `D232 scenario ${id} must not start paid routes.`);
}

requireIncludes(files.mmir, 'context-correction-suggestions.js', 'MMIR deferred script queue must load D232 correction suggestions module.');

for (const needle of [
  'CORRECTION_PREFIX',
  'suggestionSet',
  'memory-scope-expiry',
  'memory-import-review',
  'knowledge-source-review',
  'knowledge-collection-split',
  'context-correction-suggestions',
  'dataset.contextSuggestion',
  'mmir-context-correction-suggestion-opened',
  'raw_prompt_stored:false',
  'raw_response_stored:false'
]) {
  requireIncludes(files.suggestions, needle, `D232 suggestions module missing correction learning behavior: ${needle}`);
}

for (const needle of [
  '.context-correction-suggestions',
  '[data-context-suggestion]'
]) {
  requireIncludes(files.memoryCss, needle, `D232 Memory CSS missing correction suggestion styling: ${needle}`);
}

for (const needle of [
  'contextCorrectionSuggestions',
  'renderContextCorrectionSuggestionsReport',
  'progress-context-correction-suggestions',
  'context_correction_suggestions_report'
]) {
  requireIncludes(files.progressDashboard, needle, `D232 Progress Dashboard missing correction suggestion behavior: ${needle}`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-context-correction-suggestions.js', 'Quality workflow must run D232 context correction suggestions QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-context-correction-suggestions.js', 'Pages workflow must run D232 context correction suggestions QA.');
requireIncludes(files.backlog, '| D235 |', 'Backlog must keep a next sequential work item after D234.');

const progress = json(files.progressData);
requireTrue(progress.context_correction_suggestions_report?.title === report.title, 'Progress dashboard data must embed D232 context correction suggestions report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d232 = tasks.find((task) => task.seq === 'D232');
const d237 = tasks.find((task) => task.seq === 'D243');
requireTrue(d232?.status === 'beta', 'Progress dashboard task D232 must be beta after correction suggestions ship.');
requireTrue(d237?.status === 'next', 'Progress dashboard task D243 must become next after D236 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D243', 'Progress dashboard next queue must prioritize D243 after D236 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Context correction suggestions smoke check passed.');
}
