import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const firstImpression = readFileSync(join(resolve(root, 'public'), 'apps', 'mimir-chat-portal', 'first-impression.js'), 'utf8');

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function requireIncludes(needle, message) {
  if (!firstImpression.includes(needle)) fail(message);
}

function forbidIncludes(needle, message) {
  if (firstImpression.includes(needle)) fail(message);
}

requireIncludes('scheduleRun', 'First impression updates must be scheduled instead of fired directly from broad observers.');
requireIncludes('lastReadinessSignature', 'Readiness rail must avoid DOM rewrites when state has not changed.');
requireIncludes('rail.replaceChildren', 'Readiness rail should update atomically when its signature changes.');
requireIncludes('observerTargets=[', 'First impression observer must use a bounded target list.');
forbidIncludes('observe(document.documentElement', 'First impression must not observe the entire document subtree.');
forbidIncludes('rail.innerHTML', 'Readiness rail must not clear and rebuild itself on every run.');

if (!process.exitCode) {
  console.log('First impression runtime smoke check passed.');
}
