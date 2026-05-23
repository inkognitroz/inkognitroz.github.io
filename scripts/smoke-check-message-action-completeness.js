import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  conversationManager: join(publicDir, 'apps', 'mimir-chat-portal', 'conversation-manager.js'),
  chatRuntimeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
  coverage: join(publicDir, 'ui-action-coverage.json'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md'),
  progress: join(publicDir, 'progress-dashboard.json')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing message action file: ${relative(root, file)}`);
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

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(`${message}: ${needle}`);
}

const chatRuntime = text(files.chatRuntime);
const conversationManager = text(files.conversationManager);
const chatRuntimeCss = text(files.chatRuntimeCss);
const coverage = text(files.coverage);
const backlog = text(files.backlog);
const progress = json(files.progress);

for (const needle of [
  "function enhanceTranscriptActions()",
  "actions.setAttribute('aria-label','Assistant message actions')",
  "button.setAttribute('data-runtime-message-action',action)",
  "button.setAttribute('data-runtime-message-action','copy')",
  "button.setAttribute('data-runtime-message-action','retry')",
  "ensureTranscriptAction(actions,'save-chat','Save','Save this conversation locally',bubble)",
  "ensureTranscriptAction(actions,'fork-chat','Fork','Fork this conversation locally',bubble)",
  "ensureTranscriptAction(actions,'safe-share','Safe share','Copy a redacted share draft',bubble)",
  'handleRuntimeAction(action',
  'mmir-conversation-action-requested',
  'no_paid_routes_started:true',
  'raw_prompt_stored:false',
  'raw_response_stored:false'
]) {
  requireIncludes(conversationManager, needle, 'Conversation manager missing transcript action evidence');
}

for (const needle of [
  'function openConversationPanel()',
  'function activeOrSavedConversationId()',
  'function forkCurrentConversation()',
  'function safeShareCurrentConversation()',
  'window.MimirConversationManager',
  'Conversation saved from transcript action.',
  'Conversation forked from transcript action.',
  'Unknown transcript action. No paid route or secret was used.',
  'mimir-conversations-v1:',
  "CHAT_KEY+':'"
]) {
  requireIncludes(conversationManager, needle, 'Conversation manager missing conversation action evidence');
}

for (const needle of [
  '.runtime-message-actions',
  'display: flex',
  'flex-wrap: wrap',
  'gap: 8px'
]) {
  requireIncludes(chatRuntimeCss, needle, 'Runtime message action CSS missing mobile-safe wrapping evidence');
}

for (const needle of [
  'runtime-message-actions',
  'data-runtime-message-action',
  'mmir-conversation-action-requested',
  'enhanceTranscriptActions',
  'Save this conversation locally',
  'Fork this conversation locally',
  'Copy a redacted share draft',
  'no_paid_routes_started:true',
  'raw_prompt_stored:false',
  'raw_response_stored:false'
]) {
  requireIncludes(coverage, needle, 'UI action coverage missing transcript action evidence');
}

requireIncludes(backlog, '| D215 |', 'Backlog must keep D215 message action work visible');

const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d215 = tasks.find((task) => task.seq === 'D215');
if (!d215 || d215.status !== 'next') {
  fail('Progress dashboard task D215 must remain the next tracked P0 while message action work is being PR-tested.');
}

if (!Array.isArray(progress.next_queue) || progress.next_queue[0] !== 'D215') {
  fail('Progress dashboard next queue must prioritize D215 until the transcript action PR is deployed.');
}

if (!process.exitCode) {
  console.log('Message action completeness smoke check passed.');
}
