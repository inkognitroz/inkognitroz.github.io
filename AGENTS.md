# AGENTS

Use this repository as the public MMIR website and chat UI.

## Product Identity

MMIR is the orchestration layer for trusted AI. The public first screen must let a visitor chat immediately with `MMIR Supergenius`, then optionally connect local/private nodes.

## This Repo Owns

- public `mmir.ai` static website assets
- chat composer and first-click UX
- public-safe model/node/shield/send controls
- public-safe onboarding copy and download links
- browser smoke checks and static site quality gates

## This Repo Does Not Own

- private roadmap, internal security notes or agent control strategy
- provider secrets, paid routes, billing or marketplace claims
- backend route authority or local-node runtime internals
- Terraform, Cloudflare account settings or DNS changes

## Coordination

- Source of truth for active lanes lives in private `mmir-project-control`.
- Public-safe rule summary: if a PR/issue has `agent-parked`, do not continue it unless control promotes it.
- If another agent is editing chat runtime/composer files, stop and leave a handoff instead of pushing competing changes.
- Canonical label is `MMIR Supergenius`. `Supergenious` is a typo/regression.

## Required Handoff

Every issue or PR handoff must include:

```text
Agent:
Lane: frontend
Status:
Scope:
Files touched:
Evidence:
Do not overlap:
Next action:
```

## Verification

Run the narrowest checks that cover the change. For chat/composer work, default to:

```bash
node scripts/smoke-check-public-shell.js
node scripts/smoke-check-launch-slice-a-dom.js
node scripts/smoke-check-local-chat-send-probe.js
node scripts/smoke-check-browser-node-ui.js
```

User-visible changes must be checked on mobile and desktop when layout may shift.
