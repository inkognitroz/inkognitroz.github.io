import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const htmlPath = join(root, 'public', 'mmir.html');
const journeysPath = join(root, 'public', 'user-journeys.json');
const manifestPath = join(root, 'public', 'apps', 'mimir-chat-portal', 'asset-versions.json');

const html = readFileSync(htmlPath, 'utf8');
const journeys = JSON.parse(readFileSync(journeysPath, 'utf8'));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const failures = [];
const expectedVersion = '20260705-public-journey-map-v1';

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function forbidIncludes(source, needle, message) {
  if (source.includes(needle)) fail(message);
}

requireIncludes(
  html,
  'id="user-journeys" class="mimir-provider-drawer" data-mimir-capability-state="live"',
  'Public user journeys drawer must be visible as a live public-safe progress surface.'
);
forbidIncludes(
  html,
  'id="user-journeys" class="mimir-provider-drawer" hidden data-mimir-capability-state="planned"',
  'Public user journeys drawer must not be parked behind planned capability state.'
);
requireIncludes(
  html,
  `user-journeys.css?v=${expectedVersion}`,
  'Public page must cache-bust the user journeys stylesheet.'
);
requireIncludes(
  html,
  `user-journeys.js?v=${expectedVersion}`,
  'Public page must load and cache-bust the user journeys runtime.'
);

if (manifest.assets?.['user-journeys.css'] !== expectedVersion) {
  fail('Asset manifest must track the user journeys stylesheet version.');
}
if (manifest.assets?.['user-journeys.js'] !== expectedVersion) {
  fail('Asset manifest must track the user journeys runtime version.');
}

if (journeys.public_repo_rule && /secret|provider key|billing|private user data/i.test(journeys.public_repo_rule) === false) {
  fail('Public repo rule must explicitly mention sensitive data boundaries.');
}

const journeyList = Array.isArray(journeys.journeys) ? journeys.journeys : [];
const progressJourney = journeyList.find((journey) => journey.id === 'J007');
const orchestrationJourney = journeyList.find((journey) => journey.id === 'J004');
if (!orchestrationJourney) {
  fail('Public journey map must include the model-agnostic orchestration journey.');
} else {
  if (!/focused static and rendered comparison\/synthesis coverage is live/i.test(orchestrationJourney.current_gap || '')) {
    fail('Model-agnostic orchestration must acknowledge the focused comparison/synthesis coverage already shipped.');
  }
  if (!/bounded live multi-provider quality evidence/i.test(orchestrationJourney.current_gap || '')) {
    fail('Model-agnostic orchestration must keep the remaining live multi-provider proof gap explicit.');
  }
}
if (!progressJourney) {
  fail('Public journey map must include the progress/operator dashboard journey.');
} else {
  if (progressJourney.status !== 'live') {
    fail('Progress/operator dashboard journey must remain marked live if the drawer is visible.');
  }
  if (!/public-safe/i.test(progressJourney.trust_boundary || '')) {
    fail('Visible progress/operator journey must keep a public-safe trust boundary.');
  }
}

if (journeyList.some((journey) => /paid only after explicit approval/i.test(journey.cost || '')) && !journeys.principles?.some((principle) => /No hidden paid routes/i.test(principle))) {
  fail('Paid future journey copy must be paired with the no-hidden-paid-routes principle.');
}

if (failures.length) {
  console.error('Public user journeys smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Public user journeys smoke passed.');
