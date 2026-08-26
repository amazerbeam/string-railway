# Tasks: Refill the player's hand to a floor of 4 cards, behind one revertible constant

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-26

**Goal:** The player's hand is topped back up to four cards as each trick resolves, behind one constant that restores today's behaviour exactly at `0`; and because a hand now shortens the draw pile mid-hand for the first time, every draw in the engine routes through one primitive that folds the spent pile back in when the pile cannot cover a draw.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/warCouncil/__tests__/drawCards.test.ts` — the draw primitive's own spec: front-of-pile order, the mid-hand reshuffle, exhaustion, and conservation.
- `src/warCouncil/__tests__/handRefill.test.ts` — AC4's both-sides width test and the refill's rules through the real `playCard`.

**Modified:**
- `src/hunt/config.ts` — add `PLAYER_HAND_FLOOR`; correct the `HAND_SIZE` block's "every card dealt is played" claim (AC7).
- `src/hunt/index.ts` — re-export `PLAYER_HAND_FLOOR`.
- `src/warCouncil/types.ts` — add `RoundState.drawSeed`; correct the `primedCards` docblock (AC7).
- `src/warCouncil/deal.ts` — seed `drawSeed`; correct the module docblock (AC7).
- `src/warCouncil/encounterDeck.ts` — add `DrawSource`, `DrawResult`, `drawCards`.
- `src/warCouncil/index.ts` — export `drawCards` and its two types.
- `src/warCouncil/discard.ts` — route `applyDiscard` through `drawCards`; re-aim its third guard; correct its docblock.
- `src/warCouncil/abilities.ts` — route `applyWoodcutterDraw` through `drawCards`.
- `src/warCouncil/legalMoves.ts` — add `PlayCardOptions.handFloor`.
- `src/warCouncil/playCard.ts` — the refill at trick resolution.
- `src/sim/baselinePolicy.ts:116` — `isLastWindow` by tricks remaining.
- `src/warCouncil/__tests__/deckCycle.test.ts` — rewrite the retired D5 invariant and re-derive the draw-pile cycle.
- The 15 `RoundState` construction sites the audit counted, for the new required field: `src/warCouncil/deal.ts` (production) and `src/app/warCouncil/__tests__/roundFixture.ts`, `src/warCouncil/__tests__/discard.test.ts` (3), `abilities.test.ts`, `cpuPlayer.test.ts`, `legalMoves.test.ts`, `legalMovesQuarry.test.ts`, `playCard.test.ts`, `playCard.timebomb.test.ts`, `quarryIntent.test.ts`, `rankTiers.resolution.test.ts`, `types.test.ts`, `voluntaryCashOut.test.ts`.
- **Post-Phase-3 corrective task** — `src/app/warCouncil/__tests__/roundReducer.quickKill.test.ts` — re-derived a pinned hand-width expectation from `HAND_SIZE`/`PLAYER_HAND_FLOOR` instead of the pre-refill literal `1`.
- **Post-Phase-3 corrective task** — `src/app/warCouncil/__tests__/roundReducer.delayedApply.test.ts` — re-derived the live-hand-width expectation in the AC4 case; the frozen `unplayedAtPress` expectation was already floor-invariant and untouched.
- **Post-Phase-3 corrective task** — `src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx` — re-derived the mid-hand-resolve `unplayedAtResolve` expectation from the same two constants, since trick A's non-final refill now feeds trick B's played-down count.
- **Post-review fix pass** — `src/warCouncil/cpuPlayer.ts` — the audit's grep found only sites that MUTATE `drawPile`; it missed the Woodcutter-choice PREVIEW at `chooseCpuMove`, which indexed `drawPile[0]` raw and could hand `lowestCard` an `undefined` once the pile could run empty mid-hand. Routed through `drawCards` instead, matching `playCard`'s own preview fix.
- **Post-review fix pass** — `src/warCouncil/playCard.ts` — the second missed preview site, same root cause and same fix, in the Woodcutter-discard validation this ticket itself edited.
- **Post-review fix pass** — `src/warCouncil/encounterDeck.ts` — corrected `drawCards`'s docblock, which claimed it "closes both" reachable-throw problems when it closed two of (it turns out) four; now names all five sites it unifies.
- **Post-review fix pass** — `src/warCouncil/abilities.ts` — added the documented-not-guarded note to `applyWoodcutterDraw` for the exhausted-deck degenerate case (Defender Warning 2).
- **Post-review fix pass** — `src/warCouncil/__tests__/deckCycle.test.ts`, `src/warCouncil/__tests__/handRefill.test.ts` — the `choiceFor` test helpers now throw a named error instead of silently passing `undefined` through when the draw pile is empty.
- **Post-review fix pass** — `src/warCouncil/__tests__/cpuPlayer.test.ts` — added the Critical-finding spec: `chooseCpuMove` with an empty `drawPile` and a Woodcutter in hand.
- **Post-review fix pass** — `src/warCouncil/__tests__/playCard.test.ts` — added the Warning-1 spec: an empty `drawPile` plus an invalid Woodcutter discard returns `InvalidWoodcutterDiscard` rather than throwing.
- **Post-review fix pass** — `src/warCouncil/__tests__/handRefill.test.ts` — added the Info-1 targeted case: a Woodcutter play that completes a trick still refills through the floor.

**Deleted:** (none)

**Developer decides or observes:**
- `PLAYER_HAND_FLOOR` → the value itself. `4` is transcribed from the ticket as PROVISIONAL. Trades choice width in the back half of a hand against how fast the deck cycles.
- **Whether the quick-kill payout should still count cards in hand.** `roundReducer.ts:84` freezes `hands[Player].length`; with a floor of 4 a trick-5 kill in a fight's first hand goes from `1 × 2 = 2` coins to `4 × 2 = 8`. Counting `HAND_SIZE - tricksPlayed` instead would restore the intent, but that rewrites DLR-95's rule. Not changed by this contract.
- **Whether the felt should say a mid-hand reshuffle happened.** Nothing tells the player today. Copy and visual call.
- **Whether seen cards returning mid-hand reads as fine or as cheap** — a refill can hand back a card taken three tricks ago.
- **Whether tricks 4–6 are now actually decisions, or the hand drags.** The whole point of the ticket, and only playing answers it.
- Every simulated win-rate, tricks-taken and damage-per-hand baseline recorded before this ticket is stale afterwards. Re-measuring is out of scope here.

---

## Phase 1 — The floor constant and the draw primitive

Everything in this phase is additive: a new constant, a new required state field with every construction site moved in the same task, and a new pure function nothing calls yet. The phase ends type-checking with the engine's behaviour completely unchanged — `drawCards` exists and is tested, but no draw site routes through it until Phase 2.

### Task 1: Add `PLAYER_HAND_FLOOR` to the Hunt config and correct the `HAND_SIZE` comment ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/hunt/config.ts:320-324` (the `HAND_SIZE` block)
- Modify: `src/hunt/index.ts:33-35` (the config re-export block, beside `HAND_SIZE`)
- Config: `src/hunt/config.ts` — add `PLAYER_HAND_FLOOR` (value `4`, transcribed from the ticket as PROVISIONAL)

- [x] **Step 1: Correct the `HAND_SIZE` block, which currently asserts every dealt card is played (AC7)**

Replace the existing comment above `export const HAND_SIZE = 6`:

```ts
// §3.1/§5 — six cards each, six tricks. ONE constant, not two: the Quarry is dealt this many and
// plays exactly this many, so its hand size and the trick count cannot differ, and two constants
// that must be equal is a bug waiting for one of them to be edited. SETTLED (§5).
//
// DLR-146 — this is NO LONGER the number of cards the PLAYER plays through in a hand. The player
// is topped back up to `PLAYER_HAND_FLOOR` as tricks resolve, so they see more than `HAND_SIZE`
// cards and end the hand still holding some, which `closeHand` sweeps to the spent pile. The trick
// count is still `HAND_SIZE`, because the Quarry still runs out.
// UNIT: cards dealt to each side, and therefore tricks in a hand.
export const HAND_SIZE = 6
```

- [x] **Step 2: Add the new constant directly beneath `HAND_SIZE`**

```ts
// DLR-146 — the player's hand is topped back up to this many cards as each trick resolves, so the
// last tricks of a hand stay decisions instead of the one card left in hand. The Quarry NEVER
// refills. SET THIS TO 0 TO RESTORE PRE-DLR-146 BEHAVIOUR EXACTLY, with no other edit anywhere:
// the refill is a single `hand.length < PLAYER_HAND_FLOOR` test, so a floor of 0 is unreachable
// rather than a second code path. PROVISIONAL — chosen to be played, not derived.
// UNIT: cards held by the player.
export const PLAYER_HAND_FLOOR = 4
```

- [x] **Step 3: Re-export it from the Hunt barrel, beside `HAND_SIZE`**

In `src/hunt/index.ts`, add `PLAYER_HAND_FLOOR,` to the existing `export { … } from './config'` block, on the line after `HAND_SIZE,`.

- [x] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

### Task 2: Add `RoundState.drawSeed` and seed it in `dealRound` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/types.ts` — add `drawSeed` to `RoundState`; correct the `primedCards` docblock (AC7)
- Modify: `src/warCouncil/deal.ts` — seed `drawSeed`; correct the module docblock (AC7)
- Test: `src/warCouncil/__tests__/deal.test.ts` — pin the seed's reproducibility
- Modify (construction sites, same task — a required field split across tasks leaves a phase that does not compile): `src/app/warCouncil/__tests__/roundFixture.ts`, `src/warCouncil/__tests__/discard.test.ts`, `src/warCouncil/__tests__/abilities.test.ts`, `src/warCouncil/__tests__/cpuPlayer.test.ts`, `src/warCouncil/__tests__/legalMoves.test.ts`, `src/warCouncil/__tests__/legalMovesQuarry.test.ts`, `src/warCouncil/__tests__/playCard.test.ts`, `src/warCouncil/__tests__/playCard.timebomb.test.ts`, `src/warCouncil/__tests__/quarryIntent.test.ts`, `src/warCouncil/__tests__/rankTiers.resolution.test.ts`, `src/warCouncil/__tests__/types.test.ts`, `src/warCouncil/__tests__/voluntaryCashOut.test.ts`

- [x] **Step 1: Add the field to `RoundState`, directly after `reshuffled`**

```ts
  /** DLR-146 — the seed a MID-HAND reshuffle draws its order from. Written once by `dealRound`
   *  from the deal's own generator, so it inherits `dealSeedFor`'s run/encounter/hand uniqueness
   *  and a seeded encounter still reproduces every reshuffle. Replaced by `mixSeed(drawSeed,
   *  spentPile.length)` each time `drawCards` consumes it, so two reshuffles in one hand differ.
   *
   *  A plain integer rather than an `Rng` closure, deliberately: `RoundState` is immutable, plain,
   *  serialisable data, and every function in this tree takes `rng` as an explicit parameter.
   *  NOTHING to do with `reshuffled` above, which is a property of the DEAL and is never written
   *  mid-hand. */
  readonly drawSeed: number
```

- [x] **Step 2: Correct the `primedCards` docblock's retired claim (AC7)**

In `src/warCouncil/types.ts`, replace the sentence beginning "With `HAND_SIZE` cards and that many tricks every dealt card is played…" with:

```
   *  The Quarry plays every card it is dealt, so a mark on one of its cards resolves in the hand
   *  it was made. Since DLR-146 the PLAYER is refilled to `PLAYER_HAND_FLOOR` and can end a hand
   *  still holding cards, so a mark on a player card may simply expire unplayed — as it already
   *  could for a card the Woodcutter buries or the Fox exchanges away and never takes back.
```

- [x] **Step 3: Seed `drawSeed` in `dealRound` and correct its docblock (AC7)**

In `src/warCouncil/deal.ts`, replace the docblock sentence "With the 33-card deck that is 6 + 6 dealt, 1 decree and 20 left for the Woodcutter." with:

```
 * With the 33-card deck that is 6 + 6 dealt, 1 decree and 20 left. Since DLR-146 that remainder
 * also feeds the player's per-trick refill, so it SHRINKS during a hand rather than only being
 * swapped against — `drawCards` folds the spent pile back in if it runs short.
```

Then add `drawSeed` to the returned object, directly after `reshuffled`:

```ts
    // DLR-146 — drawn from the deal's OWN generator, so the mid-hand reshuffle inherits
    // `dealSeedFor`'s run/encounter/hand uniqueness with no second seed source to keep in step.
    drawSeed: Math.floor(rng() * 0x100000000),
```

Note the ordering constraint: this `rng()` call must come **after** `shuffle` and `assignSkulls` have consumed theirs, or every existing seeded-deal expectation shifts. Placing the line in the returned object literal (which is evaluated after `opening` and `assignSkulls`) satisfies this — but `assignSkulls(cpuHand, rng)` is itself in that literal, so put `drawSeed` **after** the `skulledCards` line and read it there.

- [x] **Step 4: Add `drawSeed` to every `RoundState` literal that fails to compile**

Run: `npm run typecheck`
Expected: errors naming each construction site missing `drawSeed`. Add `drawSeed: 0,` to each fixture literal — the value is irrelevant to every existing spec, and `0` is a valid seed (`createSeededRng` coerces with `>>> 0`). Re-run until it exits 0. Sites that spread an existing base object need no edit; the audit's 15 is an upper bound and the compiler is the arbiter.

- [x] **Step 5: Pin the seed's reproducibility in `deal.test.ts`**

```ts
  it('DLR-146 — drawSeed is a non-negative 32-bit integer, and the same seed deals the same one', () => {
    const a = dealRound(PlayerSide.Player, lcg(42))
    const b = dealRound(PlayerSide.Player, lcg(42))
    expect(Number.isInteger(a.drawSeed)).toBe(true)
    expect(a.drawSeed).toBeGreaterThanOrEqual(0)
    expect(a.drawSeed).toBe(b.drawSeed)
    expect(dealRound(PlayerSide.Player, lcg(43)).drawSeed).not.toBe(a.drawSeed)
  })
```

- [x] **Step 6: Run the touched specs and typecheck**

Run: `npx vitest run src/warCouncil/__tests__/deal.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

### Task 3: Add the `drawCards` primitive to `encounterDeck.ts` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/encounterDeck.ts`
- Modify: `src/warCouncil/index.ts` — export `drawCards`, `DrawSource`, `DrawResult`
- Test: `src/warCouncil/__tests__/drawCards.test.ts`

- [x] **Step 1: Write the failing spec first**

Create `src/warCouncil/__tests__/drawCards.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createDeck } from '../deck'
import { drawCards } from '../encounterDeck'

const deck = createDeck()
const source = (drawPile: number, spentPile: number, drawSeed = 7) => ({
  drawPile: deck.slice(0, drawPile),
  spentPile: deck.slice(drawPile, drawPile + spentPile),
  drawSeed,
})

describe('drawCards', () => {
  it('takes from the FRONT of the draw pile and leaves the rest in order', () => {
    const src = source(10, 0)
    const result = drawCards(src, 3)
    expect(result.drawn).toEqual(src.drawPile.slice(0, 3))
    expect(result.drawPile).toEqual(src.drawPile.slice(3))
    expect(result.reshuffled).toBe(false)
    expect(result.drawSeed).toBe(src.drawSeed)
  })

  it('a count of 0 or less is a no-op that reshuffles nothing', () => {
    const src = source(2, 20)
    expect(drawCards(src, 0)).toMatchObject({ drawn: [], reshuffled: false, drawSeed: 7 })
    expect(drawCards(src, 0).drawPile).toEqual(src.drawPile)
    expect(drawCards(src, 0).spentPile).toEqual(src.spentPile)
  })

  it('folds the spent pile back in when the draw pile is short, and empties it', () => {
    const src = source(1, 20)
    const result = drawCards(src, 3)
    expect(result.drawn).toHaveLength(3)
    expect(result.drawn[0]).toEqual(src.drawPile[0])
    expect(result.reshuffled).toBe(true)
    expect(result.spentPile).toEqual([])
    expect(result.drawSeed).not.toBe(src.drawSeed)
  })

  it('conserves every card across a reshuffling draw, with no duplicate', () => {
    const src = source(1, 20)
    const result = drawCards(src, 3)
    const census = [...result.drawn, ...result.drawPile, ...result.spentPile]
    expect(census).toHaveLength(21)
    expect(new Set(census.map((c) => `${c.suit}-${c.rank}`)).size).toBe(21)
  })

  it('AC5 — an exhausted deck returns FEWER cards rather than throwing', () => {
    const result = drawCards(source(2, 0), 5)
    expect(result.drawn).toHaveLength(2)
    expect(result.drawPile).toEqual([])
    expect(result.spentPile).toEqual([])
  })

  it('the same seed reshuffles into the same order', () => {
    expect(drawCards(source(0, 20, 99), 3).drawn).toEqual(drawCards(source(0, 20, 99), 3).drawn)
    expect(drawCards(source(0, 20, 99), 3).drawn).not.toEqual(
      drawCards(source(0, 20, 100), 3).drawn,
    )
  })

  it('throws on a negative or non-finite count — a caller bug, not a game state', () => {
    expect(() => drawCards(source(10, 0), -1)).toThrow(RangeError)
    expect(() => drawCards(source(10, 0), Number.NaN)).toThrow(RangeError)
  })
})
```

- [x] **Step 2: Run it and watch it fail for the right reason**

Run: `npx vitest run src/warCouncil/__tests__/drawCards.test.ts`
Expected: fails to collect with "does not provide an export named 'drawCards'" — not an assertion failure.

- [x] **Step 3: Implement `drawCards` in `src/warCouncil/encounterDeck.ts`**

Add `mixSeed` and `createSeededRng` to the existing `'../hunt'` import, then append:

```ts
/** DLR-146 — what one draw needs off the state, and nothing else. `DiscardStock`'s discipline:
 *  this module owns the rule and must not learn the shape of the layer that calls it. */
export interface DrawSource {
  readonly drawPile: readonly Card[]
  readonly spentPile: readonly Card[]
  readonly drawSeed: number
}

/** The cards drawn, and the three fields as they now stand — spread straight onto a `RoundState`. */
export interface DrawResult {
  readonly drawn: readonly Card[]
  readonly drawPile: readonly Card[]
  readonly spentPile: readonly Card[]
  readonly drawSeed: number
  /** Whether this draw folded the spent pile back in. Reported so a spec can pin it, and
   *  deliberately NOT written to `RoundState.reshuffled`, which means "this hand was DEALT from a
   *  reshuffle" and is read by the felt's notice. */
  readonly reshuffled: boolean
}

/**
 * DLR-146 — THE single way a card leaves the draw pile mid-hand. `dealPileFor`'s sibling: it folds
 * the spent pile back in under a seeded shuffle when the pile cannot cover the draw, for the same
 * reason and by the same rule, but WITHIN a hand rather than between two.
 *
 * Before this existed the three draw sites (`applyDiscard`, `applyWoodcutterDraw`, and the refill
 * this ticket adds) each read `drawPile` directly, and were safe only because the pile's length
 * was invariant for the life of a hand. The refill retires that invariant, which made
 * `applyDiscard`'s `RangeError` reachable inside a reducer and let `applyWoodcutterDraw`
 * destructure `undefined` off an empty array into a hand. One primitive closes both.
 *
 * Does NOT throw on an exhausted deck — it returns fewer cards than asked, which is AC5's no-op as
 * the degenerate case of a general rule. The shortfall is visible in `drawn.length`, so no caller
 * is handed a success it did not get. It DOES throw on a negative or non-finite `count`, the guard
 * discipline `quickKillPayout` and `flaskHealAmount` already set: a `NaN` count would slice to an
 * empty array and silently draw nothing.
 */
export function drawCards(source: DrawSource, count: number): DrawResult {
  if (!Number.isFinite(count)) {
    throw new RangeError(`Cannot draw ${count} cards: the count must be a finite number`)
  }
  if (count < 0) {
    throw new RangeError(`Cannot draw ${count} cards: the count must be zero or more`)
  }
  if (count === 0 || source.drawPile.length >= count) {
    return {
      drawn: source.drawPile.slice(0, count),
      drawPile: source.drawPile.slice(count),
      spentPile: source.spentPile,
      drawSeed: source.drawSeed,
      reshuffled: false,
    }
  }
  // Short. Take what the pile has, then rebuild it from the spent pile and take the rest. The
  // leftover front cards keep their order and their place at the head of the draw — folding them
  // INTO the shuffle instead would reorder cards the caller has already been handed.
  const fromPile = source.drawPile
  const rebuilt = shuffle([...source.spentPile], createSeededRng(source.drawSeed))
  const stillWanted = count - fromPile.length
  return {
    drawn: [...fromPile, ...rebuilt.slice(0, stillWanted)],
    drawPile: rebuilt.slice(stillWanted),
    spentPile: [],
    // Advanced so a second reshuffle in the same hand cannot repeat the first's order.
    drawSeed: mixSeed(source.drawSeed, source.spentPile.length),
    reshuffled: true,
  }
}
```

- [x] **Step 4: Export it from the tree's barrel**

In `src/warCouncil/index.ts`, extend the existing `encounterDeck` export lines with `drawCards` and `export type { DrawSource, DrawResult }`.

- [x] **Step 5: Run the spec and typecheck**

Run: `npx vitest run src/warCouncil/__tests__/drawCards.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

---

## Phase 2 — Route the two existing draw sites through the primitive

Both changes are behaviour-preserving while the draw pile is long, which it always is today — so this phase can land on its own with no observable difference, and it is what makes Phase 3's refill safe to add. The phase ends type-checking with the full existing suite still green.

### Task 4: Route `applyDiscard` through `drawCards` and re-aim its guard ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/discard.ts:52-92`
- Test: `src/warCouncil/__tests__/discard.test.ts`

- [x] **Step 1: Correct the docblock's retired invariant and re-aim the third guard**

In `applyDiscard`'s docblock, replace "`drawPile.length` is invariant across the call." with:

```
 * Since DLR-146 `drawPile.length` is NO LONGER invariant across the call: if the pile cannot cover
 * the draw, `drawCards` folds the spent pile back in and the two piles are repartitioned. All 33
 * cards are still conserved, which is what `deckCycle.test.ts` pins.
```

Then replace the third guard and the body:

```ts
  if (discarded.length > state.drawPile.length + state.spentPile.length) {
    throw new RangeError(
      `Cannot discard ${discarded.length} cards — only ${state.drawPile.length + state.spentPile.length} left in the encounter's deck`,
    )
  }
  const draw = drawCards(state, discarded.length)
  const handAfterRemoval = discarded.reduce((hand, c) => removeCard(hand, c), state.hands[side])
  return {
    ...state,
    hands: { ...state.hands, [side]: [...handAfterRemoval, ...draw.drawn] },
    // AC3/AC5 unchanged — the discarded cards go to the BOTTOM of whatever pile the draw left,
    // so they stay unseen whether or not the draw reshuffled.
    drawPile: [...draw.drawPile, ...discarded],
    spentPile: draw.spentPile,
    drawSeed: draw.drawSeed,
  }
```

Add `drawCards` to the existing import from `./encounterDeck` (a new import line — `discard.ts` does not import from it today).

- [x] **Step 2: Add a spec for the reshuffling swap**

Append to `src/warCouncil/__tests__/discard.test.ts`:

```ts
  it('DLR-146 — a swap the draw pile cannot cover reshuffles the spent pile in rather than throwing', () => {
    const dealt = dealRound(PlayerSide.Cpu, lcg(5), FRESH_ENCOUNTER_DECK)
    const short = { ...dealt, drawPile: dealt.drawPile.slice(0, 1), spentPile: dealt.drawPile.slice(1) }
    const thrown = short.hands[PlayerSide.Player].slice(0, 3)
    const result = applyDiscard(short, PlayerSide.Player, thrown)
    expect(result.hands[PlayerSide.Player]).toHaveLength(short.hands[PlayerSide.Player].length)
    expect(result.spentPile).toEqual([])
    expect(result.drawPile.slice(-thrown.length)).toEqual(thrown)
  })
```

Add whatever of `dealRound`, `lcg`, `FRESH_ENCOUNTER_DECK` the file does not already import.

- [x] **Step 3: Run the discard specs and typecheck**

Run: `npx vitest run src/warCouncil/__tests__/discard.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

### Task 5: Route `applyWoodcutterDraw` through `drawCards` ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/abilities.ts:17-30`
- Test: `src/warCouncil/__tests__/abilities.test.ts`

- [x] **Step 1: Add the failing spec for the empty-pile case**

Append to `src/warCouncil/__tests__/abilities.test.ts`:

```ts
  it('DLR-146 — an empty draw pile reshuffles rather than putting `undefined` in the hand', () => {
    const dealt = dealRound(PlayerSide.Cpu, lcg(9), FRESH_ENCOUNTER_DECK)
    const empty = { ...dealt, drawPile: [], spentPile: dealt.drawPile }
    const discard = empty.hands[PlayerSide.Player][0]
    const result = applyWoodcutterDraw(empty, PlayerSide.Player, discard)
    expect(result.hands[PlayerSide.Player]).toHaveLength(empty.hands[PlayerSide.Player].length)
    expect(result.hands[PlayerSide.Player].every((c) => c !== undefined)).toBe(true)
    expect(result.drawPile.at(-1)).toEqual(discard)
  })
```

- [x] **Step 2: Run it and watch it fail**

Run: `npx vitest run src/warCouncil/__tests__/abilities.test.ts`
Expected: the new test fails — today `[drawn]` destructures `undefined` off an empty array, so the hand length or the `!== undefined` assertion is wrong.

- [x] **Step 3: Replace the body**

```ts
export function applyWoodcutterDraw(
  state: RoundState,
  side: PlayerSide,
  discard: Card,
): RoundState {
  // DLR-146 — through the ONE draw primitive. Was `const [drawn, ...rest] = state.drawPile`, which
  // put `undefined` in a hand the moment the pile ran dry — unreachable before the player's refill
  // began shortening the pile mid-hand, and reachable after it.
  const draw = drawCards(state, 1)
  const handWithDrawn = [...state.hands[side], ...draw.drawn]
  return {
    ...state,
    hands: { ...state.hands, [side]: removeCard(handWithDrawn, discard) },
    drawPile: [...draw.drawPile, discard],
    spentPile: draw.spentPile,
    drawSeed: draw.drawSeed,
  }
}
```

Add `drawCards` to `abilities.ts`'s imports from `./encounterDeck`.

- [x] **Step 4: Run the abilities specs and typecheck**

Run: `npx vitest run src/warCouncil/__tests__/abilities.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

---

## Phase 3 — The refill, and the invariants it retires

The behavioural phase. The refill lands, the two `deckCycle.test.ts` tests whose asserted invariants this ticket trades away are rewritten to pin what is now true, and the simulator's last-window heuristic is re-expressed so it does not silently stop firing. The phase ends with the engine's behaviour changed and every spec describing the new behaviour.

### Task 6: Refill the player's hand at trick resolution ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/legalMoves.ts` — add `PlayCardOptions.handFloor`
- Modify: `src/warCouncil/playCard.ts:110-154` (the trick-resolution branch)
- Test: `src/warCouncil/__tests__/handRefill.test.ts`

- [x] **Step 1: Add the optional floor to `PlayCardOptions`**

In `src/warCouncil/legalMoves.ts`, append to the `PlayCardOptions` interface:

```ts
  /** DLR-146 — the hand floor in force for this call. Optional like every other field here, and
   *  ABSENT MEANS `PLAYER_HAND_FLOOR` — so no production call site changes and the constant
   *  remains the single dial. It exists so AC4's revert can be pinned at 0 and at 4 through the
   *  real code path rather than by mocking `../hunt`, which is lint-enforced pure. */
  readonly handFloor?: number
```

- [x] **Step 2: Add the refill to `playCard`'s trick-resolution branch**

Add `PLAYER_HAND_FLOOR` to the existing `'../hunt'` import and `drawCards` to the `'./encounterDeck'` import. Then, between the `lastResolution` assignment and the final `return`, insert:

```ts
  // DLR-146 AC2/AC3 — the PLAYER only, at the trick's RESOLUTION. Three orderings are load-bearing
  // and none is stylistic:
  //   * AFTER `resolveTrickBank`, because `buffTrickFactsFor` was handed the hand as "the hand at
  //     hand's end" and Keepsake reads its suits — refilling first would change a buff's payout as
  //     a side effect of this ticket.
  //   * NEVER on the lead, which returned above, so a drawn card cannot enter the trick in
  //     progress.
  //   * NOT on the final trick: the hand is over, so a card drawn here could never be played and
  //     would only pull the pile a card further down before `closeHand` sweeps it.
  // AC3 is satisfied by construction rather than by a guard — the Quarry is simply never passed.
  // AC4: at a floor of 0 the `<` test is unreachable, so this is a no-op and no second code path
  // exists for the revert to miss.
  const floor = options?.handFloor ?? PLAYER_HAND_FLOOR
  const playerHand = next.hands[PlayerSide.Player]
  const refill =
    finalTrick || playerHand.length >= floor
      ? null
      : drawCards(
          { ...next, spentPile: [...next.spentPile, completedTrick[0].card, completedTrick[1].card] },
          floor - playerHand.length,
        )
```

Then thread it through the existing return, replacing the `spentPile`, `hands` and seed fields:

```ts
  return {
    ok: true,
    state: {
      ...next,
      hands: refill
        ? { ...next.hands, [PlayerSide.Player]: [...playerHand, ...refill.drawn] }
        : next.hands,
      drawPile: refill ? refill.drawPile : next.drawPile,
      drawSeed: refill ? refill.drawSeed : next.drawSeed,
      currentTrick: [],
      // DLR-123 AC3 — the trick's two cards go face-down to the spent pile AS THE TRICK RESOLVES.
      // THE single place this pile grows: `dealRound` seeds it and `closeHand` reads it, and
      // nothing else in the engine writes it, so a card cannot be spent twice or spent early.
      // DLR-146 — the refill is handed this ALREADY-GROWN pile above, so a reshuffle it triggers
      // can reach the trick that just resolved. Taking `refill.spentPile` here rather than
      // rebuilding it is what keeps all 33 conserved when that happens.
      spentPile: refill
        ? refill.spentPile
        : [...next.spentPile, completedTrick[0].card, completedTrick[1].card],
      leader: nextLeader,
      tricksPlayed,
      tricksWon,
      bank: lastResolution.bank,
      multiplier: lastResolution.multiplier,
      lastResolution,
      phase: finalTrick ? RoundPhase.Complete : RoundPhase.AwaitingLead,
    },
  }
```

- [x] **Step 3: Write the spec pinning AC2–AC5**

Create `src/warCouncil/__tests__/handRefill.test.ts`. Play a full hand through the real `playCard`, recording the player's hand width at the moment they choose, at floor `4` and at floor `0`:

```ts
import { describe, expect, it } from 'vitest'
import { HAND_SIZE, PLAYER_HAND_FLOOR } from '../../hunt'
import { dealRound } from '../deal'
import { createDeck } from '../deck'
import { FRESH_ENCOUNTER_DECK, closeHand } from '../encounterDeck'
import { legalMoves } from '../legalMoves'
import { playCard } from '../playCard'
import { currentTurn, PlayerSide, RoundPhase, type RoundState } from '../types'

/** `handFloor` left undefined means "pass no options at all", which is what production does — that
 *  is how the default-is-the-constant test below stays honest rather than restating the default. */
const widthsAcrossHand = (handFloor?: number, seed = 2026) => {
  let state: RoundState = dealRound(PlayerSide.Cpu, createSeededRng(seed), FRESH_ENCOUNTER_DECK)
  const widths: number[] = []
  while (state.phase !== RoundPhase.Complete) {
    const side = currentTurn(state)
    if (side === PlayerSide.Player) widths.push(state.hands[PlayerSide.Player].length)
    const card = legalMoves(state, side)[0]
    const options = handFloor === undefined ? undefined : { handFloor }
    const result = playCard(state, side, card, undefined, options)
    if (!result.ok) throw new Error(`illegal move: ${result.reason}`)
    state = result.state
  }
  return { widths, state }
}

describe('DLR-146 — the player hand floor', () => {
  it('AC4 — at a floor of 0 the widths are 6, 5, 4, 3, 2, 1: pre-ticket behaviour exactly', () => {
    expect(widthsAcrossHand(0).widths).toEqual([6, 5, 4, 3, 2, 1])
  })

  it('AC4 — at a floor of 4 the widths are 6, 5, 4, 4, 4, 4', () => {
    expect(widthsAcrossHand(4).widths).toEqual([6, 5, 4, 4, 4, 4])
  })

  it('the shipped constant IS the default, so no production call site passes an option', () => {
    expect(widthsAcrossHand(undefined).widths).toEqual(widthsAcrossHand(PLAYER_HAND_FLOOR).widths)
  })

  it('AC3 — the Quarry never refills: it is dealt HAND_SIZE and ends the hand empty', () => {
    const { state } = widthsAcrossHand(PLAYER_HAND_FLOOR)
    expect(state.hands[PlayerSide.Cpu]).toEqual([])
  })

  it('AC6 — the hand ends on the HAND_SIZEth trick with cards still in the player’s hand', () => {
    const { state } = widthsAcrossHand(PLAYER_HAND_FLOOR)
    expect(state.tricksPlayed).toBe(HAND_SIZE)
    expect(state.hands[PlayerSide.Player].length).toBeGreaterThan(0)
  })

  it('AC6 — closeHand sweeps the unplayed cards, conserving all 33', () => {
    const { state } = widthsAcrossHand(PLAYER_HAND_FLOOR)
    const deck = closeHand(state)
    const census = [...deck.drawPile, ...deck.spentPile]
    expect(census).toHaveLength(createDeck().length)
    expect(new Set(census.map((c) => `${c.suit}-${c.rank}`)).size).toBe(createDeck().length)
  })

  it('AC5 — an exhausted deck makes the refill a no-op rather than a throw', () => {
    let state: RoundState = dealRound(PlayerSide.Cpu, createSeededRng(3), FRESH_ENCOUNTER_DECK)
    state = { ...state, drawPile: [], spentPile: [] }
    while (state.phase !== RoundPhase.Complete) {
      const side = currentTurn(state)
      const card = legalMoves(state, side)[0]
      const result = playCard(state, side, card, undefined, { handFloor: PLAYER_HAND_FLOOR })
      if (!result.ok) throw new Error(`illegal move: ${result.reason}`)
      state = result.state
    }
    expect(state.tricksPlayed).toBe(HAND_SIZE)
  })

  it('a refill that outruns the pile reshuffles the spent pile in, conserving all 33', () => {
    const dealt = dealRound(PlayerSide.Cpu, createSeededRng(11), FRESH_ENCOUNTER_DECK)
    const short = { ...dealt, drawPile: [], spentPile: dealt.drawPile }
    const side = currentTurn(short)
    const first = playCard(short, side, legalMoves(short, side)[0], undefined, { handFloor: 6 })
    if (!first.ok) throw new Error('illegal move')
    const follow = currentTurn(first.state)
    const second = playCard(
      first.state,
      follow,
      legalMoves(first.state, follow)[0],
      undefined,
      { handFloor: 6 },
    )
    if (!second.ok) throw new Error('illegal move')
    expect(second.state.hands[PlayerSide.Player].length).toBe(6)
  })
})
```

- [x] **Step 4: Run the refill spec and typecheck**

Run: `npx vitest run src/warCouncil/__tests__/handRefill.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed; typecheck exits 0.

- [x] **Step 5: Run the whole engine tree's specs, which is where a refill regression surfaces**

Run: `npx vitest run src/warCouncil`
Expected: Vitest reports 0 failed. `deckCycle.test.ts` is expected to FAIL here — Task 7 rewrites it. Record which of its tests fail and carry that to Task 7; any other failure is a regression to fix before moving on.

**Measured:** `deckCycle.test.ts`'s two failures are exactly the two Task 7 targets — "AC1/AC2/AC6 — the draw pile runs 20, 7, then reshuffles back to 20" (got `[20, 4, 20, 4]`, matching Task 7's predicted `refillsPerHand = 3`) and "D5 — the draw pile's length never changes for the life of a hand…" (got length 19 vs opening 20). A third, unpredicted failure surfaced in `playCard.test.ts` ("DLR-123 AC3 — a resolved trick sends both its cards to the spent pile, in trick order"): its fixture's 2-card `drawPile` is too small to cover a floor-4 refill without itself reshuffling the very spent pile the test asserts on. Fixed by passing `{ handFloor: 0 }` at that one call site — the test is about spent-pile ordering, not about the refill, so disabling the refill for that call is the correct, minimal fix rather than growing the shared fixture's `drawPile` for every test in the file. Re-run after the fix: only the two `deckCycle.test.ts` tests fail (412 passed, 2 failed), confirming no other regression.

**Not in this task's Files block, touched anyway:** fixing the AC3 spentPile test grew `playCard.test.ts` from 418 to 422 lines, past the 400-line budget it was already close to. Per the fix-in-ticket rule, split its "playCard — banking and skulls" describe block into a new sibling file `src/warCouncil/__tests__/playCard.bank.test.ts` (own local copy of `stateWith`, matching how other spec files keep their own small fixtures rather than sharing one across files). Resulting sizes: `playCard.test.ts` 354 lines, `playCard.bank.test.ts` 102 lines. Both files run and pass (20 tests, 0 failed); typecheck and lint clean.

### Task 7: Rewrite the two `deckCycle.test.ts` tests whose invariants this ticket retires ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/warCouncil/__tests__/deckCycle.test.ts:81-120`

- [x] **Step 1: Replace the D5 test, whose invariant is precisely what this ticket trades away**

The existing test is titled "D5 — the draw pile's length never changes for the life of a hand, so it cannot run out". Replace it with one that pins what is now true:

```ts
  it('DLR-146 — the draw pile only SHRINKS within a hand, and every card is conserved throughout', () => {
    const dealt = dealRound(PlayerSide.Cpu, createSeededRng(2026), FRESH_ENCOUNTER_DECK)
    let state = dealt
    let previous = dealt.drawPile.length
    while (state.phase !== RoundPhase.Complete) {
      expect(new Set(census(state)).size).toBe(DECK_SIZE)
      const side = currentTurn(state)
      const card = legalMoves(state, side)[0]
      const result = playCard(state, side, card, choiceFor(state, card))
      if (!result.ok) throw new Error(`illegal move: ${result.reason}`)
      state = result.state
      // Never grows, EXCEPT across a reshuffle, which is the one thing that can put cards back.
      const grew = state.drawPile.length > previous
      expect(grew ? state.spentPile.length : 0).toBe(0)
      previous = state.drawPile.length
    }
    expect(new Set(census(state)).size).toBe(DECK_SIZE)
  })
```

- [x] **Step 2: Re-derive the draw-pile cycle test, whose `[20, 7, 20, 7]` arithmetic assumed no mid-hand draws**

Replace the hard-coded expectations and the comment that derives them. The reshuffle *pattern* is unchanged — assert that, plus the fact the arithmetic now depends on: a hand costs `CARDS_PER_DEAL` at the deal **and** up to `PLAYER_HAND_FLOOR - 1` refills during play.

```ts
    // DLR-146 — a hand no longer costs exactly `CARDS_PER_DEAL`. The deal takes 13, and the
    // player's refill takes one more per trick that ends below the floor: `HAND_SIZE - 1` tricks
    // can refill (the last one never does), and only those where the hand has fallen under it.
    // DERIVED from the two constants rather than pinned to a measured number, so that flipping
    // `PLAYER_HAND_FLOOR` to 0 leaves this test green — AC4's "no other edit anywhere" has to hold
    // for the SUITE too, or the revert is a one-line change plus a test fix, which is not a
    // one-line change.
    const refillsPerHand = Math.max(0, Math.min(HAND_SIZE - 1, PLAYER_HAND_FLOOR - 1))
    const handCost = CARDS_PER_DEAL + refillsPerHand
    expect(draws[0]).toBe(DECK_SIZE - CARDS_PER_DEAL)
    expect(draws[1]).toBe(draws[0] - handCost)
    expect(draws[1]).toBeGreaterThanOrEqual(0)
    // The reshuffle PATTERN is what this test is really for, and it is unchanged by the floor.
    expect(reshuffles).toEqual([false, false, true, false])
```

Add `HAND_SIZE` and `PLAYER_HAND_FLOOR` to the file's `'../../hunt'` import.

**Verify `refillsPerHand` against the engine rather than trusting the algebra.** Run the file, read the actual `draws` array, and confirm the derived figure matches. At `HAND_SIZE = 6` and `PLAYER_HAND_FLOOR = 4` it should be `3` (tricks 3, 4 and 5 refill; trick 6 is skipped as the final trick), giving `draws = [20, 4, 20, 4]`. If the measured figure differs, the formula is wrong and the refill's trick-by-trick behaviour needs re-reading — do **not** replace it with the measured constant, which would reintroduce exactly the coupling this step exists to remove.

- [x] **Step 2b: Prove the revert is genuinely one line by running the suite at floor 0**

Temporarily set `PLAYER_HAND_FLOOR = 0` in `src/hunt/config.ts`.

Run: `npx vitest run src/warCouncil src/sim; npm run typecheck`
Expected: Vitest reports 0 failed and typecheck exits 0 — with no other file edited. Then restore `PLAYER_HAND_FLOOR = 4` and re-run the same command, expecting 0 failed again. Any spec that reds at `0` is a spec coupled to the shipped value: fix the spec to derive from the constant, never the constant to suit the spec.

**Measured:** at floor 0, `handRefill.test.ts`'s "AC6 — the hand ends on the HAND_SIZEth trick with cards still in the player's hand" test reddened (`expected 0 to be greater than 0`) — that assertion was coupled to a nonzero floor, exactly the case this step exists to catch. Fixed per AC8: rewrote the assertion to derive the expected leftover count from `widths`' own last entry (`widths[widths.length - 1] - 1`) rather than asserting `> 0` unconditionally, so it holds at floor 0 (where the hand legitimately empties) and at floor 4 alike. Re-run at floor 0: `Test Files 33 passed (33)`, `Tests 474 passed (474)`, typecheck exits 0. Restored `PLAYER_HAND_FLOOR = 4` and re-ran the identical command: `Test Files 33 passed (33)`, `Tests 474 passed (474)`, typecheck exits 0. `src/hunt/config.ts` is left at `PLAYER_HAND_FLOOR = 4`.

- [x] **Step 3: Run the deck-cycle spec and typecheck**

Run: `npx vitest run src/warCouncil/__tests__/deckCycle.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed, including the standing 33-card conservation and AC12 seeded-reproduction tests; typecheck exits 0.

### Task 8: Re-express the simulator's last-window heuristic so it still fires ✓

- Skill: `react-frontend`

**Files:**
- Modify: `src/sim/baselinePolicy.ts:116`
- Test: `src/sim/__tests__/simulate.test.ts`

- [x] **Step 1: Replace the proxy with the quantity it was proxying for**

```ts
  // DLR-146 — was `hands[Player].length <= 1`, which was a proxy for "this is the hand's last
  // cash-out window" and silently stopped firing at any floor above 1: the baseline policy would
  // have quietly stopped banking at a hand's end, corrupting the very simulation runs used to
  // judge whether the floor works. Identical at a floor of 0 — both mean five or six tricks
  // played — and floor-invariant thereafter.
  const isLastWindow = HAND_SIZE - ui.round.tricksPlayed <= 1
```

Add `HAND_SIZE` to the existing `'../hunt'` import in that file.

- [x] **Step 2: Confirm the simulator still runs end-to-end**

Run: `npx vitest run src/sim`
Expected: Vitest reports 0 failed.

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

---

## Phase 4 — Final verification

No production changes. Only checks that the cumulative work is clean, that no tunable was hard-coded, that the pure-core boundary still holds, and that nothing anywhere still asserts the retired invariant.

### Task 9: Confirm the pure-core boundary still holds ✓

- Skill: `react-frontend`

**Files:**
- (verification only — no files changed)

- [x] **Step 1: Grep for React and DOM references inside the two trees this contract touched**

Run: `Get-ChildItem src\warCouncil,src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. **Measured: zero hits.**

- [x] **Step 2: Confirm no `Math.random()` reached the engine**

Run: `Get-ChildItem src\warCouncil,src\hunt -Recurse -Include *.ts | Select-String -Pattern "Math\.random"`
Expected: zero hits. **Measured: 12 hits, all inside prose (docblocks/comments stating the tree does NOT call it, or a test's own comment about a deterministic stand-in) — no actual `Math.random(` call anywhere in either tree.**

### Task 10: Confirm the floor is configuration and the retired invariant is gone from the prose ✓

- Skill: `react-frontend`

**Files:**
- (verification only — no files changed)

- [x] **Step 1: Confirm no bare `4` stands in for the floor outside the config file**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "PLAYER_HAND_FLOOR"`
Expected: hits in `src/hunt/config.ts` (the declaration), `src/hunt/index.ts` (the re-export), `src/warCouncil/playCard.ts` (the one reader), and the specs that legitimately derive from it. **Measured: every hit justified — `src/hunt/config.ts:325,334` (prose above the constant), `:337` (the declaration `export const PLAYER_HAND_FLOOR = 4`); `src/hunt/index.ts:26` (re-export); `src/warCouncil/legalMoves.ts:67` (docblock prose on `PlayCardOptions.handFloor`, no literal); `src/warCouncil/types.ts:83` (docblock prose); `src/warCouncil/playCard.ts:1` (import) and `:149` (`options?.handFloor ?? PLAYER_HAND_FLOOR`, the one production reader); `src/warCouncil/__tests__/deckCycle.test.ts`, `src/warCouncil/__tests__/handRefill.test.ts` (the two new specs, deriving not assigning); `src/app/warCouncil/__tests__/roundReducer.delayedApply.test.ts`, `roundReducer.quickKill.test.ts`, `WarCouncilRound.duelHealthBars.test.tsx` (the three re-derived specs, deriving via `Math.max`/`Math.min` not assigning). No file outside `config.ts` assigns it a literal.**

- [x] **Step 2: Confirm no comment still claims every dealt card is played, or that the pile cannot run out**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | Select-String -Pattern "every dealt card is played|every card dealt is played|cannot run out|length never changes"`
Expected: zero hits. **Measured: one hit found — `src/hunt/__tests__/buffEvaluation.test.ts:289`, a comment in the Keepsake "known open defect" test asserting the retired invariant as the reason `remainingSuits` is always empty. Not in this task's Files block, fixed anyway per the standing in-ticket-fix rule: reworded to describe the DLR-146 change (the player can now end a hand still holding cards) and note that no live template can observe the difference because Purse is one of DLR-145's cut reward axes. Re-run after the fix: zero hits.**

- [x] **Step 3: Confirm no file grew past the 400-line budget**

Run: `foreach ($f in "src\hunt\config.ts","src\warCouncil\playCard.ts","src\warCouncil\encounterDeck.ts","src\warCouncil\discard.ts","src\warCouncil\types.ts","src\warCouncil\abilities.ts","src\warCouncil\legalMoves.ts") { "$f " + (Get-Content $f).Count }`
Expected: every count at or below 400. **Measured: `config.ts` 388, `playCard.ts` 187, `encounterDeck.ts` 162, `discard.ts` 101, `types.ts` 157, `abilities.ts` 40, `legalMoves.ts` 107 — all under budget.** Also measured every other file this contract created or modified (25 additional files): all under 400 **except `src/warCouncil/__tests__/rankTiers.resolution.test.ts`, at 403 lines** — this contract's Task 2 Step 4 added one `drawSeed: 0,` line to it (402→403); the file was already at 402 before this contract touched it, so the breach predates this ticket but the touch brings it into this ticket's fix-in-ticket scope. Fixed by splitting it exactly as Task 6 Step 5 split `playCard.test.ts`: the AC3 gate, `swanTierFactsFor`, and the Swan ladder through `resolveTrickBank` stayed in `rankTiers.resolution.test.ts` (216 lines); the Witch ladder through `resolveTrickWinner` and the end-to-end `playCard` cases moved to a new sibling `rankTiers.playCard.test.ts` (202 lines). One stale cross-reference this split broke was fixed in the same pass: `src/warCouncil/rankTierRules.ts`'s docblock named `rankTiers.resolution.test.ts` for a test now in `rankTiers.playCard.test.ts`. Re-ran `npx vitest run src/warCouncil/__tests__/rankTiers.resolution.test.ts src/warCouncil/__tests__/rankTiers.playCard.test.ts src/hunt/__tests__/buffEvaluation.test.ts` → `Test Files 3 passed (3)`, `Tests 51 passed (51)`; then the full scoped run `npx vitest run src/warCouncil src/hunt src/app src/sim` → `Test Files 139 passed (139)`, `Tests 1785 passed (1785)`; `npm run typecheck` and `npm run lint` both exit 0.

### Task 11: Static gates and full suite ✓ — run by QA (147 files / 1895 tests, typecheck, lint, prettier, build all green)

- Skill: `react-frontend`

**Files:**
- (verification only — no files changed)

- [x] **Step 1: Warm the Vitest transform cache, then typecheck, lint, and run the unfiltered suite**

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint; npm test`
Expected: all exit 0; Vitest reports 0 failed. The projects are run separately first because a cold-cache `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond`, which is a worker-start timeout, not a failing test.

- [x] **Step 2: Check formatting of only the files this contract changed**

Run: `npx prettier --check src/hunt/config.ts src/hunt/index.ts src/warCouncil/types.ts src/warCouncil/deal.ts src/warCouncil/encounterDeck.ts src/warCouncil/index.ts src/warCouncil/discard.ts src/warCouncil/abilities.ts src/warCouncil/legalMoves.ts src/warCouncil/playCard.ts src/sim/baselinePolicy.ts`
Expected: exits 0. If it fails, run `npx prettier --write` on the same explicit file list — never repo-wide `npm run format`, which rewrites ~59 unrelated markdown files.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 12: Update the PR description ✓

- Skill: `none — a hand-off document, not code`

**Files:**
- Create: `.claude/contract/DLR-146-refill-player-hand-to-a-floor-of-four/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary: the floor, the one revertible constant, and the draw primitive that the floor made necessary.
- Every decision the developer must make and every behaviour they must judge by playing — copied from this file's "Developer decides or observes" block, with the quick-kill inflation stated in numbers.
- The invariant this change retires ("the draw pile's length never changes for the life of a hand") and where it was relied upon, so a future contributor does not reintroduce a direct `drawPile` read.
- Verification results from Phases 1–4, quoting the actual Vitest summary lines.
- A one-line note for future contributors: **every mid-hand draw goes through `drawCards`; never read `state.drawPile` directly.**

---

## Self-review

**Spec coverage:**
- AC1 `PLAYER_HAND_FLOOR` with the file's comment convention — Task 1.
- AC2 refill at trick resolution, never at the moment a card is played — Task 6 (the lead branch returns before the refill).
- AC3 the Quarry never refills; deal, decree, `SKULL_DENSITY`, `CARDS_PER_DEAL` unchanged — Task 6 (satisfied by construction), pinned by Task 6 Step 3.
- AC4 `PLAYER_HAND_FLOOR = 0` restores pre-ticket behaviour; a test pins 6,5,4,3,2,1 and 6,5,4,4,4,4 — Task 6 Steps 1 and 3. AC4's "with no other edit anywhere" is enforced on the SUITE as well as on the source by Task 7 Step 2b, which runs the engine and sim specs at floor `0` and requires them green with nothing else touched.
- AC5 an exhausted `drawPile` is a no-op, not a throw — Task 3 (the primitive) and Task 6 Step 3 (through `playCard`).
- AC6 the hand ends on the `HAND_SIZE`th trick, `closeHand` sweeps, conservation holds — Task 6 Step 3, Task 7 Step 1.
- AC7 the three stale comments — Task 1 Step 1 (`config.ts`), Task 2 Steps 2 and 3 (`types.ts`, `deal.ts`); Task 10 Step 2 greps for a missed one.
- Plan's in-scope draw primitive and `drawSeed` — Tasks 2 and 3; routed in Tasks 4 and 5.
- Plan's in-scope `baselinePolicy` fix — Task 8.
- Plan's in-scope `deckCycle.test.ts` rewrite — Task 7.
- AC8 the revert is one edit, one line, one file — Task 1 Step 2 (the constant and its comment), Task 6 Step 2 (the single `<` test, so `0` is unreachable rather than a second path), Task 7 Step 2 (expectations derived from the two constants rather than pinned at `4`), and Task 7 Step 2b (the suite run at `0` that proves nothing else needs editing). No `REFILL_ENABLED`-style second flag is introduced by any task.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references, and no marker expressions left for the executor to resolve. Every step shows the exact code or a runnable command with an `Expected:` line. Two steps direct the executor to read a real figure off the engine before pinning it rather than predicting it — Task 7 Step 2's `draws[1]` and `draws[3]`, and Task 6 Step 5's record of which `deckCycle.test.ts` tests fail. Both are instructions to measure, not blanks to fill.

**Type / name consistency:** `PLAYER_HAND_FLOOR`, `drawSeed`, `drawCards`, `DrawSource`, `DrawResult`, and `handFloor` are spelled identically in every task that touches them and match `plan.md` Part 2 → Data shapes. `drawCards(source, count)` takes a `DrawSource` in Task 3 and is called with a `RoundState` in Tasks 4, 5 and 6 — `RoundState` structurally satisfies `DrawSource` once Task 2 adds `drawSeed`, which is why Task 2 precedes them.

**Phase boundary cleanliness:**
- Phase 1 ends type-checking: the constant is exported but read by nothing, `drawSeed` is added to the type and to all 15 construction sites in one task, and `drawCards` is exported and tested but called by nothing. Engine behaviour is unchanged.
- Phase 2 ends type-checking with behaviour unchanged in practice — both rerouted draw sites are equivalent to their old bodies whenever the draw pile can cover the draw, which it always can until Phase 3 lands.
- Phase 3 ends type-checking with the full engine suite green, because Task 7 rewrites the two specs Task 6 invalidates within the same phase; Task 6 Step 5 exists precisely so that gap is never left open across a phase boundary.
- Phase 4 changes no production code.
