# MMIR API Contract v0

This is the canonical API contract for the first MMIR launch path. Frontend, local node and managed API should converge on this shape before adding advanced features.

MMIR is the orchestration layer for trusted AI. The contract must support a world-class chat interface and a control plane that can route across local nodes, hosted/self-managed nodes, managed providers and future agent teams without putting runtime authority or secrets in the public frontend.

## Contract Goals

- One frontend client path for local, hosted and managed backends.
- OpenAI-compatible chat route where practical.
- Small MMIR control endpoints for health, status, nodes, models, routing and metrics.
- Active node inventory that the UI can show and attach to chat.
- Multi-model orchestration support for parallel answers, best-answer selection and model discussions.
- Safe errors and predictable validation.
- No provider secrets in the browser.
- No hidden paid provider calls from first-click chat.

## Base Routes

| Method | Path | Required for | Purpose |
|---|---|---|---|
| `GET` | `/health` | local node, managed API | Liveness and version check |
| `GET` | `/status` | local node, managed API | Runtime/provider/control-plane status and capabilities |
| `GET` | `/models` | local node, managed API | Normalized model inventory for the current backend or control plane |
| `GET` | `/nodes` | managed API, later local bridge | Active node inventory visible to the user/org |
| `POST` | `/nodes/register` | managed API | Register public-safe node metadata and endpoint reference |
| `POST` | `/nodes/{id}/heartbeat` | managed API | Update node health, models, capacity and capabilities |
| `POST` | `/routing/decision` | managed API | Select a route based on trust, health, cost, model and policy |
| `POST` | `/chat/completions` | local node, managed API | Canonical single-model or routed chat route |
| `POST` | `/chat/compare` | managed API | Ask multiple models/nodes and return comparable answers |
| `POST` | `/chat/discussions` | managed API | Start a structured multi-model discussion |
| `POST` | `/scheduler/candidates` | managed API | Return eligible nodes/providers for a request |
| `GET` | `/metrics` | managed API, later local node | Privacy-safe operational metrics |
| `POST` | `/control-plane/provider/plan` | managed API | Validate hosted/provider setup before secrets or spend |
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
| 503 | `no_free_route` | No free/approved route is currently available |

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
- `mode`: `local`, `managed`, `hosted`, `edge` or `demo`
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

## GET /nodes

Purpose: return nodes the current user/org can see and potentially add to chat. Public unauthenticated calls may return only free/demo/browser-safe routes. Authenticated calls may return personal/local/hosted/org nodes according to policy.

Response:

```json
{
  "object": "list",
  "data": [
    {
      "id": "browser-guide",
      "name": "MMIR Browser Guide",
      "type": "free",
      "status": "online",
      "trust_level": "public-free",
      "cost": { "mode": "free", "requires_approval": false },
      "endpoint_ref": "managed:browser-guide",
      "capabilities": ["chat.completions", "routing.free"],
      "models": [
        {
          "id": "mmir-browser-guide",
          "name": "MMIR Browser Guide",
          "status": "available",
          "provider": "mmir",
          "source": "free"
        }
      ],
      "last_seen_at": "2026-05-24T00:00:00.000Z"
    }
  ]
}
```

Node `type` values:

- `free`: free managed route or browser-safe helper available immediately
- `local`: paired local machine node
- `hosted`: user-owned hosted/VM/GPU/cloud node
- `managed`: MMIR-operated managed provider or runtime
- `edge`: edge device such as Raspberry Pi, Jetson or appliance
- `agent`: specialized agent service

Node `status` values:

- `online`: can serve at least one advertised capability now
- `degraded`: visible but has partial capability failure
- `offline`: known but cannot serve now
- `pairing_required`: visible setup exists but user must pair/authenticate
- `planned`: documented future node only

## Node Registration And Heartbeat

`POST /nodes/register` stores public-safe node metadata only. It must not accept raw provider keys from the browser.

Registration request:

```json
{
  "name": "MMIR Mac Studio Node",
  "type": "local",
  "endpoint_ref": "node:endpoint-ref-created-by-control-plane",
  "trust_level": "paired-local",
  "capabilities": ["models", "chat.completions", "hardware"],
  "metadata": {
    "device_class": "macos-arm64-workstation",
    "runtime": "ollama",
    "contract_version": "0.1"
  }
}
```

Heartbeat request:

```json
{
  "status": "online",
  "latency_ms": 42,
  "models": [
    { "id": "llama3.2:1b", "status": "available", "source": "ollama" }
  ],
  "capabilities": ["models", "chat.completions", "hardware"],
  "resources": {
    "ram_available_mb": 8192,
    "gpu_count": 0
  }
}
```

The control plane may reject registration or heartbeat if trust, auth, cost or schema gates fail.

## GET /models

Purpose: return models that the active backend can actually serve. In managed mode this may aggregate active nodes and providers, but each model must include enough source metadata for the UI to explain where it will run.

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
      "node_id": "local-node",
      "capabilities": ["chat"],
      "context_window": null,
      "license": "check_required",
      "recommended": true,
      "cost": { "mode": "free", "requires_approval": false },
      "trust_level": "paired-local"
    }
  ]
}
```

Model `status` values:

- `available`: can be used now
- `unavailable`: known but cannot be used now
- `planned`: product promise only
- `premium_planned`: future paid/managed capability

## POST /routing/decision

Purpose: choose the best allowed route for a request without leaking secrets or making the frontend a policy engine.

Request:

```json
{
  "intent": "chat",
  "preferred_models": ["llama3.2:3b"],
  "trust_policy": "local_or_free_first",
  "cost_policy": "free_only",
  "latency_target_ms": 3000,
  "messages_summary": {
    "count": 3,
    "approx_chars": 1200
  }
}
```

Response:

```json
{
  "route": {
    "node_id": "browser-guide",
    "model": "mmir-browser-guide",
    "provider": "mmir",
    "cost": { "mode": "free", "requires_approval": false },
    "trust_level": "public-free"
  },
  "alternatives": [],
  "decision_reason": "Only free active route available."
}
```

The route decision must fail closed for unknown-cost or missing-secret provider paths.

## POST /chat/completions

Purpose: canonical chat route. Shape follows OpenAI-compatible conventions where practical. It may be used for direct single-model calls or for control-plane-routed calls when `route` is supplied.

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
  "route": {
    "node_id": "local-node"
  },
  "metadata": {
    "workspace_id": null,
    "role_preset": "architect"
  }
}
```

Validation:

- `model` is required unless the backend exposes an explicit default model or a route decision can choose one.
- `messages` must be a non-empty array.
- Every message must have `role` and `content`.
- Allowed roles for v0: `system`, `user`, `assistant`, `tool`.
- `content` must be a string for v0.
- Backends must enforce size limits.
- Paid/unknown-cost routes must be rejected unless an approved server-side budget gate exists.

Non-stream response:

```json
{
  "id": "chatcmpl_mmir_abc123",
  "object": "chat.completion",
  "created": 1770000000,
  "model": "llama3.2:3b",
  "provider": "local-node",
  "node_id": "local-node",
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

## POST /chat/compare

Purpose: ask multiple eligible models/nodes the same prompt and return answers in a UI-friendly comparison shape. This enables "best answer from several models" without making the frontend coordinate secrets or policy.

Request:

```json
{
  "messages": [
    { "role": "user", "content": "Give me the best launch checklist for MMIR." }
  ],
  "candidates": [
    { "node_id": "browser-guide", "model": "mmir-browser-guide" },
    { "node_id": "local-node", "model": "llama3.2:3b" }
  ],
  "selection_policy": "best_answer",
  "cost_policy": "free_or_approved"
}
```

Response:

```json
{
  "object": "chat.comparison",
  "answers": [
    {
      "id": "answer_1",
      "node_id": "browser-guide",
      "model": "mmir-browser-guide",
      "status": "completed",
      "message": { "role": "assistant", "content": "Start with first-click chat..." },
      "latency_ms": 120
    }
  ],
  "recommended_answer_id": "answer_1",
  "selection_reason": "Only free active candidate completed."
}
```

## POST /chat/discussions

Purpose: coordinate a structured multi-model discussion where models can propose, critique and synthesize answers.

Request:

```json
{
  "topic": "Choose the safest MMIR local-node onboarding path.",
  "participants": [
    { "role": "architect", "node_id": "browser-guide", "model": "mmir-browser-guide" },
    { "role": "security", "node_id": "local-node", "model": "llama3.2:3b" }
  ],
  "rounds": 2,
  "cost_policy": "free_or_approved"
}
```

Response:

```json
{
  "object": "chat.discussion",
  "status": "completed",
  "turns": [],
  "summary": "Use local pairing first, then optional tunnel with explicit opt-in."
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

For compare and discussion routes, streaming may include typed events such as `answer.delta`, `participant.status`, `discussion.turn` and `summary.delta` once implemented.

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

## Hosted LLM And Provider Setup

User-owned hosted LLMs must connect through server-side plans and secret references.

Rules:

- Public frontend may collect provider type, endpoint URL label and desired capability, but must not store raw keys.
- Raw provider keys must go through a protected backend secret flow or local node vault flow.
- `/control-plane/provider/plan` must say what will happen before any provider call or spend.
- Hosted nodes should be represented as nodes with `type: "hosted"` and should pass the same health/models/chat contract as local nodes.

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
- Require auth for personal/local/hosted/org node routes.
- Allow only explicitly free public routes for unauthenticated first-click chat.
- Apply rate limits before provider calls.
- Never accept provider secrets from public frontend as raw API keys.
- Treat cost policy as server-owned, never browser-owned.

## Compatibility Notes

Open WebUI and OpenAI-compatible ecosystems inform the shape, but MMIR owns the control endpoints and security policy.

Compatibility is a product advantage only when it strengthens MMIR's trusted orchestration layer. It must not turn MMIR into a thin clone of one chat frontend or one provider API.
