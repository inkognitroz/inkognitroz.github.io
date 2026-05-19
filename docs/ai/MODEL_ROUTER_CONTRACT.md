# Model router contract

## Goal
Define the portable backend API and connector contract used behind stable ingress (`api.mmir.ai`) for local, hosted, and edge AI runtimes.

`mimir-backend-template` is **not** an API Gateway. It remains the portable backend contract and provider connector layer.

## Endpoints
- `GET /health`
- `GET /models`
- `GET /status`
- `POST /chat`

## Request
```json
{
  "provider": "ollama-local",
  "model": "llama3.1",
  "system": "You are a precise assistant.",
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "options": {
    "temperature": 0.2,
    "stream": false
  }
}
```

## Response
```json
{
  "model": "llama3.1",
  "provider": "ollama-local",
  "content": "Hello.",
  "usage": {
    "input_tokens": 0,
    "output_tokens": 0
  },
  "latency_ms": 0
}
```

## Security
- Browser must never send provider secrets.
- Frontend should call controlled API endpoints only.
- Hosted providers must use server-side environment variables.
- Raw Ollama `11434` must never be public.
- Log prompts only when explicitly enabled.
- Add tenant/workspace isolation before multi-user release.

## Future providers
- OCI/Ollama adapter
- AWS adapter
- OpenAI-compatible router
- Jetson/edge adapter
- Mock fallback
