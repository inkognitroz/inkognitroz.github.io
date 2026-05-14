# inkognitroz.github.io

Public home of **SaaS Fabric by Inkognitroz**.

## Brand
- **Name:** SaaS Fabric
- **Subtitle:** Build, publish and monetize apps, tools and SaaS products.

## What this is
A simple, stable, GitHub Pages-compatible v1 platform built with HTML/CSS/JS. It renders dynamically from one file: `/public/content.json`.

SaaS Fabric is positioned as a platform for creating, organizing, publishing and eventually monetizing many apps, websites, SaaS products, dashboards, tools, templates, Excel/CSV-based tools, AI-assisted apps, client portals and internal tools.

## Quick start
1. Edit `/public/content.json`.
2. Optional: open `/public/admin.html` locally for card editing, preview, CSV import, and JSON export.
3. Commit and merge to `main`.
4. GitHub Actions deploys `/public` to `https://inkognitroz.github.io/`.

## Main sections
Home, App Factory, SaaS Ideas, Projects, Templates, Tools, Dashboards, Uploads / Files, Prompt Inbox, Monetization, Roadmap, About.

## Structure
- `public/index.html` - public platform hub
- `public/admin.html` - local browser content editor
- `public/content.json` - single source of content
- `public/assets/` - CSS and JS
- `.github/workflows/pages.yml` - Pages deployment (publishes `/public`)
- `docs/` - operations and platform docs

## Security
Read `docs/SECURITY.md` before adding any integrations.
Never commit API keys or frontend secrets.

## Live checklist
After every merge, run the live checklist.
See `docs/LIVE_TEST_CHECKLIST.md`.
