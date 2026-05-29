import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// Smoke check: frontpage chat usability (issue #182)
// Validates that the mmir.ai frontpage (mmir.html) meets minimum usability standards
// for the first-click chat experience on desktop and mobile.
// No browser or Playwright required.

const root = process.cwd();
const publicDir = resolve(root, 'public');
const indexPath = join(publicDir, 'index.html');
const mmirPath = join(publicDir, 'mmir.html');
const portalJsPath = join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.js');
const runtimeJsPath = join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js');
const activeNodeStripPath = join(publicDir, 'apps', 'mimir-chat-portal', 'active-node-strip.js');
const freeModelStartersPath = join(publicDir, 'free-model-starters.json');
const activeNodesPath = join(publicDir, 'active-chat-nodes.json');

const failures = [];

function fail(message) {
  failures.push(message);
}

function read(file) {
  if (!existsSync(file)) {
    fail(`Missing required file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function requireText(file, needle, message) {
  if (!read(file).includes(needle)) fail(message);
}

function forbidText(file, needle, message) {
  if (read(file).includes(needle)) fail(message);
}

// 1. Homepage must redirect/point to the mmir.html product page
requireText(indexPath, 'mmir.html', 'index.html must reference mmir.html for the first user journey.');

// 2. mmir.html must have the instant-start anchor for deep-links
requireText(mmirPath, 'id="mimir-instant-start"', 'mmir.html must include #mimir-instant-start anchor for direct activation.');

// 3. Chat runtime must load (required script tag)
requireText(mmirPath, 'mimir-chat-portal.js', 'mmir.html must load the chat portal script.');

// 4. Active node strip must load for live node status
requireText(mmirPath, 'active-node-strip.js', 'mmir.html must load the active-node-strip.js script.');

// 5. The main chat portal JS must manage backend profiles (its core responsibility)
requireText(portalJsPath, 'upsertFreeLocalProfile', 'mimir-chat-portal.js must expose free local profile management.');

// 6. The chat runtime must handle the Browser Guide route
requireText(runtimeJsPath, 'browser-guide', 'chat-runtime.js must handle the browser-guide chat route.');

// 7. The active node strip must gate managed API readiness
requireText(activeNodeStripPath, 'managedReady()', 'active-node-strip.js must gate managed API liveness via managedReady().');

// 8. Free model starters must include at least one browser-runtime model
const freeModels = JSON.parse(read(freeModelStartersPath) || '{}');
const models = Array.isArray(freeModels.models) ? freeModels.models : [];
const browserModel = models.find((m) => m && (m.runtime === 'browser-guide' || m.runtime === 'webllm' || m.runtime === 'transformers'));
if (!browserModel) {
  fail('free-model-starters.json must include at least one browser-guide or browser-runtime model.');
}

// 9. Active nodes manifest must not claim managed API is live before runtime verification
const activeNodes = JSON.parse(read(activeNodesPath) || '{}');
const nodes = Array.isArray(activeNodes.nodes) ? activeNodes.nodes : [];
const managedNode = nodes.find((n) => n && n.id === 'managed-api-bootstrap');
if (managedNode && managedNode.status === 'online') {
  fail('active-chat-nodes.json must not claim managed API node is online before runtime verification.');
}

// 10. No "No backend selected" visible language in the static chat page
// (we check for the pattern that would leave users confused)
forbidText(mmirPath, 'No backend selected', 'mmir.html must not show "No backend selected" in static HTML; use a free route instead.');

// 11. No internal roadmap content on the public page
forbidText(mmirPath, '#progress-dashboard', 'mmir.html must not link to the internal progress dashboard.');
forbidText(mmirPath, 'gui-parity', 'mmir.html must not reference the internal GUI parity matrix.');

// 12. The chat page must have an ARIA label or equivalent for the prompt area
requireText(mmirPath, 'aria-label="Message MMIR"', 'Chat prompt must have an aria-label for screen reader accessibility.');

if (failures.length) {
  console.error('Frontpage chat usability smoke check FAILED:');
  failures.forEach((f) => console.error('  - ' + f));
  process.exit(1);
}

console.log('Frontpage chat usability smoke check passed.');
