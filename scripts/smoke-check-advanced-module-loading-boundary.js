#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const html = readFileSync(join(root, 'public', 'mmir.html'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

const advancedModuleNames = [
  'access-control.js',
  'admin-governance.js',
  'artifact-workspace.js',
  'assistant-builder.js',
  'beta-signup.js',
  'code-sandbox.js',
  'connector-catalog.js',
  'data-analysis.js',
  'dataset-manager.js',
  'demo-growth.js',
  'free-value-loops.js',
  'identity-org.js',
  'image-boundary.js',
  'knowledge-connectors.js',
  'knowledge.js',
  'memory.js',
  'migration-portability.js',
  'prompt-registry.js',
  'provider-status.js',
  'research-planner.js',
  'scheduled-tasks.js',
  'sharing-center.js',
  'tool-runner.js',
  'training-automation.js',
  'use-case-templates.js',
  'vision-input.js',
  'web-search.js',
  'workflow-builder.js',
  'workspaces.js'
];

function fail(message) {
  failures.push(message);
}

function assetName(ref) {
  return String(ref || '')
    .replace(/^\.\/apps\/mimir-chat-portal\//, '')
    .split('?')[0];
}

const scriptRefs = Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi))
  .map((match) => match[1])
  .filter((ref) => ref.includes('./apps/mimir-chat-portal/'));

const deferredSource = html.match(/<script\s+id=["']mimir-deferred-scripts["'][^>]*>([\s\S]*?)<\/script>/i);
let deferredRefs = [];
if (!deferredSource) {
  fail('public/mmir.html must keep the explicit mimir-deferred-scripts queue.');
} else {
  try {
    deferredRefs = JSON.parse(deferredSource[1]);
  } catch (error) {
    fail('mimir-deferred-scripts must remain valid JSON.');
  }
}

const publicLaunchRefs = [...scriptRefs, ...deferredRefs];
for (const ref of publicLaunchRefs) {
  const name = assetName(ref);
  if (advancedModuleNames.includes(name)) {
    fail(`Advanced/parked module must not load in the public first-chat launch surface: ${name}`);
  }
}

const checkScript = String(packageJson.scripts?.check || '');
if (!checkScript.includes('smoke-check-advanced-module-loading-boundary.js')) {
  fail('npm run check must include smoke-check-advanced-module-loading-boundary.js.');
}

if (failures.length) {
  console.error('Advanced module loading boundary smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Advanced module loading boundary smoke passed for ${publicLaunchRefs.length} public launch script refs.`);

