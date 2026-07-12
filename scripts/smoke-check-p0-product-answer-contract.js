import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const runtime = readFileSync(join(root, 'public/apps/mimir-chat-portal/chat-runtime.js'), 'utf8');
const manifest = JSON.parse(readFileSync(join(root, 'public/apps/mimir-chat-portal/asset-versions.json'), 'utf8'));
const html = readFileSync(join(root, 'public/mmir.html'), 'utf8');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = manifest.assets?.['chat-runtime.js'] || '';

for (const phrase of [
  'When asked what MMIR is or what it can do today',
  'lead with concrete user outcomes and currently usable capabilities',
  'do not lead with routes, nodes, orchestration or other internal plumbing unless the user asks for technical details'
]) {
  if (!runtime.includes(phrase)) {
    console.error('Product-answer contract is missing: ' + phrase);
    process.exit(1);
  }
}
if (!version || !html.includes(`./apps/mimir-chat-portal/chat-runtime.js?v=${version}`)) {
  console.error('Public shell must serve the manifest version of chat-runtime.js.');
  process.exit(1);
}
if (pkg.scripts?.['check:product-answer'] !== 'node scripts/smoke-check-p0-product-answer-contract.js') {
  console.error('package scripts must expose the focused product-answer contract check.');
  process.exit(1);
}

console.log('P0 product-answer contract smoke passed.');
