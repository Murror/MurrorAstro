---
name: Compliance & Security Roadmap
description: Legal, security, healthcare compliance, tax, and insurance requirements identified 2026-04-05 — prioritized actions at each funding stage
type: project
---

Comprehensive compliance analysis completed 2026-04-05 across legal (Aegis), security (Vault), healthcare (Shield), finance (Ledger), and insurance.

**Why:** Mental health AI app handling emotional data has outsized legal/security/regulatory risk. Investor due diligence will check for these.

**How to apply:** Follow the phased roadmap below. Critical items must be done before fundraising. Never use clinical language (treats, diagnoses, cures) in marketing or UI.

## Critical Actions (This Week)
1. Crisis detection + 988 escalation in-app
2. Founder IP assignment (PIIA)
3. Rename "Cognitive Reframer" — implies licensed CBT practice

## This Month
4. Privacy policy + ToS (health-app-specific, AI disclaimers, arbitration)
5. App-level encryption for journals + emotion data (AES-256-GCM)
6. S3 bucket audit (enforce private, pre-signed URLs)
7. Redis password + RabbitMQ credential hardening
8. WA My Health My Data Act opt-in consent
9. Start R&D time log, get bookkeeper, confirm 83(b) status
10. Pay W-2 salary to unlock R&D tax credits

## Pre-Fundraise
- Age gate (DOB entry, block under-13)
- Provisional patent filing (~$2K)
- Trademark "Murror" (Class 42)
- Buy E&O + Cyber insurance (~$4-9K/yr)
- K8s NetworkPolicies + secrets migration

## Post-Seed ($30-60K)
- Fractional compliance officer
- HIPAA risk assessment + all vendor BAAs
- AI vendor migration to BAA-covered provider (Azure OpenAI or AWS Bedrock)
- SOC 2 Type I prep
- Penetration test

## Pre-Series A ($80-150K)
- Full HIPAA compliance
- SOC 2 Type I audit
- De-identification pipeline for AI training data

## Key Regulatory Lines
- Murror = wellness app, NOT medical device (as long as no clinical claims)
- "Supports emotional awareness" = safe; "Treats depression" = FDA-regulated
- HIPAA not required until B2B with healthcare entities (university counseling, employer wellness)
- AI vendor BAA blocker: OpenAI/Anthropic don't offer standard BAAs — need Azure/Bedrock
