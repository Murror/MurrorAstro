# Murror Company Memory — macOS interaction prototype

A high-fidelity, dependency-free prototype for Murror's AI-native company workspace. It explores how a small team can move between durable conversation, visible work, bounded agent sessions, and human-verified company knowledge without losing context.

## Open the prototype

Open `index.html` directly in a modern browser. No install or build step is required.

## Primary walkthrough

1. Start on **Today** for a glanceable view of work that needs attention.
2. Open **# product** and select **Summon Claude**.
3. Review the Context Capsule and choose a permission mode.
4. Start the Work Session, then select **Refill context**.
5. Share the scoped source and review Claude's Outcome Bundle.
6. Accept the outcome to update the Mission Map and Company Memory together.

## Screen inventory

- Today
- Channel
- Direct message
- Company Map
- Living Mission Map
- Start Work Session
- Active Work Session
- Refill Context
- Outcome Review
- Company Memory
- Missions
- Agents
- Inbox
- Private Claude conversation
- Command palette
- Lifecycle state gallery

## Interaction map

```text
Today
  ├─ conversation → # product
  ├─ progress → Company Map → Living Mission Map
  └─ attention → Refill Context

# product
  └─ Summon Claude
      └─ Start Work Session
          └─ Needs context
              └─ Refill Context
                  └─ Outcome Review
                      └─ Human acceptance
                          ├─ Living Mission Map updated
                          └─ Company Memory verified
```

## Prototype controls

- `Command-K` opens universal navigation.
- `Escape` closes sheets and the command palette.
- `Command-Enter` sends a channel message.
- **States** in the sidebar opens empty, loading, blocked, offline, permission, provider, failure, paused, completed, and stale examples.
- **Accessible list** demonstrates the non-spatial representation promised for maps.

## Product boundaries represented

- Private DMs are excluded from agent context by default.
- Agent access is scoped, time-bounded, owned by a person, and visible before starting.
- Company Memory distinguishes proposals and evidence from human-verified knowledge.
- Accepting an outcome revokes active capability and synchronizes the conversation, mission, map, and knowledge state.
- The visual prototype uses no external scripts, fonts, frameworks, or network requests.

