# AI Workflow

Use AI agents as structured engineering collaborators for MMIR, not as uncontrolled deployment authority.

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
3. Prefer the first user journey when prioritizing: open, connect local AI, install, ready, chat.
4. Make small, testable changes.
5. Run smoke checks.
6. Commit through GitHub with clear evidence.
7. Update or create issues only when work remains or should be picked up by another agent.

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
- Do not put provider keys, GitHub tokens, billing secrets or long-lived credentials in public frontend files.
- Do not expose raw local model runtimes publicly.
- Keep paid/cloud/provider paths disabled until protected backend policy exists.
