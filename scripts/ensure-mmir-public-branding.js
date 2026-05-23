import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const root = process.cwd();
const writeMode = process.argv.includes('--write');
const publicDir = resolve(root, 'public');

const replacements = new Map([
  ['public/assets/theme.js', [
    ['saas-fabric-theme', 'mmir-theme'],
    ['Balanced SaaS dark theme', 'Balanced MMIR dark theme']
  ]],
  ['public/apps/football-evolution-matrix/index.html', [
    ['saas-fabric-theme', 'mmir-theme'],
    ['Tilbake til SaaS Fabric', 'Tilbake til MMIR']
  ]],
  ['public/ai-models.json', [
    ['Static model registry for SaaS Fabric AI experiments. Do not store API keys here.', 'Static model registry for MMIR AI experiments. Do not store API keys here.']
  ]],
  ['public/apps/app-template-generator/generator.js', [
    ['static-first SaaS Fabric app', 'static-first MMIR app']
  ]],
  ['public/apps/mimir-chat-portal/index.html', [
    ['Mimir Chat Portal · SaaS Fabric', 'Mimir Chat Portal · MMIR'],
    ['Static launchpad for the SaaS Fabric Mimir AI chat backend and local AI tools.', 'Static launchpad for MMIR AI chat orchestration, backend routing and local AI tools.'],
    ['SaaS Fabric chat workflows', 'MMIR chat workflows'],
    ['Back to SaaS Fabric', 'Back to MMIR'],
    ['point SaaS Fabric at an Open WebUI backend', 'point MMIR at an Open WebUI backend'],
    ['Mimir / SaaS Fabric', 'Mimir / MMIR']
  ]],
  ['public/internal.html', [
    ['legacy SaaS Fabric prototypes', 'legacy static-app prototypes']
  ]],
  ['public/ui-action-coverage.json', [
    ['saas-fabric-local-analytics', 'mmir-local-analytics'],
    ['Public SaaS Fabric homepage', 'Public MMIR homepage']
  ]],
  ['public/assets/onboarding.js', [
    ['saas-fabric-onboarding-dismissed', 'mmir-onboarding-dismissed'],
    ['saas-fabric-onboarding-auto-opened', 'mmir-onboarding-auto-opened'],
    ['SaaS Fabric Admin', 'MMIR Admin'],
    ['title: "SaaS Fabric"', 'title: "MMIR"'],
    ['subtitle: "En statisk app-fabrikk for ideer, mini-apper, templates, roadmap og kommersialisering."', 'subtitle: "Et trusted AI control plane for lokal AI, modeller, workflows, memory og trygg routing."'],
    ['Start i App Factory, Projects og Tools for a apne det som allerede er bygget.', 'Start i Connect, Nodes, Models og Workflows for a apne det som allerede er bygget.'],
    ['Start i App Factory, Projects og Tools for å åpne det som allerede er bygget.', 'Start i Connect, Nodes, Models og Workflows for å åpne det som allerede er bygget.'],
    ['Bruk SaaS Ideas, Templates og Prompt Inbox for a gjore ideer om til klare PR-oppgaver.', 'Bruk MMIR Ideas, Templates og Prompt Inbox for a gjore ideer om til klare backlogg-oppgaver.'],
    ['Bruk SaaS Ideas, Templates og Prompt Inbox for å gjøre ideer om til klare PR-oppgaver.', 'Bruk MMIR Ideas, Templates og Prompt Inbox for å gjøre ideer om til klare backlogg-oppgaver.'],
    ['Hold v1 statisk og trygg. Bruk Admin og GitHub PR-er for Supabase, betaling og ekte backend legges til.', 'Hold v1 statisk og trygg. Bruk Admin og GitHub PR-er for betaling, org-flyt og managed backend legges til.'],
    ['Hold v1 statisk og trygg. Bruk Admin og GitHub PR-er før Supabase, betaling og ekte backend legges til.', 'Hold v1 statisk og trygg. Bruk Admin og GitHub PR-er før betaling, org-flyt og managed backend legges til.']
  ]],
  ['public/assets/app.js', [
    ['saas-fabric-admin-backups', 'mmir-admin-backups'],
    ['saas-fabric-admin-draft', 'mmir-admin-draft'],
    ['saas-fabric-export-bundle', 'mmir-export-bundle'],
    ['site.title || "SaaS Fabric"', 'site.title || "MMIR"'],
    ['SaaS Fabric export bundle', 'MMIR export bundle']
  ]],
  ['public/assets/usage-analytics.js', [
    ['saas-fabric-usage-events-v1', 'mmir-usage-events-v1']
  ]]
]);

const textExtensions = new Set([
  '.html', '.js', '.json', '.css', '.md', '.txt', '.svg', '.command', '.sh', '.ps1', '.cmd'
]);

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function applyReplacements() {
  const changed = [];
  for (const [file, pairs] of replacements.entries()) {
    const full = resolve(root, file);
    if (!existsSync(full)) {
      throw new Error(`Missing expected public branding file: ${file}`);
    }
    const before = readFileSync(full, 'utf8');
    let after = before;
    for (const [from, to] of pairs) {
      after = after.split(from).join(to);
    }
    if (after !== before) {
      changed.push(file);
      if (writeMode) {
        writeFileSync(full, after, 'utf8');
      }
    }
  }
  return changed;
}

function assertNoRetiredBranding() {
  const leaks = [];
  for (const file of walk(publicDir)) {
    if (!textExtensions.has(extname(file))) continue;
    const value = readFileSync(file, 'utf8');
    const lower = value.toLowerCase();
    if (value.includes('SaaS Fabric') || lower.includes('saas-fabric')) {
      leaks.push(relative(root, file));
    }
  }
  if (leaks.length) {
    throw new Error(`Retired SaaS Fabric branding remains in public assets:\n${leaks.join('\n')}`);
  }
}

const changed = applyReplacements();
if (changed.length && !writeMode) {
  throw new Error(`MMIR public branding migration is needed. Run node scripts/ensure-mmir-public-branding.js --write. Files:\n${changed.join('\n')}`);
}
assertNoRetiredBranding();
console.log(changed.length ? `Updated MMIR branding in ${changed.length} files.` : 'MMIR public branding is clean.');
