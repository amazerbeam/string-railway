Part of [Hunt](README.md).

DLR-104 gave this module a resource with no consumer yet — `actionPoints.ts` is a standalone,
pure module shipped ahead of the two tickets (T5 buff activation, T6 Apply Damage) that will
actually spend against it. Nothing in `RunState` or `EncounterState` holds a live AP pool: this
ticket ships the rule, not the state field that rule will one day operate on. That field is
explicitly the next ticket's to add, once there is something to spend AP on.

**The toggle is the point of the ticket, not a side detail.** `AP_ENABLED` (`config.ts`, default
`true`) is read in exactly one place — `apCostFor`. `canAffordAp` and `spendAp` both call
`apCostFor` rather than re-checking the flag themselves, so a future consumer that wants to know
whether an action is affordable, or wants to spend for it, never writes its own
`if (AP_ENABLED) …` branch. This mirrors `src/warCouncil/voluntaryCashOut.ts`'s
`applyDamageRefusalFor`: one function every caller goes through, so the _rule_ — not just the
_flag_ — lives in one place. Flip `AP_ENABLED` to `false` in `config.ts` and every AP-gated action
becomes free, with zero other code change.

`apCostGiven(cost, enabled)` exists solely so both branches of that toggle are independently
unit-testable. `AP_ENABLED` is a real exported `const`, not a mutable test seam, so the only way to
assert the _disabled_ branch's behaviour without depending on the constant's live value is to
expose the branch-taking logic as a pure function that takes `enabled` as an explicit parameter.
`apCostFor` is the only one of the two a real consumer should ever call.

**The refresh rule is a single function reading a cadence, not a boolean.** `refreshActionPointsForNewHand(currentAp)`
reads `AP_REFRESH_CADENCE` (`config.ts`, an `as const`-shaped enum matching the `TelegraphFidelity`
pattern, since `erasableSyntaxOnly` rules out a real TypeScript `enum`). For `PerHand` — the only
cadence that exists today — it returns `STARTING_AP` regardless of the incoming pool. For any other
cadence value it passes `currentAp` through unchanged; that branch is dead code today (there is
only one member), but it is what lets a later per-fight or per-run cadence be added as one new
config entry and one new `if`, rather than a boolean-to-enum type change.

`spendAp(pool, cost)` throws a `RangeError` rather than clamping to zero when `pool` cannot cover
the (toggle-adjusted) cost — the same discipline `src/hunt/cheats.ts`'s `removeCheat` uses for a
double-spend. An unaffordable spend reaching this function is a caller bug to surface loudly, not a
state to paper over silently.

**Developer decisions carried by this ticket, not yet exercised by play:** `STARTING_AP = 6` is an
unplayed placeholder — no consumer exists yet to balance it against, exactly like every other
freshly-shipped tunable in this module at launch. `AP_ENABLED` defaulting `true` is a judgement
call the brief didn't state a default for; it was chosen so the module is exercisable in its own
tests, and is a one-line flip either way before a real consumer lands.

## What DLR-108 changed here

**The four tunables moved file, and nothing else about them moved.** `AP_ENABLED`, `STARTING_AP`,
`ApRefreshCadence` and `AP_REFRESH_CADENCE` now live in `src/hunt/apConfig.ts`, transplanted
verbatim with their docblocks, because `config.ts` had reached its 400-line blocking budget. This
is the same split `run.ts` → `runTransitions.ts` already made, and it is invisible to every reader:
`config.ts` re-exports all four, so `actionPoints.ts`, `index.ts` and every spec resolve exactly as
before. An identity test (`__tests__/apConfig.test.ts`) asserts the re-export and the original are
the same value for all eight names in that file, which is what proves the move lost nothing rather
than assuming it. **Where a value in this document says `config.ts`, read `apConfig.ts` re-exported
through `config.ts`** — the name and the value are unchanged.

**Four new per-hand caps joined them**, and they belong to the buff system rather than to the AP
pool as such: `MAX_REFUND_PER_HAND = 6`, `MAX_MULTIPLIER_BONUS_PER_HAND = 6`,
`MAX_FLAT_DAMAGE_BONUS_PER_HAND = 12`, `MAX_COIN_BONUS_PER_HAND = 10`. They sit here because the
first is an AP figure and keeping the four together is what makes them retunable as a set. All four
are **agent-chosen on DLR-111/DLR-124, never played, and the developer's to move**. See
[Buff activation and the tiered AP costs](buff-activation-and-ap-costs.md) for what they bound.

**AP finally has a consumer, and it still is not reachable by a player.** `buffActivation.ts` calls
`canAffordAp` to refuse an unaffordable activation, `spendAp` to draw the pool down — the only
subtraction path, so `AP_ENABLED` is honoured with no bypass written anywhere — and
`refreshBuffsForNewHand` delegates to `refreshActionPointsForNewHand`, which is what makes the
per-hand cadence a single fact rather than two. The `PerHand` branch is therefore live code now
rather than dead. What is still missing is **ownership**: `BuffActivationState` carries the pool as
a pure value with no home on `RunState` or `RoundUiState`, so nothing outside the tests constructs
one.

## DLR-109 — Apply Damage is the first real consumer

**AP finally has a reachable consumer.** `APPLY_DAMAGE_AP_COST` (`3`, `src/hunt/apConfig.ts`, beside
`APPLY_DAMAGE_DELAY_TRICKS`) is spent through `spendAp` on every committing Apply Damage press, and
refused through `canAffordAp` before the press can commit — the same two functions this module
always intended a consumer to call, with no bypass written at the call site. `apPool` got a real
home: `RoundUiState` — the field is gone since DLR-114, see the next section — seeded per hand through
`refreshActionPointsForNewHand` at mount (`App.tsx`
remounts the felt per hand, so mount **is** the per-hand refresh) rather than on `RunState`. Buff
activation's own `BuffActivationState` still has no such home — DLR-108's activation flow remains
unreachable, and this ticket adds no second AP-spending mechanism: both consumers draw on the same
`actionPoints.ts` functions. See
[the delayed Apply Damage payout](delayed-apply-damage-payout.md) for the full mechanic, and
[the voluntary cash-out](../war-council/voluntary-cash-out.md) for the widened refusal predicate.

`apPool` was **invisible** as DLR-109 shipped it — nothing rendered it, so an `InsufficientAp` refusal
read as the button dying for no visible reason.

## DLR-114 — one pool, two spenders, and it is finally on screen

Three things changed, none of them in this module:

- **The two pools became one.** `RoundUiState.apPool` — DLR-109's field, above — was **deleted** and
  replaced by `RoundUiState.buffActivation: BuffActivationState`, whose own `apPool` is now the hand's
  single pool. Until DLR-114 the felt held two independent numbers both claiming to be the hand's
  action points, and they had never been observed to diverge only because the second had no spender.
  Apply Damage now spends from the same pool `activateBuff` spends from.
- **`BuffActivationState` has an owner.** `startBuffActivation()` seeds it in `createRoundUiState`,
  which **is** the per-hand refresh because `App.tsx` remounts the felt per hand — the identical
  argument the retired `refreshActionPointsForNewHand(STARTING_AP)` seed already made.
  `refreshBuffsForNewHand` therefore stays uncalled, correctly.
- **The pool is rendered.** The action bar's Apply Buff button carries it on its face
  (`6 AP · 3 held`), the loadout panel restates it (`6 action points left`), and Apply Damage's own
  button states its cost. A refusal no longer reads as a control dying for no reason.

Nothing about `actionPoints.ts` itself changed: both consumers still draw through `spendAp` and refuse
through `canAffordAp`, with no bypass written at either call site. See
[war-council-ui/action-bar-and-loadout.md](../war-council-ui/action-bar-and-loadout.md).
