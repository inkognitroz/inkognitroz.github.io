#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const publicDir = join(root, 'public');
const portalDir = join(publicDir, 'apps', 'mimir-chat-portal');
const html = readFileSync(join(publicDir, 'mmir.html'), 'utf8');
const sw = readFileSync(join(publicDir, 'sw.js'), 'utf8');
const manifest = JSON.parse(readFileSync(join(portalDir, 'asset-versions.json'), 'utf8'));
const assets = manifest.assets || {};

const knownUnversioned = new Set([
  'answer-context-receipts.js',
  'composer-autofocus.js',
  'composer-autosize.js',
  'composer-keyboard-shortcuts.js',
  'composer-new-chat.js',
  'composer-refocus-after-send.js',
  'composer-stop-handoff.js',
  'context-controls.js',
  'message-actions.js',
  'model-selection.js',
  'node-dashboard.css',
  'platform-status.css',
  'pwa.css',
  'pwa.js',
  'repair-resume.css',
  'transcript-scroll-guard.js'
]);

const failures = [];

function fail(message) {
  failures.push(message);
}

function assetName(rawRef) {
  const path = String(rawRef || '').replace(/^\.\/apps\/mimir-chat-portal\//, '');
  return path.split('?')[0];
}

function assertPortalAssetExists(name, source) {
  if (!existsSync(join(portalDir, name))) {
    fail(`${source} references missing portal asset: ${name}`);
  }
}

const htmlRefs = Array.from(html.matchAll(/["'](\.\/apps\/mimir-chat-portal\/[^"']+)["']/g)).map((match) => match[1]);
for (const ref of htmlRefs) {
  const name = assetName(ref);
  assertPortalAssetExists(name, 'public/mmir.html');
  if (ref.includes('?v=')) continue;
  if (!knownUnversioned.has(name)) {
    fail(`public/mmir.html has unversioned portal asset without documented exemption: ${name}`);
  }
}

const shellAssetMatch = sw.match(/const SHELL_ASSETS=\[([\s\S]*?)\];/);
if (!shellAssetMatch) {
  fail('public/sw.js must define SHELL_ASSETS.');
} else {
  const shellRefs = Array.from(shellAssetMatch[1].matchAll(/'(\.\/apps\/mimir-chat-portal\/[^']+)'/g)).map((match) => match[1]);
  for (const ref of shellRefs) {
    const name = assetName(ref);
    assertPortalAssetExists(name, 'public/sw.js SHELL_ASSETS');
    if (!assets[name] && !knownUnversioned.has(name)) {
      fail(`public/sw.js caches portal asset without manifest entry or documented exemption: ${name}`);
    }
  }
}

if (!html.includes('id="mimir-deferred-scripts"')) {
  fail('public/mmir.html must keep deferred script queue explicitly identifiable.');
}

if (failures.length) {
  console.error('Deferred asset discipline smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Deferred asset discipline smoke passed with ${knownUnversioned.size} documented unversioned exemptions.`);
