import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const shell = readFileSync(join(root, 'public/apps/mimir-chat-portal/p0-chat-shell.js'), 'utf8');
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

if (!writeClipboard.includes('navigator.clipboard?.writeText')) {
  fail('writeClipboard must own navigator clipboard writes.');
}
if (!writeClipboard.includes("document.createElement('textarea')")) {
  fail('writeClipboard must own textarea fallback copy.');
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
if (!String(packageJson.scripts?.check || '').includes('smoke-check-p0-clipboard-dedupe.js')) {
  fail('npm run check must include smoke-check-p0-clipboard-dedupe.js.');
}

console.log('P0 clipboard dedupe smoke passed.');
