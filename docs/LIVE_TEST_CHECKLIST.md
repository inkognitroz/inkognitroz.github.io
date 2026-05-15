# LIVE TEST CHECKLIST

Use this lightweight manual smoke-test after every merge.
Keep v1 static and safe (no backend required, no API keys in frontend files).

- [ ] 1. Homepage loads at `/`
- [ ] 2. Theme widget opens and presets work
- [ ] 3. Football Evolution Matrix loads at `/apps/football-evolution-matrix/`
- [ ] 4. Football matrix cell editing works
- [ ] 5. Football local save works
- [ ] 6. Football JSON export/import works
- [ ] 7. Football import rejects invalid JSON (missing section, wrong row length, or missing required columns)
- [ ] 8. Football template switch asks for confirmation and can be rolled back with **Gjenopprett backup**
- [ ] 9. Football metadata fields (title, owner, version, updated date, notes) are editable and persisted after reload
- [ ] 10. Football export bundle downloads JSON + CSV bundle + print-friendly HTML
- [ ] 11. Football CSV export works with Norwegian characters (`æ`, `ø`, `å`)
- [ ] 12. Football mobile/table layout remains usable (horizontal scroll + sticky header/first column)
- [ ] 13. Admin page loads at `/admin.html`
- [ ] 14. `public/content.json` remains valid JSON
- [ ] 15. No API keys, GitHub tokens, Supabase `service_role` keys, or Stripe secrets are present
