# MMIR Implementation Log

Updated: 2026-05-22

## Completed This Pass

- Frontend has a real in-page chat runtime wired to active backend profiles.
- Chat history persists locally in the browser until the user clears it.
- Chat history is now scoped by local workspace so separate projects do not overwrite each other.
- Workspace creation now uses an inline accessible form instead of a browser prompt.
- Workspace memory can now store local project facts/preferences and inject them into chat/comparison context when relevant.
- Local knowledge upload now stores text-like files per workspace and injects relevant snippets into chat context as a first RAG foundation.
- Privacy/local data controls now let users inspect counts, export, copy and delete workspace chat, memory and knowledge stored in the browser.
- Chat requests use the shared `/chat/completions` contract with `/chat` fallback.
- Frontend prefers Server-Sent Events streaming and falls back to JSON when needed.
- Chat supports Stop, Copy, Retry, Clear and safe code-block rendering without trusting model HTML.
- Runtime accessibility is stronger: live status, busy state, keyboard focus states, mobile-safe controls and clearer button labels.
- First-run onboarding now tracks profile setup, active backend, live model discovery and first prompt completion per workspace.
- Role presets are selectable and are sent into chat as system context for Architect, Security reviewer, Coder, Critic, Researcher and Synthesizer modes.
- Selected chat model now persists locally and the UI records live model options for comparison workflows.
- Live model comparison panel can send the same prompt to up to three live models through the active backend and render results safely.
- Synthesis flow can combine at least two usable model responses into one synthesized answer through the same protected backend route.
- Live model comparison and synthesis now inject the same relevant workspace knowledge context as normal chat.
- GitHub Pages workflow now opts into Node 24 actions and uses newer checkout/upload-pages actions to reduce upcoming runner deprecation risk.
- GitHub Pages deployment now runs a static smoke check for missing referenced assets, invalid JSON and invalid public JavaScript syntax before uploading the artifact.
- Live-site diagnostics show `inkognitroz.github.io` redirecting to `https://mmir.ai/`; the observed `503` body in this environment is a network URL-filter block for a newly registered domain, not an MMIR app response.
- Public UI now includes a `Platform Status` panel that separates static site, GitHub Pages origin, domain reputation, managed API and active backend/local-node health.
- Frontend chat, model comparison and platform status now share one browser API client for profiles, URL handling, pairing, JSON requests, auth headers and user-safe error messages.
- Local backend profile defaults to MMIR Local Node at `http://127.0.0.1:3000`.
- Live model/health data syncs back into saved backend profile metadata.
- MMIR Local Node is hardened around localhost defaults, explicit CORS, pairing, request limits and safe errors.
- MMIR Local Node reports Ollama readiness, hardware profile, starter model recommendations and normalized model inventory.
- MMIR Local Node streams Ollama chat over SSE.
- Managed backend template has API-key auth policy, rate limits, metrics and SSE streaming support.
- Managed backend now includes an OpenAI-compatible provider adapter for server-side provider routing.
- Managed backend now exposes sanitized bounded `/audit` events without raw prompts or provider secrets.
- Managed backend now preserves safe provider HTTP status codes such as `503`/`429` and audits provider failures without leaking prompts.
- Managed backend now has protected knowledge document and search endpoints as the first server-side RAG contract.
- Managed backend knowledge now chunks extracted documents into an in-process lexical retrieval index with type validation, source metadata, chunk IDs and metadata-only list responses.
- Frontend knowledge upload remains local-first/free, but syncs extracted text to the active protected backend when `/knowledge/documents` is available.
- Chat context now retrieves relevant protected backend knowledge through `/knowledge/search` before sending a prompt, while retaining local-only fallback behavior.
- Managed backend now has a protected prompt registry with workspace-scoped prompt create/list/read/delete and bounded version history.
- Frontend now has a prompt registry panel that can save prompts to the active backend, load them into chat and create new prompt versions.
- Managed backend now has protected workspace memory routes for create/list/search/update/disable/delete with ownership isolation and audit events that omit raw memory text.
- Frontend memory is now inspectable, editable, enable/disable-capable and local-first, with optional sync to the active backend and relevant backend memory injection into chat/comparison context.
- Managed backend now fails closed into API-key auth when a non-mock managed provider is selected, unless anonymous managed-provider mode is explicitly enabled for local demo use.
- Managed backend now has a protected node registry for registering, listing, heartbeat-updating and deleting owned compute nodes.
- Node heartbeat now carries public-safe health metadata: latency, runtime version, model inventory count and bounded health history.
- Managed backend now exposes a protected scheduler candidate endpoint that filters owned online nodes by trust, required capabilities, latency policy and GPU/resource signals without executing workloads.
- MMIR Local Node now exposes public-safe node identity metadata for future managed registration.
- Secure outbound tunnel rules are now documented for backend and local-node, with explicit no-inbound-port, short-lived-token and no-frontend-secret boundaries.
- OCI runtime proxy now exposes the same MMIR-compatible `/status`, `/models`, `/chat/completions` and `/chat` contract as the managed backend, with protected routes, safe errors, locked CORS defaults and non-root Docker runtime.
- AWS runtime repo now has a plan/validate-first Terraform template, MMIR-compatible Ollama proxy, SSM-based API key retrieval, GitHub Actions validation and an explicit no-auto-apply safety model.
- Self-healing runtime foundations now exist: managed backend exposes protected recovery action recommendations, and OCI/AWS runbooks define bounded health probe, restart and failover operator steps.
- AI routing v1 now exists as a protected explainable decision endpoint that selects owned node, managed provider or no route based on policy, node eligibility, provider status and model availability.
- Cost-aware routing policy now blocks paid or unknown managed providers unless explicitly allowed and keeps estimated provider cost inside user policy limits.
- Dynamic compute scaling v1 now exists as a protected planning endpoint that chooses existing capacity, failover, deferred scaling or approval-required provisioning without starting cloud resources automatically.
- Workflow object model v1 now exists in the managed backend with protected workflow create/list/get/delete routes and planned run records for bounded linear workflows.
- Frontend now has a workflow builder MVP that can define linear steps, save workflows to the active backend, list saved workflows and request planned runs.
- Workflow automation trigger definitions now exist in the managed backend for visible and revocable manual, schedule and event triggers.
- Bounded workflow agents now exist end to end at the planning layer: backend workflows can store role-scoped agents, planned runs expose agent tasks, and the frontend builder can define agents and bind steps to them.
- Frontend workflow builder now has a visual canvas MVP that reflects the same workflow model and can reorder or insert real workflow steps.
- Evaluation framework v1 now exists in the managed backend with protected datasets, planned/scored evaluation runs, per-target summaries and sanitized audit records.
- Model/provider/adapter registry v1 now exists in the managed backend, and the frontend model catalog can merge active backend registry models with the static public-safe catalog.
- Backend and local-node CI now use Node 24, newer setup/checkout actions, lockfiles, `npm ci`, lint, secret scanning and tests.
- MMIR Local Node now uses idle-timeout behavior for streaming Ollama responses so long generations are not cut off while tokens are still flowing.
- Docs now describe frontend/local/managed boundaries, security posture, environment contract, key management and local install path.
- Review-discovered launch hardening items `D082-D093` were added to the delivery backlog.

## Still Next In Sequence

- D082: verify `https://mmir.ai/` from an off-network connection and allowlist/communicate around newly registered domain filtering where needed.
- D048-D049: GitHub and external docs ingestion connectors with explicit consent.
- D067-D081: platform, marketplace, enterprise controls and compute mesh foundations after stronger product validation.

## Notes

This log complements `docs/MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md`; the backlog remains the ordered source of truth.
