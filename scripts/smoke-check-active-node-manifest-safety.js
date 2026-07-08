import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const manifestPath = join(root, 'public', 'active-chat-nodes.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function bool(value) {
  return value === true || value === false;
}

function requireFalse(value, label) {
  if (value !== false) fail(`${label} must be false.`);
}

function requireString(value, label) {
  if (!String(value || '').trim()) fail(`${label} must be present.`);
}

function isLocalhost(hostname) {
  return ['localhost', '127.0.0.1', '::1'].includes(String(hostname || '').toLowerCase());
}

function isLikelyAbsoluteUrl(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function assertPublicUrl(value, label, { allowHttpLocalhost = false } = {}) {
  const raw = String(value || '').trim();
  if (!raw) return;
  let url;
  try {
    url = new URL(raw);
  } catch {
    fail(`${label} must be a valid absolute URL.`);
    return;
  }

  if (url.username || url.password) fail(`${label} must not embed credentials.`);
  if (url.search) fail(`${label} must not include query strings.`);
  if (url.hash) fail(`${label} must not include fragments.`);

  if (url.protocol === 'http:') {
    if (!allowHttpLocalhost || !isLocalhost(url.hostname)) fail(`${label} may only use http for localhost routes.`);
    return;
  }

  if (url.protocol !== 'https:') fail(`${label} must use https unless it is a localhost-only route.`);
}

const secretValuePatterns = [
  /\bsk-[A-Za-z0-9_-]{12,}\b/i,
  /\bAIza[0-9A-Za-z_-]{20,}\b/,
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/,
  /\b(?:token|api[_-]?key|secret|signature|sig)=/i
];

function inspectPublicValue(value, path = 'manifest') {
  if (typeof value === 'string') {
    for (const pattern of secretValuePatterns) {
      if (pattern.test(value)) fail(`${path} must not contain secret-shaped values.`);
    }

    if (isLikelyAbsoluteUrl(value)) {
      assertPublicUrl(value, path, { allowHttpLocalhost: true });
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => inspectPublicValue(entry, `${path}[${index}]`));
    return;
  }

  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) inspectPublicValue(entry, `${path}.${key}`);
  }
}

inspectPublicValue(manifest);

const updatedAt = String(manifest.updated_at || '').trim();
requireString(updatedAt, 'active-chat-nodes updated_at');
if (updatedAt && Number.isNaN(Date.parse(updatedAt))) fail('active-chat-nodes updated_at must be parseable.');
if (updatedAt && Date.parse(updatedAt) > Date.now() + 10 * 60 * 1000) fail('active-chat-nodes updated_at must not be future-dated.');

const nodes = Array.isArray(manifest.nodes) ? manifest.nodes : [];
if (nodes.length < 2) fail('active-chat-nodes must expose at least a hosted/free route and a local route.');

const ids = new Set();
let hostedCount = 0;
let localCount = 0;
let browserCandidateCount = 0;

for (const node of nodes) {
  const id = String(node?.id || '').trim();
  requireString(id, 'active-chat-node id');
  if (ids.has(id)) fail(`active-chat-node id ${id} must be unique.`);
  ids.add(id);

  const cost = node?.cost || {};
  const meta = node?.receipt_metadata || {};
  const route = node?.route || {};
  const kind = String(route.kind || '');
  const type = String(node?.type || '');
  const trust = String(node?.trust_level || '');
  const capabilities = Array.isArray(node?.capabilities) ? node.capabilities : [];

  requireFalse(cost.requires_approval, `node ${id} cost.requires_approval`);
  if (!String(cost.mode || '').startsWith('free')) fail(`node ${id} cost.mode must stay free-scoped.`);
  if (meta.provider_key_required !== undefined) requireFalse(meta.provider_key_required, `node ${id} receipt_metadata.provider_key_required`);
  if (meta.cloudflare_required !== undefined) requireFalse(meta.cloudflare_required, `node ${id} receipt_metadata.cloudflare_required`);
  if (meta.prompt_left_device !== undefined && meta.prompt_left_device !== false) fail(`node ${id} receipt_metadata.prompt_left_device must not claim prompts leave the user device.`);
  if (meta.install_required !== undefined && !bool(meta.install_required)) fail(`node ${id} receipt_metadata.install_required must be boolean when present.`);
  if (node.provider_called === true) fail(`node ${id} must not claim provider_called in the static manifest.`);
  if (node.trusted_live === true) fail(`node ${id} must not claim trusted_live in the static manifest.`);
  if (node.public_promotion_allowed === true) fail(`node ${id} must not allow public promotion from the static manifest.`);

  if (route.url) assertPublicUrl(route.url, `node ${id} route.url`, { allowHttpLocalhost: id === 'local-node' || type === 'local-adapter' });

  if (kind === 'managed-api') {
    hostedCount += 1;
    if (node.status === 'online') fail(`managed node ${id} must not claim static online status.`);
    if (node.status !== 'verify_before_chat') fail(`managed node ${id} must verify before chat.`);
    if (String(route.url || '') !== 'https://api.mmir.ai') fail(`managed node ${id} must use the public MMIR free route host.`);
    if (trust !== 'public-free') fail(`managed node ${id} must remain public-free.`);
    if (capabilities.includes('chat.completions') && !capabilities.includes('health')) fail(`managed node ${id} chat capability must keep a health proof path.`);
  }

  if (id === 'local-node' || type === 'local-adapter') {
    localCount += 1;
    if (cost.mode !== 'free-local') fail(`local node ${id} must stay free-local.`);
    if (meta.cost_class !== 'free-local') fail(`local node ${id} receipt_metadata.cost_class must stay free-local.`);
    if (!String(meta.execution_boundary || '').startsWith('localhost')) fail(`local node ${id} must disclose a localhost execution boundary.`);
  }

  if (type === 'browser' || id.startsWith('browser-webgpu')) {
    browserCandidateCount += 1;
    if (node.status !== 'lab_proof_required') fail(`browser candidate ${id} must stay lab_proof_required.`);
    if (node.public_headline !== false) fail(`browser candidate ${id} must not be public_headline before proof.`);
    if (node.promotion_allowed !== false) fail(`browser candidate ${id} promotion_allowed must be false before proof.`);
    if (String(node.public_surface || '') !== 'advanced_only_until_proven') fail(`browser candidate ${id} must stay advanced-only until proven.`);
    if (meta.cost_class !== 'free-user-device') fail(`browser candidate ${id} receipt_metadata.cost_class must stay free-user-device.`);
    if (meta.execution_boundary !== 'current-browser-session') fail(`browser candidate ${id} must disclose current-browser-session execution.`);
  }
}

if (hostedCount < 1) fail('active-chat-nodes must keep one managed API setup route visible.');
if (localCount < 5) fail('active-chat-nodes must keep the Local Node and local adapter routes visible.');
if (browserCandidateCount < 1) fail('active-chat-nodes must keep browser candidates visible but gated.');

if (failures.length) {
  console.error('Active node manifest safety smoke failed:');
  failures.forEach(failure => console.error('- ' + failure));
  process.exit(1);
}

console.log('Active node manifest safety smoke passed.');
