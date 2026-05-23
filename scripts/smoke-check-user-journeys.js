import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const docsDir = resolve(root, 'docs');

const files = {
  index: join(publicDir, 'index.html'),
  mmir: join(publicDir, 'mmir.html'),
  journeys: join(publicDir, 'user-journeys.json'),
  progress: join(publicDir, 'progress-dashboard.json'),
  activationSimulator: join(publicDir, 'activation-simulator-fixtures.json'),
  parity: join(publicDir, 'gui-parity-matrix.json'),
  webManifest: join(publicDir, 'manifest.webmanifest'),
  serviceWorker: join(publicDir, 'sw.js'),
  offline: join(publicDir, 'offline.html'),
  starters: join(publicDir, 'free-model-starters.json'),
  catalog: join(publicDir, 'ai-model-catalog.json'),
  modelCatalogUi: join(publicDir, 'apps', 'mimir-chat-portal', 'model-catalog-ui.js'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  chatRuntimeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
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
  researchPlanner: join(publicDir, 'apps', 'mimir-chat-portal', 'research-planner.js'),
  assistantBuilder: join(publicDir, 'apps', 'mimir-chat-portal', 'assistant-builder.js'),
  toolRunner: join(publicDir, 'apps', 'mimir-chat-portal', 'tool-runner.js'),
  codeSandbox: join(publicDir, 'apps', 'mimir-chat-portal', 'code-sandbox.js'),
  artifactWorkspace: join(publicDir, 'apps', 'mimir-chat-portal', 'artifact-workspace.js'),
  imageBoundary: join(publicDir, 'apps', 'mimir-chat-portal', 'image-boundary.js'),
  voiceControls: join(publicDir, 'apps', 'mimir-chat-portal', 'voice-controls.js'),
  visionInput: join(publicDir, 'apps', 'mimir-chat-portal', 'vision-input.js'),
  adminGovernance: join(publicDir, 'apps', 'mimir-chat-portal', 'admin-governance.js'),
  accessControl: join(publicDir, 'apps', 'mimir-chat-portal', 'access-control.js'),
  identityOrg: join(publicDir, 'apps', 'mimir-chat-portal', 'identity-org.js'),
  runtimeSettings: join(publicDir, 'apps', 'mimir-chat-portal', 'runtime-settings.js'),
  dataAnalysis: join(publicDir, 'apps', 'mimir-chat-portal', 'data-analysis.js'),
  scheduledTasks: join(publicDir, 'apps', 'mimir-chat-portal', 'scheduled-tasks.js'),
  connectorCatalog: join(publicDir, 'apps', 'mimir-chat-portal', 'connector-catalog.js'),
  pwa: join(publicDir, 'apps', 'mimir-chat-portal', 'pwa.js'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  progressDashboardCss: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.css'),
  activationTelemetry: join(publicDir, 'apps', 'mimir-chat-portal', 'activation-telemetry.js'),
  activationAutopilot: join(publicDir, 'apps', 'mimir-chat-portal', 'activation-autopilot.js'),
  migration: join(publicDir, 'apps', 'mimir-chat-portal', 'migration-portability.js'),
  sharing: join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'),
  runtimeControlsFix: join(publicDir, 'apps', 'mimir-chat-portal', 'runtime-controls-fix.js'),
  localConnector: join(publicDir, 'apps', 'mimir-chat-portal', 'local-connector.js'),
  nodeDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.js'),
  nodeDashboardCss: join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.css'),
  repairResumeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'repair-resume.css'),
  firstImpression: join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js'),
  firstScreenHydration: join(publicDir, 'apps', 'mimir-chat-portal', 'first-screen-activation-hydration.js'),
  universalInstaller: join(publicDir, 'downloads', 'mmir-local-connector-install.html'),
  connectorRelease: join(publicDir, 'downloads', 'mmir-local-connector-release.json'),
  connectorServer: join(publicDir, 'downloads', 'mmir-local-connector-server.mjs'),
  linuxConnectorInstaller: join(publicDir, 'downloads', 'mmir-local-connector-linux.sh'),
  repairCardHarness: join(root, 'scripts', 'smoke-check-node-repair-cards.js'),
  simulatorHarness: join(root, 'scripts', 'smoke-check-activation-simulator.js'),
  replayRenderHarness: join(root, 'scripts', 'smoke-check-activation-replay-render.js'),
  routeMapHarness: join(root, 'scripts', 'smoke-check-activation-route-map.js'),
  activationClosureHarness: join(root, 'scripts', 'smoke-check-activation-closure.js'),
  firstScreenClosureHarness: join(root, 'scripts', 'smoke-check-first-screen-activation-closure.js'),
  deviceStarterHarness: join(root, 'scripts', 'smoke-check-device-starter-recommendation.js'),
  starterTelemetryHarness: join(root, 'scripts', 'smoke-check-recommended-starter-telemetry.js'),
  criticalShellHarness: join(root, 'scripts', 'smoke-check-critical-shell-headroom.js'),
  starterFunnelHarness: join(root, 'scripts', 'smoke-check-starter-to-proof-funnel.js'),
  starterFunnelContinueHarness: join(root, 'scripts', 'smoke-check-starter-funnel-continue.js'),
  firstScreenStarterFunnelHarness: join(root, 'scripts', 'smoke-check-first-screen-starter-funnel.js'),
  firstScreenStarterContinueHarness: join(root, 'scripts', 'smoke-check-first-screen-starter-funnel-continue.js'),
  recommendedStarterFocusHarness: join(root, 'scripts', 'smoke-check-recommended-starter-model-focus.js'),
  recommendedStarterHandoffHarness: join(root, 'scripts', 'smoke-check-recommended-starter-install-handoff.js'),
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

function sha256File(file) {
  const rel = relative(root, file).replace(/\\/g, '/');
  const blob = spawnSync('git', ['show', `HEAD:${rel}`], { encoding: null });
  if (blob.status === 0 && blob.stdout?.length) {
    return createHash('sha256').update(blob.stdout).digest('hex');
  }
  return createHash('sha256').update(readFileSync(file)).digest('hex');
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
requireIncludes(files.mmir, 'mimir-nav-more', 'D042 needs calmer first-screen navigation with secondary controls grouped.');
requireIncludes(files.chatRuntime, 'Loading free model routes', 'D042 chat runtime must load free route choices before local-node checks.');
requireIncludes(files.portal, 'ensureAutomaticDefaults();render();', 'J001/J002 need automatic first-run defaults.');
requireIncludes(files.portal, 'local pairing token only', 'Public UI must never ask users to paste real provider keys.');
requireIncludes(files.onboarding, 'mimir-user-intent-v1', 'D119 needs optional persisted onboarding intent.');
requireIncludes(files.onboarding, 'Developer', 'D119 needs a developer path.');
requireIncludes(files.onboarding, 'Business owner', 'D119 needs a business owner path.');
requireIncludes(files.onboarding, 'Power user', 'D119 needs an AI power-user path.');
requireIncludes(files.onboarding, 'Privacy / local', 'D119 needs a privacy/local path.');
requireIncludes(files.onboarding, 'recoverFirstChat', 'D167 first-run gates need a first-chat recovery action.');
requireIncludes(files.onboarding, 'First chat receipt', 'D167 first-run gates must show first-chat receipt state.');
requireIncludes(files.onboarding, 'mmir-first-chat-receipt-updated', 'D167 first-run gates must refresh when receipt state changes.');
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
requireIncludes(files.mmir, './apps/mimir-chat-portal/research-planner.js', 'D144 needs research planning loaded on the product page.');
requireIncludes(files.researchPlanner, '/research/plans', 'D144 needs protected research plan route support.');
requireIncludes(files.researchPlanner, 'mimir-research-plans-v1:', 'D144 needs workspace-local research plan storage.');
requireIncludes(files.researchPlanner, 'research-consent', 'D144 needs explicit planning consent.');
requireIncludes(files.researchPlanner, 'approval_gates', 'D144 needs visible approval gates before browsing.');
requireIncludes(files.researchPlanner, 'citation_rule', 'D144 needs citation requirements in the plan.');
requireIncludes(files.mmir, './apps/mimir-chat-portal/assistant-builder.js', 'D145 needs assistant builder loaded on the product page.');
requireIncludes(files.assistantBuilder, 'mimir-assistants-v1:', 'D145 needs free local assistant storage.');
requireIncludes(files.assistantBuilder, '/assistants', 'D145 needs protected assistant route support.');
requireIncludes(files.assistantBuilder, 'assistant-knowledge-mode', 'D145 needs per-assistant knowledge scope.');
requireIncludes(files.assistantBuilder, 'assistant-sharing', 'D145 needs sharing policy controls.');
requireIncludes(files.assistantBuilder, 'public frontend storage', 'D145 must keep public frontend secret boundaries visible.');
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
requireIncludes(files.mmir, './apps/mimir-chat-portal/identity-org.js', 'D155 needs identity/organization UI loaded on the product page.');
requireIncludes(files.identityOrg, '/identity/me', 'D155 needs protected identity principal route support.');
requireIncludes(files.identityOrg, '/identity/orgs', 'D155 needs protected organization list/create route support.');
requireIncludes(files.identityOrg, 'owner/admin', 'D155 needs owner/admin organization boundaries visible.');
requireIncludes(files.identityOrg, '/identity/sessions', 'D156 needs protected session token route support.');
requireIncludes(files.identityOrg, '/identity/invites', 'D156 needs protected invite route support.');
requireIncludes(files.identityOrg, 'Shown once', 'D156 needs one-time token/code display without public storage.');
requireIncludes(files.mmir, './apps/mimir-chat-portal/runtime-settings.js', 'D139 needs runtime settings loaded on the product page.');
requireIncludes(files.runtimeSettings, 'mimir-runtime-settings-v1', 'D139 needs persisted safe runtime settings.');
requireIncludes(files.runtimeSettings, 'runtime-max-tokens', 'D139 needs max token controls.');
requireIncludes(files.runtimeSettings, 'runtime-context-length', 'D139 needs context length controls.');
requireIncludes(files.runtimeSettings, 'runtime-system-prompt', 'D139 needs bounded system prompt controls.');
requireIncludes(files.chatRuntime, 'runtimePayload', 'D139 needs chat runtime to send settings to backend/local node routes.');
requireIncludes(files.chatRuntime, 'runtimeInstruction', 'D139 needs custom system prompt injection through safe system context.');
requireIncludes(files.mmir, './apps/mimir-chat-portal/data-analysis.js', 'D146 needs data analysis loaded on the product page.');
requireIncludes(files.dataAnalysis, 'mimir-data-analysis-v1:', 'D146 needs free local data analysis snapshots.');
requireIncludes(files.dataAnalysis, 'parseDelimited', 'D146 needs local CSV/TSV parsing.');
requireIncludes(files.dataAnalysis, 'renderSvgChart', 'D146 needs local chart rendering.');
requireIncludes(files.dataAnalysis, 'MAX_FILE_BYTES', 'D146 needs bounded input size.');
requireIncludes(files.mmir, './apps/mimir-chat-portal/scheduled-tasks.js', 'D147 needs scheduled tasks loaded on the product page.');
requireIncludes(files.scheduledTasks, 'mimir-scheduled-tasks-v1:', 'D147 needs local scheduled task storage.');
requireIncludes(files.scheduledTasks, "cost_policy:'free/local-only'", 'D147 needs explicit free/local-only cost policy.');
requireIncludes(files.scheduledTasks, 'function checkDue()', 'D147 needs due-task checks.');
requireIncludes(files.scheduledTasks, 'sendTaskToChat', 'D147 needs task-to-chat handoff.');
requireIncludes(files.mmir, './apps/mimir-chat-portal/connector-catalog.js', 'D148 needs connector catalog loaded on the product page.');
requireIncludes(files.connectorCatalog, 'mimir-connector-plans-v1:', 'D148 needs local connector plan storage.');
requireIncludes(files.connectorCatalog, '/connectors/catalog', 'D148 needs protected connector catalog route support.');
requireIncludes(files.connectorCatalog, '/connectors/sync-plans', 'D148 needs protected connector sync planning route support.');
requireIncludes(files.connectorCatalog, 'connectorCatalogFallback', 'D148 needs a free/manual fallback connector catalog.');
requireIncludes(files.connectorCatalog, 'revocation_supported', 'D148 needs connector revocation metadata.');
requireIncludes(files.connectorCatalog, 'public_frontend_secrets_allowed:false', 'D148 must block public frontend connector secrets.');
requireIncludes(files.mmir, './manifest.webmanifest', 'D149 needs a PWA manifest on the product page.');
requireIncludes(files.mmir, './apps/mimir-chat-portal/pwa.js', 'D149 needs PWA install flow loaded on the product page.');
requireIncludes(files.mmir, 'id="pwa-install"', 'D149 needs visible install/mobile panel.');
requireIncludes(files.webManifest, '"display": "standalone"', 'D149 manifest must be standalone-installable.');
requireIncludes(files.webManifest, '"start_url": "./mmir.html#mimir-instant-start"', 'D149 manifest must start at the MMIR first journey.');
requireIncludes(files.serviceWorker, 'CACHE_NAME', 'D149 service worker must define versioned cache.');
requireIncludes(files.serviceWorker, './offline.html', 'D149 service worker must cache offline fallback.');
requireIncludes(files.serviceWorker, "request.mode==='navigate'", 'D149 service worker must handle navigation fallback.');
requireIncludes(files.offline, 'MMIR is offline-ready', 'D149 needs an offline shell page.');
requireIncludes(files.pwa, 'beforeinstallprompt', 'D149 needs browser install prompt handling.');
requireIncludes(files.pwa, 'navigator.serviceWorker.register', 'D149 needs service worker registration.');
requireIncludes(files.pwa, 'openNode', 'D149 needs local-node handoff from mobile app shell.');
requireIncludes(files.mmir, './apps/mimir-chat-portal/migration-portability.js', 'D150 needs import/export portability loaded on the product page.');
requireIncludes(files.migration, 'mmir.portable_workspace', 'D150 needs MMIR portable workspace export.');
requireIncludes(files.migration, 'chatGptMessages', 'D150 needs ChatGPT export normalization.');
requireIncludes(files.migration, 'openWebUiMessages', 'D150 needs Open WebUI export normalization.');
requireIncludes(files.migration, 'redactSecretLike', 'D150 needs token-like redaction.');
requireIncludes(files.migration, 'redactedClone', 'D150 needs export-side token-like redaction.');
requireIncludes(files.migration, 'MAX_FILE_BYTES', 'D150 needs bounded browser import file size.');
requireIncludes(files.mmir, './apps/mimir-chat-portal/sharing-center.js', 'D152 needs safe sharing loaded on the product page.');
requireIncludes(files.sharing, 'mmir.safe_share_bundle', 'D152 needs a public-safe share bundle schema.');
requireIncludes(files.sharing, 'redactShareSecrets', 'D152 needs share redaction.');
requireIncludes(files.sharing, 'decodeShareHash', 'D152 needs preview-link decoding.');
requireIncludes(files.sharing, 'server_side_enforcement_required:true', 'D152 needs protected backend enforcement boundary.');
requireIncludes(files.sharing, 'mimir-share-bundles-v1:', 'D152 needs local share bundle inventory.');
requireIncludes(files.sharing, '/shares', 'D154 needs protected share save/list route support.');
requireIncludes(files.sharing, 'revokeProtectedShare', 'D154 needs protected share revocation from the UI.');
requireIncludes(files.sharing, 'sharing-save-backend', 'D154 needs save-to-protected-backend control.');
requireIncludes(files.sharing, 'sharing-org-id', 'D157 needs organization audience controls in Safe Sharing.');
requireIncludes(files.sharing, 'organization_membership_required', 'D157 needs visible organization membership enforcement evidence.');
requireIncludes(files.sharing, 'min_role', 'D157 needs minimum-role share audience support.');
requireIncludes(files.sharing, 'sharing-access-review', 'D158 needs visible share access review in Safe Sharing.');
requireIncludes(files.sharing, 'access-review', 'D158 needs protected share access review route support.');
requireIncludes(files.sharing, 'audience_summary', 'D158 needs audience summary rendering for protected shares.');
requireIncludes(files.sharing, 'sharing-recipient-share-id', 'D159 needs recipient share id input in Safe Sharing.');
requireIncludes(files.sharing, 'recipient-handoff', 'D159 needs protected recipient handoff route support.');
requireIncludes(files.sharing, 'session_token_returned_once', 'D159 needs one-time session token display handling.');
requireIncludes(files.sharing, 'mmir.team_share_packet', 'D160 needs owner-side team share packet schema.');
requireIncludes(files.sharing, 'sharing-create-team-packet', 'D160 needs team share packet creation control.');
requireIncludes(files.sharing, 'invite_code_included:false', 'D160 team share packets must exclude one-time invite codes.');
requireIncludes(files.apiClient, 'setManagedSessionToken', 'D161 needs in-memory managed session activation.');
requireIncludes(files.apiClient, 'x-mmir-session-token', 'D161 needs protected backend session token headers.');
requireIncludes(files.sharing, 'sharing-activate-recipient-token', 'D161 needs recipient session activation control.');
requireIncludes(files.identityOrg, 'identity-activate-session', 'D161 needs identity session activation control.');
requireIncludes(files.sharing, 'sharing-activity-summary', 'D162 needs share activity summaries in Safe Sharing.');
requireIncludes(files.sharing, 'handoff_completed_count', 'D162 needs handoff activity counts.');
requireIncludes(files.sharing, 'Revoked at', 'D162 needs revocation cues in the recipient/owner flow.');
requireIncludes(files.runtimeControlsFix, 'rewriteLegacyInstallerUi', 'Runtime UI guard must rewrite retired local-node installer prompts.');
requireIncludes(files.runtimeControlsFix, 'mmir-local-connector-install.html', 'Runtime UI guard must route users to the universal connector installer.');
requireIncludes(files.runtimeControlsFix, 'mmir-local-node-windows.ps1', 'Runtime UI guard must detect retired local-node installer links.');
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
requireIncludes(files.chatRuntime, 'runtime-live-proof', 'D163 needs live model proof visible in the chat route.');
requireIncludes(files.chatRuntime, 'tinyChatProbe', 'D163 needs tiny free route proof.');
requireIncludes(files.chatRuntime, 'skipped to avoid hidden provider cost', 'D163 needs a cost guard for automatic proof.');
requireIncludes(files.chatRuntime, 'proofRepairActions', 'D164 needs failed-proof repair actions.');
requireIncludes(files.chatRuntime, 'data-proof-action', 'D164 needs repair controls rendered from proof state.');
requireIncludes(files.chatRuntime, 'Chat with verified model', 'D165 needs first-chat handoff from verified model proof.');
requireIncludes(files.chatRuntime, 'first_chat_ready:true', 'D165 needs a testable first-chat-ready signal.');
requireIncludes(files.chatRuntime, 'mimir-first-chat-receipt-v1:', 'D166 needs a browser-local first-chat receipt.');
requireIncludes(files.chatRuntime, 'raw_prompt_stored:false', 'D166 first-chat receipt must not store raw prompts.');
requireIncludes(files.chatRuntime, 'raw_response_stored:false', 'D166 first-chat receipt must not store raw responses.');
requireIncludes(files.chatRuntime, 'mmir-first-chat-receipt-updated', 'D166 first-chat receipt must refresh dependent UI.');
requireIncludes(files.chatRuntime, 'preferredProofModel', 'D168 needs install-to-first-chat preferred model proof selection.');
requireIncludes(files.chatRuntime, 'mmir-model-install-ready', 'D168 needs a model-install-ready bridge event.');
requireIncludes(files.chatRuntime, 'mmir-install-to-first-chat-ready', 'D168 needs a first verified chat prepared event.');
requireIncludes(files.chatRuntime, 'mmir-local-connector-refreshed', 'D168 needs node-online refresh events to trigger chat proof.');
requireIncludes(files.progressDashboard, 'progress-first-chat-recovery', 'D167 dashboard must expose first-chat receipt recovery.');
requireIncludes(files.progressDashboard, 'firstChatReceiptState', 'D167 dashboard must compute first-chat receipt state.');
requireIncludes(files.progressDashboard, 'progress-activation-clear', 'D170 dashboard must expose activation telemetry controls.');
requireIncludes(files.progressDashboard, 'progress-activation-autopilot', 'D171 dashboard must expose a manual safe autopilot run.');
requireIncludes(files.progressDashboard, 'activationSummary', 'D170 dashboard must summarize activation telemetry.');
requireIncludes(files.mmir, './apps/mimir-chat-portal/first-screen-activation-hydration.js', 'D187 MMIR page must defer first-screen activation hydration.');
requireIncludes(files.firstScreenHydration, 'activation-replay-banner', 'D179 first screen must show active replay state.');
requireIncludes(files.firstScreenHydration, 'mutated_real_connector:false', 'D179 first screen replay state must be demo-only.');
requireIncludes(files.firstScreenHydration, 'data-activation-replay-jump', 'D180 first screen must jump to replay next target.');
requireIncludes(files.firstScreenHydration, 'data-activation-replay-reset', 'D180 first screen must reset active replay state.');
requireIncludes(files.firstScreenHydration, 'clearActivationReplay', 'D180 replay reset must only clear the demo replay key.');
requireIncludes(files.chatRuntime, 'runtime-activation-replay', 'D179 chat runtime must show active replay near live proof.');
requireIncludes(files.chatRuntime, 'real live proof unchanged', 'D179 replay handoff must not replace real proof.');
requireIncludes(files.chatRuntimeCss, '.runtime-activation-replay', 'D179 chat runtime replay state needs styling.');
requireIncludes(files.repairResumeCss, '.activation-replay-banner', 'D179 first-screen replay state needs styling.');
requireIncludes(files.repairResumeCss, '.activation-replay-actions', 'D180 first-screen replay controls need styling.');
requireIncludes(files.progressDashboard, 'renderActivationSimulator', 'D177 dashboard must render activation simulator fixtures.');
requireIncludes(files.progressDashboard, 'progress-activation-simulator', 'D177 dashboard must expose activation simulator panel.');
requireIncludes(files.progressDashboard, 'data-activation-replay', 'D178 dashboard must expose safe replay controls.');
requireIncludes(files.progressDashboard, 'mimir-activation-replay-v1:', 'D178 replay state must be workspace-local.');
requireIncludes(files.progressDashboard, 'mutated_real_connector:false', 'D178 replay controls must not mutate real connectors.');
requireIncludes(files.progressDashboardCss, '.progress-simulator-card', 'D177 dashboard must style activation simulator fixtures.');
requireIncludes(files.progressDashboardCss, '.progress-replay-state', 'D178 dashboard must style activation replay state.');
requireIncludes(files.activationSimulator, 'first-visit-free-guide', 'D177 simulator must cover first visit.');
requireIncludes(files.activationSimulator, 'missing-connector', 'D177 simulator must cover missing connector.');
requireIncludes(files.activationSimulator, 'installer-return-checking', 'D177 simulator must cover installer return.');
requireIncludes(files.activationSimulator, 'connector-online-no-model', 'D177 simulator must cover connector online with no model.');
requireIncludes(files.activationSimulator, 'verified-local-model', 'D177 simulator must cover verified local model.');
requireIncludes(files.simulatorHarness, 'expectedScenarioIds', 'D177 simulator needs dedicated CI fixture coverage.');
requireIncludes(files.replayRenderHarness, 'expectedScenarioIds', 'D181 replay render harness must cover every activation simulator scenario.');
requireIncludes(files.replayRenderHarness, 'Activation replay render smoke check passed.', 'D181 replay render harness must have a dedicated success signal.');
requireIncludes(files.routeMapHarness, 'Activation route map smoke check passed.', 'D182 route map needs dedicated CI fixture coverage.');
requireIncludes(files.progressDashboard, 'renderReplayRouteMap', 'D182 dashboard must render the replay route map.');
requireIncludes(files.progressDashboardCss, '.progress-replay-route-map', 'D182 route map needs visible styling.');
requireIncludes(files.activationClosureHarness, 'Activation closure smoke check passed.', 'D183 activation closure needs dedicated CI fixture coverage.');
requireIncludes(files.progressDashboard, 'renderLiveGapChecklist', 'D183 dashboard must render the live activation closure checklist.');
requireIncludes(files.progressDashboardCss, '.progress-live-gap-checklist', 'D183 live activation closure checklist needs visible styling.');
requireIncludes(files.firstScreenClosureHarness, 'First-screen activation closure smoke check passed.', 'D184 first-screen activation closure needs dedicated CI fixture coverage.');
requireIncludes(files.firstImpression, 'renderActivationClosureStrip', 'D184 first screen must render the live activation closure strip.');
requireIncludes(files.repairResumeCss, '.activation-closure-strip', 'D184 first-screen activation closure strip needs visible styling.');
requireIncludes(files.deviceStarterHarness, 'Device starter recommendation smoke check passed.', 'D185 device starter recommendation needs dedicated CI fixture coverage.');
requireIncludes(files.firstImpression, 'deviceStarterRecommendation', 'D185 first screen must recommend a starter model from detected device class.');
requireIncludes(files.firstImpression, 'recommended_starter:', 'D185 first screen must render recommended starter evidence.');
requireIncludes(files.starterTelemetryHarness, 'Recommended starter telemetry smoke check passed.', 'D186 recommended starter telemetry needs dedicated CI fixture coverage.');
requireIncludes(files.firstImpression, "recommended-starter", 'D186 first screen must record recommended starter telemetry.');
requireIncludes(files.activationTelemetry, "if(type==='recommended-starter')", 'D186 activation telemetry must sanitize recommended starter events.');
requireIncludes(files.progressDashboard, 'starterSelected', 'D186 Progress Dashboard must count recommended starter selections.');
requireIncludes(files.criticalShellHarness, 'Critical shell headroom smoke check passed.', 'D187 critical-shell headroom needs dedicated CI fixture coverage.');
requireIncludes(files.firstScreenHydration, 'MimirFirstScreenActivationHydration', 'D187 deferred hydration module must own non-critical first-screen activation banners.');
requireIncludes(files.starterFunnelHarness, 'Starter-to-proof funnel smoke check passed.', 'D188 starter-to-proof funnel needs dedicated CI fixture coverage.');
requireIncludes(files.progressDashboard, 'renderStarterFunnel', 'D188 Progress Dashboard must render starter-to-proof funnel.');
requireIncludes(files.progressDashboardCss, '.progress-starter-funnel', 'D188 starter-to-proof funnel needs visible styling.');
requireIncludes(files.starterFunnelContinueHarness, 'Starter funnel continue smoke check passed.', 'D189 starter funnel continue action needs dedicated CI fixture coverage.');
requireIncludes(files.progressDashboard, 'runStarterFunnelContinue', 'D189 Progress Dashboard must run starter funnel continue actions.');
requireIncludes(files.firstScreenStarterFunnelHarness, 'First-screen starter funnel smoke check passed.', 'D190 first-screen starter funnel needs dedicated CI fixture coverage.');
requireIncludes(files.firstScreenHydration, 'renderFirstScreenStarterFunnel', 'D190 deferred first-screen hydration must render starter funnel progress.');
requireIncludes(files.repairResumeCss, '.first-screen-starter-funnel', 'D190 first-screen starter funnel needs visible styling.');
requireIncludes(files.firstScreenStarterContinueHarness, 'First-screen starter funnel continue smoke check passed.', 'D191 first-screen starter funnel continue needs dedicated CI fixture coverage.');
requireIncludes(files.firstScreenHydration, 'runFirstScreenStarterFunnelAction', 'D191 deferred first-screen hydration must run starter funnel actions.');
requireIncludes(files.recommendedStarterFocusHarness, 'Recommended starter model-library focus smoke check passed.', 'D192 recommended starter model-library focus needs dedicated CI fixture coverage.');
requireIncludes(files.modelCatalogUi, 'starterModelToCatalog', 'D192 Model Library must import exact free starter models.');
requireIncludes(files.modelCatalogUi, 'data-recommended-starter', 'D192 Model Library must mark the recommended starter card.');
requireIncludes(files.modelCatalogUi, 'mmir-model-library-focus-recommended', 'D192 starter actions must focus the recommended model card.');
requireIncludes(files.firstImpression, 'mmir-model-library-focus-recommended', 'D192 first-screen closure action must trigger recommended starter focus.');
requireIncludes(files.progressDashboard, 'mmir-model-library-focus-recommended', 'D192 dashboard starter funnel must trigger recommended starter focus.');
requireIncludes(files.recommendedStarterHandoffHarness, 'Recommended starter install handoff smoke check passed.', 'D193 recommended starter install handoff needs dedicated CI fixture coverage.');
requireIncludes(files.modelCatalogUi, 'data-starter-action', 'D193 Model Library must expose install/select actions on starter cards.');
requireIncludes(files.modelCatalogUi, 'model-library-starter-handoff', 'D193 Model Library must record no-spend handoff telemetry.');
requireIncludes(files.chatRuntime, 'runStarterHandoff', 'D193 chat runtime must receive Model Library starter handoff events.');
requireIncludes(files.chatRuntime, 'selectStarterModelById', 'D193 chat runtime must select the exact starter model without user reselection.');
requireIncludes(files.chatRuntime, 'runtime-starter-handoff', 'D193 chat runtime must record no-spend handoff telemetry.');
requireIncludes(files.privacyControls, 'Activation replay demo state', 'D178 privacy inventory must disclose activation replay state.');
requireIncludes(files.activationTelemetry, 'MimirActivationTelemetry', 'D170 needs a browser-local activation telemetry API.');
requireIncludes(files.activationTelemetry, 'mmir-local-doctor-updated', 'D170 telemetry must include local doctor updates.');
requireIncludes(files.activationTelemetry, 'raw_prompt_stored:false', 'D170 telemetry must not store raw prompts.');
requireIncludes(files.activationTelemetry, 'secrets_stored:false', 'D170 telemetry must not store secrets.');
requireIncludes(files.activationAutopilot, 'MimirActivationAutopilot', 'D171 needs a safe activation autopilot API.');
requireIncludes(files.activationAutopilot, 'ensureAutomaticDefaults', 'D171 autopilot must run free-first defaults before asking users to configure.');
requireIncludes(files.activationAutopilot, 'retry-live-proof', 'D171 autopilot must retry safe proof states.');
requireIncludes(files.activationAutopilot, 'no_paid_routes_started:true', 'D171 autopilot must preserve the no-spend rule.');
requireIncludes(files.progressDashboardCss, '.progress-receipt-card', 'D167 dashboard needs first-chat receipt styling.');
requireIncludes(files.progressDashboardCss, '.progress-activation-card', 'D170 dashboard needs activation telemetry styling.');
requireIncludes(files.apiClient, "headers:{'Content-Type':'application/json'}", 'Pairing requests must send explicit JSON content type.');
requireIncludes(files.localConnector, '/tunnels/status', 'J002/J009 need live local tunnel status.');
requireIncludes(files.localConnector, '/tunnels/trycloudflare/start', 'J002/J009 need a real tunnel start route.');
requireIncludes(files.nodeDashboard, '/pairing/sessions', 'J009 needs local approval codes before cross-device node pairing.');
requireIncludes(files.nodeDashboard, '/doctor', 'D169 needs the dashboard to consume the local health doctor route.');
requireIncludes(files.nodeDashboard, 'Local Node Doctor', 'D169 needs authoritative local doctor source labeling.');
requireIncludes(files.nodeDashboard, 'model-pull', 'D169 needs model pull state in the repair loop.');
requireIncludes(files.nodeDashboard, 'guidedDeviceRepair', 'D172 needs doctor state mapped into one guided repair card.');
requireIncludes(files.nodeDashboard, 'detectDevice', 'D172 needs OS/device detection for repair cards.');
requireIncludes(files.nodeDashboard, 'Raspberry Pi / Linux ARM', 'D172 needs Raspberry Pi/Linux ARM repair guidance.');
requireIncludes(files.nodeDashboard, 'node-repair-card', 'D172 needs the guided repair card rendered in Node Dashboard.');
requireIncludes(files.nodeDashboard, 'data-device-repair-action', 'D174 needs repair-card action links.');
requireIncludes(files.nodeDashboard, 'device-repair-action', 'D174 needs repair-card telemetry events.');
requireIncludes(files.nodeDashboard, 'mimir-repair-resume-v1:', 'D175 needs repair-card clicks to store resume state.');
requireIncludes(files.localConnector, 'mmir-repair-resume-checked', 'D175 needs local connector to verify repair resume after return.');
requireIncludes(files.activationTelemetry, 'mmir-repair-resume-checked', 'D175 needs repair resume verification in activation telemetry.');
requireIncludes(files.firstScreenHydration, 'renderRepairResumeBanner', 'D176 needs first-screen repair resume result visibility.');
requireIncludes(files.firstScreenHydration, 'mmir-repair-resume-checked', 'D176 first-screen banner must refresh after repair resume checks.');
requireIncludes(files.nodeDashboard, 'renderRepairResumeBanner', 'D176 needs Node Dashboard repair resume result visibility.');
requireIncludes(files.nodeDashboard, 'data-repair-resume-action', 'D176 repair resume banner needs a concrete next action.');
requireIncludes(files.nodeDashboardCss, '.node-resume-banner', 'D176 needs Node Dashboard repair resume styling.');
requireIncludes(files.repairResumeCss, '.repair-resume-banner', 'D176 needs first-screen repair resume styling.');
requireIncludes(files.repairCardHarness, 'offline-connector', 'D173 repair harness must cover offline connector.');
requireIncludes(files.repairCardHarness, 'offline-ollama', 'D173 repair harness must cover offline Ollama.');
requireIncludes(files.repairCardHarness, 'failed-model-pull', 'D173 repair harness must cover failed model pull.');
requireIncludes(files.repairCardHarness, 'pairing-required', 'D173 repair harness must cover pairing-required state.');
requireIncludes(files.privacyControls, 'export', 'J005 needs local data export controls.');
requireIncludes(files.privacyControls, 'delete', 'J005 needs local data delete controls.');
requireIncludes(files.privacyControls, 'privacy-data-inventory', 'J005/D118 needs a visible data inventory.');
requireIncludes(files.privacyControls, 'Provider keys and cloud credentials', 'J005/D118 must make the public frontend secrecy boundary visible.');
requireIncludes(files.privacyControls, 'Clear pairing tokens', 'J009/D118 needs a safe way to clear temporary local node pairing tokens.');
requireIncludes(files.privacyControls, 'Safe share bundles', 'D152 privacy inventory must include browser-local safe share bundles.');
requireIncludes(files.privacyControls, 'MMIR managed session token', 'D161 privacy inventory must disclose current-tab managed session tokens.');
requireIncludes(files.privacyControls, 'First chat receipt', 'D166 privacy inventory must disclose browser-local first-chat receipts.');
requireIncludes(files.privacyControls, 'Activation telemetry', 'D170 privacy inventory must disclose browser-local activation telemetry.');
requireIncludes(files.privacyControls, 'Activation autopilot', 'D171 privacy inventory must disclose browser-local autopilot state.');
requireIncludes(files.privacyControls, 'Repair resume state', 'D175 privacy inventory must disclose repair resume state.');
requireIncludes(files.universalInstaller, 'Raspberry Pi / Linux ARM', 'J002 must offer Raspberry Pi/Linux ARM in the universal installer.');
requireIncludes(files.connectorServer, 'CONTRACT_VERSION', 'Standalone connector server must advertise the MMIR node contract version.');
requireIncludes(files.connectorServer, '/models/pull', 'Standalone connector server must support one-click model install.');
requireIncludes(files.connectorServer, '/models/pulls/', 'Standalone connector server must expose model install progress.');
requireIncludes(files.connectorServer, '/models/delete', 'Standalone connector server must support local model removal.');
requireIncludes(files.connectorServer, '/pairing/sessions', 'Standalone connector server must support short-lived cross-device pairing codes.');
requireIncludes(files.connectorServer, '/doctor', 'Standalone connector server must expose the D169 local health doctor route.');
requireIncludes(files.connectorServer, 'mmir.local_node_doctor', 'Standalone connector server must return the D169 doctor contract.');
requireIncludes(files.connectorServer, 'model-pull', 'Standalone connector server doctor must include model pull state.');
const release = json(files.connectorRelease);
if (release.contract_version !== '0.1' || release.default_host !== '127.0.0.1') {
  fail('Connector release manifest must pin contract version and localhost default.');
}
const artifacts = Array.isArray(release.artifacts) ? release.artifacts : [];
for (const artifact of artifacts.filter((item) => item?.sha256 && item?.path)) {
  const artifactPath = join(publicDir, String(artifact.path).replace(/^\//, ''));
  if (!existsSync(artifactPath)) {
    fail(`Connector release manifest points to missing artifact: ${artifact.path}`);
  } else if (sha256File(artifactPath) !== artifact.sha256) {
    fail(`Connector release manifest checksum is stale for ${artifact.path}`);
  }
}
for (const id of ['connector-server', 'mac-command', 'windows-cmd', 'linux-shell', 'universal-installer-page', 'mobile-client-mode']) {
  if (!artifacts.some((item) => item.id === id)) {
    fail(`Connector release manifest missing artifact: ${id}`);
  }
}
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
for (const id of ['D001', 'D023', 'D082', 'D099', 'D104', 'D106', 'D107', 'D119', 'D120', 'D121', 'D126', 'D127', 'D128', 'D129', 'D130', 'D131', 'D132', 'D133', 'D134', 'D135', 'D136', 'D137', 'D138', 'D139', 'D140', 'D141', 'D142', 'D143', 'D144', 'D145', 'D146', 'D147', 'D148', 'D149', 'D150', 'D151', 'D152', 'D153', 'D154', 'D155', 'D156', 'D157', 'D158', 'D159', 'D160', 'D161', 'D162']) {
  if (!tasks.some((task) => task.seq === id)) {
    fail(`Progress dashboard must expose delivery task ${id}.`);
  }
}

if (!process.exitCode) {
  console.log('User journey smoke check passed.');
}
