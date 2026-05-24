# MMIR AI Agent Operating Model

This document defines how Codex, ChatGPT 5.5, GitHub Copilot and other coding agents work on MMIR without blocking each other or drifting away from the product strategy.

## North Star

MMIR is the orchestration layer for trusted AI.

The first product proof remains:

1. Open `mmir.ai`.
2. Connect local AI.
3. Install the local connector.
4. See available local models.
5. Chat successfully.

Agents must protect this journey before expanding marketplace, billing, training, mesh compute or enterprise features.

## Agent Roles

| Role | Best model/tool | Owns | Must produce |
|---|---|---|---|
| Product strategist | ChatGPT 5.5 | Goals, user journey, monetization, roadmap order | Issue priorities, acceptance criteria, revenue/user impact |
| Solution architect | ChatGPT 5.5 / Codex | C4 diagrams, repo boundaries, API contracts, ADRs | Architecture notes, contract decisions, tradeoffs |
| Frontend agent | Codex / Copilot | `inkognitroz.github.io` public UI, mobile UX, first-click chat | Small PR with smoke checks |
| Backend agent | Codex | `mimir-backend-template`, `api.mmir.ai`, auth/policy/routing | API tests, route docs, no-secret implementation |
| Local-node agent | Codex | `mmir-local-node`, installer, pairing, Ollama/model discovery | Local tests, install proof, node conformance |
| Security agent | ChatGPT 5.5 / Codex | threat model, zero trust, secret boundaries, OWASP ASVS checks | security review notes, blocking findings, mitigations |
| QA/release agent | Codex / Copilot | smoke tests, regression gates, deploy verification | test evidence, rollback note, live verification |
| Documentation agent | ChatGPT 5.5 / Codex | user docs, agent handoff docs, runbooks | concise docs tied to working behavior |

## Repository Ownership

| Repository | Primary lane | Owns | Must not own |
|---|---|---|---|
| `inkognitroz.github.io` | Frontend/product | static UI, PWA shell, onboarding, public docs, smoke checks | secrets, provider keys, billing authority, raw local runtimes |
| `mimir-backend-template` | Backend/control plane | API gateway, auth, policy, rate limits, routing, audit, provider adapters | frontend product UI, infrastructure provisioning |
| `mmir-local-node` | Runtime bridge | one-click install, pairing, local health, model discovery, Ollama/local chat | public raw Ollama exposure, paid provider secrets |
| `mmir-github-llm` | Adapter/demo | fallback/demo adapter behind contracts | primary user-facing chat UX |
| `iac-autoprov` | Infrastructure | no-spend plans, DNS/TLS/gateway runbooks, deploy boundaries | product UI, unapproved paid applies |
| `iac-autoprov-aws` | Later infrastructure | AWS templates after local MVP | early MVP blockers or paid resources |

## Work Intake

Every agent starts by checking:

1. Existing issues and open PRs in the target repo.
2. `AGENTS.md`.
3. `docs/AI_WORKFLOW.md`.
4. `docs/MMIR_ENGINEERING_PLAYBOOK.md`.
5. `docs/MMIR_SECURITY_BASELINE.md`.
6. Relevant contract docs such as `docs/MMIR_API_CONTRACT_V0.md` and `docs/MMIR_NODE_CONNECTOR_CONTRACT.md`.

Do not create duplicate issues. If a matching issue exists, comment or open a PR against that issue.

## Coordination And Claiming

Before editing, an agent must claim the issue or PR in a comment:

```md
Claiming this as <role>.
Repo/lane:
Planned files:
Expected PR size:
```

If another active issue or PR touches the same files, coordinate in that thread before editing. If the work overlaps heavily, split the task or continue the existing branch instead of opening a competing PR.

Do not hold a claim without progress. If an agent pauses, it should leave a handoff comment with current state, changed files, tests run and next action.

## Issue Format

Every agent-ready issue should include:

- Priority: `P0`, `P1`, `P2`, or `P3`.
- Lane: `frontend`, `backend`, `local-node`, `security`, `qa`, `docs`, `infra`.
- Target repo and likely files.
- User journey protected.
- Acceptance criteria.
- Non-goals.
- Required tests.
- Cost and secret statement.
- Suggested agent role.
- Rollback or failure behavior.
- Active claim / owner comment when work starts.

## Branch And PR Rules

Use small branches:

- `frontend/p0-mobile-chat`
- `backend/p0-node-registration`
- `local-node/p0-mac-installer`
- `security/p1-auth-hardening`
- `docs/p1-agent-model`

One PR should normally close one issue or one tightly coupled slice. Avoid broad refactors unless the issue is explicitly a refactor.

Do not commit directly to `main` or production branches for agent work. Do not force-push, rewrite history, delete production resources, delete large file trees, rename broad modules, or run destructive infrastructure actions unless the task explicitly requires it and the owner has approved that exact action.

Every PR must link the issue, name the lane, list the main files touched, and say which active PRs/issues were checked for overlap.

## Contract Change Rules

API and connector contracts are shared boundaries. Contract changes must be sequenced deliberately:

1. Update the relevant contract doc first.
2. Add or update backend/local-node contract tests.
3. Update the producer implementation.
4. Update frontend consumers only after the contract is stable or feature-gated.

The solution architect owns contract shape. Backend owns API enforcement. Local-node owns runtime conformance. Frontend owns graceful failure states and user journey continuity.

## Definition Of Ready

A task is ready for an autonomous coding agent when:

- The repo boundary is clear.
- The expected behavior is testable.
- It can be completed without hidden credentials.
- It does not require paid compute/provider usage.
- The agent can name the files it expects to touch.
- Rollback or failure behavior is defined.
- The issue has no unresolved overlap with another active PR.

## Definition Of Done

A task is done when:

- The PR is merged or ready for review with clear evidence.
- Tests/smoke checks are listed.
- User-facing copy is truthful: live, beta, planned and premium planned are not mixed.
- No secrets, provider keys, billing data, raw prompts or raw responses are committed.
- Failure states guide the user to the next action.
- The issue is updated or follow-up issues are created.

## Coding Standards For Agents

- Prefer existing code patterns over new abstractions.
- Keep frontend logic for UI orchestration only; do not move provider secrets or runtime ownership into public JS.
- Backend owns auth, policy, provider abstraction, rate limits, audit and workflow orchestration.
- Local node owns local runtime bridging, local health and local model control.
- Use contract-first changes for API routes.
- Add tests proportional to risk.
- Do not hide broken behavior behind optimistic copy.

## Security And Cost Rules

- No paid cloud resources, GPU jobs, hosted providers or `terraform apply` without explicit cost approval.
- No long-lived secrets in frontend, docs, logs, localStorage or public repository history.
- Public frontend may store only non-sensitive profile metadata.
- Local node binds to `127.0.0.1` by default.
- Raw Ollama/local runtimes must not be exposed publicly.
- Every new public route must fail closed when auth/policy is not configured.

## Recommended Agent Cadence

1. Product strategist maintains the ranked issue backlog.
2. Architect keeps repo boundaries and contracts current.
3. Frontend, backend and local-node agents take disjoint P0 issues.
4. Security agent reviews auth, secrets, CORS, rate limits and cost guards.
5. QA/release agent verifies mobile, API, install and rollback paths.
6. A status comment is posted after each merged PR with what changed, tests and next issue.

## Status Report Template

```md
## Agent Status

Repo:
Issue/PR:
Role:
User journey protected:

Changed:
Tests:
Security/cost impact:
Blockers:
Next recommended issue:
```

## Recommended Labels

- Priority: `P0`, `P1`, `P2`, `P3`
- Lane: `lane/frontend`, `lane/backend`, `lane/local-node`, `lane/security`, `lane/qa`, `lane/docs`, `lane/infra`
- Type: `type/bug`, `type/feature`, `type/refactor`, `type/test`, `type/docs`, `type/architecture`
- State: `state/ready-for-agent`, `state/blocked`, `state/needs-review`, `state/live-verified`
- Risk: `risk/security`, `risk/mobile`, `risk/cost`, `risk/performance`, `risk/contracts`

## ChatGPT 5.5 Usage

Use ChatGPT 5.5 for high-context work:

- architecture review
- security review
- strategy and monetization choices
- large code review and risk analysis
- API contract design
- splitting ambiguous backlog into agent-sized issues

Use Codex/Copilot for bounded implementation:

- targeted code edits
- tests and smoke checks
- PRs against specific issues
- docs/runbook updates tied to implemented behavior

Do not use a high-reasoning agent to make unbounded changes directly on production-critical files without a small issue and test plan.
