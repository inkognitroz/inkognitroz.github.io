# Supabase architecture for MMIR (optional persistence path)

## Decision summary

MMIR stays local-first and static-safe by default. Supabase is an optional future persistence layer for authenticated workspaces, shared data and product features that need database, auth or storage.

Chosen architecture: hybrid path.

- Keep GitHub Pages and localStorage fallback working without Supabase.
- Use Supabase anon key plus RLS only for user-owned app data.
- Use a protected backend/serverless layer for privileged operations, service role access, signed storage URLs, webhooks and admin workflows.

## Why this matters

MMIR is a trusted AI control plane. Persistence must not weaken that trust boundary.

- Public frontend can hold non-sensitive preferences and anon/public configuration.
- Secrets, service-role keys and provider credentials must stay server-side.
- RLS and workspace membership must protect all user/workspace records.
- Backend mediation is required when authority is broader than the current user.

## Data scope

Phase 1:
- user accounts and workspace membership
- app/workflow records owned by a workspace
- optional Football Evolution Matrix datasets

Phase 2:
- uploaded workspace assets in private storage
- signed read/write flows through the backend

Phase 3:
- collaborative content drafts
- export-to-static publishing workflows for `public/content.json`

## Initial table model

- `profiles`: one row per auth user
- `workspaces`: owner-scoped workspace records
- `workspace_members`: role membership (`owner`, `editor`, `viewer`)
- `workflow_records`: MMIR workflow definitions and metadata
- `knowledge_sources`: metadata for approved source ingestion
- `uploaded_assets`: private storage metadata tied to workspace membership

## RLS policy model

- Enable RLS on every application table.
- Reads require workspace membership.
- Writes require `owner` or `editor` role.
- Deletes of shared workspace records should require owner role or backend-mediated policy.
- Storage access should be private by default and checked against workspace membership.

## Environment variable strategy

Frontend-safe:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Server-only:
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- webhook secrets
- provider/API/billing credentials

## Security checklist

- [ ] No service role key in frontend code or `public/` assets
- [ ] RLS enabled on all app tables
- [ ] Policies restricted by workspace membership and role
- [ ] Private storage bucket with signed URL flow where needed
- [ ] Secrets configured only in backend/serverless runtime
- [ ] Local-first fallback still works when Supabase is absent
- [ ] Export/delete controls exist for user-owned workspace data
