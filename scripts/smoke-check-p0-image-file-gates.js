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
