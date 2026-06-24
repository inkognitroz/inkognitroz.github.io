# inkognitroz.github.io

Public home of **MMIR.ai**.

## Purpose

This repository publishes the static, public MMIR.ai website through GitHub Pages.

The public surface is intentionally narrow:

- public product pages
- public install and local connector entrypoints
- public-safe model, provider and status manifests
- public-safe frontend code for the first MMIR user journey

Private roadmap, security detail, architecture notes, agent instructions, internal QA reports, implementation logs and work queues belong in the private `mmir-project-control` repository, not here.

## First User Journey

```text
Open mmir.ai
-> Connect local AI
-> Install MMIR Local Node
-> See local models
-> Chat through the safest available MMIR route
```

## Local Checks

```bash
node scripts/check-public-boundary.js
node scripts/public-safety-audit.js
node scripts/ensure-mmir-public-branding.js --check
node scripts/smoke-check-public-shell.js
```

## Actions-free Preview

When GitHub Actions minutes are exhausted, use the Wrangler preview lane instead of dispatching workflows:

- [ACTIONS_FREE_WEB_PREVIEW_DEPLOY.md](ACTIONS_FREE_WEB_PREVIEW_DEPLOY.md)

This deploys only to the separate `workers.dev` preview Worker. It does not update `mmir.ai`, bind a custom domain, change DNS or enable paid providers.

## Public Boundary

Do not add these to this repository:

- secrets, tokens, keys or real credentials
- internal roadmap or work queues
- private agent operating instructions
- detailed threat models, vulnerabilities or mitigation queues
- internal implementation logs or QA reports
- public admin/internal tools
- provider billing authority or paid-route enablement

GitHub Pages publishes only `public/`, but this repository is also publicly readable. Treat every source file here as public.

## Structure

- `public/index.html` - public root redirect/fallback
- `public/mmir.html` - main MMIR product experience
- `public/apps/mimir-chat-portal/` - public-safe chat/control-plane UI
- `public/downloads/` - public local connector installer entrypoints
- `public/content.json` - public-safe content manifest
- `scripts/` - public-safe validation and local serving scripts
- `.github/workflows/` - static quality gates and Pages deployment
