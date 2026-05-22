import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const docsDir = resolve(root, 'docs');

const files = {
  index: join(publicDir, 'index.html'),
  journeys: join(publicDir, 'user-journeys.json'),
  progress: join(publicDir, 'progress-dashboard.json'),
  starters: join(publicDir, 'free-model-starters.json'),
  catalog: join(publicDir, 'ai-model-catalog.json'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  portal: join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.js'),
  apiClient: join(publicDir, 'apps', 'mimir-chat-portal', 'api-client.js'),
  modelComparison: join(publicDir, 'apps', 'mimir-chat-portal', 'model-comparison.js'),
  privacyControls: join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'),
  memory: join(publicDir, 'apps', 'mimir-chat-portal', 'memory.js'),
  knowledge: join(publicDir, 'apps', 'mimir-chat-portal', 'knowledge.js'),
  workflowBuilder: join(publicDir, 'apps', 'mimir-chat-portal', 'workflow-builder.js'),
  windowsInstaller: join(publicDir, 'downloads', 'mmir-local-node-windows.ps1'),
  unixInstaller: join(publicDir, 'downloads', 'mmir-local-node-macos-linux.sh'),
  userJourneyDoc: join(docsDir, 'MMIR_USER_JOURNEYS.md'),
  backlog: join(docsDir, 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing required journey file: ${file}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function json(file) {
  try {
    return JSON.parse(text(file));
  } catch (error) {
    fail(`Invalid JSON for journey smoke check: ${file}`);
    return {};
  }
}

function requireIncludes(file, needle, message) {
  if (!text(file).includes(needle)) {
    fail(message);
  }
}

function requireJourney(journeys, id, expectedStatus) {
  const journey = journeys.find((item) => item.id === id);
  if (!journey) {
    fail(`Missing journey ${id}.`);
    return null;
  }
  if (expectedStatus && journey.status !== expectedStatus) {
    fail(`Journey ${id} should be ${expectedStatus}, got ${journey.status}.`);
  }
  if (!journey.user_goal || !journey.trust_boundary || !journey.done_when || !journey.cost) {
    fail(`Journey ${id} is missing goal, trust boundary, done_when or cost.`);
  }
  return journey;
}

function requireModel(models, id, predicate, message) {
  const model = models.find((item) => item.id === id);
  if (!model || !predicate(model)) {
    fail(message);
  }
}

const journeyData = json(files.journeys);
const journeys = Array.isArray(journeyData.journeys) ? journeyData.journeys : [];
if (!String(journeyData.public_repo_rule || '').includes('inkognitroz.github.io is public')) {
  fail('Journey manifest must keep the public repo secrecy boundary explicit.');
}

const j001 = requireJourney(journeys, 'J001', 'live');
const j002 = requireJourney(journeys, 'J002', 'beta');
requireJourney(journeys, 'J003', 'beta');
requireJourney(journeys, 'J004', 'beta');
requireJourney(journeys, 'J005', 'beta');
requireJourney(journeys, 'J006', 'beta');
requireJourney(journeys, 'J007', 'live');
requireJourney(journeys, 'J008', 'blocked');
requireJourney(journeys, 'J009', 'planned');
requireJourney(journeys, 'J010', 'premium planned');

if (!j001?.free_first?.toLowerCase().includes('free browser guide')) {
  fail('J001 must explicitly use the free browser guide route.');
}
if (!j002?.trust_boundary?.includes('127.0.0.1')) {
  fail('J002 must stay inside browser -> paired local node -> local runtime.');
}

requireIncludes(files.portal, 'ensureAutomaticDefaults();render();', 'J001/J002 need automatic first-run defaults.');
requireIncludes(files.portal, 'blockedByFreeMode', 'J003/J008 need free-first backend guardrails.');
requireIncludes(files.portal, 'local pairing token only', 'Public UI must never ask users to paste real provider keys.');
requireIncludes(files.chatRuntime, 'function preferredStarterModel()', 'J001 needs a deterministic first selected model.');
requireIncludes(files.chatRuntime, "model.id==='mmir-guide'", 'J001 must prefer MMIR Guide before setup.');
requireIncludes(files.chatRuntime, '/chat/completions', 'J002/J004 need the shared chat completions contract.');
requireIncludes(files.chatRuntime, 'pairIfNeeded(profile,url)', 'J002/J003 need explicit pairing before protected local routes.');
requireIncludes(files.chatRuntime, 'installable free local', 'J002 needs visible installable-free local model guidance.');
requireIncludes(files.apiClient, "headers:{'Content-Type':'application/json'}", 'Pairing requests must send explicit JSON content type.');
requireIncludes(files.modelComparison, '/chat/completions', 'J004 comparison must use the same shared chat contract.');
requireIncludes(files.memory, 'mimir-memory-v1:', 'J005 needs workspace memory storage.');
requireIncludes(files.knowledge, 'mimir-knowledge-v1:', 'J005 needs workspace knowledge storage.');
requireIncludes(files.privacyControls, 'export', 'J005 needs local data export controls.');
requireIncludes(files.privacyControls, 'delete', 'J005 needs local data delete controls.');
requireIncludes(files.workflowBuilder, 'workflow-builder-root', 'J006 needs visible workflow builder surface.');
requireIncludes(files.index, 'id="progress-dashboard"', 'J007 needs progress dashboard entrypoint.');
requireIncludes(files.index, 'id="platform-status"', 'J007 needs platform status entrypoint.');
requireIncludes(files.userJourneyDoc, 'free-first', 'Journey docs must preserve the free-first rule.');
requireIncludes(files.backlog, '| D106 | QA / Journey Gates', 'Backlog must include journey-level smoke tests.');

const starters = json(files.starters);
const starterModels = Array.isArray(starters.models) ? starters.models : [];
requireModel(starterModels, 'mmir-guide', (model) => model.runtime === 'browser-guide' && model.status === 'live-browser', 'J001 needs live browser guide starter.');
requireModel(starterModels, 'webllm-qwen25-05b', (model) => model.runtime === 'webllm' && model.cost === 'free browser', 'J001 needs a real free browser WebGPU model option.');
requireModel(starterModels, 'ollama-qwen3-06b', (model) => model.runtime === 'ollama' && model.status === 'installable-free', 'J002 needs Qwen3 local install path.');
requireModel(starterModels, 'ollama-granite33-2b', (model) => model.runtime === 'ollama' && model.status === 'installable-free', 'J002 needs Granite local install path.');
requireModel(starterModels, 'ollama-codegemma-2b', (model) => model.runtime === 'ollama' && model.status === 'installable-free', 'J002 needs CodeGemma local install path.');

const catalog = json(files.catalog);
const catalogModels = Array.isArray(catalog.models) ? catalog.models : [];
requireModel(catalogModels, 'paid-frontier-api', (model) => model.status === 'requires-backend-router' && model.access === 'paid', 'J008 must keep paid frontier API blocked behind protected backend routing.');
requireModel(catalogModels, 'nomic-embed-text', (model) => model.status === 'requires-rag-pipeline', 'J005 RAG path must distinguish embeddings from chat models.');
requireModel(catalogModels, 'llava', (model) => model.status === 'requires-backend-router', 'J010/J009 multimodal routes must stay behind protected backend handling.');

const progress = json(files.progress);
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d106 = tasks.find((task) => task.seq === 'D106');
if (!d106 || d106.status !== 'done') {
  fail('Progress dashboard must expose D106 as a completed journey gate.');
}

requireIncludes(files.windowsInstaller, 'install\\mmir-install.ps1', 'Windows bootstrap must delegate to the full local-node installer.');
requireIncludes(files.windowsInstaller, '$env:MMIR_MODEL = $Model', 'Windows bootstrap must pass selected model into the installer.');
requireIncludes(files.unixInstaller, './install/mmir-install.sh', 'Mac/Linux bootstrap must delegate to the full local-node installer.');
requireIncludes(files.unixInstaller, 'export MMIR_MODEL="$MODEL"', 'Mac/Linux bootstrap must pass selected model into the installer.');

if (!process.exitCode) {
  console.log('User journey smoke check passed.');
}
