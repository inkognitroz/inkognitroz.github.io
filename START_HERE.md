# START HERE

Welcome to **MMIR**.

MMIR is the orchestration layer for trusted AI. The current product milestone is one perfect first experience:

```text
Open mmir.ai
-> Connect local AI
-> Install
-> Ready
-> Chat works
```

## Work Order

1. Check current GitHub issues and docs before creating new work.
2. Prioritize the local AI activation journey.
3. Keep public frontend changes static, safe and GitHub Pages-compatible.
4. Keep secrets and paid execution out of the public repo.
5. Run smoke checks before publishing.

```bash
node scripts/ensure-mmir-public-branding.js --check
node scripts/smoke-check-pages.js
node scripts/smoke-check-user-journeys.js
node scripts/smoke-check-ui-actions.js
```

## Key Files

- `public/index.html` - root MMIR entry/fallback
- `public/mmir.html` - main product experience
- `public/apps/mimir-chat-portal/` - MMIR chat/control-plane UI
- `public/downloads/` - local connector installer entrypoints
- `docs/MMIR_PRODUCT_DOCTRINE.md` - product identity
- `docs/MMIR_CONTROL_PLANE_BOUNDARY.md` - architecture boundary
- `docs/MMIR_SECURITY_BASELINE.md` - security baseline
