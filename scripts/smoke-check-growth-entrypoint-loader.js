import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const html = readFileSync(join(root, 'public', 'mmir.html'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function parseScriptList(id) {
  const match = html.match(new RegExp(`<script\\s+id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/script>`, 'i'));
  if (!match) {
    fail(`public/mmir.html must keep the ${id} script manifest.`);
    return [];
  }
  try {
    const value = JSON.parse(match[1]);
    return Array.isArray(value) ? value : [];
  } catch (error) {
    fail(`${id} must stay valid JSON.`);
    return [];
  }
}

const deferredRefs = parseScriptList('mimir-deferred-scripts');
const growthRefs = parseScriptList('mimir-growth-scripts');
const growthExpected = [
  './apps/mimir-chat-portal/demo-growth.js?v=20260622-growth-entrypoint-loader-v1',
  './apps/mimir-chat-portal/beta-signup.js?v=20260622-growth-entrypoint-loader-v1'
];

for (const ref of growthExpected) {
  if (!growthRefs.includes(ref)) fail(`Growth entrypoint loader must include ${ref}.`);
  if (deferredRefs.includes(ref)) fail(`Growth entrypoint must stay out of the default deferred launch queue: ${ref}.`);
}

for (const needle of [
  'window.MimirLoadGrowth=loadGrowth;',
  "var growthTarget=event.target.closest('#try-demo-mode,#beta-signup-submit,[href=\"#beta-signup-form\"]');",
  "if(form&&form.id==='beta-signup-form'&&(!started||!growthStarted)){"
]) {
  if (!html.includes(needle)) fail(`Growth entrypoint loader is missing: ${needle}`);
}

if (!String(packageJson.scripts?.check || '').includes('smoke-check-growth-entrypoint-loader.js')) {
  fail('npm run check must include the growth entrypoint loader smoke.');
}

if (failures.length) {
  console.error('Growth entrypoint loader smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Growth entrypoint loader smoke passed.');
