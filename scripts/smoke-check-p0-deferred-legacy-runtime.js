import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { collectPwaOfflineBehaviorFailures } from './smoke-check-pwa-offline-behavior.js';

const root = process.cwd();
const publicDir = join(resolve(root, 'public'));
const html = readFileSync(join(publicDir, 'mmir.html'), 'utf8');
const manifest = JSON.parse(readFileSync(join(publicDir, 'apps', 'mimir-chat-portal', 'asset-versions.json'), 'utf8'));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function directScriptRefs() {
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)).map((match) => match[1]);
}

function deferredRefs() {
  const match = html.match(/<script\s+id=["']mimir-deferred-scripts["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) {
    fail('public/mmir.html must keep the explicit mimir-deferred-scripts queue.');
    return [];
  }
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    fail('mimir-deferred-scripts must remain valid JSON.');
    return [];
  }
}

const direct = directScriptRefs();
const deferred = deferredRefs();
const hasDirect = direct.some((ref) => ref.includes('chat-runtime.js'));
const hasDeferred = deferred.some((ref) => ref.includes('chat-runtime.js'));
const runtimeIndex = deferred.findIndex((ref) => ref.includes('chat-runtime.js'));
const webgpuIndex = deferred.findIndex((ref) => ref.includes('runtime-controls-webgpu-truth.js'));

requireIncludes(
  html,
  './apps/mimir-chat-portal/p0-chat-shell.js?v='+(manifest.assets?.['p0-chat-shell.js'] || ''),
  'P0 chat shell must stay on the direct first-paint path.'
);
if (!manifest.assets?.['p0-chat-shell.js']) {
  fail('Asset manifest must track the P0 shell first-paint runtime.');
}
requireIncludes(
  html,
  './apps/mimir-chat-portal/pwa.js?v='+(manifest.assets?.['pwa.js'] || ''),
  'Deferred PWA UI must use its tracked prompt-handoff version.'
);
if (hasDirect) {
  fail('Legacy chat-runtime.js must not be a direct first-paint script when P0 owns the public chat shell.');
}
if (!hasDeferred) {
  fail('Legacy chat-runtime.js must stay available in the deferred queue for legacy compatibility.');
}
if (runtimeIndex < 0 || webgpuIndex < 0 || runtimeIndex > webgpuIndex) {
  fail('Legacy chat-runtime.js should remain before legacy runtime-control modules inside the deferred queue.');
}
if (!String(packageJson.scripts?.check || '').includes('smoke-check-p0-deferred-legacy-runtime.js')) {
  fail('npm run check must include smoke-check-p0-deferred-legacy-runtime.js.');
}

requireIncludes(
  html,
  "'serviceWorker' in navigator",
  'The P0 shell must feature-detect service workers outside the skipped legacy queue.'
);
requireIncludes(
  html,
  "serviceWorkerUrl='./sw.js?v=20260830-gateway-release-contract-v2'",
  'The P0 shell must bind the gateway-contract service-worker version outside the skipped legacy queue.'
);
requireIncludes(
  html,
  "navigator.serviceWorker.register(serviceWorkerUrl,{scope:'./'})",
  'The P0 shell must register the version-bound root service worker outside the skipped legacy queue.'
);
requireIncludes(
  html,
  "window.addEventListener('load',registerServiceWorker,{once:true})",
  'Service-worker registration must wait until page load.'
);
requireIncludes(
  html,
  "window.requestIdleCallback(run,{timeout:4000})",
  'Service-worker registration must stay off the first-chat critical path.'
);

for (const failure of await collectPwaOfflineBehaviorFailures(root)) fail(failure);

if (failures.length) {
  console.error('P0 deferred legacy runtime smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 deferred legacy runtime smoke passed.');
