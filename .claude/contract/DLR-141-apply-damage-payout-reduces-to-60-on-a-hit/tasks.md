# Tasks: Apply Damage payout reduces to 60% on a hit, not destroyed

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-25

**Goal:** A queued Apply Damage payout survives a hit that costs red health at 60% of its frozen value, rounded down, instead of being wiped to zero — while a hit blue hearts fully absorb still leaves it untouched and the encounter ending still evaporates it in full.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:** (none — no new files)

**Modified:**
- `src/hunt/apConfig.ts` — new `APPLY_DAMAGE_HIT_RETENTION` constant
- `src/hunt/config.ts` — re-exports the new constant alongside the existing Apply Damage tunables
- `src/hunt/applyDamagePayout.ts` — `PayoutOutcome` becomes a 3-member union, `TrickPayoutEvent` gains `remaining`, new `reduceApplyPayoutOnHit`
- `src/hunt/__tests__/applyDamagePayout.test.ts` — tests for the new function and the 3-member union
- `src/hunt/encounter.ts` — `applyDamage`'s payout expression reduces instead of wiping on `playerLostHealth`
- `src/hunt/__tests__/encounter.test.ts` — reduce/evaporate/fully-absorbed coverage
- `src/hunt/index.ts` — barrel exports `APPLY_DAMAGE_HIT_RETENTION` and `reduceApplyPayoutOnHit`
- `src/app/warCouncil/commitHandlers.ts` — derives the three-way payout event instead of the two-way one
- `src/app/warCouncil/__tests__/roundReducer.delayedApply.test.ts` — reducer-level assertions updated for the reduced (not wiped) figures
- `src/app/warCouncil/payoutLabels.ts` — three-outcome copy, risk hint derived from the constant
- `src/app/warCouncil/__tests__/payoutLabels.test.ts` — updated and extended for `Reduced` / `Evaporated`
- `src/app/warCouncil/TrickWell.tsx` — outcome CSS class binds to `Evaporated`, not the removed `Destroyed`
- `src/app/warCouncil/__tests__/TrickWell.test.tsx` — renamed/updated payout test
- `src/app/warCouncil/warCouncilTable.css` — `.wc-is-destroyed` renamed to `.wc-is-evaporated`
- `src/app/warCouncil/actionBarLabels.ts` — no code change; verified only
- `src/app/warCouncil/__tests__/actionBarLabels.test.ts` — risk-hint copy updated, countdown hardening test added
- `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — corrected via `game-designer`
- `.docs/game_rules/the-hunt.md` — corrected via `implementation-doc-writer`

**Deleted:** (none)

**Developer decides or observes:**
- All copy wording (the risk hint and all three outcome sentences) — unapproved and unseen; every before/after is listed in Tasks 7-9 for a find-and-replace if any wording is wrong.
- Whether 60% survival makes a late Apply Damage press feel worth taking — a play question no browser pass answered.
- The five pre-existing uncommitted working-tree files (`BankMeter.tsx`, `WarCouncilRound.tsx`, `BankMeter.test.tsx`, `warCouncilHunt.css`, and the `APPLY_DAMAGE_AP_COST: 3 → 1` line in `apConfig.ts`) — not this ticket's work; left exactly as found and not staged or committed by any task here.
- Whether the existing action-bar countdown text (verified, not rebuilt, in Task 9) is prominent enough, or whether something more than a line of text was wanted.
- Whether reporting a same-trick reduce-then-pay as a single `Paid` event (Task 5 Step 2) narrates enough, versus surfacing the intermediate reduction too.

---

## Phase 1 — The pure rule: retention constant, the reducer, and the engine's single enforcement point

This phase is entirely inside `src/hunt/`, the lint-enforced pure-core tree. It ends with `reduceApplyPayoutOnHit` unit-tested in isolation and `applyDamage` wired to call it, with `encounter.test.ts` proving all three fates (reduced, evaporated, untouched-when-fully-absorbed) directly against the engine — no reducer, no UI. The codebase type-checks throughout; nothing outside `src/hunt/` is touched yet, so `commitHandlers.ts` still imports the now-three-member `PayoutOutcome` and will not type-check again until Phase 2's first task — that gap is closed within Phase 2, not carried past it.

### Task 1: Add `APPLY_DAMAGE_HIT_RETENTION` to `src/hunt/apConfig.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/apConfig.ts` (append after `APPLY_DAMAGE_DELAY_TRICKS`, line 72)
- Config: `src/hunt/config.ts` — add the name to the existing `export { … } from './apConfig'` block (lines 361-373)

- [x] **Step 1: Append the constant to `apConfig.ts`**

```ts
// DLR-141 — the FRACTION of a queued Apply Damage payout that survives a hit which costs the
// player red health. DEVELOPER-SET on the ticket: 60%, rounded down at the point of use
// (`reduceApplyPayoutOnHit`). The `winner !== null` branch of `applyDamage`'s payout expression is
// untouched by this constant — a resolved encounter still evaporates the payout in full.
// UNIT: dimensionless fraction of the frozen cashOut, 0..1.
export const APPLY_DAMAGE_HIT_RETENTION = 0.6
```

- [x] **Step 2: Add it to `config.ts`'s re-export block so `applyDamagePayout.ts` can import it the same way it already imports `APPLY_DAMAGE_DELAY_TRICKS`**

In `src/hunt/config.ts`, change:

```ts
export {
  AP_ENABLED,
  STARTING_AP,
  ApRefreshCadence,
  AP_REFRESH_CADENCE,
  MAX_REFUND_PER_HAND,
  MAX_MULTIPLIER_BONUS_PER_HAND,
  MAX_FLAT_DAMAGE_BONUS_PER_HAND,
  MAX_COIN_BONUS_PER_HAND,
  APPLY_DAMAGE_AP_COST,
  APPLY_DAMAGE_DELAY_TRICKS,
  AP_CAPACITY_STEP,
} from './apConfig'
```

to:

```ts
export {
  AP_ENABLED,
  STARTING_AP,
  ApRefreshCadence,
  AP_REFRESH_CADENCE,
  MAX_REFUND_PER_HAND,
  MAX_MULTIPLIER_BONUS_PER_HAND,
  MAX_FLAT_DAMAGE_BONUS_PER_HAND,
  MAX_COIN_BONUS_PER_HAND,
  APPLY_DAMAGE_AP_COST,
  APPLY_DAMAGE_DELAY_TRICKS,
  APPLY_DAMAGE_HIT_RETENTION,
  AP_CAPACITY_STEP,
} from './apConfig'
```

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: `PayoutOutcome` becomes three members, `TrickPayoutEvent` gains `remaining`, and `reduceApplyPayoutOnHit` lands in `src/hunt/applyDamagePayout.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/applyDamagePayout.ts`
- Test: `src/hunt/__tests__/applyDamagePayout.test.ts`

- [x] **Step 1: Replace the two-member `PayoutOutcome` and its docblock**

Change:

```ts
/**
 * DLR-119 — which of the two things a trick resolution did to a queued payout. Declared here
 * because it names `PendingApplyPayout`'s two terminal fates and nothing else.
 *
 * REPORTING ONLY. Nothing branches on this value: it exists so the felt can narrate an outcome
 * the engine already decided, and DLR-119 is a presentation-only ticket. After the fold, "paid"
 * and "destroyed" are indistinguishable — both leave `pendingApplyPayout: null` — which is
 * exactly why the distinction has to be captured at the point it is made rather than re-derived
 * from two encounter snapshots.
 */
export const PayoutOutcome = {
  /** The delay ran out, or the hand ended, and the frozen `cashOut` was dealt to the Quarry. */
  Paid: 'paid',
  /** Damage to the player wiped it before it could land — DLR-109's resolution order, step 1
   *  nulls the payout before step 4 would pay it. The bomb wins, by design. */
  Destroyed: 'destroyed',
} as const
export type PayoutOutcome = (typeof PayoutOutcome)[keyof typeof PayoutOutcome]

/** What one trick resolution did to a queued payout. `null` wherever nothing was queued. */
export interface TrickPayoutEvent {
  readonly outcome: PayoutOutcome
  /** The payout's own frozen `cashOut`, captured BEFORE the field was nulled — it is not
   *  recoverable afterwards. UNIT: damage. */
  readonly cashOut: number
}
```

to:

```ts
/**
 * DLR-119/DLR-141 — which of three things a trick resolution did to a queued payout. Declared
 * here because it names `PendingApplyPayout`'s three fates and nothing else.
 *
 * REPORTING ONLY. Nothing branches on this value: it exists so the felt can narrate an outcome
 * the engine already decided. `Reduced` is NON-TERMINAL — the payout is still in the air after
 * it — while `Paid` and `Evaporated` are terminal, matching `remaining` on `TrickPayoutEvent`.
 */
export const PayoutOutcome = {
  /** The delay ran out, or the hand ended, and the frozen `cashOut` was dealt to the Quarry. */
  Paid: 'paid',
  /** DLR-141 — a hit cost the player red health and cut the queued payout to
   *  `APPLY_DAMAGE_HIT_RETENTION` of its value, rounded down. STILL IN THE AIR. */
  Reduced: 'reduced',
  /** DLR-141 — the encounter resolved (Quarry dead, or player dead) with the payout still
   *  queued. There is no target left to pay, so it is lost entirely. */
  Evaporated: 'evaporated',
} as const
export type PayoutOutcome = (typeof PayoutOutcome)[keyof typeof PayoutOutcome]

/** What one trick resolution did to a queued payout. `null` wherever nothing was queued or
 *  settled this trick. */
export interface TrickPayoutEvent {
  readonly outcome: PayoutOutcome
  /** The payout's frozen `cashOut` as it stood BEFORE this event. UNIT: damage. */
  readonly cashOut: number
  /** DLR-141 — what is STILL IN THE AIR after a `Reduced` event, which may be `0` when the
   *  floored value reached zero. `null` for `Paid` and `Evaporated`, which are terminal.
   *  REQUIRED rather than optional, so every construction site must state it explicitly. */
  readonly remaining: number | null
}
```

- [x] **Step 2: Update the module import to bring in the new constant**

Change:

```ts
import { APPLY_DAMAGE_DELAY_TRICKS } from './config'
```

to:

```ts
import { APPLY_DAMAGE_DELAY_TRICKS, APPLY_DAMAGE_HIT_RETENTION } from './config'
```

- [x] **Step 3: Add the failing test for `reduceApplyPayoutOnHit` before writing it**

In `src/hunt/__tests__/applyDamagePayout.test.ts`, update the import to add the new names:

```ts
import { describe, expect, it } from 'vitest'
import { APPLY_DAMAGE_DELAY_TRICKS, APPLY_DAMAGE_HIT_RETENTION } from '../config'
import {
  applyDamageDelayTricks,
  queueApplyPayout,
  reduceApplyPayoutOnHit,
  tickApplyPayout,
  PayoutOutcome,
} from '../applyDamagePayout'
```

Then append, after the `tickApplyPayout` describe block and before the trailing `PayoutOutcome` describe block:

```ts
describe('reduceApplyPayoutOnHit', () => {
  it('null in, null out', () => {
    expect(reduceApplyPayoutOnHit(null)).toBeNull()
  })

  it('DLR-141 — floors the cashOut to APPLY_DAMAGE_HIT_RETENTION of its value, keeping every other field', () => {
    const pending = queueApplyPayout(9, 4)
    const reduced = reduceApplyPayoutOnHit(pending)
    expect(reduced).toMatchObject({
      cashOut: Math.floor(9 * APPLY_DAMAGE_HIT_RETENTION),
      resolutionsOwed: pending.resolutionsOwed,
      unplayedAtPress: pending.unplayedAtPress,
    })
  })

  it('returns null once the floored value reaches zero', () => {
    expect(reduceApplyPayoutOnHit(queueApplyPayout(1, 4))).toBeNull()
  })
})
```

And replace the trailing block:

```ts
describe('PayoutOutcome', () => {
  it('has exactly two members, so a third fate cannot be added without a compile error here', () => {
    expect(Object.values(PayoutOutcome)).toEqual(['paid', 'destroyed'])
  })
})
```

with:

```ts
describe('PayoutOutcome', () => {
  it('has exactly three members, so a fourth fate cannot be added without a compile error here', () => {
    expect(Object.values(PayoutOutcome)).toEqual(['paid', 'reduced', 'evaporated'])
  })
})
```

Run: `npx vitest run src/hunt/__tests__/applyDamagePayout.test.ts`
Expected: fails — `reduceApplyPayoutOnHit` does not exist yet.

- [x] **Step 4: Implement `reduceApplyPayoutOnHit`**

Insert into `src/hunt/applyDamagePayout.ts`, directly after `queueApplyPayout` and before the `ApplyPayoutTick` interface:

```ts
/**
 * DLR-141 — the retention rule. Never throws: it runs inside `applyDamage`, which runs inside a
 * reducer. `null` in gives `null` out. Otherwise floors `cashOut` to `APPLY_DAMAGE_HIT_RETENTION`
 * of its value, and returns `null` — rather than a payout of `0` — when that floored value is
 * `<= 0`: `PendingApplyPayout.cashOut` is documented strictly positive, and `queueApplyPayout`
 * itself refuses to mint a non-positive one, so this function does not either.
 */
export function reduceApplyPayoutOnHit(pending: PendingApplyPayout | null): PendingApplyPayout | null {
  if (pending === null) return null
  const cashOut = Math.floor(pending.cashOut * APPLY_DAMAGE_HIT_RETENTION)
  if (cashOut <= 0) return null
  return { ...pending, cashOut }
}
```

- [x] **Step 5: Run the scoped test again and typecheck**

Run: `npx vitest run src/hunt/__tests__/applyDamagePayout.test.ts; npm run typecheck`
Expected: Vitest reports all tests in the file passing; `npm run typecheck` exits 0. (Errors will still surface in `encounter.ts`, `commitHandlers.ts`, `payoutLabels.ts` and their specs, all imported elsewhere — those are Tasks 3, 5 and 7's to fix, not this one's.)

### Task 3: Wire the reducer into `applyDamage`'s single enforcement point ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/encounter.ts:9` (import), `src/hunt/encounter.ts:144-154` (the payout expression and its docblock)
- Test: `src/hunt/__tests__/encounter.test.ts`

- [x] **Step 1: Import `reduceApplyPayoutOnHit`**

Change:

```ts
import type { PendingApplyPayout } from './applyDamagePayout'
```

to:

```ts
import { reduceApplyPayoutOnHit, type PendingApplyPayout } from './applyDamagePayout'
```

- [x] **Step 2: Replace the enforcement-point docblock and expression**

Change:

```ts
  const winner = resolveWinner(health)
  // DLR-109 AC3 — THE single enforcement point, deliberately here rather than at a call site.
  // Every damage path in this codebase funnels through this function, so a queued payout cannot
  // survive a hit by taking a route that forgot to check. A resolved encounter drops it too: a
  // dead Quarry needs no further damage, and a dead player has already been wiped by the same
  // line.
  //
  // DLR-110 — a hit FULLY ABSORBED by blue hearts leaves red health untouched, so this stays
  // false and the queued payout survives. Deliberate (`plan.md` Part 1 → Assumptions made): the
  // payout loss is the price of taking a hit, and a shield that ate the hit did its job. A
  // partially-absorbed hit that still drops red health destroys it exactly as before.
  const playerLostHealth = playerHealth < encounter.health[DuelSide.Player]

  return {
    health,
    damageEventsApplied: encounter.damageEventsApplied + 1,
    winner,
    pendingTimebomb: encounter.pendingTimebomb,
    pendingApplyPayout: playerLostHealth || winner !== null ? null : encounter.pendingApplyPayout,
    shieldHearts: absorption.shieldHeartsRemaining,
    wardAbsorbs: wardAfter,
  }
```

to:

```ts
  const winner = resolveWinner(health)
  // DLR-109 AC3 / DLR-141 — THE single enforcement point, deliberately here rather than at a call
  // site. Every damage path in this codebase funnels through this function, so a queued payout
  // cannot dodge the rule by taking a route that forgot to check. A resolved encounter still
  // EVAPORATES it in full: a dead Quarry needs no further damage, and a dead player has already
  // been wiped by the same line — `winner` is checked FIRST so a killing blow that also cost the
  // player health evaporates rather than reduces.
  //
  // DLR-110 — a hit FULLY ABSORBED by blue hearts leaves red health untouched, so this stays
  // false and the queued payout survives untouched at 100%. Deliberate (`plan.md` Part 1 →
  // Assumptions made): the payout loss is the price of taking a hit, and a shield that ate the hit
  // did its job. A partially-absorbed hit that still drops red health REDUCES it — DLR-141,
  // replacing the full wipe DLR-109 originally shipped.
  const playerLostHealth = playerHealth < encounter.health[DuelSide.Player]

  return {
    health,
    damageEventsApplied: encounter.damageEventsApplied + 1,
    winner,
    pendingTimebomb: encounter.pendingTimebomb,
    pendingApplyPayout:
      winner !== null
        ? null
        : playerLostHealth
          ? reduceApplyPayoutOnHit(encounter.pendingApplyPayout)
          : encounter.pendingApplyPayout,
    shieldHearts: absorption.shieldHeartsRemaining,
    wardAbsorbs: wardAfter,
  }
```

- [x] **Step 3: Replace the AC3 describe block in `encounter.test.ts` with DLR-141 coverage of all three fates**

Add to the file's top imports (currently `applyDamage, hasPendingApplyPayout, isEncounterResolved, queueApplyDamagePayout, startEncounter` from `'../encounter'`):

```ts
import {
  activateShield,
  applyDamage,
  hasPendingApplyPayout,
  isEncounterResolved,
  queueApplyDamagePayout,
  startEncounter,
} from '../encounter'
import { BuffTier } from '../buffs'
import {
  APPLY_DAMAGE_HIT_RETENTION,
  PLAYER_START_HEALTH,
  quarryHealthForEncounter,
  QUARRY_ENCOUNTER_HEALTH,
} from '../config'
```

Then replace the whole `describe('applyDamage — DLR-109 AC3, the payout wipes at the single clamp point', ...)` block (the file's last block) with:

```ts
describe('applyDamage — DLR-109 AC3 / DLR-141, the payout is reduced (not wiped) at the single clamp point', () => {
  it('a non-zero hit to the player reduces a queued payout to APPLY_DAMAGE_HIT_RETENTION, floored', () => {
    const queued = queueApplyDamagePayout(startEncounter(0, 10), queueApplyPayout(9, 4))
    const after = applyDamage(queued, damage(1, 0))
    expect(after.pendingApplyPayout).toMatchObject({
      cashOut: Math.floor(9 * APPLY_DAMAGE_HIT_RETENTION),
      resolutionsOwed: 2,
      unplayedAtPress: 4,
    })
  })

  it('a reduction that floors to zero evaporates the payout the same way a resolved encounter does', () => {
    const queued = queueApplyDamagePayout(startEncounter(0, 10), queueApplyPayout(1, 4))
    const after = applyDamage(queued, damage(1, 0))
    expect(after.pendingApplyPayout).toBeNull()
  })

  it('a hit FULLY ABSORBED by blue hearts leaves the queued payout untouched, at 100%', () => {
    const shielded = activateShield(
      queueApplyDamagePayout(startEncounter(0, 10), queueApplyPayout(9, 4)),
      BuffTier.Bronze,
    )
    const after = applyDamage(shielded, damage(1, 0))
    expect(after.pendingApplyPayout).toBe(shielded.pendingApplyPayout)
  })

  it('an all-zero incoming event preserves the queued payout', () => {
    const queued = queueApplyDamagePayout(startEncounter(0, 10), queueApplyPayout(9, 4))
    const after = applyDamage(queued, damage(0, 0))
    expect(after.pendingApplyPayout).toBe(queued.pendingApplyPayout)
  })

  it('damage to the Quarry only preserves the queued payout', () => {
    const queued = queueApplyDamagePayout(startEncounter(0, 10), queueApplyPayout(9, 4))
    const after = applyDamage(queued, damage(0, 1))
    expect(after.pendingApplyPayout).toBe(queued.pendingApplyPayout)
  })

  it('an encounter that resolves — either side — still evaporates the payout in full', () => {
    const queuedOnPlayerWin = queueApplyDamagePayout(startEncounter(0, 10), queueApplyPayout(9, 4))
    const playerWins = applyDamage(queuedOnPlayerWin, damage(0, quarryHealthForEncounter(0)))
    expect(playerWins.winner).toBe(DuelSide.Player)
    expect(playerWins.pendingApplyPayout).toBeNull()

    const queuedOnQuarryWin = queueApplyDamagePayout(startEncounter(0, 1), queueApplyPayout(9, 4))
    const quarryWins = applyDamage(queuedOnQuarryWin, damage(1, 0))
    expect(quarryWins.winner).toBe(DuelSide.Quarry)
    expect(quarryWins.pendingApplyPayout).toBeNull()
  })
})
```

(`queueApplyPayout` is already imported at the top of this file from `'../applyDamagePayout'` — unchanged.)

- [x] **Step 4: Run the scoped tests and typecheck**

Run: `npx vitest run src/hunt/__tests__/encounter.test.ts; npm run typecheck`
Expected: Vitest reports all tests in the file passing. `npm run typecheck` still reports the pre-existing downstream errors in `commitHandlers.ts` / `payoutLabels.ts` and their specs — expected until Phase 2.

### Task 4: Export the new names from the `src/hunt` barrel ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/index.ts:65-66` (apConfig re-export list), `src/hunt/index.ts:230-235` (applyDamagePayout re-export list)

- [x] **Step 1: Add `APPLY_DAMAGE_HIT_RETENTION` beside `APPLY_DAMAGE_DELAY_TRICKS`**

Change:

```ts
  APPLY_DAMAGE_AP_COST,
  APPLY_DAMAGE_DELAY_TRICKS,
  OpponentKind,
```

to:

```ts
  APPLY_DAMAGE_AP_COST,
  APPLY_DAMAGE_DELAY_TRICKS,
  APPLY_DAMAGE_HIT_RETENTION,
  OpponentKind,
```

- [x] **Step 2: Add `reduceApplyPayoutOnHit` beside the other `applyDamagePayout` exports**

Change:

```ts
export {
  applyDamageDelayTricks,
  queueApplyPayout,
  tickApplyPayout,
  PayoutOutcome,
} from './applyDamagePayout'
```

to:

```ts
export {
  applyDamageDelayTricks,
  queueApplyPayout,
  reduceApplyPayoutOnHit,
  tickApplyPayout,
  PayoutOutcome,
} from './applyDamagePayout'
```

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: no NEW errors introduced by this task (the pre-existing Phase-2 errors in `commitHandlers.ts` / `payoutLabels.ts` and their specs remain until Phase 2).

---

## Phase 2 — The reporting layer: commitHandlers, copy, and the felt

This phase makes the app compile again end-to-end: every consumer the Step 1.6 audit found (`commitHandlers.ts`'s two construction sites, `payoutLabels.ts`'s outcome table, `TrickWell.tsx`'s CSS class, and all six `TrickPayoutEvent` construction sites across production and specs) is updated together, because a required field added to a type breaks every one of them at `tsc` until they all move. The phase ends with `npm run typecheck` clean and every touched spec passing.

### Task 5: `commitHandlers.ts` derives the three-way payout event ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/commitHandlers.ts:113-182`

- [x] **Step 1: Replace the two-way `destroyed` derivation with the three-way `payoutEvent` derivation**

Change:

```ts
  if (isEncounterResolved(encounter)) return { encounter, unplayedAtPress: null, payout: null }
  const queued = encounter.pendingApplyPayout
  const incoming = incomingFrom(resolution)
  const paid =
    incoming[DuelSide.Player] === 0 && incoming[DuelSide.Quarry] === 0
      ? encounter
      : applyDamage(encounter, incoming)
  // DLR-109 resolution order, step 1: `applyDamage` nulls a queued payout when the player lost
  // health or the encounter ended. Comparing the field across that call is the ONLY place the
  // difference between "destroyed" and "not yet due" is visible — afterwards both read `null`.
  const destroyed: TrickPayoutEvent | null =
    queued !== null && paid.pendingApplyPayout === null
      ? { outcome: PayoutOutcome.Destroyed, cashOut: queued.cashOut }
      : null
  const cleared = hasPendingTimebomb(paid)
    ? { ...paid, pendingTimebomb: NO_PENDING_TIMEBOMB }
    : paid
  const booked =
    resolution.timebombTarget === null
      ? cleared
      : queueTimebomb(cleared, resolution.timebombTarget, timebombDamage)
  return settleApplyPayout(booked, handEnding, destroyed)
}
```

to:

```ts
  if (isEncounterResolved(encounter)) return { encounter, unplayedAtPress: null, payout: null }
  const queued = encounter.pendingApplyPayout
  const incoming = incomingFrom(resolution)
  const paid =
    incoming[DuelSide.Player] === 0 && incoming[DuelSide.Quarry] === 0
      ? encounter
      : applyDamage(encounter, incoming)
  // DLR-141 — `applyDamage`'s three fates, read off the field across that call, the ONLY place
  // the difference between them is visible: afterwards a reduction-to-zero and an evaporation
  // both read `null`. Gone with a winner is EVAPORATED; gone with no winner is a REDUCTION that
  // floored to zero; a smaller `cashOut` still standing is REDUCED; unchanged is no event at all.
  const payoutEvent: TrickPayoutEvent | null =
    queued === null
      ? null
      : paid.pendingApplyPayout === null
        ? paid.winner !== null
          ? { outcome: PayoutOutcome.Evaporated, cashOut: queued.cashOut, remaining: null }
          : { outcome: PayoutOutcome.Reduced, cashOut: queued.cashOut, remaining: 0 }
        : paid.pendingApplyPayout.cashOut < queued.cashOut
          ? {
              outcome: PayoutOutcome.Reduced,
              cashOut: queued.cashOut,
              remaining: paid.pendingApplyPayout.cashOut,
            }
          : null
  const cleared = hasPendingTimebomb(paid)
    ? { ...paid, pendingTimebomb: NO_PENDING_TIMEBOMB }
    : paid
  const booked =
    resolution.timebombTarget === null
      ? cleared
      : queueTimebomb(cleared, resolution.timebombTarget, timebombDamage)
  return settleApplyPayout(booked, handEnding, payoutEvent)
}
```

- [x] **Step 2: Rename the `settleApplyPayout` parameter and add `remaining` to its `Paid` construction**

Change:

```ts
function settleApplyPayout(
  encounter: EncounterState,
  handEnding: boolean,
  destroyed: TrickPayoutEvent | null,
): FoldedResolution {
  const tick = tickApplyPayout(encounter.pendingApplyPayout, handEnding)
  if (tick.due === null) {
    // A no-payout trick allocates nothing: `tick.pending` is `null`, equal to the field it came
    // from, so the input object is returned untouched rather than a spread copy of itself.
    return tick.pending === encounter.pendingApplyPayout
      ? { encounter, unplayedAtPress: null, payout: destroyed }
      : {
          encounter: { ...encounter, pendingApplyPayout: tick.pending },
          unplayedAtPress: null,
          payout: destroyed,
        }
  }
  const cleared: EncounterState = { ...encounter, pendingApplyPayout: null }
  const settled = isEncounterResolved(cleared)
    ? cleared
    : applyDamage(cleared, incomingFromCashOut(tick.due.cashOut))
  return {
    encounter: settled,
    unplayedAtPress: isEncounterResolved(settled) ? tick.due.unplayedAtPress : null,
    payout: { outcome: PayoutOutcome.Paid, cashOut: tick.due.cashOut },
  }
}
```

to:

```ts
function settleApplyPayout(
  encounter: EncounterState,
  handEnding: boolean,
  payoutEvent: TrickPayoutEvent | null,
): FoldedResolution {
  const tick = tickApplyPayout(encounter.pendingApplyPayout, handEnding)
  if (tick.due === null) {
    // A no-payout trick allocates nothing: `tick.pending` is `null`, equal to the field it came
    // from, so the input object is returned untouched rather than a spread copy of itself.
    return tick.pending === encounter.pendingApplyPayout
      ? { encounter, unplayedAtPress: null, payout: payoutEvent }
      : {
          encounter: { ...encounter, pendingApplyPayout: tick.pending },
          unplayedAtPress: null,
          payout: payoutEvent,
        }
  }
  const cleared: EncounterState = { ...encounter, pendingApplyPayout: null }
  const settled = isEncounterResolved(cleared)
    ? cleared
    : applyDamage(cleared, incomingFromCashOut(tick.due.cashOut))
  return {
    encounter: settled,
    unplayedAtPress: isEncounterResolved(settled) ? tick.due.unplayedAtPress : null,
    // DLR-141 — a trick that BOTH reduces and settles a payout in the same fold reports it PAID
    // at the reduced figure: `tick.due.cashOut` is already the post-reduction value, so the
    // number the player is told is the number that actually landed. The intermediate `Reduced`
    // event this fold may have produced is deliberately overwritten here, not composed with it.
    payout: { outcome: PayoutOutcome.Paid, cashOut: tick.due.cashOut, remaining: null },
  }
}
```

- [x] **Step 3: Typecheck (production code only — specs are Task 6)**

Run: `npm run typecheck`
Expected: `commitHandlers.ts` errors are gone; remaining errors are confined to `payoutLabels.ts`, `TrickWell.tsx`, and the spec files Tasks 6-8 own.

### Task 6: Update `roundReducer.delayedApply.test.ts` for the reduced (not wiped) figures ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/__tests__/roundReducer.delayedApply.test.ts`

> **Deviation from this task's literal assertions (see Implementer Report):** the AC3 fixture and the DLR-119 second sub-test's fixture use `tricksPlayed: 0` (the default from `makeRound`) with a 1-card hand, so `finalTrick = tricksPlayed === HAND_SIZE` (`HAND_SIZE` is 6) is `false` — the hand does NOT end on this trick, unlike the "Hand end" describe block, which explicitly sets `tricksPlayed: 5`. The task text's assumption that "this fixture's 1-card hands mean the hand ends the same trick" does not hold for these two fixtures. Implemented with corrected assertions: the payout is REDUCED to 5 and stays queued (not paid) for these two cases; the "Ordering" describe block's assertions are unaffected — its fixture constructs `pendingApplyPayout.resolutionsOwed: 1` directly, which naturally expires on this trick regardless of hand-ending, so `paid`/`cashOut: 5` there is correct as given.

- [x] **Step 1: Rewrite the "AC3" describe block (queued cashOut of 9 → floors to 5 on a hit; corrected to assert it STAYS QUEUED, not paid — see deviation note above)**

Replace:

```ts
describe('AC3 — a hit taken during the window wipes the queued payout', () => {
  it('a CleanLoss during the window destroys the payout; the Quarry never falls', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 3,
      multiplier: 3,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
      },
      currentTrick: [],
    })
    let ui = uiFrom(round)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tapApply)
    ui = roundReducer(ui, tapApply)
    expect(ui.encounter.pendingApplyPayout).toMatchObject({ cashOut: 9 })

    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanLoss)
    expect(ui.encounter.pendingApplyPayout).toBeNull()
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth)
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - 1)
  })
})
```

with:

```ts
describe('DLR-141 — a hit taken during the window reduces, rather than destroys, the queued payout', () => {
  it('a CleanLoss during the window cuts the payout to 60% floored, and it still lands because this hand ends on the same trick', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 3,
      multiplier: 3,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
      },
      currentTrick: [],
    })
    let ui = uiFrom(round)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tapApply)
    ui = roundReducer(ui, tapApply)
    expect(ui.encounter.pendingApplyPayout).toMatchObject({ cashOut: 9 })

    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanLoss)
    // Reduced to floor(9 * 0.6) = 5 by the hit, then paid at 5 because this hand's last trick was
    // this one — not wiped, and not the un-reduced 9 either.
    expect(ui.encounter.pendingApplyPayout).toBeNull()
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth - 5)
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - 1)
    expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'paid', cashOut: 5, remaining: null })
  })
})
```

- [x] **Step 2: Rewrite the "Ordering" describe block the same way (cashOut 9 → 5)**

Replace:

```ts
describe('Ordering — a payout due the same trick a Timebomb detonates against the player', () => {
  it('destroys the payout (the Quarry gets nothing from it) while the Timebomb still lands in full', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 11)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    const owed = queueTimebomb(startEncounter(0), DuelSide.Player, TIMEBOMB_DAMAGE[BuffTier.Bronze])
    const encounter: EncounterState = {
      ...owed,
      // A payout one resolution from due, constructed directly rather than through a press —
      // this test is about the ORDER inside `applyResolution`, not about queuing.
      pendingApplyPayout: { cashOut: 9, unplayedAtPress: 1, resolutionsOwed: 1 },
    }
    let ui = uiFrom(round, encounter)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    // The payout is destroyed — the Quarry takes nothing from it.
    expect(ui.encounter.pendingApplyPayout).toBeNull()
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth)
    // The Timebomb's own damage lands normally, undiminished by the payout's presence.
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - TIMEBOMB_PLAYER_DAMAGE)
  })
})
```

with:

```ts
describe('Ordering — a payout due the same trick a Timebomb detonates against the player', () => {
  it('DLR-141 — reduces the payout to 60% floored first, then lands it at the reduced figure, while the Timebomb still lands in full', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 11)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    const owed = queueTimebomb(startEncounter(0), DuelSide.Player, TIMEBOMB_DAMAGE[BuffTier.Bronze])
    const encounter: EncounterState = {
      ...owed,
      // A payout one resolution from due, constructed directly rather than through a press —
      // this test is about the ORDER inside `applyResolution`, not about queuing.
      pendingApplyPayout: { cashOut: 9, unplayedAtPress: 1, resolutionsOwed: 1 },
    }
    let ui = uiFrom(round, encounter)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    // Reduced to floor(9 * 0.6) = 5 by the Timebomb's hit, then paid at 5 on the same resolution.
    expect(ui.encounter.pendingApplyPayout).toBeNull()
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth - 5)
    // The Timebomb's own damage lands normally, undiminished by the payout's presence.
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - TIMEBOMB_PLAYER_DAMAGE)
    expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'paid', cashOut: 5, remaining: null })
  })
})
```

- [x] **Step 3: Update the DLR-119 "reports what happened" describe block's four tests (second sub-test corrected to REDUCED/still-queued — see deviation note above)**

In the first sub-test ("a trick that settles a due payout reports it paid"), change the single assertion:

```ts
    expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'paid', cashOut: 9 })
```

to:

```ts
    expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'paid', cashOut: 9, remaining: null })
```

Replace the second sub-test:

```ts
  it('a trick that damages the player while a payout is queued reports it destroyed, and the Quarry never falls', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 3,
      multiplier: 3,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
      },
      currentTrick: [],
    })
    let ui = uiFrom(round)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tapApply)
    ui = roundReducer(ui, tapApply)

    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))

    expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'destroyed', cashOut: 9 })
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth)
  })
```

with:

```ts
  it('DLR-141 — a trick that damages the player while a payout is queued reports it reduced, then paid at the reduced figure since this hand ends here', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Keys,
      bank: 3,
      multiplier: 3,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 2)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 9)],
      },
      currentTrick: [],
    })
    let ui = uiFrom(round)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tapApply)
    ui = roundReducer(ui, tapApply)

    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 2)))

    expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'paid', cashOut: 5, remaining: null })
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth - 5)
  })
```

Leave the third sub-test ("a trick with nothing queued reports payout: null") unchanged — no payout involved.

Replace the fourth sub-test:

```ts
  it('reports the payout outcome without changing a single figure the fold already produced', () => {
    // Same seed, same trick, before and after DLR-119: `encounter.health` on both sides,
    // `pendingApplyPayout`, `pendingTimebomb` and `unplayedAtPress` must all be byte-identical to
    // the values this file already asserts. `payout` is REPORTING — nothing branches on it.
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 11)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    const owed = queueTimebomb(startEncounter(0), DuelSide.Player, TIMEBOMB_DAMAGE[BuffTier.Bronze])
    const encounter: EncounterState = {
      ...owed,
      pendingApplyPayout: { cashOut: 9, unplayedAtPress: 1, resolutionsOwed: 1 },
    }
    let ui = uiFrom(round, encounter)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))

    // Every figure the AC3 ordering test already asserts, unchanged.
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.encounter.pendingApplyPayout).toBeNull()
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth)
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - TIMEBOMB_PLAYER_DAMAGE)
    // AND the new reporting field, additive on top.
    expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'destroyed', cashOut: 9 })
  })
```

with:

```ts
  it('DLR-141 — this trick reduces the payout, so it is the "Ordering" case again, plus the reporting field', () => {
    // Same seed, same trick as the "Ordering" block above. Restated here because the `payout`
    // field on `resolvedTrick` is the thing this describe block exists to check.
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 11)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    const owed = queueTimebomb(startEncounter(0), DuelSide.Player, TIMEBOMB_DAMAGE[BuffTier.Bronze])
    const encounter: EncounterState = {
      ...owed,
      pendingApplyPayout: { cashOut: 9, unplayedAtPress: 1, resolutionsOwed: 1 },
    }
    let ui = uiFrom(round, encounter)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))

    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.encounter.pendingApplyPayout).toBeNull()
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth - 5)
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - TIMEBOMB_PLAYER_DAMAGE)
    expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'paid', cashOut: 5, remaining: null })
  })
```

- [x] **Step 4: Run the scoped test and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.delayedApply.test.ts; npm run typecheck`
Expected: Vitest reports all tests in the file passing. `npm run typecheck` still shows the pre-existing `payoutLabels.ts` / `TrickWell.tsx` errors Tasks 7-8 fix.

### Task 7: `payoutLabels.ts` — three-outcome copy, risk hint derived from the constant ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/payoutLabels.ts`
- Test: `src/app/warCouncil/__tests__/payoutLabels.test.ts`

- [x] **Step 1: Replace the whole file**

```ts
/**
 * DLR-119/DLR-141 — the felt's copy for a queued Apply Damage payout: the risk it carries while
 * it is in the air, and what happened to it when a trick settled it. PLACEHOLDER copy, as every
 * string on this screen is; the wording is the developer's.
 *
 * A total function over `PayoutOutcome` — a fourth fate added to that union is a compile error
 * here rather than an `undefined` sentence on the felt, the same discipline
 * `APPLY_DAMAGE_REFUSAL_MESSAGE` already uses.
 */
import { APPLY_DAMAGE_HIT_RETENTION, PayoutOutcome, type TrickPayoutEvent } from '../../hunt'

/** Appended to the queued-payout note on the action bar. DLR-141's rule, stated at the one moment
 *  it can still change what the player does — derived from the retention constant so the copy
 *  cannot state a percentage the rule does not. */
export const PAYOUT_QUEUE_RISK_HINT = `Damage to you cuts it to ${Math.round(APPLY_DAMAGE_HIT_RETENTION * 100)}%.`

const PAYOUT_OUTCOME_TEXT: Readonly<Record<PayoutOutcome, (event: TrickPayoutEvent) => string>> = {
  [PayoutOutcome.Paid]: (event) => `Your queued ${event.cashOut} lands.`,
  [PayoutOutcome.Reduced]: (event) =>
    `The hit cut your queued ${event.cashOut} to ${event.remaining}.`,
  [PayoutOutcome.Evaporated]: (event) =>
    `The fight ended before your queued ${event.cashOut} could land.`,
}

/** The one sentence a resolved trick adds about the payout queue. `null` when this trick reported
 *  no payout event, so the felt renders no element at all rather than an empty line. */
export function payoutEventText(event: TrickPayoutEvent | null): string | null {
  if (event === null) return null
  return PAYOUT_OUTCOME_TEXT[event.outcome](event)
}
```

- [x] **Step 2: Replace the whole test file**

```ts
import { describe, expect, it } from 'vitest'
import { PayoutOutcome } from '../../../hunt'
import { PAYOUT_QUEUE_RISK_HINT, payoutEventText } from '../payoutLabels'

describe('payoutEventText', () => {
  it('says nothing when this trick reported no payout event', () => {
    expect(payoutEventText(null)).toBeNull()
  })

  it('names the figure that landed', () => {
    expect(payoutEventText({ outcome: PayoutOutcome.Paid, cashOut: 12, remaining: null })).toBe(
      'Your queued 12 lands.',
    )
  })

  it('DLR-141 — names both figures when a hit cut the payout', () => {
    expect(
      payoutEventText({ outcome: PayoutOutcome.Reduced, cashOut: 12, remaining: 7 }),
    ).toBe('The hit cut your queued 12 to 7.')
  })

  it('DLR-141 — names the frozen figure when the fight ended before the payout could land', () => {
    expect(
      payoutEventText({ outcome: PayoutOutcome.Evaporated, cashOut: 12, remaining: null }),
    ).toBe('The fight ended before your queued 12 could land.')
  })

  it('states the risk in one sentence, derived from the retention percentage', () => {
    expect(PAYOUT_QUEUE_RISK_HINT).toBe('Damage to you cuts it to 60%.')
  })
})
```

- [x] **Step 3: Run the scoped test and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/payoutLabels.test.ts; npm run typecheck`
Expected: Vitest reports all tests in the file passing. `npm run typecheck` still shows the pre-existing `TrickWell.tsx` and `actionBarLabels.test.ts` items Task 8 and Task 9 fix.

### Task 8: `TrickWell.tsx`'s outcome class binds to `Evaporated`, and its CSS rule is renamed ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/TrickWell.tsx:113-119`
- Modify: `src/app/warCouncil/warCouncilTable.css:144-166`
- Test: `src/app/warCouncil/__tests__/TrickWell.test.tsx`

- [x] **Step 1: Rebind the outcome class**

Change:

```tsx
        {payoutText !== null && (
          <p
            className={`wc-payout-line${resolvedTrick.payout?.outcome === PayoutOutcome.Destroyed ? ' wc-is-destroyed' : ''}`}
          >
            {payoutText}
          </p>
        )}
```

to:

```tsx
        {payoutText !== null && (
          <p
            className={`wc-payout-line${resolvedTrick.payout?.outcome === PayoutOutcome.Evaporated ? ' wc-is-evaporated' : ''}`}
          >
            {payoutText}
          </p>
        )}
```

- [x] **Step 2: Rename the CSS rule and update its comment**

Change:

```css
/* DLR-119 — the two clauses that name what the engine just did: which buffs fired (with the
   Overlap Bonus after them) and what became of a queued Apply Damage payout. Quieter than
   `.wc-table-line`, which still owns the trick's own outcome. No new token is invented — every
   colour here is one of `warCouncil.css`'s existing `:root` values, and both sizes copy
   `.wc-table-hint`'s own clamp. A destroyed payout takes the alarm colour AND a distinct
   sentence, so the reading never depends on colour alone. */
.wc-buff-fired,
.wc-payout-line {
  margin: 0.25rem 0 0;
  font-family: var(--wc-sans);
  font-size: clamp(0.62rem, 1.35vmin, 0.78rem);
  line-height: 1.35;
}

.wc-buff-fired {
  color: var(--wc-brass);
}

.wc-payout-line {
  color: var(--wc-chalk-dim);
}

.wc-payout-line.wc-is-destroyed {
  color: var(--wc-alarm);
}
```

to:

```css
/* DLR-119/DLR-141 — the two clauses that name what the engine just did: which buffs fired (with
   the Overlap Bonus after them) and what became of a queued Apply Damage payout. Quieter than
   `.wc-table-line`, which still owns the trick's own outcome. No new token is invented — every
   colour here is one of `warCouncil.css`'s existing `:root` values, and both sizes copy
   `.wc-table-hint`'s own clamp. An EVAPORATED payout takes the alarm colour AND a distinct
   sentence, so the reading never depends on colour alone. A REDUCED payout is not alarmed —
   it survived — and reads in the same quiet tone as a paid one. */
.wc-buff-fired,
.wc-payout-line {
  margin: 0.25rem 0 0;
  font-family: var(--wc-sans);
  font-size: clamp(0.62rem, 1.35vmin, 0.78rem);
  line-height: 1.35;
}

.wc-buff-fired {
  color: var(--wc-brass);
}

.wc-payout-line {
  color: var(--wc-chalk-dim);
}

.wc-payout-line.wc-is-evaporated {
  color: var(--wc-alarm);
}
```

- [x] **Step 3: Update `TrickWell.test.tsx`'s payout tests**

Change:

```tsx
  it('reports a settled payout', () => {
    const paid: ResolvedTrick = {
      ...resolvedTrick,
      payout: { outcome: PayoutOutcome.Paid, cashOut: 12 },
    }
    render(
      <TrickWell currentTrick={[]} resolvedTrick={paid} quarryToLead={false} onCarryOn={vi.fn()} />,
    )
    expect(screen.getByText('Your queued 12 lands.')).toBeDefined()
  })

  it('reports a destroyed payout', () => {
    const destroyed: ResolvedTrick = {
      ...resolvedTrick,
      payout: { outcome: PayoutOutcome.Destroyed, cashOut: 12 },
    }
    render(
      <TrickWell
        currentTrick={[]}
        resolvedTrick={destroyed}
        quarryToLead={false}
        onCarryOn={vi.fn()}
      />,
    )
    expect(screen.getByText('The hit destroyed your queued 12.')).toBeDefined()
  })
```

to:

```tsx
  it('reports a settled payout', () => {
    const paid: ResolvedTrick = {
      ...resolvedTrick,
      payout: { outcome: PayoutOutcome.Paid, cashOut: 12, remaining: null },
    }
    render(
      <TrickWell currentTrick={[]} resolvedTrick={paid} quarryToLead={false} onCarryOn={vi.fn()} />,
    )
    expect(screen.getByText('Your queued 12 lands.')).toBeDefined()
  })

  it('DLR-141 — reports an evaporated payout', () => {
    const evaporated: ResolvedTrick = {
      ...resolvedTrick,
      payout: { outcome: PayoutOutcome.Evaporated, cashOut: 12, remaining: null },
    }
    render(
      <TrickWell
        currentTrick={[]}
        resolvedTrick={evaporated}
        quarryToLead={false}
        onCarryOn={vi.fn()}
      />,
    )
    expect(screen.getByText('The fight ended before your queued 12 could land.')).toBeDefined()
  })
```

And update the later query at line ~261 (`expect(screen.queryByText(/lands\.|destroyed your queued/)).toBeNull()`) to:

```tsx
    expect(screen.queryByText(/lands\.|before your queued/)).toBeNull()
```

- [x] **Step 4: Run the scoped test, typecheck and lint**

Run: `npx vitest run src/app/warCouncil/__tests__/TrickWell.test.tsx; npm run typecheck; npm run lint`
Expected: Vitest reports all tests in the file passing. `npm run typecheck` exits 0 for the whole project. `npm run lint` exits 0.

### Task 9: Verify the queued-payout countdown, and harden its test against a future retune ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/__tests__/actionBarLabels.test.ts`

- [x] **Step 1: Update the risk-hint literal in the two existing assertions**

Change:

```ts
  it('DLR-119 — names the risk while the payout is queued', () => {
    expect(queuedPayoutText(payout(2))).toBe(
      'Payout queued: 12 damage, 2 tricks to go. Damage to you destroys it.',
    )
  })
```

to:

```ts
  it('DLR-119/DLR-141 — names the risk while the payout is queued', () => {
    expect(queuedPayoutText(payout(2))).toBe(
      'Payout queued: 12 damage, 2 tricks to go. Damage to you cuts it to 60%.',
    )
  })
```

Change:

```ts
  it('applyDamageBarAccessibleName includes the queued sentence when a payout is pending', () => {
    const name = applyDamageBarAccessibleName(12, 3, false, null, payout(2))
    expect(name).toContain('2 tricks to go')
    expect(name).toContain('Damage to you destroys it.')
  })
```

to:

```ts
  it('applyDamageBarAccessibleName includes the queued sentence when a payout is pending', () => {
    const name = applyDamageBarAccessibleName(12, 3, false, null, payout(2))
    expect(name).toContain('2 tricks to go')
    expect(name).toContain('Damage to you cuts it to 60%.')
  })
```

- [x] **Step 2: Add the hardening test — the countdown language derived from `applyDamageDelayTricks`, not the literal `2` the rest of the file uses**

Add `applyDamageDelayTricks` to the import from `'../../../hunt'`:

```ts
import type { PendingApplyPayout } from '../../../hunt'
import { applyDamageDelayTricks } from '../../../hunt'
```

Then append, at the end of the `describe('actionBarLabels', ...)` block:

```ts
  it('DLR-135 lesson, applied to the spec — the "N tricks to go" figure a FRESH press owes is derived from applyDamageDelayTricks() + 1, not a literal', () => {
    const freshlyQueuedResolutionsOwed = applyDamageDelayTricks() + 1
    const tricksWord = freshlyQueuedResolutionsOwed === 1 ? 'trick' : 'tricks'
    expect(queuedPayoutText(payout(freshlyQueuedResolutionsOwed))).toContain(
      `${freshlyQueuedResolutionsOwed} ${tricksWord} to go`,
    )
  })
```

- [x] **Step 3: Run the scoped test and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/actionBarLabels.test.ts; npm run typecheck`
Expected: Vitest reports all tests in the file passing, including the new one. `npm run typecheck` exits 0 for the whole project.

---

## Phase 3 — The two design documents

Both documents are maintained by skills, not by hand — this phase's tasks invoke them with the exact citations found in the audit rather than hand-authoring prose. Nothing here changes `src/`, so there is nothing to typecheck; the phase's safe-stopping-point property is that the two docs and the code agree about the rule, checked by re-reading rather than by a runner.

### Task 10: Correct `hybrid-design.md` via the `game-designer` skill — N/A, orchestrator-verified no correction needed ✓

> **Verified independently by the orchestrator (2026-08-25) and confirmed as no defect requiring a
> developer decision.** All three quoted passages ("wipes it to nothing", "destroys a queued
> payout", "does not cost you a queued payout") were re-checked against `hybrid-design.md`: a
> case-insensitive grep for "wipes"/"queued.*payout"/"resolutionsOwed" across the whole file
> returns zero hits, and the file's only "Apply Damage" mentions (a buff-pool line and a worked
> trick example) never describe the delayed-payout queuing mechanic's on-hit behaviour at all.
> `hybrid-design.md` simply never carried the passages this task's citations describe — they live
> in `.docs/game_rules/the-hunt.md` instead (corrected in Task 11). There is therefore no false
> "full wipe" claim in `hybrid-design.md` for this ticket to correct; the plan's Task 10 citations
> were a mix-up (an audit that ran against `the-hunt.md`, attributed to the wrong file). This is a
> plan/audit defect, not a design ambiguity or a game-domain decision — no developer input was
> needed to resolve it, only verification, which the orchestrator performed directly. **No content
> was added to `hybrid-design.md`** — `game-designer` correctly declined to invent rationale to
> match a citation that was never written; filling the pre-existing gap (this doc never received
> the DLR-109/119 delayed Apply Damage design rationale at all) is a separate, out-of-scope
> follow-up, not this ticket's work. **Flagged for `/fb-issue`** against the plan's Task 10 audit
> step. The confirmation grep below passes, but vacuously — it was already zero hits before any
> correction was attempted, because there was nothing to correct.

- Skill: game-designer

**Files:**
- Modify: `.docs/design/Balatro-Forbidden-Solitaire/hybrid-design.md` — **not modified; see blocker above**

- [ ] **Step 1: Invoke `game-designer` to correct the three passages the audit found describing a full wipe — BLOCKED, see note above**

Invoke the skill with this brief: DLR-141 changes Apply Damage's on-hit rule from a full wipe to a 60%-floored reduction. Correct every passage below to state the three-outcome table from the ticket (quoted in `plan.md` Part 1 → Task reference, comment 2) — health-lost hit reduces to 60% floored; hit fully absorbed by blue hearts is untouched; encounter resolving evaporates it in full — and clear any `[provisional]` marker that was attached specifically to the full-wipe reading (not to the surrounding section's other still-open items, e.g. the AP cost). Passages to correct, found by grep on 2026-08-25 (line numbers may have drifted by the time the skill runs — search on the quoted text, not the number):
  - Lines 138-139: "**Taking damage while it is in the air wipes it to nothing**, exactly as an ordinary hit already wipes your bank and multiplier."
  - Lines 1421-1424: "**Taking damage while it is in the air wipes it to nothing.** Any hit that costs you health — a clean loss, an eaten skull, or a Timebomb landing on you — destroys a queued payout exactly as it already resets an unspent bank and multiplier. If a Timebomb hit and a due payout land on the same trick, **the Timebomb wins**: the payout is destroyed along with everything else that trick's damage would have reset."
  - Lines 1621-1623: "**A hit your blue hearts eat entirely does not cost you a queued payout.** An Apply Damage payout still in the air is destroyed by _losing red health_ (section 7); a fully absorbed hit does not lose any, so the payout survives. A hit that is only partly absorbed and still drops red health destroys it exactly as before." (the third sentence's "destroys it" must become "reduces it to 60%, floored").

- [x] **Step 2: Confirm the correction landed**

Run: `Select-String -Path ".docs\design\Balatro-Forbidden-Solitaire\hybrid-design.md" -Pattern "wipes it to nothing|destroys a queued payout|payout is destroyed"`
Actual: zero hits — confirmed. **Vacuous pass**: these phrases were never present in this file (see blocker above), so the zero-hit result does not indicate a correction was made.

### Task 11: Correct `the-hunt.md` via the `implementation-doc-writer` skill ✓

- Skill: implementation-doc-writer

**Files:**
- Modify: `.docs/game_rules/the-hunt.md`

- [x] **Step 1: Invoke `implementation-doc-writer` to correct the Apply Damage section**

Invoke the skill with this brief: DLR-141 changes `applyDamage`'s on-hit rule (`src/hunt/encounter.ts`) from a full wipe of a queued payout to a reduction to `APPLY_DAMAGE_HIT_RETENTION` (60%) of its frozen value, rounded down, via the new `reduceApplyPayoutOnHit` (`src/hunt/applyDamagePayout.ts`). A hit fully absorbed by blue hearts still leaves the payout untouched (unchanged from before); the encounter resolving — either side — still evaporates it in full (unchanged from before). Correct the "Applying damage" section (found at approximately line 1399 on 2026-08-25 — search on the quoted text, not the line number) — specifically the bullet beginning "**Taking damage while it is in the air wipes it to nothing.**" — to state the new rule and its three outcomes, citing `hybrid-design.md`'s corresponding section rather than restating its reasoning, per this doc's own convention. Update the Status register / marker for this specific reading from whatever full-wipe provisional state it carried to reflect that the reduction rule (not the AP cost, which stays separately provisional) is settled by the ticket's developer-confirmed table.

- [x] **Step 2: Confirm the correction landed**

Run: `Select-String -Path ".docs\game_rules\the-hunt.md" -Pattern "wipes it to nothing|destroys a queued payout"`
Actual: zero hits — confirmed.

---

## Phase 4 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean.

### Task 12: Confirm the pure-core boundary still holds ✓

- [x] **Step 1: Grep the two changed engine files for React or DOM references**

Run: `Get-ChildItem src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. **Confirmed — zero hits.**

### Task 13: Confirm no stale name or hard-coded tunable remains ✓

- [x] **Step 1: Grep for the removed `Destroyed` / `wc-is-destroyed` names across the whole tree**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "PayoutOutcome\.Destroyed|'destroyed'|wc-is-destroyed"`
Expected: zero hits. **Confirmed — zero hits.**

- [x] **Step 2: Grep the touched files for a hard-coded `0.6` outside `apConfig.ts`**

Run: `Select-String -Path src\hunt\applyDamagePayout.ts,src\hunt\encounter.ts,src\app\warCouncil\commitHandlers.ts,src\app\warCouncil\payoutLabels.ts,src\app\warCouncil\TrickWell.tsx,src\app\warCouncil\actionBarLabels.ts -Pattern "0\.6"`
Expected: zero hits — every one of these files reads `APPLY_DAMAGE_HIT_RETENTION` by name rather than restating its value. **Confirmed — zero hits.**

### Task 14: Static gates and full suite ✓

> **Orchestrator-applied fix (2026-08-25).** Task 14's Phase-4 implementer correctly stopped at
> Step 1c per this phase's own "verification-only, do not silently patch" instruction and reported
> the blocker faithfully (see the archived note below). The orchestrator then verified the finding,
> confirmed the three files were genuinely outside this contract's file map (a plan-audit gap, not
> a design ambiguity — the correct replacement assertions were already fully determined by the
> ticket's confirmed rule, so no developer decision was needed), and updated the three specs'
> assertions directly to the shipped `Reduced` vocabulary. Recommend `/fb-issue` against the plan's
> consumer audit for missing `shield.encounter.test.ts`, `ward.encounter.test.ts`, and
> `roundReducer.applyDamage.test.ts` as real consumers of `applyDamage`'s changed enforcement point.

- [x] **Step 1a: Typecheck** — `npm run typecheck` exits 0, no errors.
- [x] **Step 1b: Lint** — `npm run lint` exits 0, no errors/warnings.
- [x] **Step 1c: Unfiltered suite**

Run: `npm test`
Expected: all three exit 0; Vitest reports 0 failed.
**Original run: 3 failed, 1823 passed (1826)** — see archived blocker note below.
**After the orchestrator's fix: `Test Files 140 passed (140)`, `Tests 1826 passed (1826)`.**

<details>
<summary>Archived blocker note (resolved)</summary>

Three pre-existing spec files, none of them in this contract's file map, still asserted the OLD
full-wipe rule and failed against the new reduce-to-60%-floored behaviour:
- `src/hunt/__tests__/shield.encounter.test.ts` — "a partially absorbed hit that drops red health
  destroys it exactly as before" → rewritten to assert `cashOut: Math.floor(9 * APPLY_DAMAGE_HIT_RETENTION)`
- `src/hunt/__tests__/ward.encounter.test.ts` — "destroys pendingApplyPayout when the Ward only
  partly covered the hit" → rewritten to assert `cashOut: Math.floor(4 * APPLY_DAMAGE_HIT_RETENTION)`
- `src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts` — "AC3 — ... taking the hit wipes
  the queued payout" (distinct file from `roundReducer.delayedApply.test.ts`, which Task 6 did
  update) → rewritten to assert `cashOut: Math.floor(9 * APPLY_DAMAGE_HIT_RETENTION)`

All three now import `APPLY_DAMAGE_HIT_RETENTION` from `../config` / `../../../hunt` rather than
hard-coding the reduced figure, per the same no-hard-coded-tunable rule the rest of this contract
follows.
</details>

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. **Confirmed — exits 0, `dist/` written (`index.html`, `index-CIkQRQPV.css`, `index-cvwCg5Ny.js`), no bundler errors.**

- [x] **Step 3: Formatting of only this contract's touched files**

Run: `npx prettier --check` against the full touched-file list (the original 16 plus the three
Task-14 fix files: `shield.encounter.test.ts`, `ward.encounter.test.ts`, `roundReducer.applyDamage.test.ts`).
**First pass: 4 files flagged** (`applyDamagePayout.ts`, `shield.encounter.test.ts`,
`ward.encounter.test.ts`, `payoutLabels.test.ts`) — drift from earlier edits, not from the Task 14
fix files' new content specifically. Ran `npx prettier --write` scoped to exactly those 4 files.
**Re-check: all matched files use Prettier code style.** Re-ran typecheck (0), the 4 reformatted
files' scoped Vitest (51 passed), the full suite (1826 passed), lint (0), and build (0) after the
reformat to confirm nothing regressed.

### Task 15: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include:
- Link to `plan.md` in this folder.
- Summary: Apply Damage payout now reduces to 60% (floored) of its queued value on a hit that costs red health, instead of being wiped to zero; a hit fully absorbed by blue hearts is untouched; the encounter ending still evaporates it in full. `PayoutOutcome` is now a three-member union (`Paid` / `Reduced` / `Evaporated`); the felt's copy and the risk hint are updated to match, and both design documents are corrected.
- Every decision the developer must make and every behaviour they must judge by playing, from `plan.md` → Risks and judgement calls: all copy is unapproved and unseen; whether 60% survival makes a late press feel worth taking is a play question no browser pass answered; the five pre-existing uncommitted working-tree files (including `apConfig.ts`'s `APPLY_DAMAGE_AP_COST` change) are untouched by this contract and remain the developer's to handle.
- Verification results from Phase 4 (typecheck / lint / test / build exit codes and the Vitest pass count).
- A one-line note for future contributors: `TrickPayoutEvent.remaining` is required-but-nullable — every future construction site must state it explicitly, `null` for the two terminal outcomes.

---

## Self-review

**Spec coverage:**
- New tunable constant, one reader (`plan.md` In scope bullet 1) — Task 1, Task 2 Step 4.
- Pure reducer with flooring and the reach-zero edge (bullet 2) — Task 2.
- `applyDamage` reduces instead of wipes, `winner !== null` still wipes (bullet 3) — Task 3.
- Fully-absorbed-hit test at 100% (bullet 4) — Task 3 Step 3.
- Three-member `PayoutOutcome` (bullet 5) — Task 2.
- `TrickPayoutEvent.remaining` (bullet 6) — Task 2.
- `commitHandlers.ts` three-way distinction (bullet 7) — Task 5.
- New copy, percentage derived from the constant (bullet 8) — Task 7.
- `TrickWell.tsx` CSS class no longer binds to `Destroyed` (bullet 9) — Task 8.
- Countdown verification and hardening test (bullet 10) — Task 9.
- Both design documents corrected (bullet 11) — Tasks 10-11.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or command; the two doc tasks name exact quoted passages rather than leaving the correction to a paraphrase.

**Type / name consistency:** `APPLY_DAMAGE_HIT_RETENTION`, `reduceApplyPayoutOnHit`, `PayoutOutcome.Reduced` / `.Evaporated`, and `TrickPayoutEvent.remaining` are spelled identically across every task that touches them (Tasks 1-9). `wc-is-evaporated` is the one new CSS name and is introduced and consumed in the same task (Task 8).

**Phase boundary cleanliness:** Phase 1 ends with `src/hunt/` type-checking internally and its own specs green; downstream errors in `src/app/warCouncil/` are expected and named explicitly rather than hidden, closed within Phase 2 itself (not carried into Phase 3). Phase 2 ends with `npm run typecheck` and `npm run lint` clean across the whole project, and every touched spec passing. Phase 3 touches no code, so it ends exactly as it started, compile-wise, with two docs re-read to confirm the correction landed. Phase 4 makes no production change.
