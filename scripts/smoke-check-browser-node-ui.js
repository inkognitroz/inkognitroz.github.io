import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const files = {
  picker: join(root, 'public', 'apps', 'mimir-chat-portal', 'composer-model-picker.js'),
  pickerCss: join(root, 'public', 'apps', 'mimir-chat-portal', 'composer-model-picker.css'),
  runtime: join(root, 'public', 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  receipts: join(root, 'public', 'apps', 'mimir-chat-portal', 'answer-context-receipts.js'),
  starters: join(root, 'public', 'free-model-starters.json'),
  nodes: join(root, 'public', 'active-chat-nodes.json'),
  activeStrip: join(root, 'public', 'apps', 'mimir-chat-portal', 'active-node-strip.js')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function read(file) {
  return readFileSync(file, 'utf8');
}

function requireIncludes(file, needle, message) {
  if (!read(file).includes(needle)) fail(message);
}

for (const [name, file] of Object.entries(files)) {
  if (!read(file)) fail(`Missing browser-node file fixture: ${name}`);
}

for (const text of [
  'Browser Node',
  'browser-local/private',
  'starter quality',
  'no provider key',
  'no Cloudflare',
  'no install',
  'mmir-browser-node-support-updated',
  'requestAdapter',
  'shader-f16',
  'requires_shader_f16',
  '__MimirBrowserNodeSupport'
]) {
  requireIncludes(files.picker, text, `Composer picker must expose Browser Node UI/support copy: ${text}`);
}

for (const text of [
  'modelNeedsShaderF16',
  'WebGPU adapter missing shader-f16 for this browser model',
  'Browser Node unsupported - shader-f16 needed'
]) {
  requireIncludes(files.runtime, text, `Runtime must fail closed before downloading f16 Browser Models without shader-f16: ${text}`);
}

for (const text of [
  'webGpuMissingLabel',
  'Needs shader-f16',
  'missing shader-f16'
]) {
  requireIncludes(files.activeStrip, text, `Active node strip must show precise shader-f16 Browser Model blocker: ${text}`);
}

for (const [fixture, file] of Object.entries({
  runtime: files.runtime,
  picker: files.picker,
  nodes: files.activeStrip
})) {
  requireIncludes(file, '__MimirBrowserNodeSupport', `Browser Node readiness must use shared adapter-proven support state: ${fixture}`);
}

if (read(files.activeStrip).includes('Boolean(secure()&&wasm()&&navigator.gpu)')) {
  fail('Active node strip must not mark Browser Node ready from navigator.gpu alone.');
}

if (read(join(root, 'public', 'apps', 'mimir-chat-portal', 'runtime-controls-webgpu-truth.js')).includes('Boolean(secure()&&wasm()&&navigator.gpu)')) {
  fail('Runtime WebGPU truth layer must not mark Browser Model ready from navigator.gpu alone.');
}

for (const text of [
  'node_type',
  'trust_class',
  'cost_class',
  'quality_tier',
  'execution_boundary',
  'prompt_left_device',
  'provider_key_required',
  'cloudflare_required',
  'install_required'
]) {
  requireIncludes(files.runtime, text, `Runtime first-chat receipt must include browser-node metadata: ${text}`);
  requireIncludes(files.receipts, text, `Answer context receipts must preserve browser-node metadata: ${text}`);
}

for (const text of [
  '"node_type": "browser"',
  '"trust_class": "device-local"',
  '"cost_class": "free-user-device"',
  '"quality_tier": "starter"',
  '"execution_boundary": "current-browser-session"',
  '"requires": ["webgpu", "wasm", "secure_context"]'
]) {
  requireIncludes(files.starters, text, `Starter manifest must pin Browser Node metadata: ${text}`);
}

for (const text of [
  '"type": "browser"',
  '"receipt_metadata"',
  '"prompt_left_device": false',
  '"cloudflare_required": false',
  '"install_required": false'
]) {
  requireIncludes(files.nodes, text, `Active chat nodes manifest must expose Browser Node receipt metadata: ${text}`);
}

for (const text of [
  'data-picker-state="blocked"',
  'data-picker-state="failed"',
  'cursor:not-allowed'
]) {
  requireIncludes(files.pickerCss, text, `Composer picker CSS must show disabled Browser Node states: ${text}`);
}

if (!process.exitCode) {
  console.log('Browser Node UI smoke check passed.');
}
