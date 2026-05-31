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
  if (ext === '.js') {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) {
      fail(`Invalid JavaScript syntax: ${rel}\n${result.stderr || result.stdout}`);
    }
  }
  if (['.html', '.js', '.json', '.css', '.webmanifest'].includes(ext) && read(file).includes('Supergenious')) {
    fail(`Use canonical product label "MMIR Supergenius" instead of "Supergenious": ${rel}`);
  }
  if (['.html', '.js', '.json', '.css', '.webmanifest'].includes(ext) && /(?:MMIR\s+){2,}Supergenius/i.test(read(file))) {
    fail(`Do not duplicate the MMIR Supergenius brand prefix: ${rel}`);
  }
  if (['.html', '.js', '.json', '.css', '.webmanifest'].includes(ext) && /mmir-MMIR Supergenius/i.test(read(file))) {
    fail(`Do not leak internal mmir-supergenius ids into visible labels: ${rel}`);
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
requireText(mmirPath, 'active-node-strip.js?v=20260531-launch-label-boundary-v2', 'MMIR product page must load the cache-busted active-node strip.');
requireText(manifestPath, '"display": "standalone"', 'PWA manifest must remain installable.');
requireText(serviceWorkerPath, './offline.html', 'Service worker must cache the offline shell.');
requireText(serviceWorkerPath, 'mmir-pwa-d325-20260531-launch-label-boundary-v2', 'Service worker cache must bust for the launch label boundary.');
requireText(activeNodeStripPath, 'function activeProfile()', 'Active-node strip must read the selected backend profile before claiming managed API liveness.');
requireText(activeNodeStripPath, 'function managedReady()', 'Active-node strip must gate managed API liveness on runtime proof.');
requireText(activeNodeStripPath, "managedReady()?'online':'setup'", 'Managed API card must remain setup-only until runtime proof is ready.');
requireText(activeNodeStripPath, "managedReady()?modelFromNode(node):'Verify route first'", 'Managed API card must avoid showing a live model before route verification.');

forbidText(mmirPath, '#progress-dashboard', 'Public page must not link to the private progress dashboard.');
forbidText(mmirPath, '#gui-parity', 'Public page must not link to the private GUI parity matrix.');
forbidText(mmirPath, './apps/mimir-chat-portal/progress-dashboard.js', 'Public page must not load the private progress dashboard.');
forbidText(mmirPath, './apps/mimir-chat-portal/gui-parity-matrix.js', 'Public page must not load the private GUI parity matrix.');
forbidText(indexPath, '#progress-dashboard', 'Public root must not route to private progress dashboard.');

if (failures.length) {
  console.error('Public shell smoke check failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Public shell smoke check passed.');
