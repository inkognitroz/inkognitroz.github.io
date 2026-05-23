import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const returnUrl = 'https://mmir.ai/mmir.html?mmir_local_return=1#local-connector';
const textExtensions = new Set(['.cmd', '.command', '.css', '.html', '.js', '.json', '.mjs', '.ps1', '.sh', '.svg', '.txt']);
const files = {
  manifest: join(publicDir, 'downloads', 'mmir-local-connector-release.json'),
  installPage: join(publicDir, 'downloads', 'mmir-local-connector-install.html'),
  mac: join(publicDir, 'downloads', 'mmir-local-connector-mac.command'),
  windows: join(publicDir, 'downloads', 'mmir-local-connector-windows.ps1'),
  linux: join(publicDir, 'downloads', 'mmir-local-connector-linux.sh'),
  connectorServer: join(publicDir, 'downloads', 'mmir-local-connector-server.mjs'),
  progress: join(publicDir, 'progress-dashboard.json'),
  updateScript: join(root, 'scripts', 'update-installer-release-hashes.js')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing installer release QA file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function json(file) {
  try {
    return JSON.parse(text(file));
  } catch {
    fail(`Invalid JSON for installer release QA: ${relative(root, file)}`);
    return {};
  }
}

function sha256(file) {
  const bytes = readFileSync(file);
  const normalized = textExtensions.has(extname(file).toLowerCase())
    ? Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8')
    : bytes;
  return createHash('sha256').update(normalized).digest('hex');
}

function artifactPath(pathValue) {
  return join(publicDir, String(pathValue || '').split(/[?#]/)[0].replace(/^\//, ''));
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

const manifest = json(files.manifest);
const installPage = text(files.installPage);
const connectorServer = text(files.connectorServer);
const updateScript = text(files.updateScript);
const progress = json(files.progress);
const artifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : [];

if (manifest.default_host !== '127.0.0.1') {
  fail('Installer release manifest must keep localhost as the default host.');
}
if (manifest.default_port !== 3000) {
  fail('Installer release manifest must keep 3000 as the default connector port.');
}
if (!String(manifest.cost_policy || '').includes('zero-cost local install only')) {
  fail('Installer release manifest must keep an explicit zero-cost policy.');
}
if (manifest.installer_qa?.public_frontend_secrets_allowed !== false || manifest.installer_qa?.paid_routes_started !== false) {
  fail('Installer QA block must forbid public frontend secrets and paid route starts.');
}
if (manifest.installer_qa?.post_install_return_url !== returnUrl) {
  fail('Installer QA block must record the post-install return URL.');
}
if (manifest.installer_qa?.text_hash_normalization !== 'lf') {
  fail('Installer QA block must document LF text hash normalization for cross-platform CI.');
}

let checksumCount = 0;
for (const artifact of artifacts) {
  if (!artifact?.id) fail('Every installer artifact must have an id.');
  if (artifact?.path) {
    const file = artifactPath(artifact.path);
    if (!existsSync(file)) {
      fail(`Installer artifact ${artifact.id} points at a missing public file: ${artifact.path}`);
      continue;
    }
    if (artifact.kind === 'client-mode' && artifact.sha256 === null) {
      continue;
    }
    if (!artifact.sha256) {
      fail(`Installer artifact ${artifact.id} with a public path must include sha256.`);
      continue;
    }
    const actual = sha256(file);
    checksumCount += 1;
    if (actual !== artifact.sha256) {
      fail(`Installer artifact ${artifact.id} checksum mismatch: expected ${artifact.sha256}, got ${actual}. Run scripts/update-installer-release-hashes.js.`);
    }
  }
}

const dmg = artifacts.find((artifact) => artifact.id === 'mac-dmg-release-build');
if (!dmg || dmg.path !== null || dmg.sha256 !== null || dmg.recommended !== false || dmg.status !== 'prepared') {
  fail('Mac DMG must stay prepared-but-unpublished until a real public artifact exists.');
}

for (const file of [files.mac, files.windows, files.linux]) {
  requireIncludes(text(file), returnUrl, `${relative(root, file)} must reopen MMIR with mmir_local_return=1.`);
  requireIncludes(text(file), '127.0.0.1', `${relative(root, file)} must keep localhost defaults visible.`);
}

[
  'Release verification',
  'Installer trust boundaries',
  'No paid cloud, provider route or managed compute starts',
  'mmir_local_return=1',
  'renderReleaseSummary',
  'fake DMG'
].forEach((needle) => requireIncludes(installPage, needle, `Installer page missing D205 release QA evidence: ${needle}`));

[
  'CONTRACT_VERSION',
  '127.0.0.1',
  '/doctor',
  '/pairing/sessions',
  '/tunnels/status'
].forEach((needle) => requireIncludes(connectorServer, needle, `Connector server missing release contract evidence: ${needle}`));

[
  'createHash',
  'installer_qa',
  'post_install_return_url',
  "text_hash_normalization: 'lf'"
].forEach((needle) => requireIncludes(updateScript, needle, `Installer hash updater missing repeatability evidence: ${needle}`));

if (checksumCount < 8) {
  fail('Installer release manifest should protect at least eight public artifacts with checksums.');
}
if (manifest.installer_qa?.artifacts_with_checksums !== checksumCount) {
  fail('Installer QA checksum count must match the current manifest artifacts.');
}

const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d205 = tasks.find((task) => task.seq === 'D205');
if (!d205 || d205.status !== 'beta') {
  fail('Progress dashboard task D205 must be beta after installer release QA ships.');
}
const d206 = tasks.find((task) => task.seq === 'D206');
if (!d206 || d206.status !== 'beta') {
  fail('Progress dashboard task D206 must be beta after installer-to-live-model proof ships.');
}
if (!Array.isArray(progress.next_queue) || progress.next_queue[0] !== 'D226') {
  fail('Progress dashboard next queue must prioritize D226 after D225 ships.');
}

if (!process.exitCode) {
  console.log('Installer release QA smoke check passed.');
}
