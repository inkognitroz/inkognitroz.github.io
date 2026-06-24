import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const portalDir = join(root, 'public', 'apps', 'mimir-chat-portal');
const shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const manifest = readFileSync(join(portalDir, 'asset-versions.json'), 'utf8');
const html = readFileSync(join(root, 'public', 'mmir.html'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) failures.push(message);
}

requireIncludes(shell, 'function gatewayContinuationContract(data)', 'P0 shell must read the gateway continuation contract.');
requireIncludes(shell, "data?.continuation||data?.superboost?.continuation", 'P0 shell must preserve top-level and nested Superboost continuation metadata.');
requireIncludes(shell, 'function gatewayContinuationNeeded(data)', 'P0 shell must use continuation.needed/display as truncation truth.');
requireIncludes(shell, "message.continuationLabel||'Fortsett svaret'", 'P0 shell must use the gateway-provided continue label.');
requireIncludes(shell, 'message.continuationSuggestedMessage||', 'P0 shell must use the gateway-provided continue prompt when present.');
requireIncludes(shell, 'Previous partial answer to continue from:', 'Continue action must send the partial answer excerpt so the next answer can continue instead of restart.');
requireIncludes(shell, "captureInteraction('continuation_requested'", 'Continue action must be captured as UX learning.');
requireIncludes(shell, 'continuationSource:truncated?(gatewayContinuationContract(data)?.policy_version||', 'Updated swarm messages must preserve continuation source metadata.');
requireIncludes(shell, 'Trykk Fortsett svaret', 'Visible truncation guard must point users to the plain-language continue action.');

const expectedShellVersion = '20260624-supergeni-quality-row-v2';
const expectedCssVersion = '20260624-continuation-action-v1';
requireIncludes(shell, `const P0_RUNTIME_VERSION='${expectedShellVersion}'`, 'P0 runtime version must stay cache-busted after continuation and intelligence-status changes.');
requireIncludes(html, `p0-chat-shell.js?v=${expectedShellVersion}`, 'Public page must cache-bust the P0 runtime after continuation action changes.');
requireIncludes(html, `p0-chat-shell.css?v=${expectedCssVersion}`, 'Public page must keep the paired P0 CSS cache-bust stable when CSS did not change.');
requireIncludes(manifest, `"p0-chat-shell.js": "${expectedShellVersion}"`, 'Asset manifest must track continuation action runtime version.');
requireIncludes(manifest, `"p0-chat-shell.css": "${expectedCssVersion}"`, 'Asset manifest must track paired P0 CSS version.');
requireIncludes(String(packageJson.scripts?.check || ''), 'smoke-check-p0-continuation-contract.js', 'npm run check must include the continuation contract smoke.');

if (failures.length) {
  console.error('P0 continuation contract smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 continuation contract smoke passed.');
