import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const cssPath = join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'mimir-chat-portal.css');
const htmlPath = join(resolve(root, 'public', 'mmir.html'));
const swPath = join(resolve(root, 'public'), 'sw.js');
const css = readFileSync(cssPath, 'utf8');
const html = readFileSync(htmlPath, 'utf8');
const sw = readFileSync(swPath, 'utf8');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function requireCss(needle, message) {
  if (!css.includes(needle)) fail(message);
}

requireCss('@media(max-width:720px)', 'Mobile chat rules must be scoped to phones/tablets.');
requireCss('.mimir-topbar{position:sticky', 'Mobile top navigation must stay compact and visible.');
requireCss('grid-template-columns:repeat(5,minmax(0,1fr))', 'Mobile top navigation must fit core actions into one row.');
requireCss('.mimir-topbar nav>a:nth-of-type(n+5){display:none}', 'Mobile top navigation must hide secondary links behind More.');
requireCss('.mimir-composer{order:2', 'Mobile composer must appear before Ground Zero and secondary panels.');
requireCss('.mimir-chat-first #mmir-active-nodes-bar{order:3}', 'Mobile active model/node choices must stay directly after the composer.');
requireCss('.mimir-chat-first #runtime-context-controls,.mimir-chat-first #mimir-chat-runtime{order:4}', 'Mobile live chat runtime must stay directly after active route choices.');
requireCss('.mimir-chat-first .quick-suggestions{order:5', 'Mobile quick actions must stay above secondary content.');
requireCss('.mimir-chat-first #mimir-instant-start{order:6', 'Ground Zero card must not push the chat below the first mobile screen.');
requireCss('env(safe-area-inset-bottom)', 'Mobile layout must respect browser/device bottom safe area.');

if (!html.includes('mimir-chat-portal.css?v=20260525-clean-shell-v1')) {
  fail('MMIR page must cache-bust the mobile chat CSS hotfix.');
}

if (!html.includes('chat-runtime.css?v=20260525-prechat-plus-v1')) {
  fail('MMIR page must cache-bust the compact proof chat runtime CSS.');
}

if (!html.includes('composer-model-picker.css?v=20260526-stale-offline-model-proof-v1')) {
  fail('MMIR page must cache-bust the model picker empty-reset CSS.');
}

if (!sw.includes("CACHE_NAME='mmir-pwa-d315-20260526-local-proof-auto-first-answer-v1'")) {
  fail('Service worker cache must be bumped when the mobile chat shell changes.');
}

if (!sw.includes('NETWORK_FIRST_EXTENSIONS') || !sw.includes("fetch(request,{cache:'no-cache'})")) {
  fail('Service worker must fetch app shell HTML/CSS/JS/JSON network-first so mobile users do not stay pinned to stale broken controls.');
}

if (!process.exitCode) {
  console.log('Mobile chat smoke check passed.');
}
