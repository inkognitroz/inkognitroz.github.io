# Model router contract

## Goal
Define the backend contract for routing chat requests to local, hosted and future enterprise AI models.

## Endpoint
`POST /api/ai/chat`

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
- Hosted providers must use server-side environment variables.
- Log prompts only when explicitly enabled.
- Add tenant/workspace isolation before multi-user release.

## Future providers
- Ollama
- OpenAI-compatible router
- OpenRouter-compatible router
- Azure OpenAI
- Local RAG service
