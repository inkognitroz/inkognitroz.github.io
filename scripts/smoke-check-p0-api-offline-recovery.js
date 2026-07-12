import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const runtimePath = resolve(process.cwd(), 'public/apps/mimir-chat-portal/p0-chat-shell.js');
const runtime = readFileSync(runtimePath, 'utf8');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function sliceBetween(source, start, end, label) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (startIndex === -1 || endIndex === -1) {
    fail(`Missing ${label} boundary.`);
    return '';
  }
  return source.slice(startIndex, endIndex);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function requireOrdered(source, needles, message) {
  let cursor = 0;
  for (const needle of needles) {
    const index = source.indexOf(needle, cursor);
    if (index === -1) {
      fail(message + ` Missing or out of order: ${needle}`);
      return;
    }
    cursor = index + needle.length;
  }
}

const sendFlow = sliceBetween(
  runtime,
  'async function sendMessage(){',
  'async function compareLiveRoutes(',
  'sendMessage flow'
);
const retryFlow = sliceBetween(
  runtime,
  'function retryMessage(message){',
  'function cleanContinuationPartialAnswer(',
  'retryMessage flow'
);

requireIncludes(
  sendFlow,
  "const assistant=append('assistant','Thinking...',model.label,receipt.text,{retryPrompt:prompt});",
  'Hosted chat must retain the original prompt on the assistant message before the request starts.'
);
requireIncludes(
  sendFlow,
  "updateMessage(assistant,'I could not reach '+API_LABEL+' from this browser right now. Select Retry below to send the same message again.');",
  'Hosted API failure must replace Thinking with a visible error that points to the preserved Retry action.'
);
requireIncludes(
  sendFlow,
  "captureInteraction('chat_failed',{reason:'api_unreachable',active_model_id:model?.id||''});",
  'Hosted API failure must emit a sanitized api_unreachable signal.'
);
requireOrdered(
  sendFlow,
  [
    "captureInteraction('chat_failed',{reason:'api_unreachable'",
    '}finally{',
    'stopSlowNotice();',
    'finishResponse();',
    'input?.focus();'
  ],
  'Hosted API failure must always stop the slow notice, clear busy state, and restore composer focus.'
);
requireIncludes(
  retryFlow,
  "const prompt=String(message.retryPrompt||previousUserMessageFor(message)?.content||'').trim();",
  'Retry must recover the exact original prompt from browser-local message state.'
);
requireOrdered(
  retryFlow,
  [
    'input.value=prompt;',
    'autosizeInput();',
    "setMessageActionStatus(message.id,'Retrying...','ready');",
    'sendMessage();'
  ],
  'Retry must restore the prompt and resubmit through the canonical send path.'
);

const successClear = 'if(pendingMedia&&state.pendingMedia===pendingMedia)state.pendingMedia=null;';
const clearIndex = sendFlow.indexOf(successClear);
const catchIndex = sendFlow.indexOf('}catch(error){');
if (clearIndex === -1 || catchIndex === -1 || clearIndex > catchIndex) {
  fail('Selected image media must clear only on the success path before hosted/local failure handling.');
}
if (catchIndex !== -1 && sendFlow.slice(catchIndex).includes('state.pendingMedia=null')) {
  fail('API-offline or stopped requests must retain selected local image state for Retry.');
}

if (!process.exitCode) {
  console.log('P0 API offline recovery contract: PASS');
}
