import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const files = {
  mmir: join(publicDir, 'mmir.html'),
  runtime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  runtimeFix: join(publicDir, 'apps', 'mimir-chat-portal', 'runtime-controls-fix.js'),
  mobileCss: join(publicDir, 'apps', 'mimir-chat-portal', 'workflow-builder.css'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function read(file) {
  if (!existsSync(file)) {
    fail(`Missing mobile first-chat file: ${relative(root, file)}`);
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

const mmir = read(files.mmir);
const runtime = read(files.runtime);
const runtimeFix = read(files.runtimeFix);
const mobileCss = read(files.mobileCss).replace(/\s+/g, ' ');
const pagesWorkflow = read(files.pagesWorkflow);
const qualityWorkflow = read(files.qualityWorkflow);

requireIncludes(mmir, '<a href="#mimir-chat-runtime">Chat</a>', 'Static Chat nav may target runtime, but the runtime guard must repair it before tap.');
requireIncludes(mmir, '<a href="#connect-options">Connect</a>', 'Static Connect nav may target deferred connect options, but the runtime guard must repair it before tap.');
requireIncludes(mmir, '<a href="#connect-options">Install node</a>', 'Static install quick action must still be covered by the runtime guard.');
requireIncludes(mmir, 'runtime-controls-fix.js?v=20260522-doctrine', 'Runtime control fix must remain in the critical shell.');
requireBefore(mmir, 'id="mimir-instant-start"', 'class="mimir-composer"', 'Ground Zero may stay first statically, but the runtime guard must move chat above it on mobile startup.');
requireBefore(mmir, 'class="mimir-composer"', '<details id="local-connector"', 'Composer must stay before secondary setup panels.');

for (const needle of [
  'focusChatTarget',
  'handleMobileTap',
  'sendPrompt',
  'bindPrimaryAnchors',
  'repairMobileFirstChatDom',
  'runtimeAnchorBound',
  'data-mobile-buttons-ready',
  "qa('a[href=\"#mimir-chat-runtime\"]').forEach",
  "setAttr(link,'href',P)",
  "setAttr(link,'href',L)",
  "event.target.closest?.('[data-prompt-action]')",
  '#activation-chat-now,#activation-connect-local,#activation-open-models,#activation-open-node-dashboard',
  'center.insertBefore(composer,instant)',
  'center.insertBefore(quick,instant)',
  "composer.dataset.mobileFirstChatReady='true'",
  'mmir-mobile-chat-target-opened',
  "return target===C&&!q(C)?L:target",
  'a[href="#mimir-prompt"],a[href="#mimir-chat-runtime"],a[href="#local-connector"],a[href="#connect-options"],a[href="#backend-settings"]'
]) {
  requireIncludes(runtimeFix, needle, `Runtime control guard missing mobile/tap evidence: ${needle}`);
}

for (const needle of [
  'activationButtons.chat',
  'sendPrompt(',
  "if(nextTarget==='#connect-options'&&!document.querySelector(nextTarget))nextTarget='#local-connector'",
  'window.MimirLoadDeferred'
]) {
  requireIncludes(read(join(publicDir, 'apps', 'mimir-chat-portal', 'first-impression.js')), needle, `First impression must keep mobile activation buttons working: ${needle}`);
}

for (const needle of [
  "if(formEl&&formEl.nextSibling){chatCenter.insertBefore(runtime,formEl.nextSibling);}",
  "primaryLink.addEventListener('click',(event)=>{event.preventDefault();sendMessage();})",
  "formEl.addEventListener('submit',(event)=>{event.preventDefault();sendMessage();})",
  "promptEl.addEventListener('keydown',(event)=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage();}})"
]) {
  requireIncludes(runtime, needle, `Runtime must keep first chat controls wired: ${needle}`);
}

for (const needle of [
  '.mimir-composer{order:2',
  '.mimir-chat-runtime{order:3',
  '.quick-suggestions{order:4',
  '.mimir-instant-start{order:5',
  'env(safe-area-inset-bottom)'
]) {
  requireIncludes(mobileCss, needle, `Mobile CSS must preserve first-chat order/touch safety: ${needle}`);
}

for (const workflow of [pagesWorkflow, qualityWorkflow]) {
  requireIncludes(workflow, 'smoke-check-mobile-chat.js', 'Both workflows must keep the base mobile chat layout gate.');
  requireIncludes(workflow, 'smoke-check-mobile-first-chat-journey.js', 'Both workflows must run the mobile first-chat journey gate.');
}

if (!process.exitCode) {
  console.log('Mobile first-chat journey smoke check passed.');
}
