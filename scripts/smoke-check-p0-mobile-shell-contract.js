import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const paths = {
  html: join(publicDir, 'mmir.html'),
  p0Css: join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.css'),
  p0Runtime: join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'),
  localInstall: join(publicDir, 'apps', 'mimir-chat-portal', 'local-install-commands.js'),
  packageJson: join(root, 'package.json')
};

function fail(message) {
  console.error(`P0 mobile shell contract failed: ${message}`);
  process.exitCode = 1;
}

function read(path) {
  if (!existsSync(path)) {
    fail(`missing ${path}`);
    return '';
  }
  return readFileSync(path, 'utf8');
}

function requireText(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function forbidText(source, needle, message) {
  if (source.includes(needle)) fail(message);
}

function requirePattern(source, pattern, message) {
  if (!pattern.test(source)) fail(message);
}

const html = read(paths.html);
const css = read(paths.p0Css);
const runtime = read(paths.p0Runtime);
const packageJson = JSON.parse(read(paths.packageJson) || '{}');
const normalizedCss = css.replace(/\s+/g, ' ');

for (const marker of [
  '<body class="mimir-public-chat mimir-chat-first mmir-p0-ready">',
  './apps/mimir-chat-portal/p0-chat-shell.css',
  './apps/mimir-chat-portal/p0-chat-shell.js'
]) {
  requireText(html, marker, `public page must keep the P0 shell first-paint marker: ${marker}`);
}

requireText(runtime, "app.id='mmir-p0-app'", 'P0 runtime must mount the protected app root.');

for (const marker of [
  'id="p0-transcript"',
  'id="p0-input"',
  'id="p0-add"',
  'id="p0-privacy"',
  'id="p0-model"',
  'id="p0-mic"',
  'id="p0-send"',
  'id="p0-add-menu"',
  'id="p0-model-menu"',
  'id="p0-privacy-menu"'
]) {
  requireText(runtime, marker, `P0 runtime must render mobile-safe control: ${marker}`);
}

for (const marker of [
  'aria-label="Message Supergenious"',
  'aria-label="Add or connect model"',
  'aria-label="Security and privacy status"',
  'aria-label="Choose model"',
  'aria-label="Voice input"',
  'aria-label="Send message"'
]) {
  requireText(runtime, marker, `P0 controls must keep accessible labels: ${marker}`);
}

for (const marker of [
  'Add model',
  'Get the install command in this chat.',
  'Refresh models',
  'New chat',
  'LOCAL_INSTALL_COMMANDS.commandFor?.(os)'
]) {
  requireText(runtime, marker, `P0 plus menu must expose only proven first-journey actions: ${marker}`);
}

requireText(
  read(paths.localInstall),
  'curl -fsSL https://mmir.ai/downloads/mmir-local-node-macos-linux.sh | bash',
  'Shared local install helper must expose the proven Mac/Linux command.'
);

for (const marker of [
  'data-p0-message-action="copy"',
  'data-p0-message-action="retry"',
  'data-p0-message-action="share-safe"',
  'Share safe'
]) {
  requireText(runtime, marker, `P0 assistant answers must expose proven answer action: ${marker}`);
}

forbidText(runtime, 'Install guide', 'P0 plus menu must not redirect local setup to a separate install guide.');
forbidText(runtime, 'Install help', 'P0 plus menu must not redirect local setup to a separate install help page.');
forbidText(html, '<a href="#platform-status">Status</a>', 'First screen must not expose diagnostics/status nav.');
forbidText(html, './apps/mimir-chat-portal/workflow-builder.js', 'First screen must not load Workflow Builder.');
forbidText(html, './apps/mimir-chat-portal/admin-governance.js', 'First screen must not load Admin governance.');

for (const marker of [
  '#mmir-p0-app {',
  'grid-template-rows: auto minmax(0, 1fr) auto;',
  'height: 100vh;',
  'body.mmir-p0-ready > :not(#mmir-p0-app)',
  '.p0-transcript {',
  'overflow-y: auto;',
  'overscroll-behavior: contain;',
  '-webkit-overflow-scrolling: touch;',
  '.p0-message-actions',
  '.p0-message-action-status',
  '.p0-composer-wrap {',
  'env(safe-area-inset-bottom)',
  '.p0-toolbar {',
  '.p0-left {',
  'flex: 0 0 auto;',
  '.p0-right {',
  'justify-content: flex-end;',
  '.p0-model-button {',
  'max-width: min(230px, 46vw);',
  '@media (max-width: 640px)',
  '@media (max-width: 380px)'
]) {
  requireText(css, marker, `P0 mobile CSS contract missing: ${marker}`);
}

requirePattern(
  normalizedCss,
  /@media \(max-width: 640px\).*?\.p0-status \{ display: none; \}.*?\.p0-model-button \{ max-width: 42vw; \}.*?\.p0-menu \{.*?left: 10px !important;.*?right: 10px;.*?width: auto;/,
  'Mobile CSS must hide topbar status, constrain model picker and make menus viewport-safe.'
);
requirePattern(
  normalizedCss,
  /@media \(max-width: 380px\).*?\.p0-model-button \{.*?max-width: 34vw;.*?padding: 0 10px;/,
  'Narrow mobile CSS must further constrain the model selector.'
);

requireText(
  String(packageJson.scripts?.check || ''),
  'smoke-check-p0-mobile-shell-contract.js',
  'npm run check must include the P0 mobile shell contract smoke.'
);

if (!process.exitCode) {
  console.log('P0 mobile shell contract smoke passed.');
}
