import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const p0Shell = readFileSync(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'utf8');
const routeAdapters = readFileSync(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-route-adapters.js'), 'utf8');
const quietGuard = readFileSync(join(publicDir, 'apps', 'mimir-chat-portal', 'quiet-first-paint-hotfix.js'), 'utf8');
const mmirHtml = readFileSync(join(publicDir, 'mmir.html'), 'utf8');
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
  const start = p0Shell.indexOf(`function ${name}(`);
  const next = nextName ? p0Shell.indexOf(`function ${nextName}(`, start + 1) : -1;
  if (start < 0) {
    fail(`Missing P0 function: ${name}`);
    return '';
  }
  return p0Shell.slice(start, next > start ? next : undefined);
}

const checkLocalModelsSource = functionSource('checkLocalModels', 'installShell');
const chatLocalSource = functionSource('chatLocal', 'synthesizeCompareAnswer');

requireIncludes(
  routeAdapters,
  'function localNetworkHint(error)',
  'P0 route adapter helper must keep local-network failures normalized through one helper.'
);
requireIncludes(
  routeAdapters,
  'Local connector check was deferred. Press Refresh models again to allow this browser to check this Mac.',
  'Deferred local probes must explain that the user can explicitly retry.'
);
requireIncludes(
  routeAdapters,
  'Browser blocked access to this Mac. Allow Local Network Access for mmir.ai, then press Refresh models again. The connector stays on 127.0.0.1.',
  'Browser/PNA local-network failures must give an actionable user-facing instruction.'
);
requireIncludes(
  p0Shell,
  'const localNetworkHint=P0_ROUTE_ADAPTERS.localNetworkHint;',
  'P0 shell must delegate local-network failure copy to the route adapter helper.'
);
requireIncludes(
  p0Shell,
  "routeStatus('Local access blocked · Allow Local Network Access, then Refresh models','error')",
  'Blocked local discovery must update the compact route/status line, not only throw a browser error.'
);
requireIncludes(
  p0Shell,
  "allowLocalProbes('p0-find-local-models',60000);",
  'Find local models must explicitly allow local probes only after user action.'
);
requireIncludes(
  p0Shell,
  "allowLocalProbes('p0-local-chat',120000);",
  'Local chat must explicitly allow local probes only after user action.'
);
requireOrder(
  checkLocalModelsSource,
  "allowLocalProbes('p0-find-local-models',60000);",
  "const token=await pairLocal();",
  'Find local models must open the explicit local-probe allowance before pairing.'
);
requireOrder(
  chatLocalSource,
  "allowLocalProbes('p0-local-chat',120000);",
  "const token=await pairLocal();",
  'Local chat must open the explicit local-probe allowance before pairing.'
);
requireIncludes(
  p0Shell,
  "menuButton('check-local','Refresh models'",
  'Local model discovery must remain a visible explicit user action under the + menu.'
);
requireIncludes(
  p0Shell,
  'If the browser asks, allow Local Network Access for mmir.ai.',
  'The + menu must set the correct expectation before local discovery.'
);

requireIncludes(
  quietGuard,
  'local_probe_deferred',
  'Quiet first-paint guard must continue blocking passive loopback fetches.'
);
requireIncludes(
  quietGuard,
  'w.MimirAllowLocalProbes',
  'Quiet first-paint guard must expose only the explicit local-probe allowance path.'
);
requireIncludes(
  mmirHtml,
  'local_probe_deferred',
  'Inline first-paint guard must block passive loopback fetches before deferred scripts load.'
);

if (failures.length) {
  console.error('P0 local-network guidance smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 local-network guidance smoke passed.');
