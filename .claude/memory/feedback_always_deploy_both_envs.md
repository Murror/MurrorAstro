---
name: Always deploy to both staging and alpha
description: Every backend deploy must go to BOTH nsp-staging-murror AND nsp-dev-murror. Never deploy to one without the other.
type: feedback
originSessionId: 1da68e58-e6c5-44d5-8bc8-8bb394874dfb
---
Always deploy backend changes to both staging AND alpha simultaneously.

**Why:** Staging mirrors production. Alpha is the active test environment. If only one gets a fix, the other stays broken and causes confusion during testing. Astro explicitly asked to always check alpha has the same fix.

**How to apply:**
- Every `kubectl set image` must target both `nsp-staging-murror` and `nsp-dev-murror`
- Every CI build deploy must roll out to both namespaces
- Before claiming a fix is done, verify pods are running in both namespaces
