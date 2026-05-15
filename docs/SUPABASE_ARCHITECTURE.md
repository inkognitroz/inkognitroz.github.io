# Supabase architecture for SaaS Fabric (v1 fallback + v2 path)

## Decision summary

**Chosen architecture: Hybrid path**
- Keep **v1 static/localStorage fallback** as default for GitHub Pages.
- Use Supabase with **anon key + RLS** for authenticated, user-scoped app operations.
- Use a **server/serverless layer** for privileged operations (service role usage, admin writes, signed storage flows, webhooks).

This keeps GitHub Pages compatibility while enabling a safe migration to multi-user persistence.

## Why this decision

- **Static-only** is safest and cheapest, but cannot provide shared multi-device persistence.
- **Direct Supabase only (frontend anon key + RLS)** works for some user-owned CRUD, but not for privileged tasks.
- **Serverless/backend mediation** is required for any `service_role` usage and advanced storage/admin workflows.

Result: use direct anon+RLS where safe, and backend endpoints where privilege is required.

## Data scope (what goes to Supabase first)

Phase 1 (first to move):
1. **Football Evolution Matrix datasets** (user/workspace-owned records)
2. **User accounts/workspaces** (Auth + membership tables)

Phase 2:
3. **Uploaded files/assets** (Supabase Storage bucket + metadata table)

Phase 3 (optional):
4. **SaaS Fabric content cards** for collaborative editing workflows  
   - Public site can still ship `public/content.json` as deployment artifact.

## Proposed schema (initial)

```sql
-- profiles mapped to Supabase auth users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table public.football_datasets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  name text not null default 'Dataset',
  payload jsonb not null, -- mirrors current matrix structure
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.uploaded_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  bucket text not null default 'workspace-assets',
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

-- Optional collaborative content editing table (phase 3)
create table public.content_cards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  section_key text not null,
  title text not null,
  description text not null,
  link text not null,
  tags text[] not null default '{}',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## RLS policy model (example)

Enable RLS:

```sql
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.football_datasets enable row level security;
alter table public.uploaded_assets enable row level security;
alter table public.content_cards enable row level security;
```

Membership helper:

```sql
create or replace function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id
      and wm.user_id = auth.uid()
  );
$$;
```

Representative policies:

```sql
-- workspaces
create policy "workspace members can read workspace"
on public.workspaces for select
using (public.is_workspace_member(id));

create policy "owner can update workspace"
on public.workspaces for update
using (owner_id = auth.uid());

-- workspace_members
create policy "members can read memberships"
on public.workspace_members for select
using (public.is_workspace_member(workspace_id));

-- football_datasets
create policy "members can read datasets"
on public.football_datasets for select
using (public.is_workspace_member(workspace_id));

create policy "editors+ can write datasets"
on public.football_datasets for insert
with check (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = football_datasets.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
  )
);

create policy "editors+ can update datasets"
on public.football_datasets for update
using (
  exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = football_datasets.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'editor')
  )
);
```

Storage bucket guidance:
- Bucket: `workspace-assets`
- Prefer **private bucket**
- Allow upload/read only through policies tied to workspace membership
- Use signed URLs from backend when needed for controlled sharing

## Environment variable strategy

Frontend-safe (public):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Server-only (never in frontend, never in `public/`):
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL` (if needed)
- any webhook/secret keys

Rules:
- Do not hardcode secrets in repo.
- `service_role` must exist only in server/serverless runtime environment.
- GitHub Pages static frontend must not contain server secrets.

## Hosting and cost implications

- **GitHub Pages only**: supports static fallback and optional public read-only patterns, but no secure server-side secret handling.
- **Netlify/Vercel/Cloudflare Workers/functions (or own backend)**: required for privileged writes, signed URLs, admin workflows, and webhook processing.
- Supabase costs will scale with:
  - database rows and egress
  - storage size and transfer
  - auth usage
  - function invocations (if using edge/functions)

## Migration path

### Football Evolution Matrix
1. Keep current localStorage-first UX.
2. Add optional login button (feature-flagged).
3. If logged in and Supabase config exists, sync dataset to `football_datasets`.
4. Keep import/export JSON as offline safety net.
5. If Supabase unavailable, continue local mode with clear status message.

### Admin page (`public/admin.html`)
1. Keep editing `public/content.json` workflow unchanged for v1.
2. Introduce optional workspace-backed draft editing using `content_cards` (phase 3).
3. Add “export to static `content.json`” release step for GitHub Pages publishing.

## Compatibility requirements for v1

- Static site must remain fully functional without Supabase.
- localStorage and file import/export remain supported.
- No backend requirement for default GitHub Pages usage.

## Security checklist

- [ ] No `service_role` in frontend code
- [ ] RLS enabled on all app tables
- [ ] Policies restricted by workspace membership/role
- [ ] Storage bucket privacy and access policies validated
- [ ] Secrets configured only in server environment
