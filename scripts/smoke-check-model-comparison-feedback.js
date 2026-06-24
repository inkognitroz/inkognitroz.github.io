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
requireIncludes(js, "function comparisonFeedbackDraft(){", 'Compare panel must build a sanitized local feedback draft.');
requireIncludes(js, "'@feedback Compare Live Models useful synthesis", 'Compare feedback draft must be explicit and command-routable.');
requireIncludes(js, ".saveFeedbackDraft?.(draft,{", 'Compare panel must use the runtime Feedback Inbox bridge when available.');
requireIncludes(js, "source:'model-comparison-panel'", 'Compare feedback drafts must record the exact UI source.');
requireIncludes(js, "backlogHint:'compare-panel-useful-synthesis'", 'Compare feedback drafts must include a stable triage hint.');
requireIncludes(js, "openInbox:true", 'Useful-synthesis capture must open Feedback Inbox after saving.');
requireIncludes(js, 'promptEl.value=draft;', 'Compare feedback must fall back to prefilled chat draft when the bridge is absent.');
requireIncludes(js, "feedbackBtn.dataset.captured='true';", 'Useful-synthesis capture must expose saved state in the UI.');
requireIncludes(js, "setStatus(saved?'Useful synthesis saved to Feedback Inbox.':'Useful synthesis draft added to the chat box.'", 'Useful-synthesis capture must show local storage truth.');
requireIncludes(js, 'lastSynthesis=null;', 'New comparisons must clear stale synthesis feedback context.');

requireIncludes(css, '.comparison-actions button[data-captured="true"]', 'Compare feedback saved state must have scoped styling.');

const expectedVersion = '20260625-useful-synthesis-feedback-v1';
if (manifest.assets?.['model-comparison.js'] !== expectedVersion) {
  fail('Asset manifest must track model-comparison.js version.');
}
if (manifest.assets?.['model-comparison.css'] !== expectedVersion) {
  fail('Asset manifest must track model-comparison.css version.');
}
requireIncludes(html, `model-comparison.css?v=${expectedVersion}`, 'mmir.html must load comparison panel CSS with cache busting.');
requireIncludes(html, `model-comparison.js?v=${expectedVersion}`, 'mmir.html must load comparison panel JS with cache busting.');

if (failures.length) {
  console.error('Model comparison feedback smoke failed:');
  failures.forEach(failure => console.error('- ' + failure));
  process.exit(1);
}

console.log('Model comparison feedback smoke passed.');
