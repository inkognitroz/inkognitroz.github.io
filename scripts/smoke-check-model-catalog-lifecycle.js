#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const portalDir = join(root, 'public', 'apps', 'mimir-chat-portal');
const js = readFileSync(join(portalDir, 'model-catalog-ui.js'), 'utf8');
const css = readFileSync(join(portalDir, 'mimir-chat-portal.css'), 'utf8');
const html = readFileSync(join(root, 'public', 'mmir.html'), 'utf8');
const sw = readFileSync(join(root, 'public', 'sw.js'), 'utf8');
const manifest = JSON.parse(readFileSync(join(portalDir, 'asset-versions.json'), 'utf8'));
const failures = [];

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) failures.push(message);
}

[
  'listed',
  'connectable',
  'configured',
  'verified',
  'active_in_chat',
  'eligible_for_supergeni',
  'promoted'
].forEach((state) => {
  requireIncludes(js, state, `Model catalog must encode lifecycle state: ${state}.`);
});

requireIncludes(js, 'function lifecycleState(model)', 'Model catalog must derive a lifecycle state for every card.');
requireIncludes(js, 'function actionLabelForModel(model,state)', 'Model catalog must derive lifecycle-aware actions.');
requireIncludes(js, 'function modelTruthMetrics(model,state)', 'Model catalog must render truth metrics for every model card.');
requireIncludes(js, 'function fetchCatalogActions()', 'Model catalog must fetch backend action contracts.');
requireIncludes(js, 'function mergeCatalogActionModels(baseModels,actionRows)', 'Model catalog must merge backend action contracts into visible model cards.');
requireIncludes(js, '/control-plane/model-catalog/actions', 'Model catalog must use the live backend model action contract route.');
requireIncludes(js, 'catalog_action', 'Model catalog must preserve backend action contract metadata.');
requireIncludes(js, 'data-model-lifecycle-state="', 'Model cards must expose lifecycle state for testing and automation.');
requireIncludes(js, 'data-model-action="', 'Model cards must expose the primary action for testing and automation.');
requireIncludes(js, 'data-model-action-id="', 'Model cards must expose backend action identifiers for testing and automation.');
requireIncludes(js, "['State',lifecycleLabel(state)]", 'Model cards must show the lifecycle state as user-visible data.');
requireIncludes(js, "['Action',actionLabelForModel(model,state)]", 'Model cards must show the backend primary action as user-visible data.');
requireIncludes(js, "['Cost',cost]", 'Model cards must show cost/free-quota truth.');
requireIncludes(js, "['Latency',latency]", 'Model cards must show latency/throughput truth.');
requireIncludes(js, "['Norwegian',norwegian]", 'Model cards must show Norwegian-score truth or an honest not-scored value.');
requireIncludes(js, "['Trust',trust]", 'Model cards must show safety/trust proof status.');
requireIncludes(js, "['Source',source]", 'Model cards must show freshness/source truth.');
requireIncludes(js, 'No browser secrets.', 'Model cards must preserve the public thin-client secret boundary.');
requireIncludes(js, 'promotion is reversible', 'Model cards must keep rollback/demotion truth visible.');
requireIncludes(js, 'Use in chat', 'Active or verified models must offer a direct chat action.');
requireIncludes(js, 'Activate', 'Configured/connectable models must expose an activation action.');
requireIncludes(js, 'Connect', 'Installable/free models must expose a connect action.');
requireIncludes(js, 'View requirements', 'Potential capacity must have an honest requirements action.');

requireIncludes(css, '.model-lifecycle-badge[data-lifecycle-state="active_in_chat"]', 'Active lifecycle badge styling must exist.');
requireIncludes(css, '.model-lifecycle-badge[data-lifecycle-state="connectable"]', 'Connectable lifecycle badge styling must exist.');
requireIncludes(css, '.model-lifecycle-badge[data-lifecycle-state="listed"]', 'Listed lifecycle badge styling must exist.');
requireIncludes(css, '.model-proof-note', 'Model card proof note styling must exist.');
requireIncludes(css, '.model-truth-grid', 'Model card truth metric styling must exist.');

requireIncludes(html, 'model-catalog-ui.js?v=20260711-model-action-contract-v1', 'Public page must cache-bust model catalog action-contract JS.');
requireIncludes(html, 'mimir-chat-portal.css?v=20260710-model-lifecycle-v1', 'Public page must cache-bust model catalog lifecycle CSS.');
requireIncludes(html, 'function hydrateTargetDetails()', 'Public page must hydrate hash-targeted details panels.');
requireIncludes(html, "window.addEventListener('hashchange',hydrateTargetDetails)", 'Public page must hydrate model library when the hash changes.');
requireIncludes(html, "if(!hydrateTargetDetails())schedule();", 'Public page must prefer targeted module loading over idle deferred loading.');
requireIncludes(sw, "const CACHE_NAME='mmir-pwa-d354-20260804-release-0-2-beta-v2'", 'Service worker cache name must preserve the model catalog action contract runtime and bust for the release-readiness truth hotfix.');
requireIncludes(sw, './apps/mimir-chat-portal/model-catalog-ui.js', 'PWA shell cache must include model catalog action-contract runtime.');

if (manifest.assets?.['model-catalog-ui.js'] !== '20260711-model-action-contract-v1') {
  failures.push('Asset manifest must track model-catalog-ui.js action-contract version.');
}
if (manifest.assets?.['mimir-chat-portal.css'] !== '20260710-model-lifecycle-v1') {
  failures.push('Asset manifest must track mimir-chat-portal.css lifecycle version.');
}

if (failures.length) {
  console.error('Model catalog lifecycle smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Model catalog lifecycle smoke passed.');
