import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const appDir = join(publicDir, 'apps', 'mimir-chat-portal');
const assetsDir = join(publicDir, 'assets');
const indexPath = join(publicDir, 'index.html');
const mmirPath = join(publicDir, 'mmir.html');
const coveragePath = join(publicDir, 'ui-action-coverage.json');

const allowedStatuses = new Set(['live', 'beta', 'planned', 'premium-planned', 'disabled']);
const plannedWords = /\b(planned|future|blocked|protected|requires|premium|policy|approval)\b/i;

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function read(file) {
  if (!existsSync(file)) {
    fail(`Missing UI action file: ${relative(root, file)}`);
    return '';
  }
  return readFileSync(file, 'utf8');
}

function appFiles() {
  if (!existsSync(appDir)) return [];
  return readdirSync(appDir)
    .filter((name) => extname(name) === '.js')
    .map((name) => join(appDir, name));
}

function assetFiles() {
  if (!existsSync(assetsDir)) return [];
  return readdirSync(assetsDir)
    .filter((name) => extname(name) === '.js')
    .map((name) => join(assetsDir, name));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function selectorNeedle(selector) {
  const value = String(selector || '').trim();
  if (value.startsWith('#')) {
    const id = value.slice(1);
    return new RegExp(
      `(?:id=["']${escapeRegExp(id)}["']|getElementById\\(["']${escapeRegExp(id)}["']\\)|\\.id=["']${escapeRegExp(id)}["'])`
    );
  }
  if (value.startsWith('[')) {
    const inner = value.slice(1, -1).replace(/\\"/g, '"');
    return new RegExp(escapeRegExp(inner));
  }
  return new RegExp(escapeRegExp(value));
}

function countOccurrences(source, needle) {
  if (!needle) return 0;
  return source.split(needle).length - 1;
}

function extractHtmlIds(source, tagName) {
  const regex = new RegExp(`<${tagName}\\b[^>]*(?:^|\\s)id=["']([^"']+)["'][^>]*>`, 'gi');
  return [...source.matchAll(regex)].map((match) => match[1]);
}

function extractDataActions(source, name) {
  const regex = new RegExp(`${name}=["']([^"']+)["']`, 'gi');
  return [...source.matchAll(regex)].map((match) => match[1]);
}

function requireManifestCoverage(coverage, combinedSource) {
  const groups = Array.isArray(coverage.groups) ? coverage.groups : [];
  if (groups.length < 8) {
    fail('UI action coverage manifest must cover the main MMIR surfaces.');
  }

  const ids = new Set();
  for (const group of groups) {
    if (!group.id || ids.has(group.id)) {
      fail(`UI action coverage group has missing or duplicate id: ${group.id || '<missing>'}`);
    }
    ids.add(group.id);

    if (!allowedStatuses.has(group.status)) {
      fail(`UI action coverage group ${group.id} has unsupported status: ${group.status}`);
    }
    if (!group.surface || !group.user_result) {
      fail(`UI action coverage group ${group.id} must include surface and user_result.`);
    }
    if ((group.status === 'planned' || group.status === 'premium-planned') && !plannedWords.test(group.user_result)) {
      fail(`Planned UI action group ${group.id} must explain the user-visible blocked/planned boundary.`);
    }

    const selectors = Array.isArray(group.selectors) ? group.selectors : [];
    const evidence = Array.isArray(group.evidence) ? group.evidence : [];
    if (!selectors.length || !evidence.length) {
      fail(`UI action coverage group ${group.id} must include selectors and evidence.`);
    }

    for (const selector of selectors) {
      if (!selectorNeedle(selector).test(combinedSource)) {
        fail(`UI action coverage selector ${selector} for ${group.id} is not present in page or app code.`);
      }
    }
    for (const needle of evidence) {
      if (!combinedSource.includes(needle)) {
        fail(`UI action coverage evidence "${needle}" for ${group.id} is not present in page or app code.`);
      }
    }
  }
}

function requireHashLinksAreSafe(source) {
  const tags = [...source.matchAll(/<a\b[^>]*href=["']#["'][^>]*>/gi)].map((match) => match[0]);
  for (const tag of tags) {
    if (!/\baria-disabled=["']true["']/i.test(tag) || !/\bclass=["'][^"']*\bdisabled\b/i.test(tag)) {
      fail(`Active href="#" link must be disabled with aria-disabled=true: ${tag}`);
    }
  }
}

function requireAnchorTargets(indexSource, combinedSource) {
  const targets = [...indexSource.matchAll(/href=["']#([^"']+)["']/gi)]
    .map((match) => match[1])
    .filter(Boolean);
  for (const target of targets) {
    const regex = selectorNeedle(`#${target}`);
    if (!regex.test(combinedSource)) {
      fail(`Homepage anchor #${target} has no static or generated target.`);
    }
  }
}

function requireStaticControlsCovered(indexSource, coverage) {
  const selectors = new Set(
    (coverage.groups || []).flatMap((group) => Array.isArray(group.selectors) ? group.selectors : [])
  );
  const staticButtonIds = extractHtmlIds(indexSource, 'button');
  const staticLinkIds = extractHtmlIds(indexSource, 'a').filter((id) => /chat|launch/i.test(id));
  for (const id of [...staticButtonIds, ...staticLinkIds]) {
    if (!selectors.has(`#${id}`) && id !== 'beta-signup-submit') {
      fail(`Static homepage control #${id} is missing from ui-action-coverage.json.`);
    }
  }
  if (!selectors.has('[data-prompt-action]')) {
    fail('Smart prompt actions must be covered in ui-action-coverage.json.');
  }
}

function requireDynamicActionSignals(combinedSource) {
  const buttonIds = [...new Set(extractHtmlIds(combinedSource, 'button'))];
  const requiredIds = buttonIds.filter((id) => !/^theme-|^onboarding-/.test(id));
  for (const id of requiredIds) {
    if (countOccurrences(combinedSource, id) < 2) {
      fail(`Button #${id} appears to be rendered without an implementation reference.`);
    }
  }

  for (const actionName of ['data-action', 'data-local-action', 'data-chat-mode']) {
    const actions = [...new Set(extractDataActions(combinedSource, actionName))];
    for (const action of actions) {
      if (countOccurrences(combinedSource, action) < 2) {
        fail(`Action ${actionName}="${action}" appears to be rendered without handler evidence.`);
      }
    }
  }
}

const indexSource = read(indexPath);
const mmirSource = read(mmirPath);
const pageSource = `${indexSource}\n${mmirSource}`;
const scriptSource = appFiles().concat(assetFiles()).map(read).join('\n');
const combinedSource = `${pageSource}\n${scriptSource}\n${read(join(publicDir, 'connect-options.json'))}\n${read(join(publicDir, 'ai-model-catalog.json'))}`;

let coverage = {};
try {
  coverage = JSON.parse(read(coveragePath));
} catch (error) {
  fail(`Invalid UI action coverage JSON: ${error.message}`);
}

requireManifestCoverage(coverage, combinedSource);
requireHashLinksAreSafe(pageSource);
requireAnchorTargets(pageSource, combinedSource);
requireStaticControlsCovered(pageSource, coverage);
requireDynamicActionSignals(`${pageSource}\n${scriptSource}`);

if (!process.exitCode) {
  console.log('UI action coverage smoke check passed.');
}
