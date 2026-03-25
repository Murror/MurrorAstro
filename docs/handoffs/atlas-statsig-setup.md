# Handoff: Statsig Setup for Production

## Current state (Alpha 2)
Statsig API key is cleared on PC (.env). All feature flags use their default values (True).
This is intentional for Alpha 2 testing.

## For production
1. Create new Statsig account at statsig.com (or recover old one)
2. Create gates: voice_insights_enabled, streak_wrapup_threshold
3. Get server secret key
4. Set STATSIG_API_KEY in production K8s secrets
5. Enable/disable features remotely

## Why this matters
Statsig provides kill switches for features. If ElevenLabs goes down or costs spike,
flip voice_insights_enabled to false instantly. No deploy needed.
