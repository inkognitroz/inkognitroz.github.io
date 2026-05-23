import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createContext, Script } from 'node:vm';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'message-action-browser-fixture-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  messageActions: join(publicDir, 'apps', 'mimir-chat-portal', 'message-actions.js'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
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
    fail(`Missing D217 file: ${relative(root, file)}`);
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

const store = new Map();
const events = [];
const clipboard = [];
const context = createContext({
  console,
  Date,
  Math,
  JSON,
  String,
  Array,
  Boolean,
  localStorage: {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key)
  },
  navigator: {
    clipboard: {
      writeText: async (value) => {
        clipboard.push(String(value));
      }
    }
  },
  CustomEvent: class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail || {};
    }
  },
  window: {}
});
context.window.dispatchEvent = (event) => events.push(event);
context.window.MimirMessageActions = null;

new Script(raw(files.messageActions), { filename: 'message-actions.js' }).runInContext(context);
const actions = context.window.MimirMessageActions;
if (!actions || typeof actions.run !== 'function') {
  fail('D217 fixture could not load MimirMessageActions.run.');
}

let messages = [
  { id: 'u1', role: 'user', content: 'Use key sk-testSECRET1234567890 and email person@example.com', createdAt: '2026-05-23T20:00:00Z' },
  { id: 'a1', role: 'assistant', content: 'Synthetic answer with next steps.', createdAt: '2026-05-23T20:00:01Z', retryPrompt: 'synthetic prompt' },
  { id: 'a2', role: 'assistant', content: 'Selected answer for actions.', createdAt: '2026-05-23T20:00:02Z', retryPrompt: 'selected prompt' }
];
const opened = [];
const statuses = [];
const actionStatuses = [];
let liveModel = false;
let replacedMessages = [];
const bridge = {
  workspaceId: () => 'fixture-workspace',
  messages: () => messages,
  setMessages: (next) => {
    replacedMessages = next;
    messages = next;
  },
  setStatus: (message, state) => statuses.push({ message, state }),
  setMessageActionStatus: (id, message, state) => actionStatuses.push({ id, message, state }),
  recordAction: (action, message, detail = {}) => events.push({ type: 'recordAction', detail: { action, message_id: message.id, ...detail } }),
  openPanel: (target) => opened.push(target),
  openModelPicker: () => opened.push('#model-library'),
  hasUsableLiveModel: () => liveModel
};
const selected = messages[2];

actions.run('save', selected, bridge);
const conversations = JSON.parse(store.get('mimir-conversations-v1:fixture-workspace') || '[]');
if (conversations.length !== 1 || !store.get('mimir-active-conversation-v1:fixture-workspace')) {
  fail('D217 save action must write one local conversation and active id.');
}
if (!opened.includes('#conversation-manager-panel')) {
  fail('D217 save action must open conversation manager.');
}

actions.run('fork', selected, bridge);
const forked = JSON.parse(store.get('mimir-conversations-v1:fixture-workspace') || '[]');
if (forked.length < 2 || !String(forked[0].title || '').startsWith('Fork:')) {
  fail('D217 fork action must create a local fork conversation.');
}
if (replacedMessages.length !== 3 || replacedMessages[2].id !== 'a2') {
  fail('D217 fork action must replace runtime messages with the fork snapshot.');
}

await actions.run('share-safe', selected, bridge);
const shareDraft = JSON.parse(store.get('mimir-message-share-draft-v1:fixture-workspace') || '{}');
if (!shareDraft.text || /sk-testSECRET|person@example\.com/.test(shareDraft.text)) {
  fail('D217 safe share must store only a redacted share draft.');
}
if (!clipboard.length || /sk-testSECRET|person@example\.com/.test(clipboard.at(-1))) {
  fail('D217 safe share must copy only redacted text.');
}
if (!opened.includes('#sharing-center')) {
  fail('D217 safe share must open Safe Sharing.');
}

liveModel = false;
actions.run('next-step', selected, bridge);
if (!opened.includes('#model-library')) {
  fail('D217 next-step without live model must open the model picker.');
}
liveModel = true;
actions.run('next-step', selected, bridge);
if (!opened.includes('#conversation-manager-panel')) {
  fail('D217 next-step with live model must open conversation manager.');
}
if (!events.some((event) => event.detail?.no_paid_routes_started !== false || event.detail?.action)) {
  fail('D217 fixture must record no-spend/local action events.');
}

const report = json(files.report);
if (report.title !== 'Message Action Browser Fixture') {
  fail('D217 report must name the message action browser fixture.');
}
if (!String(report.public_repo_rule || '').includes('no real prompts')) {
  fail('D217 report must preserve the no real prompt/no secret public boundary.');
}
for (const id of ['save-conversation', 'fork-at-answer', 'safe-share-redaction', 'next-step-routing']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  if (!scenario || scenario.status !== 'ready' || scenario.no_paid_routes_started !== true) {
    fail(`D217 report scenario ${id} must be ready and no-spend.`);
  }
}
requireIncludes(files.messageActions, 'return shareSafe(message,bridge)', 'D217 message action runner must return async safe-share execution.');
requireIncludes(files.progressDashboard, 'renderMessageActionBrowserFixtureReport', 'Progress Dashboard must render D217 browser fixture evidence.');
requireIncludes(files.qualityWorkflow, 'smoke-check-message-action-browser-fixture.js', 'Quality workflow must run D217 browser fixture.');
requireIncludes(files.pagesWorkflow, 'smoke-check-message-action-browser-fixture.js', 'Pages workflow must run D217 browser fixture.');
requireIncludes(files.backlog, '| D218 |', 'Backlog must keep a next sequential work item after D217.');

const progress = json(files.progressData);
if (!progress.message_action_browser_fixture_report || progress.message_action_browser_fixture_report.title !== report.title) {
  fail('Progress dashboard data must embed D217 browser fixture report.');
}
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d217 = tasks.find((task) => task.seq === 'D217');
const d228 = tasks.find((task) => task.seq === 'D228');
if (!d217 || d217.status !== 'beta') {
  fail('Progress dashboard task D217 must be beta after browser fixture ships.');
}
if (!d228 || d228.status !== 'next') {
  fail('Progress dashboard task D228 must become next after D227 ships.');
}
if (!Array.isArray(progress.next_queue) || progress.next_queue[0] !== 'D228') {
  fail('Progress dashboard next queue must prioritize D228 after D227 ships.');
}

if (!process.exitCode) {
  console.log('Message action browser fixture smoke check passed.');
}
