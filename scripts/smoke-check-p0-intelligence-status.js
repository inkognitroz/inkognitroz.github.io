import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const portalDir = join(root, 'public', 'apps', 'mimir-chat-portal');
const shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const manifest = readFileSync(join(portalDir, 'asset-versions.json'), 'utf8');
const html = readFileSync(join(root, 'public', 'mmir.html'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) failures.push(message);
}

const expectedShellVersion = '20260704-image-attachment-boundary-v1';

requireIncludes(shell, "const INTELLIGENCE_SCORECARD_PATH='/intelligence/fabric/scorecard';", 'P0 shell must use the read-only intelligence scorecard endpoint.');
requireIncludes(shell, "const SUPERGENI_QUALITY_PATH='/intelligence/supergeni/quality';", 'P0 shell must name the Supergeni quality surface for owner-readable status.');
requireIncludes(shell, "menuButton('intelligence-status','Intelligence status'", 'Tools menu must expose Intelligence status inside the existing chat UI.');
requireIncludes(shell, "if(action==='intelligence-status')", 'Menu dispatcher must route the Intelligence status action.');
requireIncludes(shell, 'async function showIntelligenceStatus()', 'P0 shell must implement the Intelligence status action.');
requireIncludes(shell, 'fetchJson(API_URL+INTELLIGENCE_SCORECARD_PATH,{timeoutMs:9000})', 'Intelligence status must fetch the scorecard with a short read-only timeout.');
requireIncludes(shell, 'Intelligence. Connected.', 'Intelligence status answer must lead with the MMIR vision.');
requireIncludes(shell, 'Known executable parameter lower bound', 'Intelligence status must surface parameter capacity as lower-bound metadata.');
requireIncludes(shell, 'Primary score: ', 'Intelligence status must explain the actual quality metric.');
requireIncludes(shell, 'Parameters are capacity metadata, not the final quality score.', 'Intelligence status must not equate parameters with intelligence quality.');
requireIncludes(shell, 'Supergeni quality guard:', 'Intelligence status must surface the Supergeni quality guard.');
requireIncludes(shell, 'Connection-lift: ', 'Intelligence status must show the connection-lift probe version.');
requireIncludes(shell, 'Cheap quality row: no GitHub Actions, no KV writes, no paid routes.', 'Intelligence status must explain the cheap quality row cost posture.');
requireIncludes(shell, '[^A-Za-z/])supergeni', 'Brand normalization must not uppercase lowercase endpoint paths such as /intelligence/supergeni/quality.');
requireIncludes(shell, "captureInteraction('intelligence_status_ready'", 'Intelligence status usage must be learnable through sanitized telemetry.');
requireIncludes(shell, 'no provider call', 'Intelligence status must be explicit that it does not burn provider calls.');
requireIncludes(shell, `const P0_RUNTIME_VERSION='${expectedShellVersion}'`, 'P0 runtime version must be bumped for Intelligence status.');
requireIncludes(html, `p0-chat-shell.js?v=${expectedShellVersion}`, 'Public page must cache-bust the P0 runtime after Intelligence status changes.');
requireIncludes(manifest, `"p0-chat-shell.js": "${expectedShellVersion}"`, 'Asset manifest must track Intelligence status runtime version.');
requireIncludes(String(packageJson.scripts?.check || ''), 'smoke-check-p0-intelligence-status.js', 'npm run check must include the Intelligence status smoke test.');

if (failures.length) {
  console.error('P0 intelligence status smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 intelligence status smoke passed.');
