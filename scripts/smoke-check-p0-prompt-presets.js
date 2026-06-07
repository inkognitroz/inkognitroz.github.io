import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const publicDir = join(resolve(root, 'public'));
const portalDir = join(publicDir, 'apps', 'mimir-chat-portal');
const p0Shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const html = readFileSync(join(publicDir, 'mmir.html'), 'utf8');
const assetVersions = readFileSync(join(portalDir, 'asset-versions.json'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
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

const renderAddMenuSource = functionSource('renderAddMenu', 'renderPromptPresetMenu');
const renderPromptMenuSource = functionSource('renderPromptPresetMenu', 'renderModelMenu');
const handleMenuSource = functionSource('handleMenuAction', 'saveCurrentPromptPreset');
const savePromptSource = functionSource('saveCurrentPromptPreset', 'loadPromptPreset');
const loadPromptSource = functionSource('loadPromptPreset', 'renderMessageTools');

requireIncludes(
  p0Shell,
  "const PROMPT_PRESETS_KEY='mmir-p0-prompt-presets-v1';",
  'Prompt presets must use an explicit browser-local storage key.'
);
requireIncludes(
  p0Shell,
  "const PROMPT_PRESETS_PATH='/prompts/presets';",
  'Prompt presets must consume the API preset catalog contract.'
);
requireIncludes(
  p0Shell,
  "const PROMPT_SAVE_PLAN_PATH='/prompts/save/plan';",
  'Prompt save UX must keep the API save-plan contract visible.'
);
requireIncludes(
  p0Shell,
  'DEFAULT_PROMPT_PRESETS',
  'Prompt presets need static safe fallbacks if api.mmir.ai is temporarily unreachable.'
);
requireIncludes(
  p0Shell,
  'function promptPresetApiFetchAllowed()',
  'Prompt preset API fetches must be origin-gated so localhost/dev renders stay console-clean.'
);
requireIncludes(
  p0Shell,
  "host==='mmir.ai'||host==='staging.mmir.ai'",
  'Prompt preset API fetches must be limited to production and staging browser origins.'
);

requireIncludes(
  renderAddMenuSource,
  "menuButton('prompt-presets','Prompts','Use or save starters in this browser.')",
  '+ menu must expose prompt presets only as a discrete submenu.'
);
requireIncludes(
  renderAddMenuSource,
  'Use or save starters in this browser.',
  'Prompt preset entry must tell the user it is browser-scoped.'
);
requireIncludes(
  renderPromptMenuSource,
  "menuButton('save-prompt-local','Save current prompt'",
  'Prompt preset submenu must support saving the current prompt.'
);
requireIncludes(
  renderPromptMenuSource,
  "menuButton('load-preset:'+preset.id",
  'Prompt preset submenu must support loading a preset into the composer.'
);
requireIncludes(
  renderPromptMenuSource,
  'Stores only in this browser, not on MMIR servers.',
  'Prompt save copy must explicitly avoid server-persistence claims.'
);
requireIncludes(
  handleMenuSource,
  "if(action==='prompt-presets')",
  '+ menu action must route to the prompt preset submenu.'
);
requireIncludes(
  handleMenuSource,
  "if(action==='save-prompt-local')",
  '+ menu action must route to browser-local prompt saving.'
);
requireIncludes(
  handleMenuSource,
  "startsWith('load-preset:')",
  '+ menu action must route preset loading by id, not by raw prompt in DOM.'
);
requireIncludes(
  savePromptSource,
  'writeSavedPromptPresets',
  'Saving a prompt must persist to browser-local storage.'
);
requireIncludes(
  savePromptSource,
  'Prompt saved · browser only · no server persistence',
  'Saving a prompt must show the privacy-preserving status line.'
);
requireIncludes(
  loadPromptSource,
  'input.value=preset.prompt_template',
  'Loading a preset must put the prompt into the composer.'
);
requireIncludes(
  loadPromptSource,
  'Prompt preset loaded · edit and send',
  'Loading a preset must tell the user what happened.'
);

forbidPattern(
  savePromptSource,
  /method\s*:\s*['"]POST['"][\s\S]*PROMPT_SAVE_PLAN_PATH|PROMPT_SAVE_PLAN_PATH[\s\S]*method\s*:\s*['"]POST['"]/,
  'Browser-local save must not POST raw prompt text to the save-plan API.'
);
forbidPattern(
  renderAddMenuSource,
  /Add photos|Upload file|Create image|Deep research|Web search/i,
  '+ menu must not re-expose unproven media, search or research capabilities while adding prompt presets.'
);

requireIncludes(
  html,
  'p0-chat-shell.js?v=',
  'mmir.html must cache-bust the P0 runtime that contains prompt presets.'
);
requireIncludes(
  assetVersions,
  '"p0-chat-shell.js":',
  'asset-versions.json must track the P0 runtime that contains prompt presets.'
);
requireIncludes(
  String(packageJson.scripts?.check || ''),
  'smoke-check-p0-prompt-presets.js',
  'npm run check must include the prompt preset smoke.'
);

if (failures.length) {
  console.error('P0 prompt preset smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 prompt preset smoke passed.');
