import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'context-correction-retry-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  mmir: join(publicDir, 'mmir.html'),
  retry: join(publicDir, 'apps', 'mimir-chat-portal', 'context-correction-retry.js'),
  chatCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
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
    fail(`Missing D231 file: ${relative(root, file)}`);
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
requireTrue(report.title === 'Context Correction Retry QA', 'D231 report must name context correction retry QA.');
requireTrue(report.storage_key === 'mimir-context-correction-retry-v1:{workspace}', 'D231 report must define the browser-local retry receipt key.');
requireTrue(String(report.public_repo_rule || '').includes('raw prompts'), 'D231 report must reject raw prompt storage.');
for (const id of ['retry-button-after-correction', 'visible-prompt-source', 'retry-receipt', 'corrected-answer-badge']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D231 scenario ${id} must be ready.`);
  requireTrue(scenario?.no_paid_routes_started === true, `D231 scenario ${id} must not start paid routes.`);
}

requireIncludes(files.mmir, 'context-correction-retry.js', 'MMIR deferred script queue must load D231 correction retry module.');

for (const needle of [
  'CORRECTION_PREFIX',
  'RETRY_PREFIX',
  'mimir-context-correction-retry-v1:',
  'visiblePromptBefore',
  'correctionFor',
  'retryReceipt',
  'mmir.corrected_context_retry',
  'data-message-action',
  'retry-corrected',
  'Retry fixed',
  'context-correction-retry-badge',
  'raw_prompt_stored:false',
  'raw_response_stored:false',
  'provider_secrets_stored:false'
]) {
  requireIncludes(files.retry, needle, `D231 retry module missing corrected retry behavior: ${needle}`);
}

requireIncludes(files.chatCss, '.context-correction-retry-badge', 'Chat CSS must style the corrected-context answer badge.');
requireIncludes(files.progressDashboard, 'renderContextCorrectionRetryReport', 'Progress Dashboard must render D231 retry evidence.');
requireIncludes(files.progressDashboard, 'context_correction_retry_report', 'Progress dashboard must read D231 retry report data.');
requireIncludes(files.qualityWorkflow, 'smoke-check-context-correction-retry.js', 'Quality workflow must run D231 context correction retry QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-context-correction-retry.js', 'Pages workflow must run D231 context correction retry QA.');
requireIncludes(files.backlog, '| D235 |', 'Backlog must keep a next sequential work item after D234.');

const progress = json(files.progressData);
requireTrue(progress.context_correction_retry_report?.title === report.title, 'Progress dashboard data must embed D231 context correction retry report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d231 = tasks.find((task) => task.seq === 'D231');
const d237 = tasks.find((task) => task.seq === 'D251');
requireTrue(d231?.status === 'beta', 'Progress dashboard task D231 must be beta after correction retry ships.');
requireTrue(d237?.status === 'next', 'Progress dashboard task D251 must become next after D236 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D251', 'Progress dashboard next queue must prioritize D251 after D236 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Context correction retry smoke check passed.');
}
