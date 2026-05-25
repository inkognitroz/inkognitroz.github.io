import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const files = {
  html: join(resolve(root, 'public'), 'mmir.html'),
  css: join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'mimir-chat-portal.css'),
  composerAutosize: join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'composer-autosize.js'),
  composerStop: join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'composer-stop-handoff.js'),
  transcriptScrollGuard: join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'transcript-scroll-guard.js'),
  composerNewChat: join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'composer-new-chat.js'),
  composerKeyboard: join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'composer-keyboard-shortcuts.js'),
  composerAutofocus: join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'composer-autofocus.js'),
  composerRefocus: join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'composer-refocus-after-send.js'),
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
const composerAutosize = read(files.composerAutosize);
const composerStop = read(files.composerStop);
const transcriptScrollGuard = read(files.transcriptScrollGuard);
const composerNewChat = read(files.composerNewChat);
const composerKeyboard = read(files.composerKeyboard);
const composerAutofocus = read(files.composerAutofocus);
const composerRefocus = read(files.composerRefocus);
const runtimeCss = read(files.runtimeCss).replace(/\s+/g, ' ');
const workspacesCss = read(files.workspacesCss).replace(/\s+/g, ' ');
const sw = read(files.sw);
const pagesWorkflow = read(files.pagesWorkflow);
const qualityWorkflow = read(files.qualityWorkflow);

requireIncludes(html, 'class="mimir-public-chat mimir-chat-first"', 'MMIR frontpage must keep the chat-first shell class.');
requireIncludes(html, 'mimir-chat-portal.css?v=20260525-composer-stop-v1', 'MMIR frontpage must ship the fresh composer stop CSS cache key.');
requireIncludes(html, './apps/mimir-chat-portal/composer-autosize.js', 'Composer autosize fallback must load through the deferred queue.');
requireIncludes(html, './apps/mimir-chat-portal/composer-stop-handoff.js', 'Composer stop handoff must load through the deferred queue.');
requireIncludes(html, './apps/mimir-chat-portal/transcript-scroll-guard.js', 'Transcript scroll guard must load through the deferred queue.');
requireIncludes(html, './apps/mimir-chat-portal/composer-new-chat.js', 'Composer new chat shortcut must load through the deferred queue.');
requireIncludes(html, './apps/mimir-chat-portal/composer-keyboard-shortcuts.js', 'Composer keyboard shortcuts must load through the deferred queue.');
requireIncludes(html, './apps/mimir-chat-portal/composer-autofocus.js', 'Composer autofocus must load through the deferred queue.');
requireIncludes(html, './apps/mimir-chat-portal/composer-refocus-after-send.js', 'Composer refocus after send must load through the deferred queue.');
requireIncludes(html, 'chat-runtime.css?v=20260525-proof-compact-v1', 'Chat runtime CSS must be cache-busted for compact proof polish.');
requireIncludes(html, 'composer-model-picker.css?v=20260525-picker-close-v1', 'Composer model picker CSS must be cache-busted for picker close-flow polish.');
requireIncludes(html, 'composer-model-picker.js?v=20260525-picker-close-v1', 'Composer model picker JS must be cache-busted for picker close-flow polish.');
requireIncludes(sw, "CACHE_NAME='mmir-pwa-d278-20260525-picker-close-v1'", 'Service worker cache must be bumped for the model picker close-flow fix.');

for (const needle of [
  'resize:none',
  'field-sizing:content',
  'max-height:14rem',
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

for (const needle of [
  'window.MimirAutosizeComposer=resize',
  "event.target&&event.target.id==='mimir-chat-form'",
  'setTimeout(resize,80)',
  "event.target?.closest?.('#primary-chat-link,[data-prompt-action],.composer-model-card button,.model-card button')"
]) {
  requireIncludes(composerAutosize, needle, `Composer autosize fallback must reset smoothly: ${needle}`);
}

for (const needle of [
  "q('#runtime-stop')?.click()",
  "primary.classList.toggle('is-stopping',stopping)",
  "primary.dataset.composerStopReady=String(stopping)",
  "primary.setAttribute('aria-label',stopping?'Stop current response':'Send prompt to the active MMIR route')",
  'new MutationObserver(update).observe(stop,{attributes:true,attributeFilter:[\'disabled\']})'
]) {
  requireIncludes(composerStop, needle, `Composer stop handoff must wire the primary action to runtime stop: ${needle}`);
}

for (const needle of [
  '#primary-chat-link.is-stopping',
  'background: #991b1b'
]) {
  requireIncludes(runtimeCss, needle, `Composer stop state needs visible styling: ${needle}`);
}

for (const needle of [
  "const near=(el)=>el.scrollHeight-el.scrollTop-el.clientHeight<48",
  "button.className='runtime-scroll-latest'",
  "button.setAttribute('aria-label','Jump to latest chat message')",
  "transcript.dataset.pinned=String(pinned)",
  "new MutationObserver(()=>",
  "if(pinned){toBottom();return;}",
  "transcript.scrollTop=top"
]) {
  requireIncludes(transcriptScrollGuard, needle, `Transcript scroll guard must protect reader position: ${needle}`);
}

for (const needle of [
  '.runtime-scroll-latest',
  '.runtime-scroll-latest[hidden]'
]) {
  requireIncludes(runtimeCss, needle, `Transcript latest jump control needs visible styling: ${needle}`);
}

for (const needle of [
  "button.id='composer-new-chat'",
  "button.setAttribute('aria-label','Start a new local chat')",
  "const clear=q('#runtime-clear')",
  'if(clear)clear.click()',
  "setFeedback('Stop the current answer before starting a new chat.','error')",
  "setFeedback('New local chat ready. Free guide/model routes stay available.','ready')",
  'window.MimirAutosizeComposer?.()'
]) {
  requireIncludes(composerNewChat, needle, `Composer new chat shortcut must reuse safe runtime clear path: ${needle}`);
}

requireIncludes(runtimeCss, '.composer-new-chat-button', 'Composer new chat button needs visible styling.');

for (const needle of [
  "event.key==='Escape'",
  "q('#runtime-stop')?.click()",
  "event.key.toLowerCase()==='k'",
  'prompt.focus({preventScroll:true})',
  'window.MimirAutosizeComposer?.()',
  'event.preventDefault()'
]) {
  requireIncludes(composerKeyboard, needle, `Composer keyboard shortcuts must keep stop/focus behavior: ${needle}`);
}

for (const needle of [
  "location.hash&&location.hash!=='#mimir-prompt'",
  "w.matchMedia&&w.matchMedia('(pointer: coarse)').matches",
  'prompt.focus({preventScroll:true})',
  "prompt.dataset.autofocused='true'",
  'window.MimirAutosizeComposer?.()',
  'mmir-composer-autofocused',
  'no_paid_routes_started:true'
]) {
  requireIncludes(composerAutofocus, needle, `Composer autofocus must be desktop-safe and public-safe: ${needle}`);
}

for (const needle of [
  "event.target&&event.target.id==='mimir-prompt'",
  "event.target?.closest?.('#primary-chat-link')",
  "event.target?.classList?.contains('mimir-composer')",
  "event.key==='Enter'&&!event.shiftKey",
  'Date.now()-lastPromptFocusAt<4000',
  'p.focus({preventScroll:true})',
  'window.MimirAutosizeComposer?.()',
  'mmir-composer-refocused',
  'no_paid_routes_started:true'
]) {
  requireIncludes(composerRefocus, needle, `Composer refocus must keep follow-up chat smooth and public-safe: ${needle}`);
}

for (const needle of [
  '.mimir-has-chat .quick-suggestions{display:none;order:4}',
  '.mimir-has-chat #mmir-active-nodes-bar .mmir-active-starter-rail,.mimir-has-chat #mmir-active-nodes-bar .mmir-active-node-grid{display:none}'
]) {
  requireIncludes(css, needle, `Post-first-message focus mode missing: ${needle}`);
}

for (const needle of [
  '.mimir-has-chat .runtime-live-proof[data-state="ready"]',
  '.mimir-has-chat .runtime-live-proof[data-state="ready"] .runtime-proof-rail { display: none;',
  '.mimir-has-chat .runtime-live-proof[data-state="ready"] .runtime-proof-actions { flex-wrap: nowrap;'
]) {
  requireIncludes(runtimeCss, needle, `Post-first-message runtime proof compacting missing: ${needle}`);
}

requireBefore(css, '.mimir-chat-first .mimir-composer{order:2}', '.mimir-chat-first #mmir-active-nodes-bar{order:3}', 'Composer must stay directly above active route choices.');
requireBefore(css, '.mimir-chat-first #mmir-active-nodes-bar{order:3}', '.mimir-chat-first #runtime-context-controls,.mimir-chat-first #mimir-chat-runtime{order:4}', 'Active routes must stay close to the composer before deeper runtime proof details.');
requireBefore(css, '.mimir-chat-first #runtime-context-controls,.mimir-chat-first #mimir-chat-runtime{order:4}', '.mimir-chat-first .quick-suggestions{order:5}', 'Live runtime must stay before secondary quick actions.');

for (const needle of [
  '.composer-tool-cluster,.composer-live-cluster{flex-wrap:nowrap;justify-content:flex-start;overflow-x:auto',
  '.composer-mode-button,.composer-live-chip{flex:0 0 auto}',
  '.composer-action-feedback{font-size:.74rem;line-height:1.25;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
  '.mimir-chat-first:not(.mimir-has-chat) .runtime-toolbar',
  '.mimir-chat-first:not(.mimir-has-chat) .runtime-live-proof[data-state="idle"]',
  '.mimir-chat-first:not(.mimir-has-chat) .runtime-transcript[data-empty="true"]',
  '.mimir-has-chat .runtime-live-proof[data-state="ready"]{border-radius:18px;grid-template-columns:1fr}'
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
