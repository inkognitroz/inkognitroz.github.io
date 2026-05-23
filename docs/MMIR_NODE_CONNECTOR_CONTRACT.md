# MMIR Node Connector Contract v0.1

Public contract for autonomous services that want to connect as MMIR nodes.

MMIR is **the orchestration layer for trusted AI**. A node can be a Mac, PC, Raspberry Pi, VM, edge device, hosted runtime or specialized agent service. The node exposes a small MMIR-compatible API; the control plane owns trust, policy, routing, cost gates and observability.

## Required Node Endpoints

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| `GET` | `/health` | public-safe | Cheap liveness check. No slow provider calls. |
| `GET` | `/status` | public-safe or paired | Status, capabilities, limits and contract version. |
| `GET` | `/node/identity` | public-safe | Public-safe node metadata. No hostnames, secrets or serials. |
| `POST` | `/pair` | local request or one-time code | Return pairing token for protected local routes. |
| `GET` | `/models` | paired/authenticated | Normalized live model inventory. |
| `POST` | `/chat/completions` | paired/authenticated | Canonical OpenAI-compatible chat route. |

## Recommended Optional Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| `POST /pairing/sessions` | Create short-lived code from the node device before cross-device pairing. |
| `GET /hardware` | Public-safe capacity hints for routing and model choice. |
| `POST /models/pull` | Start local model install/pull job. |
| `GET /models/pulls` | List model pull jobs. |
| `GET /models/pulls/{id}` | Inspect pull progress. |
| `POST /models/delete` | Remove local model after explicit user action. |
| `GET /tunnels/status` | Report tunnel state without secrets. |
| `POST /tunnels/trycloudflare/start` | Start temporary tunnel only when local policy explicitly enables it. |
| `POST /tunnels/stop` | Stop tunnel and revoke public URL. |
| `GET /metrics` | Privacy-safe operational metrics. |

## Managed Gateway Endpoints

These are owned by the protected MMIR API, not by every node, but autonomous node services should be able to register through them when enabled:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/control-plane/node/register-plan` | Validate whether node registration is allowed. |
| `POST` | `/nodes/register` | Register public-safe node metadata and endpoint reference. |
| `POST` | `/nodes/{id}/heartbeat` | Update health, capabilities, models and resource hints. |
| `GET` | `/nodes` | List visible nodes. |
| `POST` | `/scheduler/candidates` | Return eligible nodes for a policy. |
| `POST` | `/routing/decision` | Decide node/provider route with cost and trust policy. |
| `POST` | `/scaling/plan` | Plan capacity without automatically spending money. |
| `POST` | `/control-plane/tunnel/plan` | Validate tunnel consent, trust, vault refs and billing gates. |
| `POST` | `/control-plane/provider/plan` | Validate provider use, secret refs and billing gates. |

## Capability Names

Nodes advertise capabilities in `/status` and `/node/identity`:

```text
health
status
node.identity
pairing
pairing.remote-code
hardware
models
models.pull
models.delete
chat.completions
tunnels.status
tunnels.trycloudflare
metrics
nodes.registration
nodes.heartbeat
```

Unknown capabilities should be ignored by clients and preserved by registries when safe.

## Required Response Shape

`GET /health`:

```json
{
  "status": "online",
  "service": "mmir-local-node",
  "version": "0.1.0",
  "mode": "local",
  "timestamp": "2026-05-23T00:00:00.000Z"
}
```

`GET /status`:

```json
{
  "status": "online",
  "service": "mmir-local-node",
  "version": "0.1.0",
  "mode": "local",
  "provider": "local-node",
  "contract_version": "0.1",
  "capabilities": ["health", "models", "chat.completions"],
  "limits": {
    "max_messages": 64,
    "max_prompt_chars": 24000,
    "streaming": true
  }
}
```

`GET /models`:

```json
{
  "object": "list",
  "provider": "local-node",
  "source": "ollama",
  "data": [
    {
      "id": "llama3.2:1b",
      "name": "llama3.2:1b",
      "provider": "ollama",
      "status": "available",
      "source": "local",
      "capabilities": ["chat"],
      "recommended": true,
      "resources": {
        "estimated_ram_gb": 4,
        "fits_memory": true,
        "disk_label": "1.3 GB"
      }
    }
  ]
}
```

`POST /chat/completions` request:

```json
{
  "model": "llama3.2:1b",
  "messages": [{ "role": "user", "content": "Hello" }],
  "stream": false,
  "temperature": 0.7,
  "metadata": { "workspace_id": "personal" }
}
```

Response should follow OpenAI-compatible `chat.completion` shape with `choices[0].message.content`. Streaming uses SSE with `data: {"choices":[{"delta":{"content":"..."}}]}` and final `data: [DONE]`.

## Error Envelope

```json
{
  "error": {
    "code": "runtime_unavailable",
    "message": "Ollama is not available on the configured local URL.",
    "request_id": "req_abc123"
  }
}
```

Never return stack traces, provider headers, tokens or secrets.

## Security Rules

- Bind local nodes to `127.0.0.1` by default.
- Never expose raw model runtime ports such as Ollama `11434` publicly.
- Remote/tunnel access must still use MMIR node endpoints with pairing/auth.
- Public tunnel control is disabled by default and requires explicit local opt-in.
- Cross-device pairing uses short-lived one-time codes created on the node device.
- Provider keys, tunnel tokens and API keys are server-side references only.
- Node metadata must not include serial numbers, hostnames, private IP inventories or secrets.
- Paid or unknown-cost routes stay blocked until explicit approval and budget gates pass.
- CORS should allow `https://mmir.ai`, `https://inkognitroz.github.io`, localhost dev origins and no-origin local tools only.

## Conformance Checklist

A node is MMIR-compatible when:

1. `GET /health` returns 200 and required fields.
2. `GET /status` returns capabilities, mode, limits and `contract_version` without secrets.
3. `GET /node/identity` returns public-safe metadata.
4. Protected routes reject missing/invalid pairing tokens.
5. `POST /pair` succeeds only locally or with valid one-time remote code.
6. `GET /models` returns normalized live models or safe `503 runtime_unavailable`.
7. `POST /chat/completions` validates messages and returns OpenAI-compatible JSON or SSE.
8. Malformed/oversized payloads return stable error envelopes.
9. Optional routes appear only when advertised in capabilities.
10. No response leaks provider keys, tunnel tokens, stack traces or raw runtime internals.

## Recommended New Node Repo Shape

```text
README.md
AGENTS.md
.env.example
src/contracts.*
src/server.*
test/conformance.*
docs/ARCHITECTURE.md
docs/CONNECT_TO_MMIR.md
docs/ZERO_TRUST.md
.github/workflows/quality.yml
```
