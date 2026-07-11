import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const portalDir = join(resolve(root, 'public'), 'apps', 'mimir-chat-portal');
const p0Shell = readFileSync(join(portalDir, 'p0-chat-shell.js'), 'utf8');
const localInstall = readFileSync(join(portalDir, 'local-install-commands.js'), 'utf8');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const failures = [];

function fail(message) {
  failures.push(message);
}

function requireIncludes(source, needle, message) {
  if (!source.includes(needle)) fail(message);
}

function forbid(source, pattern, message) {
  if (pattern.test(source)) fail(message);
}

if (p0Shell.includes('Skriv spørsmålet ditt. Supergeni finner beste svar og viser bevis når det trengs.')) {
  fail('First screen must stay minimal; product mechanics belong in answer receipts and menus.');
}
	requireIncludes(
	  p0Shell,
	  "menuButton('connect-local','Koble til lokal AI','Vis install-kommandoen i chatten.')",
	  '+ menu must expose exactly one plain connect-local path for local node onboarding.'
	);
	requireIncludes(
	  p0Shell,
	  'Trykk ⚙ -> Koble til lokal AI for å koble denne maskinen.',
	  'Model menu must explain why adding a local model matters without showing a dashboard.'
	);
requireIncludes(
  localInstall,
  'Do you have a Mac computer? Copy and paste this in Terminal to connect a local node.',
  'Mac onboarding must happen in chat with a terminal command, not an unsigned command file.'
);
requireIncludes(
  localInstall,
  'curl -fsSL https://mmir.ai/downloads/mmir-local-node-macos-linux.sh | bash',
  'Mac/Linux onboarding must keep the proven one-line install command.'
);
forbid(
  p0Shell,
  /installer page|Install guide|Install help|\.zip|mmir-local-connector-mac\.command/i,
  'First-user activation must not reintroduce old installer pages, ZIP downloads or unsigned command files.'
);
requireIncludes(
  String(packageJson.scripts?.check || ''),
  'smoke-check-p0-first-user-activation.js',
  'npm run check must include the first-user activation smoke.'
);

if (failures.length) {
  console.error('P0 first-user activation smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('P0 first-user activation smoke passed.');
