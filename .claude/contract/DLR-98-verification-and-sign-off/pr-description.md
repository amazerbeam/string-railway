# DLR-98 — Verification and sign-off against epic DLR-87's Definition of Done

Read-and-run contract. No `src/` file was created, modified, or deleted. This report is the
deliverable.

**Overall verdict: NOT a clean 6-for-6 PASS.** QA executed the item-5 live-run script drafted below
and found the scenario the AC itself describes ("first hand, one-trick kill, five cards left, pays
10") is unreachable in the shipped game — see item 5's row and "Findings routed elsewhere" below.
Items 1–4 and item 6 stand as PASS, undisputed by QA. Item 5 is **FAIL on live-run reachability**;
its payout *formula* remains correct in isolation (the unit test still passes).

## DLR-98 sign-off

| DoD item | Status | Evidence |
|---|---|---|
| 1. Shop UI shows all four categories, Heal outside them | **PASS** | `src/hunt/shop.ts` — `SHOP_CATEGORIES` (4 rungs: `OneTimeUse`/`FightLong`/`RunPermanent`/`GamePermanent`), `categoryOf(ShopItem.Heal) === null`, collected into `UNCATEGORISED_SHOP_ITEMS` and rendered by `ShopPanel.tsx` outside `<ShopCategoryTabs>`. Tests: `ShopCategoryTabs.test.tsx` line 20 ("renders one tab per category... AC3"), `ShopPanel.test.tsx` lines 189–207 ("renders the four category tabs" / "renders the Heal outside the tabs"). Scoped run: `Test Files 3 passed (3)` / `Tests 79 passed (79)`. |
| 2. Envenom, Poison Guard, Whetstone purchasable, mechanics match design | **PASS** | `src/hunt/config.ts` — `ENVENOM_PRICE=2`, `POISON_GUARD_PRICE=1`, `WHETSTONE_PRICE=4`, `ENVENOM_QUARRY_DAMAGE=4`, `ENVENOM_PLAYER_DAMAGE=2` (all confirmed by direct read, not memory). Poison Guard consumption confirmed via `src/warCouncil/bank.ts`'s `poisonGuardSpent` flowing to `src/app/warCouncil/commitHandlers.ts` lines 119/137, clearing `poisonGuardHeld` regardless of streak preserved. Whetstone stacking confirmed additive per-copy in `bankClimbBonusFor`/`resolveTrickBank`. Scoped run: `Test Files 7 passed (7)` / `Tests 75 passed (75)`. |
| 3. Flask 60% max HP, refills on stage-boss kill | **PASS** | `src/hunt/flask.ts` — `flaskHealAmount` computes `Math.round(maxPlayerHealth * FLASK_HEAL_PERCENT)` (`FLASK_HEAL_PERCENT=0.6`), a proportion of max HP, not a hard literal. `src/hunt/runTransitions.ts`'s `flaskAfter` refills only when `wonThisEncounter && runEncounterAt(...).kind === OpponentKind.Boss`. Tests: `run.flask.test.ts` line 77 (overheal-discard), lines 126/154/168 (boss-kill refill / no-refill-on-ordinary-kill / no-refill-on-a-lost-boss-fight). Scoped run: `Test Files 2 passed (2)` / `Tests 23 passed (23)`. |
| 4. Apply Damage pre-card, two-thirds-on-forced-hit | **PASS** | `src/warCouncil/voluntaryCashOut.ts` — `cashBankNow` pays `cashValue` in full at 0 player health cost; `applyDamageRefusalFor` refuses `PoisonPending` (tested at `roundReducer.applyDamage.test.ts` "D6 — a pending poison hit cannot be poised past"). `src/warCouncil/bank.ts`'s `forcedCashValue` uses `Math.floor((cashValue * FORCED_CASH_OUT_NUMERATOR) / FORCED_CASH_OUT_DENOMINATOR)` = two-thirds rounded down (confirmed `Math.floor`, not `Math.round`). The non-exact-multiple-of-3 pin ("a streak of 6 caught for 24") lives in `src/warCouncil/__tests__/bank.test.ts` lines 115–123 (`[0, 2, 6, 10, 16, 24]`) and lines 371–375 — see note below on test-file location. Scoped run (task's named files): `Test Files 3 passed (3)` / `Tests 32 passed (32)`. |
| 5. First-hand, one-trick kill, 5 cards left, pays 10 (live run) | **FAIL (live-run unreachable)** | Formula in isolation is correct: `src/hunt/quickKill.ts` — `quickKillPayout` = `Math.floor(unplayedCards × quickKillTierMultiplier(handOfFight))`; `QUICK_KILL_TIER_MULTIPLIERS = [2, 1, 0.5]` in `src/hunt/config.ts`, so hand 1 → multiplier 2, `5 × 2 = 10`, and the pinned unit test (`src/hunt/__tests__/quickKill.test.ts` line 40–41) passes. **But QA's live run confirms the AC's own named scenario cannot occur**: at the exact "5 cards left, hand 1" instant, the maximum damage obtainable against the Quarry is 1 (Apply Damage cashing a 1-trick bank), leaving Aoife at 9/10 — not killed, so no quick-kill payout fires. See "QA live-run script — item 5" below for QA's reasoning and "Findings routed elsewhere" for the routed gap. |
| 6. Gates green; the-hunt.md current | **PASS** | Phase 1 (fresh, cache-warmed): `npm run typecheck` exit 0, `npm run lint` exit 0, `npm test` → `Tests 998 passed (998)`. Phase 5 re-run: identical — `Tests 998 passed (998)` again, plus `npm run build` → `✓ built in 380ms`, `dist/` written, zero bundler errors. Doc currency: see "Documentation currency" section below — `implementation-doc-writer` confirmed `the-hunt.md` and every touched `.docs/implementation/` module folder already current for the full DLR-89→DLR-97 (and DLR-100) span; no edit was required. |

## QA live-run script — item 5

Drafted for QA to execute via `chrome-devtools`, per `plan.md`'s Assumptions (a functional
right-answer check, not a developer feel judgement). **Executed by QA during this contract's review
pass — result below.**

1. Start a fresh run from the start screen (`Fight Aoife`).
2. Play the opening fight. On the first hand (`handOfFight: 1`), play tricks so that at the moment
   the winning trick is committed, the player's hand holds exactly **5 unplayed cards** (i.e. win
   the very first trick of the hand, cleanly, in a way that reduces the Quarry to 0 health).
3. Win that trick such that it kills the Quarry (Aoife holds 10 health at encounter 0 — a bank ×
   multiplier cash-out, Apply Damage, or the trick's own damage that brings her to 0 works, as long
   as it happens on the first hand with 5 cards left in hand after the card is played).
4. Read the verdict screen's payout: the quick-kill payout of **10 coins** should be visible,
   additive with the flat 1-coin win payout (11 total shown, per the-hunt.md's DLR-95 entry: "the
   two payments add").
5. Confirm 0 console errors during the sequence.

**Expected:** quick-kill payout line reads **10** (from `quickKillPayout`), total coin credit for
the fight is **11** (10 quick-kill + 1 flat win payout).

**Live-run result: FAIL — the scenario cannot be executed as written.** QA confirmed the state it
describes is mathematically unreachable, not merely unattempted, and confirmed this empirically live
before concluding it analytically:

- Empirically, live: the maximum damage obtainable at the exact "5 cards left, hand 1" instant is
  **1** (via Apply Damage cashing a 1-trick bank), leaving Aoife at **9/10** — not killed. No
  quick-kill payout can fire because the Quarry is not dead.
- Why the state is unreachable rather than just unattempted: `HAND_SIZE = 6`, and "5 cards left" is
  only reachable after exactly 1 trick has been played in the hand (`quickKill.ts`'s own docstring
  confirms `unplayedCards` is counted after the killing trick's card left the hand). At that point in
  any game state, no prior trick exists to have banked damage, so the maximum possible damage to the
  Quarry is provably 0 before trick 1 resolves and at most 1 (bank 1 × multiplier 1) immediately
  after it resolves.
- Aoife's starting health is `ORDINARY_HEALTH_BASE = 10` (`src/hunt/config.ts`). A "first-hand,
  one-trick kill with five cards left" therefore cannot happen against her, or against any opponent
  with health greater than 1, under the current bank-only damage economy
  (`.docs/game_rules/the-hunt.md` §7; `src/hunt/quickKill.ts`).
- Shop purchases don't change this: Envenom's earliest possible hit lands at trick 2's resolution, by
  which point only 4 cards remain in hand, not 5.

This is routed as a new finding, not fixed in this contract — see "Findings routed elsewhere" below.

## Documentation currency

`implementation-doc-writer` was invoked (Phase 4, Task 7), directed to run its Step 1 "what
changed / what's stale" check against the cumulative span DLR-89 through DLR-97 (shop categories,
Envenom, Poison Guard, Whetstone, the flask, Apply Damage, quick-kill payout, the DLR-96 integration
pass), rather than a single contract's diff, then its Steps 2–5 (gather, validate, write, verify) as
documented in its own `SKILL.md`.

**Finding: no edit was required.** `.docs/game_rules/the-hunt.md` already states "Last reviewed
against the code and the design on 2026-08-22" (today's date) and its body already documents every
DLR-89 through DLR-97 mechanic in playing order, correctly marked and cross-referenced (plus
DLR-100, landed since). Every figure this contract independently re-derived from source in Phase 2
— Envenom 2 coins / 4-Quarry / 2-player, Poison Guard 1 coin / one-fight / one-at-a-time, Whetstone
4 coins / stacking `(1+copies)×n²`, flask 60% / boss-only refill, Apply Damage full cash / two-thirds
forced floor, quick-kill `[2,1,0.5]` tiers — matches the prose in `the-hunt.md` exactly, with no
drift found.

`.docs/implementation/README.md`'s top-level table and each of `hunt/README.md`,
`war-council/README.md`, `war-council-ui/README.md`, `run-ui/README.md`'s own `**Built by:**` lines
were spot-checked and agree (all list DLR-89 through DLR-100 consistently). Status-register paths
spot-checked this pass (`WHETSTONE_PRICE`, `priceOf`, `buyFromShop`, `runTransitions.ts`,
`bankClimbBonusFor`) all resolve to real, currently-existing code.

This is the skill's own currency check reporting a clean pass, not a skipped check — the DLR-89
through DLR-97 (and DLR-100) span had already been brought current by the prior `/fb-apply` run
that shipped DLR-100, and this contract's independent re-derivation of every DoD-relevant figure in
Phase 2 corroborates that the doc's content is accurate against the present `src/` tree, not merely
unedited.

## Findings routed elsewhere

**DoD item 5's live-run scenario is unreachable — this is a real gap, routed to the developer /
`/fb-issue`, not fixed here.**

The DoD's own worked example — "first hand, one-trick kill, five cards left, pays 10" — describes a
game state that cannot occur against any opponent whose starting health is greater than 1, under the
current shipped bank-only damage economy. At "5 cards left, hand 1" (reachable only after exactly one
trick, per `HAND_SIZE = 6`), no prior trick exists to have banked anything, so the maximum damage
deliverable to the Quarry at that instant is 1, not enough to kill Aoife's `ORDINARY_HEALTH_BASE = 10`.
Confirmed empirically live by QA (max damage observed: 1, via Apply Damage cashing a 1-trick bank,
leaving Aoife at 9/10) and analytically (see the live-run script result above for the full reasoning:
`HAND_SIZE = 6`, `quickKill.ts`'s own docstring on `unplayedCards`, `ORDINARY_HEALTH_BASE = 10`,
Envenom's earliest hit landing at trick 2 / 4 cards left).

The `quickKillPayout` formula itself is correct and its unit test passes — this is a gap between the
AC's worked example and what the shipped rules make reachable, not a code defect in the payout
calculation.

Three candidate resolutions exist; **choosing between them is the developer's decision (or
`/fb-issue`'s), not this contract's**:

1. Lower the opening boss's (Aoife's) starting health so the AC's example is actually achievable.
2. Reword the AC / the design's worked example to describe a scenario that is reachable under the
   current damage economy (e.g. a later hand, or a smaller stated card-count).
3. Add an additional first-trick damage source to the quick-kill mechanic so a one-trick kill against
   a 10-health boss becomes possible.

No option is chosen here. This finding needs a new ticket or an `/fb-issue` invocation before any
code changes.

One further, unrelated, minor test-organization observation, not a defect:

- **Task 5's pinned non-exact-multiple-of-3 two-thirds-rounding assertion lives in
  `src/warCouncil/__tests__/bank.test.ts`** (lines 115–123, 371–375), not in any of the three test
  files this task's own `**Files:**` block named (`roundReducer.applyDamage.test.ts`,
  `ApplyDamagePlate.test.tsx`, `voluntaryCashOut.test.ts`). The assertion itself is real, correct,
  and passing — this is purely a note that the coverage lives one file over from where the task
  looked for it, worth a one-line mention if `/fb-issue` is ever run against this plan's Task 5 file
  list, but not a gap in the code or in the tests that actually exist.

## Verification summary

- Typecheck: **PASS** — `npm run typecheck` (run twice, Phase 1 and Phase 5), exit 0 both times.
- Lint: **PASS** — `npm run lint` (run twice), exit 0 both times, no warnings printed.
- Vitest (full suite): **PASS** — Phase 1: `Tests 998 passed (998)`. Phase 5 re-run: `Tests 998
  passed (998)`, identical.
- Vitest (project-warmed, Phase 1 Step 2): `--project node` → `Tests 790 passed (790)`;
  `--project dom` → `Tests 208 passed (208)`.
- Production build: **PASS** — `npm run build` → `✓ built in 380ms`, `dist/index.html`,
  `dist/assets/index-*.css` (37.74 kB), `dist/assets/index-*.js` (257.90 kB), zero bundler errors.
- Documentation currency: **PASS** — confirmed current for the full DLR-89→DLR-97 (+DLR-100) span;
  no edit required (see above).
- QA spot-check: **PASS** — QA independently re-ran `npm run typecheck` and `npm run lint` as part of
  its live-run review pass, both exit 0, no regressions, corroborating the Implementer's own Phase 1
  and Phase 5 gate runs.
- Item 5 live-run: **FAIL** — executed by QA; the AC's named scenario is unreachable under the
  current damage economy (see item 5's row and "Findings routed elsewhere" above). Not fixed in this
  contract by design.
- Unverified: anything requiring visual/interaction judgement of the running app beyond QA's
  functional right-answer check (not this contract's surface; no `src/` file was touched).
