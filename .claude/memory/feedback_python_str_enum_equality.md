---
name: Python `class Foo(str, Enum)` equality — compare to `.value`, not NAME
description: String-Enum equality compares against the enum VALUE (lowercase), not the NAME (uppercase). A privacy-gate bug silently bypassed filtering because comparisons used uppercase name literals.
type: feedback
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---
**The rule.** When comparing a `class Foo(str, Enum)` instance against a string literal, compare against the enum's **value** (lowercase as defined), not its **name** (uppercase Python identifier). Use `foo == Foo.BAR` (reference) or `foo == "bar"` (value literal), but never `foo == "BAR"` (name literal).

**Why.** In Python, `class ShareLevel(str, Enum): OVERVIEW = "overview"` means the instance stringifies and compares by its value `"overview"` — the symbol `OVERVIEW` is just the Python attribute name. The comparison `share_level == "OVERVIEW"` is always `False`, even when the user is on overview. In the privacy-gate work, a guard clause used uppercase literals and silently let all data through — filtering was effectively disabled for every user because the guard always evaluated falsy.

**How to apply.**

- Always compare against the enum reference: `if level == ShareLevel.OVERVIEW:` — safest, refactors cleanly.
- Or compare against the lowercase value: `if level == "overview":` — acceptable in JSON/IO boundaries.
- Never: `if level == "OVERVIEW":` — this is the bug shape; it looks right, it silently fails.
- In code review: grep for `== "[A-Z_]+"` next to any variable typed as a `str, Enum` — those are almost always wrong.
- When adding a privacy/security/access-control gate, write a unit test that asserts the gate actually blocks in the negative case, not just allows in the positive case. A one-sided test passes whether the gate works or not.
