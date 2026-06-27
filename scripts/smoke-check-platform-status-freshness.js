import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const publicDir = join(root, 'public');
const portalDir = join(publicDir, 'apps', 'mimir-chat-portal');
const runtime = readFileSync(join(portalDir, 'platform-status.js'), 'utf8');
const mmirHtml = readFileSync(join(publicDir, 'mmir.html'), 'utf8');
const manifest = readFileSync(join(portalDir, 'asset-versions.json'), 'utf8');

function fail(message) {
  throw new Error(message);
}

function requireText(haystack, needle, message) {
  if (!haystack.includes(needle)) fail(`${message}: missing ${needle}`);
}

requireText(
  runtime,
  'function manifestFreshnessComponent(platformManifest)',
  'Platform status runtime must compute manifest freshness in the browser'
);
requireText(
  runtime,
  "label:'Status manifest freshness'",
  'Platform status panel must name the manifest freshness card clearly'
);
requireText(
  runtime,
  'Manifest updated ',
  'Platform status panel must disclose when the status manifest was last updated'
);
requireText(
  runtime,
  'function hasComponent(components,id)',
  'Platform status panel must detect already-rendered manifest cards before appending fallbacks'
);
requireText(
  runtime,
  'publicDeployComponents(platformManifest,existingComponents=[])',
  'Platform status deploy fallbacks must receive the current component list'
);
requireText(
  runtime,
  "if(!hasComponent(existingComponents,'latest-deploy-verification'))",
  'Platform status panel must not duplicate manifest-provided deploy verification cards'
);
requireText(
  runtime,
  "if(!hasComponent(existingComponents,'github-pages'))",
  'Platform status panel must not duplicate manifest-provided GitHub Pages cards'
);
requireText(
  runtime,
  'publicDeployComponents(manifest,components)',
  'Platform status init must pass rendered cards into deploy fallback merging'
);
requireText(
  runtime,
  'Status copy is stale for demo trust.',
  'Platform status panel must warn when the manifest is too old for launch confidence'
);
requireText(
  mmirHtml,
  'if(window.__MimirP0SimpleChat&&!force)return;',
  'Deferred MMIR assets must stay blocked on first paint unless the user explicitly asks for advanced panels'
);
requireText(
  mmirHtml,
  "window.MimirLoadDeferred=function(force){return loadDeferred(force!==false);};",
  'Explicit MMIR panel opens must be able to force deferred assets on demand'
);
requireText(
  mmirHtml,
  "if(event.target&&event.target.open)loadDeferred(true);",
  'Opening a deferred diagnostics panel must force its runtime to load'
);
requireText(
  mmirHtml,
  'platform-status.js?v=20260627-status-card-dedupe-v1',
  'MMIR shell must cache-bust the platform status runtime for deduped status cards'
);
requireText(
  manifest,
  '"platform-status.js": "20260627-status-card-dedupe-v1"',
  'Asset manifest must track the platform status card dedupe runtime version'
);

console.log('Platform status freshness smoke passed.');
