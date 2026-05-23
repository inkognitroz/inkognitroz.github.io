# MMIR Local MVP Status

Updated: 2026-05-23

This report is the short execution snapshot for the first MMIR delivery goal:

`Open mmir.ai -> Connect local AI -> Install -> Ready -> Chat`

## 1. What Exists Already?

- Public MMIR site on GitHub Pages, with `mmir.ai` redirected to the MMIR front page.
- Static frontend for chat, model selection, local connector onboarding, node dashboard, model library, privacy controls, prompt library, memory, knowledge and workflow planning.
- Standalone connector artifacts under `public/downloads/`, including a release manifest with SHA256 checksums and contract version `0.1`.
- A frontend API client for local/backend profiles, pairing headers, JSON calls and safe user-facing errors.
- Journey smoke checks for product identity, public-safe assets, connector release artifacts, model catalog, privacy boundaries and blocked paid/provider routes.
- Cross-repo architecture docs for MMIR product doctrine, control-plane boundaries, node connector contract, user journeys and sequential backlog.
- GitHub issues for the highest-risk frontend, backend and local-node gaps so multiple agents can work in parallel.

## 2. What Works?

- `https://mmir.ai/` currently presents MMIR, not SaaS Fabric.
- The root copy identifies MMIR as the orchestration layer for trusted AI.
- The connector release manifest is live and pins zero-cost local install policy.
- The public frontend keeps provider keys and paid cloud execution out of static JavaScript.
- The default local connector target is `127.0.0.1`, preserving local-first behavior.
- Static smoke checks can validate public identity, linked assets, JavaScript syntax and release checksums before Pages deploy.
- Users can start with a free browser guide route before connecting paid or managed providers.

## 3. What Is Half-Finished?

- First-screen activation is feature-rich, but still needs a hard browser/E2E guard against runtime loops and layout regressions.
- The standalone connector has local/remote pairing concepts, but remote pairing enforcement must be explicit before tunnels or cross-device use.
- Local connector install artifacts exist, but production-grade macOS signing/notarization and full platform installer confidence are not complete.
- Backend control-plane routes exist in the backend repo, but provider execution still needs stronger policy enforcement before every chat call.
- Provider streaming exists conceptually, but timeout, abort and circuit-breaker behavior must be hardened.
- Node registration and autonomous node onboarding exist as a contract direction, but endpoint/metadata leakage rules need tightening.
- Observability, org auth, billing, marketplace and distributed compute are not MVP blockers and should stay behind the first local journey.

## 4. What Is Missing?

- A passing end-to-end first journey test with a mock local connector:
  `open page -> connect local AI -> pair -> list model -> chat`.
- A browser screenshot/layout gate for mobile and desktop first screen.
- A signed/notarized one-click macOS installer package or an explicitly marked unsigned preview flow.
- Full Windows/macOS/Linux local-node CI with real server conformance, not only mock checks.
- A canonical shared API contract package or generated contract artifact for future autonomous node repos.
- Managed auth/org/RBAC suitable for production multi-tenant use.
- Production-grade backend observability, global rate limiting and provider circuit breakers.
- Any paid runtime automation. Paid cloud/GPU/provider work must stay blocked until explicit cost approval.

## 5. Which PRs Must Be Made First?

1. `P0 Connector Pairing`
   - Repo: `inkognitroz.github.io`
   - Issue: `#131`
   - Goal: enforce remote pairing codes before the standalone connector returns a token, while keeping true loopback one-click pairing simple.

2. `P0 First-Screen Stability`
   - Repo: `inkognitroz.github.io`
   - Issue: `#130`
   - Goal: stop the first-screen readiness rail from causing repeated full-document mutation loops and add a smoke guard.

3. `P0 First Journey E2E`
   - Repo: `inkognitroz.github.io`
   - Issue: `#128`
   - Goal: run the full local MVP path against a mock local connector in CI.

4. `P1 Local Node Pairing Hardening`
   - Repo: `mmir-local-node`
   - Issues: `#24`, `#25`
   - Goal: bind local pairing to socket loopback and rate-limit remote code attempts.

5. `P1 Backend Control Plane`
   - Repo: `mimir-backend-template`
   - Issues: `#26`, `#27`, `#28`
   - Goal: enforce cost/control policy, provider timeouts and safe node registration.

## 6. Which Tests Should Run?

- `node --check public/apps/mimir-chat-portal/first-impression.js`
- `node --check public/downloads/mmir-local-connector-server.mjs`
- `node scripts/smoke-check-pages.js`
- `node scripts/smoke-check-user-journeys.js`
- `node scripts/smoke-check-ui-actions.js`
- `node scripts/public-safety-audit.js`
- Live check: `curl -sL https://mmir.ai/` must contain MMIR identity and must not contain SaaS Fabric/App Factory copy.
- Connector release check: `https://mmir.ai/downloads/mmir-local-connector-release.json` must return contract `0.1`, default host `127.0.0.1` and matching artifact checksums.
- Browser E2E when runner/browser is available: desktop and mobile first screen, connect local AI, mock pair, mock models, mock chat.
- Backend/local-node follow-up: route parity, OpenAPI parity, real local-node conformance, pairing negative tests and provider timeout tests.

## 7. Shortest Path To Full Local MVP

1. Merge the connector pairing PR.
2. Merge the first-screen stability PR.
3. Add the mock local connector E2E gate and make it required for Pages deploy.
4. Move standalone connector runtime ownership into `mmir-local-node` release artifacts, while keeping `inkognitroz.github.io` as the static distribution surface.
5. Ship one obvious macOS install option first, with clear unsigned/signed status and checksum verification.
6. Verify live on a clean browser:
   `mmir.ai -> Connect local AI -> install/open connector -> pair -> models visible -> chat response`.
7. Only after that, advance backend provider routing, org auth, marketplace, billing and distributed compute.

The current product should be judged by one rule: a new user must get one useful local/private AI chat without learning Node, npm, Ollama internals, CORS, tunnels or cloud routing.
