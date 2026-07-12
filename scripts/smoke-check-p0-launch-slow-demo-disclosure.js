import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const portalDir = join(root, 'public', 'apps', 'mimir-chat-portal');
const shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const manifest = JSON.parse(readFileSync(join(portalDir, 'asset-versions.json'), 'utf8'));
const html = readFileSync(join(root, 'public', 'mmir.html'), 'utf8');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) failures.push(message);
}

function forbidIncludes(source, needle, message) {
  if (source.includes(needle)) failures.push(message);
}

const shellVersion = manifest.assets?.['p0-chat-shell.js'] || '';

requireIncludes(shell, 'const SLOW_RESPONSE_NOTICE_MS=12000;', 'P0 shell must use the 12s slow-response launch threshold.');
requireIncludes(shell, 'function startSlowResponseNotice(message,', 'P0 shell must centralize normal-send slow-response notices.');
requireIncludes(shell, 'updateMessage(message,content,{slowNotice:true});', 'Normal-send slow notice must update the existing pending assistant message.');
requireIncludes(shell, 'const stopSlowNotice=startSlowResponseNotice(assistant,{', 'Normal sends must arm the slow-response notice after creating the pending assistant message.');
requireIncludes(shell, 'stopSlowNotice();\n      finishResponse();', 'Normal-send finally path must clear the slow-response notice before finishing.');
requireIncludes(shell, 'if(elapsedMs>=SLOW_RESPONSE_NOTICE_MS){', 'Gateway compare progress must switch to the compact slow notice after the same threshold.');
requireIncludes(shell, "title+' is still working. The request is taking longer than usual, but it is still running.'", 'Gateway slow notice must be one calm line while the request continues.');
requireIncludes(shell, 'routeStatus(title+\' · still working · request still active\',\'ready\');', 'Gateway slow notice must keep the route/status surface active without adding panels.');

requireIncludes(shell, "routeStatus('Demo-læring av · rå dialog lagres ikke · slå på i Personvern','hosted');", 'Demo disclosure must remain visible in the compact route-status surface.');
requireIncludes(shell, "demo_capture:false", 'Demo disclosure visibility telemetry must not imply raw transcript consent.');
requireIncludes(shell, "raw_transcript_enabled:false", 'Demo disclosure telemetry must explicitly preserve raw transcript opt-in state.');
forbidIncludes(shell, "label:'MMIR Demo'", 'Demo disclosure must not append a visible assistant message.');
forbidIncludes(shell, "variant:'notice'", 'Demo disclosure must not create a transcript notice message.');
forbidIncludes(shell, 'state.messages.push(notice);', 'Demo disclosure must not mutate conversation history.');
forbidIncludes(shell, 'Rå samtale lagres ikke før du velger Demo-læring På', 'Large demo disclosure copy must not live in the chat transcript path.');
requireIncludes(shell, "writeStorageString(DEMO_TRANSCRIPT_CONSENT_KEY,accepted?'accepted':'declined')", 'Explicit privacy-menu opt-in/out must remain the only consent persistence path.');

requireIncludes(shell, `const P0_RUNTIME_VERSION='${shellVersion}'`, 'P0 runtime version must match the asset manifest.');
requireIncludes(html, `p0-chat-shell.js?v=${shellVersion}`, 'public/mmir.html must cache-bust the updated P0 runtime.');
requireIncludes(String(pkg.scripts?.check || ''), 'smoke-check-p0-launch-slow-demo-disclosure.js', 'npm run check must include the launch slow/demo disclosure smoke.');

if (failures.length) {
  console.error('P0 launch slow/demo disclosure smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 launch slow/demo disclosure smoke passed.');
