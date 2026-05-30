# MMIR Structured Backlog

This file is the cross-repository working backlog for MMIR. GitHub issues and PRs remain the execution source of truth, but this document keeps the product, architecture, security and automation priorities aligned across repos and ChatGPT/Copilot workstreams.

Last reviewed: 2026-05-30

## Product North Star

MMIR is a trusted multi-model AI control plane where users can chat instantly, connect local/private AI, add cloud/SaaS providers, orchestrate workflows, and later use memory, RAG, training and distributed intelligence through one secure interface.

## Operating Principles

- Frontend is public and must not contain secrets.
- `mmir.ai` must provide immediate value before users connect a backend.
- Local AI is an upgrade path for privacy, control and stronger models.
- Raw Ollama port `11434` must never be exposed publicly.
- Local Node must default to localhost-only.
- Public/cloud routes must go through `api.mmir.ai` or another controlled backend/router.
- Provider routes must fail closed unless credentials, policy and explicit approval exist.
- GitHub issues/PRs are the operational source of truth.
- Work must be PR-first, small, testable and reversible.
- No hidden paid calls, billing, wallets or external spend without explicit owner approval.

## Current Architecture

```text
Browser/user
→ https://mmir.ai
→ Cloudflare/DNS/HTTPS
→ GitHub Pages static frontend
→ api.mmir.ai gateway / fallback route
→ provider router / node registry
→ local nodes, hosted starter nodes, cloud nodes, SaaS providers
```

Local path:

```text
mmir.ai frontend
→ MMIR Local Node on 127.0.0.1
→ Ollama on 127.0.0.1:11434
→ local model
```

## P0 — First Real Product

Goal: a new user opens `mmir.ai` and receives value immediately, then can connect local AI without coding.

### P0.1 Instant Chat

Status: Partly built.

Required outcome:

```text
Open mmir.ai
→ type a prompt
→ receive an honest free/demo/starter response
→ no install required
→ no backend setup required
```

Implementation direction:

- Use `api.mmir.ai` as the public gateway.
- Keep `mmir-github-llm` as deterministic fallback / guidance mode, not a fake primary LLM.
- Add a no-cost starter route when a safe hosted/runtime option is confirmed.
- Expose route metadata clearly: provider, capability, cost policy, whether a real provider was called.
- Frontend must gracefully label fallback/demo responses.

Relevant PRs/issues:

- `mmir-github-llm#24` API gateway contract skeleton
- `mmir-github-llm#25` free starter node route
- `mmir-github-llm#23` contract-bound fallback provider
- `mmir-github-llm#27` Cloudflare Worker deployment credentials

### P0.2 Local Node User Journey

Status: Backend/local runtime is advanced; full frontend integration still needs verification/completion.

Required outcome:

```text
Open mmir.ai
→ Connect local AI
→ install/start local node
→ pair
→ see hardware/model status
→ pull/select model
→ chat inside MMIR UI
```

Required work:

- Verify current installer artifacts and release manifest.
- Make frontend local-node detection reliable.
- Use pairing token for protected routes.
- Show hardware: CPU/RAM/device class/recommended model.
- Show model inventory and pull status.
- Send prompt to `/chat/completions`.
- Support non-streaming first; streaming after stable.
- Render result inside MMIR UI.

Relevant issues:

- `mmir-local-node#35` self-contained one-click installers and release manifest
- `mmir-local-node#34` registration and heartbeat to `api.mmir.ai`
- `mmir-local-node#33` pairing and public tunnel boundary

### P0.3 Control Plane Node Registration

Status: In progress.

Required outcome:

```text
Local/hosted node starts
→ registers with api.mmir.ai
→ receives/reuses node_ref
→ sends heartbeat
→ models become route-aware
→ stale nodes are not executed
```

Relevant issues/PRs:

- `mimir-backend-template#33` fail-closed auth
- `mimir-backend-template#34` zero-trust `/nodes/register`
- `mimir-backend-template#35` node-aware `/models` and `/chat/completions`
- `mimir-backend-template#36` persistent node registry
- `mimir-backend-template#41` node token auth primitive
- `mimir-backend-template#42` idempotent `node_ref`

### P0.4 Live Site Correctness

Status: Needs operational verification.

Required outcome:

- Live `mmir.ai` serves latest JS/CSS.
- Cloudflare cache does not serve stale critical frontend files.
- Mobile first-click journey works.
- Public safety audit passes.

Relevant issues/PRs:

- `inkognitroz.github.io#162` purge Cloudflare cache after mobile button hotfix
- `inkognitroz.github.io#164` mobile first-click fixes
- `inkognitroz.github.io#167` public safety audit gate

## P1 — Stabilization and Governance

### P1.1 Canonical API Contracts

- OpenAPI/JSON schema or typed contract package.
- Shared contract fixtures for frontend, backend and local node.
- CI fails on contract drift.

Relevant issue:

- `mimir-backend-template#38`

### P1.2 Observability Without Data Leakage

- Per-route latency/status.
- Node availability.
- Routing decisions.
- Sanitized audit events.
- No prompts, completions, secrets or bearer tokens in logs.

Relevant issue:

- `mimir-backend-template#37`

### P1.3 Frontend Architecture Cleanup

- Remove structural shims as permanent architecture.
- Split runtime-control hotfixes into owned modules.
- Add rendered mobile regression tests.

Relevant issues:

- `inkognitroz.github.io#165`
- `inkognitroz.github.io#166`

## P2 — Product Expansion

- Multi-model compare.
- Answer synthesis.
- Role-based AI teams.
- Workflow builder.
- Prompt/workflow registry.
- Project memory.
- Knowledge upload / RAG.
- GitHub/docs ingestion.

Relevant open WIP examples:

- `mmir-github-llm#20` AI team workflows
- `mmir-github-llm#21` memory schema

## P3 — Platform Runtime Expansion

- Provider adapter registry.
- Free/free-tier provider discovery with strict cost guard.
- Hosted starter node(s).
- OCI/AWS runtime after P0 is stable.
- Terraform automation and smoke checks.
- Cost controls before any paid route.

Relevant open WIP examples:

- `mmir-github-llm#22` free/free-tier provider discovery registry

## P4 — Intelligence Well / Distributed Compute

Future only until P0–P3 are stable.

- Trusted node registration.
- Node attestation/trust levels.
- Edge compute mesh.
- Contribution accounting.
- Abuse/fraud protection.
- Legal/compliance review before credits, wallet or exchange-like concepts.

## Repo Responsibility Matrix

| Repo | Primary responsibility | Current priority |
| --- | --- | --- |
| `inkognitroz/inkognitroz.github.io` | Public frontend/control plane UX | P0 live site + local/instant chat UX |
| `inkognitroz/mmir-local-node` | Local runtime connector for Ollama/local models | P0 installer + pairing + node registration |
| `inkognitroz/mimir-backend-template` | API gateway/router/node registry/provider policy | P0 auth + registration + node-aware routing |
| `inkognitroz/mmir-github-llm` | Deterministic fallback, provider discovery, gateway scaffolding | P0 instant chat/fallback route |
| `inkognitroz/iac-autoprov` | OCI backend runtime automation | P3 after P0 stable |
| `inkognitroz/iac-autoprov-aws` | AWS backend runtime automation | P3 after P0 stable |

## Workstream Rules

1. Always inspect existing code before adding new architecture.
2. Prefer completing/closing existing PRs over opening new overlapping ones.
3. Label work by priority and area: `P0`, `P1`, `frontend`, `api`, `local-node`, `security`, `deploy`, `docs`.
4. Each PR must explain:
   - what changed
   - why
   - security impact
   - tests/smoke checks
   - remaining work
5. Do not merge WIP PRs without a clear acceptance checklist.
6. Close or supersede stale WIP PRs once their work has landed elsewhere.

## Next Execution Order

1. Verify/deploy latest `api.mmir.ai` Worker and close deployment blocker if live status matches expected version.
2. Complete/verify instant chat fallback route.
3. Complete frontend integration to gateway for first prompt.
4. Complete local-node registration/heartbeat path.
5. Make `/models` and `/chat/completions` node-aware.
6. Verify live `mmir.ai` cache and mobile first-click journey.
7. Then move to P1 contract/observability cleanup.
