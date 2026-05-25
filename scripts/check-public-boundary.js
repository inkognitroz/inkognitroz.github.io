import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();

const forbiddenPaths = [
  'AGENTS.md',
  'CLAUDE.md',
  'START_HERE.md',
  'docs',
  'public/admin.html',
  'public/internal.html',
  'public/docs',
  'public/apps/app-template-generator',
  'public/apps/ollama-chat-lab',
  'public/apps/open-web-gui',
  'public/apps/football-evolution-matrix',
  'public/cross-repo-architecture-security-review-report.json',
  'public/gui-parity-matrix.json',
  'public/progress-dashboard.json',
  'public/mmir-api-routes.json',
  'public/mmir-chat-design-review.html',
  'mmir-chat-design-review.html'
];

const forbiddenNamePatterns = [
  /(?:^|\/).*report.*\.json$/i,
  /(?:^|\/).*qa.*\.json$/i,
  /(?:^|\/).*verification.*\.json$/i,
  /(?:^|\/).*audit.*\.json$/i,
  /(?:^|\/).*dashboard.*\.json$/i,
  /(?:^|\/).*watch.*\.json$/i
];

const failures = [];

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.name === '.git' || entry.name === 'node_modules') return [];
    return entry.isDirectory() ? walk(full) : [full];
  });
}

for (const path of forbiddenPaths) {
  if (existsSync(resolve(root, path))) {
    failures.push(`${path} must not exist in the public repository`);
  }
}

for (const file of walk(resolve(root, 'public'))) {
  const rel = relative(root, file).replaceAll('\\', '/');
  if (forbiddenNamePatterns.some((pattern) => pattern.test(rel))) {
    failures.push(`${rel} looks like internal QA/audit/report output`);
  }
}

for (const workflow of walk(resolve(root, '.github', 'workflows'))) {
  const rel = relative(root, workflow).replaceAll('\\', '/');
  const text = existsSync(workflow) && statSync(workflow).isFile()
    ? readFileSync(workflow, 'utf8')
    : '';
  if (/contents:\s*write/.test(text)) {
    failures.push(`${rel} grants contents: write in the public repo`);
  }
}

if (failures.length) {
  console.error('Public boundary check failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Public boundary check passed.');
