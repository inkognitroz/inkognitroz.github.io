import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, relative, resolve } from 'node:path';
import { Script } from 'node:vm';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const mmirPath = join(publicDir, 'mmir.html');
const indexPath = join(publicDir, 'index.html');
const externalInitialJsByteBudget = 146500;
const inlineFirstPaintJsByteBudget = 5000;
const totalFirstPaintJsByteBudget = 151500;
const cacheKey = '20260524-quiet-first-paint-v3';
const runtimeCacheKey = '20260524-first-chat-p0-v1';
const runtimeFixKey = '20260524-first-chat-p0-v1';

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function read(file) {
  if (!existsSync(file)) {
    fail(`Missing required file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function localAssetPath(fromFile, asset) {
  if (!asset || /^[a-z][a-z0-9+.-]*:/i.test(asset) || asset.startsWith('#')) return null;
  const clean = asset.split(/[?#]/)[0];
  if (!clean || clean.startsWith('//')) return null;
  const base = clean.startsWith('/') ? publicDir : dirname(fromFile);
  return normalize(resolve(base, clean.replace(/^\//, '')));
}

function assetSize(fromFile, asset) {
  const file = localAssetPath(fromFile, asset);
  if (!file || !file.startsWith(publicDir) || !existsSync(file)) return 0;
  return statSync(file).size;
}

function attrs(tag) {
  return Object.fromEntries([...tag.matchAll(/\s([a-zA-Z0-9:-]+)(?:=["']([^"']*)["'])?/g)].map((match) => [match[1], match[2] || '']));
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

function inlineExecutableScripts(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .map((match) => ({ attributes: attrs(`<script ${match[1]}>`), body: match[2] || '' }))
    .filter((script) => !script.attributes.src)
    .filter((script) => {
      const type = String(script.attributes.type || '').trim().toLowerCase();
      return !type || type === 'text/javascript' || type === 'application/javascript' || type === 'module';
    });
}

function deferredLoaderBody(html) {
  const match = html.match(/<script>\s*([\s\S]*?window\.MimirLoadDeferred[\s\S]*?)<\/script>/);
  return match ? match[1] : '';
}

const html = read(mmirPath);
const index = read(indexPath);
const cssTags = [...html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi)].map((match) => match[0]);
const scriptTags = [...html.matchAll(/<script\b[^>]*src=["'][^"']+["'][^>]*>/gi)].map((match) => match[0]);
const blockingCss = cssTags.filter((tag) => attrs(tag).media !== 'print');
const deferredCss = cssTags.filter((tag) => attrs(tag).media === 'print' && tag.includes('data-mimir-deferred-style'));
const initialScripts = scriptTags.map((tag) => attrs(tag).src).filter(Boolean);
const deferredScripts = scriptQueue(html);
const inlineScripts = inlineExecutableScripts(html);
const loaderBody = deferredLoaderBody(html);
const blockingCssBytes = blockingCss.reduce((sum, tag) => sum + assetSize(mmirPath, attrs(tag).href), 0);
const initialJsBytes = initialScripts.reduce((sum, src) => sum + assetSize(mmirPath, src), 0);
const inlineFirstPaintJsBytes = inlineScripts.reduce((sum, script) => sum + Buffer.byteLength(script.body, 'utf8'), 0);
const totalFirstPaintJsBytes = initialJsBytes + inlineFirstPaintJsBytes;

if (!index.includes('./mmir.html#mimir-instant-start')) fail('Root page must keep the MMIR first-journey redirect target.');
if (!html.includes('The orchestration layer for trusted AI.')) fail('First viewport identity must stay in the critical shell.');
if (!html.includes('id="mimir-prompt"')) fail('Chat composer must stay in the critical shell.');
if (!html.includes('id="mimir-deferred-scripts"')) fail('MMIR page must define a deferred script queue.');
if (!html.includes('window.MimirLoadDeferred')) fail('MMIR page must expose the deferred loader.');
if (!loaderBody) fail('MMIR page must include the progressive deferred loader body.');
if (blockingCss.length > 4) fail(`Critical blocking CSS budget exceeded: ${blockingCss.length} files.`);
if (deferredCss.length < 24) fail(`Advanced CSS should be non-render-blocking; found only ${deferredCss.length} deferred files.`);
if (initialScripts.length > 9) fail(`Initial JS budget exceeded: ${initialScripts.length} scripts.`);
if (deferredScripts.length < 35) fail(`Advanced modules should load progressively; found only ${deferredScripts.length} deferred scripts.`);
if (blockingCssBytes > 65000) fail(`Blocking CSS budget exceeded: ${blockingCssBytes} bytes.`);
if (initialJsBytes > externalInitialJsByteBudget) fail(`External initial JS budget exceeded: ${initialJsBytes} bytes.`);
if (inlineFirstPaintJsBytes > inlineFirstPaintJsByteBudget) fail(`Inline first-paint JS budget exceeded: ${inlineFirstPaintJsBytes} bytes.`);
if (totalFirstPaintJsBytes > totalFirstPaintJsByteBudget) fail(`Total first-paint JS budget exceeded: ${totalFirstPaintJsBytes} bytes.`);

if (loaderBody) {
  try {
    new Script(loaderBody, { filename: 'mmir-deferred-loader.js' });
  } catch (error) {
    fail(`Deferred loader must be valid JavaScript: ${error.message}`);
  }
}

for (const src of deferredScripts) {
  const file = localAssetPath(mmirPath, src);
  if (!file || !file.startsWith(publicDir) || !existsSync(file) || extname(file) !== '.js') {
    fail(`Deferred script is missing or invalid: ${src}`);
  }
}

for (const required of [
  `./apps/mimir-chat-portal/api-client.js?v=${cacheKey}`,
  `./apps/mimir-chat-portal/chat-runtime.js?v=${runtimeCacheKey}`,
  `./apps/mimir-chat-portal/first-impression.js?v=${cacheKey}`,
  './apps/mimir-chat-portal/chat-first-scroll.js?v=20260524-chat-first-scroll-v1',
  `./apps/mimir-chat-portal/runtime-controls-fix.js?v=${runtimeFixKey}`
]) {
  if (!initialScripts.includes(required)) fail(`Critical first-journey script must load immediately: ${required}`);
}

for (const required of [
  './apps/mimir-chat-portal/workspaces.js',
  './apps/mimir-chat-portal/memory.js',
  './apps/mimir-chat-portal/knowledge.js',
  `./apps/mimir-chat-portal/progress-dashboard.js?v=${cacheKey}`,
  `./apps/mimir-chat-portal/node-dashboard.js?v=${cacheKey}`,
  './apps/mimir-chat-portal/model-comparison.js',
  './apps/mimir-chat-portal/workflow-builder.js'
]) {
  if (!deferredScripts.includes(required)) fail(`Advanced module must be deferred: ${required}`);
}

if (!process.exitCode) {
  console.log(`MMIR performance budget passed: ${blockingCss.length} blocking CSS (${blockingCssBytes} bytes), ${initialScripts.length} initial scripts (${initialJsBytes} external bytes + ${inlineFirstPaintJsBytes} inline bytes = ${totalFirstPaintJsBytes} first-paint JS bytes), ${deferredScripts.length} deferred scripts.`);
}
