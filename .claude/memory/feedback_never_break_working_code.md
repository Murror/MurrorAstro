---
name: Never break working code — hard rule
description: Before touching ANY existing working code, stop and ask Astro for confirmation. Maintain what works. Only add, never modify working paths.
type: feedback
---

Never touch existing working code without explicit confirmation from Astro.

**Why:** During the April 5-7 sprint, cascading failures happened because changes to one area (emotion detection) broke the entire journal pipeline, which led to 2 days of reactive fixes that each introduced new problems. The lesson: working code is sacred.

**How to apply:**
1. Before modifying ANY file that has working functionality, stop and ask: "This change touches [file] which currently handles [working feature]. Here's what I'm changing and why — is this okay?"
2. Default to ADDING new code paths rather than modifying existing ones
3. If a fix requires changing working code, explain exactly what will change and what could break
4. When in doubt, use the same proven patterns that already work (e.g., connection reflection now uses the same flow as single reflection)
5. Never assume a change is safe — verify by tracing the impact on all code paths that touch the same files
6. One change at a time, test before moving to the next
