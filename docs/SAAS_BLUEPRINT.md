# MMIR Platform Blueprint

This file is kept for historical link compatibility, but the active product is MMIR.

## v1

- GitHub repository as source of truth
- GitHub Pages publishes `/public`
- Static public frontend
- No provider secrets in the browser
- Local-first onboarding through MMIR Local Node
- Smoke checks protect product identity, routes and user journeys

## Positioning

MMIR is the orchestration layer for trusted AI:

- local AI connection
- provider/model routing
- workflow orchestration
- memory and project context
- trusted nodes and runtime management
- future marketplace, billing and governance

## Future Platform Stack

- **Code + tasks:** GitHub repositories + GitHub Issues
- **Public product surface:** GitHub Pages / `mmir.ai`
- **Local runtime bridge:** MMIR Local Node
- **Managed API:** `mimir-backend-template` / `api.mmir.ai`
- **Secrets:** protected backend or local secure storage only
- **Payments:** future billing hooks behind explicit approval and backend policy
- **Execution loop:** product goal -> issue -> AI-assisted implementation -> review -> tests -> deploy
