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
  "const FEEDBACK_INBOX_PLAN_PATH='/feedback/inbox/plan';",
  'P0 shell must know the feedback inbox planning endpoint.'
);
requireIncludes(
  shell,
  "const TELEMETRY_EVENTS_PATH='/telemetry/events';",
  'P0 shell must know the metadata-only interaction telemetry endpoint.'
);
requireIncludes(
  shell,
  "const FEEDBACK_INBOX_KEY='mmir-p0-feedback-inbox-v1';",
  'P0 shell must keep a local feedback inbox queue.'
);
requireIncludes(
  shell,
  "const INTERACTION_EVENTS_KEY='mmir-p0-interaction-events-v1';",
  'P0 shell must keep local interaction evidence for user-test triage.'
);
requireIncludes(
  shell,
  'const TELEMETRY_DENIED_FIELD_RE=',
  'P0 shell must deny raw prompt/answer/content fields from interaction telemetry.'
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
  "menuButton('feedback-inbox','Feedback Inbox'",
  'Add menu must expose a feedback inbox review affordance.'
);
requireIncludes(
  shell,
  "menuButton('model-health','Model health'",
  'Add menu must expose a compact model/node health view.'
);
requireIncludes(
  shell,
  "menuButton('discuss-topic','Debate models'",
  'Add menu must expose model debate with user-readable language.'
);
requireIncludes(
  shell,
  'function responseIsTruncated(payload)',
  'P0 shell must detect provider truncation.'
);
requireIncludes(
  shell,
  'function captureInteraction(eventName,metadata={})',
  'P0 shell must capture metadata-only user interactions for product learning.'
);
requireIncludes(
  shell,
  'function telemetryCaptureAllowed()',
  'P0 shell must only send interaction telemetry from approved hosted origins.'
);
requireIncludes(
  shell,
  'if(!telemetryCaptureAllowed())return;',
  'P0 shell must keep local/dev interaction telemetry local to avoid noisy CORS and accidental capture.'
);
requireIncludes(
  shell,
  "credentials:'omit'",
  'P0 shell must send interaction telemetry without browser credentials for cross-origin CORS safety.'
);
requireIncludes(
  shell,
  "captureInteraction('chat_send'",
  'P0 shell must record regular chat send interactions without raw prompt text.'
);
requireIncludes(
  shell,
  "captureInteraction('feedback_submitted'",
  'P0 shell must record successful feedback intake for owner follow-up.'
);
requireIncludes(
  shell,
  "captureInteraction('tool_used'",
  'P0 shell must record high-value tool usage such as Boost, Debate and Model Health.'
);
requireIncludes(
  shell,
  "captureInteraction(truncated?'truncation_seen'",
  'P0 shell must record truncation events as first-class UX friction.'
);
requireIncludes(
  shell,
  'data-p0-message-action="continue"',
  'P0 shell must expose Continue for truncated answers.'
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
  'p0-chat-shell.js?v=20260618-interaction-capture-v2',
  'Public page must cache-bust the owner-intake runtime.'
);
requireIncludes(
  manifest,
  '"p0-chat-shell.js": "20260618-interaction-capture-v2"',
  'Asset manifest must track the owner-intake runtime version.'
);

if (errors.length) {
  console.error('P0 owner intake command smoke failed:');
  for (const error of errors) console.error('- ' + error);
  process.exit(1);
}

console.log('P0 owner intake command smoke passed.');
