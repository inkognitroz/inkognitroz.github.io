import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const runbookPath = join(root, 'ACTIONS_FREE_WEB_PREVIEW_DEPLOY.md');
const workerConfigPath = join(root, 'cloudflare', 'wrangler.production-preview.jsonc');

function fail(message) {
  throw new Error(message);
}

function requireText(text, needle, message) {
  if (!text.includes(needle)) fail(`${message}: missing ${needle}`);
}

function forbidText(text, needle, message) {
  if (text.includes(needle)) fail(`${message}: found ${needle}`);
}

if (!existsSync(runbookPath)) fail('Actions-free web preview deploy runbook is missing.');

const runbook = readFileSync(runbookPath, 'utf8');
const workerConfig = readFileSync(workerConfigPath, 'utf8');

requireText(runbook, 'npm run check', 'Runbook must require local checks before deploy');
requireText(runbook, 'wrangler deploy --config cloudflare/wrangler.production-preview.jsonc --dry-run', 'Runbook must require Wrangler dry-run');
requireText(runbook, 'wrangler deploy --config cloudflare/wrangler.production-preview.jsonc', 'Runbook must document direct Wrangler deploy');
requireText(runbook, 'npm run smoke:staging-council-live', 'Runbook must require live Council smoke');
requireText(runbook, 'https://mmir-web-production-preview.halvord-vinger.workers.dev/mmir.html', 'Runbook must publish the preview URL');
requireText(runbook, 'does not update `mmir.ai`', 'Runbook must state the public domain is unchanged');
requireText(runbook, 'does not change DNS', 'Runbook must forbid DNS changes');
requireText(runbook, 'does not enable paid providers', 'Runbook must forbid paid-provider enablement');
requireText(runbook, 'Avoid KV probe writes', 'Runbook must keep KV usage low');

forbidText(runbook, 'gh workflow run', 'Actions-free runbook must not dispatch GitHub workflows');
forbidText(runbook, 'github-pages', 'Actions-free runbook must not imply Pages promotion');

requireText(workerConfig, '"name": "mmir-web-production-preview"', 'Preview deploy must target the preview Worker');
requireText(workerConfig, '"workers_dev": true', 'Preview deploy must remain workers.dev only');
requireText(workerConfig, '"enabled": false', 'Preview deploy must keep observability off by default');

if (/"routes"\s*:/.test(workerConfig) || /"custom_domain"\s*:/.test(workerConfig)) {
  fail('Preview Worker config must not bind custom routes or domains.');
}

console.log('Actions-free preview deploy runbook smoke passed.');
