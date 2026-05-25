import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  manifest: join(publicDir, 'active-chat-nodes.json'),
  activeStrip: join(publicDir, 'apps', 'mimir-chat-portal', 'active-node-strip.js'),
  runtime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  runtimeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
  shellCss: join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.css'),
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
for (const id of ['browser-guide', 'browser-webgpu-qwen', 'browser-webgpu-gemma', 'browser-webgpu-llama32', 'browser-webgpu-phi35', 'local-node']) {
  const node = nodes.find((item) => item.id === id);
  if (!node) fail(`Active chat node manifest missing ${id}.`);
  if (node?.cost?.requires_approval !== false) fail(`Active chat node ${id} must be no-approval/free-first.`);
}

const activeStrip = read(files.activeStrip);
const runtime = read(files.runtime);
const runtimeCss = read(files.runtimeCss);
const shellCss = read(files.shellCss);
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
  'function bestNode(nodes,selected)',
  'function activateStarter(model)',
  'function writeLocalInstallResume(source)',
  'function openInstaller(source)',
  "source:'active-node-starter-rail'",
  "openInstaller('active-node-local-install')",
  "openInstaller('active-node-webgpu-fallback')",
  "w.location.href='./downloads/mmir-local-connector-install.html'",
  "no_paid_routes_started:true",
  "if(action!=='install')",
  'primary-chat-link',
  'free/public-safe routes that the composer can actually use',
  'composer.parentNode.insertBefore(bar,composer.nextSibling)',
  'grid-template-columns:minmax(150px,1fr) auto',
  'display:flex;gap:.42rem;overflow:auto'
]) {
  requireIncludes(activeStrip, needle, `Active node strip must wire real chat routes: ${needle}`);
}

if (activeStrip.includes('https://api.mmir.ai/nodes')) {
  fail('Active node strip must not show a managed API node as connected unless chat can actually use it.');
}

for (const needle of [
  'function updateChatSurfaceState()',
  "document.body.classList.toggle('mimir-has-chat',hasChat)",
  "transcriptEl.dataset.empty=String(!hasChat)",
  'scrollTranscriptToBottom()',
  'MMIR automatically fell back to the free browser guide',
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

requireIncludes(mmir, '<script src="./apps/mimir-chat-portal/active-node-strip.js?v=20260525-critical-active-routes-v1" defer></script>', 'MMIR page must load the active chat node strip as critical chat UI.');
requireIncludes(mmir, 'Press send to start automatically', 'Composer placeholder must tell users they can start without setup or typing.');
if (deferredQueue.some((item) => String(item).includes('active-node-strip.js'))) {
  fail('Active chat node strip must not wait for the deferred feature queue.');
}
requireIncludes(mmir, 'if(u.origin===location.origin)return false', 'Quiet local probe guard must allow same-origin static JSON/assets on localhost dev servers.');
requireIncludes(workflows, 'smoke-check-chat-smooth-active-nodes.js', 'GitHub workflows must run the smooth active-node chat gate.');

if (!process.exitCode) {
  console.log('Chat smooth active-node smoke check passed.');
}
