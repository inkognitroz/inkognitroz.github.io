import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const portalDir = join(root, 'public', 'apps', 'mimir-chat-portal');
const shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const manifest = readFileSync(join(portalDir, 'asset-versions.json'), 'utf8');
const html = readFileSync(join(root, 'public', 'mmir.html'), 'utf8');
const errors = [];

function requireIncludes(haystack, needle, message) {
  if (!haystack.includes(needle)) errors.push(message);
}

function requireNotIncludes(haystack, needle, message) {
  if (haystack.includes(needle)) errors.push(message);
}

requireIncludes(
  shell,
  "const OWNER_INTELLIGENCE_PING_PATH='/owner/intelligence/ping';",
  'P0 shell must know the owner intelligence ping endpoint.'
);
requireIncludes(
  shell,
  'function ownerPingCommand(prompt)',
  'P0 shell must parse /ping and /admin <code> /ping before normal chat routing.'
);
requireIncludes(
  shell,
  "if(await handleOwnerPingCommand(prompt,input))return;",
  'P0 shell must short-circuit owner ping before owner suggestion intake.'
);
requireIncludes(
  shell,
  "'x-mmir-owner-command-code':parsed.code",
  'P0 owner ping must send the owner code as a request header only.'
);
requireIncludes(
  shell,
  "body:JSON.stringify(compareApiPayload(parsed.prompt))",
  'P0 owner ping must send only the ping prompt payload, not the raw admin command.'
);
requireIncludes(
  shell,
  "append('user','/ping '+parsed.prompt",
  'P0 owner ping transcript must not echo the owner code.'
);
requireIncludes(
  shell,
  "compareGatewayRoutes(parsed.prompt,{mode:'boost'});",
  'Plain /ping must use public Boost instead of adding a new visible control.'
);
requireIncludes(
  shell,
  "const publicAll=text.match(/^\\/all",
  'Plain /all must be parsed as public all-active fanout before normal chat routing.'
);
requireIncludes(
  shell,
  "compareGatewayRoutes(parsed.prompt,{mode:'all'});",
  'Plain /all must use public Ask all active fanout without adding a visible control.'
);
requireIncludes(
  shell,
  "routeStatus('Owner ping · Supergeni + configured free candidates · no paid route','ready');",
  'P0 owner ping must use subtle green route status.'
);
requireNotIncludes(
  shell,
  'id="p0-owner-ping',
  'Owner ping must not add another visible toolbar button.'
);
requireNotIncludes(
  shell,
  'id="p0-ask-all',
  'Ask all must not add another visible toolbar button.'
);
requireNotIncludes(
  shell,
  'command:prompt',
  'Owner ping must not send the raw /admin command body to the API.'
);
requireNotIncludes(
  shell,
  '8520',
  'P0 shell must not hardcode the owner command code.'
);
requireIncludes(
  html,
  'p0-chat-shell.js?v=20260622-feedback-learning-rail-v1',
  'Public page must cache-bust the owner ping runtime.'
);
requireIncludes(
  manifest,
  '"p0-chat-shell.js": "20260622-feedback-learning-rail-v1"',
  'Asset manifest must track the owner ping runtime version.'
);

if (errors.length) {
  console.error('P0 owner intelligence ping smoke failed:');
  for (const error of errors) console.error('- ' + error);
  process.exit(1);
}

console.log('P0 owner intelligence ping smoke passed.');
