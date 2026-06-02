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
requireIncludes(files.mmir, 'p0-chat-shell.css?v=20260602-explicit-route-tags-v17', 'P0 simple chat shell CSS must load on the public page.');
requireIncludes(files.mmir, 'p0-chat-shell.js?v=20260602-explicit-route-tags-v17', 'P0 simple chat shell runtime must load on the public page.');
requireIncludes(files.mmir, '<body class="mimir-public-chat mimir-chat-first mmir-p0-ready">', 'Public page must hide legacy UI at first paint before the P0 runtime installs.');
requireIncludes(files.p0Css, 'body.mmir-p0-ready > :not(#mmir-p0-app)', 'P0 shell must hide legacy controls and show only the simple chat app.');
requireIncludes(files.p0Css, '.p0-mic', 'P0 toolbar must render voice as a compact icon control, not visible text.');
requireIncludes(files.p0Css, '.p0-route', 'P0 shell must show a subtle route receipt in the composer.');
requireIncludes(files.p0Css, '.p0-message-receipt', 'P0 assistant answers must include a visible route receipt.');
requireIncludes(files.p0Runtime, "const API_URL='https://api.mmir.ai'", 'P0 shell must use api.mmir.ai as the immediate chat route.');
requireIncludes(files.p0Runtime, "const MAC_INSTALL_URL='./downloads/mmir-local-connector-mac.zip'", 'P0 shell must expose the reliable Mac connector ZIP.');
requireIncludes(files.p0Runtime, 'Connect local model', 'P0 add menu must present local setup as a user task, not internal installer plumbing.');
requireIncludes(files.p0Runtime, 'Supergenious answers now', 'P0 empty state must make the immediate chat path clear.');
requireIncludes(files.p0Runtime, 'Supergenious · Free · api.mmir.ai', 'P0 hosted route receipt must be visible to users.');
requireIncludes(files.p0Runtime, 'Private · This Mac', 'P0 local route receipt must be visible to users.');
requireIncludes(files.p0Runtime, 'data-p0-action="compare-live"', 'P0 compare must be implemented as a gated toolbar action.');
requireIncludes(files.p0Runtime, 'function bestLocalModel()', 'P0 compare must pick a ranked local model after real local discovery.');
requireIncludes(files.p0Runtime, 'Compare answers', 'P0 compare must be user-facing as an answer comparison, not internal routing jargon.');
requireIncludes(files.p0Runtime, 'formatDuration(performance.now()-hostedStarted)', 'P0 compare must show route response timing.');
requireIncludes(files.p0Css, '.p0-featured-action', 'P0 compare action must be visually discoverable without exposing unfinished capabilities.');
requireIncludes(files.p0Runtime, 'function smartDecision(prompt)', 'P0 shell must include smart route selection logic.');
requireIncludes(files.p0Runtime, 'function wantsPrivateRoute(prompt)', 'P0 smart routing must detect private/local intent.');
requireIncludes(files.p0Runtime, 'function wantsCompareRoute(prompt)', 'P0 smart routing must detect compare intent.');
requireIncludes(files.p0Runtime, 'Smart route: private local', 'P0 smart routing must label private automatic local routing.');
requireIncludes(files.p0Runtime, 'Smart routing', 'P0 model picker must explain automatic routing without adding dashboard clutter.');
requireIncludes(files.p0Css, '.p0-routing-hint', 'P0 model picker must render smart routing guidance.');
requireIncludes(files.p0Runtime, 'function wantsPublicFactRoute(prompt)', 'P0 quality guard must detect public/current factual prompts.');
requireIncludes(files.p0Runtime, 'Quality guard: public facts', 'P0 quality guard must label hosted fallback for public facts from local routes.');
requireIncludes(files.p0Runtime, 'Public facts use Supergenious', 'P0 model picker must explain public fact routing.');
requireIncludes(files.p0Runtime, 'function explicitMentionDecision(prompt)', 'P0 chat must treat explicit @model tags as route commands.');
requireIncludes(files.p0Runtime, "return {mode:'compare',model:localModel,prompt:cleaned}", 'P0 chat must support explicit @supergenius + local-model compare intent.');
requireIncludes(files.p0Runtime, 'Local-only: public facts may be outdated', 'P0 chat must warn when explicit local-only routing is used for public facts.');
requireIncludes(files.p0Runtime, 'Tiny private model · slower/weak fallback', 'Tiny local models must be labeled as weak fallback routes.');
requireIncludes(files.p0Runtime, 'Allow Local Network Access for mmir.ai', 'P0 local permission failure must be actionable.');
requireIncludes(files.p0Runtime, 'Local fallback', 'P0 local chat failures must keep answering through the hosted route.');
requireIncludes(files.p0Runtime, 'while local access waits for permission', 'P0 local chat failures must explain that hosted fallback answered.');
requireIncludes(files.p0Runtime, 'MMIR returns here and finds models automatically', 'P0 local install copy must describe the automatic return flow.');
requireIncludes(files.p0Runtime, 'checkLocalModels().catch(()=>{})', 'P0 local model checks must not leak browser-blocked probes as unhandled page errors.');
requireIncludes(files.p0Runtime, "status('Listening...','ready')", 'P0 mic button must give immediate feedback when voice input is requested.');
requireIncludes(files.p0Runtime, "document.body.classList.add('mmir-p0-ready')", 'P0 runtime must set the same ready class that the P0 CSS uses to hide legacy UI.');
forbid(files.p0Runtime, /classList\.add\('mimir-p0-ready'\)/, 'P0 runtime must not use the misspelled ready class.');
requireIncludes(files.p0Runtime, "const HISTORY_SCHEMA='20260602-explicit-route-tags-v17'", 'P0 shell must invalidate stale browser-error chat history.');
requireIncludes(files.p0Runtime, 'Selected browser LLM is not loaded', 'P0 stale-state guard must explicitly purge the known Browser LLM failure copy.');
requireIncludes(files.p0Runtime, "allowLocalProbes('p0-find-local-models'", 'P0 Find local models must explicitly allow user-requested local probes.');
requireIncludes(files.p0Runtime, "allowLocalProbes('p0-local-chat'", 'P0 local chat must explicitly allow user-requested local connector calls.');
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
