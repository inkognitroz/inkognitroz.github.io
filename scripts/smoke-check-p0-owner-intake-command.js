import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const portalDir = join(root, 'public', 'apps', 'mimir-chat-portal');
const shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const css = readFileSync(join(portalDir, 'p0-chat-shell.css'), 'utf8');
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
  "const DEMO_TRANSCRIPT_PATH='/telemetry/demo-transcript';",
  'P0 shell must know the demo transcript capture endpoint.'
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
  "match(/^@([a-z0-9][a-z0-9_.-]{1,39})\\b\\s+([\\s\\S]+)$/i)",
  'P0 shell must accept free-form tester aliases such as @amanda for feedback capture.'
);
requireIncludes(
  shell,
  'function promptFrictionSignal(prompt)',
  'P0 shell must classify MMIR-related chat friction without relying on the owner as support.'
);
requireIncludes(
  shell,
  'function demoTranscriptCaptureEnabled()',
  'P0 shell must gate demo transcript capture by demo/test mode and privacy mode.'
);
requireIncludes(
  shell,
  "const DEMO_TRANSCRIPT_CONSENT_KEY='mmir-p0-demo-transcript-consent-v1';",
  'P0 shell must persist an explicit demo transcript consent marker.'
);
requireIncludes(
  shell,
  'function ensureDemoTranscriptConsentNotice',
  'P0 shell must show a visible demo transcript consent notice before capture.'
);
requireIncludes(
  shell,
  'Demo-testmodus: MMIR kan lagre avgrensede og redigerte chatutdrag',
  'P0 shell must explain demo transcript capture in the chat, not hide it in background telemetry.'
);
requireIncludes(
  shell,
  "writeStorageString(DEMO_TRANSCRIPT_CONSENT_KEY,'accepted')",
  'P0 shell must mark consent only through the visible demo consent path.'
);
requireIncludes(
  shell,
  "captureInteraction('demo_transcript_consent_visible'",
  'P0 shell must record that demo consent was shown without raw transcript content.'
);
requireIncludes(
  shell,
  "params.get('demo_capture')==='0'||params.has('no_demo_capture')",
  'P0 shell must provide a simple opt-out for demo transcript capture.'
);
requireIncludes(
  shell,
  "function sendDemoTranscript(reason='conversation_update',metadata={})",
  'P0 shell must send bounded demo/user-test transcript context for product learning.'
);
requireIncludes(
  shell,
  "function scheduleDemoTranscriptCapture(reason='conversation_update',metadata={})",
  'P0 shell must debounce demo transcript capture after chat changes.'
);
requireIncludes(
  shell,
  "capture_consent:'demo_transcript'",
  'P0 shell must mark demo transcript capture with explicit demo consent.'
);
requireIncludes(
  shell,
  "source:'mmir-chat-demo'",
  'P0 shell must label raw demo transcript capture separately from metadata telemetry.'
);
requireIncludes(
  shell,
  "scheduleDemoTranscriptCapture('message_appended'",
  'P0 shell must capture demo transcript context when users add chat messages.'
);
requireIncludes(
  shell,
  "scheduleDemoTranscriptCapture('message_updated'",
  'P0 shell must capture demo transcript context when assistant answers update.'
);
requireIncludes(
  shell,
  "fetch(API_URL+DEMO_TRANSCRIPT_PATH,{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true,credentials:'omit'})",
  'P0 shell must post demo transcript capture without browser credentials.'
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
  "source:parsed.source||'mmir-chat-feedback'",
  'P0 shell must mark public feedback with the feedback source.'
);
requireIncludes(
  shell,
  "submit:Boolean(explicitFeedback&&demoConsent)",
  'Explicit demo feedback must be eligible for server-side issue creation when the gateway gates allow it.'
);
requireIncludes(
  shell,
  'demo_feedback_consent:Boolean(demoConsent)',
  'Explicit feedback must carry the visible demo consent signal.'
);
requireIncludes(
  shell,
  "capture_consent:demoConsent?'demo_transcript':''",
  'Feedback intake must use the same demo consent contract as transcript capture.'
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
  "menuButton('copy-feedback-triage','Copy triage pack'",
  'Add menu must expose a one-click sanitized feedback triage export.'
);
requireIncludes(
  shell,
  'function feedbackTriagePack(plan={})',
  'P0 shell must build a sanitized Markdown triage pack from local feedback drafts.'
);
requireIncludes(
  shell,
  'function copyFeedbackTriagePack',
  'P0 shell must copy feedback triage packs without requiring central storage first.'
);
requireIncludes(
  shell,
  "captureInteraction(copied?'feedback_triage_pack_copied'",
  'P0 shell must record successful feedback triage pack exports without raw provider calls.'
);
requireIncludes(
  shell,
  "redactShareText(lines.join('\\n'))",
  'Feedback triage export must pass through safe-share redaction.'
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
  "captureInteraction('chat_guidance_signal'",
  'P0 shell must record MMIR guidance/friction signals from normal chat without raw prompt text.'
);
requireIncludes(
  shell,
  'function queueImplicitFeedbackFromChat(prompt,signal)',
  'P0 shell must turn clear product friction in chat into a sanitized feedback draft.'
);
requireIncludes(
  shell,
  'function feedbackCaptureSummary(count=feedbackInboxItems().length)',
  'P0 shell must summarize captured feedback visibly for user-testers.'
);
requireIncludes(
  shell,
  'function renderFeedbackCaptureStatus()',
  'P0 shell must render captured-feedback state after local inbox changes.'
);
requireIncludes(
  shell,
  "function markFeedbackCaptured(source='feedback_capture')",
  'P0 shell must mark captured feedback with an in-app confirmation.'
);
requireIncludes(
  shell,
  "id=\"p0-feedback-capture\"",
  'P0 composer must include a subtle captured-feedback inbox affordance.'
);
requireIncludes(
  shell,
  "openFeedbackInbox('feedback_capture_pill')",
  'Captured-feedback affordance must open Feedback Inbox directly.'
);
requireIncludes(
  shell,
  "composer.dataset.feedbackCaptured=summary?'true':'false'",
  'P0 shell must mark the composer while captured-feedback status is visible.'
);
requireIncludes(
  shell,
  "function openFeedbackInbox(source='feedback_inbox')",
  'P0 shell must centralize Feedback Inbox rendering for menu and captured-feedback entry points.'
);
requireIncludes(
  shell,
  'function removeFeedbackInboxItem(id)',
  'P0 shell must replace pending implicit feedback drafts when server intake succeeds.'
);
requireIncludes(
  shell,
  'function feedbackStorageStatusLines(plan)',
  'P0 shell must explain whether feedback is locally queued, log-only or owner-readable.'
);
requireIncludes(
  shell,
  'Owner-lager: ikke koblet ennå.',
  'Feedback Inbox must be honest when durable owner-readable storage is not configured.'
);
requireIncludes(
  shell,
  'Mangler for sentral analyse: MMIR_FEEDBACK_STORE-binding med owner-gated lesing.',
  'Feedback Inbox must name the missing durable-store binding needed for central analysis.'
);
requireIncludes(
  shell,
  "source:'mmir-chat-implicit-feedback'",
  'P0 shell must mark indirect chat feedback separately from explicit @feedback.'
);
requireIncludes(
  shell,
  "routeStatus('Feedback signal captured · sanitized draft · no raw chat log','ready');",
  'P0 shell must confirm captured feedback in-app without asking the user to contact the owner.'
);
requireIncludes(
  shell,
  "markFeedbackCaptured('feedback_submitted')",
  'Explicit feedback must refresh the captured-feedback inbox affordance after server intake.'
);
requireIncludes(
  shell,
  "status:'pending_server_intake'",
  'Explicit feedback must be saved locally before waiting on the server.'
);
requireIncludes(
  shell,
  "markFeedbackCaptured('feedback_local_draft')",
  'Explicit feedback must immediately confirm a local draft before the network call completes.'
);
requireIncludes(
  shell,
  'removeFeedbackInboxItem(localDraftId)',
  'Successful feedback intake must replace the local pending draft with the server-shaped inbox item.'
);
requireIncludes(
  shell,
  "markFeedbackCaptured('implicit_feedback_detected')",
  'Implicit user friction must refresh the captured-feedback inbox affordance immediately.'
);
requireIncludes(
  shell,
  "markFeedbackCaptured('feedback_failed_local_fallback')",
  'Feedback endpoint failures must still save and confirm a local feedback draft.'
);
requireIncludes(
  shell,
  "Feedback fanget · ",
  'Captured-feedback confirmation must be visible in Norwegian demo copy.'
);
requireIncludes(
  shell,
  "status:'local_fallback'",
  'Feedback intake failures must create a local fallback draft instead of losing user input.'
);
requireIncludes(
  css,
  '.p0-feedback-capture',
  'P0 shell CSS must style the captured-feedback affordance.'
);
requireIncludes(
  css,
  '.p0-feedback-capture[hidden]',
  'Captured-feedback affordance must stay hidden until there are local drafts.'
);
requireIncludes(
  css,
  '.p0-composer[data-feedback-captured="true"] .p0-route',
  'Captured-feedback affordance must not visually collide with route status text.'
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
  'p0-chat-shell.js?v=20260622-feedback-triage-pack-v1',
  'Public page must cache-bust the owner-intake runtime.'
);
requireIncludes(
  manifest,
  '"p0-chat-shell.js": "20260622-feedback-triage-pack-v1"',
  'Asset manifest must track the owner-intake runtime version.'
);

if (errors.length) {
  console.error('P0 owner intake command smoke failed:');
  for (const error of errors) console.error('- ' + error);
  process.exit(1);
}

console.log('P0 owner intake command smoke passed.');
