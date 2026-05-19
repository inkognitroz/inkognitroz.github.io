# Mimir connector template — Node.js (Express)

A minimal, self-contained Node.js service that implements the Mimir backend connector contract.
Deploy this on Railway, Render, Fly.io, an OCI VM, a Codespace, or any Node.js-capable host.

## What this template does

- Exposes `GET /health`, `GET /models`, `POST /chat`, and `GET /metrics`
- Routes chat requests to a local Ollama instance or an OpenAI-compatible API
- Reads all credentials from environment variables — never from the request or the repo
- Returns a common Mimir response shape regardless of the underlying provider

## Prerequisites

- Node.js 18 or later
- An Ollama instance **or** an OpenAI-compatible API key

## Quick start

```bash
# 1. Copy the template files
cp app.js package.json /your/project/

# 2. Install dependencies
npm install

# 3. Set environment variables (see below)
export PROVIDER=ollama
export OLLAMA_BASE_URL=http://localhost:11434

# 4. Start the service
npm start
```

The service listens on port `3000` by default (override with `PORT=8080 npm start`).

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | no | `3000` | HTTP port to listen on |
| `PROVIDER` | no | `ollama` | `ollama` or `openai-compat` |
| `OLLAMA_BASE_URL` | if `PROVIDER=ollama` | `http://localhost:11434` | Ollama base URL |
| `OPENAI_BASE_URL` | if `PROVIDER=openai-compat` | `https://api.openai.com/v1` | OpenAI-compatible base URL |
| `OPENAI_API_KEY` | if `PROVIDER=openai-compat` | — | Your API key (never committed) |
| `DEFAULT_MODEL` | no | `llama3.1` | Fallback model when request omits one |
| `CORS_ORIGIN` | no | `*` | Restrict CORS to your frontend origin in production |

> **Security:** Never commit real values for `OPENAI_API_KEY` or any secret variable.
> Store them in your platform's secret/environment variable store.

## Deploying to Railway

1. Push this folder to a GitHub repository.
2. Create a new Railway project and connect the repository.
3. Add environment variables in Railway's **Variables** panel.
4. Railway auto-deploys on push.

## Deploying to Fly.io

```bash
fly launch --no-deploy
fly secrets set PROVIDER=openai-compat OPENAI_API_KEY=sk-...
fly deploy
```

## Deploying to Render

1. Create a new **Web Service** in Render.
2. Connect the GitHub repo.
3. Set environment variables in Render's **Environment** tab.
4. Deploy.

## Testing the endpoints

```bash
# Health check
curl http://localhost:3000/health

# List models
curl http://localhost:3000/models

# Send a chat message
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.1","messages":[{"role":"user","content":"Hello"}]}'

# Metrics
curl http://localhost:3000/metrics
```

## Registering this service in Mimir

Once deployed, follow [`../MIMIR_REGISTRY_GUIDE.md`](../MIMIR_REGISTRY_GUIDE.md) to add this service to the Mimir backend registry.

Use the deployed URL (e.g. `https://my-service.up.railway.app`) as the backend URL in the Mimir UI.
