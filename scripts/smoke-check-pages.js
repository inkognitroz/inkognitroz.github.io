import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const indexPath = join(publicDir, 'index.html');
const mmirPath = join(publicDir, 'mmir.html');
const chatRuntimePath = join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js');
const chatPortalPath = join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.js');
const firstImpressionPath = join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js');
const nodeDashboardPath = join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.js');
const mimirCssPath = join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.css');
const uiActionCoveragePath = join(publicDir, 'ui-action-coverage.json');
const starterCatalogPath = join(publicDir, 'free-model-starters.json');
const modelCatalogPath = join(publicDir, 'ai-model-catalog.json');
const progressDashboardPath = join(publicDir, 'progress-dashboard.json');
const userJourneysPath = join(publicDir, 'user-journeys.json');
const universalInstallerPath = join(publicDir, 'downloads', 'mmir-local-connector-install.html');
const linuxConnectorInstallerPath = join(publicDir, 'downloads', 'mmir-local-connector-linux.sh');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function localAssetPath(fromFile, asset) {
  if (!asset || /^[a-z][a-z0-9+.-]*:/i.test(asset) || asset.startsWith('#')) {
    return null;
  }

  const cleanAsset = asset.split(/[?#]/)[0];
  if (!cleanAsset || cleanAsset.startsWith('//')) {
    return null;
  }

  const base = cleanAsset.startsWith('/') ? publicDir : dirname(fromFile);
  return normalize(resolve(base, cleanAsset.replace(/^\//, '')));
}

function requireText(file, text, message) {
  if (!existsSync(file) || !readFileSync(file, 'utf8').includes(text)) {
    fail(message);
  }
}

function checkHtmlAssetRefs(filePath, label) {
  if (!existsSync(filePath)) {
    fail(`Missing ${label}`);
    return;
  }
  const html = readFileSync(filePath, 'utf8');
  const assetRefs = Array.from(html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)).map((match) => match[1]);

  for (const ref of assetRefs) {
    const assetPath = localAssetPath(filePath, ref);
    if (!assetPath || extname(assetPath) === '.html') {
      continue;
    }

    if (!assetPath.startsWith(publicDir) || !existsSync(assetPath)) {
      fail(`Missing referenced asset from ${label}: ${ref}`);
    }
  }
}

checkHtmlAssetRefs(indexPath, 'public/index.html');
checkHtmlAssetRefs(mmirPath, 'public/mmir.html');

for (const file of walk(publicDir)) {
  const rel = relative(root, file);
  const ext = extname(file);

  if (ext === '.json') {
    try {
      JSON.parse(readFileSync(file, 'utf8'));
    } catch (error) {
      fail(`Invalid JSON: ${rel}`);
    }
  }

  if (ext === '.js') {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) {
      fail(`Invalid JavaScript syntax: ${rel}\n${result.stderr || result.stdout}`);
    }
  }
}

requireText(chatPortalPath, 'ensureAutomaticDefaults();render();', 'Chat portal must prepare automatic first-run defaults.');
requireText(chatPortalPath, 'window.MimirBackendProfiles={ensureFreeLocalProfile,ensureAutomaticDefaults};', 'Chat portal must expose automatic default setup for integration tests.');
requireText(chatRuntimePath, 'function preferredStarterModel()', 'Chat runtime must keep an explicit first-run starter model choice.');
requireText(chatRuntimePath, 'function starterAvailabilityLabel(model)', 'Chat runtime must label whether a model is ready now or install-to-activate.');
requireText(chatRuntimePath, "model.id==='mmir-guide'", 'Chat runtime must default to the immediate in-browser guide when no backend model is live.');
requireText(chatRuntimePath, 'const liveValues=(models||[]).map', 'Chat runtime must prefer live backend models over starter helpers when live models exist.');
requireText(chatRuntimePath, 'Ready now: free browser helpers', 'Model selector must separate ready-now browser helpers from installable models.');
requireText(chatRuntimePath, 'Install to activate: free local Ollama models', 'Model selector must clearly mark free local models as install-to-activate.');
requireText(chatRuntimePath, 'function modelComplianceNote(model)', 'Chat runtime must show license/commercial-use warnings for starter model choices.');
requireText(chatRuntimePath, 'Source/model card: verify before production use', 'Chat runtime must ask users to verify model cards before production use.');
requireText(chatRuntimePath, 'composer-mode-dock', 'Chat composer must expose the Open WebUI-style mode dock.');
requireText(chatRuntimePath, 'Boost 5.5', 'Chat composer must expose a functional boost mode.');
requireText(chatRuntimePath, 'function modeInstruction()', 'Chat mode buttons must affect model instructions.');
requireText(chatRuntimePath, 'mmir-chat-modes-updated', 'Chat mode changes must update the first-run success checklist.');
requireText(chatRuntimePath, '/models/pull', 'Chat model helper must expose one-click local model install.');
requireText(chatRuntimePath, '/models/pulls/', 'Chat model helper must poll local model install progress.');
requireText(chatRuntimePath, '/models/delete', 'Chat runtime must expose guarded local model removal.');
requireText(chatRuntimePath, 'install-selected-model', 'Installable free models must have an install action.');
requireText(chatRuntimePath, 'model-install-status', 'Model install progress must be visible.');
requireText(chatRuntimePath, '/hardware', 'Chat composer must show local CPU/RAM capability when local node exposes it.');
requireText(chatRuntimePath, 'the orchestration layer for trusted AI', 'Chat runtime must keep the MMIR product identity in model context.');
requireText(indexPath, 'SaaS Fabric', 'Homepage must keep the SaaS Fabric top-level identity.');
requireText(indexPath, 'data-section="appFactory"', 'Homepage must render the SaaS Fabric app factory from content.json.');
requireText(indexPath, 'Powered by <code>public/content.json</code>', 'Homepage must preserve the content.json publishing model.');
requireText(mmirPath, 'mimir-instant-start', 'MMIR product page must show an automatic ready state before technical setup sections.');
requireText(mmirPath, 'The orchestration layer for trusted AI.', 'MMIR product page hero must state the MMIR product identity.');
requireText(mmirPath, 'Connect local AI', 'MMIR product page must show the first local AI activation action.');
requireText(mmirPath, 'href="#connect-options">Connect local AI</a>', 'MMIR product page must link the first activation action to connect options.');
requireText(mmirPath, 'data-prompt-action', 'MMIR product page must include smart start actions that send useful prompts.');
requireText(mmirPath, 'id="node-dashboard"', 'MMIR product page must expose a node dashboard entrypoint.');
requireText(mmirPath, 'id="node-dashboard-root"', 'MMIR product page must expose a node dashboard render root.');
requireText(mmirPath, './apps/mimir-chat-portal/node-dashboard.js', 'MMIR product page must load the node dashboard script.');
requireText(firstImpressionPath, 'function syncReadyState()', 'First impression script must sync live model readiness into the hero.');
requireText(firstImpressionPath, 'function sendPrompt(value)', 'First impression smart actions must send prompts instead of only navigating.');
requireText(firstImpressionPath, 'mimir-readiness-rail', 'First impression must expose a live readiness rail on the first screen.');
requireText(firstImpressionPath, 'renderReadinessRail', 'First impression readiness rail must update automatically.');
requireText(firstImpressionPath, 'Open. Connect local AI. Ready.', 'First impression runtime must preserve the ground-zero activation promise.');
requireText(firstImpressionPath, 'trusted MMIR control plane', 'First impression runtime must keep local AI framed as control-plane activation.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.js'), 'function ensureFirstRunDefaults()', 'Onboarding must prepare safe automatic defaults before asking the user to configure.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.js'), 'id=\'start-free-chat\'', 'Onboarding must expose a one-click free first chat action.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.js'), 'function sendPrompt(value)', 'Onboarding must send a useful first prompt, not only navigate.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'model-catalog-ui.js'), 'modelLibraryGroups(models)', 'Model catalog must render grouped live/free/protected model sections.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'model-catalog-ui.js'), 'Active backend models', 'Model catalog must distinguish active backend models from static suggestions.');
requireText(mimirCssPath, '.mimir-topbar nav{display:flex;width:100%;overflow-x:auto', 'Mobile navigation must remain accessible instead of disappearing.');
requireText(mimirCssPath, '.readiness-pill:focus-visible', 'Readiness pills need keyboard focus states.');
requireText(mimirCssPath, '.readiness-pill small{white-space:normal}', 'Mobile readiness status text must wrap instead of truncating.');
requireText(nodeDashboardPath, 'Install Health Doctor', 'Node dashboard must include install health doctor copy.');
requireText(nodeDashboardPath, '/node/identity', 'Node dashboard must read public-safe local node identity.');
requireText(nodeDashboardPath, '/hardware', 'Node dashboard must check hardware profile.');
requireText(nodeDashboardPath, '/models', 'Node dashboard must check live model inventory.');
requireText(nodeDashboardPath, '/tunnels/status', 'Node dashboard must check tunnel status.');
requireText(nodeDashboardPath, '/tunnels/trycloudflare/start', 'Node dashboard must expose a paired free tunnel start path.');
requireText(nodeDashboardPath, '/pairing/sessions', 'Node dashboard must create short-lived cross-device pairing codes locally.');
requireText(nodeDashboardPath, 'node-create-pairing-code', 'Node dashboard must expose a cross-device pairing action.');
requireText(nodeDashboardPath, 'Connector install', 'Install doctor must check connector install.');
requireText(nodeDashboardPath, 'Ollama runtime', 'Install doctor must check Ollama/local runtime.');
requireText(nodeDashboardPath, 'Model availability', 'Install doctor must check model availability.');
requireText(uiActionCoveragePath, 'Every visible MMIR control', 'MMIR product page must include a public-safe UI action coverage manifest.');
requireText(join(root, 'scripts', 'smoke-check-ui-actions.js'), 'requireHashLinksAreSafe', 'Static quality gates must guard against active dead hash links.');
requireText(join(root, 'scripts', 'public-safety-audit.js'), 'Public safety audit passed.', 'Static quality gates must run a public/private safety audit.');
requireText(join(root, '.github', 'workflows', 'quality.yml'), 'node scripts/public-safety-audit.js', 'CI must run the public safety audit.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'local-connector.js'), '/tunnels/status', 'Local connector UI must show paired tunnel status.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'local-connector.js'), '/tunnels/trycloudflare/start', 'Local connector UI must expose the free tunnel start action.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'api-client.js'), 'remote_pairing_code_required', 'API client must handle remote pairing code requirements.');
requireText(universalInstallerPath, 'Raspberry Pi / Linux ARM', 'Universal installer must expose Raspberry Pi/Linux ARM as a first-class node path.');
requireText(universalInstallerPath, 'Install Raspberry Pi Node', 'Universal installer must route detected Linux ARM devices to the Raspberry Pi node flow.');
requireText(universalInstallerPath, 'Phone / Tablet', 'Universal installer must truthfully handle mobile devices as clients.');
requireText(linuxConnectorInstallerPath, 'DEVICE_CLASS', 'Linux connector installer must classify edge node devices.');
requireText(linuxConnectorInstallerPath, '32-bit ARM is not supported yet', 'Linux connector installer must give a clear 64-bit Raspberry Pi OS requirement.');
requireText(linuxConnectorInstallerPath, 'MMIR_CONNECTOR_PLATFORM="$DEVICE_CLASS"', 'Linux connector installer must pass the detected edge device class to the local node.');

if (existsSync(starterCatalogPath)) {
  const catalog = JSON.parse(readFileSync(starterCatalogPath, 'utf8'));
  const models = Array.isArray(catalog.models) ? catalog.models : [];
  const runtimes = new Set(models.map((model) => model.runtime).filter(Boolean));
  if (models.length < 18) {
    fail('Free starter catalog should keep at least eighteen visible free options.');
  }
  if (!models.some((model) => model.id === 'mmir-guide')) {
    fail('Free starter catalog must include the immediate MMIR Guide.');
  }
  if (!runtimes.has('browser-guide') || !runtimes.has('webllm') || !runtimes.has('ollama')) {
    fail('Free starter catalog must include browser guide, WebGPU and Ollama routes.');
  }
  for (const id of ['ollama-qwen3-06b', 'ollama-granite33-2b', 'ollama-codegemma-2b']) {
    if (!models.some((model) => model.id === id && model.status === 'installable-free' && model.cost === 'free local')) {
      fail(`Free starter catalog is missing public-safe installable model ${id}.`);
    }
  }
} else {
  fail('Missing free starter model catalog.');
}

if (existsSync(modelCatalogPath)) {
  const catalog = JSON.parse(readFileSync(modelCatalogPath, 'utf8'));
  const models = Array.isArray(catalog.models) ? catalog.models : [];
  if (models.length < 16) {
    fail('AI model catalog should expose expanded open-source model families.');
  }
  for (const id of ['qwen3-small', 'granite33', 'codegemma', 'nomic-embed-text', 'llava']) {
    if (!models.some((model) => model.id === id)) {
      fail(`AI model catalog is missing ${id}.`);
    }
  }
  for (const model of models.filter((item) => item.id !== 'custom')) {
    if (!model.status || !model.license_name || !model.commercial_use || !model.best_for) {
      fail(`AI model catalog entry ${model.id || '<missing id>'} is missing status/license/commercial/best_for metadata.`);
    }
    if (model.status === 'requires-backend-router' && !String(model.notes || '').match(/backend|router|protected|consent/i)) {
      fail(`AI model catalog entry ${model.id} must explain why it requires protected backend handling.`);
    }
  }
} else {
  fail('Missing AI model catalog.');
}

if (existsSync(mimirCssPath)) {
  const mimirCss = readFileSync(mimirCssPath, 'utf8');
  if (mimirCss.includes('letter-spacing:-')) {
    fail('MMIR chat portal CSS must not use negative letter spacing.');
  }
  if (mimirCss.match(/font-size:clamp\([^)]*vw/i)) {
    fail('MMIR chat portal CSS must not scale font-size with viewport width.');
  }
  if (mimirCss.includes('@media(max-width:720px){.mimir-topbar nav{display:none')) {
    fail('MMIR mobile navigation must not be hidden.');
  }
} else {
  fail('Missing MMIR chat portal CSS.');
}

if (existsSync(progressDashboardPath)) {
  const dashboard = JSON.parse(readFileSync(progressDashboardPath, 'utf8'));
  const tasks = Array.isArray(dashboard.tasks) ? dashboard.tasks : [];
  if (tasks.length < 150) {
    fail('Progress dashboard must expose the full sequential backlog.');
  }
  for (const id of ['D001', 'D023', 'D082', 'D099', 'D104', 'D107', 'D125', 'D152']) {
    if (!tasks.some((task) => task.seq === id)) {
      fail(`Progress dashboard is missing ${id}.`);
    }
  }
} else {
  fail('Missing progress dashboard manifest.');
}

if (existsSync(userJourneysPath)) {
  const journeys = JSON.parse(readFileSync(userJourneysPath, 'utf8'));
  const items = Array.isArray(journeys.journeys) ? journeys.journeys : [];
  if (items.length < 10) {
    fail('User journey manifest must define the core MMIR journeys.');
  }
  if (!String(journeys.public_repo_rule || '').includes('inkognitroz.github.io is public')) {
    fail('User journey manifest must state the public repo secrecy boundary.');
  }
  if (!String(journeys.positioning || '').includes('the orchestration layer for trusted AI')) {
    fail('User journey manifest must state the MMIR control-plane identity.');
  }
  for (const id of ['J001', 'J002', 'J004', 'J008', 'J010']) {
    if (!items.some((journey) => journey.id === id)) {
      fail(`User journey manifest is missing ${id}.`);
    }
  }
} else {
  fail('Missing user journey manifest.');
}

if (!process.exitCode) {
  console.log('Static Pages smoke check passed.');
}
