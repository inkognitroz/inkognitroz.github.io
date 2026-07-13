import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const shell = readFileSync(join(root, 'public/apps/mimir-chat-portal/p0-chat-shell.js'), 'utf8');
const css = readFileSync(join(root, 'public/apps/mimir-chat-portal/p0-chat-shell.css'), 'utf8');
const html = readFileSync(join(root, 'public/mmir.html'), 'utf8');
const assetVersions = {
  'p0-chat-shell.js': '20260713-connected-intelligence-certainty-v3',
  'p0-chat-shell.css': '20260713-connected-intelligence-label-v2'
};

for (const contract of [
  'payload?.mmir?.scaled_intelligence_label',
  'function renderConnectedIntelligenceLabel(message)',
  'intelligenceLabel:connectedIntelligenceLabel(hostedData)',
  'intelligenceLabel:connectedIntelligenceLabel(data)',
  'renderConnectedIntelligenceLabel(message)'
]) {
  if (!shell.includes(contract)) {
    console.error('Connected-intelligence label contract is missing: ' + contract);
    process.exit(1);
  }
}

if (!css.includes('.p0-connected-intelligence-label')) {
  console.error('Connected-intelligence label styles are missing.');
  process.exit(1);
}

for (const [asset, version] of Object.entries(assetVersions)) {
  if (!html.includes(`./apps/mimir-chat-portal/${asset}?v=${version}`)) {
    console.error(`Public shell must cache-bust ${asset} with the connected-intelligence label version.`);
    process.exit(1);
  }
}

console.log('P0 connected-intelligence label smoke passed.');
await import('./render-check-p0-connected-intelligence-label.mjs');
