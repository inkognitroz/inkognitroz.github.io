#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const publicDir = join(root, 'public');
const portalDir = join(publicDir, 'apps', 'mimir-chat-portal');
const html = readFileSync(join(publicDir, 'mmir.html'), 'utf8');
const source = readFileSync(join(portalDir, 'brand-config.js'), 'utf8');
const manifest = readFileSync(join(portalDir, 'asset-versions.json'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireIncludes(value, needle, message) {
  if (!value.includes(needle)) fail(message);
}

function requireOrder(value, before, after, message) {
  const beforeIndex = value.indexOf(before);
  const afterIndex = value.indexOf(after);
  if (beforeIndex < 0 || afterIndex < 0 || beforeIndex > afterIndex) fail(message);
}

for (const field of [
  'name',
  'tagline',
  'theme',
  'icon',
  'starter_prompts',
  'feature_flags',
  'policy_profile',
  'default_route_label',
  'default_model_label'
]) {
  requireIncludes(source, "'" + field + "'", 'Brand contract must include required field: ' + field);
}

for (const brand of ['mmir', 'supergeni', 'skolechatten', 'spakona']) {
  requireIncludes(source, brand + ':{', 'Brand registry must include ' + brand + '.');
}

requireIncludes(source, 'MimirBrandRegistry', 'Brand config must publish a public registry for smoke tests and debugging.');
requireIncludes(source, 'MimirBrandConfig', 'Brand config must publish the active brand config.');
requireIncludes(source, 'no_provider_secrets_in_browser:true', 'Brand config must make the no-provider-secrets contract explicit.');
requireIncludes(source, 'no_orchestration_decisions_in_browser:true', 'Brand config must keep orchestration out of the browser.');
requireIncludes(source, "preview_url:'./mmir.html?brand=supergeni'", 'A second brand preview URL must be documented.');
requireIncludes(html, 'data-brand-field="name"', 'MMIR shell must expose brand name binding.');
requireIncludes(html, 'data-brand-field="tagline"', 'MMIR shell must expose tagline binding.');
requireIncludes(html, 'brand-config.js?v=20260710-brand-config-contract-v1', 'Public shell must load brand config with cache-busted version.');
requireOrder(html, 'brand-config.js?v=20260710-brand-config-contract-v1', 'p0-chat-shell.js?v=', 'Brand config must load before the protected P0 shell.');
requireIncludes(manifest, '"brand-config.js": "20260710-brand-config-contract-v1"', 'Asset manifest must track brand-config.js.');

if (!String(packageJson.scripts?.check || '').includes('smoke-check-brand-config-contract.js')) {
  fail('npm run check must include smoke-check-brand-config-contract.js.');
}

const forbiddenSecretPatterns = [
  /sk-[A-Za-z0-9_-]{16,}/,
  /AIza[0-9A-Za-z_-]{20,}/,
  /ghp_[0-9A-Za-z]{20,}/,
  /AWS_SECRET_ACCESS_KEY/,
  /CLOUDFLARE_API_TOKEN/,
  /BEGIN PRIVATE KEY/,
  /password\s*[:=]\s*['"][^'"]+['"]/i
];
for (const pattern of forbiddenSecretPatterns) {
  if (pattern.test(source)) fail('Brand config must not contain secret-shaped values: ' + pattern);
}

console.log('Brand config contract smoke passed.');
