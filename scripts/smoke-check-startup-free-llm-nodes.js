import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  catalog: join(publicDir, 'free-model-starters.json'),
  activeStrip: join(publicDir, 'apps', 'mimir-chat-portal', 'active-node-strip.js'),
  mmir: join(publicDir, 'mmir.html'),
  sw: join(publicDir, 'sw.js'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md'),
  log: join(root, 'docs', 'MMIR_IMPLEMENTATION_LOG.md'),
  buildDashboard: join(root, 'scripts', 'build-progress-dashboard.js'),
  visualQa: join(publicDir, 'visual-qa-report.json'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing D298 startup free LLM file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

const catalog = JSON.parse(text(files.catalog));
const models = Array.isArray(catalog.models) ? catalog.models : [];
const freeStartupModels = models.filter((model) => ['browser-guide', 'webllm', 'ollama'].includes(model.runtime));
if (freeStartupModels.length < 28) fail('Free startup model catalog should expose broad browser/WebGPU/Ollama choices.');
for (const runtime of ['browser-guide', 'webllm', 'ollama']) {
  if (!freeStartupModels.some((model) => model.runtime === runtime)) fail(`Free startup catalog missing ${runtime} routes.`);
}
for (const id of ['ollama-qwen3-17b', 'ollama-qwen3-4b', 'ollama-qwen25-coder-05b', 'ollama-qwen25-coder-15b', 'ollama-qwen25-coder-3b', 'ollama-llama32-3b', 'ollama-gemma3-4b', 'ollama-mistral-7b', 'ollama-nomic-embed-text']) {
  if (!models.some((model) => model.id === id)) fail(`Free starter catalog missing expanded no-spend model: ${id}`);
}

const activeStrip = text(files.activeStrip);
const workflows = `${text(files.qualityWorkflow)}\n${text(files.pagesWorkflow)}`;

for (const needle of [
  "starterModels.filter(model=>['browser-guide','webllm','ollama'].includes(model.runtime))",
  'data-free-starter-count',
  "openInstaller('active-node-starter-rail',model)",
  'function installerTarget(source,model)',
  "params.set('starter',model.id)",
  "params.set('model',model.model)",
  "next_action:'installer-download'",
  'w.location.href=resume.target'
]) {
  requireIncludes(activeStrip, needle, `D298 active startup free LLM node evidence missing: ${needle}`);
}

if (activeStrip.includes('.slice(0,14)')) {
  fail('Startup free LLM rail must not hide later free starters behind a hard-coded slice.');
}

requireIncludes(text(files.mmir), 'active-node-strip.js?v=20260526-stale-offline-model-proof-v1', 'MMIR page must cache-bust active-node strip for startup free LLM nodes.');
requireIncludes(text(files.sw), "CACHE_NAME='mmir-pwa-d318-20260526-instant-guide-default-v1'", 'Service worker cache must rotate for D298 startup free LLM nodes.');
requireIncludes(text(files.sw), './apps/mimir-chat-portal/active-node-strip.js', 'Service worker must cache active-node strip for offline/free startup shell.');
requireIncludes(text(files.backlog), '| D298 | Chat UX / Free Models | P0 | Startup free LLM node rail |', 'Backlog must include D298 startup free LLM node rail.');
requireIncludes(text(files.log), 'D298 is now beta', 'Implementation log must include D298.');
requireIncludes(text(files.buildDashboard), "['D298'", 'Progress dashboard build must mark D298 status.');
requireIncludes(text(files.visualQa), 'D298 startup free LLM node rail', 'Visual QA report must mention D298.');
requireIncludes(workflows, 'smoke-check-startup-free-llm-nodes.js', 'GitHub workflows must run D298 startup free LLM node gate.');

if (!process.exitCode) {
  console.log(`Startup free LLM nodes smoke check passed with ${freeStartupModels.length} startup choices.`);
}
