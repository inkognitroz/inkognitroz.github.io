#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const portal = join(root, 'public', 'apps', 'mimir-chat-portal');
const runtimeCss = readFileSync(join(portal, 'chat-runtime.css'), 'utf8');
const workspaceCss = readFileSync(join(portal, 'chat-workspace.css'), 'utf8');
const ownership = readFileSync(join(portal, 'MODULE_OWNERSHIP.md'), 'utf8');

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireIncludes(source, needle, label) {
  if (!source.includes(needle)) {
    fail(`${label}: missing ${needle}`);
  }
}

function requireExcludes(source, needle, label) {
  if (source.includes(needle)) {
    fail(`${label}: unexpected ${needle}`);
  }
}

requireIncludes(
  workspaceCss,
  'Public composer ownership',
  'chat-workspace.css must document public composer ownership'
);
requireIncludes(
  workspaceCss,
  '.mimir-public-chat .composer-mode-dock',
  'chat-workspace.css must own public composer dock layout'
);
requireIncludes(
  workspaceCss,
  '.mimir-public-chat #runtime-model-chip',
  'chat-workspace.css must own public model chip styling'
);
requireIncludes(
  workspaceCss,
  '.mimir-public-chat .composer-actions',
  'chat-workspace.css must own public composer action sizing'
);
requireExcludes(
  runtimeCss,
  '.mimir-public-chat .composer-mode-dock',
  'chat-runtime.css must not own scoped public composer dock overrides'
);
requireExcludes(
  runtimeCss,
  '.mimir-public-chat .composer-live-chip',
  'chat-runtime.css must not own scoped public live chip overrides'
);
requireExcludes(
  runtimeCss,
  '.mimir-public-chat .composer-actions',
  'chat-runtime.css must not own scoped public composer action overrides'
);
requireIncludes(
  ownership,
  'Public composer CSS',
  'MODULE_OWNERSHIP.md must name the public composer CSS owner'
);

console.log('composer CSS ownership smoke passed');
