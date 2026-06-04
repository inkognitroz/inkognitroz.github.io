#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const publicDir = join(root, 'public');
const portalDir = join(publicDir, 'apps', 'mimir-chat-portal');
const html = readFileSync(join(publicDir, 'mmir.html'), 'utf8');
const guard = readFileSync(join(portalDir, 'public-launch-guard.js'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const assetVersions = JSON.parse(readFileSync(join(portalDir, 'asset-versions.json'), 'utf8')).assets || {};
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireText(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

const gatedTags = Array.from(html.matchAll(/<([a-z][\w:-]*)([^>]*\sdata-mimir-capability-state=["'](planned|parked|advanced|lab)["'][^>]*)>/gi));

if (!gatedTags.length) {
  fail('Expected at least one planned/parked/advanced/lab capability gate in public/mmir.html.');
}

for (const match of gatedTags) {
  const tag = match[0];
  const id = (tag.match(/\sid=["']([^"']+)["']/i) || [])[1] || match[1];
  const state = match[3];
  if (!/\shidden(?:\s|>|=)/i.test(tag)) {
    fail(`${id} (${state}) must be hidden in static HTML.`);
  }
}

const riskyLabels = [
  'Workflow Builder',
  'Datasets',
  'External Connectors',
  'Safe Sharing',
  'Data Analysis / Charts',
  'Scheduled Tasks / Reminders',
  'Training Automation',
  'Edge Compute Mesh'
];

const visibleHtml = html
  .replace(/<[^>]+data-mimir-capability-state=["'](?:planned|parked|advanced|lab)["'][\s\S]*?<\/(?:section|details|div)>/gi, '')
  .replace(/<script[\s\S]*?<\/script>/gi, '');

for (const label of riskyLabels) {
  if (visibleHtml.includes(label)) {
    fail(`Unproven capability label is visible outside a gated hidden section: ${label}`);
  }
}

requireText(guard, 'function hideUnprovenCapabilities()', 'Public launch guard must expose hideUnprovenCapabilities().');
requireText(guard, 'data-mimir-capability-state', 'Public launch guard must inspect capability-state gates.');
requireText(guard, 'node.hidden=true', 'Public launch guard must force unproven capability panels hidden.');
requireText(guard, "node.setAttribute('aria-hidden','true')", 'Public launch guard must mark unproven panels aria-hidden.');
requireText(guard, 'hideUnprovenCapabilities();', 'Public launch guard must run the hidden-capability guard on init.');
requireText(guard, 'window.MimirPublicLaunchGuard={forceManagedRoute,sanitizeBrokenChatHistory,hideUnprovenCapabilities,returnIntent}', 'Public launch guard API must expose the hidden-capability guard for test/debug visibility.');

if (assetVersions['public-launch-guard.js'] !== '20260604-hidden-capability-guard-v1') {
  fail('public-launch-guard.js asset version must be bumped for the hidden capability guard.');
}

if (!html.includes('./apps/mimir-chat-portal/public-launch-guard.js?v=20260604-hidden-capability-guard-v1')) {
  fail('public/mmir.html must load the cache-busted hidden capability guard.');
}

if (!String(packageJson.scripts?.check || '').includes('smoke-check-hidden-capability-gates.js')) {
  fail('npm run check must include smoke-check-hidden-capability-gates.js.');
}

if (failures.length) {
  console.error('Hidden capability gate smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Hidden capability gate smoke passed.');
