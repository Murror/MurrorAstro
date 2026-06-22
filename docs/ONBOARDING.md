# Welcome to Murror — Your AI-Native Onboarding Guide

> Read Part 0 and Part 1. Then read the one **lane** that matches your role. Do your **starter task**. That's week one. 🎉

---

## Part 0 · The One Big Idea

Welcome. Before any tools, one mindset shift — this is the whole thing:

> **You are not doing the work anymore. You are *directing* it, *reviewing* it, and *remembering* it.**

Think of it like running a kitchen instead of cooking every dish yourself. 🧑‍🍳 You don't chop every onion. You tell a very fast, very capable sous-chef (the AI) what dish you want, you *taste it before it goes out*, and you write down what worked so next time is faster.

If you've never used AI tools before, that's fine — being good at this is **not** about being technical. It's about three habits you'll learn here:

1. **Delegate** — describe what you want clearly and hand it off.
2. **Verify** — *never* trust the output blindly. Always check.
3. **Remember** — capture what you learned so the AI (and the team) gets smarter.

That loop — **Delegate → Verify → Remember** — is what "AI-native" means. Everything below teaches you to run it.

---

## Part 1 · The Core (everyone reads this)

### 1.1 · What Murror is

Murror is an app that helps people **dissolve loneliness through self-understanding.** People journal (by typing or voice), our AI detects the emotion behind their words and reflects it back, and over time they understand themselves deeply enough that isolation turns into connection.

We are **not** a mood tracker and **not** a therapist replacement. The guiding belief: *loneliness dissolves through self-understanding.*

See it live:
- 📱 The app: **[web.murror.app](https://web.murror.app)**
- 🌐 Marketing site: **[murror.app](https://murror.app)**
- 📖 The deeper "why": [`MURROR_PRINCIPLES.md`](../MURROR_PRINCIPLES.md) and [`COMPASSION_GUIDELINES.md`](../COMPASSION_GUIDELINES.md) — read these to understand *how we talk to users*.

### 1.2 · The map — what we've built

You don't need to understand the code. You just need a mental model of where things live. Our work lives in a handful of **repos** (a "repo" is just a folder of code that tracks its own history). They're all at `~/Projects/murror-transfer/Murror/`:

| Repo | Plain-English: what it does | Tech (FYI, ignore if non-technical) |
|------|------------------------------|-------------------------------------|
| `murror-api` | The **backend** — the engine that stores data and answers the app's requests | NestJS |
| `viasr-api` | The **AI brain** — emotion detection, chat replies, journal insights, articles | FastAPI / Python |
| `MurrorMobile` | The **phone app** (iPhone + Android) | React Native (Expo) |
| `murror-platform` | The **web app** + marketing site | React / web |
| `docs/` | Shared docs, including `PROGRESS.md` (our running changelog) | Markdown |

If you want to know "what has the team shipped lately?" → open [`PROGRESS.md`](./PROGRESS.md). It's the living history of every change.

### 1.3 · Meet your tools

Three tools do almost everything. Here's *what each is for* — not how it's built.

| Tool | Think of it as… | You use it to… |
|------|-----------------|----------------|
| **Claude Code** | A teammate who lives in your terminal/computer and can read files, write code, run commands, and use the tools below | Do real work: fix things, build things, research, QA, write |
| **AI chat** (Claude.ai / the app) | A smart assistant in a chat box | Think out loud, draft, ask questions, plan |
| **MCP tools** | Plugins that let the AI *act in other apps* — Notion, our database, RevenueCat, Cloudflare, design tools | Let the AI update a Notion page, check a user's subscription, deploy, etc. |

> 💡 **MCP** stands for "Model Context Protocol." You don't need the acronym. Just know: it's how the AI reaches *outside* the chat to do things in real apps. When someone says "the Notion MCP," they mean "the AI's ability to read/write Notion."

### 1.4 · The habit loop (the heart of it) ❤️

This is the most important section in the whole guide. Read it twice.

**① Delegate — describe what you want, clearly.**
A vague ask gets a vague result. A good ask has three parts: *what* you want, *why* / context, and *what "done" looks like.*

- 🚫 Bad: "Fix the article page."
- ✅ Good: "The articles page on web.murror.app shows the date in the wrong format — it says `2026-06-21` but everywhere else we write `June 21, 2026`. Find where the article date is rendered in `murror-platform` and make it match. Show me the change before applying it."

You don't need perfect grammar or jargon. You need to be **specific about the outcome.**

**② Verify — never trust output blindly.** 🔍
The AI is fast and capable, but it *can be confidently wrong.* Your job as the director is to taste the dish before it goes out. Always ask:
- Did it actually do what I asked, or just *say* it did?
- If it's a code change — did it run? Did anything break?
- If it's writing — is it true? Is it in our voice?

Our rule: **evidence before assertions.** "It works" is not the same as "I ran it and here's the output." Make the AI *show* you.

**③ Remember — make the next time faster.** 🧠
When you (or the AI) learns something non-obvious — a gotcha, a preference, a decision — capture it so it's not lost. The AI has a **memory** system and reusable **skills** (pre-written playbooks for common tasks). Over weeks, this compounds: the AI stops repeating mistakes and starts knowing *how we do things here.*

### 1.5 · The Golden Rules ⭐

These are non-negotiable, learned from real production incidents. Memorize them:

1. **Never break working code.** Add new paths; don't rewrite what already works. (This product has real users right now.)
2. **Verify before you say "done."** Run it, test it, show the output. No exceptions.
3. **Ship to *staging* first, never straight to production.** Staging is our practice stage; production is the real show with real users.
4. **Always use Pull Requests — never push straight to `main`.** A "PR" is a proposed change that gets reviewed before it goes in. It's the seatbelt. 🪢
5. **When unsure, ask.** A 30-second question beats a 3-hour cleanup.
6. **Small changes, one at a time.** Don't bundle ten things into one move.

> If you only remember one: **staging first, verify always.**

---

## Part 2 · Your Lane (read the one for your role)

Each lane ends in a **starter task** — a real, small, safe thing you'll actually do this week. *Doing one real thing* is how you get fluent. Reading alone won't do it. 🔑

### 👩‍💻 Lane A — Engineer / technical

**Setup:**
1. Make sure the repos are cloned at `~/Projects/murror-transfer/Murror/`.
2. Open a terminal, `cd` into a repo, and start **Claude Code** (`claude`).
3. Ask it to orient you: *"Give me a tour of this repo — what are the main folders and what does each do?"*

**How we ship (the flow):**
```
make a change  →  open a Pull Request targeting `staging`  →  it gets reviewed
   →  merge to staging  →  test on staging  →  promote to production (manual)
```
You almost never touch production directly. You work on a branch, open a PR against **`staging`**, and let review + staging catch problems first.

**🚀 Where production lives (repos, branches, deploy)**

All repos are under the **`Murror`** GitHub org. Production is **DigitalOcean Kubernetes (DOKS)**, namespace **`nsp-prod-murror`** (the AI service is **`nsp-prod-murror-ai`**). Container images live in **GHCR** (`ghcr.io/murror/...`).

| Component | Repo | Production branch | Deploy mechanism | Live image / target |
|-----------|------|-------------------|------------------|---------------------|
| **Backend API** | `Murror/murror-api` | **`production`** (the prod-slim line — separate from `staging`) | `deploy-matrix.yml` → `gh workflow run deploy-matrix.yml --ref production -f environment=production` (runs the DB migration Job, then rolls) | `ghcr.io/murror/murror-api:<ver>` → `nsp-prod-murror` |
| **Web app** (web.murror.app) | `Murror/murror-platform` (`apps/web-client`) | **`feat/web-app-from-mobile`** | `build-web-client.yml -f environment=production -f image_tag=prod-<sha>`, then `kubectl set image deployment/web-client … -n nsp-prod-murror` | `ghcr.io/murror/murror-platform/web-client:prod-<sha>` |
| **Marketing site** (murror.app) | `Murror/murror-platform` (`apps/marketing`) | **`feat/marketing-site`** | `pnpm build` then `wrangler pages deploy out --project-name=murror --branch=main` | Cloudflare Pages project **`murror`** |
| **AI service** (viasr) | `Murror/viasr-api` | **`production`** | `ci.yaml` → `gh workflow run ci.yaml --ref production -f environment=production` | `nsp-prod-murror-ai` |
| **Supabase edge functions** | `Murror/murror-backend` | `main` | Supabase deploy | Supabase |

⚠️ **Critical prod gotchas (read before any production deploy):**
- **murror-api prod is the `production` branch (prod-slim line), NOT a merge from `staging`.** Changes reach prod by **cherry-picking** the staging commits onto `production`, then dispatching `deploy-matrix`. Do not try to merge `staging → production`.
- **Verify the build compiled YOUR commit before rolling.** `gh workflow run --ref <branch>` checks out the branch tip *at trigger time*, which can lag a just-pushed commit — the image then gets your SHA tag but the *previous* commit's code. Confirm `git ls-remote origin <branch>` tip == your HEAD **before** dispatch, and `gh run view <id> --json headSha` == your commit **before** `kubectl set image`.
- **Migrations are gated.** A schema migration to prod is confirmed with a human first (it runs as a Job inside `deploy-matrix`). Migrations must be additive + idempotent.

**🎯 Starter task — ship a tiny copy fix end-to-end:**
1. In `murror-platform`, ask Claude Code: *"Find a small user-facing text string that uses an em dash (—) and replace it with a comma or period — we don't use em dashes in app copy. Show me the diff first."* (We genuinely have this rule.)
2. Review the change. Does it touch *only* the copy? Good.
3. Have Claude Code open a PR **targeting `staging`** with a clear title.
4. You just shipped your first change the right way. 🎉

> Why this task? It's real, it's safe (just text), and it walks you through the entire delegate → verify → PR loop without risk of breaking anything.

### 🛠️ Lane B — Ops / generalist (no code)

You'll mostly live in **AI chat** and **MCP tools** (Notion, etc.). You never need to touch a terminal if you don't want to.

**The two moves you'll use constantly:**
- **Drafting with skills** — we have pre-built playbooks ("skills") for things like writing articles or documenting work. You invoke one and it runs a proven routine instead of starting from scratch.
- **Acting in apps via MCP** — e.g. "summarize this week's shipped work and post it to our Notion engineering log."

**🎯 Starter task — draft something real with a skill:**
1. In Claude Code (or ask a teammate to run it with you the first time), say: *"Use the `/document` skill to summarize what shipped this week and update the progress page."* — or, to practice content: *"Draft a short, warm article for our marketing site on 'how to reconnect with an old friend,' in Murror's compassionate voice."*
2. **Verify it** — read the draft. Is it true? Is it kind and in our voice (check `COMPASSION_GUIDELINES.md`)? Is anything made up?
3. Revise by asking for specific changes: *"Make the opening warmer and cut the third paragraph."*
4. You just directed → verified → refined a real deliverable. That's the whole job. 🎉

> Why this task? It teaches you that your value isn't *producing* the draft — it's *judging and steering* it.

### 🧭 Lane C — Founder / strategy

Your superpower is **dispatching agents** and **reading their reports** to make decisions. An "agent" is Claude working on a focused task on its own, then reporting back — like sending a specialist to investigate and return with findings.

**The move:**
- You describe a goal → dispatch an agent (or a whole QA sweep) → it works → you read the summary → you decide.

**🎯 Starter task — send an agent to QA a flow and read its report:**
1. In Claude Code, say: *"Run the `qa-sweep` skill on the journaling flow — I want to know if anything is broken or feels off before we push it harder."*
2. Let it work. It'll dispatch specialists (backend, AI, UX) in parallel and come back with findings.
3. **Read the report like a CEO:** What's actually broken vs. nice-to-have? What's the one thing worth fixing first?
4. You just used AI to *see your own product clearly* without doing the digging yourself. 🎉

> Why this task? Directing-and-reviewing is the founder skill. This gives you a felt sense of how much leverage one good dispatch creates.

---

## Part 3 · Getting Unstuck On Your Own 🧭

The goal of week one is to **stop needing to ping anyone** to make progress. Here's the order to try when you're stuck:

1. **Ask Claude Code first.** Seriously — it can read our code, our docs, and our history. *"How do we deploy the web app?"* / *"Where is the article date formatted?"* / *"What does the `viasr-api` repo do?"* It usually knows.
2. **Search our memory + docs.** `PROGRESS.md` is the changelog. `MURROR_PRINCIPLES.md` is the why. The AI's memory holds hard-won lessons — ask *"do we have any notes about X?"*
3. **Check Notion** — our engineering log and dashboards live there.
4. **Then ask a human** — but ask a *good* question. A good question includes: what you're trying to do, what you tried, and what happened (paste the actual error/output). That respects everyone's time and usually gets you unblocked in one reply.

> The trap to avoid: spinning for an hour, *or* pinging a teammate before trying the AI. The sweet spot is ~15 minutes of trying with the AI, then a sharp question.

---

## Part 4 · Cheat Sheet 📋 (print this)

**The 10 things to remember:**
1. You direct, verify, and remember — you don't do it all yourself.
2. Delegate → Verify → Remember. That's the loop.
3. A good ask = *what + why + what "done" looks like.*
4. Never trust output blindly. Make the AI *show* you it works.
5. Never break working code.
6. Staging first. Never straight to production.
7. Always use PRs. Never push to `main`.
8. Small changes, one at a time.
9. When unsure, ask — after trying the AI first.
10. Capture what you learn so next time is faster.

**Words you'll hear (glossary):**
| Word | Plain meaning |
|------|---------------|
| **Repo** | A folder of code that tracks its own history |
| **Branch** | A safe copy where you make changes without touching the main version |
| **PR (Pull Request)** | A proposed change that gets reviewed before going in |
| **Staging** | The practice version of the app (safe to test) |
| **Production / prod** | The real, live app that real users see |
| **Deploy** | Push a change out so it goes live |
| **Prompt** | What you type to ask the AI to do something |
| **Agent** | Claude working on a focused task on its own, then reporting back |
| **MCP tool** | The AI's ability to act in another app (Notion, our DB, etc.) |
| **Skill** | A pre-built playbook the AI follows for a common task |
| **Memory** | Notes the AI keeps so it remembers our preferences and lessons |

**Key links:**
- App → [web.murror.app](https://web.murror.app) · Marketing → [murror.app](https://murror.app)
- Changelog → [`docs/PROGRESS.md`](./PROGRESS.md)
- How we talk to users → [`MURROR_PRINCIPLES.md`](../MURROR_PRINCIPLES.md), [`COMPASSION_GUIDELINES.md`](../COMPASSION_GUIDELINES.md)

---

## Part 5 · Connect Your Toolbox (MCPs) 🔌

Remember from §1.3: an **MCP** is how the AI reaches *outside* the chat to act in a real app (read your Notion, check a Stripe payment, deploy to Cloudflare). To get the same powers we use, you connect the same MCPs. There are **two kinds**, and they connect differently.

### Kind 1 · Connectors — the easy ones (just sign in) ✅

These use **OAuth** — the same "Sign in with Google" flow you already know. No tokens, no terminal.

1. In **Claude Code**, run `/mcp` (or open **Settings → Connectors** in the Claude desktop/web app).
2. Browse the connector directory, find the service, click **Connect**.
3. A browser window opens → sign in / approve → done. The tools appear automatically.

> 🧸 Think of it like linking your Spotify to a new speaker: you tap "connect," log in once, and it just works.

Connect these this way: **Notion, Gmail, Google Calendar, Google Drive, Figma, Canva, OneSignal, Mercury, PostHog, Stripe, RevenueCat, Cloudflare.**

### Kind 2 · Config MCPs — paste one command (for URL / local-app tools) ⌨️

These you add with a single terminal command. Copy-paste exactly. Use `--scope user` so the tool works in **every** project, not just the folder you're standing in:

```bash
# Remote (hosted) MCP servers — these are the real URLs we use
claude mcp add stripe        --scope user --transport http https://mcp.stripe.com/
claude mcp add revenuecat    --scope user --transport http https://mcp.revenuecat.ai/mcp
claude mcp add cloudflare    --scope user --transport http https://mcp.cloudflare.com/mcp
claude mcp add higgsfield    --scope user --transport http https://mcp.higgsfield.ai/mcp
claude mcp add facebook-ads  --scope user --transport http https://mcp.facebook.com/ads

# OpenAI Codex — a second-opinion code reviewer (runs locally via npx)
claude mcp add codex-cli     --scope user -- npx -y codex-mcp-server
```

**Local-app MCPs** (Beeper, Palmier, Ableton) only work while that desktop app is **running** — they expose a server on your own machine (e.g. `http://localhost:…`). Open the app first, then connect.

> ⚠️ **Three gotchas that trip everyone up** (learned the hard way):
> 1. **Scope:** plain `claude mcp add` only adds the tool to your *current folder*. Add `--scope user` to get it everywhere.
> 2. **Restart:** after adding an MCP, **start a fresh Claude Code session** — a session already running keeps the old toolset and won't see the new tool.
> 3. **OAuth step:** for remote servers, after `claude mcp add` run `/mcp` and pick the server to finish signing in.

### The full service directory 🗂️

What each thing is, and what we use it for. You won't touch all of these — connect what your role needs.

**🛠️ Engineering & Infrastructure**
| Service | What it is | We use it to… |
|---------|-----------|----------------|
| **Cloudflare** | Hosting + DNS + edge platform | Serve the web app & marketing site, manage domains (murror.app), Workers/Pages/R2 storage |
| **PostHog** | Product analytics + session replay | See how users actually use the app, funnels, retention |
| **Codex (OpenAI)** | A second AI code reviewer | Get an independent second opinion on code changes |
| **Scheduled tasks** | Cron for AI agents | Run recurring jobs (daily articles, investor updates) |

**💳 Money & Subscriptions**
| Service | What it is | We use it to… |
|---------|-----------|----------------|
| **Stripe** | Payment processing | Web subscriptions & billing |
| **RevenueCat** | Mobile in-app subscriptions | Manage App Store / Play subscriptions, paywalls, entitlements |
| **Mercury** | Business bank account | Check balances, transactions, runway (read-only — never move money via AI) |

**📣 Marketing & Growth**
| Service | What it is | We use it to… |
|---------|-----------|----------------|
| **Meta / Facebook Ads** | Ad platform | Run & analyze ad campaigns |
| **OneSignal** | Push notifications | Send app/web push (reminders, re-engagement) |

**🎨 Design & Creative**
| Service | What it is | We use it to… |
|---------|-----------|----------------|
| **Figma** | Design files | Read designs, design-to-code, build the design system |
| **Canva** | Quick graphics & brand templates | Marketing visuals, social posts |
| **Higgsfield** | AI image/video generation | Generate article illustrations, marketing creative |
| **Palmier** | AI video editor (local app) | Edit videos on a timeline |
| **Ableton** | Music production (local app) | Audio / music experiments |

**🗂️ Productivity & Communication**
| Service | What it is | We use it to… |
|---------|-----------|----------------|
| **Notion** | Our team wiki | Engineering log, dashboards, this guide, trackers |
| **Gmail** | Email | Read/draft email |
| **Google Calendar** | Scheduling | Check & create events |
| **Google Drive** | File storage | Find & read shared files |
| **Beeper** | All-in-one messaging (local app) | Unified inbox across chat apps |

**🖥️ Computer & Browser control** (built in — no setup)
| Tool | What it is |
|------|-----------|
| **Claude in Chrome** | Lets the AI drive a browser tab (DOM-aware) — install the Chrome extension |
| **Computer Use** | Lets the AI see your screen and click/type in native Mac apps |
| **Claude Preview** | Spins up a local dev server so the AI can verify web changes |
| **Memory search** | Lets the AI search our accumulated lessons & history |

> 💡 **Don't connect everything on day one.** Connect the 3–4 your role needs, then add more as you hit a task that needs one. Each connection asks the AI to do more — only grant what you'll use.

### Your day-one setup checklist ☑️

Tick these off and you're ready. Everyone does the **Core** set; then do your **role** set.

**🌱 Core — everyone**
- [ ] Claude Code installed and opens (`claude` in a terminal)
- [ ] **Notion** connected (you need it to read this + our docs)
- [ ] **Memory search** working (ask: *"do we have notes about X?"* and see if it answers)
- [ ] You've read Part 0, Part 1, and your lane in Part 2

**👩‍💻 Engineer — add these**
- [ ] Repos cloned at `~/Projects/murror-transfer/Murror/`
- [ ] **Cloudflare** connected (hosting/DNS)
- [ ] **PostHog** connected (analytics)
- [ ] **Codex** connected (second-opinion reviews)
- [ ] **Claude Preview** working (verify web changes locally)
- [ ] ✅ Completed your starter task: shipped a copy fix via PR to `staging`

**🛠️ Ops / generalist — add these**
- [ ] **Gmail** connected
- [ ] **Google Calendar** connected
- [ ] **Google Drive** connected
- [ ] **Canva** connected (if you make visuals) / **OneSignal** (if you send push)
- [ ] ✅ Completed your starter task: drafted + verified a real piece with a skill

**🧭 Founder / strategy — add these**
- [ ] **Mercury** connected (banking — read-only)
- [ ] **PostHog** connected (product metrics)
- [ ] **Stripe** + **RevenueCat** connected (revenue picture)
- [ ] **Meta Ads** connected (if you watch growth)
- [ ] ✅ Completed your starter task: ran a `qa-sweep` and read the report

> 🎯 If every box in **Core + your role** is ticked and your starter task is done — congratulations, you're AI-native. That's week one. 🎉

---

## Part 6 · Our Skills & Agents (use these — consistently) 🧩

This is what makes us a *team* and not ten people improvising. Over time we've packaged how we work into **skills** (playbooks Claude follows) and **agents** (specialist teammates you dispatch). When everyone uses the same ones, our output stays consistent — same quality bar, same voice, same safety checks.

> ⭐ **The one rule:** *Before you start a task, check whether a skill or agent already covers it — don't freelance what we've already systematized.* If a skill exists for it, use the skill. That's the whole point.

### 6.1 · Skill vs. agent — what's the difference?

| | **Skill** | **Agent** |
|--|-----------|-----------|
| What it is | A saved **playbook/routine** Claude follows step by step | A **specialist teammate** Claude dispatches to do focused work and report back |
| How you trigger it | Type `/name` (e.g. `/document`), or it auto-activates when relevant | Ask Claude to "use the [name] agent" or describe a task in that domain |
| Example | `/qa-sweep` runs our standard product audit | The `cortex` agent investigates a backend bug |

### 6.2 · Our 20 specialist agents (the "org") 🤖

Think of these as 20 expert coworkers, each with one domain. You dispatch the right one — or several in parallel — and they report findings back. (House rule, baked in: **agents report findings; they don't open PRs or deploy. You review, then apply.**)

**🛠️ Engineering & Quality**
| Agent | Dispatch when you're working on… |
|-------|----------------------------------|
| `cortex` | Backend / API — NestJS, database, auth, queues, webhooks |
| `iris` | Frontend / mobile — React Native screens, navigation, UI |
| `muse` | AI / ML — prompts, emotion analysis, RAG, the viasr brain |
| `atlas` | Infrastructure — deploys, Kubernetes, DNS, CI/CD, health checks |
| `vault` | Security — secrets, encryption, hardening, vulnerability scans |
| `sentinel` | Quality — testing, bug hunts, pre-deploy verification |

**🎨 Product, Design & Empathy**
| Agent | Dispatch when you're working on… |
|-------|----------------------------------|
| `prism` | Design / UX — design system, typography, layout, web platform |
| `heart` | Empathy — emotional flow, tone, persona advocacy, sensitivity |

**📈 Growth, Marketing & Data**
| Agent | Dispatch when you're working on… |
|-------|----------------------------------|
| `forge` | Growth — ASO, referral loops, acquisition, activation |
| `voice` | Brand / marketing — messaging, positioning, app store copy |
| `scribe` | Content — blog, social, SEO, mental-health content |
| `oracle` | Data / analytics — retention, funnels, cohorts, dashboards |
| `beacon` | Customer success — onboarding, churn, support, feedback |

**💼 Business & Operations**
| Agent | Dispatch when you're working on… |
|-------|----------------------------------|
| `north` | Strategy / co-CEO — roadmap, prioritization, tradeoffs, ROI |
| `compass` | Fundraising — pitch deck, investors, SAFE notes, data room |
| `ledger` | Finance — bookkeeping, tax, burn rate, unit economics |
| `herald` | Partnerships — B2B, universities, therapists, licensing |
| `steward` | Operations — vendors, procurement, budgets, contractor onboarding |
| `aegis` | Legal / compliance — privacy policy, ToS, IP, contracts |
| `shield` | Healthcare regulatory — HIPAA, crisis protocols, clinical safety |

> 💡 **Power move:** for anything big (a release, a tricky feature), dispatch **several agents in parallel** — e.g. `cortex` + `iris` + `sentinel` all reviewing the same change at once. Faster *and* more thorough than one pass.

### 6.3 · Our custom Murror skills 🎨

These are *ours* — built specifically for how Murror works. Use them instead of doing the task from scratch.

| Skill | What it does | Reach for it when… |
|-------|--------------|---------------------|
| `/document` | Our standard write-up routine (PROGRESS, engineering log, public progress page) | You finished work worth recording. **Always use this — never document ad hoc.** |
| `/qa-sweep` | Audits the product for bugs/regressions across frontend, backend, AI, data, security | Before a release, or as a routine health check |
| `/persona-qa` | Stress-tests the product through our defined user personas | You want to feel the product as real users would (see `USER_PERSONAS.md`) |
| `/compassion-review` | Checks AI prompts & user-facing copy against our compassion guidelines (TNH voice) | You edited any prompt, notification, or user-facing text |
| `/habit-design` | Designs features/onboarding/engagement using our habit framework | Designing anything meant to encourage repeated user behavior |
| `/systems-analysis` | Systems-thinking lens for product/growth problems | "Why is this happening?", retention puzzles, growth loops |
| `ux-guardian` | Dispatches 3 parallel UX agents (flow, design-compliance, build) so complex flows don't lose context | Building any UI feature or fixing a UX bug |
| `emil-design-eng` | UI-polish philosophy — the invisible details that make software feel great | Polishing animations, micro-interactions, component feel |
| `dream` | Consolidates recent learnings into durable, organized memory | End of a session; cleaning up memory |
| `continuous-learning` | Captures recurring patterns/lessons into memory mid-session | After a meaty debug, deploy, or incident |

### 6.4 · Core process skills — everyone, every task ⚙️

These come from our "superpowers" toolkit and encode *how we approach work*. They're not Murror-specific, but using them consistently is what keeps quality even across the team.

| Skill | Use it… |
|-------|---------|
| `brainstorming` | **Before** building anything — explore intent & design first (you saw it used to plan *this* guide) |
| `writing-plans` / `executing-plans` | Turn a spec into a step-by-step plan, then execute with checkpoints |
| `test-driven-development` | Write the test first, then the code |
| `systematic-debugging` | Any bug — find the root cause before patching |
| `verification-before-completion` | **Before** claiming "done" — run it, show the evidence |
| `requesting-code-review` / `receiving-code-review` | Get and respond to review without rubber-stamping |
| `dispatching-parallel-agents` | When you have 2+ independent tasks — fan them out |
| `using-git-worktrees` | Isolated workspace per task so parallel agents don't collide |

> These map directly onto our Golden Rules (§1.5): `verification-before-completion` = "verify before done," `using-git-worktrees` = "small changes, isolated," and so on.

### 6.5 · Specialist infra skills (when you need them) ☁️

You won't use these daily — they exist for specific infrastructure work, mostly Cloudflare: `cloudflare`, `wrangler`, `workers-best-practices`, `durable-objects`, `agents-sdk`, `sandbox-sdk`, `cloudflare-email-service`, `turnstile-spin`, and `web-perf` (page-speed audits). Just know they're there; Claude will pull them in when a task calls for it.

### 6.6 · How to actually use one

- **Skill:** type `/` in Claude Code to see available skills, or just type `/document` (etc.). Often you don't even need to — describe your task and Claude auto-invokes the right skill.
- **Agent:** say *"use the `sentinel` agent to verify this change"* or *"dispatch `cortex` and `iris` in parallel to review the PR."*
- **Not sure which?** Just ask: *"Is there a skill or agent for this?"* Claude will point you to the right one. 🧭

---

## Part 7 · Make Your Setup Identical to Ours ⚙️✨

> **Goal:** in about 5 minutes, your machine has the *exact* same agents, skills, and tools the team uses — so your work comes out consistent with ours. No guessing, no missing pieces.

Everything you need is bundled in this repo at **`docs/team-setup/`**:

```text
docs/team-setup/
├── agents/      ← our 20 specialist agents
├── skills/      ← our custom Murror skills
└── setup.sh     ← the one command that installs it all
```

### 🚀 Option A — One command (recommended)

Open a terminal and paste this. That's it.

```bash
cd ~/Projects/murror-transfer/Murror
bash docs/team-setup/setup.sh
```

<table>
<tr><td>

**What the script does for you** 🪄

| Step | What it installs |
|:----:|------------------|
| 1️⃣ | **Plugins** — process skills (`superpowers`), memory (`claude-mem`), analytics (`posthog`) |
| 2️⃣ | **20 agents** → `~/.claude/agents/` |
| 3️⃣ | **Custom skills** → `~/.claude/skills/` |
| 4️⃣ | **MCP tools** — Stripe, RevenueCat, Cloudflare, Higgsfield, Meta Ads, Codex |

</td></tr>
</table>

### 🧩 Option B — Manual, step by step

Prefer to understand each piece (or the script hit a snag)? Do these four in order.

> **① Install the plugins** — these give you the process skills, memory, and analytics.
> ```bash
> claude plugin marketplace add anthropics/claude-plugins-official
> claude plugin marketplace add thedotmack/claude-mem
> claude plugin install superpowers@claude-plugins-official
> claude plugin install posthog@claude-plugins-official
> claude plugin install claude-mem@thedotmack
> ```

> **② Install the 20 agents** — copy them into your Claude config.
> ```bash
> mkdir -p ~/.claude/agents
> cp -R ~/Projects/murror-transfer/Murror/docs/team-setup/agents/. ~/.claude/agents/
> ```

> **③ Install the custom skills** — same idea, for skills.
> ```bash
> mkdir -p ~/.claude/skills
> cp -R ~/Projects/murror-transfer/Murror/docs/team-setup/skills/. ~/.claude/skills/
> ```

> **④ Connect the MCP tools** — `--scope user` makes them work in every project.
> ```bash
> claude mcp add stripe       --scope user --transport http https://mcp.stripe.com/
> claude mcp add revenuecat   --scope user --transport http https://mcp.revenuecat.ai/mcp
> claude mcp add cloudflare   --scope user --transport http https://mcp.cloudflare.com/mcp
> claude mcp add higgsfield   --scope user --transport http https://mcp.higgsfield.ai/mcp
> claude mcp add facebook-ads --scope user --transport http https://mcp.facebook.com/ads
> claude mcp add codex-cli    --scope user -- npx -y codex-mcp-server
> ```

### 🔑 Two manual finishing touches (both options)

Some things can't be scripted — they need *you*:

1. **Restart Claude Code.** Start a **fresh session** so it picks up the new agents, skills, and tools. (A session that was already open keeps the old toolset.)
2. **Sign in to the connectors.** Run `/mcp`, then sign in to the OAuth connectors you need — **Notion, Gmail, Calendar, Drive, Figma, Canva, OneSignal, Mercury, PostHog** — and finish the OAuth pop-up for Stripe / RevenueCat / Cloudflare. (See Part 5 for the full list.)

### ✅ Verify it worked

Run these in a fresh Claude Code session — you should see:

- [ ] `/agents` → lists ~**20** agents (cortex, iris, muse, atlas… all the way to voice)
- [ ] `/` (skills menu) → shows `/document`, `/qa-sweep`, `/compassion-review`, etc.
- [ ] `/mcp` → shows the servers above, connected
- [ ] Ask Claude: *"List the agents available to me"* — it names our org

When all four are ticked, **your setup is identical to ours.** 🎉

> 🔐 **One note on `/persona-qa`:** the QA test-account **passwords are not stored in the repo** (we never commit secrets). When you run persona QA, get the test password from Astro (or the team vault) and swap it in where you see `YOUR_QA_PASSWORD`. Everything else works out of the box.

---

> **Welcome aboard.** 🌱 You don't need to be technical to be great at this. You need to be a clear thinker who delegates well, checks carefully, and remembers what works. Do your starter task this week — that's how it clicks.
