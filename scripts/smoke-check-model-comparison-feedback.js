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
requireIncludes(js, 'let reviewBtn=null;', 'Compare panel must track a needs-review feedback button.');
requireIncludes(js, '<button id="capture-comparison-feedback" type="button" disabled>Useful synthesis</button>', 'Compare panel must render a disabled useful-synthesis capture action.');
requireIncludes(js, '<button id="capture-comparison-review" type="button" disabled>Needs review</button>', 'Compare panel must render a disabled needs-review capture action.');
requireIncludes(js, "feedbackBtn.addEventListener('click',()=>captureComparisonFeedback('useful'));", 'Useful-synthesis action must be wired to the capture helper.');
requireIncludes(js, "reviewBtn.addEventListener('click',()=>captureComparisonFeedback('review'));", 'Needs-review action must be wired to the capture helper.');
requireIncludes(js, 'function comparisonFeedbackButtons(){', 'Compare feedback actions must share a single capture state.');
requireIncludes(js, 'function resetFeedbackButtons(){', 'New comparisons must clear both feedback action states.');
requireIncludes(js, 'function enableFeedbackButtons(enabled){', 'New synthesis runs must enable both feedback signal choices.');
requireIncludes(js, 'function markFeedbackButtonsCaptured(signal){', 'Saved compare feedback must disable both signal choices.');
requireIncludes(js, 'lastSynthesis={content:String(content||\'\'),model};', 'Compare panel must preserve the latest synthesis and model context.');
requireIncludes(js, "feedbackBtn.textContent='Useful synthesis';", 'New synthesis runs must reset the feedback button label.');
requireIncludes(js, "reviewBtn.textContent='Needs review';", 'New synthesis runs must reset the review button label.');
requireIncludes(js, "button.removeAttribute('aria-label');", 'New synthesis runs must clear saved feedback accessibility labels.');
requireIncludes(js, "button.removeAttribute('title');", 'New synthesis runs must clear saved feedback tooltips.');
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
requireIncludes(js, "const routeHost=(()=>{try{const parsed=new URL(url);return {host:parsed.host||'not recorded',hostname:(parsed.hostname||'').toLowerCase()};}catch(error){return {host:'not recorded',hostname:''};}})();", 'Compare feedback route summary must preserve display host while using the parsed exact hostname for route safety.');
requireIncludes(js, 'const hostname=routeHost.hostname;', 'Compare feedback route summary must classify routes from the parsed exact hostname.');
requireIncludes(js, "const localRoute=hostname==='localhost'||hostname==='127.0.0.1'||hostname==='::1'||hostname.endsWith('.local');", 'Compare feedback route summary must classify only exact localhost, loopback and .local hosts as local/private.');
requireIncludes(js, "const mmirHostedRoute=hostname==='api.mmir.ai';", 'Compare feedback route summary must classify only the exact API host as the MMIR hosted route.');
requireIncludes(js, "const routeClass=localRoute?'local/private backend':(mmirHostedRoute?'MMIR free hosted route':'active backend route');", 'Compare feedback route summary must classify local/private, MMIR hosted and other active backend routes without raw credentials.');
if (/api\\\.mmir\\\.ai/.test(js) || /\/localhost\|127\\\.0\\\.0\\\.1/.test(js)) {
  fail('Compare feedback route summary must not classify trusted routes by broad substring regexes.');
}
requireIncludes(js, 'function keyReferenceSummary(profile){', 'Compare feedback must summarize key-reference presence without storing the raw value.');
requireIncludes(js, "return raw?'configured in active backend profile; raw key reference not stored in feedback draft':'not stored in feedback draft';", 'Compare feedback must redact backend key-reference values even when a profile has one.');
requireIncludes(js, 'no provider secrets or paid-route credentials stored in feedback draft', 'Compare feedback route summary must keep secret and paid-route boundaries explicit.');
if (js.includes("String(profile?.keyRef||profile?.key_ref||'not stored in feedback draft')")) {
  fail('Compare feedback route summary must not copy profile keyRef or key_ref values into local drafts.');
}
requireIncludes(js, 'compareRouteSafetySummary(),', 'Compare feedback draft must include the route-safety summary before model-result evidence.');
requireIncludes(js, 'lastRouteMetadata=routeSafetySummary(profile,url,models.length);', 'Compare feedback must preserve route safety metadata from the comparison run.');
requireIncludes(js, 'let lastCoverageMetadata=null;', 'Compare feedback must track route coverage from the comparison run.');
requireIncludes(js, 'function routeLabelSummary(models){', 'Compare feedback must summarize selected and visible route labels without raw prompt or answer content.');
requireIncludes(js, "return 'selected routes: '+selectedLabels+'; visible routes: '+visibleLabels;", 'Compare feedback route label summary must preserve route labels only.');
requireIncludes(js, 'function routeCoverageSummary(models){', 'Compare feedback must summarize selected route coverage without raw prompt or answer content.');
requireIncludes(js, 'const requested=Array.isArray(models)?models.length:lastResults.length;', 'Compare feedback route coverage must preserve the requested route count for diagnostics.');
requireIncludes(js, 'const selected=available?Math.min(requested,available):requested;', 'Compare feedback route coverage must clamp selected count to visible routes before computing coverage.');
requireIncludes(js, "const fullSet=selected>=Math.min(available,MAX_COMPARE_MODELS);", 'Compare feedback route coverage must record whether the max useful selected set was used.');
requireIncludes(js, "return 'Route coverage: '+String(selected)+' selected of '+String(available)+' visible live route(s) at compare time; '+String(coverage)+'% coverage; requested routes: '+String(requested)+'; selection cap: '+String(MAX_COMPARE_MODELS)+' model(s); full selected set: '+(fullSet?'yes':'no')+'; '+routeLabelSummary(models)+'; route labels only, raw prompts and answers not stored.';", 'Compare feedback route coverage must include bounded coverage, requested capacity and labels while staying metadata-only and demo-triageable.');
// UI cap must match runner cap; otherwise testers think they selected routes the runner silently drops.
requireIncludes(js, 'function syncModelSelectionLimit(changedInput=null){', 'Compare route picker must enforce the model cap in the UI instead of silently truncating selected routes.');
requireIncludes(js, "Compare up to '+String(MAX_COMPARE_MODELS)+' live routes at once. Uncheck one route to choose another.", 'Compare route picker must explain the selection cap when a tester tries to exceed it.');
requireIncludes(js, 'input.disabled=locked;', 'Compare route picker must disable unchecked routes while the selection cap is reached.');
requireIncludes(js, '<p id="comparison-selection-note" class="comparison-selection-note">Choose up to \'+String(MAX_COMPARE_MODELS)+\' live routes for each comparison.</p>', 'Compare route picker must show the selection cap before testers hit it.');
requireIncludes(js, "input.setAttribute('aria-describedby','comparison-selection-note comparison-status');", 'Compare route picker choices must expose cap and status text to assistive tech.');
requireIncludes(js, "input.closest('.comparison-model-choice')?.classList.toggle('comparison-model-choice-locked',locked);", 'Compare route picker must visually mark routes locked by the selection cap.');
requireIncludes(js, "input.addEventListener('change',handleModelChoiceChange)", 'Compare route picker must resync the selection cap after checkbox changes.');
requireIncludes(js, 'compareRouteCoverageSummary(),', 'Compare feedback draft must include selected-versus-visible route coverage before best-answer evidence.');
requireIncludes(js, 'lastCoverageMetadata=routeCoverageSummary(models);', 'Compare feedback must snapshot route coverage at comparison time.');
requireIncludes(js, 'let lastEvidenceId=null;', 'Compare feedback must track a stable local evidence ID per comparison run.');
requireIncludes(js, "let lastEvidenceCapturedAt='';", 'Compare feedback must track when comparison evidence was generated.');
requireIncludes(js, 'function stableFingerprint(value){', 'Compare feedback must derive a short local fingerprint without storing raw prompt text.');
requireIncludes(js, 'function evidenceSnapshot(prompt,profile,url,models){', 'Compare feedback must build evidence IDs from comparison-time prompt, route and model metadata.');
requireIncludes(js, "const promptPresent=String(prompt||'').trim()?'present':'empty';", 'Compare feedback evidence IDs must derive from prompt metadata, not raw prompt text.');
requireIncludes(js, "'prompt:'+promptPresent", 'Compare feedback evidence snapshots must not fingerprint raw prompt text.');
requireIncludes(js, 'function redactedPromptShapeFingerprint(prompt){', 'Compare feedback evidence IDs must distinguish prompts with a redacted token-shape fingerprint.');
requireIncludes(js, "'prompt_shape:'+redactedPromptShapeFingerprint(prompt)", 'Compare feedback evidence snapshots must include a redacted prompt-shape fingerprint.');
requireIncludes(js, "return stableFingerprint('shape:'+shape+';count:'+String(tokens.length));", 'Compare prompt-shape fingerprints must hash redacted token shapes rather than raw prompt text.');
if (js.includes("'prompt:'+stableFingerprint(prompt)")) {
  fail('Compare feedback evidence snapshots must not hash raw prompt text directly.');
}
if (js.includes('stableFingerprint(prompt)') || js.includes('stableFingerprint(String(prompt')) {
  fail('Compare feedback evidence snapshots must not hash raw prompt text directly.');
}
requireIncludes(js, "lastEvidenceId='cmp-'+stableFingerprint(evidenceSnapshot(prompt,profile,url,models));", 'Compare feedback must preserve the evidence ID from the comparison run.');
requireIncludes(js, 'lastEvidenceCapturedAt=new Date().toISOString();', 'Compare feedback must preserve a comparison-time timestamp for demo triage.');
requireIncludes(js, 'function evidenceSummary(){', 'Compare feedback draft must expose a local evidence summary.');
requireIncludes(js, "compared at: '+(lastEvidenceCapturedAt||'not recorded')", 'Compare feedback evidence summary must include the comparison-time timestamp.');
requireIncludes(js, 'local fingerprint only, raw prompt, responses and synthesis not stored', 'Compare feedback evidence summary must keep privacy boundaries explicit.');
requireIncludes(js, "function comparisonFeedbackDraft(signal){", 'Compare panel must build a sanitized local feedback draft.');
requireIncludes(js, "'@feedback Compare Live Models useful synthesis", 'Compare feedback draft must be explicit and command-routable.');
requireIncludes(js, "'@feedback Compare Live Models synthesis needs review", 'Compare review draft must be explicit and command-routable.');
requireIncludes(js, "Feedback signal: '+(review?'needs owner review':'useful synthesis')", 'Compare feedback draft must distinguish useful and review signals.');
requireIncludes(js, 'evidenceSummary(),', 'Compare feedback draft must include the evidence ID before prompt and route metadata.');
requireIncludes(js, 'bestAnswerSignal(),', 'Compare feedback draft must include best-answer evidence before raw-free result metadata.');
requireIncludes(js, "review?'Why review: synthesized answer needs owner inspection before it becomes a best-answer pattern.':'Why useful: synthesized answer helped choose a best response.'", 'Compare feedback draft must explain useful versus review intent without raw answers.');
requireIncludes(js, 'raw prompt, raw model responses and raw synthesis are not stored in this feedback draft', 'Compare feedback draft must preserve the public-safe storage boundary.');
requireIncludes(js, ".saveFeedbackDraft?.(draft,{", 'Compare panel must use the runtime Feedback Inbox bridge when available.');
requireIncludes(js, "source:'model-comparison-panel'", 'Compare feedback drafts must record the exact UI source.');
requireIncludes(js, "title:review?'Compare synthesis needs review':'Useful compare synthesis'", 'Compare feedback drafts must use distinct titles for useful and review signals.');
requireIncludes(js, "priority:review?'p2-demo-learning':'p3-ux'", 'Compare review feedback must use higher demo-learning priority than useful synthesis feedback.');
requireIncludes(js, "backlogHint:review?'compare-panel-synthesis-review':'compare-panel-useful-synthesis'", 'Compare review drafts must include a distinct triage hint.');
requireIncludes(js, "openInbox:true", 'Useful-synthesis capture must open Feedback Inbox after saving.');
requireIncludes(js, "if(comparisonFeedbackButtons().some(button=>button.dataset?.captured==='true')){setStatus('Compare synthesis feedback already saved. Run a new synthesis to capture another signal.','ready');return;}", 'Compare feedback capture must avoid duplicate local drafts for the same synthesis.');
requireIncludes(js, 'promptEl.value=draft;', 'Compare feedback must fall back to prefilled chat draft when the bridge is absent.');
requireIncludes(js, "button.dataset.captured='true';", 'Useful-synthesis capture must expose saved state in the UI.');
requireIncludes(js, 'button.disabled=true;', 'Useful-synthesis capture must disable the saved button until another synthesis is generated.');
requireIncludes(js, "const evidenceLabel=lastEvidenceId||'comparison-not-recorded';", 'Compare feedback capture must derive a stable evidence label from the comparison run.');
if (js.includes('button.dataset.evidenceId=lastEvidenceId;') || js.includes('feedbackBtn.dataset.evidenceId=lastEvidenceId;')) {
  fail('Compare feedback capture must never write a null evidence ID into a saved control.');
}
requireIncludes(js, 'button.dataset.evidenceId=evidenceLabel;', 'Compare feedback capture must expose the metadata-only evidence ID on saved controls.');
requireIncludes(js, "Evidence ID: '+evidenceLabel+'. Run a new synthesis to capture another signal.", 'Compare feedback saved controls must expose the evidence ID to assistive tech and hover hints.');
requireIncludes(js, "button.setAttribute('aria-label',message);", 'Useful-synthesis capture must expose the saved state to assistive tech.');
requireIncludes(js, 'button.title=message;', 'Useful-synthesis capture must expose the saved state as a visible hover hint.');
requireIncludes(js, "setStatus((saved?(review?'Review signal saved to Feedback Inbox.':'Useful synthesis saved to Feedback Inbox.'):(review?'Review draft added to the chat box.':'Useful synthesis draft added to the chat box.'))+' Evidence ID: '+(lastEvidenceId||'comparison-not-recorded')+'.'", 'Compare feedback capture must show local storage truth and evidence ID for both signal types.');
requireIncludes(js, 'lastSynthesis=null;', 'New comparisons must clear stale synthesis feedback context.');

requireIncludes(css, '.comparison-actions button[data-captured="true"]', 'Compare feedback saved state must have scoped styling.');
requireIncludes(css, '.comparison-selection-note', 'Compare route picker cap note must have scoped styling.');
requireIncludes(css, '.comparison-model-choice-locked span::after', 'Compare route picker locked state must explain disabled route choices.');

const expectedCssVersion = '20260704-compare-integrity-v1';
const expectedJsVersion = '20260710-compare-evidence-shape-v1';
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
