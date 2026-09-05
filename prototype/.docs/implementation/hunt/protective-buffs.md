Part of [Hunt](README.md).

# Skull Helmet and Skull Tether — a reward that is neither damage nor multiplier

DLR-161 added two condition families whose reward is **protection of a streak figure**. When a trick
hurts the player, a Skull Helmet keeps the running `total` and a Skull Tether keeps the `roll`. It is
the first reward axis in this game that pays into the streak's *reset* rather than into a per-hand
pool, and that single fact is what shapes every decision below.

**The health always lands.** Nothing on either card, at any rung, touches `damageToPlayer` — it is
computed in `streak.ts` before the reset block these cards act in, and DLR-161 did not go near it.
That is the same line the Swan ladder already holds.

## The rule, in one place — `buffProtection.ts`

A new pure module, importing only `./buffs`. It states **no condition of its own**: it receives buffs
`firedBuffs` has already decided fired, exactly as `resolveFiredBuffs` does, and reads only their
kind, axis and reward value. That is `buffProjection.ts`'s docblock discipline applied again, and it
is why there is no second copy of `buffFires` anywhere in this tree.

```ts
interface StreakProtection { keepsTotal, keepsRoll, totalBonus, rollBonus }
const NO_STREAK_PROTECTION: StreakProtection
isProtectiveKind(kind): kind is BuffProtectiveKind
protectionCoversLowDefeat(tier): boolean
conditionIsWidened(buff): boolean
streakProtectionFor(fired: readonly Buff[]): StreakProtection
```

- **`streakProtectionFor` folds with `Math.max`, never a sum.** That is how "they do not stack" is
  expressed as arithmetic rather than as a comment: two gold Helmets on one trick add 1, not 2, and a
  gold beside a bronze adds 1. A total either survives or it does not, so there is deliberately no
  way to express "protects by N". Both copies are still **spent** — that is the arming layer's
  business and this function does not know about it.
- **`protectionCoversLowDefeat` is THE one statement of the tier widening**, read by two callers:
  `buffFires` in `buffEvaluation.ts`, to decide whether the card fires at all, and
  `buffConditionSentence` in `src/app/warCouncil/buffLabels.ts`, to decide which sentence the card
  face prints. Same shape as `conditionThresholdOf` — one rule, two readers, no drift. It reads a
  total `Record<BuffTier, boolean>` rather than `tier !== Bronze`, so a fourth tier would be a
  compile error here.
- **The reward value being `0` at bronze and silver is real, not a plausible zero.** Protection is
  binary and is carried by the buff having fired; the value is the gold bonus added on top of the
  figure that survived. The module's docblock says so, because this codebase otherwise treats a zero
  in a table as the bug that type-checks.

## Which tricks it fires on — two cases in `buffFires`

```ts
case 'skullHelmet':
case 'skullTether':
  return protectionCoversLowDefeat(buff.tier)
    ? ctx.skullTrick === ctx.playerWentHigh
    : ctx.skullTrick && ctx.playerWentHigh
```

**Bronze fires on a High Defeat only** — the player went high on a skull trick. Silver and gold widen
to any **Defeat**, which is the union of a High Defeat and a Low Defeat — and on `BuffTrickContext`'s
mechanical axis (`playerWentHigh` = did the player physically take the cards) that union is exactly
`skullTrick === playerWentHigh`:

| Outcome | `skullTrick` | `playerWentHigh` | Widened card |
| --- | --- | --- | --- |
| High Defeat | true | true | fires |
| Low Defeat | false | false | fires |
| Low Victory | true | false | does not |
| High Victory | false | true | does not |

Written as the equality with the derivation in a comment, rather than as two ORed clauses.

Neither card fires on a **Low Victory**. That is a good outcome reached by going low on a skull
trick — it banks — and there is nothing there to protect.

Restoring the eaten-skull condition for these two families **did not re-enable any of the other seven
cut condition families**: they carry their own `buffFires` cases and their own
`TEMPLATE_FAMILIES` rows, and `BuffKind.Glutton` is still unmintable.

## Where the figure actually survives — `streak.ts`'s reset block

`resolveTrickBank` derives the protection in place, from the `fired` array it already computes twelve
lines above the reset, rather than taking it on `TrickFacts` the way the Swan's two booleans arrive.
The Swan's booleans come from a run permanent the caller knows about; this depends on condition
evaluation that happens *inside* `resolveTrickBank`, so handing it in would force the caller to
evaluate the same conditions a second time. `TrickFacts` gained no field, so none of its construction
sites moved.

The reset guard was **de-nested** in the same pass. It used to read "if the Swan did not keep the
bank, zero the total, and if it also did not keep the multiplier, zero the roll" — nesting that
encoded gold-implies-silver as structure, and therefore could not express "the roll survives but the
total does not", which is exactly a Skull Tether. It is now two independent guards:

```ts
const keepsTotal = swanKeepsBank || protection.keepsTotal
const keepsRoll  = swanKeepsBank || swanKeepsMultiplier || protection.keepsRoll
```

with gold's `+1` added **only on the branch the protection saved**. A Swan that already spared a
figure does not also pay the card's bonus: one save, one bonus. The de-nesting is behaviour-identical
for all four Swan cases and a regression spec pins each.

See [the streak, the trick's damage, and the pot](../war-council/the-streak-and-the-pot.md) for the
block in full.

## The axis split — why `BuffCostAxis` was **not** widened

`Protection` is a new `BuffRewardAxis` member that needs a `REWARD_TIER_VALUE` ladder (so
`mintFromTemplate` can mint it) and a `REWARD_BASE` price row (so `apCostOf` can price it), but must
have **no per-hand accrual counter**, because it pays into a reset rather than into a pool. Widening
`BuffCostAxis` itself would have compile-forced four accrual switches — `accrualCapFor`,
`accrueAxisBonus`, `accrueCarry` and `trickBonusFor`'s inner switch — to grow a `Protection` case
returning "nothing", which is a plausible zero in four places instead of one honest exclusion in two.

So `buffCosts.ts` splits the two roles the one type was carrying:

| Type | Members | Keys |
|---|---|---|
| `BuffCostAxis` — unchanged | Magnitude, Coins, ApRefund, Multiplier | the four per-hand accrual switches |
| `BuffMintedAxis` — new | `BuffCostAxis \| Protection` | `REWARD_BASE`, `REWARD_TIER_VALUE` |

`narrowToMintedAxis` is the ladder-side narrowing, used only by `buffApCost`; it throws a
`RangeError` on an axis with no ladder, mirroring `narrowToCostAxis` rather than softening it.
`isProtectiveAxis` is the one softening, and it is an explicit exclusion **above** the throw rather
than a swallowed failure: in both `resolveFiredBuffs` and `trickBonusFor` a protective buff is
skipped before `narrowToCostAxis` is reached.

**A protective buff is still counted toward the Overlap Bonus.** Only the axis accrual skips it —
`overlapBonusFor(fired.length)` counts every fired buff, so arming a Helmet and a Tether on one
trick protects both figures *and* earns the pair bonus like any other pair. That bonus is
arithmetically inert on the trick these cards fire on, because DLR-156 made damage per-trick and a
hurt trick computes none; it is satisfied as written, and whether it should *show* is a design
question the ticket flagged rather than answered.

## The two templates, and where the pool stands

Two rows in `TEMPLATE_FAMILIES`, each carrying the single-entry `PROTECTION_ONLY` axis list, so each
family holds exactly one template. DLR-161 took `BUFF_TEMPLATE_COUNT` from 16 to 18; DLR-162 and
DLR-167 have since added the Wildcard and Curse, and Timebomb's row is gone, so the pool now stands
at **19**:

```
6 Suit High + 6 Suit Low + 2 Skull Low + 1 Skull Helmet + 1 Skull Tether + Cheat + Wildcard + Curse
```

The persisted ids are `skullHelmet:protection` and `skullTether:protection`, composed by the existing
`templateIdFor` grammar `<kind>[:<suit>]:<axis>` — no call site concatenates one. `TemplateGrant.templateId`
is Vault-persisted, and this ticket **adds** two ids and renames none, so nothing was orphaned and
`SAVE_SCHEMA_VERSION` was not bumped. An older save cannot contain either id, and `reconcileVault`
already drops an id this build has no template for.

`MintableConditionKind` and `MintableRewardAxis` were widened to admit them — that widening, not a
slot weight, is what makes a family *constructible*.

Combining needs no change — `buffCombineKey` already works on `(templateId, tier)`, so two identical
Helmets merge into a silver one by the rule that was already there.

## The numbers, and which of them nobody has chosen

| Table | Value as it ships | Status |
|---|---|---|
| `REWARD_TIER_VALUE[Protection]` | `0 / 0 / 1` | **transcribed** from the ticket's own acceptance criterion, not chosen. The gold `+1` is flagged **by the ticket** as possibly undersized against the game's 1/3/5 damage and 2/3/5 multiplier ladders |
| `REWARD_BASE[Protection]` | `2 / 3 / 4` AP | **nobody chose it** — no source document prices a protective axis; the ladder shape is copied from Coins' |
| `CONDITION_MODIFIER` for both families | `0`, `0` | **nobody chose it** — the neutral row Suit High already takes |
| `SLOT_FAMILY_WEIGHTS` — Skirmisher | Helmet `3`, Tether `2` | **nobody chose it** |
| `SLOT_FAMILY_WEIGHTS` — Strongbox | Helmet `1`, Tether `1` | **nobody chose it** (Strongbox is unreachable anyway — cut 2026-09-01) |
| `SLOT_AXIS_WEIGHTS[Protection]` | Skirmisher `3`, Strongbox `1` | **nobody chose it, and it is inert today**: each protective family has exactly one axis, so `familyAxisTotal` equals the axis weight and it cancels out of `templateWeightFor`. The row exists to keep `SlotAxisWeights` total; a second protective axis is what would make it bite |

The Helmet's `+1` and the Tether's `+1` are **deliberately unequal in value** and the ticket accepts
that: at a total of 10, one extra roll is worth 10 and one extra point of damage is worth 1. The
Tether's situation is the rarer one.

## What the tests pin

`__tests__/buffProtection.test.ts` — the non-stacking max (two golds add 1), a gold beside a bronze,
the tier widening in both directions, a fired buff on a non-protective axis being ignored, and
`NO_STREAK_PROTECTION` for an empty array. `buffEvaluation.test.ts` pins the bronze/silver split
on both families. `buffAccrual.test.ts` pins that a protective buff contributes nothing to any
accrual counter and still raises the Overlap Bonus to 1 beside a Blade. `streak.buffs.test.ts` pins
the reset block: each figure surviving alone, both surviving together, both golds adding their `+1`,
two gold Helmets adding 1 rather than 2, a silver Helmet protecting a Low Defeat where a bronze one
does not, neither card protecting a High Victory or a Low Victory, `DAMAGE_PER_HIT` landing on every
one of those cases, and the three Swan rungs unchanged by the de-nesting.
