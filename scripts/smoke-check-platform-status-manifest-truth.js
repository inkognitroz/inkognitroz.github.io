import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const manifestPath = join(root, 'public', 'platform-status.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const components = Array.isArray(manifest.components) ? manifest.components : [];
const allowedStatuses = new Set(['online', 'watch', 'planned', 'user-controlled']);

function fail(message) {
  throw new Error(message);
}

function findComponent(id) {
  return components.find((component) => component?.id === id) || null;
}

function requireComponent(id) {
  const component = findComponent(id);
  if (!component) fail(`Missing platform status component: ${id}`);
  return component;
}

function requireText(haystack, needle, message) {
  if (!String(haystack || '').includes(needle)) fail(`${message}: missing ${needle}`);
}

function forbidText(haystack, needle, message) {
  if (String(haystack || '').includes(needle)) fail(`${message}: found ${needle}`);
}

const updatedAt = String(manifest.updated_at || '').trim();
const updatedAtMs = Date.parse(updatedAt);
if (!updatedAt || Number.isNaN(updatedAtMs)) {
  fail('updated_at must be an ISO timestamp for public status freshness.');
}

const futureSkewMs = 5 * 60 * 1000;
if (updatedAtMs - Date.now() > futureSkewMs) {
  fail('updated_at must not be future-dated beyond normal clock skew.');
}

const commit = String(manifest.latest_verified_commit || '').trim();
if (!/^[0-9a-f]{7,40}$/i.test(commit)) {
  fail('latest_verified_commit must be a git commit hash.');
}

const seenComponentIds = new Set();
for (const component of components) {
  const id = String(component?.id || '').trim();
  if (!id) fail('Every platform status component must expose a stable id.');
  if (seenComponentIds.has(id)) fail(`Duplicate platform status component id: ${id}`);
  seenComponentIds.add(id);

  const status = String(component?.status || '').trim();
  if (!allowedStatuses.has(status)) {
    fail(`Platform status component ${id} uses unsupported public status: ${status}`);
  }
}

const latestDeploy = requireComponent('latest-deploy-verification');
const domainWatch = requireComponent('domain-availability-watch-refresh');
const noModelDeploy = requireComponent('no-model-deploy-verification');
const publicUrlHealth = requireComponent('public-url-health');

requireText(latestDeploy.route, commit, 'Latest deploy verification route must reference latest_verified_commit');
requireText(domainWatch.route, commit, 'Domain availability watch route must reference latest_verified_commit');
requireText(noModelDeploy.route, commit, 'No-model deploy proof route must reference latest_verified_commit');

requireText(latestDeploy.notes, 'GitHub Actions', 'Latest deploy verification notes must explain the public-safe verification source');
requireText(noModelDeploy.notes, 'no-model fallback path', 'No-model deploy proof must keep the first-answer safety claim specific');
requireText(publicUrlHealth.notes, 'network/domain-reputation watch', 'Public URL health must explain the watch state without internal environment detail');

forbidText(publicUrlHealth.notes, 'PowerShell', 'Public URL health copy must not leak workstation-specific environment detail');
forbidText(domainWatch.notes, 'this environment', 'Domain watch copy must stay generic and public-safe');

console.log('Platform status manifest truth smoke passed.');
