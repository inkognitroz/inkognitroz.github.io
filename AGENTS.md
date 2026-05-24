# AGENTS

Use this repository as the public MMIR.ai product surface.

## Active Product Identity

MMIR is the active product. It is the orchestration layer for trusted AI.

Do not reintroduce the retired app-factory concept into public copy, onboarding, docs, roadmaps or agent instructions.

## Priorities

1. First user journey: open `mmir.ai`, connect local AI, install, ready, chat.
2. Public frontend safety: no secrets, no provider keys, no paid authority, no raw runtime exposure.
3. Local-first model routing through MMIR Local Node.
4. Backend control-plane contracts for auth, policy, routing, audit and future billing.
5. Clear user experience on mobile and desktop.

## Guardrails

- Keep GitHub Pages compatibility.
- Publish from `/public` only.
- Keep public assets static and safe.
- Never commit secrets.
- Do not start paid compute or provider usage without explicit owner approval.
- Search existing issues/docs before creating duplicate work.
- Run smoke checks before publishing.
- Use `docs/AI_AGENT_OPERATING_MODEL.md` for multi-agent roles, issue format, PR sizing and handoff rules.
- Keep every agent task tied to one user journey, one repo boundary and one testable acceptance result.
- Prefer small PRs that another agent can review or continue without reconstructing the whole thread.

```bash
node scripts/ensure-mmir-public-branding.js --check
node scripts/smoke-check-pages.js
node scripts/smoke-check-user-journeys.js
node scripts/smoke-check-ui-actions.js
```
