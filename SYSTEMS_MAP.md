# Murror Systems Map
> Based on "Thinking in Systems" by Donella Meadows — applied to Murror's product, growth, and engineering.

---

## 1. Murror's Key Stocks

A **stock** is something that accumulates over time. It can only change through **inflows** (adding) and **outflows** (draining).

| Stock | What It Is | Inflows | Outflows |
|-------|-----------|---------|----------|
| **User Emotional Self-Awareness** | The user's accumulated understanding of their own emotional patterns | Journal entries, deep chats, connection reflections, emotion arc insights | Forgetting, disengagement, life overwhelm, avoidance |
| **User Trust in AI** | How much the user believes the AI understands them | Accurate emotion detection, compassionate responses, consistency, privacy | Bad/generic responses, bugs, perceived judgment, data concerns |
| **Emotional Memory Vault Depth** | Richness of personalized data per user | Every journal analyzed, every emotion detected, relationship patterns extracted | Account deletion, data decay, stale/outdated entries |
| **User Engagement** | Active usage frequency | Habit formation, value delivery, push notifications, Apple Watch prompts | Competing apps, life events, frustration, boredom |
| **Engineering Velocity** | Team's ability to ship quality features | Good architecture, resolved tech debt, clear priorities | Incidents, context-switching, tech debt accumulation |
| **Product-Market Fit Signal** | How well Murror matches what users actually need | User retention, organic referrals, depth of usage | Churn, negative reviews, feature requests we can't serve |

---

## 2. Feedback Loops

### Reinforcing Loops (Snowball — Growth or Collapse)

**The Growth Engine (VIRTUOUS CIRCLE):**
```
User writes journal entry
    → Emotion detected accurately
        → Insight shown ("You've been anxious 6 of the last 8 entries")
            → User feels understood and seen
                → User journals more frequently
                    → AI has richer data
                        → AI responses become more personalized
                            → User trusts AI more
                                → User journals even more → ...
```
**Key insight:** Every interaction that makes the AI more accurate accelerates this loop. This is Murror's core engine.

---

**The Churn Spiral (VICIOUS CIRCLE):**
```
User feels overwhelmed or busy
    → Skips journaling for a few days
        → Emotional data gets stale
            → AI responses feel generic ("How are you feeling today?")
                → User thinks "this doesn't get me"
                    → Disengages further
                        → Data becomes even more stale → ...
```
**Key insight:** This loop must be interrupted with a **balancing loop** (re-engagement mechanism).

---

**Success-to-Successful (DEFENSIBILITY):**
```
More user data accumulated
    → Better emotion detection models
        → More accurate insights
            → Higher retention
                → More data accumulated → ...
```
**Key insight:** This is Murror's moat. Competitors starting from zero can't match the emotional history depth.

---

### Balancing Loops (Self-Correcting — Stability)

**Quality Control Loop:**
```
Bug reaches production
    → Incident detected (monitoring, Sentry)
        → Team investigates and fixes
            → Adds test/monitoring for that case
                → Similar bug caught earlier next time
                    → Fewer production incidents → ...
```

**Re-Engagement Loop (TO BUILD):**
```
User stops journaling for 3+ days
    → System detects absence
        → Gentle Apple Watch haptic or notification
            → User prompted with low-friction entry point
                → User writes even a brief entry
                    → Reinforcing loop reactivates → ...
```

**AI Self-Improvement Loop:**
```
AI response quality drops (measured by eval harness)
    → Eval scores flag regression
        → Prompt engineering adjusted
            → Response quality improves
                → User satisfaction maintained → ...
```

---

## 3. Leverage Points (Ranked by Power)

Meadows identified 12 places to intervene in a system, from weakest to strongest:

| Rank | Leverage Point | Murror Application | Priority |
|------|---------------|--------------------|----------|
| **1** | **Paradigm** | "Loneliness dissolves through self-understanding" — this is THE paradigm Murror introduces to the world. Not "track your mood." Not "talk to an AI." But: understand yourself so deeply that isolation transforms into connection. | This is who we are. |
| **2** | **Goals** | Our goal is NOT engagement metrics or DAU. It's: "Does this user understand themselves better than they did last month?" Measure emotional growth, not screen time. | Define our north star metric around this. |
| **3** | **Self-Organization** | Let users discover their own patterns. Don't prescribe meaning — let the AI surface data and let the user draw their own conclusions. "I notice you mention your mother frequently. What does that feel like?" | Design features for discovery, not diagnosis. |
| **4** | **Rules** | "Every journal entry gets emotion detection" — already implemented. "AI never diagnoses or labels" — to implement. "Crisis detection always active" — maintained. | Codify in prompt engineering. |
| **5** | **Information Flows** | This is HUGE. Show users patterns they literally cannot see: emotional arcs over time, relationship patterns, recurring themes. "You mentioned work stress 8 times this month, but never on weekends." | Build Emotional Arc Visualization. |
| **6** | **Reinforcing Loops** | Strengthen the growth engine. Make each good interaction seed the next one. Make insights so valuable that NOT journaling feels like a loss. | Focus on insight quality. |
| **7** | **Balancing Loops** | Add re-engagement (Apple Watch), add quality monitoring (eval harness), add user feedback loops. | Build re-engagement system. |
| **9** | **Delays** | Shorten the time between "user journals" and "user sees meaningful pattern." Current: weeks of data needed. Target: 3-5 entries. | Optimize insight algorithms. |
| **12** | **Parameters** | Prompt temperature, retry counts, notification timing. Important but low leverage. | Tune last, not first. |

---

## 4. System Traps to Watch For

### Trap: Drift to Low Performance
**What it looks like:** AI response quality slowly degrades. Each small regression is "not that bad." Over months, responses become generic and clinical.
**Prevention:** Keep absolute quality standards. Run eval harness automatically. Never let "good enough" become the new bar.

### Trap: Shifting Burden to the Intervenor (Addiction)
**What it looks like:** Users become dependent on the AI for emotional processing. They can't sit with their own feelings without opening the app. We've "helped" so much that we've weakened their own capacity.
**Prevention:** Design the AI to TEACH self-observation. "You noticed this pattern yourself — that's real growth." Progressively, the AI should make itself less necessary, not more.

### Trap: Seeking the Wrong Goal
**What it looks like:** Optimizing for DAU, session length, or number of entries instead of actual emotional growth.
**Prevention:** Define and measure emotional growth directly. "Does this user show more self-awareness in their latest entries compared to their first?"

### Trap: Success to the Successful (Internal)
**What it looks like:** Power users get increasingly amazing AI responses (rich data), while new users get generic responses (no data). Gap widens.
**Prevention:** Design exceptional onboarding. Make the FIRST 3 interactions powerful. Use guided prompts to generate rich initial data quickly.

### Trap: Policy Resistance
**What it looks like:** Users don't want to be told how to feel. Prescriptive AI responses get ignored or resented.
**Prevention:** Ask, don't tell. Reflect, don't prescribe. "What do you think this pattern means?" not "You should do X."

---

## 5. Resilience Principles

From Meadows: "Systems need to be managed not only for productivity or stability, but also for resilience."

| Resilience Practice | What It Means for Murror |
|--------------------|-------------------------|
| **Diverse feedback loops** | Don't rely on one channel (app only). Apple Watch, notifications, email digests. |
| **Redundancy** | Staging environment, health checks, monitoring. Don't strip these for speed. |
| **Buffers** | Keep connection pool headroom. Don't run at 100% capacity. PgBouncer exists for this. |
| **Self-organization** | Let users create their own rituals. Don't force a single journaling pattern. |
| **Hierarchy that serves the bottom** | Engineering serves product, product serves users, users serve their own growth. |

---

## 6. Key Insight: Delays Are Dangerous

> "When there are long delays in feedback loops, some sort of foresight is essential."

Murror's critical delays:
- **Delay between journaling and insight**: Currently too long. Users need to see patterns after 3-5 entries, not 30.
- **Delay between bug and detection**: Shortened by Sentry + monitoring, but must maintain.
- **Delay between user disengagement and re-engagement**: Currently infinite (no re-engagement system). Must add.
- **Delay between AI improvement and user experience**: Prompt changes deploy instantly. Model changes take longer. Prefer prompt-level fixes.

---

*This document is a living reference. Update it as Murror's system evolves.*
