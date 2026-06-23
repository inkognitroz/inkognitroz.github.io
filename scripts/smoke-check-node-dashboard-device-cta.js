import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dashboardPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'node-dashboard.js');
const htmlPath = join(root, 'public', 'mmir.html');
const manifestPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'asset-versions.json');

const dashboard = readFileSync(dashboardPath, 'utf8');
const html = readFileSync(htmlPath, 'utf8');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

requireIncludes(dashboard, 'function nextAction(checks,hardware)', 'Node dashboard next action must accept device context.');
requireIncludes(dashboard, 'const device=detectDevice(hardware);', 'Node dashboard next action must derive the current device before choosing install CTA copy.');
requireIncludes(dashboard, "primary:'Install on '+device.label,target:device.installer", 'Offline node CTA must send users to the device-specific installer.');
requireIncludes(dashboard, "detail:'Pick an installable-free Ollama model such as '+device.model+', run the installer path, then refresh until it becomes live.'", 'Model-install CTA must recommend a device-fit starter model.');
requireIncludes(dashboard, 'const action=report?.action||nextAction(checks,hardware);', 'Ready-state next action must keep hardware-aware CTA decisions.');

const expectedVersion = '20260623-node-dashboard-device-cta-v1';
if (manifest.assets?.['node-dashboard.js'] !== expectedVersion) {
  fail('Asset manifest must track the node-dashboard device-aware CTA update.');
}
requireIncludes(html, `node-dashboard.js?v=${expectedVersion}`, 'mmir.html must cache-bust the node-dashboard device-aware CTA update.');

if (failures.length) {
  console.error('Node dashboard device CTA smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Node dashboard device CTA smoke passed.');
