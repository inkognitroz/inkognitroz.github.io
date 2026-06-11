import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const shell = readFileSync(join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'utf8');
const adapters = readFileSync(join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'p0-route-adapters.js'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function requireOrder(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex > secondIndex) fail(message);
}

function functionSource(name, nextName) {
  const start = shell.indexOf(`function ${name}(`);
  const next = nextName ? shell.indexOf(`function ${nextName}(`, start + 1) : -1;
  if (start < 0) {
    fail(`Missing P0 function: ${name}`);
    return '';
  }
  return shell.slice(start, next > start ? next : undefined);
}

const checkLocalModels = functionSource('checkLocalModels', 'installShell');
const maybeAutoCheckLocal = functionSource('maybeAutoCheckLocal', 'maybeAutoAttachPairedLocal');
const maybeAutoAttachPairedLocal = functionSource('maybeAutoAttachPairedLocal', 'boot');
const boot = functionSource('boot');

requireIncludes(
  adapters,
  'function hasLocalPairingToken()',
  'Route adapter helper must own safe paired-token presence checks.'
);
requireIncludes(
  adapters,
  'return Boolean(sessionStorage.getItem(TOKEN_KEY));',
  'Paired-token presence must be boolean-only and never expose the token.'
);
requireIncludes(
  shell,
  'const hasLocalPairingToken=P0_ROUTE_ADAPTERS.hasLocalPairingToken||(()=>false);',
  'P0 shell must consume paired-token presence through the route adapter helper.'
);
requireOrder(
  checkLocalModels,
  "const connectorStatus=await fetchJson(LOCAL_URL+'/status'",
  "modelPayload=await fetchJson(LOCAL_URL+'/v1/models'",
  'Local discovery must read paired /status before falling back to protected /v1/models.'
);
requireIncludes(
  checkLocalModels,
  "connectorStatus.model_summary?.visibility==='public-safe'",
  'Local discovery must reject public-safe status before using installed model metadata.'
);
requireIncludes(
  checkLocalModels,
  "connectorStatus.route_telemetry?.object==='mmir.local.route_telemetry.list'",
  'Local discovery must attach paired route telemetry when the connector reports it.'
);
requireIncludes(
  shell,
  'function localTelemetrySummary(item)',
  'P0 route receipts must summarize paired local route telemetry compactly.'
);
requireIncludes(
  shell,
  "label:'Active local'",
  'Model picker/receipts must distinguish actively attached local routes from cold local routes.'
);
requireIncludes(
  maybeAutoCheckLocal,
  "checkLocalModels({quiet:false}).catch(()=>{});",
  'Local-node return URLs must run the existing explicit local discovery path.'
);
requireIncludes(
  maybeAutoCheckLocal,
  'return true;',
  'Local-node return discovery must tell boot that explicit discovery already started.'
);
requireIncludes(
  maybeAutoAttachPairedLocal,
  'if(!hasLocalPairingToken())return;',
  'P0 shell must only auto-attach local routes after this browser already has a pairing token.'
);
requireIncludes(
  maybeAutoAttachPairedLocal,
  "window.MimirAllowLocalProbes?.('p0-paired-local-resume',30000);",
  'Paired local resume must explicitly open a short loopback allowance.'
);
requireIncludes(
  maybeAutoAttachPairedLocal,
  "checkLocalModels({quiet:true})",
  'Paired local resume must attach quietly without adding visible UI clutter.'
);
requireIncludes(
  maybeAutoAttachPairedLocal,
  "routeStatus('Local node attached · '+models.length",
  'Successful paired resume must show one compact green/local route receipt.'
);
requireOrder(
  boot,
  'refreshPromptPresets().catch(()=>{});',
  'if(!maybeAutoCheckLocal())maybeAutoAttachPairedLocal();',
  'Boot must run local return discovery after the public shell is ready.'
);
requireIncludes(
  boot,
  'if(!maybeAutoCheckLocal())maybeAutoAttachPairedLocal();',
  'Boot must resume already-paired local nodes only when no explicit local-return discovery started.'
);
requireIncludes(
  String(packageJson.scripts?.check || ''),
  'smoke-check-p0-active-local-attach.js',
  'npm run check must include the active local attach smoke.'
);

if (failures.length) {
  console.error('P0 active local attach smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 active local attach smoke passed.');
