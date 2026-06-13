import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const p0Shell = readFileSync(
  join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'),
  'utf8'
);
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function requireOrder(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex > secondIndex) fail(message);
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

const startInstallSource = functionSource('startLocalInstallAssistant', 'selectCommandText');
const handleMenuSource = functionSource('handleMenuAction', 'renderMessageTools');
const renderToolsSource = functionSource('renderMessageTools', 'renderTranscript');
const transientSource = functionSource('transientInstallMessage', 'safeText');

requireIncludes(
  p0Shell,
  'const LOCAL_INSTALL_COMMANDS=window.MimirLocalInstallCommands||{};',
  'P0 local-node onboarding must consume the shared local install command helper.'
);
requireIncludes(
  p0Shell,
  'LOCAL_INSTALL_COMMANDS.commandFor?.(os)',
  'P0 local install flow must ask the shared helper for the OS-specific command.'
);
requireIncludes(
  p0Shell,
  'LOCAL_INSTALL_COMMANDS.detectOs?.()',
  'P0 local install flow must delegate OS detection to the shared helper.'
);
requireIncludes(
  p0Shell,
  'LOCAL_INSTALL_COMMANDS.introFor?.(os)',
  'P0 local install flow must delegate install copy to the shared helper.'
);
requireIncludes(
  p0Shell,
  'localInstallIntro(os)+\'\\n\\n\'+localInstallReturnInstruction()',
  'Mac onboarding must stay plain-language, helper-owned and chat-native.'
);
requireIncludes(
  p0Shell,
  'After it says "MMIR Local Connector is ready", return here and press + -> Refresh models.',
  'Install instructions must tell the user exactly how to return to model discovery.'
);

requireIncludes(
  handleMenuSource,
  "if(action==='connect-local')",
  '+ -> Connect local model must remain a first-class menu action.'
);
requireOrder(
  handleMenuSource,
  "if(action==='connect-local')",
  'startLocalInstallAssistant();',
  '+ -> Connect local model must call the chat-native install assistant.'
);
requireOrder(
  handleMenuSource,
  "if(action==='check-local')",
  'checkLocalModels().catch(()=>{});',
  '+ -> Refresh models must stay a separate explicit discovery step after install.'
);
forbidPattern(
  handleMenuSource,
  /window\.open|location\.href|location\.assign|mmir-local-connector-install|\.zip|\.command/i,
  '+ menu local onboarding must not redirect to installer pages, ZIPs or unsigned .command files.'
);

requireIncludes(
  startInstallSource,
  "variant:'install'",
  'Install assistant messages must be typed as transient install messages.'
);
requireIncludes(
  startInstallSource,
  'command,',
  'Install assistant must attach the command to the chat message.'
);
requireIncludes(
  startInstallSource,
  "commandLabel:'Copy command'",
  'Install assistant must show one obvious copy command action.'
);
requireIncludes(
  startInstallSource,
  'installOs:os',
  'Install assistant must keep OS metadata on the install command card.'
);
requireIncludes(
  startInstallSource,
  'showOsChoices:true',
  'Install assistant must ask for Mac/Windows/Linux in chat when OS detection is uncertain.'
);
requireIncludes(
  startInstallSource,
  "status('Local connector command ready.','ready')",
  'Install assistant must provide immediate ready feedback after showing the command.'
);
requireIncludes(
  startInstallSource,
  "routeStatus('Copy install command · local setup','hosted')",
  'Install assistant must update the compact route/status line instead of opening another page.'
);
forbidPattern(
  startInstallSource,
  /window\.open|location\.href|location\.assign|mmir-local-connector-install|\.zip|\.command/i,
  'Chat-native install assistant must not redirect to installer pages, ZIPs or unsigned .command files.'
);

requireIncludes(
  renderToolsSource,
  'class="p0-command-card"',
  'Install commands must render as a compact command card in the chat answer.'
);
requireIncludes(
  renderToolsSource,
  'data-p0-copy-command',
  'Install command cards must expose a copy button.'
);
for (const os of ['mac', 'windows', 'linux']) {
  requireIncludes(
    renderToolsSource,
    `data-p0-os-command="${os}"`,
    `Install assistant must expose the ${os} OS choice in chat.`
  );
}
requireIncludes(
  transientSource,
  'P0_HISTORY.transientInstallMessage(message)',
  'Install helper messages must not be persisted as first-screen chat history.'
);

if (failures.length) {
  console.error('P0 chat-native local install smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 chat-native local install smoke passed.');
