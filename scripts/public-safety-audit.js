import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const scanRoots = [
  'public',
  'docs',
  '.github',
  'README.md',
  'START_HERE.md',
  'AGENTS.md',
  'CLAUDE.md'
];

const textExtensions = new Set(['.html', '.js', '.json', '.md', '.yml', '.yaml', '.css', '.sh', '.ps1', '.cmd', '.mjs']);

const tokenPatterns = [
  { name: 'GitHub token', regex: /ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}/g },
  { name: 'OpenAI-style secret', regex: /sk-(?:live|test|proj)?[A-Za-z0-9_-]{24,}/g },
  { name: 'JWT-like token', regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: 'AWS access key', regex: /AKIA[0-9A-Z]{16}/g }
];

const secretAssignmentPattern = /\b(?:OPENAI_API_KEY|ANTHROPIC_API_KEY|SUPABASE_SERVICE_ROLE|STRIPE_SECRET|AWS_SECRET_ACCESS_KEY|GITHUB_TOKEN)\s*[:=]\s*['"]?(?!<|your-|example|placeholder|process\.env)([A-Za-z0-9_./+=-]{12,})/gi;
const browserBearerPattern = /headers\[['"]Authorization['"]\]\s*=\s*['"]Bearer\s+['"]\s*\+/g;
const passwordApiKeyInputPattern = /<input[^>]+id=["']api-key["'][^>]+type=["']password["'][^>]*>/gi;

const failures = [];

function fail(file, message) {
  failures.push(`${relative(root, file)}: ${message}`);
}

function assertPattern(name, regex, value) {
  regex.lastIndex = 0;
  if (!regex.test(value)) {
    throw new Error(`Public safety audit self-check failed for ${name}`);
  }
}

function assertNoPattern(name, regex, value) {
  regex.lastIndex = 0;
  if (regex.test(value)) {
    throw new Error(`Public safety audit self-check false positive for ${name}`);
  }
}

function assertGateCoverage() {
  assertPattern('GitHub token', tokenPatterns[0].regex, 'ghp_' + 'A'.repeat(36));
  assertPattern('OpenAI-style secret', tokenPatterns[1].regex, 'sk-' + 'A'.repeat(32));
  assertPattern('JWT-like token', tokenPatterns[2].regex, 'eyJ' + 'A'.repeat(12) + '.' + 'B'.repeat(12) + '.' + 'C'.repeat(12));
  assertPattern('AWS access key', tokenPatterns[3].regex, 'AKIA' + 'A'.repeat(16));
  assertPattern('real-looking secret assignment', secretAssignmentPattern, 'OPENAI_API_KEY=' + 'A'.repeat(32));
  assertNoPattern('placeholder secret assignment', secretAssignmentPattern, 'OPENAI_API_KEY=your-key-here');
  assertPattern('browser Bearer construction', browserBearerPattern, "headers['Authorization'] = 'Bearer ' + apiKey");
  assertPattern('enabled public API key field', passwordApiKeyInputPattern, '<input id="api-key" type="password" />');
}

function walk(path) {
  const full = resolve(root, path);
  if (!existsSync(full)) return [];
  const statEntries = readdirSync(full, { withFileTypes: true });
  return statEntries.flatMap((entry) => {
    const next = join(full, entry.name);
    if (entry.name === '.git' || entry.name === 'node_modules') return [];
    return entry.isDirectory() ? walk(relative(root, next)) : [next];
  });
}

function filesToScan() {
  return scanRoots.flatMap((item) => {
    const full = resolve(root, item);
    if (!existsSync(full)) return [];
    return statSync(full).isDirectory() ? walk(item) : [full];
  }).filter((file) => textExtensions.has(extname(file)));
}

assertGateCoverage();

for (const file of filesToScan()) {
  const text = readFileSync(file, 'utf8');
  for (const pattern of tokenPatterns) {
    pattern.regex.lastIndex = 0;
    if (pattern.regex.test(text)) fail(file, `${pattern.name} pattern found`);
  }

  secretAssignmentPattern.lastIndex = 0;
  if (secretAssignmentPattern.test(text)) fail(file, 'real-looking secret assignment found');

  browserBearerPattern.lastIndex = 0;
  if (file.includes(`${join('public', 'apps')}`) && browserBearerPattern.test(text)) {
    fail(file, 'public browser app must not construct Authorization: Bearer from user input');
  }

  passwordApiKeyInputPattern.lastIndex = 0;
  if (file.includes(`${join('public')}`) && passwordApiKeyInputPattern.test(text) && !/id=["']api-key["'][^>]+disabled/i.test(text)) {
    fail(file, 'public frontend must not expose an enabled API key password field');
  }
}

const openWebGui = resolve(root, 'public', 'apps', 'open-web-gui', 'open-web-gui.js');
if (existsSync(openWebGui)) {
  const text = readFileSync(openWebGui, 'utf8');
  if (text.includes('apiKeyInput.value') || text.includes('Authorization')) {
    fail(openWebGui, 'endpoint tester must not read or send browser API keys');
  }
}

const trainingAutomation = resolve(root, 'public', 'apps', 'mimir-chat-portal', 'training-automation.js');
if (existsSync(trainingAutomation)) {
  const text = readFileSync(trainingAutomation, 'utf8');
  if (!text.includes('allow_paid_compute:false') || !text.includes('Paid compute requires owner approval')) {
    fail(trainingAutomation, 'paid compute must stay disabled in the public frontend');
  }
}

if (failures.length) {
  console.error('Public safety audit failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Public safety audit passed.');
