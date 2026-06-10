#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const portalDir = join(root, 'public', 'apps', 'mimir-chat-portal');
const helper = readFileSync(join(portalDir, 'p0-route-receipts.js'), 'utf8');
const factGuard = readFileSync(join(portalDir, 'runtime-fact-answer-guard.js'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireText(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function forbidText(source, needle, message) {
  if (source.includes(needle)) fail(message);
}

requireText(helper, 'function trustLineText()', 'P0 helper must expose first-screen trust copy.');
requireText(helper, 'data-mmir-p0-trust-line', 'P0 helper must inject a visible trust line.');
requireText(helper, 'data-mmir-p0-onboarding', 'P0 helper must inject compact onboarding cards.');
requireText(helper, 'What can MMIR do for me?', 'Empty send must activate a guided first prompt.');
requireText(helper, 'I installed it — check this device', 'Local install flow must expose a check-device step.');
requireText(helper, 'Get local model updates', 'P0 tools menu must expose a conversion/update CTA.');
requireText(helper, 'Choose Private local to keep prompts on this device', 'Hosted receipt must explain the private-local alternative.');

requireText(factGuard, 'Current fact guard', 'Fact guard must use a generic current-fact warning.');
requireText(factGuard, 'No hardcoded browser fact patch was applied', 'Fact guard must document that no browser fact patch is applied.');
forbidText(factGuard, 'Last verified:', 'Fact guard must not inject static verification dates.');
forbidText(factGuard, 'factPresidentPatched', 'Fact guard must not keep old topic-specific patch state.');

const events = [];
const context = {
  window: {
    dispatchEvent(event) {
      events.push(event);
    },
  },
  CustomEvent: class CustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail || {};
    }
  },
};
vm.createContext(context);
vm.runInContext(helper, context, { filename: 'p0-route-receipts.js' });
if (context.window.MimirP0RouteReceipts?.trustLineText?.() !== 'Free hosted route active. Your prompt is sent to MMIR’s hosted free route. No provider key or paid route is used. Choose Private local to keep prompts on this device.') {
  fail('P0 trust line text must remain stable and user-readable.');
}
if (!events.some((event) => event.type === 'mimir-p0-route-receipts-ready')) {
  fail('P0 helper must still emit route receipt readiness.');
}

if (!String(packageJson.scripts?.check || '').includes('smoke-check-p0-trust-onboarding-ux.js')) {
  fail('npm run check must include smoke-check-p0-trust-onboarding-ux.js.');
}

if (failures.length) {
  console.error('P0 trust onboarding UX smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 trust onboarding UX smoke passed.');
