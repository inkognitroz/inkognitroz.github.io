# Ollama setup guide

## Goal
Run local AI models that can be selected from MMIR without sending prompts to cloud providers.

## Install
1. Install Ollama on the machine that will run local models.
2. Start Ollama.
3. Pull at least one model.

Example commands:

```bash
ollama pull llama3.1
ollama pull mistral
ollama pull codellama
ollama list
```

## Local endpoint
Default endpoint:

```text
http://localhost:11434
```

Useful endpoints:

```text
GET  /api/tags
POST /api/chat
```

## Browser/CORS note
A static GitHub Pages frontend may not be allowed to call a local Ollama endpoint unless Ollama allows the browser origin.

Recommended safer options:
- use local development first;
- add a small local model-router backend later;
- keep all provider secrets server-side;
- never put hosted model keys in frontend files.

## First test
1. Open Ollama Chat Lab.
2. Set endpoint to `http://localhost:11434`.
3. Click Load models.
4. Choose a model.
5. Send a short prompt.

## Troubleshooting
- No models: run `ollama list` and `ollama pull llama3.1`.
- Cannot connect: verify Ollama is running.
- Browser blocked: configure local access/CORS or use a local router backend.
- Slow response: try a smaller model.

## Production path
For a hosted SaaS version, route model calls through a backend:

```text
Browser -> /api/ai/chat -> provider/router -> model
```

This keeps secrets out of the browser and allows auth, logging, rate limits and workspace isolation.
