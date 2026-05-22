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
- Managed backend now fails closed into API-key auth when a non-mock managed provider is selected, unless anonymous managed-provider mode is explicitly enabled for local demo use.
- Backend and local-node CI now use Node 24, newer setup/checkout actions, lockfiles, `npm ci`, lint, secret scanning and tests.
- MMIR Local Node now uses idle-timeout behavior for streaming Ollama responses so long generations are not cut off while tokens are still flowing.
- Docs now describe frontend/local/managed boundaries, security posture, environment contract, key management and local install path.
- Review-discovered launch hardening items `D082-D093` were added to the delivery backlog.

## Still Next In Sequence

- D082: verify `https://mmir.ai/` from an off-network connection and allowlist/communicate around newly registered domain filtering where needed.
- D093: shared frontend API client.
- D046-D050: vector store foundations, durable backend knowledge sync and project memory governance.
- D051-D060: workflow builder, automation and AI routing.
- D061-D081: platform, marketplace, enterprise controls and compute mesh foundations.

## Notes

This log complements `docs/MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md`; the backlog remains the ordered source of truth.
