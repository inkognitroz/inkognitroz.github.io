import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const portalDir = join(root, 'public', 'apps', 'mimir-chat-portal');
const shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const manifest = readFileSync(join(portalDir, 'asset-versions.json'), 'utf8');
const html = readFileSync(join(root, 'public', 'mmir.html'), 'utf8');
const errors = [];

function requireIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) errors.push(message);
}

function requireNotIncludes(haystack, needle, message) {
  if (haystack.includes(needle)) errors.push(message);
}

requireIncludes(
  shell,
  "const OWNER_SUGGESTION_PLAN_PATH='/control-plane/owner/suggestions/plan';",
  'P0 shell must know the owner-suggestion planning endpoint.'
);
requireIncludes(
  shell,
  "const FEEDBACK_INTAKE_PATH='/feedback/intake';",
  'P0 shell must know the public feedback intake endpoint.'
);
requireIncludes(
  shell,
  'function ownerSuggestionCommand(prompt)',
  'P0 shell must parse the /admin command before normal chat routing.'
);
requireIncludes(
  shell,
  'function feedbackMentionCommand(prompt)',
  'P0 shell must parse @inkognitroz/@nilsk feedback before normal chat routing.'
);
requireIncludes(
  shell,
  'function redactOwnerSuggestionText(value)',
  'P0 shell must redact owner suggestions locally before display or API submission.'
);
requireIncludes(
  shell,
  "const OWNER_SECRETISH_RE=",
  'P0 shell must recognize provider-prefixed secret assignment shapes.'
);
requireIncludes(
  shell,
  "const OWNER_PROVIDER_KEY_RE=",
  'P0 shell must recognize common standalone provider-key shapes.'
);
requireIncludes(
  shell,
  ".replace(OWNER_SECRETISH_RE,'[redacted-secret-like-value]')",
  'P0 shell must replace secret-like assignments before owner intake.'
);
requireIncludes(
  shell,
  ".replace(OWNER_PROVIDER_KEY_RE,'[redacted-provider-key]')",
  'P0 shell must replace standalone provider keys before owner intake.'
);
requireIncludes(
  shell,
  "'x-mmir-owner-command-code':parsed.code",
  'P0 shell must send the owner command code only as a request header.'
);
requireIncludes(
  shell,
  'suggestion:parsed.suggestion',
  'P0 shell must send the sanitized suggestion text to the API.'
);
requireIncludes(
  shell,
  "command:'@'+parsed.target+' '+parsed.suggestion",
  'P0 shell must send public feedback as a sanitized @target command.'
);
requireIncludes(
  shell,
  "source:'mmir-chat-feedback'",
  'P0 shell must mark public feedback with the feedback source.'
);
requireIncludes(
  shell,
  "menuButton('draft-feedback','Send feedback'",
  'Add menu must expose a simple Send feedback affordance.'
);
requireIncludes(
  shell,
  "if(await handleOwnerSuggestionCommand(prompt,input))return;",
  'P0 shell must short-circuit normal LLM chat for owner-intake commands.'
);
requireIncludes(
  shell,
  "if(await handleFeedbackMentionCommand(prompt,input))return;",
  'P0 shell must short-circuit normal LLM chat for public feedback mentions.'
);
requireIncludes(
  shell,
  "routeStatus('Owner intake · code not stored · no paid route','ready');",
  'P0 shell must use subtle green status for owner intake instead of adding visible controls.'
);
requireNotIncludes(
  shell,
  '8520',
  'P0 shell must not hardcode the owner command code.'
);
requireNotIncludes(
  shell,
  'command:prompt',
  'P0 shell must not send the raw /admin command body to the API.'
);
requireNotIncludes(
  shell,
  'id="p0-owner',
  'Owner intake must not add another visible toolbar button.'
);
requireIncludes(
  html,
  'p0-chat-shell.js?v=20260618-feedback-intake-v1',
  'Public page must cache-bust the owner-intake runtime.'
);
requireIncludes(
  manifest,
  '"p0-chat-shell.js": "20260618-feedback-intake-v1"',
  'Asset manifest must track the owner-intake runtime version.'
);

if (errors.length) {
  console.error('P0 owner intake command smoke failed:');
  for (const error of errors) console.error('- ' + error);
  process.exit(1);
}

console.log('P0 owner intake command smoke passed.');
