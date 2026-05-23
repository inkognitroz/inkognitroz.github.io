import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'conversation-handoff-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  messageActions: join(publicDir, 'apps', 'mimir-chat-portal', 'message-actions.js'),
  conversationManager: join(publicDir, 'apps', 'mimir-chat-portal', 'conversation-manager.js'),
  conversationCss: join(publicDir, 'apps', 'mimir-chat-portal', 'conversation-manager.css'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md')
};

const WORKSPACE = 'personal';
const CONVERSATIONS_KEY = `mimir-conversations-v1:${WORKSPACE}`;
const ACTIVE_KEY = `mimir-active-conversation-v1:${WORKSPACE}`;
const HANDOFF_KEY = `mimir-conversation-handoff-v1:${WORKSPACE}`;
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
    fail(`Missing D219 file: ${relative(root, file)}`);
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

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(String(key)) ? values.get(String(key)) : null,
    setItem: (key, value) => values.set(String(key), String(value)),
    removeItem: (key) => values.delete(String(key)),
    dump: () => Object.fromEntries(values.entries())
  };
}

function runMessageActionFixture(action) {
  const localStorage = createStorage();
  const events = [];
  const statuses = [];
  const records = [];
  const opened = [];
  const setMessages = [];
  const messages = [
    {
      id: 'u1',
      role: 'user',
      content: 'Set up a free local node with sk-testSECRET123456789 and make it easy.',
      createdAt: '2026-05-23T20:00:00.000Z'
    },
    {
      id: 'a1',
      role: 'assistant',
      content: 'Use the free local connector path and keep provider keys outside the public frontend.',
      createdAt: '2026-05-23T20:00:02.000Z',
      model: 'MMIR Guide'
    }
  ];
  const window = {
    localStorage,
    dispatchEvent: (event) => events.push({ type: event.type, detail: event.detail || {} }),
    MimirMessageActions: null
  };
  const context = {
    window,
    localStorage,
    CustomEvent: class CustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail || {};
      }
    },
    console
  };
  runInNewContext(raw(files.messageActions), context, { filename: files.messageActions });
  const bridge = {
    workspaceId: () => WORKSPACE,
    messages: () => messages,
    setMessages: (next) => setMessages.push(next),
    setStatus: (text, state) => statuses.push({ text, state }),
    setMessageActionStatus: (id, text, state) => statuses.push({ id, text, state }),
    recordAction: (name, message, detail) => records.push({ name, messageId: message.id, detail }),
    openPanel: (target) => opened.push(target),
    hasUsableLiveModel: () => true
  };
  const result = context.window.MimirMessageActions.run(action, messages[1], bridge);
  const store = localStorage.dump();
  return {
    result,
    store,
    events,
    statuses,
    records,
    opened,
    setMessages,
    conversations: JSON.parse(store[CONVERSATIONS_KEY] || '[]'),
    handoff: JSON.parse(store[HANDOFF_KEY] || 'null'),
    active: store[ACTIVE_KEY] || ''
  };
}

const report = json(files.report);
requireTrue(report.title === 'Conversation Handoff QA', 'D219 report must name conversation handoff QA.');
requireTrue(String(report.public_repo_rule || '').includes('no prompts'), 'D219 report must preserve the no prompt/no secret public boundary.');
for (const id of ['save-handoff', 'fork-handoff', 'manager-callout', 'public-boundary']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D219 report scenario ${id} must be ready.`);
  requireTrue(scenario?.no_paid_routes_started === true, `D219 report scenario ${id} must not start paid routes.`);
}

for (const needle of [
  'CONVERSATION_HANDOFF_PREFIX',
  'publishConversationHandoff',
  'mmir-conversation-handoff',
  'next_action',
  'raw_prompt_stored:false',
  'raw_response_stored:false',
  'redactHandoffTitle'
]) {
  requireIncludes(files.messageActions, needle, `D219 message actions missing handoff contract: ${needle}`);
}

for (const needle of [
  'CONVERSATION_HANDOFF_PREFIX',
  'renderHandoff',
  'conversation-handoff',
  'data-handoff-action',
  'Continue chat',
  'Just saved',
  'Just forked',
  'mmir-conversation-handoff'
]) {
  requireIncludes(files.conversationManager, needle, `D219 conversation manager missing handoff UI contract: ${needle}`);
}

for (const needle of [
  '.conversation-handoff',
  '.conversation-item.is-handoff',
  '.conversation-badges',
  '.conversation-handoff-actions button:focus-visible'
]) {
  requireIncludes(files.conversationCss, needle, `D219 conversation CSS missing handoff selector: ${needle}`);
}

const saveFixture = runMessageActionFixture('save');
requireTrue(saveFixture.conversations.length === 1, 'D219 save action must create one local conversation.');
requireTrue(saveFixture.active === saveFixture.conversations[0]?.id, 'D219 save action must mark the saved chat active.');
requireTrue(saveFixture.handoff?.action === 'saved', 'D219 save action must write a saved handoff.');
requireTrue(saveFixture.handoff?.next_action === 'continue-chat', 'D219 save handoff must expose continue-chat as next action.');
requireTrue(saveFixture.handoff?.no_paid_routes_started === true, 'D219 save handoff must keep no paid route flag.');
requireTrue(saveFixture.handoff?.raw_prompt_stored === false && saveFixture.handoff?.raw_response_stored === false, 'D219 handoff must declare no raw prompt/response storage.');
requireTrue(!JSON.stringify(saveFixture.handoff).includes('sk-testSECRET'), 'D219 handoff must redact token-like title content.');
requireTrue(!('messages' in (saveFixture.handoff || {})), 'D219 handoff must not duplicate raw messages.');
requireTrue(saveFixture.events.some((event) => event.type === 'mmir-conversation-handoff'), 'D219 save action must emit a handoff event.');
requireTrue(saveFixture.opened.includes('#conversation-manager-panel'), 'D219 save action must open Conversations.');

const forkFixture = runMessageActionFixture('fork');
requireTrue(forkFixture.conversations.length === 1, 'D219 fork action must create one local fork conversation.');
requireTrue(forkFixture.handoff?.action === 'forked', 'D219 fork action must write a forked handoff.');
requireTrue(forkFixture.active === forkFixture.conversations[0]?.id, 'D219 fork action must mark the fork active.');
requireTrue(Array.isArray(forkFixture.setMessages[0]) && forkFixture.setMessages[0].length === 2, 'D219 fork action must load the forked branch into chat.');
requireTrue(forkFixture.records.some((record) => record.name === 'fork' && record.detail?.conversation_id), 'D219 fork action must record the conversation id.');
requireTrue(!JSON.stringify(forkFixture.handoff).includes('sk-testSECRET'), 'D219 fork handoff must redact token-like title content.');

requireIncludes(files.progressDashboard, 'renderConversationHandoffReport', 'Progress Dashboard must render D219 conversation handoff evidence.');
requireIncludes(files.qualityWorkflow, 'smoke-check-conversation-handoff.js', 'Quality workflow must run D219 conversation handoff QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-conversation-handoff.js', 'Pages workflow must run D219 conversation handoff QA.');
requireIncludes(files.backlog, '| D220 |', 'Backlog must keep a next sequential work item after D219.');

const progress = json(files.progressData);
requireTrue(progress.conversation_handoff_report?.title === report.title, 'Progress dashboard data must embed D219 conversation handoff report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d219 = tasks.find((task) => task.seq === 'D219');
const d229 = tasks.find((task) => task.seq === 'D229');
requireTrue(d219?.status === 'beta', 'Progress dashboard task D219 must be beta after conversation handoff ships.');
requireTrue(d229?.status === 'next', 'Progress dashboard task D229 must become next after D228 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D229', 'Progress dashboard next queue must prioritize D229 after D228 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Conversation handoff smoke check passed.');
}
