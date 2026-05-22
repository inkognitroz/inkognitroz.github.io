# MMIR Product Doctrine

## True Identity

MMIR is the orchestration layer for trusted AI.

MMIR is not:

- a chatbot
- an Ollama wrapper
- a local frontend
- an OpenAI clone

MMIR is:

- an AI control plane
- a model-agnostic orchestration layer
- a trusted bridge between local, edge, self-hosted and managed AI systems
- a workflow operating system for persistent intelligence

This identity must shape product, architecture, UI, onboarding, repos, workflows, security and roadmap decisions.

## Ground Zero

The first real product milestone is:

```text
Open mmir.ai
-> Connect local AI
-> Install
-> Ready
-> See own models
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

Those details can exist inside the system, but they must not be the user's first experience.

## Architecture Rule

Frontend:

- orchestrates
- configures
- routes
- visualizes
- manages

Frontend must not:

- own runtime
- own secrets
- own models
- make paid provider calls directly

Backend router:

- owns auth
- owns policy
- owns provider abstraction
- owns rate limiting
- owns server-side secret references
- owns workflow orchestration
- owns managed routing decisions

Local node:

- bridges MMIR to local runtimes
- pairs locally
- discovers models
- keeps raw runtimes private
- reports public-safe health and capability metadata

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

This is especially important for Europe, public sector, enterprise, security, health and defense use cases.

## Workflow Rule

Chat is an entry point. Workflows are the moat.

MMIR must evolve toward an AI workflow operating system where memory, models, agents, policies and tools cooperate.

## Roadmap Priority

The current priority order is:

1. One perfect first experience.
2. Local AI activation that works on real user devices.
3. Model-agnostic orchestration and routing.
4. Persistent memory and workflow orchestration.
5. Protected backend control plane with auth, policy, secret references and cost gates.
6. AI teams and multi-agent workflows.
7. Intelligence Well: shared intelligence infrastructure across edge, cloud, agents, workflows, knowledge, models and compute.
8. Marketplace, billing, training economy and enterprise governance.

Marketplace, credits, training, mesh economy and enterprise orgs must not outrank the first magical local AI journey.

## Definition Of Done For The First Layer

The first layer is done when a normal user can:

1. Open `mmir.ai`.
2. Click connect local AI.
3. Install one file.
4. Return to MMIR.
5. See their own local models.
6. Chat instantly.
7. Understand that MMIR is controlling their AI infrastructure, not just wrapping one model.

That is the beginning of the real product.
