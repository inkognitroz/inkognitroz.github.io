# START HERE

Welcome to the MMIR public web repo.

MMIR is the trusted AI operating layer for orchestration across local, self-hosted and future managed AI systems. This repo is the public static app at `mmir.ai` and `inkognitroz.github.io`.

## What To Work On First

1. Open `docs/MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md`.
2. Find the first task marked `next` in `public/progress-dashboard.json`.
3. Keep the implementation free-first, local-first and public-safe.
4. Update code, docs and generated manifests together.
5. Run the smoke checks before commit.

## In-Scope Repos

- `inkognitroz.github.io`: public MMIR.ai frontend, chat UI, dashboards and static manifests.
- `mmir-local-node`: private local connector for Ollama/local runtimes, pairing and localhost chat.
- `mimir-backend-template`: protected backend template for managed routing, memory, knowledge, workflows and policy.

## Local User Path

The first visit should work without asking the user to configure anything:

1. The browser opens MMIR and prepares a free local-node profile automatically.
2. The chat selector shows the MMIR Guide and free browser/installable model options.
3. If MMIR Local Node is running, the frontend pairs and selects live backend models automatically.
4. The user can type a message, choose a starter prompt or install a local model.

## Required Checks

```bash
node scripts/build-progress-dashboard.js
node scripts/smoke-check-pages.js
node scripts/smoke-check-ui-actions.js
node scripts/smoke-check-user-journeys.js
```

## Security Rules

- This repo is public. No secrets.
- Provider keys never go in public HTML, JavaScript, JSON or browser localStorage.
- Paid/provider/cloud routes stay blocked until protected identity, vault, rate limit, audit and cost policy exist.
- Local node defaults to `127.0.0.1:3000` and protected routes require pairing.
