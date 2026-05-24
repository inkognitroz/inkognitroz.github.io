import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'answer-context-receipt-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  mmir: join(publicDir, 'mmir.html'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  chatRuntimeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
  answerReceipts: join(publicDir, 'apps', 'mimir-chat-portal', 'answer-context-receipts.js'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md')
};

const WORKSPACE = 'personal';
const RECEIPT_KEY = `mimir-answer-context-receipts-v1:${WORKSPACE}`;
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
    fail(`Missing D223 file: ${relative(root, file)}`);
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

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) {
    fail(`D223 could not find runtime function: ${name}`);
    return '';
  }
  const signatureEnd = source.indexOf('){', start);
  const open = signatureEnd >= 0 ? signatureEnd + 1 : source.indexOf('{', start);
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  fail(`D223 could not close runtime function: ${name}`);
  return '';
}

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(String(key)) ? values.get(String(key)) : null,
    setItem: (key, value) => values.set(String(key), String(value)),
    dump: () => Object.fromEntries(values.entries())
  };
}

const report = json(files.report);
requireTrue(report.title === 'Answer Context Receipt QA', 'D223 report must name answer context receipt QA.');
requireTrue(String(report.public_repo_rule || '').includes('no prompts'), 'D223 report must keep receipts prompt-free.');
for (const id of ['backend-context-receipt', 'starter-context-receipt', 'visible-transcript-receipt', 'public-safe-metadata']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D223 report scenario ${id} must be ready.`);
  requireTrue(scenario?.no_paid_routes_started === true, `D223 scenario ${id} must not start paid routes.`);
}

requireIncludes(files.mmir, './apps/mimir-chat-portal/answer-context-receipts.js', 'D223 answer receipt renderer must load through deferred queue.');
for (const needle of [
  'window.__MimirLastAnswerContext',
  'contextState(Boolean(memory),Boolean(backendMemory)',
  'contextState(Boolean(knowledge),Boolean(backendKnowledge)'
]) {
  requireIncludes(files.chatRuntime, needle, `D223 chat runtime missing receipt contract: ${needle}`);
}
for (const needle of [
  'mimir-answer-context-receipts-v1:',
  'runtime-answer-context-receipt',
  'syncFromRuntime',
  'MimirChatRuntimeBridge',
  'raw_prompt_stored_in_receipt:false',
  'raw_response_stored_in_receipt:false',
  'MimirAnswerContextReceipts',
  'mmir-answer-context-receipt-updated',
  'No prompt, response or provider secret is stored'
]) {
  requireIncludes(files.answerReceipts, needle, `D223 renderer missing safe receipt behavior: ${needle}`);
}
for (const needle of ['.runtime-answer-context-receipt', '.runtime-answer-context-receipt dl']) {
  requireIncludes(files.chatRuntimeCss, needle, `D223 CSS missing answer receipt styling: ${needle}`);
}

requireIncludes(files.progressDashboard, 'renderAnswerContextReceiptReport', 'Progress Dashboard must render D223 answer context receipt evidence.');
requireIncludes(files.qualityWorkflow, 'smoke-check-answer-context-receipt.js', 'Quality workflow must run D223 answer receipt QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-answer-context-receipt.js', 'Pages workflow must run D223 answer receipt QA.');
requireIncludes(files.backlog, '| D224 |', 'Backlog must keep a next sequential work item after D223.');

const progress = json(files.progressData);
requireTrue(progress.answer_context_receipt_report?.title === report.title, 'Progress dashboard data must embed D223 answer context receipt report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d223 = tasks.find((task) => task.seq === 'D223');
const d237 = tasks.find((task) => task.seq === 'D249');
requireTrue(d223?.status === 'beta', 'Progress dashboard task D223 must be beta after answer receipts ship.');
requireTrue(d237?.status === 'next', 'Progress dashboard task D249 must become next after D236 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D249', 'Progress dashboard next queue must prioritize D249 after D236 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Answer context receipt smoke check passed.');
}
