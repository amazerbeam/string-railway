# Tasks: Delayed Apply Damage payout

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

> **NOT DEVELOPER-CONFIRMED.** This contract was produced inside the unattended sprint run of 2026-08-23. `plan.md` was auto-approved without an `AskUserQuestion` gate, and every open design question took `plan.md`'s stated default. No mockup was built (the work touches no `.tsx` file and renders no new surface), so no mockup was seen either. Everything in `plan.md` → *Assumptions made* and *Risks and judgement calls* is unreviewed.

Status: COMPLETE
Started: 2026-08-23

**Goal:** Apply Damage costs `APPLY_DAMAGE_AP_COST` and queues its cash-out for a configurable delay instead of dealing it instantly; damage taken during the window wipes the queued payout, and the quick-kill unplayed-card count freezes at press time.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/hunt/applyDamagePayout.ts` — the pure payout rule: the queued shape, `applyDamageDelayTricks`, the constructor, the per-resolution tick.
- `src/hunt/__tests__/applyDamagePayout.test.ts` — unit tests for that module.
- `src/app/warCouncil/__tests__/roundReducer.delayedApply.test.ts` — the integration tests for AC2/AC3/AC4 and the payout-vs-Timebomb ordering.

**Modified:**
- `src/hunt/apConfig.ts` — add `APPLY_DAMAGE_AP_COST` and `APPLY_DAMAGE_DELAY_TRICKS`.
- `src/hunt/config.ts:361-372` — extend the existing `./apConfig` re-export block with both new names.
- `src/hunt/types.ts` — `EncounterState` gains `pendingApplyPayout`.
- `src/hunt/encounter.ts` — seed the new field, wipe it inside `applyDamage`, add `hasPendingApplyPayout` and `queueApplyDamagePayout`.
- `src/hunt/index.ts` — barrel the new module, the two new encounter functions, and the two new constants.
- `src/hunt/__tests__/encounter.test.ts` — AC3's wipe-at-the-clamp-point tests.
- `src/warCouncil/voluntaryCashOut.ts` — two new refusal codes, two new `ApplyDamageStock` fields, the five-clause order.
- `src/warCouncil/__tests__/voluntaryCashOut.test.ts:12-18` — widen the `stock()` factory; add the new refusal and ordering tests.
- `src/app/warCouncil/roundUiState.ts` — `apPool` on `RoundUiState`, seeded in `createRoundUiState`; two new fields in `applyDamageStock`.
- `src/app/warCouncil/roundReducer.ts` — `handleTapApplyDamage` queues and spends AP instead of applying.
- `src/app/warCouncil/commitHandlers.ts` — `applyResolution` returns `FoldedResolution`, gains `handEnding`, and settles the payout last; `commit` threads both.
- `src/app/warCouncil/labels.ts:234-239` — two new refusal sentences.
- `src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts` — update for the delayed behaviour.
- `.docs/implementation/hunt/` and `.docs/game_rules/the-hunt.md` — refreshed by `implementation-doc-writer`.

**Deleted:** (none)

**Developer decides or observes:**
- config → `APPLY_DAMAGE_AP_COST` — transcribed from the ticket as `3` and flagged open there. Against `STARTING_AP = 6` it allows at most two presses a hand before buffs draw on the same pool. Never played.
- config → `APPLY_DAMAGE_DELAY_TRICKS` — `1`, from AC2's "the current trick plus the next trick". The value that decides whether Apply Damage is still worth pressing at all. Never played.
- Whether an outstanding payout landing at the hand's final trick is right, or whether a late press should simply lose it. Play trick-5 and trick-6 presses specifically.
- Whether refusing a second press while one is in the air is right, or whether payouts should stack.
- Whether a detonating Timebomb destroying a due payout feels fair the first time it lands.
- **The feel of pressing Apply with no feedback at all.** The bank zeroes, the Quarry's health does not move, and nothing on screen says a payout is owed — the ticket puts that UI out of scope. This is the single thing most worth looking at in the running app, and a follow-up UI ticket is likely.
- That `apPool` exists but is never rendered, so an `InsufficientAp` refusal reads as the button dying for no visible reason.

---

## Phase 1 — The payout rule, as pure logic

Everything this ticket decides about *how long* a payout waits and *when* it becomes due, in one module with no knowledge of a round, a trick, or an encounter. The phase ends with a new file, its two tunables, and a passing spec — nothing else in the tree imports it yet, so the codebase type-checks throughout.

### Task 1: Add the two Apply Damage tunables to `src/hunt/apConfig.ts` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/apConfig.ts`
- Config: `src/hunt/config.ts:361-372` — extend the existing `export { … } from './apConfig'` block

- [x] **Step 1: Append both constants to `src/hunt/apConfig.ts`, after `MAX_COIN_BONUS_PER_HAND`**

```ts
// DLR-109 — Apply Damage's two tunables. They live here rather than in `config.ts` because that
// file is at 372 of its 400-line blocking budget and this file is already its sanctioned overflow.
// `APPLY_DAMAGE_DELAY_TRICKS` is not an AP figure; it sits beside the AP cost because the two are
// one control's pair of tunables and splitting them across two files to satisfy a filename would
// be worse.

// AC1 — what one Apply Damage press costs. Transcribed from the ticket, which sets this default
// and flags it OPEN per §2 of the design doc. NEVER PLAYED — the developer's to move.
// UNIT: action points per press.
export const APPLY_DAMAGE_AP_COST: ActionPoints = 3

// AC2/AC5 — how many WHOLE TRICKS BEYOND the trick the press happened in a queued payout must
// survive. `1` is AC2's "the current trick plus the next trick": a press queues
// `APPLY_DAMAGE_DELAY_TRICKS + 1` trick resolutions. Deliberately NOT typed `ActionPoints` — it
// counts tricks, not points. Read only through `applyDamageDelayTricks`, never as a literal.
// NEVER PLAYED. UNIT: tricks.
export const APPLY_DAMAGE_DELAY_TRICKS = 1
```

- [x] **Step 2: Add both names to `config.ts`'s existing `./apConfig` re-export block**

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
} from './apConfig'
```

- [x] **Step 3: Confirm `config.ts` is still inside its line budget**

Run: `(Get-Content src\hunt\config.ts).Count`
Expected: a number below 400.

- [x] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Create `src/hunt/applyDamagePayout.ts` and its spec ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/hunt/applyDamagePayout.ts`
- Test: `src/hunt/__tests__/applyDamagePayout.test.ts`

- [x] **Step 1: Write the failing spec at `src/hunt/__tests__/applyDamagePayout.test.ts`**

Cover, at minimum:

```ts
import { describe, expect, it } from 'vitest'
import { APPLY_DAMAGE_DELAY_TRICKS } from '../config'
import { applyDamageDelayTricks, queueApplyPayout, tickApplyPayout } from '../applyDamagePayout'

describe('applyDamageDelayTricks', () => {
  it('AC5 — reads the configured delay when no modifier is supplied', () => {
    expect(applyDamageDelayTricks()).toBe(APPLY_DAMAGE_DELAY_TRICKS)
  })

  it('AC5 — a shortening buff subtracts, and the result never goes below zero', () => {
    expect(applyDamageDelayTricks({ shortenBy: 1 })).toBe(APPLY_DAMAGE_DELAY_TRICKS - 1)
    expect(applyDamageDelayTricks({ shortenBy: 99 })).toBe(0)
  })

  it('AC5 — removeDelay wins over shortenBy', () => {
    expect(applyDamageDelayTricks({ removeDelay: true, shortenBy: -5 })).toBe(0)
  })

  it('ignores a non-finite shortenBy rather than producing NaN', () => {
    expect(applyDamageDelayTricks({ shortenBy: Number.NaN })).toBe(APPLY_DAMAGE_DELAY_TRICKS)
  })
})

describe('queueApplyPayout', () => {
  it('AC2 — owes the configured delay PLUS the trick the press happened in', () => {
    expect(queueApplyPayout(9, 4).resolutionsOwed).toBe(APPLY_DAMAGE_DELAY_TRICKS + 1)
  })

  it('AC4 — freezes the cash figure and the press-time hand size', () => {
    expect(queueApplyPayout(9, 4)).toMatchObject({ cashOut: 9, unplayedAtPress: 4 })
  })

  it('refuses a payout that could never render — a caller that skipped the refusal check', () => {
    expect(() => queueApplyPayout(0, 4)).toThrow(RangeError)
    expect(() => queueApplyPayout(Number.NaN, 4)).toThrow(RangeError)
    expect(() => queueApplyPayout(9, -1)).toThrow(RangeError)
  })
})

describe('tickApplyPayout', () => {
  it('nothing queued ticks to nothing, and never throws', () => {
    expect(tickApplyPayout(null, false)).toEqual({ pending: null, due: null })
  })

  it('AC2 — counts down one resolution at a time and is not due before zero', () => {
    const queued = queueApplyPayout(9, 4)
    const first = tickApplyPayout(queued, false)
    expect(first.due).toBeNull()
    expect(first.pending?.resolutionsOwed).toBe(APPLY_DAMAGE_DELAY_TRICKS)
  })

  it('AC2 — becomes due on the resolution that takes the count to zero', () => {
    let tick = tickApplyPayout(queueApplyPayout(9, 4), false)
    while (tick.pending !== null) tick = tickApplyPayout(tick.pending, false)
    expect(tick.due).toMatchObject({ cashOut: 9, unplayedAtPress: 4 })
  })

  it('an outstanding payout lands at the end of the hand however much was owed', () => {
    expect(tickApplyPayout(queueApplyPayout(9, 4), true).due?.cashOut).toBe(9)
  })

  it('exactly one of pending and due is set — a payout is never both held and paid', () => {
    const tick = tickApplyPayout(queueApplyPayout(9, 4), false)
    expect(tick.pending === null).not.toBe(tick.due === null)
  })
})
```

- [x] **Step 2: Run the spec and confirm it fails to resolve the module**

Run: `npx vitest run src/hunt/__tests__/applyDamagePayout.test.ts`
Expected: non-zero exit; the failure names the missing `../applyDamagePayout` module.

- [x] **Step 3: Write `src/hunt/applyDamagePayout.ts`**

Signatures exactly as `plan.md` Part 2 → Data shapes states. Implementation notes that are load-bearing rather than stylistic:

- `applyDamageDelayTricks` returns `0` when `modifiers?.removeDelay` is true; otherwise `Math.max(0, APPLY_DAMAGE_DELAY_TRICKS - shortenBy)` where `shortenBy` falls back to `0` unless it is a finite number. Never returns `NaN` or a negative.
- `queueApplyPayout` throws `RangeError` naming the offending figure when `cashOut` is not a finite number greater than zero, or `unplayedAtPress` is not a finite number of zero or more — the `quickKillPayout` / `flaskHealAmount` guard discipline, because a `NaN` payout would reach a rendered heart row and vanish with nothing logged. It then returns `{ cashOut, unplayedAtPress, resolutionsOwed: applyDamageDelayTricks(modifiers) + 1 }`.
- `tickApplyPayout` **never throws** — it runs inside a reducer during an event handler, where a throw unmounts the tree. `null` in gives `{ pending: null, due: null }`. Otherwise decrement `resolutionsOwed`; if the result is `<= 0` (not `=== 0`, so a corrupted counter still terminates) **or** `handEnding` is true, return `{ pending: null, due: pending }`; else return `{ pending: { ...pending, resolutionsOwed: next }, due: null }`.
- No `Math.random()`, no division, no DOM global, no React import — the file imports only `./config` and `./types`.

- [x] **Step 4: Run the spec green and typecheck**

Run: `npx vitest run src/hunt/__tests__/applyDamagePayout.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

---

## Phase 2 — The queue's home on `EncounterState`

Give the payout a place to live beside `pendingTimebomb`, and put AC3's wipe at the module's single clamp point so no damage path can route around it. The phase ends with `src/hunt/` complete and self-consistent; nothing outside it reads the new field yet, so the app layer still compiles unchanged.

### Task 3: Add `pendingApplyPayout` to `EncounterState` and enforce AC3 inside `applyDamage` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/types.ts`, `src/hunt/encounter.ts`, `src/hunt/index.ts`
- Test: `src/hunt/__tests__/encounter.test.ts`

- [x] **Step 1: Add the field to `EncounterState` in `src/hunt/types.ts`**

Declared exactly as `plan.md` Part 2 → Data shapes gives it, imported as `import type { PendingApplyPayout } from './applyDamagePayout'`. Its docblock must state that it is a sibling of `pendingTimebomb`, seeded `null` by `startEncounter` — which is what discards it at an encounter boundary with no clear step to forget — and that it is not persisted.

- [x] **Step 2: Seed it in `startEncounter` and wipe it in `applyDamage`**

In `startEncounter`'s returned object, add `pendingApplyPayout: null`.

In `applyDamage`, after `const health = { … }` and the existing winner resolution, carry the field through conditionally:

```ts
  const winner = resolveWinner(health)
  // DLR-109 AC3 — THE single enforcement point, deliberately here rather than at a call site.
  // Every damage path in this codebase funnels through this function, so a queued payout cannot
  // survive a hit by taking a route that forgot to check. A resolved encounter drops it too: a
  // dead Quarry needs no further damage, and a dead player has already been wiped by the same
  // line.
  const playerLostHealth = playerHealth < encounter.health[DuelSide.Player]

  return {
    health,
    damageEventsApplied: encounter.damageEventsApplied + 1,
    winner,
    pendingTimebomb: encounter.pendingTimebomb,
    pendingApplyPayout:
      playerLostHealth || winner !== null ? null : encounter.pendingApplyPayout,
  }
```

- [x] **Step 3: Add the two new encounter functions**

`hasPendingApplyPayout(encounter)` returns `encounter.pendingApplyPayout !== null`, with the one-statement docblock `hasPendingTimebomb` already models.

`queueApplyDamagePayout(encounter, payout)` returns the encounter **unchanged** when `isEncounterResolved(encounter)` or when `hasPendingApplyPayout(encounter)` — the plan's one-at-a-time rule — and otherwise `{ ...encounter, pendingApplyPayout: payout }`. Its docblock must state that it NEVER throws, for `queueTimebomb`'s stated reason.

- [x] **Step 4: Barrel the new names in `src/hunt/index.ts`**

Add `hasPendingApplyPayout` and `queueApplyDamagePayout` to the existing `./encounter` export block; add `APPLY_DAMAGE_AP_COST` and `APPLY_DAMAGE_DELAY_TRICKS` to the existing config-constant export block; and add the new module's exports:

```ts
export type {
  PendingApplyPayout,
  ApplyDamageDelayModifiers,
  ApplyPayoutTick,
} from './applyDamagePayout'
export { applyDamageDelayTricks, queueApplyPayout, tickApplyPayout } from './applyDamagePayout'
```

- [x] **Step 5: Extend `src/hunt/__tests__/encounter.test.ts` with AC3's rules**

Add tests asserting:
- `startEncounter` seeds `pendingApplyPayout` to `null`.
- `queueApplyDamagePayout` holds a payout on a live encounter, and returns the encounter **unchanged** (identity-equal) when one is already queued, and when the encounter is resolved.
- **AC3** — `applyDamage` with a non-zero player entry wipes a queued payout to `null`.
- `applyDamage` with an all-zero incoming event, and with damage to the Quarry only, **preserves** the queued payout — this is the test that stops the wipe being over-eager, and it is the case the delayed payout's own settlement depends on.
- `applyDamage` that resolves the encounter (either side) leaves `pendingApplyPayout` `null`.

- [x] **Step 6: Run both `hunt` specs and typecheck**

Run: `npx vitest run src/hunt/__tests__/encounter.test.ts src/hunt/__tests__/applyDamagePayout.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

---

## Phase 3 — The refusal path and its copy

Extend the one statement of whether Apply Damage is available, rather than adding a second. `ApplyDamageStock` gains two required fields, which makes every literal of that shape a compile error until it is updated — so the interface, the predicate, the single builder, the test factory, and the copy all move in this phase and the tree type-checks at its end.

### Task 4: Widen `ApplyDamageRefusal` and `applyDamageRefusalFor` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/voluntaryCashOut.ts`
- Test: `src/warCouncil/__tests__/voluntaryCashOut.test.ts:12-18`

- [x] **Step 1: Add the two reason codes and the two stock fields**

Exactly as `plan.md` Part 2 → Data shapes gives them. `ApplyDamageStock` gains `payoutPending: boolean` and `apPool: ActionPoints`; import `type ActionPoints`, `APPLY_DAMAGE_AP_COST` and `canAffordAp` from `'../hunt'`, which this file already imports from.

- [x] **Step 2: Rewrite the predicate's body as five ordered clauses**

```ts
export function applyDamageRefusalFor(stock: ApplyDamageStock): ApplyDamageRefusal | null {
  if (!stock.canAct) return ApplyDamageRefusal.NotYourMove
  if (stock.timebombPending) return ApplyDamageRefusal.TimebombPending
  if (stock.payoutPending) return ApplyDamageRefusal.PayoutPending
  if (!canAffordAp(stock.apPool, APPLY_DAMAGE_AP_COST)) return ApplyDamageRefusal.InsufficientAp
  if (cashValue(stock.bank, stock.multiplier) <= 0) return ApplyDamageRefusal.EmptyBank
  return null
}
```

Extend the existing docblock's ordering rationale rather than replacing it: `EmptyBank` stays last because it is the reason that stops being true after the next trick banks, and `InsufficientAp` precedes it because AP refreshes only per hand and therefore outlives a trick.

- [x] **Step 3: Widen the `stock()` factory in the spec and add the new cases**

```ts
const stock = (over: Partial<ApplyDamageStock> = {}): ApplyDamageStock => ({
  bank: 3,
  multiplier: 3,
  timebombPending: false,
  payoutPending: false,
  apPool: STARTING_AP,
  canAct: true,
  ...over,
})
```

Add tests asserting: a queued payout refuses with `PayoutPending`; a pool below `APPLY_DAMAGE_AP_COST` refuses with `InsufficientAp`; and one ordering test that walks all five clauses down from every-reason-true, confirming `NotYourMove → TimebombPending → PayoutPending → InsufficientAp → EmptyBank`.

- [x] **Step 4: Run the spec and typecheck**

Run: `npx vitest run src/warCouncil/__tests__/voluntaryCashOut.test.ts; npm run typecheck`
Expected: the spec reports 0 failed. `typecheck` will still report errors in `src/app/warCouncil/roundUiState.ts`, whose `applyDamageStock` builder is now missing two fields — Task 5 closes that in this same phase.

### Task 5: Give `RoundUiState` an AP pool and complete the stock builder ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/roundUiState.ts`

- [x] **Step 1: Add `apPool` to `RoundUiState` and seed it in `createRoundUiState`**

Field and docblock exactly as `plan.md` Part 2 → Data shapes gives them. `createRoundUiState` adds `apPool: refreshActionPointsForNewHand(STARTING_AP)`, importing both names from `'../../hunt'`. **`RoundUiSeed` is unchanged** — no new mount prop, so `warCouncilMount.ts` and every mount site stay untouched.

- [x] **Step 2: Complete `applyDamageStock`**

```ts
export function applyDamageStock(state: RoundUiState): ApplyDamageStock {
  return {
    bank: state.round.bank,
    multiplier: state.round.multiplier,
    timebombPending: hasPendingTimebomb(state.encounter),
    payoutPending: hasPendingApplyPayout(state.encounter),
    apPool: state.apPool,
    canAct: canAct(state),
  }
}
```

Import `hasPendingApplyPayout` from `'../../hunt'` alongside the existing `hasPendingTimebomb`.

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0. The only remaining consumer, `labels.ts`'s refusal map, is closed by Task 6 — if `typecheck` reports that map as incomplete, that is expected and Task 6 fixes it in this same phase.

### Task 6: Write the copy for the two new refusals ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/labels.ts:234-239`

- [x] **Step 1: Add both sentences to `APPLY_DAMAGE_REFUSAL_MESSAGE`**

```ts
  [ApplyDamageRefusal.PayoutPending]:
    'Your last Apply is still in the air — it lands when the next trick resolves.',
  [ApplyDamageRefusal.InsufficientAp]: 'Not enough action points to apply.',
```

PLACEHOLDER copy, as the rest of this file is. It must not borrow the Timebomb fuse lexicon — no *detonates*, no *primed*, no *ticking*: a queued cash-out is not a Timebomb, and reusing those words would reintroduce exactly the one-word-two-meanings split DLR-129 closed.

- [x] **Step 2: Typecheck and run the two specs that read this map**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/labels.test.ts src/app/warCouncil/__tests__/ApplyDamagePlate.test.tsx`
Expected: `typecheck` exits 0; both specs report 0 failed. Neither enumerates the map, so neither should need editing.

---

## Phase 4 — Queue the press, settle it at the right moment

The behaviour change itself: the press stops applying damage and starts queueing it, and the trick resolution grows a fourth step that settles the queue **after** the trick's own damage and after the Timebomb book/clear. That order is the phase's whole point and is what the tests in Task 9 pin down.

### Task 7: Make `handleTapApplyDamage` spend AP and queue instead of applying ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/roundReducer.ts`

- [x] **Step 1: Replace the commit branch of `handleTapApplyDamage`**

The refusal check and the poise branch above it are unchanged. The commit branch becomes:

```ts
  const { state: round, cashOut } = cashBankNow(state.round)
  // Guarded for `applyResolution`'s stated reason: a resolved encounter must never be written to,
  // and a reducer must not throw. Unreachable in practice — a resolved encounter already fails
  // `canAct`, so `applyDamageRefusalFor` returned `NotYourMove` above.
  if (isEncounterResolved(state.encounter)) {
    return { ...state, applyPoised: false }
  }
  // AC2 — the press no longer deals anything. It freezes the figure and the press-time hand size
  // (AC4) and hands both to the encounter's queue; `applyResolution` settles it a trick or more
  // later. AC1 — the cost is spent through `spendAp`, the ONLY subtraction path, so `AP_ENABLED`
  // is honoured with no bypass written here. `spendAp` throws on an unaffordable spend and the
  // `InsufficientAp` refusal above is what guarantees this line never reaches that.
  const payout = queueApplyPayout(cashOut, state.round.hands[PlayerSide.Player].length)
  return {
    ...state,
    round,
    encounter: queueApplyDamagePayout(state.encounter, payout),
    apPool: spendAp(state.apPool, APPLY_DAMAGE_AP_COST),
    applyPoised: false,
  }
```

Adjust the imports: drop `applyDamage` and `incomingFromCashOut` from this file if nothing else in it uses them, and add `queueApplyPayout`, `queueApplyDamagePayout`, `spendAp` and `APPLY_DAMAGE_AP_COST` from `'../../hunt'`.

- [x] **Step 2: Update the function's docblock**

The existing docblock states that the second tap commits the cash-out. It must now state that the second tap *queues* it, that the AP is spent at that moment and is not refunded if the payout is later wiped, and that `captureUnplayed` no longer fires on this transition because the press no longer resolves the encounter.

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

### Task 8: Settle the payout inside `applyResolution`, last ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/app/warCouncil/commitHandlers.ts`
- Modify: `src/app/warCouncil/__tests__/roundReducer.quickKill.test.ts` (unplanned — see Notes)

- [x] **Step 1: Widen `applyResolution` to `FoldedResolution` and add `settleApplyPayout`**

```ts
/**
 * One trick's whole effect on the encounter, in the one place it is stated. FOUR steps, and the
 * ORDER IS LOAD-BEARING (DLR-109 adds the fourth):
 *
 *   1. the trick's own damage — which already folds in any Timebomb detonating this trick, via
 *      `playOptions` — is applied;
 *   2. the paid Timebomb queue is cleared;
 *   3. this trick's own prime is booked for the next trick;
 *   4. the queued Apply Damage payout ticks, and lands if it is due.
 *
 * Step 4 is LAST, and that is the whole ordering rule when a payout and a ticking Timebomb are
 * both outstanding. Because AC3's wipe lives inside `applyDamage`, step 1 has already set
 * `pendingApplyPayout` to `null` on any trick that cost the player health — so a Timebomb
 * detonating against the player on the trick a payout was due DESTROYS that payout. Putting the
 * tick anywhere earlier would let a player dodge AC3 by timing, which is the one thing the
 * criterion exists to prevent.
 */
interface FoldedResolution {
  readonly encounter: EncounterState
  /** DLR-109 AC4 — the press-time unplayed count, and ONLY when a DELAYED payout is what resolved
   *  the encounter. `null` on every other path, including a kill by ordinary trick damage, which
   *  `captureUnplayed` still handles off the live hand. */
  readonly unplayedAtPress: number | null
}

function applyResolution(
  encounter: EncounterState,
  resolution: TrickResolution,
  handEnding: boolean,
): FoldedResolution
```

`applyResolution`'s first three steps are unchanged in behaviour; it returns `settleApplyPayout(booked, handEnding)` instead of `booked`, and returns `{ encounter, unplayedAtPress: null }` on its existing already-resolved early return.

`settleApplyPayout(encounter, handEnding)`:
- calls `tickApplyPayout(encounter.pendingApplyPayout, handEnding)`;
- when nothing is due, returns the encounter with `pendingApplyPayout` set to the ticked value (returning the input object untouched when the value did not change, so a no-payout trick allocates nothing) and `unplayedAtPress: null`;
- when a payout is due, clears the field first, then — guarding `isEncounterResolved` for the reason `applyResolution` already guards — applies it with `applyDamage(banked, incomingFromCashOut(due.cashOut))`. **`incomingFromCashOut` is the one sanctioned `PlayerSide → DuelSide` crossing for this figure and must be used rather than a hand-built record**;
- reports `unplayedAtPress: due.unplayedAtPress` only when the resulting encounter reads resolved, and `null` otherwise.

- [x] **Step 2: Thread `handEnding` and `unplayedAtPress` through `commit`**

Both `applyResolution` call sites gain a third argument and their results are unwrapped:
- the player's own follow passes `result.state.phase === RoundPhase.Complete`;
- the Quarry's follow passes `advanced.round.phase === RoundPhase.Complete`.

`settled` and the returned advanced state each take `unplayedAtResolve: state.unplayedAtResolve ?? folded?.unplayedAtPress ?? null` — **never overwriting a value already frozen**, so `captureUnplayed`'s "the null check IS the has-this-been-captured test" contract still holds and the two cannot fight over the field.

Import `RoundPhase` from `'../../warCouncil'` and `tickApplyPayout` from `'../../hunt'`.

- [x] **Step 3: Confirm the file is still inside its line budget**

Run: `(Get-Content src\app\warCouncil\commitHandlers.ts).Count`
Expected: a number below 400. If it is not, split the payout half into its own sibling module in this task — `plan.md` names that as the expected remedy, and CLAUDE.md makes the breach a blocking in-ticket fix, never a finding.

Result: 207 lines. No split needed.

- [x] **Step 4: Typecheck and run the existing reducer specs**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts src/app/warCouncil/__tests__/roundReducer.timebombQueue.test.ts src/app/warCouncil/__tests__/roundReducer.quickKill.test.ts`
Expected: `typecheck` exits 0. `roundReducer.applyDamage.test.ts` is EXPECTED TO FAIL here — it asserts the old instant behaviour. Task 9 rewrites it. The other two must stay green; a failure in either is a real regression in the Timebomb queue or the quick-kill capture.

Result: `typecheck` exited 0. `timebombQueue.test.ts` was green as expected. `applyDamage.test.ts` failed as expected (2 of 12). `quickKill.test.ts` ALSO failed here (1 of 3) — investigated: its one failing test drove its kill through two `TapApplyDamage` taps, the exact instant-cash mechanism this ticket replaces with a delayed payout, so the transition it depended on no longer resolves the encounter at all. This is not a Timebomb-queue or capture-logic regression; it is the same category of break as `applyDamage.test.ts`, on a file the plan did not list as a Task 9 target. Rewrote its kill construction to drive an ordinary trick cash-out (the same construction `roundReducer.bank.test.ts`'s "stops accepting taps" spec already uses) instead of Apply Damage, preserving DLR-95 AC2's actual intent — `captureUnplayed` freezing on the first resolved transition — independent of Apply Damage's now-delayed timing. Both specs green after the rewrite; see Task 9's report entry for the re-run.

### Task 9: Pin the delayed behaviour with reducer-level tests ✓

- Skill: `react-frontend`

**Files:**
- Create: `src/app/warCouncil/__tests__/roundReducer.delayedApply.test.ts`
- Modify: `src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts`

- [x] **Step 1: Update `roundReducer.applyDamage.test.ts` for the new behaviour**

Every assertion that the Quarry's health drops in the same transition as the second tap becomes an assertion that it does **not**, and that `encounter.pendingApplyPayout` holds the frozen `cashOut` instead. The poise/cancel/refusal behaviour is unchanged and those tests stay as they are. Add an assertion that `apPool` fell by `APPLY_DAMAGE_AP_COST` on the committing tap and did **not** fall on the poising tap. Use `src/app/warCouncil/__tests__/roundFixture.ts` for the state, as the sibling reducer specs do.

Also rewrote the "further tap on a resolved fight" fixture: it now freezes `unplayedAtResolve` on its hand-built `settled` state, matching what `captureUnplayed` would already have written by the transition that fixture skips straight past — without it, `captureUnplayed` fired a second time on the inert tap and broke the identity check for a reason unrelated to Apply Damage.

- [x] **Step 2: Write `roundReducer.delayedApply.test.ts` covering the five behaviours this ticket decides**

1. **AC2** — after pressing, the Quarry's health is unchanged; after driving `APPLY_DAMAGE_DELAY_TRICKS + 1` trick resolutions with the player taking no damage, the Quarry's health has fallen by exactly the frozen `cashOut`.
2. **AC3** — press, then resolve a trick that costs the player health; `pendingApplyPayout` is `null` and the Quarry's health never falls. This is the criterion's named test.
3. **AC4** — press, then play a card during the delay window so the hand shrinks, then let the payout land and kill the Quarry; `unplayedAtResolve` equals the **press-time** hand size, not the smaller live one. This is the criterion's named test.
4. **Ordering** — a payout due on the same trick resolution as a Timebomb detonating against the player: the payout is destroyed, the Quarry takes nothing from it, and the Timebomb's own damage lands normally. Assert both halves, not just the wipe.
5. **Hand end** — a payout still owed when the hand's final trick resolves lands on that resolution rather than being lost.

Case 5's construction also lands this trick's OWN ordinary end-of-hand cash-out (`bank.ts`'s existing AC5 rule — the sixth trick always cashes its own 1×1 streak in full) in the same resolution as the payout, so the assertion accounts for both figures landing together rather than assuming the Quarry's drop is the payout's `cashOut` alone.

- [x] **Step 3: Run both specs green**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts src/app/warCouncil/__tests__/roundReducer.delayedApply.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; `typecheck` exits 0.

Result: `Test Files 2 passed (2)`, `Tests 18 passed (18)`. `typecheck` exited 0.

- [x] **Step 4: Confirm no spec file crossed the line budget**

Run: `Get-ChildItem src\app\warCouncil\__tests__ -Include *.test.ts -Recurse | ForEach-Object { [pscustomobject]@{ n = $_.Name; c = (Get-Content $_.FullName).Count } } | Where-Object { $_.c -gt 400 }`
Expected: no output. A file over 400 lines — including one pushed over by a Prettier reflow, which is how `run.test.ts` breached last ticket — is split in this task, not reported.

Result: no output — every spec file in the tree is under 400 lines.

---

## Phase 5 — Documentation

The ticket changes a playable rule and adds a mechanic to the `hunt` module, so both the per-module record and the ruleset must move with it. No production code changes here.

### Task 10: Refresh the implementation docs and the ruleset ✓

- Skill: `implementation-doc-writer`

**Files:**
- Modify: `.docs/implementation/hunt/` (the Apply Damage / delayed-payout record and the module README index), `.docs/implementation/hunt/quick-kill-payout.md`, `.docs/game_rules/the-hunt.md`

- [x] **Step 1: Invoke `implementation-doc-writer` and let it own both outputs**

It must record: the queued payout's three pieces of state and their lifetimes; the four-step order inside `applyResolution` and why step 4 is last; AC3's wipe living at `applyDamage`'s single clamp point; the one-at-a-time rule; the hand-end flush; the five-clause refusal order; and, in `quick-kill-payout.md`, that the unplayed count now has two sources — `captureUnplayed`'s live hand for an ordinary kill, and the payout's frozen `unplayedAtPress` for a delayed one.

In `the-hunt.md`, the Apply Damage rule moves from instant to delayed and is marked `[provisional]`: both tunables are unplayed and three of the readings behind it (the hand-end flush, one-at-a-time, and Timebomb-wins) were taken by an agent under the sprint run's tuning override, not chosen by the developer. Do not add a per-ticket section; it is a ruleset, not a changelog.

Vocabulary: the payout is never described with the Timebomb fuse lexicon. No *detonates*, *primed*, or *ticking* for anything Apply Damage does.

- [x] **Step 2: Confirm no poison vocabulary entered the docs**

Run: `Get-ChildItem .docs\implementation\hunt,.docs\game_rules -Recurse -Include *.md | Select-String -Pattern "\bpoison|\benvenom" -CaseSensitive:$false`
Expected: hits only where they name `CardRank.Poison`, the card rank, which is unrelated to this mechanic. Any other hit is a defect introduced by this task.

---

## Phase 6 — Final verification

No production changes — only sanity checks that the cumulative work is clean.

### Task 11: Confirm the pure-core boundary still holds

- Skill: `none — a verification grep, no code written`

**Files:**
- (verification only — no files touched)

- [ ] **Step 1: Grep the two pure trees for React and DOM references**

Run: `Get-ChildItem src\hunt,src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|sessionStorage"`
Expected: zero hits.

### Task 12: Confirm no tunable was hard-coded and no stale behaviour remains

- Skill: `none — verification greps, no code written`

**Files:**
- (verification only — no files touched)

- [ ] **Step 1: Confirm both new values are read by name, never inlined**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "APPLY_DAMAGE_AP_COST|APPLY_DAMAGE_DELAY_TRICKS"`
Expected: hits only in `src/hunt/apConfig.ts` (both declarations), `src/hunt/config.ts` (the re-export), `src/hunt/index.ts` (the barrel), `src/hunt/applyDamagePayout.ts` (`APPLY_DAMAGE_DELAY_TRICKS`, in `applyDamageDelayTricks` only), `src/warCouncil/voluntaryCashOut.ts` (`APPLY_DAMAGE_AP_COST`, in the refusal only), `src/app/warCouncil/roundReducer.ts` (`APPLY_DAMAGE_AP_COST`, in the spend only), and the specs. No bare `1` standing in for the delay and no bare `3` standing in for the cost anywhere in logic.

- [ ] **Step 2: Confirm the press no longer deals damage directly**

Run: `Select-String -Path src\app\warCouncil\roundReducer.ts -Pattern "incomingFromCashOut|applyDamage\("`
Expected: zero hits. The reducer queues; only `commitHandlers.ts` settles.

- [ ] **Step 3: Confirm every file this contract created or grew is inside the line budget**

Run: `Get-ChildItem src\hunt\applyDamagePayout.ts,src\hunt\encounter.ts,src\hunt\config.ts,src\hunt\apConfig.ts,src\warCouncil\voluntaryCashOut.ts,src\app\warCouncil\roundUiState.ts,src\app\warCouncil\roundReducer.ts,src\app\warCouncil\commitHandlers.ts,src\app\warCouncil\labels.ts | ForEach-Object { [pscustomobject]@{ n = $_.Name; c = (Get-Content $_.FullName).Count } }`
Expected: every `c` below 400.

### Task 13: Static gates, full suite, and the production build

- Skill: `none — verification commands, no code written`

**Files:**
- (verification only — no files touched)

- [ ] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. The baseline entering this contract is 1192 passed of 1192 across 92 files; the count must rise by the tests this contract adds and nothing may have been removed or weakened. A single cold `[vitest-pool-runner]: Timeout waiting for worker to respond` is infrastructure, not a failure — warm the cache with `npx vitest run --project node; npx vitest run --project dom` and re-run.

- [ ] **Step 2: Formatting of the files this contract touched**

Run: `npx prettier --check src/hunt/applyDamagePayout.ts src/hunt/apConfig.ts src/hunt/config.ts src/hunt/types.ts src/hunt/encounter.ts src/hunt/index.ts src/warCouncil/voluntaryCashOut.ts src/app/warCouncil/roundUiState.ts src/app/warCouncil/roundReducer.ts src/app/warCouncil/commitHandlers.ts src/app/warCouncil/labels.ts`
Expected: exits 0. The repo-wide `npm run format:check` fails on ~58 pre-existing `.md` files and is deliberately not gated on here.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 14: Write the PR description

- Skill: `none — a document for the developer, not code`

**Files:**
- Create: `.claude/contract/DLR-109-delayed-apply-damage-payout/pr-description.md`

- [ ] **Step 1: Write `pr-description.md` in this plan folder**

Include: a link to `plan.md` in this folder; a summary of the change; **every** decision the developer must make and every behaviour they must judge by playing, copied from the File map's "Developer decides or observes"; the verification numbers from Task 13; and a one-line note that `applyDamageDelayTricks` is the hook a future delay-modifying buff reads, so no such buff should ever inline the delay.

---

## Self-review

**Spec coverage:**
- AC1 (Apply Damage costs `APPLY_DAMAGE_AP_COST`) — Tasks 1, 4, 5, 7.
- AC2 (the press queues rather than resolves; current trick plus the next) — Tasks 1, 2, 3, 7, 8, 9.
- AC3 (damage during the window wipes the payout, with a unit test) — Tasks 3 (Step 5) and 9 (Step 2, case 2).
- AC4 (quick-kill count snapshotted at press time, with a unit test) — Tasks 2, 7, 8, and 9 (Step 2, case 3).
- AC5 (a delay hook that can shorten or remove, no hardcoded `1`) — Tasks 1, 2 and 12.
- Ticket risk — extend `applyDamageRefusalFor`, do not add a parallel path — Task 4, and Task 12 Step 2 proves the reducer no longer applies damage itself.
- plan.md In-scope: the two tunables → Task 1; the pure module → Task 2; the `EncounterState` field and the wipe → Task 3; the refusal codes and copy → Tasks 4 and 6; `apPool` → Task 5; the reducer and the settle order → Tasks 7 and 8; the ordering test → Task 9; the docs → Task 10.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step is either an exact code block, a precise statement of a diff, or a runnable command with an `Expected:` line.

**Type / name consistency:** `PendingApplyPayout`, `ApplyDamageDelayModifiers`, `ApplyPayoutTick`, `FoldedResolution`, `applyDamageDelayTricks`, `queueApplyPayout`, `tickApplyPayout`, `hasPendingApplyPayout`, `queueApplyDamagePayout`, `settleApplyPayout`, `pendingApplyPayout`, `unplayedAtPress`, `resolutionsOwed`, `payoutPending`, `apPool`, `APPLY_DAMAGE_AP_COST`, `APPLY_DAMAGE_DELAY_TRICKS`, `ApplyDamageRefusal.PayoutPending` / `.InsufficientAp` — each is spelled identically in `plan.md` Part 2 → Data shapes and in every task that names it. Checked by reading, one identifier at a time.

**Phase boundary cleanliness:**
- Phase 1 ends with a new self-contained module and its spec; nothing imports it, so the tree type-checks.
- Phase 2 ends with `src/hunt/` complete and consistent; the new `EncounterState` field is optional to no one because `startEncounter` writes it and every other construction site spreads an existing state.
- Phase 3 is the mandatory single-shape phase: the widened interface, the predicate, the one builder, the test factory and the copy all move together, because a required-field addition makes any half-done state a compile error. It ends type-checking.
- Phase 4 ends with the behaviour switched over and every affected spec rewritten to match, type-checking and green.
- Phase 5 touches only `.docs/`, so it cannot break the build.
- Phase 6 makes no production change at all.
