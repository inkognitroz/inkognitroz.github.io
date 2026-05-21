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
- No browser console errors block the main UI.

## If GitHub Pages Works But `mmir.ai` Fails

The problem is probably custom domain, DNS or Cloudflare.

Check:

- Settings > Pages > Custom domain is `mmir.ai`.
- DNS check is successful.
- Cloudflare cache has been purged.
- Cloudflare SSL/TLS is `Full` or `Full (strict)`.
- DNS records are not split between old and new origins.

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
