# inkognitroz.github.io

Public home of **MMIR.ai**.

## Brand

- **Name:** MMIR
- **Category:** Trusted AI control plane
- **Positioning:** The orchestration layer for trusted AI.

## What This Is

This repository publishes the static public MMIR.ai experience through GitHub Pages. It is the public product surface for the first user journey:

```text
Open mmir.ai
-> Connect local AI
-> Install MMIR Local Node
-> See local models
-> Chat through the MMIR control plane
```

The frontend can explain, configure, visualize and initiate trusted AI routes. It must not own secrets, provider keys, paid execution authority, private organization data or raw model runtime exposure.

## Product Direction

MMIR is not a chatbot wrapper or a single-model UI. It is the control plane above models and runtimes:

- local-first AI through MMIR Local Node
- model-agnostic provider routing
- workflow orchestration
- persistent project/workspace memory
- trusted node and runtime management
- security, governance, audit and future billing hooks

## Quick Start

1. Open `public/mmir.html` for the main MMIR product page.
2. Edit public-safe content and manifests only.
3. Run the smoke checks before publishing.
4. GitHub Actions deploys `/public` to `https://mmir.ai` / GitHub Pages.

```bash
node scripts/serve-public.mjs
node scripts/ensure-mmir-public-branding.js --check
node scripts/smoke-check-pages.js
node scripts/smoke-check-user-journeys.js
node scripts/smoke-check-ui-actions.js
```

## Safe Publishing

- Use pull requests or connector-backed commits for reviewed changes.
- Keep GitHub tokens, provider keys, billing credentials and backend secrets out of `public/`.
- Put protected runtime behavior in the backend/local-node repos, not the static frontend.
- Keep cost-incurring routes disabled unless the owner explicitly approves the cost.

## Structure

- `public/index.html` - MMIR root redirect/fallback
- `public/mmir.html` - main public MMIR control-plane experience
- `public/apps/mimir-chat-portal/` - chat, local connector, models, workflows, memory, privacy and status UI
- `public/downloads/` - public local connector installer entrypoints
- `public/content.json` - public-safe homepage/content manifest
- `docs/` - MMIR architecture, security, roadmap and delivery docs
- `.github/workflows/` - Pages deploy and static quality gates

## Security

Read `docs/MMIR_SECURITY_BASELINE.md`, `docs/MMIR_CONTROL_PLANE_BOUNDARY.md` and `docs/SECURITY.md` before adding integrations.

Core rule: public frontend never stores provider secrets. Local model control goes through a paired local node on `127.0.0.1` by default. Managed provider routes belong behind protected backend auth, policy, rate limits, audit and cost gates.

## Current Priority

The highest-priority milestone is one perfect first experience:

```text
Open mmir.ai
-> Connect local AI
-> Install
-> Ready
-> Chat works
```

Everything else is secondary until this path is reliable, understandable and safe.
