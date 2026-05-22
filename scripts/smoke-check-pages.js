import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const indexPath = join(publicDir, 'index.html');
const chatRuntimePath = join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js');
const chatPortalPath = join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.js');
const starterCatalogPath = join(publicDir, 'free-model-starters.json');
const progressDashboardPath = join(publicDir, 'progress-dashboard.json');
const userJourneysPath = join(publicDir, 'user-journeys.json');

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

if (existsSync(starterCatalogPath)) {
  const catalog = JSON.parse(readFileSync(starterCatalogPath, 'utf8'));
  const models = Array.isArray(catalog.models) ? catalog.models : [];
  const runtimes = new Set(models.map((model) => model.runtime).filter(Boolean));
  if (models.length < 10) {
    fail('Free starter catalog should keep at least ten visible free options.');
  }
  if (!models.some((model) => model.id === 'mmir-guide')) {
    fail('Free starter catalog must include the immediate MMIR Guide.');
  }
  if (!runtimes.has('browser-guide') || !runtimes.has('webllm') || !runtimes.has('ollama')) {
    fail('Free starter catalog must include browser guide, WebGPU and Ollama routes.');
  }
} else {
  fail('Missing free starter model catalog.');
}

if (existsSync(progressDashboardPath)) {
  const dashboard = JSON.parse(readFileSync(progressDashboardPath, 'utf8'));
  const tasks = Array.isArray(dashboard.tasks) ? dashboard.tasks : [];
  if (tasks.length < 100) {
    fail('Progress dashboard must expose the full sequential backlog.');
  }
  for (const id of ['D001', 'D023', 'D082', 'D099', 'D104']) {
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
