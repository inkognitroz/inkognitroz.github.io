import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = process.cwd();
const backlogPath = resolve(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md');
const outputPath = resolve(root, 'public', 'progress-dashboard.json');

const statusNotes = {
  done: 'Shipped and guarded by local or CI checks for the current scope.',
  beta: 'Usable foundation exists; keep improving before calling it complete.',
  next: 'Next implementation slice for Codex work.',
  watch: 'Needs external verification, network availability or follow-up monitoring.',
  blocked: 'Blocked until user validation, cost approval or prerequisite architecture is ready.',
  planned: 'Planned after higher-priority activation, security and architecture work.'
};

const overrides = new Map([
  ...range(1, 21).map((id) => [id, { status: 'done', evidence: 'Core foundation, local node and first chat loop are implemented across the in-scope repos.' }]),
  ['D022', { status: 'beta', evidence: 'Code block rendering and copy controls exist; full safe markdown polish remains.' }],
  ['D023', { status: 'next', evidence: 'Mobile, keyboard and accessibility need a focused verification pass.' }],
  ['D024', { status: 'next', evidence: 'First-run flow now defaults automatically; installer/onboarding can be made smoother.' }],
  ['D025', { status: 'next', evidence: 'Live/static model split exists but should be sharpened across all model surfaces.' }],
  ['D026', { status: 'next', evidence: 'License and commercial-use warnings should be expanded before broader launch.' }],
  ...range(27, 30).map((id) => [id, { status: 'beta', evidence: 'Roles, comparison and synthesis UI/API paths exist as beta surfaces.' }]),
  ...range(31, 41).map((id) => [id, { status: 'beta', evidence: 'Managed backend security/router foundations exist; production hardening continues.' }]),
  ['D042', { status: 'next', evidence: 'Calm UX polish is now high-leverage because core surfaces are visible.' }],
  ...range(43, 49).map((id) => [id, { status: 'beta', evidence: 'Workspace, memory, prompt, knowledge and connector foundations are inspectable and local/protected.' }]),
  ...range(50, 54).map((id) => [id, { status: 'beta', evidence: 'Node registry, health, secure tunnel contract, scheduler policy and OCI alignment have foundations.' }]),
  ['D055', { status: 'planned', evidence: 'AWS runtime should wait until local/OCI patterns are stable.' }],
  ['D056', { status: 'planned', evidence: 'Self-healing follows observable runtime operations.' }],
  ...range(57, 62).map((id) => [id, { status: 'beta', evidence: 'Routing, scaling, workflow and automation foundations exist with cost-safe planning behavior.' }]),
  ['D063', { status: 'planned', evidence: 'Multi-agent workflow runtime should follow stable workflow object model and policy controls.' }],
  ['D064', { status: 'planned', evidence: 'Visual canvas should follow the real workflow schema after linear workflows settle.' }],
  ['D065', { status: 'planned', evidence: 'Evals should follow richer model/workflow usage data.' }],
  ['D066', { status: 'beta', evidence: 'Model/provider catalog foundations exist; registry backing should continue server-side.' }],
  ['D067', { status: 'done', evidence: 'BitNet/local efficient model spike is recorded as a deferred adapter candidate.' }],
  ...range(68, 70).map((id) => [id, { status: 'beta', evidence: 'Dataset and training foundations exist as guarded planning/data flows.' }]),
  ...range(71, 81).map((id) => [id, { status: 'planned', evidence: 'Platform/experience work waits for more user validation and stronger core activation.' }]),
  ['D082', { status: 'watch', evidence: 'GitHub Pages deploy is green, but this network still blocks mmir.ai as a newly registered domain.' }],
  ...range(83, 89).map((id) => [id, { status: 'done', evidence: 'Launch hardening and parity improvements have been pulled forward into current repos.' }]),
  ['D090', { status: 'blocked', evidence: 'Managed paid/provider routes stay blocked until identity, rate and cost controls are explicit.' }],
  ...range(91, 98).map((id) => [id, { status: 'done', evidence: 'Status, shared API, backend durability, package and activation improvements are shipped.' }]),
  ['D099', { status: 'done', evidence: 'Expanded open-source model catalog now covers more Ollama-compatible chat, code, embedding and multimodal families with license/commercial-use warnings.' }],
  ['D100', { status: 'planned', evidence: 'Marketplace should start as a permissioned catalog after free model activation is smoother.' }],
  ['D101', { status: 'planned', evidence: 'Premium gates are designed, but no paid execution should run before explicit approval.' }],
  ...range(102, 104).map((id) => [id, { status: 'done', evidence: 'Immediate guide, browser model routes and automatic first-run defaults are shipped.' }]),
  ['D105', { status: 'done', evidence: 'Public-safe user journey contract, manifest and site panel define MMIR as a trusted AI operating/orchestration layer.' }],
  ['D106', { status: 'done', evidence: 'CI now runs user-journey smoke gates for first answer, local activation, orchestration, privacy, progress and blocked paid routes.' }]
]);

const repoMeta = [
  {
    name: 'inkognitroz.github.io',
    purpose: 'Public MMIR.ai app shell, chat UI, progress dashboard and GitHub Pages deployment.',
    status: 'active',
    spend: 'Free: GitHub Pages + static assets.'
  },
  {
    name: 'mmir-local-node',
    purpose: 'Private local connector for Ollama/local runtimes, pairing and local chat contract.',
    status: 'active',
    spend: 'Free: user-owned local machine.'
  },
  {
    name: 'mimir-backend-template',
    purpose: 'First managed api.mmir.ai implementation for protected routing, memory, knowledge and planning APIs.',
    status: 'active',
    spend: 'Free by default: local/dev or file-backed storage; paid providers remain gated.'
  },
  {
    name: 'iac-autoprov',
    purpose: 'OCI runtime and infrastructure automation templates.',
    status: 'foundation',
    spend: 'Planning/free templates; cloud spend must be explicitly approved.'
  },
  {
    name: 'iac-autoprov-aws',
    purpose: 'AWS runtime template experiments.',
    status: 'planned',
    spend: 'Do not run paid AWS resources without approval.'
  }
];

const repoDecisions = [
  {
    name: 'api.mmir.ai',
    decision: 'No new repo yet',
    trigger: 'Split or rename only when the managed backend has deployment, auth, secret vault and cost policy ready.'
  },
  {
    name: 'mmir-desktop',
    decision: 'Later',
    trigger: 'Create when desktop packaging clearly improves local setup beyond the web + local-node path.'
  },
  {
    name: 'mmir-marketplace',
    decision: 'Later',
    trigger: 'Create only after marketplace object model, moderation, ownership and revenue policy are validated.'
  }
];

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => `D${String(start + index).padStart(3, '0')}`);
}

function cells(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim().replace(/`/g, ''));
}

function parseBacklog(markdown) {
  return markdown
    .split(/\r?\n/)
    .filter((line) => /^\|\s*D\d{3}\s*\|/.test(line))
    .map((line) => {
      const [seq, phase, priority, workPackage, repos, concreteWork, bestPractice, doneWhen, covers] = cells(line);
      const override = overrides.get(seq) || { status: 'planned', evidence: 'Not started in the current public dashboard evidence set.' };
      return {
        seq,
        phase,
        priority,
        work_package: workPackage,
        repos,
        concrete_work: concreteWork,
        best_practice: bestPractice,
        done_when: doneWhen,
        covers,
        status: override.status,
        status_note: statusNotes[override.status] || statusNotes.planned,
        evidence: override.evidence,
        estimate: estimateFor(priority, override.status)
      };
    });
}

function estimateFor(priority, status) {
  if (status === 'done') return 'Done';
  if (status === 'beta') return 'Verify + polish';
  if (status === 'watch') return 'Monitor';
  if (status === 'blocked') return 'Needs decision';
  if (priority === 'P0') return '2-6h';
  if (priority === 'P1') return '0.5-2d';
  if (priority === 'P2') return '1-3d';
  if (priority === 'P3') return '2-5d';
  return 'Validate first';
}

function summarize(tasks) {
  const counts = tasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {});
  const byPhase = tasks.reduce((acc, task) => {
    acc[task.phase] ||= { total: 0, done: 0, beta: 0, next: 0, watch: 0, blocked: 0, planned: 0 };
    acc[task.phase].total += 1;
    acc[task.phase][task.status] = (acc[task.phase][task.status] || 0) + 1;
    return acc;
  }, {});
  return {
    total: tasks.length,
    done: counts.done || 0,
    beta: counts.beta || 0,
    next: counts.next || 0,
    watch: counts.watch || 0,
    blocked: counts.blocked || 0,
    planned: counts.planned || 0,
    by_phase: Object.entries(byPhase).map(([phase, value]) => ({ phase, ...value }))
  };
}

const tasks = parseBacklog(readFileSync(backlogPath, 'utf8'));
const data = {
  version: 1,
  updated_at: new Date().toISOString(),
  title: 'MMIR Progress Dashboard',
  principle: 'Free-first, local-first, zero-trust: ship useful defaults before paid or complex infrastructure.',
  current_focus: [
    'Keep first chat useful without setup.',
    'Make local install and model activation one-click where possible.',
    'Keep paid/provider/cloud paths blocked until cost policy is explicit.',
    'Use the sequential backlog as source of truth for all Codex work.'
  ],
  status_legend: statusNotes,
  summary: summarize(tasks),
  repos: repoMeta,
  repo_decisions: repoDecisions,
  next_queue: tasks.filter((task) => task.status === 'next').slice(0, 12).map((task) => task.seq),
  watchlist: tasks.filter((task) => task.status === 'watch' || task.status === 'blocked').map((task) => task.seq),
  tasks
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${join('public', 'progress-dashboard.json')} with ${tasks.length} tasks.`);
