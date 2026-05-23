import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const indexPath = join(publicDir, 'index.html');
const mmirPath = join(publicDir, 'mmir.html');
const contentPath = join(publicDir, 'content.json');
const manifestPath = join(publicDir, 'manifest.webmanifest');
const chatRuntimePath = join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js');
const chatPortalPath = join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.js');
const firstImpressionPath = join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js');
const firstScreenHydrationPath = join(publicDir, 'apps', 'mimir-chat-portal', 'first-screen-activation-hydration.js');
const nodeDashboardPath = join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.js');
const mimirCssPath = join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.css');
const guiParityPath = join(publicDir, 'gui-parity-matrix.json');
const serviceWorkerPath = join(publicDir, 'sw.js');
const offlinePath = join(publicDir, 'offline.html');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing required file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function requireText(file, needle, message) {
  if (!text(file).includes(needle)) {
    fail(message);
  }
}

function forbidText(file, needle, message) {
  if (text(file).includes(needle)) {
    fail(message);
  }
}

function localAssetPath(fromFile, asset) {
  if (!asset || /^[a-z][a-z0-9+.-]*:/i.test(asset) || asset.startsWith('#')) {
    return null;
  }
  const cleanAsset = asset.split(/[?#]/)[0];
  if (!cleanAsset || cleanAsset.startsWith('//')) {
    return null;
  }
  const base = cleanAsset.startsWith('/') ? publicDir : dirname(fromFile);
  return normalize(resolve(base, cleanAsset.replace(/^\//, '')));
}

function checkHtmlAssetRefs(filePath, label) {
  const html = text(filePath);
  const assetRefs = Array.from(html.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)).map((match) => match[1]);
  for (const ref of assetRefs) {
    const assetPath = localAssetPath(filePath, ref);
    if (!assetPath || extname(assetPath) === '.html') {
      continue;
    }
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
      JSON.parse(text(file));
    } catch {
      fail(`Invalid JSON: ${rel}`);
    }
  }
  if (ext === '.js') {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) {
      fail(`Invalid JavaScript syntax: ${rel}\n${result.stderr || result.stdout}`);
    }
  }
}

requireText(indexPath, 'MMIR', 'Homepage must keep the MMIR top-level identity.');
requireText(indexPath, 'Trusted AI Control Plane', 'Homepage must state the MMIR control-plane category.');
requireText(indexPath, './mmir.html#mimir-instant-start', 'Homepage must redirect old/root traffic to the MMIR first journey.');
forbidText(indexPath, 'SaaS Fabric', 'Homepage must not expose the retired SaaS Fabric identity.');

const content = JSON.parse(text(contentPath));
if (content?.site?.title !== 'MMIR') {
  fail('content.json must define MMIR as the public product title.');
}
if (!String(content?.site?.subtitle || '').includes('orchestration layer for trusted AI')) {
  fail('content.json must keep the MMIR trusted AI positioning.');
}
forbidText(contentPath, 'SaaS Fabric', 'content.json must not include retired SaaS Fabric branding.');

requireText(mmirPath, 'id="mimir-instant-start"', 'MMIR product page must expose the redirect target for the first journey.');
requireText(indexPath, './manifest.webmanifest', 'D149 root redirect must expose the PWA manifest.');
requireText(mmirPath, './manifest.webmanifest', 'D149 product page must expose the PWA manifest.');
requireText(mmirPath, 'id="pwa-install"', 'D149 needs a visible mobile/PWA install panel.');
requireText(mmirPath, './apps/mimir-chat-portal/pwa.js', 'D149 needs PWA install script loaded.');
requireText(mmirPath, './apps/mimir-chat-portal/pwa.css', 'D149 needs PWA install styling loaded.');
requireText(manifestPath, '"display": "standalone"', 'D149 PWA manifest must be installable standalone.');
requireText(manifestPath, '"start_url": "./mmir.html#mimir-instant-start"', 'D149 PWA manifest must start in the MMIR first journey.');
requireText(serviceWorkerPath, 'CACHE_NAME', 'D149 service worker must define a cache name.');
requireText(serviceWorkerPath, './offline.html', 'D149 service worker must cache the offline shell.');
requireText(serviceWorkerPath, "request.mode==='navigate'", 'D149 service worker must handle navigation fallback.');
requireText(offlinePath, 'MMIR is offline-ready', 'D149 needs a public-safe offline fallback page.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'pwa.js'), 'beforeinstallprompt', 'D149 needs install prompt handling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'pwa.js'), 'navigator.serviceWorker.register', 'D149 needs service worker registration.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'pwa.js'), 'openNode', 'D149 needs mobile node handoff.');
requireText(mmirPath, 'id="migration-portability"', 'D150 needs a visible import/export portability panel.');
requireText(mmirPath, './apps/mimir-chat-portal/migration-portability.js', 'D150 needs migration portability script loaded.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'migration-portability.js'), 'mmir.portable_workspace', 'D150 needs MMIR portable workspace export.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'migration-portability.js'), 'chatGptMessages', 'D150 needs ChatGPT export normalization.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'migration-portability.js'), 'openWebUiMessages', 'D150 needs Open WebUI export normalization.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'migration-portability.js'), 'redactSecretLike', 'D150 needs secret-like text redaction.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'migration-portability.js'), 'redactedClone', 'D150 needs export-side secret-like text redaction.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'migration-portability.css'), '.migration-preview-card', 'D150 needs import preview styling.');
requireText(mmirPath, 'id="sharing-center"', 'D152 needs a visible safe sharing panel.');
requireText(mmirPath, './apps/mimir-chat-portal/sharing-center.js', 'D152 needs safe sharing script loaded.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'mmir.safe_share_bundle', 'D152 needs a safe share bundle schema.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'redactShareSecrets', 'D152 needs share redaction.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'decodeShareHash', 'D152 needs preview-link decoding.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'server_side_enforcement_required:true', 'D152 needs server-side enforcement boundary.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.css'), '.sharing-preview-card', 'D152 needs share preview styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), '/shares', 'D154 needs protected share route support.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'revokeProtectedShare', 'D154 needs protected share revocation support.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.css'), '.sharing-backend-card', 'D154 needs protected share list styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'sharing-org-id', 'D157 needs organization audience controls in Safe Sharing.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'organization_membership_required', 'D157 needs visible organization membership enforcement evidence.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'min_role', 'D157 needs minimum-role share audience support.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'sharing-access-review', 'D158 needs a visible share access review panel.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'access-review', 'D158 needs protected share access-review route support.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'audience_summary', 'D158 needs audience summary rendering in Safe Sharing.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.css'), '.sharing-review-card', 'D158 needs access review styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'sharing-recipient-share-id', 'D159 needs recipient share id input in Safe Sharing.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'recipient-handoff', 'D159 needs protected recipient handoff route support.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'session_token_returned_once', 'D159 needs one-time session token handling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.css'), '.sharing-recipient-result', 'D159 needs recipient handoff styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'mmir.team_share_packet', 'D160 needs owner-side team share packet schema.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'sharing-create-team-packet', 'D160 needs team share packet creation control.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'invite_code_included:false', 'D160 team share packets must exclude one-time invite codes.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.css'), '.sharing-team-packet', 'D160 needs team share packet styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'api-client.js'), 'setManagedSessionToken', 'D161 needs in-memory managed session activation.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'api-client.js'), 'x-mmir-session-token', 'D161 needs protected backend session token headers.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'sharing-activate-recipient-token', 'D161 needs recipient session activation control.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'identity-org.js'), 'identity-activate-session', 'D161 needs identity session activation control.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'sharing-activity-summary', 'D162 needs visible share activity summaries.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.js'), 'handoff_completed_count', 'D162 needs handoff activity counts.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'sharing-center.css'), '.sharing-activity-strip', 'D162 needs share activity styling.');
requireText(mmirPath, './apps/mimir-chat-portal/identity-org.js', 'D155 needs identity/organization UI loaded on the product page.');
requireText(mmirPath, './apps/mimir-chat-portal/identity-org.css', 'D155 needs identity/organization styling loaded on the product page.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'identity-org.js'), '/identity/me', 'D155 needs protected identity principal route support.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'identity-org.js'), '/identity/orgs', 'D155 needs protected organization list/create route support.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'identity-org.js'), 'owner/admin', 'D155 needs visible owner/admin organization role boundaries.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'identity-org.css'), '.identity-org-card', 'D155 needs organization card styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'identity-org.js'), '/identity/sessions', 'D156 needs protected session token route support.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'identity-org.js'), '/identity/invites', 'D156 needs protected invite route support.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'identity-org.js'), 'Shown once', 'D156 needs one-time token/code display without public storage.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'identity-org.css'), '.identity-one-time', 'D156 needs one-time credential styling.');
requireText(mmirPath, 'mimir-nav-more', 'D042 calm UX pass must keep secondary navigation behind the More menu.');
requireText(mmirPath, 'Ask now. MMIR chooses the safest free route automatically', 'D042 first screen must communicate automatic free routing.');
requireText(firstImpressionPath, 'activation-cockpit', 'MMIR first impression must mount the first-screen activation cockpit.');
requireText(firstImpressionPath, 'activation-connect-local', 'MMIR activation cockpit must expose local connector activation.');
requireText(firstImpressionPath, 'activation-open-node-dashboard', 'MMIR activation cockpit must expose node health activation.');
requireText(chatRuntimePath, 'Loading free model routes', 'D042 chat runtime must not start with an empty no-model state.');
requireText(chatRuntimePath, 'guideResponseText', 'D042 guide helper copy must stay readable and ASCII-safe.');
requireText(mmirPath, 'The orchestration layer for trusted AI.', 'MMIR product page hero must state the MMIR product identity.');
requireText(mmirPath, 'Connect local AI', 'MMIR product page must show the first local AI activation action.');
requireText(mmirPath, 'id="node-dashboard"', 'MMIR product page must expose a node dashboard entrypoint.');
requireText(mmirPath, 'id="node-dashboard-root"', 'MMIR product page must expose a node dashboard render root.');
requireText(mmirPath, './apps/mimir-chat-portal/node-dashboard.js', 'MMIR product page must load the node dashboard script.');
requireText(mmirPath, 'id="model-library"', 'MMIR product page must expose model-agnostic routing.');
requireText(mmirPath, 'id="workflow-builder"', 'MMIR product page must expose workflow orchestration.');
requireText(mmirPath, 'id="gui-parity"', 'MMIR product page must expose the ChatGPT/Open WebUI parity matrix.');
requireText(mmirPath, './apps/mimir-chat-portal/gui-parity-matrix.js', 'MMIR product page must load GUI parity matrix script.');
requireText(mmirPath, './apps/mimir-chat-portal/conversation-manager.js', 'MMIR product page must load conversation manager script.');
requireText(mmirPath, './apps/mimir-chat-portal/use-case-templates.js', 'MMIR product page must load use-case templates.');
requireText(mmirPath, './apps/mimir-chat-portal/free-value-loops.js', 'MMIR product page must load free value loops.');
requireText(mmirPath, './apps/mimir-chat-portal/web-search.js', 'MMIR product page must load explicit web search script.');
requireText(mmirPath, './apps/mimir-chat-portal/research-planner.js', 'MMIR product page must load research planning script.');
requireText(mmirPath, './apps/mimir-chat-portal/assistant-builder.js', 'MMIR product page must load assistant builder script.');
requireText(mmirPath, './apps/mimir-chat-portal/tool-runner.js', 'MMIR product page must load permissioned tool runner script.');
requireText(mmirPath, './apps/mimir-chat-portal/code-sandbox.js', 'MMIR product page must load code sandbox preflight script.');
requireText(mmirPath, './apps/mimir-chat-portal/artifact-workspace.js', 'MMIR product page must load artifact workspace script.');
requireText(mmirPath, './apps/mimir-chat-portal/image-boundary.js', 'MMIR product page must load image boundary script.');
requireText(mmirPath, './apps/mimir-chat-portal/voice-controls.js', 'MMIR product page must load voice controls script.');
requireText(mmirPath, './apps/mimir-chat-portal/vision-input.js', 'MMIR product page must load vision input script.');
requireText(mmirPath, './apps/mimir-chat-portal/admin-governance.js', 'MMIR product page must load admin governance script.');
requireText(mmirPath, './apps/mimir-chat-portal/access-control.js', 'MMIR product page must load access control script.');
requireText(mmirPath, './apps/mimir-chat-portal/runtime-settings.js', 'MMIR product page must load runtime settings script.');
requireText(mmirPath, 'id="data-analysis"', 'D146 needs a visible data analysis panel.');
requireText(mmirPath, './apps/mimir-chat-portal/data-analysis.js', 'D146 needs data analysis loaded on the product page.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'data-analysis.js'), 'mimir-data-analysis-v1:', 'D146 needs local data analysis snapshot storage.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'data-analysis.js'), 'parseDelimited', 'D146 needs browser-only CSV/TSV parsing.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'data-analysis.js'), 'renderSvgChart', 'D146 needs local chart rendering.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'data-analysis.js'), 'MAX_FILE_BYTES', 'D146 needs bounded browser analysis input size.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'data-analysis.css'), '.data-analysis-chart', 'D146 needs chart styling.');
requireText(mmirPath, 'id="scheduled-tasks"', 'D147 needs a visible scheduled tasks panel.');
requireText(mmirPath, './apps/mimir-chat-portal/scheduled-tasks.js', 'D147 needs scheduled tasks loaded on the product page.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'scheduled-tasks.js'), 'mimir-scheduled-tasks-v1:', 'D147 needs local scheduled task storage.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'scheduled-tasks.js'), 'cost_policy:\'free/local-only\'', 'D147 needs explicit free/local-only cost policy.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'scheduled-tasks.js'), 'function checkDue()', 'D147 needs due-task checking.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'scheduled-tasks.css'), '.scheduled-task-card', 'D147 needs task card styling.');
requireText(mmirPath, 'id="connector-catalog"', 'D148 needs a visible external connector catalog panel.');
requireText(mmirPath, './apps/mimir-chat-portal/connector-catalog.js', 'D148 needs connector catalog loaded on the product page.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'connector-catalog.js'), 'mimir-connector-plans-v1:', 'D148 needs workspace-local connector plan storage.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'connector-catalog.js'), '/connectors/catalog', 'D148 needs protected connector catalog route support.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'connector-catalog.js'), '/connectors/sync-plans', 'D148 needs protected connector sync planning route support.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'connector-catalog.js'), 'public_frontend_secrets_allowed:false', 'D148 must keep public frontend connector secrets blocked.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'connector-catalog.css'), '.connector-card', 'D148 needs connector catalog card styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'use-case-templates.js'), 'function templateOptions()', 'Use-case templates must expose a concrete template catalog.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'use-case-templates.js'), 'repo-analysis', 'Use-case templates must include repo analysis.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'use-case-templates.js'), 'product-plan', 'Use-case templates must include product planning.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'use-case-templates.js'), 'security-review', 'Use-case templates must include security review.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'use-case-templates.js'), 'model-comparison', 'Use-case templates must include model comparison.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'use-case-templates.js'), 'workflow-planning', 'Use-case templates must include workflow planning.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'use-case-templates.css'), '.use-case-template-grid', 'Use-case templates need a responsive card layout.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'free-value-loops.js'), 'function loopOptions()', 'Free value loops must expose concrete activation loops.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'free-value-loops.js'), 'free-chat', 'Free value loops must include chat.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'free-value-loops.js'), 'local-model', 'Free value loops must include local model activation.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'free-value-loops.js'), 'compare-models', 'Free value loops must include model comparison.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'free-value-loops.js'), 'memory-loop', 'Free value loops must include memory.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'free-value-loops.js'), 'knowledge-loop', 'Free value loops must include documents/knowledge.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'free-value-loops.css'), '.free-value-loop-grid', 'Free value loops need a responsive visual grid.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'gui-parity-matrix.js'), 'gui-parity-matrix.json', 'GUI parity matrix script must load the public-safe matrix data.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'gui-parity-matrix.js'), 'statusClass', 'GUI parity matrix must render truthful status classes.');
requireText(join(root, 'docs', 'MMIR_GUI_PARITY_MATRIX.md'), 'Source of truth', 'GUI parity matrix docs must point to the public JSON source of truth.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'conversation-manager.js'), 'CONVERSATION_PREFIX', 'Conversation manager must persist saved conversations per workspace.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'conversation-manager.js'), 'Save / rename', 'Conversation manager must expose rename/save.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'conversation-manager.js'), 'Archive', 'Conversation manager must expose archive.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'conversation-manager.js'), 'Pin', 'Conversation manager must expose pin.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'conversation-manager.js'), 'Search saved chats', 'Conversation manager must expose search.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'conversation-manager.js'), 'Fork', 'Conversation manager must expose fork.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'conversation-manager.js'), 'Export', 'Conversation manager must expose export.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'conversation-manager.js'), 'Safe share', 'Conversation manager must expose redacted safe-share.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'prompt-registry.js'), 'mimir-prompts-v1:', 'Prompt registry must keep a free local prompt library fallback.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'prompt-registry.js'), 'starter-repo-review', 'Prompt registry must include reusable starter prompts.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'prompt-registry.js'), 'prompt-registry-tags', 'Prompt registry must expose prompt tags.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'prompt-registry.js'), 'prompt-registry-variables', 'Prompt registry must expose prompt variables.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'prompt-registry.js'), 'applyVariables', 'Prompt registry must support quick variable insertion.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'prompt-registry.css'), '.prompt-starter-grid', 'Prompt registry needs starter prompt styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'memory.js'), 'memory-scope', 'Memory governance must expose user-controlled scope.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'memory.js'), 'memory-expires', 'Memory governance must expose expiration controls.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'memory.js'), 'memory-import-notes', 'Memory governance must expose notes import.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'memory.js'), 'mimir-memory-use-v1:', 'Memory governance must track why memory was used.');
requireText(chatRuntimePath, 'why_used', 'Chat runtime must preserve backend memory-use reasons.');
requireText(chatRuntimePath, 'memoryUseStorageKey', 'Chat runtime must write visible memory-use review data.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'memory.css'), '.memory-use-review', 'Memory governance needs visible memory-use review styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'knowledge.js'), 'knowledge-dropzone', 'Knowledge upload must expose drag/drop staging.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'knowledge.js'), 'MAX_FILE_BYTES', 'Knowledge upload must enforce file size bounds.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'knowledge.js'), 'fileIssue(file)', 'Knowledge upload must validate file type and size before indexing.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'knowledge.js'), 'knowledge-preview-list', 'Knowledge upload must show staged file previews.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'knowledge.js'), 'COLLECTIONS_PREFIX', 'Knowledge upload must persist local collection scope.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'knowledge.js'), 'knowledge-collection-name', 'Knowledge upload must let users name collections.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'knowledge.js'), 'data-collection-toggle', 'Knowledge upload must let users enable or disable collections.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'knowledge.css'), '.knowledge-dropzone', 'Knowledge upload needs dropzone styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'knowledge.css'), '.knowledge-collection-card', 'Knowledge collections need visible styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'web-search.js'), '/web/search', 'Web search UI must call the protected web search route only when a backend is active.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'web-search.js'), 'manualSearchUrls', 'Web search UI must keep a free manual search path.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'web-search.js'), 'web-search-consent', 'Web search UI must require explicit consent.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'web-search.js'), 'saveLocalSources', 'Web search UI must save selected sources to local knowledge.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'web-search.css'), '.web-search-result', 'Web search needs visible result/source styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'research-planner.js'), '/research/plans', 'Research planning UI must call the protected research plan route when a backend is active.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'research-planner.js'), 'mimir-research-plans-v1:', 'Research planning UI must persist local plans per workspace.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'research-planner.js'), 'research-consent', 'Research planning UI must require explicit planning consent.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'research-planner.js'), 'execution_allowed:false', 'Research planning UI must keep public execution disabled.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'research-planner.css'), '.research-gate-grid', 'Research planning needs visible approval gate styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'assistant-builder.js'), 'mimir-assistants-v1:', 'Assistant builder must keep a free local assistant library fallback.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'assistant-builder.js'), '/assistants', 'Assistant builder must call the protected assistants route when a backend is active.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'assistant-builder.js'), 'assistant-knowledge-mode', 'Assistant builder must expose knowledge scope.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'assistant-builder.js'), 'assistant-sharing', 'Assistant builder must expose sharing policy.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'assistant-builder.js'), 'Provider keys, tokens, billing approvals', 'Assistant builder must keep public frontend secret boundaries visible.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'assistant-builder.css'), '.assistant-starter-grid', 'Assistant builder needs starter styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'tool-runner.js'), '/tools/execute', 'Tool runner must use the protected tool execution route.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'tool-runner.js'), 'tool-runner-consent', 'Tool runner must require explicit consent.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'tool-runner.js'), 'renderTrace', 'Tool runner must show visible traces.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'tool-runner.css'), '.tool-result-card', 'Tool runner needs visible result styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'code-sandbox.js'), '/code/sandbox/plan', 'Code sandbox UI must call the protected planning route when a backend is active.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'code-sandbox.js'), 'localPlan', 'Code sandbox UI must keep a free browser preflight fallback.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'code-sandbox.js'), 'code-sandbox-consent', 'Code sandbox UI must require explicit consent.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'code-sandbox.js'), 'execution_allowed:false', 'Code sandbox UI must keep public execution disabled.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'code-sandbox.css'), '.code-gate-grid', 'Code sandbox needs visible gate styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'artifact-workspace.js'), 'ARTIFACT_PREFIX', 'Artifact workspace must persist artifacts per workspace.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'artifact-workspace.js'), 'defaultArtifact', 'Artifact workspace must create a useful automatic first artifact.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'artifact-workspace.js'), 'sendToChat', 'Artifact workspace must send artifacts back to chat.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'artifact-workspace.css'), '.artifact-shell', 'Artifact workspace needs a responsive canvas layout.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'image-boundary.js'), 'generation_enabled:false', 'Image boundary must keep public image generation disabled.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'image-boundary.js'), 'estimated_cost_usd:0', 'Image boundary must keep the default route free.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'image-boundary.js'), 'Protected paid provider', 'Image boundary must label protected paid-provider routes.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'image-boundary.css'), '.image-gate-grid', 'Image boundary needs visible gate styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'voice-controls.js'), 'startDictation', 'Voice controls must expose push-to-talk dictation.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'voice-controls.js'), 'speechSynthesis', 'Voice controls must expose browser read-aloud.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'voice-controls.js'), 'mimir-voice-settings-v1', 'Voice settings must persist locally.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'voice-controls.css'), '.voice-device-list', 'Voice controls need visible route/device status styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'vision-input.js'), 'handlePasteImage', 'Vision input must support pasted screenshots.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'vision-input.js'), 'looksVisionCapable', 'Vision input must gate by model capability.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'vision-input.js'), 'raw_image_sent:false', 'Vision input must not send raw images from the public page.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'vision-input.css'), '.vision-gate-grid', 'Vision input needs visible gate styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'admin-governance.js'), '/admin/overview', 'Admin governance must call the protected admin overview route.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'admin-governance.js'), 'browser-local-fallback', 'Admin governance must keep a browser-local fallback.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'admin-governance.js'), 'provider_keys_browser_allowed:false', 'Admin governance must show provider keys are blocked in browser.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'admin-governance.css'), '.admin-policy-grid', 'Admin governance needs visible policy styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'access-control.js'), '/access/policies', 'Access control must call the protected policy route when a backend is active.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'access-control.js'), '/access/check', 'Access control must call the protected decision route when a backend is active.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'access-control.js'), 'rbac-beta-fail-closed', 'Access control must keep the fail-closed RBAC mode visible.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'access-control.js'), 'server_side_enforcement_required:true', 'Access control must show server-side enforcement is required.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'access-control.css'), '.access-table', 'Access control needs visible policy matrix styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'runtime-settings.js'), 'mimir-runtime-settings-v1', 'Runtime settings must persist safe local preferences.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'runtime-settings.js'), 'runtime-max-tokens', 'Runtime settings must expose max token controls.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'runtime-settings.js'), 'runtime-context-length', 'Runtime settings must expose context length controls.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'runtime-settings.js'), 'runtime-system-prompt', 'Runtime settings must expose a bounded system prompt override.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'runtime-settings.css'), '.runtime-settings-grid', 'Runtime settings need responsive control styling.');
requireText(chatRuntimePath, 'runtimePayload', 'Chat runtime must send bounded runtime settings to active backends.');
requireText(chatRuntimePath, 'runtimeInstruction', 'Chat runtime must inject bounded user system instructions safely.');

requireText(chatPortalPath, 'ensureAutomaticDefaults();render();', 'Chat portal must prepare automatic first-run defaults.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.js'), "const INTENT_KEY='mimir-user-intent-v1'", 'Onboarding must persist an optional user intent without forcing setup choices.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.js'), 'function intentOptions()', 'Onboarding must expose persona-based starter paths.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.js'), 'Business owner', 'Onboarding must include a business owner path.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.js'), 'Privacy / local', 'Onboarding must include a privacy/local path.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.js'), 'recoverFirstChat', 'D167 first-run gates need a first-chat recovery action.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.js'), 'First chat receipt', 'D167 first-run gates must show first-chat receipt state.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.js'), 'mmir-first-chat-receipt-updated', 'D167 first-run gates must refresh when first-chat receipts change.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.css'), '.onboarding-intent-grid', 'Onboarding intent paths need a responsive visual layout.');
requireText(chatRuntimePath, 'function preferredStarterModel()', 'Chat runtime must keep an explicit first-run starter model choice.');
requireText(chatRuntimePath, "model.id==='mmir-guide'", 'Chat runtime must default to the immediate in-browser guide when no backend model is live.');
requireText(chatRuntimePath, '/chat/completions', 'Chat runtime must use the shared chat completions contract.');
requireText(chatRuntimePath, 'runtime-live-proof', 'D163 needs visible live model proof UI.');
requireText(chatRuntimePath, 'tinyChatProbe', 'D163 needs a tiny free chat proof before marking a route verified.');
requireText(chatRuntimePath, 'skipped to avoid hidden provider cost', 'D163 must not auto-probe possibly paid provider routes.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'), '.runtime-live-proof', 'D163 needs live proof styling.');
requireText(chatRuntimePath, 'proofRepairActions', 'D164 needs proof-driven repair actions.');
requireText(chatRuntimePath, 'data-proof-action', 'D164 needs visible repair controls from proof states.');
requireText(chatRuntimePath, 'mmir-local-connector-install.html', 'D164 needs installer repair path from failed proof.');
requireText(chatRuntimePath, 'Send first answer', 'D165/D197 need first-answer handoff from verified model proof.');
requireText(chatRuntimePath, 'first_chat_ready:true', 'D165 needs a testable first-chat-ready signal.');
requireText(chatRuntimePath, 'mimir-first-chat-receipt-v1:', 'D166 needs a browser-local first-chat receipt key.');
requireText(chatRuntimePath, 'raw_prompt_stored:false', 'D166 receipt must prove raw prompts are not stored.');
requireText(chatRuntimePath, 'raw_response_stored:false', 'D166 receipt must prove raw responses are not stored.');
requireText(chatRuntimePath, 'mmir-first-chat-receipt-updated', 'D166 receipt must emit a refreshable event.');
requireText(chatRuntimePath, 'preferredProofModel', 'D168 needs install-to-first-chat preferred model proof selection.');
requireText(chatRuntimePath, 'mmir-model-install-ready', 'D168 needs a model-install-ready bridge event.');
requireText(chatRuntimePath, 'mmir-install-to-first-chat-ready', 'D168 needs a first verified chat prepared event.');
requireText(chatRuntimePath, 'mmir-local-connector-refreshed', 'D168 needs node-online refresh events to trigger chat proof.');
requireText(chatRuntimePath, 'the orchestration layer for trusted AI', 'Chat runtime must keep the MMIR product identity in model context.');
requireText(chatRuntimePath, 'COLLECTIONS_PREFIX', 'Chat runtime must scope local knowledge to enabled collections.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'model-comparison.js'), 'COLLECTIONS_PREFIX', 'Model comparison must scope local knowledge to enabled collections.');
requireText(firstImpressionPath, 'function syncReadyState()', 'First impression script must sync live model readiness into the hero.');
requireText(firstImpressionPath, 'function syncActivationCockpit', 'First impression script must sync activation cockpit readiness.');
requireText(firstImpressionPath, 'mmir-first-screen-cockpit-updated', 'Activation cockpit must emit a testable readiness event.');
requireText(firstImpressionPath, 'if(current!==tone)', 'Activation cockpit class updates must be idempotent under MutationObserver.');
requireText(firstImpressionPath, 'function sendPrompt(value)', 'First impression smart actions must send prompts instead of only navigating.');
requireText(firstImpressionPath, 'mimir-readiness-rail', 'First impression must expose a live readiness rail on the first screen.');
requireText(firstImpressionPath, 'renderReadinessRail', 'First impression readiness rail must update automatically.');
requireText(mmirPath, './apps/mimir-chat-portal/first-screen-activation-hydration.js', 'D187 MMIR page must defer non-essential first-screen activation hydration.');
requireText(firstScreenHydrationPath, 'renderRepairResumeBanner', 'D176 first screen must render the last repair resume result.');
requireText(firstScreenHydrationPath, 'repair-resume-banner', 'D176 first screen must expose a repair resume banner.');
requireText(firstScreenHydrationPath, 'activation-replay-banner', 'D179 first screen must expose active replay state as demo-only.');
requireText(firstScreenHydrationPath, 'mimir-activation-replay-v1:', 'D179 first screen must read workspace-local activation replay state.');
requireText(firstScreenHydrationPath, 'mutated_real_connector:false', 'D179 first screen replay state must not look like real proof.');
requireText(firstScreenHydrationPath, 'data-activation-replay-jump', 'D180 first screen must jump to replay next target.');
requireText(firstScreenHydrationPath, 'data-activation-replay-reset', 'D180 first screen must reset active replay state.');
requireText(firstScreenHydrationPath, 'clearActivationReplay', 'D180 first screen replay reset must only clear the demo replay key.');
requireText(firstImpressionPath, 'Open. Connect local AI. Ready.', 'First impression runtime must preserve the ground-zero activation promise.');
requireText(chatRuntimePath, 'runtime-activation-replay', 'D179 chat runtime must show active replay state near live proof.');
requireText(chatRuntimePath, 'real live proof unchanged', 'D179 replay handoff must not replace real live proof.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.css'), '.runtime-activation-replay', 'D179 chat runtime replay state needs visible styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'repair-resume.css'), '.activation-replay-banner', 'D179 first-screen replay state needs visible styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'repair-resume.css'), '.activation-replay-actions', 'D180 first-screen replay controls need visible styling.');
requireText(nodeDashboardPath, '/models', 'Node dashboard must check live model inventory.');
requireText(nodeDashboardPath, '/tunnels/status', 'Node dashboard must check tunnel status.');
requireText(nodeDashboardPath, '/doctor', 'D169 node dashboard must use the local health doctor route when available.');
requireText(nodeDashboardPath, 'Local Node Doctor', 'D169 node dashboard must label the authoritative doctor source.');
requireText(nodeDashboardPath, 'model-pull', 'D169 node dashboard must include model pull state in the repair loop.');
requireText(nodeDashboardPath, 'guidedDeviceRepair', 'D172 node dashboard must map doctor state to one guided repair card.');
requireText(nodeDashboardPath, 'detectDevice', 'D172 node dashboard must detect OS/device class for repair cards.');
requireText(nodeDashboardPath, 'Raspberry Pi / Linux ARM', 'D172 repair card must support Raspberry Pi/Linux ARM.');
requireText(nodeDashboardPath, 'data-device-repair-action', 'D174 repair card must expose actionable repair links.');
requireText(nodeDashboardPath, 'device-repair-action', 'D174 repair-card clicks must be logged to activation telemetry.');
requireText(nodeDashboardPath, 'mimir-repair-resume-v1:', 'D175 repair-card clicks must store installer-return resume state.');
requireText(nodeDashboardPath, 'renderRepairResumeBanner', 'D176 Node Dashboard must render the last repair resume result.');
requireText(nodeDashboardPath, 'data-repair-resume-action', 'D176 repair resume banner must offer a next safe action.');
requireText(nodeDashboardPath, 'nodeHandoffPlan', 'D204 Node Dashboard must compute an automatic node/tunnel handoff.');
requireText(nodeDashboardPath, 'renderNodeHandoff', 'D204 Node Dashboard must render the automatic handoff card.');
requireText(nodeDashboardPath, 'data-node-handoff-action', 'D204 node handoff must expose actionable controls.');
requireText(nodeDashboardPath, 'outbound_only_explicit_start', 'D204 node handoff must keep tunnel start explicit and outbound-only.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'local-connector.js'), 'mmir-repair-resume-checked', 'D175 local connector must verify repair resume after return.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'activation-telemetry.js'), 'mmir-repair-resume-checked', 'D175 repair resume results must feed activation telemetry.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.css'), '.node-repair-card', 'D172 guided repair card needs visible styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.css'), '.node-resume-banner', 'D176 Node Dashboard needs repair resume banner styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.css'), '.node-handoff-card', 'D204 automatic node handoff needs visible styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'repair-resume.css'), '.repair-resume-banner', 'D176 first screen needs repair resume banner styling.');
requireText(join(root, 'scripts', 'smoke-check-node-repair-cards.js'), 'offline-connector', 'D173 repair harness must cover offline connector state.');
requireText(join(root, 'scripts', 'smoke-check-node-repair-cards.js'), 'failed-model-pull', 'D173 repair harness must cover failed model pull state.');
requireText(join(root, 'scripts', 'smoke-check-node-tunnel-handoff.js'), 'Node tunnel handoff smoke check passed.', 'D204 node/tunnel handoff needs dedicated CI fixture coverage.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'), 'progress-first-chat-recovery', 'D167 dashboard must expose first-chat receipt recovery.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'), 'firstChatReceiptState', 'D167 dashboard must compute first-chat receipt state.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.css'), '.progress-receipt-card', 'D167 dashboard needs first-chat receipt styling.');
requireText(mimirCssPath, '.mimir-topbar nav{display:flex;width:100%;overflow-x:auto', 'Mobile navigation must remain accessible instead of disappearing.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'privacy-data-inventory', 'Privacy controls must expose a full browser data inventory.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Conversation library', 'Privacy controls must include saved conversation library data.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Artifact workspace', 'Privacy controls must include artifact workspace data.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Prompt library', 'Privacy controls must include local prompt library data.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Clear pairing tokens', 'Privacy controls must let users clear temporary local node pairing tokens.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Delete all local MMIR data', 'Privacy controls must let users reset only MMIR browser data.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Provider keys and cloud credentials', 'Privacy inventory must show that provider keys never belong in the public frontend.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'voice settings', 'Privacy inventory must include browser-local voice settings.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'runtime settings', 'Privacy inventory must include browser-local runtime settings.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Managed backend data', 'Privacy inventory must distinguish protected backend data from browser-local data.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'MMIR managed session token', 'D161 privacy inventory must disclose current-tab managed session tokens.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'First chat receipt', 'D166 privacy inventory must disclose the browser-local first-chat receipt.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Activation telemetry', 'D170 privacy inventory must disclose browser-local activation telemetry.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'activation-telemetry.js'), 'MimirActivationTelemetry', 'D170 needs a browser-local activation telemetry recorder.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'activation-telemetry.js'), 'raw_prompt_stored:false', 'D170 telemetry must prove raw prompts are not stored.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'activation-telemetry.js'), 'secrets_stored:false', 'D170 telemetry must prove secrets are not stored.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'activation-autopilot.js'), 'MimirActivationAutopilot', 'D171 needs a safe activation autopilot API.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'activation-autopilot.js'), 'no_paid_routes_started:true', 'D171 autopilot must not start paid routes.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'activation-autopilot.js'), 'provider_secrets_stored:false', 'D171 autopilot must not store provider secrets.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'activation-autopilot.js'), 'retry-live-proof', 'D171 autopilot must retry safe live proof states.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'), 'progress-activation-clear', 'D170 dashboard must expose activation telemetry controls.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'), 'progress-activation-autopilot', 'D171 dashboard must expose manual safe autopilot run.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'), 'renderActivationSimulator', 'D177 progress dashboard must render activation simulator fixtures.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'), 'progress-activation-simulator', 'D177 progress dashboard must expose activation simulator panel.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'), 'data-activation-replay', 'D178 progress dashboard must expose safe activation replay controls.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'), 'mimir-activation-replay-v1:', 'D178 replay state must be browser-local and workspace-scoped.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'), 'mutated_real_connector:false', 'D178 replay controls must not mutate real connectors.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.css'), '.progress-simulator-card', 'D177 activation simulator needs progress dashboard styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.css'), '.progress-replay-state', 'D178 activation replay needs visible status styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Activation replay demo state', 'D178 privacy inventory must disclose activation replay demo state.');
requireText(join(publicDir, 'activation-simulator-fixtures.json'), 'verified-local-model', 'D177 activation simulator must include verified local model fixture.');
requireText(join(root, 'scripts', 'smoke-check-activation-simulator.js'), 'expectedScenarioIds', 'D177 activation simulator must have a dedicated smoke harness.');
requireText(join(root, 'scripts', 'smoke-check-activation-replay-render.js'), 'Activation replay render smoke check passed.', 'D181 replay render regression harness must be part of the public smoke gate.');
requireText(join(root, 'scripts', 'smoke-check-activation-replay-render.js'), 'requiredSurfaces', 'D181 replay render harness must verify every required activation surface.');
requireText(join(root, 'scripts', 'smoke-check-activation-route-map.js'), 'Activation route map smoke check passed.', 'D182 activation route map must have a dedicated smoke harness.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'), 'renderReplayRouteMap', 'D182 Progress Dashboard must render the activation replay route map.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.css'), '.progress-replay-route-map', 'D182 route map needs visible Progress Dashboard styling.');
requireText(join(root, 'scripts', 'smoke-check-activation-closure.js'), 'Activation closure smoke check passed.', 'D183 live activation gap closure checklist must have a dedicated smoke harness.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'), 'renderLiveGapChecklist', 'D183 Progress Dashboard must render the live activation closure checklist.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.css'), '.progress-live-gap-checklist', 'D183 live activation closure checklist needs visible styling.');
requireText(join(root, 'scripts', 'smoke-check-first-screen-activation-closure.js'), 'First-screen activation closure smoke check passed.', 'D184 first-screen activation closure strip must have a dedicated smoke harness.');
requireText(firstImpressionPath, 'renderActivationClosureStrip', 'D184 first screen must render the live activation closure strip.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'repair-resume.css'), '.activation-closure-strip', 'D184 first-screen activation closure strip needs visible styling.');
requireText(join(root, 'scripts', 'smoke-check-device-starter-recommendation.js'), 'Device starter recommendation smoke check passed.', 'D185 device-aware starter recommendation must have a dedicated smoke harness.');
requireText(firstImpressionPath, 'deviceStarterRecommendation', 'D185 first screen must recommend a starter model from detected device class.');
requireText(firstImpressionPath, 'recommended_starter:', 'D185 first screen must render the recommended starter evidence.');
requireText(join(root, 'scripts', 'smoke-check-recommended-starter-telemetry.js'), 'Recommended starter telemetry smoke check passed.', 'D186 recommended starter telemetry must have a dedicated smoke harness.');
requireText(firstImpressionPath, "recommended-starter", 'D186 first screen must record recommended starter selection telemetry.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'activation-telemetry.js'), "if(type==='recommended-starter')", 'D186 activation telemetry must sanitize recommended starter selections.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'), 'starterSelected', 'D186 Progress Dashboard must count recommended starter selections.');
requireText(join(root, 'scripts', 'smoke-check-critical-shell-headroom.js'), 'Critical shell headroom smoke check passed.', 'D187 critical-shell headroom must have a dedicated smoke harness.');
requireText(firstScreenHydrationPath, 'MimirFirstScreenActivationHydration', 'D187 deferred hydration module must expose first-screen activation hydration.');
requireText(join(root, 'scripts', 'smoke-check-starter-to-proof-funnel.js'), 'Starter-to-proof funnel smoke check passed.', 'D188 starter-to-proof funnel must have a dedicated smoke harness.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'), 'renderStarterFunnel', 'D188 Progress Dashboard must render the starter-to-proof funnel.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.css'), '.progress-starter-funnel', 'D188 starter-to-proof funnel needs visible styling.');
requireText(join(root, 'scripts', 'smoke-check-starter-funnel-continue.js'), 'Starter funnel continue smoke check passed.', 'D189 starter funnel continue action must have a dedicated smoke harness.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'), 'runStarterFunnelContinue', 'D189 Progress Dashboard must run the safe starter funnel continue action.');
requireText(join(root, 'scripts', 'smoke-check-first-screen-starter-funnel.js'), 'First-screen starter funnel smoke check passed.', 'D190 first-screen starter funnel must have a dedicated smoke harness.');
requireText(firstScreenHydrationPath, 'renderFirstScreenStarterFunnel', 'D190 deferred first-screen hydration must render starter funnel progress.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'repair-resume.css'), '.first-screen-starter-funnel', 'D190 first-screen starter funnel needs visible styling.');
requireText(join(root, 'scripts', 'smoke-check-first-screen-starter-funnel-continue.js'), 'First-screen starter funnel continue smoke check passed.', 'D191 first-screen starter funnel continue must have a dedicated smoke harness.');
requireText(firstScreenHydrationPath, 'runFirstScreenStarterFunnelAction', 'D191 deferred first-screen hydration must run starter funnel actions.');
requireText(join(root, 'scripts', 'smoke-check-recommended-starter-model-focus.js'), 'Recommended starter model-library focus smoke check passed.', 'D192 recommended starter model-library focus must have a dedicated smoke harness.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'model-catalog-ui.js'), 'starterModelToCatalog', 'D192 Model Library must import exact free starter models.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'model-catalog-ui.js'), 'mmir-model-library-focus-recommended', 'D192 Model Library must focus the recommended starter from starter actions.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.css'), '.model-card.is-recommended-starter', 'D192 recommended starter focus needs visible styling.');
requireText(join(root, 'scripts', 'smoke-check-recommended-starter-install-handoff.js'), 'Recommended starter install handoff smoke check passed.', 'D193 recommended starter install handoff must have a dedicated smoke harness.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'model-catalog-ui.js'), 'data-starter-action', 'D193 Model Library starter cards must expose install/select handoff actions.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'), 'runStarterHandoff', 'D193 chat runtime must accept starter handoff events.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'), 'selectStarterModelById', 'D193 chat runtime must select the exact starter model for install/proof.');
requireText(join(root, 'scripts', 'smoke-check-starter-install-repair-fallback.js'), 'Starter install repair fallback smoke check passed.', 'D194 starter install repair fallback must have a dedicated smoke harness.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'), 'starterInstallRepairFallback', 'D194 chat runtime must turn starter install failures into repair resume.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.js'), 'mmir-starter-install-repair-opened', 'D194 Node Dashboard must refresh when starter install repair opens.');
requireText(firstScreenHydrationPath, 'Starter install needs repair', 'D194 first screen must show starter install repair state.');
requireText(join(root, 'scripts', 'smoke-check-starter-install-retry-after-repair.js'), 'Starter install retry-after-repair smoke check passed.', 'D195 starter install retry after repair must have a dedicated smoke harness.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'), 'handleRepairResumeChecked', 'D195 chat runtime must retry the preserved starter after repair is checked.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'), 'starter-install-retry', 'D195 retry must record no-spend activation telemetry.');
requireText(firstScreenHydrationPath, 'Retrying starter install', 'D195 first screen must show retrying starter state.');
requireText(join(root, 'scripts', 'smoke-check-starter-retry-success-closure.js'), 'Starter retry success closure smoke check passed.', 'D196 starter retry success closure must have a dedicated smoke harness.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'), 'closeStarterRetrySuccess', 'D196 chat runtime must close repair resume on starter retry success.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'), 'starter-retry-success', 'D196 starter retry success must be tracked without storing secrets.');
requireText(firstScreenHydrationPath, 'Starter repair verified', 'D196 first screen must show starter repair verified state.');
requireText(join(root, 'scripts', 'smoke-check-first-answer-send-handoff.js'), 'First-answer send handoff smoke check passed.', 'D197 first-answer send handoff must have a dedicated smoke harness.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'), "setStatus('Sending first verified answer...','loading')", 'D197 chat runtime must turn verified proof action into an actual first-answer send.');
requireText(firstScreenHydrationPath, 'primary-chat-link', 'D197 first screen must hand verified starter repair into the primary chat send action.');
requireText(join(root, 'scripts', 'smoke-check-first-answer-next-step.js'), 'First-answer next-step smoke check passed.', 'D198 first-answer next-step must have a dedicated smoke harness.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'), "proofRepairActions('answered')", 'D198 chat runtime must replace repeated send prompts with a post-answer next step.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'), 'firstAnswerNextStep', 'D198 Progress Dashboard must compute a receipt-driven next step.');
requireText(join(root, 'scripts', 'smoke-check-visible-control-dead-ends.js'), 'Visible-control dead-end smoke check passed.', 'D199 visible-control dead-end pass must have a dedicated smoke harness.');
requireText(join(publicDir, 'visible-control-audit.json'), 'composer-add-model', 'D199 public control audit must cover the composer Add Model control.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'), "openPanel('#model-library')", 'D199 composer Add Model must open the model library, not a dead setup stop.');
requireText(join(root, 'scripts', 'smoke-check-critical-shell-headroom-recovery.js'), 'Critical-shell headroom recovery smoke check passed', 'D200 critical-shell headroom recovery must have a dedicated smoke harness.');
requireText(mmirPath, './apps/mimir-chat-portal/demo-growth.js', 'D200 demo growth script must remain available through deferred loading.');
forbidText(mmirPath, '<script src="./apps/mimir-chat-portal/demo-growth.js" defer></script>', 'D200 demo growth script must not block the initial critical shell.');
requireText(join(root, 'scripts', 'smoke-check-deploy-verification.js'), 'Deploy verification smoke check passed.', 'D201 deploy verification must have a dedicated smoke harness.');
requireText(join(publicDir, 'deploy-verification.json'), 'db9cee4', 'D201 deploy verification must record latest verified commit.');
requireText(join(publicDir, 'platform-status.json'), 'latest-deploy-verification', 'D201 platform status must expose latest deploy verification.');
requireText(join(root, 'scripts', 'smoke-check-first-screen-visual-qa.js'), 'First-screen visual QA smoke check passed.', 'D202 first-screen visual QA must have a dedicated smoke harness.');
requireText(join(publicDir, 'visual-qa-report.json'), 'D202 first-screen visual verification', 'D202 first-screen visual QA must publish a public-safe report.');
requireText(join(publicDir, 'visual-qa-report.json'), 'desktop-first-screen', 'D202 visual QA report must include desktop evidence.');
requireText(join(publicDir, 'visual-qa-report.json'), 'mobile-first-screen', 'D202 visual QA report must include mobile evidence.');
requireText(join(root, 'scripts', 'smoke-check-composer-model-picker.js'), 'Composer model picker smoke check passed.', 'D203 composer model picker must have a dedicated smoke harness.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'), 'openComposerModelPicker', 'D203 chat runtime must trigger the composer model picker.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'composer-model-picker.js'), 'composer-model-picker', 'D203 composer model picker module must render the picker.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'composer-model-picker.css'), '.composer-model-picker', 'D203 composer model picker needs styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'), 'mimir-activation-events-v1:', 'D170 dashboard must read activation telemetry by workspace.');
requireText(mmirPath, 'activation-telemetry.js', 'D170 activation telemetry must load on the MMIR page.');
requireText(mmirPath, 'activation-autopilot.js', 'D171 activation autopilot must load on the MMIR page.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Knowledge collections', 'Privacy inventory must include knowledge collection scope metadata.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Safe share bundles', 'Privacy inventory must include safe share bundles.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Node handoff state', 'D204 privacy inventory must disclose node handoff state.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), "excludes:['pairing tokens','MMIR session tokens','invite codes','provider keys','managed backend data']", 'Workspace export must explicitly exclude pairing tokens, session tokens, invite codes, provider keys and backend data.');

const parity = JSON.parse(text(guiParityPath));
const parityGroups = Array.isArray(parity.groups) ? parity.groups : [];
const parityItems = parityGroups.flatMap((group) => Array.isArray(group.items) ? group.items : []);
if (parityItems.length < 24) {
  fail('GUI parity matrix must expose at least twenty-four benchmarked feature states.');
}
for (const status of ['live', 'beta', 'planned', 'blocked', 'premium planned']) {
  if (!parityItems.some((item) => item.status === status)) {
    fail(`GUI parity matrix must include status: ${status}.`);
  }
}
for (const feature of ['Model selector', 'Model/runtime settings', 'Workflow builder', 'Knowledge collections', 'Rich attachments and previews', 'Web search', 'Code interpreter', 'Access Control / RBAC', 'Marketplace and premium routes']) {
  if (!parityItems.some((item) => item.feature === feature)) {
    fail(`GUI parity matrix is missing ${feature}.`);
  }
}

if (!process.exitCode) {
  console.log('Static Pages smoke check passed.');
}
