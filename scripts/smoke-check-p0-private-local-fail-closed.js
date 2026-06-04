import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const p0Shell = readFileSync(
  join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'p0-chat-shell.js'),
  'utf8',
);

const failures = [];

function requireText(needle, message) {
  if (!p0Shell.includes(needle)) failures.push(message);
}

function requireOrder(before, after, message) {
  const beforeIndex = p0Shell.indexOf(before);
  const afterIndex = p0Shell.indexOf(after);
  if (beforeIndex === -1 || afterIndex === -1 || beforeIndex > afterIndex) {
    failures.push(message);
  }
}

function requireScopedOrder(scopeStart, before, after, message) {
  const scopeIndex = p0Shell.indexOf(scopeStart);
  const beforeIndex = p0Shell.indexOf(before, scopeIndex);
  const afterIndex = p0Shell.indexOf(after, scopeIndex);
  if (scopeIndex === -1 || beforeIndex === -1 || afterIndex === -1 || beforeIndex > afterIndex) {
    failures.push(message);
  }
}

requireText(
  'function hostedFallbackAllowedForLocalFailure(originalPrompt,routePrompt)',
  'P0 shell must centralize the local-failure hosted fallback privacy decision.',
);
requireText(
  'wantsPrivateRoute(originalPrompt)||',
  'P0 shell must block hosted fallback when the original prompt asks for private/local handling.',
);
requireText(
  'wantsPrivateRoute(routePrompt)||',
  'P0 shell must block hosted fallback when the cleaned route prompt still asks for private/local handling.',
);
requireText(
  'localModelMentioned(originalPrompt)',
  'P0 shell must block hosted fallback when the user explicitly mentions a local model route.',
);
requireText(
  'Privacy guard: I did not send this local/private prompt to hosted Supergenious.',
  'P0 shell must tell the user when a private/local prompt failed closed instead of falling back to hosted.',
);
requireText(
  "routeStatus('Local privacy guard · hosted fallback blocked','error')",
  'P0 shell must expose the local privacy fail-closed state in the route line.',
);
requireOrder(
  'if(!hostedFallbackAllowedForLocalFailure(prompt,routePrompt)){',
  'const fallbackAnswer=await chatHosted(routePrompt);',
  'P0 shell must run the private/local fail-closed guard before any hosted fallback request.',
);
requireScopedOrder(
  'async function sendMessage()',
  "routeStatus('Local privacy guard · hosted fallback blocked','error')",
  "state.activeModelId='mmir-supergenius';",
  'P0 shell must keep the selected local route when a private/local prompt fails closed.',
);

if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exit(1);
}

console.log('p0 private local fail-closed guard ok');
