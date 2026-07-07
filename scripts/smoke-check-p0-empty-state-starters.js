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

function forbidIncludes(source, needle, message) {
  if (source.includes(needle)) failures.push(message);
}

const expectedShellVersion = '20260707-one-window-shell-v1';
const expectedCssVersion = '20260707-one-window-shell-v1';

requireIncludes(
  shell,
  '<div class="p0-empty-starters" aria-label="Forslag til første spørsmål">',
  'P0 empty state must expose starter actions instead of a dead-end blank state.'
);
requireIncludes(shell,'data-p0-empty-action="starter-current-electricity"','P0 empty state must expose a normal current-facts starter.');
requireIncludes(shell,'data-p0-empty-action="starter-football-world-cup"','P0 empty state must expose a Norway/world-cup starter.');
requireIncludes(shell,'data-p0-empty-action="starter-currency"','P0 empty state must expose a currency starter.');
requireIncludes(shell,'Hva vil du vite?','P0 empty state must be a simple chat-first invitation.');
requireIncludes(shell,'Skriv spørsmålet ditt. Supergeni finner beste svar og viser bevis når det trengs.','P0 empty state must explain the product without exposing machinery.');
forbidIncludes(shell,'Supergeni answers now. Use Superboost for many AI routes, ranking and one best answer, or start with demo, source proof, local setup or feedback capture.','P0 empty state must not expose demo/tooling copy on launch.');
requireIncludes(
  shell,
  "const emptyStarter=event.target.closest('[data-p0-empty-action]');",
  'P0 shell must route empty-state starter clicks through delegated event handling.'
);
requireIncludes(shell,'function handleEmptyStarterAction(action){','P0 shell must centralize empty-state starter behavior.');
requireIncludes(
  shell,
  "return setPromptDraft('Hvem vinner VM, og hva er Norges neste kamp?'",
  'World-cup starter must prime a normal user question, not a mode command.'
);
requireIncludes(shell,'function saveFeedbackDraft(suggestion,options={}){','P0 shell must centralize local feedback draft capture for reuse across surfaces.');
requireIncludes(shell,"window.MimirChatRuntimeBridge.saveFeedbackDraft=saveFeedbackDraft;",'P0 shell must expose local feedback draft capture through the runtime bridge.');
requireIncludes(shell,"window.MimirChatRuntimeBridge.openFeedbackInbox=openFeedbackInbox;",'P0 shell must expose Feedback Inbox opening through the runtime bridge.');
requireIncludes(css,'.p0-empty-starters {','P0 shell CSS must style the empty-state starter group.');
requireIncludes(css,'.p0-empty-starter {','P0 shell CSS must style each empty-state starter button.');
requireIncludes(css,'#mmir-p0-app.p0-launch-shell.p0-has-draft .p0-empty-starters','P0 empty-state starters must disappear on the first keystroke.');
requireIncludes(shell,'function updateDraftState(){','P0 shell must track draft state for first-keystroke cleanup.');
requireIncludes(shell,"document.getElementById('p0-input')?.focus({preventScroll:true})",'P0 launch shell must focus the single chat input after install.');

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
