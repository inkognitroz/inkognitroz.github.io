import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = process.cwd();
const backlogPath = resolve(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md');
const outputPath = resolve(root, 'public', 'progress-dashboard.json');
const activationSimulatorPath = resolve(root, 'public', 'activation-simulator-fixtures.json');

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
  ['D023', { status: 'beta', evidence: 'Mobile nav remains available, keyboard focus states are guarded and MMIR chat CSS now avoids negative/viewport-scaled type; visual device QA continues.' }],
  ['D024', { status: 'beta', evidence: 'First-run onboarding now prepares safe defaults, keeps Private mode on, and can start a free MMIR Guide chat with one action before local model setup.' }],
  ['D025', { status: 'beta', evidence: 'Chat selector and model library now separate live backend models, ready-now browser helpers/WebGPU models, free install-to-activate local models and protected/planned routes.' }],
  ['D026', { status: 'done', evidence: 'Model catalog and chat helper now surface license/commercial-use checks and source/model-card links for starter choices.' }],
  ...range(27, 30).map((id) => [id, { status: 'beta', evidence: 'Roles, comparison and synthesis UI/API paths exist as beta surfaces.' }]),
  ...range(31, 41).map((id) => [id, { status: 'beta', evidence: 'Managed backend security/router foundations exist; production hardening continues.' }]),
  ['D042', { status: 'beta', evidence: 'First screen has calmer navigation, automatic free-route copy, better chat dock polish and model states that do not start as an empty no-model experience.' }],
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
  ['D106', { status: 'done', evidence: 'CI now runs user-journey smoke gates for first answer, local activation, orchestration, privacy, progress and blocked paid routes.' }],
  ['D107', { status: 'done', evidence: 'Universal installer now exposes Raspberry Pi/Linux ARM node setup, and Linux ARM installers classify edge devices with safer starter models.' }],
  ['D108', { status: 'done', evidence: 'A public-safe UI action coverage manifest and CI smoke gate now guard homepage/chat controls, disabled hash links, generated panel anchors and handler evidence.' }],
  ['D109', { status: 'done', evidence: 'The public frontend now has a Node Dashboard that reads active node identity, status, hardware, models, tunnel state and the current browser client from paired local-node routes.' }],
  ['D110', { status: 'beta', evidence: 'Local node and frontend now support short-lived local approval codes before remote/tunnel pairing releases a token; managed control-plane relay remains future work.' }],
  ['D111', { status: 'done', evidence: 'Install Health Doctor now checks connector reachability, pairing, Ollama/runtime status, model availability, hardware profile and tunnel support with next best actions.' }],
  ['D112', { status: 'done', evidence: 'The chat model helper can start paired local-node Ollama pull jobs, poll install progress and refresh live model discovery when ready.' }],
  ['D113', { status: 'beta', evidence: 'One-click install/switch/remove now exists for local-node/Ollama paths; keep polishing catalog-level management and confirmations.' }],
  ['D114', { status: 'done', evidence: 'The first-run onboarding panel now shows automatic Browser ready, Private mode, Local node, Model live and First chat gates with live updates from mode, profile, node and chat events.' }],
  ['D115', { status: 'beta', evidence: 'First screen now has an automatic readiness rail for free start, privacy, node and model state, plus the send glyph is encoded safely.' }],
  ...range(116, 179).map((id) => [id, { status: 'planned', evidence: 'Added to the expanded GUI parity and platform-readiness backlog; implementation has not started.' }]),
  ['D116', { status: 'beta', evidence: 'Control-plane boundary spec now documents current and target architecture, trust zones, route ownership, public/private rules and Codex work rules.' }],
  ['D117', { status: 'beta', evidence: 'Public safety audit now blocks token-like strings, real-looking secret assignments, browser Bearer-key construction, enabled public API-key fields and paid-compute enablement in the public frontend.' }],
  ['D118', { status: 'beta', evidence: 'Privacy controls now show a browser data inventory for chats, memory, knowledge, workspaces, backend profile metadata, model preferences, demo events and temporary pairing tokens, with export, workspace delete, pairing-token clear and all-local-MMIR reset controls.' }],
  ['D119', { status: 'beta', evidence: 'First-run onboarding now has optional Auto, Developer, Business owner, Power user and Privacy/local paths that store user intent locally, keep safe defaults automatic and launch matching starter prompts/panels.' }],
  ['D120', { status: 'beta', evidence: 'First screen now includes free-first use-case templates for repo analysis, product planning, security review, model comparison and workflow planning that start chat prompts and open the right MMIR panels.' }],
  ['D121', { status: 'beta', evidence: 'First screen now shows free value loops for useful chat, local model activation, model comparison, memory and documents, with state-aware cards and starter actions that require no account or paid provider.' }],
  ['D126', { status: 'done', evidence: 'Public GUI parity matrix now lists ChatGPT-like, Open WebUI-like and MMIR-specific features with truthful live/beta/planned/blocked/premium-planned states, backed by JSON, docs and site UI.' }],
  ['D127', { status: 'beta', evidence: 'Conversation manager now provides local save/rename, pin, archive/restore, search, load, fork, JSON export and redacted safe-share controls per workspace.' }],
  ['D128', { status: 'beta', evidence: 'Knowledge upload now supports drag/drop staging, text/Markdown/JSON/CSV/log type checks, 1 MB file limits, staged previews and local-first document snippets before optional protected backend indexing.' }],
  ['D129', { status: 'beta', evidence: 'Knowledge collections now let users group uploaded documents, enable/disable each collection per workspace, and keep chat/comparison context scoped to enabled local collections.' }],
  ['D130', { status: 'beta', evidence: 'Web search now has an explicit consent-first UI with free manual source links, protected backend route support for SearXNG/BYOK providers, visible sources and save-to-knowledge behavior without public frontend keys.' }],
  ['D131', { status: 'beta', evidence: 'Permissioned tool runtime now exposes allowlisted tools, consent-gated execution and visible traces through the protected backend, with a public Tool Runner UI for approved knowledge, memory and web search tool calls.' }],
  ['D132', { status: 'beta', evidence: 'Code interpreter now has planning-only sandbox policy, consented preflight, visible gates and a free browser fallback; code execution remains disabled until a disposable local sandbox worker is available.' }],
  ['D133', { status: 'beta', evidence: 'Canvas/artifacts now has a local workspace for documents, code, plans and workflow drafts with automatic first artifact, edit/preview, duplicate, copy, export and chat handoff.' }],
  ['D134', { status: 'beta', evidence: 'Image generation/editing now has a visible zero-cost route planner with consent, local/protected route labels, safety/cost gates and disabled execution until a trusted image backend exists.' }],
  ['D135', { status: 'beta', evidence: 'Voice now has browser-local push-to-talk, read-aloud, stop speech, voice route/device checks, language/voice/rate/pitch settings and local privacy inventory coverage.' }],
  ['D136', { status: 'beta', evidence: 'Vision now has local image/screenshot preview, model capability gating, metadata-only chat handoff and explicit raw-image blocking until a trusted multimodal route exists.' }],
  ['D137', { status: 'beta', evidence: 'Admin governance now has a protected backend overview plus public panel for users, planned roles, provider/tool state, policies and sanitized audit metadata while multi-user writes fail closed.' }],
  ['D138', { status: 'beta', evidence: 'Access control now has protected backend policy/decision routes and a public RBAC panel for fail-closed model, tool, knowledge, node, workflow and admin simulations; runtime enforcement remains server-side.' }],
  ['D139', { status: 'beta', evidence: 'Model/runtime settings now expose safe defaults for temperature, max tokens, context length, top-p, repeat penalty, seed and bounded system prompt; chat sends them through shared backend/local-node contracts.' }],
  ['D140', { status: 'beta', evidence: 'Prompt library now works free/local-first with starters, tags, variables, search, insert, copy and version flows, while still loading protected backend prompts when available.' }],
  ['D141', { status: 'beta', evidence: 'Managed backend and Local Node now have OpenAI-compatible conformance tests and contract support for model list metadata, chat completions, SSE terminal chunks, safe errors and function tool-call shapes without implicit tool execution.' }],
  ['D142', { status: 'beta', evidence: 'Tool/plugin gallery now lists approved tools and connectors with permissions, trust labels, install state, public-secret boundaries and workspace enable/disable controls.' }],
  ['D143', { status: 'beta', evidence: 'Memory governance now exposes local scope, tags, expiration, review notes, import notes, backend search reasons and visible last-message memory-use review data.' }],
  ['D144', { status: 'beta', evidence: 'Research planning now creates source-aware, citation-gated plans with manual/free discovery links, ordered steps, local plan storage and approval gates while keeping autonomous browsing disabled.' }],
  ['D145', { status: 'beta', evidence: 'Custom assistant builder now has local-first starter assistants, instructions, model preference, tool allowlist, knowledge scope, private/workspace sharing rules and protected backend sync.' }],
  ['D146', { status: 'beta', evidence: 'Safe data analysis now runs in the browser with CSV/TSV/JSON parsing, summaries, SVG charts, local snapshots, JSON export and chat-summary handoff without arbitrary code execution.' }],
  ['D147', { status: 'beta', evidence: 'Scheduled task UI now supports visible browser-local reminders with owner, due/repeat schedule, free/local cost policy, run log, pause/cancel/export and chat handoff.' }],
  ['D148', { status: 'beta', evidence: 'External connector catalog now covers manual docs, local folders, GitHub, Drive/Docs, Gmail, Notion, Slack and Open WebUI with protected OAuth boundaries, sync planning, revocation metadata and no public frontend secrets.' }],
  ['D149', { status: 'beta', evidence: 'Mobile/PWA shell now has a manifest, service worker, offline fallback, install panel, mobile touch targets and local-node handoff without paid services.' }],
  ['D150', { status: 'beta', evidence: 'Portable workspace migration now exports redacted MMIR JSON, provides an Open WebUI-style preview and imports ChatGPT/Open WebUI/MMIR-style JSON locally with bounded file size and no public frontend secrets.' }],
  ['D151', { status: 'beta', evidence: 'Node Dashboard now includes a local model manager with installed model inventory, disk/RAM impact and paired local removal; local-node reports resource metadata for models.' }],
  ['D152', { status: 'beta', evidence: 'Safe Sharing now creates redacted browser-local share bundles, text copies, preview links and JSON exports for selected chats, artifacts, workflow drafts and knowledge collection manifests without public frontend secrets.' }],
  ['D153', { status: 'beta', evidence: 'Managed backend now has protected owner-scoped share objects with redaction before storage, list/get/create/revoke/delete routes, portable export/import/delete coverage and sanitized audit events.' }],
  ['D154', { status: 'beta', evidence: 'Safe Sharing UI now saves redacted bundles to protected /shares, loads protected share metadata and revokes owned shares through the active backend profile.' }],
  ['D155', { status: 'beta', evidence: 'Managed backend now exposes protected principal and organization routes with owner/admin/member/viewer guardrails, and the public UI can load identity, create a free org, save/remove members and disable owned orgs through the active protected backend.' }],
  ['D156', { status: 'beta', evidence: 'Managed backend and public UI now support short-lived session-token and invite create/accept/revoke flows tied to organizations; tokens and codes are returned once and not stored in GitHub Pages.' }],
  ['D157', { status: 'beta', evidence: 'Protected shares now support organization visibility, org id and minimum-role audiences; backend identity policy enforces owner/admin creation and member-role read access while public preview links remain non-authoritative.' }],
  ['D158', { status: 'beta', evidence: 'Share access review now exposes audience summaries, viewer decisions, next-safe actions and share-specific audit state from the protected backend inside Safe Sharing.' }],
  ['D159', { status: 'beta', evidence: 'Recipient handoff now guides invited users from invite acceptance to the intended protected share, opens payload only after backend policy allows it and shows session tokens once without public storage.' }],
  ['D160', { status: 'beta', evidence: 'Owner-side team share packets now create invite codes, copy non-secret share/invite details, prefill recipient handoff fields and keep one-time codes separate from packet text.' }],
  ['D161', { status: 'beta', evidence: 'Returned MMIR session tokens can now be activated for current-tab protected backend calls through api-client memory only, with clear actions in Identity and Safe Sharing plus privacy inventory disclosure.' }],
  ['D162', { status: 'beta', evidence: 'Protected share activity summaries now count reads, access reviews, handoff success/failure and revocations in backend responses, and Safe Sharing renders activity/revocation cues for owners and recipients.' }],
  ['D163', { status: 'beta', evidence: 'Chat now shows a live-model proof panel, verifies browser helper/WebGPU readiness, runs tiny free chat probes only on free/local-looking routes and skips possible paid provider probes.' }],
  ['D164', { status: 'beta', evidence: 'Live-model proof failures now render repair actions for free local profile, installer, model library, connect settings and retry proof from the proof panel.' }],
  ['D165', { status: 'beta', evidence: 'Verified live-model proof now selects the verified model, updates the prompt placeholder and exposes a Chat with verified model action plus first_chat_ready signal.' }],
  ['D166', { status: 'beta', evidence: 'First backend chat success/failure now writes a browser-local first-chat receipt with model, route, character counts, recovery actions and raw_prompt_stored:false/raw_response_stored:false.' }],
  ['D167', { status: 'beta', evidence: 'First-chat receipt state now appears in the progress dashboard and first-run gates with repair/start actions that stay free-first and do not auto-spend.' }],
  ['D168', { status: 'beta', evidence: 'Model install completion and local-node refreshed events now prefer the installed/live model, rerun free proof, select it and prepare the first verified chat prompt without auto-spend.' }],
  ['D169', { status: 'beta', evidence: 'Local Node Doctor now exposes a protected /doctor route, the downloadable connector has the same contract, and the dashboard consumes it with model-pull-aware next repair actions.' }],
  ['D170', { status: 'beta', evidence: 'Progress dashboard now renders a browser-local activation telemetry timeline fed by defaults, proof, model install, doctor and first-chat events with raw_prompt_stored:false/raw_response_stored:false/secrets_stored:false.' }],
  ['D171', { status: 'beta', evidence: 'Activation Autopilot now runs safe free repairs only: automatic defaults, Private mode, model refresh and proof retry, with no paid routes, provider secrets, raw prompts or raw responses.' }],
  ['D172', { status: 'beta', evidence: 'Node Dashboard now renders one guided OS/device repair card from doctor checks, detecting Windows, macOS, Linux/VM and Raspberry Pi/Linux ARM with a starter model and exact next action.' }],
  ['D173', { status: 'beta', evidence: 'A dedicated node repair-card smoke harness now verifies offline connector, pairing-required, offline Ollama, failed model pull, no-model and device fixtures against Node Dashboard source and UI coverage.' }],
  ['D174', { status: 'beta', evidence: 'Guided repair-card links now carry data-device-repair-action metadata, trigger internal follow-through where needed and record selected paths in activation telemetry.' }],
  ['D175', { status: 'beta', evidence: 'Repair-card selections now store a browser-local repair resume object; post-install returns resume checking, refresh runtime models and emit repair resume telemetry/results.' }],
  ['D176', { status: 'beta', evidence: 'First screen and Node Dashboard now show the last repair resume result with verified/needs-model/needs-action state and a safe next action.' }],
  ['D177', { status: 'beta', evidence: 'Activation simulator fixtures now cover first visit, missing connector, installer return, connector-online/no-model and verified local model across first screen, chat, Node Dashboard, telemetry and progress surfaces.' }],
  ['D178', { status: 'beta', evidence: 'Progress Dashboard can now replay activation simulator states into a workspace-local demo key and reset it, with no real connector, pairing token, paid route, provider secret, raw prompt or raw response mutation.' }],
  ['D179', { status: 'next', evidence: 'Next activation QA/UX slice: show active replay state on the first screen and chat/runtime gates as clearly demo-only.' }]
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

function readActivationSimulator() {
  if (!existsSync(activationSimulatorPath)) return null;
  return JSON.parse(readFileSync(activationSimulatorPath, 'utf8'));
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
const prioritizedNextIds = ['D179', 'D117', 'D116', 'D118', 'D119'];
const nextTasks = tasks.filter((task) => task.status === 'next');
const prioritizedNextQueue = [
  ...prioritizedNextIds.filter((id) => nextTasks.some((task) => task.seq === id)),
  ...nextTasks.map((task) => task.seq).filter((id) => !prioritizedNextIds.includes(id))
].slice(0, 12);
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
  activation_simulator: readActivationSimulator(),
  repos: repoMeta,
  repo_decisions: repoDecisions,
  next_queue: prioritizedNextQueue,
  watchlist: tasks.filter((task) => task.status === 'watch' || task.status === 'blocked').map((task) => task.seq),
  tasks
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${join('public', 'progress-dashboard.json')} with ${tasks.length} tasks.`);
