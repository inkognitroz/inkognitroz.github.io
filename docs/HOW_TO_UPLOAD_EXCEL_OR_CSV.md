# How to upload Excel or CSV content

## CSV (supported now)
1. Open `/public/admin.html`.
2. Choose a section.
3. Import a CSV with headers: `title,description,link,tags`.
4. Use `|` inside `tags` values (example: `ai|tools|internal`).
5. Export and replace `/public/content.json`.

## Excel/XLSX (placeholder for v1)
- Version 1 intentionally avoids heavy dependencies.
- Convert Excel to CSV first, then import CSV.
- Future version can use a browser XLSX parser.
