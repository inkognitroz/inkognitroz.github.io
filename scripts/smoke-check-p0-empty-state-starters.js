import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const portalDir = join(root, 'public', 'apps', 'mimir-chat-portal');
const shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const css = readFileSync(join(portalDir, 'p0-chat-shell.css'), 'utf8');
const manifest = JSON.parse(readFileSync(join(portalDir, 'asset-versions.json'), 'utf8'));
const html = readFileSync(join(root, 'public', 'mmir.html'), 'utf8');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) failures.push(message);
}

const expectedShellVersion = '20260624-supergeni-quality-row-v1';
const expectedCssVersion = '20260624-continuation-action-v1';

requireIncludes(
  shell,
  '<div class="p0-empty-starters" aria-label="Suggested first actions">',
  'P0 empty state must expose starter actions instead of a dead-end blank state.'
);
requireIncludes(shell,'data-p0-empty-action="starter-best-answer"','P0 empty state must expose a Best Answer starter.');
requireIncludes(shell,'data-p0-empty-action="starter-private-local"','P0 empty state must expose a private local starter.');
requireIncludes(shell,'data-p0-empty-action="starter-verified-source"','P0 empty state must expose a verified source starter.');
requireIncludes(shell,'data-p0-empty-action="starter-feedback"','P0 empty state must expose a feedback starter.');
requireIncludes(
  shell,
  "const emptyStarter=event.target.closest('[data-p0-empty-action]');",
  'P0 shell must route empty-state starter clicks through delegated event handling.'
);
requireIncludes(shell,'function handleEmptyStarterAction(action){','P0 shell must centralize empty-state starter behavior.');
requireIncludes(
  shell,
  "return setPromptDraft('@compare ','Best Answer starter ready.','Best Answer starter · compare active routes when you send');",
  'Best Answer starter must prime compare mode before the first message.'
);
requireIncludes(shell,"return handleMenuAction('connect-local');",'Private local starter must reuse the existing connect-local flow.');
requireIncludes(shell,"return handleMenuAction('verified-source');",'Verified source starter must reuse the verified-source flow.');
requireIncludes(shell,"return handleMenuAction('draft-feedback');",'Feedback starter must reuse the existing feedback draft flow.');
requireIncludes(shell,'function saveFeedbackDraft(suggestion,options={}){','P0 shell must centralize local feedback draft capture for reuse across surfaces.');
requireIncludes(shell,"window.MimirChatRuntimeBridge.saveFeedbackDraft=saveFeedbackDraft;",'P0 shell must expose local feedback draft capture through the runtime bridge.');
requireIncludes(shell,"window.MimirChatRuntimeBridge.openFeedbackInbox=openFeedbackInbox;",'P0 shell must expose Feedback Inbox opening through the runtime bridge.');
requireIncludes(css,'.p0-empty-starters {','P0 shell CSS must style the empty-state starter group.');
requireIncludes(css,'.p0-empty-starter {','P0 shell CSS must style each empty-state starter button.');

if (manifest.assets?.['p0-chat-shell.js'] !== expectedShellVersion) {
  failures.push('Asset version manifest must track p0-chat-shell.js for the empty-state starter slice.');
}
if (manifest.assets?.['p0-chat-shell.css'] !== expectedCssVersion) {
  failures.push('Asset version manifest must track p0-chat-shell.css for the empty-state starter slice.');
}

requireIncludes(
  html,
  `"./apps/mimir-chat-portal/p0-chat-shell.css?v=${expectedCssVersion}"`,
  'public/mmir.html must serve the starter-ready P0 shell CSS version.'
);
requireIncludes(
  html,
  `"./apps/mimir-chat-portal/p0-chat-shell.js?v=${expectedShellVersion}"`,
  'public/mmir.html must serve the starter-ready P0 shell JS version.'
);
requireIncludes(
  String(pkg.scripts?.check || ''),
  'smoke-check-p0-empty-state-starters.js',
  'npm run check must include the empty-state starter smoke test.'
);

if (failures.length) {
  console.error('P0 empty-state starters smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 empty-state starters smoke passed.');
