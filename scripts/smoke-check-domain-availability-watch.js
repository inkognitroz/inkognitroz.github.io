import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const files = {
  report: resolve(root, 'public', 'domain-availability-watch.json'),
  platformStatus: resolve(root, 'public', 'platform-status.json'),
  progressData: resolve(root, 'public', 'progress-dashboard.json'),
  backlog: resolve(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md'),
  implementationLog: resolve(root, 'docs', 'MMIR_IMPLEMENTATION_LOG.md'),
  buildDashboard: resolve(root, 'scripts', 'build-progress-dashboard.js'),
  qualityWorkflow: resolve(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: resolve(root, '.github', 'workflows', 'pages.yml')
};

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function text(file) {
  if (!existsSync(file)) {
    fail(`Missing domain availability watch file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function json(file) {
  try {
    return JSON.parse(text(file));
  } catch (error) {
    fail(`Could not parse ${relative(root, file)}: ${error.message}`);
    return {};
  }
}

function requireTrue(value, message) {
  if (!value) fail(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

const reportText = text(files.report);
const report = json(files.report);
const checks = Array.isArray(report.checks) ? report.checks : [];
const checkIds = new Set(checks.map((check) => check.id));
const progress = json(files.progressData);
const platform = json(files.platformStatus);
const launch = progress.launch_progress || {};
const checkpoints = Array.isArray(launch.checkpoints) ? launch.checkpoints : [];

requireTrue(report.scope === 'D287 domain availability watch', 'Domain watch must declare D287 scope.');
requireTrue(report.public_repo_rule && report.public_repo_rule.includes('no cookies'), 'Domain watch must stay public-safe.');
requireTrue(report.latest_green_commit_short === 'f69d128', 'Domain watch must reference the latest green D286 commit.');
requireTrue(report.custom_domain === 'mmir.ai', 'Domain watch must track mmir.ai.');
requireTrue(report.cname_value === 'mmir.ai', 'Domain watch must preserve public/CNAME custom domain evidence.');
requireTrue(report.dns_observed?.['mmir.ai']?.provider === 'Cloudflare', 'Domain watch must record Cloudflare DNS for mmir.ai.');
requireTrue(report.dns_observed?.['www.mmir.ai']?.provider === 'Cloudflare', 'Domain watch must record Cloudflare DNS for www.mmir.ai.');

for (const ip of ['104.21.63.238', '172.67.173.27']) {
  requireTrue(report.dns_observed?.['mmir.ai']?.a?.includes(ip), `mmir.ai DNS evidence must include ${ip}.`);
  requireTrue(report.dns_observed?.['www.mmir.ai']?.a?.includes(ip), `www.mmir.ai DNS evidence must include ${ip}.`);
}

for (const id of [
  'latest-github-pages-actions',
  'public-cname',
  'mmir-ai-dns',
  'www-mmir-ai-dns',
  'mmir-ai-local-shell',
  'www-mmir-ai-local-shell',
  'github-pages-direct-local-shell',
  'no-spend-domain-path'
]) {
  requireTrue(checkIds.has(id), `Domain watch must include check ${id}.`);
}

requireTrue(checks.some((check) => check.id === 'latest-github-pages-actions' && check.status === 'green'), 'Latest GitHub Pages Actions evidence must be green.');
requireTrue(checks.some((check) => check.id === 'mmir-ai-local-shell' && check.status === 'watch'), 'Local mmir.ai shell fetch must stay a watch item.');
requireTrue(checks.some((check) => check.id === 'no-spend-domain-path' && check.status === 'green'), 'Domain watch must prove no-spend diagnostics.');
requireIncludes(report.diagnosis || '', 'GitHub Pages deploy is green', 'Diagnosis must separate deploy health from domain availability.');
requireIncludes(report.diagnosis || '', 'domain/network watch', 'Diagnosis must call this a domain/network watch.');
requireTrue((report.next_actions || []).some((item) => item.includes('off-network')), 'Next actions must include off-network browser verification.');
requireTrue((report.next_actions || []).some((item) => item.includes('Cloudflare')), 'Next actions must include Cloudflare route verification.');
requireTrue((report.next_actions || []).some((item) => item.includes('secrets')), 'Next actions must keep secrets out of the public repo.');

for (const forbidden of ['ghp_', 'sk_live_', 'sk_test_', 'OPENAI_API_KEY=', 'ANTHROPIC_API_KEY=', 'Bearer ']) {
  requireTrue(!reportText.includes(forbidden), `Domain watch must not expose ${forbidden}.`);
}

requireTrue(platform.domain_availability_watch === './domain-availability-watch.json', 'Platform status must link the domain availability watch report.');
requireTrue((platform.components || []).some((item) => item.id === 'domain-availability-watch-refresh' && item.status === 'watch'), 'Platform status must expose the D287 watch component.');
requireTrue(progress.domain_availability_watch?.scope === 'D287 domain availability watch', 'Progress dashboard data must embed the D287 domain watch report.');
requireTrue(checkpoints.some((item) => item.id === 'domain-availability-watch-refresh' && item.status === 'watch'), 'Launch progress must expose domain availability as a watch checkpoint.');

requireIncludes(text(files.backlog), '| D287 | Launch Reliability | P0 | Domain availability watch refresh |', 'Backlog must include D287.');
requireIncludes(text(files.implementationLog), 'D287 is now beta', 'Implementation log must include D287.');
requireIncludes(text(files.buildDashboard), 'domainAvailabilityWatchPath', 'Progress dashboard build must read the D287 domain watch report.');
requireIncludes(`${text(files.qualityWorkflow)}\n${text(files.pagesWorkflow)}`, 'smoke-check-domain-availability-watch.js', 'GitHub workflows must run the domain availability watch smoke gate.');

if (!process.exitCode) {
  console.log('Domain availability watch smoke check passed.');
}
