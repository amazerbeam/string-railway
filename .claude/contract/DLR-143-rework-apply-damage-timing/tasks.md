# Tasks: Rework Apply Damage — leader-only press, Timebomb stacking, 1-trick settle, ⅓ loss retention

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-25

**Goal:** Make Apply Damage pressable only before a trick starts, let it stack with a pending Timebomb instead of being blocked by one, settle a queued payout at the very next trick's resolution instead of two tricks later, and retain ⅓ (not 60%) of a queued payout when a trick costs the player red health while it is in the air.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:** (none — no new files)

**Modified:**
- `src/warCouncil/voluntaryCashOut.ts` — remove `TimebombPending`/`timebombPending`, add `TrickInProgress`/`trickInFlight`, reorder the refusal clauses, update every docblock citing D6
- `src/warCouncil/__tests__/voluntaryCashOut.test.ts` — replace every `timebombPending` stock field and `TimebombPending` assertion with `trickInFlight`/`TrickInProgress`; add a leader-only coverage test
- `src/app/warCouncil/roundUiState.ts:295-304` — swap `applyDamageStock`'s `timebombPending` line for `trickInFlight`; drop the now-unused `hasPendingTimebomb` import
- `src/app/warCouncil/labels.ts:233-243` — swap the `TimebombPending` entry in `APPLY_DAMAGE_REFUSAL_MESSAGE` for `TrickInProgress`
- `src/app/warCouncil/__tests__/labels.test.ts:316-320` — update the refusal-message test from `TimebombPending` to `TrickInProgress`
- `src/hunt/apConfig.ts:56-79` — `APPLY_DAMAGE_DELAY_TRICKS` 1 → 0; `APPLY_DAMAGE_HIT_RETENTION` 0.6 → 1/3; rewrite both tunables' comments
- `src/hunt/applyDamagePayout.ts` — update the `PayoutOutcome.Reduced` docblock's "60%" wording (comment only, no code change)
- `src/app/warCouncil/roundReducer.ts:140-166` — rewrite `handleTapApplyDamage`'s docblock to drop the D6/Timebomb-blocks-poise framing and describe the leader-only + stacking behaviour instead
- `src/hunt/__tests__/applyDamagePayout.test.ts:51-56` — rewrite the "counts down one resolution at a time and is not due before zero" test, which assumed a delay ≥ 1
- `src/hunt/__tests__/encounter.test.ts:227-236` — update the hardcoded `resolutionsOwed: 2` to `1`
- `src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts` — rewrite the two behavioural D6 tests (lines 72, 81) that assert a pending Timebomb blocks the poise; add a leader-only refusal test and a stacked-fold test through the real two-tap flow
- `src/app/warCouncil/__tests__/roundReducer.delayedApply.test.ts` — restructure every multi-trick "ticks down, then lands" sequence to a single-trick settle; replace every hardcoded `5`/`remaining: 5` with `3`
- `src/app/warCouncil/__tests__/payoutLabels.test.ts:29` — update the hardcoded `'Damage to you cuts it to 60%.'` string to `33%`

**Deleted:** (none)

**Developer decides or observes:** (none — see below)
- The five-clause refusal order this plan chose (`NotYourMove` → `TrickInProgress` → `PayoutPending` → `InsufficientAp` → `EmptyBank`) is a judgement call, not an unresolved value — flagged in `plan.md` → Risks and judgement calls for the developer to sanity-check by feel, not something the executor leaves open.
- Whether one-trick settle and the leader-only gate feel right in actual play — a running-app judgement call, not a value to configure. See `plan.md` → Risks and judgement calls, last bullet.

---

## Phase 1 — The refusal rule: leader-only gate, Timebomb stacking, reason vocabulary

This phase rewrites `voluntaryCashOut.ts`'s refusal rule and every direct consumer of its reason vocabulary (`roundUiState.ts`, `labels.ts`) together, because `ApplyDamageRefusal` is a total `Record` type at the `labels.ts` end — the type checker fails the whole phase if any consumer is left on the old vocabulary. The phase ends with `voluntaryCashOut.test.ts` and `labels.test.ts` passing against the new reason and `npm run typecheck` clean; nothing downstream (the reducer, the tunable values) has changed yet.

### Task 1: Replace `TimebombPending` with `TrickInProgress` in the reason vocabulary and the gate ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/voluntaryCashOut.ts`
- Test: `src/warCouncil/__tests__/voluntaryCashOut.test.ts`

- [x] **Step 1: Write the failing tests for the new gate and the removed one, in `voluntaryCashOut.test.ts`**

Replace the `stock()` helper's `timebombPending: false` field with `trickInFlight: false`, matching the new `ApplyDamageStock` shape:

```ts
const stock = (over: Partial<ApplyDamageStock> = {}): ApplyDamageStock => ({
  bank: 3,
  multiplier: 3,
  trickInFlight: false,
  payoutPending: false,
  apPool: STARTING_AP,
  canAct: true,
  ...over,
})
```

Replace the `describe('applyDamageRefusalFor — AC1 and D6', …)` block's title and its three `TimebombPending`-keyed tests with the leader-only equivalents:

```ts
describe('applyDamageRefusalFor — AC1', () => {
  it('allows the apply when the bank is up, nothing is owed, and it is the player’s move', () => {
    expect(applyDamageRefusalFor(stock())).toBeNull()
  })

  it('AC1 — refuses an empty bank, naming the reason', () => {
    expect(applyDamageRefusalFor(stock({ bank: 0, multiplier: 0 }))).toBe(
      ApplyDamageRefusal.EmptyBank,
    )
  })

  it('AC1 — refuses once any card is on the table, including the Quarry’s lead', () => {
    expect(applyDamageRefusalFor(stock({ trickInFlight: true }))).toBe(
      ApplyDamageRefusal.TrickInProgress,
    )
  })

  it('refuses when the player’s card is not the next thing to be committed', () => {
    expect(applyDamageRefusalFor(stock({ canAct: false }))).toBe(ApplyDamageRefusal.NotYourMove)
  })

  // The order is the reason that will still be true after the next trick banks.
  it('names the move gate first, then the trick-in-progress gate, then the bank', () => {
    expect(applyDamageRefusalFor(stock({ bank: 0, trickInFlight: true, canAct: false }))).toBe(
      ApplyDamageRefusal.NotYourMove,
    )
    expect(applyDamageRefusalFor(stock({ bank: 0, trickInFlight: true }))).toBe(
      ApplyDamageRefusal.TrickInProgress,
    )
  })

  it('refuses a degenerate bank rather than treating it as a streak', () => {
    for (const bad of [Number.NaN, -1, 1.5]) {
      expect(applyDamageRefusalFor(stock({ bank: bad }))).toBe(ApplyDamageRefusal.EmptyBank)
      expect(applyDamageRefusalFor(stock({ multiplier: bad }))).toBe(ApplyDamageRefusal.EmptyBank)
    }
  })

  it('DLR-109 — refuses while a pressed cash-out is still in the air', () => {
    expect(applyDamageRefusalFor(stock({ payoutPending: true }))).toBe(
      ApplyDamageRefusal.PayoutPending,
    )
  })

  it('DLR-109 AC1 — refuses when the AP pool cannot cover the press', () => {
    expect(applyDamageRefusalFor(stock({ apPool: APPLY_DAMAGE_AP_COST - 1 }))).toBe(
      ApplyDamageRefusal.InsufficientAp,
    )
  })

  // DLR-143 — the five-clause order is load-bearing: NotYourMove → TrickInProgress →
  // PayoutPending → InsufficientAp → EmptyBank. Walking it down from every reason true at once
  // confirms each clause yields to the one before it, in order.
  it('DLR-143 — walks all five refusal clauses in order', () => {
    const everyReason = stock({
      canAct: false,
      trickInFlight: true,
      payoutPending: true,
      apPool: 0,
      bank: 0,
      multiplier: 0,
    })
    expect(applyDamageRefusalFor(everyReason)).toBe(ApplyDamageRefusal.NotYourMove)
    expect(applyDamageRefusalFor({ ...everyReason, canAct: true })).toBe(
      ApplyDamageRefusal.TrickInProgress,
    )
    expect(applyDamageRefusalFor({ ...everyReason, canAct: true, trickInFlight: false })).toBe(
      ApplyDamageRefusal.PayoutPending,
    )
    expect(
      applyDamageRefusalFor({
        ...everyReason,
        canAct: true,
        trickInFlight: false,
        payoutPending: false,
      }),
    ).toBe(ApplyDamageRefusal.InsufficientAp)
    expect(
      applyDamageRefusalFor({
        ...everyReason,
        canAct: true,
        trickInFlight: false,
        payoutPending: false,
        apPool: STARTING_AP,
      }),
    ).toBe(ApplyDamageRefusal.EmptyBank)
  })
})
```

Leave the `cashBankNow — AC2 and AC3` describe block untouched — it does not reference `ApplyDamageStock`.

Run: `npx vitest run src/warCouncil/__tests__/voluntaryCashOut.test.ts`
Expected: fails to compile / fails — `TrickInProgress` and `trickInFlight` do not exist yet on the source side.

- [x] **Step 2: Update `ApplyDamageRefusal`, `ApplyDamageStock`, and `applyDamageRefusalFor` in `voluntaryCashOut.ts`**

Replace the `ApplyDamageRefusal` const and its docblock:

```ts
export const ApplyDamageRefusal = {
  /** AC1 — nothing banked, so there is nothing to cash. */
  EmptyBank: 'emptyBank',
  /** DLR-143 AC1 — a trick has already started (the Quarry's lead or the player's own lead is
   *  already on the table). Apply Damage is leader-only: it must be pressed before any card
   *  lands, never mid-trick. Replaces the D6 (version-4-scope §3, 2026-08-19) TimebombPending
   *  rule, which DLR-143 reverses — a pending Timebomb no longer blocks the press. */
  TrickInProgress: 'trickInProgress',
  /** DLR-109 — a pressed cash-out is still in the air. One at a time. */
  PayoutPending: 'payoutPending',
  /** DLR-109 AC1 — the hand's AP pool does not cover `APPLY_DAMAGE_AP_COST`. */
  InsufficientAp: 'insufficientAp',
  /** The felt is not waiting on the player's card — a trick reveal is held, an ability prompt is
   *  open, the Quarry is to move, or the hand is over. */
  NotYourMove: 'notYourMove',
} as const
export type ApplyDamageRefusal = (typeof ApplyDamageRefusal)[keyof typeof ApplyDamageRefusal]
```

Replace the `ApplyDamageStock` interface's `timebombPending` field:

```ts
export interface ApplyDamageStock {
  readonly bank: number
  readonly multiplier: number
  /** DLR-143 AC1 — the current trick already has a card on the table. Replaces `timebombPending`:
   *  a pending Timebomb no longer gates this action, per D6's reversal. */
  readonly trickInFlight: boolean
  /** DLR-109 — a cash-out is already queued and undelivered. */
  readonly payoutPending: boolean
  /** DLR-109 AC1 — the hand's remaining action points. */
  readonly apPool: ActionPoints
  /** The player's own card is the next thing to be committed. */
  readonly canAct: boolean
}
```

Update `applyDamageRefusalFor`'s docblock (drop every D6/Timebomb-pending sentence, keep the ordering rationale for the reason that survives) and its body:

```ts
export function applyDamageRefusalFor(stock: ApplyDamageStock): ApplyDamageRefusal | null {
  if (!stock.canAct) return ApplyDamageRefusal.NotYourMove
  if (stock.trickInFlight) return ApplyDamageRefusal.TrickInProgress
  if (stock.payoutPending) return ApplyDamageRefusal.PayoutPending
  if (!canAffordAp(stock.apPool, APPLY_DAMAGE_AP_COST)) return ApplyDamageRefusal.InsufficientAp
  if (cashValue(stock.bank, stock.multiplier) <= 0) return ApplyDamageRefusal.EmptyBank
  return null
}
```

Run: `npx vitest run src/warCouncil/__tests__/voluntaryCashOut.test.ts; npm run typecheck`
Expected: Vitest reports every test in the file passing; typecheck exits 0.

### Task 2: Wire `trickInFlight` through `roundUiState.ts`'s `applyDamageStock` builder ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/roundUiState.ts:295-304`

- [x] **Step 1: Replace the `timebombPending` line and drop the unused import**

Remove `hasPendingTimebomb` from the import list at the top of the file (it has no other caller in this file, confirmed by `plan.md`'s Config and persisted-shape audit). Replace `applyDamageStock`'s body:

```ts
export function applyDamageStock(state: RoundUiState): ApplyDamageStock {
  return {
    bank: state.round.bank,
    multiplier: state.round.multiplier,
    trickInFlight: state.round.currentTrick.length > 0,
    payoutPending: hasPendingApplyPayout(state.encounter),
    apPool: state.buffActivation.apPool,
    canAct: canAct(state),
  }
}
```

Update the docblock immediately above it: drop the sentence naming `hasPendingTimebomb` as one of the two app-layer reads this function performs, since only `hasPendingApplyPayout` and `canAct` remain.

Run: `npm run typecheck`
Expected: exits 0 — confirms no other reference to `hasPendingTimebomb` was left dangling in this file and no other consumer of `applyDamageStock`'s return shape broke.

### Task 3: Update the felt's refusal copy in `labels.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/labels.ts:233-243`
- Test: `src/app/warCouncil/__tests__/labels.test.ts:316-320`

- [x] **Step 1: Update the failing test first**

In `labels.test.ts`, change the test at line 316 from asserting `TimebombPending` to asserting `TrickInProgress`:

```ts
it('puts the reason in the name of a refused control, not only in the styling', () => {
  expect(applyDamageAccessibleName(0, false, ApplyDamageRefusal.TrickInProgress)).toContain(
    APPLY_DAMAGE_REFUSAL_MESSAGE[ApplyDamageRefusal.TrickInProgress],
  )
})
```

Run: `npx vitest run src/app/warCouncil/__tests__/labels.test.ts`
Expected: fails — `APPLY_DAMAGE_REFUSAL_MESSAGE` has no `TrickInProgress` key yet, so this is a `tsc` collection failure, not a runtime assertion failure.

- [x] **Step 2: Swap the `APPLY_DAMAGE_REFUSAL_MESSAGE` entry**

```ts
export const APPLY_DAMAGE_REFUSAL_MESSAGE: Readonly<Record<ApplyDamageRefusal, string>> = {
  [ApplyDamageRefusal.EmptyBank]: 'No streak to cash — take a trick first.',
  [ApplyDamageRefusal.TrickInProgress]: 'Only before a trick starts — the table is already live.',
  [ApplyDamageRefusal.PayoutPending]:
    'Your last Apply is still in the air — it lands when the next trick resolves.',
  [ApplyDamageRefusal.InsufficientAp]: 'Not enough action points to apply.',
  [ApplyDamageRefusal.NotYourMove]: 'Not your move yet.',
}
```

Run: `npx vitest run src/app/warCouncil/__tests__/labels.test.ts; npm run typecheck`
Expected: all tests in the file pass; typecheck exits 0.

---

## Phase 2 — The two tunables: 1-trick settle, ⅓ retention

Phase 1 already made `voluntaryCashOut.ts`, `roundUiState.ts`, and `labels.ts` internally consistent on the new reason vocabulary. This phase changes the two `apConfig.ts` values and every place that hardcoded the *effect* of the old values (a two-trick settle sequence, `floor(9 * 0.6) = 5`, the "60%" string) rather than the constant's name — everything that already read the constant by name recomputes automatically and needs no edit here. The phase ends with every test in the repo passing against the new tunables (short of the reducer-level D6 rewrite, which is Phase 3).

### Task 4: Change the two tunables in `apConfig.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/apConfig.ts:56-79`

- [x] **Step 1: Edit `APPLY_DAMAGE_DELAY_TRICKS` and `APPLY_DAMAGE_HIT_RETENTION`, and rewrite their comments**

```ts
// AC2/AC5 — how many WHOLE TRICKS BEYOND the trick the press happened in a queued payout must
// survive. `0` is DLR-143 AC3's "settles at the resolution of the very next trick after the
// press": a press queues `APPLY_DAMAGE_DELAY_TRICKS + 1` trick resolutions, so a base of `0`
// means exactly one resolution is owed. Deliberately NOT typed `ActionPoints` — it counts
// tricks, not points. Read only through `applyDamageDelayTricks`, never as a literal.
// DEVELOPER-SET on DLR-143, replacing DLR-109's transcribed default of 1 (two-trick settle).
// UNIT: tricks.
export const APPLY_DAMAGE_DELAY_TRICKS = 0

// DLR-143 — the FRACTION of a queued Apply Damage payout that survives a hit which costs the
// player red health. DEVELOPER-SET on DLR-143, replacing DLR-141's 60%: one third, rounded down
// at the point of use (`reduceApplyPayoutOnHit`). The `winner !== null` branch of `applyDamage`'s
// payout expression is untouched by this constant — a resolved encounter still evaporates the
// payout in full.
// UNIT: dimensionless fraction of the frozen cashOut, 0..1.
export const APPLY_DAMAGE_HIT_RETENTION = 1 / 3
```

Run: `npm run typecheck`
Expected: exits 0.

### Task 5: Rewrite `applyDamagePayout.test.ts`'s delay-dependent test and update its `PayoutOutcome` docblock ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/applyDamagePayout.ts` (docblock only — the `PayoutOutcome.Reduced` comment's "60%" wording)
- Test: `src/hunt/__tests__/applyDamagePayout.test.ts:51-56`

- [x] **Step 1: Update the `PayoutOutcome.Reduced` docblock in `applyDamagePayout.ts`**

Find the comment on `PayoutOutcome.Reduced` ("a hit cost the player red health and cut the queued payout to `APPLY_DAMAGE_HIT_RETENTION` of its value, rounded down") — it already names the constant rather than a percentage, so confirm it needs no wording change; leave it as-is. (No edit if the comment already reads this way — this step is a verification, not a blind edit.)

- [x] **Step 2: Rewrite the "counts down one resolution at a time" test, which assumed a delay ≥ 1**

The test at line 51 built its "not due before zero" case off `queueApplyPayout(9, 4)` — with `APPLY_DAMAGE_DELAY_TRICKS` now `0`, that call's `resolutionsOwed` is `1`, so a single tick makes it due immediately and the test's premise ("not due before zero") can no longer be demonstrated through the *configured* delay. Rewrite it to construct the pending payout directly, decoupling this mechanism-level test from the tunable's value:

```ts
it('AC2 — counts down one resolution at a time and is not due before zero', () => {
  const queued = { cashOut: 9, unplayedAtPress: 4, resolutionsOwed: 2 }
  const first = tickApplyPayout(queued, false)
  expect(first.due).toBeNull()
  expect(first.pending?.resolutionsOwed).toBe(1)
})
```

Run: `npx vitest run src/hunt/__tests__/applyDamagePayout.test.ts; npm run typecheck`
Expected: all tests in the file pass (including the unmodified "AC2 — becomes due on the resolution that takes the count to zero" test, which still passes at `resolutionsOwed: 1` since its `while` loop ticks until `pending` is `null` regardless of the starting count); typecheck exits 0.

### Task 6: Update the hardcoded `resolutionsOwed: 2` in `encounter.test.ts` ✓

- Skill: react-frontend

**Files:**
- Test: `src/hunt/__tests__/encounter.test.ts:227-236`

- [x] **Step 1: Change the literal from `2` to `1`**

```ts
it('a non-zero hit to the player reduces a queued payout to APPLY_DAMAGE_HIT_RETENTION, floored', () => {
  const queued = queueApplyDamagePayout(startEncounter(0, 10), queueApplyPayout(9, 4))
  const after = applyDamage(queued, damage(1, 0))
  expect(after.pendingApplyPayout).toMatchObject({
    cashOut: Math.floor(9 * APPLY_DAMAGE_HIT_RETENTION),
    resolutionsOwed: 1,
    unplayedAtPress: 4,
  })
})
```

Run: `npx vitest run src/hunt/__tests__/encounter.test.ts`
Expected: all tests in the file pass — `Math.floor(9 * APPLY_DAMAGE_HIT_RETENTION)` recomputes to `3` automatically since it already references the constant by name.

### Task 7: Update the hardcoded "60%" string in `payoutLabels.test.ts` ✓

- Skill: react-frontend

**Files:**
- Test: `src/app/warCouncil/__tests__/payoutLabels.test.ts:29`

- [x] **Step 1: Change the expected string**

```ts
it('states the risk in one sentence, derived from the retention percentage', () => {
  expect(PAYOUT_QUEUE_RISK_HINT).toBe('Damage to you cuts it to 33%.')
})
```

Run: `npx vitest run src/app/warCouncil/__tests__/payoutLabels.test.ts`
Expected: passes — `PAYOUT_QUEUE_RISK_HINT` already derives from `APPLY_DAMAGE_HIT_RETENTION` via `Math.round(... * 100)`, and `Math.round((1/3) * 100)` is `33`.

### Task 8: Confirm `ward.encounter.test.ts` and `shield.encounter.test.ts` need no edit ✓

- Skill: react-frontend

**Files:**
- Test: `src/hunt/__tests__/ward.encounter.test.ts` (verification only)
- Test: `src/hunt/__tests__/shield.encounter.test.ts` (verification only)

- [x] **Step 1: Run both files and confirm they pass unedited**

Both files' `DLR-141` retention assertions already read `Math.floor(<value> * APPLY_DAMAGE_HIT_RETENTION)` rather than a hardcoded literal (confirmed in `plan.md`'s Config and persisted-shape audit), so they should recompute correctly with no source change.

Run: `npx vitest run src/hunt/__tests__/ward.encounter.test.ts src/hunt/__tests__/shield.encounter.test.ts`
Expected: all tests in both files pass with zero edits made in this task.

---

## Phase 3 — The reducer-level integration tests: the two-tap flow, stacking, and the 2-trick-to-1-trick settle sequence

Phases 1 and 2 made the pure rule and the tunables correct in isolation. This phase brings the reducer-level integration suites in line — these are the tests that exercise the full two-tap press flow and multi-trick sequences through `roundReducer`, and they are where the behavioural D6 gap the developer flagged at the plan gate lives. The phase ends with the full reducer-level Apply Damage suite passing against leader-only gating, Timebomb stacking, and one-trick settle.

### Task 9: Rewrite the two behavioural D6 tests in `roundReducer.applyDamage.test.ts`, and add leader-only + stacking coverage ✓

- Skill: react-frontend

**Files:**
- Modify/Test: `src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts`

- [x] **Step 1: Replace the `'D6 — a pending Timebomb hit cannot be poised past'` test (line 72) with its mirror**

The old test asserted `ui.applyPoised` was `false` after pressing with a Timebomb queued — backwards under AC2. Replace it with a test proving the poise now succeeds:

```ts
it('DLR-143 — a pending Timebomb hit no longer blocks the poise (reverses D6)', () => {
  const owed = queueTimebomb(startEncounter(0), DuelSide.Player, TIMEBOMB_DAMAGE[BuffTier.Bronze])
  const ui = roundReducer(uiFrom(streakRound(), owed), tapApply)
  expect(ui.applyPoised).toBe(true)
  expect(ui.round.bank).toBe(3)
})
```

- [x] **Step 2: Replace the `'D6 — Timebomb booked AFTER the poise still stops the commit, and drops the poise'` test (line 81) with its mirror**

The old test asserted a Timebomb booked between the two taps dropped the poise and left the bank untouched — backwards under AC2. Replace it with a test proving the second tap now commits and queues the payout as normal:

```ts
it('DLR-143 — a Timebomb booked AFTER the poise does not stop the commit', () => {
  let ui = roundReducer(uiFrom(streakRound()), tapApply)
  expect(ui.applyPoised).toBe(true)
  ui = {
    ...ui,
    encounter: queueTimebomb(ui.encounter, DuelSide.Player, TIMEBOMB_DAMAGE[BuffTier.Bronze]),
  }
  ui = roundReducer(ui, tapApply)
  expect(ui.applyPoised).toBe(false)
  expect(ui.round.bank).toBe(0)
  expect(ui.encounter.pendingApplyPayout).toMatchObject({ cashOut: 9 })
})
```

Rename the enclosing `describe('Apply Damage — the poise, and the refusals (AC1, D6)', …)` to `describe('Apply Damage — the poise, and the refusals (AC1)', …)`.

- [x] **Step 3: Add a leader-only refusal test to the same `describe` block**

```ts
it('DLR-143 AC1 — a trick already in flight cannot even be poised', () => {
  const ui = roundReducer(
    uiFrom(streakRound({ currentTrick: [{ side: PlayerSide.Cpu, card: { suit: Suit.Bells, rank: 9 } }] })),
    tapApply,
  )
  expect(ui.applyPoised).toBe(false)
  expect(ui.round.bank).toBe(3)
})
```

Adjust `streakRound`'s signature to accept an optional `Partial<WarCouncilState>` override (it currently takes none) so this test can set `currentTrick` without duplicating the rest of the fixture:

```ts
function streakRound(over: Partial<WarCouncilState> = {}): WarCouncilState {
  return makeRound({
    leader: PlayerSide.Player,
    trumpSuit: Suit.Keys,
    bank: 3,
    multiplier: 3,
    currentTrick: [],
    ...over,
  })
}
```

- [x] **Step 4: Add a stacked-fold test through the real two-tap flow, in a new `describe` block**

This is the scenario `plan.md`'s Config and persisted-shape audit found nothing exercising today — pressing Apply Damage while a Timebomb is already pending, then resolving the trick that detonates both:

```ts
describe('DLR-143 AC2 — a pressed Apply Damage stacks with a pending Timebomb through the real press flow', () => {
  it('both the Timebomb and the queued payout settle in the same trick fold', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      bank: 3,
      multiplier: 3,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 11)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    const owed = queueTimebomb(startEncounter(0), DuelSide.Player, TIMEBOMB_DAMAGE[BuffTier.Bronze])
    let ui = uiFrom(round, owed)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tapApply)
    ui = roundReducer(ui, tapApply)
    expect(ui.encounter.pendingApplyPayout).toMatchObject({ cashOut: 9 })

    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: card(Suit.Bells, 11) })
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: card(Suit.Bells, 11) })

    // The Timebomb detonates against the player this same resolution, reducing the payout to
    // floor(9 * 1/3) = 3 rather than destroying it, and — since APPLY_DAMAGE_DELAY_TRICKS is now
    // 0 — that reduced figure settles on this very resolution too.
    expect(ui.encounter.pendingApplyPayout).toBeNull()
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth - 3)
    expect(ui.encounter.health[DuelSide.Player]).toBe(PLAYER_START_HEALTH - TIMEBOMB_PLAYER_DAMAGE)
  })
})
```

Add `TIMEBOMB_PLAYER_DAMAGE` and `card` to this file's existing imports if not already present (`card` is already imported from `./roundFixture`; `TIMEBOMB_PLAYER_DAMAGE` is exported from `../../../hunt`, confirmed already imported by `roundReducer.delayedApply.test.ts` in the same directory).

- [x] **Step 5: Update the `'AC3 / DLR-141'` test's title and comment for the new retention fraction**

The test at (old) line 141, `'AC3 / DLR-141 — the player then plays their card by the ordinary rules, against a zeroed bank, and taking the hit reduces the queued payout to 60% floored rather than wiping it'`, already computes its expectation via `Math.floor(9 * APPLY_DAMAGE_HIT_RETENTION)` (no literal to change), so only its title and inline comment need the wording updated from "60%" to "⅓":

```ts
it('AC3 / DLR-141 — the player then plays their card by the ordinary rules, against a zeroed bank, and taking the hit reduces the queued payout to APPLY_DAMAGE_HIT_RETENTION floored rather than wiping it', () => {
```

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.applyDamage.test.ts; npm run typecheck`
Expected: every test in the file passes; typecheck exits 0.

### Task 10: Restructure `roundReducer.delayedApply.test.ts` for a one-trick settle, and update every hardcoded retention literal ✓

- Skill: react-frontend

**Files:**
- Modify/Test: `src/app/warCouncil/__tests__/roundReducer.delayedApply.test.ts`

> **Deviation from the literal task text (Steps 2–3):** the "DLR-141 — a hit taken during the window …" test, and the two `DLR-119`-block tests that pressed Apply Damage fresh then played a single trick, turned out to be structurally broken by the one-trick settle, not just the `5`→`3` literal: with `APPLY_DAMAGE_DELAY_TRICKS = 0`, a fresh press's lone owed resolution comes due on the very next trick, so a trick that both damages the player AND is the payout's first resolution now PAYS at the reduced figure instead of staying `reduced`-and-queued (confirmed by running the file — see `applyResolution`'s four-step fold in `commitHandlers.ts`, step 4 always runs last). Rewrote those three tests to construct `pendingApplyPayout` directly with `resolutionsOwed: 2` (one MORE than due), the same pattern the "Ordering" test already used, so the "reduced but still in the air" case remains demonstrable at all. The `'a trick that settles a due payout reports it paid'` DLR-119 test collapsed its two-trick press-then-carry-on sequence into a single trick for the same reason. Flagged here because Task 10's Step 2/3 text asserted these three needed only the literal swap or no edit at all — that assertion was itself an artifact of the same kind of gap Task 9 called out (an audit that named the identifier/literal but missed a cascading behavioural change).

- [x] **Step 1: Rewrite the `'AC2 — the queued payout survives the current trick plus the next, then lands'` describe block for a single-trick settle**

The old test pressed Apply Damage, played a clean-win trick that only ticked the counter down (asserting `resolutionsOwed: APPLY_DAMAGE_DELAY_TRICKS` mid-sequence), then played a second trick to land it. With `APPLY_DAMAGE_DELAY_TRICKS` now `0`, the very first trick after the press lands the payout — there is no intermediate "ticked down but not yet due" state left to test in this scenario. Replace the whole block:

```ts
describe('AC2/AC3 — the queued payout survives the trick it was pressed in, then lands on the very next one', () => {
  it('lands on the first trick resolution after the press', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      bank: 3,
      multiplier: 3,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 11)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2)],
      },
      currentTrick: [],
    })
    let ui = uiFrom(round)
    const startQuarryHealth = ui.encounter.health[DuelSide.Quarry]

    ui = roundReducer(ui, tapApply)
    ui = roundReducer(ui, tapApply)
    expect(ui.encounter.pendingApplyPayout).toMatchObject({
      cashOut: 9,
      resolutionsOwed: APPLY_DAMAGE_DELAY_TRICKS + 1,
    })

    // The one trick after the press — a clean win: the payout comes due at THIS resolution.
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    expect(ui.resolvedTrick?.resolution.outcome).toBe(TrickOutcome.CleanWin)
    expect(ui.encounter.pendingApplyPayout).toBeNull()
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth - 9)
  })
})
```

Remove the now-unused `carryOn` action from this test if no other test in the file's first describe block still needs it (check remaining uses before deleting the `const carryOn = …` declaration at the top of the file — several later tests in this same file still use it, so the declaration itself stays; only this rewritten test's own two-trick `carryOn` step is dropped).

- [x] **Step 2: Update every hardcoded `5` / `remaining: 5` literal to `3` (floor(9 * 1/3))**

In the `'DLR-141 — a hit taken during the window …'` describe block: change `expect(ui.encounter.pendingApplyPayout).toMatchObject({ cashOut: 5 })` to `cashOut: 3`, update the inline comment from "Reduced to floor(9 * 0.6) = 5" to "Reduced to floor(9 * 1/3) = 3", and change `expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'reduced', cashOut: 9, remaining: 5 })` to `remaining: 3`.

In the `'Ordering — a payout due the same trick a Timebomb detonates against the player'` describe block: change both `expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth - 5)` to `- 3`, update the comment from "Reduced to floor(9 * 0.6) = 5" to "Reduced to floor(9 * 1/3) = 3", and change `expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'paid', cashOut: 5, remaining: null })` to `cashOut: 3`.

In the `'DLR-119 — the resolved trick reports what happened to the queued payout'` describe block's two `DLR-141` tests: change `expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'reduced', cashOut: 9, remaining: 5 })` to `remaining: 3`, and change the final test's `expect(ui.encounter.health[DuelSide.Quarry]).toBe(startQuarryHealth - 5)` / `expect(ui.resolvedTrick?.payout).toEqual({ outcome: 'paid', cashOut: 5, remaining: null })` to `- 3` / `cashOut: 3` respectively.

- [x] **Step 3: Confirm the `AC4`, `Hand end`, and remaining `DLR-119` tests need no further edit**

The `AC4 — a delayed kill freezes the PRESS-TIME hand size` test already threads two tricks deliberately to shrink the live hand while the payout stays "just held" — re-read it against the new one-trick settle: with `APPLY_DAMAGE_DELAY_TRICKS` at `0`, the payout now lands on the FIRST of its two tricks, not the second, so this test's premise (the payout still queued after trick 1) no longer holds. Rewrite it to a single trick:

```ts
describe('AC4 — a delayed kill freezes the PRESS-TIME hand size', () => {
  it('a card played during the window shrinks the live hand, but the kill still reports the press-time count', () => {
    const round = makeRound({
      leader: PlayerSide.Player,
      trumpSuit: Suit.Bells,
      bank: 5,
      multiplier: 1,
      hands: {
        [PlayerSide.Player]: [card(Suit.Bells, 11), card(Suit.Keys, 11)],
        [PlayerSide.Cpu]: [card(Suit.Bells, 2), card(Suit.Keys, 6)],
      },
      currentTrick: [],
    })
    const encounter: EncounterState = {
      ...startEncounter(0),
      health: { ...startEncounter(0).health, [DuelSide.Quarry]: 5 },
    }
    let ui = uiFrom(round, encounter)
    const handSizeAtPress = ui.round.hands[PlayerSide.Player].length

    ui = roundReducer(ui, tapApply)
    ui = roundReducer(ui, tapApply)
    expect(ui.encounter.pendingApplyPayout).toMatchObject({
      cashOut: 5,
      unplayedAtPress: handSizeAtPress,
    })

    // The one trick after the press — a clean win; the hand shrinks to 1 card, and the payout
    // lands and kills on this same resolution.
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))
    ui = roundReducer(ui, tap(card(Suit.Bells, 11)))

    expect(isEncounterResolved(ui.encounter)).toBe(true)
    expect(ui.encounter.health[DuelSide.Quarry]).toBe(0)
    expect(ui.round.hands[PlayerSide.Player].length).toBe(1)
    expect(ui.unplayedAtResolve).toBe(handSizeAtPress)
  })
})
```

The `Hand end — a payout still owed when the final trick resolves` test constructs its `pendingApplyPayout` directly with `resolutionsOwed: 10` (deliberately far from naturally due) rather than through `queueApplyPayout`, so it is unaffected by the delay constant and needs no edit. The `'a trick that settles a due payout reports it paid, for the frozen cashOut'` and `'a trick with nothing queued reports payout: null'` tests in the final `DLR-119` describe block are unaffected by either tunable and need no edit; only the two `DLR-141`-titled tests in that block (handled in Step 2 above) do.

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.delayedApply.test.ts; npm run typecheck`
Expected: every test in the file passes; typecheck exits 0.

### Task 11: Update the D6-citing docblock in `roundReducer.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/roundReducer.ts:140-166`

- [x] **Step 1: Rewrite `handleTapApplyDamage`'s docblock**

Replace the paragraph reading "Asks `applyDamageRefusalFor` on BOTH taps, not just the first. The felt can change under a poised plate — a Timebomb booking lands, a reveal is held, the turn passes — and re-reading is what stops a poise made while the control was live from committing after it stopped being. D6 (version-4-scope §3) asks for exactly this: the control must read the pending-Timebomb predicate 'before it commits to anything'." with:

```
 * Asks `applyDamageRefusalFor` on BOTH taps, not just the first. The felt can change under a
 * poised plate — the Quarry leads (starting the trick and closing the leader-only window), a
 * reveal is held, the turn passes — and re-reading is what stops a poise made while the control
 * was live from committing after it stopped being. DLR-143 AC1 reverses D6 (version-4-scope §3,
 * 2026-08-19): a pending Timebomb no longer blocks this control at all, and the two are allowed
 * to stack, settling together in `commitHandlers.ts`'s existing trick-resolution fold.
```

Leave every other paragraph in the docblock untouched — the AC3/AC2/AP-spend/`captureUnplayed` framing in the rest of the comment does not reference D6 or the delay and stays accurate.

Run: `npm run typecheck`
Expected: exits 0 (this is a comment-only change; no behavioural verification needed beyond compiling cleanly).

---

## Phase 4 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean.

### Task 12: Confirm no stale `TimebombPending`/`timebombPending` identifier remains, and no stale D6-as-active-rule wording remains ✓ — verified by QA in the final review round

- [x] **Step 1: Grep source and tests for the removed reason code**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "TimebombPending|timebombPending"`
Expected: zero hits. — Actual: 2 hits, both docblock prose in `voluntaryCashOut.ts` explaining the rename/reversal, no live identifier.

- [x] **Step 2: Grep for the old "60%" and "two tricks" wording left as active-rule prose**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "60%|floor\(9 \* 0\.6\)"`
Expected: zero hits. — Actual: initially found 2 live hits in `actionBarLabels.test.ts` (a file outside this contract's original task list) — fixed in the review fix pass; re-verified zero live hits after.

### Task 13: Static gates and full suite ✓ — run by QA and re-confirmed after the fix pass

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. — Actual: PASS after the fix pass — 140 test files, 1841 tests, 0 failed.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. — Actual: PASS.

### Task 14: Update the PR description ✓

- [x] **Step 1: Write / update `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary: Apply Damage is now leader-only (refuses once any card is on the table), stacks with a pending Timebomb instead of being blocked by one (explicitly reversing D6, version-4-scope §3, decided 2026-08-19), settles a queued payout at the very next trick's resolution (`APPLY_DAMAGE_DELAY_TRICKS` 1 → 0) instead of two tricks later, and retains ⅓ of a queued payout (not 60%) when a trick costs the player red health while it is in the air (`APPLY_DAMAGE_HIT_RETENTION` 0.6 → 1/3).
- The five-clause refusal order chosen (`NotYourMove` → `TrickInProgress` → `PayoutPending` → `InsufficientAp` → `EmptyBank`) for the developer to sanity-check by feel.
- The refusal-message copy (`'Only before a trick starts — the table is already live.'`) is placeholder, as the rest of this module's copy already is.
- Note that `.docs/game_rules/the-hunt.md` and any implementation doc covering Apply Damage still need updating by `implementation-doc-writer`, per the brief's own Dependencies & Risks — not done by this contract.
- Verification results from Phase 4 (typecheck/lint/test/build).
- A one-line note that the plan gate caught a real audit gap during review: an identifier-only grep for `TimebombPending` missed two behavioural tests in `roundReducer.applyDamage.test.ts` that exercised the same rule through the real reducer without naming the string — worth remembering for future reason-code removals.

---

## Self-review

**Spec coverage:**
- AC1 (leader-only gate) — Tasks 1, 2, 9 (Step 3).
- AC2 (Timebomb no longer blocks; stacks in the same fold) — Tasks 1, 9 (Steps 1, 2, 4), 11.
- AC3 (delay 1 → 0, one-trick settle) — Tasks 4, 5, 6, 10 (Steps 1, 3), 14.
- AC4 (retention 0.6 → 1/3) — Tasks 4, 5, 6, 7, 8, 9 (Step 5), 10 (Step 2), 14.
- AC5 (mechanism unchanged, only the fraction moves) — Task 4 (comment states this explicitly); no mechanism code touched anywhere in this contract, confirmed by `plan.md`'s Approach section.
- Every existing test asserting the old 2-trick delay, 0.6 retention, or Timebomb-blocks-press behaviour — Tasks 1, 5, 6, 7, 9, 10 collectively; the developer-flagged gap (behavioural D6 tests with no `timebombPending` string) is Task 9, Steps 1–2.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or command.

**Type / name consistency:** `ApplyDamageRefusal.TrickInProgress` / `'trickInProgress'` and `ApplyDamageStock.trickInFlight` are used identically across Tasks 1, 2, 3, 9 — no task introduces a variant spelling. `APPLY_DAMAGE_DELAY_TRICKS` and `APPLY_DAMAGE_HIT_RETENTION` keep their existing names throughout (value-only change, confirmed by `plan.md`'s audit) — no task renames either.

**Phase boundary cleanliness:** Phase 1 ends with `voluntaryCashOut.ts`, `roundUiState.ts`, and `labels.ts` mutually consistent on the new reason vocabulary and `npm run typecheck` clean — no other file yet references the old `TimebombPending`/`timebombPending` names in a way that would fail to compile, since `ApplyDamageRefusal`'s only other consumers (the reducer-level test files) are untouched until Phase 3 and reference the type only through values already updated in Phase 1's exports. Phase 2 ends with both tunables changed and every test that reads them by value updated to match, typechecking clean, independent of Phase 3's reducer-level rewrites. Phase 3 ends with the full reducer-level Apply Damage suite passing against the new gate, stacking, and one-trick settle. Phase 4 makes no production change and only verifies the cumulative result.
