import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const files = {
  html: join(resolve(root, 'public'), 'mmir.html'),
  css: join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'mimir-chat-portal.css'),
  runtimeCss: join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'chat-runtime.css'),
  workspacesCss: join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'workspaces.css'),
  sw: join(resolve(root, 'public'), 'sw.js'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function read(file) {
  if (!existsSync(file)) {
    fail(`Missing frontpage usability file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function requireBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  if (firstIndex === -1 || secondIndex === -1 || firstIndex > secondIndex) fail(message);
}

const html = read(files.html);
const css = read(files.css).replace(/\s+/g, ' ');
const runtimeCss = read(files.runtimeCss).replace(/\s+/g, ' ');
const workspacesCss = read(files.workspacesCss).replace(/\s+/g, ' ');
const sw = read(files.sw);
const pagesWorkflow = read(files.pagesWorkflow);
const qualityWorkflow = read(files.qualityWorkflow);

requireIncludes(html, 'class="mimir-public-chat mimir-chat-first"', 'MMIR frontpage must keep the chat-first shell class.');
requireIncludes(html, 'mimir-chat-portal.css?v=20260525-critical-active-routes-v1', 'MMIR frontpage must ship the fresh chat order CSS cache key.');
requireIncludes(sw, "CACHE_NAME='mmir-pwa-d255-20260525-critical-active-routes-v1'", 'Service worker cache must be bumped for the frontpage usability fix.');

for (const needle of [
  '.mimir-chat-first .mimir-greeting{order:1}',
  '.mimir-chat-first .mimir-composer{order:2}',
  '.mimir-chat-first #mmir-active-nodes-bar{order:3}',
  '.mimir-chat-first #runtime-context-controls,.mimir-chat-first #mimir-chat-runtime{order:4}',
  '.mimir-chat-first .quick-suggestions{order:5}',
  '.mimir-chat-first #mimir-instant-start{order:6}',
  '.mimir-chat-first #use-case-templates,.mimir-chat-first #free-value-loops,.mimir-chat-first #first-run-onboarding,.mimir-chat-first #growth-demo{order:20}'
]) {
  requireIncludes(css, needle, `Frontpage chat-first CSS order missing: ${needle}`);
}

requireBefore(css, '.mimir-chat-first .mimir-composer{order:2}', '.mimir-chat-first #mmir-active-nodes-bar{order:3}', 'Composer must stay directly above active route choices.');
requireBefore(css, '.mimir-chat-first #mmir-active-nodes-bar{order:3}', '.mimir-chat-first #runtime-context-controls,.mimir-chat-first #mimir-chat-runtime{order:4}', 'Active routes must stay close to the composer before deeper runtime proof details.');
requireBefore(css, '.mimir-chat-first #runtime-context-controls,.mimir-chat-first #mimir-chat-runtime{order:4}', '.mimir-chat-first .quick-suggestions{order:5}', 'Live runtime must stay before secondary quick actions.');

for (const needle of [
  '.composer-tool-cluster,.composer-live-cluster{flex-wrap:nowrap;justify-content:flex-start;overflow-x:auto',
  '.composer-mode-button,.composer-live-chip{flex:0 0 auto}',
  '.composer-action-feedback{font-size:.74rem;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
]) {
  requireIncludes(runtimeCss, needle, `Mobile composer controls must stay compact: ${needle}`);
}

for (const needle of [
  '.workspace-switcher { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) 32px;',
  '.workspace-create-form { grid-column: 1 / -1; display: grid; }',
  '.workspace-create-form[hidden] { display: none; }'
]) {
  requireIncludes(workspacesCss, needle, `Mobile workspace controls must not inflate the first chat screen: ${needle}`);
}

for (const workflow of [pagesWorkflow, qualityWorkflow]) {
  requireIncludes(workflow, 'smoke-check-frontpage-chat-usability.js', 'Both workflows must run the frontpage chat usability gate.');
}

if (!process.exitCode) {
  console.log('Frontpage chat usability smoke check passed.');
}
