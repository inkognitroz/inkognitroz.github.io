import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const paths = {
  html: join(publicDir, 'mmir.html'),
  p0Css: join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.css'),
  p0Runtime: join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'),
  iphoneWebkit: join(root, 'scripts', 'render-check-p0-iphone-webkit.mjs'),
  localInstall: join(publicDir, 'apps', 'mimir-chat-portal', 'local-install-commands.js'),
  packageJson: join(root, 'package.json'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml')
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
const iphoneWebkit = read(paths.iphoneWebkit);
const qualityWorkflow = read(paths.qualityWorkflow);
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
  'id="p0-attach"',
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
  'aria-label="Spør Supergeni, en kunstig intelligens"',
  'aria-label="Legg ved bilde"',
  'aria-label="Verktøy"',
  'aria-label="Sikkerhet og personvern: offentlig modus"',
  'aria-label="Velg modell"',
  'aria-label="Taleinndata"',
  'aria-label="Send melding"'
]) {
  requireText(runtime, marker, `P0 controls must keep accessible labels: ${marker}`);
}

for (const marker of [
  'aria-controls="p0-add-menu" aria-expanded="false"',
  'aria-controls="p0-privacy-menu" aria-expanded="false"',
  'aria-haspopup="dialog" aria-controls="p0-model-menu" aria-expanded="false"'
]) {
  requireText(runtime, marker, `P0 popover controls must expose their owned expanded region: ${marker}`);
}
forbidText(runtime, 'class="p0-menu" role="menu"', 'Generic button popovers must not claim the ARIA menu pattern without menuitem keyboard semantics.');

for (const marker of [
  'Chatten er ikke produksjonsklar.',
  'Ikke del sensitiv info eller bruk den til høyrisikoformål.',
  "send.setAttribute('aria-describedby','p0-release-warning')",
  "composer.setAttribute('aria-busy',state.busy?'true':'false')",
  'function positionMenuAboveTrigger(menu,button)',
  "const bottom=Math.max(12,window.innerHeight-rect.top+8)",
  "document.activeElement===document.getElementById('p0-input')"
]) {
  requireText(runtime, marker, `P0 send state must keep concise, accessible release truth: ${marker}`);
}

for (const marker of [
  "menuButton('privacy-menu','Personvern')",
  "menuButton('cycle-answer-style','Svarstil: '+answerStyleLabel())",
  "menuButton('new-chat','Ny chat'",
  'data-p0-route-action="connect-local"',
  'LOCAL_INSTALL_COMMANDS.commandFor?.(os)'
]) {
  requireText(runtime, marker, `P0 shell must keep a minimal proven action: ${marker}`);
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
  'Del trygt'
]) {
  requireText(runtime, marker, `P0 assistant answers must expose proven answer action: ${marker}`);
}

for (const marker of [
  "function quietReceiptStatus(receipt,modelLabel='',proof=null)",
  "function renderReceipt(receipt,proof,modelLabel='',intelligenceLabel='',answerState='',aiGenerated=false)",
  '<span class="p0-receipt-model">',
  '<div class="p0-receipt-expanded">',
  'renderReceipt(message.receipt,message.proofLine,visibleLabel,message.intelligenceLabel,message.answerState,message.aiGenerated)'
]) {
  requireText(runtime, marker, `P0 answer chrome must keep one model-visible receipt line with on-demand details: ${marker}`);
}

forbidText(runtime, '<div class="p0-message-label">', 'P0 answers must lead with content instead of a separate model-label row.');
const answerBodyIndex = runtime.indexOf('<div class="p0-message-body">');
const answerReceiptIndex = runtime.indexOf('receiptHtml+', answerBodyIndex);
if (answerBodyIndex < 0 || answerReceiptIndex < answerBodyIndex) {
  fail('P0 answer content must render before its single receipt line.');
}

forbidText(runtime, 'Install guide', 'P0 plus menu must not redirect local setup to a separate install guide.');
forbidText(runtime, 'Install help', 'P0 plus menu must not redirect local setup to a separate install help page.');
forbidText(html, '<a href="#platform-status">Status</a>', 'First screen must not expose diagnostics/status nav.');
forbidText(html, './apps/mimir-chat-portal/workflow-builder.js', 'First screen must not load Workflow Builder.');
forbidText(html, './apps/mimir-chat-portal/admin-governance.js', 'First screen must not load Admin governance.');

for (const marker of [
  '#mmir-p0-app {',
  'grid-template-columns: 220px minmax(0, 1fr);',
  'height: 100vh;',
  'height: 100dvh;',
  'body.mmir-p0-ready > :not(#mmir-p0-app)',
  '.p0-main-shell {',
  'grid-template-rows: auto minmax(0, 1fr) auto;',
  '.p0-sidebar {',
  '.p0-transcript {',
  'overflow-y: auto;',
  'overscroll-behavior: contain;',
  '-webkit-overflow-scrolling: touch;',
  '.p0-message-actions',
  '.p0-message-action-status',
  '.p0-message-receipt-static',
  '.p0-receipt-model',
  '.p0-receipt-expanded',
  '.p0-message-receipt summary:focus-visible',
  '.p0-composer-wrap {',
  'env(safe-area-inset-bottom)',
  '.p0-toolbar {',
  '.p0-left {',
  'flex: 1 1 auto;',
  'overflow: hidden;',
  '.p0-right {',
  'flex: 0 0 auto;',
  'justify-content: flex-end;',
  '.p0-model-button {',
  'max-width: min(230px, 46vw);',
  '@media (max-width: 640px)',
  'grid-template-columns: minmax(0, 1fr);',
  '@media (max-width: 380px)'
]) {
  requireText(css, marker, `P0 mobile CSS contract missing: ${marker}`);
}

requirePattern(
  normalizedCss,
  /\.p0-send \{.*?min-height: 44px;.*?touch-action: manipulation;.*?\}/,
  'Send control must keep a 44px minimum tap target and direct touch handling.'
);
requirePattern(
  normalizedCss,
  /\.mimir-public-chat \.p0-send \{.*?background: #111827;.*?border-color: #111827;.*?color: #ffffff;.*?transition: none;.*?\}/,
  'Ready send colors must outrank the legacy public-button surface without blocking mobile size overrides.'
);
requirePattern(
  normalizedCss,
  /\.p0-send:focus-visible \{.*?outline: 3px solid #0f766e;.*?outline-offset: 3px;.*?\}/,
  'Send control must keep a high-contrast keyboard focus indicator.'
);
requirePattern(
  normalizedCss,
  /\.p0-send\[data-state="blocked"\]:disabled \{.*?background: #e2e8f0;.*?border-color: #64748b;.*?color: #334155;.*?opacity: 1;.*?\}/,
  'Blocked send control must remain opaque and visibly unavailable.'
);
requirePattern(
  normalizedCss,
  /@media \(max-width: 640px\).*?\.p0-send \{.*?min-height: 44px;.*?min-width: 44px;.*?\}/,
  'Mobile send control must preserve a 44 by 44 CSS pixel tap target.'
);

requirePattern(
  normalizedCss,
  /@media \(max-width: 640px\).*?\.p0-sidebar \{ display: none; \}.*?\.p0-status \{ display: none; \}.*?\.p0-model-button \{ max-width: 34vw; \}.*?\.p0-menu \{.*?left: 10px !important;.*?right: 10px;.*?width: auto;/,
  'Mobile CSS must hide topbar status, constrain model picker and make menus viewport-safe.'
);
requirePattern(
  normalizedCss,
  /@media \(max-width: 380px\).*?\.p0-model-button \{.*?max-width: 34vw;.*?padding: 0 10px;.*?\.p0-receipt-model \{.*?max-width: 30vw;/,
  'Narrow mobile CSS must constrain both the model selector and the answer receipt model.'
);

requireText(
  String(packageJson.scripts?.check || ''),
  'smoke-check-p0-mobile-shell-contract.js',
  'npm run check must include the P0 mobile shell contract smoke.'
);

requireText(
  String(packageJson.scripts?.['check:iphone-webkit'] || ''),
  'render-check-p0-iphone-webkit.mjs',
  'package scripts must expose the iPhone WebKit regression.'
);

for (const marker of [
  "import { webkit } from '@playwright/test'",
  'const viewport = { width: 390, height: 844 }',
  'hasTouch: true',
  'isMobile: true',
  "await page.route('**/*'",
  'network.chatCalls === 0',
  'checkReadyBusyAndStop(browser)'
]) {
  requireText(iphoneWebkit, marker, `iPhone WebKit regression must keep its real mobile/network contract: ${marker}`);
}

for (const marker of [
  'npx playwright install --with-deps chromium webkit',
  'npm run check:iphone-webkit'
]) {
  requireText(qualityWorkflow, marker, `required quality CI must retain the iPhone WebKit gate: ${marker}`);
}

if (!process.exitCode) {
  console.log('P0 mobile shell contract smoke passed.');
}
