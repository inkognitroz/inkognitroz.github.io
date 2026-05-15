# How to upload Excel or CSV content

## CSV (supported now)
1. Open `/public/admin.html`.
2. Choose a section.
3. Import a CSV with headers: `title,description,link,tags,status`.
4. Use `|` inside `tags` values (example: `ai|tools|internal`).
5. The parser supports quoted commas, escaped quotes, BOM-marked CSV files, and Norwegian characters such as `æ`, `ø`, and `å`.
6. If `status` is omitted, imported rows default to `draft`.
7. Validate, preview, and export the updated `/public/content.json`.

## Excel/XLSX (placeholder for v1)
- Version 1 intentionally avoids heavy dependencies.
- Convert Excel to CSV first, then import CSV.
- Future version can use a browser XLSX parser.
