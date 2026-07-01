import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dashboardPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'node-dashboard.js');
const htmlPath = join(root, 'public', 'mmir.html');
const manifestPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'asset-versions.json');

const dashboard = readFileSync(dashboardPath, 'utf8');
const html = readFileSync(htmlPath, 'utf8');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

requireIncludes(dashboard, 'function modelProofSummary(plan,models)', 'Node handoff must summarize live model proof state.');
requireIncludes(dashboard, "String(count)+' model'+(count===1?'':'s')+' visible'", 'Ready proof copy must expose the live model count.');
requireIncludes(dashboard, "'First-chat proof can use '+modelSummary(models)+' on this private node.'", 'Ready proof copy must name the local model inventory.');
requireIncludes(dashboard, "if(['install-model','repair-model-install'].includes(plan.stage))", 'Blocked proof copy must attach to install and repair stages.');
requireIncludes(dashboard, "'Install or repair the free '+plan.model+' starter before MMIR can prove local chat.'", 'Blocked proof copy must keep the free starter path explicit.');
requireIncludes(dashboard, 'id="node-handoff-model-proof"', 'Node handoff card must render a bindable model proof status.');
requireIncludes(dashboard, 'renderNodeHandoff(plan,null,[])', 'Offline node handoff must render proof status without live models.');
requireIncludes(dashboard, 'renderNodeHandoff(plan,tunnel,models)', 'Ready node handoff must render proof status from live model inventory.');

const expectedVersion = '20260702-node-model-proof-v1';
if (manifest.assets?.['node-dashboard.js'] !== expectedVersion) {
  fail('Asset manifest must track the node handoff model proof JavaScript update.');
}
if (manifest.assets?.['node-dashboard.css'] !== expectedVersion) {
  fail('Asset manifest must track the node handoff model proof CSS cache key.');
}
requireIncludes(html, `node-dashboard.css?v=${expectedVersion}`, 'mmir.html must cache-bust the node dashboard CSS cache key.');
requireIncludes(html, `node-dashboard.js?v=${expectedVersion}`, 'mmir.html must cache-bust the node dashboard JavaScript update.');

if (failures.length) {
  console.error('Node handoff model proof smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Node handoff model proof smoke passed.');
