import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  rootIndex: join(root, 'index.html'),
  publicIndex: join(publicDir, 'index.html'),
  mmir: join(publicDir, 'mmir.html'),
  apiClient: join(publicDir, 'apps', 'mimir-chat-portal', 'api-client.js'),
  runtime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  routeChips: join(publicDir, 'apps', 'mimir-chat-portal', 'route-chips.js'),
  p0Css: join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.css'),
  p0Runtime: join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'),
  runtimeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
  workspaceCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-workspace.css'),
  portal: join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.js'),
  criticalProfiles: join(publicDir, 'apps', 'mimir-chat-portal', 'backend-profiles-critical.js')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function read(file) {
  if (!existsSync(file)) {
    fail(`Missing Launch Slice A file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function normalized(file) {
  return read(file).replace(/\s+/g, ' ');
}

function requireIncludes(file, needle, message) {
  if (!read(file).includes(needle)) fail(message);
}

function requireNormalized(file, needle, message) {
  if (!normalized(file).includes(String(needle).replace(/\s+/g, ' '))) fail(message);
}

function forbid(file, pattern, message) {
  if (pattern.test(read(file))) fail(message);
}

for (const file of Object.values(files)) read(file);

requireIncludes(files.rootIndex, '<title>MMIR.ai</title>', 'Repository root title must match the public MMIR.ai title.');
requireIncludes(files.publicIndex, '<title>MMIR.ai</title>', 'Published root redirect title must match MMIR.ai.');
requireIncludes(files.mmir, '<title>MMIR.ai</title>', 'Main MMIR page title must be MMIR.ai.');
forbid(files.publicIndex, /MMIR by Inkognitroz/i, 'Published root title must not drift back to MMIR by Inkognitroz.');

for (const selector of [
  'id="mimir-prompt"',
  'id="new-backend"',
  'id="primary-chat-link"',
  'class="mimir-composer"'
]) {
  requireIncludes(files.mmir, selector, `First screen composer DOM is missing ${selector}.`);
}

for (const selector of [
  'runtime-model-chip',
  'runtime-node-chip',
  'runtime-privacy-chip',
  'runtime-tunnel-chip',
  'runtime-resource-chip',
  'composer-add-model',
  'composer-voice-input'
]) {
  requireIncludes(files.runtime, selector, `Launch Slice A runtime control is missing: ${selector}.`);
}

for (const text of [
  'Supergenious',
  'Node: ',
  'Privacy: ',
  'Tunnel: ',
  'Resources: ',
  '/models',
  '/hardware',
  '/tunnels/status'
]) {
  requireIncludes(files.runtime, text, `Launch Slice A truthful state contract missing: ${text}`);
}

for (const text of [
  'Supergenious answers immediately',
  'Node: ',
  'Privacy: ',
  'Tunnel: ',
  'Resources: ',
  'No browser provider secrets',
  "if(!sel||r==='live'||r==='browser-guide'||r==='auto')return 'ready'",
  "if(!raw||/^(no model|loading|model checking)$/i.test(raw))return FALLBACK_LABEL"
]) {
  requireIncludes(files.routeChips, text, `Launch Slice A deferred route-chip contract missing: ${text}`);
}

forbid(files.routeChips, /MMIR Guide works now as a free browser helper/i, 'Route chips must not expose the old MMIR Guide fallback copy.');

requireIncludes(files.routeChips, "if(tunnel?.public_url)return {text:'Tunnel: secure',state:'ready'", 'Secure tunnel chip may only turn ready when a tunnel public URL is actually present.');
requireIncludes(files.runtime, 'mimir-route-chips-ready', 'Runtime must refresh route chips once the deferred route-chip module is ready.');
requireIncludes(files.mmir, 'route-chips.js?v=20260531-model-chip-v2', 'Route-chip polish must load progressively after first-paint chat runtime.');
requireIncludes(files.mmir, 'p0-chat-shell.css?v=20260531-p0-simple-chat-v1', 'P0 simple chat shell CSS must load on the public page.');
requireIncludes(files.mmir, 'p0-chat-shell.js?v=20260531-p0-simple-chat-v1', 'P0 simple chat shell runtime must load on the public page.');
requireIncludes(files.p0Css, 'body.mmir-p0-ready > :not(#mmir-p0-app)', 'P0 shell must hide legacy controls and show only the simple chat app.');
requireIncludes(files.p0Runtime, "const API_URL='https://api.mmir.ai'", 'P0 shell must use api.mmir.ai as the immediate chat route.');
requireIncludes(files.p0Runtime, "const MAC_INSTALL_URL='./downloads/mmir-local-connector-mac.zip'", 'P0 shell must expose the reliable Mac connector ZIP.');
requireIncludes(files.p0Runtime, "targetAddressSpace='loopback'", 'P0 local connector checks must request loopback address-space permission.');
requireIncludes(files.mmir, 'api-client.js?v=20260531-local-loopback-v1', 'API client cache must bust for Local Network Access loopback support.');
requireIncludes(files.mmir, 'public-launch-guard.js?v=20260531-public-first-chat-v1', 'Public launch guard must load before runtime so stale local/WebGPU state cannot break first chat.');
requireIncludes(files.mmir, 'chat-runtime.css?v=20260531-public-first-chat-v1', 'Chat runtime CSS cache must bust for public first-chat recovery.');
requireIncludes(files.mmir, 'chat-workspace.css?v=20260531-public-first-chat-v1', 'Chat workspace CSS cache must bust for public first-chat recovery.');
requireIncludes(files.mmir, 'chat-runtime.js?v=20260531-mac-installer-v1', 'Chat runtime cache must bust for public UI capability cleanup, Browser WebGPU truth, Local Network Access loopback support and Mac installer link repair.');
requireIncludes(files.mmir, 'quiet-first-paint-hotfix.js?v=20260531-local-loopback-v1', 'Quiet-first-paint guard must load Local Network Access loopback support.');
requireIncludes(files.apiClient, "targetAddressSpace='loopback'", 'Local fetches must request loopback address-space permission for modern Chromium.');
requireIncludes(files.runtime, "?'loopback':undefined", 'Streaming local chat must request loopback address-space permission for modern Chromium.');
requireIncludes(files.runtime, "health:error?.status===401?'testing':'offline'", 'Unavailable backend/node checks must write offline/testing health, not ready.');
requireIncludes(files.portal, "health:'unknown'", 'Default managed API profile must begin unknown until runtime proof updates it.');
requireIncludes(files.criticalProfiles, "health:existing?.health==='ready'?'ready':'unknown'", 'Critical profile bootstrap must preserve ready only after prior runtime proof.');
forbid(files.portal, /defaultApiProfile\(\).*health:'ready'/s, 'Default API profile must not fake ready health.');

for (const selector of [
  '.mimir-public-chat:not(.mimir-has-chat) .composer-live-cluster{display:flex!important',
  '.mimir-public-chat :is(#runtime-node-chip,#runtime-privacy-chip,#runtime-tunnel-chip,#runtime-resource-chip){display:none!important',
  '.composer-live-chip[data-state="offline"]'
]) {
  const target = selector.includes(':is(#runtime-node-chip') ? files.workspaceCss : files.runtimeCss;
  requireNormalized(target, selector, `First screen chip visibility/style missing: ${selector}`);
}

forbid(files.runtimeCss, /not\(\.mimir-has-chat\).*composer-live-cluster[^{}]*display\s*:\s*none/i, 'Pre-chat composer live cluster must stay visible.');
forbid(files.runtimeCss, /not\(\.mimir-has-chat\).*#runtime-model-chip[^{}]*display\s*:\s*none/i, 'Pre-chat selected model chip must stay visible.');
forbid(files.runtimeCss, /not\(\.mimir-has-chat\).*#runtime-resource-chip[^{}]*display\s*:\s*none/i, 'Pre-chat resource/telemetry chip must stay visible as unavailable or real telemetry.');

if (!process.exitCode) {
  console.log('Launch Slice A DOM smoke check passed.');
}
