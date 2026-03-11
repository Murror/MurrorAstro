# MURROR — Product Requirements Document

**AI-Powered Reflection for Deeper Human Connection**
**Version 1.0 | March 2026**
**OutCast LLC — CONFIDENTIAL**

---

## Table of Contents

1. [Vision & Mission](#1-vision--mission)
2. [Target Audience](#2-target-audience)
3. [Product Overview](#3-product-overview)
4. [Core Concepts](#4-core-concepts)
5. [App Structure & Navigation](#5-app-structure--navigation)
6. [Feature Specifications](#6-feature-specifications)
7. [AI Layer](#7-ai-layer)
8. [Subscription Model](#8-subscription-model)
9. [Design System](#9-design-system)
10. [Technology Stack](#10-technology-stack)
11. [Safety & Privacy](#11-safety--privacy)
12. [Success Metrics](#12-success-metrics)
13. [Open Questions](#13-open-questions)

---

## 1. Vision & Mission

**Vision:** A world where no one feels alone — where technology helps people truly understand each other, not just talk past each other.

**Mission:** Murror uses AI to help Gen Z build emotional intelligence, self-awareness, and deeper empathy with the people who matter most. It's not a messaging app. It's not therapy. It's a mirror (murror) that helps you see yourself and the people you care about more clearly.

**Core Belief:** Loneliness isn't about being alone — it's about feeling unseen. Murror creates understanding between people by helping them reflect honestly, then translating those reflections into empathy.

### What Murror Is NOT

- Not a messaging app (no direct communication between users)
- Not a social network (no feeds, followers, likes)
- Not therapy (no clinical claims, no diagnoses)
- Not journaling (though it includes journal-like features, the core is relational)

---

## 2. Target Audience

### Primary: Gen Z (18–27)

| Trait | Detail |
|-------|--------|
| Age | 18–27 |
| Pain point | Loneliness, emotional isolation, difficulty expressing feelings to family/friends/partners |
| Behavior | Comfortable with AI, skeptical of social media, value authenticity and mental health |
| Device | Primarily mobile (iOS + Android) |
| Willingness to pay | Moderate — will pay for genuine value, allergic to "premium unlock" games |

### Key Personas

**Maya, 22 — The Long-Distance Daughter**
Moved to a new city for her first job. Loves her mom but doesn't know how to talk about the distance. Wishes her mom understood her without having to explain everything.

**Jaylen, 25 — The Disconnected Friend**
Has a close friend group from college, but everyone's busy. Conversations have become surface-level. Wants to go deeper but doesn't know how to start.

**Ava, 19 — The Anxious Partner**
In her first serious relationship. Struggles to communicate needs. Gets overwhelmed and shuts down. Wants to understand her own patterns before they become problems.

**Kai, 24 — The Family Peacemaker**
Caught between parents who don't communicate well. Wants the family to understand each other. Would pay to get everyone on the same page.

---

## 3. Product Overview

### One-Line Description

Murror is an AI reflection app that helps you understand yourself and the people you care about — by reflecting privately, then sharing curated insights that build empathy.

### How It Works (30-Second Pitch)

- **You reflect** — Talk to Murror about how you're feeling, what's on your mind, or a specific relationship
- **Murror understands** — AI identifies patterns, emotions, and opportunities for growth
- **You grow** — Get insights about yourself (journal), your mental health (check-ins), and your relationships (shared reflections)
- **You connect** — When both people reflect, Murror synthesizes and shares insights that help them understand each other — without revealing raw content

### Product Pillars

| Pillar | Description |
|--------|-------------|
| Self-awareness | Solo reflections help users understand their own emotions, triggers, and patterns |
| Empathy | Shared reflections help users understand each other through AI-mediated insight synthesis |
| Safety | Privacy is absolute — raw reflections are never shared; only AI-curated insights cross between people |
| Growth | Science-backed mental health tracking (PHQ-9, GAD-7) gives users a longitudinal view of their wellbeing |
| Knowledge | AI research agent proactively finds relevant, credible articles to deepen understanding |

---

## 4. Core Concepts

### Reflection

A reflection is a private conversation between the user and Murror's AI. The user shares how they're feeling — about themselves, a relationship, a situation. Murror guides the conversation with empathetic prompts, never leading or diagnosing.

**Types of reflection:**
- **Solo reflection** — about yourself, your day, your feelings
- **Connection reflection** — about a specific relationship or person
- **Shared reflection** — both people in a connection reflect independently, then Murror synthesizes insights for both

### Connection

A connection is a meaningful relationship the user wants to understand better. Connections are not "friends" or "followers" — they are people the user cares about deeply.

- Each connection is a specific person (family member, partner, friend, roommate)
- Connections are mutual once both people are on Murror
- One-sided connections still work — the user can reflect about someone who isn't on the app

### Insight

An insight is an AI-generated understanding about the user, a connection, or a relationship. Insights are:

- **Synthesized** — drawn from patterns across reflections, not from a single session
- **Privacy-preserving** — never contain raw reflection content from the other person
- **Actionable** — include specific suggestions for building understanding
- **Warm** — framed positively, never judgmentally

### Shared Reflection Flow

Person A reflects privately with Murror about the relationship. Person B reflects privately with Murror about the relationship. Murror AI synthesizes both reflections (never sharing raw content). Both receive a curated insight card with: topic overview, how each person expressed themselves (abstracted), what both can do to build understanding, and a "Reflect Deeper" prompt for continued growth.

---

## 5. App Structure & Navigation

### Navigation Model

Tab bar (glassmorphic frosted glass, bottom of screen) with 5 tabs + center Murror FAB:

| Position | Tab | Icon | Purpose |
|----------|-----|------|---------|
| Left 1 | Home | House | Dashboard — orbit, moments, streaks, research preview |
| Left 2 | Connections | People | Your close ones — connection list + detail views |
| Center | Murror Button | Butterfly (brand mark) | Start a new reflection (FAB — floating action button) |
| Right 1 | Reflection | Brain/mind | Mental health tracking — PHQ-9, GAD-7, happy streak |
| Right 2 | Research | Book/search | AI-curated articles from credible sources |

The Murror butterfly FAB is the primary call-to-action, always prominent in the center of the tab bar. Tapping it opens the reflection flow.

### SOS Button

Visible on the Home screen (top-left corner). Tapping opens crisis resources: National Suicide Prevention Lifeline (988), Crisis Text Line (text HOME to 741741), and custom emergency contact (if set). This is always accessible, never paywalled.

---

## 6. Feature Specifications

### 6.1 Home Tab

The Home tab is the emotional dashboard — a warm landing screen that orients the user.

**Layout (top to bottom):**
- **Header:** "Hey, [Name]" greeting + SOS button (top-left) + settings gear (top-right)
- **Connection orbit:** User avatar at center, connection avatars orbiting around it (closer connections = closer orbit)
- **Moments to Care:** Horizontal scrollable cards showing AI-generated insights about connections
- **Streak section:** Day streak count + motivational message
- **Research from Murror:** Preview of 1–2 recently curated research articles
- **Journal history:** Recent reflection entries with AI-generated mood art thumbnails
- **Inspirational quote:** Rotating EQ/empathy quotes

### 6.2 Connections Tab

**Connection List View:**
Each connection is a card showing: avatar with gradient border, name, zodiac sign badge (optional), AI insight summary (1–2 lines), and gradient color coding by relationship type. Tap to open Connection Detail View.

**Connection Detail View:**
Header shows "[Name] & Me" with relationship type label and paired avatar display. Sections include:
- **For Us** — Introduction card explaining shared reflections
- **Reflection Cards** — Stacked cards showing pending/in-progress/completed shared reflections
- **Past Insights** — Scrollable list of completed shared reflection insights
- **Relationship Quotes** — AI-curated quotes relevant to the relationship

**Insight Detail View:**
Full-screen view for completed shared reflection insights. Layout includes: hero AI-generated illustration, topic title, Murror overview paragraph, expression difference (side-by-side speech bubbles showing abstracted perspectives), personalized recommendations for each person, and a "Reflect Deeper" CTA with privacy assurance.

### 6.3 Reflection Tab

The Reflection tab is the user's mental health tracking dashboard.

**Layout:**
- **Your Data card:** Total reflections, current streak, days on Murror
- **Mental Check-In:** PHQ-9 / GAD-7 toggle, monthly bar chart, score interpretation, Check-In button, recommended monthly frequency
- **Happy Streak:** Calendar view showing reflection activity with streak display

**Disclaimer:** "This is not a clinical diagnosis. If you're struggling, please reach out to a professional."

### 6.4 Research Tab

Murror acts as a personal research agent. Based on reflections, mental health data, and relationship patterns, Murror proactively finds and curates articles from credible sources (university research centers, established mental health organizations, peer-reviewed summaries). No clickbait or unvetted blogs.

Each article card includes: AI-generated illustration, topic title, topic tags, source attribution, and brief excerpt. Detail view includes hero illustration, related reflections linking back to journal entries.

### 6.5 Journal Tab

Chronological archive of reflections. Each entry shows AI-generated mood art, date, summary, and mood indicator. Detail view includes hero art, date/topic, and three insight cards:

- **Next Steps** (cyan): Actionable recommendations
- **Within You** (pink): Deep self-exploration insights with "Dive Deeper" CTA
- **Murror's Perspective** (yellow): Warm, honest observation framed as a caring friend

### 6.6 Murror Reflection Flow (Center FAB)

Tapping the Murror butterfly opens the reflection experience:

1. **Prompt selection:** Suggested prompts based on recent activity, free-form option, connection-specific option
2. **Reflection conversation:** Chat-like interface, 3–8 exchanges (2–5 minutes), empathetic follow-up questions
3. **Post-reflection summary:** AI mood art, summary, Next Steps / Within You / Murror's Perspective cards, auto-saved to Journal
4. **Shared reflection variant:** Same flow; after both people complete, Murror synthesizes insights for both

### 6.7 Onboarding

| Step | Screen | Purpose |
|------|--------|---------|
| 1 | Welcome | Brand intro — "Murror helps you understand yourself and the people you care about" |
| 2 | How It Works | 3-step explainer: Reflect → Understand → Connect |
| 3 | Profile Setup | Name, avatar, date of birth |
| 4 | Your Why | Multi-select motivation (understand myself, improve relationships, manage anxiety, feel less alone, build EQ) |
| 5 | Add Connections | "Who do you want to understand better?" — contacts import or manual entry |
| 6 | Notifications | Push notification prompt framed as gentle reflection reminders |
| 7 | Sign Up | Email/OAuth (Google, Apple) account creation |
| 8 | Trial Start | "Your 7-day free trial is active" |
| 9 | First Reflection | Guided first reflection prompt — immediate value |

For invited users (via family plan or connection invite): Skip steps 5 and 8. After sign-up, show: "You're part of [Name]'s family on Murror — Premium is free for you!"

---

## 7. AI Layer

### AI Model

Claude (Anthropic) is used for all AI features via the Anthropic SDK.

| Feature | Model | Purpose |
|---------|-------|---------|
| Reflection conversations | Claude Haiku | Real-time guided reflection dialogue |
| Insight synthesis | Claude Sonnet | Deeper analysis for shared reflection insights |
| Journal summaries | Claude Haiku | Post-reflection summary generation |
| Research curation | Claude Haiku | Article discovery and relevance scoring |
| Mood art prompts | Claude Haiku | Generate prompts for AI illustration generation |
| Mental health interpretation | Claude Haiku | Warm framing of PHQ-9/GAD-7 scores |

### AI Principles

- **Never diagnose** — Murror is not a therapist. AI never makes clinical claims.
- **Never judge** — Reflections are met with curiosity, not evaluation.
- **Never reveal** — Raw reflection content from one person is never shared with another.
- **Always warm** — Every AI output uses empathetic, no-guilt language.
- **Always suggest, never prescribe** — Recommendations are framed as options, not instructions.
- **Escalate when needed** — If crisis language is detected, gently surface SOS resources.

### AI Safety Rails

- **Content filtering:** Block and redirect harmful content
- **Crisis detection:** Keywords and sentiment analysis for suicide/self-harm → immediate SOS surfacing
- **No-guilt language enforcement:** System prompts include banned phrases; post-processing scans
- **Privacy boundary:** System prompts explicitly prevent raw quotes from crossing between users

---

## 8. Subscription Model

### Plans

| Plan | Price | Billing | Audience |
|------|-------|---------|----------|
| Free trial | $0 | 7 days | All new users |
| Murror Premium (monthly) | $12.99/mo | Monthly recurring | Individual users |
| Murror Premium (yearly) | $89.99/yr (~$7.50/mo) | Annual recurring | Individual users (42% savings) |
| Murror Family (monthly) | $19.99/mo | Monthly recurring | Families & friend groups |
| Murror Family (yearly) | $149.99/yr (~$12.50/mo) | Annual recurring | Families & friend groups |

### Feature Comparison

| Feature | Trial (7 days) | Premium | Family |
|---------|----------------|---------|--------|
| Solo reflections | Unlimited | Unlimited | Unlimited (per member) |
| Shared reflections | Unlimited | Unlimited | Unlimited (per member) |
| AI insight synthesis | Full depth | Full depth | Full depth |
| Journal + mood art | Full | Full | Full |
| Mental health tracking | Full | Full | Full |
| AI research agent | Full | Full | Full |
| Accounts | 1 | 1 | 4 base (1 owner + 3 members) |
| Additional members | — | — | +$2.99/mo per extra (no cap) |
| Family Circle | — | — | Shared group insights feed |

### Post-Trial Behavior

- Paywall shown — cannot start new reflections
- Existing reflection history is viewable (read-only)
- Connections are preserved (not deleted)
- SOS button remains accessible (never paywalled)

**Subscription Provider:** RevenueCat — handles App Store + Play Store subscription lifecycle. Family logic managed in-house on the backend.

---

## 9. Design System

### Design Philosophy

Murror's design language is introspective, warm, and slightly ethereal. It should feel like opening a private space — safe, calm, and uniquely yours. Dark-mode-first.

### Color System

| Token | Hex | Usage |
|-------|-----|-------|
| background | #0A0A1A | Primary dark background (deep navy-black) |
| surface | #1A1A2E | Cards, elevated surfaces |
| primary | Gradient (green → cyan) | Primary CTAs, connection cards |
| accent-pink | #EC72FF → #FF6B9D | Insights, "Within You" cards, premium accents |
| accent-cyan | #12DBEC → #4ECDC4 | "Next Steps" cards, action items, success states |
| accent-yellow | #FFD93D → #F9CE11 | "Murror's Perspective" cards, warmth |
| accent-green | #49DCB1 → #4ECDC4 | Connection cards, positive states |
| text-primary | #FFFFFF | Headlines, body text |
| text-secondary | #9C9CAE | Subtitles, timestamps, captions |

### Typography

| Style | Weight | Size | Usage |
|-------|--------|------|-------|
| Large Title | Bold | 34px | Screen headers |
| Title 1 | Bold | 28px | Section headers |
| Title 2 | Semi Bold | 22px | Card titles |
| Body | Regular | 17px | Body text, reflection content |
| Callout | Medium | 16px | Card descriptions, insight text |
| Caption | Regular | 13px | Timestamps, metadata |

### Illustrations

AI-generated illustrations are a core part of Murror's identity. Style: watercolor, dreamy, abstract — soft edges, muted tones with color accents. Per-reflection mood art is unique to each journal entry. Research and insight hero images are generated via AI image APIs using prompts crafted by Claude.

### Special UI Elements

- **Glassmorphic tab bar:** Frosted glass effect (blur + transparency)
- **Murror butterfly FAB:** Center tab position, brand signature
- **Starry night background:** Dark gradient with subtle animated star particles
- **Connection orbit:** User avatar at center, connections orbiting by emotional closeness
- **Motion:** Subtle, calming animations (fade-in, crossfade, gentle floating, slow star drift)

---

## 10. Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Mobile | React Native + Expo | Cross-platform (iOS + Android) |
| Backend | Supabase | Auth, database (PostgreSQL), storage, realtime |
| AI | Claude (Anthropic SDK) | Reflection conversations, insight synthesis, research curation |
| AI (structured output) | Instructor | Pydantic models for structured Claude responses |
| Illustrations | AI image generation API | Per-reflection mood art, article illustrations |
| Subscriptions | RevenueCat | Cross-platform subscription management |
| SMS delivery | Twilio | Warm nudges to non-app connections |
| Push notifications | Expo Notifications | APNs + FCM for reminders and nudges |
| Analytics | PostHog or Mixpanel | Event tracking, funnels, retention |

### Key Data Entities

| Entity | Key Fields | Notes |
|--------|-----------|-------|
| User | id, name, avatar, dob, zodiac, timezone, subscriptionTier | App user |
| Connection | id, userId, connectedUserId, name, phone, relationshipType | Relationship link |
| Reflection | id, userId, connectionId, type, status, content, summary, moodArtUrl | Core unit |
| Insight | id, connectionId, reflectionAId, reflectionBId, topic, overview | Shared reflection output |
| MentalCheckIn | id, userId, type (phq9/gad7), score, responses | Longitudinal tracking |
| ResearchArticle | id, userId, title, body, sourceUrl, tags | AI-curated content |
| JournalEntry | id, reflectionId, summary, nextSteps, withinYou | Post-reflection cards |
| Subscription | id, userId, tier, familyGroupId, familyRole | Billing state |
| FamilyGroup | id, ownerId, name, baseMemberCount | Family plan group |
| Invitation | id, inviterId, inviteePhone, code, type, status | Invite tracking |

---

## 11. Safety & Privacy

### Privacy Principles

- Raw reflections are never shared — only AI-synthesized insights cross between users
- Reflections are stored encrypted at rest
- No read receipts, no online status indicators
- Users can export or delete all their data at any time
- Minimal collection — only what's needed for the product to function

### Crisis Safety

| Trigger | Response |
|---------|----------|
| Suicide/self-harm language | Immediately surface SOS resources (988, Crisis Text Line). Do NOT attempt to counsel. |
| User taps SOS button | Show crisis resources directly — no confirmation dialogs, no delays |
| PHQ-9 score >= 20 (Severe) | Include warm professional referral language after showing results |
| GAD-7 score >= 15 (Severe) | Same warm professional referral language |

### Content Safety

- AI system prompts include explicit safety rails (no harmful advice, no medical claims)
- Automated safety filters monitor for harmful patterns (not individual reading)
- Users can report concerning insights or AI behavior
- Regular AI safety audits

### Compliance

- **COPPA:** Minimum age 18 enforced at sign-up. If future versions support under-18, COPPA compliance required.
- **TCPA / SMS:** Explicit consent for SMS, opt-out instructions in all messages, rate limits (max 2/day per connection). Opt-out via link in every SMS with re-subscribe option on web page (`ambercare.app/sms/unsubscribe/[token]`).

---

## 12. Success Metrics

### North Star Metric

**Shared reflections completed per week** — this is the core action that delivers Murror's unique value. Everything else supports this.

### Key Metrics

| Category | Metric | Target | Why |
|----------|--------|--------|-----|
| Activation | First reflection within 24h of signup | >70% | Users who reflect immediately are far more likely to retain |
| Activation | First connection added within 48h | >50% | Connections unlock the shared reflection value |
| Engagement | Weekly active reflectors | >60% of subscribers | Consistent reflection = consistent value |
| Engagement | Shared reflections per user/month | >2 | Validates relational product, not just solo journaling |
| Retention | 30-day retention (Premium) | >50% | Solo experience must retain on its own |
| Retention | 30-day retention (Family) | >70% | Family accountability improves retention |
| Revenue | Trial-to-paid conversion | >15% | Validates pricing and trial experience |
| Revenue | Family plan adoption | >25% of subscribers | Validates family value prop |
| Growth | Invite send rate | >60% send >= 1 invite | Organic growth engine |
| Growth | Invite acceptance rate | >30% | Validates invite messaging |
| Safety | SOS button usage | Monitor (no target) | Track for crisis response effectiveness |
| Quality | PHQ-9/GAD-7 completion rate | >40% monthly | Users engaging with mental health tracking |

---

## 13. Open Questions

### Product

- **Voice reflections:** Should Murror support voice input? Gen Z increasingly prefers voice notes. Could lower friction significantly.
- **Group reflections:** Beyond 1:1, should Murror support group reflections (e.g., whole family reflects on a shared topic)?
- **Notification cadence:** How often should Murror prompt? Daily? Adaptive based on engagement patterns?
- **AI illustration service:** DALL-E, Midjourney API, Stable Diffusion, or Ideogram? Cost and quality trade-offs.

### Technical

- **Offline support:** Should reflections work offline (saved locally, synced when connected)?
- **End-to-end encryption:** E2E for storage but decrypted in-memory for AI processing? Hybrid approach needed.
- **Supabase scalability:** Will Edge Functions handle AI orchestration load, or should a separate backend service be introduced?

### Business

- **App Store review:** Hard paywalls after trial risk rejection. Fallback: allow 1 solo reflection/week on free tier?
- **Gen Z price sensitivity:** $12.99/mo is premium. Consider student pricing? Yearly plan ($7.50/mo) is the key lever.
- **International SMS costs:** Vary significantly by country. May need to cap or exclude from base plan.
- **Therapist partnerships:** Partner with BetterHelp/Talkspace for users whose scores suggest professional help? Referral revenue + user benefit.

---

## Appendix A: Tone & Language Guidelines

### Murror's Voice

Murror speaks like a wise, warm friend — someone who listens more than they talk, asks good questions, and never makes you feel judged.

**Do:**
- "You've been showing up for yourself — that matters"
- "It sounds like this relationship means a lot to you"
- "There's no right way to feel about this"
- "Someone who cares about you thought of you today"

**Don't:**
- "You haven't reflected in 3 days" (guilt)
- "Don't miss your daily reflection!" (FOMO/pressure)
- "Maya is waiting for your reflection" (social pressure)
- "Your score indicates depression" (clinical diagnosis)
- "Upgrade to unlock this feature" (transactional)

---

## Appendix B: Competitive Landscape

| App | What It Does | How Murror Differs |
|-----|-------------|-------------------|
| Headspace / Calm | Meditation & mindfulness | Murror is relational, not just individual wellness |
| BetterHelp / Talkspace | Online therapy | Murror is not therapy — it's reflection and empathy-building between peers |
| Replika | AI companion chatbot | Murror connects real people; AI is the bridge, not the relationship |
| Jour / Day One | Journaling apps | Murror adds shared reflections + AI synthesis — journaling is just one feature |
| Hinge / Bumble | Relationship features | Murror is for all relationships (family, friends, partners), not dating |

### Murror's Moat

- **Shared reflection synthesis** — No other app mediates between two people's private reflections to generate empathy insights
- **Science-backed tracking** — PHQ-9 and GAD-7 integrated into a consumer app with warm, non-clinical presentation
- **AI research agent** — Proactive, personalized article curation from credible sources
- **Privacy-first architecture** — Raw reflections never cross between users
- **Family plan for emotional health** — Making empathy affordable for whole families

---

*This document is a living PRD. It will evolve as the product grows, user feedback is gathered, and the market develops.*
