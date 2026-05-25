import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = process.cwd();
const backlogPath = resolve(root, 'docs', 'MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md');
const outputPath = resolve(root, 'public', 'progress-dashboard.json');
const activationSimulatorPath = resolve(root, 'public', 'activation-simulator-fixtures.json');
const noModelDeadEndReportPath = resolve(root, 'public', 'no-model-dead-end-report.json');
const noModelPublicDeployVerificationPath = resolve(root, 'public', 'no-model-public-deploy-verification.json');
const firstFreeChatResponseReportPath = resolve(root, 'public', 'first-free-chat-response-report.json');
const composerActionBarReportPath = resolve(root, 'public', 'composer-action-bar-report.json');
const composerActionBarVisualReportPath = resolve(root, 'public', 'composer-action-bar-visual-report.json');
const composerQuickActionsReportPath = resolve(root, 'public', 'composer-quick-actions-report.json');
const messageActionCompletenessReportPath = resolve(root, 'public', 'message-action-completeness-report.json');
const messageActionVisualReportPath = resolve(root, 'public', 'message-action-visual-report.json');
const messageActionBrowserFixtureReportPath = resolve(root, 'public', 'message-action-browser-fixture-report.json');
const messageActionAccessibilityReportPath = resolve(root, 'public', 'message-action-accessibility-report.json');
const conversationHandoffReportPath = resolve(root, 'public', 'conversation-handoff-report.json');
const savedChatMemoryHandoffReportPath = resolve(root, 'public', 'saved-chat-memory-handoff-report.json');
const promotedContextNextAnswerReportPath = resolve(root, 'public', 'promoted-context-next-answer-report.json');
const contextControlsReportPath = resolve(root, 'public', 'context-controls-report.json');
const answerContextReceiptReportPath = resolve(root, 'public', 'answer-context-receipt-report.json');
const answerContextDrilldownReportPath = resolve(root, 'public', 'answer-context-drilldown-report.json');
const answerContextHighlightReportPath = resolve(root, 'public', 'answer-context-highlight-report.json');
const answerContextSourceFilterReportPath = resolve(root, 'public', 'answer-context-source-filter-report.json');
const answerContextFilterConsumptionReportPath = resolve(root, 'public', 'answer-context-filter-consumption-report.json');
const answerContextKnowledgeSourceReportPath = resolve(root, 'public', 'answer-context-knowledge-source-report.json');
const answerContextSourceCorrectionReportPath = resolve(root, 'public', 'answer-context-source-correction-report.json');
const contextCorrectionAuditReportPath = resolve(root, 'public', 'context-correction-audit-report.json');
const contextCorrectionRetryReportPath = resolve(root, 'public', 'context-correction-retry-report.json');
const contextCorrectionSuggestionsReportPath = resolve(root, 'public', 'context-correction-suggestions-report.json');
const protectedContextCorrectionSyncReportPath = resolve(root, 'public', 'protected-context-correction-sync-report.json');
const protectedCorrectionSyncUiReportPath = resolve(root, 'public', 'protected-correction-sync-ui-report.json');
const protectedCorrectionReviewQueueReportPath = resolve(root, 'public', 'protected-correction-review-queue-report.json');
const correctionRemediationPlanReportPath = resolve(root, 'public', 'correction-remediation-plan-report.json');
const correctionRemediationApplyGatesReportPath = resolve(root, 'public', 'correction-remediation-apply-gates-report.json');
const correctionRemediationAdaptersReportPath = resolve(root, 'public', 'correction-remediation-adapters-report.json');
const correctionRemediationCommitPolicyReportPath = resolve(root, 'public', 'correction-remediation-commit-policy-report.json');
const correctionRemediationExecutionGatesReportPath = resolve(root, 'public', 'correction-remediation-execution-gates-report.json');
const correctionRemediationRollbackGatesReportPath = resolve(root, 'public', 'correction-remediation-rollback-gates-report.json');
const correctionRemediationKnowledgeSourceModelReportPath = resolve(root, 'public', 'correction-remediation-knowledge-source-model-report.json');
const correctionRemediationKnowledgeExecutionGatesReportPath = resolve(root, 'public', 'correction-remediation-knowledge-execution-gates-report.json');
const correctionRemediationKnowledgeRollbackGatesReportPath = resolve(root, 'public', 'correction-remediation-knowledge-rollback-gates-report.json');
const correctionRemediationAutopilotQueueReportPath = resolve(root, 'public', 'correction-remediation-autopilot-queue-report.json');
const correctionRemediationAutopilotHandoffReportPath = resolve(root, 'public', 'correction-remediation-autopilot-handoff-report.json');
const correctionRemediationAutopilotRollbackReadinessReportPath = resolve(root, 'public', 'correction-remediation-autopilot-rollback-readiness-report.json');
const correctionRemediationAutopilotTrustTimelineReportPath = resolve(root, 'public', 'correction-remediation-autopilot-trust-timeline-report.json');
const correctionRemediationAutopilotTrustTimelineBrowserFixturePath = resolve(root, 'public', 'correction-remediation-autopilot-trust-timeline-browser-fixture.json');
const correctionRemediationAutopilotTrustTimelineBrowserQaReportPath = resolve(root, 'public', 'correction-remediation-autopilot-trust-timeline-browser-qa-report.json');
const correctionRemediationAutopilotTimelineReceiptsReportPath = resolve(root, 'public', 'correction-remediation-autopilot-timeline-receipts-report.json');
const correctionRemediationAutopilotTimelineReceiptsBrowserFixturePath = resolve(root, 'public', 'correction-remediation-autopilot-timeline-receipts-browser-fixture.json');
const correctionRemediationAutopilotTimelineReceiptsBrowserQaReportPath = resolve(root, 'public', 'correction-remediation-autopilot-timeline-receipts-browser-qa-report.json');
const crossRepoArchitectureSecurityReviewReportPath = resolve(root, 'public', 'cross-repo-architecture-security-review-report.json');
const chatFirstFreeActivationCanaryReportPath = resolve(root, 'public', 'chat-first-free-activation-canary-report.json');
const domainAvailabilityWatchPath = resolve(root, 'public', 'domain-availability-watch.json');

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
  ...range(116, 204).map((id) => [id, { status: 'planned', evidence: 'Added to the expanded GUI parity and platform-readiness backlog; implementation has not started.' }]),
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
  ['D165', { status: 'beta', evidence: 'Verified live-model proof now selects the verified model, updates the prompt placeholder and exposes a Send first answer action plus first_chat_ready signal.' }],
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
  ['D179', { status: 'beta', evidence: 'Active replay state now appears near the first screen and chat runtime proof gate as demo-only, with real live proof explicitly unchanged.' }],
  ['D180', { status: 'beta', evidence: 'First-screen replay banners now expose Go to next step and Reset replay controls while only clearing the workspace-local demo replay key.' }],
  ['D181', { status: 'beta', evidence: 'A dedicated replay render smoke harness now checks every activation simulator scenario, required surface, next-target jump, reset path, runtime gate and demo-only invariant.' }],
  ['D182', { status: 'beta', evidence: 'Progress Dashboard now renders a replay route map for every activation simulator scenario, showing simulated signal, next target, covered surfaces and remaining live-proof gap.' }],
  ['D183', { status: 'beta', evidence: 'Progress Dashboard now compares current browser/local/proof/first-chat state against activation gaps and exposes one safe free action per gap.' }],
  ['D184', { status: 'beta', evidence: 'First screen now shows the same live activation closure state with one safe next action, using local-only profile/proof/receipt signals.' }],
  ['D185', { status: 'beta', evidence: 'First-screen activation closure now recommends one free installable starter model by detected device class and can preselect it in the runtime model flow.' }],
  ['D186', { status: 'beta', evidence: 'Recommended starter selections now record privacy-safe activation telemetry and the Progress Dashboard counts starter-selected events without prompts, responses, secrets or paid routes.' }],
  ['D187', { status: 'beta', evidence: 'Non-essential repair/replay first-screen QA banners now hydrate from a deferred module, keeping the immediate first action in the critical shell while increasing JS headroom.' }],
  ['D188', { status: 'beta', evidence: 'Progress Dashboard now shows a local-only starter funnel from recommended-starter selection to install, live proof and first-chat receipt.' }],
  ['D189', { status: 'beta', evidence: 'Starter funnel now exposes one Continue action that opens the exact missing install, free proof or first-chat step and records no-spend telemetry.' }],
  ['D190', { status: 'beta', evidence: 'First-screen deferred hydration now shows selected starter progress toward install, proof and first answer without increasing critical JS.' }],
  ['D191', { status: 'beta', evidence: 'First-screen starter progress now exposes one safe action for install, live proof or first chat and records no-spend telemetry.' }],
  ['D192', { status: 'beta', evidence: 'Model Library now imports exact free starter models, highlights the recommended starter and focuses it from first-screen/dashboard starter actions without enabling paid routes.' }],
  ['D193', { status: 'beta', evidence: 'Recommended starter cards now hand exact starter ids/model tags into chat runtime selection, Local Node install, proof preference and no-spend telemetry.' }],
  ['D194', { status: 'beta', evidence: 'Failed starter installs now store a repair resume, keep the selected starter/model, open the local repair path and refresh first-screen/Node Dashboard repair banners.' }],
  ['D195', { status: 'beta', evidence: 'Repair resume checks can now retry the preserved starter install once after the local node returns as needs-model, with no paid routes and retry loop protection.' }],
  ['D196', { status: 'beta', evidence: 'Successful starter install/retry now verifies the repair resume, records starter-retry-success telemetry and prepares a first useful chat prompt.' }],
  ['D197', { status: 'beta', evidence: 'Verified starter/proof states now expose Send first answer and carry the prompt through to an automatic first verified chat send from first screen, runtime and progress surfaces.' }],
  ['D198', { status: 'beta', evidence: 'After a verified first answer, chat proof, first-screen closure and Progress Dashboard now offer one receipt-driven next step such as save chat, connect node or add memory without storing raw prompts or starting paid routes.' }],
  ['D199', { status: 'beta', evidence: 'Visible-control audit now proves key first-screen, composer, runtime proof, model library, node repair and progress controls are wired or gated; Connect Model opens the model library instead of a dead configuration stop.' }],
  ['D200', { status: 'beta', evidence: 'Demo growth instrumentation now loads through the deferred queue with a click handoff, restoring meaningful critical-shell JS headroom while preserving Try demo mode.' }],
  ['D201', { status: 'beta', evidence: 'Deploy verification manifest records green Static quality, branding migration and Pages deploy for c140ad6, plus public URL health evidence and the local newly-registered-domain network watch state.' }],
  ['D202', { status: 'beta', evidence: 'First-screen visual QA now has a public-safe report and deterministic smoke gate for the composer, activation banners, model-library handoff and mobile layout after the recent UX changes.' }],
  ['D203', { status: 'beta', evidence: 'The chat composer now has a compact model picker from the plus/model chip, with recommended Chat now, Browser LLM and Install local paths above live, browser-helper, WebGPU and installable free local model routes with no paid-route side effects.' }],
  ['D204', { status: 'beta', evidence: 'Node Dashboard now renders an automatic node/tunnel handoff from installer to pairing, model install, proof/chat and optional outbound tunnel across desktop, VM and Raspberry Pi/Linux ARM paths.' }],
  ['D205', { status: 'beta', evidence: 'Universal installer release QA now verifies artifact checksums against the public manifest, keeps fake DMG links blocked, shows installer trust boundaries and records no-spend installer QA metadata.' }],
  ['D206', { status: 'beta', evidence: 'Installer-return-to-live-model proof now has a deterministic mock local-node gate covering health, pairing, model inventory, first chat readiness, automatic first local answer for empty chats and no-spend/no-secret boundaries.' }],
  ['D207', { status: 'beta', evidence: 'Composer model picker now keeps a free route floor visible with ready-now browser helpers, WebGPU candidates and installable free Ollama models even while live backend discovery catches up.' }],
  ['D208', { status: 'beta', evidence: 'Chat send flow now falls back to a useful free starter when no live model route is selected, and CI guards the first chat/model DOM against empty no-model dead ends.' }],
  ['D209', { status: 'beta', evidence: 'Progress Dashboard now renders a no-model dead-end browser fixture with loading, offline-node and no-live-model scenarios plus one free primary action for each.' }],
  ['D210', { status: 'beta', evidence: 'No-model visual pass now publishes desktop/mobile selector evidence for the composer route floor, first-chat fallback and progress fixture.' }],
  ['D211', { status: 'beta', evidence: 'Public no-model deploy verification now records green D210 GitHub Actions/Pages evidence, artifact contracts for the no-model fixture and route floor, plus the local newly-registered-domain network watch.' }],
  ['D212', { status: 'beta', evidence: 'First free chat response QA now proves MMIR Guide is truthful about the browser fallback, gives useful setup/model/growth guidance and exposes one no-spend next action.' }],
  ['D213', { status: 'beta', evidence: 'Composer action bar usefulness pass now wires Add model, mode toggles, model/resource chips, voice fallback and feedback copy to useful free/gated outcomes.' }],
  ['D214', { status: 'beta', evidence: 'Composer action bar visual QA now proves desktop/mobile selector, CSS and copy contracts for compact controls, feedback text and stable send behavior.' }],
  ['D215', { status: 'beta', evidence: 'Message action completeness now gives assistant answers copy, retry, save, fork, safe share and next-step controls with local-first/no-spend boundaries.' }],
  ['D216', { status: 'beta', evidence: 'Message action visual QA now proves desktop/mobile selector, CSS and copy contracts for transcript controls, wrapping and status feedback.' }],
  ['D217', { status: 'beta', evidence: 'Message action browser fixture now proves save, fork, safe share and next-step behavior against synthetic localStorage, clipboard and bridge state.' }],
  ['D218', { status: 'beta', evidence: 'Message action accessibility pass now adds grouped controls, described status feedback and verified focus/aria contracts.' }],
  ['D219', { status: 'beta', evidence: 'Conversation handoff polish now turns message Save/Fork into visible Conversations callouts with active badges, continue actions and metadata-only local handoff state.' }],
  ['D220', { status: 'beta', evidence: 'Saved chat handoff now promotes useful conversations into local memory or Saved chats knowledge with review notes, redaction and no backend spend by default.' }],
  ['D221', { status: 'beta', evidence: 'Promoted context next-answer proof now evaluates the real chat-runtime memory/knowledge functions against synthetic saved-chat data and proves visible memory-use review.' }],
  ['D222', { status: 'beta', evidence: 'Per-message context controls now let users see and turn local Memory/Knowledge on or off for the next answer, enforced by chat-runtime guards.' }],
  ['D223', { status: 'beta', evidence: 'Answer context receipts now record and render safe per-answer metadata for model, route, memory, knowledge, history, role, modes and cost guard.' }],
  ['D224', { status: 'beta', evidence: 'Answer context receipts now include direct Memory, Knowledge, Model and Privacy drill-down actions that open existing public-safe panels.' }],
  ['D225', { status: 'beta', evidence: 'Receipt drill-downs now write local metadata highlights and render the selected answer context inside Memory, Knowledge, Model and Privacy panels.' }],
  ['D226', { status: 'beta', evidence: 'Receipt highlights now carry safe source filters: memory-use IDs/counts/sources and selected model labels are attached to target panels.' }],
  ['D227', { status: 'beta', evidence: 'Memory and Knowledge panels now consume receipt source filters, show visible receipt-filter state, mark matching memory/knowledge IDs where available and explain missing exact knowledge IDs.' }],
  ['D228', { status: 'beta', evidence: 'Chat runtime now writes metadata-only knowledge-use entries, answer receipts carry knowledge source IDs/counts/sources, and Knowledge drill-downs can mark exact local documents or collections.' }],
  ['D229', { status: 'beta', evidence: 'Memory and Knowledge panels now expose receipt-focused correction actions to review, edit or disable used sources and clear source focus without deleting content.' }],
  ['D230', { status: 'beta', evidence: 'Context corrections now write browser-local metadata-only audit events, render recent correction trails and expose undo for disabled memory/knowledge sources.' }],
  ['D231', { status: 'beta', evidence: 'A deferred retry-after-correction module now adds Retry fixed actions to corrected answers, derives prompts from visible chat state and marks retried answers with metadata-only receipts.' }],
  ['D232', { status: 'beta', evidence: 'Context correction suggestions now derive local memory/knowledge hygiene recommendations from correction metadata and open review panels without mutating user data.' }],
  ['D233', { status: 'beta', evidence: 'Managed backend now has protected /context/corrections sync, list and undo routes, metadata-only storage, owner-scoped export/import/delete coverage and tests for raw prompt/response/secret rejection.' }],
  ['D234', { status: 'beta', evidence: 'Public UI now previews correction metadata, checks active backend context.corrections capability, syncs sanitized events to /context/corrections and lets users keep trails local without storing secrets.' }],
  ['D235', { status: 'beta', evidence: 'Backend and public UI now expose protected /context/corrections/review with owner-safe filters, prioritized metadata-only review items, safe next actions and no raw prompt/response/secret storage.' }],
  ['D236', { status: 'beta', evidence: 'Backend and public UI now create explicit non-executing correction remediation plans from review items, with local approve/defer notes and execution_allowed:false safety gates.' }],
  ['D237', { status: 'beta', evidence: 'Backend and public UI now expose protected remediation step apply gates with explicit confirmation, audit receipts, rollback hints and no public frontend authority.' }],
  ['D238', { status: 'beta', evidence: 'Backend and public UI now convert confirmed remediation receipts into protected memory/knowledge adapter drafts with source IDs, rollback metadata and source_mutation_executed:false.' }],
  ['D239', { status: 'beta', evidence: 'Backend and public UI now preview and record protected remediation adapter commit receipts with rollback metadata and source_mutation_allowed:false.' }],
  ['D240', { status: 'beta', evidence: 'Backend and public UI now preview and apply supported memory remediation executions through backend-only gates with before/after rollback metadata.' }],
  ['D241', { status: 'beta', evidence: 'Backend and public UI now preview and apply rollback for supported memory remediation executions through backend-only gates.' }],
  ['D242', { status: 'beta', evidence: 'Backend and public UI now preview and record metadata-only knowledge source review/split models before any knowledge mutation execution.' }],
  ['D243', { status: 'beta', evidence: 'Backend and public UI now preview and apply supported knowledge source metadata repairs through backend-only execution gates with rollback metadata.' }],
  ['D244', { status: 'beta', evidence: 'Backend and public UI now preview and apply rollback for supported knowledge source metadata executions through backend-only gates.' }],
  ['D245', { status: 'beta', evidence: 'Backend and public UI now preview and run a safe correction remediation autopilot queue that records non-destructive metadata receipts and stops before source mutation.' }],
  ['D246', { status: 'beta', evidence: 'Backend commit 6c83644 and public UI now prepare resumable source-mutation handoff previews after safe autopilot runs without giving GitHub Pages mutation authority.' }],
  ['D247', { status: 'beta', evidence: 'Backend commit e648af0 and public UI now show rollback readiness before and after explicit source changes without executing mutation or rollback from GitHub Pages.' }],
  ['D248', { status: 'beta', evidence: 'Public UI now combines autopilot handoff, explicit source confirmation, rollback readiness refresh and undo cue into one guided trust timeline without public mutation authority.' }],
  ['D249', { status: 'beta', evidence: 'Public dashboard now embeds deterministic desktop/mobile browser QA fixtures for guided trust timeline states and action enablement.' }],
  ['D250', { status: 'beta', evidence: 'Public UI now writes browser-local metadata receipts after trust timeline confirm, readiness refresh and rollback actions.' }],
  ['D251', { status: 'beta', evidence: 'Public dashboard now embeds deterministic desktop/mobile browser QA fixtures for timeline receipt running, ready and error states.' }],
  ['D252', { status: 'beta', evidence: 'Progress Dashboard now embeds a public-safe cross-repo code, architecture, security and UX review gate using public and backend test evidence.' }],
  ['D253', { status: 'beta', evidence: 'Chat-first free activation canary now proves instant free browser-helper chat, first-chat receipt coverage, Mac installer checksum alignment and local-node proof handoff without spend.' }],
  ['D254', { status: 'next', evidence: 'Current launch-critical slice: chat now has critical compact active route chips directly under the composer, public-safe free model starters, tested WebGPU/local-node handoff and Mac app-bundle DMG contract evidence without publishing a fake artifact. Continue real-device release QA and deeper Open WebUI polish.' }],
  ['D255', { status: 'beta', evidence: 'Performance gates now count inline first-paint JavaScript separately from external critical scripts, preserve chat-first scroll as a critical external asset and enforce a combined first-paint JS budget.' }],
  ['D256', { status: 'beta', evidence: 'A focused DOM rendering hardening gate now guards core chat, active route strip, model picker and safe sharing against raw dynamic HTML regressions.' }],
  ['D257', { status: 'beta', evidence: 'Progress Dashboard now starts with a P0 launch progress bar, latest green evidence, active blockers and the next no-spend work queue so the owner can track Codex delivery without reading docs.' }],
  ['D258', { status: 'beta', evidence: 'Empty composer send now starts a useful free MMIR Guide chat automatically instead of showing a dead validation error, with public-safe smoke coverage.' }],
  ['D259', { status: 'beta', evidence: 'Active Local Node and unsupported WebGPU route actions now go directly to the universal no-spend installer with a browser-local repair resume, so MMIR can continue proof after return.' }],
  ['D260', { status: 'beta', evidence: 'Active route strip copy and CSS were tightened so the chat-first shell now has restored first-paint JS headroom while preserving free starter, WebGPU and Local Node install handoffs.' }],
  ['D261', { status: 'beta', evidence: 'Active chat manifest now lists Qwen, Gemma, Llama and Phi browser WebGPU routes as free/no-approval nodes, and the active strip routes selected starters to the exact browser/local fallback path.' }],
  ['D262', { status: 'beta', evidence: 'Composer model picker recommendations now expose multiple free Browser WebGPU LLM choices directly, with UI action coverage and visible-control audit proving no-spend routing.' }],
  ['D263', { status: 'beta', evidence: 'Ready-now composer recommendations now seed a useful prompt and click Send automatically, so Chat now and Browser WebGPU choices produce first value instead of stopping at selection.' }],
  ['D264', { status: 'beta', evidence: 'Installable local starter choices now open the universal no-spend installer when localhost is missing, preserve a repair resume and carry the selected Ollama model into the generated Mac command package.' }],
  ['D265', { status: 'beta', evidence: 'Progress Dashboard launch evidence now includes the latest selected-model installer handoff commit, green Pages deploy and refreshed next queue.' }],
  ['D266', { status: 'beta', evidence: 'When local-node proof fails, the chat runtime now keeps ready browser-guide/WebGPU starter routes green instead of making first chat look broken.' }],
  ['D267', { status: 'beta', evidence: 'Universal installer page can now generate selected-model wrappers for Windows, Linux and Raspberry Pi, preserving MMIR_MODEL across the local-node handoff without paid services.' }],
  ['D268', { status: 'beta', evidence: 'After a conversation starts, chat focus mode hides quick suggestions and collapses active-node details so the transcript and composer stay primary.' }],
  ['D269', { status: 'beta', evidence: 'The main composer now auto-grows like a modern chat surface, caps height cleanly and resets after send/model actions through CSS plus a deferred fallback script without adding critical first-paint JavaScript.' }],
  ['D270', { status: 'beta', evidence: 'The main composer action now hands off to the existing stop control while a cancellable response is running, giving the primary button an Open WebUI/ChatGPT-like stop state without adding critical first-paint JavaScript.' }],
  ['D271', { status: 'beta', evidence: 'A deferred transcript scroll guard now keeps new messages pinned to bottom by default, preserves scroll position when the user reads older context and exposes a Latest jump action without adding critical first-paint JavaScript.' }],
  ['D272', { status: 'beta', evidence: 'A deferred composer New chat action now reuses the existing runtime clear path, blocks while responses are running, resets/focuses the prompt and keeps free/local routes available without adding critical first-paint JavaScript.' }],
  ['D273', { status: 'beta', evidence: 'A deferred composer keyboard module now lets Escape stop a running answer and Ctrl/Cmd+K focus the prompt through existing runtime controls without adding critical first-paint JavaScript.' }],
  ['D274', { status: 'beta', evidence: 'A deferred desktop-safe autofocus module now puts the cursor in the composer on first load when there is no deep link, while avoiding mobile keyboard popups and critical first-paint JavaScript growth.' }],
  ['D275', { status: 'beta', evidence: 'A deferred composer refocus module now returns focus to the prompt after send/submit/Enter for smooth follow-up chat, while avoiding mobile keyboard popups unless the prompt was recently active.' }],
  ['D276', { status: 'beta', evidence: 'Post-chat ready-state live proof now collapses to a compact status line with actions, while non-ready repair/error proof remains visible and actionable.' }],
  ['D277', { status: 'beta', evidence: 'The composer model picker now marks the currently selected route in recommendations and the full route grid with selected badges, pressed/current state and cache-busted assets.' }],
  ['D278', { status: 'beta', evidence: 'The composer model picker now closes through an explicit Close action, Escape or outside click, and returns focus to the prompt on chat-oriented close paths without paid/backend side effects.' }],
  ['D279', { status: 'beta', evidence: 'The composer model picker now includes a local-only search field that filters the full route grid by model, runtime, route type and action with count/empty-state feedback.' }],
  ['D280', { status: 'beta', evidence: 'The composer model picker now has local-only route filter chips for All, Ready, Browser, Local and Live paths, combined with search and mobile-safe overflow.' }],
  ['D281', { status: 'beta', evidence: 'The composer model picker now has a reset action that clears search, returns the route filter to All and keeps the user in the discovery flow without network/provider side effects.' }],
  ['D282', { status: 'beta', evidence: 'The composer model picker now focuses search on desktop/fine-pointer open while guarding coarse-pointer devices from surprise mobile keyboard popups.' }],
  ['D283', { status: 'beta', evidence: 'The composer model picker now includes an actionable empty-state reset button when search/filter returns no routes, so users can recover to all routes in one click.' }],
  ['D284', { status: 'beta', evidence: 'Fresh full-project review snapshot now records public Pages CI, 89 frontend smoke gates, local-node release/conformance gates, backend route/security gates and OCI/AWS proxy checks in the Progress Dashboard.' }],
  ['D285', { status: 'beta', evidence: 'The legacy Connect Model action now prepares the free local profile and opens the compact composer model picker first, with a safe model-library fallback while deferred assets load.' }],
  ['D286', { status: 'beta', evidence: 'The composer now uses compact Open WebUI-style Auto review and 5.5 Extra high chips, keeps advanced modes visually quieter on the first screen and preserves no-spend mode toggles.' }],
  ['D287', { status: 'beta', evidence: 'Domain availability watch now records the latest green Pages commit, public CNAME/DNS evidence, local 503 watch state and no-spend off-network verification steps without treating it as a chat regression.' }],
  ['D288', { status: 'beta', evidence: 'The composer plus button now opens an Open WebUI-style quick actions drawer for models, local node install, knowledge, new chat, voice and settings with no hidden spend.' }],
  ['D289', { status: 'beta', evidence: 'The composer quick actions drawer now leads with Ready now status and a Chat now action that seeds the safest free prompt only when empty.' }],
  ['D290', { status: 'beta', evidence: 'The composer quick actions drawer now exposes direct no-spend route chips for MMIR Guide, Browser WebGPU and Qwen3 local install before the heavier model picker.' }]
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

function readNoModelDeadEndReport() {
  if (!existsSync(noModelDeadEndReportPath)) return null;
  return JSON.parse(readFileSync(noModelDeadEndReportPath, 'utf8'));
}

function readNoModelPublicDeployVerification() {
  if (!existsSync(noModelPublicDeployVerificationPath)) return null;
  return JSON.parse(readFileSync(noModelPublicDeployVerificationPath, 'utf8'));
}

function readFirstFreeChatResponseReport() {
  if (!existsSync(firstFreeChatResponseReportPath)) return null;
  return JSON.parse(readFileSync(firstFreeChatResponseReportPath, 'utf8'));
}

function readComposerActionBarReport() {
  if (!existsSync(composerActionBarReportPath)) return null;
  return JSON.parse(readFileSync(composerActionBarReportPath, 'utf8'));
}

function readComposerActionBarVisualReport() {
  if (!existsSync(composerActionBarVisualReportPath)) return null;
  return JSON.parse(readFileSync(composerActionBarVisualReportPath, 'utf8'));
}

function readComposerQuickActionsReport() {
  if (!existsSync(composerQuickActionsReportPath)) return null;
  return JSON.parse(readFileSync(composerQuickActionsReportPath, 'utf8'));
}

function readMessageActionCompletenessReport() {
  if (!existsSync(messageActionCompletenessReportPath)) return null;
  return JSON.parse(readFileSync(messageActionCompletenessReportPath, 'utf8'));
}

function readMessageActionVisualReport() {
  if (!existsSync(messageActionVisualReportPath)) return null;
  return JSON.parse(readFileSync(messageActionVisualReportPath, 'utf8'));
}

function readMessageActionBrowserFixtureReport() {
  if (!existsSync(messageActionBrowserFixtureReportPath)) return null;
  return JSON.parse(readFileSync(messageActionBrowserFixtureReportPath, 'utf8'));
}

function readMessageActionAccessibilityReport() {
  if (!existsSync(messageActionAccessibilityReportPath)) return null;
  return JSON.parse(readFileSync(messageActionAccessibilityReportPath, 'utf8'));
}

function readConversationHandoffReport() {
  if (!existsSync(conversationHandoffReportPath)) return null;
  return JSON.parse(readFileSync(conversationHandoffReportPath, 'utf8'));
}

function readSavedChatMemoryHandoffReport() {
  if (!existsSync(savedChatMemoryHandoffReportPath)) return null;
  return JSON.parse(readFileSync(savedChatMemoryHandoffReportPath, 'utf8'));
}

function readPromotedContextNextAnswerReport() {
  if (!existsSync(promotedContextNextAnswerReportPath)) return null;
  return JSON.parse(readFileSync(promotedContextNextAnswerReportPath, 'utf8'));
}

function readContextControlsReport() {
  if (!existsSync(contextControlsReportPath)) return null;
  return JSON.parse(readFileSync(contextControlsReportPath, 'utf8'));
}

function readAnswerContextReceiptReport() {
  if (!existsSync(answerContextReceiptReportPath)) return null;
  return JSON.parse(readFileSync(answerContextReceiptReportPath, 'utf8'));
}

function readAnswerContextDrilldownReport() {
  if (!existsSync(answerContextDrilldownReportPath)) return null;
  return JSON.parse(readFileSync(answerContextDrilldownReportPath, 'utf8'));
}

function readAnswerContextHighlightReport() {
  if (!existsSync(answerContextHighlightReportPath)) return null;
  return JSON.parse(readFileSync(answerContextHighlightReportPath, 'utf8'));
}

function readAnswerContextSourceFilterReport() {
  if (!existsSync(answerContextSourceFilterReportPath)) return null;
  return JSON.parse(readFileSync(answerContextSourceFilterReportPath, 'utf8'));
}

function readAnswerContextFilterConsumptionReport() {
  if (!existsSync(answerContextFilterConsumptionReportPath)) return null;
  return JSON.parse(readFileSync(answerContextFilterConsumptionReportPath, 'utf8'));
}

function readAnswerContextKnowledgeSourceReport() {
  if (!existsSync(answerContextKnowledgeSourceReportPath)) return null;
  return JSON.parse(readFileSync(answerContextKnowledgeSourceReportPath, 'utf8'));
}

function readAnswerContextSourceCorrectionReport() {
  if (!existsSync(answerContextSourceCorrectionReportPath)) return null;
  return JSON.parse(readFileSync(answerContextSourceCorrectionReportPath, 'utf8'));
}

function readContextCorrectionAuditReport() {
  if (!existsSync(contextCorrectionAuditReportPath)) return null;
  return JSON.parse(readFileSync(contextCorrectionAuditReportPath, 'utf8'));
}

function readContextCorrectionRetryReport() {
  if (!existsSync(contextCorrectionRetryReportPath)) return null;
  return JSON.parse(readFileSync(contextCorrectionRetryReportPath, 'utf8'));
}

function readContextCorrectionSuggestionsReport() {
  if (!existsSync(contextCorrectionSuggestionsReportPath)) return null;
  return JSON.parse(readFileSync(contextCorrectionSuggestionsReportPath, 'utf8'));
}

function readProtectedContextCorrectionSyncReport() {
  if (!existsSync(protectedContextCorrectionSyncReportPath)) return null;
  return JSON.parse(readFileSync(protectedContextCorrectionSyncReportPath, 'utf8'));
}

function readProtectedCorrectionSyncUiReport() {
  if (!existsSync(protectedCorrectionSyncUiReportPath)) return null;
  return JSON.parse(readFileSync(protectedCorrectionSyncUiReportPath, 'utf8'));
}

function readProtectedCorrectionReviewQueueReport() {
  if (!existsSync(protectedCorrectionReviewQueueReportPath)) return null;
  return JSON.parse(readFileSync(protectedCorrectionReviewQueueReportPath, 'utf8'));
}

function readCorrectionRemediationPlanReport() {
  if (!existsSync(correctionRemediationPlanReportPath)) return null;
  return JSON.parse(readFileSync(correctionRemediationPlanReportPath, 'utf8'));
}

function readCorrectionRemediationApplyGatesReport() {
  if (!existsSync(correctionRemediationApplyGatesReportPath)) return null;
  return JSON.parse(readFileSync(correctionRemediationApplyGatesReportPath, 'utf8'));
}

function readCorrectionRemediationAdaptersReport() {
  if (!existsSync(correctionRemediationAdaptersReportPath)) return null;
  return JSON.parse(readFileSync(correctionRemediationAdaptersReportPath, 'utf8'));
}

function readCorrectionRemediationCommitPolicyReport() {
  if (!existsSync(correctionRemediationCommitPolicyReportPath)) return null;
  return JSON.parse(readFileSync(correctionRemediationCommitPolicyReportPath, 'utf8'));
}

function readCorrectionRemediationExecutionGatesReport() {
  if (!existsSync(correctionRemediationExecutionGatesReportPath)) return null;
  return JSON.parse(readFileSync(correctionRemediationExecutionGatesReportPath, 'utf8'));
}

function readCorrectionRemediationRollbackGatesReport() {
  if (!existsSync(correctionRemediationRollbackGatesReportPath)) return null;
  return JSON.parse(readFileSync(correctionRemediationRollbackGatesReportPath, 'utf8'));
}

function readCorrectionRemediationKnowledgeSourceModelReport() {
  if (!existsSync(correctionRemediationKnowledgeSourceModelReportPath)) return null;
  return JSON.parse(readFileSync(correctionRemediationKnowledgeSourceModelReportPath, 'utf8'));
}

function readCorrectionRemediationKnowledgeExecutionGatesReport() {
  if (!existsSync(correctionRemediationKnowledgeExecutionGatesReportPath)) return null;
  return JSON.parse(readFileSync(correctionRemediationKnowledgeExecutionGatesReportPath, 'utf8'));
}

function readCorrectionRemediationKnowledgeRollbackGatesReport() {
  if (!existsSync(correctionRemediationKnowledgeRollbackGatesReportPath)) return null;
  return JSON.parse(readFileSync(correctionRemediationKnowledgeRollbackGatesReportPath, 'utf8'));
}

function readCorrectionRemediationAutopilotQueueReport() {
  if (!existsSync(correctionRemediationAutopilotQueueReportPath)) return null;
  return JSON.parse(readFileSync(correctionRemediationAutopilotQueueReportPath, 'utf8'));
}

function readCorrectionRemediationAutopilotHandoffReport() {
  if (!existsSync(correctionRemediationAutopilotHandoffReportPath)) return null;
  return JSON.parse(readFileSync(correctionRemediationAutopilotHandoffReportPath, 'utf8'));
}

function readCorrectionRemediationAutopilotRollbackReadinessReport() {
  if (!existsSync(correctionRemediationAutopilotRollbackReadinessReportPath)) return null;
  return JSON.parse(readFileSync(correctionRemediationAutopilotRollbackReadinessReportPath, 'utf8'));
}

function readCorrectionRemediationAutopilotTrustTimelineReport() {
  if (!existsSync(correctionRemediationAutopilotTrustTimelineReportPath)) return null;
  return JSON.parse(readFileSync(correctionRemediationAutopilotTrustTimelineReportPath, 'utf8'));
}

function readCorrectionRemediationAutopilotTrustTimelineBrowserFixture() {
  if (!existsSync(correctionRemediationAutopilotTrustTimelineBrowserFixturePath)) return null;
  return JSON.parse(readFileSync(correctionRemediationAutopilotTrustTimelineBrowserFixturePath, 'utf8'));
}

function readCorrectionRemediationAutopilotTrustTimelineBrowserQaReport() {
  if (!existsSync(correctionRemediationAutopilotTrustTimelineBrowserQaReportPath)) return null;
  return JSON.parse(readFileSync(correctionRemediationAutopilotTrustTimelineBrowserQaReportPath, 'utf8'));
}

function readCorrectionRemediationAutopilotTimelineReceiptsReport() {
  if (!existsSync(correctionRemediationAutopilotTimelineReceiptsReportPath)) return null;
  return JSON.parse(readFileSync(correctionRemediationAutopilotTimelineReceiptsReportPath, 'utf8'));
}

function readCorrectionRemediationAutopilotTimelineReceiptsBrowserFixture() {
  if (!existsSync(correctionRemediationAutopilotTimelineReceiptsBrowserFixturePath)) return null;
  return JSON.parse(readFileSync(correctionRemediationAutopilotTimelineReceiptsBrowserFixturePath, 'utf8'));
}

function readCorrectionRemediationAutopilotTimelineReceiptsBrowserQaReport() {
  if (!existsSync(correctionRemediationAutopilotTimelineReceiptsBrowserQaReportPath)) return null;
  return JSON.parse(readFileSync(correctionRemediationAutopilotTimelineReceiptsBrowserQaReportPath, 'utf8'));
}

function readCrossRepoArchitectureSecurityReviewReport() {
  if (!existsSync(crossRepoArchitectureSecurityReviewReportPath)) return null;
  return JSON.parse(readFileSync(crossRepoArchitectureSecurityReviewReportPath, 'utf8'));
}

function readChatFirstFreeActivationCanaryReport() {
  if (!existsSync(chatFirstFreeActivationCanaryReportPath)) return null;
  return JSON.parse(readFileSync(chatFirstFreeActivationCanaryReportPath, 'utf8'));
}

function readDomainAvailabilityWatch() {
  if (!existsSync(domainAvailabilityWatchPath)) return null;
  return JSON.parse(readFileSync(domainAvailabilityWatchPath, 'utf8'));
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

function progressWeight(status) {
  if (status === 'done') return 1;
  if (status === 'beta') return 0.75;
  if (status === 'next') return 0.35;
  if (status === 'watch') return 0.2;
  return 0;
}

function buildLaunchProgress() {
  const checkpoints = [
    {
      id: 'chat-first-ui',
      label: 'Chat is the first product surface',
      status: 'done',
      evidence: 'Composer, smooth transcript state and compact active route chips are critical UI, not deferred widgets.'
    },
    {
      id: 'free-route-floor',
      label: 'Useful free route before setup',
      status: 'done',
      evidence: 'No-model fallback, MMIR Guide and free starter choices prevent an empty first chat.'
    },
    {
      id: 'empty-send-autostart',
      label: 'Send works without typing first',
      status: 'done',
      evidence: 'Empty composer send starts the safest free browser chat automatically instead of asking the user to configure or write first.'
    },
    {
      id: 'model-picker',
      label: 'Model picker has obvious choices',
      status: 'done',
      evidence: 'Chat now, Browser LLM and Install local lead the picker before the full model catalog, and the selected route is visibly marked.'
    },
    {
      id: 'selected-route-clarity',
      label: 'Selected model route is obvious',
      status: 'beta',
      evidence: 'Composer model recommendations and route cards expose selected badges plus aria pressed/current state without starting paid routes.'
    },
    {
      id: 'model-picker-close-flow',
      label: 'Model picker returns to chat cleanly',
      status: 'beta',
      evidence: 'Close, Escape and outside click collapse the picker, while chat-oriented close paths return focus to the prompt without starting paid routes.'
    },
    {
      id: 'model-picker-search',
      label: 'Model choices are searchable',
      status: 'beta',
      evidence: 'The composer picker can filter model routes locally by name, runtime, free/local/live path and install action without provider calls or paid routes.'
    },
    {
      id: 'model-picker-route-filters',
      label: 'Model routes can be narrowed instantly',
      status: 'beta',
      evidence: 'All, Ready, Browser, Local and Live chips filter the route grid locally and combine with search without starting network/provider work.'
    },
    {
      id: 'model-picker-reset',
      label: 'Model filters are easy to recover from',
      status: 'beta',
      evidence: 'Reset clears the search query, returns the picker to All routes and keeps focus in the model discovery flow.'
    },
    {
      id: 'model-picker-search-focus',
      label: 'Desktop model search is ready immediately',
      status: 'beta',
      evidence: 'Opening the picker on fine-pointer devices focuses search after render; coarse-pointer devices are guarded to avoid mobile keyboard surprise.'
    },
    {
      id: 'model-picker-empty-recovery',
      label: 'Empty model results are recoverable',
      status: 'beta',
      evidence: 'No-result states include a Show all routes action that clears search/filter locally and keeps users in model discovery.'
    },
    {
      id: 'fresh-cross-repo-review',
      label: 'Full-project review snapshot is current',
      status: 'beta',
      evidence: 'D284 records the latest public Pages CI, 89 frontend smoke gates, local-node package/conformance gates, backend route/security gates and OCI/AWS proxy syntax checks.'
    },
    {
      id: 'connect-model-picker-first',
      label: 'Connect model opens the compact picker first',
      status: 'beta',
      evidence: 'D285 routes Connect/Add model through the compact picker before falling back to the model library, while preserving the free local profile and no-spend boundary.'
    },
    {
      id: 'compact-composer-mode-chips',
      label: 'Composer mode chips are compact',
      status: 'beta',
      evidence: 'D286 gives the first chat composer Open WebUI-style Auto review and 5.5 Extra high chips while hiding heavier MMIR++/Vision controls from the clean first-screen shell.'
    },
    {
      id: 'domain-availability-watch-refresh',
      label: 'Domain availability is separated from chat health',
      status: 'watch',
      evidence: 'D287 records f69d128 as the latest green Pages commit, Cloudflare DNS/CNAME evidence and the local 503 state as an off-network domain watch instead of a frontend/chat failure.'
    },
    {
      id: 'composer-quick-actions-drawer',
      label: 'Plus opens useful chat tools',
      status: 'beta',
      evidence: 'D288 turns the composer plus into a compact tools drawer for models, local install, knowledge, new chat, voice and settings, while preserving no-spend and fallback model-picker behavior.'
    },
    {
      id: 'composer-quick-chat-now',
      label: 'Plus drawer can start useful chat',
      status: 'beta',
      evidence: 'D289 adds Ready now route status and Chat now to the quick actions drawer, so opening tools still gives an automatic free first-value path.'
    },
    {
      id: 'composer-quick-free-routes',
      label: 'Plus drawer shows free model routes',
      status: 'beta',
      evidence: 'D290 adds one-click MMIR Guide, Browser WebGPU and Qwen3 local install route chips inside the plus drawer with no paid/provider side effects.'
    },
    {
      id: 'local-node-package',
      label: 'Local node package contract',
      status: 'beta',
      evidence: 'Mac app-bundle DMG contract and universal installer manifest are built and tested; real-device signing/notarization remains later.'
    },
    {
      id: 'installer-return',
      label: 'Install return to first local answer',
      status: 'beta',
      evidence: 'Mock local-node proof covers health, models and automatic first local answer after a successful install return.'
    },
    {
      id: 'active-install-handoff',
      label: 'Connect/install action carries repair resume',
      status: 'beta',
      evidence: 'Active route Local Node and WebGPU fallback actions open the universal installer and save a local resume for proof after return.'
    },
    {
      id: 'active-node-chat',
      label: 'Active nodes connect to chat path',
      status: 'beta',
      evidence: 'Browser helper, Qwen/Gemma/Llama/Phi WebGPU candidates and local-node route floor are wired through smoke tests without paid/provider keys.'
    },
    {
      id: 'multi-webgpu-picker',
      label: 'Multiple free browser LLMs in picker',
      status: 'beta',
      evidence: 'Composer model picker now recommends several WebGPU starters directly instead of hiding them behind one generic Browser LLM path.'
    },
    {
      id: 'recommended-chat-autostart',
      label: 'Recommended model choices auto-start chat',
      status: 'beta',
      evidence: 'Ready-now recommendations seed a truthful prompt and trigger the primary chat action without paid/provider side effects.'
    },
    {
      id: 'selected-local-installer-handoff',
      label: 'Selected local model reaches installer',
      status: 'beta',
      evidence: 'Composer and Model Library install actions preserve the chosen free Ollama starter, write a browser-local repair resume and carry the model into the generated Mac command package.'
    },
    {
      id: 'critical-shell-headroom',
      label: 'Chat shell performance headroom',
      status: 'beta',
      evidence: 'Critical active-node JavaScript remains under budget after more free WebGPU routes; quality gates report 161646 external JS bytes and 166012 total first-paint JS bytes.'
    },
    {
      id: 'composer-new-chat',
      label: 'New chat is in the composer',
      status: 'beta',
      evidence: 'The composer now has a New chat shortcut that reuses the runtime clear path, blocks while streaming and refocuses the prompt.'
    },
    {
      id: 'composer-keyboard-shortcuts',
      label: 'Keyboard flow feels modern',
      status: 'beta',
      evidence: 'Escape stops a running answer and Ctrl/Cmd+K focuses the composer through existing controls without adding critical first-paint JavaScript.'
    },
    {
      id: 'composer-ready-on-open',
      label: 'Composer is ready on open',
      status: 'beta',
      evidence: 'Desktop first load focuses the prompt only when there is no deep link or user interaction, avoiding mobile keyboard popups and paid/backend side effects.'
    },
    {
      id: 'composer-follow-up-focus',
      label: 'Follow-up chat stays frictionless',
      status: 'beta',
      evidence: 'After send/submit/Enter, MMIR returns focus to the prompt for follow-up drafting without adding critical first-paint JavaScript or mobile keyboard surprise.'
    },
    {
      id: 'compact-ready-proof',
      label: 'Green proof stays quiet after chat starts',
      status: 'beta',
      evidence: 'Ready-state proof becomes a compact status line in active conversations, keeping the transcript primary while preserving actions and leaving repair/error states expanded.'
    },
    {
      id: 'transcript-scroll-guard',
      label: 'Transcript respects reading position',
      status: 'beta',
      evidence: 'The transcript stays pinned to latest by default but preserves scroll position and shows Latest when the user reads older context.'
    },
    {
      id: 'composer-stop-handoff',
      label: 'Primary composer button can stop',
      status: 'beta',
      evidence: 'When a cancellable response is running, the main composer action hands off to runtime stop and returns to send afterward.'
    },
    {
      id: 'composer-autosize',
      label: 'Chat composer feels smooth',
      status: 'beta',
      evidence: 'The main composer now auto-grows, caps long prompts cleanly and resets after send/model actions without adding critical first-paint JavaScript.'
    },
    {
      id: 'zero-trust-public',
      label: 'Public site stays secret-free',
      status: 'done',
      evidence: 'Public safety audit blocks token-like strings, browser Bearer-key construction and paid compute enablement.'
    },
    {
      id: 'real-browser-qa',
      label: 'Real browser usability QA',
      status: 'watch',
      evidence: 'Local static checks are green; in-app browser automation has timed out before page inspection and needs another pass.'
    },
    {
      id: 'open-webui-polish',
      label: 'Open WebUI / ChatGPT smoothness polish',
      status: 'next',
      evidence: 'Continue D254: reduce noise, keep advanced features lower, and make first chat feel instant and calm.'
    }
  ];
  const total = checkpoints.length || 1;
  const percent = Math.round((checkpoints.reduce((sum, item) => sum + progressWeight(item.status), 0) / total) * 100);
  return {
    title: 'P0 launch progress',
    percent,
    state: percent >= 85 ? 'green' : 'building',
    summary: 'The free chat and local-first activation path is moving, but it is not complete until real browser/device QA and D254 polish are green.',
    public_url: './mmir.html#progress-dashboard',
    local_url: 'http://localhost:4173/mmir.html#progress-dashboard',
    checkpoints,
    last_green_evidence: [
      {
        repo: 'inkognitroz.github.io',
        commit: 'f69d128',
        label: 'Compact composer mode chips',
        result: 'Static quality gates, branding migration and Pages deploy green; D287 keeps domain availability as a separate watch'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: 'edf0b25',
        label: 'Full-project review baseline',
        result: 'GitHub Actions green; 89 local smoke gates, public safety audit, JS syntax, local-node, backend, OCI and AWS no-spend gates green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: '3c247c1',
        label: 'Model picker empty-result recovery',
        result: '89 local smoke gates, public safety audit, JS syntax check and GitHub Actions green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: 'f4e8196',
        label: 'Desktop model picker search focus',
        result: '89 local smoke gates, public safety audit, JS syntax check and GitHub Actions green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: '0ac4ae6',
        label: 'Model picker reset flow',
        result: '89 local smoke gates, public safety audit, JS syntax check and GitHub Actions green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: '0900123',
        label: 'Model picker route filters',
        result: '89 local smoke gates, public safety audit, JS syntax check and GitHub Actions green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: 'ed25ecb',
        label: 'Searchable composer model picker',
        result: '89 local smoke gates, public safety audit, JS syntax check and GitHub Actions green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: '0b2e1ac',
        label: 'Smooth model picker close flow',
        result: '89 local smoke gates, public safety audit, JS syntax check and GitHub Actions green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: '9d6097b',
        label: 'Selected composer model route clarity',
        result: '89 local smoke gates, public safety audit, JS syntax check and GitHub Actions green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: '4e6058b',
        label: 'Compact ready proof after chat starts',
        result: '89 local smoke gates, public safety audit, JS syntax check and GitHub Actions green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: '113808b',
        label: 'Composer follow-up refocus after send',
        result: '89 local smoke gates, public safety audit, JS syntax check and GitHub Actions green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: 'ce6fb0a',
        label: 'Desktop composer ready-on-open',
        result: '89 local smoke gates, public safety audit, JS syntax check and GitHub Actions green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: '4366d4a',
        label: 'Composer keyboard shortcuts',
        result: '89 local smoke gates, public safety audit, JS syntax check and GitHub Actions green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: 'e58c75d',
        label: 'Composer New chat shortcut',
        result: '89 local smoke gates, public safety audit and GitHub Actions green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: '7a4e768',
        label: 'Pinned transcript scroll guard',
        result: '89 local smoke gates, public safety audit and GitHub Actions green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: '51e8181',
        label: 'Primary composer send/stop handoff',
        result: '89 local smoke gates, public safety audit and GitHub Actions green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: '739a663',
        label: 'Open WebUI-style auto-growing composer',
        result: '89 local smoke gates, public safety audit and GitHub Actions green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: 'fd8162b',
        label: 'Selected local model installer handoff',
        result: '89 local smoke gates, public safety audit and GitHub Actions green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: '2500d59',
        label: 'Recommended model chat auto-start',
        result: '89 local smoke gates, public safety audit and GitHub Actions green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: '594be44',
        label: 'Multi WebGPU composer recommendations',
        result: 'Static quality gates and Pages deploy green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: 'acab3a2',
        label: 'Active chat critical-shell headroom recovery',
        result: '89 local smoke gates, public safety audit and GitHub Actions green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: '1ae6d07',
        label: 'Active route install handoff',
        result: 'Local smoke + GitHub Actions green'
      },
      {
        repo: 'inkognitroz.github.io',
        commit: 'e7aaf44',
        label: 'Empty-send automatic first chat',
        result: 'Local smoke + GitHub Actions green'
      },
      {
        repo: 'mmir-local-node',
        commit: '54fe834',
        label: 'macOS installer app bundle contract',
        result: 'Node tests, lint, secrets and release package green'
      }
    ],
    next_actions: [
      {
        id: 'D254-real-browser-qa',
        label: 'Verify first-chat flow in a real browser',
        estimate: '1-2h',
        status: 'next'
      },
      {
        id: 'D254-mac-device-qa',
        label: 'Run real-device Mac install and return proof',
        estimate: '2-4h',
        status: 'watch'
      },
      {
        id: 'D254-openwebui-polish',
        label: 'Tighten chat UI toward Open WebUI / ChatGPT smoothness',
        estimate: '2-6h',
        status: 'next'
      },
      {
        id: 'D255-D256-guardrails',
        label: 'Keep performance and DOM-safety gates green',
        estimate: 'ongoing',
        status: 'beta'
      }
    ],
    blockers: [
      {
        label: '100% claim needs real device/browser proof',
        status: 'watch',
        detail: 'Static and mock-local gates are green; true launch confidence needs live browser and installer QA.'
      },
      {
        label: 'No-spend policy blocks paid live cloud nodes',
        status: 'blocked',
        detail: 'No-spend mode stays active: free/local/browser routes can run now. Paid provider, GPU, SaaS and hosted model routes stay gated until cost approval.'
      }
    ],
    completion_rule: 'Call P0 complete only when first free chat, add/connect model, local node install return, active model selection, privacy boundaries, mobile layout and deploy checks are all green with real browser evidence.'
  };
}

const tasks = parseBacklog(readFileSync(backlogPath, 'utf8'));
const prioritizedNextIds = ['D254', 'D117', 'D116', 'D118', 'D119'];
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
  launch_progress: buildLaunchProgress(),
  activation_simulator: readActivationSimulator(),
  no_model_dead_end_report: readNoModelDeadEndReport(),
  no_model_public_deploy_verification: readNoModelPublicDeployVerification(),
  first_free_chat_response_report: readFirstFreeChatResponseReport(),
  composer_action_bar_report: readComposerActionBarReport(),
  composer_action_bar_visual_report: readComposerActionBarVisualReport(),
  composer_quick_actions_report: readComposerQuickActionsReport(),
  message_action_completeness_report: readMessageActionCompletenessReport(),
  message_action_visual_report: readMessageActionVisualReport(),
  message_action_browser_fixture_report: readMessageActionBrowserFixtureReport(),
  message_action_accessibility_report: readMessageActionAccessibilityReport(),
  conversation_handoff_report: readConversationHandoffReport(),
  saved_chat_memory_handoff_report: readSavedChatMemoryHandoffReport(),
  promoted_context_next_answer_report: readPromotedContextNextAnswerReport(),
  context_controls_report: readContextControlsReport(),
  answer_context_receipt_report: readAnswerContextReceiptReport(),
  answer_context_drilldown_report: readAnswerContextDrilldownReport(),
  answer_context_highlight_report: readAnswerContextHighlightReport(),
  answer_context_source_filter_report: readAnswerContextSourceFilterReport(),
  answer_context_filter_consumption_report: readAnswerContextFilterConsumptionReport(),
  answer_context_knowledge_source_report: readAnswerContextKnowledgeSourceReport(),
  answer_context_source_correction_report: readAnswerContextSourceCorrectionReport(),
  context_correction_audit_report: readContextCorrectionAuditReport(),
  context_correction_retry_report: readContextCorrectionRetryReport(),
  context_correction_suggestions_report: readContextCorrectionSuggestionsReport(),
  protected_context_correction_sync_report: readProtectedContextCorrectionSyncReport(),
  protected_correction_sync_ui_report: readProtectedCorrectionSyncUiReport(),
  protected_correction_review_queue_report: readProtectedCorrectionReviewQueueReport(),
  correction_remediation_plan_report: readCorrectionRemediationPlanReport(),
  correction_remediation_apply_gates_report: readCorrectionRemediationApplyGatesReport(),
  correction_remediation_adapters_report: readCorrectionRemediationAdaptersReport(),
  correction_remediation_commit_policy_report: readCorrectionRemediationCommitPolicyReport(),
  correction_remediation_execution_gates_report: readCorrectionRemediationExecutionGatesReport(),
  correction_remediation_rollback_gates_report: readCorrectionRemediationRollbackGatesReport(),
  correction_remediation_knowledge_source_model_report: readCorrectionRemediationKnowledgeSourceModelReport(),
  correction_remediation_knowledge_execution_gates_report: readCorrectionRemediationKnowledgeExecutionGatesReport(),
  correction_remediation_knowledge_rollback_gates_report: readCorrectionRemediationKnowledgeRollbackGatesReport(),
  correction_remediation_autopilot_queue_report: readCorrectionRemediationAutopilotQueueReport(),
  correction_remediation_autopilot_handoff_report: readCorrectionRemediationAutopilotHandoffReport(),
  correction_remediation_autopilot_rollback_readiness_report: readCorrectionRemediationAutopilotRollbackReadinessReport(),
  correction_remediation_autopilot_trust_timeline_report: readCorrectionRemediationAutopilotTrustTimelineReport(),
  correction_remediation_autopilot_trust_timeline_browser_fixture: readCorrectionRemediationAutopilotTrustTimelineBrowserFixture(),
  correction_remediation_autopilot_trust_timeline_browser_qa_report: readCorrectionRemediationAutopilotTrustTimelineBrowserQaReport(),
  correction_remediation_autopilot_timeline_receipts_report: readCorrectionRemediationAutopilotTimelineReceiptsReport(),
  correction_remediation_autopilot_timeline_receipts_browser_fixture: readCorrectionRemediationAutopilotTimelineReceiptsBrowserFixture(),
  correction_remediation_autopilot_timeline_receipts_browser_qa_report: readCorrectionRemediationAutopilotTimelineReceiptsBrowserQaReport(),
  cross_repo_architecture_security_review_report: readCrossRepoArchitectureSecurityReviewReport(),
  chat_first_free_activation_canary_report: readChatFirstFreeActivationCanaryReport(),
  domain_availability_watch: readDomainAvailabilityWatch(),
  repos: repoMeta,
  repo_decisions: repoDecisions,
  next_queue: prioritizedNextQueue,
  watchlist: tasks.filter((task) => task.status === 'watch' || task.status === 'blocked').map((task) => task.seq),
  tasks
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${join('public', 'progress-dashboard.json')} with ${tasks.length} tasks.`);
