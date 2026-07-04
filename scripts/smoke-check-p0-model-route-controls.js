import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const publicDir = join(resolve(root, 'public'));
const portalDir = join(publicDir, 'apps', 'mimir-chat-portal');
const p0Shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const p0RouteBenchmarks = readFileSync(join(portalDir, 'p0-route-benchmarks.js'), 'utf8');
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

function functionSourceFrom(source, name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const next = nextName ? source.indexOf(`function ${nextName}(`, start + 1) : -1;
  if (start < 0) {
    fail(`Missing P0 function: ${name}`);
    return '';
  }
  return source.slice(start, next > start ? next : undefined);
}

function functionSource(name, nextName) {
  return functionSourceFrom(p0Shell, name, nextName);
}

const rankedModelsSource = functionSourceFrom(p0RouteBenchmarks, 'rankedModels', 'routeRankMap');
const renderModelMenuSource = functionSource('renderModelMenu', 'renderRouteControlsMenu');
const renderRouteControlsMenuSource = functionSource('renderRouteControlsMenu', 'renderPrivacyMenu');
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
  "const MODEL_FILTER_KEY='mmir-p0-model-filter-v1';",
  'P0 model picker must store route filter preference locally.'
);
requireIncludes(
  p0Shell,
  'const P0_ROUTE_BENCHMARKS=window.MimirP0RouteBenchmarks||{};',
  'P0 shell must consume the extracted route benchmark helper.'
);
requireIncludes(
  p0RouteBenchmarks,
  'window.MimirP0RouteBenchmarks={version,create,clampScore};',
  'P0 route benchmark helper must expose a small explicit API.'
);
requireIncludes(
  p0Shell,
  'function routeOperationalHint(model)',
  'P0 model picker must expose compact warm/ready route truth.'
);
requireIncludes(
  p0Shell,
  'function routeOperationalState(model)',
  'P0 model picker must expose explicit warm/cold/measured route state.'
);
requireIncludes(
  p0Shell,
  'function routeDetailReceipt(model)',
  'P0 model picker must expose a safe route detail receipt.'
);
requireIncludes(
  p0Shell,
  'function modelVisibleInFilter(model,value=modelFilter())',
  'P0 model picker must filter routes without changing first-screen controls.'
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
  "menuButton('model-route-controls'",
  'Model menu must use the shared menu helper for advanced controls.'
);
requireIncludes(
  renderModelMenuSource,
  'model-route-controls',
  'Simple model menu must provide one route-controls escape hatch.'
);
requireIncludes(
  renderRouteControlsMenuSource,
  'Back to models',
  'Route controls menu must return to the simple model list.'
);
requireIncludes(
  renderRouteControlsMenuSource,
  'Pin selected route',
  'Route controls menu must offer pinning without cluttering the simple model list.'
);
requireIncludes(
  renderRouteControlsMenuSource,
  'Unpin selected route',
  'Route controls menu must offer unpinning for a pinned selected route.'
);
requireIncludes(
  renderModelMenuSource,
  'routeOperationalHint(model)',
  'Model menu details must include compact warm/ready truth.'
);
requireIncludes(
  renderRouteControlsMenuSource,
  'Filter: ',
  'Route controls menu must expose route filtering behind the simple picker.'
);
requireIncludes(
  renderRouteControlsMenuSource,
  'Pinned routes stay in this browser. Route scores still show quality.',
  'Route controls menu must explain pinned-route behavior without cluttering first chat.'
);
requireIncludes(
  renderRouteControlsMenuSource,
  'p0-route-detail',
  'Route controls must show safe route details away from the simple model list.'
);
forbidPattern(
  renderModelMenuSource,
  /p0-route-detail|Active route|Route details/,
  'Simple model menu must not show route-detail cards before Route controls is opened.'
);
forbidPattern(
  renderModelMenuSource,
  /Pin selected route|Unpin selected route|Filter: /,
  'Simple model menu must hide pin/filter controls until Route controls is opened.'
);
requireIncludes(
  p0Shell,
  'Cold local',
  'Local routes that have not answered yet must be marked as cold/local load truth.'
);
requireIncludes(
  p0Shell,
  'not measured yet',
  'Unmeasured routes must not pretend to have benchmark evidence.'
);
requireIncludes(
  p0Shell,
  'no browser secrets',
  'Hosted route details must preserve browser-secret guardrail wording.'
);
requireIncludes(
  p0Shell,
  'no public Ollama port',
  'Local route details must preserve local isolation wording.'
);
requireIncludes(
  renderModelMenuSource,
  'persistActiveModelId();',
  'Selecting a route must persist the active route locally.'
);
requireIncludes(
  handleMenuSource,
  "if(action==='model-route-controls')",
  'Model menu action must open advanced route controls through one explicit action.'
);
requireIncludes(
  handleMenuSource,
  "if(action==='model-menu-main')",
  'Route controls menu must return to the simple model list.'
);
requireIncludes(
  handleMenuSource,
  "if(action==='cycle-model-filter')",
  'Model menu action must cycle route filters.'
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
requireIncludes(
  p0Shell,
  "routeStatus('Model filter · '+modelFilterLabel(value)+' · browser local','hosted');",
  'Route filtering must provide compact browser-local status feedback.'
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
  'p0-route-benchmarks.js?v=20260611-b0-06-27-demotion-receipts-v1',
  'mmir.html must cache-bust the P0 route benchmark helper.'
);
requireIncludes(
  html,
  'p0-chat-shell.js?v=20260704-demo-learning-wide-v1',
  'mmir.html must cache-bust the P0 runtime for model route controls.'
);
requireIncludes(
  assetVersions,
  '"p0-route-benchmarks.js": "20260611-b0-06-27-demotion-receipts-v1"',
  'asset-versions.json must match the P0 route benchmark helper version.'
);
requireIncludes(
  assetVersions,
  '"p0-chat-shell.js": "20260704-demo-learning-wide-v1"',
  'asset-versions.json must match the model route controls runtime version.'
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
