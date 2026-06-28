# Engineering Log → Notion database (auto-group by month + member)

**Date:** 2026-06-22 (PDT)
**Status:** Design approved (Astro, Option B + "current month + forward" migration)

## Why
The month-page + per-member-section model has no auto-rollup (Notion plain pages don't sync). A **database** gives "write one entry, see it grouped by month AND by member" automatically via views.

## Database
Create **"Murror Engineering Log"** database under "Murror team updates" (`3273af4aaa9280fea697f5c2df66f92a`). One row = one daily writeup. Body (color-coded bullets) lives in the row's page content, same format as today.

**Properties:**
- `Name` (title) — entry headline, e.g. "June 21 — New users start on the web".
- `Date` (date) — when the work happened. Powers sort + month grouping.
- `Member` (select) — Astro, Mona, Khanh Pham, Dominic, Content autopilot.
- `Month` (formula) — `formatDate(prop("Date"), "MMMM YYYY")` → "June 2026". Auto, no manual tagging.
- `Type` (multi-select, optional) — Shipped, Fixed, Heads-up.

**Views:**
- By Month — grouped by `Month`, sorted `Date` desc.
- By Member — grouped by `Member`, sorted `Date` desc.
- Timeline / All — flat, `Date` desc (+ optional Calendar).
- Feasibility: if the MCP cannot create saved views, create the DB + properties via API and add the 3 views manually (flag it).

## Migration (current month + forward)
- Migrate **June 2026** entries (~53, all under Astro + the Content autopilot section) into rows: parse each entry from the June 2026 page (title → Date, Member = Astro/Content autopilot, body → row content). Batch via `notion-create-pages` (up to 100 pages/call) with `parent: { data_source_id }`.
- Keep **May / April / March** month pages as-is, linked from an "Archive (pre-June)" callout on/near the database.
- The Engineering Log index page (`3273af4aaa9280b89efacd68d67cd3df`) becomes a pointer to the database + the archive links.

## Writers (skills) change
- `/document` step 5 and the `murror-seo-autopilot` Report step: instead of inserting markdown under a heading, **create a database row** (`notion-create-pages`, parent = the data source) with `Date` = today (PST/PDT), `Member` = Astro (/document) or Content autopilot (autopilot), `Name` = the entry title, content = the color-coded body. Simpler + no anchor matching.
- Update memory (`feedback_update_notion`, `reference_notion_api`, `project_eng_log_month_structure`) to the database model + the data source ID.

## Lifecycle
- Before: writer finishes work → creates a row (Date + Member set).
- During: row appears instantly in all views (by month, by member, timeline).
- After: no month pages to maintain; new months/members appear automatically; April/March/May remain as linked archive.

## Verify
- Create a test row → confirm it shows under the right Month + Member groups.
- After June migration: By Month view shows June with ~53 entries; By Member shows them under Astro.
- /document next run creates a row that lands correctly.
