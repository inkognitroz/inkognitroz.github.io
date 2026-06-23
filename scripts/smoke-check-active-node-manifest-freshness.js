import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const stripPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'active-node-strip.js');
const manifestPath = join(root, 'public', 'active-chat-nodes.json');
const htmlPath = join(root, 'public', 'mmir.html');
const assetManifestPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'asset-versions.json');

const strip = readFileSync(stripPath, 'utf8');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const html = readFileSync(htmlPath, 'utf8');
const assetManifest = JSON.parse(readFileSync(assetManifestPath, 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

const updatedAt = String(manifest.updated_at || '').trim();
if (!updatedAt) {
  fail('Active chat node manifest must expose updated_at for freshness review.');
} else if (Number.isNaN(Date.parse(updatedAt))) {
  fail('Active chat node manifest updated_at must be a readable date.');
}

requireIncludes(strip, 'function routeInventoryFreshness(updatedAt)', 'Active node strip must compute route inventory freshness.');
requireIncludes(strip, "label:'Route inventory freshness unknown'", 'Active node strip must explain when route inventory freshness cannot be determined.');
requireIncludes(strip, "label:'Route inventory current'", 'Active node strip must clearly mark fresh route inventory.');
requireIncludes(strip, "label:'Route inventory refresh failed'", 'Active node strip must explain when an explicit route inventory refresh falls back.');
requireIncludes(strip, 'Refresh before demo trust.', 'Active node strip must warn when route inventory is stale.');
requireIncludes(strip, 'function withRefreshState(freshness)', 'Active node strip must decorate freshness copy with refresh outcomes.');
requireIncludes(strip, "summary:freshness.summary+' Refreshing now.'", 'Active node strip must expose in-progress refresh state from the freshness badge.');
requireIncludes(strip, "summary:'Using fallback route inventory. Retry before demo trust.'", 'Active node strip must explain when refresh falls back to the safe manifest subset.');
requireIncludes(strip, "manifestRefreshState=await loadManifest(true)?'succeeded':'failed';", 'Explicit route refresh must record whether the manifest reload succeeded.');
requireIncludes(strip, 'function refreshRouteInventory()', 'Active node strip must be able to re-fetch route inventory without a full page reload.');
requireIncludes(strip, "fetch(MANIFEST_URL,{cache:force?'no-store':'default'})", 'Route inventory refresh must bypass stale browser cache when explicitly requested.');
requireIncludes(strip, "manifestUpdatedAt=String(body?.updated_at||'');", 'Active node strip must load updated_at from the public node manifest.');
requireIncludes(strip, 'class="mmir-active-node-freshness"', 'Active node strip must render a visible route inventory freshness badge.');
requireIncludes(strip, 'trustLine=manifestTrustLine(manifestUpdatedAt,inventory)', 'Active node strip must bind manifest trust copy to the rendered freshness badge.');
requireIncludes(strip, "aria-label=\"'+safe(trustLine", 'Active node strip freshness badge must expose route count and review date to assistive tech.');
const expectedVersion = '20260623-active-route-trust-label-v1';
if (assetManifest.assets?.['active-node-strip.js'] !== expectedVersion) {
  fail('Asset manifest must track the active-node route freshness update.');
}
requireIncludes(html, `active-node-strip.js?v=${expectedVersion}`, 'mmir.html must cache-bust the active-node route freshness update.');

if (failures.length) {
  console.error('Active node manifest freshness smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Active node manifest freshness smoke passed.');
