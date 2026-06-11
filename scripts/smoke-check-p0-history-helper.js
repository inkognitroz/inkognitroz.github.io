import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';

const root = resolve(process.cwd());
const portalDir = join(root, 'public/apps/mimir-chat-portal');
const helper = readFileSync(join(portalDir, 'p0-history.js'), 'utf8');
const shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const html = readFileSync(join(root, 'public/mmir.html'), 'utf8');
const manifest = readFileSync(join(portalDir, 'asset-versions.json'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!helper.includes("version='20260611-b0-06-24-qa-history-v1'")) {
  fail('P0 history helper version must be explicit.');
}
if (!helper.includes('Selected browser LLM is not loaded') || !helper.includes('System prompt should always be the first message')) {
  fail('P0 history helper must own stale runtime failure filters.');
}
if (!shell.includes('const P0_HISTORY=window.MimirP0History||{};')) {
  fail('P0 shell must read shared history helper.');
}
if (!shell.includes('P0_HISTORY.validMessage(message)') || !shell.includes('P0_HISTORY.makeMessageId()')) {
  fail('P0 shell must delegate history validation and message IDs to helper.');
}
if (!shell.includes('const HISTORY_SESSION_KEY=') || !shell.includes('window.__MimirP0HistorySessionMode=historySessionMode')) {
  fail('P0 shell must expose QA-session history isolation state.');
}
if (!shell.includes('historySessionMode?readSessionJson(HISTORY_SESSION_KEY,[]):readJson(HISTORY_KEY,[])')) {
  fail('P0 shell must read QA history from sessionStorage without touching normal local history.');
}
if (!shell.includes('historySessionMode?writeSessionJson(HISTORY_SESSION_KEY,messages):writeJson(HISTORY_KEY,messages)')) {
  fail('P0 shell must write QA history to sessionStorage without touching normal local history.');
}
if (!html.includes('p0-history.js?v=20260611-b0-06-24-qa-history-v1')) {
  fail('Public MMIR shell must load p0-history.js with a cache-busted version.');
}
if (html.indexOf('p0-history.js?v=20260611-b0-06-24-qa-history-v1') > html.indexOf('p0-chat-shell.js?v=')) {
  fail('P0 history helper must load before the P0 shell.');
}
if (!manifest.includes('"p0-history.js": "20260611-b0-06-24-qa-history-v1"')) {
  fail('Asset manifest must track p0-history.js.');
}
if (!String(packageJson.scripts?.check || '').includes('smoke-check-p0-history-helper.js')) {
  fail('npm run check must include smoke-check-p0-history-helper.js.');
}

const events = [];
const context = {
  window: {
    dispatchEvent(event) {
      events.push(event);
    },
  },
  CustomEvent: class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail || {};
    }
  },
  Date,
  Math,
};
vm.createContext(context);
vm.runInContext(helper, context, { filename: 'p0-history.js' });
const api = context.window.MimirP0History;
if (!api || api.version !== '20260611-b0-06-24-qa-history-v1') fail('P0 history helper must register on window.');
if (!api.validMessage({ role: 'user', content: 'Hi' })) fail('validMessage must accept user text.');
if (api.validMessage({ role: 'system', content: 'hidden' })) fail('validMessage must reject system messages.');
if (!api.staleFailureMessage({ content: 'Selected browser LLM is not loaded.' })) fail('staleFailureMessage must catch stale browser LLM failures.');
if (!api.transientInstallMessage({ command: 'curl -fsSL https://mmir.ai/downloads/mmir-local-node-macos-linux.sh | bash' })) fail('transientInstallMessage must hide install cards from first-screen history.');
if (!/^p0-/.test(api.makeMessageId())) fail('makeMessageId must produce P0 message IDs.');
if (!api.qaSessionEnabled('?mmir_qa_session=1')) fail('qaSessionEnabled must accept explicit QA sessions.');
if (!api.qaSessionEnabled('?first_click_guard=mobile')) fail('qaSessionEnabled must isolate first-click render checks.');
if (!api.qaSessionEnabled('?responsive_guard=desktop')) fail('qaSessionEnabled must isolate responsive render checks.');
if (!api.qaSessionEnabled('?b0_06_24_live=1')) fail('qaSessionEnabled must isolate B0 live QA links.');
if (!api.qaSessionEnabled('?codex_visual_qa=1')) fail('qaSessionEnabled must isolate Codex browser QA links.');
if (api.qaSessionEnabled('?utm_source=friend')) fail('qaSessionEnabled must not isolate normal user links.');
if (events[0]?.type !== 'mimir-p0-history-ready') fail('P0 history helper must emit readiness evidence.');

console.log('P0 history helper smoke passed.');
