import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const p0Shell = readFileSync(
  join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'),
  'utf8'
);
const mmirHtml = readFileSync(join(resolve(root, 'public'), 'mmir.html'), 'utf8');
const assetVersions = readFileSync(
  join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'asset-versions.json'),
  'utf8'
);
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function forbidPattern(source, pattern, message) {
  if (pattern.test(source)) fail(message);
}

function functionSource(name, nextName) {
  const start = p0Shell.indexOf(`function ${name}(`);
  const next = nextName ? p0Shell.indexOf(`function ${nextName}(`, start + 1) : -1;
  if (start < 0) {
    fail(`Missing P0 function: ${name}`);
    return '';
  }
  return p0Shell.slice(start, next > start ? next : undefined);
}

const renderAddMenu = functionSource('renderAddMenu', 'renderPromptPresetMenu');
const renderPromptPresetMenu = functionSource('renderPromptPresetMenu', 'renderModelMenu');
const menuButton = functionSource('menuButton', 'renderAddMenu');

requireIncludes(
  p0Shell,
  'function menuButton(action,title,detail=\'\',options={})',
  'P0 menus must use a shared menu button helper instead of repeating button HTML.'
);
requireIncludes(
  menuButton,
  'window.MimirP0Menu.button(action,title,detail,options)',
  'P0 menuButton wrapper must delegate rendering to the shared P0 menu helper.'
);
requireIncludes(
  p0Shell,
  'window.MimirP0Menu.title(text)',
  'P0 menuTitle wrapper must delegate rendering to the shared P0 menu helper.'
);
requireIncludes(
  renderAddMenu,
  "menuTitle('Tools')",
  '+ menu title must stay short and match the expected chat toolbar pattern.'
);
requireIncludes(
  renderAddMenu,
  "menuButton('connect-local','Add model','Get the install command in this chat.')",
  '+ menu must keep local onboarding as one plain Add model action with chat-native wording.'
);
requireIncludes(
  renderAddMenu,
  "menuButton('check-local','Refresh models','Use after the connector says ready.')",
  '+ menu must keep post-install discovery short and explicit.'
);
requireIncludes(
  renderPromptPresetMenu,
  "menuButton('add-menu-main','Back','Return to Add.')",
  'Prompt preset submenu must return to the compact Add menu.'
);
requireIncludes(
  mmirHtml,
  'p0-chat-shell.js?v=20260611-b0-06-28-latency-targets-v1',
  'mmir.html must cache-bust the P0 runtime after menu-helper changes.'
);
requireIncludes(
  assetVersions,
  '"p0-chat-shell.js": "20260611-b0-06-28-latency-targets-v1"',
  'Asset manifest must track the P0 menu-helper runtime version.'
);
forbidPattern(
  renderAddMenu,
  /Local model setup|Connect local profile|Install guide|Install help|installer page|\.zip|\.command/i,
  '+ menu must not reintroduce old installer wording, redirect wording, ZIPs or unsigned command files.'
);
forbidPattern(
  renderAddMenu,
  /<button type="button" data-p0-action=/,
  '+ menu should use the shared menuButton helper for ordinary actions.'
);

if (failures.length) {
  console.error('P0 add menu simplicity smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 add menu simplicity smoke passed.');
