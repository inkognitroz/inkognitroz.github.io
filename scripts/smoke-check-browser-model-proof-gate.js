import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const startersPath = join(root, 'public', 'free-model-starters.json');
const nodesPath = join(root, 'public', 'active-chat-nodes.json');
const pickerPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'composer-model-picker.js');
const runtimePath = join(root, 'public', 'apps', 'mimir-chat-portal', 'chat-runtime.js');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function read(file) {
  return readFileSync(file, 'utf8');
}

function requireValue(value, key, expected, label) {
  if (value[key] !== expected) fail(`${label} ${key} must be ${JSON.stringify(expected)} before supported-browser proof is green.`);
}

function requireArrayIncludes(value, key, expectedItems, label) {
  const actual = Array.isArray(value[key]) ? value[key] : [];
  for (const item of expectedItems) {
    if (!actual.includes(item)) fail(`${label} ${key} missing required value: ${item}`);
  }
}

function requireGate(value, label) {
  if (value.status !== 'lab_proof_required') fail(`${label} must stay lab_proof_required until supported-browser proof is green.`);
  if (value.public_headline !== false) fail(`${label} must not be public_headline before proof.`);
  if (value.visibility && value.visibility !== 'advanced') fail(`${label} must be advanced visibility before proof.`);
  requireValue(value, 'promotion_allowed', false, label);
  requireValue(value, 'proof_status', 'pending_supported_browser_live_answer', label);
  requireValue(value, 'license_review_status', 'pending', label);
  requireValue(value, 'integrity_review_status', 'pending', label);
  requireValue(value, 'fallback_status', 'fallback_to_supergenious_until_model_answers', label);
  requireValue(value, 'runtime_package', '@mlc-ai/web-llm', label);
  requireValue(value, 'public_surface', 'advanced_only_until_proven', label);
  const gate = value.promotion_gate || {};
  if (gate.state !== 'supported_browser_live_answer_required') fail(`${label} must require supported-browser live-answer promotion gate.`);
  const evidence = Array.isArray(gate.required_evidence) ? gate.required_evidence : [];
  for (const item of ['supported_browser', 'model_load', 'non_empty_answer', 'latency_ms', 'license_review', 'integrity_review', 'clean_fallback']) {
    if (!evidence.includes(item)) fail(`${label} promotion gate missing required evidence: ${item}`);
  }
}

function requireStarterEvidence(model, label) {
  requireGate(model, label);
  requireValue(model, 'node_type', 'browser', label);
  requireValue(model, 'trust_class', 'device-local', label);
  requireValue(model, 'cost_class', 'free-user-device', label);
  requireValue(model, 'quality_tier', 'starter', label);
  requireValue(model, 'execution_boundary', 'current-browser-session', label);
  requireArrayIncludes(model, 'requires', ['webgpu', 'wasm', 'secure_context'], label);
  if (!String(model.model || '').trim()) fail(`${label} must name the exact WebLLM model id.`);
  if (!String(model.source_url || '').startsWith('https://')) fail(`${label} must keep a source_url for model/runtime review.`);
  if (!/^check /i.test(String(model.commercial_use || ''))) fail(`${label} commercial_use must stay pending review before proof.`);
}

const starters = readJson(startersPath).models || [];
const browserStarters = starters.filter((model) => model.runtime === 'webllm');
if (browserStarters.length < 1) fail('Expected at least one WebLLM/browser starter candidate.');
for (const model of browserStarters) requireStarterEvidence(model, `starter ${model.id}`);
const startersById = new Map(browserStarters.map((model) => [model.id, model]));

const nodes = readJson(nodesPath).nodes || [];
const browserNodes = nodes.filter((node) => node.type === 'browser' || String(node.id || '').startsWith('browser-webgpu'));
if (browserNodes.length < browserStarters.length) fail('Expected browser node manifest entries for every browser starter candidate.');
for (const node of browserNodes) {
  requireGate(node, `node ${node.id}`);
  const starterId = node.route?.starter_id;
  if (!startersById.has(starterId)) fail(`node ${node.id} must point to a known browser starter candidate.`);
  requireArrayIncludes(node.route || {}, 'requires', ['webgpu', 'wasm', 'secure_context'], `node ${node.id} route`);
  const receipt = node.receipt_metadata || {};
  requireValue(receipt, 'node_type', 'browser', `node ${node.id} receipt`);
  requireValue(receipt, 'trust_class', 'device-local', `node ${node.id} receipt`);
  requireValue(receipt, 'cost_class', 'free-user-device', `node ${node.id} receipt`);
  requireValue(receipt, 'quality_tier', 'starter', `node ${node.id} receipt`);
  requireValue(receipt, 'execution_boundary', 'current-browser-session', `node ${node.id} receipt`);
  requireValue(receipt, 'prompt_left_device', false, `node ${node.id} receipt`);
  requireValue(receipt, 'provider_key_required', false, `node ${node.id} receipt`);
  requireValue(receipt, 'cloudflare_required', false, `node ${node.id} receipt`);
  requireValue(receipt, 'install_required', false, `node ${node.id} receipt`);
  for (const model of node.models || []) {
    if (model.status !== 'lab_proof_required') fail(`node model ${model.id || model.name} must stay lab_proof_required until proof.`);
  }
}

const combined = read(startersPath) + read(nodesPath);
if (combined.includes('available_if_supported')) fail('Browser manifests must not use available_if_supported before live-answer proof.');

for (const [label, file] of Object.entries({ picker: pickerPath, runtime: runtimePath })) {
  const source = read(file);
  if (!source.includes('lab_proof_required')) fail(`${label} fallback model data must carry lab_proof_required status.`);
  if (!source.includes('public_headline:false')) fail(`${label} fallback model data must prevent public headline promotion.`);
  for (const text of [
    'promotion_allowed:false',
    "proof_status:'pending_supported_browser_live_answer'",
    "license_review_status:'pending'",
    "integrity_review_status:'pending'",
    "fallback_status:'fallback_to_supergenious_until_model_answers'",
    "runtime_package:'@mlc-ai/web-llm'",
    "public_surface:'advanced_only_until_proven'"
  ]) {
    if (!source.includes(text)) fail(`${label} fallback model data missing proof metadata: ${text}`);
  }
}

if (!process.exitCode) console.log('Browser model proof gate smoke check passed.');
