# Supabase setup (future SaaS Fabric apps)

Use Supabase when moving from static hub to product backends:
- PostgreSQL database
- Authentication
- Storage
- Row Level Security (RLS)

For the SaaS Fabric public hub (v1), no backend is required.

Security rules:
- Never place Supabase `service_role` keys in frontend code.
- Never place GitHub tokens in frontend code.
- Never place Stripe secret keys in frontend code.
- Use GitHub Secrets, Vercel env vars, Netlify env vars, or secure server-side code.
