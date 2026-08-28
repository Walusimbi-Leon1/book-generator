# 📚 SGSS Book Generator

Automatically creates a new international book every 4 days and seeds it with the 3-day auto-writing pipeline.

## How it works
- **`book-generator.yml`** (cron `0 6 */4 * *`) runs `book-generator.js` → big-pickle on opencode.ai generates a fresh book concept (rotating genres, author = Walusimbi Leon).
- It creates a new public repo from `sgss-template/book-binder`, then `seed-book.js` writes `book.config.json` + content + the canonical `write-book.js`, sets secrets, and pushes.
- The new book's own `.github/workflows/write-book.yml` (cron every 3 days) then writes ~2,000 words per run — same pipeline as all SGSS books.

## Secrets (set in repo Settings)
`GH_PAT`, `OPENCODE_API_KEY`×5, `GH_PUSH_TOKEN`

## Run manually
Actions → 📚 Book Generator → Run workflow
