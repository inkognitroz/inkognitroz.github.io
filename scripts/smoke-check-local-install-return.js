import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const returnUrl = 'https://mmir.ai/mmir.html?mmir_local_return=1#local-connector';

const files = {
  mmir: join(publicDir, 'mmir.html'),
  localConnector: join(publicDir, 'apps', 'mimir-chat-portal', 'local-connector.js'),
  firstImpression: join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js'),
  nodeDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.js'),
  repairResumeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'repair-resume.css'),
  connectOptions: join(publicDir, 'connect-options.json'),
  guide: join(publicDir, 'local-connector-guide.json'),
  mac: join(publicDir, 'downloads', 'mmir-local-connector-mac.command'),
  windows: join(publicDir, 'downloads', 'mmir-local-connector-windows.ps1'),
  linux: join(publicDir, 'downloads', 'mmir-local-connector-linux.sh'),
  release: join(publicDir, 'downloads', 'mmir-local-connector-release.json')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  return readFileSync(file, 'utf8');
}

function requireIncludes(file, needle, message) {
  if (!text(file).includes(needle)) fail(message);
}

for (const file of [files.mac, files.windows, files.linux]) {
  requireIncludes(file, returnUrl, `${file} must return the user to MMIR local-node detection after install.`);
}

requireIncludes(files.mmir, 'local-connector.js?v=20260523-post-install-return', 'MMIR page must cache-bust the local connector post-install return code.');
requireIncludes(files.localConnector, 'function isPostInstallReturn()', 'Local connector UI must detect installer return URLs.');
requireIncludes(files.localConnector, "mmir_local_return')==='1'", 'Local connector UI must honor the mmir_local_return flag.');
requireIncludes(files.localConnector, 'schedulePostInstallRefresh', 'Local connector UI must schedule repeated post-install refresh attempts.');
requireIncludes(files.localConnector, 'mimir-repair-resume-v1:', 'D175 local connector must store installer-return repair resume state.');
requireIncludes(files.localConnector, 'mmir-repair-resume-started', 'D175 local connector must emit repair resume start events.');
requireIncludes(files.localConnector, 'mmir-repair-resume-checked', 'D175 local connector must emit repair resume verification events.');
requireIncludes(files.firstImpression, 'renderRepairResumeBanner', 'D176 first screen must show repair resume results after installer return.');
requireIncludes(files.nodeDashboard, 'renderRepairResumeBanner', 'D176 node dashboard must show repair resume results after installer return.');
requireIncludes(files.nodeDashboard, 'data-repair-resume-action', 'D176 repair resume status needs a concrete next action.');
requireIncludes(files.repairResumeCss, '.repair-resume-banner', 'D176 repair resume status must have first-screen styling.');
requireIncludes(files.localConnector, "document.getElementById('runtime-refresh')?.click()", 'Post-install return must refresh the chat runtime model list.');
requireIncludes(files.localConnector, 'mmir-local-install-returned', 'Post-install return must emit an event for other modules.');
requireIncludes(files.connectOptions, 'returns to MMIR after install', 'Connect options must describe the post-install return flow.');
requireIncludes(files.guide, 'mmir_local_return=1', 'Local connector guide must document automatic post-install detection.');

const release = JSON.parse(text(files.release));
const artifacts = Array.isArray(release.artifacts) ? release.artifacts : [];
for (const id of ['mac-command', 'windows-powershell', 'linux-shell']) {
  const artifact = artifacts.find((item) => item.id === id);
  if (!artifact?.sha256) fail(`Release manifest must keep checksum for changed installer artifact ${id}.`);
}

if (!process.exitCode) {
  console.log('Local install return smoke check passed.');
}
