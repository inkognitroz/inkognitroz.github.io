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

function requireGate(value, label) {
  if (value.status !== 'lab_proof_required') fail(`${label} must stay lab_proof_required until supported-browser proof is green.`);
  if (value.public_headline !== false) fail(`${label} must not be public_headline before proof.`);
  if (value.visibility && value.visibility !== 'advanced') fail(`${label} must be advanced visibility before proof.`);
  const gate = value.promotion_gate || {};
  if (gate.state !== 'supported_browser_live_answer_required') fail(`${label} must require supported-browser live-answer promotion gate.`);
  const evidence = Array.isArray(gate.required_evidence) ? gate.required_evidence : [];
  for (const item of ['supported_browser', 'model_load', 'non_empty_answer', 'latency_ms', 'license_review', 'integrity_review', 'clean_fallback']) {
    if (!evidence.includes(item)) fail(`${label} promotion gate missing required evidence: ${item}`);
  }
}

const starters = readJson(startersPath).models || [];
const browserStarters = starters.filter((model) => model.runtime === 'webllm');
if (browserStarters.length < 1) fail('Expected at least one WebLLM/browser starter candidate.');
for (const model of browserStarters) requireGate(model, `starter ${model.id}`);

const nodes = readJson(nodesPath).nodes || [];
const browserNodes = nodes.filter((node) => node.type === 'browser' || String(node.id || '').startsWith('browser-webgpu'));
if (browserNodes.length < browserStarters.length) fail('Expected browser node manifest entries for every browser starter candidate.');
for (const node of browserNodes) {
  requireGate(node, `node ${node.id}`);
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
}

if (!process.exitCode) console.log('Browser model proof gate smoke check passed.');
