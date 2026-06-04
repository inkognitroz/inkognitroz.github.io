#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const portalDir = join(root, 'public', 'apps', 'mimir-chat-portal');
const runtimeHotfix = readFileSync(join(portalDir, 'runtime-controls-fix.js'), 'utf8');
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
requireText(runtimeHotfix, "d.body?.classList.contains('mmir-p0-ready')&&q('#mmir-p0-app')", 'p0ReadyShell() must require both the P0-ready body class and the P0 app root.');
requireText(runtimeHotfix, "if(p0ReadyShell()){d.body?.classList.remove('mimir-clean-chat-shell','mimir-send-in-dock');return}", 'Runtime hotfix must return before legacy cleanShell/dock mutation when the P0 shell is ready.');

if (!normalized.includes("functionrun(){if(p0ReadyShell()){d.body?.classList.remove('mimir-clean-chat-shell','mimir-send-in-dock');return}cleanShell();fixSend();dockPrimarySend();")) {
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

if (!String(packageJson.scripts?.check || '').includes('smoke-check-p0-hotfix-noninterference.js')) {
  fail('npm run check must include smoke-check-p0-hotfix-noninterference.js.');
}

if (failures.length) {
  console.error('P0 hotfix non-interference smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('P0 hotfix non-interference smoke passed.');
