#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const portalDir = join(root, 'public', 'apps', 'mimir-chat-portal');
const runtimeHotfix = readFileSync(join(portalDir, 'runtime-controls-fix.js'), 'utf8');
const chatRuntime = readFileSync(join(portalDir, 'chat-runtime.js'), 'utf8');
const p0Runtime = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function count(source, pattern) {
  return Array.from(source.matchAll(pattern)).length;
}

function requireText(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

const normalized = runtimeHotfix.replace(/\s+/g, '');

requireText(runtimeHotfix, 'function p0ReadyShell()', 'Runtime controls hotfix must expose p0ReadyShell().');
if (
  !normalized.includes("d.body?.classList.contains('mmir-p0-ready')&&q('#mmir-p0-app')") &&
  !normalized.includes('d.body?.classList.contains("mmir-p0-ready")&&q("#mmir-p0-app")')
) {
  fail('p0ReadyShell() must require both the P0-ready body class and the P0 app root.');
}
if (
  !normalized.includes("if(p0ReadyShell()){d.body?.classList.remove('mimir-clean-chat-shell','mimir-send-in-dock');return;}") &&
  !normalized.includes('if(p0ReadyShell()){d.body?.classList.remove("mimir-clean-chat-shell","mimir-send-in-dock");return;}') &&
  !normalized.includes("if(p0ReadyShell()){d.body?.classList.remove('mimir-clean-chat-shell','mimir-send-in-dock');return}") &&
  !normalized.includes('if(p0ReadyShell()){d.body?.classList.remove("mimir-clean-chat-shell","mimir-send-in-dock");return}')
) {
  fail('Runtime hotfix must return before legacy cleanShell/dock mutation when the P0 shell is ready.');
}

if (
  !normalized.includes("functionrun(){if(p0ReadyShell()){d.body?.classList.remove('mimir-clean-chat-shell','mimir-send-in-dock');return;}cleanShell();fixSend();dockPrimarySend();") &&
  !normalized.includes('functionrun(){if(p0ReadyShell()){d.body?.classList.remove("mimir-clean-chat-shell","mimir-send-in-dock");return;}cleanShell();fixSend();dockPrimarySend();') &&
  !normalized.includes("functionrun(){if(p0ReadyShell()){d.body?.classList.remove('mimir-clean-chat-shell','mimir-send-in-dock');return}cleanShell();fixSend();dockPrimarySend();") &&
  !normalized.includes('functionrun(){if(p0ReadyShell()){d.body?.classList.remove("mimir-clean-chat-shell","mimir-send-in-dock");return}cleanShell();fixSend();dockPrimarySend();')
) {
  fail('Runtime hotfix run() must keep the P0-ready return before cleanShell(), fixSend() and dockPrimarySend().');
}

if (count(runtimeHotfix, /cleanShell\(/g) !== 2) {
  fail('cleanShell() should appear only as its function declaration and the guarded run() call.');
}

if (count(runtimeHotfix, /dockPrimarySend\(/g) !== 2) {
  fail('dockPrimarySend() should appear only as its function declaration and the guarded run() call.');
}

if (count(runtimeHotfix, /mmir-clean-chat-shell-hotfix/g) !== 2) {
  fail('The legacy hotfix style id should only be queried/created inside cleanShell().');
}

requireText(p0Runtime, "document.body.classList.remove('mimir-p0-ready')", 'P0 runtime must remove the legacy misspelled ready class.');
requireText(p0Runtime, "document.body.classList.add('mmir-p0-ready')", 'P0 runtime must add the CSS-backed ready class used by the hotfix guard.');

requireText(chatRuntime, 'function p0ReadyShell()', 'Legacy chat runtime must expose p0ReadyShell().');
requireText(chatRuntime, "document.body?.classList.contains('mmir-p0-ready')||document.getElementById('mmir-p0-app')", 'Legacy chat runtime P0 guard must stop when the first-paint P0 body class or P0 app root is present.');
requireText(chatRuntime, 'if(p0ReadyShell()){', 'Legacy chat runtime init() must check the P0 guard before binding legacy controls.');
requireText(chatRuntime, 'window.__MimirLegacyRuntimeSkippedForP0=true', 'Legacy chat runtime must leave an observable skip marker when P0 owns the launch path.');
requireText(chatRuntime, "document.body.dataset.mimirLegacyRuntime='skipped-p0'", 'Legacy chat runtime must leave a DOM-visible skip marker when P0 owns the launch path.');
requireText(chatRuntime, "new CustomEvent('mmir-legacy-runtime-skipped',{detail:{reason:'p0-ready-shell'}})", 'Legacy chat runtime must emit an observable skip event when P0 owns the launch path.');

const initIndex = chatRuntime.indexOf('function init(){');
const guardIndex = chatRuntime.indexOf('if(p0ReadyShell()){', initIndex);
const installIndex = chatRuntime.indexOf('installRuntimeUi();', initIndex);
const bindClickIndex = chatRuntime.indexOf("primaryLink.addEventListener('click'", initIndex);
if (initIndex === -1 || guardIndex === -1 || installIndex === -1 || bindClickIndex === -1) {
  fail('Legacy chat runtime init() must keep P0 guard, installRuntimeUi() and primary send binding discoverable.');
} else {
  if (guardIndex > installIndex) fail('Legacy chat runtime P0 guard must run before installRuntimeUi().');
  if (guardIndex > bindClickIndex) fail('Legacy chat runtime P0 guard must run before primary legacy send binding.');
}

if (!String(packageJson.scripts?.check || '').includes('smoke-check-p0-hotfix-noninterference.js')) {
  fail('npm run check must include smoke-check-p0-hotfix-noninterference.js.');
}

if (failures.length) {
  console.error('P0 hotfix non-interference smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('P0 hotfix non-interference smoke passed.');
