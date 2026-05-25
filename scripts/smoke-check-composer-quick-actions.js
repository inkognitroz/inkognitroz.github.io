import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  report: join(publicDir, 'composer-quick-actions-report.json'),
  script: join(publicDir, 'apps', 'mimir-chat-portal', 'composer-quick-actions.js'),
  css: join(publicDir, 'apps', 'mimir-chat-portal', 'composer-quick-actions.css'),
  html: join(publicDir, 'mmir.html'),
  sw: join(publicDir, 'sw.js'),
  uiCoverage: join(publicDir, 'ui-action-coverage.json'),
  visibleAudit: join(publicDir, 'visible-control-audit.json'),
  visualQa: join(publicDir, 'visual-qa-report.json'),
  progress: join(publicDir, 'progress-dashboard.json'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md'),
  log: join(root, 'docs', 'MMIR_IMPLEMENTATION_LOG.md'),
  buildDashboard: join(root, 'scripts', 'build-progress-dashboard.js'),
  routeFixture: join(root, 'scripts', 'smoke-check-composer-quick-route-fixture.js'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing composer quick-actions file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function json(file) {
  try {
    return JSON.parse(text(file));
  } catch (error) {
    fail(`Invalid JSON in ${relative(root, file)}: ${error.message}`);
    return {};
  }
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

const report = json(files.report);
const script = text(files.script);
const css = text(files.css);
const html = text(files.html);
const progress = json(files.progress);
const routeFixture = text(files.routeFixture);

if (report.title !== 'Composer Quick Actions Drawer') fail('D288 report must name the quick actions drawer.');
if (!String(report.public_repo_rule || '').includes('No prompts')) fail('D288 report must preserve public-safe no prompt/no secret boundary.');

for (const control of report.controls || []) {
  if (control.status !== 'ready' || control.no_paid_routes_started !== true) {
    fail(`D288 control ${control.id || '<missing>'} must be ready and no-spend.`);
  }
  for (const evidence of control.evidence || []) {
    requireIncludes(`${script}\n${routeFixture}`, evidence, `D288 control ${control.id || '<missing>'} missing source evidence: ${evidence}`);
  }
}

for (const needle of [
  'composer-quick-actions',
  'composer-quick-status',
  'selectedModelLabel',
  'resourceSummary',
  'escapeHtml(model)',
  'escapeHtml(resource)',
  'Ready now',
  'no paid route',
  'composer-quick-route-strip',
  'data-composer-quick-route="guide"',
  'data-composer-quick-route="webgpu"',
  'data-composer-quick-route="local"',
  'localReady',
  'Local ready',
  'mmir-local-connector-refreshed',
  'MimirChatRuntimeBridge',
  'function runQuickRoute(route)',
  'webllm-qwen25-05b',
  'ollama-qwen3-06b',
  "source:'composer-quick-route-strip'",
  'data-composer-quick-action="chat-now"',
  'data-composer-quick-action="models"',
  'data-composer-quick-action="install-node"',
  'data-composer-quick-action="knowledge"',
  'data-composer-quick-action="new-chat"',
  'data-composer-quick-action="voice"',
  'data-composer-quick-action="settings"',
  'event.stopImmediatePropagation()',
  'writeRepairResume',
  'function chatNow()',
  'Start the safest free MMIR chat now.',
  'primary-chat-link',
  'mmir-local-connector-install.html?source=composer-quick-actions',
  "openDeferredPanel('#knowledge-panel')",
  "q('#composer-new-chat')",
  "q('#runtime-clear')",
  "q('#composer-voice-input')",
  "openDeferredPanel('#runtime-settings-panel')",
  'provider_secrets_stored:false',
  'raw_prompt_stored:false',
  'raw_response_stored:false',
  'w.MimirComposerQuickActions'
]) {
  requireIncludes(script, needle, `D288 quick actions script missing: ${needle}`);
}

for (const needle of [
  '.composer-quick-actions',
  '.composer-quick-actions[hidden]',
  '.composer-quick-actions button',
  '.composer-quick-status',
  '.composer-quick-status span',
  '.composer-quick-route-strip',
  '.composer-quick-actions .composer-quick-route',
  '.composer-quick-actions .composer-quick-route[data-route-state="setup"]',
  '.composer-quick-actions .composer-quick-route[data-route-state="install"]',
  '.composer-quick-actions .composer-quick-primary',
  'body.mimir-public-chat:not(.mimir-has-chat) .composer-mode-dock',
  'body.mimir-public-chat:not(.mimir-has-chat) .composer-tool-cluster',
  'body.mimir-public-chat:not(.mimir-has-chat) .composer-tool-cluster > :not(#composer-add-model)',
  'body.mimir-public-chat:not(.mimir-has-chat) #composer-add-model',
  '.composer-quick-actions button:hover',
  '.composer-quick-actions small',
  '@media (max-width: 720px)'
]) {
  requireIncludes(css, needle, `D288 quick actions CSS missing: ${needle}`);
}

for (const needle of [
  'composer-quick-actions.css?v=20260526-quick-actions-live-local-v1',
  'composer-quick-actions.js?v=20260526-quick-actions-live-local-v1'
]) {
  requireIncludes(html, needle, `MMIR page must load quick-actions asset: ${needle}`);
}

for (const needle of [
  './apps/mimir-chat-portal/composer-quick-actions.css',
  './apps/mimir-chat-portal/composer-quick-actions.js'
]) {
  requireIncludes(text(files.sw), needle, `Service worker must cache quick-actions asset: ${needle}`);
}

for (const needle of [
  '"id": "composer-quick-actions"',
  '#composer-quick-actions',
  '[data-composer-quick-action=\\"chat-now\\"]',
  '[data-composer-quick-action=\\"models\\"]',
  '[data-composer-quick-route=\\"guide\\"]',
  '[data-composer-quick-route=\\"webgpu\\"]',
  '[data-composer-quick-route=\\"local\\"]',
  'MimirComposerQuickActions',
  'renderMenuContent',
  'runQuickAction',
  'runQuickRoute',
  'function chatNow()',
  'mmir-local-connector-install.html?source=composer-quick-actions',
  'composer-quick-route-strip',
  'localReady',
  'Local ready',
  'mmir-local-connector-refreshed',
  'MimirChatRuntimeBridge',
  'webllm-qwen25-05b',
  'ollama-qwen3-06b',
  "openDeferredPanel('#knowledge-panel')",
  "openDeferredPanel('#runtime-settings-panel')",
  'no_paid_routes_started:true'
]) {
  requireIncludes(`${text(files.uiCoverage)}\n${text(files.visibleAudit)}`, needle, `UI coverage/audit must include quick-actions evidence: ${needle}`);
}

requireIncludes(text(files.visualQa), 'D288 composer quick actions drawer', 'Visual QA report must mention D288 quick actions.');
requireIncludes(text(files.visualQa), 'D289 composer quick Chat now status', 'Visual QA report must mention D289 quick Chat now status.');
requireIncludes(text(files.visualQa), 'D290 composer quick free route strip', 'Visual QA report must mention D290 quick route strip.');
requireIncludes(text(files.visualQa), 'D291 composer quick route click fixture', 'Visual QA report must mention D291 quick route fixture.');
requireIncludes(text(files.visualQa), 'D308 quick actions live local route', 'Visual QA report must mention D308 quick actions live local route.');
requireIncludes(text(files.backlog), '| D288 | Chat UX / Composer | P0 | Open WebUI-style plus quick actions drawer |', 'Backlog must include D288.');
requireIncludes(text(files.backlog), '| D289 | Chat UX / Activation | P0 | Quick actions ready-state and Chat now |', 'Backlog must include D289.');
requireIncludes(text(files.backlog), '| D290 | Chat UX / Model Routes | P0 | Quick actions free route strip |', 'Backlog must include D290.');
requireIncludes(text(files.backlog), '| D291 | Chat QA / Model Routes | P0 | Quick route click fixture |', 'Backlog must include D291.');
requireIncludes(text(files.backlog), '| D308 | Chat UX / Composer | P0 | Quick actions switch from install to live local chat |', 'Backlog must include D308.');
requireIncludes(text(files.log), 'D288 is now beta', 'Implementation log must include D288.');
requireIncludes(text(files.log), 'D289 is now beta', 'Implementation log must include D289.');
requireIncludes(text(files.log), 'D290 is now beta', 'Implementation log must include D290.');
requireIncludes(text(files.log), 'D291 is now beta', 'Implementation log must include D291.');
requireIncludes(text(files.log), 'D308 is now beta', 'Implementation log must include D308.');
requireIncludes(text(files.buildDashboard), 'composerQuickActionsReportPath', 'Progress dashboard build must read D288 report.');
requireIncludes(`${text(files.qualityWorkflow)}\n${text(files.pagesWorkflow)}`, 'smoke-check-composer-quick-actions.js', 'GitHub workflows must run D288 quick-actions smoke gate.');
requireIncludes(`${text(files.qualityWorkflow)}\n${text(files.pagesWorkflow)}`, 'smoke-check-composer-quick-route-fixture.js', 'GitHub workflows must run D291 quick-route fixture gate.');

for (const needle of [
  'clickRoute(\'guide\')',
  'clickRoute(\'webgpu\')',
  'clickRoute(\'local\')',
  'mmir-runtime-starter-handoff',
  'mimir-repair-resume-v1:',
  'mmir-local-connector-refreshed',
  'bridgeRefreshes',
  'Local ready',
  'no_paid_routes_started',
  'provider_secrets_stored',
  'raw_prompt_stored',
  'raw_response_stored',
  'Composer quick route fixture smoke check passed.'
]) {
  requireIncludes(routeFixture, needle, `D291 route fixture missing: ${needle}`);
}

if (!progress.composer_quick_actions_report || progress.composer_quick_actions_report.title !== report.title) {
  fail('Progress dashboard data must embed D288 quick actions report.');
}
const d288 = (progress.tasks || []).find((task) => task.seq === 'D288');
if (!d288 || d288.status !== 'beta') fail('Progress dashboard task D288 must be beta.');
const d289 = (progress.tasks || []).find((task) => task.seq === 'D289');
if (!d289 || d289.status !== 'beta') fail('Progress dashboard task D289 must be beta.');
const d290 = (progress.tasks || []).find((task) => task.seq === 'D290');
if (!d290 || d290.status !== 'beta') fail('Progress dashboard task D290 must be beta.');
const d291 = (progress.tasks || []).find((task) => task.seq === 'D291');
if (!d291 || d291.status !== 'beta') fail('Progress dashboard task D291 must be beta.');
const d308 = (progress.tasks || []).find((task) => task.seq === 'D308');
if (!d308 || d308.status !== 'beta') fail('Progress dashboard task D308 must be beta.');
if (!(progress.launch_progress?.checkpoints || []).some((item) => item.id === 'composer-quick-actions-drawer')) {
  fail('Launch progress must expose the quick actions drawer checkpoint.');
}
if (!(progress.launch_progress?.checkpoints || []).some((item) => item.id === 'composer-quick-chat-now')) {
  fail('Launch progress must expose the quick Chat now checkpoint.');
}
if (!(progress.launch_progress?.checkpoints || []).some((item) => item.id === 'composer-quick-free-routes')) {
  fail('Launch progress must expose the quick free route strip checkpoint.');
}
if (!(progress.launch_progress?.checkpoints || []).some((item) => item.id === 'composer-quick-route-fixture')) {
  fail('Launch progress must expose the quick route fixture checkpoint.');
}
if (!(progress.launch_progress?.checkpoints || []).some((item) => item.id === 'quick-actions-live-local')) {
  fail('Launch progress must expose the quick actions live local checkpoint.');
}

if (!process.exitCode) {
  console.log('Composer quick actions smoke check passed.');
}
