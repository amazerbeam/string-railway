# Tasks: Timebomb targeting — prime a card in hand, mark it, and give it a fuse

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-31

**Goal:** Give Timebomb everything the player can see, undo and be held to — a visible priming mode, the approved bomb on the card's wrapper with a two-trick countdown, a riding row that names its target and takes it back, a refusal that stops a second Timebomb stranding a card, and an in-hand detonation booked through the path a played bomb already uses.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder (approved at the gate, but it predates R2/R3/R4 — it shows no countdown numeral and no fuse line, so cite it for the priming mode, the mark's placement and the riding row only).

**One correction to `plan.md` carried in here deliberately.** Part 2 → Data shapes heads the fuse key `src/hunt/config.ts`. That is superseded: `config.ts` is at **388/400 lines** and a documented key will not fit, while `buffCatalog.ts` (196 lines) already homes `CHEAT_DURATION_TRICKS` (line 50) and `TIMEBOMB_DAMAGE` — the two constants `TIMEBOMB_FUSE_TRICKS` sits beside conceptually. The key goes in `buffCatalog.ts`. Everything else in Data shapes stands.

---

## File map

**Created:**
- `src/hunt/__tests__/timebombFuseConfig.test.ts` — pins `TIMEBOMB_FUSE_TRICKS` as a positive integer
- `src/app/warCouncil/TimebombMark.tsx` — the approved bomb, inline SVG, per-instance gradient ids, carrying the fuse numeral
- `src/app/warCouncil/warCouncilTimebombMark.css` — the mark's placement, fizz, and reduced-motion rule (every value a PLACEHOLDER)
- `src/app/warCouncil/useDebugRoundState.ts` — the dev-only debug mirror, moved verbatim out of `WarCouncilRound.tsx`
- `src/app/warCouncil/__tests__/TimebombMark.test.tsx` — inline shapes, no `<use>`, unique ids across two instances, the numeral
- `src/app/warCouncil/__tests__/timebombFuse.test.ts` — the fuse's seed, decrement, expiry booking and clearing

**Modified:**
- `src/hunt/buffCatalog.ts` — add `TIMEBOMB_FUSE_TRICKS`
- `src/hunt/buffActivation.ts:189-205` — rename `REVOCABLE_CONDITION_KINDS` → `REVOCABLE_BUFF_KINDS`, add `BuffKind.Timebomb`, correct the docblock; add `BuffActivationRefusal.TimebombLive`, the `timebombLive` stock field, the refusal branch, and `buffActivationStockFor`'s fourth parameter
- `src/hunt/index.ts` — re-export `unprimeCard`
- `src/warCouncil/timebomb.ts` — add `unprimeCard`
- `src/warCouncil/index.ts` — re-export `unprimeCard`
- `src/app/warCouncil/buffLabels.ts:164` — a message row for `TimebombLive`
- `src/app/warCouncil/roundUiState.ts:84-93, 340-351` — add `timebombFuseRemaining`, `timebombFuseLive`, and `timebombLive` into `buffActivationStock`
- `src/app/warCouncil/roundUiSeed.ts:59` — seed `timebombFuseRemaining: 0`
- `src/app/warCouncil/roundReducer.ts:234-252` — `primeTapped` seeds the fuse; an already-primed tap becomes a no-op
- `src/app/warCouncil/commitHandlers.ts:232-267` — decrement the fuse beside Cheat's; book at zero
- `src/app/warCouncil/PlayingCard.tsx:114-146` — rehome the mark to the wrapper, add `fuseRemaining`
- `src/app/warCouncil/cardFace.ts:123-146, 224` — delete the on-face primed geometry
- `src/app/warCouncil/warCouncilCards.css:130-139` — delete the four `--wc-face-primed-*` declarations
- `src/app/warCouncil/warCouncilCardFace.css:217-229` — delete the `.wc-card .wc-primed-mark` rule
- `src/app/warCouncil/__tests__/cardFaceCss.test.ts:44-54` — delete the four `wc-face-primed-*` drift rows
- `src/app/warCouncil/__tests__/PlayingCard.test.tsx:31,44,129` — retarget three assertions off `.wc-primed-mark`
- `src/app/warCouncil/CardAbilityTip.tsx` — an optional fuse note in the bubble
- `src/app/warCouncil/labels.ts:32-46, 187` — `CardMarks.fuseRemaining`, `timebombFuseText`, retuned `TIMEBOMB_ARMED_HINT`
- `src/app/warCouncil/roundHint.ts:23-42` — move the Timebomb branch above `quarryToLead`
- `src/app/warCouncil/warCouncilHand.css` — a real `.wc-fan.wc-is-marking` rule
- `src/app/warCouncil/HandFan.tsx` — thread `fuseRemaining` to each card
- `src/app/warCouncil/buffRideModel.ts:150-156` — `TimebombRide`, the `timebomb` row field, `timebombTargetFor`, `ridingTimebombId`
- `src/app/warCouncil/buffRideLabels.ts` — `ridingRowText`, `timebombRemoveLabel`, `timebombRemovedText`
- `src/app/warCouncil/BuffRidingList.tsx` — render the Timebomb row's status and its own remove label
- `src/app/warCouncil/__tests__/BuffRidingList.test.tsx:21,22,30,37,44,52` — six row literals gain `timebomb: null`
- `src/app/warCouncil/__tests__/CardBuffBreakdown.test.tsx:19,20` — two row literals gain `timebomb: null`
- `src/app/warCouncil/buffHandlers.ts:187-195` — a Timebomb branch that reverses the felt
- `src/app/warCouncil/WarCouncilRound.tsx:153-178, 250-252` — use `useDebugRoundState`; route `Escape` to removal
- `src/sim/fixtures.ts:128-133` — tighten `attemptPrimedTimebomb`'s success test so the fuse cannot satisfy it

**Deleted:** (none — deletions are in-file, listed under Modified)

**Developer decides or observes:**
- **Every number and colour in `warCouncilTimebombMark.css`** — `top: -11%`, `right: -9%`, `width: 46%`, the `620ms steps(2, end)` fizz, and the `--wc-timebomb` ring hue. All carried from the DLR-147 mockup unretuned. Size, overhang, hue and duration are yours once it is on screen.
- **The priming mode's tint and inset edge** (`.wc-fan.wc-is-marking`) — a fresh design call with no approved reference; neither DLR-147 sheet shows the hand *while waiting*.
- **The countdown's legibility at real scale.** The bomb is 46% of a card whose width is `clamp(2.9rem, 6.2vmin, 4.3rem)` — at the small end the numeral sits on roughly a 21px disc it shares with the fuse and spark. It may need to move beside the bomb rather than onto it.
- **AC11 — a card that is both skulled and primed**, now with a numeral on it too. Whether three marks are legible together is judgement, not a check.
- **All five new/retuned strings are PLACEHOLDER copy** — the priming prompt, the row's target and not-yet-primed sentences, the remove label, and the fuse clause.
- **Whether the hover tip should also name the damage figure.** R2 removed the reason the ticket forbade it; adding it is a decision nobody has taken. The tasks state the fuse and stop.
- **Whether the Blast Guard should absorb an in-hand pop.** It does, inherited via Assumption 13's booking — not chosen.
- **The extra trick before an in-hand pop lands.** Assumption 13 books through `queueTimebomb`, so the fuse expires at trick N+1's resolution and the hit lands at N+2's. If you want it immediate, say so — it changes Task 10 only, but it means restating the bank reset, the Blast Guard and the forced cash-out.

---

## Phase 1 — Foundations: the fuse key, the pure mirror, and room in `WarCouncilRound`

Four independent, additive changes that unlock every later phase. Nothing here is reachable from a screen yet, so the phase ends type-checking with the app behaving exactly as it does today. Task 4's extraction is deliberately first-phase: `WarCouncilRound.tsx` stands at **399 of its 400-line budget** and Phase 6 grows `handleCancel`, so the room has to exist before anything needs it.

### Task 1: Add `TIMEBOMB_FUSE_TRICKS` to `src/hunt/buffCatalog.ts` ✓

- Skill: react-frontend

**Files:**
- Config: `src/hunt/buffCatalog.ts` — add `TIMEBOMB_FUSE_TRICKS` beside `CHEAT_DURATION_TRICKS` (line 50)
- Test: `src/hunt/__tests__/timebombFuseConfig.test.ts`

- [x] **Step 1: Add the key beside `CHEAT_DURATION_TRICKS`**

Not `config.ts` — it is at 388/400 lines and a documented key will not fit. `buffCatalog.ts` (196 lines) already homes both `CHEAT_DURATION_TRICKS` and `TIMEBOMB_DAMAGE`.

```ts
/**
 * R3, DEVELOPER-STATED 2026-08-31: the player gets the resolution of this many tricks to play a
 * primed card before it detonates in their hand. NOT an invented tunable — the figure is the
 * developer's own, recorded in `plan.md` Part 1 → Developer rulings.
 *
 * UNIT: trick resolutions, counted only while the primed card is still in the player's hand.
 * Keyed and documented like `CHEAT_DURATION_TRICKS` above, and read through
 * `RoundUiState.timebombFuseRemaining` rather than at any call site.
 */
export const TIMEBOMB_FUSE_TRICKS = 2
```

- [x] **Step 2: Write the spec pinning it as a positive integer**

```ts
import { describe, expect, it } from 'vitest'
import { TIMEBOMB_FUSE_TRICKS } from '../buffCatalog'

describe('TIMEBOMB_FUSE_TRICKS — DLR-154 R3', () => {
  it('is a positive integer, so the fuse can seed a count that reaches zero', () => {
    expect(Number.isInteger(TIMEBOMB_FUSE_TRICKS)).toBe(true)
    expect(TIMEBOMB_FUSE_TRICKS).toBeGreaterThan(0)
  })
})
```

- [x] **Step 3: Run the spec**

Run: `npx vitest run src/hunt/__tests__/timebombFuseConfig.test.ts`
Expected: PASS — 1 test passed.

### Task 2: Add `unprimeCard` to `src/warCouncil/timebomb.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/timebomb.ts` — add `unprimeCard` after `primeCard`
- Modify: `src/warCouncil/index.ts` — re-export beside `isPrimed`, `trickIsPrimed`, `primeCard`
- Modify: `src/hunt/index.ts` — re-export so the app layer reaches it on the same path as `primeCard`
- Test: `src/warCouncil/__tests__/timebomb.test.ts` — add a describe block for `unprimeCard`

- [x] **Step 1: Write the failing spec for the mirror**

Append to the existing `timebomb.test.ts`. Follow whatever `roundStateFor`-style helper that file already uses to build a `RoundState`; do not invent a second builder.

```ts
describe('unprimeCard — DLR-154 AC5', () => {
  it('removes the mark and leaves every other primed card in place', () => {
    const primed = primeCard(primeCard(base, PlayerSide.Player, five), PlayerSide.Player, seven)
    const lifted = unprimeCard(primed, five)
    expect(isPrimed(lifted.primedCards, five)).toBe(false)
    expect(isPrimed(lifted.primedCards, seven)).toBe(true)
  })

  it('throws on a card that is not primed, the discipline primeCard sets', () => {
    expect(() => unprimeCard(base, five)).toThrow(RangeError)
  })

  it('does not mutate the state it is given', () => {
    const primed = primeCard(base, PlayerSide.Player, five)
    unprimeCard(primed, five)
    expect(isPrimed(primed.primedCards, five)).toBe(true)
  })
})
```

- [x] **Step 2: Run the spec, confirm it fails**

Run: `npx vitest run src/warCouncil/__tests__/timebomb.test.ts`
Expected: FAIL — `unprimeCard` is not exported.

- [x] **Step 3: Implement `unprimeCard`**

```ts
/**
 * `primeCard`'s mirror. THROWS when the card is not primed, the same discipline `primeCard` above
 * sets and for its reason: a silent no-op would let a caller believe a mark was lifted that was
 * never there. Both callers — `handleRemoveBuff` and the fuse's expiry — guard with `isPrimed`
 * first, because a reducer must not throw during an event handler.
 */
export function unprimeCard(state: RoundState, card: Card): RoundState {
  if (!isPrimed(state.primedCards, card)) {
    throw new RangeError(`The ${card.rank} of ${card.suit} is not primed`)
  }
  return { ...state, primedCards: state.primedCards.filter((held) => !sameCard(held, card)) }
}
```

Import `sameCard` from `./cardUtils` alongside the existing `containsCard` if it is not already in scope.

- [x] **Step 4: Re-export from both barrels**

Add `unprimeCard` to the `timebomb` export block in `src/warCouncil/index.ts` (beside `isPrimed`, `trickIsPrimed`, `primeCard`) and to `src/hunt/index.ts` if `primeCard` is re-exported there; if it is not, leave `src/hunt/index.ts` untouched and remove it from this task's `**Files:**` block.

- [x] **Step 5: Re-run the spec and typecheck**

Run: `npx vitest run src/warCouncil/__tests__/timebomb.test.ts; npm run typecheck`
Expected: Vitest PASS with the three new tests; `tsc -b` exits 0.

### Task 3: Widen revocability to Timebomb in `src/hunt/buffActivation.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/buffActivation.ts:189-205` — rename the set, add `BuffKind.Timebomb`, correct the docblock
- Test: `src/hunt/__tests__/buffActivation.test.ts` — add a case for a revocable Timebomb

- [x] **Step 1: Rename the set and add the kind**

The rename is required, not cosmetic: the set is no longer condition-only, and a name that says `CONDITION` while holding an Activated card is the kind of stale name this codebase's audit rules exist to catch. It is module-private (`const`, not exported), so the rename touches only lines 198 and 205.

```ts
// Renamed from REVOCABLE_CONDITION_KINDS on DLR-154: no longer condition-only.
const REVOCABLE_BUFF_KINDS: ReadonlySet<BuffKind> = new Set([
  BuffKind.Taker,
  BuffKind.Feeder,
  BuffKind.Sidestep,
  // DLR-154 AC5/AC13 — with AP off (`AP_ENABLED = false`, R1) the whole of a Timebomb's
  // revocation is the card returning to the pile, which is exactly what `deactivateFromPile`
  // already does. The felt-state reversal it CANNOT do — clearing the armed damage, the primed
  // damage, the fuse and the mark — is `handleRemoveBuff`'s, so this stays a one-line widening.
  BuffKind.Timebomb,
])
```

- [x] **Step 2: Correct the docblock this invalidates**

The DLR-153 docblock at line 189 states revocability is `FALSE for every Activated card`. That is now false. Rewrite that clause to say Timebomb is the one Activated card that is revocable, and why: its whole cost is the card leaving the pile, so returning the card returns everything spent. Leave Cheat, Ward and Shield named as still non-revocable.

- [x] **Step 3: Add the spec case**

```ts
it('reports a Timebomb as revocable — DLR-154 AC5', () => {
  expect(isRevocableBuff(timebombBuff)).toBe(true)
})
it('still reports a Cheat as non-revocable', () => {
  expect(isRevocableBuff(cheatBuff)).toBe(false)
})
```

Build both buffs with whatever mint helper the file already uses.

- [x] **Step 4: Run the spec and grep the old name**

Run: `npx vitest run src/hunt/__tests__/buffActivation.test.ts; Select-String -Path src\**\*.ts,src\**\*.tsx -Pattern "REVOCABLE_CONDITION_KINDS"`
Expected: Vitest PASS; the grep returns zero hits.

### Task 4: Extract the debug mirror into `useDebugRoundState` ✓

- Skill: react-frontend

**Files:**
- Create: `src/app/warCouncil/useDebugRoundState.ts`
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:3, 153-178` — import the hook, delete the two effects

A verbatim move. Behaviour, dependency array and the deliberate two-effect split are all unchanged — this buys the line budget Phase 6 spends.

- [x] **Step 1: Create the hook, moving both effects unchanged**

```ts
import { useEffect } from 'react'
import { clearDebugRoundState, setDebugRoundState, type DebugRoundState } from '../debugState'

/**
 * The dev-only `window.__DEBUG_STATE__` round mirror for browser automation
 * (`.claude/skills/ai-play-tester`) — see `../debugState.ts`. Moved verbatim out of
 * `WarCouncilRound.tsx` on DLR-154, which stood at 399 of its 400-line budget.
 *
 * Two effects, not one, exactly as before: the write runs on every render that changes this
 * slice; the clear runs ONLY on unmount (empty deps), because `App` switches screens by
 * rendering the round out entirely and that is the one moment the slice actually goes stale.
 * The write is idempotent, so StrictMode's double-invocation is a no-op.
 */
export function useDebugRoundState(slice: DebugRoundState): void {
  const {
    ui,
    interactive,
    legalCount,
    applyCash,
    applyRefusal,
    discardRefusal,
    encounterOver,
    roundComplete,
  } = slice
  useEffect(() => {
    setDebugRoundState({
      ui,
      interactive,
      legalCount,
      applyCash,
      applyRefusal,
      discardRefusal,
      encounterOver,
      roundComplete,
    })
  }, [
    ui,
    interactive,
    legalCount,
    applyCash,
    applyRefusal,
    discardRefusal,
    encounterOver,
    roundComplete,
  ])
  useEffect(() => clearDebugRoundState, [])
}
```

If `debugState.ts` does not export a `DebugRoundState` type, add one there naming exactly the eight fields `setDebugRoundState` already accepts, and export it — do not widen or narrow the set. Note that the original effect's dependency array listed `legal` (the array) while the body read `legal.length`; the hook takes `legalCount` and depends on the number, which is the correct dependency and removes a re-fire on every new array identity. Call this out in the Implementer Report as a deliberate, behaviour-preserving narrowing.

- [x] **Step 2: Replace the two effects in `WarCouncilRound.tsx` with the call**

Delete lines 153-178 (the comment block and both `useEffect`s) and the now-unused `clearDebugRoundState` / `setDebugRoundState` imports at line 3, then call:

```tsx
useDebugRoundState({
  ui,
  interactive,
  legalCount: legal.length,
  applyCash,
  applyRefusal,
  discardRefusal,
  encounterOver,
  roundComplete,
})
```

Remove the `useEffect` import from this file only if nothing else in it uses one.

- [x] **Step 3: Confirm the budget is bought back and the tree still renders**

Run: `npm run typecheck; npm run lint; (Get-Content src\app\warCouncil\WarCouncilRound.tsx).Length; npx vitest run src/app/warCouncil/__tests__ --project dom`
Expected: typecheck and lint exit 0; the line count is below 400 and lower than 399; the dom specs pass with no change in count.

---

## Phase 2 — R2: one Timebomb at a time

The refusal, end to end: the pure rule, its message, and the felt fact that feeds it. Ordered so the enum member, its message row and its stock field land before anything reads them — `BUFF_ACTIVATION_REFUSAL_MESSAGE` is a `Readonly<Record<BuffActivationRefusal, string>>`, so adding the member without its row is a typecheck failure. Tasks 5 and 6 must therefore land together; the phase boundary is after Task 7, when the felt actually supplies the value.

### Task 5: Add `TimebombLive` and the `timebombLive` stock field ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/buffActivation.ts:13-47, 92-115` — the enum member, the stock field, the refusal branch, the fourth parameter
- Test: `src/hunt/__tests__/buffActivation.test.ts` — refusal-order cases

- [x] **Step 1: Add the enum member in refusal order**

Between `WindowClosed` and `AlreadyActive`, so the felt-wide reason still reports first:

```ts
  /** R2 — one Timebomb at a time. A second spend is REFUSED rather than allowed and then blocked
   *  at the prime, which would strand a paid-for card — the exact failure AC13 exists to prevent.
   *  Distinct from `AlreadyActive` below, which means the SAME card twice in one trick; this is a
   *  DIFFERENT card blocked by state carried from an earlier trick, so reusing that reason would
   *  put "Already active this trick" on a row for which it is false. */
  TimebombLive: 'timebombLive',
```

- [x] **Step 2: Add the stock field and the refusal branch**

```ts
export interface BuffActivationStock {
  // …existing fields…
  /** R2 — a Timebomb is already armed or a card is already primed. Set only for a Timebomb;
   *  `false` for every other kind, so the branch below cannot refuse anything else. */
  readonly timebombLive: boolean
}
```

```ts
export function buffActivationRefusalFor(stock: BuffActivationStock): BuffActivationRefusal | null {
  if (!stock.effectLive) return BuffActivationRefusal.NoEffectYet
  if (!stock.windowOpen) return BuffActivationRefusal.WindowClosed
  if (stock.timebombLive) return BuffActivationRefusal.TimebombLive
  if (stock.alreadyActive) return BuffActivationRefusal.AlreadyActive
  if (!canAffordAp(stock.apPool, stock.apCost)) return BuffActivationRefusal.InsufficientAp
  return null
}
```

- [x] **Step 3: Take the fact as a fourth parameter on the stock builder**

`buffActivationStockFor` is `src/hunt/`'s and must not learn to read the felt. It takes the fact the way it already takes `windowOpen`:

```ts
export function buffActivationStockFor(
  state: BuffActivationState,
  buff: Buff,
  windowOpen: boolean,
  timebombLive: boolean,
): BuffActivationStock {
  return {
    effectLive: consumableEffectIsLive(buff),
    windowOpen,
    apPool: state.apPool,
    apCost: apCostOf(buff),
    alreadyActive: state.activatedThisTrick.includes(buff.id),
    // Only a Timebomb can be refused for this reason; every other kind reads `false`.
    timebombLive: buff.kind === BuffKind.Timebomb && timebombLive,
  }
}
```

`activateBuff` (line 124) calls `buffActivationStockFor` — give it a matching fourth parameter and thread it through, so the throw-guard and the UI's refusal cannot disagree.

- [x] **Step 4: Add the refusal-order spec cases**

```ts
it('refuses a second Timebomb while one is live — DLR-154 R2', () => {
  const stock = { ...openStock, timebombLive: true }
  expect(buffActivationRefusalFor(stock)).toBe(BuffActivationRefusal.TimebombLive)
})
it('reports WindowClosed ahead of TimebombLive — the felt-wide reason wins', () => {
  const stock = { ...openStock, windowOpen: false, timebombLive: true }
  expect(buffActivationRefusalFor(stock)).toBe(BuffActivationRefusal.WindowClosed)
})
it('reports TimebombLive ahead of AlreadyActive', () => {
  const stock = { ...openStock, timebombLive: true, alreadyActive: true }
  expect(buffActivationRefusalFor(stock)).toBe(BuffActivationRefusal.TimebombLive)
})
it('never refuses a non-Timebomb for TimebombLive', () => {
  expect(buffActivationStockFor(activation, takerBuff, true, true).timebombLive).toBe(false)
})
```

Every existing literal in this file that builds a `BuffActivationStock` needs `timebombLive: false` — the typecheck in Step 5 names them all.

- [x] **Step 5: Run the spec and typecheck**

Run: `npx vitest run src/hunt/__tests__/buffActivation.test.ts; npm run typecheck`
Expected: Vitest PASS. `tsc -b` will report errors in `buffLabels.ts` (the missing message row) and at every `buffActivationStockFor` call site — Tasks 6 and 7 close those; do not close them here.

### Task 6: Add the `TimebombLive` message row ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/buffLabels.ts:164` — one row in `BUFF_ACTIVATION_REFUSAL_MESSAGE`
- Test: `src/app/warCouncil/__tests__/buffLabels.test.ts:104` — the existing every-refusal-has-copy block covers it

- [x] **Step 1: Add the row**

```ts
  // R2 — PLACEHOLDER copy. Says which card is in the way, not merely that something is: the row
  // renders this on its own face, so a player who cannot see why is exactly who this is for.
  [BuffActivationRefusal.TimebombLive]: 'A Timebomb is already live — resolve or remove it first.',
```

- [x] **Step 2: Confirm the existing exhaustiveness spec now covers the new member**

Run: `npx vitest run src/app/warCouncil/__tests__/buffLabels.test.ts`
Expected: PASS — the DLR-126 "every refusal has copy" block at line 104 iterates the enum, so it exercises `TimebombLive` with no new test written. If that block enumerates members by hand rather than iterating, add `TimebombLive` to its list.

### Task 7: Supply `timebombLive` from the felt ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/roundUiState.ts:340-351` — pass the fact into `buffActivationStockFor`
- Test: `src/app/warCouncil/__tests__/roundUiState.test.ts` — the stock reports it

- [x] **Step 1: Compute and pass it**

`roundUiState.ts`'s `buffActivationStock` is the one place the felt's shape becomes a `BuffActivationStock`, the same route `windowOpen` already travels:

```ts
/** R2 — a Timebomb is armed (spent, waiting for a card) or a card is already primed. Either
 *  state means a second Timebomb would strand a card, so the row goes unavailable with its
 *  reason on its face. Derived, never stored — AC6 forbids a second flag. */
export function timebombLive(state: RoundUiState): boolean {
  return timebombArmed(state) || state.round.primedCards.length > 0
}
```

Then, in `buffActivationStock`:

```ts
  return buffActivationStockFor(
    activation,
    buff,
    buffActivationWindowOpen(state, buff),
    timebombLive(state),
  )
```

- [x] **Step 2: Spec both halves of the predicate**

```ts
it('reports a Timebomb as live while one is armed — DLR-154 R2', () => {
  expect(timebombLive(baseUi({ timebombArmedDamage: TIMEBOMB_DAMAGE[BuffTier.Bronze] }))).toBe(true)
})
it('reports a Timebomb as live while a card is primed', () => {
  const ui = baseUi({})
  const primed = { ...ui, round: primeCard(ui.round, PlayerSide.Player, held) }
  expect(timebombLive(primed)).toBe(true)
})
it('reports no Timebomb live on an untouched felt', () => {
  expect(timebombLive(baseUi({}))).toBe(false)
})
```

Use the file's existing `baseUi(overrides)` helper — the `roundHint.test.ts:19-31` pattern — rather than hand-building a `RoundUiState`.

- [x] **Step 3: Run the spec and close the phase's typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/roundUiState.test.ts; npm run typecheck`
Expected: Vitest PASS; `tsc -b` now exits 0 — Tasks 5, 6 and 7 together close the widening.

**Implementer note:** `src/app/warCouncil/__tests__/roundUiState.test.ts` does not exist — this
predicate's tests, and `buffActivationStock`'s, live in the existing
`src/app/warCouncil/__tests__/buffActivationStock.test.ts` (the actual home of every other
`buffActivationStock` case), so the new `timebombLive` cases were added there instead. Ran
`npx vitest run src/app/warCouncil/__tests__/buffActivationStock.test.ts` — PASS.

---

## Phase 3 — R3: the two-trick fuse

The fuse as reducer state: seeded at the prime, decremented where a trick resolution is already known, and booked through `queueTimebomb` at zero. Nothing renders it yet, so the phase ends with the rule complete and testable and the screen unchanged. The booking choice is the consequential one — Assumption 13, flagged in the File map as still open to the developer.

### Task 8: Add `timebombFuseRemaining` and `timebombFuseLive` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/roundUiState.ts:84-93` — the field and the predicate
- Modify: `src/app/warCouncil/roundUiSeed.ts:59` — seed it `0`
- Test: `src/app/warCouncil/__tests__/timebombFuse.test.ts` — created here, extended by Tasks 9 and 10

**Correction found while implementing:** `TIMEBOMB_FUSE_TRICKS` (added to `buffCatalog.ts` in an
earlier phase) was never re-exported from `src/hunt/index.ts`, so the test file could not import it
through `../../hunt` as every other spec does. Added the missing re-export in the same edit as this
task — a Phase 1/2 gap, not new Phase 3 scope.

- [x] **Step 1: Add the field beside `primedTimebombDamage`**

```ts
  /** R3 — trick resolutions left before a primed card detonates in the player's hand. `0` when
   *  nothing is primed. A COUNT, not a stage, exactly as `cheatTricksRemaining` above is and for
   *  its reason: the fuse length is a config key (`TIMEBOMB_FUSE_TRICKS`) and a boolean could
   *  only ever express one value of it. Set by `primeTapped` to `TIMEBOMB_FUSE_TRICKS`;
   *  decremented by `commit` at each resolution while the card is still held; cleared to `0` by
   *  the detonation, by the card being played, and by removal. */
  readonly timebombFuseRemaining: number
```

- [x] **Step 2: Add the exported predicate**

```ts
/** R3 — the fuse is live and counting. EXPORTED so the mark's numeral and the reducer's expiry
 *  branch read the SAME predicate, the discipline `timebombArmed` above sets. */
export function timebombFuseLive(state: RoundUiState): boolean {
  return state.timebombFuseRemaining > 0
}
```

- [x] **Step 3: Seed it at the single construction site**

`createRoundUiState` (`roundUiSeed.ts:49`) is the only place a `RoundUiState` is built — every spec goes through a `baseUi(overrides)` helper that spreads it. Add `timebombFuseRemaining: 0,` beside `primedTimebombDamage: null,`.

- [x] **Step 4: Create the spec file with the seed case** — used the `baseUi(overrides)` helper
pattern from `roundHint.test.ts:19`, which extends with a second `round` overrides parameter this
phase's later cases need to reach `WarCouncilState.primedCards` and hand contents directly.

```ts
import { describe, expect, it } from 'vitest'
import { timebombFuseLive } from '../roundUiState'

describe('the Timebomb fuse — DLR-154 R3', () => {
  it('starts unlit on a fresh felt', () => {
    const ui = baseUi({})
    expect(ui.timebombFuseRemaining).toBe(0)
    expect(timebombFuseLive(ui)).toBe(false)
  })
})
```

- [x] **Step 5: Run the spec and typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/timebombFuse.test.ts; npm run typecheck`
Expected: Vitest PASS; `tsc -b` exits 0 — the field is required but has exactly one construction site, so nothing else breaks.

### Task 9: Seed the fuse at the prime, and stop eating an already-primed tap ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/roundReducer.ts:234-252` — `primeTapped`
- Test: `src/app/warCouncil/__tests__/timebombFuse.test.ts` — extend

- [x] **Step 1: Write the failing cases**

```ts
it('seeds the fuse when a card takes the mark', () => {
  const armed = baseUi({ timebombArmedDamage: TIMEBOMB_DAMAGE[BuffTier.Bronze] })
  const next = roundUiReducer(armed, { kind: RoundUiActionKind.TapCard, card: held })
  expect(next.timebombFuseRemaining).toBe(TIMEBOMB_FUSE_TRICKS)
  expect(isPrimed(next.round.primedCards, held)).toBe(true)
})

it('keeps priming mode open when an already-primed card is tapped — Assumption 5', () => {
  const armed = baseUi({ timebombArmedDamage: TIMEBOMB_DAMAGE[BuffTier.Bronze] })
  const primed = roundUiReducer(armed, { kind: RoundUiActionKind.TapCard, card: held })
  const again = roundUiReducer(primed, { kind: RoundUiActionKind.TapCard, card: held })
  expect(again.timebombArmedDamage).toBe(primed.timebombArmedDamage)
  expect(again.round.primedCards).toHaveLength(1)
})
```

- [x] **Step 2: Run, confirm both fail** — confirmed: `seeds the fuse when a card takes the mark` failed with `expected +0 to be 2`.

- [x] **Step 3: Split the guard and seed the fuse**

Today's guard clears `timebombArmedDamage` for all three failure cases, which silently eats a paid-for card when the tap simply landed on a card that is already primed. Split it:

```ts
function primeTapped(state: RoundUiState, tapped: Card): RoundUiState {
  const hand = state.round.hands[PlayerSide.Player]
  if (state.timebombArmedDamage === null || !containsCard(hand, tapped)) {
    // Unreachable from the fan (every rendered card is held), so this keeps its existing
    // clear-and-abandon behaviour rather than growing a second recovery path.
    return { ...state, timebombArmedDamage: null }
  }
  // Assumption 5 — a tap on an already-primed card is a NO-OP that keeps the mode open. Clearing
  // here would abandon a paid-for card with no mark to show for it, and leave the player with no
  // visible cause. The prompt stays on screen and the next tap can still land.
  if (isPrimed(state.round.primedCards, tapped)) return state
  return {
    ...state,
    round: primeCard(state.round, PlayerSide.Player, tapped),
    timebombArmedDamage: null,
    primedTimebombDamage: state.timebombArmedDamage,
    timebombFuseRemaining: TIMEBOMB_FUSE_TRICKS,
    armed: null,
    rejection: null,
  }
}
```

Import `TIMEBOMB_FUSE_TRICKS` from `../../hunt`.

- [x] **Step 4: Re-run** — Vitest confirmed PASS inline (3/3); `npm run typecheck` deferred into the phase-end verification block per policy, confirmed there.

Run: `npx vitest run src/app/warCouncil/__tests__/timebombFuse.test.ts; npm run typecheck`
Expected: PASS; `tsc -b` exits 0.

### Task 10: Decrement the fuse, and book the in-hand detonation ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/commitHandlers.ts:232-267` — the decrement beside Cheat's, and the expiry branch
- Test: `src/app/warCouncil/__tests__/timebombFuse.test.ts` — extend

The consequential task. At zero the fuse calls `queueTimebomb(encounter, DuelSide.Player, damage)` — the identical booking a played bomb makes at line 166 — rather than `applyDamage`. Booking inherits the bank-and-multiplier reset (`bank.ts:253`'s `timebombResets`), the Blast Guard's absorption and spend, the zero floor, and the forced cash-out, restating none of them. `duelHealthBars.ts` is this codebase's standing cautionary case for the alternative.

**Two corrections found while implementing, both recorded here rather than silently fixed:**
1. **`queueTimebomb`'s third parameter is the full `TimebombDamage` pair, not a single number.** The
   task's illustrative snippet (`queueTimebomb(settledEncounter, DuelSide.Player,
   timebombDamage[DuelSide.Player])`) would not typecheck — `queueTimebomb(encounter, target,
   damage: TimebombDamage)` indexes the pair by `target` internally
   (`encounter.pendingTimebomb[target] + damage[target]`). The correct call passes the pair itself —
   `queueTimebomb(booked, DuelSide.Player, timebombDamage)` — the IDENTICAL shape the played-bomb
   booking two lines above it already uses, just with `DuelSide.Player` named as the target instead
   of `resolution.timebombTarget`. This still lands exactly `TIMEBOMB_DAMAGE[tier][DuelSide.Player]`
   (Assumption 14), because `queueTimebomb` does the indexing.
2. **`commit()` resolves a trick in TWO places, not one** — branch A (`resolvedTrick`, when the
   player's own commit completes a trick as the follower) and branch B (`advanceQuarryFollow`'s
   `advanced.resolvedTrick`, when the player leads and the Quarry follows inside the same call).
   Exactly one of the two fires per successful commit (branch A returns early when it fires). The
   fuse decrement and `fuseExpired` are computed once, right beside Cheat's own decrement as
   directed, and threaded into whichever branch's `applyResolution` call actually executes; the mark
   lift (`liftExpiredMarks`, mirroring the task's `expiredCards`/`unprimeCard` reduce) is folded into
   `settled.round`, which both branches read (branch B reads `advanceQuarryFollow(settled.round,
   ...)` rather than `result.state`, so the lift is not needed twice).

- [x] **Step 1: Write the failing cases**

```ts
it('counts down only while the primed card is still held', () => {
  // prime, then resolve one trick the primed card was not played into
  expect(afterOneTrick.timebombFuseRemaining).toBe(TIMEBOMB_FUSE_TRICKS - 1)
})

it('books player-side damage when the fuse reaches zero, and clears the fuse', () => {
  expect(afterTwoTricks.timebombFuseRemaining).toBe(0)
  expect(afterTwoTricks.encounter.pendingTimebomb[DuelSide.Player]).toBe(
    TIMEBOMB_DAMAGE[BuffTier.Bronze][DuelSide.Player],
  )
})

it('lifts the mark when the bomb goes off in hand, so nothing detonates twice', () => {
  expect(isPrimed(afterTwoTricks.round.primedCards, held)).toBe(false)
})

it('stops counting once the primed card has been played', () => {
  expect(afterPlayingThePrimedCard.timebombFuseRemaining).toBe(0)
})
```

- [x] **Step 2: Run, confirm they fail** — confirmed: 3 of the 4 new cases failed (`books player-side damage…` and `stops counting…` off by the un-decremented/un-reset fuse; `lifts the mark…` still primed) before this task's edit.

- [x] **Step 3: Decrement beside Cheat's own decrement**

`commitHandlers.ts:232` is already the one place a resolved trick is known. Add, directly beneath it:

```ts
  // R3 — the fuse counts trick RESOLUTIONS, and only while the primed card is still in hand
  // (Assumption 12). A card played into this trick has left the hand, so its fuse stops rather
  // than ticking to a detonation the player already avoided.
  const primedStillHeld =
    state.timebombFuseRemaining > 0 &&
    state.round.primedCards.some((card) => containsCard(nextHand, card))
  const timebombFuseRemaining = primedStillHeld
    ? Math.max(0, state.timebombFuseRemaining - 1)
    : 0
```

Use whatever local name this function already holds the player's post-resolution hand under; if there is none, read it off the settled round state rather than introducing a second source.

- [x] **Step 4: Book at zero through `queueTimebomb`** — see the corrections noted above the steps.

Where the resolved encounter is assembled (beside line 166's existing `queueTimebomb` call), add the expiry branch:

```ts
  // R3 — the fuse expired with the card still held. Booked through `queueTimebomb`, the IDENTICAL
  // path a played bomb takes, so the bank reset, the Blast Guard and the forced cash-out are
  // inherited rather than restated (Assumption 13). The PLAYER side of the tier's pair
  // (Assumption 14): the damage is to the player, and `buffCatalog.ts` records that figure as
  // deliberately the smaller of the two BECAUSE it also forces the streak's cash-out.
  const fuseExpired = primedStillHeld && timebombFuseRemaining === 0
  const withFuse = fuseExpired
    ? queueTimebomb(settledEncounter, DuelSide.Player, timebombDamage[DuelSide.Player])
    : settledEncounter
```

and lift the mark in the same transition, so the same card cannot detonate twice:

```ts
  const roundAfterFuse = fuseExpired
    ? expiredCards.reduce((round, card) => unprimeCard(round, card), settledRound)
    : settledRound
```

where `expiredCards` is the primed cards still held. Guard each `unprimeCard` with `isPrimed` first — it throws by design, and a throw inside a reducer during an event handler unmounts the tree.

Thread `timebombFuseRemaining` into the returned state beside `cheatTricksRemaining` at line 267.

- [x] **Step 5: Re-run and typecheck** — Vitest confirmed PASS inline (7/7 in the full spec file). `npm run typecheck` deferred into the phase-end verification block per policy, confirmed there.

Run: `npx vitest run src/app/warCouncil/__tests__/timebombFuse.test.ts; npm run typecheck`
Expected: PASS; `tsc -b` exits 0.

### Task 11: Stop the sim fixture passing on a fuse it did not intend ✓

- Skill: react-frontend

**Files:**
- Modify: `src/sim/fixtures.ts:128-133` — tighten `attemptPrimedTimebomb`'s success test

`attemptPrimedTimebomb` returns as soon as `primed && booked`. R3 adds a second route to `booked` — the fuse — so the fixture could now succeed without ever proving what it exists to prove: that a *played* marked card books a payment. Checked, not assumed.

- [x] **Step 1: Read the loop and confirm the weakening is real** — confirmed: the `primed &&
booked` test sat at lines 129-133, reachable after two trick resolutions with the marked card
still unplayed once Task 10 landed the fuse.

- [x] **Step 2: Require the mark to have LEFT the hand before counting a success** — added
`containsCard` to the `../warCouncil` import, since the fixture had no prior need to read hand
membership directly.

```ts
    const primed = ui.round.primedCards.length >= 1
    // DLR-154 R3 — a fuse expiring in hand ALSO books, so `booked` alone no longer proves this
    // fixture's premise: that a PLAYED marked card books a payment. Require the marked card to
    // have left the hand, which the fuse route never satisfies.
    const markedCardPlayed = ui.round.primedCards.some(
      (card) => !containsCard(ui.round.hands[PlayerSide.Player], card),
    )
    const booked =
      ui.encounter.pendingTimebomb[DuelSide.Player] > 0 ||
      ui.encounter.pendingTimebomb[DuelSide.Quarry] > 0
    if (primed && markedCardPlayed && booked) return ui
```

- [x] **Step 3: Confirm the fixture still finds a seed** — `npx vitest run src/sim --project node`:
`Test Files 7 passed (7)`, `Tests 61 passed (61)`. No `RangeError`; `PRIMED_TIMEBOMB_MAX_ATTEMPTS`
was not touched.

---

## Phase 4 — The bomb on the card

The mark itself: its component, its rehoming onto the wrapper, the retirement of the on-face geometry that rehoming invalidates, and the fuse reaching the hover tip and the accessible name. Task 13 must land in the same phase as Task 12 — the drift spec `cardFaceCss.test.ts` exists to prove printed-on-the-face rectangles honest, and leaving it pointed at a deleted property between phases would leave the suite red.

### Task 12: Build `TimebombMark` and its stylesheet ✓

- Skill: react-frontend, game-ux

**Files:**
- Create: `src/app/warCouncil/TimebombMark.tsx`
- Create: `src/app/warCouncil/warCouncilTimebombMark.css`
- Test: `src/app/warCouncil/__tests__/TimebombMark.test.tsx`

Shapes come from `.claude/contract/DLR-147-full-ui-pass/mockup-primed-card.html`. **Its CSS is explicitly not to be ported** — re-author under `react-frontend`. Placement per this folder's `mockup.html`.

- [x] **Step 1: Write the failing spec**

```tsx
describe('TimebombMark — DLR-154 AC7/AC8', () => {
  it('draws the bomb inline, never through <use>', () => {
    const { container } = render(<TimebombMark fuseRemaining={2} />)
    expect(container.querySelector('use')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('mints unique gradient ids per instance, so two marks cannot collide', () => {
    const { container } = render(
      <>
        <TimebombMark fuseRemaining={2} />
        <TimebombMark fuseRemaining={1} />
      </>,
    )
    const ids = [...container.querySelectorAll('radialGradient')].map((node) => node.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('renders the fuse count as a real text node — R4', () => {
    const { container } = render(<TimebombMark fuseRemaining={2} />)
    expect(container.textContent).toContain('2')
  })

  it('is decorative — the accessible name carries the fact instead', () => {
    const { container } = render(<TimebombMark fuseRemaining={2} />)
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })
})
```

- [x] **Step 2: Run, confirm it fails**

Run: `npx vitest run src/app/warCouncil/__tests__/TimebombMark.test.tsx --project dom`
Expected: FAIL — the module does not exist.

- [x] **Step 3: Write the component**

`useId()` mints the gradient ids per instance (Assumption 7): the mockup hard-codes `id="bombBody"` / `id="sparkGlow"`, and two marks on screen at once — a primed card in hand and the same card in the trick well — would collide. `aria-hidden` because `cardAccessibleName` is the accessible carrier. No `<symbol>`/`<use>`: `use` clones into a shadow tree the fizz class cannot reach from the light DOM, leaving the spark dead and unreachable by `prefers-reduced-motion` (AC8) — deliberately the opposite of the rule `#wc-skull` follows.

```tsx
import { useId } from 'react'
import './warCouncilTimebombMark.css'

interface TimebombMarkProps {
  /** R4 — trick resolutions left, rendered as the numeral on the bomb. */
  readonly fuseRemaining: number
}

export default function TimebombMark({ fuseRemaining }: TimebombMarkProps) {
  const base = useId()
  const bodyId = `${base}-body`
  const glowId = `${base}-glow`
  return (
    <span className="wc-timebomb-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32">
        <defs>
          <radialGradient id={bodyId} /* stops per mockup-primed-card.html */ />
          <radialGradient id={glowId} /* stops per mockup-primed-card.html */ />
        </defs>
        {/* body, fuse, spark — inline shapes transcribed from the approved mockup */}
        <circle fill={`url(#${bodyId})`} /* … */ />
        <path className="wc-timebomb-mark-fuse-line" /* … */ />
        <circle className="wc-timebomb-mark-glow" fill={`url(#${glowId})`} /* … */ />
      </svg>
      <span className="wc-timebomb-mark-fuse">{fuseRemaining}</span>
    </span>
  )
}
```

Transcribe the real shape list, viewBox and gradient stops from the mockup — do not ship the placeholder comments above.

- [x] **Step 4: Write the stylesheet**

Its own file (Assumption 9), the precedent `PlayingCard.tsx` sets with `import './warCouncilBuffRide.css'` — `warCouncilCardFace.css` (327) and `warCouncilCards.css` (373) are both near the 400-line budget.

```css
/* DLR-154 — the primed-card mark. EVERY VALUE HERE IS A PLACEHOLDER: the overhang, size, hue
   and fizz duration are carried unretuned from `mockup-primed-card.html` and are the
   developer's to choose once it is on screen (`tasks.md` File map). */
.wc-timebomb-mark {
  position: absolute;
  top: -11%;
  right: -9%;
  width: 46%;
  /* An overhanging decoration must never steal a tap from the card beneath it. */
  pointer-events: none;
}

.wc-timebomb-mark-glow {
  animation: wc-timebomb-fizz 620ms steps(2, end) infinite;
}

@keyframes wc-timebomb-fizz {
  to {
    opacity: 0.35;
  }
}

/* AC9 — the fizz stops and the spark is left LIT, not dark. */
@media (prefers-reduced-motion: reduce) {
  .wc-timebomb-mark-glow {
    animation: none;
    opacity: 1;
  }
}
```

Add `.wc-timebomb-mark-fuse` for the numeral — tabular numerals, centred on the body, per `mockup.html`.

- [x] **Step 5: Re-run**

Run: `npx vitest run src/app/warCouncil/__tests__/TimebombMark.test.tsx --project dom; npm run typecheck`
Expected: PASS; `tsc -b` exits 0.

### Task 13: Rehome the mark onto the card's wrapper ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/PlayingCard.tsx:114-146` — the `<span className="wc-primed-mark">⚗</span>` goes; `TimebombMark` renders as a sibling of the `<button>`; new `fuseRemaining` prop
- Test: `src/app/warCouncil/__tests__/PlayingCard.test.tsx:31,44,129` — retarget three assertions

AC4: the mark hangs on `.wc-card-tip-host` — the `<span>` `CardAbilityTip` already wraps every `PlayingCard` in, already `position: relative; display: block`. It sits outside `.wc-card`'s `container-type: inline-size` layout containment, and because every render path (hand, table, pile) routes through it, one placement satisfies AC7 everywhere.

- [x] **Step 1: Add the prop**

```tsx
  /** R4 — trick resolutions left on this card's fuse. Ignored unless `primed`. Optional and
   *  defaulted to 0, the precedent `primed`, `discardSelected`, `describedBy` and `buffCount`
   *  each set, so no other construction site changes. */
  readonly fuseRemaining?: number
```

- [x] **Step 2: Move the mark out of the button**

Delete the `{primed && (<span className="wc-primed-mark" aria-hidden="true">⚗</span>)}` block from inside `<button>`, and render the new mark as a sibling of the button inside `CardAbilityTip`'s children:

```tsx
    <CardAbilityTip card={card} fuseNote={primed ? timebombFuseText(fuseRemaining) : null}>
      <button …>
        …
      </button>
      {/* AC4 — OUTSIDE the button, so the mark can overhang the corner. `.wc-card-tip-host` is
          already `position: relative` and already wraps every render path, so this one placement
          covers hand, table and pile (AC7). */}
      {primed && <TimebombMark fuseRemaining={fuseRemaining} />}
    </CardAbilityTip>
```

`CardAbilityTip`'s `children` is a `ReactNode`, so a two-element fragment needs no change there — only the new `fuseNote` prop, added in Task 15.

- [x] **Step 3: Fold the fuse into the accessible name**

```tsx
        aria-label={cardAccessibleName(card, { skulled, primed, fuseRemaining })}
```

- [x] **Step 4: Retarget the three existing assertions**

`PlayingCard.test.tsx:31,44,129` query `.wc-primed-mark`. Point them at `.wc-timebomb-mark`, and add one asserting the mark is **not** inside the button:

```tsx
it('hangs the mark on the wrapper, not inside the card box — AC4', () => {
  const { container } = render(<PlayingCard card={five} primed fuseRemaining={2} />)
  expect(container.querySelector('button .wc-timebomb-mark')).toBeNull()
  expect(container.querySelector('.wc-card-tip-host > .wc-timebomb-mark')).not.toBeNull()
})

it('keeps rank, suit and rank name — the mark is ADDED, never substituted (AC3)', () => {
  render(<PlayingCard card={five} primed fuseRemaining={2} />)
  expect(screen.getByRole('button', { name: /5 of/i })).toBeInTheDocument()
})
```

- [x] **Step 5: Run**

Run: `npx vitest run src/app/warCouncil/__tests__/PlayingCard.test.tsx --project dom; npm run typecheck`
Expected: PASS; `tsc -b` exits 0.

### Task 14: Retire the on-face primed geometry ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/cardFace.ts:123-146, 224` — delete `primedMark`, the five constants feeding only it, and its `printedRects` entry
- Modify: `src/app/warCouncil/warCouncilCards.css:130-139` — delete the four `--wc-face-primed-*` declarations and the comment naming them
- Modify: `src/app/warCouncil/warCouncilCardFace.css:217-229` — delete the `.wc-card .wc-primed-mark` rule
- Modify: `src/app/warCouncil/__tests__/cardFaceCss.test.ts:44-54` — delete the four `wc-face-primed-*` rows and the comment naming them

Deleted rather than repointed (Assumption 8): once the mark is outside the card box it has no printed-on-the-face rectangle, and `cardFaceCss.test.ts` — a machine for proving such rectangles honest — would otherwise certify a false claim. **All four sides go in this one task**, so no phase boundary leaves the drift spec referencing a deleted property.

- [x] **Step 1: Delete the geometry and its constants**

Remove `PRIMED_MARK_LEFT`, `PRIMED_MARK_SIZE`, `PRIMED_MARK_BOTTOM`, `PRIMED_MARK_BOTTOM_FRACTION` and `PRIMED_MARK_HEIGHT_FRACTION` (lines 124-128), the `primedMark` entry in `CARD_FACE_GEOMETRY` (lines 142-146), and `geometry.primedMark` from `printedRects`'s `printed` array (line 224).

Keep `CARD_ASPECT_RATIO` (line 123) only if another constant still reads it — check before deleting; `discardMark` may share it.

- [x] **Step 2: Delete the four custom properties and the rule**

`warCouncilCards.css:136-139` (the declarations) plus the QA-1 comment at line 130 that explains them; `warCouncilCardFace.css:217-229` (the whole `.wc-card .wc-primed-mark` rule and its comment at 222).

- [x] **Step 3: Delete the four drift rows**

`cardFaceCss.test.ts:44-54` — the QA-1 comment and the four `['wc-face-primed-*', …]` entries. Leave the `wc-face-discard-*` rows.

- [x] **Step 4: Confirm the class and the properties are gone everywhere**

Run: `Select-String -Path src\**\*.ts,src\**\*.tsx,src\**\*.css -Pattern "wc-face-primed|wc-primed-mark|primedMark"`
Expected: zero hits.

- [x] **Step 5: Run the affected specs**

Run: `npx vitest run src/app/warCouncil/__tests__/cardFaceCss.test.ts src/app/warCouncil/__tests__/cardFace.test.ts; npm run typecheck`
Expected: PASS with four fewer drift cases; `tsc -b` exits 0. `cardFace.test.ts`'s overlap relation now covers one fewer rectangle — correct, and by design.

### Task 15: Put the fuse in the hover tip and the accessible name ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/labels.ts:32-46` — `CardMarks.fuseRemaining`, `timebombFuseText`
- Modify: `src/app/warCouncil/CardAbilityTip.tsx` — an optional `fuseNote`
- Test: `src/app/warCouncil/__tests__/labels.test.ts` — the name's fuse clause

- [x] **Step 1: Extend `CardMarks` and add the fuse copy**

```ts
export interface CardMarks {
  readonly skulled?: boolean
  readonly primed?: boolean
  /** R4 — trick resolutions left, so the numeral reaches assistive tech through the NAME rather
   *  than a second live region. Read only when `primed`. */
  readonly fuseRemaining?: number
}
```

```ts
/** R4 — the fuse clause, folded into a primed card's accessible name and its hover tip.
 *  PLACEHOLDER copy, as this file's rest is. */
export function timebombFuseText(fuseRemaining: number): string {
  if (fuseRemaining <= 0) return 'Timebomb — going off now.'
  return fuseRemaining === 1
    ? 'Timebomb — play it this trick or it goes off in your hand.'
    : `Timebomb — ${fuseRemaining} tricks to play it before it goes off in your hand.`
}
```

Fold the clause into `cardAccessibleName`'s suffix, after `primed`, only when `marks.primed` is true.

- [x] **Step 2: Accept the note on the tip**

```tsx
interface CardAbilityTipProps {
  readonly card: Card
  /** R4 — a primed card's fuse line, shown beneath the rank rule. `null` on every other card.
   *  Passed rather than derived: this component computes nothing about a card's state. */
  readonly fuseNote?: string | null
  readonly children: ReactNode
}
```

Render it inside the bubble after `RANK_RULE_TEXT[card.rank]`:

```tsx
            {fuseNote !== null && fuseNote !== undefined && (
              <span className="wc-card-tip-fuse">{fuseNote}</span>
            )}
```

Add a `.wc-card-tip-fuse` rule to `warCouncilTimebombMark.css` so the new class name is not string-bound on only one side of the CSS/TSX pair.

- [x] **Step 3: Spec the name**

```ts
it('names the fuse on a primed card — R4', () => {
  expect(cardAccessibleName(five, { primed: true, fuseRemaining: 2 })).toMatch(/2 tricks/)
})
it('names skull before Timebomb, and leaves an unmarked card alone', () => {
  expect(cardAccessibleName(five, { skulled: true, primed: true, fuseRemaining: 1 })).toMatch(
    /skulled.*primed/,
  )
  expect(cardAccessibleName(five)).not.toMatch(/primed/)
})
```

- [x] **Step 4: Run**

Run: `npx vitest run src/app/warCouncil/__tests__/labels.test.ts --project node; npm run typecheck`
Expected: PASS; `tsc -b` exits 0.

---

## Phase 5 — The priming mode on the hand

What makes AC1 true: the hand visibly waits, and the prompt says why. Both are absent today rather than weak — `wc-is-marking` is rendered and has **zero stylesheet rules**, and the prompt is unreachable in exactly the window Timebomb is activatable in. The phase ends with the mode visible and the mark drawn, and removal still to come in Phase 6.

### Task 16: Write the `.wc-fan.wc-is-marking` rule ✓

- Skill: game-ux, react-frontend

**Files:**
- Modify: `src/app/warCouncil/warCouncilHand.css` — a real rule for the existing class

`grep -rn "wc-is-marking" src/` returns 2 hits, both in `HandFan.tsx` (a comment and the className); `grep -rn "is-marking" src/app/warCouncil/*.css` returns 0. The class has always been rendered and never styled.

- [x] **Step 1: Add the rule, per this folder's `mockup.html`**

Layout and treatment per `.claude/contract/DLR-154-timebomb-targeting-prime-a-card/mockup.html`'s priming-mode panel. Every value is a PLACEHOLDER — say so in the comment.

```css
/* DLR-154 AC1 — the hand VISIBLY waits for a card. The class has been rendered since DLR-90 and
   had no rule at all until now, so "the hand shows it is waiting" was not weak, it was absent.
   Treatment per this contract's `mockup.html`. EVERY VALUE IS A PLACEHOLDER — the tint, the edge
   and the drift are the developer's (`tasks.md` File map).

   Presentational only: every card is `disabled` either way, so nothing about behaviour or the
   accessible tree changes here. The prompt (`TIMEBOMB_ARMED_HINT`, in the `aria-live` hint above
   the fan) is what carries the mode to a player who cannot see the tint — colour is never the
   only channel (`game-ux`). */
.wc-fan.wc-is-marking {
  background: color-mix(in srgb, var(--wc-timebomb) 12%, transparent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--wc-timebomb) 45%, transparent);
  border-radius: 0.4rem;
}

.wc-fan.wc-is-marking .wc-card {
  animation: wc-marking-drift 2.4s ease-in-out infinite alternate;
}

@keyframes wc-marking-drift {
  to {
    transform: translateY(-2%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .wc-fan.wc-is-marking .wc-card {
    animation: none;
  }
}
```

Confirm `--wc-timebomb` is declared somewhere reachable; if it is not, declare it beside the other felt hues in `warCouncilCards.css` as a PLACEHOLDER and say so.

- [x] **Step 2: Confirm the class now has a rule on both sides**

Run: `Select-String -Path src\app\warCouncil\*.css -Pattern "wc-is-marking"; Select-String -Path src\**\*.css -Pattern "--wc-timebomb"`
Expected: at least one hit for each — the class is styled, and the custom property it reads is declared.

### Task 17: Retune the prompt and reorder the hint cascade ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/labels.ts:187` — retune `TIMEBOMB_ARMED_HINT`
- Modify: `src/app/warCouncil/roundHint.ts:23-42` — move the Timebomb branch above `quarryToLead`
- Test: `src/app/warCouncil/__tests__/roundHint.test.ts` — reachability in the Quarry-to-lead gap

The prompt is currently unreachable in the window it exists for: `if (quarryToLead) return 'They are choosing their lead'` sits **above** the Timebomb branch, and the Quarry-to-lead gap spans exactly the between-tricks window a Timebomb is activatable in. DLR-100's discard branch is already above `quarryToLead` for this same reason, with the reasoning in that file's docblock — this follows it.

- [x] **Step 1: Write the failing case**

```ts
it('says what an armed Timebomb is waiting for during the Quarry-to-lead gap — DLR-154 AC1', () => {
  const ui = baseUi({ timebombArmedDamage: TIMEBOMB_DAMAGE[BuffTier.Bronze] })
  expect(deriveHint(ui, false, true)).toBe(TIMEBOMB_ARMED_HINT)
})

it('still yields to a rejection and to an open discard selection', () => {
  const armed = baseUi({ timebombArmedDamage: TIMEBOMB_DAMAGE[BuffTier.Bronze] })
  expect(deriveHint({ ...armed, discardSelection: [] }, false, true)).toBe(DISCARD_SELECT_HINT)
})
```

- [x] **Step 2: Run, confirm the first fails**

Run: `npx vitest run src/app/warCouncil/__tests__/roundHint.test.ts --project node`
Expected: FAIL — `deriveHint` returns `'They are choosing their lead'`.

- [x] **Step 3: Move the branch and record why**

Move the `if (ui.timebombArmedDamage !== null) return TIMEBOMB_ARMED_HINT` line to sit directly beneath the discard block and **above** `if (quarryToLead)`, extending that block's existing comment:

```ts
  // DLR-154 — the armed-Timebomb prompt joins the discard branch ABOVE `quarryToLead`, and for
  // the same reason: the Quarry-to-lead gap spans exactly the between-tricks window a Timebomb is
  // activatable in, so beneath it the prompt was unreachable throughout its own lifetime. An
  // armed Timebomb reinterprets the next hand-card tap — the most specific, most actionable thing
  // there is to say — and AC1 requires it to be said out loud.
  if (ui.timebombArmedDamage !== null) return TIMEBOMB_ARMED_HINT
```

Delete the old line and its DLR-132 comment from below `ui.armed`, keeping the sentence about a live Cheat needing no hint.

- [x] **Step 4: Retune the prompt to say why (AC1)**

```ts
// DLR-154 AC1 — was 'Pick a card in your hand to prime', which said WHAT but not WHY. A Timebomb
// is the one buff that attaches to a card, and the prompt is where that is learned. PLACEHOLDER.
export const TIMEBOMB_ARMED_HINT = 'Timebomb — pick the card it rides on. It goes off in two tricks.'
```

- [x] **Step 5: Re-run**

Run: `npx vitest run src/app/warCouncil/__tests__/roundHint.test.ts --project node; npm run typecheck`
Expected: PASS — both new cases green, every existing cascade case unchanged.

### Task 18: Thread the fuse through the hand ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/HandFan.tsx` — pass `fuseRemaining` to each primed card
- Test: `src/app/warCouncil/__tests__/HandFan.test.tsx` — the numeral reaches a primed card

- [x] **Step 1: Add the prop and pass it down**

`HandFan` already takes `primedCards` and computes nothing about a card's state; the fuse follows that discipline exactly.

```tsx
  /** R4 — trick resolutions left on the primed card's fuse. Read from the reducer's own
   *  `timebombFuseRemaining`, never re-derived here. `0` when nothing is primed. */
  readonly timebombFuseRemaining: number
```

At the card call site, pass `fuseRemaining={timebombFuseRemaining}` alongside the existing `primed={isPrimed(primedCards, card)}`.

- [x] **Step 2: Wire it at the one call site**

`WarCouncilRound.tsx` renders `HandFan` — pass `timebombFuseRemaining={ui.timebombFuseRemaining}`.

- [x] **Step 3: Spec it**

```tsx
it('draws the countdown on the primed card only — R4', () => {
  render(<HandFan {...props} primedCards={[five]} timebombFuseRemaining={2} />)
  const marks = document.querySelectorAll('.wc-timebomb-mark')
  expect(marks).toHaveLength(1)
  expect(marks[0].textContent).toContain('2')
})
```

- [x] **Step 4: Run**

Run: `npx vitest run src/app/warCouncil/__tests__/HandFan.test.tsx --project dom; npm run typecheck`
Expected: PASS; `tsc -b` exits 0.

---

## Phase 6 — The riding row, and taking it back

AC5, AC12 and AC13: the row names its target, offers its own removal, and `Escape` reaches the same reversal rather than a second one. Task 21's `timebomb: null` additions and Task 20's row field must land together — `RidingBuffRow` gains a **required** field with **9 object literals**, 8 of them in specs, and `tsc` breaks on every one.

### Task 19: Derive the Timebomb's target and its riding id ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/buffRideModel.ts:150-156` — `TimebombRide`, the `timebomb` field, `timebombTargetFor`, `ridingTimebombId`
- Test: `src/app/warCouncil/__tests__/buffRideModel.test.ts` — the derivation

- [x] **Step 1: Write the failing spec**

```ts
it('names the primed card as the Timebomb row target — Assumption 3', () => {
  expect(timebombTargetFor(primedUi)).toEqual(five)
})
it('reports no target while the mode is still waiting for a card', () => {
  expect(timebombTargetFor(armedUi)).toBeNull()
})
it('resolves the riding Timebomb id so Escape reaches the same removal — AC13', () => {
  expect(ridingTimebombId(armedUi)).toBe(timebombBuff.id)
})
```

- [x] **Step 2: Run, confirm it fails**

Run: `npx vitest run src/app/warCouncil/__tests__/buffRideModel.test.ts --project node`
Expected: FAIL — neither function exists.

- [x] **Step 3: Add the type, the field and the two derivations**

```ts
export interface TimebombRide {
  /** The primed card, or `null` while the mode is still waiting for one. */
  readonly target: Card | null
  /** R4 — trick resolutions left, mirrored from `timebombFuseRemaining`. `0` when unprimed. */
  readonly fuseRemaining: number
}
```

```ts
export interface RidingBuffRow {
  readonly buff: Buff
  readonly reach: number
  readonly revocable: boolean
  /** DLR-154 AC12 — non-null ONLY on a Timebomb row. */
  readonly timebomb: TimebombRide | null
}
```

```ts
/** Assumption 3 — DERIVED from `round.primedCards`, never stored: AC6 forbids a second flag that
 *  could disagree with the chosen target. `null` while armed, because nothing is primed yet.
 *  R2 makes this airtight rather than merely conventional — with at most one Timebomb live at a
 *  time, there is never a second candidate to pick between. */
export function timebombTargetFor(state: RoundUiState): Card | null {
  if (state.timebombArmedDamage !== null) return null
  return state.round.primedCards.at(-1) ?? null
}

/** AC13 — the riding Timebomb's id, so `Escape` reaches the SAME removal the row's own control
 *  does. Two code paths is how two reversals drift apart (Assumption 4). */
export function ridingTimebombId(state: RoundUiState): BuffId | null {
  return activatedBuffs(state).find((buff) => buff.kind === BuffKind.Timebomb)?.id ?? null
}
```

In `ridingRowsFor`, populate the field:

```ts
    timebomb:
      buff.kind === BuffKind.Timebomb
        ? { target: timebombTargetFor(state), fuseRemaining: state.timebombFuseRemaining }
        : null,
```

- [x] **Step 4: Re-run**

Run: `npx vitest run src/app/warCouncil/__tests__/buffRideModel.test.ts --project node`
Expected: PASS. `tsc -b` will now fail on the 8 spec literals — Task 21 closes those.

### Task 20: Word the Timebomb row ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/buffRideLabels.ts` — `ridingRowText`, `timebombRemoveLabel`, `timebombRemovedText`
- Test: `src/app/warCouncil/__tests__/buffRideLabels.test.ts`

- [x] **Step 1: Add the three exports**

One function for the row's status sentence, so `BuffRidingList` reads one string per slot and branches on nothing.

```ts
/** AC12 — the Timebomb row's status sentence, and the reach sentence for every other row. ONE
 *  function so the component branches on nothing. PLACEHOLDER copy. */
export function ridingRowText(row: RidingBuffRow): string {
  if (row.timebomb === null) return buffReachText(row.reach)
  if (row.timebomb.target === null) return 'Not yet primed — pick a card in your hand.'
  const name = cardAccessibleName(row.timebomb.target)
  return row.timebomb.fuseRemaining === 1
    ? `Riding the ${name} — this is its last trick.`
    : `Riding the ${name} — ${row.timebomb.fuseRemaining} tricks left.`
}

/** AC12/AC5 — names the card whose mark is lifted, or says nothing is primed yet. PLACEHOLDER. */
export function timebombRemoveLabel(target: Card | null): string {
  return target === null
    ? 'Take the Timebomb back — nothing is primed yet'
    : `Take the Timebomb back off the ${cardAccessibleName(target)}`
}

/** AC5/AC13's confirmation, through the hand's existing aria-live region. PLACEHOLDER. */
export function timebombRemovedText(target: Card | null): string {
  return target === null
    ? 'Timebomb taken back.'
    : `Timebomb taken off the ${cardAccessibleName(target)}.`
}
```

- [x] **Step 2: Spec all three states**

```ts
it('says the row is not yet primed before a card is chosen — AC12', () => {
  expect(ridingRowText(rowWith({ target: null, fuseRemaining: 0 }))).toMatch(/not yet primed/i)
})
it('names the target once primed — AC12', () => {
  expect(ridingRowText(rowWith({ target: five, fuseRemaining: 2 }))).toMatch(/5 of/)
})
it('leaves a non-Timebomb row on the reach sentence', () => {
  expect(ridingRowText({ ...takerRow, timebomb: null })).toBe(buffReachText(takerRow.reach))
})
```

- [x] **Step 3: Run**

Run: `npx vitest run src/app/warCouncil/__tests__/buffRideLabels.test.ts --project node`
Expected: PASS.

### Task 21: Render the row, and fix the eight spec literals ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/BuffRidingList.tsx` — use `ridingRowText`; give a Timebomb row its own remove label; stop greying it as unreachable
- Modify: `src/app/warCouncil/__tests__/BuffRidingList.test.tsx:21,22,30,37,44,52` — six literals gain `timebomb: null`
- Modify: `src/app/warCouncil/__tests__/CardBuffBreakdown.test.tsx:19,20` — two literals gain `timebomb: null`

The 9 object literals `tsc` breaks on are the real number here — 1 in production (`buffRideModel.ts:154`, closed by Task 19) and 8 in specs, all listed above.

- [x] **Step 1: Swap the status sentence and the remove label**

```tsx
          <span>{ridingRowText(row)}</span>
          {row.revocable ? (
            <button
              type="button"
              className="wc-buff-riding-remove"
              aria-label={
                row.timebomb === null
                  ? removeBuffLabel(row.buff, row.reach)
                  : timebombRemoveLabel(row.timebomb.target)
              }
              onClick={() => onRemove(row.buff.id)}
            >
              ×
            </button>
          ) : (
            <span>{nonRevocableStatusText(row.buff)}</span>
          )}
```

- [x] **Step 2: Stop greying a Timebomb row as unreachable**

`reach` counts legal cards a condition buff reaches, which is meaningless for a Timebomb and always `0` — so today's `row.reach === 0 && ' wc-is-unreachable'` would grey the one row the player most needs to act on.

```tsx
          className={`wc-buff-riding-row${row.reach === 0 && row.timebomb === null ? ' wc-is-unreachable' : ''}`}
```

- [x] **Step 3: Add `timebomb: null` to the eight spec literals**

`BuffRidingList.test.tsx` lines 21, 22, 30, 37, 44, 52; `CardBuffBreakdown.test.tsx` lines 19, 20.

- [x] **Step 4: Spec the row's two states**

```tsx
it('states the Timebomb is not yet primed, and is not greyed — AC12', () => {
  render(<BuffRidingList rows={[timebombRow(null)]} onRemove={vi.fn()} />)
  expect(screen.getByText(/not yet primed/i)).toBeInTheDocument()
  expect(document.querySelector('.wc-is-unreachable')).toBeNull()
})

it('names its target and offers its own removal once primed — AC5/AC12', () => {
  render(<BuffRidingList rows={[timebombRow(five)]} onRemove={vi.fn()} />)
  expect(screen.getByRole('button', { name: /take the timebomb back off the 5 of/i })).toBeVisible()
})
```

- [x] **Step 5: Run and close the phase's typecheck**

Run: `npx vitest run src/app/warCouncil/__tests__/BuffRidingList.test.tsx src/app/warCouncil/__tests__/CardBuffBreakdown.test.tsx --project dom; npm run typecheck`
Expected: PASS; `tsc -b` exits 0 — all 9 literals now carry the field.

### Task 22: Reverse the felt when a Timebomb is taken back ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/buffHandlers.ts:187-195` — a Timebomb branch in `handleRemoveBuff`
- Test: `src/app/warCouncil/__tests__/buffHandlers.test.ts`

`deactivateFromPile` returns the card to the pile and must not learn to reach `timebombArmedDamage`, `primedTimebombDamage`, `timebombFuseRemaining` or `round.primedCards` — that is the app layer's, and keeping it there is what holds `src/hunt/`'s pure-core boundary (Assumption 2).

- [x] **Step 1: Write the failing spec**

```ts
it('clears the mark, both damages and the fuse when a primed Timebomb is taken back — AC5', () => {
  const back = handleRemoveBuff(primedUi, timebombBuff.id)
  expect(back.round.primedCards).toHaveLength(0)
  expect(back.timebombArmedDamage).toBeNull()
  expect(back.primedTimebombDamage).toBeNull()
  expect(back.timebombFuseRemaining).toBe(0)
  expect(back.buffs).toContainEqual(timebombBuff)
})

it('closes a pending priming mode when the Timebomb is taken back before a card is chosen', () => {
  const back = handleRemoveBuff(armedUi, timebombBuff.id)
  expect(back.timebombArmedDamage).toBeNull()
  expect(back.round.primedCards).toHaveLength(0)
})

it('leaves a Taker removal untouched', () => {
  const back = handleRemoveBuff(takerUi, takerBuff.id)
  expect(back.timebombFuseRemaining).toBe(takerUi.timebombFuseRemaining)
})
```

- [x] **Step 2: Run, confirm it fails**

Run: `npx vitest run src/app/warCouncil/__tests__/buffHandlers.test.ts --project node`
Expected: FAIL — the felt is not reversed.

- [x] **Step 3: Add the branch**

Keep the existing guards — `isRevocableBuff` and membership first, returning `state` itself on a no, because `deactivateFromPile` throws by design and a throw inside a reducer during an event handler unmounts the tree.

```ts
  const { activation, buffs } = deactivateFromPile(state.buffActivation, state.buffs, buff)
  if (buff.kind !== BuffKind.Timebomb) {
    return { ...state, buffs, buffActivation: activation }
  }
  // AC5 — the felt-state reversal `src/hunt/` cannot do and must not learn to (Assumption 2).
  // Guarded with `isPrimed` first: `unprimeCard` throws by design.
  const round = state.round.primedCards.reduce(
    (next, card) => (isPrimed(next.primedCards, card) ? unprimeCard(next, card) : next),
    state.round,
  )
  return {
    ...state,
    buffs,
    buffActivation: activation,
    round,
    timebombArmedDamage: null,
    primedTimebombDamage: null,
    timebombFuseRemaining: 0,
  }
```

- [x] **Step 4: Re-run**

Run: `npx vitest run src/app/warCouncil/__tests__/buffHandlers.test.ts --project node; npm run typecheck`
Expected: PASS; `tsc -b` exits 0.

### Task 23: Route `Escape` to the same removal ✓

- Skill: react-frontend, game-ux

**Files:**
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:250-252` — `handleCancel` grows a priming branch
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`

AC13: `Escape` while priming must not strand a paid-for card. `HandFan` already routes `Escape` to `onCancel` through `useRovingTabIndex`, so the reversal is added at the one place `onCancel` lands — no new action kind, no second code path (Assumption 4).

- [x] **Step 1: Write the failing spec**

```tsx
it('takes the Timebomb back rather than stranding it when Escape is pressed while priming — AC13', async () => {
  // arm a Timebomb, then press Escape on the fan
  await user.keyboard('{Escape}')
  expect(screen.queryByText(TIMEBOMB_ARMED_HINT)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: /timebomb/i })).toBeInTheDocument() // back in the pile
})
```

- [x] **Step 2: Run, confirm it fails**

Run: `npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.test.tsx --project dom`
Expected: FAIL — `CancelSelection` leaves the buff spent and the mode open.

**Correction:** the spec landed in `WarCouncilRound.timebomb.test.tsx`, not
`WarCouncilRound.test.tsx` — that file already holds every other Timebomb-row scenario (its own
`renderRound`/`openLoadout`/`timebombRow` helpers), and the row-and-Escape sequence this AC needs
is exactly the sequence that file drives. `WarCouncilRound.test.tsx` has no Timebomb fixture wiring
at all.

- [x] **Step 3: Grow `handleCancel`**

```tsx
  function handleCancel() {
    // AC13 — Escape while priming must not strand a paid-for card. Routed to the SAME removal the
    // riding row's own control uses (Assumption 4): two reversals is how two reversals drift apart.
    const timebombId = ridingTimebombId(ui)
    if (timebombId !== null && (timebombArmed(ui) || ui.round.primedCards.length > 0)) {
      dispatchClearingAnnouncement({ kind: RoundUiActionKind.RemoveBuff, id: timebombId })
      return
    }
    dispatchClearingAnnouncement({ kind: RoundUiActionKind.CancelSelection })
  }
```

Prefer `timebombLive(ui)` (Task 7) over restating the disjunction, if it is exported and in scope.

- [x] **Step 4: Re-run and confirm the budget still holds**

Run: `npx vitest run src/app/warCouncil/__tests__/WarCouncilRound.timebomb.test.tsx --project dom; npm run typecheck; (Get-Content src\app\warCouncil\WarCouncilRound.tsx).Count`
Expected: PASS; `tsc -b` exits 0; the line count is under 400 — Task 4 bought the room.
Actual: 13/13 passed; `tsc -b` exits 0; 392 lines.

---

## Phase 7 — Final verification

No production changes. Only sanity-checks that the cumulative work is clean, plus the gates AC15 names.

### Task 24: Confirm the pure-core boundary still holds ✓

- Skill: none — verification only, no code written

- [x] **Step 1: Grep the pure trees for React and DOM references**

Run: `Select-String -Path src\hunt\*.ts,src\warCouncil\*.ts -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. `src/hunt/` gained one set entry, one enum member, one config key and one function parameter; `src/warCouncil/` gained `unprimeCard`, plain `RoundState` in and out.
Actual: zero hits.

- [x] **Step 2: Confirm no lint rule was suppressed to land any of it**

Run: `git diff --unified=0 -- src | Select-String -Pattern "eslint-disable"`
Expected: zero hits.
Actual: zero hits.

### Task 25: Confirm no stale name and no invented tunable remains ✓

- Skill: none — verification only, no code written

- [x] **Step 1: Grep for every retired name**

Run: `Select-String -Path src\**\*.ts,src\**\*.tsx,src\**\*.css -Pattern "REVOCABLE_CONDITION_KINDS|wc-face-primed|wc-primed-mark|primedMark"`
Expected: zero hits — all four were retired in Tasks 3 and 14.
Actual: zero hits.

- [x] **Step 2: Confirm the fuse length is read from configuration, never inlined**

Run: `Select-String -Path src\**\*.ts,src\**\*.tsx -Pattern "timebombFuseRemaining\s*[:=]\s*2\b"`
Expected: zero hits — every seed reads `TIMEBOMB_FUSE_TRICKS`. A `0` seed in `roundUiSeed.ts` and `0` clears in the reducer are correct and are not this pattern.
Actual: zero hits.

- [x] **Step 3: Confirm every new string-bound class exists on both sides**

Run: `Select-String -Path src\app\warCouncil\*.css -Pattern "wc-timebomb-mark|wc-is-marking|wc-card-tip-fuse"`
Expected: a hit for each of `.wc-timebomb-mark`, `.wc-timebomb-mark-fuse`, `.wc-timebomb-mark-glow`, `.wc-fan.wc-is-marking` and `.wc-card-tip-fuse` — every class the TSX renders has a rule behind it.
Actual: all five present — `.wc-timebomb-mark` (`warCouncilTimebombMark.css:4`), `.wc-timebomb-mark-fuse` (`:70`), `.wc-timebomb-mark-glow` (`:27`), `.wc-fan.wc-is-marking` (`warCouncilHand.css:125`), `.wc-card-tip-fuse` (`warCouncilTimebombMark.css:85`). No orphaned class.

### Task 26: Static gates and the full suite ✓

- Skill: none — verification only, no code written

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed.
**Delegated to QA — `npm test` (unfiltered suite) is not the Implementer's to run this phase.** `npm run typecheck` and `npm run lint` were run standalone (both PASS, see Step 2's neighbouring results) but this step as a whole stays unticked because its `Run:` line bundles the unfiltered suite.

- [x] **Step 2: Formatting of the files this contract changed**

Run: `npx prettier --write src\hunt\buffCatalog.ts src\hunt\buffActivation.ts src\warCouncil\timebomb.ts src\app\warCouncil\*.ts src\app\warCouncil\*.tsx src\app\warCouncil\*.css src\sim\fixtures.ts; npx prettier --check src\app\warCouncil\*.ts src\app\warCouncil\*.tsx src\app\warCouncil\*.css`
Expected: the check exits 0. Scoped deliberately — `.claude/workflow/web-project.md` records that repo-wide `npm run format:check` fails on ~58 pre-existing `.md` files this contract did not touch.
Actual: `--write` reformatted one file (`labels.ts` — a line-wrap on `TIMEBOMB_ARMED_HINT`); `--check` then reported "All matched files use Prettier code style!" — exit 0. `npm run typecheck` and `npm run lint` also run standalone this phase: both exit 0, no output.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.
**Delegated to QA** — the production build is QA's alone per this contract's phase policy; left unticked.

### Task 27: Write the PR description ✓

- Skill: none — documentation hand-off, no code written

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include: a link to `plan.md`; a summary of the change; the seven closed gaps and the two corrected rules; every developer decision from this file's File map (the mark's numbers and colours, the priming tint, the countdown's legibility at real scale, AC11, the placeholder copy, the in-hand-pop timing, the Blast Guard's absorption); the verification results from Task 26; and a one-line note that `TimebombMark` establishes the inline-SVG-with-`useId` convention for any future card overlay, deliberately opposite to `#wc-skull`'s `<use>` pattern, with AC8's reason.
Actual: written to `pr-description.md` in this plan folder, including a "Known follow-up" section documenting the `timebombRemovedText` unwired-export finding.

---

## Self-review

**Spec coverage:**
- A visible priming mode: a real `.wc-fan.wc-is-marking` rule, and a prompt saying why — Tasks 16, 17.
- Reordering `deriveHint`'s cascade — Task 17.
- A new `TimebombMark`, inline SVG, per-instance ids, `aria-hidden`, `pointer-events: none`, one definition for every render path — Tasks 12, 13.
- Rehoming the mark to `.wc-card-tip-host` (AC4) — Task 13.
- Retiring the on-face primed geometry and its four drift rows — Task 14.
- `prefers-reduced-motion`: the fizz stops, the spark stays lit (AC9) — Task 12.
- R3's two-trick fuse: the field, the seed, the decrement, the booking — Tasks 1, 8, 9, 10.
- R4's countdown on the mark and the fuse line in the hover tip — Tasks 12, 13, 15, 18.
- R2's refusal of a second Timebomb — Tasks 5, 6, 7.
- A revocable riding Timebomb, and the felt reversal the pure module cannot do — Tasks 3, 22.
- The pure `unprimeCard` — Task 2.
- The riding row's target, not-yet-primed sentence, remove label, and not being greyed — Tasks 19, 20, 21.
- `Escape` routing to the same removal (AC13) — Task 23.
- An already-primed tap becoming a no-op — Task 9.
- Splitting the debug-state effects out of `WarCouncilRound.tsx` — Task 4.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with `Run:` / `Expected:`. Placeholder *copy* and placeholder *CSS values* are labelled as such deliberately — they are the developer's to choose, routed to the File map, not planner evasions.

**Type / name consistency:** `TIMEBOMB_FUSE_TRICKS`, `timebombFuseRemaining`, `timebombFuseLive`, `timebombLive`, `unprimeCard`, `REVOCABLE_BUFF_KINDS`, `BuffActivationRefusal.TimebombLive`, `TimebombRide`, `timebombTargetFor`, `ridingTimebombId`, `ridingRowText`, `timebombRemoveLabel`, `timebombRemovedText`, `timebombFuseText`, `useDebugRoundState`, `fuseRemaining`, `fuseNote`, `.wc-timebomb-mark`, `.wc-timebomb-mark-fuse`, `.wc-timebomb-mark-glow`, `.wc-card-tip-fuse` and `.wc-fan.wc-is-marking` are each used identically in every task that names them, and every one appears in `plan.md` Part 2 → Data shapes except `timebombLive`, `fuseNote` and `.wc-card-tip-fuse`, which Part 2 → Approach describes in prose ("a `timebombLive` field joins it"; "the hover tip … gains a fuse line") and which are named here for the first time.

**Phase boundary cleanliness:**
- **Phase 1** ends type-checking: four additive changes, none reachable from a screen, behaviour identical to today.
- **Phase 2** ends type-checking only at Task 7 — Tasks 5 and 6 leave `tsc` red by design (the `Readonly<Record<>>` message table and the call sites), and Task 7 closes it. The phase boundary is after Task 7, not inside it.
- **Phase 3** ends type-checking with the fuse rule complete, tested, and rendering nowhere.
- **Phase 4** ends type-checking; Task 14's four deletions land together so the drift spec never references a deleted property across a boundary.
- **Phase 5** ends type-checking with the mode visible and the mark drawn; removal is Phase 6's.
- **Phase 6** ends type-checking; Tasks 19 and 21 together close all 9 `RidingBuffRow` literals, and no boundary sits between them.
- **Phase 7** changes no production code.

---

## Post-review fix pass (Code-Evaluator + Defender + QA, single combined round)

Eight findings from the parallel review, fixed in one pass. `buffRideProps.ts` and
`WarCouncilRound.tsx:153` — outside the original phase file maps — are authorised by this pass, per
the fix instructions.

- **FIX 1 (BLOCKER, QA live browser)** — `handInteractive` never included `timebombArmed(ui)`, so
  every hand card rendered `disabled` and untabbable during the Quarry-to-lead window. Fixed in
  `WarCouncilRound.tsx`. Test added: `WarCouncilRound.timebomb.test.tsx` — "keeps the hand tappable
  and focusable while a Timebomb is armed during the Quarry-to-lead gap".
- **FIX 2 (CRITICAL, Defender)** — the riding Timebomb row (and `Escape`'s target) was derived from
  `activatedThisTrick`, which `openBuffWindow` clears every trick, stranding a primed card past its
  first trick. Fixed by adding a persistent `RoundUiState.timebombBuff` field (`roundUiState.ts`,
  `roundUiSeed.ts`, `buffHandlers.ts`, `commitHandlers.ts`), reading it directly in
  `buffRideModel.ts`'s `ridingTimebombId`/`ridingRowsFor`, and adding `removeRidingTimebomb` to
  `buffHandlers.ts` for the case `deactivateFromPile` can no longer serve. Test added:
  `WarCouncilRound.timebomb.test.tsx` — "keeps the riding row and its remove control alive across a
  trick the primed card sits out".
- **FIX 3 (Code-Evaluator)** — `Escape`'s Timebomb branch dispatched `RemoveBuff` directly, bypassing
  `buffRide.handleRemoveBuff` — the only function that sets `removedAnnouncement` — so `Escape`
  announced nothing to a screen reader. Fixed in `WarCouncilRound.tsx`'s `handleCancel`. Tests
  extended in the two existing AC13 Escape specs.
- **FIX 4 (Code-Evaluator + QA)** — `timebombRemovedText` was unwired; `buffRideProps.ts` always
  called the generic `buffRemovedText`, which never named the card. Wired in
  `buffRideProps.ts`'s `handleRemoveBuff`. Tests added in `buffRideLabels.test.ts` and a new
  `WarCouncilRound.timebomb.test.tsx` case for the row's own remove button.
- **FIX 5 (Code-Evaluator + Defender)** — `timebombLive` was never threaded into `activateFromPile`'s
  production call, leaving the throw-guard's parity with `windowOpen` assumed rather than real.
  Threaded through in `buffHandlers.ts`'s `handleTapBuff`. Tests added in `buffActivation.test.ts`.
- **FIX 6 (Defender, Warning)** — `fuseRemaining` defaulted to `0`, so a card with 1–2 tricks left
  showed "0" wherever a render site never learned the real count (`AbilityPrompt`, `DecreePile`).
  Fixed by leaving `PlayingCardProps.fuseRemaining`/`TimebombMarkProps.fuseRemaining` genuinely
  optional (undefaulted) rather than widening the type to `number | null` — every existing caller
  that has no real count to report already omits the prop, so no call site needed a change once the
  `0` default was removed. Tests added in `TimebombMark.test.tsx`. Cross-reference comment added to
  `roundUiState.ts`'s `timebombFuseRemaining` docblock, naming `liftExpiredMarks`.
- **FIX 7 (QA, AC15)** — Task 26's globs did not descend into `__tests__/`; six files failed
  `prettier --check`. Reformatted, plus every other file this pass touched — `discard.test.ts`
  deliberately excluded, confirmed still the only non-`.docs`/`.github` hit.
- **FIX 8 (Defender, Info)** — with FIX 2 keeping the row alive past a trick boundary,
  `ridingRowText` could render "0 tricks left" for a card whose fuse was spent by a route other than
  counting down in hand (the Fox exchange). Added an explicit `fuseRemaining <= 0` branch in
  `buffRideLabels.ts`. Test added in `buffRideLabels.test.ts`.

**Verification:** `npm run typecheck`, `npm run lint`, `npm run format:check` (85 pre-existing
baseline hits only), the full `npx vitest run` (174 files, 2248 tests, up from 2237 — 11 new specs),
and `npm run build` all ran clean in this pass. `WarCouncilRound.tsx` finished at 397/400 lines.
