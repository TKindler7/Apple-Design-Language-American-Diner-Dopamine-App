# Good Hour Diner — Playtest record

**Design claim:** “My site makes people feel excited and rewarded when they browse delicious diner food, build their perfect meal, and place an order without spending real money.”

Human playtesting is **pending**. No participant reactions or usability results have been invented. Collect observations by **November 3, 2026**, then document revisions before the November 4 submission. Technical checks establish that features work; they do not establish the emotional claim.

## Session protocol

Use anonymous labels such as Tester A, B, and C. Record device/browser and observation date, not names or contact details. Aim for at least three people from the intended teenage/young-adult audience, including a mobile session. Let each participant explore before explaining the design claim.

1. “Explore the diner and put together an order you would enjoy.” Observe first action, menu discovery, and whether the fictional nature is understood.
2. “Customize one dish and make a combo.” Observe whether options, 3D changes, and prices agree with the person's expectations.
3. “Review your order, change a quantity, and remove something.” Observe whether cart actions are discoverable and reversible.
4. “Refresh the page and continue.” Check restoration of cart and meal choices.
5. “Finish the order.” Observe expectations about payment, kitchen feedback, the ready moment, and the receipt. Do not coach the participant through the controls.
6. “Find your earlier order and explain the money-not-spent amount.” Refresh again and check that the order and total appear once.
7. Ask the participant to identify anything that encouraged them to order sooner and anything that helped them avoid spending real money.

## Neutral follow-up questions

- What did the experience make you feel, if anything?
- Which moment was most satisfying? Which moment felt slow or confusing?
- At any point did you expect to pay or receive food? What created that expectation?
- Did the special change what you chose or how quickly you chose it?
- What does “money not spent” mean to you here?
- After sharing the design claim: how closely did it match your experience, from 1 (not at all) to 5 (very closely), and why?

## Observation log

| Session | Device and browser | Tasks completed without help | Exact reaction or observed behavior | Friction | Revision to consider |
| --- | --- | --- | --- | --- | --- |
| Pending | — | — | — | — | — |

Do not replace observations with guesses about motivation. Keep quotations exact, and mark paraphrases as paraphrases.

## Behavioral mechanics to evaluate

**Purchasing pressure:** the openly fictional time-limited special. Check that people notice its time boundary, that it never implies a real transaction, and that expiry behaves as described. The ordinary menu must remain usable after the special ends.

**Self-binding:** completed fictional orders produce a receipt and cumulative money-not-spent total. Check that it invites reflection on ordering without spending, and that people do not mistake it for a bank balance or a claim about actual savings. An unfinished cart must not change this total.

## Technical verification record

The implementing agent should add dated, observed outcomes here after each check. Required checks: all 23 items and category counts; configured prices and combo rules; cart reload/migration; one-time checkout; history and cumulative totals after refresh; kitchen completion and skip; no-WebGL fallback; keyboard operation and focus return; reduced motion; sound preference; mobile layout; and a live Vercel smoke test.

| Date | Check | Evidence and result |
| --- | --- | --- |
| October 27, 2026 | Original food asset preparation | Inspected a contact sheet of all 23 item crops and the hero. Each crop maps to the intended dish; drink grid seams are excluded. 24 WebP files total 1,287,164 bytes. Original PNGs preserved. |

## Revisions after human testing

| Date | Evidence from session | Change made | Follow-up result |
| --- | --- | --- | --- |
| Pending | — | — | — |

## Submission evidence

Before submission, include the deployed URL, final commit, dated participant observations, at least one documented revision based on testing (or a reason none was needed), and a short evaluation of the design claim. Report untested conditions explicitly.
