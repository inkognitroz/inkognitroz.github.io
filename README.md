# MMIR.ai Public App

Public frontend for MMIR, the trusted AI operating layer focused on AI orchestration.

MMIR connects browser guidance, local models, self-hosted runtimes and future protected managed providers into one calm control surface. The public site must be useful immediately, stay free-first by default and never expose secrets.

## Current Product Shape

- First-screen chat with free browser guide responses.
- Automatic local-node profile for `http://127.0.0.1:3000`.
- Live model discovery when MMIR Local Node is running.
- Free browser/WebGPU and installable Ollama starter model choices.
- Local-first workspaces, memory, knowledge, privacy controls and prompt registry.
- Model roles, comparison and synthesis beta flows.
- Workflow, dataset and training-planning beta panels.
- Platform status, user journey and progress dashboards.
- Raspberry Pi/Linux ARM, Mac, Windows and Linux local connector install paths.

## Repository Role

This repo is intentionally public and GitHub Pages-compatible.

- Static app source lives in `public/`.
- Product and architecture docs live in `docs/`.
- CI deploys `public/` to GitHub Pages.
- Public manifests describe only safe metadata, status and copy.

Secrets, provider keys, billing rules, private user data, managed routing policy and real auth belong in protected backend or local connector repos, not here.

## Important Files

- `public/index.html`: main MMIR app shell.
- `public/apps/mimir-chat-portal/`: chat, model, connector, workflow and dashboard UI.
- `public/free-model-starters.json`: free browser and installable local starter models.
- `public/ai-model-catalog.json`: public-safe model catalog metadata.
- `public/user-journeys.json`: user journey contract.
- `public/progress-dashboard.json`: generated sequential backlog dashboard.
- `public/ui-action-coverage.json`: visible-control coverage contract.
- `docs/MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md`: ordered source of truth for what to build next.
- `docs/MMIR_API_CONTRACT_V0.md`: frontend/backend/local-node contract.

## Development

Regenerate the progress dashboard after backlog/status changes:

```bash
node scripts/build-progress-dashboard.js
```

Run static quality gates:

```bash
node scripts/smoke-check-pages.js
node scripts/smoke-check-ui-actions.js
node scripts/smoke-check-user-journeys.js
```

## Deployment

GitHub Actions publishes `public/` through GitHub Pages. The site must remain static-host compatible; any secret-bearing or paid/provider-backed behavior must be routed through protected services outside this repo.

## Security Posture

- Free-first and local-first.
- Zero-trust separation between frontend, local node, managed backend, providers and infrastructure.
- No public secrets.
- No hidden paid execution.
- Truthful live, beta, planned, premium planned and blocked labels.
- Local node stays on localhost by default and pairs before protected routes.
