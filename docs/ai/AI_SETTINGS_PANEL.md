# AI settings panel plan

## Goal
Define a future Admin/Settings panel for managing AI provider choices safely without exposing secrets in frontend code.

## User controls
- Preferred provider
- Preferred model
- Default system prompt
- Temperature
- Max output tokens
- Streaming on/off
- Local-only mode
- RAG sources enabled/disabled
- Session export/import

## Provider controls
- Ollama local endpoint URL
- Model registry refresh
- Model health check
- Latency test
- Recommended model marker

## Safety controls
- No browser-stored hosted API keys by default.
- Hosted providers require server-side environment variables.
- Warn before sending private content to cloud models.
- Clear local session storage.
- Export user data as JSON.

## v1 static implementation
- Store local settings in localStorage.
- Read public model registry from `/ai-models.json`.
- Allow only local Ollama calls directly from browser.
- Show hosted providers as disabled until a backend router exists.

## v2 backend implementation
- Store workspace settings server-side.
- Add auth and workspace isolation.
- Add encrypted provider credentials server-side if needed.
- Add audit logging and rate limits.

## Acceptance criteria
- User can select local model defaults.
- No secrets are stored in the public repo.
- Settings are portable through export/import.
- Hosted models remain disabled until secure backend exists.
