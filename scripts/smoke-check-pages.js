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
requireText(mmirPath, './apps/mimir-chat-portal/use-case-templates.js', 'MMIR product page must load use-case templates.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'use-case-templates.js'), 'function templateOptions()', 'Use-case templates must expose a concrete template catalog.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'use-case-templates.js'), 'repo-analysis', 'Use-case templates must include repo analysis.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'use-case-templates.js'), 'product-plan', 'Use-case templates must include product planning.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'use-case-templates.js'), 'security-review', 'Use-case templates must include security review.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'use-case-templates.js'), 'model-comparison', 'Use-case templates must include model comparison.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'use-case-templates.js'), 'workflow-planning', 'Use-case templates must include workflow planning.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'use-case-templates.css'), '.use-case-template-grid', 'Use-case templates need a responsive card layout.');

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
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Clear pairing tokens', 'Privacy controls must let users clear temporary local node pairing tokens.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Delete all local MMIR data', 'Privacy controls must let users reset only MMIR browser data.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Provider keys and cloud credentials', 'Privacy inventory must show that provider keys never belong in the public frontend.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), 'Managed backend data', 'Privacy inventory must distinguish protected backend data from browser-local data.');
requireText(join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'), "excludes:['pairing tokens','provider keys','managed backend data']", 'Workspace export must explicitly exclude pairing tokens, provider keys and backend data.');

if (!process.exitCode) {
  console.log('Static Pages smoke check passed.');
}
