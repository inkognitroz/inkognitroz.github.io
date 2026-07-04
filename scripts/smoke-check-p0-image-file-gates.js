import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const publicDir = join(root, 'public');
const portalDir = join(publicDir, 'apps', 'mimir-chat-portal');
const p0Runtime = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const html = readFileSync(join(publicDir, 'mmir.html'), 'utf8');
const imageBoundary = readFileSync(join(portalDir, 'image-boundary.js'), 'utf8');
const visionInput = readFileSync(join(portalDir, 'vision-input.js'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function forbidIncludes(source, needle, message) {
  if (source.includes(needle)) fail(message);
}

const p0ForbiddenLabels = [
  'Add photos',
  'Add photos & files',
  'Add files',
  'Upload file',
  'Upload image',
  'Create image',
  'Generate image',
  'Analyze image',
  'Vision'
];

for (const label of p0ForbiddenLabels) {
  forbidIncludes(p0Runtime, label, `P0 plus/model toolbar must not expose unproven media capability: ${label}`);
}

requireIncludes(
  p0Runtime,
  "menuSection('Bilde')",
  '+ menu must expose the requested photo entrypoint as a guarded local media section.'
);
requireIncludes(
  p0Runtime,
  "menuButton('take-photo-local','Ta bilde'",
  '+ menu must let mobile users open camera capture from the plus menu.'
);
requireIncludes(
  p0Runtime,
  "menuButton('choose-photo-local','Velg fra bibliotek'",
  '+ menu must let users choose an image from the device library.'
);
requireIncludes(
  p0Runtime,
  'id="p0-photo-camera"',
  'P0 shell must include a guarded camera file input.'
);
requireIncludes(
  p0Runtime,
  'capture="environment"',
  'Camera picker should hint rear camera capture on mobile.'
);
requireIncludes(
  p0Runtime,
  'id="p0-photo-library"',
  'P0 shell must include a guarded library file input.'
);
requireIncludes(
  p0Runtime,
  'raw_image_sent:false',
  'P0 photo picker must record that raw images are not sent by the public shell.'
);
requireIncludes(
  p0Runtime,
  'no_server_upload:true',
  'P0 photo picker must keep the selected image browser-local until a protected route exists.'
);
requireIncludes(
  p0Runtime,
  "append(\n      'assistant',\n      'Bildet er valgt fra '",
  'P0 photo picker must acknowledge local selection in chat instead of silently doing nothing.'
);
requireIncludes(
  p0Runtime,
  'Bildeanalyse er ikke aktivert ennå.',
  'P0 photo picker must tell users that real image analysis is not active before a protected vision route exists.'
);
requireIncludes(
  p0Runtime,
  'Do not claim that you can see, analyze, edit, inspect, or describe the image.',
  'P0 chat runtime must guard hosted prompts against false image-analysis claims when raw_image_sent:false.'
);
forbidIncludes(
  p0Runtime,
  'Hva kan du hjelpe meg å gjøre med bildet?',
  'P0 photo picker must not prefill an open-ended prompt that makes unsupported image analysis feel available.'
);

forbidIncludes(
  html,
  './apps/mimir-chat-portal/image-boundary.js',
  'Public first-chat launch must not load image-boundary.js before an image route is proven.'
);
forbidIncludes(
  html,
  './apps/mimir-chat-portal/vision-input.js',
  'Public first-chat launch must not load vision-input.js before a vision route is proven.'
);

requireIncludes(
  imageBoundary,
  'generation_enabled:false',
  'Image boundary must keep generation disabled until a trusted local/protected route exists.'
);
requireIncludes(
  imageBoundary,
  'editing_enabled:false',
  'Image boundary must keep editing disabled until a trusted local/protected route exists.'
);
requireIncludes(
  imageBoundary,
  "gate('public-secrets','No public secrets','passed'",
  'Image boundary must forbid public image-provider secrets.'
);
requireIncludes(
  imageBoundary,
  "gate('execution','No public image execution','blocked'",
  'Image boundary must block public image execution by default.'
);
requireIncludes(
  imageBoundary,
  "gate('privacy','Private media boundary','passed'",
  'Image boundary must keep uploaded media inside local/protected routes with consent.'
);
requireIncludes(
  imageBoundary,
  "consentEl?.checked!==true",
  'Image planning must require explicit user consent.'
);
requireIncludes(
  visionInput,
  "gate('model-capability','Vision-capable model'",
  'Vision input must require a vision-capable route before any analysis claim.'
);
requireIncludes(
  visionInput,
  'Keep the image local until the selected route advertises multimodal capability.',
  'Vision input must preserve local/protected media boundary guidance.'
);
requireIncludes(
  String(packageJson.scripts?.check || ''),
  'smoke-check-p0-image-file-gates.js',
  'npm run check must include the P0 image/file/vision gate smoke.'
);

if (failures.length) {
  console.error('P0 image/file/vision gate smoke failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('P0 image/file/vision gate smoke passed.');
