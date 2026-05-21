# MMIR API Contract v0

This is the canonical API contract for the first MMIR launch path. Frontend, local node and managed API should converge on this shape before adding advanced features.

## Contract Goals

- One frontend client path for local and managed backends.
- OpenAI-compatible chat route where practical.
- Small MMIR control endpoints for health, status, models and metrics.
- Safe errors and predictable validation.
- No provider secrets in the browser.

## Base Routes

| Method | Path | Required for | Purpose |
|---|---|---|---|
| `GET` | `/health` | local node, managed API | Liveness and version check |
| `GET` | `/status` | local node, managed API | Runtime/provider status and capabilities |
| `GET` | `/models` | local node, managed API | Normalized model inventory |
| `POST` | `/chat/completions` | local node, managed API | Canonical chat route |
| `GET` | `/metrics` | managed API, later local node | Privacy-safe operational metrics |
| `POST` | `/chat` | legacy only | Temporary adapter route until replaced |

## Common Response Fields

Responses should use these fields where relevant:

```json
{
  "service": "mmir-local-node",
  "version": "0.1.0",
  "status": "online",
  "timestamp": "2026-05-21T00:00:00.000Z"
}
```

## Error Format

Use a stable error envelope:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "Messages must be a non-empty array.",
    "request_id": "req_abc123"
  }
}
```

Rules:

- `message` should tell the user or developer what to do next.
- Do not include stack traces, secrets, full provider headers or raw tokens.
- Use HTTP status codes consistently.

Suggested codes:

| HTTP | Code | Meaning |
|---:|---|---|
| 400 | `invalid_request` | Payload shape or missing field is wrong |
| 401 | `unauthorized` | Managed API auth is missing or invalid |
| 403 | `forbidden` | Authenticated but not allowed |
| 404 | `not_found` | Model/provider/workspace not found |
| 408 | `timeout` | Runtime/provider did not respond in time |
| 413 | `payload_too_large` | Request exceeds size limit |
| 429 | `rate_limited` | User/IP/node exceeded policy |
| 502 | `provider_error` | Upstream provider failed |
| 503 | `runtime_unavailable` | Local node, Ollama or provider offline |

## GET /health

Purpose: quick liveness check. Must be cheap and should not call slow providers.

Response:

```json
{
  "status": "online",
  "service": "mmir-local-node",
  "version": "0.1.0",
  "mode": "local",
  "timestamp": "2026-05-21T00:00:00.000Z"
}
```

Required fields:

- `status`: `online`, `degraded` or `offline`
- `service`: implementation name
- `version`: semantic version where available
- `mode`: `local`, `managed` or `demo`
- `timestamp`: ISO timestamp

## GET /status

Purpose: richer status and capability description.

Response:

```json
{
  "status": "online",
  "service": "mmir-local-node",
  "mode": "local",
  "capabilities": ["health", "models", "chat.completions"],
  "runtime": {
    "provider": "ollama",
    "status": "online"
  },
  "limits": {
    "max_messages": 64,
    "max_prompt_chars": 24000,
    "streaming": false
  }
}
```

## GET /models

Purpose: return models that the active backend can actually serve.

Response:

```json
{
  "object": "list",
  "data": [
    {
      "id": "llama3.2:3b",
      "name": "Llama 3.2 3B",
      "provider": "ollama",
      "status": "available",
      "source": "local",
      "capabilities": ["chat"],
      "context_window": null,
      "license": "check_required",
      "recommended": true
    }
  ]
}
```

Model `status` values:

- `available`: can be used now
- `unavailable`: known but cannot be used now
- `planned`: product promise only
- `premium_planned`: future paid/managed capability

## POST /chat/completions

Purpose: canonical chat route. Shape follows OpenAI-compatible conventions where practical.

Request:

```json
{
  "model": "llama3.2:3b",
  "messages": [
    { "role": "system", "content": "You are concise." },
    { "role": "user", "content": "Explain local AI in one paragraph." }
  ],
  "stream": false,
  "temperature": 0.7,
  "metadata": {
    "workspace_id": null,
    "role_preset": "architect"
  }
}
```

Validation:

- `model` is required unless the backend exposes an explicit default model.
- `messages` must be a non-empty array.
- Every message must have `role` and `content`.
- Allowed roles for v0: `system`, `user`, `assistant`, `tool`.
- `content` must be a string for v0.
- Backends must enforce size limits.

Non-stream response:

```json
{
  "id": "chatcmpl_mmir_abc123",
  "object": "chat.completion",
  "created": 1770000000,
  "model": "llama3.2:3b",
  "provider": "local-node",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Local AI runs on your own machine, so private prompts can stay close to you."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": null,
    "completion_tokens": null,
    "total_tokens": null
  }
}
```

## Streaming Contract

Streaming will use Server-Sent Events once `D019` starts.

Each event should carry a JSON delta:

```text
data: {"choices":[{"delta":{"content":"Hello"},"index":0}]}

data: [DONE]
```

The frontend must support abort through `AbortController`.

## GET /metrics

Purpose: operational metrics without prompt leakage.

Response:

```json
{
  "requests_total": 10,
  "chat_requests_total": 4,
  "errors_total": 1,
  "avg_latency_ms": 820,
  "last_checked_at": "2026-05-21T00:00:00.000Z"
}
```

Do not include raw prompts, provider keys, full user identifiers or raw model outputs in metrics.

## Legacy POST /chat

`POST /chat` is allowed only as a temporary adapter for existing code. New frontend work should use `/chat/completions`.

Legacy request:

```json
{
  "model": "llama3.2:3b",
  "messages": [
    { "role": "user", "content": "Hello" }
  ]
}
```

Legacy response may be converted to the canonical chat completion shape before reaching new UI code.

## CORS And Auth Expectations

Local node:

- Allow only `https://mmir.ai`, `https://inkognitroz.github.io`, `http://localhost:*` dev origins and no-origin local tools.
- Require pairing token for chat/model control once `D010` is implemented.

Managed API:

- Allow production origins explicitly.
- Require auth for managed provider routes.
- Apply rate limits before provider calls.
- Never accept provider secrets from public frontend as raw API keys.

## Compatibility Notes

Open WebUI and OpenAI-compatible ecosystems inform the shape, but MMIR owns the control endpoints and security policy.
