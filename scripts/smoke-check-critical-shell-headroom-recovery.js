import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const mmirPath = join(publicDir, 'mmir.html');
const progressDataPath = join(publicDir, 'progress-dashboard.json');
const recoveredInitialJsBudget = 145000;

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function read(file) {
  if (!existsSync(file)) {
    fail(`Missing critical-shell recovery file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function attrs(tag) {
  return Object.fromEntries([...tag.matchAll(/\s([a-zA-Z0-9:-]+)(?:=["']([^"']*)["'])?/g)].map((match) => [match[1], match[2] || '']));
}

function localAssetPath(fromFile, asset) {
  if (!asset || /^[a-z][a-z0-9+.-]*:/i.test(asset) || asset.startsWith('#')) return null;
  const clean = asset.split(/[?#]/)[0];
  const base = clean.startsWith('/') ? publicDir : dirname(fromFile);
  return normalize(resolve(base, clean.replace(/^\//, '')));
}

function assetSize(fromFile, asset) {
  const file = localAssetPath(fromFile, asset);
  if (!file || !file.startsWith(publicDir) || !existsSync(file)) return 0;
  return statSync(file).size;
}

function scriptQueue(html) {
  const match = html.match(/<script id="mimir-deferred-scripts" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return [];
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    fail(`Deferred script queue must be valid JSON: ${error.message}`);
    return [];
  }
}

function json(file) {
  try {
    return JSON.parse(read(file));
  } catch (error) {
    fail(`Invalid JSON in ${relative(root, file)}: ${error.message}`);
    return {};
  }
}

const html = read(mmirPath);
const progressData = json(progressDataPath);
const scriptTags = [...html.matchAll(/<script\b[^>]*src=["'][^"']+["'][^>]*>/gi)].map((match) => match[0]);
const initialScripts = scriptTags.map((tag) => attrs(tag).src).filter(Boolean);
const initialJsBytes = initialScripts.reduce((sum, src) => sum + assetSize(mmirPath, src), 0);
const deferredScripts = scriptQueue(html);

if (initialScripts.includes('./apps/mimir-chat-portal/demo-growth.js')) {
  fail('D200 demo-growth.js must not load as an initial critical script.');
}
if (!deferredScripts.includes('./apps/mimir-chat-portal/demo-growth.js')) {
  fail('D200 demo-growth.js must load through the deferred queue.');
}
if (initialJsBytes > recoveredInitialJsBudget) {
  fail(`D200 recovered initial JS budget exceeded: ${initialJsBytes} bytes.`);
}
for (const needle of [
  "event.target.closest('#try-demo-mode')",
  "loadDeferred().then(function(){demo.click();})",
  'window.MimirLoadDeferred=loadDeferred'
]) {
  if (!html.includes(needle)) fail(`D200 deferred demo click handoff missing: ${needle}`);
}

const tasks = Array.isArray(progressData.tasks) ? progressData.tasks : [];
const d200 = tasks.find((task) => task.seq === 'D200');
if (!d200 || d200.status !== 'beta') {
  fail('Progress dashboard task D200 must be beta after critical-shell headroom recovery ships.');
}

const d201 = tasks.find((task) => task.seq === 'D201');
if (!d201 || d201.status !== 'beta') {
  fail('Progress dashboard task D201 must stay beta after deploy QA verification ships.');
}

const d202 = tasks.find((task) => task.seq === 'D202');
if (!d202 || d202.status !== 'beta') {
  fail('Progress dashboard task D202 must stay beta after first-screen visual QA ships.');
}
const d203 = tasks.find((task) => task.seq === 'D203');
if (!d203 || d203.status !== 'next') {
  fail('Progress dashboard must expose D203 as the next composer model picker work item.');
}

if (!process.exitCode) {
  console.log(`Critical-shell headroom recovery smoke check passed at ${initialJsBytes} initial JS bytes.`);
}
