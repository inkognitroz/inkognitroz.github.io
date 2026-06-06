#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const html = readFileSync(join(root, 'public', 'mmir.html'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function indexOfAsset(asset) {
  const index = html.indexOf(asset);
  if (index < 0) fail(`public/mmir.html must reference ${asset}.`);
  return index;
}

const routeDisplayIndex = indexOfAsset('route-display.js');
const consumers = [
  'p0-chat-shell.js',
  'active-node-strip.js',
  'first-impression.js',
  'chat-runtime.js',
  'composer-model-picker.js',
  'composer-quick-actions.js',
  'route-chips.js'
];

for (const consumer of consumers) {
  const consumerIndex = indexOfAsset(consumer);
  if (routeDisplayIndex >= 0 && consumerIndex >= 0 && routeDisplayIndex > consumerIndex) {
    fail(`route-display.js must load before ${consumer}.`);
  }
}

if (!String(packageJson.scripts?.check || '').includes('smoke-check-route-display-load-order.js')) {
  fail('npm run check must include smoke-check-route-display-load-order.js.');
}

if (failures.length) {
  console.error('Route display load-order smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('route display load-order smoke: ok');
