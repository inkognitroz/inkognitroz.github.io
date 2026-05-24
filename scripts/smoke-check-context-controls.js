import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'context-controls-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  mmir: join(publicDir, 'mmir.html'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  chatRuntimeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
  contextControls: join(publicDir, 'apps', 'mimir-chat-portal', 'context-controls.js'),
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
const CONTEXT_KEY = `mimir-context-controls-v1:${WORKSPACE}`;
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
    fail(`Missing D222 file: ${relative(root, file)}`);
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
    fail(`D222 could not find runtime function: ${name}`);
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
  fail(`D222 could not close runtime function: ${name}`);
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

function runRuntimeControlFixture(controlState) {
  const source = raw(files.chatRuntime);
  const functions = [
    'cleanMemoryType',
    'cleanMemoryScope',
    'memoryExpiresAt',
    'memoryExpired',
    'normalizedMemoryUse',
    'writeMemoryUse',
    'rankMemoryForPrompt',
    'contextControls',
    'activeMemoryInstruction',
    'wordSet',
    'readKnowledgeCollections',
    'knowledgeCollectionFor',
    'knowledgeUseSummary',
    'relevantKnowledgeInstruction'
  ].map((name) => extractFunction(source, name)).join('\n');
  const localStorage = createStorage();
  const events = [];
  localStorage.setItem(CONTEXT_KEY, JSON.stringify(controlState));
  localStorage.setItem(MEMORY_KEY, JSON.stringify([
    { id: 'm1', text: 'Saved chat memory about local node launch context.', type: 'project', scope: 'workspace', tags: ['launch'], enabled: true }
  ]));
  localStorage.setItem(COLLECTIONS_KEY, JSON.stringify([{ id: 'saved-chats', name: 'Saved chats', enabled: true }]));
  localStorage.setItem(KNOWLEDGE_KEY, JSON.stringify([
    { id: 'k1', name: 'Saved chat context', collection_id: 'saved-chats', collection: 'Saved chats', enabled: true, text: 'Saved chats knowledge about local node launch context.' }
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
    function contextControlsKey(){return '${CONTEXT_KEY}';}
    ${functions}
    globalThis.__memory=activeMemoryInstruction('local node launch context');
    globalThis.__knowledge=relevantKnowledgeInstruction('local node launch context');
  `, context, { filename: 'd222-context-controls-fixture.js' });
  return {
    memory: context.__memory || '',
    knowledge: context.__knowledge || '',
    memoryUse: JSON.parse(localStorage.dump()[MEMORY_USE_KEY] || '[]'),
    events
  };
}

const report = json(files.report);
requireTrue(report.title === 'Per-Message Context Controls QA', 'D222 report must name per-message context controls QA.');
requireTrue(String(report.public_repo_rule || '').includes('no prompts'), 'D222 report must preserve public no prompt/no secret boundary.');
for (const id of ['memory-toggle', 'knowledge-toggle', 'visible-controls', 'deferred-ui']) {
  const scenario = (report.scenarios || []).find((item) => item.id === id);
  requireTrue(scenario?.status === 'ready', `D222 report scenario ${id} must be ready.`);
  requireTrue(scenario?.no_paid_routes_started === true, `D222 report scenario ${id} must not start paid routes.`);
}

requireIncludes(files.mmir, './apps/mimir-chat-portal/context-controls.js', 'D222 context controls must load through deferred queue.');
for (const needle of [
  'CONTEXT_CONTROLS_PREFIX',
  'function contextControls',
  'contextControls().memory===false',
  'contextControls().knowledge===false'
]) {
  requireIncludes(files.chatRuntime, needle, `D222 chat runtime missing context-control guard: ${needle}`);
}
for (const needle of [
  'runtime-context-controls',
  'runtime-context-memory',
  'runtime-context-knowledge',
  'mmir-context-controls-updated',
  'no_paid_routes_started:true'
]) {
  requireIncludes(files.contextControls, needle, `D222 context-controls UI missing contract: ${needle}`);
}
for (const needle of [
  '.runtime-context-controls',
  '.runtime-context-controls input:focus-visible'
]) {
  requireIncludes(files.chatRuntimeCss, needle, `D222 CSS missing context-control styling: ${needle}`);
}

const enabled = runRuntimeControlFixture({});
requireTrue(enabled.memory.includes('User-governed memory'), 'D222 enabled fixture must include memory.');
requireTrue(enabled.knowledge.includes('Relevant local knowledge'), 'D222 enabled fixture must include knowledge.');
requireTrue(enabled.memoryUse.length === 1, 'D222 enabled fixture must write memory-use review.');

const memoryOff = runRuntimeControlFixture({ memory: false, knowledge: true });
requireTrue(memoryOff.memory === '', 'D222 memory-off fixture must suppress local memory instruction.');
requireTrue(memoryOff.knowledge.includes('Relevant local knowledge'), 'D222 memory-off fixture must keep knowledge enabled.');
requireTrue(memoryOff.memoryUse.length === 0, 'D222 memory-off fixture must clear memory-use review.');

const knowledgeOff = runRuntimeControlFixture({ memory: true, knowledge: false });
requireTrue(knowledgeOff.memory.includes('User-governed memory'), 'D222 knowledge-off fixture must keep memory enabled.');
requireTrue(knowledgeOff.knowledge === '', 'D222 knowledge-off fixture must suppress local knowledge instruction.');

requireIncludes(files.progressDashboard, 'renderContextControlsReport', 'Progress Dashboard must render D222 context controls evidence.');
requireIncludes(files.qualityWorkflow, 'smoke-check-context-controls.js', 'Quality workflow must run D222 context controls QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-context-controls.js', 'Pages workflow must run D222 context controls QA.');
requireIncludes(files.backlog, '| D223 |', 'Backlog must keep a next sequential work item after D222.');

const progress = json(files.progressData);
requireTrue(progress.context_controls_report?.title === report.title, 'Progress dashboard data must embed D222 context controls report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d222 = tasks.find((task) => task.seq === 'D222');
const d237 = tasks.find((task) => task.seq === 'D243');
requireTrue(d222?.status === 'beta', 'Progress dashboard task D222 must be beta after context controls ship.');
requireTrue(d237?.status === 'next', 'Progress dashboard task D243 must become next after D236 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D243', 'Progress dashboard next queue must prioritize D243 after D236 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Context controls smoke check passed.');
}
