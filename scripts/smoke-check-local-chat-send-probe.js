import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const chatRuntime = readFileSync(join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'chat-runtime.js'), 'utf8');
const quietGuard = readFileSync(join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'quiet-first-paint-hotfix.js'), 'utf8');
const html = readFileSync(join(resolve(root, 'public'), 'mmir.html'), 'utf8');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function requireOrder(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  if (firstIndex < 0 || secondIndex < 0 || firstIndex > secondIndex) fail(message);
}

requireIncludes(chatRuntime, "function allowLocalChatProbes(profile,reason='chat-runtime-send')", 'Chat runtime must expose an explicit local-chat probe allowance helper.');
requireIncludes(chatRuntime, "if(!api.isLocal(profile))return false", 'Local-chat probe allowance must be gated to local profiles.');
requireIncludes(chatRuntime, "window.MimirAllowLocalProbes?.(reason,60000)", 'Local-chat send must open a short loopback allowance.');
requireIncludes(chatRuntime, 'mmir-local-chat-probe-allowed', 'Local-chat allowance must emit an auditable browser event.');

const sendStart = chatRuntime.indexOf('async function sendMessage()');
const initStart = chatRuntime.indexOf('  function init()', sendStart);
const sendSource = sendStart >= 0 && initStart > sendStart ? chatRuntime.slice(sendStart, initStart) : '';
requireIncludes(sendSource, 'allowLocalChatProbes(profile);\n      await refreshState(true);', 'No-model send refresh must allow local probes before refreshState.');
requireIncludes(sendSource, 'allowLocalChatProbes(profile);\n\n    stopRequested=false;', 'Direct local send must allow local probes before setting busy and pairing.');
requireOrder(sendSource, 'allowLocalChatProbes(profile);\n      await refreshState(true);', 'const token=await pairIfNeeded(profile,url);', 'No-model send refresh must allow local probes before the send-path pairing call.');
requireOrder(sendSource, 'allowLocalChatProbes(profile);\n\n    stopRequested=false;', 'const token=await pairIfNeeded(profile,url);', 'Direct local send must allow local probes before pairing/chat calls.');

requireIncludes(quietGuard, 'local_probe_deferred', 'Quiet first-paint guard must continue blocking passive loopback fetches.');
requireIncludes(quietGuard, 'w.MimirAllowLocalProbes', 'Quiet first-paint guard must still expose explicit local-probe allowance.');
requireIncludes(html, 'local_probe_deferred', 'Inline first-paint guard must continue blocking passive loopback fetches before deferred scripts load.');

if (!process.exitCode) {
  console.log('Local chat send probe smoke check passed.');
}
