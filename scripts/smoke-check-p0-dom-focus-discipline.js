#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const publicDir = join(root, 'public');
const portalDir = join(publicDir, 'apps', 'mimir-chat-portal');
const html = readFileSync(join(publicDir, 'mmir.html'), 'utf8');
const p0Runtime = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const p0Css = readFileSync(join(portalDir, 'p0-chat-shell.css'), 'utf8');
const guard = readFileSync(join(portalDir, 'public-launch-guard.js'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function count(source, pattern) {
  return Array.from(source.matchAll(pattern)).length;
}

function requireCount(source, pattern, expected, message) {
  const found = count(source, pattern);
  if (found !== expected) fail(`${message} Expected ${expected}, found ${found}.`);
}

function requireText(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

const shellMatch = p0Runtime.match(/app\.innerHTML=''\+([\s\S]*?)document\.body\.appendChild\(app\);/);
if (!shellMatch) {
  fail('P0 runtime must keep the first-screen app shell in installShell() for static DOM discipline checks.');
}

const shellSource = shellMatch?.[1] || '';

requireCount(shellSource, /id="p0-input"/g, 1, 'P0 shell must have exactly one first-screen chat input.');
requireCount(shellSource, /id="p0-send"/g, 1, 'P0 shell must have exactly one first-screen send control.');
requireCount(shellSource, /id="p0-composer"/g, 1, 'P0 shell must have exactly one first-screen composer form.');
requireCount(shellSource, /id="p0-transcript"/g, 1, 'P0 shell must have exactly one answer transcript pane.');
requireCount(shellSource, /id="p0-add-menu" class="p0-menu"[^>]* hidden/g, 1, 'P0 add menu must start hidden.');
requireCount(shellSource, /id="p0-model-menu" class="p0-menu"[^>]* hidden/g, 1, 'P0 model menu must start hidden.');
requireCount(shellSource, /id="p0-privacy-menu" class="p0-menu"[^>]* hidden/g, 1, 'P0 privacy menu must start hidden.');

if (/id="mimir-prompt"|id="primary-chat-link"|class="mimir-composer"/.test(shellSource)) {
  fail('P0 shell must not render legacy composer/input/send controls inside the first-screen app.');
}

requireText(html, '<body class="mimir-public-chat mimir-chat-first mmir-p0-ready">', 'Public page must start with the P0-ready body class so legacy UI is hidden at first paint.');
requireText(p0Css, 'body.mmir-p0-ready > :not(#mmir-p0-app)', 'P0 CSS must hide every legacy sibling outside the P0 app.');
requireText(p0Css, 'display: none !important;', 'P0 legacy sibling hide rule must be hard to override accidentally.');

const gatedTags = Array.from(html.matchAll(/<([a-z][\w:-]*)([^>]*\sdata-mimir-capability-state=["'](planned|parked|advanced|lab)["'][^>]*)>/gi));
if (!gatedTags.length) fail('Expected gated capability panels in public/mmir.html.');

for (const match of gatedTags) {
  const tag = match[0];
  const id = (tag.match(/\sid=["']([^"']+)["']/i) || [])[1] || match[1];
  const state = match[3];
  if (!/\shidden(?:\s|>|=)/i.test(tag)) fail(`${id} (${state}) must start hidden.`);
  if (/\sopen(?:\s|>|=)/i.test(tag)) fail(`${id} (${state}) must not start open.`);
}

requireText(guard, 'node.hidden=true', 'Public launch guard must force hidden on unproven panels.');
requireText(guard, 'node.inert=true', 'Public launch guard must mark unproven panels inert so their children cannot receive focus.');
requireText(guard, "node.setAttribute('aria-hidden','true')", 'Public launch guard must mark unproven panels aria-hidden.');

if (!String(packageJson.scripts?.check || '').includes('smoke-check-p0-dom-focus-discipline.js')) {
  fail('npm run check must include smoke-check-p0-dom-focus-discipline.js.');
}

if (failures.length) {
  console.error('P0 DOM focus discipline smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`P0 DOM focus discipline smoke passed with ${gatedTags.length} gated panels hidden and inert.`);
