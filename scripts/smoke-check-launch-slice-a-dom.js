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
  p0Icons: join(publicDir, 'apps', 'mimir-chat-portal', 'p0-icons.js'),
  p0RouteReceipts: join(publicDir, 'apps', 'mimir-chat-portal', 'p0-route-receipts.js'),
  p0RouteBenchmarks: join(publicDir, 'apps', 'mimir-chat-portal', 'p0-route-benchmarks.js'),
  p0RouteAdapters: join(publicDir, 'apps', 'mimir-chat-portal', 'p0-route-adapters.js'),
  p0History: join(publicDir, 'apps', 'mimir-chat-portal', 'p0-history.js'),
  runtimeCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
  workspaceCss: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-workspace.css'),
  portal: join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.js'),
  criticalProfiles: join(publicDir, 'apps', 'mimir-chat-portal', 'backend-profiles-critical.js'),
  assetVersions: join(publicDir, 'apps', 'mimir-chat-portal', 'asset-versions.json')
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

let assetVersions;
function assetRef(assetName) {
  if (!assetVersions) {
    const manifest = JSON.parse(read(files.assetVersions) || '{}');
    assetVersions = manifest.assets || {};
  }
  const version = assetVersions[assetName];
  if (!version) {
    fail(`Missing asset version manifest entry: ${assetName}`);
    return `${assetName}?v=missing`;
  }
  return `${assetName}?v=${version}`;
}

for (const file of Object.values(files)) read(file);

requireIncludes(files.rootIndex, '<title>MMIR.ai</title>', 'Repository root title must match the public MMIR.ai title.');
requireIncludes(files.publicIndex, '<title>MMIR.ai</title>', 'Published root redirect title must match MMIR.ai.');
requireIncludes(files.mmir, '<title>MMIR.ai</title>', 'Main MMIR page title must be MMIR.ai.');
forbid(files.publicIndex, /MMIR by Inkognitroz/i, 'Published root title must not drift back to MMIR by Inkognitroz.');

for (const selector of [
  'id="mimir-prompt"',
  'href="#model-library"',
  'id="new-backend"',
  'id="primary-chat-link"',
  'class="mimir-composer"'
]) {
  requireIncludes(files.mmir, selector, `First screen composer DOM is missing ${selector}.`);
}

requireIncludes(files.mmir, '<a href="#model-library">Børs</a>', 'Public launch nav must expose the intelligence exchange as the only secondary public surface.');
requireIncludes(files.mmir, '<summary>+ Intelligensbørs</summary>', 'Public model catalog must be presented as the intelligence exchange, not a generic setup drawer.');
requireIncludes(files.mmir, '<h2 id="model-library-title">Intelligensbørs</h2>', 'Public exchange heading must use the owner-approved intelligence-bourse framing.');
requireIncludes(files.mmir, assetRef('chat-workspace.css'), 'Public exchange nav CSS must be cache-busted through the asset manifest.');
requireIncludes(files.workspaceCss, 'nav a:not([href="#mimir-prompt"]):not([href="#model-library"])', 'Public launch CSS must keep only Chat and Børs visible in the side nav.');
requireIncludes(files.mmir, 'Supergeni bruker dette kartet til å velge beste svar', 'Public exchange copy must describe connected intelligence without account, Pro or checkout promises.');

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
  'Supergeni',
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
  'Supergeni answers immediately',
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
requireIncludes(files.mmir, assetRef('route-chips.js'), 'Route-chip polish must load progressively after first-paint chat runtime.');
requireIncludes(files.mmir, assetRef('p0-chat-shell.css'), 'P0 simple chat shell CSS must load on the public page.');
requireIncludes(files.mmir, assetRef('p0-chat-shell.js'), 'P0 simple chat shell runtime must load on the public page.');
requireIncludes(files.mmir, assetRef('p0-route-benchmarks.js'), 'P0 route benchmark helper must load on the public page before the shell.');
requireIncludes(files.mmir, assetRef('p0-route-adapters.js'), 'P0 route adapter helper must load on the public page before the shell.');
requireIncludes(files.mmir, '<body class="mimir-public-chat mimir-chat-first mmir-p0-ready">', 'Public page must hide legacy UI at first paint before the P0 runtime installs.');
requireIncludes(files.p0Css, 'body.mmir-p0-ready > :not(#mmir-p0-app)', 'P0 shell must hide legacy controls and show only the simple chat app.');
requireIncludes(files.p0Css, '.p0-mic', 'P0 toolbar must render voice as a compact icon control, not visible text.');
requireIncludes(files.p0Icons, 'p0-icon-shield', 'P0 privacy button must render a real discreet shield icon.');
requireIncludes(files.p0Icons, 'p0-icon-mic', 'P0 voice button must render a real discreet mic icon.');
requireIncludes(files.p0Runtime, 'id="p0-input"', 'P0 shell must expose #p0-input as the canonical visible first-chat input.');
requireIncludes(files.p0Runtime, 'aria-label="Message Supergeni"', 'P0 canonical input must have an accessible label for browser/UI automation.');
requireIncludes(files.p0Runtime, 'id="p0-send"', 'P0 shell must expose #p0-send as the canonical visible first-chat submit control.');
forbid(files.mmir, /class="mimir-greeting"|id="mmir-quick-suggestions"|placeholder="Spør\.\.\."/i, 'Public first screen must not ship legacy hero, quick suggestions or visible prompt placeholder.');
forbid(files.p0Runtime, /placeholder="Spør\.\.\."/i, 'P0 canonical input must stay visually empty while keeping aria-label for accessibility.');
requireIncludes(files.p0Css, 'stroke: currentColor', 'P0 toolbar icons must use monochrome currentColor styling.');
requireIncludes(files.p0Css, '.p0-route', 'P0 shell must show a subtle route receipt in the composer.');
requireIncludes(files.p0Css, '.p0-route-line', 'P0 route receipt must render as a subtle text line, not noisy chips.');
requireIncludes(files.p0Css, 'overscroll-behavior: contain', 'P0 transcript must be an independently scrollable answer pane.');
requireIncludes(files.p0Css, 'max-height: min(70vh, calc(100vh - 118px));', 'P0 menus must stay inside the viewport and scroll internally.');
requireIncludes(files.p0Css, '-webkit-overflow-scrolling: touch', 'P0 transcript must support smooth touch scrolling.');
requireIncludes(files.p0Css, 'display: block;', 'P0 transcript must use block layout so long chats produce real scroll height.');
requireIncludes(files.p0Css, '.p0-message + .p0-message', 'P0 messages must preserve spacing without relying on grid gap that can collapse scroll height.');
requireIncludes(files.p0Css, '.p0-message-receipt', 'P0 assistant answers must include a visible route receipt.');
requireIncludes(files.p0Css, '.p0-receipt-full', 'P0 compact receipts must expose full audit details when expanded.');
requireIncludes(files.p0Css, '.p0-message-actions', 'P0 assistant answers must expose subtle answer actions.');
requireIncludes(files.p0Css, '.p0-message:focus-within .p0-message-actions', 'P0 answer actions must reveal on focus without always-visible clutter.');
requireIncludes(files.p0Css, '.p0-message[data-actions-open="true"] .p0-message-actions', 'P0 answer actions must support JS-assisted keyboard/touch reveal.');
requireIncludes(files.p0Css, 'pointer-events: none', 'P0 answer actions must stay non-interactive while visually hidden.');
requireIncludes(files.p0Runtime, 'data-p0-message-action="copy"', 'P0 answer actions must include copy.');
requireIncludes(files.p0Runtime, 'data-p0-message-action="retry"', 'P0 answer actions must include retry.');
requireIncludes(files.p0Runtime, 'data-p0-message-action="share-safe"', 'P0 answer actions must include share-safe draft.');
requireIncludes(files.p0Runtime, 'data-has-status="false"', 'P0 answer actions must keep status-aware reveal state.');
requireIncludes(files.p0Runtime, 'actionsOpen', 'P0 answer actions must expose focus/hover state without default button clutter.');
requireIncludes(files.p0Runtime, "const SHARE_DRAFT_KEY='mmir-p0-share-safe-draft-v1'", 'P0 share-safe must store only a local safe draft.');
requireIncludes(files.p0RouteAdapters, "const PROD_API_URL='https://api.mmir.ai'", 'P0 route adapter helper must keep api.mmir.ai as the production chat route.');
requireIncludes(files.p0RouteAdapters, "const STAGING_API_URL='https://api-staging.mmir.ai'", 'P0 route adapter helper must know the staging API route.');
requireIncludes(files.p0RouteAdapters, "location.hostname||'').toLowerCase()==='staging.mmir.ai'?STAGING_API_URL:PROD_API_URL", 'P0 route adapter helper must route staging.mmir.ai to api-staging.mmir.ai without arbitrary browser overrides.');
requireIncludes(files.p0Runtime, 'const API_URL=ROUTE_ADAPTER_CONFIG.apiUrl', 'P0 shell must consume the active API route from the route adapter helper.');
requireIncludes(files.p0Runtime, "menuButton('connect-local'", 'P0 shell must start local setup through the chat-guided installer flow.');
requireIncludes(files.p0Runtime, 'LOCAL_INSTALL_COMMANDS.commandFor?.(os)', 'P0 local setup must get OS-specific commands from the shared helper.');
requireIncludes(files.p0Runtime, 'LOCAL_INSTALL_COMMANDS.introFor?.(os)', 'P0 local setup must get chat-first install copy from the shared helper.');
requireIncludes(files.p0Runtime, 'data-p0-os-command="windows"', 'P0 local setup must ask for OS when browser detection is uncertain.');
requireIncludes(files.p0Runtime, 'Command selected. Press Cmd+C', 'P0 local setup must gracefully handle browsers that block clipboard writes.');
forbid(files.p0Runtime, /Install guide|Install help/i, 'P0 local setup must keep the connector install flow in chat instead of opening a guide page.');
requireIncludes(files.p0Runtime, 'Koble til lokal AI', 'P0 add menu must present local setup as one simple connect-local task.');
requireIncludes(files.p0Runtime, 'Vis install-kommandoen i chatten.', 'P0 add menu must keep local setup chat-native instead of opening another installer surface.');
forbid(files.p0Runtime, /Hva vil du vite\?|Skriv spørsmålet ditt\. Supergeni finner beste svar og viser bevis når det trengs\./, 'P0 empty state must not add hero copy or product mechanics above the composer.');
requireIncludes(files.p0Runtime, "function hostedRouteLabel()", 'P0 hosted route receipt must be generated from the active API host.');
requireIncludes(files.p0RouteReceipts, "'Supergeni ready · hosted'", 'P0 hosted route receipt must stay clean for first-time users.');
requireIncludes(files.p0RouteReceipts, 'No provider key is stored in the browser', 'P0 hosted route receipt must keep browser-secret proof in details.');
requireIncludes(files.p0RouteReceipts, 'private local', 'P0 local route receipt must be visible to users.');
requireIncludes(files.p0Runtime, 'function answerStyleInstruction(style=answerStyle())', 'P0 chat must keep response style configurable.');
requireIncludes(files.p0Runtime, 'Keep route, source, privacy and no-paid-route proof in metadata', 'P0 chat must keep proof out of the main answer.');
requireIncludes(files.p0Runtime, 'function roleProfileInstruction()', 'P0 chat must support browser-local role profiles.');
requireIncludes(files.p0Runtime, "menuButton('role-profile-menu','Rolleprofil: '+roleProfileLabel(),roleProfileDetail())", 'P0 role profiles must live under the compact Add menu.');
requireIncludes(files.p0Runtime, 'function bestLocalModel()', 'P0 compare must pick a ranked local model after real local discovery.');
requireIncludes(files.p0Runtime, 'function compareLiveRoutes(comparePrompt', 'P0 compare must stay implemented behind prompt intent.');
requireIncludes(files.p0Runtime, 'pool.compareReady', 'P0 compare tools must be hidden until a second live route exists.');
requireIncludes(files.p0Runtime, "menuButton('compare-live','Compare answers'", 'P0 compare must expose a gated + menu tool after local discovery.');
requireIncludes(files.p0Runtime, "menuButton('best-answer-live','Best answer benchmark'", 'P0 Best Answer must expose a gated + menu tool after local discovery.');
requireIncludes(files.p0Runtime, "menuButton('discuss-topic','Supergeni Council'", 'P0 Supergeni Council must expose a gated + menu tool after local discovery.');
requireIncludes(files.p0Runtime, 'scoreSummary(hostedScore)', 'P0 compare must show route score and response timing.');
requireIncludes(files.p0Runtime, 'function scoreClassSummary(score)', 'P0 compare must show route answer/latency classes.');
requireIncludes(files.p0Runtime, 'answer_class:found.answer_class', 'P0 compare must preserve API answer class metadata.');
requireIncludes(files.p0Runtime, 'latency_class:found.latency_class', 'P0 compare must preserve API latency class metadata.');
requireIncludes(files.p0Runtime, "function routeScore(model,prompt,answer,elapsedMs,failed=false,mode='single')", 'P0 Best Answer must score route quality from answer, prompt, latency and route mode.');
requireIncludes(files.p0RouteAdapters, "const ROUTE_SCORE_PATH='/routing/score'", 'P0 route adapter helper must know the API scoring route.');
requireIncludes(files.p0Runtime, 'function scoreRoutesWithApi(prompt,hostedModel,hostedAnswer,hostedElapsed,hostedFailed,localModel,localAnswer,localElapsed,localFailed)', 'P0 Best Answer must call api.mmir.ai route scoring before selecting the winner.');
requireIncludes(files.p0Runtime, "API_LABEL+'/routing/score'", 'P0 Best Answer synthesis receipt must identify the active API scoring source.');
requireIncludes(files.p0Runtime, 'API score ', 'P0 Best Answer receipts must show API scoring when the API scorer is available.');
requireIncludes(files.p0Runtime, 'function winningRoute(hostedModel,hostedScore,localModel,localScore)', 'P0 Best Answer must choose and explain a winner.');
requireIncludes(files.p0Runtime, 'Winner:', 'P0 Best Answer receipts must show the winning route.');
requireIncludes(files.p0Runtime, 'Score ', 'P0 Best Answer receipts must show route scores.');
forbid(files.p0Css, /\.p0-featured-action/, 'P0 compare must not reserve special menu styling for removed compare buttons.');
requireIncludes(files.p0Runtime, 'function smartDecision(prompt)', 'P0 shell must include smart route selection logic.');
requireIncludes(files.p0Runtime, 'function wantsPrivateRoute(prompt)', 'P0 smart routing must detect private/local intent.');
requireIncludes(files.p0Runtime, 'function wantsCompareRoute(prompt)', 'P0 smart routing must detect compare intent.');
requireIncludes(files.p0Runtime, 'Smart route: private local', 'P0 smart routing must label private automatic local routing.');
forbid(files.p0Runtime, /<strong>Smart routing<\/strong>/, 'P0 model picker must not render smart-routing dashboard cards in the dropdown.');
forbid(files.p0Css, /\.p0-routing-hint/, 'P0 dropdowns must not rely on dashboard-style routing hint cards.');
requireIncludes(files.p0Runtime, 'function wantsPublicFactRoute(prompt)', 'P0 quality guard must detect public/current factual prompts.');
requireIncludes(files.p0Runtime, 'Quality guard: public facts', 'P0 quality guard must label hosted fallback for public facts from local routes.');
forbid(files.p0Runtime, /Public facts use Supergeni\. Private\/local prompts/, 'P0 model picker must not show long public/private routing policy copy in the dropdown.');
requireIncludes(files.p0Runtime, 'function explicitMentionDecision(prompt)', 'P0 chat must treat explicit @model tags as route commands.');
requireIncludes(files.p0Runtime, "return {mode:'compare',model:localModel,prompt:cleaned}", 'P0 chat must support explicit @supergenius + local-model compare intent.');
requireIncludes(files.p0Runtime, 'Local-only: public facts may be outdated', 'P0 chat must warn when explicit local-only routing is used for public facts.');
requireIncludes(files.p0Runtime, 'Local facts may be stale', 'P0 compare must warn when a local model is included in public/current factual compare.');
requireIncludes(files.p0Runtime, 'say that you may be outdated instead of guessing', 'P0 local system prompt must discourage stale local factual guesses.');
requireIncludes(files.p0Runtime, 'function normalizeLocalHardware(payload)', 'P0 model picker must normalize local node CPU/RAM capacity.');
forbid(files.p0Runtime, /<strong>Local capacity<\/strong>/, 'P0 model picker must not render local capacity as dropdown clutter.');
requireIncludes(files.p0Css, '@media (max-width: 380px)', 'P0 toolbar must have a narrow mobile hardening rule.');
requireIncludes(files.p0Css, '.p0-left {\n  flex: 1 1 auto;\n  overflow: hidden;', 'P0 toolbar must shrink and clip pinned tools before they overlap route controls.');
requireIncludes(files.p0Runtime, 'Compare answer 1/2', 'P0 compare receipts must identify the hosted answer.');
requireIncludes(files.p0Runtime, 'Compare answer 2/2', 'P0 compare receipts must identify the local answer.');
requireIncludes(files.p0Css, '.p0-message-compare', 'P0 compare answers must be visually distinguishable without adding a dashboard.');
requireIncludes(files.p0Runtime, 'function synthesizeCompareAnswer(prompt,hostedAnswer,localAnswer,localModel,hostedScore,localScore,signal)', 'P0 compare must synthesize a best answer from real model outputs and route evidence with abort support.');
requireIncludes(files.p0Runtime, 'Best answer synthesis', 'P0 compare synthesis must be labeled in the route receipt.');
requireIncludes(files.p0Runtime, 'Best answer synthesis · No paid route', 'P0 compare synthesis must keep no-paid route trust visible.');
requireIncludes(files.p0Runtime, 'function compactReceipt(receipt)', 'P0 route receipts must be compact by default.');
requireIncludes(files.p0Runtime, 'function renderReceipt(receipt)', 'P0 route receipts must keep full audit details available on click.');
requireIncludes(files.p0Runtime, "routeStatus('Listening...','hosted')", 'P0 voice feedback must be visible in the composer route line on mobile.');
requireIncludes(files.p0Runtime, "routeStatus('Voice input stopped.','hosted')", 'P0 voice stop feedback must remain visible briefly when recognition ends quickly.');
requireIncludes(files.p0Runtime, 'mmir-p0-voice-state-updated', 'P0 voice path must emit testable state evidence.');
requireIncludes(files.p0Runtime, 'no_server_audio:true', 'P0 voice path must stay browser-local with no server audio capture.');
requireIncludes(files.p0Runtime, 'Voice input unavailable. Type instead.', 'P0 unsupported voice path must give concise truthful fallback.');
requireIncludes(files.p0Runtime, "input.value=(input.value?input.value+' ':'')+text", 'P0 supported voice path must add recognized text to the prompt.');
requireIncludes(files.p0Runtime, 'function handleMenuAction(action)', 'P0 menu actions must use a central handler so local discovery cannot silently close menus.');
requireIncludes(files.p0Runtime, 'Checking this Mac for local models...', 'P0 local discovery must show immediate route feedback.');
requireIncludes(files.p0Runtime, 'Tiny private model · slower/weak fallback', 'Tiny local models must be labeled as weak fallback routes.');
requireIncludes(files.p0Runtime, 'Best local', 'P0 model picker must identify the best local starter after discovery.');
requireIncludes(files.p0Runtime, "const ROUTE_BENCHMARK_KEY='mmir-p0-route-benchmarks-v1'", 'P0 shell must persist route benchmark evidence for ranking.');
requireIncludes(files.p0Runtime, 'function recordRouteBenchmark(model,score)', 'P0 shell must record route benchmark score/latency data.');
requireIncludes(files.p0Runtime, 'function effectiveModelScore(model)', 'P0 shell must demote weak/slow routes from benchmark data.');
requireIncludes(files.p0Runtime, 'function routeRankMap(models=state.models)', 'P0 model picker must expose benchmark-adjusted route rank.');
requireIncludes(files.p0RouteBenchmarks, 'function rankedModels(models)', 'P0 route benchmark helper must own benchmark-adjusted route ranking.');
requireIncludes(files.p0RouteBenchmarks, 'const pinnedDelta=(routePinned(b)?1:0)-(routePinned(a)?1:0);', 'P0 route benchmark helper must keep pinned routes above unpinned routes.');
requireIncludes(files.p0RouteBenchmarks, 'function routeRankState(model)', 'P0 route benchmark helper must expose discreet demotion state.');
requireIncludes(files.p0RouteBenchmarks, 'function routeRankReasons(model)', 'P0 route benchmark helper must explain demotion with compact reason codes.');
requireIncludes(files.p0Runtime, 'function routeRankSummary(model)', 'P0 shell must surface route demotion receipts without adding controls.');
requireIncludes(files.p0Runtime, 'function compactModelBadges(model,bestLocal)', 'P0 model picker must keep benchmark evidence compact instead of rendering a score dashboard.');
forbid(files.p0Runtime, /Rank #/, 'P0 model picker must not show rank numbers in the clean dropdown.');
requireIncludes(files.p0Runtime, 'Demoted', 'P0 model picker may quietly demote weak or failed routes.');
requireIncludes(files.p0Css, '.p0-badge-demoted', 'P0 route demotion badge must be styled discreetly.');
requireIncludes(files.p0Runtime, 'Private local models', 'P0 model picker must separate local models from the hosted default.');
requireIncludes(files.p0Runtime, 'Private local ready:', 'P0 local discovery must clearly show paired private readiness after models are visible.');
requireIncludes(files.p0Runtime, 'mmir-local-private-readiness-updated', 'P0 local discovery must emit explicit paired/private readiness evidence.');
requireIncludes(files.p0Runtime, 'function compareLocalModel(preferredLocalModel=null)', 'P0 compare must choose the best local model unless the user explicitly mentions another model.');
requireIncludes(files.p0Css, '.p0-menu-section', 'P0 model picker must visually group recommended and private local models.');
requireIncludes(files.p0RouteAdapters, 'Allow Local Network Access for mmir.ai', 'P0 route adapter helper must keep local permission failure actionable.');
requireIncludes(files.p0Runtime, 'Local fallback', 'P0 local chat failures must keep answering through the hosted route.');
requireIncludes(files.p0Runtime, 'while local access waits for permission', 'P0 local chat failures must explain that hosted fallback answered.');
requireIncludes(files.p0Runtime, 'After it says "MMIR Local Connector is ready", return here and press ⚙ -> Oppdater AI.', 'P0 local install copy must describe the automatic return flow.');
requireIncludes(files.p0Runtime, 'checkLocalModels().catch(()=>{})', 'P0 local model checks must not leak browser-blocked probes as unhandled page errors.');
requireIncludes(files.p0Runtime, "status('Listening...','ready')", 'P0 mic button must give immediate feedback when voice input is requested.');
requireIncludes(files.p0Runtime, "document.body.classList.add('mmir-p0-ready')", 'P0 runtime must set the same ready class that the P0 CSS uses to hide legacy UI.');
forbid(files.p0Runtime, /classList\.add\('mimir-p0-ready'\)/, 'P0 runtime must not use the misspelled ready class.');
requireIncludes(files.p0Runtime, "const HISTORY_SCHEMA='20260603-clean-first-chat-v40'", 'P0 shell must invalidate stale browser-error and install-card chat history.');
requireIncludes(files.p0Runtime, "const HISTORY_SESSION_KEY='mmir-p0-chat-history-qa-session-v1'", 'P0 shell must isolate browser/live QA history from normal persisted chat history.');
requireIncludes(files.p0Runtime, 'window.__MimirP0HistorySessionMode=historySessionMode', 'P0 shell must expose QA history isolation state for rendered proof.');
requireIncludes(files.p0Runtime, 'function transientInstallMessage(message)', 'P0 shell must keep local install instructions chat-native but transient, not first-screen history.');
requireIncludes(files.p0History, 'Selected browser LLM is not loaded', 'P0 stale-state guard must explicitly purge the known Browser LLM failure copy.');
requireIncludes(files.p0History, 'function qaSessionEnabled(search)', 'P0 history helper must own QA-session detection.');
requireIncludes(files.p0Runtime, "allowLocalProbes('p0-find-local-models'", 'P0 Find local models must explicitly allow user-requested local probes.');
requireIncludes(files.p0Runtime, "allowLocalProbes('p0-local-chat'", 'P0 local chat must explicitly allow user-requested local connector calls.');
requireIncludes(files.p0RouteAdapters, "targetAddressSpace='loopback'", 'P0 route adapter helper must request loopback address-space permission.');
requireIncludes(files.mmir, assetRef('api-client.js'), 'API client cache must bust for Local Network Access loopback support.');
requireIncludes(files.mmir, assetRef('public-launch-guard.js'), 'Public launch guard must load before runtime so stale local/WebGPU state cannot break first chat.');
requireIncludes(files.mmir, assetRef('chat-runtime.css'), 'Chat runtime CSS cache must bust for composer CSS ownership cleanup.');
requireIncludes(files.mmir, assetRef('chat-workspace.css'), 'Chat workspace CSS cache must bust for composer CSS ownership cleanup.');
requireIncludes(files.mmir, assetRef('chat-runtime.js'), 'Chat runtime cache must bust for public UI capability cleanup, Browser WebGPU truth, Local Network Access loopback support and Mac installer link repair.');
requireIncludes(files.mmir, assetRef('active-node-strip.js'), 'Active node strip cache must bust for Browser WebGPU shader-f16 labels.');
requireIncludes(files.mmir, assetRef('quiet-first-paint-hotfix.js'), 'Quiet-first-paint guard must load Local Network Access loopback support.');
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
  requireNormalized(files.workspaceCss, selector, `First screen chip visibility/style missing: ${selector}`);
}

forbid(files.runtimeCss, /not\(\.mimir-has-chat\).*composer-live-cluster[^{}]*display\s*:\s*none/i, 'Pre-chat composer live cluster must stay visible.');
forbid(files.runtimeCss, /not\(\.mimir-has-chat\).*#runtime-model-chip[^{}]*display\s*:\s*none/i, 'Pre-chat selected model chip must stay visible.');
forbid(files.runtimeCss, /not\(\.mimir-has-chat\).*#runtime-resource-chip[^{}]*display\s*:\s*none/i, 'Pre-chat resource/telemetry chip must stay visible as unavailable or real telemetry.');

if (!process.exitCode) {
  console.log('Launch Slice A DOM smoke check passed.');
}
