import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const portalDir = join(root, 'public', 'apps', 'mimir-chat-portal');
const shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const css = readFileSync(join(portalDir, 'p0-chat-shell.css'), 'utf8');
const workspaceCss = readFileSync(join(portalDir, 'chat-workspace.css'), 'utf8');
const manifest = JSON.parse(readFileSync(join(portalDir, 'asset-versions.json'), 'utf8'));
const html = readFileSync(join(root, 'public', 'mmir.html'), 'utf8');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) failures.push(message);
}

function forbidIncludes(source, needle, message) {
  if (source.includes(needle)) failures.push(message);
}

const expectedShellVersion = manifest.assets?.['p0-chat-shell.js'] || '';
const expectedCssVersion = manifest.assets?.['p0-chat-shell.css'] || '';
const expectedWorkspaceCssVersion = manifest.assets?.['chat-workspace.css'] || '';

requireIncludes(
  shell,
  '<section class="p0-first-session"',
  'P0 empty state must disclose the answer state and AI interaction before the first prompt.'
);
forbidIncludes(html,'class="mimir-greeting"','Public first screen must not ship legacy greeting/hero markup that can flash before CSS or runtime loads.');
forbidIncludes(html,'id="mmir-quick-suggestions"','Public first screen must not ship hardcoded quick suggestions or starter chips.');
forbidIncludes(html,'placeholder="Spør..."','Public first screen must keep the composer visually empty.');
forbidIncludes(shell,'placeholder="Spør..."','P0 first screen must keep the composer visually empty.');
forbidIncludes(shell,'data-p0-empty-action','P0 empty state must not hardcode starter questions.');
requireIncludes(shell,'Hva vil du vite?','P0 empty state must keep one concise first-session prompt.');
requireIncludes(shell,'Supergeni, en kunstig intelligens','P0 empty state must disclose the AI interaction before the first prompt.');
requireIncludes(shell,'ikke av en demosimulering','P0 live state must not be confused with demo/sample content.');
forbidIncludes(shell,'Skriv spørsmålet ditt. Supergeni finner beste svar og viser bevis når det trengs.','P0 empty state must not explain product mechanics before the first answer.');
forbidIncludes(shell,'Supergeni answers now. Use Superboost for many AI routes, ranking and one best answer, or start with demo, source proof, local setup or feedback capture.','P0 empty state must not expose demo/tooling copy on launch.');
forbidIncludes(shell,"const emptyStarter=event.target.closest('[data-p0-empty-action]');",'P0 shell must not keep empty-state starter click routing.');
forbidIncludes(shell,'function handleEmptyStarterAction(action){','P0 shell must not keep starter-question handlers.');
requireIncludes(shell,'function saveFeedbackDraft(suggestion,options={}){','P0 shell must centralize local feedback draft capture for reuse across surfaces.');
requireIncludes(shell,"window.MimirChatRuntimeBridge.saveFeedbackDraft=saveFeedbackDraft;",'P0 shell must expose local feedback draft capture through the runtime bridge.');
requireIncludes(shell,"window.MimirChatRuntimeBridge.openFeedbackInbox=openFeedbackInbox;",'P0 shell must expose Feedback Inbox opening through the runtime bridge.');
forbidIncludes(css,'.p0-empty-starters','P0 shell CSS must not keep hardcoded starter-question styles.');
forbidIncludes(css,'.p0-empty-starter','P0 shell CSS must not keep hardcoded starter-question button styles.');
requireIncludes(css,'.p0-first-session {','P0 shell CSS must keep the disclosure compact and responsive.');
requireIncludes(workspaceCss,'.mimir-public-chat:not(.mimir-has-chat) .mimir-greeting{display:none!important}','Public empty state must keep the greeting/hero hidden so the composer is first.');
forbidIncludes(workspaceCss,'Open WebUI-style centered welcome','Public empty state must not reintroduce the centered welcome/hero pattern.');
forbidIncludes(workspaceCss,'.mimir-public-chat:not(.mimir-has-chat) .mimir-greeting h1','Public empty state must not style an empty-state hero heading.');
requireIncludes(shell,'function updateDraftState(){','P0 shell must track draft state for first-keystroke cleanup.');
requireIncludes(shell,"document.getElementById('p0-input')?.focus({preventScroll:true})",'P0 launch shell must focus the single chat input after install.');

if (!expectedShellVersion) {
  failures.push('Asset version manifest must track p0-chat-shell.js for the empty-state starter slice.');
}
if (!expectedCssVersion) {
  failures.push('Asset version manifest must track p0-chat-shell.css for the empty-state starter slice.');
}
if (!expectedWorkspaceCssVersion) {
  failures.push('Asset version manifest must track chat-workspace.css for the empty-state starter slice.');
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
  html,
  `"./apps/mimir-chat-portal/chat-workspace.css?v=${expectedWorkspaceCssVersion}"`,
  'public/mmir.html must serve the minimal empty-state chat-workspace CSS version.'
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
