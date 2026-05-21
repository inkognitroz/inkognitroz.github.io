# MMIR Launch Backlog

This backlog keeps the launch work focused on MMIR.ai core only.

## Goal

Get a real user from `mmir.ai` to a working first chat with a trusted local or managed model path.

Primary user outcome:

1. Open `mmir.ai`.
2. Understand the value in under 5 seconds.
3. Connect a local node or trusted backend.
4. See node/model status.
5. Send a prompt.
6. Receive a response.

Commercial outcome:

- Free local-first entry point.
- Paid managed layer later: hosted router, team workspace, encrypted provider key vault, cloud connectors, usage analytics and support.

## Product Feel

MMIR must always feel simple, personal, calm and powerful, even when the infrastructure underneath becomes highly advanced.

## Detailed Backlogs

- Product strategy backlog: `docs/MMIR_PRODUCT_STRATEGY_BACKLOG.md`
- Front page promise backlog: `docs/MMIR_FRONT_PAGE_PROMISE_BACKLOG.md`
- Pages smoke checklist: `docs/PAGES_SMOKE_CHECKLIST.md`

## Scope

In scope now:

- `inkognitroz.github.io` public app shell and launch page.
- `mimir-backend-template` API contract and provider router.
- `mmir-local-node` local Ollama gateway.
- `mmir-github-llm` fallback/demo provider.
- `iac-autoprov` only after the local path is stable.

Out of scope for this launch pass:

- `Virtual_Company`
- `mimir-3d`
- `Yggdrasil`
- `ED209`
- old `Mimir`

## Phase Order

- Phase 1 - Core Product: universal chat UI, connect models, local node, multi-model switching, persistent chats.
- Phase 2 - Product Feeling: beautiful UX, memory, workspaces, onboarding, mobile.
- Phase 3 - Real Infrastructure: node orchestration, workflows, automation, AI routing.
- Phase 4 - Platform: marketplace, enterprise, agents, ecosystem.

## P0 - Site Stability

- [x] Keep GitHub Pages custom domain stable with `public/CNAME`.
- [ ] Confirm `Deploy GitHub Pages` publishes from `./public` and stays green.
- [x] Add a simple post-deploy smoke checklist for `https://inkognitroz.github.io` and `https://mmir.ai`.
- [x] Remove or hide links that point users to unfinished internals.

## P0 - First Usable Product Loop

- [ ] Implement live connector chat flow in the frontend.
- [ ] Add health check for local node/backend from the UI.
- [ ] List available models from the active backend.
- [ ] Send chat messages through a controlled backend/local-node API.
- [ ] Render assistant responses in the page instead of only opening an external URL.

## P0 - Local Node Security

- [ ] Default local node host binding to `127.0.0.1`.
- [ ] Replace permissive CORS with explicit allowed origins.
- [ ] Add request size limits and chat payload validation.
- [ ] Add a pairing token or local-only trust mechanism.
- [ ] Document that raw Ollama should not be exposed publicly.

## P1 - Product Clarity

- [ ] Make the first screen explain one promise: use your own local AI models from one clean browser UI.
- [ ] Reduce broad future platform language above the fold.
- [ ] Separate live features from planned features.
- [ ] Add a clear setup path: install local node, connect, choose model, chat.

## P1 - Backend Contract

- [ ] Keep one stable API shape: `/health`, `/status`, `/models`, `/chat`.
- [ ] Align frontend, backend-template and local-node payload formats.
- [ ] Add contract tests around the shared API shape.
- [ ] Add provider adapters behind the backend, not in public frontend code.

## P1 - Monetization Path

- [ ] Add waitlist or early-access capture after the first chat path is credible.
- [ ] Define Free, Pro and Team packaging.
- [ ] Keep paid value in the managed layer, not in basic local chat.
- [ ] Prepare copy for privacy-first users and small business users.

## P2 - Cloud Path

- [ ] Revisit OCI only after local-node MVP works.
- [ ] Require protected deploy/apply workflow for infrastructure.
- [ ] Add TLS, auth, rate limits and cost controls before exposing cloud model routes.

## Current Working Item

Start with Phase 1 plus front page P0: product strategy `P1-001` through `P1-005`, strategy lines `S001` through `S006`, and front page promise lines `F001` through `F022`.
