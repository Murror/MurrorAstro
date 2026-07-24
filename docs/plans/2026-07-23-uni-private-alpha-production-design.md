# Uni Private Alpha — Shared Work Loop production design

**Status:** Approved  
**Date:** 2026-07-23  
**Product:** Uni, a standalone company and product separate from Murror  
**First audience:** Astro's invite-only team of 3–6 people  
**First provider:** Each teammate's existing authenticated local Claude Code

## Product definition

Uni Private Alpha is a production-capable Mac workspace where a small team and their named Claude agents can complete one real project loop together:

```text
Persistent team conversation
→ bounded agent collaboration
→ focused human question when context is missing
→ reviewable shared result
→ human decision
→ attributable project movement
→ reusable verified company memory
```

The alpha is not a general Slack replacement yet. It succeeds when the team no longer needs Slack for the selected project because Uni's chat is dependable and the agent collaboration creates clear additional value.

## Product principles

1. **Chat is the home.** Progress, Inbox, and Company Memory are consequences of real conversations and work, not parallel data-entry systems.
2. **Agents are owned teammates.** Every custom agent name and portrait remains attached to a visible human owner and provider.
3. **Context is shared deliberately.** Connecting Claude never imports an entire Claude account or private history.
4. **People retain authority.** Agents may propose goals, decisions, artifacts, and completion; only authorized people can make those states official.
5. **Projects move, not people.** Uni does not score presence, hours online, keystrokes, or individual productivity.
6. **Evidence remains inspectable.** Every progress or knowledge claim has an attributable path back to its sources.
7. **Failure is visible and recoverable.** Drafts, messages, agent checkpoints, and human decisions never disappear behind ambiguous status.
8. **Uni is independent.** Production code, data, accounts, infrastructure, legal boundaries, and identifiers do not depend on Murror.

## Private-alpha scope

### Included

- Invite-only workspace creation, invitations, membership, and roles
- Public and private channels
- One-to-one direct messages
- Durable text messages, replies, mentions, reactions, edits, and deletion history
- Search, unread state, focused notifications, and relaunch persistence
- Real-time synchronization between Macs
- Offline drafts and duplicate-safe retry
- Named, user-owned Claude agents connected through signed local helpers
- Agent mention and bounded two-agent huddle
- Visible context, tool, path, time, turn, and ownership scope before execution
- Focus Questions in chat when an agent needs missing context
- Reviewable agent results and artifacts
- Projects with Not started, In progress, Getting there, and Done
- Append-only attributed progress events and a live How we know trail
- Conflict, stale, paused, question, disconnected, and review attention states layered above the four stages
- Human-approved goals, decisions, completion, and versioned Company Memory
- Audit history, revocation, retention/export foundations, and backup restoration

### Deferred

- Slack history migration
- Public signup, billing, or self-service enterprise onboarding
- Mobile, Windows, and Android applications
- Group DMs, voice/video calls, rich document collaboration, and broad file previews
- Codex or additional provider adapters
- Generic MCP marketplace and arbitrary autonomous workflows
- AI access to complete private Claude or direct-message histories
- Full offline-first multi-writer collaboration or CRDTs
- Rich project maps or project-management features beyond evidence-derived movement
- Productivity, performance, presence-duration, or surveillance analytics

## Architecture boundary

```text
Native Uni macOS app
        ↕ authenticated HTTPS and realtime connection
Standalone Uni cloud
        ↕ signed, scoped work requests and event stream
Signed Uni Agent Helper on each teammate's Mac
        ↕ local process boundary
That teammate's authenticated Claude Code
```

### Native macOS application

- SwiftUI owns the application shell, navigation, sheets, cards, Progress, Agents, settings, and most chat composition.
- Selective AppKit/TextKit components handle long virtualized message history, advanced text selection, keyboard behavior, drag-and-drop, and window behavior where SwiftUI alone is insufficient.
- A local SQLite cache provides fast startup, durable drafts, a duplicate-safe outbox, and reconnect recovery.
- The client renders optimistic local state but treats the server's canonical sequence and authorization result as final.
- Keychain stores Uni session material appropriate for a public native client. Claude credentials remain owned by Claude Code and are never copied into Uni.

### Standalone Uni cloud

Use a modular monolith for the private alpha rather than microservices:

- Supabase Auth for invite-only authentication
- PostgreSQL as the canonical data store
- Row Level Security plus server-side authorization for workspace and channel isolation
- Supabase Realtime for authorized updates
- A small TypeScript API/orchestration service for consequential writes, agent runs, approvals, audit emission, and provider-neutral contracts
- A durable worker/queue for agent huddles, retries, expiry, and resumable execution
- Object storage only when artifact/file support enters an approved slice

The server, not the Mac UI, owns canonical authorization, message ordering, role checks, project stage derivation, verified knowledge status, and agent-run lifecycle.

### Signed local agent helper

- Runs as a separately signed local component with a narrow IPC boundary to the Mac application.
- Detects and invokes the teammate's authenticated Claude Code installation without reading, copying, or uploading its credentials.
- Accepts only short-lived, signed work grants from Uni.
- Validates workspace, run, requested directories, allowed tools, maximum turns, expiry, and human approval before execution.
- Uses Claude Code's supported non-interactive/resumable execution and explicit tool restrictions.
- Streams structured, attributable run events back through Uni while keeping unrelated local history and files excluded.
- Immediately stops new work when the person pauses, disconnects, revokes, leaves the workspace, or the capability expires.

### Provider boundary

The first alpha supports multiple teammates' local Claude Code installations through one provider adapter. The adapter contract must preserve provider, owner, local helper, external session, scope, cost, turn, tool, and checkpoint identifiers so Codex or another provider can be added later without changing the product model.

Uni coordinates agent-to-agent work through the cloud. Agents do not establish uncontrolled peer-to-peer connections.

## Core data model

### Identity and collaboration

- `User`
- `Workspace`
- `WorkspaceMembership`
- `Invitation`
- `RoleGrant`
- `Channel`
- `ChannelMembership`
- `DirectConversation`
- `Message`
- `MessageRevision`
- `MessageReaction`
- `ReadCursor`

### Projects and knowledge

- `Project`
- `GoalProposal`
- `GoalApproval`
- `ProgressEvent`
- `EvidenceReference`
- `AttentionState`
- `KnowledgeProposal`
- `KnowledgeVersion`
- `KnowledgeVerification`

### Agents and execution

- `AgentIdentity`
- `ProviderConnection`
- `LocalHelperInstallation`
- `CapabilityGrant`
- `AgentRun`
- `AgentRunParticipant`
- `AgentRunEvent`
- `AgentQuestion`
- `Artifact`
- `ApprovalRequest`
- `AuditEvent`

Every tenant-scoped record carries a workspace identifier. Every human, agent, and system event preserves actor kind, actor identity, source, time, and correlation identifiers.

## Canonical progress rules

- A human-authorized goal approval establishes **Not started**.
- Attributed meaningful work establishes **In progress**.
- A reviewable artifact, resolved question, or verified checkpoint establishes **Getting there**.
- Only an authorized human `outcome-accepted` event establishes **Done**.
- Conflict, stale, paused, question, disconnected, or review-required states never create a fifth stage.
- Reopening accepted work returns it to In progress without deleting the accepted outcome or history.
- Replayed or duplicated events are idempotent and cannot advance progress twice.

## Primary lifecycle

### Before

1. A person accepts an invite and joins the private workspace.
2. Uni restores channels, DMs, projects, history, unread state, drafts, and the person's previous location.
3. The person connects and names their local Claude agent.
4. Uni tests the helper and explains exactly what it may access.
5. The person enters an ordinary channel or DM; no agent workflow is required for normal chat.

### During

1. A person writes a message normally or mentions `@Lumi`.
2. Mentioning two agents proposes a bounded huddle.
3. Uni previews the goal, included channel/project context, explicit local paths, tools, owner, maximum turns, time limit, and estimated cost.
4. An authorized person approves the exact run scope.
5. The cloud issues short-lived signed grants to the owners' local helpers.
6. Each helper runs its local Claude Code adapter and emits structured progress.
7. Chat shows calm status: Available, Thinking, Waiting for you, Ready for review, or Disconnected.
8. Missing consequential context becomes one focused question in the channel.
9. A teammate answers, delegates, uses a visible reversible assumption, or pauses that part of the work.
10. Uni returns one concise result containing agreement, meaningful disagreement, sources, artifacts, and the next human decision rather than flooding chat with internal turns.

### After

1. A person reviews the result, requests changes, pauses, or accepts it.
2. Accepted human and agent activity appends attributable progress events.
3. An authorized human may confirm a goal, decision, direction, freshness, or Done.
4. Accepted decisions and handoffs become versioned, source-linked Company Memory.
5. Later agent runs may retrieve authorized verified memory.
6. Private DMs and private Claude history remain excluded unless a person previews and explicitly shares a scoped excerpt.
7. Capabilities expire while historical attribution remains.
8. Inbox returns the right person to mentions, failed sends, focused questions, reviews, and approvals.

## Message and realtime contract

- Every client write uses a stable client-generated idempotency key.
- The Mac application shows Sending, Sent, or Not sent.
- The server assigns the canonical conversation sequence.
- Reconnect replays from a durable cursor and never duplicates an accepted message.
- Edits create revisions rather than erasing history.
- Deletion semantics distinguish user-visible removal from regulated administrative deletion.
- Read/unread state uses per-user cursors rather than a mutable unread counter.
- Presence remains a lightweight collaboration hint and never becomes a productivity metric.

## Authorization and privacy

- Every read and write is bound to an authenticated user, workspace, and channel/project membership.
- RLS protects tenant data even when a native client communicates directly with approved data APIs.
- Consequential writes also pass through server-owned authorization and audit logic.
- Local clients use public-client authentication with secure redirect handling and token storage.
- Agent runs use short-lived audience-bound grants; token passthrough is forbidden.
- Provider credentials never enter messages, database rows, analytics events, crash reports, or server logs.
- Helper logs redact prompts, file contents, credentials, and tool output by default.
- Private context requires explicit preview, recipient, scope, and share action.
- Removing workspace or channel membership revokes new access and active grants server-side.

## Failure and recovery

| Failure | Visible state | Recovery |
|---|---|---|
| Message not acknowledged | Sending, then Not sent | Retry with the same idempotency key |
| Mac offline | Read cache and keep drafts/outbox | Resume from server cursor on reconnect |
| Helper disconnected | Agent Disconnected; chat remains intact | Reconnect or resume from checkpoint |
| Permission denied | Name the unavailable boundary without leaking it | Remove the source or request access |
| Missing context | Focus Question in chat | Answer, delegate, assume visibly, or pause |
| Agent timeout/crash | Partial work, cost, and checkpoint remain visible | Resume within the same scope or stop |
| Agents disagree | Preserve both attributed positions and evidence | Authorized person confirms direction |
| Membership revoked | Access and active grants end immediately | Historical attribution remains |
| Claude authentication expires | Local connection needs attention | Reauthenticate locally through Claude Code |
| Conflicting updates | Preserve versions and server ordering | Present a review instead of overwriting |

## Accessibility and design

- Preserve the approved light-first matte-glass Uni identity.
- Keep ordinary chat and progress surfaces restrained; gradient personality belongs mainly to agent portraits and limited horizon moments.
- Never use colored left rails for selected states.
- Use text and shape in addition to color for every state.
- Support complete keyboard navigation, VoiceOver, reduced motion, scalable text, high contrast, and meaningful focus restoration.
- Progress always has an accessible list; diagrams may summarize but never become the only navigation.

## Testing and release gates

### Functional

- Two Macs exchange channel and DM messages without loss or duplication.
- Relaunch and reconnect preserve history, drafts, read state, and accepted work.
- A full mention → huddle → focused question → result → human acceptance flow succeeds across two owners' Claude installations.
- Later Claude work retrieves a verified decision with correct attribution and source links.

### Authorization and isolation

- Cross-workspace, private-channel, and DM access attempts fail at the database and service layers.
- An agent cannot widen tools, paths, turns, audience, or expiry.
- An agent cannot approve goals, consequential decisions, or Done.
- Revocation stops future work while preserving historical attribution.
- Private DMs never enter shared context without explicit preview and share.

### Reliability and recovery

- Replayed message and event writes remain idempotent.
- Offline outbox recovery preserves canonical ordering.
- Killed helper and Claude processes leave restartable checkpoints.
- Database backup restoration is exercised before alpha graduation.
- Expired credentials and provider upgrades fail safely.

### Accessibility and quality

- VoiceOver, keyboard-only use, reduced motion, scalable text, and non-color states pass on supported macOS versions.
- Chat remains responsive with the expected private-alpha message history.
- Crash and sensitive-log reviews find no provider tokens or unapproved private content.

## Delivery sequence

### Phase 0 — architecture runway

- Create the standalone Uni repository, environments, ownership boundaries, and CI.
- Freeze the production API/data contracts.
- Spike long-message rendering, realtime/offline reconciliation, and the helper-to-Claude handshake.
- Decide notarized private-alpha distribution and supported macOS floor.

### Phase 1 — reliable team chat

- Authentication, invitations, workspace roles, channels, private channels, and DMs
- Durable/realtime messaging, revisions, reactions, replies, search, unread cursors, notifications
- Local cache, drafts, duplicate-safe outbox, reconnect, and relaunch restoration

### Phase 2 — named Claude teammates

- Agent identity and portrait setup
- Signed helper enrollment and revocation
- Claude Code provider adapter
- Scoped single-agent work, bounded two-agent huddles, Focus Questions, artifacts, pause/stop/resume

### Phase 3 — shared work and memory

- Projects, goals, progress events, Project Pulse, and How we know
- Human review, attention resolution, decisions, handoffs, and versioned Company Memory
- Authorized retrieval of verified knowledge into later agent work

### Phase 4 — private-alpha hardening

- Accessibility, security review, audit/export basics, backup restoration, crash recovery
- Signed/notarized distribution, update path, onboarding, and team runbook
- Ten-business-day dogfood on one real project

## Graduation criteria

The private alpha is functional when:

1. At least three teammates use Uni for one real project for ten business days without duplicating that project's coordination in Slack.
2. A new teammate can accept an invite, send a channel message and DM, reconnect, and find history without engineering assistance.
3. Messages never disappear or duplicate across two Macs, relaunch, and ordinary offline/reconnect cases.
4. At least two people connect and name their own Claude agents.
5. The team completes at least three conversation → huddle → question → result → review → progress → memory cycles.
6. A later Claude session retrieves an accepted decision or handoff with correct source attribution.
7. No agent approves a goal, marks Done, or widens its scope.
8. No cross-workspace, private-channel, credential, or private-context leak occurs.
9. Backup restoration succeeds.
10. Astro can understand movement, blockers, and needed decisions in under sixty seconds.

## Estimated delivery

For two experienced engineers with continuous design and QA support, a credible private alpha is approximately 11–16 weeks:

- Architecture runway: 1–2 weeks
- Reliable chat: 3–4 weeks
- Named Claude agents: 3–4 weeks
- Shared work and memory: 2–3 weeks
- Private-alpha hardening: 2–3 weeks

A solo lane is more realistically 18–26 weeks. These are planning estimates, not release promises; provider integration, signing, security findings, and real two-Mac dogfooding determine actual readiness.

## Authoritative references

- Apple SwiftUI documentation: <https://developer.apple.com/documentation/SwiftUI>
- Supabase Swift client: <https://supabase.com/docs/reference/swift/installing>
- Supabase Row Level Security: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- Supabase Realtime authorization: <https://supabase.com/docs/guides/realtime/authorization>
- Model Context Protocol architecture: <https://modelcontextprotocol.io/specification/2025-06-18/architecture>
- Model Context Protocol authorization: <https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization>
- Claude Code setup and authentication: <https://docs.anthropic.com/en/docs/claude-code/getting-started>
- Claude Code CLI reference: <https://docs.anthropic.com/en/docs/claude-code/cli-usage>
- Claude Code and MCP: <https://docs.anthropic.com/en/docs/mcp>

