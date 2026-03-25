# Handoff: Muse to Cortex, Add ambient_url to voice_summaries

## What

The daily voice summary pipeline now generates personalized ambient background music
via ElevenLabs Sound Generation API. viasr-api sends `ambientUrl` in the POST body
when creating a voice summary.

## What Cortex needs to do

1. Add `ambient_url` column (nullable text) to `voice_summaries` table in Prisma schema
   - File: `murror-api/prisma/schema.prisma`
   - Find the `voice_summaries` model and add: `ambient_url String?`

2. Run migration: `pnpm run prisma:migrate` (name: `add_voice_summary_ambient_url`)

3. Update the create endpoint to accept and store `ambientUrl`
   - The POST handler at `/api/v1/connections/voice-summaries` needs to read `ambientUrl` from the request body and save it

4. Update the GET endpoint to return `ambientUrl` in the response
   - The GET handler at `/api/v1/connections/voice-summaries/:date` should include `ambientUrl` in the response DTO

5. Update TypeScript types if needed

## Mobile side (already done)

The mobile detail screen (`daily-voice-summary.tsx`) already has ambient music playback wired.
Currently it falls back to a default piano track URL when `ambientUrl` is not present.
Once murror-api returns `ambientUrl`, the mobile code just needs to read it from the
voice summary data (add it to the `VoiceSummaryData` type in the API client).

## viasr-api changes (already done)

- `app/services/tts/ambient_music_service.py` - New service that maps emotions to ElevenLabs sound generation prompts
- `app/services/storage/domain/value_objects/storage_path.py` - Added `for_daily_summary_ambient` path helper
- `app/tasks/voice/generate_daily_summary.py` - Integrated ambient generation + upload + `ambientUrl` in POST body

## Known issue

S3 is disabled on the PC (`S3_ENDPOINT=https://disabled.local`). Ambient URLs will only
work when S3 is configured (DOKS deployments) or if we switch to Supabase Storage
as the upload target.
