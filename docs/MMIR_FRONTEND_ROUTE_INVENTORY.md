# MMIR frontend route inventory

## Purpose
Keep the public Mimir experience clean and separate from internal tools, prototypes and admin surfaces.

## Public route

### `/`
Role: Mimir Chat public entrypoint.

Should contain:
- Clean chat-first interface
- Active backend status
- Message composer
- Minimal quick actions
- Collapsed model library
- Collapsed backend settings
- Collapsed backend dashboard

Should not contain:
- Secrets
- Cloud credentials
- Raw provider keys
- Direct cloud provisioning actions
- Legacy MMIR navigation as primary UX

## Internal/admin routes

### `/admin.html`
Role: Mimir Admin.

Use for:
- Internal maintenance
- Content/config editing
- Internal launchpad
- Safe publishing workflow
- Future model/backend catalog admin

### `/internal.html`
Role: Mimir Internal Tools.

Use for:
- Tool prototypes
- App Template Generator
- Open Web GUI
- Ollama Chat Lab
- Football Evolution Matrix
- Legacy MMIR utilities

## App routes

### `/apps/open-web-gui/`
Role: Endpoint tester / direct browser test surface.

### `/apps/ollama-chat-lab/`
Role: Local Ollama lab and portable session testing.

### `/apps/app-template-generator/`
Role: Internal planning tool for new apps and backend ideas.

### `/apps/football-evolution-matrix/`
Role: Separate football analysis app. It should not dominate Mimir navigation.

## Design rule
All routes should gradually move toward the same Mimir light design language. Older MMIR wording should either be removed or clearly marked as legacy/internal.

## Zero Trust rule
The frontend may store local labels, profile metadata and non-sensitive preferences in browser storage. Secrets, provider keys, cloud credentials and provisioning authority belong behind protected backend/admin systems only.
