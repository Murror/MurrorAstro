# 2026-10-03: Build 512, aurora pause, chat place ideas never repeat a planned venue

Driver: Debug session (Claude), Build 512 test board against production. Covers 2 Oct 9:05 PM PDT (after the build 511 write-up) to 3 Oct 2:00 PM PDT.

## Shipped

| What | Where | State |
|---|---|---|
| Council guard + empty-card cache (follow-up to viasr 829) | viasr 832, promoted via 833 | Live in prod 2 Oct ~9:30 PM |
| FAB ring matches the nav pill (Astro: keep the nav's border) | MurrorMobile 1909 | Build 512 |
| Dive Deeper hero frames drawn without a React render per frame (open lag 133% -> 20% at rest) | MurrorMobile 1910 | Build 512 |
| Saved draft's Talk backup follows its words | MurrorMobile 1911 | Build 512 |
| Home, Galaxy, onboarding orbit frames without a React render (Home after a tap 27.9% -> 9.1%) | MurrorMobile 1912 | Build 512 |
| Declining Photos access says how to turn it on | MurrorMobile 1913 | Build 512 |
| Idle Talk chat stops re-saving restored words | MurrorMobile 1914 | Build 512 |
| Build 512 (trunk 633fae5c): VALID, Early Access, beta review submitted | MurrorMobile 1915 | TestFlight |
| Dive Deeper aurora rests while dragging (scroll CPU median 100% -> 56%, peak 116% -> 75%, sim) | MurrorMobile 1916 (bef17902) | Trunk, next build |
| Chat place ideas skip a venue the pair has a live plan for | murror-api 1224 (9e3d5c88) via 1225 | Live in prod, rev 117 v0.84.1 |
| Chat idea SEND refused (422 PLACE_ALREADY_PLANNED) on a live plan at that place | murror-api 1226 (a19a7267) via 1227 | Live in prod, rev 118 v0.84.2 |
| Card says "You and {name} already have this place." + OPEN PLAN | MurrorMobile 1918 (644c1443) | Trunk, next build |

## Board results (simulators, prod)

- Streak ring (510 row): PASSED on both sims. The ring sits under the plan's own day; after moving the plan Sat 3 -> Sun 4 the ring moved and the agreement day stayed empty.
- Old place cards retire: 2 Oct setup had no timed plan (every Griffith Park invite accepted then cancelled; Kaminari never an invite). New agreed plan: Marugame Monzo, Sun 4 Oct 12:02 PM (invite 071e05bb). Retire check Tue 6 Oct.
- Agreed venue never suggested again (505): REPRODUCED in chat (chat_place_ideas f25f43f6 = Marugame after the plan was agreed), fixed by 1224 + 1226/1918.

## The venue bug (root cause)

Four place-idea makers exist: daily place card, takeaway card, insight ideas, chat place ideas. murror-api 1102 (24 Sep) routed the first three through `src/connections/domain/place-avoid-list.ts` (`refusedVenues`, `repeatsLivePlan`) and `connection-plan-places.ts` (`readConnectionPlanPlaces`). The chat maker (`src/deep-chat/application/services/chat-place-ideas.service.ts`) came later and never got the rule (1 of 4).

- 1224: `repeatsLivePlanOfConversation` in the final gate of `create()` (owner advisory lock), using the conversation's `connectionId`; a repeat saves EMPTY; a failed read fails closed via `finalGateCheckFailed`. viasr's `/internal/v1/chat-place-ideas/generate` has `extra="forbid"`, so no avoid list is sent (refused after generation).
- 1226: chats about nobody can still produce the venue and SEND can go to anyone, so `create-place-invite.use-case.ts` refuses a chat-idea send next to the write. 422 + `errorCode`, same shape as `PLACE_PLAN_TIME_PASSED`, so builds 510-512 show the existing "IDEA NO LONGER AVAILABLE".
- 1918: `chat-place-plan-sheet.tsx` refetches the person's invites, finds the newest live plan with a copy of the server's `placeNameKey`, opens `PlacePlanDetailsSheet`; if none after the fresh read, the card returns to SEND.

## Verification

- 1224 on prod sim: same chat, same request -> new row 92b58ca8 EMPTY; prod viasr asked directly still answers Marugame Monzo (so the guard refused it); control (a park) -> Felipe de Neve Plaza card.
- Mutations: 1224 5/5, 1226 6/6, 1918 6/6, each applied, compiling, killed by a named test.
- Gates: murror-api full jest 8788 pass; MurrorMobile full jest 13877 pass, tsc 0, lint baseline, 478 CI node tests, prettier clean.
- Independent reviews: ship with notes (both). Medium note on 1918 (card stuck after the plan ends) fixed before merge.
- NOT yet sim-verified: 1226/1918 end to end (reopened chats drop place cards, MurrorMobile 1917; vinhspiration hit 3/3 place cards). Due 4 Oct before 12:02 PM PDT.

## Gotchas

- `renderFooter` in `use-chat-place-idea.tsx` is a `useCallback`: new state must be in its deps or the footer renders stale.
- `node --test scripts/ci` (a folder) is MODULE_NOT_FOUND on this Node; use `scripts/ci/*.test.mjs`.
- The free chat limit is per local DATE (`freemium:chat:sessions:<user>:<date>`); a zone-switch test can make "today" look used.
- A freshly booted sim can stay on a black first load; `qa restart <sim>` fixes it.
- Filed MurrorMobile 1917: stale calendar after a time change, reopened chat drops its idea card, Murror's reply says it cannot suggest places above a place card.
