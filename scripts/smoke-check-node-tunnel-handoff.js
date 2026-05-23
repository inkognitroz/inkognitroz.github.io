import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  nodeDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.js'),
  nodeDashboardCss: join(publicDir, 'apps', 'mimir-chat-portal', 'node-dashboard.css'),
  localConnector: join(publicDir, 'apps', 'mimir-chat-portal', 'local-connector.js'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  privacyControls: join(publicDir, 'apps', 'mimir-chat-portal', 'privacy-controls.js'),
  uiCoverage: join(publicDir, 'ui-action-coverage.json'),
  visibleAudit: join(publicDir, 'visible-control-audit.json'),
  progress: join(publicDir, 'progress-dashboard.json'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing D204 node handoff file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function json(file) {
  try {
    return JSON.parse(text(file));
  } catch {
    fail(`Invalid JSON for D204 node handoff smoke check: ${relative(root, file)}`);
    return {};
  }
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

const dashboard = text(files.nodeDashboard);
const css = text(files.nodeDashboardCss);
const localConnector = text(files.localConnector);
const chatRuntime = text(files.chatRuntime);
const privacyControls = text(files.privacyControls);
const uiCoverage = text(files.uiCoverage);
const visibleAudit = text(files.visibleAudit);
const backlog = text(files.backlog);
const progress = json(files.progress);
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];

[
  "NODE_HANDOFF_PREFIX='mimir-node-handoff-v1:'",
  'function nodeHandoffPlan(checks,hardware,tunnel,models)',
  'function renderNodeHandoff(plan)',
  'id="node-tunnel-handoff"',
  'data-node-handoff-action',
  'node-handoff-action',
  'outbound_only_explicit_start',
  'no_paid_routes_started:true',
  'provider_secrets_stored:false',
  'raw_prompt_stored:false',
  'raw_response_stored:false',
  'Desktop',
  'VM/server',
  'Raspberry Pi/Linux ARM',
  'Phone/tablet client',
  'Start free tunnel',
  '#node-start-tunnel',
  'Chat locally now; tunnel is optional',
  '/pairing/sessions',
  '/tunnels/trycloudflare/start'
].forEach((needle) => requireIncludes(dashboard, needle, `D204 Node Dashboard handoff evidence missing: ${needle}`));

[
  '.node-handoff-card',
  '.node-handoff-rail',
  '.node-handoff-devices',
  '.node-handoff-card .node-dashboard-actions'
].forEach((needle) => requireIncludes(css, needle, `D204 Node Dashboard styling missing: ${needle}`));

[
  '/tunnels/status',
  '/tunnels/trycloudflare/start',
  '/tunnels/stop',
  'mmir-repair-resume-checked'
].forEach((needle) => requireIncludes(localConnector, needle, `D204 Local connector tunnel/resume evidence missing: ${needle}`));

[
  'starterInstallRepairFallback',
  "openPanel('#node-dashboard')",
  'mmir-runtime-starter-handoff'
].forEach((needle) => requireIncludes(chatRuntime, needle, `D204 chat-to-node handoff evidence missing: ${needle}`));

[
  'node-tunnel-handoff',
  'data-node-handoff-action',
  'node-handoff-action',
  'mimir-node-handoff-v1:'
].forEach((needle) => requireIncludes(uiCoverage, needle, `D204 UI action coverage missing: ${needle}`));

[
  'node-handoff',
  'data-node-handoff-action',
  'outbound tunnel only'
].forEach((needle) => requireIncludes(visibleAudit, needle, `D204 visible-control audit missing: ${needle}`));

[
  "NODE_HANDOFF_PREFIX='mimir-node-handoff-v1:'",
  'Node handoff state',
  'no provider secrets, pairing tokens, raw prompts, raw responses or paid routes'
].forEach((needle) => requireIncludes(privacyControls, needle, `D204 privacy inventory missing node handoff disclosure: ${needle}`));

requireIncludes(backlog, '| D205 |', 'Backlog must keep D205 as the installer release QA work item after D204.');
requireIncludes(backlog, 'Universal installer release QA', 'D205 should continue the free installer/node activation path.');
requireIncludes(backlog, '| D206 |', 'Backlog must add D206 as the next sequential work item after D205.');

const d204 = tasks.find((task) => task.seq === 'D204');
if (!d204 || d204.status !== 'beta') {
  fail('Progress dashboard task D204 must be beta after node/tunnel handoff ships.');
}
const d205 = tasks.find((task) => task.seq === 'D205');
if (!d205 || d205.status !== 'beta') {
  fail('Progress dashboard task D205 must be beta after installer release QA ships.');
}
const d206 = tasks.find((task) => task.seq === 'D206');
if (!d206 || d206.status !== 'beta') {
  fail('Progress dashboard task D206 must be beta after installer-to-live-model proof ships.');
}
if (!Array.isArray(progress.next_queue) || progress.next_queue[0] !== 'D223') {
  fail('Progress dashboard next queue must prioritize D223 after D222 ships.');
}

if (!process.exitCode) {
  console.log('Node tunnel handoff smoke check passed.');
}
