#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const publicDir = join(root, 'public');
const portalDir = join(publicDir, 'apps', 'mimir-chat-portal');
const helperPath = join(portalDir, 'local-install-commands.js');
const p0Path = join(portalDir, 'p0-chat-shell.js');
const previewPath = join(portalDir, 'design-preview.js');
const previewHtmlPath = join(portalDir, 'design-preview.html');
const mmirHtmlPath = join(publicDir, 'mmir.html');
const manifestPath = join(portalDir, 'asset-versions.json');
const packagePath = join(root, 'package.json');
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(path) {
  return readFileSync(path, 'utf8');
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function requireOrder(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex > secondIndex) fail(message);
}

const helper = read(helperPath);
const p0Shell = read(p0Path);
const preview = read(previewPath);
const previewHtml = read(previewHtmlPath);
const mmirHtml = read(mmirHtmlPath);
const manifest = JSON.parse(read(manifestPath));
const packageJson = JSON.parse(read(packagePath));

requireIncludes(helper, 'window.MimirLocalInstallCommands', 'Local install command helper must expose a shared browser API.');
requireIncludes(helper, 'commandFor', 'Local install command helper must expose commandFor(os).');
requireIncludes(helper, 'detectOs', 'Local install command helper must own browser OS detection.');
requireIncludes(helper, 'introFor', 'Local install command helper must own chat-native install copy.');
requireIncludes(helper, 'returnInstruction', 'Local install command helper must own post-install return copy.');
requireIncludes(helper, 'curl -fsSL https://mmir.ai/downloads/mmir-local-node-macos-linux.sh | bash', 'Helper must own the canonical Mac/Linux command.');
requireIncludes(helper, 'mmir-local-node-windows.ps1', 'Helper must own the canonical Windows command.');
requireIncludes(p0Shell, 'window.MimirLocalInstallCommands', 'P0 shell must consume the shared local install helper.');
requireIncludes(p0Shell, 'LOCAL_INSTALL_COMMANDS.detectOs?.()', 'P0 shell must delegate OS detection to the local install helper.');
requireIncludes(p0Shell, 'LOCAL_INSTALL_COMMANDS.introFor?.(os)', 'P0 shell must delegate install copy to the local install helper.');
requireIncludes(preview, 'window.MimirLocalInstallCommands', 'Design preview must consume the shared local install helper.');
requireIncludes(previewHtml, './local-install-commands.js', 'Design preview must load the shared helper before its preview JS.');
requireOrder(previewHtml, './local-install-commands.js', './design-preview.js', 'Design preview helper must load before preview JS.');
requireIncludes(mmirHtml, 'local-install-commands.js', 'Public MMIR shell must load the shared local install helper.');
requireOrder(mmirHtml, 'local-install-commands.js', 'p0-chat-shell.js', 'Public MMIR shell must load install helper before P0 shell.');

if (manifest.assets?.['local-install-commands.js'] !== '20260707-one-window-shell-v1') {
  fail('Asset manifest must version local-install-commands.js.');
}
if (!String(packageJson.scripts?.check || '').includes('smoke-check-local-install-commands-helper.js')) {
  fail('npm run check must include smoke-check-local-install-commands-helper.js.');
}

const context = {
  window: {
    dispatchEvent(event) {
      this.lastEvent = event;
    }
  },
  CustomEvent: class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail || {};
    }
  }
};
vm.createContext(context);
vm.runInContext(helper, context, { filename: 'local-install-commands.js' });
const api = context.window.MimirLocalInstallCommands;
if (!api || api.commandFor('mac') !== api.macLinux || api.commandFor('linux') !== api.macLinux) {
  fail('Shared helper must return the Mac/Linux command for macOS and Linux.');
}
if (!api || !api.introFor('mac').includes('Do you have a Mac computer? Copy and paste this in Terminal')) {
  fail('Shared helper must return the chat-native Mac install intro.');
}
if (!api || !api.returnInstruction().includes('press ⚙ -> Oppdater AI')) {
  fail('Shared helper must return the post-install refresh instruction.');
}
if (!api || !api.commandFor('windows').includes('mmir-local-node-windows.ps1')) {
  fail('Shared helper must return the Windows PowerShell command.');
}
if (!api || api.commandFor('unknown') !== '') {
  fail('Shared helper must return an empty command for unknown OS.');
}
if (context.window.lastEvent?.type !== 'mimir-local-install-commands-ready') {
  fail('Shared helper must emit readiness evidence.');
}

if (failures.length) {
  console.error('Local install command helper smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('local install command helper smoke: ok');
