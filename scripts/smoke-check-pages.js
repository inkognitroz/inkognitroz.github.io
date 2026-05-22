import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const indexPath = join(publicDir, 'index.html');
const chatRuntimePath = join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js');
const chatPortalPath = join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.js');
const firstImpressionPath = join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js');
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

if (!existsSync(indexPath)) {
  fail('Missing public/index.html');
} else {
  const html = readFileSync(indexPath, 'utf8');
  const assetRefs = Array.from(html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)).map((match) => match[1]);

  for (const ref of assetRefs) {
    const assetPath = localAssetPath(indexPath, ref);
    if (!assetPath || extname(assetPath) === '.html') {
      continue;
    }

    if (!assetPath.startsWith(publicDir) || !existsSync(assetPath)) {
      fail(`Missing referenced asset from index.html: ${ref}`);
    }
  }
}

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
requireText(chatRuntimePath, "model.id==='mmir-guide'", 'Chat runtime must default to the immediate in-browser guide when no backend model is live.');
requireText(chatRuntimePath, 'const liveValues=(models||[]).map', 'Chat runtime must prefer live backend models over starter helpers when live models exist.');
requireText(chatRuntimePath, 'function modelComplianceNote(model)', 'Chat runtime must show license/commercial-use warnings for starter model choices.');
requireText(chatRuntimePath, 'Source/model card: verify before production use', 'Chat runtime must ask users to verify model cards before production use.');
requireText(chatRuntimePath, 'composer-mode-dock', 'Chat composer must expose the Open WebUI-style mode dock.');
requireText(chatRuntimePath, 'Boost 5.5', 'Chat composer must expose a functional boost mode.');
requireText(chatRuntimePath, 'function modeInstruction()', 'Chat mode buttons must affect model instructions.');
requireText(chatRuntimePath, '/hardware', 'Chat composer must show local CPU/RAM capability when local node exposes it.');
requireText(indexPath, 'mimir-instant-start', 'Homepage must show an automatic ready state before technical setup sections.');
requireText(indexPath, 'data-prompt-action', 'Homepage must include smart start actions that send useful prompts.');
requireText(firstImpressionPath, 'function syncReadyState()', 'First impression script must sync live model readiness into the hero.');
requireText(firstImpressionPath, 'function sendPrompt(value)', 'First impression smart actions must send prompts instead of only navigating.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'local-connector.js'), '/tunnels/status', 'Local connector UI must show paired tunnel status.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'local-connector.js'), '/tunnels/trycloudflare/start', 'Local connector UI must expose the free tunnel start action.');
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
