import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'saved-chat-memory-handoff-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  conversationManager: join(publicDir, 'apps', 'mimir-chat-portal', 'conversation-manager.js'),
  memory: join(publicDir, 'apps', 'mimir-chat-portal', 'memory.js'),
  knowledge: join(publicDir, 'apps', 'mimir-chat-portal', 'knowledge.js'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md')
};

const WORKSPACE = 'personal';
const CONVERSATIONS_KEY = `mimir-conversations-v1:${WORKSPACE}`;
const MEMORY_KEY = `mimir-memory-v1:${WORKSPACE}`;
const KNOWLEDGE_KEY = `mimir-knowledge-v1:${WORKSPACE}`;
const COLLECTIONS_KEY = `mimir-knowledge-collections-v1:${WORKSPACE}`;
const PROMOTION_KEY = `mimir-saved-chat-promotion-v1:${WORKSPACE}`;
const SECRET = 'sk-chatSECRET123456789';
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
    fail(`Missing D220 file: ${relative(root, file)}`);
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

function runPromotionFixture() {
  const localStorage = createStorage();
  const events = [];
  const conversation = {
    id: 'conversation-d220',
    title: `Launch plan with ${SECRET}`,
    messages: [
      { id: 'u1', role: 'user', content: `Remember this platform setup and token ${SECRET}`, createdAt: '2026-05-23T21:00:00.000Z' },
      { id: 'a1', role: 'assistant', content: `Use free local node first. Never expose ${SECRET}.`, createdAt: '2026-05-23T21:00:01.000Z' }
    ],
    created_at: '2026-05-23T21:00:00.000Z',
    updated_at: '2026-05-23T21:00:01.000Z'
  };
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify([conversation]));
  const context = {
    window: {
      localStorage,
      dispatchEvent: (event) => events.push({ type: event.type, detail: event.detail || {} }),
      addEventListener: () => {},
      MimirConversationManager: null
    },
    localStorage,
    document: {
      readyState: 'loading',
      querySelector: (selector) => selector === '#multi-model-workspace .mimir-dashboard' ? { appendChild: () => {} } : null,
      addEventListener: () => {}
    },
    CustomEvent: class CustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail || {};
      }
    },
    console
  };
  runInNewContext(raw(files.conversationManager), context, { filename: files.conversationManager });
  context.window.MimirConversationManager.promoteSavedChat(conversation.id, 'memory');
  const memoryAfter = localStorage.dump();
  context.window.MimirConversationManager.promoteSavedChat(conversation.id, 'knowledge');
  const finalStore = localStorage.dump();
  return {
    events,
    memoryItems: JSON.parse(memoryAfter[MEMORY_KEY] || '[]'),
    knowledgeItems: JSON.parse(finalStore[KNOWLEDGE_KEY] || '[]'),
    collections: JSON.parse(finalStore[COLLECTIONS_KEY] || '[]'),
    promotion: JSON.parse(finalStore[PROMOTION_KEY] || 'null')
  };
}

const report = json(files.report);
requireTrue(report.title === 'Saved Chat Memory Handoff QA', 'D220 report must name saved chat memory handoff QA.');
requireTrue(String(report.public_repo_rule || '').includes('no prompts'), 'D220 report must preserve public no prompt/no secret boundary.');
for (const id of ['promote-memory', 'promote-knowledge', 'promotion-receipt', 'review-panels']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D220 report scenario ${id} must be ready.`);
  requireTrue(scenario?.no_paid_routes_started === true, `D220 report scenario ${id} must not start paid routes.`);
}

for (const needle of [
  'SAVED_CHAT_PROMOTION_PREFIX',
  'promoteToMemory',
  'promoteToKnowledge',
  'MimirConversationManager',
  'Add memory',
  'Add knowledge',
  'mmir-saved-chat-promoted',
  'raw_prompt_stored_in_public_repo:false',
  'raw_response_stored_in_public_repo:false'
]) {
  requireIncludes(files.conversationManager, needle, `D220 conversation manager missing saved-chat promotion contract: ${needle}`);
}
requireIncludes(files.memory, "window.addEventListener('mmir-memory-updated',render)", 'D220 Memory panel must refresh after local promotion.');
requireIncludes(files.knowledge, "window.addEventListener('mmir-knowledge-updated'", 'D220 Knowledge panel must refresh after local promotion.');

const fixture = runPromotionFixture();
requireTrue(fixture.memoryItems.length === 1, 'D220 memory promotion must create one local memory item.');
requireTrue(fixture.memoryItems[0]?.source === 'conversation-handoff', 'D220 memory item must preserve source.');
requireTrue(fixture.memoryItems[0]?.syncState === 'local', 'D220 memory promotion must remain local by default.');
requireTrue(fixture.memoryItems[0]?.notes?.includes('Review before any backend sync'), 'D220 memory promotion must require review before sync.');
requireTrue(!JSON.stringify(fixture.memoryItems).includes(SECRET), 'D220 memory promotion must redact token-like content.');
requireTrue(fixture.knowledgeItems.length === 1, 'D220 knowledge promotion must create one local knowledge item.');
requireTrue(fixture.knowledgeItems[0]?.sync === 'local-only', 'D220 knowledge promotion must remain local-only by default.');
requireTrue(fixture.collections.some((item) => item.id === 'saved-chats' && item.enabled === true), 'D220 knowledge promotion must create the Saved chats collection.');
requireTrue(!JSON.stringify(fixture.knowledgeItems).includes(SECRET), 'D220 knowledge promotion must redact token-like content.');
requireTrue(fixture.promotion?.target === 'knowledge', 'D220 promotion receipt must record the latest target.');
requireTrue(fixture.promotion?.no_paid_routes_started === true, 'D220 promotion receipt must keep no paid route flag.');
requireTrue(fixture.promotion?.raw_prompt_stored_in_public_repo === false && fixture.promotion?.raw_response_stored_in_public_repo === false, 'D220 promotion receipt must declare no public raw prompt/response storage.');
requireTrue(fixture.events.some((event) => event.type === 'mmir-memory-updated'), 'D220 memory promotion must emit memory update.');
requireTrue(fixture.events.some((event) => event.type === 'mmir-knowledge-updated'), 'D220 knowledge promotion must emit knowledge update.');
requireTrue(fixture.events.some((event) => event.type === 'mmir-saved-chat-promoted'), 'D220 promotions must emit metadata receipt events.');

requireIncludes(files.progressDashboard, 'renderSavedChatMemoryHandoffReport', 'Progress Dashboard must render D220 saved chat memory handoff evidence.');
requireIncludes(files.qualityWorkflow, 'smoke-check-saved-chat-memory-handoff.js', 'Quality workflow must run D220 saved chat memory handoff QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-saved-chat-memory-handoff.js', 'Pages workflow must run D220 saved chat memory handoff QA.');
requireIncludes(files.backlog, '| D221 |', 'Backlog must keep a next sequential work item after D220.');

const progress = json(files.progressData);
requireTrue(progress.saved_chat_memory_handoff_report?.title === report.title, 'Progress dashboard data must embed D220 saved chat memory handoff report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d220 = tasks.find((task) => task.seq === 'D220');
const d229 = tasks.find((task) => task.seq === 'D229');
requireTrue(d220?.status === 'beta', 'Progress dashboard task D220 must be beta after saved chat memory handoff ships.');
requireTrue(d229?.status === 'next', 'Progress dashboard task D229 must become next after D228 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D229', 'Progress dashboard next queue must prioritize D229 after D228 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Saved chat memory handoff smoke check passed.');
}
