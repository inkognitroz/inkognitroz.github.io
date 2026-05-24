import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'promoted-context-next-answer-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  memory: join(publicDir, 'apps', 'mimir-chat-portal', 'memory.js'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md')
};

const WORKSPACE = 'personal';
const MEMORY_KEY = `mimir-memory-v1:${WORKSPACE}`;
const MEMORY_USE_KEY = `mimir-memory-use-v1:${WORKSPACE}`;
const KNOWLEDGE_KEY = `mimir-knowledge-v1:${WORKSPACE}`;
const COLLECTIONS_KEY = `mimir-knowledge-collections-v1:${WORKSPACE}`;
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
    fail(`Missing D221 file: ${relative(root, file)}`);
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

function requireOrder(source, needles, message) {
  let cursor = -1;
  for (const needle of needles) {
    const index = source.indexOf(needle, cursor + 1);
    if (index < 0) {
      fail(`${message} Missing: ${needle}`);
      return;
    }
    cursor = index;
  }
}

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) {
    fail(`D221 could not find runtime function: ${name}`);
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
  fail(`D221 could not close runtime function: ${name}`);
  return '';
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

function runRuntimeContextFixture() {
  const source = raw(files.chatRuntime);
  const functions = [
    'cleanMemoryType',
    'cleanMemoryScope',
    'memoryExpiresAt',
    'memoryExpired',
    'normalizedMemoryUse',
    'writeMemoryUse',
    'rankMemoryForPrompt',
    'activeMemoryInstruction',
    'wordSet',
    'readKnowledgeCollections',
    'knowledgeCollectionFor',
    'knowledgeUseSummary',
    'relevantKnowledgeInstruction'
  ].map((name) => extractFunction(source, name)).join('\n');
  const localStorage = createStorage();
  const events = [];
  localStorage.setItem(MEMORY_KEY, JSON.stringify([
    {
      id: 'memory-promoted-chat',
      text: 'Saved chat: Launch plan - Use the free local node, saved chats knowledge and calm onboarding.',
      type: 'project',
      scope: 'workspace',
      tags: ['conversation', 'handoff', 'launch'],
      notes: 'Created locally from a saved chat. Review before any backend sync.',
      enabled: true,
      updatedAt: '2026-05-23T21:30:00.000Z'
    },
    {
      id: 'memory-disabled',
      text: 'Should not be selected even if local node matches.',
      enabled: false,
      updatedAt: '2026-05-23T21:31:00.000Z'
    }
  ]));
  localStorage.setItem(COLLECTIONS_KEY, JSON.stringify([
    { id: 'saved-chats', name: 'Saved chats', enabled: true },
    { id: 'disabled-saved-chats', name: 'Disabled saved chats', enabled: false }
  ]));
  localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify([
    {
      id: 'knowledge-promoted-chat',
      name: 'Saved chat - Launch plan',
      collection_id: 'saved-chats',
      collection: 'Saved chats',
      enabled: true,
      text: 'Saved chats knowledge says the next answer should mention free local node, onboarding and memory review.'
    },
    {
      id: 'knowledge-disabled-chat',
      name: 'Disabled saved chat',
      collection_id: 'disabled-saved-chats',
      collection: 'Disabled saved chats',
      enabled: true,
      text: 'This disabled collection also mentions free local node and must not be injected.'
    }
  ]));
  const context = {
    localStorage,
    window: {
      dispatchEvent: (event) => events.push({ type: event.type, detail: event.detail || {} })
    },
    CustomEvent: class CustomEvent {
      constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail || {};
      }
    },
    console
  };
  runInNewContext(`
    let lastBackendMemoryUses=[];
    let lastBackendKnowledgeUses=[];
    let lastKnowledgeUses=[];
    function activeWorkspaceId(){return '${WORKSPACE}';}
    function memoryStorageKey(){return '${MEMORY_KEY}';}
    function memoryUseStorageKey(){return '${MEMORY_USE_KEY}';}
    function knowledgeStorageKey(){return '${KNOWLEDGE_KEY}';}
    function knowledgeCollectionsStorageKey(){return '${COLLECTIONS_KEY}';}
    function contextControls(){return {};}
    ${functions}
    globalThis.__memory=activeMemoryInstruction('launch local node saved chats onboarding memory review');
    globalThis.__knowledge=relevantKnowledgeInstruction('free local node saved chats onboarding memory review');
  `, context, { filename: 'd221-promoted-context-fixture.js' });
  const store = localStorage.dump();
  return {
    memory: context.__memory || '',
    knowledge: context.__knowledge || '',
    memoryUse: JSON.parse(store[MEMORY_USE_KEY] || '[]'),
    events
  };
}

const report = json(files.report);
requireTrue(report.title === 'Promoted Context Next Answer QA', 'D221 report must name promoted context next answer QA.');
requireTrue(String(report.public_repo_rule || '').includes('no real prompts'), 'D221 report must preserve public synthetic/no-secret boundary.');
for (const id of ['local-memory-injection', 'saved-chat-knowledge-injection', 'disabled-collection-boundary', 'chat-context-order']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D221 report scenario ${id} must be ready.`);
  requireTrue(scenario?.no_paid_routes_started === true, `D221 report scenario ${id} must not start paid routes.`);
}

for (const needle of [
  'activeMemoryInstruction(prompt)',
  'writeMemoryUse',
  'mmir-memory-use-updated',
  'relevantKnowledgeInstruction(prompt)',
  'readKnowledgeCollections',
  'contextMessages(prompt,backendMemory',
  'if(memory)system.push',
  'if(knowledge)system.push'
]) {
  requireIncludes(files.chatRuntime, needle, `D221 chat runtime missing promoted context contract: ${needle}`);
}
requireIncludes(files.memory, 'Used in last message', 'D221 Memory panel must keep visible memory-use review.');
requireIncludes(files.memory, 'memory-use-list', 'D221 Memory panel must render memory-use list.');

const runtimeSource = raw(files.chatRuntime);
requireOrder(runtimeSource, [
  'const memory=activeMemoryInstruction(prompt);',
  'const knowledge=relevantKnowledgeInstruction(prompt);',
  'if(memory)system.push',
  'if(backendMemory)system.push',
  'if(knowledge)system.push',
  'if(backendKnowledge)system.push'
], 'D221 chat context order must keep local/protected memory and knowledge explicit.');

const fixture = runRuntimeContextFixture();
requireTrue(fixture.memory.includes('User-governed memory'), 'D221 fixture must produce local memory instruction.');
requireTrue(fixture.memory.includes('Saved chat: Launch plan'), 'D221 fixture must include promoted saved chat memory.');
requireTrue(fixture.memoryUse.length === 1, 'D221 fixture must write one visible memory-use record.');
requireTrue(fixture.memoryUse[0]?.source === 'local', 'D221 memory-use record must mark local source.');
requireTrue((fixture.memoryUse[0]?.matched_terms || []).includes('launch'), 'D221 memory-use record must preserve matched terms.');
requireTrue(fixture.events.some((event) => event.type === 'mmir-memory-use-updated'), 'D221 fixture must emit memory-use update event.');
requireTrue(fixture.knowledge.includes('Relevant local knowledge'), 'D221 fixture must produce local knowledge instruction.');
requireTrue(fixture.knowledge.includes('Saved chats / Saved chat - Launch plan'), 'D221 fixture must cite Saved chats collection and file.');
requireTrue(!fixture.knowledge.includes('Disabled saved chats'), 'D221 fixture must skip disabled knowledge collections.');

requireIncludes(files.progressDashboard, 'renderPromotedContextNextAnswerReport', 'Progress Dashboard must render D221 promoted context proof.');
requireIncludes(files.qualityWorkflow, 'smoke-check-promoted-context-next-answer.js', 'Quality workflow must run D221 promoted context QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-promoted-context-next-answer.js', 'Pages workflow must run D221 promoted context QA.');
requireIncludes(files.backlog, '| D222 |', 'Backlog must keep a next sequential work item after D221.');

const progress = json(files.progressData);
requireTrue(progress.promoted_context_next_answer_report?.title === report.title, 'Progress dashboard data must embed D221 promoted context report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d221 = tasks.find((task) => task.seq === 'D221');
const d237 = tasks.find((task) => task.seq === 'D245');
requireTrue(d221?.status === 'beta', 'Progress dashboard task D221 must be beta after promoted context proof ships.');
requireTrue(d237?.status === 'next', 'Progress dashboard task D245 must become next after D236 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D245', 'Progress dashboard next queue must prioritize D245 after D236 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Promoted context next-answer smoke check passed.');
}
