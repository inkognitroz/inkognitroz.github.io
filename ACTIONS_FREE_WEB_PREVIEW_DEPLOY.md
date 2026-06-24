# Actions-free web preview deploy

Use this lane when GitHub Actions minutes are exhausted or when a low-risk preview needs to ship without waiting for Pages. It deploys only the public static shell to a separate `workers.dev` preview Worker.

This lane does not update `mmir.ai`, does not bind a custom domain, does not change DNS, and does not enable paid providers.

## When to use it

- GitHub Actions quota is exhausted or intentionally paused.
- The change is public-safe frontend code, public manifests, or static assets.
- The goal is a demoable preview URL before the GitHub Pages deploy lane is available again.

Do not use it for secrets, private owner tools, paid-route activation, DNS changes, or public economic/token claims.

## Commands

Run from this repository root:

```bash
npm run check
npx wrangler deploy --config cloudflare/wrangler.production-preview.jsonc --dry-run
npx wrangler deploy --config cloudflare/wrangler.production-preview.jsonc
MMIR_STAGING_COUNCIL_URL="https://mmir-web-production-preview.halvord-vinger.workers.dev/mmir.html" \
  MMIR_STAGING_COUNCIL_SCREENSHOTS="test-results/worker-prod-preview-council-live" \
  npm run smoke:staging-council-live
```

Expected preview URL:

```text
https://mmir-web-production-preview.halvord-vinger.workers.dev/mmir.html
```

## Guardrails

- Keep `cloudflare/wrangler.production-preview.jsonc` on `workers_dev: true`.
- Do not add `routes`, `custom_domain`, or zone bindings to the preview config.
- Keep observability disabled unless there is a specific debugging reason.
- Do not run workflows from this lane; it exists specifically to avoid Actions burn.
- Avoid KV probe writes while the KV free-tier headroom is low.

## Verification

A preview is ready to share only after:

- local checks pass,
- Wrangler dry-run passes,
- direct Wrangler deploy succeeds,
- live Council smoke passes against the `workers.dev` URL,
- the result is clearly labeled as a preview if shared outside the team.

If the smoke fails, keep `mmir.ai` unchanged and debug the preview Worker or frontend locally.

## Rollback

Because this lane has no custom domain, rollback is low risk:

- redeploy the previous good commit with the same Wrangler config, or
- use Cloudflare Worker version rollback for `mmir-web-production-preview`.

Do not promote the preview to a production route without an explicit owner route decision.
