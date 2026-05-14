# SaaS Fabric blueprint (future)

## v1 (now)
- GitHub repository as source of truth
- GitHub Pages publishes `/public`
- Static, safe, no backend required
- Content managed in one file: `public/content.json`

## Positioning
SaaS Fabric is a platform for creating, organizing, publishing and eventually monetizing:
- Apps and SaaS products
- Websites and landing pages
- Dashboards and internal tools
- Templates and Excel/CSV-based tools
- AI-assisted apps and client portals

## Future platform stack
- **Code + tasks:** GitHub repositories + GitHub Issues
- **Public hub:** GitHub Pages (`/public`)
- **Apps / products:** Vercel or Netlify
- **Backend:** Supabase (database, auth, storage, RLS)
- **Payments:** Stripe subscriptions + one-time purchases
- **Execution loop:** Prompt Inbox -> Issue -> AI-assisted PR -> Review -> Deploy
