# Code review summary (2026-05-15)

## Overall status
- v1 architecture is clear and aligned with GitHub Pages: static files in `/public` with one content source (`public/content.json`).
- Security posture is documented and practical for a static-first workflow.
- The admin workflow is useful for non-technical updates and keeps backend complexity out of v1.

## Top issues to prioritize

### 1) Issue template mismatch with live section model (High)
`content-update.md` still lists old section names (`Notes`, `Resources`) and misses active sections like App Factory, Templates, Dashboards, About.

**Impact:** Contributors can request changes with the wrong taxonomy, causing review churn and inconsistent updates.

### 2) CSV import parsing is too naive (High)
`parseCsv` in `public/assets/app.js` splits rows by commas directly. Quoted CSV values containing commas (common in descriptions) will be parsed incorrectly.

**Impact:** Imported cards can be corrupted, especially for real-world descriptions and prompts.

### 3) No quality gate before deploy (Medium)
Current workflow only deploys Pages. There is no CI check to validate JSON structure/content or basic static integrity before publish.

**Impact:** Broken or invalid content can reach production with no fast feedback loop.

### 4) Admin load action has no user-facing error handling (Medium)
`Load content.json` calls `loadInitialContent()` directly on click. If fetch fails, users get no clear message in the admin UI.

**Impact:** Non-technical users may not know how to recover when local/network loading fails.

### 5) Theme import accepts broad `rgb()/rgba()` forms (Low)
Theme import sanitation is already present, but regex allows loosely bounded numeric formats.

**Impact:** Low immediate risk, but tighter validation would reduce malformed theme inputs.

## Top pull requests to open next

1. **PR: Align content issue template with `public/content.json` sections**
   - Update `.github/ISSUE_TEMPLATE/content-update.md` checkbox options to match current live sections.
   - Add short guidance to avoid free-form section names.

2. **PR: Replace CSV parsing with a robust parser**
   - Upgrade `parseCsv` to properly handle quoted fields, escaped quotes, and variable whitespace.
   - Add focused tests for comma-in-description and multi-tag imports.

3. **PR: Add lightweight CI validation workflow**
   - Add a non-deploy workflow that runs on PRs:
     - JSON syntax check for `public/content.json`
     - Optional schema/required key checks for key sections
   - Keep it fast and static-hosting friendly.

4. **PR: Improve admin load error UX**
   - Wrap load button action in try/catch.
   - Show clear inline error guidance when content cannot load.

5. **PR: Tighten theme import validation**
   - Restrict accepted color formats to stricter ranges.
   - Add clear error text for invalid formats.
