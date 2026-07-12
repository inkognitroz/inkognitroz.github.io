#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const publicDir = join(root, 'public');
const downloadsDir = join(publicDir, 'downloads');
const portalDir = join(publicDir, 'apps', 'mimir-chat-portal');
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath, encoding = 'utf8') {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    fail(`missing ${relativePath}`);
    return encoding ? '' : Buffer.alloc(0);
  }
  return readFileSync(absolutePath, encoding);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function forbidPattern(source, pattern, message) {
  if (pattern.test(source)) fail(message);
}

function sha256Buffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

const manifest = JSON.parse(read('public/downloads/mmir-local-connector-release.json') || '{}');
const packageJson = JSON.parse(read('package.json') || '{}');
const bootstrap = read('public/downloads/mmir-local-node-macos-linux.sh');
const macCommand = read('public/downloads/mmir-local-connector-mac.command');
const installPage = read('public/downloads/mmir-local-connector-install.html');
const localInstallHelper = read('public/apps/mimir-chat-portal/local-install-commands.js');
const p0Shell = read('public/apps/mimir-chat-portal/p0-chat-shell.js');

if (manifest.installer_qa?.checksum_algorithm !== 'sha256') {
  fail('release manifest installer_qa must declare sha256.');
}

const artifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
const checksumArtifacts = artifacts.filter((artifact) => artifact?.sha256);
if (checksumArtifacts.length < 10) {
  fail(`expected at least 10 checksum-protected public artifacts, found ${checksumArtifacts.length}`);
}
if (manifest.installer_qa?.artifacts_with_checksums !== checksumArtifacts.length) {
  fail('installer_qa.artifacts_with_checksums must match current checksum artifact count.');
}

for (const artifact of checksumArtifacts) {
  const artifactPath = String(artifact.path || '').replace(/^\/+/, '');
  const filePath = join(publicDir, artifactPath);
  if (!existsSync(filePath)) {
    fail(`release manifest artifact is missing from public dir: ${artifact.id} ${artifact.path}`);
    continue;
  }
  const actual = sha256Buffer(readFileSync(filePath));
  if (actual !== artifact.sha256) {
    fail(`checksum mismatch for ${artifact.id}: expected ${artifact.sha256}, got ${actual}`);
  }
}

function artifactById(id) {
  const artifact = artifacts.find((entry) => entry?.id === id);
  if (!artifact) fail(`release manifest missing artifact ${id}`);
  return artifact || {};
}

function artifactNote(artifact) {
  return String(artifact.notes || artifact.note || artifact.description || '');
}

const connectorServerSha = artifactById('connector-server').sha256 || '';
const macCommandArtifact = artifactById('mac-command');
const macZipArtifact = artifactById('mac-zip');
const macDmgArtifact = artifactById('mac-dmg-release-build');
const legacyMacLinuxArtifact = artifactById('legacy-macos-linux-local-node');

if (sha256Buffer(readFileSync(join(downloadsDir, 'mmir-local-connector-server.mjs'))) !== connectorServerSha) {
  fail('connector-server artifact SHA must match the published connector server file.');
}
requireIncludes(
  macCommand,
  `SERVER_SHA256="${connectorServerSha}"`,
  'Mac command fallback must embed the current connector-server SHA.'
);
forbidPattern(
  macCommand,
  /MMIR_LOCAL_CONNECTOR_SERVER_SHA256/,
  'Mac command fallback must not allow stale local checksum environment overrides.'
);

if (macCommandArtifact.recommended !== false) fail('mac-command must stay an advanced fallback.');
if (macZipArtifact.recommended !== false) fail('mac-zip must stay an advanced fallback.');
if (macDmgArtifact.recommended !== false) fail('mac-dmg must stay secondary until signing/notarization is approved.');
if (legacyMacLinuxArtifact.recommended !== true) fail('legacy Mac/Linux terminal bootstrap must stay the recommended Mac/Linux public path.');
requireIncludes(artifactNote(macCommandArtifact), 'Terminal curl bootstrap', 'mac-command notes must point users to Terminal bootstrap.');
requireIncludes(artifactNote(macZipArtifact), 'Advanced fallback', 'mac-zip notes must say advanced fallback.');

const macEntry = manifest.recommended_entrypoints?.macos_terminal || {};
if (macEntry.command !== 'curl -fsSL https://mmir.ai/downloads/mmir-local-node-macos-linux.sh | bash') {
  fail('macos_terminal entrypoint must keep the canonical one-line command.');
}
if (macEntry.artifact !== 'mmir-local-node-macos-linux.sh' || macEntry.public_path !== '/downloads/mmir-local-node-macos-linux.sh') {
  fail('macos_terminal entrypoint must point to the public Terminal bootstrap.');
}

for (const required of [
  'MMIR_LOCAL_CONNECTOR_RELEASE_MANIFEST',
  'download_verified "mac-command"',
  'download_verified "linux-shell"',
  'checksum mismatch',
  'Dry run complete: verified Mac connector installer checksum. No installer was executed.'
]) {
  requireIncludes(bootstrap, required, `Terminal bootstrap must include ${required}`);
}

for (const required of [
  'curl -fsSL https://mmir.ai/downloads/mmir-local-node-macos-linux.sh | bash',
  'Copy Mac install command',
  'Use the single recommended Mac command below',
  'Avoid ZIP and unsigned',
  'Advanced fallback exists',
  'Apple could not verify'
]) {
  requireIncludes(installPage, required, `public install page must include ${required}`);
}

for (const required of [
  'window.MimirLocalInstallCommands',
  'curl -fsSL https://mmir.ai/downloads/mmir-local-node-macos-linux.sh | bash',
  'Oppdater AI i statuslinjen',
  'Do you have a Mac computer? Copy and paste this in Terminal'
]) {
  requireIncludes(localInstallHelper, required, `chat-native install helper must include ${required}`);
}
forbidPattern(
  localInstallHelper,
  /mmir-local-connector-install|\.zip|\.command/i,
  'chat-native install helper must not route users to installer pages, ZIPs or unsigned command files.'
);

const startLocalInstallIndex = p0Shell.indexOf('function startLocalInstallAssistant');
const nextFunctionIndex = p0Shell.indexOf('function selectCommandText', startLocalInstallIndex + 1);
const startLocalInstallSource = startLocalInstallIndex >= 0
  ? p0Shell.slice(startLocalInstallIndex, nextFunctionIndex > startLocalInstallIndex ? nextFunctionIndex : undefined)
  : '';
requireIncludes(startLocalInstallSource, "routeStatus('Copy install command · local setup','hosted')", 'Connect local model flow must keep install guidance inside the compact chat status.');
requireIncludes(startLocalInstallSource, "commandLabel:'Copy command'", 'Connect local model flow must expose one obvious copy action.');
forbidPattern(
  startLocalInstallSource,
  /window\.open|location\.href|location\.assign|mmir-local-connector-install|\.zip|\.command/i,
  'Connect local model flow must not redirect to installer pages, ZIPs or unsigned command files.'
);

if (!String(packageJson.scripts?.check || '').includes('smoke-check-public-installer-readiness.js')) {
  fail('npm run check must include smoke-check-public-installer-readiness.js.');
}

if (failures.length) {
  console.error('public installer readiness smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('public installer readiness smoke passed.');
