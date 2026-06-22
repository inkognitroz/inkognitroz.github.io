import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const stripPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'active-node-strip.js');
const htmlPath = join(root, 'public', 'mmir.html');
const manifestPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'asset-versions.json');

const strip = readFileSync(stripPath, 'utf8');
const html = readFileSync(htmlPath, 'utf8');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

requireIncludes(strip, 'function visibleInventory(nodes)', 'Active node strip must summarize visible route inventory.');
requireIncludes(strip, 'function routeChoiceReason(node)', 'Active node strip must explain why the active route was chosen.');
requireIncludes(strip, 'function capacityLine(nodes)', 'Active node strip must summarize ready/visible/local capacity.');
requireIncludes(strip, 'Chosen because a verified private local model is already live on this device.', 'Local-ready path must explain why MMIR promoted the private route.');
requireIncludes(strip, 'Chosen because it can answer first while local/private routes are still being verified.', 'Hosted fallback path must explain why it stays first.');
requireIncludes(strip, 'browser candidates parked until proof', 'Active node strip must keep browser candidates visible without promoting them.');
requireIncludes(strip, "q('#active-chat-description')&&(q('#active-chat-description').textContent=choiceReason+' '+summary+'.');", 'Hero description must reflect route-choice reasoning plus capacity summary.');
requireIncludes(strip, "q('#active-chat-title')&&(q('#active-chat-title').textContent=best.name+' active - '+inventory.ready+' ready now.');", 'Hero title must show active-route readiness count.');
requireIncludes(strip, "(state==='online'?'Ready':'Setup')+' · '+inventory.ready+'/'+inventory.visible", 'Active route pill must expose ready vs visible capacity.');

const expectedVersion = '20260622-active-route-visibility-v1';
if (manifest.assets?.['active-node-strip.js'] !== expectedVersion) {
  fail('Asset manifest must track the active-node visibility update.');
}
requireIncludes(html, `active-node-strip.js?v=${expectedVersion}`, 'mmir.html must cache-bust the active-node visibility update.');

if (failures.length) {
  console.error('Active node visibility smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Active node visibility smoke passed.');
