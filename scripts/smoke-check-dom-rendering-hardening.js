import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  activeNodeStrip: join(publicDir, 'apps', 'mimir-chat-portal', 'active-node-strip.js'),
  composerModelPicker: join(publicDir, 'apps', 'mimir-chat-portal', 'composer-model-picker.js'),
  sharingCenter: join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'),
  publicSafetyAudit: join(root, 'scripts', 'public-safety-audit.js'),
  progressDashboard: join(publicDir, 'progress-dashboard.json'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function read(file) {
  if (!existsSync(file)) {
    fail(`Missing DOM hardening file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function requireNotIncludes(source, needle, message) {
  if (source.includes(needle)) fail(message);
}

const chatRuntime = read(files.chatRuntime);
const activeNodeStrip = read(files.activeNodeStrip);
const composerModelPicker = read(files.composerModelPicker);
const sharingCenter = read(files.sharingCenter);
const publicSafetyAudit = read(files.publicSafetyAudit);
const progress = JSON.parse(read(files.progressDashboard) || '{}');

for (const needle of [
  'p.textContent=block',
  'codeEl.textContent=code',
  'small.textContent=message.meta',
  'target.innerHTML=\'\'',
  'transcriptEl.innerHTML=\'\''
]) {
  requireIncludes(chatRuntime, needle, `Chat transcript must render user/model content through DOM text nodes: ${needle}`);
}
for (const needle of ['message.content</', '${message.content}', '+message.content+', 'innerHTML=message']) {
  requireNotIncludes(chatRuntime, needle, `Chat runtime must not interpolate raw message content into HTML: ${needle}`);
}

for (const needle of [
  'safe=v=>String(v||\'\')',
  'safe(node.name)',
  'safe(nodeDetail(node))',
  'safe(status)',
  'safe(model)',
  'safe(String(node.trust_level'
]) {
  requireIncludes(activeNodeStrip, needle, `Active node strip must escape dynamic route/model text: ${needle}`);
}

for (const needle of [
  'function escapeHtml(value)',
  'escapeHtml(title)',
  'escapeHtml(kind.label)',
  'escapeHtml(kind.detail)',
  'escapeHtml(group)',
  'escapeHtml(value)',
  'escapeHtml(selectedLabel())'
]) {
  requireIncludes(composerModelPicker, needle, `Composer model picker must escape dynamic model/catalog text: ${needle}`);
}

for (const needle of [
  'function safe(value)',
  'function redactShareSecrets(value)',
  'function sanitize(value',
  'sensitive?\'[redacted field]\':sanitize(entry',
  'Bearer [redacted]',
  '[redacted private key]'
]) {
  requireIncludes(sharingCenter, needle, `Safe sharing must keep redaction and escaping gates: ${needle}`);
}

for (const needle of [
  'browserBearerPattern',
  'passwordApiKeyInputPattern',
  'public browser app must not construct Authorization: Bearer',
  'public frontend must not expose an enabled API key password field'
]) {
  requireIncludes(publicSafetyAudit, needle, `Public safety audit must keep frontend secret/rendering-adjacent guard: ${needle}`);
}

const d256 = Array.isArray(progress.tasks) ? progress.tasks.find((task) => task.seq === 'D256') : null;
if (!d256 || d256.status !== 'beta') {
  fail('Progress dashboard task D256 must be beta after focused DOM rendering hardening ships.');
}

for (const workflow of [read(files.qualityWorkflow), read(files.pagesWorkflow)]) {
  requireIncludes(workflow, 'smoke-check-dom-rendering-hardening.js', 'CI workflows must run the DOM rendering hardening smoke gate.');
}

if (!process.exitCode) {
  console.log('DOM rendering hardening smoke check passed.');
}
