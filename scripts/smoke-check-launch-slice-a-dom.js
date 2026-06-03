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
requireIncludes(files.mmir, 'p0-chat-shell.css?v=20260603-scroll-pane-v41', 'P0 simple chat shell CSS must load on the public page.');
requireIncludes(files.mmir, 'p0-chat-shell.js?v=20260603-scroll-pane-v41', 'P0 simple chat shell runtime must load on the public page.');
requireIncludes(files.mmir, '<body class="mimir-public-chat mimir-chat-first mmir-p0-ready">', 'Public page must hide legacy UI at first paint before the P0 runtime installs.');
requireIncludes(files.p0Css, 'body.mmir-p0-ready > :not(#mmir-p0-app)', 'P0 shell must hide legacy controls and show only the simple chat app.');
requireIncludes(files.p0Css, '.p0-mic', 'P0 toolbar must render voice as a compact icon control, not visible text.');
requireIncludes(files.p0Runtime, 'p0-icon-shield', 'P0 privacy button must render a real discreet shield icon.');
requireIncludes(files.p0Runtime, 'p0-icon-mic', 'P0 voice button must render a real discreet mic icon.');
requireIncludes(files.p0Css, 'stroke: currentColor', 'P0 toolbar icons must use monochrome currentColor styling.');
requireIncludes(files.p0Css, '.p0-route', 'P0 shell must show a subtle route receipt in the composer.');
requireIncludes(files.p0Css, 'overscroll-behavior: contain', 'P0 transcript must be an independently scrollable answer pane.');
requireIncludes(files.p0Css, '-webkit-overflow-scrolling: touch', 'P0 transcript must support smooth touch scrolling.');
requireIncludes(files.p0Css, 'display: block;', 'P0 transcript must use block layout so long chats produce real scroll height.');
requireIncludes(files.p0Css, '.p0-message + .p0-message', 'P0 messages must preserve spacing without relying on grid gap that can collapse scroll height.');
requireIncludes(files.p0Css, '.p0-message-receipt', 'P0 assistant answers must include a visible route receipt.');
requireIncludes(files.p0Css, '.p0-receipt-full', 'P0 compact receipts must expose full audit details when expanded.');
requireIncludes(files.p0Runtime, "const API_URL='https://api.mmir.ai'", 'P0 shell must use api.mmir.ai as the immediate chat route.');
requireIncludes(files.p0Runtime, "data-p0-action=\"connect-local\"", 'P0 shell must start local setup through the chat-guided installer flow.');
requireIncludes(files.p0Runtime, 'curl -fsSL https://mmir.ai/downloads/mmir-local-node-macos-linux.sh | bash', 'P0 local setup copy must expose the working Mac/Linux Terminal bootstrap command.');
requireIncludes(files.p0Runtime, 'Do you have a Mac computer? Copy and paste this in Terminal to connect a local node.', 'P0 local setup must use simple chat-first Mac copy.');
requireIncludes(files.p0Runtime, 'data-p0-os-command="windows"', 'P0 local setup must ask for OS when browser detection is uncertain.');
requireIncludes(files.p0Runtime, 'Command selected. Press Cmd+C', 'P0 local setup must gracefully handle browsers that block clipboard writes.');
forbid(files.p0Runtime, /Install guide|Install help/i, 'P0 local setup must keep the connector install flow in chat instead of opening a guide page.');
requireIncludes(files.p0Runtime, 'Connect local model', 'P0 add menu must present local setup as a user task, not internal installer plumbing.');
requireIncludes(files.p0Runtime, 'Supergenious answers now', 'P0 empty state must make the immediate chat path clear.');
requireIncludes(files.p0Runtime, 'Supergenious · Free · api.mmir.ai', 'P0 hosted route receipt must be visible to users.');
requireIncludes(files.p0Runtime, 'Private · This Mac', 'P0 local route receipt must be visible to users.');
requireIncludes(files.p0Runtime, 'Keep answers short by default', 'P0 chat must keep responses short unless the user asks for detail.');
requireIncludes(files.p0Runtime, 'data-p0-action="compare-live"', 'P0 compare must be implemented as a gated toolbar action.');
requireIncludes(files.p0Runtime, 'function bestLocalModel()', 'P0 compare must pick a ranked local model after real local discovery.');
requireIncludes(files.p0Runtime, 'data-p0-action="best-answer-live"', 'P0 Best Answer must be implemented as a gated toolbar action after real local discovery.');
requireIncludes(files.p0Runtime, 'Best Answer', 'P0 Best Answer must be user-facing as the simple parallel-model action.');
requireIncludes(files.p0Runtime, 'Compare answers', 'P0 compare must be user-facing as an answer comparison, not internal routing jargon.');
requireIncludes(files.p0Runtime, 'scoreSummary(hostedScore)', 'P0 compare must show route score and response timing.');
requireIncludes(files.p0Runtime, 'function routeScore(model,prompt,answer,elapsedMs,failed=false)', 'P0 Best Answer must score route quality from answer, prompt and latency.');
requireIncludes(files.p0Runtime, "const ROUTE_SCORE_PATH='/routing/score'", 'P0 Best Answer must know the API scoring route.');
requireIncludes(files.p0Runtime, 'function scoreRoutesWithApi(prompt,hostedModel,hostedAnswer,hostedElapsed,hostedFailed,localModel,localAnswer,localElapsed,localFailed)', 'P0 Best Answer must call api.mmir.ai route scoring before selecting the winner.');
requireIncludes(files.p0Runtime, 'api.mmir.ai/routing/score', 'P0 Best Answer synthesis receipt must identify the API scoring source.');
requireIncludes(files.p0Runtime, 'API score ', 'P0 Best Answer receipts must show API scoring when the API scorer is available.');
requireIncludes(files.p0Runtime, 'function winningRoute(hostedModel,hostedScore,localModel,localScore)', 'P0 Best Answer must choose and explain a winner.');
requireIncludes(files.p0Runtime, 'Winner:', 'P0 Best Answer receipts must show the winning route.');
requireIncludes(files.p0Runtime, 'Score ', 'P0 Best Answer receipts must show route scores.');
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
requireIncludes(files.p0Runtime, 'Local facts may be stale', 'P0 compare must warn when a local model is included in public/current factual compare.');
requireIncludes(files.p0Runtime, 'say that you may be outdated instead of guessing', 'P0 local system prompt must discourage stale local factual guesses.');
requireIncludes(files.p0Runtime, 'function normalizeLocalHardware(payload)', 'P0 model picker must normalize local node CPU/RAM capacity.');
requireIncludes(files.p0Runtime, 'Local capacity', 'P0 model picker must show proven local capacity only after local discovery.');
requireIncludes(files.p0Css, '@media (max-width: 380px)', 'P0 toolbar must have a narrow mobile hardening rule.');
requireIncludes(files.p0Css, '.p0-left {\n  flex: 0 0 auto;', 'P0 toolbar must prevent left controls from collapsing on mobile.');
requireIncludes(files.p0Runtime, 'Compare answer 1/2', 'P0 compare receipts must identify the hosted answer.');
requireIncludes(files.p0Runtime, 'Compare answer 2/2', 'P0 compare receipts must identify the local answer.');
requireIncludes(files.p0Css, '.p0-message-compare', 'P0 compare answers must be visually distinguishable without adding a dashboard.');
requireIncludes(files.p0Runtime, 'function synthesizeCompareAnswer(prompt,hostedAnswer,localAnswer,localModel,hostedScore,localScore)', 'P0 compare must synthesize a best answer from real model outputs and route evidence.');
requireIncludes(files.p0Runtime, 'Best answer synthesis', 'P0 compare synthesis must be labeled in the route receipt.');
requireIncludes(files.p0Runtime, 'Best answer synthesis · No paid route', 'P0 compare synthesis must keep no-paid route trust visible.');
requireIncludes(files.p0Runtime, 'function compactReceipt(receipt)', 'P0 route receipts must be compact by default.');
requireIncludes(files.p0Runtime, 'function renderReceipt(receipt)', 'P0 route receipts must keep full audit details available on click.');
requireIncludes(files.p0Runtime, "routeStatus('Listening...','hosted')", 'P0 voice feedback must be visible in the composer route line on mobile.');
requireIncludes(files.p0Runtime, "routeStatus('Voice input stopped.','hosted')", 'P0 voice stop feedback must remain visible briefly when recognition ends quickly.');
requireIncludes(files.p0Runtime, 'function handleMenuAction(action)', 'P0 menu actions must use a central handler so local discovery cannot silently close menus.');
requireIncludes(files.p0Runtime, 'Checking this Mac for local models...', 'P0 local discovery must show immediate route feedback.');
requireIncludes(files.p0Runtime, 'Tiny private model · slower/weak fallback', 'Tiny local models must be labeled as weak fallback routes.');
requireIncludes(files.p0Runtime, 'Best local', 'P0 model picker must identify the best local starter after discovery.');
requireIncludes(files.p0Runtime, 'Private local models', 'P0 model picker must separate local models from the hosted default.');
requireIncludes(files.p0Runtime, 'function compareLocalModel(preferredLocalModel=null)', 'P0 compare must choose the best local model unless the user explicitly mentions another model.');
requireIncludes(files.p0Css, '.p0-menu-section', 'P0 model picker must visually group recommended and private local models.');
requireIncludes(files.p0Runtime, 'Allow Local Network Access for mmir.ai', 'P0 local permission failure must be actionable.');
requireIncludes(files.p0Runtime, 'Local fallback', 'P0 local chat failures must keep answering through the hosted route.');
requireIncludes(files.p0Runtime, 'while local access waits for permission', 'P0 local chat failures must explain that hosted fallback answered.');
requireIncludes(files.p0Runtime, 'After it says "MMIR Local Connector is ready", return here and press + -> Find local models.', 'P0 local install copy must describe the automatic return flow.');
requireIncludes(files.p0Runtime, 'checkLocalModels().catch(()=>{})', 'P0 local model checks must not leak browser-blocked probes as unhandled page errors.');
requireIncludes(files.p0Runtime, "status('Listening...','ready')", 'P0 mic button must give immediate feedback when voice input is requested.');
requireIncludes(files.p0Runtime, "document.body.classList.add('mmir-p0-ready')", 'P0 runtime must set the same ready class that the P0 CSS uses to hide legacy UI.');
forbid(files.p0Runtime, /classList\.add\('mimir-p0-ready'\)/, 'P0 runtime must not use the misspelled ready class.');
requireIncludes(files.p0Runtime, "const HISTORY_SCHEMA='20260603-clean-first-chat-v40'", 'P0 shell must invalidate stale browser-error and install-card chat history.');
requireIncludes(files.p0Runtime, 'function transientInstallMessage(message)', 'P0 shell must keep local install instructions chat-native but transient, not first-screen history.');
requireIncludes(files.p0Runtime, 'Selected browser LLM is not loaded', 'P0 stale-state guard must explicitly purge the known Browser LLM failure copy.');
requireIncludes(files.p0Runtime, "allowLocalProbes('p0-find-local-models'", 'P0 Find local models must explicitly allow user-requested local probes.');
requireIncludes(files.p0Runtime, "allowLocalProbes('p0-local-chat'", 'P0 local chat must explicitly allow user-requested local connector calls.');
requireIncludes(files.p0Runtime, "targetAddressSpace='loopback'", 'P0 local connector checks must request loopback address-space permission.');
requireIncludes(files.mmir, 'api-client.js?v=20260531-local-loopback-v1', 'API client cache must bust for Local Network Access loopback support.');
requireIncludes(files.mmir, 'public-launch-guard.js?v=20260531-public-first-chat-v1', 'Public launch guard must load before runtime so stale local/WebGPU state cannot break first chat.');
requireIncludes(files.mmir, 'chat-runtime.css?v=20260531-public-first-chat-v1', 'Chat runtime CSS cache must bust for public first-chat recovery.');
requireIncludes(files.mmir, 'chat-workspace.css?v=20260531-public-first-chat-v1', 'Chat workspace CSS cache must bust for public first-chat recovery.');
requireIncludes(files.mmir, 'chat-runtime.js?v=20260602-webgpu-shader-f16-v1', 'Chat runtime cache must bust for public UI capability cleanup, Browser WebGPU truth, Local Network Access loopback support and Mac installer link repair.');
requireIncludes(files.mmir, 'active-node-strip.js?v=20260602-webgpu-shader-f16-v1', 'Active node strip cache must bust for Browser WebGPU shader-f16 labels.');
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
