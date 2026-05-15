# How to update content

- Edit `/public/content.json` directly, or use `/public/admin.html` in your browser.
- Keep data under `site`, `sections`, and optional `roadmapBoard` keys.
- Each card supports: `title`, `description`, `link`, `tags`, and optional `status`.
- Use `status: "draft"` for work that should stay hidden from the public homepage. Use `status: "published"` when it is ready to go live.
- Roadmap board data is loaded from `roadmapBoard` in `content.json`. Each board item supports: `title`, `description`, `status`, `priority`, `owner`, `nextAction`, and `relatedLink`.
- Validate before export. The admin page now blocks export if JSON syntax or the content model is invalid.

## Safe publishing paths

### 1) Recommended now: export + PR
1. Open `/public/admin.html`.
2. Load, edit, validate, and preview the content.
3. Export `content.json`.
4. Commit the updated `/public/content.json` in a pull request.
5. Review and merge the PR. GitHub Pages will redeploy automatically.

### 2) Future option: backend or serverless publish flow
- Keep secrets off the frontend.
- Use a GitHub App or another server-side token/credential in backend code only.
- The browser should call a trusted server-side endpoint instead of writing to GitHub directly.

Never place GitHub tokens, Supabase `service_role` keys, Stripe secrets, or similar credentials in frontend code.
