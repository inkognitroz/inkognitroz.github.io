# Local AI architecture

## Goal
Turn SaaS Fabric into a static public hub that can connect to one or more local or virtual AI backends without exposing secrets in browser code.

## Target architecture

```text
Browser UI
  -> optional local Ollama endpoint
  -> optional model-router backend
  -> virtual AI backend nodes
  -> Ollama / OpenAI-compatible APIs / RAG services
```

## Principles
- Keep GitHub Pages frontend static and safe.
- Do not place service tokens or paid API keys in frontend files.
- Allow local-first operation with Ollama.
- Add a backend router only when cross-device, auth, logging, RAG or hosted AI is needed.
- Support multiple backend nodes later through a model registry.

## First implementation path
1. Build local Ollama Chat Lab.
2. Add model registry JSON.
3. Add OpenAI-compatible backend contract.
4. Add RAG backend contract.
5. Add hosted model router behind server-side secrets.

## Future components
- Model selector
- Provider selector
- Model health check
- Chat sessions
- Prompt templates
- RAG source picker
- Cost/latency/performance tracking
- Admin-managed model registry
