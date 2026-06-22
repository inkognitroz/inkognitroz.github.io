import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const publicDir = join(resolve(root, 'public'));
const portalDir = join(publicDir, 'apps', 'mimir-chat-portal');
const html = readFileSync(join(publicDir, 'mmir.html'), 'utf8');
const hydration = readFileSync(join(portalDir, 'first-screen-activation-hydration.js'), 'utf8');
const versions = JSON.parse(readFileSync(join(portalDir, 'asset-versions.json'), 'utf8'));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

const expectedVersion = '20260622-first-screen-starter-progress-v1';

requireIncludes(
  html,
  `"./apps/mimir-chat-portal/activation-telemetry.js?v=${expectedVersion}"`,
  'Deferred scripts must load activation telemetry so first-screen progress can react to install/proof/chat milestones.'
);
requireIncludes(
  html,
  `"./apps/mimir-chat-portal/first-screen-activation-hydration.js?v=${expectedVersion}"`,
  'Deferred scripts must load first-screen activation hydration so starter progress surfaces on the public page.'
);
requireIncludes(
  hydration,
  "const firstReady=after.find((event)=>event.type==='first-chat-ready'",
  'Starter progress must treat first-chat-ready as a valid bridge from install to first answer.'
);
requireIncludes(
  hydration,
  "const proof=after.find((event)=>event.type==='live-proof'",
  'Starter progress must keep the live-proof milestone path while accepting the first-chat-ready bridge.'
);
if (versions.assets?.['activation-telemetry.js'] !== expectedVersion) {
  fail('Asset version manifest must track activation telemetry for the first-screen starter progress slice.');
}
if (versions.assets?.['first-screen-activation-hydration.js'] !== expectedVersion) {
  fail('Asset version manifest must track first-screen hydration for the starter progress slice.');
}
requireIncludes(
  String(packageJson.scripts?.check || ''),
  'smoke-check-p0-first-screen-starter-progress.js',
  'npm run check must include the first-screen starter progress smoke.'
);

if (failures.length) {
  console.error('P0 first-screen starter progress smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 first-screen starter progress smoke passed.');
