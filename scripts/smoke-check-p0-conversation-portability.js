import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const portalDir = join(root, 'public/apps/mimir-chat-portal');
const manager = readFileSync(join(portalDir, 'conversation-manager.js'), 'utf8');
const styles = readFileSync(join(portalDir, 'conversation-manager.css'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function fail(message) {
  console.error(message);
  process.exit(1);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

requireIncludes(
  manager,
  "CONVERSATION_EXPORT_SCHEMA='2026-06-07-b0-06-13-conversation-export-v1'",
  'Conversation export schema must be explicit.'
);
requireIncludes(manager, "object:'mmir.conversation_export'", 'Export must use an MMIR conversation envelope.');
requireIncludes(manager, 'manifest:{', 'Export must include a portable manifest.');
requireIncludes(manager, 'route_snapshot:routeSnapshot(item)', 'Export manifest must include route snapshot metadata.');
requireIncludes(manager, 'local_file_only:true', 'Export privacy must be local-file-first.');
requireIncludes(manager, 'owner_controlled_export:true', 'Export privacy must mark owner-controlled export.');
requireIncludes(manager, 'includes_raw_messages:true', 'Export privacy must be honest that local files include raw messages.');
requireIncludes(manager, 'backend_sync_started:false', 'Export/import must not imply backend sync.');
requireIncludes(manager, 'private_account_scraping:false', 'Export/import must not scrape private accounts.');
requireIncludes(manager, 'public_report_safe:false', 'Raw exported conversations must not be treated as public-report-safe.');
requireIncludes(manager, 'provider_secrets_included:false', 'Export envelope must state provider secrets are excluded.');
requireIncludes(manager, 'normalizeImportedMessages', 'Import must normalize message payloads.');
requireIncludes(manager, "allowedRoles=new Set(['user','assistant','tool'])", 'Import must reject hidden system messages.');
requireIncludes(manager, 'MAX_IMPORTED_CONVERSATION_BYTES=1024*1024', 'Import must be size bounded.');
requireIncludes(manager, 'MAX_IMPORTED_MESSAGES=240', 'Import must be message-count bounded.');
requireIncludes(manager, 'importConversationPayload', 'Conversation manager must expose local import helper.');
requireIncludes(manager, 'importConversationFile', 'Conversation manager must read local JSON files.');
requireIncludes(manager, 'conversation-import-file', 'Conversation manager must include hidden file input.');
requireIncludes(manager, 'accept="application/json,.json"', 'Import input must accept only JSON files.');
requireIncludes(manager, 'Conversation imported locally. No backend sync started.', 'Import success message must be privacy-clear.');
requireIncludes(manager, 'Conversation exported as a local file. No backend sync started.', 'Export status must be privacy-clear.');
requireIncludes(manager, 'URL.createObjectURL(blob)', 'Export must remain a local browser file download.');
requireIncludes(manager, "link.download='mmir-conversation-'+id+'.json'", 'Export must use a deterministic local JSON filename.');
requireIncludes(styles, '.conversation-portability-row', 'Import/export row must have owned styling.');
requireIncludes(styles, '.conversation-portability-row button', 'Import/export action must use owned button styling.');

if (/\bfetch\s*\(/.test(manager) || /\bXMLHttpRequest\b/.test(manager) || /\bsendBeacon\b/.test(manager)) {
  fail('Conversation portability must not start network sync from the public frontend.');
}
if (/api\.mmir\.ai\/data\/import|api\.mmir\.ai\/data\/export/.test(manager)) {
  fail('Public conversation portability must not call protected backend data import/export endpoints.');
}
if (/cash-?out|token trading|earn money|payout/i.test(manager)) {
  fail('Conversation portability must not include public economic claims.');
}
if (!String(packageJson.scripts?.check || '').includes('smoke-check-p0-conversation-portability.js')) {
  fail('npm run check must include smoke-check-p0-conversation-portability.js.');
}

console.log('P0 conversation portability smoke passed.');
