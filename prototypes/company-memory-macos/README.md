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
6. Accept the outcome to move Mission Progress to **Done** and update Company Memory.

## Screen inventory

- Today
- Channel
- Direct message
- Company Progress
- Mission Progress
- Start Work Session
- Active Work Session
- Refill Context
- Outcome Review
- Company Memory
- Agents
- Inbox
- Private Claude conversation
- Command palette
- Lifecycle state gallery

## Interaction flow

```text
Today
  ├─ conversation → # product
  ├─ progress → Company Progress → Mission Progress
  └─ attention → Refill Context

# product
  └─ Summon Claude
      └─ Start Work Session
          └─ Needs context
              └─ Refill Context
                  └─ Outcome Review
                      └─ Human acceptance
                          ├─ Mission Progress moves to Done
                          └─ Company Memory verified
```

## Prototype controls

- `Command-K` opens universal navigation.
- `Escape` closes sheets and the command palette.
- `Command-Enter` sends a channel message.
- **States** in the sidebar opens empty, loading, blocked, offline, permission, provider, failure, paused, completed, and stale examples.
- **Progress** shows Up next, In motion, Almost there, and Done without panning or zooming.

## Product boundaries represented

- Private DMs are excluded from agent context by default.
- Agent access is scoped, time-bounded, owned by a person, and visible before starting.
- Company Memory distinguishes proposals and evidence from human-verified knowledge.
- Accepting an outcome revokes active capability and synchronizes conversation, Mission Progress, and Company Memory.
- The dark Night Studio shell and luminous Daylight Progress sheet share one Murror Horizon identity.
- The visual prototype uses no external scripts, fonts, frameworks, or network requests.
