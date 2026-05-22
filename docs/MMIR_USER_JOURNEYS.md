# MMIR User Journeys

MMIR is the trusted AI operating layer for connecting, controlling and orchestrating local, self-hosted and managed AI systems.

The public site must communicate this without exposing secrets. `inkognitroz.github.io` is public and may contain only static UI, public-safe manifests, non-sensitive docs and local browser metadata. Provider keys, organization data, billing controls, private user data, managed auth and routing policy belong in private/protected backend or local connector repos.

## Product Principle

MMIR should feel simple, personal, calm and powerful:

- simple: a useful first answer works without setup
- personal: the user connects their own models, workspaces and knowledge
- calm: advanced infrastructure is progressively disclosed
- powerful: orchestration, routing, workflows and policy exist under the surface
- free-first: default paths cost nothing and never spend without explicit approval

## Journey Status Labels

- `live`: works in the public static app today
- `beta`: usable, but still needs hardening or more complete edge-case coverage
- `planned`: not yet available as a reliable product path
- `premium planned`: visible only as future paid/managed capability
- `blocked`: intentionally blocked until trust, cost, identity or policy controls exist

## Core Journeys

| ID | Journey | Status | User goal | Trust boundary | Free-first rule | Done when |
|---|---|---|---|---|---|---|
| J001 | First useful answer | live | Ask MMIR something immediately | Public browser only | Uses browser guide, no account, no backend, no key | User can send a prompt and receive an immediate truthful guide answer |
| J002 | Free local model activation | beta | Run a private local LLM through MMIR | Browser -> paired local node -> Ollama | Uses local machine and open local models only | User selects a free model, installs local node/Ollama, refreshes and sees live model |
| J003 | Existing trusted backend | beta | Connect an existing self-hosted or compatible backend | Browser -> user-selected backend | Non-local backend must be marked free/local/self-hosted unless protected paid policy exists | User can save backend metadata and chat through the shared contract |
| J004 | Model orchestration chat | beta | Switch roles/models, compare answers and synthesize | Browser + active trusted backend | No hidden paid provider calls | User can select role/model/comparison and see labeled outputs |
| J005 | Workspace memory and knowledge | beta | Keep useful project context across chats | Browser local storage and protected backend when connected | Local-first; memory is inspectable and deletable | User can create workspace, add memory/docs and see context used in answers |
| J006 | Workflow orchestration | beta | Chain AI steps into reusable workflows | Browser + protected/local backend | Manual/planning first, no paid automation by default | User can define a workflow object and run/manual-plan it safely |
| J007 | Progress and operator dashboard | live | See what is built, next and blocked | Public-safe dashboard manifest | Contains no secrets or private repo data | User can view shipped/beta/next/watch status and repo ownership |
| J008 | Managed API and provider routing | blocked | Use managed providers and API keys safely | Browser -> protected API -> vault/provider | No provider key in public repo or localStorage; no paid route without cost policy | Managed route has auth, rate limits, audit and server-side key vault |
| J009 | Trusted node orchestration mesh | planned | Register and route across trusted nodes | Protected API + paired local/remote nodes | No anonymous compute; no surprise cloud spend | Nodes have identity, health, capabilities and policy-bound routing |
| J010 | Marketplace and premium orchestration | premium planned | Publish, share or buy managed models/workflows/nodes | Protected API + marketplace governance | Free product works first; purchase requires explicit approval | Marketplace has ownership, trust status, moderation and billing controls |

## Journey Acceptance Tests

Each journey should have:

1. A public-safe manifest entry.
2. A UI path from the first screen.
3. A clear status label.
4. A zero-trust boundary statement.
5. A free-first/cost statement.
6. A smoke check where feasible.
7. A truthful gap list when the path is beta, planned or blocked.

## Public/Private Split

Public repo allowed:

- static UI
- CSS/JS for local browser behavior
- public manifests such as model catalog, progress dashboard and user journey map
- docs that describe architecture, security and product state
- labels and references to backend/key concepts

Private/protected repos required:

- provider API keys and vault logic
- managed auth/session implementation
- billing and cost policy enforcement
- organization/user data
- production routing configuration
- private telemetry, logs and audit trails
- cloud credentials and Terraform state

## Current Highest-Value Fixes

1. Make J002 one-click enough that a normal user can get a local model live without reading architecture.
2. Make J004 orchestration feel like MMIR's core strength: role, model, comparison and synthesis should be obvious and reliable.
3. Add journey-level smoke tests so each route can be marked 100% only when it actually works end to end.
4. Keep J008/J010 blocked until paid/provider/secret controls are real.
