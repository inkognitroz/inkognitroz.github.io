import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const publicDir = join(resolve(root, 'public'));
const html = readFileSync(join(publicDir, 'mmir.html'), 'utf8');
const shell = readFileSync(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'), 'utf8');
const helper = readFileSync(join(publicDir, 'apps', 'mimir-chat-portal', 'p0-menu.js'), 'utf8');
const assetVersions = readFileSync(join(publicDir, 'apps', 'mimir-chat-portal', 'asset-versions.json'), 'utf8');
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

const helperIndex = html.indexOf('p0-menu.js?v=20260606-b1-06-p0-menu-v1');
const shellIndex = html.indexOf('p0-chat-shell.js?v=20260614-wow-demo-memory-boost-v1');

if (helperIndex < 0) fail('mmir.html must load the P0 menu helper.');
if (shellIndex < 0) fail('mmir.html must cache-bust the P0 shell for the menu-helper slice.');
if (helperIndex >= 0 && shellIndex >= 0 && helperIndex > shellIndex) {
  fail('P0 menu helper must load before the P0 shell.');
}

requireIncludes(helper, 'window.MimirP0Menu', 'P0 menu helper must expose window.MimirP0Menu.');
requireIncludes(helper, 'function button(action,label,detail=\'\',options={})', 'P0 menu helper must own button rendering.');
requireIncludes(helper, 'data-p0-action', 'P0 menu helper must own P0 action attribute rendering.');
requireIncludes(helper, 'replaceAll(\'&\',\'&amp;\')', 'P0 menu helper must escape text.');
requireIncludes(shell, 'window.MimirP0Menu.button(action,title,detail,options)', 'P0 shell must delegate menu button rendering to the helper.');
requireIncludes(shell, 'window.MimirP0Menu.title(text)', 'P0 shell must delegate menu title rendering to the helper.');
forbidPattern(shell, /data-p0-action=["']/i, 'P0 shell must not own raw menu action button HTML.');
requireIncludes(assetVersions, '"p0-menu.js": "20260606-b1-06-p0-menu-v1"', 'Asset manifest must track the P0 menu helper.');
requireIncludes(assetVersions, '"p0-chat-shell.js": "20260614-wow-demo-memory-boost-v1"', 'Asset manifest must track the P0 shell helper slice.');
if (!String(packageJson.scripts?.check || '').includes('smoke-check-p0-menu-helper.js')) {
  fail('npm run check must include smoke-check-p0-menu-helper.js.');
}

if (failures.length) {
  console.error('P0 menu helper smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 menu helper smoke passed.');
