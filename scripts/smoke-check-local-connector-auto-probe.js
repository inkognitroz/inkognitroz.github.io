import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  localConnector: join(publicDir, 'apps', 'mimir-chat-portal', 'local-connector.js'),
  backendCritical: join(publicDir, 'apps', 'mimir-chat-portal', 'backend-profiles-critical.js'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md'),
  log: join(root, 'docs', 'MMIR_IMPLEMENTATION_LOG.md'),
  buildDashboard: join(root, 'scripts', 'build-progress-dashboard.js'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  visualQa: join(publicDir, 'visual-qa-report.json')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  return readFileSync(file, 'utf8');
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function forbidIncludes(source, needle, message) {
  if (source.includes(needle)) fail(message);
}

const localConnector = text(files.localConnector);
const backendCritical = text(files.backendCritical);
const workflows = `${text(files.pagesWorkflow)}\n${text(files.qualityWorkflow)}`;

[
  "const AUTO_PROBE_KEY='mimir-local-auto-probe-v1'",
  'function rememberAutoProbeConsent(state)',
  'function allowRememberedAutoProbe()',
  "window.MimirAllowLocalProbes?.('remembered-local-node',60000)",
  'Date.parse(value.expires_at||0)<=Date.now()',
  'mmir-local-auto-probe-remembered',
  'function localNodeProfile()',
  "const url=DEFAULT_LOCAL_URL",
  "profile?.provider==='local-node'&&api.cleanUrl(profile?.url)===DEFAULT_LOCAL_URL",
  'api.pairIfNeeded(profile,url)',
  'window.MimirBackendProfiles?.ensureFreeLocalProfile?.()'
].forEach((needle) => requireIncludes(localConnector, needle, `Local connector auto-probe evidence missing: ${needle}`));

forbidIncludes(
  localConnector,
  "const url=api.cleanUrl(profile?.url)||DEFAULT_LOCAL_URL",
  'Local connector must not use the active managed/backend profile URL when checking localhost.'
);

requireIncludes(backendCritical, 'ensureAutomaticDefaults', 'Critical backend defaults must still install free managed/local profile defaults.');
forbidIncludes(backendCritical, "P='mimir-local-auto-probe-v1'", 'Remembered local-node probe logic must stay deferred out of the first-paint backend profile script.');

requireIncludes(text(files.backlog), '| D306 | Chat UX / Local Node | P0 | Remembered local node auto-probe |', 'Backlog must include D306 remembered local-node auto-probe.');
requireIncludes(text(files.log), 'D306 is now beta', 'Implementation log must record D306.');
requireIncludes(text(files.buildDashboard), "['D306'", 'Progress dashboard builder must mark D306.');
requireIncludes(text(files.visualQa), 'D306 remembered local-node auto-probe', 'Visual QA report must mention D306.');
requireIncludes(workflows, 'smoke-check-local-connector-auto-probe.js', 'GitHub workflows must run D306 local connector auto-probe gate.');

if (!process.exitCode) {
  console.log('Local connector auto-probe smoke check passed.');
}
