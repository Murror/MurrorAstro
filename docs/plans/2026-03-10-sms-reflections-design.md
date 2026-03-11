# SMS Reflections — Design Document

> Date: 2026-03-10
> Status: Approved
> Task: TASK 2a

## Overview

SMS Reflections lets Murror users share AI-generated takeaway reflections with connections who don't have the app, via server-side SMS (Twilio). It also replaces the current client-side SMS invite flow with server-side delivery for consistency and tracking.

## Scope

Two flows:

- **Flow A — SMS Takeaway Sharing:** User journals about a pending (non-app) connection, AI generates a takeaway, and the system sends it via SMS with a link to a web preview page.
- **Flow B — SMS Connection Invite:** Replaces the current native SMS app behavior. When a user taps "Add" on a phone contact, the server sends the invite SMS via Twilio.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| SMS delivery | Server-side via Twilio | Seamless UX, trackable, no manual send |
| SMS content | Takeaway text + web preview link | Higher conversion than raw App Store link |
| Web preview page | New route on murror-platform (`ambercare.app`) | Reuses existing deployment, domain, design system |
| Connection model | Extend existing `friend_invitation` flow | Minimal changes — pending invitations already represent non-app contacts |
| Rate limiting | Max 2 SMS per day per connection | Prevents spam, keeps costs manageable |
| Quiet hours | None | Not needed at current volume |
| Opt-out | Link in every SMS → web page with unsubscribe + re-subscribe | TCPA compliant, user-friendly |
| Invite delivery | Replace native SMS with Twilio for all invites | Consistent, trackable, same infrastructure |

## Flow A: SMS Takeaway Sharing

### Sender Journey

1. Sender journals about a pending (non-app) connection, selects them in connection picker
2. AI generates takeaway (1-2 sentences) — existing viasr-api flow
3. Sender taps "Share with [Name]" in takeaway share sheet
4. System checks: is this connection on the app?
   - **Yes** → existing in-app takeaway card flow (no change)
   - **No** → calls `POST /api/v1/sms/send-takeaway`
5. SMS sent to receiver's phone number:
   - Warm takeaway message
   - Link to `ambercare.app/takeaway/[token]`
   - Opt-out instruction
6. Sender sees confirmation: "Sent to [Name] via text"
7. If receiver has opted out → sender sees "This person has opted out of messages"

### Receiver Journey

1. Receives SMS: "[Sender name] shared a reflection with you: '[takeaway text]' — See more: ambercare.app/takeaway/[token]"
2. Taps link → web preview page shows:
   - Sender's first name
   - Takeaway message, styled with Murror branding
   - "Download Murror" buttons (App Store + Play Store)
   - Brief Murror explainer
3. If they download and sign up → invitation auto-claimed → becomes a real connection

## Flow B: SMS Connection Invite

### Replaces Current Native SMS Behavior

1. User taps "Add" on a phone contact in `connections-add-friend.tsx`
2. Instead of opening native SMS app, calls `POST /api/v1/sms/send-invite`
3. Backend creates `friend_invitation` with phone number → sends SMS via Twilio:
   - "[Name] invited you to Murror — a reflection app for the people you care about. Join here: ambercare.app/invite/[token]"
   - Opt-out instruction
4. User sees confirmation toast: "Invite sent to [Name]"

## Backend Changes

### New: Twilio SMS Service

- New module in `murror-api`
- Wraps Twilio SMS API for sending
- Handles rate limiting (2/day per phone number)
- Checks opt-out status before sending
- Env vars: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

### Database Changes

**Modified: `friend_invitations` table**
- Add `invitee_phone` column (string, nullable) — receiver's phone number
- Add `sms_opt_out` column (boolean, default false)

**New: `sms_delivery_log` table**
- `id` (primary key)
- `invitation_id` (FK to friend_invitations)
- `phone_number` (string)
- `message_type` (enum: 'invite' | 'takeaway')
- `twilio_sid` (string) — Twilio message ID for debugging
- `sent_at` (timestamp)

Used for rate limiting (count per day per phone) and delivery tracking.

### New API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/sms/send-takeaway` | POST | Send takeaway via SMS to non-app connection |
| `/api/v1/sms/send-invite` | POST | Send connection invite via SMS (replaces client-side) |
| `/api/v1/sms/opt-out/:token` | GET | Opt-out handler (called from web page) |
| `/api/v1/sms/resubscribe/:token` | POST | Re-subscribe handler |

## murror-platform Changes

### New Pages

| Route | Purpose |
|-------|---------|
| `ambercare.app/takeaway/[token]` | Web preview of shared takeaway — shows message, sender name, download buttons |
| `ambercare.app/invite/[token]` | Invite landing page — shows inviter info, download buttons |
| `ambercare.app/sms/unsubscribe/[token]` | Opt-out page with re-subscribe option |

## Mobile Changes

### Modified: `connections-add-friend.tsx`
- "Add" button on phone contacts → calls `POST /api/v1/sms/send-invite` instead of opening native SMS app
- Shows confirmation toast on success
- Handles error states (rate limit, opt-out)

### Modified: `add-log-screen.tsx` / Takeaway Share Sheet
- When sharing takeaway with a pending (non-app) connection → calls `POST /api/v1/sms/send-takeaway`
- Shows "Sent via text" confirmation
- Handles opt-out error: "This person has opted out of messages"

### Modified: `connection-picker.tsx`
- Pending connections (invited but not on app) appear in the picker so sender can journal about them

## Compliance

- Every SMS includes opt-out instruction (link-based)
- Rate limit: 2 SMS per day per phone number, enforced server-side
- Opt-out is immediate and persistent
- Re-subscribe available via web page
- Twilio handles carrier-level compliance (10DLC registration may be needed for US numbers at scale)

## Success Metrics (from PRD)

| Metric | Target |
|--------|--------|
| Invite send rate | >60% of users send >= 1 invite |
| Invite acceptance rate | >30% |
| SMS → app download conversion | Track (no target yet) |
