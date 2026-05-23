# Product Boundaries

This repository is the public home of MMIR.ai.

## MMIR Owns The Public Product Surface

MMIR is the active product identity for `mmir.ai`.

It owns:

- the public root experience
- `public/mmir.html`
- local AI onboarding
- public-safe model, provider, status, journey and progress manifests
- installer entrypoints for MMIR Local Node
- public product, security, architecture and user journey documentation

## Frontend Boundary

The frontend should:

- orchestrate the first user journey
- configure public-safe preferences
- visualize local/backend status
- route users into install, pairing, model selection and chat
- explain trust, privacy and control-plane decisions

The frontend must not:

- own provider secrets
- own billing authority
- expose raw Ollama/model runtime ports
- store private organization data
- bypass backend/local-node policy
- provision paid compute

## Protected Runtime Boundary

Protected behavior belongs in dedicated MMIR repos and services:

- `mmir-local-node` owns local runtime bridging, pairing, local model discovery and local chat.
- `mimir-backend-template` owns managed auth, policy, routing, provider abstraction, audit and future billing hooks.
- `mmir-github-llm` owns repo-aware agent workflows and memory experiments.
- `iac-autoprov` and `iac-autoprov-aws` own infrastructure plans, not product identity.

## Rule

MMIR is the product. The old app-factory concept is retired and must not drive public copy, onboarding, architecture, repo docs or agent instructions.

The first product truth remains:

```text
Open mmir.ai
-> Connect local AI
-> Install
-> Ready
-> Chat works
```
