# MMIR Engineering Playbook

This playbook defines how MMIR work is split, reviewed and shipped. It is binding for the current MMIR launch work unless a later decision document replaces it.

## Operating Goal

Ship a real local-first AI chat loop before expanding the platform surface.

The first valuable user journey is:

1. Open `mmir.ai`.
2. Understand the promise quickly.
3. Connect a trusted local node or managed backend.
4. See health and model status.
5. Send a prompt.
6. Receive a response in the page.

## Source Of Truth

Execution order lives in `docs/MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md`.

Strategy docs may inform decisions, but implementation follows the `D001-D081` sequence. If scope changes, update the sequential backlog first, then update code.

## Product Principles

Every user-facing change must preserve these four qualities:

- Simple: one clear next action.
- Personal: grounded in the user's own models, chats, projects and preferences.
- Calm: advanced infrastructure stays behind progressive disclosure.
- Powerful: expert capability is available when the user asks for it.

## Repository Roles

| Repo | Role | Should own | Should not own |
|---|---|---|---|
| `inkognitroz.github.io` | Public web UI and docs | Static app shell, chat UI, backend profile UI, local-first onboarding, launch docs | Secrets, provider API keys, billing authority, team data |
| `mmir-local-node` | Private local connector | Local health, model discovery, Ollama adapter, pairing, local chat, hardware hints | Public inbound internet exposure, paid provider secrets |
| `mimir-backend-template` | First managed API implementation for `api.mmir.ai` | API contract, provider router, auth, rate limits, audit, secret vault integration | Frontend UI, cloud infrastructure provisioning |
| `mmir-github-llm` | Fallback/demo provider | Deterministic demo provider or GitHub model adapter behind backend | User-facing primary chat UX |
| `iac-autoprov` | OCI infrastructure | Gateway, runtime provisioning, TLS, policy-controlled deploys | Product UI or model prompts |
| `iac-autoprov-aws` | AWS infrastructure later | AWS runtime templates after OCI/local patterns stabilize | Early MVP blocker work |

No new repo is needed for the first MVP. `mimir-backend-template` is the first `api.mmir.ai` implementation until there is a concrete reason to split it.

## Parallel Workstreams

Work can be split without conflict like this:

| Stream | Owner type | Current scope | Primary dependencies |
|---|---|---|---|
| A - Frontend Core | UI/product engineer | `D003`, `D014-D018`, later `D019-D030` | API contract from Stream C |
| B - Local Node | Node/runtime engineer | `D009-D013` | Security baseline and API contract |
| C - Managed API | Backend engineer | `D005-D008`, `D031-D041` | Architecture and security baseline |
| D - Security/Ops | Security/platform engineer | `D004`, `D008`, `D036-D041` | All streams follow these controls |
| E - Product/Docs | Product engineer | Public truth pass, onboarding, backlog grooming | Implementation state from A/B/C |

A task may move forward when its upstream contract is stable, even if another stream is not finished.

## Definition Of Ready

A work item is ready when:

- It has one stable backlog ID.
- The target repo and files are named.
- Inputs and outputs are clear.
- Security expectations are explicit.
- Acceptance criteria are testable.
- It does not require hidden secrets or manual console state to develop locally.

## Definition Of Done

A work item is done when:

- Code or docs are merged to the target repo.
- Public UI does not claim more than actually works.
- Tests or a documented smoke check cover the changed behavior.
- Failure states are handled with a useful next action.
- Secrets are not added to frontend, logs or repository history.
- The relevant backlog line is updated or referenced from a follow-up issue.

## Architecture Practices

- Contract-first for API changes.
- Public frontend is static-safe and stores only non-sensitive metadata.
- Provider differences live behind backend or local-node adapters.
- Local mode must work without account or cloud prompt leakage.
- Managed mode must use auth, rate limits, audit logs and encrypted secrets.
- Cloud runtime work starts only after the local product loop works.

## Security Practices

- Default deny for origins, tokens, provider routes and infrastructure actions.
- Local node binds to `127.0.0.1` unless the user deliberately opts into a different host.
- Raw Ollama is never exposed publicly.
- Provider keys never enter public JavaScript or browser localStorage.
- Prompt logging is off by default.
- Error messages are useful but do not leak secrets, headers or stack traces.

## Code Review Checklist

Before merging, review:

- Does this preserve the first user journey?
- Does the UI distinguish live, beta, planned and premium planned?
- Are payloads aligned with `MMIR_API_CONTRACT_V0.md`?
- Does the change keep frontend/backend/local-node responsibilities separate?
- Are request size, timeout, CORS and auth decisions explicit?
- Can another contributor work on a neighboring stream without conflicting with this change?

## Branch And PR Practice

Use small, named branches when working locally or with multiple contributors:

- `frontend/d014-chat-transcript`
- `local-node/d009-harden-defaults`
- `api/d005-contract`
- `security/d008-gateway-plan`

One PR should normally close one backlog ID or one tightly coupled slice. Larger changes must include a checklist showing which backlog IDs are included.

## Testing Practice

Minimum expectations by repo:

| Repo | Minimum validation |
|---|---|
| `inkognitroz.github.io` | Static page loads, no console-breaking syntax, responsive smoke check, link/domain smoke check |
| `mmir-local-node` | Node tests for health/status/models/chat validation, local-only bind check, CORS check |
| `mimir-backend-template` | Node tests for contract payloads, provider adapter tests, auth/rate-limit tests when introduced |
| Infrastructure repos | Plan-only validation before apply, no unreviewed secrets, rollback note |

## Current Execution Rule

Start at `D001` and move downward. Do not start `D050+` infrastructure/platform work until `D014-D018` gives a real working local chat loop.
