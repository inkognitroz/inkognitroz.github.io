import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const indexPath = join(publicDir, 'index.html');
const mmirPath = join(publicDir, 'mmir.html');
const contentPath = join(publicDir, 'content.json');
const manifestPath = join(publicDir, 'manifest.webmanifest');
const serviceWorkerPath = join(publicDir, 'sw.js');
const activeNodesPath = join(publicDir, 'active-chat-nodes.json');
const activeNodeStripPath = join(publicDir, 'apps', 'mimir-chat-portal', 'active-node-strip.js');
const composerQuickActionsPath = join(publicDir, 'apps', 'mimir-chat-portal', 'composer-quick-actions.js');
const composerModelPickerPath = join(publicDir, 'apps', 'mimir-chat-portal', 'composer-model-picker.js');
const modelCatalogUiPath = join(publicDir, 'apps', 'mimir-chat-portal', 'model-catalog-ui.js');
const modelCatalogPath = join(publicDir, 'ai-model-catalog.json');
const freeModelStartersPath = join(publicDir, 'free-model-starters.json');
const macConnectorInstallerPath = join(publicDir, 'downloads', 'mmir-local-connector-mac.command');
const macConnectorZipPath = join(publicDir, 'downloads', 'mmir-local-connector-mac.zip');
const macDmgPath = join(publicDir, 'downloads', 'mmir-local-node-0.1.0-mac.dmg');
const connectorReleasePath = join(publicDir, 'downloads', 'mmir-local-connector-release.json');

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

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function requireText(file, needle, message) {
  if (!read(file).includes(needle)) fail(message);
}

function forbidText(file, needle, message) {
  if (read(file).includes(needle)) fail(message);
}

function localAssetPath(fromFile, asset) {
  if (!asset || /^[a-z][a-z0-9+.-]*:/i.test(asset) || asset.startsWith('#') || asset.startsWith('//')) {
    return null;
  }
  const cleanAsset = asset.split(/[?#]/)[0];
  if (!cleanAsset) return null;
  const base = cleanAsset.startsWith('/') ? publicDir : dirname(fromFile);
  return normalize(resolve(base, cleanAsset.replace(/^\//, '')));
}

function checkHtmlAssetRefs(filePath, label) {
  const html = read(filePath);
  const assetRefs = Array.from(html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)).map((match) => match[1]);
  for (const ref of assetRefs) {
    const assetPath = localAssetPath(filePath, ref);
    if (!assetPath || extname(assetPath) === '.html') continue;
    if (!assetPath.startsWith(publicDir) || !existsSync(assetPath)) {
      fail(`Missing referenced asset from ${label}: ${ref}`);
    }
  }
}

checkHtmlAssetRefs(indexPath, 'public/index.html');
checkHtmlAssetRefs(mmirPath, 'public/mmir.html');

for (const file of walk(publicDir)) {
  const rel = relative(root, file);
  const ext = extname(file);
  if (ext === '.json' || ext === '.webmanifest') {
    try {
      JSON.parse(read(file));
    } catch {
      fail(`Invalid JSON: ${rel}`);
    }
  }
  if (ext === '.js' || ext === '.mjs') {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) {
      fail(`Invalid JavaScript syntax: ${rel}\n${result.stderr || result.stdout}`);
    }
  }
  const publicText = read(file);
  if (['.html', '.js', '.json', '.css', '.webmanifest'].includes(ext) && /Supergeni(?:us|ous)\s+Free/i.test(publicText)) {
    fail(`Use owner-approved visible label "Supergenious" without a Free suffix: ${rel}`);
  }
  if (['.html', '.json', '.css', '.webmanifest'].includes(ext) && /MMIR\s+Supergeni(?:us|ous)/i.test(publicText)) {
    fail(`Visible fallback label must be "Supergenious" without an MMIR prefix: ${rel}`);
  }
  if (['.html', '.js', '.json', '.css', '.webmanifest'].includes(ext) && /(?:MMIR\s+){2,}Supergeni(?:us|ous)/i.test(publicText)) {
    fail(`Do not duplicate the MMIR Supergenious brand prefix: ${rel}`);
  }
  if (['.html', '.js', '.json', '.css', '.webmanifest'].includes(ext) && /mmir-MMIR Supergeni(?:us|ous)/i.test(publicText)) {
    fail(`Do not leak internal mmir-supergenius ids into visible labels: ${rel}`);
  }
  if (['.html', '.js', '.css'].includes(ext) && /Ask\s+mmir-supergenius\b/i.test(publicText)) {
    fail(`Do not leak internal mmir-supergenius ids into the chat placeholder: ${rel}`);
  }
}

const content = JSON.parse(read(contentPath) || '{}');
if (content?.site?.title !== 'MMIR') fail('content.json must define MMIR as the public product title.');
const activeNodes = JSON.parse(read(activeNodesPath) || '{}');
const managedNode = Array.isArray(activeNodes.nodes)
  ? activeNodes.nodes.find((node) => node?.id === 'managed-api-bootstrap')
  : null;
if (!managedNode) fail('active-chat-nodes.json must keep the managed API route visible for setup.');
if (managedNode?.status === 'online') fail('Managed api.mmir.ai must not claim live status from static manifest data.');

requireText(indexPath, 'Trusted AI Control Plane', 'Homepage must state the MMIR control-plane category.');
requireText(indexPath, './mmir.html#mimir-instant-start', 'Homepage must point to the MMIR first journey.');
requireText(mmirPath, 'id="mimir-prompt"', 'MMIR product page must expose the chat composer.');
requireText(mmirPath, 'id="local-connector"', 'MMIR product page must expose local connector setup.');
requireText(mmirPath, 'id="node-dashboard"', 'MMIR product page must expose public-safe node status.');
requireText(mmirPath, './apps/mimir-chat-portal/mimir-chat-portal.js', 'MMIR product page must load the chat portal script.');
requireText(mmirPath, 'active-node-strip.js?v=20260531-capability-cleanup-v1', 'MMIR product page must load the cache-busted active-node strip.');
requireText(manifestPath, '"display": "standalone"', 'PWA manifest must remain installable.');
requireText(serviceWorkerPath, './offline.html', 'Service worker must cache the offline shell.');
requireText(serviceWorkerPath, 'mmir-pwa-d342-20260602-monochrome-toolbar-icons-v26', 'Service worker cache must bust for P0 simple chat recovery.');
requireText(serviceWorkerPath, './apps/mimir-chat-portal/p0-chat-shell.css', 'Service worker shell must include the P0 simple chat CSS.');
requireText(serviceWorkerPath, './apps/mimir-chat-portal/p0-chat-shell.js', 'Service worker shell must include the P0 simple chat runtime.');
requireText(serviceWorkerPath, './apps/mimir-chat-portal/public-launch-guard.js', 'Service worker shell must include the public launch guard.');
requireText(activeNodeStripPath, 'function activeProfile()', 'Active-node strip must read the selected backend profile before claiming managed API liveness.');
requireText(activeNodeStripPath, 'function managedReady()', 'Active-node strip must gate managed API liveness on runtime proof.');
requireText(activeNodeStripPath, "managedReady()?'online':'setup'", 'Managed API card must remain setup-only until runtime proof is ready.');
requireText(activeNodeStripPath, "managedReady()?modelFromNode(node):'Verify route first'", 'Managed API card must avoid showing a live model before route verification.');
requireText(activeNodeStripPath, 'function publicFirstNodes(nodes)', 'Active-node strip must keep the first-screen route list limited to proven public routes.');
forbidText(activeNodeStripPath, "['auto','webllm','ollama']", 'Active-node starter rail must not surface Browser WebGPU as a first-screen route.');
forbidText(composerQuickActionsPath, 'data-composer-quick-route="webgpu"', 'Composer quick actions must not show Browser WebGPU before it is production-ready.');
forbidText(composerQuickActionsPath, 'data-composer-quick-action="knowledge"', 'Composer quick actions must not show Knowledge until it is part of the first-screen product.');
forbidText(composerQuickActionsPath, 'data-composer-quick-action="voice"', 'Composer quick actions must not show Voice until it is part of the first-screen product.');
forbidText(composerQuickActionsPath, 'data-composer-quick-action="settings"', 'Composer quick actions must not expose internal settings on the first-screen product.');
forbidText(composerModelPickerPath, "id:'browser-model'", 'Composer model recommendations must not promote Browser Model until runtime proof is reliable.');
forbidText(composerModelPickerPath, "id:'compare-models'", 'Composer model recommendations must not promote Compare Models before two live routes exist.');
requireText(modelCatalogUiPath, 'function isHiddenPublicModel(model)', 'Model library must hide capability-specific routes that are not production-ready.');
requireText(modelCatalogUiPath, "runtime.includes('rag')", 'Model library must hide RAG/embedding routes until the knowledge user journey is production-ready.');
requireText(modelCatalogUiPath, "cache:'no-cache'", 'Model library must refresh public catalogs instead of relying on stale browser cache.');
requireText(mmirPath, 'public-launch-guard.js?v=20260531-public-first-chat-v1', 'Public page must load the first-chat recovery guard before chat runtime.');
requireText(mmirPath, 'p0-chat-shell.css?v=20260602-monochrome-toolbar-icons-v26', 'Public page must load the P0 simple chat shell CSS.');
requireText(mmirPath, 'p0-chat-shell.js?v=20260602-monochrome-toolbar-icons-v26', 'Public page must load the P0 simple chat shell runtime.');
requireText(mmirPath, '<body class="mimir-public-chat mimir-chat-first mmir-p0-ready">', 'Public page must hide legacy UI at first paint before the P0 runtime installs.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'Connect local model', 'P0 + menu must expose local setup in user language.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), "const HISTORY_SCHEMA='20260602-explicit-route-tags-v17'", 'P0 shell must invalidate stale browser-error chat history.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'Supergenious · Free · api.mmir.ai', 'P0 shell must show hosted route receipts.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'Private · This Mac', 'P0 shell must show local route receipts.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'Local fallback', 'P0 shell must keep answering through hosted fallback if local access fails.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'Best default', 'P0 model picker must label the safe default route.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'slower/weak fallback', 'P0 model picker must demote weak tiny local models.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.css'), '.p0-badge', 'P0 model picker must render model quality badges.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'Compare answers', 'P0 + menu must expose compare in user language after local discovery.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'formatDuration', 'P0 answers must expose route timing.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.css'), '.p0-featured-action', 'P0 compare action must be visually discoverable when live.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'function smartDecision(prompt)', 'P0 shell must include smart route selection logic.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'Smart route: private local', 'P0 shell must label automatic private local routing.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.css'), '.p0-routing-hint', 'P0 model picker must render smart routing guidance.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'function wantsPublicFactRoute(prompt)', 'P0 quality guard must detect public/current factual prompts.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'Quality guard: public facts', 'P0 quality guard must label hosted fallback for public facts from local routes.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'Public facts use Supergenious', 'P0 model picker must explain public fact routing.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'function explicitMentionDecision(prompt)', 'P0 shell must route explicit @model tags intentionally.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'Find local models first, then use @supergenius @gemma for compare.', 'P0 shell must fail clearly when a local route tag is used before local discovery.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'Local-only: public facts may be outdated', 'P0 shell must warn when local-only routes answer public facts.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'function normalizeLocalHardware(payload)', 'P0 shell must normalize local node CPU/RAM capacity.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'Local capacity', 'P0 shell must show proven local capacity only after local discovery.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.css'), '@media (max-width: 380px)', 'P0 toolbar must have a narrow mobile hardening rule.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.css'), '.p0-left {\n  flex: 0 0 auto;', 'P0 toolbar must prevent left controls from collapsing on mobile.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'Compare answer 1/2', 'P0 compare receipts must identify the hosted answer.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'Compare answer 2/2', 'P0 compare receipts must identify the local answer.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.css'), '.p0-message-compare', 'P0 compare answers must be visually distinguishable without adding a dashboard.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'function synthesizeCompareAnswer(prompt,hostedAnswer,localAnswer,localModel)', 'P0 compare must synthesize a best answer from real model outputs.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'Best answer synthesis', 'P0 compare synthesis must be labeled in the route receipt.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'Best answer synthesis · No paid route', 'P0 compare synthesis must keep no-paid route trust visible.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), "routeStatus('Listening...','hosted')", 'P0 voice feedback must be visible in the composer route line on mobile.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), "routeStatus('Voice input stopped.','hosted')", 'P0 voice stop feedback must remain visible briefly when recognition ends quickly.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'MMIR returns here and finds models automatically', 'P0 local install copy must describe automatic return flow.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'checkLocalModels().catch(()=>{})', 'P0 local model checks must catch browser-blocked probes in the UI handler.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'p0-icon-shield', 'P0 privacy button must render a real discreet shield icon.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'p0-icon-mic', 'P0 voice button must render a real discreet mic icon.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), "status('Listening...','ready')", 'P0 mic button must give immediate feedback.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), "document.body.classList.add('mmir-p0-ready')", 'P0 runtime must use the CSS-backed ready class.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.css'), '.p0-mic', 'P0 toolbar must keep voice as a subtle icon control.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.css'), 'stroke: currentColor', 'P0 toolbar icons must use monochrome currentColor styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.css'), '.p0-route', 'P0 composer must expose a subtle route receipt.');
requireText(mmirPath, 'runtime-controls-fix.js?v=20260531-model-chip-v2', 'Runtime controls hotfix must be cache-busted for public first-chat recovery.');
requireText(mmirPath, 'chat-runtime.css?v=20260531-public-first-chat-v1', 'Chat runtime CSS must be cache-busted for public first-chat recovery.');
requireText(mmirPath, 'chat-workspace.css?v=20260531-public-first-chat-v1', 'Chat workspace CSS must be cache-busted for public first-chat recovery.');
requireText(mmirPath, 'model-catalog-ui.js?v=20260531-no-rag-v1', 'Model catalog UI must be cache-busted after hiding unready public routes.');
forbidText(modelCatalogPath, 'RAG', 'Public model catalog must not expose RAG wording before that user journey is production-ready.');
forbidText(freeModelStartersPath, 'RAG', 'Free starter model catalog must not expose RAG wording before that user journey is production-ready.');
requireText(macConnectorInstallerPath, 'mmir-local-connector-server.XXXXXX.mjs', 'Mac connector installer must download server temp file with .mjs suffix so Node 26 can syntax-check it.');
forbidText(macConnectorInstallerPath, 'temp="$(mktemp)"', 'Mac connector installer must not syntax-check an extensionless temp file with Node 26.');
if (!existsSync(macConnectorZipPath)) fail('Published Mac Connector ZIP must exist for reliable browser download.');
if (!existsSync(macDmgPath)) fail('Mac DMG artifact may exist as advanced packaging evidence, but must not be the primary public installer.');
requireText(connectorReleasePath, '"id": "mac-zip"', 'Release manifest must publish the reliable Mac ZIP first-install artifact.');
requireText(connectorReleasePath, '"path": "/downloads/mmir-local-connector-mac.zip"', 'Release manifest must point Mac users to the real ZIP artifact, not the browser-generated ZIP page.');
requireText(connectorReleasePath, '"kind": "zip-command-installer"', 'Mac ZIP must be labeled as the reliable command-installer package.');
requireText(connectorReleasePath, '"recommended": false', 'Mac DMG must not be the recommended public install path until signing/notarization is production-ready.');

forbidText(mmirPath, '#progress-dashboard', 'Public page must not link to the private progress dashboard.');
forbidText(mmirPath, '#gui-parity', 'Public page must not link to the private GUI parity matrix.');
forbidText(mmirPath, '<a href="#local-connector">Connect</a>', 'First-screen nav must not expose Connect before local-node onboarding is proven smooth.');
forbidText(mmirPath, '<a href="#pwa-install">Install</a>', 'First-screen nav must not expose Install before installer UX is proven smooth.');
forbidText(mmirPath, '<a href="#platform-status">Status</a>', 'First-screen nav must not expose diagnostics to first-time chat users.');
forbidText(mmirPath, 'href="#workflow-builder"', 'First-screen nav must not link to Workflow Builder until the workflow user journey is production-ready.');
forbidText(mmirPath, '<summary>More</summary>', 'First-screen nav must not expose a More menu full of unfinished capabilities.');
forbidText(mmirPath, './apps/mimir-chat-portal/workflow-builder.js', 'Public first-screen must not load Workflow Builder until it is production-ready.');
forbidText(mmirPath, './apps/mimir-chat-portal/dataset-manager.js', 'Public first-screen must not load Dataset Manager until it is production-ready.');
forbidText(mmirPath, './apps/mimir-chat-portal/voice-controls.js', 'Public first-screen must not load Voice controls until voice is a supported user journey.');
forbidText(mmirPath, './apps/mimir-chat-portal/vision-input.js', 'Public first-screen must not load Vision controls until vision is a supported user journey.');
forbidText(mmirPath, './apps/mimir-chat-portal/admin-governance.js', 'Public first-screen must not load Admin governance.');
requireText(mmirPath, 'id="workflow-builder" class="mimir-provider-drawer" hidden data-mimir-capability-state="planned"', 'Planned workflow UI must be hidden instead of visible on the first screen.');
forbidText(mmirPath, './apps/mimir-chat-portal/progress-dashboard.js', 'Public page must not load the private progress dashboard.');
forbidText(mmirPath, './apps/mimir-chat-portal/gui-parity-matrix.js', 'Public page must not load the private GUI parity matrix.');
forbidText(indexPath, '#progress-dashboard', 'Public root must not route to private progress dashboard.');

if (failures.length) {
  console.error('Public shell smoke check failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Public shell smoke check passed.');
