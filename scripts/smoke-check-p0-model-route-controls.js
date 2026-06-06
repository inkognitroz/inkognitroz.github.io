import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const publicDir = join(resolve(root, 'public'));
const portalDir = join(publicDir, 'apps', 'mimir-chat-portal');
const p0Shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const html = readFileSync(join(publicDir, 'mmir.html'), 'utf8');
const assetVersions = readFileSync(join(portalDir, 'asset-versions.json'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function forbidPattern(source, pattern, message) {
  if (pattern.test(source)) fail(message);
}

function functionSource(name, nextName) {
  const start = p0Shell.indexOf(`function ${name}(`);
  const next = nextName ? p0Shell.indexOf(`function ${nextName}(`, start + 1) : -1;
  if (start < 0) {
    fail(`Missing P0 function: ${name}`);
    return '';
  }
  return p0Shell.slice(start, next > start ? next : undefined);
}

const rankedModelsSource = functionSource('rankedModels', 'routeRankMap');
const renderModelMenuSource = functionSource('renderModelMenu', 'renderPrivacyMenu');
const handleMenuSource = functionSource('handleMenuAction', 'setActiveRoutePinned');
const setPinnedSource = functionSource('setActiveRoutePinned', 'saveCurrentPromptPreset');

requireIncludes(
  p0Shell,
  "const ACTIVE_MODEL_KEY='mmir-p0-active-model-id-v1';",
  'P0 model picker must persist the selected route locally.'
);
requireIncludes(
  p0Shell,
  "const PINNED_ROUTES_KEY='mmir-p0-pinned-routes-v1';",
  'P0 model picker must store pinned routes locally.'
);
requireIncludes(
  p0Shell,
  'function routeOperationalHint(model)',
  'P0 model picker must expose compact warm/ready route truth.'
);
requireIncludes(
  p0Shell,
  "routePinned(model)?'Pinned':''",
  'P0 compact route status must show when the active route is pinned.'
);
requireIncludes(
  rankedModelsSource,
  'const pinnedDelta=(routePinned(b)?1:0)-(routePinned(a)?1:0);',
  'Pinned routes must rank before unpinned routes in the model picker.'
);
requireIncludes(
  renderModelMenuSource,
  'data-p0-action="',
  'Model menu must use menu actions for advanced controls.'
);
requireIncludes(
  renderModelMenuSource,
  'Pin selected route',
  'Model menu must offer pinning only inside the model picker.'
);
requireIncludes(
  renderModelMenuSource,
  'Unpin selected route',
  'Model menu must offer unpinning for a pinned selected route.'
);
requireIncludes(
  renderModelMenuSource,
  'routeOperationalHint(model)',
  'Model menu details must include compact warm/ready truth.'
);
requireIncludes(
  renderModelMenuSource,
  'persistActiveModelId();',
  'Selecting a route must persist the active route locally.'
);
requireIncludes(
  handleMenuSource,
  "if(action==='pin-active-route')",
  'Model menu action must handle route pinning.'
);
requireIncludes(
  handleMenuSource,
  "if(action==='unpin-active-route')",
  'Model menu action must handle route unpinning.'
);
requireIncludes(
  setPinnedSource,
  'setRoutePinned(model.id,pinned);',
  'Pinning must write through the dedicated pinned route storage helper.'
);
requireIncludes(
  setPinnedSource,
  "status((pinned?'Pinned ':'Unpinned ')+model.label+'.','ready');",
  'Pinning must give the user compact status feedback.'
);
forbidPattern(
  renderModelMenuSource,
  /temperature|max tokens|system prompt|advanced settings|provider key|api key/i,
  'B13-11 first slice must not expose advanced unsafe model settings in the public picker.'
);
forbidPattern(
  html,
  /Pin selected route|Unpin selected route/,
  'Pinned route controls must stay in runtime/model menu, not static first paint HTML.'
);
requireIncludes(
  html,
  'p0-chat-shell.js?v=20260606-pinned-routes-v1',
  'mmir.html must cache-bust the P0 runtime for pinned route controls.'
);
requireIncludes(
  assetVersions,
  '"p0-chat-shell.js": "20260606-pinned-routes-v1"',
  'asset-versions.json must match the pinned route runtime version.'
);
requireIncludes(
  String(packageJson.scripts?.check || ''),
  'smoke-check-p0-model-route-controls.js',
  'npm run check must include the P0 model route controls smoke.'
);

if (failures.length) {
  console.error('P0 model route controls smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 model route controls smoke passed.');
