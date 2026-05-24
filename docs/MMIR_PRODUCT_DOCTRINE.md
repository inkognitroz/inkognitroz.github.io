# MMIR Product Doctrine

## True Identity

MMIR is the orchestration layer for trusted AI.

MMIR is not:

- a chatbot
- an Ollama wrapper
- a local frontend
- an OpenAI clone
- a SaaS Fabric/App Factory concept

MMIR is:

- an AI control plane
- a model-agnostic orchestration layer
- a trusted bridge between local, edge, self-hosted and managed AI systems
- a workflow operating system for persistent intelligence
- the user-facing command center for connected AI nodes, models, agents and workflows

This identity must shape product, architecture, UI, onboarding, repos, workflows, security and roadmap decisions.

## Ground Zero

The first real product milestone is:

```text
Open mmir.ai
-> Chat immediately through a free active route
-> Connect local AI
-> Install one file
-> Ready
-> See own models
-> Add active nodes to chat
-> Chat instantly
```

If this does not work, every advanced platform feature is premature.

If this works, MMIR becomes real because the user feels:

```text
This is my AI infrastructure.
```

## Product Rule

The first experience must feel simple, seamless, intelligent and powerful.

The user should not have to understand:

- brew
- npm
- Node.js
- CORS
- Ollama internals
- Terraform
- Docker
- cloud credentials
- provider key storage
- tunnel setup
- API contract details

Those details can exist inside the system, but they must not be the user's first experience.

## Non-Removal Rule

Do not remove working MMIR functionality just to simplify a screen, file or backlog item.

Allowed removal requires one of these reasons:

- the functionality is a security risk
- the functionality is broken and blocking the core journey
- the functionality is obsolete because a replacement is already live and documented
- the removal is tracked in an issue with migration notes

Default behavior is progressive enhancement: keep existing capabilities, improve them behind cleaner UI and contracts, and use feature flags or phased navigation when a capability is not ready for first-click users.

## Chat Experience Rule

The chat interface must become world-class: at least as usable as ChatGPT/Open WebUI for daily chat, while adding MMIR-specific orchestration power.

Required product direction:

- visible active node inventory
- visible model picker with health/cost/trust status
- one immediate free active chat route on first page load
- ability to add/remove nodes and models from a chat
- ability to chat with one model, several models in parallel, or an agent team
- ability to compare model answers and select the best answer
- ability to start a model discussion where models critique or improve each other
- clear local/private/hosted/managed trust indicators
- streaming responses and abort controls where supported
- conversation history, memory and workflows as first-class product surfaces
- setup for own hosted LLMs without exposing secrets in the browser

MMIR should learn from Open WebUI and ChatGPT interaction patterns, but MMIR's advantage is trusted orchestration above many runtimes, not copying a single chat shell.

## Architecture Rule

Frontend:

- orchestrates
- configures
- routes user intent
- visualizes nodes, models, health, trust and workflow state
- manages interaction state and user journey

Frontend must not:

- own runtime
- own secrets
- own models
- make paid provider calls directly
- expose raw node or provider internals
- become the primary policy engine

Backend router/control plane:

- owns auth
- owns policy
- owns provider abstraction
- owns rate limiting
- owns server-side secret references
- owns workflow orchestration
- owns managed routing decisions
- owns node registration and heartbeat trust decisions
- owns free/paid/cost gates before provider calls
- owns multi-model orchestration decisions that require server trust

Local node:

- bridges MMIR to local runtimes
- pairs locally
- discovers models
- serves local chat through the MMIR contract
- keeps raw runtimes private
- reports public-safe health and capability metadata
- can register/heartbeat through the managed control plane when the user opts in

Hosted/self-managed node:

- bridges MMIR to the user's own VM, GPU box, container, cloud runtime or vendor-hosted model
- exposes only the MMIR node contract to the control plane
- stores provider secrets outside the public frontend
- reports health, model inventory, capabilities and cost/trust metadata safely

Cloud layer:

- scales
- deploys
- trains
- hosts
- follows cost and policy gates

Cloud must support the product, not define it.

## Strategy

MMIR wins by owning the layer above the models.

Everyone is building models. Fewer teams are building the universal trusted AI control plane.

The strategic moat is:

- model-agnostic orchestration
- trusted AI sovereignty
- workflow-first automation
- persistent memory and knowledge
- AI teams and specialized agents
- protected local/cloud/edge routing
- governance and audit for serious users
- a growing ecosystem of compatible autonomous nodes

## Trusted AI

Trusted AI means:

- local-first defaults
- hybrid cloud only when useful and approved
- control over data
- control over workflows
- control over models
- no vendor lock-in
- no hidden spend
- no secrets in public frontend
- no raw prompt leakage into telemetry
- explicit trust/cost boundaries before routing

This is especially important for Europe, public sector, enterprise, security, health and defense use cases.

## Workflow Rule

Chat is the entry point. Workflows are the moat.

MMIR must evolve toward an AI workflow operating system where memory, models, agents, policies and tools cooperate.

The chat surface should naturally promote user intent into reusable workflows, agent teams, model comparisons, automations and knowledge-backed tasks.

## Node Ecosystem Rule

MMIR must make it easy for independently built node repos and services to connect without ad hoc integration work.

Every node should be understandable by agents and humans through:

- a stable node connector contract
- public-safe identity metadata
- health/status/model endpoints
- pairing/auth expectations
- heartbeat shape
- capability strings
- conformance tests
- clear docs for local, hosted and managed modes

Active nodes must be visible in the product and usable from chat when policy, trust and cost gates allow it.

## Roadmap Priority

The current priority order is:

1. One perfect first experience.
2. First-click chat with a free active route that never dead-ends.
3. Local AI activation that works on real user devices.
4. Active node inventory and model picker in the chat interface.
5. Model-agnostic orchestration and routing.
6. Multi-model compare, best-answer and discussion modes.
7. Persistent memory and workflow orchestration.
8. Protected backend control plane with auth, policy, secret references and cost gates.
9. Own hosted LLM/node onboarding.
10. AI teams and multi-agent workflows.
11. Intelligence Well: shared intelligence infrastructure across edge, cloud, agents, workflows, knowledge, models and compute.
12. Marketplace, billing, training economy and enterprise governance.

Marketplace, credits, training, mesh economy and enterprise orgs must not outrank the first magical AI journey.

## Definition Of Done For The First Layer

The first layer is done when a normal user can:

1. Open `mmir.ai`.
2. Chat immediately through a free active route.
3. See which node/model answered.
4. Click connect local AI.
5. Install one file.
6. Return to MMIR.
7. See their own local models as active nodes.
8. Add one or more models/nodes to chat.
9. Chat instantly.
10. Understand that MMIR is controlling their AI infrastructure, not just wrapping one model.

That is the beginning of the real product.

## Agent Implementation Rule

Agents working on MMIR must keep backlog items small, contract-driven and cross-repo aware.

Before building a new thing, agents should check whether the same need is already implemented, scheduled, documented or partially complete. New implementation should align with the product doctrine, API contract and node connector contract before code is added.

Every P0 change should leave behind one of:

- a passing test
- a smoke script
- a contract update
- an issue that another agent can continue
- a short doc that explains the boundary
