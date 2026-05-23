# Supabase setup (future MMIR apps)

Use Supabase when moving from static hub to product backends:
- PostgreSQL database
- Authentication
- Storage
- Row Level Security (RLS)

For the MMIR public hub (v1), no backend is required.

Architecture decision, schema, RLS, hosting tradeoffs, and migration path:
- `docs/SUPABASE_ARCHITECTURE.md`

Supabase-specific security rule:
- Never place Supabase `service_role` keys in frontend code.

For broader secret management rules (GitHub tokens, Stripe secret keys, env storage), follow `docs/SECURITY.md`.
