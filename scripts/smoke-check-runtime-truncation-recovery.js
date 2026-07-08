import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const portalDir = join(root, 'public', 'apps', 'mimir-chat-portal');
const runtime = readFileSync(join(portalDir, 'chat-runtime.js'), 'utf8');
const manifest = readFileSync(join(portalDir, 'asset-versions.json'), 'utf8');
const html = readFileSync(join(root, 'public', 'mmir.html'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) failures.push(message);
}

requireIncludes(runtime, 'function responseFinishReason(payload)', 'Runtime must normalize finish_reason across backend payload shapes.');
requireIncludes(runtime, 'function responseLooksTruncated(payload)', 'Runtime must detect token-limit truncation across backend payload shapes.');
requireIncludes(runtime, "truncated:Boolean(message?.truncated)", 'Runtime must preserve truncation state in public/stored message copies.');
requireIncludes(runtime, "addAction('continue','Continue','Continue truncated answer',()=>continueMessage(message));", 'Runtime must expose a Continue action for truncated answers.');
requireIncludes(runtime, "promptEl.value='Continue the previous answer without repeating the beginning. Original prompt: '+prompt;", 'Continue action must resume without asking the user to rewrite the original prompt.');
requireIncludes(runtime, "note.textContent=message.truncated?'Local actions: copy, retry, continue, save, fork, share, next.':'Local actions: copy, retry, save, fork, share, next.';", 'Runtime action status copy must mention Continue only for truncated answers.');
requireIncludes(runtime, "updateMessage(assistant.message.id,content||'Backend returned an empty response.',messageMeta,{truncated:result?.completion_truncated===true});", 'Backend chat path must preserve truncation metadata on the assistant message.');

const expectedVersion = '20260707-one-window-shell-v1';
requireIncludes(html, `./apps/mimir-chat-portal/chat-runtime.js?v=${expectedVersion}`, 'mmir.html must cache-bust the truncation-recovery runtime.');
requireIncludes(manifest, `"chat-runtime.js": "${expectedVersion}"`, 'Asset manifest must track the truncation-recovery runtime.');
requireIncludes(String(packageJson.scripts?.check || ''), 'smoke-check-runtime-truncation-recovery.js', 'npm run check must include the runtime truncation recovery smoke.');

if (failures.length) {
  console.error('Runtime truncation recovery smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Runtime truncation recovery smoke passed.');
