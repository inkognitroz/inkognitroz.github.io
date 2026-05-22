# AGENTS

This repository is the public MMIR.ai web app and GitHub Pages deployment for the MMIR trusted AI operating layer.

## Mission

MMIR should feel simple, personal, calm and powerful while it orchestrates local, self-hosted and future managed AI systems.

The public site must make the first user path useful immediately:

1. answer with the free browser guide before setup,
2. help the user connect MMIR Local Node on `127.0.0.1:3000`,
3. show live models when a trusted backend/local node is available,
4. keep provider keys, secrets, billing and private data out of this public repo.

## Source Of Truth

- Sequential backlog: `docs/MMIR_SEQUENTIAL_DELIVERY_BACKLOG.md`
- Progress dashboard manifest: `public/progress-dashboard.json`
- User journeys: `public/user-journeys.json`
- UI action coverage: `public/ui-action-coverage.json`
- API contract: `docs/MMIR_API_CONTRACT_V0.md`

## Current Priority

Work down the backlog in order. After the completed D001-D108 foundation, prioritize:

- D109 Node dashboard
- D110 Secure cross-device pairing
- D111 Install health doctor
- D112 Model install progress
- D113 One-click Ollama model library
- D114 First-run success checklist
- D115 WOW first-screen UX

## Guardrails

- Keep GitHub Pages compatibility and publish from `/public` only.
- Treat `inkognitroz.github.io` as public. Never commit real secrets, provider keys, tokens, billing config or private user data.
- Use public-safe manifests and truthful labels: live, beta, planned, premium planned or blocked.
- Preserve zero-trust boundaries: frontend stores only safe metadata; local secrets and pairing stay local; provider keys belong behind protected backend services.
- Keep the product free-first and local-first. Do not start paid cloud/provider execution without explicit approval.
- Do not remove vision. If a feature is not implemented yet, keep it visible as planned or premium planned with a clear boundary.

## Validation

Run these before committing public-site changes:

```bash
node scripts/smoke-check-pages.js
node scripts/smoke-check-ui-actions.js
node scripts/smoke-check-user-journeys.js
```

If the backlog changes, regenerate the dashboard:

```bash
node scripts/build-progress-dashboard.js
```
