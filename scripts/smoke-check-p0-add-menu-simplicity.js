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
const assetVersionMap = JSON.parse(assetVersions);
const shellVersion = assetVersionMap.assets?.['p0-chat-shell.js'] || '';
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

const installShell = functionSource('installShell', 'enforceShellStyles');
const renderAddMenu = functionSource('renderAddMenu', 'renderPromptPresetMenu');
const renderPrivacyMenu = functionSource('renderPrivacyMenu', 'shieldStateFor');
const menuButton = functionSource('menuButton', 'renderAddMenu');

requireIncludes(
  p0Shell,
  "function menuButton(action,title,detail='',options={})",
  'P0 menus must use the shared menu button helper.'
);
requireIncludes(
  menuButton,
  'window.MimirP0Menu.button(action,title,detail,options)',
  'P0 menuButton wrapper must delegate to the shared menu helper.'
);
requireIncludes(
  renderAddMenu,
  "menuTitle('Legg til')",
  'Plussknappen må åpne en kort, tydelig meny.'
);
requireIncludes(
  renderAddMenu,
  "menuButton('privacy-menu','Personvern')",
  'Settings must keep the existing privacy control accessible.'
);
requireIncludes(
  renderAddMenu,
  "menuButton('cycle-answer-style','Svarstil: '+answerStyleLabel())",
  'Settings may keep the user-facing answer style preference.'
);
requireIncludes(
  renderAddMenu,
  "menuButton('new-chat','Ny chat')",
  'Settings must keep the browser-local new chat action.'
);
requireIncludes(
  installShell,
  'id="p0-input"',
  'The immediately usable chat textarea must remain installed.'
);
requireIncludes(
  installShell,
  'id="p0-send"',
  'The immediately usable send control must remain installed.'
);
requireIncludes(
  installShell,
  'id="p0-add" class="p0-btn p0-btn-icon" type="button" aria-label="Legg til" title="Legg til"',
  'Plussknappen må ha et tilgjengelig norsk navn.'
);

for (const mode of ['public', 'private', 'superprivate']) {
  requireIncludes(
    renderPrivacyMenu,
    `menuButton('set-privacy-mode:${mode}'`,
    `Privacy settings must keep the ${mode} mode accessible.`
  );
}

const forbiddenSettingsLabels =
  /Prompts|Prompt presets|Quick answer|Best Answer|Superboost|Ask all active|Debate|Intelligence status|Feedback Inbox/i;
forbidPattern(
  renderAddMenu,
  forbiddenSettingsLabels,
  'The gear menu must not expose prompts, many-AI controls, intelligence status, or Feedback Inbox.'
);
forbidPattern(
  renderAddMenu,
  /prompt-presets|boost-answer-live|ask-all-active|supergeni-council-live|intelligence-status|feedback-inbox/i,
  'The gear menu must not retain hidden action hooks for excluded controls.'
);
forbidPattern(
  renderAddMenu,
  /connect-local|check-local|model-health|model-menu|role-profile-menu|Verified tools|Improve MMIR|Local memory|Add to toolbar/i,
  'The minimalist Settings menu must not expose product-process or advanced tool controls.'
);
requireIncludes(
  renderPrivacyMenu,
  'demoTranscriptModeRequested(demoTranscriptParams())',
  'Demo learning controls must be conditional on explicit demo mode.'
);
forbidPattern(
  renderPrivacyMenu,
  /Route receipt|Score meaning|No paid route|Fact guard/i,
  'The privacy submenu must not contain route-process controls.'
);
forbidPattern(
  installShell,
  /id="p0-superboost"|id="p0-council"|id="p0-toolbar-tools"|id="p0-feedback-capture"/i,
  'The launch composer must not mount hidden advanced-tool or Feedback Inbox controls.'
);

requireIncludes(
  p0Shell,
  "if(action==='boost-answer-live')",
  'The backend-facing boost capability handler must remain available outside Settings.'
);
requireIncludes(
  p0Shell,
  "if(action==='supergeni-council-live')",
  'The backend-facing council capability handler must remain available outside Settings.'
);
requireIncludes(
  p0Shell,
  'function renderPromptPresetMenu()',
  'Prompt preset capability must not be deleted merely because Settings no longer exposes it.'
);
requireIncludes(
  mmirHtml,
  'p0-chat-shell.js?v='+shellVersion,
  'mmir.html must cache-bust the P0 runtime.'
);
if (!shellVersion) fail('Asset manifest must track p0-chat-shell.js.');

if (failures.length) {
  console.error('P0 minimalist settings smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 minimalist settings smoke passed.');
