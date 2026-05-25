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

if (report.title !== 'Composer Quick Actions Drawer') fail('D288 report must name the quick actions drawer.');
if (!String(report.public_repo_rule || '').includes('No prompts')) fail('D288 report must preserve public-safe no prompt/no secret boundary.');

for (const control of report.controls || []) {
  if (control.status !== 'ready' || control.no_paid_routes_started !== true) {
    fail(`D288 control ${control.id || '<missing>'} must be ready and no-spend.`);
  }
  for (const evidence of control.evidence || []) {
    requireIncludes(script, evidence, `D288 control ${control.id || '<missing>'} missing source evidence: ${evidence}`);
  }
}

for (const needle of [
  'composer-quick-actions',
  'data-composer-quick-action="models"',
  'data-composer-quick-action="install-node"',
  'data-composer-quick-action="knowledge"',
  'data-composer-quick-action="new-chat"',
  'data-composer-quick-action="voice"',
  'data-composer-quick-action="settings"',
  'event.stopImmediatePropagation()',
  'writeRepairResume',
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
  '.composer-quick-actions button:hover',
  '.composer-quick-actions small',
  '@media (max-width: 720px)'
]) {
  requireIncludes(css, needle, `D288 quick actions CSS missing: ${needle}`);
}

for (const needle of [
  'composer-quick-actions.css?v=20260525-quick-actions-v1',
  'composer-quick-actions.js?v=20260525-quick-actions-v1'
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
  '[data-composer-quick-action=\\"models\\"]',
  'MimirComposerQuickActions',
  'runQuickAction',
  'mmir-local-connector-install.html?source=composer-quick-actions',
  "openDeferredPanel('#knowledge-panel')",
  "openDeferredPanel('#runtime-settings-panel')",
  'no_paid_routes_started:true'
]) {
  requireIncludes(`${text(files.uiCoverage)}\n${text(files.visibleAudit)}`, needle, `UI coverage/audit must include quick-actions evidence: ${needle}`);
}

requireIncludes(text(files.visualQa), 'D288 composer quick actions drawer', 'Visual QA report must mention D288 quick actions.');
requireIncludes(text(files.backlog), '| D288 | Chat UX / Composer | P0 | Open WebUI-style plus quick actions drawer |', 'Backlog must include D288.');
requireIncludes(text(files.log), 'D288 is now beta', 'Implementation log must include D288.');
requireIncludes(text(files.buildDashboard), 'composerQuickActionsReportPath', 'Progress dashboard build must read D288 report.');
requireIncludes(`${text(files.qualityWorkflow)}\n${text(files.pagesWorkflow)}`, 'smoke-check-composer-quick-actions.js', 'GitHub workflows must run D288 quick-actions smoke gate.');

if (!progress.composer_quick_actions_report || progress.composer_quick_actions_report.title !== report.title) {
  fail('Progress dashboard data must embed D288 quick actions report.');
}
const d288 = (progress.tasks || []).find((task) => task.seq === 'D288');
if (!d288 || d288.status !== 'beta') fail('Progress dashboard task D288 must be beta.');
if (!(progress.launch_progress?.checkpoints || []).some((item) => item.id === 'composer-quick-actions-drawer')) {
  fail('Launch progress must expose the quick actions drawer checkpoint.');
}

if (!process.exitCode) {
  console.log('Composer quick actions smoke check passed.');
}
