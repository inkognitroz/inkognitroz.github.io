# inkognitroz.github.io

Personal app factory and publishing hub.

## What this is
A simple, stable, GitHub Pages-compatible public site built with HTML/CSS/JS. It renders dynamically from one file: `/public/content.json`.

## Quick start
1. Edit `/public/content.json`.
2. Optional: open `/public/admin.html` locally for card editing, preview, CSV import, and JSON export.
3. Commit and merge to `main`.
4. GitHub Actions deploys `/public` to GitHub Pages.

## Structure
- `public/index.html` - public hub
- `public/admin.html` - local browser content editor
- `public/content.json` - single source of content
- `public/assets/` - CSS and JS
- `.github/workflows/pages.yml` - Pages deployment
- `docs/` - setup and workflow docs

## Prompt inbox workflow
Store prompts in `Prompt inbox`, then paste into GitHub Issues, Copilot, Codex, Claude Code, or ChatGPT to generate PR-ready updates.

## Security
Read `docs/SECURITY.md` before adding any integrations or environment variables.
