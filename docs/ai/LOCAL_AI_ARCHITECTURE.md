# Local AI architecture

## Goal
Turn SaaS Fabric into a static public hub that can connect to one or more local or virtual AI backends without exposing secrets in browser code.

## Target architecture

```text
PUBLIC CONTROL PLANE
mmir.ai / inkognitroz.github.io
  -> Chat UI
  -> status dashboard
  -> backend profiles
  -> model selection

STABLE API / INGRESS
api.mmir.ai
  -> TLS
  -> CORS allowlist
  -> auth/rate limiting later
  -> routing/failover

PORTABLE BACKEND CONTRACT
mimir-backend-template
  -> /health /models /status /chat
  -> provider router
  -> mock fallback
  -> OCI/AWS/OpenAI-compatible/Jetson adapters

PROVIDER / RUNTIME TRACKS
iac-autoprov
  -> OCI Sovereign AI Backend on OCI Stockholm
  -> Terraform Cloud + GitHub Actions
  -> VM.Standard.A1.Flex 4 OCPU / 24 GB
  -> Docker, Ollama, Open WebUI, Caddy, Node proxy
  -> currently blocked by OCI `Out of host capacity`

iac-autoprov-aws
  -> AWS backend track
  -> scalable/fallback runtime path

Edge / Robotics
  -> Jetson, ED-209, ED-309 later
```

## Principles
- Keep GitHub Pages frontend static and safe.
- No secrets in frontend.
- Frontend calls only controlled API endpoints.
- Raw Ollama port `11434` must never be public.
- Provider runtimes sit behind API/connector layer.
- Logging and learning from conversations must be opt-in and governed.
- Use sovereignty-oriented wording until full compliance controls are documented.

## First implementation path
1. Keep `mmir.ai` static as the public control plane.
2. Keep `api.mmir.ai` as the stable ingress and routing endpoint.
3. Keep `mimir-backend-template` as the portable backend contract and connector layer (not API gateway).
4. Advance runtime tracks through `iac-autoprov` (OCI) and `iac-autoprov-aws` (AWS).
5. Add Jetson/robotics adapters as edge track matures.

## Future components
- Model selector
- Provider selector
- Model health check
- Chat sessions
- Prompt templates
- RAG source picker
- Cost/latency/performance tracking
- Admin-managed model registry
