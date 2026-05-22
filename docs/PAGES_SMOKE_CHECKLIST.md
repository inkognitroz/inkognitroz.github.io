# GitHub Pages Smoke Checklist

Use this checklist after changing repository visibility, Pages settings, custom domain, Cloudflare DNS or the Pages workflow.

## Expected State

- Repository visibility is intentional.
- Settings > Pages > Source is `GitHub Actions`.
- The `Deploy GitHub Pages` workflow is green on `main`.
- `public/CNAME` contains `mmir.ai`.
- The Pages artifact is uploaded from `./public`.
- Cloudflare DNS points the public domain to the Pages origin setup.
- Cloudflare SSL/TLS mode is `Full` or `Full (strict)`, not `Flexible`.

## Manual Smoke Test

Test these URLs in a private/incognito browser window:

- `https://inkognitroz.github.io`
- `https://mmir.ai`
- `https://www.mmir.ai` if `www` is enabled

Expected result:

- Page loads without GitHub 404.
- Browser shows HTTPS lock.
- Title is `MMIR.ai`.
- The first screen is the MMIR public app shell.
- The `Platform Status` panel can load `platform-status.json`.
- No browser console errors block the main UI.

## If GitHub Pages Works But `mmir.ai` Fails

The problem is probably custom domain, DNS or Cloudflare.

Check:

- Settings > Pages > Custom domain is `mmir.ai`.
- DNS check is successful.
- Cloudflare cache has been purged.
- Cloudflare SSL/TLS is `Full` or `Full (strict)`.
- DNS records are not split between old and new origins.

## If `mmir.ai` Returns A Corporate URL-Filter Page

Some networks block newly registered domains before reputation systems have caught up. This can look like a `503`, but the HTML body will say the page was blocked by a URL filter and may classify `mmir.ai` as `newly-registered-domain`.

Check:

- Test from a phone hotspot or another network.
- Ask the network/security team to allowlist `mmir.ai`.
- Keep `https://inkognitroz.github.io` available only as a diagnostic; GitHub Pages will redirect it to the custom domain while `public/CNAME` is present.
- Do not change app code to fix this category of failure unless the off-network test also fails.

## Status Panel Interpretation

The public `Platform Status` panel separates status into layers:

- `MMIR public site`: the static Pages app shell and manifest.
- `GitHub Pages origin`: the Pages redirect/origin layer.
- `Domain reputation`: network filtering and newly registered domain issues.
- `Managed API`: future `api.mmir.ai` health.
- `Local node`: only checked when a browser has an active backend profile.

If the app shell loads but the active backend is offline, fix the backend/local node rather than the domain. If only the domain reputation row is a problem, test from another network or request allowlisting.

## If Both URLs Fail

The problem is probably Pages deployment or repository visibility.

Check:

- The latest `Deploy GitHub Pages` workflow run.
- Pages source is still `GitHub Actions`.
- The workflow uploads `./public`.
- `public/index.html` exists.
- Repository visibility change did not unpublish Pages.

## Recovery Order

1. Keep the repository public until the site is stable again.
2. Re-run `Deploy GitHub Pages` from Actions.
3. Save `mmir.ai` again under Settings > Pages > Custom domain.
4. Purge Cloudflare cache.
5. Test `https://inkognitroz.github.io` before debugging `https://mmir.ai`.
6. Only change visibility again after both URLs are confirmed working.
