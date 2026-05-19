# Route inventory

All routes are static files published from `/public` to GitHub Pages (`https://inkognitroz.github.io/`).

## Public routes

| Path | File | Purpose | Audience |
|------|------|---------|----------|
| `/` | `public/index.html` | Mimir Chat — AI chat frontend, model library, backend profiles | Public |
| `/admin.html` | `public/admin.html` | Mimir Admin — content editor, JSON export, backup/restore | Internal |
| `/internal.html` | `public/internal.html` | Mimir Internal Tools — tools, roadmap, app factory, ideas | Internal |

## App routes (internal/side-project tools)

| Path | File | Purpose |
|------|------|---------|
| `/apps/mimir-chat-portal/` | `public/apps/mimir-chat-portal/index.html` | Mimir Chat Portal — legacy backend config page |
| `/apps/open-web-gui/` | `public/apps/open-web-gui/index.html` | Open Web GUI — Ollama endpoint tester |
| `/apps/ollama-chat-lab/` | `public/apps/ollama-chat-lab/index.html` | Ollama Chat Lab — local AI chat with session export |
| `/apps/app-template-generator/` | `public/apps/app-template-generator/index.html` | App Template Generator — Mimir app planning tool |
| `/apps/football-evolution-matrix/` | `public/apps/football-evolution-matrix/index.html` | Football Evolution Matrix — football analytics app |

## Navigation hierarchy

```
/ (Mimir Chat — public, chat-first)
├── → /admin.html (Mimir Admin — internal)
│       └── → /internal.html (Mimir Internal Tools)
│       └── → /apps/open-web-gui/
│       └── → /apps/ollama-chat-lab/
│       └── → /apps/app-template-generator/
│       └── → /apps/football-evolution-matrix/
└── /internal.html (Mimir Internal Tools — internal)
        └── → / (Mimir Chat)
        └── → /admin.html (Mimir Admin)
```

## Static assets

| Path | Purpose |
|------|---------|
| `/assets/styles.css` | Global stylesheet |
| `/assets/app.js` | Content rendering for admin and internal pages |
| `/assets/theme.js` | Theme picker and persistence (admin/internal pages) |
| `/assets/onboarding.js` | Guided onboarding widget (admin/internal pages) |
| `/assets/usage-analytics.js` | Local-only usage analytics |
| `/content.json` | Single source of content for internal/admin pages |
| `/ai-models.json` | Static AI model registry |
| `/ai-model-catalog.json` | Extended model catalog |
| `/ai-backends.json` | Backend profile registry |

## Notes

- `/` (Mimir Chat) is chat-first and loads only `mimir-chat-portal.js` and `model-catalog-ui.js` — no `app.js` or `theme.js`.
- `/admin.html` and `/internal.html` load `app.js`, `onboarding.js`, and `theme.js`.
- All internal tools are linked from `/admin.html` (Admin launchpad), not from the public homepage.
- No secrets or backend credentials are stored in any frontend file.
