# MMIR Agent Work Queue - 2026-05-23

MMIR is the orchestration layer for trusted AI. This queue exists so Codex, Copilot and other agents can work in parallel without crossing repo boundaries, duplicating work or starting paid infrastructure.

## Current North Star

Open `mmir.ai` -> Connect local AI -> Install once -> Pair/prove local node -> See local models -> Chat successfully.

Everything else is secondary until that journey is stable for a normal user.

## Active GitHub Jobs

| Priority | Repo | Issue | Purpose |
|---|---|---|---|
| P0 | `inkognitroz.github.io` | https://github.com/inkognitroz/inkognitroz.github.io/issues/156 | Cross-repo coordination board and repo boundaries |
| P0 | `inkognitroz.github.io` | https://github.com/inkognitroz/inkognitroz.github.io/issues/157 | D215 transcript actions and first-chat retention |
| P0 | `mmir-local-node` | https://github.com/inkognitroz/mmir-local-node/issues/29 | One-click local connector, pairing, model proof and first chat |
| P0 | `mimir-backend-template` | https://github.com/inkognitroz/mimir-backend-template/issues/29 | Canonical API contract, conformance tests and managed router skeleton |
| P0 | `Edge_LLM_Node-1` | https://github.com/inkognitroz/Edge_LLM_Node-1/issues/8 | Autonomous edge node conformance to MMIR node contract |
| P1 | `mimir-backend-template` | https://github.com/inkognitroz/mimir-backend-template/issues/30 | Future `mmir-contracts` repo decision after fixtures stabilize |
| P1 | `iac-autoprov` | https://github.com/inkognitroz/iac-autoprov/issues/11 | No-spend `api.mmir.ai` gateway dry-run and deployment boundary |
| P1 | `mmir-github-llm` | https://github.com/inkognitroz/mmir-github-llm/issues/5 | Contract-bound fallback provider with honest demo labeling |
| P3 hold | `iac-autoprov-aws` | https://github.com/inkognitroz/iac-autoprov-aws/issues/5 | AWS runtime templates wait until local MVP and gateway patterns are stable |

## Repo Boundaries

| Repo | Owns | Must not own |
|---|---|---|
| `inkognitroz.github.io` | Public static UI, onboarding, progress dashboard, public-safe docs and manifests | Secrets, provider keys, billing authority, private org/user data |
| `mmir-local-node` | Local connector, pairing, Ollama/local runtime adapter, model discovery, local chat | Public raw Ollama exposure, paid provider secrets |
| `mimir-backend-template` | First `api.mmir.ai`, managed router, auth/rate-limit/audit hooks, provider adapters | Static frontend UI, cloud provisioning implementation |
| `Edge_LLM_Node-1` | Independent/autonomous node implementation that conforms to MMIR node contract | Special-case frontend logic or anonymous public compute |
| `iac-autoprov` | Gateway/provisioning dry-runs, DNS/TLS/rate-limit/runbook boundaries | Product UI or unapproved production applies |
| `iac-autoprov-aws` | Later AWS templates and docs after local/OCI patterns stabilize | Any paid work before cost approval |
| `mmir-github-llm` | Demo/fallback adapter behind canonical contract | Fake-live primary product chat |

## Future Repo Decision

A separate `inkognitroz/mmir-contracts` repo is useful only after the contract has real implementation gravity.

Create/extract it when all are true:

- `mimir-backend-template` has passing conformance fixtures.
- `mmir-local-node` implements the same route shapes.
- `Edge_LLM_Node-1` can run the fixtures as an autonomous node.
- Versioning and CI are ready.

Until then, keep canonical implementation work in `mimir-backend-template` and public-safe docs/contracts in this public repo.

## Global Agent Rules

- No paid cloud resources, GPU jobs, provider calls or `terraform apply` without explicit cost approval.
- No secrets, provider keys, pairing tokens, billing data, raw prompts or raw responses in public files.
- One issue should normally produce one small PR.
- Every PR should state which user journey it protects.
- Every visible control must either work or clearly explain why it is gated.
- Keep live/beta/planned/premium labels truthful.

## Immediate Start Order

1. Frontend agent: take `inkognitroz.github.io#157` and complete D215 transcript actions/retention.
2. Local node agent: take `mmir-local-node#29` and make install -> pair -> model proof deterministic.
3. Backend agent: take `mimir-backend-template#29` and create conformance tests/router skeleton.
4. Edge node agent: take `Edge_LLM_Node-1#8` and align autonomous node routes.
5. Infra agent: take `iac-autoprov#11` only as no-spend dry-run/runbook work.

## Current Production Hotfix Baseline

Do not regress these live fixes:

- `runtime-controls-fix.js` must keep the first chat clickable without MutationObserver churn.
- `sw.js` must use the `mmir-pwa-d216-20260523-runtime-hotfix` cache and fetch app shell HTML/CSS/JS/JSON network-first.
- Mobile chat, static pages and user journey smoke checks must stay green.
