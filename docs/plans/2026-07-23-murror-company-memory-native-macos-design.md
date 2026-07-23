# Murror Company Memory: Native macOS Collaboration Platform Design

- **Date:** 2026-07-23 (PDT)
- **Owner:** Astro
- **Status:** Approved design
- **Working product name:** Murror Company Memory
- **Primary client:** Native macOS
- **System of record:** Murror cloud
- **First audience:** The internal Murror team

## Executive summary

Murror Company Memory replaces Slack for the Murror team with a beautiful,
durable, AI-native collaboration platform. It combines familiar channels and
direct messages with structured work, visual situational awareness, verified
company knowledge, and controlled participation by Claude and other MCP agents.

The product is not a prettier Slack clone. Its durable differentiation is:

> Slack shows where people talked. Murror shows what the company knows, what is
> moving, what remains uncertain, and which verified context humans and agents
> need next.

The platform uses a native Mac client for the best daily experience and local
agent integration. The cloud remains authoritative for messages, permissions,
knowledge, approvals, agent runs, and audit history. A lightweight web client
can follow after the native internal workflow is proven.

## Approved product decisions

1. Build a native macOS primary client, not a native-only system.
2. Keep company history and permissions in a shared cloud system of record.
3. Start fresh. Do not build Slack migration into the first release.
4. Support public/private channels, one-to-one DMs, and small-group DMs.
5. Use familiar **Channels** terminology.
6. Use **Missions** for structured, outcome-oriented work created from a channel.
7. Use hybrid knowledge:
   - permitted conversations remain searchable evidence;
   - only human-confirmed knowledge becomes canonical Company Memory.
8. Represent agent assignments as visible **Work Sessions**, not bot-message logs.
9. Use a two-level visual work model:
   - constellation-like **Company Map** for portfolio awareness;
   - dependency-first **Living Mission Map** for operating detail.
10. Use versioned **Context Capsules** to refill human and agent context.
11. Visualize work state, not individual productivity.
12. Begin with one Claude integration and one complete internal workflow.

## Continue-never-rebuild boundary

This design extends Murror's existing specialist roles, handoff conventions,
Claude/Codex interoperability, and approval rules. It does not replace working
product code or delete existing documentation systems.

The existing Notion-based Murror Engineering Log remains a historical and
operational reference. The first Company Memory alpha starts fresh and does not
import that database. A future connector may publish Engineering Log entries as
Project State, Decision, or Handoff records only after a separate design and
verification pass.

## Product principles

### Calm over attention pressure

- No giant unread count as the primary orientation mechanism.
- Today answers what needs attention, what changed, and what comes next.
- Notifications default to mentions, assignments, blockers, context requests,
  approvals, and owned agent completions.
- Routine chatter and tool activity remain inside the app.

### Evidence over managerial certainty

- Every displayed fact identifies its source and freshness.
- Human-reported, system-observed, agent-reported, proposed, and human-verified
  states remain visibly distinct.
- Unknown or stale work remains unknown or stale.
- A handoff or plan never counts as completed execution without evidence.

### Work over worker surveillance

- No productivity scores, rankings, keystroke tracking, response-time scoring,
  or active-time heat maps.
- Missing context belongs to a work item, not as blame attached to a teammate.
- Agent telemetry describes a bounded Work Session, not a person's value.
- Private Claude sessions remain private unless explicitly shared.

### Progressive disclosure

- Maps show outcome, state, owner, dependency, and next action.
- Node previews show the latest checkpoint, blocker, or missing context.
- Inspectors show sources, permissions, artifacts, costs, and history.
- Raw transcripts and technical logs appear only when intentionally opened.

### Native without lock-in

- The Mac app provides the best experience and local execution bridge.
- The cloud remains the source of truth.
- Local caches accelerate the experience but never become canonical memory.
- Future clients use the same permissions, messages, work, and knowledge model.

## Core information architecture

```text
Today
Inbox

Direct Messages
  New message
  Human-to-human
  Small groups
  Private agent conversations

Channels
  Public channels
  Private channels

Work
  Company Map
  Missions
  Knowledge
  Agents
```

### Navigation

- The sidebar exposes DMs and Channels directly.
- `Command-K` searches or navigates to a person, agent, channel, Mission,
  decision, artifact, or Knowledge Card.
- A global Mac shortcut opens a compact composer over any application.
- The menu-bar companion shows calm state such as “2 agents working” or
  “1 approval needed.”

## Spatial and visual model

The primary workspace uses three stable regions:

```text
Navigation | Conversation canvas | Context rail
```

### Navigation

Contains Today, Inbox, DMs, Channels, Company Map, Missions, Knowledge, and
Agents. People may favorite and reorder their most important destinations.

### Conversation canvas

Contains spacious human conversation, threads, attachments, decisions, and
compact Agent Work Session cards. It never becomes an ambient terminal log.

### Context rail

Contains the active Mission, people, agents, sources, permissions, decisions,
files, and verified knowledge related to the current conversation.

### Visual character

- Deep charcoal foundation instead of flat black.
- Restrained glass and depth, not decoration on every surface.
- Cyan for active human collaboration.
- Violet for agent activity.
- Amber for context requests and approvals.
- Red only for confirmed blockers or destructive actions.
- Green only for verified completion.
- Editorial typography and generous spacing.
- Native transitions that preserve spatial context.
- Color is always paired with text and an icon.
- Reduced-motion alternatives are mandatory.

## Channels and direct messages

### Channels

Channels organize durable conversations by topic. Creation asks for:

- name and concise purpose;
- public or private visibility;
- membership;
- whether future guests are permitted;
- which agents may be invited;
- whether verified knowledge may be promoted from the channel.

Each channel's context rail contains members, participating agents, active
Missions, pinned decisions, shared files, and applicable Knowledge.

### Direct messages

The platform supports:

- human-to-human DMs;
- small-group DMs;
- private conversations with an agent;
- converting a group DM into a private channel when it becomes durable work.

DM rules:

- DMs are searchable only by participants.
- DMs do not enter company-wide knowledge automatically.
- Agents cannot retrieve a DM unless explicitly invited or selected content is
  deliberately shared.
- A participant can promote selected content into a channel, Mission, or
  proposed Knowledge Card with visible attribution.

### Channel lifecycle

**Before:** create the topic, visibility, membership, and agent boundary.

**During:** chat naturally, branch into threads, summon agents, create Missions,
and promote important messages into decisions or proposed knowledge.

**After:** channels persist and remain searchable within their permissions.
Finished channels can be archived without destroying their history.

## Today and daily rhythm

### Today

Today answers four questions:

1. What needs my attention?
2. Which agents are working or waiting?
3. What changed since I was last here?
4. Where should I continue?

It highlights approvals, context requests, blockers, owned work, verified
decisions, and meaningful project movement. It does not summarize every message.

### Since You Left

- Changed project nodes gently illuminate.
- New decisions appear as compact markers.
- Resolved branches collapse into verified outcomes.
- New blockers and missing context remain expanded.
- A timeline filter supports today, this week, or since the last visit.
- Every change opens its evidence and source conversation.

### End-of-day checkpoint

Murror proposes a concise company checkpoint from structured work events:

- outcomes moved;
- decisions verified;
- agent sessions safely paused;
- blockers or context needs for tomorrow.

Teammates can correct the checkpoint before it becomes the next day's shared
starting point. Separate manual status reports should not be required.

## Company Map and Living Mission Map

### Company Map

The Company Map is a constellation-like portfolio overview. Each project cluster
shows only:

- intended outcome;
- active work;
- blockers;
- missing context;
- decisions required;
- human reviews required;
- recently verified completion.

The Company Map intentionally avoids paragraphs, progress percentages,
productivity scores, and technical logs.

### Living Mission Map

Opening a project reveals a left-to-right dependency map:

```text
Goal -> Context -> Work Session -> Human review -> Verified outcome
                 ^
                 |
          Missing context
```

Nodes may represent:

- outcome;
- task;
- Work Session;
- context need;
- blocker;
- decision;
- artifact;
- review;
- verified completion.

Owners appear on work nodes. People are not treated as performance nodes.

### Map states

| State | Treatment |
| --- | --- |
| Queued | Neutral gray, static clock |
| Working | Cyan or violet by actor, restrained breathing edge |
| Missing context | Amber, open input-slot icon |
| Blocked | Red, broken connector, concise reason |
| Awaiting review | Violet, review icon |
| Complete and verified | Green check, motion settles |
| Paused | Neutral gray, pause icon |
| Stale | Muted treatment, “needs review,” never “inactive person” |

Solid connectors represent confirmed relationships. Dotted connectors represent
agent-suggested or unverified relationships.

### Progressive disclosure

1. Map: outcome, owner, state, dependency, next action.
2. Node preview: latest checkpoint, artifact, blocker, or missing context.
3. Inspector: sources, permissions, decisions, costs, and activity history.
4. Raw transcript or logs: explicitly opened for debugging only.

An accessible list view presents the same information without requiring use of
the diagram.

## Context Capsules and context refill

A Context Capsule is a versioned, previewable package containing:

- current goal;
- confirmed decisions;
- relevant policies;
- active tasks and owners;
- recent changed artifacts;
- blockers and unanswered questions;
- relevant conversation links;
- acceptance criteria;
- exact handoff or restart point;
- source, freshness, and permission labels.

### Refill Context flow

1. A task or Work Session displays a missing context slot.
2. A teammate selects **Refill Context**.
3. They attach a channel message, document, artifact, Knowledge Card, or direct
   explanation.
4. Murror previews the complete package, visibility, recipient agent session,
   and affected downstream tasks.
5. The teammate confirms the share.
6. Murror records author, source, timestamp, scope, version, and recipient.
7. The map and Work Session update from the same canonical event.

No complete private transcript is injected by default. A teammate can inspect,
edit, revoke, or delete shared context.

## Claude and MCP integration boundary

Murror must not assume it can silently read every teammate's complete Claude
account context.

The supported design is opt-in session publishing:

1. A teammate connects a Claude or Claude Code session.
2. Murror shows what will be shared.
3. Claude publishes structured checkpoints rather than private reasoning.
4. The teammate confirms or corrects the update.
5. The Company Map updates through normalized work events.
6. Reviewed Context Capsules return to selected agent sessions through Murror's
   MCP tools.

Useful checkpoint events include:

- session started or paused;
- task claimed;
- plan updated;
- tool or test completed;
- artifact changed;
- blocker reported;
- decision requested;
- context requested;
- review requested;
- handoff published;
- completion proposed;
- completion human-verified.

MCP is an integration route, not the source of identity, chat history,
permissions, workflow state, or Company Memory.

## Agent Work Sessions

Every meaningful agent assignment becomes a Work Session with one human owner.

### Starting a session

The start sheet shows:

- goal;
- selected conversation context;
- attached Knowledge and files;
- repository or folder scope;
- allowed tools;
- permission mode;
- visibility;
- human owner;
- time, token, and dollar budget.

### Permission modes

1. **Advise only:** research and recommendations, no changes.
2. **Work and prepare drafts:** edit inside an isolated workspace, no publish.
3. **Act after approval:** propose consequential actions that pause for exact
   human approval.

### During a session

A single compact card updates in place with:

- current state;
- plan step;
- meaningful checkpoint;
- artifact;
- blocker or missing context;
- cost;
- **Refill context**, **Open map**, **Pause**, and **Stop** controls.

The agent posts a normal channel message only when it needs context or a
decision, produces something reviewable, detects a meaningful risk, encounters
a blocker, pauses, or completes.

Authorized teammates may add context, correct understanding, claim an action,
join as reviewer, pause or stop the session, or transfer ownership. Exactly one
human remains accountable for accepting the outcome.

### Completing a session

Completion produces an Outcome Bundle containing:

- concise result;
- artifacts and diffs;
- tests or verification evidence;
- decisions made;
- remaining risks;
- unfinished work;
- cost and elapsed time;
- resumable Context Capsule.

The owner may accept, request changes, continue elsewhere, create follow-up
tasks, share into another channel, or promote verified findings into Company
Memory.

## Company Memory

Company Memory uses three trust layers:

```text
Searchable evidence -> Proposed knowledge -> Human-verified Company Memory
```

Later revision produces a new version. Superseded knowledge remains available
as history and clearly marked as non-current.

### Knowledge types

1. **Decision:** what was chosen, why, by whom, and what it replaces.
2. **Project State:** outcome, current state, blocker, next action, and owner.
3. **Playbook:** repeatable instructions for accomplishing something.
4. **Policy:** company rules, permissions, and operating boundaries.
5. **Handoff:** completed work, remaining gaps, evidence, and exact restart point.

### Trust states

- Human verified
- Agent proposed
- System observed
- Disputed
- Needs review
- Superseded

Trust comes from visible sources, authorship, timestamps, review, and history.
The product does not invent an unexplained confidence score.

### Ask Murror

Ask Murror returns:

- a concise answer;
- verified decisions first;
- supporting conversations and artifacts;
- conflicting or outdated information;
- the last review time;
- direct links to canonical sources.

If evidence is incomplete, the answer says so.

### Agent context order

When an agent starts work, Murror assembles authorized context in this order:

1. applicable policies and permissions;
2. verified decisions;
3. current Project State;
4. playbooks and handoffs;
5. recent conversational evidence;
6. explicitly attached private context.

The human can inspect and edit the complete Context Capsule before sharing.

### Permission integrity

- Public-channel knowledge may become company-wide after verification.
- Private-channel knowledge retains its membership boundary.
- DMs never enter Company Memory without deliberate sharing.
- Search, summaries, Ask Murror, and agents enforce the same permissions.
- Removing membership removes access through every retrieval surface and local
  cache.

## Native macOS architecture

### Mac client

Use SwiftUI for the design system and primary application structure, with
targeted AppKit where mature Mac behavior is needed for text editing, long chat
virtualization, advanced windowing, menus, drag-and-drop, or accessibility.

The Mac client owns:

- the visual experience;
- native windows and shortcuts;
- notifications;
- encrypted local cache;
- offline outbox;
- connection to the secure local agent bridge.

### Cloud collaboration core

Begin as a modular monolith with a background worker. The cloud owns:

- workspace, human, guest, agent, and system identities;
- channels, DMs, messages, revisions, threads, and files;
- Missions, dependencies, work events, and map projections;
- Agent Work Sessions, Context Capsules, budgets, and approvals;
- Knowledge Cards, versions, citations, and retrieval permissions;
- audit history, retention, deletion, backup, and export.

PostgreSQL remains canonical. Object storage holds files and durable artifacts.
Search and embeddings are derived indexes, never the source of truth. A durable
queue and transactional outbox support ingestion, indexing, realtime updates,
and agent events without splitting the core into premature microservices.

### Secure local agent bridge

The local bridge is a small, signed, separately isolated process. It:

- connects to local Claude and MCP processes;
- accesses only selected folders and applications;
- stores secrets in Keychain;
- receives short-lived task-specific capabilities;
- verifies action IDs and input hashes;
- reports checkpoints, artifacts, costs, and results;
- supports pause, revoke, timeout, and kill controls;
- exposes no unauthenticated LAN listener.

The bridge is an executor, not a decision-maker or source of truth.

### macOS permissions

Request permissions just in time and only for a visible feature:

1. selected files and folders;
2. notifications;
3. MCP, official APIs, URL schemes, and App Intents;
4. selected Apple Events integrations;
5. Accessibility or screen capture only as a later, per-application fallback.

No broad disk, screen, or Accessibility permission is required for normal chat.

## Core data flow

### Message

```text
Compose -> immediate local echo -> canonical cloud save -> realtime delivery
        -> search and permitted evidence indexing
```

A temporary network failure leaves the message visibly **Sending**. A stable
client message ID prevents a retry from posting twice.

### Work event

```text
Claude/MCP/Git/manual checkpoint -> local consent and redaction
-> authenticated append-only event -> project/map reducer
-> realtime map and Work Session update
```

Every event records source, actor, timestamps, visibility, evidence class,
freshness, artifact links, and adapter version. Conflicting events remain
visible for human reconciliation instead of silently overwriting each other.

### Knowledge

```text
Conversation/artifact/result -> proposed Knowledge Card -> human review
-> verified version -> cited retrieval for authorized humans and agents
```

### Offline

- Read cached authorized channels and Knowledge.
- Draft messages and Context Capsules.
- Review downloaded artifacts.
- Queue writes with client-generated IDs.
- Show pending, sent, and failed states.
- Reconcile ordering, edits, deletion, and permission changes after reconnect.
- Keep agent actions that require shared approval paused while offline.

## Failure and recovery states

The UI uses specific, honest states:

- Offline
- Sending
- Agent disconnected
- Local runner offline
- Waiting for provider
- Permission removed
- Context needs refresh
- Knowledge may be outdated
- Human reconciliation needed
- Budget reached
- Checkpoint safely preserved

Rules:

- A session never silently disappears.
- Provider failure never implies task failure or completion.
- An expired heartbeat marks work stale, not inactive.
- A changed action invalidates its earlier approval.
- Duplicate external effects are prevented with idempotency keys.
- Interrupted work retains an exact restart point.
- Deleted or revoked sources are removed from retrieval and flag dependent
  Knowledge for review.

## First-release scope

The first release is a focused internal alpha:

- one Murror workspace;
- approximately six teammates;
- native macOS only;
- one Claude integration;
- one complete collaboration loop.

### Included

- public and private channels;
- one-to-one and small-group DMs;
- threads, mentions, reactions, and attachments;
- permanent searchable history;
- Today and Since You Left;
- Company Map and Living Mission Map;
- manual and Claude-generated checkpoints;
- one Claude Code connection through the local bridge;
- Work Sessions with context preview, budgets, pause, and stop;
- Context Capsules and Refill Context;
- five Knowledge types and human verification;
- native notifications and keyboard navigation;
- encrypted local cache and safe message retry;
- channel, knowledge, and agent permissions;
- provenance and audit history.

### Required end-to-end slice

```text
Channel discussion
-> Mission
-> Claude Work Session
-> missing context
-> teammate refill
-> Claude artifact
-> human review
-> Company Map update
-> verified Company Memory
```

### Explicitly deferred

- Slack migration;
- mobile and Windows clients;
- full web client;
- voice and video calls;
- external guests;
- public agent marketplace;
- multiple AI providers;
- autonomous agent-to-agent delegation;
- agent assignment of company priorities;
- broad Accessibility or screen control;
- productivity analytics;
- custom workflow builder;
- enterprise SSO, SCIM, and compliance administration.

## World-class quality gates

### Prototype gate

Before production implementation, create and test a high-fidelity clickable
prototype covering:

- Today;
- Channel;
- DM;
- Company Map;
- Living Mission Map;
- Start Work Session;
- active Work Session;
- Refill Context;
- Outcome Review;
- Company Memory.

Each surface must include empty, loading, active, blocked, offline, failure, and
completed states.

### Performance

- Warm launch feels immediate.
- Channel and map navigation respond without visible waiting.
- A sent message appears locally instantly.
- Long conversations scroll smoothly.
- Map motion remains fluid.
- Search starts returning useful results while typing.
- Agent updates do not create visual jitter.

### Reliability

- No lost or duplicate messages.
- Reconnection preserves drafts and ordering.
- Agent interruption always leaves a restartable checkpoint.
- Every consequential action reaches one unambiguous terminal state.
- Local and cloud states reconcile visibly.
- Backup and export are verified through restoration tests.

### Accessibility

- Complete keyboard operation.
- VoiceOver labels and meaningful navigation order.
- Reduced-motion alternatives.
- Sufficient contrast without color-only meaning.
- Resizable text and windows.
- Large interaction targets.
- Accessible list alternative for every diagram.

### Privacy and security

- Zero private-channel results exposed through search or AI.
- Zero private Claude context shared without explicit confirmation.
- Agent permissions are visible and immediately revocable.
- Credentials never appear in messages, logs, or Knowledge.
- Deleted or revoked material leaves retrieval and unauthorized local caches.
- Every approval applies to one exact, unchanged action.

### Knowledge quality

- Every Ask Murror answer cites sources.
- Verified, proposed, disputed, stale, and superseded states are distinct.
- Agent claims never silently become company facts.
- Deleted sources flag affected Knowledge for review.
- Conflicts remain visible until reconciled.

### Human success criteria

- A new teammate can send a DM and join a channel without instruction.
- Astro can understand current work, blockers, missing context, and required
  decisions in under 60 seconds.
- A safe Claude Work Session starts in under one minute.
- A teammate can refill context without reading the entire prior transcript.
- Manual status maintenance remains below two minutes per person per day.
- Nobody feels watched, ranked, or pressured to appear active.

## External technical assumptions to verify before implementation

- Claude account history must not be treated as a universal realtime feed.
- Claude and Claude Code session integration must use documented, consented
  interfaces and versioned adapters.
- MCP provides tools and context, not Murror identity, permissions, workflow,
  or Company Memory.
- Mac App Store sandbox and helper-process constraints require a technical spike
  before selecting distribution. Direct Developer ID distribution may better
  support professional local tooling.
- Every provider and adapter needs explicit capability, version, health, and
  revocation behavior.

Reference documentation:

- Anthropic MCP: <https://docs.anthropic.com/en/docs/mcp>
- Claude Code CLI: <https://docs.anthropic.com/en/docs/claude-code/cli-usage>
- Apple App Intents: <https://developer.apple.com/documentation/appintents>
- Apple XPC: <https://developer.apple.com/documentation/XPC>
- Apple App Sandbox: <https://developer.apple.com/documentation/security/app-sandbox>

## Next step

1. Create a high-fidelity clickable prototype using the approved visual and
   lifecycle model.
2. Test the prototype with the Murror team before production implementation.
3. Create an implementation plan for the smallest end-to-end internal alpha.
4. Run technical spikes for realtime chat, Claude session integration, secure
   local bridge, and Mac distribution before committing to irreversible
   architecture.
