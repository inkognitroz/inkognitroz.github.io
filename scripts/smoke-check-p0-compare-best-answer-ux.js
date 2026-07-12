import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const runtimePath = join(root, 'public', 'apps', 'mimir-chat-portal', 'p0-chat-shell.js');
const cssPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'p0-chat-shell.css');
const runtime = readFileSync(runtimePath, 'utf8');
const css = readFileSync(cssPath, 'utf8');

function fail(message) {
  throw new Error(message);
}

function requireText(haystack, needle, message) {
  if (!haystack.includes(needle)) fail(`${message}: missing ${needle}`);
}

function forbidText(haystack, needle, message) {
  if (haystack.includes(needle)) fail(`${message}: found ${needle}`);
}

function functionBody(source, name) {
  const startNeedle = `function ${name}(`;
  const start = source.indexOf(startNeedle);
  if (start < 0) fail(`Could not find ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  fail(`Could not parse ${name}`);
}

const addMenu = functionBody(runtime, 'renderAddMenu');
const compareUsefulFeedbackSummary = functionBody(runtime, 'compareUsefulFeedbackSummary');
const captureCompareUsefulFeedback = functionBody(runtime, 'captureCompareUsefulFeedback');
const explicitGroundingInstruction = functionBody(runtime, 'explicitGroundingInstruction');
const hostedPayload = functionBody(runtime, 'hostedPayload');
const localPayload = functionBody(runtime, 'localPayload');
const compareApiPayload = functionBody(runtime, 'compareApiPayload');

requireText(
  explicitGroundingInstruction,
  'If no sources are attached, say that plainly',
  'Explicit source questions must force an honest no-source disclosure'
);
requireText(
  explicitGroundingInstruction,
  'distinguish product knowledge from verified live evidence',
  'Explicit grounding questions must separate product knowledge from verified evidence'
);
requireText(
  explicitGroundingInstruction,
  'bygger du (?:svaret(?: ditt)? )?på',
  'Explicit grounding detection must cover natural Norwegian basis questions'
);
const groundingInstructionFor = new Function(`${explicitGroundingInstruction}; return explicitGroundingInstruction;`)();
if (!groundingInstructionFor('Hva bygger du svaret ditt på?')) {
  fail('Natural Norwegian source-basis question must activate the grounding contract');
}
if (!groundingInstructionFor('Which sources support this answer?')) {
  fail('English source question must activate the grounding contract');
}
if (!groundingInstructionFor('Hvor har du dette fra?')) {
  fail('Natural Norwegian provenance question must activate the grounding contract');
}
if (!groundingInstructionFor('Where did you get this from?')) {
  fail('Natural English provenance question must activate the grounding contract');
}
if (!groundingInstructionFor('Hvor har du informasjonen fra?')) {
  fail('Norwegian information-origin question must activate the grounding contract');
}
if (!groundingInstructionFor('Where did you get the information from?')) {
  fail('English information-origin question must activate the grounding contract');
}
if (!groundingInstructionFor('Hvor kommer informasjonen fra?')) {
  fail('Natural Norwegian information-origin question must activate the grounding contract');
}
if (!groundingInstructionFor('How do you know this?')) {
  fail('Natural English evidence question must activate the grounding contract');
}
if (!groundingInstructionFor('Hvordan vet du det?')) {
  fail('Natural Norwegian evidence question must activate the grounding contract');
}
if (!groundingInstructionFor('Hva er kilden din?')) {
  fail('Natural Norwegian possessive source question must activate the grounding contract');
}
if (!groundingInstructionFor('What is your source?')) {
  fail('Natural English possessive source question must activate the grounding contract');
}
if (groundingInstructionFor('Forklar MMIR kort.')) {
  fail('Ordinary prompts must not activate the grounding contract');
}
requireText(
  compareApiPayload,
  'explicitGroundingInstruction(prompt)',
  'Best Answer requests must apply the explicit grounding contract'
);
requireText(
  hostedPayload,
  'explicitGroundingInstruction(prompt)',
  'Default hosted chat requests must apply the explicit grounding contract'
);
requireText(
  localPayload,
  'explicitGroundingInstruction(prompt)',
  'Local chat requests must apply the explicit grounding contract'
);

forbidText(
  addMenu,
  'connect-local',
  'Minimal settings must not expose local connector setup as product-process clutter'
);
forbidText(
  runtime,
  'expand the intelligence pool',
  'Model menu must not repeat intelligence-pool strategy copy in the compact route picker'
);
forbidText(
  addMenu,
  'Smart routing',
  'Add menu must not bring back dashboard-style Smart routing cards'
);
forbidText(addMenu, 'compare-live', 'Minimal settings must not expose comparison machinery');
forbidText(addMenu, 'best-answer-live', 'Minimal settings must not expose benchmark machinery');
forbidText(addMenu, 'discuss-topic', 'Minimal settings must not expose council machinery');
forbidText(
  addMenu,
  'Add model',
  'Add menu should not reintroduce repeated Add model wording'
);
forbidText(
  addMenu,
  'Connect this computer as a private local node from chat.',
  'Add menu should avoid technical local-node detail in the compact toolbar menu'
);

requireText(
  runtime,
  'function compareLiveRoutes(comparePrompt',
  'Compare flow must remain implemented behind prompt intent and explicit @model tags'
);
requireText(
  runtime,
  "const COMPARE_PATH=ROUTE_ADAPTER_CONFIG.comparePath||'/chat/compare';",
  'Gateway compare path must be configurable through the route adapter boundary'
);
requireText(
  runtime,
  'function compareGatewayRoutes(comparePrompt',
  'Active hosted/provider routes must use the gateway compare path'
);
requireText(
  runtime,
  'function gatewayConsensusConfidence(data)',
  'Best Answer must surface the gateway consensus confidence signal'
);
requireText(
  runtime,
  'function withConsensusAnswerNotice(content,data)',
  'Contested consensus must be visible in the answer, not hidden in route machinery'
);
requireText(
  runtime,
  'function gatewayPrimaryAnswerText(data)',
  'Gateway Swarm/Superboost rendering must prefer the plain user answer contract before metadata objects'
);
requireText(
  runtime,
  'data?.answer',
  'Gateway primary answer helper must read the top-level answer string'
);
requireText(
  runtime,
  'data?.best_answer_text',
  'Gateway primary answer helper must read the top-level best_answer_text string'
);
requireText(
  runtime,
  "gatewayPrimaryAnswerText(data)||gatewayAvailableAnswerText(data)||'Compare finished, but no route returned an answer.'",
  'Best Answer rendering must use the plain answer string instead of rendering metadata objects'
);
requireText(
  runtime,
  'function gatewayAvailableAnswerText(data)',
  'Best Answer rendering must preserve a usable route answer when synthesis is unavailable'
);
requireText(
  runtime,
  'Best-answer synthesis was unavailable. Showing an available route answer:',
  'Best Answer fallback must label synthesis failure honestly before showing a route answer'
);
requireText(
  runtime,
  "const winnerId=String(data?.best_answer?.model_id||data?.best_answer?.receipt?.model_id||'').trim();",
  'Best Answer fallback must prefer the scorer-selected route when multiple answers remain'
);
requireText(
  runtime,
  'High confidence',
  'Consensus confidence must have a compact high-confidence user label'
);
requireText(
  runtime,
  'Contested - models disagree',
  'Consensus confidence must have a compact contested user label'
);
requireText(
  runtime,
  'Models disagree on this. Treat the answer as provisional and open Details for the route evidence.',
  'Contested answers must warn users before presenting a best answer'
);
requireText(
  runtime,
  'function compareAttemptIssueSummary(attempt)',
  'Gateway compare receipts must expose blocked/partial provider routes instead of hiding them'
);
requireText(
  runtime,
  "data-p0-message-action=\"useful-compare\"",
  'Compare and Best Answer messages must expose a local useful-feedback capture action'
);
requireText(
  runtime,
  "const compareUsefulCaptured=Boolean(message.compareUsefulCaptured);",
  'Compare useful feedback action must render from persisted per-message capture state'
);
requireText(
  runtime,
  "compareUsefulCaptured?'Useful saved':'Useful'",
  'Compare useful feedback action must show when the signal is already captured'
);
requireText(
  runtime,
  "if(message.compareUsefulCaptured)",
  'Compare useful feedback capture must be idempotent per answer message'
);
requireText(
  runtime,
  "message.compareUsefulCaptured=true;",
  'Compare useful feedback capture must persist the captured state on the message'
);
requireText(
  runtime,
  "message.compareUsefulEvidenceId=evidenceId;",
  'Compare useful feedback capture must persist the local evidence ID on the answer message'
);
requireText(
  runtime,
  "data-evidence-id=\"'+safeAttr(compareUsefulEvidence)+'\"",
  'Saved compare useful actions must expose the metadata-only evidence ID for demo reconciliation'
);
requireText(
  runtime,
  "Useful signal saved. Evidence ID: '+compareUsefulEvidence+'. Raw prompt and answer not stored.",
  'Saved compare useful actions must describe the evidence ID without exposing raw prompt or answer content'
);
requireText(
  runtime,
  "'Useful signal saved to Feedback Inbox. Evidence ID: '+evidenceId+'.'",
  'Compare useful feedback status must surface the same local evidence ID after capture'
);
requireText(
  runtime,
  'function stableLocalFingerprint(value)',
  'Compare useful feedback must derive local fingerprints without storing raw prompt or answer text'
);
requireText(
  runtime,
  'function compareUsefulEvidenceId(prompt,answer,receipt)',
  'Compare useful feedback drafts must include a stable metadata-only evidence ID'
);
requireText(
  runtime,
  'function captureCompareUsefulFeedback(message)',
  'Compare useful feedback must be captured through a dedicated sanitized local draft helper'
);
requireText(
  runtime,
  'function compareUsefulFeedbackSummary(receipt)',
  'Compare useful feedback drafts must summarize winner, score, route coverage and consensus from the receipt'
);
requireText(
  runtime,
  'function compareUsefulFeedbackTextMetadata(label,value,privacyNote)',
  'Compare useful feedback must summarize prompt and answer metadata without storing raw text'
);
requireText(
  compareUsefulFeedbackSummary,
  "const picks=(test)=>parts.filter(part=>test.test(part));",
  'Compare useful feedback must be able to preserve repeated live-provider evidence from the receipt'
);
requireText(
  compareUsefulFeedbackSummary,
  "coverage.length?('Coverage: '+coverage.join(' / ')):''",
  'Compare useful feedback must group compared, answered, quiet, queued and visible route counts into decision context'
);
requireText(
  compareUsefulFeedbackSummary,
  "...picks(/^(OpenRouter|NVIDIA|Google|Groq|MMIR|Supergeni)\\s+live$/i).slice(0,4)",
  'Compare useful feedback must preserve active provider readiness evidence without dumping the full receipt'
);
requireText(
  runtime,
  "summary?('Decision context: '+summary):'Decision context: [not available]'",
  'Compare useful feedback drafts must carry actionable decision context for triage'
);
requireText(
  captureCompareUsefulFeedback,
  "'Evidence ID: '+evidenceId+'; local fingerprint only, raw prompt, answer and route payload not stored.'",
  'Compare useful feedback drafts must expose a local evidence ID without raw payload storage'
);
requireText(
  captureCompareUsefulFeedback,
  "compareUsefulFeedbackTextMetadata('Prompt',prompt,'raw prompt not stored in feedback draft.')",
  'Compare useful feedback drafts must store prompt metadata instead of raw prompt text'
);
requireText(
  captureCompareUsefulFeedback,
  "compareUsefulFeedbackTextMetadata('Useful answer',answer,'raw useful answer not stored in feedback draft.')",
  'Compare useful feedback drafts must store answer metadata instead of raw answer text'
);
requireText(
  captureCompareUsefulFeedback,
  'Privacy: raw prompt and useful answer content are not stored in this feedback draft.',
  'Compare useful feedback drafts must declare the privacy boundary'
);
forbidText(
  captureCompareUsefulFeedback,
  "prompt?('Prompt: '+prompt):'Prompt: [not available]'",
  'Compare useful feedback must not store raw prompt excerpts'
);
forbidText(
  captureCompareUsefulFeedback,
  "'Useful answer excerpt: '+answer",
  'Compare useful feedback must not store raw useful answer excerpts'
);
requireText(
  runtime,
  "source:'p0-compare-useful-action'",
  'Compare useful feedback drafts must record the exact active UI source'
);
requireText(
  runtime,
  "backlogHint:'compare-feedback-capture'",
  'Compare useful feedback drafts must carry a triage backlog hint'
);
requireText(
  css,
  '.p0-message-compare .p0-message-actions button[data-p0-message-action="useful-compare"]',
  'Compare useful feedback action must have scoped visual treatment'
);
requireText(
  css,
  '.p0-message-compare .p0-message-actions button[data-p0-message-action="useful-compare"][data-captured="true"]',
  'Captured compare useful feedback action must have scoped saved-state styling'
);
requireText(
  runtime,
  'function swarmRoundLabel(data)',
  'Swarm receipts must preserve current round truth when swarm preview metadata is available'
);
requireText(
  runtime,
  "if(current&&planned)return 'round '+String(current)+'/'+String(planned);",
  'Swarm receipts must expose current round over planned rounds in the hidden receipt'
);
requireText(
  runtime,
  'function gatewayComparePreferred(preferredModel=null)',
  'Gateway compare must be preferred in public mode without stealing private/local compare flows'
);
requireText(
  runtime,
  'fetchJson(API_URL+COMPARE_PATH',
  'Gateway compare must call the live API compare endpoint'
);
requireText(
  runtime,
  'function runTwoModelTool(action)',
  'Two-model menu tools must use the existing compare flow instead of separate unproven UI'
);
requireText(
  runtime,
  "compareLiveRoutes(prompt,partner,{mode:'compare'});",
  'Compare answers menu action must run the proven compare path'
);
requireText(
  runtime,
  "compareLiveRoutes(prompt,partner,{mode:'best-answer'});",
  'Best answer benchmark menu action must run the proven synthesis path'
);
requireText(
  runtime,
  'Supergeni Council: compare two model perspectives',
  'Supergeni Council must keep a structured local fallback over the proven synthesis path'
);
requireText(
  runtime,
  'Supergeni Council: Let approved active models answer, challenge weak assumptions, then converge on one practical conclusion.',
  'Supergeni Council must use a structured gateway prompt for route debate'
);
requireText(
  runtime,
  "{mode:'council'}",
  'Supergeni Council menu action must request the dedicated council mode'
);
requireText(
  runtime,
  "mode==='boost'||mode==='all'||mode==='council'",
  'Supergeni Council must prefer the swarm preview path when available'
);
requireText(
  runtime,
  'council ready',
  'Supergeni Council receipts must preserve debate readiness in subtle status'
);
requireText(
  runtime,
  'function wantsCompareRoute(prompt)',
  'Best Answer language must trigger compare without adding toolbar buttons'
);
requireText(
  runtime,
  "status(title+' is asking '+hostedModel.label+' and '+localModel.label+' in parallel...'",
  'Compare flow must make dynamic parallel routing visible while running'
);
requireText(
  runtime,
  'Compare answer 1/2',
  'Compare flow must render the hosted route answer separately'
);
requireText(
  runtime,
  'Compare answer 2/2',
  'Compare flow must render the local route answer separately'
);
requireText(
  runtime,
  'scoreRoutesWithApi(prompt,hostedModel,hostedAnswerText',
  'Compare flow must ask the API scoring route for winner/demotion metadata'
);
requireText(
  runtime,
  'Best answer synthesis · No paid route',
  'Best Answer synthesis must keep the no-paid route receipt visible'
);
requireText(
  runtime,
  "latencyTargetReceipt(hostedModel,synthesisElapsedMs,'synthesis')",
  'Best Answer synthesis must carry a compact answer-time target receipt'
);
requireText(
  runtime,
  'recordRouteBenchmark(localModel,localScore)',
  'Compare flow must feed local route benchmark data back into ranking'
);
requireText(
  runtime,
  "return {mode:'compare',model:partner,prompt:cleanSmartPrompt(prompt)||prompt};",
  'Best Answer language must trigger the compare/synthesis path when a second active route exists'
);
requireText(
  runtime,
  "return {mode:'missing-local'",
  'Explicit multi-route tags must fail clearly before local discovery'
);
requireText(
  css,
  '.p0-message-compare',
  'Compare answers must have a distinguishable but non-dashboard message style'
);
requireText(
  css,
  '.p0-message-receipt-consensus-split',
  'Contested consensus receipt state must have a visible amber trust style'
);
forbidText(
  css,
  '.p0-featured-action',
  'P0 compare must not reserve special menu styling for removed compare buttons'
);
forbidText(
  css,
  '.p0-routing-hint',
  'P0 compare UX must not depend on old routing-hint dashboard cards'
);

console.log('P0 compare / Best Answer UX smoke check passed.');
