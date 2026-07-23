# Murror Company Memory: Native macOS Implementation Plan

> **Execution rule:** Implement incrementally, one verified task at a time. Do not
> start production code until Astro approves the clickable prototype and the
> bounded technical spikes confirm the architecture.

**Goal:** Deliver a world-class internal macOS collaboration platform where the
Murror team communicates in durable channels and DMs, understands company work
through a visual map, safely collaborates with one Claude integration, refills
agent context, and promotes human-verified knowledge into Company Memory.

**Architecture:** Native SwiftUI plus targeted AppKit client, Murror cloud
modular monolith as the system of record, PostgreSQL and object storage,
realtime updates through a transactional outbox, encrypted local cache and
offline outbox, and a separately secured local agent bridge using narrow local
IPC and MCP at the agent/tool boundary.

**Design doc:**
`docs/plans/2026-07-23-murror-company-memory-native-macos-design.md`

**First release:** One internal workspace, approximately six teammates, native
macOS, one Claude integration, no Slack migration, and one complete
conversation-to-Mission-to-agent-to-verified-knowledge workflow.

---

## Plan guardrails

1. **Prototype before production code.** Visual and interaction quality is a
   release dependency, not post-build polish.
2. **Continue, never rebuild.** Reuse Murror authentication, design tokens,
   Supabase/PostgreSQL knowledge, MCP patterns, handoff conventions, and agent
   safety rules where they fit. Verify current implementations before reuse.
3. **One canonical source.** The cloud owns company messages, permissions,
   knowledge, approvals, runs, and audit history.
4. **One human owner per Work Session.** Multiple people and agents may
   collaborate, but accountability remains explicit.
5. **Work, not surveillance.** No productivity scores, activity monitoring, or
   private-session ingestion.
6. **Permission trimming everywhere.** The same visibility rules apply to chat,
   search, maps, Knowledge, local caches, and agent retrieval.
7. **Draft-first agents.** The first agent integration reads, analyzes, and
   prepares artifacts. Consequential writes arrive only after exact-action
   approval infrastructure is proven.
8. **Evidence-based completion.** A plan or handoff does not count as completed
   work without an artifact, observed event, test, or human verification.
9. **No premature microservices.** Begin with a modular monolith plus workers.
10. **No broad Mac permissions.** Start with selected files, documented APIs,
    MCP, App Intents, and narrow local IPC.

## Required ownership boundary

Before implementation, assign separate ownership for:

- Product design and prototype
- Native macOS client
- Cloud collaboration core
- Local agent bridge
- Quality, accessibility, privacy, and security gates

Concurrent writers use separate worktrees. No agent may modify another owner's
files without an explicit handoff. Merge, push, deploy, account changes, and
destructive actions require Astro's approval.

---

## Phase 0: Product prototype and team validation

### Task 0.1: Establish the prototype workspace

**Purpose:** Create a visual artifact that evaluates the real interaction before
the codebase or technical framework constrains it.

**Deliverables:**

- Prototype artifact with a stable URL or local launch path
- Screen inventory and interaction map
- Visual tokens for color, typography, spacing, elevation, iconography, and
  motion
- Explicit source reference to the approved design document

**Required screens:**

1. Today
2. Channel
3. Direct message
4. Company Map
5. Living Mission Map
6. Start Work Session
7. Active Work Session
8. Refill Context
9. Outcome Review
10. Company Memory

**Acceptance:** Astro can navigate the primary end-to-end workflow without
explanation.

### Task 0.2: Design complete lifecycle states

For every required screen, design:

- empty;
- loading;
- active;
- blocked;
- offline;
- permission denied;
- provider disconnected;
- failed;
- paused;
- completed;
- stale or needs review.

**Acceptance:** No critical state depends on a generic alert or unexplained
spinner.

### Task 0.3: Prototype the core vertical slice

The clickable flow must demonstrate:

```text
Channel discussion
-> create Mission
-> preview and start Claude Work Session
-> Claude requests missing context
-> teammate refills a Context Capsule
-> Claude produces an artifact
-> owner reviews the Outcome Bundle
-> Company Map updates
-> verified Decision enters Company Memory
```

**Acceptance:** Back navigation restores the same channel, map zoom, selected
node, and context rail state.

### Task 0.4: Validate with the internal Murror team

Run short task-based sessions:

- Send a DM and return to the prior channel.
- Find what needs attention today.
- Determine what is blocked and why.
- Start an advise-only Claude session.
- Refill missing context without opening the full prior transcript.
- Verify a proposed Decision.
- Find the source for an Ask Murror answer.

Capture completion, confusion, misclicks, time, trust concerns, and emotional
reaction. Do not ask only whether the screens look attractive.

**Prototype ship gate:**

- All critical tasks complete without facilitator explanation.
- Astro can identify blockers, context needs, and decisions in under 60 seconds.
- No participant interprets the Company Map as individual performance tracking.
- Accessibility review finds a viable keyboard and list-view path.
- Astro explicitly approves the revised prototype.

**Commit:** `docs: validate Murror Company Memory prototype`

---

## Phase 1: Bounded technical spikes

Technical spikes produce evidence and a recommendation. They do not become
production foundations automatically.

### Task 1.1: Native conversation performance spike

Test SwiftUI with targeted AppKit for:

- long virtualized message lists;
- rich selectable text;
- threads and inline cards;
- image/file previews;
- keyboard navigation;
- multiple windows;
- context rail resizing;
- map-to-channel navigation;
- VoiceOver and reduced motion.

Use generated local fixture data with at least 20,000 messages and mixed
attachments. Record launch time, scroll frame rate, memory use, window restore,
and selection behavior.

**Decision output:** SwiftUI-only surfaces, AppKit bridge requirements, and
component boundaries.

### Task 1.2: Realtime chat and offline reconciliation spike

Prove:

- immediate local echo;
- canonical cloud acknowledgement;
- reconnect after network loss;
- client-generated idempotency IDs;
- deterministic message ordering;
- edit and deletion propagation;
- membership revocation invalidating cached access;
- transactional outbox publishing realtime and indexing events.

**Failure tests:** duplicate delivery, delayed acknowledgement, out-of-order
events, revoked membership while offline, and server restart during send.

**Decision output:** realtime transport, local persistence choice, outbox shape,
and reconciliation contract.

### Task 1.3: Claude session and MCP bridge spike

Prove one consented, read-only workflow:

1. Native app creates a Work Session.
2. Cloud issues a short-lived scoped run capability.
3. Local bridge launches or connects to one Claude Code session.
4. Claude receives a versioned Context Capsule.
5. Claude emits structured checkpoints.
6. Murror records cost, state, evidence, and source session ID.
7. Pause, stop, timeout, and provider failure produce correct terminal states.

Use MCP for semantic tools, not a generic unrestricted shell tool. Test
structured JSON/session behavior against the currently installed Claude Code
version and document provider assumptions.

**Security tests:** forged local request, expired capability, changed context
hash, repeated checkpoint, duplicate action, revoked run, and malicious content
inside a retrieved document.

**Decision output:** supported Claude boundary, MCP transport, checkpoint schema,
and provider adapter contract.

### Task 1.4: Secure Mac helper and distribution spike

Prove:

- signed app-to-helper identity;
- narrow XPC or equivalent local IPC;
- no unauthenticated listening port;
- Keychain secret isolation;
- selected-folder security-scoped access;
- helper registration and visible user control;
- version negotiation between client and helper;
- complete revoke and uninstall behavior;
- notarized test distribution.

Compare Developer ID and Mac App Store constraints. Do not select a distribution
path until the helper, sandbox, update, and review implications are recorded.

**Decision output:** helper lifecycle, permissions, signing, update, and
distribution recommendation.

### Task 1.5: Company Map and accessibility spike

Render realistic fixture data with:

- 20 projects;
- 200 work nodes;
- confirmed and suggested dependencies;
- live state changes;
- blocked, stale, and permission-restricted nodes;
- zoom and timeline filters;
- accessible list parity.

**Acceptance:** smooth interaction, no visual jitter, keyboard selection,
VoiceOver-readable state, reduced-motion support, and useful clustering without
graph spaghetti.

### Task 1.6: Architecture decision record

Consolidate the five spikes into one approved record covering:

- chosen client stack and AppKit bridges;
- backend and realtime contract;
- local cache and reconciliation;
- local bridge and MCP contract;
- signing and distribution;
- map rendering approach;
- rejected alternatives and reasons;
- measured risks and restart points.

**Phase gate:** Astro approves the architecture record before production
scaffolding.

**Commit:** `docs: record Murror Company Memory technical spikes`

---

## Phase 2: Production foundation

### Task 2.1: Select the exact repository and worktree

Inventory existing Murror repos and shared packages first. Reuse authentication,
design tokens, API conventions, test infrastructure, and deployment patterns
where appropriate. Create a new dedicated repo only if the spike record proves
the existing platform structure is the wrong boundary.

Document:

- repository and branch;
- owner;
- target environment;
- shared dependencies;
- code-signing and deployment lanes;
- explicit non-overlap boundaries.

### Task 2.2: Freeze versioned contracts

Define and review contracts for:

- principals and memberships;
- channel and DM visibility;
- messages, revisions, threads, reactions, and attachments;
- Work Events and map projection;
- Work Sessions and Context Snapshots;
- checkpoints and Outcome Bundles;
- approvals and terminal states;
- Knowledge Cards, versions, citations, and trust states;
- realtime events and offline reconciliation;
- local bridge capabilities and version negotiation.

Write contract tests before database or UI implementation.

### Task 2.3: Cloud modular monolith skeleton

Create modules for:

- identity and workspace;
- conversations;
- files;
- work and map;
- agent runs;
- knowledge;
- permissions;
- audit;
- notifications;
- search/indexing workers.

Add database migration discipline, local development setup, structured logging,
health endpoints, and focused tests. Do not create separate deployable services.

### Task 2.4: Native Mac application shell

Build the approved three-region layout with:

- sidebar navigation;
- conversation canvas;
- context rail;
- Command-K navigation;
- native Settings;
- window restoration;
- menu-bar status;
- authenticated server connection;
- encrypted local cache boundary;
- design token package;
- accessibility foundations.

Use fixture-backed states before live APIs so visual quality remains testable.

### Task 2.5: Permission engine and audit spine

Implement one permission path used by chat, search, maps, Knowledge, agents, and
local caches. Add append-only audit events for membership, visibility, agent
context, approval, action, knowledge verification, deletion, and revocation.

**Hard test:** a private-channel source must never appear in public search,
Ask Murror, map details, agent context, notifications, or a revoked local cache.

---

## Phase 3: Durable human collaboration

### Task 3.1: Workspace and membership

- Create the single internal workspace.
- Invite and remove teammates.
- Support admin and member roles.
- Apply immediate membership revocation.

### Task 3.2: Channels

- Create public and private channels.
- Join, leave, archive, and restore channels.
- Show purpose, members, agents, Missions, files, and Knowledge in context.
- Enforce visibility in API, realtime, local cache, search, and notifications.

### Task 3.3: Direct messages

- Human-to-human DMs.
- Small-group DMs.
- Private agent conversation identity, without sharing to Company Memory.
- Convert group DM to private channel while preserving attribution.

### Task 3.4: Messages and threads

- Immediate local echo.
- Send, edit, delete, reply, mention, and react.
- Stable revision history and canonical timestamps.
- Retry without duplication.
- Keyboard-first composer and navigation.
- Accessible long-list behavior.

### Task 3.5: Attachments

- Upload with progress and cancellation.
- Permission-bound object storage.
- Preview common internal formats.
- Malware/content checks before agent retrieval.
- Deletion and access revocation propagation.

### Task 3.6: Search and notifications

- Permission-aware keyword search.
- Mentions, assignments, blockers, approvals, and owned completion alerts.
- Immediate, bundled, and quiet delivery preferences.
- No notification for routine tool activity.

**Phase gate:** The Murror team can use native Channels and DMs daily for two
weeks with no lost messages, permission leaks, or critical notification misses.

---

## Phase 4: Missions and visual situational awareness

### Task 4.1: Mission model

Implement outcome, owner, tasks, dependencies, blockers, context needs,
artifacts, decisions, reviews, state, next action, and freshness.

### Task 4.2: Append-only Work Events

Support human-reported, system-observed, agent-reported, derived, proposed, and
human-verified evidence classes. Preserve occurred, observed, and ingested
timestamps plus source sequence.

### Task 4.3: Projection and conflict handling

Reduce Work Events into current Mission state. Never overwrite conflicting
facts silently. Produce review items for conflicts and mark expired signals
stale instead of complete or inactive.

### Task 4.4: Company Map

Implement the approved constellation overview with meaningful clusters,
attention states, timeline filter, calm motion, and accessible list parity.

### Task 4.5: Living Mission Map

Implement dependency flow, node previews, context inspector, confirmed versus
suggested relationships, zoom restoration, and direct source navigation.

### Task 4.6: Today and Since You Left

Derive attention, meaningful changes, blockers, approvals, context needs,
verified decisions, and resumable work. Avoid unread-count pressure and message
volume summaries.

**Phase gate:** Astro answers what is blocked, what needs context, what needs a
decision, and what happens next in under 60 seconds.

---

## Phase 5: One safe Claude collaboration loop

### Task 5.1: Local bridge production boundary

Implement the spike-approved signed helper, local IPC, Keychain isolation,
selected-folder access, version negotiation, health, revoke, update, and
uninstall behavior.

### Task 5.2: Agent identity and installation

Create a stable Claude agent principal with provider/runtime label, human owner,
allowed channels, tools, data sources, budgets, capability status, and health.

### Task 5.3: Start Work Session

Implement goal, context preview, selected sources, repository/folder scope,
allowed tools, owner, visibility, permission mode, and budget. Freeze the exact
authorized Context Snapshot before execution.

### Task 5.4: Work Session card

Render state, plan step, meaningful checkpoint, context need, artifact, cost,
and **Refill context**, **Open map**, **Pause**, and **Stop** controls. Update the
card and map from the same canonical event stream.

### Task 5.5: Structured checkpoint ingestion

Accept session, plan, task, artifact, blocker, context request, review,
handoff, pause, failure, and completion-proposal checkpoints. Enforce source,
sequence, visibility, freshness, idempotency, and provenance.

### Task 5.6: Context Capsule and Refill Context

Assemble authorized policy, verified decisions, current Project State,
playbooks, handoffs, recent evidence, and explicitly attached private context.
Preview recipient, downstream effect, visibility, and version before sharing.

### Task 5.7: Outcome Bundle and human acceptance

Return result, artifacts, diffs, tests/evidence, decisions, risks, unfinished
work, cost, elapsed time, and restart point. Support accept, request changes,
continue, follow-up task, share, and propose Knowledge.

### Task 5.8: Agent failure matrix

Test provider outage, local runner offline, permission revoke, context expiry,
budget limit, app quit, stale approval, duplicate checkpoint, malicious source,
and unexpected process termination. Every case must produce an honest state and
restart point.

**Phase gate:** One internal Mission completes the full approved vertical slice
without private context leakage, duplicate action, lost checkpoint, or false
completion.

---

## Phase 6: Hybrid Company Memory

### Task 6.1: Knowledge Card model

Implement Decision, Project State, Playbook, Policy, and Handoff with source,
author, visibility, version, review state, current/superseded relationship, and
affected Missions.

### Task 6.2: Proposal and verification

Create Knowledge proposals from messages, Missions, artifacts, and Outcome
Bundles. Material edits require side-by-side review. No agent claim becomes
canonical without human confirmation.

### Task 6.3: Permission-aware indexing

Build keyword and semantic derived indexes with canonical source/revision IDs,
visibility, content hashes, parser/model versions, and deletion tombstones.
Permission-check at retrieval time, not only during indexing.

### Task 6.4: Ask Murror

Return concise answers with canonical citations, verified information first,
conflicts, stale/superseded labels, last review time, and direct source links.
Say when evidence is incomplete.

### Task 6.5: Deletion and supersession

Propagate edit, delete, membership, and revocation changes into search, answers,
agent retrieval, local caches, and affected-Knowledge review queues.

**Phase gate:** Every answer is traceable, zero private-source leaks occur, and
deleted/superseded evidence behaves correctly across every retrieval surface.

---

## Phase 7: World-class polish and internal alpha

### Task 7.1: Native interaction polish

- Final typography, spacing, contrast, elevation, and motion.
- Menu bar, global composer, multiwindow behavior, drag-and-drop, and restoration.
- Smooth long-chat and map performance on supported Murror Macs.
- Reduced-motion and keyboard parity.

### Task 7.2: Accessibility sweep

- VoiceOver task completion.
- Logical focus order.
- Complete keyboard operation.
- Text and window resizing.
- Color-independent state meaning.
- List alternatives for diagram surfaces.

### Task 7.3: Privacy and security review

- Threat model chat-to-local-automation paths.
- Verify process isolation, capability expiry, action hashes, and idempotency.
- Test private-channel and DM leakage through every surface.
- Verify credential redaction, backup access, deletion, revoke, and uninstall.
- Review signed update and minimum-safe-version behavior.

### Task 7.4: Reliability and restoration

- No-loss message tests.
- Offline/reconnect soak.
- Provider and helper failure soak.
- Backup restoration.
- Data export verification.
- Corrupt local cache recovery.

### Task 7.5: Internal alpha pilot

Run daily with the Murror team and measure:

- time to understand company state;
- daily manual correction time;
- context-related duplicate work;
- agent runs using reviewed Context Capsules;
- notification misses/noise;
- trust and surveillance concerns;
- search and citation usefulness;
- critical reliability and permission incidents.

## Definition of done

- [ ] Astro approved the high-fidelity prototype.
- [ ] Technical spikes and architecture record were approved.
- [ ] Exact repo, worktree, ownership, deployment, and signing lanes are recorded.
- [ ] Native Channels and DMs survive a two-week internal daily-use gate.
- [ ] Company Map answers core situational-awareness questions in under 60 seconds.
- [ ] One Claude Work Session completes the full vertical slice safely.
- [ ] Context refill works without full-transcript review.
- [ ] Ask Murror cites every answer and respects permissions.
- [ ] No private Claude context is shared without explicit confirmation.
- [ ] No private channel or DM leaks through search, maps, Knowledge, agents,
      notifications, or local cache.
- [ ] No lost/duplicate messages or ambiguous agent terminal states remain.
- [ ] Keyboard, VoiceOver, reduced motion, and accessible map-list parity pass.
- [ ] Backup restoration and data export pass.
- [ ] Team trust review finds no surveillance or pressure pattern.
- [ ] Astro approves internal alpha release.
