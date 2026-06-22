import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dashboardPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'node-dashboard.js');
const cssPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'node-dashboard.css');
const htmlPath = join(root, 'public', 'mmir.html');
const manifestPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'asset-versions.json');

const dashboard = readFileSync(dashboardPath, 'utf8');
const css = readFileSync(cssPath, 'utf8');
const html = readFileSync(htmlPath, 'utf8');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

requireIncludes(dashboard, 'function tunnelAccessSummary(plan,tunnel)', 'Node dashboard must summarize remote tunnel access inside the handoff card.');
requireIncludes(dashboard, 'function remotePairingSummary()', 'Node dashboard must summarize pairing-code state for remote handoff.');
requireIncludes(dashboard, 'aria-label="Remote handoff state"', 'Node handoff card must render a visible remote-state summary block.');
requireIncludes(dashboard, 'Remote device ready', 'Node handoff copy must explicitly state when a trusted remote device can connect.');
requireIncludes(dashboard, 'Pairing code idle', 'Node handoff copy must explain pairing-code readiness before creation.');
requireIncludes(dashboard, 'syncPairingSummary(message,state);', 'Pairing-code actions must keep the handoff summary in sync.');

requireIncludes(css, '.node-handoff-status {', 'Node handoff remote-state block must have dedicated layout styles.');
requireIncludes(css, '.node-handoff-status article[data-state="ready"] {', 'Node handoff remote-state block must style ready state.');

const expectedVersion = '20260622-node-handoff-remote-state-v1';
if (manifest.assets?.['node-dashboard.js'] !== expectedVersion) {
  fail('Asset manifest must track the node-dashboard remote-state JavaScript update.');
}
if (manifest.assets?.['node-dashboard.css'] !== expectedVersion) {
  fail('Asset manifest must track the node-dashboard remote-state CSS update.');
}
requireIncludes(html, `node-dashboard.css?v=${expectedVersion}`, 'mmir.html must cache-bust the node-dashboard remote-state CSS update.');
requireIncludes(html, `node-dashboard.js?v=${expectedVersion}`, 'mmir.html must cache-bust the node-dashboard remote-state JavaScript update.');

if (failures.length) {
  console.error('Node handoff remote-state smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Node handoff remote-state smoke passed.');
