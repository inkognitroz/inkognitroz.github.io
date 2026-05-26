import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  manifest: join(publicDir, 'active-chat-nodes.json'),
  activeStrip: join(publicDir, 'apps', 'mimir-chat-portal', 'active-node-strip.js'),
  runtime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  runtimeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
  deferredCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime-deferred.css'),
  shellCss: join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.css'),
  connectorServer: join(publicDir, 'downloads', 'mmir-local-connector-server.mjs'),
  mmir: join(publicDir, 'mmir.html'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function read(file) {
  if (!existsSync(file)) {
    fail(`Missing active-node smoke file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

const manifest = JSON.parse(read(files.manifest));
const nodes = Array.isArray(manifest.nodes) ? manifest.nodes : [];
for (const id of ['browser-guide', 'managed-api-bootstrap', 'browser-webgpu-qwen', 'browser-webgpu-gemma', 'browser-webgpu-llama32', 'browser-webgpu-phi35', 'local-node', 'local-lm-studio', 'local-llamacpp', 'local-vllm', 'local-ollama-direct']) {
  const node = nodes.find((item) => item.id === id);
  if (!node) fail(`Active chat node manifest missing ${id}.`);
  if (node?.cost?.requires_approval !== false) fail(`Active chat node ${id} must be no-approval/free-first.`);
}

const localNode = nodes.find((item) => item.id === 'local-node');
for (const capability of ['openai.v1.models', 'openai.v1.chat.completions']) {
  if (!localNode?.capabilities?.includes(capability)) {
    fail(`Active local-node manifest must advertise ${capability}.`);
  }
}

const managedNode = nodes.find((item) => item.id === 'managed-api-bootstrap');
if (managedNode?.route?.url !== 'https://api.mmir.ai') {
  fail('Active managed API bootstrap node must route through https://api.mmir.ai.');
}
for (const capability of ['openai.v1.models', 'openai.v1.chat.completions', 'chat.compare', 'chat.discussions']) {
  if (!managedNode?.capabilities?.includes(capability)) {
    fail(`Active managed-api-bootstrap manifest must advertise ${capability}.`);
  }
}
for (const id of ['local-lm-studio', 'local-llamacpp', 'local-vllm']) {
  const node = nodes.find((item) => item.id === id);
  if (node?.route?.kind !== 'local-openai-compatible') fail(`Active ${id} must be a local OpenAI-compatible adapter.`);
  for (const capability of ['openai.v1.models', 'openai.v1.chat.completions', 'local.no-key']) {
    if (!node?.capabilities?.includes(capability)) fail(`Active ${id} must advertise ${capability}.`);
  }
}
const ollamaDirect = nodes.find((item) => item.id === 'local-ollama-direct');
if (ollamaDirect?.route?.kind !== 'ollama-direct') fail('Active local-ollama-direct must keep the native Ollama route marked separately from OpenAI-compatible adapters.');

const activeStrip = read(files.activeStrip);
const runtime = read(files.runtime);
const runtimeCss = read(files.runtimeCss);
const deferredCss = read(files.deferredCss);
const shellCss = read(files.shellCss);
const connectorServer = read(files.connectorServer);
const mmir = read(files.mmir);
const workflows = `${read(files.qualityWorkflow)}\n${read(files.pagesWorkflow)}`;
const deferredQueueMatch = mmir.match(/<script id="mimir-deferred-scripts" type="application\/json">([\s\S]*?)<\/script>/);
let deferredQueue = [];
try {
  deferredQueue = deferredQueueMatch ? JSON.parse(deferredQueueMatch[1]) : [];
} catch (error) {
  fail(`Deferred queue must remain valid JSON: ${error.message}`);
}

for (const needle of [
  "const MANIFEST_URL='./active-chat-nodes.json'",
  "const STARTER_CATALOG='./free-model-starters.json'",
  'mmir-runtime-starter-handoff',
  'data-active-node-action',
  'data-active-starter-id',
  'active-node-starter-rail',
  'localReady()',
  'webGpuReady()',
  'function needsWebGpu(node)',
  'function isLocalAdapter(node)',
  'function adapterUrl(node)',
  'function bestNode(nodes,selected)',
  "node.id==='managed-api-bootstrap'",
  'ensureFreeOpenAiLocalProfile',
  'ensureManagedApiProfile',
  'function activateStarter(model)',
  'function writeLocalInstallResume(source,model)',
  'function installerTarget(source,model)',
  "params.set('starter',model.id)",
  "params.set('model',model.model)",
  "target:installerTarget(source,{id:starterId,model:modelId})",
  'function openInstaller(source,model)',
  "source:'active-node-starter-rail'",
  "openInstaller('active-node-starter-rail',model)",
  "openInstaller('active-node-local-install')",
  "openInstaller('active-node-ollama-direct'",
  "openInstaller('active-node-webgpu-fallback')",
  'mmir-free-local-adapter-selected',
  'b.refresh().then(models=>',
  'b.send()',
  'w.location.href=resume.target',
  "no_paid_routes_started:true",
  "if(action!=='install')",
  'primary-chat-link',
  'Free routes:',
  'Private local:',
  'composer.parentNode.insertBefore(bar,composer.nextSibling)',
  'display:flex;gap:.42rem;overflow:auto',
  'data-free-starter-count'
]) {
  requireIncludes(activeStrip, needle, `Active node strip must wire real chat routes: ${needle}`);
}

for (const needle of [
  'grid-template-columns:minmax(150px,1fr) auto',
  '.mmir-active-starter-rail button[data-route-state="setup"]',
  '.mmir-active-node-card[data-node-state="online"]'
]) {
  requireIncludes(deferredCss, needle, `Deferred CSS must own active-node polish after D301: ${needle}`);
}

if (activeStrip.includes('https://api.mmir.ai/nodes')) {
  fail('Active node strip must not show a managed API node as connected unless chat can actually use it.');
}

for (const needle of [
  "url.pathname === '/v1/models'",
  "url.pathname === '/v1/chat/completions'"
]) {
  requireIncludes(connectorServer, needle, `Downloadable local connector must honor advertised OpenAI-compatible aliases: ${needle}`);
}

for (const needle of [
  'function updateChatSurfaceState()',
  'refresh:()=>refreshState(true),send:sendMessage',
  "document.body.classList.toggle('mimir-has-chat',hasChat)",
  "transcriptEl.dataset.empty=String(!hasChat)",
  'scrollTranscriptToBottom()',
  "['/chat/completions','/v1/chat/completions','/chat']",
  'function optionalHealthCheck(profile,url)',
  'function fetchModelInventory(profile,url,headers)',
  "'/v1/models'",
  'MMIR automatically fell back to the free browser guide',
  'Free \'+s.label+\' ready. Local node optional.',
  'WebGPU unavailable; guide/install ready.',
  "detail:sr?'optional':'repair local node'",
  'function defaultFirstPrompt()',
  'Starting the safest free chat automatically',
  'No setup needed. MMIR is starting a free browser chat automatically.'
]) {
  requireIncludes(runtime, needle, `Chat runtime must keep smooth chat state and fallback behavior: ${needle}`);
}

if (runtime.includes("setStatus('Write a message first.'")) {
  fail('Empty send must start the free browser chat instead of becoming a dead validation error.');
}

for (const needle of [
  '.mimir-has-chat #mimir-chat-runtime{order:2}',
  '.mimir-has-chat .mimir-composer{order:3;position:sticky',
  '.mimir-has-chat .mimir-greeting{display:none}',
  '.mimir-has-chat .quick-suggestions{display:none;order:4}',
  '.mimir-has-chat #mmir-active-nodes-bar .mmir-active-starter-rail,.mimir-has-chat #mmir-active-nodes-bar .mmir-active-node-grid{display:none}',
  '.mimir-chat-first #mmir-active-nodes-bar{order:3}',
  '.mimir-chat-first #runtime-context-controls,.mimir-chat-first #mimir-chat-runtime{order:4}'
]) {
  requireIncludes(shellCss, needle, `Chat-first shell CSS must become transcript-first after first message: ${needle}`);
}

for (const needle of [
  '.runtime-transcript[data-empty="true"]',
  '.mimir-has-chat .runtime-transcript',
  'max-height: min(62vh, 640px)'
]) {
  requireIncludes(runtimeCss, needle, `Runtime CSS must keep a smooth transcript surface: ${needle}`);
}

requireIncludes(mmir, '<script src="./apps/mimir-chat-portal/active-node-strip.js?v=20260526-stale-offline-model-proof-v1" defer></script>', 'MMIR page must load the active chat node strip as critical chat UI.');
requireIncludes(mmir, 'Press send to start automatically', 'Composer placeholder must tell users they can start without setup or typing.');
if (deferredQueue.some((item) => String(item).includes('active-node-strip.js'))) {
  fail('Active chat node strip must not wait for the deferred feature queue.');
}
requireIncludes(mmir, 'if(u.origin===location.origin)return false', 'Quiet local probe guard must allow same-origin static JSON/assets on localhost dev servers.');
requireIncludes(workflows, 'smoke-check-chat-smooth-active-nodes.js', 'GitHub workflows must run the smooth active-node chat gate.');

if (!process.exitCode) {
  console.log('Chat smooth active-node smoke check passed.');
}
