# "OVERRIDE" — Murror Launch Manifesto Film (Design)

Date: 2026-06-16. Status: APPROVED (Astro). Next: writing-plans.

## Concept
A 60-second launch manifesto film that introduces Murror to the world. It plays like a terminal/hacking sequence: a cold green autopsy of a broken, isolating society, then a glitch `OVERRIDE` that detonates into a loud, RATM-style anthem where the resistance is empathy, unity, and love. It resolves into Murror as the home of that uprising. Fits an AI/tech company; the on-screen language stays universal (division, fear, isolation, the attention economy) and never partisan, so it carries RATM force without political or ad-platform risk.

## Arc (the spine)
Cold broken world (heavy, sad, ominous) -> HARD DROP at ~0:25 -> uprising of empathy (loud, powerful) -> Murror mark. The enemy is division and isolation; the weapon is each other. Tone: angry, defiant, then cathartic and warm.

## Visual language (Astro's call)
Bold graphic / kinetic typography in a terminal-hacking aesthetic: monospace, typed lines with a blinking cursor, glitch, redaction, scanlines, ALL-CAPS slams on the beat. Stark high-contrast imagery bleeds BEHIND the code. The grade transforms with the music: Act I cold green/near-black -> Act II flood to warm amber/ember -> Act III warm. The butterfly burns through the code at the climax.

## Script (locked)
ACT I — `SYSTEM DIAGNOSIS` (0:00-0:24), cold, slow, ominous drone + lone piano:
- `> scanning society......` / `> STATUS: BROKEN`
- they FEED you outrage.
- they SELL your attention.
- they keep you DIVIDED. AFRAID. ALONE.
- `> connection ... NOT FOUND`
- the rich get richer. the rest go NUMB.
- you scroll. you sink. you disappear.
- `> humanity.exe has stopped responding`
- (heartbeat; one cursor blinking in the dark)

ACT II — `OVERRIDE` / DROP (0:25-0:52), guitars + drums detonate, screen floods warm, type SLAMS:
- `> ACCESS DENIED` / `> OVERRIDE________`
- WAKE. UP.
- they want you silent? GET LOUD.
- they want you apart? COME TOGETHER.
- this is the hack: EMPATHY.
- `> rebooting humanity...`
- REACH OUT. RISE UP. REFUSE TO GO NUMB.
- UNITY. LOVE. EACH OTHER. (these are weapons.)

ACT III — `HOME` (0:52-1:00), anthem resolves to one sustained warm chord:
- `> you are NOT alone.`
- `> reclaim your inner world.`
- code resolves into the Murror mark. End card: Murror icon + logotype only, no body text (standing rule), glitch settles into warmth, music sustains then fades.

## Music (original, no copyright)
One ~60s original instrumental via Higgsfield generate_audio. Act I: sparse dark drone, lone piano, glitch textures. Hard DROP at ~0:25: heavy distorted guitar riff + driving live drums, anthemic, RATM-inspired energy (original composition, not a clone). Act III: sustained, powerful, warm resolving chord. May generate Act I bed and Act II/III anthem separately and stitch for precise control of the drop.

## Production approach
- Imagery: Higgsfield nano_banana_pro for crisp stark stills + kling3_0 / seedance_2_0 for a few motion beats. Cold set (crowds facing away, glowing screens, the wealth gap, a lone figure, surveillance) and warm set (hands reaching, strangers embracing, a crowd turning toward each other, fists opening into open hands, the butterfly igniting). Abstract/stark imagery suits AI generation and avoids uncanny faces (favor backs, hands, silhouettes, crowds).
- Typography: composited LOCALLY (ffmpeg + Pillow PNG overlays), monospace terminal style, glitch, beat-synced. Never AI-rendered text (AI melts text, proven this session).
- Assembly: ffmpeg pipeline in `Murror/marketing-ads/`. Color grade cold->warm at the drop; scanline + glitch overlays; audio sync; end card = Murror icon + logotype.
- Credits: Higgsfield balance 2,779 (Ultra) as of 2026-06-16, ample.

## Format
16:9 cinematic master first (website hero, YouTube, launch), then a dedicated 9:16 cut (re-framed type + crops) for Reels/TikTok/Stories/Meta ads.

## Lifecycle (before / during / after)
- Before: brand launch asset; lives on murror.app hero + YouTube + social + (later) paid social once the campaign resumes. Triggered by the launch push.
- During: 60s watch; the kinetic type carries the message with sound on, but must still read with sound off (captions are the content).
- After: ends on the Murror mark + a single CTA context (app stores / murror.app) added at distribution time per channel, not baked into the end card. Reusable hero across the site and channels; the 9:16 cut seeds the social/ads refresh.

## Guardrails
- No partisan politics, no named parties, no real protest footage of identifiable events. Universal framing only.
- No em dashes in on-screen copy. No "friend" vocative. ALL-CAPS is the film's creative typography, not app UI.
- Vulnerable-audience safety: the anger must resolve into agency and warmth; do not leave the viewer in despair. Act III must land hopeful.
- Original music only; do not reproduce RATM lyrics or melodies.
