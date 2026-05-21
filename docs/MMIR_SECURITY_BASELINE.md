# MMIR Security Baseline

This baseline applies to all in-scope MMIR launch repositories.

## Security Goal

Let users run and connect AI models without accidentally exposing local runtimes, provider secrets or sensitive prompts.

MMIR should default to local privacy and require explicit trust before crossing boundaries.

## Zero Trust Rules

1. Treat browser, local node, managed API, providers and infrastructure as separate trust zones.
2. Authenticate or pair before privileged actions.
3. Authorize by capability, not just by network location.
4. Validate every request at the boundary that receives it.
5. Store secrets only in server-side or local secure storage, never static assets.
6. Log operational events without raw prompt content by default.
7. Fail closed when origin, token, provider, model or payload validation is unclear.

## Threat Model For MVP

| Threat | Risk | Required control |
|---|---|---|
| Public website controls local runtime silently | Prompt or model abuse | Pairing token, local-only default bind, explicit UI action |
| Raw Ollama exposed to internet | Full local model exposure | Never expose `11434`; local node binds `127.0.0.1` by default |
| Provider key pasted into frontend | Secret leak through browser/storage | Backend key vault only, UI accepts labels/references only |
| Malicious origin calls local node | Cross-site abuse | CORS allowlist and pairing token |
| Oversized prompt crashes node | Local denial of service | Body limits, message limits, timeouts |
| Managed route spends money unexpectedly | Cost abuse | Auth, rate limit, cost policy, paid-route opt-in |
| Logs capture sensitive prompts | Privacy leak | Prompt logging disabled by default, redaction and audit separation |
| Infrastructure apply changes production unexpectedly | Availability or cost incident | Protected workflow, plan review, bounded credentials |

## Frontend Controls

The public frontend may store:

- backend display name
- backend URL selected by the user
- provider type label
- non-sensitive model/profile metadata
- local chat history only when the user accepts local browser persistence

The public frontend must not store:

- provider API keys
- organization secrets
- managed auth refresh tokens in plain localStorage
- billing authority
- raw infrastructure credentials

Frontend must label features as:

- `live`
- `beta`
- `planned`
- `premium planned`

No feature should look live until it has a working path and a smoke check.

## Local Node Controls

Required before public recommendation:

- Bind host defaults to `127.0.0.1`.
- Allow LAN or public bind only through explicit environment variable and documentation.
- CORS is explicit, not `origin: true`.
- Add body size limit.
- Validate chat payload shape.
- Add request timeout to Ollama/provider calls.
- Return safe error envelopes.
- Add local pairing token for `/models` and `/chat/completions` control routes.

Allowed no-token routes for initial discovery:

- `GET /health`
- optionally `GET /status` with no sensitive hardware detail

Protected routes after pairing:

- `GET /models`
- `POST /chat/completions`
- later `/nodes`, `/memory`, `/workflows`

## Managed API Controls

Required before exposing `api.mmir.ai` to users:

- TLS through gateway.
- Explicit production CORS origins.
- Auth for managed provider routes.
- Request validation.
- Rate limits.
- Provider timeouts.
- Encrypted secret storage.
- Audit events without raw prompt logging.
- Request IDs for traceability.
- Health endpoints that do not expose secret config.

## Provider Key Policy

Provider keys must follow this pattern:

1. User enters key only into a managed secure form or local secure connector.
2. Backend encrypts and stores it in a vault or configured secret store.
3. Frontend receives only a reference label, never the key.
4. Provider adapter resolves the key server-side at call time.
5. Logs record key reference ID, not key value.

## Logging Policy

Allowed by default:

- timestamp
- request ID
- route
- status code
- latency
- model ID
- provider ID
- error code

Not allowed by default:

- raw prompts
- raw completions
- API keys
- Authorization headers
- cookies/session tokens
- local pairing token
- full hardware fingerprint

Prompt/output logging can be added later only as explicit opt-in with retention controls.

## Local Privacy Promise

Local mode means:

- prompt is sent to local node only
- local node calls local runtime only
- no MMIR cloud account is required
- no provider key is required
- no managed API call happens unless user selects a managed backend

This promise is product-critical and must be preserved in UX and code.

## Security Review Gates

Before each phase moves forward:

| Phase | Gate |
|---|---|
| D001-D008 | Architecture and API boundaries documented |
| D009-D013 | Local node cannot be reached from LAN by default |
| D014-D018 | Frontend handles offline/error states without leaking secrets |
| D031-D041 | Managed API has auth, validation, rate limits, audit and no browser secrets |
| D050+ | Node orchestration uses identity, trust levels and outbound-first connectivity |

## Incident Defaults

If something is misconfigured:

- disable managed provider route first
- keep static frontend available if safe
- revoke affected provider key or token
- rotate secrets if exposed
- document what happened and what changed
- add a regression test or smoke check
