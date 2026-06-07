import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const waitlistPath = join(publicDir, 'waitlist.html');
const mmirPath = join(publicDir, 'mmir.html');
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

if (!existsSync(waitlistPath)) fail('public/waitlist.html must exist.');
const waitlist = existsSync(waitlistPath) ? readFileSync(waitlistPath, 'utf8') : '';
const mmir = readFileSync(mmirPath, 'utf8');

for (const [needle, message] of [
  ['One clean chat for every AI model you trust.', 'waitlist must explain the core user value.'],
  ['Supergenious', 'waitlist must name the current default route.'],
  ['route receipt', 'waitlist must explain trust/route visibility.'],
  ['Use + in chat to connect a private local node.', 'waitlist must explain add-model path without an installer maze.'],
  ['Best Answer appears only when more than one proven route is available.', 'waitlist must keep compare/best-answer truth-gated.'],
  ['mailto:hello@mmir.ai', 'waitlist must have a low-risk contact path instead of storing public form data.'],
  ['This is a private beta for technical design partners.', 'waitlist must keep the beta boundary visible.'],
]) {
  requireIncludes(waitlist, needle, message);
}

forbid(
  waitlist,
  /passive income|guaranteed earnings|cash-out|token trading|investment|shares|equity|mine tokens|pyramid/i,
  'public waitlist must not contain public economic, token, investment or referral claims.'
);
forbid(
  waitlist,
  /<form\b|<input\b|<textarea\b|fetch\(|localStorage|sessionStorage/i,
  'public waitlist must not collect or store waitlist data in the browser.'
);
forbid(
  mmir,
  /waitlist\.html|Request beta|Request private beta/i,
  'main chat page must stay clean and not expose waitlist CTA clutter.'
);
requireIncludes(
  String(packageJson.scripts?.check || ''),
  'smoke-check-public-waitlist-page.js',
  'npm run check must include the public waitlist page smoke.'
);

if (failures.length) {
  console.error('Public waitlist page smoke failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Public waitlist page smoke passed.');
