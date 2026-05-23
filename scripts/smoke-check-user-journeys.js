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
  parity: join(publicDir, 'gui-parity-matrix.json'),
  starters: join(publicDir, 'free-model-starters.json'),
  catalog: join(publicDir, 'ai-model-catalog.json'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  portal: join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.js'),
  onboarding: join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.js'),
  templates: join(publicDir, 'apps', 'mimir-chat-portal', 'use-case-templates.js'),
  freeValueLoops: join(publicDir, 'apps', 'mimir-chat-portal', 'free-value-loops.js'),
  conversationManager: join(publicDir, 'apps', 'mimir-chat-portal', 'conversation-manager.js'),
  apiClient: join(publicDir, 'apps', 'mimir-chat-portal', 'api-client.js'),
  privacyControls: join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'),
  promptRegistry: join(publicDir, 'apps', 'mimir-chat-portal', 'prompt-registry.js'),
  memory: join(publicDir, 'apps', 'mimir-chat-portal', 'memory.js'),
  knowledge: join(publicDir, 'apps', 'mimir-chat-portal', 'knowledge.js'),
  comparison: join(publicDir, 'apps', 'mimir-chat-portal', 'model-comparison.js'),
  webSearch: join(publicDir, 'apps', 'mimir-chat-portal', 'web-search.js'),
  toolRunner: join(publicDir, 'apps', 'mimir-chat-portal', 'tool-runner.js'),
  codeSandbox: join(publicDir, 'apps', 'mimir-chat-portal', 'code-sandbox.js'),
  artifactWorkspace: join(publicDir, 'apps', 'mimir-chat-portal', 'artifact-workspace.js'),
  imageBoundary: join(publicDir, 'apps', 'mimir-chat-portal', 'image-boundary.js'),
  voiceControls: join(publicDir, 'apps', 'mimir-chat-portal', 'voice-controls.js'),
  visionInput: join(publicDir, 'apps', 'mimir-chat-portal', 'vision-input.js'),
  adminGovernance: join(publicDir, 'apps', 'mimir-chat-portal', 'admin-governance.js'),
  accessControl: join(publicDir, 'apps', 'mimir-chat-portal', 'access-control.js'),
  runtimeSettings: join(publicDir, 'apps', 'mimir-chat-portal', 'runtime-settings.js'),
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
requireIncludes(files.templates, 'repo-analysis', 'D120 needs a repo analysis use-case template.');
requireIncludes(files.templates, 'product-plan', 'D120 needs a product planning use-case template.');
requireIncludes(files.templates, 'security-review', 'D120 needs a security review use-case template.');
requireIncludes(files.templates, 'model-comparison', 'D120 needs a model comparison use-case template.');
requireIncludes(files.templates, 'workflow-planning', 'D120 needs a workflow planning use-case template.');
requireIncludes(files.freeValueLoops, 'free-chat', 'D121 needs free chat loop.');
requireIncludes(files.freeValueLoops, 'local-model', 'D121 needs free local model loop.');
requireIncludes(files.freeValueLoops, 'compare-models', 'D121 needs free comparison loop.');
requireIncludes(files.freeValueLoops, 'memory-loop', 'D121 needs free memory loop.');
requireIncludes(files.freeValueLoops, 'knowledge-loop', 'D121 needs free document/knowledge loop.');
requireIncludes(files.mmir, 'id="gui-parity"', 'D126 needs a visible ChatGPT/Open WebUI parity matrix.');
requireIncludes(files.parity, 'ChatGPT-like chat', 'D126 needs ChatGPT-like feature grouping.');
requireIncludes(files.parity, 'Open WebUI-like model control', 'D126 needs Open WebUI-like feature grouping.');
requireIncludes(files.parity, 'MMIR orchestration layer', 'D126 needs MMIR-specific orchestration grouping.');
requireIncludes(files.parity, '"blocked"', 'D126 must truthfully show blocked unsafe features.');
requireIncludes(files.conversationManager, 'Save / rename', 'D127 needs save/rename conversation controls.');
requireIncludes(files.conversationManager, 'Archive', 'D127 needs archive controls.');
requireIncludes(files.conversationManager, 'Pin', 'D127 needs pin controls.');
requireIncludes(files.conversationManager, 'Search saved chats', 'D127 needs search controls.');
requireIncludes(files.conversationManager, 'Fork', 'D127 needs fork controls.');
requireIncludes(files.conversationManager, 'Safe share', 'D127 needs redacted safe-share controls.');
requireIncludes(files.knowledge, 'knowledge-dropzone', 'D128 needs drag/drop file staging.');
requireIncludes(files.knowledge, 'MAX_FILE_BYTES', 'D128 needs explicit file size limits.');
requireIncludes(files.knowledge, 'knowledge-preview-list', 'D128 needs file previews before indexing.');
requireIncludes(files.knowledge, 'COLLECTIONS_PREFIX', 'D129 needs local knowledge collection storage.');
requireIncludes(files.knowledge, 'knowledge-collection-name', 'D129 needs collection naming in the knowledge UI.');
requireIncludes(files.knowledge, 'data-collection-toggle', 'D129 needs enable/disable controls for collections.');
requireIncludes(files.chatRuntime, 'COLLECTIONS_PREFIX', 'D129 needs chat context to respect enabled knowledge collections.');
requireIncludes(files.comparison, 'COLLECTIONS_PREFIX', 'D129 needs comparison context to respect enabled knowledge collections.');
requireIncludes(files.mmir, './apps/mimir-chat-portal/web-search.js', 'D130 needs explicit web search loaded on the product page.');
requireIncludes(files.webSearch, 'web-search-consent', 'D130 needs consent before search.');
requireIncludes(files.webSearch, 'manualSearchUrls', 'D130 needs a free manual search path.');
requireIncludes(files.webSearch, '/web/search', 'D130 needs protected backend search route support.');
requireIncludes(files.webSearch, 'saveLocalSources', 'D130 needs selected sources saved into local knowledge.');
requireIncludes(files.mmir, './apps/mimir-chat-portal/tool-runner.js', 'D131 needs permissioned tool runner loaded on the product page.');
requireIncludes(files.toolRunner, '/tools/execute', 'D131 needs protected backend tool execution route support.');
requireIncludes(files.toolRunner, 'tool-runner-consent', 'D131 needs explicit tool consent.');
requireIncludes(files.toolRunner, 'renderTrace', 'D131 needs visible tool traces.');
requireIncludes(files.mmir, './apps/mimir-chat-portal/code-sandbox.js', 'D132 needs code sandbox preflight loaded on the product page.');
requireIncludes(files.codeSandbox, '/code/sandbox/plan', 'D132 needs protected sandbox planning route support.');
requireIncludes(files.codeSandbox, 'localPlan', 'D132 needs a free browser preflight fallback.');
requireIncludes(files.codeSandbox, 'execution_allowed:false', 'D132 must not execute code from the public page.');
requireIncludes(files.mmir, './apps/mimir-chat-portal/artifact-workspace.js', 'D133 needs artifact workspace loaded on the product page.');
requireIncludes(files.artifactWorkspace, 'ARTIFACT_PREFIX', 'D133 needs local artifact persistence per workspace.');
requireIncludes(files.artifactWorkspace, 'defaultArtifact', 'D133 needs an automatic first artifact.');
requireIncludes(files.artifactWorkspace, 'sendToChat', 'D133 needs artifact-to-chat handoff.');
requireIncludes(files.mmir, './apps/mimir-chat-portal/image-boundary.js', 'D134 needs image boundary loaded on the product page.');
requireIncludes(files.imageBoundary, 'generation_enabled:false', 'D134 must keep public image generation disabled.');
requireIncludes(files.imageBoundary, 'estimated_cost_usd:0', 'D134 must keep image route planning free by default.');
requireIncludes(files.imageBoundary, 'Protected paid provider', 'D134 must label protected paid-provider routes.');
requireIncludes(files.mmir, './apps/mimir-chat-portal/voice-controls.js', 'D135 needs voice controls loaded on the product page.');
requireIncludes(files.voiceControls, 'startDictation', 'D135 needs push-to-talk dictation.');
requireIncludes(files.voiceControls, 'speechSynthesis', 'D135 needs read-aloud.');
requireIncludes(files.voiceControls, 'mimir-voice-settings-v1', 'D135 needs local voice settings.');
requireIncludes(files.mmir, './apps/mimir-chat-portal/vision-input.js', 'D136 needs vision input loaded on the product page.');
requireIncludes(files.visionInput, 'handlePasteImage', 'D136 needs pasted screenshot support.');
requireIncludes(files.visionInput, 'looksVisionCapable', 'D136 needs model capability gating.');
requireIncludes(files.visionInput, 'raw_image_sent:false', 'D136 must not send raw images from the public page.');
requireIncludes(files.mmir, './apps/mimir-chat-portal/admin-governance.js', 'D137 needs admin governance loaded on the product page.');
requireIncludes(files.adminGovernance, '/admin/overview', 'D137 needs protected admin overview support.');
requireIncludes(files.adminGovernance, 'browser-local-fallback', 'D137 needs browser-local admin fallback.');
requireIncludes(files.adminGovernance, 'provider_keys_browser_allowed:false', 'D137 must keep provider keys blocked in browser.');
requireIncludes(files.mmir, './apps/mimir-chat-portal/access-control.js', 'D138 needs access control loaded on the product page.');
requireIncludes(files.accessControl, '/access/policies', 'D138 needs protected access policy support.');
requireIncludes(files.accessControl, '/access/check', 'D138 needs protected access decision support.');
requireIncludes(files.accessControl, 'rbac-beta-fail-closed', 'D138 needs fail-closed RBAC mode.');
requireIncludes(files.accessControl, 'server_side_enforcement_required:true', 'D138 must keep runtime enforcement server-side.');
requireIncludes(files.mmir, './apps/mimir-chat-portal/runtime-settings.js', 'D139 needs runtime settings loaded on the product page.');
requireIncludes(files.runtimeSettings, 'mimir-runtime-settings-v1', 'D139 needs persisted safe runtime settings.');
requireIncludes(files.runtimeSettings, 'runtime-max-tokens', 'D139 needs max token controls.');
requireIncludes(files.runtimeSettings, 'runtime-context-length', 'D139 needs context length controls.');
requireIncludes(files.runtimeSettings, 'runtime-system-prompt', 'D139 needs bounded system prompt controls.');
requireIncludes(files.chatRuntime, 'runtimePayload', 'D139 needs chat runtime to send settings to backend/local node routes.');
requireIncludes(files.chatRuntime, 'runtimeInstruction', 'D139 needs custom system prompt injection through safe system context.');
requireIncludes(files.promptRegistry, 'mimir-prompts-v1:', 'D140 needs free local prompt library fallback.');
requireIncludes(files.promptRegistry, 'starter-repo-review', 'D140 needs reusable prompt starters.');
requireIncludes(files.promptRegistry, 'prompt-registry-tags', 'D140 needs prompt tags.');
requireIncludes(files.promptRegistry, 'prompt-registry-variables', 'D140 needs prompt variables.');
requireIncludes(files.promptRegistry, 'applyVariables', 'D140 needs variable quick insertion.');
requireIncludes(files.memory, 'memory-scope', 'D143 needs user-controlled memory scope.');
requireIncludes(files.memory, 'memory-expires', 'D143 needs memory expiration controls.');
requireIncludes(files.memory, 'memory-import-notes', 'D143 needs notes/import controls.');
requireIncludes(files.memory, 'mimir-memory-use-v1:', 'D143 needs visible memory-use review data.');
requireIncludes(files.chatRuntime, 'why_used', 'D143 needs backend memory-use reasons preserved in chat context.');
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
for (const id of ['D001', 'D023', 'D082', 'D099', 'D104', 'D106', 'D107', 'D119', 'D120', 'D121', 'D126', 'D127', 'D128', 'D129', 'D130', 'D131', 'D132', 'D133', 'D134', 'D135', 'D136', 'D137', 'D138', 'D139', 'D140', 'D141', 'D143']) {
  if (!tasks.some((task) => task.seq === id)) {
    fail(`Progress dashboard must expose delivery task ${id}.`);
  }
}

if (!process.exitCode) {
  console.log('User journey smoke check passed.');
}
