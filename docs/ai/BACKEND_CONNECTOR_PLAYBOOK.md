# Mimir backend connector playbook

## Goal
Mimir must connect to many independent LLM backends, not one hardcoded VM, provider or model. Each backend should be a replaceable service that exposes the same small contract and can be registered in the frontend or a future protected registry.

## Backend types
Start with these backend families:

| Backend type | Good for | Notes |
|---|---|---|
| OCI VM + Open WebUI + Ollama | First hosted VM experiment | Keep Ollama internal behind Open WebUI. |
| Local Ollama | Local development and model testing | Usually needs browser CORS handling for direct frontend testing. |
| Hugging Face Spaces | Simple public prototype | Good for demos, not for secrets unless using protected Space secrets. |
| Railway / Render / Fly.io | Lightweight hosted API proxy | Good for FastAPI/Node connector services. |
| GitHub Codespaces | Temporary development backend | Not production hosting. Useful for testing connector contract. |
| Future Mimir Model Router | Production routing across providers | Secrets, auth, RAG and metrics live server-side. |

## Standard connector contract
Every backend should aim to expose:

```http
GET /health
GET /models
POST /chat
GET /metrics
```

### GET /health
Returns operational status without exposing secrets.

```json
{
  "status": "ready",
  "service": "mimir-backend-template",
  "version": "0.1.0",
  "provider": "ollama",
  "timestamp": "2026-05-17T08:00:00Z"
}
```

### GET /models
Returns available or configured models.

```json
{
  "provider": "ollama",
  "models": [
    { "id": "llama3.1", "label": "Llama 3.1", "status": "available" }
  ]
}
```

### POST /chat
Accepts a model and messages. Model must be dynamic, not hardcoded.

```json
{
  "model": "llama3.1",
  "messages": [
    { "role": "user", "content": "Hei" }
  ],
  "stream": false,
  "temperature": 0.2
}
```

Returns a normalized answer:

```json
{
  "provider": "ollama",
  "model": "llama3.1",
  "content": "Hei!",
  "latency_ms": 1200,
  "usage": {
    "input_tokens": null,
    "output_tokens": null
  }
}
```

### GET /metrics
Optional in v1. Returns safe operational metrics.

```json
{
  "status": "ready",
  "requests_total": 42,
  "avg_latency_ms": 1450,
  "last_checked_at": "2026-05-17T08:00:00Z"
}
```

## Frontend profile fields
The Mimir frontend may store these fields locally:

- backend name
- backend URL
- provider type
- model notes
- capability notes
- latency target
- throughput target
- uptime target
- health status
- key reference label, not actual key

Never store real keys or provider secrets in GitHub Pages frontend.

## Security rules
1. No provider API keys in frontend code.
2. No OCI credentials in frontend code.
3. No private RAG sources in the public repo.
4. Auth, rate limiting and provider secrets belong in the backend service.
5. Public backends must be protected before real use.
6. Direct browser-to-Ollama calls are fine for local testing but not the preferred production path.

## Recommended repo split
Use separate backend repos for reusable services:

```text
mimir-frontend / inkognitroz.github.io
  public Mimir Chat UI
  local backend profiles
  no secrets

mimir-backend-template
  FastAPI/Node backend contract
  provider adapters
  server-side environment variables

iac-autoprov
  infrastructure provisioning
  OCI VM, Open WebUI, Ollama
```

## Next implementation step
Create `mimir-backend-template` with a minimal FastAPI implementation:

```text
GET /health
GET /models
POST /chat
GET /metrics
```

Then register each deployed instance in Mimir Chat as a backend profile.
