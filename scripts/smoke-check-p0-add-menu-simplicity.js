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
  "menuButton('connect-local','Connect local model','Get the install command in this chat.')",
  '+ menu must keep local onboarding as one plain connect-local action with chat-native wording.'
);
requireIncludes(
  renderAddMenu,
  "menuButton('check-local','Refresh models','Use after the connector says ready.')",
  '+ menu must keep post-install discovery short and explicit.'
);
requireIncludes(
  renderAddMenu,
  "menuButton('cycle-answer-style','Answer style: '+answerStyleLabel(),answerStyleDetail())",
  '+ menu must expose answer style without adding a toolbar button.'
);
requireIncludes(
  renderAddMenu,
  "menuButton('role-profile-menu','Role profile: '+roleProfileLabel(),roleProfileDetail())",
  '+ menu must expose role profiles without adding a toolbar button.'
);
requireIncludes(
  renderAddMenu,
  "menuSection('Bilde')",
  '+ menu must expose the photo/library entrypoint as a compact section.'
);
requireIncludes(
  renderAddMenu,
  "menuButton('take-photo-local','Ta bilde'",
  '+ menu must expose camera capture without a visible toolbar button.'
);
requireIncludes(
  renderAddMenu,
  "menuButton('choose-photo-local','Velg fra bibliotek'",
  '+ menu must expose device photo library without a visible toolbar button.'
);
requireIncludes(
  renderAddMenu,
  "menuButton('ask-all-active','Ask all active'",
  '+ menu must expose Ask all active without adding a toolbar button.'
);
requireIncludes(
  renderAddMenu,
  "menuSection('Many AI')",
  '+ menu must show scaled intelligence as a first-class group.'
);
requireIncludes(
  renderAddMenu,
  "menuButton('boost-answer-live','Superboost'",
  '+ menu must use Superboost language for the many-AI best-answer path.'
);
requireIncludes(
  renderAddMenu,
  "menuButton('supergeni-council-live','Debate'",
  '+ menu must expose Debate as an immediate model-discussion action.'
);
requireIncludes(
  renderAddMenu,
  'pool.compareReady',
  '+ menu must only reveal two-model tools after local discovery.'
);
requireIncludes(
  p0Shell,
  'id="p0-council"',
  'Composer must expose Supergeni Council/Debate as a visible scaled-intelligence action.'
);
requireIncludes(
  p0Shell,
  'data-p0-route-action="supergeni-council-live"',
  'Visible Council CTA must use the shared route-action dispatcher.'
);
requireIncludes(
  renderAddMenu,
  "menuButton('compare-live','Compare answers'",
  '+ menu must expose Compare answers only through the truth-gated two-model section.'
);
requireIncludes(
  renderAddMenu,
  "menuButton('best-answer-live','Best answer benchmark'",
  '+ menu must expose Best answer benchmark only through the truth-gated two-model section.'
);
requireIncludes(
  renderAddMenu,
  "menuButton('discuss-topic','Supergeni Council'",
  '+ menu must still expose Supergeni Council in the advanced tools menu.'
);
requireIncludes(
  renderAddMenu,
  "menuButton('share-location','Del posisjon'",
  '+ menu must expose explicit browser-location opt-in for route/weather prompts.'
);
requireIncludes(
  p0Shell,
  'navigator.geolocation.getCurrentPosition',
  'P0 location sharing must use the browser permission prompt, not hidden location capture.'
);
requireIncludes(
  p0Shell,
  'sharedLocationContextForPrompt(prompt)',
  'P0 chat sends shared location only when the prompt needs route/weather/near-me context.'
);
requireIncludes(
  p0Shell,
  'origin_lat:',
  'P0 location context must use the gateway-recognized origin_lat field.'
);
requireIncludes(
  p0Shell,
  'origin_lon:',
  'P0 location context must use the gateway-recognized origin_lon field.'
);
requireIncludes(
  renderPromptPresetMenu,
  "menuButton('add-menu-main','Back','Return to Add.')",
  'Prompt preset submenu must return to the compact Add menu.'
);
requireIncludes(
  mmirHtml,
  'p0-chat-shell.js?v=20260704-location-context-v1',
  'mmir.html must cache-bust the P0 runtime after menu-helper changes.'
);
requireIncludes(
  assetVersions,
  '"p0-chat-shell.js": "20260704-location-context-v1"',
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
forbidPattern(
  p0Shell,
  /id="p0-ask-all|data-tool-id="ask-all-active"/,
  'Ask all active must not add another visible toolbar button by default.'
);

if (failures.length) {
  console.error('P0 add menu simplicity smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 add menu simplicity smoke passed.');
