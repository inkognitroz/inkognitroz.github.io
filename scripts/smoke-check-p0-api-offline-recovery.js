import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const runtimePath = resolve(process.cwd(), 'public/apps/mimir-chat-portal/p0-chat-shell.js');
const runtime = readFileSync(runtimePath, 'utf8');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function requireIncludes(needle, message) {
  if (!runtime.includes(needle)) fail(message);
}

function forbidIncludes(needle, message) {
  if (runtime.includes(needle)) fail(message);
}

function requireOrdered(needles, message) {
  let cursor = 0;
  for (const needle of needles) {
    const index = runtime.indexOf(needle, cursor);
    if (index === -1) {
      fail(message + ` Missing or out of order: ${needle}`);
      return;
    }
    cursor = index + needle.length;
  }
}

requireIncludes(
  "const assistant=append('assistant','Thinking...',model.label,receipt.text,{retryPrompt:prompt});",
  'Hosted chat must retain the original prompt on the assistant message before the request starts.'
);
requireIncludes(
  "updateMessage(assistant,'I could not reach '+API_LABEL+' from this browser right now. Please refresh and try again.');",
  'Hosted API failure must become a visible, non-stuck assistant error instead of leaving Thinking visible.'
);
requireIncludes(
  "captureInteraction('chat_failed',{reason:'api_unreachable',active_model_id:model?.id||''});",
  'Hosted API failure must emit a sanitized api_unreachable signal.'
);
requireIncludes(
  "const prompt=String(message.retryPrompt||previousUserMessageFor(message)?.content||'').trim();",
  'Retry must recover the exact original prompt from browser-local message state.'
);
requireOrdered(
  [
    'function retryMessage(message){',
    'input.value=prompt;',
    'autosizeInput();',
    "setMessageActionStatus(message.id,'Retrying...','ready');",
    'sendMessage();'
  ],
  'Retry must restore the prompt, leave busy state, and resubmit through the canonical send path.'
);
requireOrdered(
  [
    '}catch(error){',
    "captureInteraction('chat_failed',{reason:'api_unreachable'",
    '}finally{',
    'stopSlowNotice();',
    'finishResponse();',
    'input?.focus();'
  ],
  'Hosted API failure must always stop the slow notice, clear busy state, and restore composer focus.'
);
requireIncludes(
  'if(pendingMedia&&state.pendingMedia===pendingMedia)state.pendingMedia=null;',
  'Selected image media must clear only after a successful protected answer.'
);
forbidIncludes(
  "state.pendingMedia=null;\n    const routePrompt=fastAnswer?fastAnswerPrompt(guardedRoutePrompt):guardedRoutePrompt;",
  'API-offline failure must not discard a selected local image before Retry.'
);

if (!process.exitCode) {
  console.log('P0 API offline recovery contract: PASS');
}
