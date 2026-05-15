---
name: Settings area — audit false-positives
description: Brief list of things that looked like bugs in the 2026-04-18 settings audit but were actually correct. Do not re-open these as bugs.
type: reference
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---
Keep this short — it exists so a future session doesn't burn time re-discovering the same "bugs" that aren't.

## Not a bug: delete-account is properly awaited

- `await supabase.auth.admin.deleteUser(userId)` IS awaited
- Errors DO throw out of the handler
- Initial 2026-04-18 audit claimed it was fire-and-forget — that reading was wrong

## Not a bug: NotificationScreen is reachable

- Registered in `navigation-controller.tsx`
- Navigable from the Settings screen
- Initial audit claimed it was unreachable — wrong

## Not a bug: LanguageScreen is reachable

- Registered in `navigation-controller.tsx`
- Navigable from the Settings screen
- Initial audit claimed it was unreachable — wrong

## What actually shipped (for contrast)

See `project_settings_data_integrity_fixes.md` — the real issues were firstName/lastName drop, OAuth name miss, avatar dual-write, and timezone sync.
