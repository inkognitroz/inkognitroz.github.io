import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const docsDir = resolve(root, 'docs');

const files = {
  index: join(publicDir, 'index.html'),
  mmir: join(publicDir, 'mmir.html'),
  journeys: join(publicDir, 'user-journeys.json'),
  progress: join(publicDir, 'progress-dashboard.json'),
  starters: join(publicDir, 'free-model-starters.json'),
  catalog: join(publicDir, 'ai-model-catalog.json'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  portal: join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.js'),
  onboarding: join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.js'),
  apiClient: join(publicDir, 'apps', 'mimir-chat-portal', 'api-client.js'),
  privacyControls: join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'),
  localConnector: join(publicDir, 'apps', 'mimir-chat-portal', 'local-connector.js'),
  nodeDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.js'),
  firstImpression: join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js'),
  universalInstaller: join(publicDir, 'downloads', 'mmir-local-connector-install.html'),
  linuxConnectorInstaller: join(publicDir, 'downloads', 'mmir-local-connector-linux.sh'),
  productDoctrine: join(docsDir, 'MMIR_PRODUCT_DOCTRINE.md'),
  architectureBaseline: join(docsDir, 'MMIR_ARCHITECTURE_BASELINE.md'),
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
  } catch {
    fail(`Invalid JSON for journey smoke check: ${file}`);
    return {};
  }
}

function requireIncludes(file, needle, message) {
  if (!text(file).includes(needle)) {
    fail(message);
  }
}

function forbidIncludes(file, needle, message) {
  if (text(file).includes(needle)) {
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

requireIncludes(files.index, 'MMIR', 'Homepage must keep MMIR as the top-level product identity.');
requireIncludes(files.index, './mmir.html#mimir-instant-start', 'Homepage must send users into the MMIR first journey.');
forbidIncludes(files.index, 'SaaS Fabric', 'Homepage must not expose retired branding.');

const journeyData = json(files.journeys);
const journeys = Array.isArray(journeyData.journeys) ? journeyData.journeys : [];
if (!String(journeyData.public_repo_rule || '').includes('inkognitroz.github.io is public')) {
  fail('Journey manifest must keep the public repo secrecy boundary explicit.');
}
if (!String(journeyData.positioning || '').includes('the orchestration layer for trusted AI')) {
  fail('Journey manifest must position MMIR as the orchestration layer for trusted AI.');
}
if (!Array.isArray(journeyData.principles) || !journeyData.principles.some((item) => String(item).includes('One perfect first local AI experience'))) {
  fail('Journey manifest must prioritize the first magical local AI experience.');
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
if (!j002?.user_goal?.includes('Open mmir.ai, connect local AI, install')) {
  fail('J002 must encode the ground-zero local AI activation journey.');
}

requireIncludes(files.productDoctrine, 'MMIR is the orchestration layer for trusted AI.', 'Product doctrine must define MMIR true identity.');
requireIncludes(files.productDoctrine, 'an Ollama wrapper', 'Product doctrine must reject the Ollama-wrapper framing.');
requireIncludes(files.architectureBaseline, 'MMIR is the orchestration layer for trusted AI', 'Architecture baseline must use the control-plane identity.');
requireIncludes(files.architectureBaseline, 'model runtime execution', 'Architecture baseline must keep runtime ownership out of the frontend.');
requireIncludes(files.mmir, 'The orchestration layer for trusted AI.', 'MMIR product page hero must state the product identity.');
requireIncludes(files.mmir, 'Connect local AI', 'MMIR product page must expose the ground-zero local AI action.');
requireIncludes(files.firstImpression, 'Open. Connect local AI. Ready.', 'First impression needs the ground-zero activation promise.');
requireIncludes(files.portal, 'ensureAutomaticDefaults();render();', 'J001/J002 need automatic first-run defaults.');
requireIncludes(files.portal, 'local pairing token only', 'Public UI must never ask users to paste real provider keys.');
requireIncludes(files.onboarding, 'mimir-user-intent-v1', 'D119 needs optional persisted onboarding intent.');
requireIncludes(files.onboarding, 'Developer', 'D119 needs a developer path.');
requireIncludes(files.onboarding, 'Business owner', 'D119 needs a business owner path.');
requireIncludes(files.onboarding, 'Power user', 'D119 needs an AI power-user path.');
requireIncludes(files.onboarding, 'Privacy / local', 'D119 needs a privacy/local path.');
requireIncludes(files.chatRuntime, "model.id==='mmir-guide'", 'J001 must prefer MMIR Guide before setup.');
requireIncludes(files.chatRuntime, 'const liveValues=(models||[]).map', 'J002 must auto-select live backend models when they exist.');
requireIncludes(files.chatRuntime, 'the orchestration layer for trusted AI', 'Live model default context must position MMIR correctly.');
requireIncludes(files.chatRuntime, '/chat/completions', 'J002/J004 need the shared chat completions contract.');
requireIncludes(files.apiClient, "headers:{'Content-Type':'application/json'}", 'Pairing requests must send explicit JSON content type.');
requireIncludes(files.localConnector, '/tunnels/status', 'J002/J009 need live local tunnel status.');
requireIncludes(files.localConnector, '/tunnels/trycloudflare/start', 'J002/J009 need a real tunnel start route.');
requireIncludes(files.nodeDashboard, '/pairing/sessions', 'J009 needs local approval codes before cross-device node pairing.');
requireIncludes(files.privacyControls, 'export', 'J005 needs local data export controls.');
requireIncludes(files.privacyControls, 'delete', 'J005 needs local data delete controls.');
requireIncludes(files.privacyControls, 'privacy-data-inventory', 'J005/D118 needs a visible data inventory.');
requireIncludes(files.privacyControls, 'Provider keys and cloud credentials', 'J005/D118 must make the public frontend secrecy boundary visible.');
requireIncludes(files.privacyControls, 'Clear pairing tokens', 'J009/D118 needs a safe way to clear temporary local node pairing tokens.');
requireIncludes(files.universalInstaller, 'Raspberry Pi / Linux ARM', 'J002 must offer Raspberry Pi/Linux ARM in the universal installer.');
requireIncludes(files.linuxConnectorInstaller, 'raspberry-pi', 'J002/J009 Linux installer must detect Raspberry Pi edge nodes.');
requireIncludes(files.userJourneyDoc, 'free-first', 'Journey docs must preserve the free-first rule.');
requireIncludes(files.backlog, '| D106 | QA / Journey Gates', 'Backlog must include journey-level smoke tests.');

const starters = json(files.starters);
const starterModels = Array.isArray(starters.models) ? starters.models : [];
requireModel(starterModels, 'mmir-guide', (model) => model.runtime === 'browser-guide' && model.status === 'live-browser', 'J001 needs live browser guide starter.');
requireModel(starterModels, 'ollama-qwen3-06b', (model) => model.runtime === 'ollama' && model.status === 'installable-free', 'J002 needs Qwen3 local install path.');

const catalog = json(files.catalog);
const catalogModels = Array.isArray(catalog.models) ? catalog.models : [];
requireModel(catalogModels, 'paid-frontier-api', (model) => model.status === 'requires-backend-router' && model.access === 'paid', 'J008 must keep paid frontier API blocked behind protected backend routing.');
requireModel(catalogModels, 'nomic-embed-text', (model) => model.status === 'requires-rag-pipeline', 'J005 RAG path must distinguish embeddings from chat models.');

const progress = json(files.progress);
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
for (const id of ['D001', 'D023', 'D082', 'D099', 'D104', 'D106', 'D107', 'D119']) {
  if (!tasks.some((task) => task.seq === id)) {
    fail(`Progress dashboard must expose delivery task ${id}.`);
  }
}

if (!process.exitCode) {
  console.log('User journey smoke check passed.');
}
