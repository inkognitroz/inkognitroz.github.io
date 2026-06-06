#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const publicDir = join(root, 'public');
const portalDir = join(publicDir, 'apps', 'mimir-chat-portal');
const previewHtmlPath = join(portalDir, 'design-preview.html');
const previewCssPath = join(portalDir, 'design-preview.css');
const previewJsPath = join(portalDir, 'design-preview.js');
const mmirHtml = readFileSync(join(publicDir, 'mmir.html'), 'utf8');
const manifest = JSON.parse(readFileSync(join(portalDir, 'asset-versions.json'), 'utf8'));
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(path) {
  if (!existsSync(path)) {
    fail(`Missing file: ${path.replace(root + '/', '')}`);
    return '';
  }
  return readFileSync(path, 'utf8');
}

const previewHtml = read(previewHtmlPath);
const previewCss = read(previewCssPath);
const previewJs = read(previewJsPath);

if (!previewHtml.includes('data-mimir-design-preview="B1-05"')) {
  fail('Preview HTML must identify the B1-05 design preview lane.');
}
if (!previewHtml.includes('data-preview-only="true"')) {
  fail('Preview HTML must mark itself preview-only.');
}
if (!previewHtml.includes('./design-preview.css') || !previewHtml.includes('./design-preview.js')) {
  fail('Preview HTML must load only the isolated preview CSS/JS.');
}
if (mmirHtml.includes('design-preview')) {
  fail('public/mmir.html must not load or link the design preview lane.');
}
if (Object.prototype.hasOwnProperty.call(manifest.assets || {}, 'design-preview.css') || Object.prototype.hasOwnProperty.call(manifest.assets || {}, 'design-preview.js')) {
  fail('Preview assets must not be added to the launch-critical asset manifest.');
}
if (!previewHtml.includes('No live routes') || !previewHtml.includes('No provider keys')) {
  fail('Preview page must display its non-production guardrails.');
}
if (!previewHtml.includes('role="tablist"') || !previewHtml.includes('role="tabpanel"')) {
  fail('Preview variants must use tablist/tabpanel semantics.');
}
['clean', 'compare', 'local'].forEach((name) => {
  if (!previewHtml.includes(`id="preview-tab-${name}"`) || !previewHtml.includes(`aria-controls="preview-panel-${name}"`)) {
    fail(`Preview tab ${name} must control its matching panel.`);
  }
  if (!previewHtml.includes(`id="preview-panel-${name}"`) || !previewHtml.includes(`aria-labelledby="preview-tab-${name}"`)) {
    fail(`Preview panel ${name} must be labelled by its matching tab.`);
  }
});
if (!previewJs.includes('previewOnly:true') || /fetch\s*\(/.test(previewJs)) {
  fail('Preview JS must be preview-only and must not fetch live routes.');
}
if (!previewJs.includes('panel.hidden=!active') || !previewJs.includes("tab.setAttribute('aria-selected'")) {
  fail('Preview JS must keep tab and panel accessibility state in sync.');
}
if (!previewCss.includes('letter-spacing: 0')) {
  fail('Preview CSS must preserve normal letter spacing for readable chat UI.');
}
if (!String(packageJson.scripts?.check || '').includes('smoke-check-ui-design-preview-lane.js')) {
  fail('npm run check must include smoke-check-ui-design-preview-lane.js.');
}

if (failures.length) {
  console.error('UI design preview lane smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('UI design preview lane smoke passed.');
