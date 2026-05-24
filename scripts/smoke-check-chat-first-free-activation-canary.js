import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const textExtensions = new Set(['.cmd', '.command', '.css', '.html', '.js', '.json', '.mjs', '.ps1', '.sh', '.svg', '.txt']);
const files = {
  report: join(publicDir, 'chat-first-free-activation-canary-report.json'),
  progressData: join(publicDir, 'progress-dashboard.json'),
  mmir: join(publicDir, 'mmir.html'),
  chatRuntime: join(publicDir, 'apps', 'mimir-chat-portal', 'chat-runtime.js'),
  progressDashboard: join(publicDir, 'apps', 'mimir-chat-portal', 'progress-dashboard.js'),
  buildDashboard: join(root, 'scripts', 'build-progress-dashboard.js'),
  macInstaller: join(publicDir, 'downloads', 'mmir-local-connector-mac.command'),
  macZipPage: join(publicDir, 'downloads', 'mmir-local-connector-mac.zip.html'),
  connectorServer: join(publicDir, 'downloads', 'mmir-local-connector-server.mjs'),
  releaseManifest: join(publicDir, 'downloads', 'mmir-local-connector-release.json'),
  qualityWorkflow: join(root, '.github', 'workflows', 'quality.yml'),
  pagesWorkflow: join(root, '.github', 'workflows', 'pages.yml'),
  backlog: join(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md'),
  implementationLog: join(root, 'docs', 'MMIR_IMPLEMENTATION_LOG.md'),
  reviewDoc: join(root, 'docs', 'MMIR_FREE_ACTIVATION_CANARY_D253.md')
};

const failures = [];

function fail(message) {
  failures.push(message);
  console.error(message);
}

function raw(file) {
  if (!existsSync(file)) {
    fail(`Missing D253 file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function json(file) {
  try {
    return JSON.parse(raw(file));
  } catch (error) {
    fail(`Invalid JSON in ${relative(root, file)}: ${error.message}`);
    return {};
  }
}

function bytesForHash(file) {
  const bytes = readFileSync(file);
  if (!textExtensions.has(extname(file).toLowerCase())) return bytes;
  return Buffer.from(bytes.toString('utf8').replace(/\r\n/g, '\n'), 'utf8');
}

function sha256(file) {
  return createHash('sha256').update(bytesForHash(file)).digest('hex');
}

function compact(file) {
  return raw(file).replace(/\s+/g, ' ');
}

function requireIncludes(file, needle, message) {
  if (!compact(file).includes(String(needle).replace(/\s+/g, ' '))) fail(message);
}

function requireTrue(condition, message) {
  if (!condition) fail(message);
}

const report = json(files.report);
requireTrue(report.title === 'Chat-First Free Activation Canary', 'D253 report must name the chat-first free activation canary.');
requireTrue(report.task === 'D253', 'D253 report must be tied to D253.');
requireTrue(report.status === 'beta', 'D253 report must be beta, with real-device install QA still watched.');
requireTrue(report.no_spend?.paid_services_used === false, 'D253 canary must not use paid services.');
requireTrue(report.no_spend?.provider_keys_required === false, 'D253 canary must not require provider keys.');
requireTrue(report.public_repo_rule?.includes('public frontend'), 'D253 report must document the public repo boundary.');

for (const journeyId of ['J001', 'J002', 'J003', 'J004', 'J005']) {
  const journey = (report.journeys || []).find((item) => item.id === journeyId);
  requireTrue(Boolean(journey?.name && journey?.automatic_path && journey?.completion_signal), `D253 journey ${journeyId} must be complete.`);
}

const j001 = (report.journeys || []).find((item) => item.id === 'J001');
const j002 = (report.journeys || []).find((item) => item.id === 'J002');
requireTrue(j001?.status === 'ready', 'D253 instant free chat must be ready.');
requireTrue(String(j002?.status || '').includes('beta'), 'D253 Mac local node journey must stay beta/watch until real-device QA.');

for (const stepId of ['open-site', 'automatic-free-route', 'first-useful-answer', 'local-node-mac-install', 'model-proof']) {
  const step = (report.canary_path || []).find((item) => item.id === stepId);
  requireTrue(Boolean(step?.selector && step?.expected), `D253 canary step ${stepId} must have selector and expected result.`);
}

for (const evidenceId of ['chat-composer', 'receipt-coverage', 'mac-installer-checksum', 'free-route-cost-guard', 'device-runtime']) {
  const evidence = (report.evidence || []).find((item) => item.id === evidenceId);
  requireTrue(Boolean(evidence?.status && evidence?.result), `D253 evidence ${evidenceId} must be present.`);
}

for (const needle of [
  '#mimir-prompt',
  'primary-chat-link',
  'new-backend',
  '#model-library',
  '#local-connector'
]) {
  requireIncludes(files.mmir, needle, `D253 first screen missing chat-first control: ${needle}`);
}

for (const needle of [
  "recordFirstChatReceipt('success',{",
  'uReceipt',
  "'browser-helper':'installable-local'",
  "'browser-webgpu'",
  'noModelFallbackStarter',
  'Download Mac installer',
  '/chat/completions'
]) {
  requireIncludes(files.chatRuntime, needle, `D253 chat runtime missing canary behavior: ${needle}`);
}

const connectorSha = sha256(files.connectorServer);
requireIncludes(files.macInstaller, `SERVER_SHA256="\${MMIR_LOCAL_CONNECTOR_SERVER_SHA256:-${connectorSha}}"`, 'D253 Mac installer server checksum must match connector server.');
requireIncludes(files.macInstaller, 'ensure_ollama', 'D253 Mac installer must install/start Ollama.');
requireIncludes(files.macInstaller, 'ensure_model', 'D253 Mac installer must pull a starter model.');
requireIncludes(files.macInstaller, 'mmir_local_return=1#local-connector', 'D253 Mac installer must return to MMIR proof.');
requireIncludes(files.macZipPage, `Installer source SHA-256: ${sha256(files.macInstaller)}`, 'D253 Mac ZIP page must show the current command installer checksum.');

const manifest = json(files.releaseManifest);
const macArtifact = (manifest.artifacts || []).find((item) => item.id === 'mac-command');
requireTrue(macArtifact?.sha256 === sha256(files.macInstaller), 'D253 release manifest must carry current Mac command checksum.');
requireTrue(manifest.cost_policy?.includes('zero-cost'), 'D253 release manifest must keep zero-cost policy.');

for (const needle of [
  'chatFirstFreeActivationCanaryReportPath',
  'readChatFirstFreeActivationCanaryReport',
  "['D253', { status: 'beta'",
  "['D254', { status: 'next'",
  "const prioritizedNextIds = ['D254'"
]) {
  requireIncludes(files.buildDashboard, needle, `D253 dashboard build missing ${needle}.`);
}

for (const needle of [
  'renderChatFirstFreeActivationCanaryReport',
  'chat_first_free_activation_canary_report',
  'progress-chat-first-free-activation-canary',
  'Chat-first activation canary'
]) {
  requireIncludes(files.progressDashboard, needle, `D253 Progress Dashboard missing ${needle}.`);
}

requireIncludes(files.qualityWorkflow, 'smoke-check-chat-first-free-activation-canary.js', 'Quality workflow must run D253 free activation canary QA.');
requireIncludes(files.pagesWorkflow, 'smoke-check-chat-first-free-activation-canary.js', 'Pages workflow must run D253 free activation canary QA.');
requireIncludes(files.backlog, '| D254 |', 'Backlog must add D254 after D253.');
requireIncludes(files.implementationLog, 'D253 is now beta', 'Implementation log must mark D253 beta.');
requireIncludes(files.implementationLog, 'D254 is now next', 'Implementation log must mark D254 next.');
requireIncludes(files.reviewDoc, 'Instant free chat', 'D253 review doc must document instant free chat.');
requireIncludes(files.reviewDoc, 'Mac local node install', 'D253 review doc must document Mac local node install.');

const progress = json(files.progressData);
requireTrue(progress.chat_first_free_activation_canary_report?.title === report.title, 'Progress dashboard data must embed D253 report.');
const tasks = Array.isArray(progress.tasks) ? progress.tasks : [];
const d253 = tasks.find((task) => task.seq === 'D253');
const d254 = tasks.find((task) => task.seq === 'D254');
requireTrue(d253?.status === 'beta', 'Progress dashboard task D253 must be beta after canary ships.');
requireTrue(d254?.status === 'next', 'Progress dashboard task D254 must become next after D253 ships.');
requireTrue(Array.isArray(progress.next_queue) && progress.next_queue[0] === 'D254', 'Progress dashboard next queue must prioritize D254 after D253 ships.');

if (failures.length) {
  process.exitCode = 1;
} else {
  console.log('Chat-first free activation canary smoke check passed.');
}
