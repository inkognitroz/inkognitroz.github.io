import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dashboardPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'node-dashboard.js');
const cssPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'node-dashboard.css');
const htmlPath = join(root, 'public', 'mmir.html');
const manifestPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'asset-versions.json');

const dashboard = readFileSync(dashboardPath, 'utf8');
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

requireIncludes(dashboard, 'function readNodeHandoff()', 'Node dashboard must read persisted handoff state.');
requireIncludes(dashboard, 'function renderNodeHandoffResumeBanner()', 'Node dashboard must render a persisted handoff resume banner.');
requireIncludes(dashboard, 'const REPAIR_RESUME_STALE_MS=15*60*1000;', 'Repair resume must define a short stale window for demo route trust.');
requireIncludes(dashboard, 'function repairResumeIsStale(resume)', 'Repair resume must classify old persisted repair state.');
requireIncludes(dashboard, 'Last saved repair state is older than 15 minutes.', 'Stale repair resume copy must require fresh node health before continuing.');
requireIncludes(dashboard, 'const NODE_HANDOFF_STALE_MS=15*60*1000;', 'Node handoff resume must define a short stale window for demo route trust.');
requireIncludes(dashboard, 'function nodeHandoffIsStale(handoff)', 'Node handoff resume must classify old persisted handoffs.');
requireIncludes(dashboard, 'if(!Number.isFinite(at.getTime()))return true;', 'Node handoff resume must treat missing or corrupt timestamps as stale.');
requireIncludes(dashboard, 'function nodeHandoffSavedAge(handoff)', 'Node handoff resume must show when the local handoff was saved.');
requireIncludes(dashboard, "return 'saved just now';", 'Fresh handoff resume copy must classify just-saved handoffs.');
requireIncludes(dashboard, "' minute'+(minutes===1?'':'s')+' ago'", 'Handoff resume freshness must be readable at minute granularity.');
requireIncludes(dashboard, "const evidenceId='nh-'+stableHandoffFingerprint(nodeHandoffEvidenceSnapshot(payload));", 'Stored node handoffs must include a stable local evidence ID.');
requireIncludes(dashboard, 'function stableHandoffFingerprint(value)', 'Node handoff evidence IDs must use a local metadata fingerprint.');
requireIncludes(dashboard, 'function nodeHandoffEvidenceSnapshot(payload)', 'Node handoff evidence must derive from route metadata only.');
requireIncludes(dashboard, "'raw_prompt_stored:false'", 'Node handoff evidence snapshot must explicitly avoid raw prompt storage.');
requireIncludes(dashboard, "'raw_response_stored:false'", 'Node handoff evidence snapshot must explicitly avoid raw response storage.');
requireIncludes(dashboard, 'function nodeHandoffEvidenceSummary(handoff)', 'Node handoff resume must summarize the local evidence ID.');
requireIncludes(dashboard, 'local metadata fingerprint only / raw prompts, responses and secrets not stored', 'Node handoff evidence summary must keep privacy boundaries explicit.');
requireIncludes(dashboard, "safe(freshness)+' / '+safe(nodeHandoffEvidenceSummary(handoff))", 'Handoff resume security proof must include freshness and evidence ID before safety flags.');
requireIncludes(dashboard, 'Handoff needs refresh', 'Node handoff resume must ask for a refresh when saved route state is stale.');
requireIncludes(dashboard, 'Handoff resume', 'Node handoff resume banner must be visible and labeled.');
requireIncludes(dashboard, 'provider_secrets_stored:false', 'Node handoff resume must keep security/cost proof visible.');
requireIncludes(dashboard, 'node-handoff-resume-action', 'Node handoff resume action must be bindable.');
requireIncludes(dashboard, "record?.('node-handoff-resume-action'", 'Node handoff resume actions must be telemetry-visible.');
requireIncludes(dashboard, 'evidence_id:nh-', 'Node handoff selection telemetry must expose the local evidence ID without raw data.');
requireIncludes(dashboard, 'renderNodeHandoffResumeBanner()+', 'Node handoff resume banner must render in dashboard states.');

requireIncludes(css, '.node-handoff-resume {', 'Node handoff resume banner must have dedicated styles.');
requireIncludes(css, '.node-handoff-resume[data-state="pending"]', 'Node handoff resume banner must style pending state.');
requireIncludes(css, '.node-handoff-resume[data-state="stale"]', 'Node handoff resume banner must style stale handoff state.');
requireIncludes(css, '.node-resume-banner[data-state="stale"]', 'Repair resume banner must style stale repair state.');

const expectedVersion = '20260630-node-handoff-evidence-v1';
if (manifest.assets?.['node-dashboard.js'] !== expectedVersion) {
  fail('Asset manifest must track the node handoff resume JavaScript update.');
}
if (manifest.assets?.['node-dashboard.css'] !== expectedVersion) {
  fail('Asset manifest must track the node handoff resume CSS update.');
}
requireIncludes(html, `node-dashboard.css?v=${expectedVersion}`, 'mmir.html must cache-bust the node handoff resume CSS update.');
requireIncludes(html, `node-dashboard.js?v=${expectedVersion}`, 'mmir.html must cache-bust the node handoff resume JavaScript update.');

if (failures.length) {
  console.error('Node handoff resume smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Node handoff resume smoke passed.');
