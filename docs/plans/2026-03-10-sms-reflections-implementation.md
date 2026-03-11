# SMS Reflections Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable Murror users to share takeaway reflections and connection invites with non-app users via server-side SMS (Twilio), with web preview pages and opt-out compliance.

**Architecture:** Twilio SMS service added as a new module in murror-api (NestJS, clean architecture). Web preview pages added as new routes on murror-platform (Next.js App Router on `ambercare.app`). Mobile app modified to call server-side SMS endpoints instead of opening native SMS app.

**Tech Stack:** NestJS 11, Prisma (schema.prisma for friend_invitations), Twilio Node SDK, Next.js 16 (App Router), React Native, Tailwind CSS 4.0

---

## Task 1: Database Migrations

**Files:**
- Modify: `murror-api/prisma/schema.prisma` (friend_invitations model, ~line 815)
- Create: `murror-api/prisma/migrations/YYYYMMDD_add_sms_fields/migration.sql`

**Step 1: Add columns to friend_invitations**

Add `invitee_phone` and `sms_opt_out` to the existing `friend_invitations` model in `schema.prisma`:

```prisma
model friend_invitations {
  id          Int                      @id @default(autoincrement())
  inviter_id  String                   @db.Uuid
  token       String                   @unique @db.Uuid
  status      friend_invitation_status @default(SENT)
  created_at  DateTime                 @default(now()) @db.Timestamptz(6)
  updated_at  DateTime                 @default(now()) @db.Timestamptz(6)
  deleted_at  DateTime?                @db.Timestamptz(6)
  invitee_id  String?                  @db.Uuid
  invitee_phone String?                // NEW: receiver's phone number
  sms_opt_out Boolean                  @default(false) // NEW: opt-out flag

  // existing relations...
}
```

**Step 2: Create sms_delivery_log table**

Add a new model to `schema.prisma`:

```prisma
model sms_delivery_log {
  id             Int      @id @default(autoincrement())
  invitation_id  Int
  phone_number   String
  message_type   sms_message_type
  twilio_sid     String?
  sent_at        DateTime @default(now()) @db.Timestamptz(6)

  friend_invitations friend_invitations @relation(fields: [invitation_id], references: [id])

  @@index([phone_number, sent_at])
}

enum sms_message_type {
  INVITE
  TAKEAWAY
}
```

**Step 3: Run migration**

```bash
cd murror-api
pnpm run prisma:migrate -- --name add_sms_fields
```

Expected: Migration created and applied. Prisma client regenerated.

**Step 4: Commit**

```bash
git add prisma/
git commit -m "feat(sms): add invitee_phone, sms_opt_out, and sms_delivery_log table"
```

---

## Task 2: Twilio SMS Service Module

**Files:**
- Create: `murror-api/src/sms/sms.module.ts`
- Create: `murror-api/src/sms/sms.service.ts`
- Create: `murror-api/src/sms/sms.service.spec.ts`
- Modify: `murror-api/src/config/env.validation.ts` (~add Twilio env vars)
- Modify: `murror-api/src/config/configuration.ts` (~add Twilio config)
- Modify: `murror-api/src/app.module.ts` (~import SmsModule)

**Step 1: Add Twilio env vars to config**

In `env.validation.ts`, add to the `EnvironmentVariables` class:

```typescript
@IsString()
@IsOptional()
TWILIO_ACCOUNT_SID?: string;

@IsString()
@IsOptional()
TWILIO_AUTH_TOKEN?: string;

@IsString()
@IsOptional()
TWILIO_PHONE_NUMBER?: string;
```

In `configuration.ts`, add to the config object:

```typescript
twilio: {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.TWILIO_PHONE_NUMBER,
},
```

**Step 2: Write the SMS service test**

```typescript
// sms.service.spec.ts
describe('SmsService', () => {
  it('should send an SMS via Twilio', async () => {
    // Mock Twilio client
    // Call sendSms(to, body)
    // Assert Twilio messages.create was called with correct params
  });

  it('should not send if phone number is opted out', async () => {
    // Mock opted-out invitation
    // Call sendSms → expect it to throw/return error
  });

  it('should enforce rate limit of 2 SMS per day per phone', async () => {
    // Mock 2 existing sms_delivery_log entries for today
    // Call sendSms → expect rate limit error
  });
});
```

**Step 3: Write the SMS service**

```typescript
// sms.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import * as twilio from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly client: twilio.Twilio;
  private readonly fromNumber: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const accountSid = this.configService.get('twilio.accountSid');
    const authToken = this.configService.get('twilio.authToken');
    this.fromNumber = this.configService.get('twilio.phoneNumber');
    this.client = twilio.default(accountSid, authToken);
  }

  async sendSms(
    invitationId: number,
    phoneNumber: string,
    body: string,
    messageType: 'INVITE' | 'TAKEAWAY',
  ): Promise<{ success: boolean; error?: string }> {
    // 1. Check opt-out
    const invitation = await this.prisma.friend_invitations.findUnique({
      where: { id: invitationId },
    });
    if (invitation?.sms_opt_out) {
      return { success: false, error: 'OPTED_OUT' };
    }

    // 2. Check rate limit (2 per day per phone)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = await this.prisma.sms_delivery_log.count({
      where: {
        phone_number: phoneNumber,
        sent_at: { gte: today },
      },
    });
    if (count >= 2) {
      return { success: false, error: 'RATE_LIMITED' };
    }

    // 3. Send via Twilio
    try {
      const message = await this.client.messages.create({
        to: phoneNumber,
        from: this.fromNumber,
        body,
      });

      // 4. Log delivery
      await this.prisma.sms_delivery_log.create({
        data: {
          invitation_id: invitationId,
          phone_number: phoneNumber,
          message_type: messageType,
          twilio_sid: message.sid,
        },
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${phoneNumber}`, error);
      return { success: false, error: 'SEND_FAILED' };
    }
  }
}
```

**Step 4: Create SmsModule**

```typescript
// sms.module.ts
import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';

@Module({
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
```

**Step 5: Register in AppModule**

Add `SmsModule` to the `imports` array in `app.module.ts`.

**Step 6: Install Twilio SDK**

```bash
cd murror-api
pnpm add twilio
```

**Step 7: Run tests**

```bash
cd murror-api
pnpm test -- --testPathPattern=sms.service.spec
```

Expected: All tests pass.

**Step 8: Commit**

```bash
git add src/sms/ src/config/ src/app.module.ts package.json pnpm-lock.yaml
git commit -m "feat(sms): add Twilio SMS service with rate limiting and opt-out"
```

---

## Task 3: Backend API Endpoints — SMS Send

**Files:**
- Create: `murror-api/src/sms/sms.controller.ts`
- Create: `murror-api/src/sms/dto/send-takeaway-sms.dto.ts`
- Create: `murror-api/src/sms/dto/send-invite-sms.dto.ts`
- Modify: `murror-api/src/sms/sms.module.ts` (add controller)

**Step 1: Create DTOs**

```typescript
// send-takeaway-sms.dto.ts
export class SendTakeawaySmsDto {
  @IsInt()
  invitationId: number;

  @IsString()
  takeawayText: string;
}

// send-invite-sms.dto.ts
export class SendInviteSmsDto {
  @IsString()
  phoneNumber: string;

  @IsString()
  contactName: string;
}
```

**Step 2: Create controller**

```typescript
// sms.controller.ts
@Controller({ path: 'sms', version: '1' })
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class SmsController {
  constructor(
    private readonly smsService: SmsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('send-takeaway')
  async sendTakeaway(
    @Body() dto: SendTakeawaySmsDto,
    @Request() req,
  ) {
    // 1. Look up invitation to get phone number
    // 2. Get sender's name from user profile
    // 3. Build SMS body: takeaway text + web preview link + opt-out
    // 4. Call smsService.sendSms()
    // 5. Return result
  }

  @Post('send-invite')
  async sendInvite(
    @Body() dto: SendInviteSmsDto,
    @Request() req,
  ) {
    // 1. Create friend_invitation with invitee_phone
    // 2. Get sender's name from user profile
    // 3. Build SMS body: invite message + landing page link + opt-out
    // 4. Call smsService.sendSms()
    // 5. Return result
  }
}
```

**Step 3: Register controller in SmsModule**

Add `SmsController` to `controllers` array in `sms.module.ts`.

**Step 4: Run and test manually**

```bash
cd murror-api
pnpm run dev
```

Test with curl or Postman against `POST /api/v1/sms/send-invite`.

**Step 5: Commit**

```bash
git add src/sms/
git commit -m "feat(sms): add send-takeaway and send-invite API endpoints"
```

---

## Task 4: Backend API Endpoints — Opt-Out & Resubscribe

**Files:**
- Modify: `murror-api/src/sms/sms.controller.ts` (add opt-out/resubscribe endpoints)

**Step 1: Add opt-out endpoint**

```typescript
@Get('opt-out/:token')
async optOut(@Param('token') token: string) {
  // 1. Find invitation by token
  // 2. Set sms_opt_out = true
  // 3. Return { success: true }
}
```

**Step 2: Add resubscribe endpoint**

```typescript
@Post('resubscribe/:token')
async resubscribe(@Param('token') token: string) {
  // 1. Find invitation by token
  // 2. Set sms_opt_out = false
  // 3. Return { success: true }
}
```

Note: These endpoints do NOT require authentication — they're accessed from SMS links by non-app users.

**Step 3: Commit**

```bash
git add src/sms/
git commit -m "feat(sms): add opt-out and resubscribe endpoints"
```

---

## Task 5: Web Preview Page — Takeaway

**Files:**
- Create: `murror-platform/apps/web/app/takeaway/[token]/page.tsx`
- Create: `murror-platform/apps/web/app/takeaway/[token]/layout.tsx` (optional, if needed)

**Step 1: Create the takeaway preview page**

This is a **server-side rendered** page (Next.js App Router). When the receiver taps the SMS link, this page loads.

```tsx
// app/takeaway/[token]/page.tsx
export default async function TakeawayPage({ params }: { params: { token: string } }) {
  // 1. Fetch takeaway data from murror-api using the token
  //    GET /api/v1/sms/takeaway-preview/:token (new public endpoint)
  // 2. If not found or expired → show "This link has expired" message
  // 3. Render:
  //    - Murror logo/branding
  //    - "[Sender name] shared a reflection with you"
  //    - Takeaway text in a styled card
  //    - "Download Murror" buttons (App Store + Play Store links)
  //    - Brief Murror explainer paragraph
  //    - Footer with privacy note
}
```

**Step 2: Style with Tailwind**

Use the existing `@repo/ui` design tokens and Tailwind classes. The page should be:
- Mobile-first (most receivers will view on phone)
- Murror-branded (colors, fonts from design system)
- Simple and warm — not overwhelming

**Step 3: Add public API endpoint for preview data**

In `murror-api/src/sms/sms.controller.ts`, add:

```typescript
@Get('takeaway-preview/:token')
async getTakeawayPreview(@Param('token') token: string) {
  // 1. Find invitation by token
  // 2. Find associated takeaway text
  // 3. Get sender's first name
  // 4. Return { senderName, takeawayText, expired: false }
}
```

**Step 4: Test locally**

```bash
cd murror-platform
pnpm dev --filter=web
```

Visit `http://localhost:3000/takeaway/test-token` — should render the page.

**Step 5: Commit**

```bash
git add apps/web/app/takeaway/
git commit -m "feat(sms): add takeaway web preview page"
```

---

## Task 6: Web Preview Page — Invite Landing

**Files:**
- Create: `murror-platform/apps/web/app/invite/[token]/page.tsx`

**Step 1: Create invite landing page**

Similar to takeaway page but simpler:

```tsx
// app/invite/[token]/page.tsx
export default async function InvitePage({ params }: { params: { token: string } }) {
  // 1. Fetch invite data: GET /api/v1/sms/invite-preview/:token
  // 2. Render:
  //    - Murror logo
  //    - "[Name] invited you to Murror"
  //    - Brief explainer: "A reflection app for the people you care about"
  //    - Download buttons (App Store + Play Store)
}
```

**Step 2: Add public API endpoint**

```typescript
@Get('invite-preview/:token')
async getInvitePreview(@Param('token') token: string) {
  // 1. Find invitation by token
  // 2. Get inviter's first name
  // 3. Return { inviterName, expired: false }
}
```

**Step 3: Commit**

```bash
git add apps/web/app/invite/
git commit -m "feat(sms): add invite landing web page"
```

---

## Task 7: Web Page — SMS Opt-Out / Resubscribe

**Files:**
- Create: `murror-platform/apps/web/app/sms/unsubscribe/[token]/page.tsx`

**Step 1: Create opt-out page**

This is a **client-side interactive** page (needs state for unsubscribe/resubscribe toggle):

```tsx
'use client';

export default function UnsubscribePage({ params }: { params: { token: string } }) {
  // State: isOptedOut (start as false, call opt-out API on mount)
  // 1. On mount: call GET /api/v1/sms/opt-out/:token
  // 2. Show: "You've been unsubscribed from Murror messages"
  // 3. Show "Re-subscribe" button
  // 4. On re-subscribe click: call POST /api/v1/sms/resubscribe/:token
  // 5. Toggle UI: "You'll receive messages again" + "Unsubscribe" button
}
```

**Step 2: Commit**

```bash
git add apps/web/app/sms/
git commit -m "feat(sms): add opt-out/resubscribe web page"
```

---

## Task 8: Mobile — Replace Native SMS Invite with Server-Side

**Files:**
- Modify: `MurrorMobile/src/screens/main/Home/connections-add-friend.tsx` (~line 175, `onShareSms`)
- Modify: `MurrorMobile/src/apis/client/relationship-api-client.ts` (add new API method)

**Step 1: Add API method**

In `relationship-api-client.ts`, add:

```typescript
async sendInviteSms(phoneNumber: string, contactName: string): Promise<{ success: boolean; error?: string }> {
  const response = await this.apiClient.post('/api/v1/sms/send-invite', {
    phoneNumber,
    contactName,
  });
  return response.data;
}
```

**Step 2: Modify onShareSms**

In `connections-add-friend.tsx`, replace the current `onShareSms` function (which opens native SMS) with:

```typescript
const onShareSms = async (contact: Contact) => {
  try {
    const phoneNumber = contact.phoneNumbers?.[0]?.number;
    if (!phoneNumber) return;

    const result = await apiClient.relationshipClient.sendInviteSms(
      phoneNumber,
      `${contact.givenName} ${contact.familyName}`.trim(),
    );

    if (result.success) {
      // Show success toast
      Toast.show({ type: 'success', text1: t('Connections.inviteSent') });
    } else if (result.error === 'OPTED_OUT') {
      Toast.show({ type: 'info', text1: t('Connections.optedOut') });
    } else if (result.error === 'RATE_LIMITED') {
      Toast.show({ type: 'info', text1: t('Connections.rateLimited') });
    }
  } catch (error) {
    Toast.show({ type: 'error', text1: t('Connections.inviteFailed') });
  }
};
```

**Step 3: Add i18n keys**

In `en.json` and `vi.json`, add:
- `Connections.inviteSent`: "Invite sent!"
- `Connections.optedOut`: "This person has opted out of messages"
- `Connections.rateLimited`: "Daily message limit reached for this contact"
- `Connections.inviteFailed`: "Failed to send invite. Please try again."

**Step 4: Test on simulator**

```bash
cd MurrorMobile
yarn start
yarn ios
```

Navigate to Add Connection → tap "Add" on a phone contact → should call API instead of opening SMS app.

**Step 5: Commit**

```bash
git add src/screens/main/Home/connections-add-friend.tsx src/apis/client/relationship-api-client.ts src/locales/
git commit -m "feat(sms): replace native SMS invite with server-side Twilio"
```

---

## Task 9: Mobile — SMS Takeaway Sharing for Non-App Connections

**Files:**
- Modify: `MurrorMobile/src/screens/main/Journal/connection-picker.tsx` (show pending connections)
- Modify: `MurrorMobile/src/queries/relationship/use-get-connected-friends.ts` (include pending)
- Modify: `MurrorMobile/src/screens/main/Journal/add-log-screen.tsx` (SMS branch in share flow)
- Modify: `MurrorMobile/src/apis/client/relationship-api-client.ts` (add sendTakeawaySms method)

**Step 1: Add sendTakeawaySms API method**

```typescript
async sendTakeawaySms(invitationId: number, takeawayText: string): Promise<{ success: boolean; error?: string }> {
  const response = await this.apiClient.post('/api/v1/sms/send-takeaway', {
    invitationId,
    takeawayText,
  });
  return response.data;
}
```

**Step 2: Modify use-get-connected-friends to include pending connections**

Currently filters to `friendType === 'Connected'` only. Add a separate query or modify to also return `PendingSent` friends, with a flag indicating they're pending (non-app).

```typescript
// Option: return both connected and pending friends
const connectedFriends = friends.filter(f => f.friendType === 'Connected');
const pendingFriends = friends.filter(f => f.friendType === 'PendingSent');
return { connectedFriends, pendingFriends };
```

**Step 3: Modify ConnectionPicker to show pending connections**

Add pending friends to the horizontal list with a visual indicator (e.g., dashed border, "SMS" badge) so the sender knows this person isn't on the app.

**Step 4: Modify add-log-screen share flow**

In the `onShareTakeaway` function, add a branch:

```typescript
const onShareTakeaway = async () => {
  if (isPendingConnection) {
    // Non-app connection → send via SMS
    const result = await apiClient.relationshipClient.sendTakeawaySms(
      invitationId,
      takeawayText,
    );
    if (result.success) {
      Toast.show({ type: 'success', text1: t('Takeaway.sentViaSms') });
    } else if (result.error === 'OPTED_OUT') {
      Toast.show({ type: 'info', text1: t('Takeaway.optedOut') });
    }
  } else {
    // Existing in-app flow
    await createTakeawayMutation.mutateAsync({ takeawayText });
  }
  setShowTakeawaySheet(false);
};
```

**Step 5: Add i18n keys**

- `Takeaway.sentViaSms`: "Sent via text to [Name]"
- `Takeaway.optedOut`: "This person has opted out of messages"

**Step 6: Test on simulator**

1. Add a phone contact as connection (should send invite via Twilio)
2. Journal about that pending connection
3. Share takeaway → should send SMS (not create in-app card)

**Step 7: Commit**

```bash
git add src/screens/main/Journal/ src/queries/relationship/ src/apis/client/ src/locales/
git commit -m "feat(sms): enable takeaway sharing with non-app connections via SMS"
```

---

## Task 10: End-to-End Testing

**Step 1: Test Flow B (SMS Connection Invite)**
1. Open app → Add Connection → phone contacts
2. Tap "Add" on a contact → verify SMS sent via Twilio (check Twilio console)
3. Open `ambercare.app/invite/[token]` → verify invite landing page renders
4. Verify rate limiting: send 2 invites to same number → 3rd should fail

**Step 2: Test Flow A (SMS Takeaway Sharing)**
1. Journal about a pending (non-app) connection
2. Share takeaway → verify SMS sent via Twilio
3. Open `ambercare.app/takeaway/[token]` → verify preview page renders
4. Test opt-out: visit unsubscribe link → verify opted out
5. Try to send again → verify sender sees opt-out message
6. Re-subscribe → verify can receive SMS again

**Step 3: Test edge cases**
- Invalid/expired tokens on web pages
- Missing phone number
- Twilio service down (graceful error handling)
- Sender sees correct messages for all error states

**Step 4: Commit any test fixes**

```bash
git commit -m "fix(sms): address issues found during e2e testing"
```

---

## Task Summary

| Task | What | Where |
|------|------|-------|
| 1 | Database migrations | murror-api/prisma |
| 2 | Twilio SMS service | murror-api/src/sms |
| 3 | Send API endpoints | murror-api/src/sms |
| 4 | Opt-out/resubscribe endpoints | murror-api/src/sms |
| 5 | Takeaway web preview page | murror-platform/apps/web |
| 6 | Invite landing page | murror-platform/apps/web |
| 7 | Opt-out web page | murror-platform/apps/web |
| 8 | Mobile: replace native SMS invite | MurrorMobile |
| 9 | Mobile: SMS takeaway sharing | MurrorMobile |
| 10 | End-to-end testing | All |

**Dependencies:** Tasks 1 → 2 → 3 → 4 (sequential backend). Tasks 5, 6, 7 can run in parallel after Task 3. Tasks 8, 9 can run in parallel after Task 3. Task 10 requires all others complete.
