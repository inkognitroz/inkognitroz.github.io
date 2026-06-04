#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const publicDir = join(root, 'public');
const portalDir = join(publicDir, 'apps', 'mimir-chat-portal');
const mmirHtml = readFileSync(join(publicDir, 'mmir.html'), 'utf8');
const manifest = JSON.parse(readFileSync(join(portalDir, 'asset-versions.json'), 'utf8'));
const assets = manifest.assets || {};
const failures = [];

function fail(message) {
  failures.push(message);
}

function normalizeAsset(raw) {
  const match = raw.match(/\.\/apps\/mimir-chat-portal\/([^"']+?)\?v=([^"']+)/);
  if (!match) return null;
  return { path: match[1], version: match[2], raw };
}

const refs = Array.from(mmirHtml.matchAll(/["'](\.\/apps\/mimir-chat-portal\/[^"']+\?v=[^"']+)["']/g))
  .map((match) => normalizeAsset(match[1]))
  .filter(Boolean);

const seen = new Map();

for (const ref of refs) {
  if (!assets[ref.path]) {
    fail(`Missing manifest entry for ${ref.path}`);
    continue;
  }
  if (assets[ref.path] !== ref.version) {
    fail(`Version drift for ${ref.path}: mmir.html=${ref.version} manifest=${assets[ref.path]}`);
  }
  const prior = seen.get(ref.path);
  if (prior && prior !== ref.version) {
    fail(`Multiple versions for ${ref.path}: ${prior} and ${ref.version}`);
  }
  seen.set(ref.path, ref.version);
}

for (const [asset, version] of Object.entries(assets)) {
  if (!/^[0-9]{8}-[a-z0-9-]+$/i.test(version)) {
    fail(`Unexpected version format for ${asset}: ${version}`);
  }
  if (!seen.has(asset)) {
    fail(`Manifest entry is not referenced by public/mmir.html: ${asset}`);
  }
}

if (!refs.length) {
  fail('No versioned MMIR chat assets found in public/mmir.html');
}

if (failures.length) {
  console.error('Asset version manifest smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Asset version manifest smoke passed.');
