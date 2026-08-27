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
pattern, since `erasableSyntaxOnly` rules out a real TypeScript `enum`). As shipped, `PerHand` was the
only cadence that existed — it returned `STARTING_AP` regardless of the incoming pool, any other
cadence value passed `currentAp` through unchanged, and that second branch was dead code (there was
only one member). That is what let a later cadence be added as one new config entry and one new `if`,
rather than a boolean-to-enum type change — which is exactly what happened on 2026-08-25; see
[below](#the-refresh-cadence-moved-to-per-trick-2026-08-25) for the live behaviour.

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

## The refresh cadence moved to per-trick, 2026-08-25

**Developer-directed, no ticket.** `ApRefreshCadence` gained a second member, `PerTrick`, and
`AP_REFRESH_CADENCE` now defaults to it — the pool refills to full at every trick boundary instead of
once at the top of the hand. Three things changed to carry this:

- **`BuffActivationState` gained `capacity`** (`src/hunt/buffActivation.ts`) — the pool's full value
  (`STARTING_AP` plus any bought AP-capacity bonus), set once by `startBuffActivation` and never
  touched again mid-hand. Before this, `openBuffWindow` had no way to know what "full" meant; `apPool`
  was the only number the state carried.
- **`openBuffWindow` — the per-trick boundary — now branches on cadence.** Under `PerHand` it still
  clears `activatedThisTrick` and leaves `apPool` untouched, exactly as AC4 originally specified.
  Under `PerTrick` (the live default) it also refills `apPool` back to `capacity`. `refreshBuffsForNewHand`
  — the per-hand boundary — is unchanged in shape and still preserves `capacity` through its reset.
- **`refreshActionPointsForNewHand` now resets under both `PerHand` and `PerTrick`.** `PerTrick` is
  strictly more frequent than `PerHand`, never coarser, so a hand boundary still resets under it —
  only a future coarser cadence (per-fight, per-run) would leave its `else` branch live.

**A silent sim-metric bug came with it, and was fixed in the same pass.** `sim/playHand.ts`'s
`apSpent` used to be computed as `apCapacityFor(run.apCapacityBonus) - ui.buffActivation.apPool` — a
start-capacity-minus-ending-pool diff. Under `PerTrick` that would only ever reflect the *last*
trick's spend, since every earlier trick's pool level is overwritten by the next refill before the
hand ends. It now accumulates AP spent at each actual spend site instead: `runBuffWindow`'s buff and
Apply Damage taps, and `runCheatPlay`'s Cheat tap — the latter captured **before** its own `TapCard`
dispatches, since those can cross a trick boundary and refill the pool before a later diff would see
the spend.

See [buff-activation-and-ap-costs.md](buff-activation-and-ap-costs.md#the-per-hand-accrual-and-the-one-asymmetry-that-must-not-be-lost)
for how this interacts with AC4's original "does not silently refresh mid-hand" guarantee, and
[the-hunt.md, section 4](../../game_rules/the-hunt.md) for the player-facing rule.

## Action points are switched off — DLR-145, 2026-08-25

**`AP_ENABLED` is `false`.** Every AP-gated action in the game is now free, and the toggle DLR-104
built for exactly this moment did its job: one constant moved, and no consuming code needed a
bypass written anywhere, because `apCostFor` was already the only reader.

**Why it went, in the module's own terms.** The per-trick cadence above is the reason. Under
`ApRefreshCadence.PerTrick` the pool refilled to `capacity` at every trick boundary, so the stake a
player put on a buff was refunded before the next bet — firing everything every trick was strictly
correct and nothing was ever a decision. Action points were the only thing limiting how many buffs
fired per trick, and they were doing it badly. What replaced them is **card scarcity**: activating a
Taker, Feeder or Sidestep now removes it from the pile for the rest of the run
(`CONDITION_CARD_SINGLE_USE`, [consumable items](consumable-items.md)). The two changes are coherent
only together — the flag flipped without consumption would leave no limit at all.

**What the flip does on its own.** `apCostFor` returns 0 for every buff and for Apply Damage, so
`canAffordAp` is always true and `spendAp(pool, 0)` never subtracts. Both
`BuffActivationRefusal.InsufficientAp` and `ApplyDamageRefusal.InsufficientAp` become
**unreachable rather than deleted** — each stays in its union so
`BUFF_ACTIVATION_REFUSAL_MESSAGE` and `APPLY_DAMAGE_REFUSAL_MESSAGE` stay total `Record`s, the same
discipline DLR-132 used for `PurchaseRefusal.SlotsFull`.

**What the flip does *not* do, and had to be removed by hand.** A disabled resource still renders as
zeroes, and a control that says "0 AP" is a control still claiming a resource exists. Three surfaces
were edited at source rather than handed a zero:

- the action bar's Apply Buff figure (`{apPool} AP · N held` → `N held`) and its
  `applyBuffAccessibleName`, plus Apply Damage's face (`{cash} for N AP` → `cash {N}`) and
  `applyDamageBarAccessibleName`;
- the loadout panel's header (`N action points left` → `N cards`, the panel's own scarcity signal
  now) and `buffLine`'s trailing `${apCost} AP.`;
- the shop purse's action-points cell, leaving Coins as a single-cell group.

`buffLine` and `buffRowAccessibleName` **lost the `apCost` parameter entirely**, and
`BuffLoadoutPanelProps.apCostFor`, `ActionBarProps.apPool` and `ShopPanelProps.apCapacity` were
removed with their suppliers (`BuffLoadoutPanelProps` itself was deleted outright on DLR-148, when
the panel became `BuffGallery`), so a future reader cannot wonder why every card prices at nothing.

**The `apRefund` reward axis died as a side effect, not by its own repair** — it pays into a pool
nothing spends from. It is still declared on `BuffRewardAxis` with its `REWARD_BASE`,
`REWARD_TIER_VALUE` and `MAX_REFUND_PER_HAND` rows intact, and it is no longer mintable
(`MintableRewardAxis`, DLR-145 AC5). If `AP_ENABLED` is ever flipped back, the dead-refund problem
returns with it.

**Everything else in this module stayed.** `actionPoints.ts` and all four of its functions,
`STARTING_AP`, `AP_CAPACITY_STEP`, `apCapacityFor`, `RunState.apCapacityBonus`,
`ApRefreshCadence`, `AP_REFRESH_CADENCE`, `BuffActivationState.apPool` and `.capacity`,
`RoundUiSeed.apCapacity`, and `ShopItem.ApCapacity`'s price, category and refusal are all still
declared and still under test — only the shop **shelf** dropped the item
(`SHOP_ITEMS`, [coins and the shop](coins-and-the-shop.md)). That is what keeps this a toggle rather
than a one-way deletion.

**The two damage caps went at the same time and for the entangled reason.**
`MAX_MULTIPLIER_BONUS_PER_HAND` and `MAX_FLAT_DAMAGE_BONUS_PER_HAND` are now
`Number.POSITIVE_INFINITY`. Clipping a *rented* card's contribution cost the player nothing they
could not re-rent next trick; clipping a *consumed* card's destroys an irreplaceable card, and it
bites hardest on exactly the high-tier cards the shop exists to sell. `Math.min(finite, Infinity)`
is the identity, so `accrueAxisBonus` needed no change, and the two constants stay named as the one
place a cap would be restored. `MAX_REFUND_PER_HAND` (6) and `MAX_COIN_BONUS_PER_HAND` (10) are
**untouched** — their axes no longer mint. One test moved with them:
`apConfig.test.ts`'s `Number.isInteger` assertion no longer holds over all four caps.
