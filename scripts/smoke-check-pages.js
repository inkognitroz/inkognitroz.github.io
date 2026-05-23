import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const indexPath = join(publicDir, 'index.html');
const mmirPath = join(publicDir, 'mmir.html');
const contentPath = join(publicDir, 'content.json');
const chatRuntimePath = join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js');
const chatPortalPath = join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.js');
const firstImpressionPath = join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js');
const nodeDashboardPath = join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.js');
const mimirCssPath = join(publicDir, 'apps', 'mimir-chat-portal', 'mimir-chat-portal.css');
const guiParityPath = join(publicDir, 'gui-parity-matrix.json');

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
  if (ext === '.json') {
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

requireText(mmirPath, 'mimir-instant-start', 'MMIR product page must show an automatic ready state before technical setup sections.');
requireText(firstImpressionPath, 'activation-cockpit', 'MMIR first impression must mount the first-screen activation cockpit.');
requireText(firstImpressionPath, 'activation-connect-local', 'MMIR activation cockpit must expose local connector activation.');
requireText(firstImpressionPath, 'activation-open-node-dashboard', 'MMIR activation cockpit must expose node health activation.');
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
requireText(mmirPath, './apps/mimir-chat-portal/tool-runner.js', 'MMIR product page must load permissioned tool runner script.');
requireText(mmirPath, './apps/mimir-chat-portal/code-sandbox.js', 'MMIR product page must load code sandbox preflight script.');
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
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'tool-runner.js'), '/tools/execute', 'Tool runner must use the protected tool execution route.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'tool-runner.js'), 'tool-runner-consent', 'Tool runner must require explicit consent.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'tool-runner.js'), 'renderTrace', 'Tool runner must show visible traces.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'tool-runner.css'), '.tool-result-card', 'Tool runner needs visible result styling.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'code-sandbox.js'), '/code/sandbox/plan', 'Code sandbox UI must call the protected planning route when a backend is active.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'code-sandbox.js'), 'localPlan', 'Code sandbox UI must keep a free browser preflight fallback.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'code-sandbox.js'), 'code-sandbox-consent', 'Code sandbox UI must require explicit consent.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'code-sandbox.js'), 'execution_allowed:false', 'Code sandbox UI must keep public execution disabled.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'code-sandbox.css'), '.code-gate-grid', 'Code sandbox needs visible gate styling.');

requireText(chatPortalPath, 'ensureAutomaticDefaults();render();', 'Chat portal must prepare automatic first-run defaults.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.js'), "const INTENT_KEY='mimir-user-intent-v1'", 'Onboarding must persist an optional user intent without forcing setup choices.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.js'), 'function intentOptions()', 'Onboarding must expose persona-based starter paths.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.js'), 'Business owner', 'Onboarding must include a business owner path.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.js'), 'Privacy / local', 'Onboarding must include a privacy/local path.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'onboarding.css'), '.onboarding-intent-grid', 'Onboarding intent paths need a responsive visual layout.');
requireText(chatRuntimePath, 'function preferredStarterModel()', 'Chat runtime must keep an explicit first-run starter model choice.');
requireText(chatRuntimePath, "model.id==='mmir-guide'", 'Chat runtime must default to the immediate in-browser guide when no backend model is live.');
requireText(chatRuntimePath, '/chat/completions', 'Chat runtime must use the shared chat completions contract.');
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
requireText(firstImpressionPath, 'Open. Connect local AI. Ready.', 'First impression runtime must preserve the ground-zero activation promise.');
requireText(nodeDashboardPath, '/models', 'Node dashboard must check live model inventory.');
requireText(nodeDashboardPath, '/tunnels/status', 'Node dashboard must check tunnel status.');
requireText(mimirCssPath, '.mimir-topbar nav{display:flex;width:100%;overflow-x:auto', 'Mobile navigation must remain accessible instead of disappearing.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'privacy-data-inventory', 'Privacy controls must expose a full browser data inventory.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Conversation library', 'Privacy controls must include saved conversation library data.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Clear pairing tokens', 'Privacy controls must let users clear temporary local node pairing tokens.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Delete all local MMIR data', 'Privacy controls must let users reset only MMIR browser data.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Provider keys and cloud credentials', 'Privacy inventory must show that provider keys never belong in the public frontend.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Managed backend data', 'Privacy inventory must distinguish protected backend data from browser-local data.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Knowledge collections', 'Privacy inventory must include knowledge collection scope metadata.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), "excludes:['pairing tokens','provider keys','managed backend data']", 'Workspace export must explicitly exclude pairing tokens, provider keys and backend data.');

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
for (const feature of ['Model selector', 'Workflow builder', 'Knowledge collections', 'Rich attachments and previews', 'Web search', 'Code interpreter', 'Marketplace and premium routes']) {
  if (!parityItems.some((item) => item.feature === feature)) {
    fail(`GUI parity matrix is missing ${feature}.`);
  }
}

if (!process.exitCode) {
  console.log('Static Pages smoke check passed.');
}
