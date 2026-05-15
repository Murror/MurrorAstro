---
name: Test full flow before asking user to test
description: Run end-to-end API simulation tests before telling Astro to test in simulator
type: feedback
---

Before asking Astro to test anything in the simulator, run a full end-to-end test via API calls first. Only tell Astro to test after confirming the flow works programmatically.

**Why:** Multiple times during the 2026-04-04/05 session, I deployed code and told Astro to test, only for it to fail due to issues I could have caught myself: Celery pickle rejection, shared Redis queue stealing tasks, function signature mismatches, stale RabbitMQ consumers. Each failure wasted Astro's time and eroded trust.

**How to apply:**
1. After deploying any change, simulate the full user flow via curl/API calls before telling Astro to test
2. For journal flow: `POST /log` → wait → `GET /log/:id` → verify processed=true, summary exists, emotionArc populated
3. For deep chat flow: `POST /deep-chat/conversations` → `POST .../complete` → verify status=COMPLETED, summary+artwork
4. For dive deeper: `POST .../proposals` → verify proposals array has items
5. Check pod logs for errors after each API call
6. Check RabbitMQ queue consumer counts (should be 1 each)
7. Only after ALL checks pass, tell Astro: "Verified via API — ready for you to test in simulator"
8. If any check fails, fix it and re-test before involving Astro
