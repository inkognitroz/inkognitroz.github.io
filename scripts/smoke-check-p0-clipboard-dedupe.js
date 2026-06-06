import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const shell = readFileSync(join(root, 'public/apps/mimir-chat-portal/p0-chat-shell.js'), 'utf8');
const helper = readFileSync(join(root, 'public/apps/mimir-chat-portal/p0-clipboard.js'), 'utf8');
const html = readFileSync(join(root, 'public/mmir.html'), 'utf8');
const manifest = readFileSync(join(root, 'public/apps/mimir-chat-portal/asset-versions.json'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function functionBody(name) {
  const marker = `function ${name}`;
  const start = shell.indexOf(marker);
  if (start < 0) fail(`${name} not found`);
  const nextFunction = shell.indexOf('\n  function ', start + marker.length);
  return shell.slice(start, nextFunction > start ? nextFunction : shell.length);
}

const writeClipboard = functionBody('writeClipboard');
const copyCommand = functionBody('copyCommand');

if (!helper.includes("version='20260606-b1-06-p0-clipboard-v1'")) {
  fail('P0 clipboard helper version must be explicit.');
}
if (!helper.includes('navigator.clipboard?.writeText')) {
  fail('P0 clipboard helper must own navigator clipboard writes.');
}
if (!helper.includes("document.createElement('textarea')")) {
  fail('P0 clipboard helper must own textarea fallback copy.');
}
if (!shell.includes('const P0_CLIPBOARD=window.MimirP0Clipboard||{};')) {
  fail('P0 shell must read the shared clipboard helper.');
}
if (!writeClipboard.includes('P0_CLIPBOARD.writeText?.(text)')) {
  fail('writeClipboard must delegate to the P0 clipboard helper.');
}
if (writeClipboard.includes('navigator.clipboard') || writeClipboard.includes("document.createElement('textarea')")) {
  fail('writeClipboard must not duplicate clipboard or textarea fallback logic.');
}
if (!copyCommand.includes('await writeClipboard(command)')) {
  fail('copyCommand must delegate copy work to writeClipboard.');
}
if (copyCommand.includes('navigator.clipboard') || copyCommand.includes("document.createElement('textarea')")) {
  fail('copyCommand must not duplicate clipboard or textarea fallback logic.');
}
if (!copyCommand.includes('selectCommandText(trigger)')) {
  fail('copyCommand must still fall back to selecting the visible command.');
}
if (!html.includes('p0-clipboard.js?v=20260606-b1-06-p0-clipboard-v1')) {
  fail('Public MMIR shell must load p0-clipboard.js with a cache-busted version.');
}
if (html.indexOf('p0-clipboard.js?v=20260606-b1-06-p0-clipboard-v1') > html.indexOf('p0-chat-shell.js?v=')) {
  fail('P0 clipboard helper must load before the P0 shell.');
}
if (!manifest.includes('"p0-clipboard.js": "20260606-b1-06-p0-clipboard-v1"')) {
  fail('Asset manifest must track p0-clipboard.js.');
}
if (!String(packageJson.scripts?.check || '').includes('smoke-check-p0-clipboard-dedupe.js')) {
  fail('npm run check must include smoke-check-p0-clipboard-dedupe.js.');
}

console.log('P0 clipboard dedupe smoke passed.');
