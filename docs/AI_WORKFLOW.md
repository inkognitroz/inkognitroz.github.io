# AI Workflow

Use AI agents as structured engineering collaborators for MMIR, not as uncontrolled deployment authority.

For the full multi-agent operating model, roles, label taxonomy and handoff template, see `docs/AI_AGENT_OPERATING_MODEL.md`.

## Source Of Truth

Before creating new work, agents should inspect:

1. GitHub issues and pull requests across the MMIR repos.
2. `docs/MMIR_PRODUCT_DOCTRINE.md`.
3. `docs/MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md`.
4. `docs/MMIR_CONTROL_PLANE_BOUNDARY.md`.
5. `docs/MMIR_SECURITY_BASELINE.md`.
6. `public/user-journeys.json`.

## Default Agent Loop

1. Confirm the active MMIR goal and repository boundary.
2. Search existing issues/docs before proposing new work.
3. Claim the issue with role, lane, planned files and expected PR size.
4. Check active PRs for overlapping files before editing.
5. Prefer the first user journey when prioritizing: open, connect local AI, install, ready, chat.
6. Make small, testable changes.
7. Run smoke checks.
8. Commit through GitHub with clear evidence.
9. Update or create issues only when work remains or should be picked up by another agent.

## Review Standard

Every meaningful change should be reviewed for:

- architecture boundary correctness
- user journey continuity
- security and secret handling
- local-first behavior
- accessibility and mobile usability
- test/CI coverage
- cost safety
- maintainability

## Automation Rules

- Automate repeatable checks and safe fixes.
- Do not start paid resources without owner approval.
- Do not commit directly to `main` for agent work.
- Do not force-push, rewrite history, delete production resources, or run destructive infrastructure actions without explicit owner approval for that action.
- Do not put provider keys, GitHub tokens, billing secrets or long-lived credentials in public frontend files.
- Do not expose raw local model runtimes publicly.
- Keep paid/cloud/provider paths disabled until protected backend policy exists.
