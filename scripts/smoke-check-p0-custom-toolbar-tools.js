import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const portalDir = join(resolve(root, 'public'), 'apps', 'mimir-chat-portal');
const shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const html = readFileSync(join(resolve(root, 'public'), 'mmir.html'), 'utf8');
const assetVersions = JSON.parse(readFileSync(join(portalDir, 'asset-versions.json'), 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function forbidIncludes(source, needle, message) {
  if (source.includes(needle)) fail(message);
}

function functionSource(name, nextName) {
  const start = shell.indexOf(`function ${name}(`);
  const next = nextName ? shell.indexOf(`function ${nextName}(`, start + 1) : -1;
  if (start < 0) {
    fail(`Missing P0 function: ${name}`);
    return '';
  }
  return shell.slice(start, next > start ? next : undefined);
}

const installShell = functionSource('installShell', 'enforceShellStyles');
const renderAddMenu = functionSource('renderAddMenu', 'renderPromptPresetMenu');
const handleRouteAction = functionSource('handleRouteAction', 'showFeedbackNotice');

requireIncludes(installShell, 'id="p0-add"', 'The minimalist composer must keep one settings button.');
requireIncludes(installShell, 'id="p0-privacy"', 'The minimalist composer must keep a direct privacy control.');
requireIncludes(installShell, 'id="p0-model"', 'The model picker must remain available without exposing implementation controls.');
requireIncludes(installShell, 'id="p0-input"', 'The composer must remain immediately usable.');
requireIncludes(installShell, 'id="p0-send"', 'The composer must keep an explicit send control.');

for (const removedId of ['p0-superboost', 'p0-council', 'p0-toolbar-tools', 'p0-feedback-capture']) {
  forbidIncludes(installShell, `id="${removedId}"`, `${removedId} must not be mounted in the launch composer.`);
}

requireIncludes(renderAddMenu, "menuTitle('Legg til')", 'The add menu must have a short user-facing title.');
requireIncludes(renderAddMenu, "menuButton('take-photo-local','Ta bilde'", 'Camera capture must remain directly accessible.');
requireIncludes(renderAddMenu, "menuButton('choose-photo-local','Velg bilde'", 'Image library must remain directly accessible.');
requireIncludes(renderAddMenu, "menuButton('privacy-menu','Personvern')", 'Privacy must remain reachable from settings.');
requireIncludes(renderAddMenu, "menuButton('cycle-answer-style','Svarstil: '+answerStyleLabel())", 'Answer style must remain reachable from settings.');
requireIncludes(renderAddMenu, "menuButton('new-chat','Ny chat')", 'New chat must remain reachable from settings.');

for (const excluded of [
  'Add to toolbar',
  'Superboost',
  'Ask all active',
  'Supergeni Council',
  'Intelligence status',
  'Feedback Inbox',
  'Local memory',
  'Verified tools'
]) {
  forbidIncludes(renderAddMenu, excluded, `Settings must not expose internal or advanced control: ${excluded}.`);
}

// Removing controls from the default UI must not remove the connected-intelligence engine.
requireIncludes(handleRouteAction, "action==='boost-answer-live'", 'The boost route action must remain available to deliberate product surfaces.');
requireIncludes(handleRouteAction, "action==='supergeni-council-live'", 'The council route action must remain available to deliberate product surfaces.');
requireIncludes(shell, 'function answerStyleInstruction(style=answerStyle())', 'Answer style must still affect model prompts.');
requireIncludes(shell, 'function hostedConversationMessages(', 'Hosted conversation context must remain intact.');

const shellVersion = assetVersions.assets?.['p0-chat-shell.js'] || '';
if (!shellVersion) fail('Asset manifest must track the P0 runtime.');
requireIncludes(html, `p0-chat-shell.js?v=${shellVersion}`, 'Public page must cache-bust the P0 runtime.');

if (failures.length) {
  console.error('P0 minimalist composer contract failed:');
  failures.forEach(failure => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 minimalist composer contract passed.');
