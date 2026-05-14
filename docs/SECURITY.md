# Security rules

- Never commit real API keys.
- Never add fake keys that look real.
- Never put GitHub tokens in frontend code.
- Never put Supabase `service_role` keys in frontend code.
- Never put Stripe secret keys in frontend code.
- Use placeholders only.
- Store secrets in GitHub Secrets, Vercel environment variables, Netlify environment variables, or server-side code.
- Keep version 1 simple and static-first.
