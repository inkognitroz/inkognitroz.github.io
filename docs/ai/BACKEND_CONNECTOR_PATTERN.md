# Mimir backend connector pattern

## Goal

Allow Mimir to connect to many independent backend services — not only OCI VMs.
Each service can expose one or more LLMs through a common connector contract and be registered in the Mimir frontend registry.

## Supported platforms

Each of the following can run a connector-compatible backend service:

| Platform | Notes |
|---|---|
| OCI VM / Open WebUI / Ollama | First supported path |
| GitHub Codespaces / dev container | Test and dev backends |
| Hugging Face Spaces | Prototype/demo backends |
| Railway / Render / Fly.io | Lightweight API proxy |
| Local machine / LAN Ollama | Always-free local option |
| Future protected model router | Enterprise/team use case |

---

## Required connector contract

Every backend service **must** expose these endpoints:

### `GET /health`

Returns service liveness.

```json
{
  "status": "ok",
  "provider": "ollama",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### `GET /models`

Returns the list of available models.

```json
{
  "models": [
    { "id": "llama3.1", "label": "Llama 3.1", "family": "Llama" },
    { "id": "gemma2", "label": "Gemma 2", "family": "Gemma" }
  ]
}
```

### `POST /chat`

Accepts a chat request and returns a response.

**Request:**
```json
{
  "model": "llama3.1",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello" }
  ],
  "options": {
    "temperature": 0.2,
    "stream": false
  }
}
```

**Response:**
```json
{
  "model": "llama3.1",
  "provider": "ollama",
  "content": "Hello! How can I help?",
  "usage": {
    "input_tokens": 12,
    "output_tokens": 8
  },
  "latency_ms": 340
}
```

### `GET /metrics` (optional)

Returns lightweight performance metrics. Not required for registration.

```json
{
  "uptime_seconds": 3600,
  "requests_total": 42,
  "avg_latency_ms": 310,
  "error_rate": 0.0
}
```

---

## Frontend registry contract

The Mimir frontend stores only **safe, non-secret** metadata for each backend.
Never store real API keys, service tokens, or credentials in this registry.

Each backend entry in the registry should contain:

| Field | Description | Example |
|---|---|---|
| `id` | Unique stable identifier | `oci-vm-open-webui` |
| `name` | Human-readable label | `OCI VM — Open WebUI` |
| `url` | Base URL for the connector endpoints | `https://chat.example.com` |
| `provider` | Backend provider type | `open-webui`, `ollama`, `custom` |
| `models` | Model/capability notes (freetext) | `Llama 3.1, Gemma 2` |
| `keyRef` | Key reference label, never the actual key | `OCI_INSTANCE_KEY` or `LOCAL_ONLY` |
| `cost` | Cost/capacity note | `Always Free A1` |
| `latency` | Latency target | `< 2s first token` |
| `throughput` | Throughput target | `~30 tok/s` |
| `uptime` | Uptime target | `best-effort` |
| `health` | Last known health status | `ready`, `unknown`, `degraded` |

> See `public/ai-backends.json` for the static reference registry and
> `public/apps/mimir-chat-portal/` for the live localStorage-backed registry.

---

## Security rules

- **No API keys in the GitHub Pages frontend.** The Mimir static site cannot and must not hold real secrets.
- Secrets must be stored **server-side** in the backend service's environment variables or the platform's secret store (Railway, Fly.io, OCI vault, etc.).
- Public endpoints must add authentication and rate limiting before production use.
- GitHub-hosted code may define service metadata, but GitHub Pages itself cannot run server-side LLM inference.
- Use `keyRef` labels (e.g. `OPENAI_API_KEY`) as documentation references only — never paste the actual values.

---

## How a connector routes a request

```text
Mimir frontend (GitHub Pages, static)
  │
  │  POST /chat  { model, messages, options }
  ▼
Connector backend (OCI VM / Railway / Fly.io / local)
  │  reads secrets from env vars
  │
  ├── ollama  → POST http://localhost:11434/api/chat
  ├── open-webui  → POST https://chat.example.com/api/chat/completions
  ├── huggingface  → POST https://api-inference.huggingface.co/models/...
  └── openai-compat  → POST https://api.openai.com/v1/chat/completions
  │
  │  returns common response  { model, provider, content, usage, latency_ms }
  ▼
Mimir frontend renders the reply
```

---

## Adding a new backend service

See [`MIMIR_REGISTRY_GUIDE.md`](MIMIR_REGISTRY_GUIDE.md) for step-by-step instructions.

See [`connector-template/`](connector-template/) for a ready-to-deploy example service.
