# Backup and connected repositories

This guide covers safe backup practices for this repository and any connected repositories that support SaaS Fabric delivery.

## Goals
- Keep recoverable copies of content and docs.
- Keep pull requests small and reviewable.
- Keep v1 static, GitHub Pages-compatible, and secret-free.

## Repository backup baseline (this repo)
1. Use `/public/admin.html` to export:
   - `content.json`
   - optional structured backup bundle
2. Commit exported updates through a pull request.
3. Treat merged PR history as your audited backup trail.
4. Before risky edits, create a dated branch (for example `backup/2026-05-22-content-snapshot`) and commit current state.

## Pull request flow (recommended)
1. Create a short-lived branch per task.
2. Limit scope to one objective (content update, docs update, or one app change).
3. Run static checks before opening/merging:
   - JSON validation
   - JS syntax checks
   - smoke checks
4. Merge only after review and passing checks.

## Connected repositories backup policy
For each connected repository (apps, integrations, or support repos):

1. Maintain the same PR-first workflow (no direct secret-bearing frontend commits).
2. Keep a `BACKUP.md` or equivalent section in README that states:
   - what data/config must be backed up
   - backup/export command or process
   - restore steps
   - owner/responsible person
3. Use release tags or periodic snapshot branches for restore points.
4. Keep dependency and infra changes separate from content/product changes.

## What to back up
- Source code and docs (`git` history + tags).
- Static data artifacts (for this repo: `/public/content.json` and backup bundle exports).
- Deployment config (`.github/workflows`, hosting config files).
- Environment-variable key names (never values), documented in secure runbooks.

## What not to back up in-repo
- Real secrets, tokens, API keys, private certificates.
- Any credential material in public/frontend directories.

## Restore drill (lightweight)
Run this quarterly across this repo and connected repos:
1. Pick latest known-good tag/commit.
2. Restore to a temporary branch.
3. Run repository validation checks.
4. Confirm Pages/static output integrity.
5. Record outcome and gaps in an issue.

## Security guardrails
- Read and follow `docs/SECURITY.md`.
- Keep v1 static-first and non-technical-user friendly.
- Use server-side secret storage only for future backend-connected flows.
