import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const cssPath = join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'workflow-builder.css');
const htmlPath = join(resolve(root, 'public'), 'mmir.html');
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
requireCss('.mimir-chat-runtime{order:3', 'Mobile live chat runtime must stay directly after the composer.');
requireCss('.quick-suggestions{order:4', 'Mobile quick actions must stay above secondary content.');
requireCss('.mimir-instant-start{order:5', 'Ground Zero card must not push the chat below the first mobile screen.');
requireCss('env(safe-area-inset-bottom)', 'Mobile layout must respect browser/device bottom safe area.');

if (!html.includes('workflow-builder.css?v=20260523-mobile-chat')) {
  fail('MMIR page must cache-bust the mobile chat CSS hotfix.');
}

if (!sw.includes("CACHE_NAME='mmir-pwa-d202-20260523-visual-qa'")) {
  fail('Service worker cache must be bumped when the mobile chat shell changes.');
}

if (!process.exitCode) {
  console.log('Mobile chat smoke check passed.');
}
