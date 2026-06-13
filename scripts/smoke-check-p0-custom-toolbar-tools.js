import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const portalDir = join(resolve(root, 'public'), 'apps', 'mimir-chat-portal');
const shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const css = readFileSync(join(portalDir, 'p0-chat-shell.css'), 'utf8');
const icons = readFileSync(join(portalDir, 'p0-icons.js'), 'utf8');
const html = readFileSync(join(resolve(root, 'public'), 'mmir.html'), 'utf8');
const manifest = readFileSync(join(portalDir, 'asset-versions.json'), 'utf8');
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
const handleMenuAction = functionSource('handleMenuAction', 'setActiveRoutePinned');
const handleToolbarTool = functionSource('handleToolbarTool', 'handleMenuAction');
const renderPinnedToolbarTools = functionSource('renderPinnedToolbarTools', 'updatePinnedToolbarToolStates');
const updateSendControl = functionSource('updateSendControl', 'beginResponse');

requireIncludes(shell, "const TOOLBAR_TOOLS_KEY='mmir-p0-toolbar-tools-v1'", 'Pinned toolbar tools must have a browser-local storage key.');
requireIncludes(shell, "const ANSWER_STYLE_KEY='mmir-p0-answer-style-v1'", 'Answer style must have a browser-local storage key.');
requireIncludes(shell, "const ROLE_PROFILE_KEY='mmir-p0-role-profile-v1'", 'Role profiles must have a browser-local storage key.');
requireIncludes(shell, "const MEMORY_SNAPSHOT_KEY='mmir-p0-memory-snapshot-v1'", 'Memory must have an explicit browser-local snapshot key.');
requireIncludes(installShell, 'id="p0-toolbar-tools"', 'Default toolbar must include an empty pinned-tool slot.');
forbidIncludes(installShell, 'data-p0-toolbar-tool', 'Default toolbar must not ship optional tools as visible buttons.');
requireIncludes(renderAddMenu, "menuSection('Add to toolbar')", '+ menu must expose optional tools as add-to-toolbar choices.');
requireIncludes(renderAddMenu, ".filter(tool=>tool.id!=='discuss'||pool.compareReady)", 'Discussion toolbar option must stay hidden until two routes are ready.');
requireIncludes(renderAddMenu, "pin-toolbar-tool:'", '+ menu must be able to pin optional toolbar tools.');
requireIncludes(renderAddMenu, "unpin-toolbar-tool:'", '+ menu must be able to remove optional toolbar tools.');
requireIncludes(shell, "id:'fresh-start'", '+ menu must include the fresh-start tool.');
requireIncludes(shell, "id:'discuss'", '+ menu must include the model discussion tool.');
requireIncludes(shell, "id:'memory'", '+ menu must include the memory tool.');
requireIncludes(shell, "id:'stop'", '+ menu must include the explicit stop tool.');
requireIncludes(shell, "id:'fast-answer'", '+ menu must include the lightning fast-answer tool.');
requireIncludes(renderAddMenu, "menuButton('cycle-answer-style','Answer style: '+answerStyleLabel(),answerStyleDetail())", '+ menu must expose answer style without adding a toolbar button.');
requireIncludes(renderAddMenu, "menuButton('role-profile-menu','Role profile: '+roleProfileLabel(),roleProfileDetail())", '+ menu must expose role profiles without adding a toolbar button.');
requireIncludes(handleMenuAction, "action==='cycle-answer-style'", 'Menu actions must handle answer style cycling.');
requireIncludes(handleMenuAction, "action==='role-profile-menu'", 'Menu actions must open role profile selection.');
requireIncludes(handleMenuAction, "actionId.startsWith('set-role-profile:')", 'Menu actions must handle role profile selection.');
requireIncludes(shell, 'function answerStyleInstruction(style=answerStyle())', 'Answer style must influence hosted and local model prompts.');
requireIncludes(shell, 'function roleProfileInstruction()', 'Role profiles must influence hosted and local model prompts.');
requireIncludes(shell, "label:'Fact analyst'", 'Role profiles must include a factual presence preset.');
requireIncludes(shell, "label:'Playful'", 'Role profiles must include a playful presence preset without adding toolbar clutter.');
requireIncludes(shell, 'max_tokens:answerTokenBudget()', 'Answer style must cap response size instead of only changing visible labels.');
requireIncludes(renderPinnedToolbarTools, 'data-p0-toolbar-tool', 'Pinned tools must render as toolbar actions only after user opt-in.');
requireIncludes(handleMenuAction, "actionId.startsWith('pin-toolbar-tool:')", 'Menu actions must handle toolbar pinning.');
requireIncludes(handleMenuAction, "actionId.startsWith('unpin-toolbar-tool:')", 'Menu actions must handle toolbar removal.');
requireIncludes(handleToolbarTool, "runTwoModelTool('discuss-topic')", 'Toolbar discussion must reuse the proven two-model route.');
requireIncludes(handleToolbarTool, 'fastAnswer();', 'Toolbar lightning must trigger fast answer mode.');
requireIncludes(handleToolbarTool, 'freshStart();', 'Toolbar flame must trigger fresh start.');
requireIncludes(handleToolbarTool, 'saveMemorySnapshot();', 'Toolbar brain must save memory locally.');
requireIncludes(handleToolbarTool, 'stopActiveResponse();', 'Toolbar stop must reuse the active abort path.');
requireIncludes(shell, 'function fastAnswerPrompt(prompt)', 'Fast answer must keep a dedicated short-answer prompt wrapper.');
requireIncludes(shell, 'state.fastAnswerOnce=false;', 'Fast answer must be a one-shot mode, not a hidden permanent setting.');
requireIncludes(updateSendControl, 'updatePinnedToolbarToolStates();', 'Pinned stop state must track the active send/stop state.');
requireIncludes(css, '.p0-toolbar-tools', 'CSS must keep optional tools aligned in the composer toolbar.');
requireIncludes(css, '.p0-toolbar-tool:disabled', 'CSS must make inactive optional tools visibly subtle.');
requireIncludes(icons, "const flame='", 'Icon helper must provide flame icon.');
requireIncludes(icons, "const bubbles='", 'Icon helper must provide discussion bubbles icon.');
requireIncludes(icons, "const brain='", 'Icon helper must provide memory brain icon.');
requireIncludes(icons, "const stop='", 'Icon helper must provide stop icon.');
requireIncludes(icons, "const lightning='", 'Icon helper must provide lightning icon.');
requireIncludes(html, 'p0-chat-shell.js?v=20260613-provider-candidate-polish-v1', 'Public page must cache-bust the toolbar runtime.');
requireIncludes(html, 'p0-chat-shell.css?v=20260613-visible-provider-candidates-v1', 'Public page must cache-bust the toolbar CSS.');
requireIncludes(html, 'p0-icons.js?v=20260611-lightning-toolbar-icons-v1', 'Public page must cache-bust toolbar icons.');
requireIncludes(manifest, '"p0-chat-shell.js": "20260613-provider-candidate-polish-v1"', 'Asset manifest must track toolbar runtime version.');
requireIncludes(manifest, '"p0-chat-shell.css": "20260613-visible-provider-candidates-v1"', 'Asset manifest must track toolbar CSS version.');
requireIncludes(manifest, '"p0-icons.js": "20260611-lightning-toolbar-icons-v1"', 'Asset manifest must track toolbar icons version.');

if (failures.length) {
  console.error('P0 custom toolbar tools smoke failed:');
  failures.forEach(failure => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 custom toolbar tools smoke passed.');
