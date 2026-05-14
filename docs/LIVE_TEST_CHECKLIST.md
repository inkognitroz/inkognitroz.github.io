# LIVE TEST CHECKLIST

Use this lightweight manual smoke-test after every merge.
Keep v1 static and safe (no backend required, no API keys in frontend files).

- [ ] 1. Homepage loads at `/`
- [ ] 2. Theme widget opens and presets work
- [ ] 3. Football Evolution Matrix loads at `/apps/football-evolution-matrix/`
- [ ] 4. Football matrix cell editing works
- [ ] 5. Football local save works
- [ ] 6. Football JSON export/import works
- [ ] 7. Football CSV export works with Norwegian characters (`æ`, `ø`, `å`)
- [ ] 8. Admin page loads at `/admin.html`
- [ ] 9. `public/content.json` remains valid JSON
- [ ] 10. No API keys, GitHub tokens, Supabase `service_role` keys, or Stripe secrets are present
