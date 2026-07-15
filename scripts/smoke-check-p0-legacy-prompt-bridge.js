#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const shell = readFileSync(join(root, 'public', 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'utf8');
const refocus = readFileSync(join(root, 'public', 'apps', 'mimir-chat-portal', 'composer-refocus-after-send.js'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireText(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

requireText(shell, 'function bindLegacyPromptBridge()', 'P0 shell must keep the legacy prompt bridge.');
requireText(shell, "document.getElementById('mimir-prompt')", 'Bridge must find the hidden legacy #mimir-prompt field.');
requireText(shell, "document.getElementById('p0-input')", 'Bridge must sync into the visible P0 input.');
requireText(shell, "document.getElementById('primary-chat-link')?.addEventListener('click'", 'Bridge must intercept legacy send clicks.');
requireText(shell, "document.getElementById('new-backend')?.addEventListener('click'", 'Bridge must forward legacy tools clicks.');
requireText(shell, 'syncP0InputFromLegacy();', 'Bridge must copy legacy prompt text before P0 send.');
requireText(shell, 'syncLegacyPromptFromP0();', 'P0 input changes must keep legacy prompt value in sync.');
requireText(shell, 'bindLegacyPromptBridge();', 'P0 shell must bind the bridge during shell setup.');
requireText(shell, "form.addEventListener('keydown'", 'Visible composer Enter handling must be bound at form level.');
requireText(shell, "if(event.target!==input)return;", 'Form-level Enter handling must only act on the canonical P0 input.');
requireText(shell, "legacy.addEventListener('keydown'", 'Bridge must handle Enter from the legacy prompt during dual-input migration.');
requireText(shell, "if(event.key!=='Enter'||event.shiftKey||event.isComposing)return;", 'Legacy Enter handling must preserve newlines and IME composition.');
requireText(shell, 'syncP0InputFromLegacy();\n        if(state.busy)return;\n        sendMessage();', 'Legacy Enter must sync the active value before sending through the canonical P0 path.');
requireText(refocus, "event.key==='Enter'&&!event.shiftKey&&!event.isComposing", 'Composer refocus must not treat IME composition confirmation as a completed send.');

if (!String(packageJson.scripts?.check || '').includes('smoke-check-p0-legacy-prompt-bridge.js')) {
  fail('npm run check must include smoke-check-p0-legacy-prompt-bridge.js.');
}

if (failures.length) {
  console.error('P0 legacy prompt bridge smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('P0 legacy prompt bridge smoke passed.');
