import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const portalDir = join(root, 'public', 'apps', 'mimir-chat-portal');
const runtime = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const css = readFileSync(join(portalDir, 'p0-chat-shell.css'), 'utf8');
const versions = JSON.parse(readFileSync(join(portalDir, 'asset-versions.json'), 'utf8'));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

requireIncludes(
  runtime,
  "function renderGeneratedImageCard(content)",
  'P0 runtime must render generated image responses as image cards.'
);
requireIncludes(
  runtime,
  "image\\.pollinations\\.ai",
  'P0 generated-image renderer must be scoped to the proven Pollinations no-key node URL.'
);
requireIncludes(
  runtime,
  "data-node-id=\"mmir-node-bilde\"",
  'P0 runtime should keep generated image cards tied to the mmir-node-bilde capability.'
);
requireIncludes(
  runtime,
  "referrerpolicy=\"no-referrer\"",
  'Generated image cards must avoid leaking the MMIR page as referrer.'
);
requireIncludes(
  runtime,
  "function handleGeneratedImageError(event)",
  'Generated image cards must expose a clean broken-preview fallback.'
);
requireIncludes(
  runtime,
  "if(previewLink)previewLink.hidden=true",
  'Generated image fallbacks must not leave an empty focusable preview link.'
);
requireIncludes(
  runtime,
  "renderMessageBody(message,visibleContent)",
  'Transcript renderer must use the generated-image-aware message body renderer.'
);
requireIncludes(
  css,
  ".p0-generated-image-card",
  'Generated image card CSS must exist.'
);
requireIncludes(
  css,
  "aspect-ratio: 4 / 3",
  'Generated image cards must reserve stable image dimensions.'
);
requireIncludes(
  css,
  ".p0-generated-image-card.is-preview-unavailable",
  'Generated image cards must style the broken-preview fallback.'
);

const shellVersion = versions.assets?.['p0-chat-shell.js'] || '';
const cssVersion = versions.assets?.['p0-chat-shell.css'] || '';
if (!shellVersion) {
  fail('p0-chat-shell.js asset version must be bumped for generated image card runtime.');
}

if (!cssVersion) {
  fail('p0-chat-shell.css asset version must be bumped for generated image card CSS.');
}

requireIncludes(
  runtime,
  "const P0_RUNTIME_VERSION='"+shellVersion+"'",
  'P0 runtime version must match the generated-image runtime asset version.'
);

if (!String(packageJson.scripts?.check || '').includes('smoke-check-p0-generated-image-card.js')) {
  fail('npm run check must include generated image card smoke.');
}

if (failures.length) {
  console.error('P0 generated image card smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('P0 generated image card smoke passed.');
