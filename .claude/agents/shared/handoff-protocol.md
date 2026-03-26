# Handoff Protocol

When one agent's work creates requirements or context for another agent, write a handoff note.

## Where to Write Handoffs
`Murror/docs/handoffs/<source>-to-<target>-<topic>.md`

Examples:
- `cortex-to-iris-voice-summary.md`
- `heart-to-muse-empathy-guidelines.md`
- `sentinel-to-cortex-auth-bug.md`

## Handoff Template

```markdown
# Handoff: [Source Agent] -> [Target Agent]
Date: YYYY-MM-DD HH:MM PST
Task: [Brief description]
Branch: feature/xxx

## What Changed
[What the source agent built, decided, or discovered]

## What Target Agent Needs To Do
- [ ] Actionable item 1
- [ ] Actionable item 2

## Key Decisions Made
[Choices that affect the target's work -- explain WHY, not just WHAT]

## Files to Read First
[Specific paths the target should look at before starting]

## Open Questions
[Anything unresolved that needs discussion with Astro or the target agent]
```

## When to Write a Handoff
- You built an API endpoint that a frontend agent needs to consume
- You changed a response format that other agents depend on
- You found a bug in another agent's domain
- You made a design decision that constrains another agent's work
- You need another agent to do something before your work is complete

## When NOT to Write a Handoff
- Your work is self-contained within your domain
- The change is internal and doesn't affect other agents
- You're just reading/exploring, not modifying

## Lifecycle
Handoffs are ephemeral -- they exist for the current session/task. Once the target agent has read and acted on a handoff, it can be deleted. The docs/handoffs/ directory is gitignored.
