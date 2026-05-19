# Mimir registry guide

## Goal

Explain how to register a new backend service in Mimir so the frontend can connect to it.

---

## What is the Mimir registry?

The registry is a list of backend metadata entries. It has two layers:

| Layer | Location | Purpose |
|---|---|---|
| **Static reference registry** | `public/ai-backends.json` | Shared safe defaults and example entries committed to the repo |
| **Live user registry** | `localStorage` (`mimir-chat-backend-profiles`) | User-added and user-managed backends, stored in the browser |

The static registry seeds starter examples. The live registry holds the user's actual configured backends.

---

## Step 1 — Deploy a connector-compatible backend

Your backend service must implement the required endpoints from the connector contract:

- `GET /health` — returns `{ "status": "ok" }`
- `GET /models` — returns list of available models
- `POST /chat` — accepts messages and returns a reply

See [`BACKEND_CONNECTOR_PATTERN.md`](BACKEND_CONNECTOR_PATTERN.md) for full schemas.
See [`connector-template/`](connector-template/) for a ready-to-deploy Node.js example.

---

## Step 2 — Add the backend to the static reference registry

Edit `public/ai-backends.json` and add an entry to the `backends` array.

**Required fields:**

```json
{
  "id": "my-backend-id",
  "name": "My backend display name",
  "url": "https://my-backend.example.com",
  "provider": "open-webui",
  "models": "Llama 3.1, Gemma 2",
  "keyRef": "ENV_VAR_NAME_NOT_THE_VALUE",
  "health": "unknown"
}
```

**Optional fields:**

```json
{
  "cost": "Always Free A1 shape",
  "latency": "< 2s first token",
  "throughput": "~30 tok/s",
  "uptime": "best-effort",
  "notes": "Short description of this backend's purpose or constraints"
}
```

**Provider values:**

| Value | Use when |
|---|---|
| `open-webui` | OCI VM running Open WebUI |
| `ollama` | Direct Ollama endpoint |
| `ollama-openai` | Ollama with OpenAI-compatible API |
| `codespaces` | GitHub Codespaces or dev container |
| `huggingface` | Hugging Face Spaces proxy |
| `railway` | Railway.app API proxy |
| `render` | Render.com API proxy |
| `fly` | Fly.io API proxy |
| `local` | Local machine or LAN endpoint |
| `custom` | Any other connector-compatible service |

> **Security:** the `url` field should point to your deployed backend, not directly to a provider API with a secret key in it. Always use a server-side proxy. Never put real API keys in `keyRef` — use the environment variable name only.

---

## Step 3 — Register the backend in the Mimir UI

1. Open the Mimir chat interface (`public/index.html` or the deployed site).
2. Click **Backends** in the top navigation.
3. Click **Add backend**.
4. Fill in the backend URL, provider type, and model notes.
5. Click **Save**, then **Set active** to start using it.

The UI stores this configuration in your browser's `localStorage` — no server required.

---

## Step 4 — Verify the connection (optional, manual)

Once added, you can verify connectivity by opening the backend URL directly in your browser and checking:

```
GET https://my-backend.example.com/health
```

You should see `{ "status": "ok" }` or similar.

---

## Registry schema reference

See `public/ai-backends.json` for the full versioned schema and example entries.

---

## Security checklist

Before registering a public-facing backend:

- [ ] No API keys or service tokens in `ai-backends.json` or any frontend file
- [ ] Backend service reads secrets from environment variables only
- [ ] `/health`, `/models`, `/chat` endpoints do not expose internal credentials
- [ ] Rate limiting and authentication configured for production use
- [ ] CORS restricted to expected frontend origins in production
- [ ] URL uses `https://` (not `http://`) in production
