import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const jsPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'model-comparison.js');
const cssPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'model-comparison.css');
const htmlPath = join(root, 'public', 'mmir.html');
const manifestPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'asset-versions.json');

const js = readFileSync(jsPath, 'utf8');
const css = readFileSync(cssPath, 'utf8');
const html = readFileSync(htmlPath, 'utf8');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

requireIncludes(js, 'let feedbackBtn=null;', 'Compare panel must track a useful-synthesis feedback button.');
requireIncludes(js, '<button id="capture-comparison-feedback" type="button" disabled>Useful synthesis</button>', 'Compare panel must render a disabled useful-synthesis capture action.');
requireIncludes(js, "feedbackBtn.addEventListener('click',captureComparisonFeedback);", 'Useful-synthesis action must be wired to the capture helper.');
requireIncludes(js, 'lastSynthesis={content:String(content||\'\'),model};', 'Compare panel must preserve the latest synthesis and model context.');
requireIncludes(js, "feedbackBtn.textContent='Useful synthesis';", 'New synthesis runs must reset the feedback button label.');
requireIncludes(js, "function resultSummary(){", 'Compare feedback must summarize selected model coverage.');
requireIncludes(js, "Compared '+String(lastResults.length)+' model(s): '+models", 'Compare feedback must include compared model count and labels.');
requireIncludes(js, "failed.length?'Failed responses: '+String(failed.length):'No failed responses'", 'Compare feedback must preserve failed response count.');
requireIncludes(js, 'function promptPrivacySummary(){', 'Compare feedback must summarize prompt metadata without raw prompt text.');
requireIncludes(js, 'function promptPrivacySummaryFor(value){', 'Compare feedback must compute sanitized prompt metadata from an explicit prompt snapshot.');
requireIncludes(js, "let lastComparisonPrompt='';", 'Compare synthesis must preserve the comparison-time prompt separately from later chat-box edits.');
requireIncludes(js, 'lastComparisonPrompt=prompt;', 'Compare synthesis must snapshot the prompt that produced the compared answers.');
requireIncludes(js, 'lastPromptMetadata=promptPrivacySummaryFor(prompt);', 'Compare feedback must preserve prompt metadata from the comparison run, not later chat-box edits.');
requireIncludes(js, 'return lastPromptMetadata||promptPrivacySummaryFor(promptEl?.value);', 'Compare feedback may fall back to the live prompt only before a comparison snapshot exists.');
requireIncludes(js, "const original=String(lastComparisonPrompt||promptEl?.value||'').trim();", 'Compare synthesis must use the comparison-time prompt rather than a later chat-box edit.');
requireIncludes(js, 'raw prompt not stored in feedback draft', 'Compare feedback draft must explicitly avoid raw prompt storage.');
requireIncludes(js, 'function synthesisPrivacySummary(){', 'Compare feedback must summarize synthesis metadata without raw answer text.');
requireIncludes(js, 'raw synthesis not stored in feedback draft', 'Compare feedback draft must explicitly avoid raw synthesis storage.');
requireIncludes(js, 'function bestAnswerSignal(){', 'Compare feedback must summarize best-answer evidence without raw answers.');
requireIncludes(js, 'Best-answer signal: ', 'Compare feedback draft must label the best-answer signal for triage.');
requireIncludes(js, "usable.length>=2?'best-answer candidate needs owner review':'insufficient compare evidence'", 'Compare feedback must distinguish candidate-quality evidence from insufficient comparisons.');
requireIncludes(js, 'raw answers not stored', 'Compare feedback best-answer signal must preserve raw answer privacy.');
requireIncludes(js, 'function routeSafetySummary(profile,url,modelCount){', 'Compare feedback must summarize route safety from comparison-time backend state.');
requireIncludes(js, "const routeClass=/localhost|127\\.0\\.0\\.1|\\.local(?::|$)/i.test(host)?'local/private backend':(/api\\.mmir\\.ai/i.test(host)?'MMIR free hosted route':'active backend route');", 'Compare feedback route summary must classify local/private, MMIR hosted and other active backend routes without raw credentials.');
requireIncludes(js, 'function keyReferenceSummary(profile){', 'Compare feedback must summarize key-reference presence without storing the raw value.');
requireIncludes(js, "return raw?'configured in active backend profile; raw key reference not stored in feedback draft':'not stored in feedback draft';", 'Compare feedback must redact backend key-reference values even when a profile has one.');
requireIncludes(js, 'no provider secrets or paid-route credentials stored in feedback draft', 'Compare feedback route summary must keep secret and paid-route boundaries explicit.');
if (js.includes("String(profile?.keyRef||profile?.key_ref||'not stored in feedback draft')")) {
  fail('Compare feedback route summary must not copy profile keyRef or key_ref values into local drafts.');
}
requireIncludes(js, 'compareRouteSafetySummary(),', 'Compare feedback draft must include the route-safety summary before model-result evidence.');
requireIncludes(js, 'lastRouteMetadata=routeSafetySummary(profile,url,models.length);', 'Compare feedback must preserve route safety metadata from the comparison run.');
requireIncludes(js, 'let lastCoverageMetadata=null;', 'Compare feedback must track route coverage from the comparison run.');
requireIncludes(js, 'function routeCoverageSummary(models){', 'Compare feedback must summarize selected route coverage without raw prompt or answer content.');
requireIncludes(js, "return 'Route coverage: '+String(selected)+' selected of '+String(available)+' visible live route(s) at compare time; '+String(coverage)+'% coverage; route labels only, raw prompts and answers not stored.';", 'Compare feedback route coverage must be metadata-only and demo-triageable.');
requireIncludes(js, 'compareRouteCoverageSummary(),', 'Compare feedback draft must include selected-versus-visible route coverage before best-answer evidence.');
requireIncludes(js, 'lastCoverageMetadata=routeCoverageSummary(models);', 'Compare feedback must snapshot route coverage at comparison time.');
requireIncludes(js, 'let lastEvidenceId=null;', 'Compare feedback must track a stable local evidence ID per comparison run.');
requireIncludes(js, 'function stableFingerprint(value){', 'Compare feedback must derive a short local fingerprint without storing raw prompt text.');
requireIncludes(js, 'function evidenceSnapshot(prompt,profile,url,models){', 'Compare feedback must build evidence IDs from comparison-time prompt, route and model metadata.');
requireIncludes(js, "lastEvidenceId='cmp-'+stableFingerprint(evidenceSnapshot(prompt,profile,url,models));", 'Compare feedback must preserve the evidence ID from the comparison run.');
requireIncludes(js, 'function evidenceSummary(){', 'Compare feedback draft must expose a local evidence summary.');
requireIncludes(js, 'local fingerprint only, raw prompt, responses and synthesis not stored', 'Compare feedback evidence summary must keep privacy boundaries explicit.');
requireIncludes(js, "function comparisonFeedbackDraft(){", 'Compare panel must build a sanitized local feedback draft.');
requireIncludes(js, "'@feedback Compare Live Models useful synthesis", 'Compare feedback draft must be explicit and command-routable.');
requireIncludes(js, 'evidenceSummary(),', 'Compare feedback draft must include the evidence ID before prompt and route metadata.');
requireIncludes(js, 'bestAnswerSignal(),', 'Compare feedback draft must include best-answer evidence before raw-free result metadata.');
requireIncludes(js, 'raw prompt, raw model responses and raw synthesis are not stored in this feedback draft', 'Compare feedback draft must preserve the public-safe storage boundary.');
requireIncludes(js, ".saveFeedbackDraft?.(draft,{", 'Compare panel must use the runtime Feedback Inbox bridge when available.');
requireIncludes(js, "source:'model-comparison-panel'", 'Compare feedback drafts must record the exact UI source.');
requireIncludes(js, "backlogHint:'compare-panel-useful-synthesis'", 'Compare feedback drafts must include a stable triage hint.');
requireIncludes(js, "openInbox:true", 'Useful-synthesis capture must open Feedback Inbox after saving.');
requireIncludes(js, "if(feedbackBtn?.dataset?.captured==='true'){setStatus('Useful synthesis already saved. Run a new synthesis to capture another signal.','ready');return;}", 'Useful-synthesis capture must avoid duplicate local drafts for the same synthesis.');
requireIncludes(js, 'promptEl.value=draft;', 'Compare feedback must fall back to prefilled chat draft when the bridge is absent.');
requireIncludes(js, "feedbackBtn.dataset.captured='true';", 'Useful-synthesis capture must expose saved state in the UI.');
requireIncludes(js, 'feedbackBtn.disabled=true;', 'Useful-synthesis capture must disable the saved button until another synthesis is generated.');
requireIncludes(js, "setStatus(saved?'Useful synthesis saved to Feedback Inbox.':'Useful synthesis draft added to the chat box.'", 'Useful-synthesis capture must show local storage truth.');
requireIncludes(js, 'lastSynthesis=null;', 'New comparisons must clear stale synthesis feedback context.');

requireIncludes(css, '.comparison-actions button[data-captured="true"]', 'Compare feedback saved state must have scoped styling.');

const expectedCssVersion = '20260625-compare-feedback-dedupe-v1';
const expectedJsVersion = '20260625-compare-route-coverage-v1';
if (manifest.assets?.['model-comparison.js'] !== expectedJsVersion) {
  fail('Asset manifest must track model-comparison.js version.');
}
if (manifest.assets?.['model-comparison.css'] !== expectedCssVersion) {
  fail('Asset manifest must track model-comparison.css version.');
}
requireIncludes(html, `model-comparison.css?v=${expectedCssVersion}`, 'mmir.html must load comparison panel CSS with cache busting.');
requireIncludes(html, `model-comparison.js?v=${expectedJsVersion}`, 'mmir.html must load comparison panel JS with cache busting.');

if (failures.length) {
  console.error('Model comparison feedback smoke failed:');
  failures.forEach(failure => console.error('- ' + failure));
  process.exit(1);
}

console.log('Model comparison feedback smoke passed.');
