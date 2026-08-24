# Tasks: Persistent deck across hands — spent pile, pile counts, and one reshuffle per cycle

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-24

**Goal:** Move the deck's lifetime from hand-scoped to encounter-scoped — one shuffled 33 dealt from repeatedly, a face-down spent pile that grows as tricks resolve, one seeded reshuffle when the draw pile can no longer cover a 13-card deal, and two live counts plus a reshuffle notice on the felt.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder.

> **Non-interactive run.** `plan.md` was **not** developer-confirmed — this contract was produced under the 2026-08-23 unattended sprint run, whose instructions auto-approve the plan gate and skip the mockup gate. Every default taken is recorded in `plan.md` Part 1 → Assumptions made (D1–D13). `mockup.html` was built and **went unseen** — no developer reviewed it.

---

## File map

**Created:**
- `src/warCouncil/encounterDeck.ts` — the carried deck shape, the hand-close fold, and the reshuffle rule
- `src/warCouncil/__tests__/encounterDeck.test.ts` — specs for the above
- `src/warCouncil/__tests__/deckCycle.test.ts` — the whole-cycle invariants: conservation of 33, the 33/20/7 sequence, one reshuffle per cycle, draw-pile length invariant mid-hand, seeded reproducibility
- `src/app/handDeal.ts` — the driver's one deal-a-hand call, seeded off the run
- `src/app/__tests__/handDeal.test.ts` — specs for the above
- `src/app/warCouncil/DiscardPile.tsx` — the felt's spent plate and reshuffle notice
- `src/app/warCouncil/__tests__/DiscardPile.test.tsx` — component spec, queried by accessible role and label

**Modified:**
- `src/warCouncil/types.ts` — `RoundState` gains `spentPile` and `reshuffled`
- `src/warCouncil/deal.ts` — `dealRound` gains a trailing optional `deck`, routes through `dealPileFor`, writes both new fields
- `src/warCouncil/playCard.ts:132-145` — the trick-complete return appends the completed trick to `spentPile`
- `src/warCouncil/index.ts` — barrel exports for the new module
- `src/hunt/seededRng.ts` — `dealSeedFor`
- `src/hunt/index.ts` — barrel export for `dealSeedFor`
- `src/hunt/__tests__/seededRng.test.ts` — specs for `dealSeedFor`
- `src/App.tsx` — the three `dealRound(…, Math.random)` call sites become seeded `dealHand` calls; the carried deck is threaded
- `src/app/warCouncil/WarCouncilRound.tsx:337-345` — the felt rail renders the spent plate
- `src/app/warCouncil/labels.ts` — the four new copy entries
- `src/app/warCouncil/warCouncilTable.css` — `wc-spent`, `wc-spent-top`, `wc-reshuffle-note`
- `src/app/warCouncil/__tests__/roundFixture.ts` — the app-layer `RoundState` fixture gains both fields
- `src/warCouncil/__tests__/deal.test.ts` — conservation assertion widened to include the spent pile; new cases for the carried deck and the reshuffle
- `src/warCouncil/__tests__/playCard.test.ts` — full `RoundState` literal gains both fields; new case for the spent-pile append
- The ten remaining full `RoundState` literals (audit check 7): `src/warCouncil/__tests__/abilities.test.ts`, `cpuPlayer.test.ts`, `discard.test.ts`, `legalMoves.test.ts`, `legalMovesQuarry.test.ts`, `playCard.timebomb.test.ts`, `quarryIntent.test.ts`, `rankTiers.resolution.test.ts`, `types.test.ts`, `voluntaryCashOut.test.ts`

**Deleted:** *(none)*

**Developer decides or observes:**
- Copy → `SPENT_PILE_LABEL` / `SPENT_STANDING_NOTE` / `RESHUFFLE_NOTE` in `labels.ts` — the flavour word for the pile is a placeholder (`plan.md` D2). "Spent" is descriptive and non-colliding; a flavour noun is the developer's.
- Whether one reshuffle per fight is the right cadence, or arrives too early — judgement only answerable by playing several fights.
- Whether the spent count is legible at a glance without becoming the card-counting aid the ticket forbids.
- Whether the reshuffle notice is loud enough to register and quiet enough not to interrupt.
- Whether the rank-conditioned families' new hand-to-hand variance (same mean, negatively autocorrelated — `plan.md` Risks) is wanted.
- Encounter tuning must be **re-measured**: PIMC ~49% / random ~10% were measured under reshuffle-every-hand and are invalidated by this change.
- `Keepsake`'s wording, instant, or deletion — this ticket reports its movement and invents no replacement.

**Not a task — handled by `/fb-apply` Step 6.5:** `.docs/game_rules/the-hunt.md` §2 and its Status register reverse DLR-100's "no discard pile, no reshuffle", and `.docs/implementation/**` gains the new module. Both are `implementation-doc-writer`'s and are **never hand-edited**.

---

## Phase 1 — The engine: deck state, the deck module, and the spent pile

This phase makes the whole card layer aware of a second pile and of a deck that outlives a hand. It is a safe stopping point because it ends with the engine type-checking, every `RoundState` construction site widened in the same task that widens the type, and the new module fully specified — with the driver still calling `dealRound` two-argument-style, which under D11 still means exactly what it meant before.

### Task 1: Widen `RoundState` with `spentPile` and `reshuffled`, and update all 13 construction sites ✓

Both fields are **required**, following `primedCards`' stated precedent — `RoundState` stays a total shape with no optional field a reader can forget. The type, its writer, and all twelve spec literals change in ONE task: splitting them leaves a phase boundary where the app does not compile.

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/types.ts:85-98` — add the two fields to `RoundState`
- Modify: `src/warCouncil/deal.ts:23-41` — write both in `dealRound`'s return
- Modify: `src/app/warCouncil/__tests__/roundFixture.ts:17-54`
- Test: `src/warCouncil/__tests__/abilities.test.ts:7`
- Test: `src/warCouncil/__tests__/cpuPlayer.test.ts:26`
- Test: `src/warCouncil/__tests__/discard.test.ts:10`
- Test: `src/warCouncil/__tests__/legalMoves.test.ts:10`
- Test: `src/warCouncil/__tests__/legalMovesQuarry.test.ts:7`
- Test: `src/warCouncil/__tests__/playCard.test.ts:18`
- Test: `src/warCouncil/__tests__/playCard.timebomb.test.ts:16`
- Test: `src/warCouncil/__tests__/quarryIntent.test.ts:18`
- Test: `src/warCouncil/__tests__/rankTiers.resolution.test.ts:316`
- Test: `src/warCouncil/__tests__/types.test.ts:6`
- Test: `src/warCouncil/__tests__/voluntaryCashOut.test.ts:26`

- [x] **Step 1: Add both fields to `RoundState`, immediately after `primedCards`**

```ts
  /** DLR-123 AC3 — cards resolved to a trick this ENCOUNTER, face-down and never inspectable
   *  (AC8). Grows by exactly two at each trick's resolution, in `playCard`, and by nothing else;
   *  seeded by `dealRound` from the encounter's carried deck, so it climbs ACROSS the hands of a
   *  fight and empties only on a reshuffle.
   *
   *  NOTHING to do with `src/warCouncil/discard.ts`, which is the PLAYER'S swap and sends its
   *  cards to the BOTTOM OF THE DRAW PILE (AC5), where they stay unseen. That is the naming
   *  collision DLR-123 was asked to resolve, and it is resolved by naming THIS pile something
   *  else: "discard" continues to mean the swap, everywhere, unchanged. */
  readonly spentPile: readonly Card[]
  /** DLR-123 AC9 — whether THIS hand was dealt from a reshuffle. Written once by `dealRound` and
   *  read only by the felt's notice. Hand-scoped by construction: the next deal rewrites it, so a
   *  notice cannot persist into a hand that was not reshuffled. */
  readonly reshuffled: boolean
```

- [x] **Step 2: Write both in `dealRound`'s return, beside `primedCards`**

```ts
    primedCards: [],
    // DLR-123 — a fresh deal carries nothing spent and is not a reshuffle. Task 3 replaces both
    // literals with the carried deck's values.
    spentPile: [],
    reshuffled: false,
```

- [x] **Step 3: Add both fields to the app-layer fixture in `roundFixture.ts`, before the `...overrides` spread**

```ts
    primedCards: [],
    spentPile: [],
    reshuffled: false,
    ...overrides,
```

- [x] **Step 4: Add both fields to each of the ten remaining full `RoundState` literals in `src/warCouncil/__tests__/`**

In `abilities.test.ts`, `cpuPlayer.test.ts`, `discard.test.ts`, `legalMoves.test.ts`, `legalMovesQuarry.test.ts`, `playCard.test.ts`, `playCard.timebomb.test.ts`, `quarryIntent.test.ts`, `rankTiers.resolution.test.ts`, `types.test.ts` and `voluntaryCashOut.test.ts`, add `spentPile: []` and `reshuffled: false` beside the existing `primedCards: []`. Mechanical widening only — do not change a single existing assertion.

- [x] **Step 5: Confirm the type widened everywhere**

Run: `npm run typecheck`
Expected: exits 0, no errors reported. A `Property 'spentPile' is missing` error names a construction site this task missed — add it here, not in a later task.

### Task 2: Create `src/warCouncil/encounterDeck.ts` ✓

The carried deck, the hand-close fold (D6), and the reshuffle rule (D3). Pure — no React, no DOM, RNG threaded as a parameter. No caller yet; Task 3 wires it in.

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/encounterDeck.ts`
- Test: `src/warCouncil/__tests__/encounterDeck.test.ts`

- [x] **Step 1: Write the failing spec**

```ts
import { describe, expect, it } from 'vitest'
import { HAND_SIZE } from '../../hunt'
import { createDeck } from '../deck'
import {
  CARDS_PER_DEAL,
  FRESH_ENCOUNTER_DECK,
  closeHand,
  dealPileFor,
  isFreshDeck,
} from '../encounterDeck'
import { dealRound } from '../deal'
import { PlayerSide } from '../types'

function lcg(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 9301 + 49297) % 233280
    return state / 233280
  }
}

describe('CARDS_PER_DEAL', () => {
  it('is two hands plus the decree, derived from HAND_SIZE', () => {
    expect(CARDS_PER_DEAL).toBe(HAND_SIZE * 2 + 1)
    expect(CARDS_PER_DEAL).toBe(13)
  })
})

describe('isFreshDeck', () => {
  it('is true for the fresh value and false once either pile holds a card', () => {
    expect(isFreshDeck(FRESH_ENCOUNTER_DECK)).toBe(true)
    expect(isFreshDeck({ drawPile: createDeck().slice(0, 1), spentPile: [] })).toBe(false)
    expect(isFreshDeck({ drawPile: [], spentPile: createDeck().slice(0, 1) })).toBe(false)
  })
})

describe('closeHand', () => {
  it('D6 — sends every card not in the draw pile to the spent pile, conserving all 33', () => {
    const state = dealRound(PlayerSide.Player, lcg(42))
    const deck = closeHand(state)
    expect(deck.drawPile).toEqual(state.drawPile)
    // 6 + 6 dealt, plus the decree
    expect(deck.spentPile).toHaveLength(CARDS_PER_DEAL)
    expect(deck.drawPile.length + deck.spentPile.length).toBe(createDeck().length)
  })

  it('AC4 — the decree is spent, and after a Fox exchange it is whatever sits in the slot', () => {
    const state = dealRound(PlayerSide.Player, lcg(7))
    const swapped = { ...state, decree: state.hands[PlayerSide.Player][0] }
    const keys = closeHand(swapped).spentPile.map((c) => `${c.suit}-${c.rank}`)
    expect(keys).toContain(`${swapped.decree.suit}-${swapped.decree.rank}`)
  })

  it('spends cards still on the table when a hand ends mid-trick', () => {
    const state = dealRound(PlayerSide.Player, lcg(9))
    const lead = state.hands[PlayerSide.Cpu][0]
    const mid = {
      ...state,
      hands: { ...state.hands, [PlayerSide.Cpu]: state.hands[PlayerSide.Cpu].slice(1) },
      currentTrick: [{ side: PlayerSide.Cpu, card: lead }],
    }
    const deck = closeHand(mid)
    expect(deck.drawPile.length + deck.spentPile.length).toBe(createDeck().length)
  })
})

describe('dealPileFor', () => {
  it('AC2 — does not reshuffle while the draw pile can cover a deal', () => {
    const drawPile = createDeck().slice(0, CARDS_PER_DEAL)
    const result = dealPileFor({ drawPile, spentPile: createDeck().slice(CARDS_PER_DEAL) }, lcg(1))
    expect(result.reshuffled).toBe(false)
    expect(result.drawPile).toEqual(drawPile)
  })

  it('AC6/D3 — reshuffles below the threshold, folding the leftover draw pile in', () => {
    const drawPile = createDeck().slice(0, 7)
    const spentPile = createDeck().slice(7)
    const result = dealPileFor({ drawPile, spentPile }, lcg(3))
    expect(result.reshuffled).toBe(true)
    expect(result.drawPile).toHaveLength(createDeck().length)
    const keys = result.drawPile.map((c) => `${c.suit}-${c.rank}`)
    expect(new Set(keys).size).toBe(createDeck().length)
  })

  it('AC12 — the same rng reproduces the same reshuffle', () => {
    const deck = { drawPile: createDeck().slice(0, 7), spentPile: createDeck().slice(7) }
    expect(dealPileFor(deck, lcg(55))).toEqual(dealPileFor(deck, lcg(55)))
  })

  it('throws when the two piles together cannot cover a deal', () => {
    expect(() => dealPileFor({ drawPile: [], spentPile: createDeck().slice(0, 3) }, lcg(1))).toThrow(
      RangeError,
    )
  })
})
```

Run: `npx vitest run src/warCouncil/__tests__/encounterDeck.test.ts`
Expected: fails to collect — `Failed to load ../encounterDeck`.

- [x] **Step 2: Write the module**

```ts
import { HAND_SIZE, type Rng } from '../hunt'
import { shuffle } from './shuffle'
import { PlayerSide, type Card, type RoundState } from './types'

/**
 * DLR-123 — the encounter's deck, which now OUTLIVES the hand that deals from it.
 *
 * Pure and DOM-free like the rest of this tree, and free of `Math.random()`: `dealPileFor` takes
 * `rng` explicitly, the convention `dealRound`, `shuffle` and `assignSkulls` already set. That is
 * the property AC12 turns on — a reshuffle nobody can reproduce would make DLR-130's balance
 * simulator impossible, and no test would ever catch it.
 */

/** Cards one hand costs: two hands and the decree. DERIVED from `HAND_SIZE` rather than written
 *  as 13, so it is not a configuration dial anyone has to keep in step — it is what a deal takes,
 *  and it is therefore the reshuffle threshold BY DEFINITION rather than by choice. */
export const CARDS_PER_DEAL = HAND_SIZE * 2 + 1

/**
 * What one encounter carries between its hands. `drawPile` is dealt from the FRONT and is where
 * the player's swap and the Woodcutter's bury put their cards, on the BOTTOM (AC5) — so those
 * cards stay unseen. `spentPile` is never dealt from at all until a reshuffle folds it back in.
 */
export interface EncounterDeck {
  readonly drawPile: readonly Card[]
  readonly spentPile: readonly Card[]
}

/** AC1/AC10 — a new encounter carries nothing, so `dealRound` builds and shuffles a fresh 33.
 *  Shared and only ever spread from, exactly as `encounter.ts`'s `NO_PENDING_TIMEBOMB` is. */
export const FRESH_ENCOUNTER_DECK: EncounterDeck = { drawPile: [], spentPile: [] }

/** Whether this deck is a new encounter's. ONE statement, so `dealRound`'s branch and a spec
 *  cannot disagree about what "fresh" means. */
export function isFreshDeck(deck: EncounterDeck): boolean {
  return deck.drawPile.length === 0 && deck.spentPile.length === 0
}

/**
 * D6 — at hand's end EVERY card not in the draw pile joins the spent pile: the decree (AC4), both
 * hands, and anything still on the table. ONE rule rather than three coordinated special cases,
 * which is what makes it total: it covers a Fox exchange (whatever card the Fox left in the decree
 * slot is what gets spent), and a hand ended early by a mid-hand cash-out with cards still held.
 *
 * All 33 are conserved by construction — the returned two piles are exactly the input state's
 * cards, repartitioned — which is the invariant `deckCycle.test.ts` pins.
 */
export function closeHand(state: RoundState): EncounterDeck {
  return {
    drawPile: state.drawPile,
    spentPile: [
      ...state.spentPile,
      state.decree,
      ...state.hands[PlayerSide.Player],
      ...state.hands[PlayerSide.Cpu],
      ...state.currentTrick.map((t) => t.card),
    ],
  }
}

/** The draw pile a deal will come off, and whether a reshuffle produced it. */
export interface DealPile {
  readonly drawPile: readonly Card[]
  readonly reshuffled: boolean
}

/**
 * AC6 — reshuffle exactly when the draw pile cannot cover a full deal, and not otherwise. The
 * leftover draw pile is folded INTO the shuffle rather than left on top of it (D3): discarding it
 * would lose cards from a 33-card deck, and stacking it on top is a second rule about ordering
 * with no observable difference, since those cards were never seen either way. Folding makes
 * AC6's "a full reset of what the player knows" literally true.
 *
 * THROWS when the two piles together cannot cover a deal. Unreachable through the shipped driver:
 * `closeHand` conserves all 33, so the draw pile at a hand's start is exactly 33, 20 or 7, and 7
 * reshuffles back to 33. Kept for `shieldHeartsForTier`'s stated reason — the guard is not dead
 * code, it is the check that makes that guarantee hold — and reachable only from a genuine driver
 * bug or a hand-built fixture. Deliberately NOT on any event-handler commit path: `src/` has no
 * ErrorBoundary (DLR-131), so an escaping throw would blank the screen.
 */
export function dealPileFor(deck: EncounterDeck, rng: Rng): DealPile {
  if (deck.drawPile.length >= CARDS_PER_DEAL) {
    return { drawPile: deck.drawPile, reshuffled: false }
  }
  const total = deck.drawPile.length + deck.spentPile.length
  if (total < CARDS_PER_DEAL) {
    throw new RangeError(
      `Cannot deal ${CARDS_PER_DEAL} cards: the draw pile holds ${deck.drawPile.length} and the spent pile ${deck.spentPile.length}, ${CARDS_PER_DEAL - total} short even after a reshuffle`,
    )
  }
  return { drawPile: shuffle([...deck.spentPile, ...deck.drawPile], rng), reshuffled: true }
}
```

Run: `npx vitest run src/warCouncil/__tests__/encounterDeck.test.ts`
Expected: exits 0, all specs pass.

### Task 3: Teach `dealRound` to deal from a carried deck ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/deal.ts:1-42`
- Test: `src/warCouncil/__tests__/deal.test.ts:25-31` and new cases appended

- [x] **Step 1: Rewrite `dealRound`'s opening and its two new fields**

Replace the import block and the function's first six lines:

```ts
import { HAND_SIZE, type Rng } from '../hunt'
import { createDeck } from './deck'
import { FRESH_ENCOUNTER_DECK, dealPileFor, isFreshDeck, type EncounterDeck } from './encounterDeck'
import { shuffle } from './shuffle'
import { assignSkulls } from './skulls'
import { otherSide, PlayerSide, RoundPhase, type RoundState } from './types'
```

```ts
export function dealRound(
  dealer: PlayerSide,
  rng: Rng,
  /**
   * DLR-123 AC2 — the encounter's carried deck. ABSENT or empty IS a new encounter, so a fresh 33
   * is built and shuffled (AC1/AC10). Trailing and optional following `apCapacity`'s precedent
   * rather than `bankClimbBonus`': every existing two-argument call still means exactly what it
   * meant — a fresh deal — so no existing spec has to be rewritten to say what it already said.
   */
  deck: EncounterDeck = FRESH_ENCOUNTER_DECK,
): RoundState {
  const fresh = isFreshDeck(deck)
  const opening = fresh
    ? { drawPile: shuffle(createDeck(), rng), reshuffled: false }
    : dealPileFor(deck, rng)
  const playerHand = opening.drawPile.slice(0, HAND_SIZE)
  const cpuHand = opening.drawPile.slice(HAND_SIZE, HAND_SIZE * 2)
  const remaining = opening.drawPile.slice(HAND_SIZE * 2)
  const decree = remaining[0]
  const drawPile = remaining.slice(1)
```

and replace the two literals written in Task 1:

```ts
    // DLR-123 AC3/AC8 — the spent pile CLIMBS ACROSS the hands of a fight and empties only when a
    // reshuffle folds it back into the draw pile. `FRESH_ENCOUNTER_DECK.spentPile` is `[]`, so the
    // new-encounter case needs no branch of its own.
    spentPile: opening.reshuffled ? [] : deck.spentPile,
    reshuffled: opening.reshuffled,
```

- [x] **Step 2: Widen the conservation assertion and add the carried-deck cases**

In `deal.test.ts`, change the `all` array at line 27 to include the spent pile, so the assertion keeps proving what it claims once a spent pile exists:

```ts
    const all = [
      ...state.hands.player,
      ...state.hands.cpu,
      ...state.drawPile,
      ...state.spentPile,
      state.decree,
    ]
```

Then append:

```ts
  it('AC1/AC10 — an absent deck deals a fresh 33: 6 + 6 + decree, 20 left, nothing spent', () => {
    const state = dealRound(PlayerSide.Player, lcg(42))
    expect(state.drawPile).toHaveLength(20)
    expect(state.spentPile).toEqual([])
    expect(state.reshuffled).toBe(false)
  })

  it('AC2 — a carried deck deals on from the same pile, and no card returns', () => {
    const first = dealRound(PlayerSide.Player, lcg(42))
    const carried = closeHand(first)
    const second = dealRound(PlayerSide.Cpu, lcg(43), carried)
    expect(second.drawPile).toHaveLength(7)
    expect(second.spentPile).toHaveLength(13)
    expect(second.reshuffled).toBe(false)
    const spent = new Set(carried.spentPile.map((c) => `${c.suit}-${c.rank}`))
    const dealt = [...second.hands.player, ...second.hands.cpu, second.decree]
    for (const card of dealt) {
      expect(spent.has(`${card.suit}-${card.rank}`)).toBe(false)
    }
  })

  it('AC6/AC9 — a third hand reshuffles, empties the spent pile, and says so', () => {
    const first = dealRound(PlayerSide.Player, lcg(42))
    const second = dealRound(PlayerSide.Cpu, lcg(43), closeHand(first))
    const third = dealRound(PlayerSide.Player, lcg(44), closeHand(second))
    expect(third.reshuffled).toBe(true)
    expect(third.drawPile).toHaveLength(20)
    expect(third.spentPile).toEqual([])
  })

  it('AC11 — skulls are re-rolled per deal against the Quarry’s own six', () => {
    const first = dealRound(PlayerSide.Player, lcg(42))
    const second = dealRound(PlayerSide.Cpu, lcg(43), closeHand(first))
    expect(second.skulledCards).toHaveLength(Math.round(HAND_SIZE * SKULL_DENSITY))
    for (const skull of second.skulledCards) {
      expect(containsCard(second.hands[PlayerSide.Cpu], skull)).toBe(true)
    }
  })
```

Add `import { closeHand } from '../encounterDeck'` to the file's imports.

Run: `npx vitest run src/warCouncil/__tests__/deal.test.ts src/warCouncil/__tests__/encounterDeck.test.ts`
Expected: exits 0, 0 failed.

### Task 4: Send each resolved trick to the spent pile ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/playCard.ts:132-145`
- Test: `src/warCouncil/__tests__/playCard.test.ts`

- [x] **Step 1: Append the completed trick in `playCard`'s trick-complete return**

Add one field beside `currentTrick: []`:

```ts
      currentTrick: [],
      // DLR-123 AC3 — the trick's two cards go face-down to the spent pile AS THE TRICK RESOLVES.
      // THE single place this pile grows: `dealRound` seeds it and `closeHand` reads it, and
      // nothing else in the engine writes it, so a card cannot be spent twice or spent early.
      spentPile: [...next.spentPile, completedTrick[0].card, completedTrick[1].card],
```

- [x] **Step 2: Add the spec**

Append to `playCard.test.ts`:

```ts
  it('DLR-123 AC3 — a resolved trick sends both its cards to the spent pile, in trick order', () => {
    const state = makeState()
    const lead = state.hands[PlayerSide.Player][0]
    const led = playCard(state, PlayerSide.Player, lead)
    expect(led.ok).toBe(true)
    if (!led.ok) return
    expect(led.state.spentPile).toEqual([])
    const follow = legalMoves(led.state, PlayerSide.Cpu)[0]
    const done = playCard(led.state, PlayerSide.Cpu, follow)
    expect(done.ok).toBe(true)
    if (!done.ok) return
    expect(done.state.spentPile).toEqual([lead, follow])
  })
```

Use whatever the file's existing state-builder and imports are named; do not introduce a second fixture.

Run: `npx vitest run src/warCouncil/__tests__/playCard.test.ts`
Expected: exits 0, 0 failed.

### Task 5: Export the new module from the card-layer barrel ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/index.ts:17-19`

- [x] **Step 1: Add the exports beside `createDeck` and `shuffle`**

```ts
export { createDeck } from './deck'
export { shuffle } from './shuffle'
export {
  CARDS_PER_DEAL,
  FRESH_ENCOUNTER_DECK,
  closeHand,
  dealPileFor,
  isFreshDeck,
} from './encounterDeck'
export type { DealPile, EncounterDeck } from './encounterDeck'
export { dealRound } from './deal'
```

- [x] **Step 2: Confirm the barrel resolves**

Run: `npm run typecheck`
Expected: exits 0, no errors reported.

---

## Phase 2 — Determinism and the driver

This phase closes AC12 by removing the last three `Math.random()` calls that reach a deal, and threads the carried deck through the driver. It is a safe stopping point because the engine from Phase 1 is complete and unchanged here — this phase only decides *which* rng and *which* deck reach it. `App.tsx` is measured at the end because it starts at 369 lines against a 400 budget.

### Task 6: Add `dealSeedFor` to the seed module ✓

- Skill: react-frontend

**Files:**
- Modify: `src/hunt/seededRng.ts:37-46`
- Modify: `src/hunt/index.ts:251-252`
- Test: `src/hunt/__tests__/seededRng.test.ts`

- [x] **Step 1: Append the function to `seededRng.ts`**

```ts
/**
 * DLR-123 AC12 — the seed for one hand's deal AND, because the reshuffle happens inside
 * `dealRound` under the same generator, for its reshuffle too. Shaped exactly like
 * `slotMachine.ts`'s `slotSeedFor`, and for the same reason: a seeded encounter must reproduce
 * every deal, every skull and every reshuffle, or DLR-130's balance simulator is impossible.
 *
 * The triple is unique per hand of a run: `encounterIndex` separates the fights and `handOfFight`
 * the hands within one, and both already live on `RunState`. Pure — no `Math.random()`; the
 * driver chooses `runSeed` and hands it down, exactly as it does for the slot machine.
 */
export function dealSeedFor(
  runSeed: number,
  encounterIndex: number,
  handOfFight: number,
): number {
  return mixSeed(runSeed, encounterIndex, handOfFight)
}
```

- [x] **Step 2: Export it from the barrel**

```ts
export { createSeededRng, dealSeedFor, mixSeed } from './seededRng'
```

- [x] **Step 3: Add the spec**

Append to `src/hunt/__tests__/seededRng.test.ts`:

```ts
describe('dealSeedFor', () => {
  it('is stable for the same run, fight and hand', () => {
    expect(dealSeedFor(1234, 2, 3)).toBe(dealSeedFor(1234, 2, 3))
  })

  it('differs across hands of a fight, across fights, and across runs', () => {
    const base = dealSeedFor(1234, 2, 3)
    expect(dealSeedFor(1234, 2, 4)).not.toBe(base)
    expect(dealSeedFor(1234, 3, 3)).not.toBe(base)
    expect(dealSeedFor(1235, 2, 3)).not.toBe(base)
  })

  it('is a non-negative 32-bit integer', () => {
    const seed = dealSeedFor(0xdeadbeef, 4, 2)
    expect(Number.isInteger(seed)).toBe(true)
    expect(seed).toBeGreaterThanOrEqual(0)
    expect(seed).toBeLessThan(0x100000000)
  })
})
```

Add `dealSeedFor` to the file's existing import from `../seededRng`.

Run: `npx vitest run src/hunt/__tests__/seededRng.test.ts`
Expected: exits 0, 0 failed.

### Task 7: Create `src/app/handDeal.ts` ✓

The driver's one deal-a-hand call. A module rather than a block inside `App.tsx` for `roundBars.ts`'s stated reason — inline it could only be exercised through a renderer — and because `App.tsx` is 31 lines under its budget.

- Skill: react-frontend

**Files:**
- Create: `src/app/handDeal.ts`
- Test: `src/app/__tests__/handDeal.test.ts`

- [x] **Step 1: Write the module**

```ts
import { createSeededRng, dealSeedFor, type RunState } from '../hunt'
import { dealRound, type EncounterDeck, type WarCouncilState } from '../warCouncil'
import { dealerForRound } from './dealerForRound'

/**
 * DLR-123 AC12 — THE one place a hand is dealt, and the one place the deal's rng is chosen.
 *
 * `dealRound` used to be handed `Math.random`, which meant no deal and no reshuffle in this game
 * was ever reproducible. It is handed a seeded generator here instead, derived from the run's own
 * `runSeed` through `dealSeedFor` — so the last `Math.random()` on the deal path is gone, and the
 * only one left in `App.tsx` is the one that chooses `runSeed` itself.
 *
 * `handNumber` is `App.tsx`'s MONOTONIC counter, which feeds `dealerForRound`'s parity and must
 * never reset. `run.handOfFight` is the DIFFERENT, per-fight 1-based figure that feeds the seed.
 * The two are not interchangeable — `RunState.handOfFight`'s own docblock says so — and passing
 * one where the other belongs would either break the dealer alternation or make every fight of a
 * run deal identically.
 */
export function dealHand(
  run: RunState,
  handNumber: number,
  carried: EncounterDeck,
): WarCouncilState {
  return dealRound(
    dealerForRound(handNumber),
    createSeededRng(dealSeedFor(run.runSeed, run.encounterIndex, run.handOfFight)),
    carried,
  )
}
```

- [x] **Step 2: Write the spec**

```ts
import { describe, expect, it } from 'vitest'
import { startRun } from '../../hunt'
import { FRESH_ENCOUNTER_DECK, closeHand, PlayerSide } from '../../warCouncil'
import { dealHand } from '../handDeal'

const runWith = (seed: number) => ({ ...startRun(undefined, [], seed) })

describe('dealHand', () => {
  it('AC12 — the same run, fight and hand deal exactly the same cards and skulls', () => {
    expect(dealHand(runWith(2026), 1, FRESH_ENCOUNTER_DECK)).toEqual(
      dealHand(runWith(2026), 1, FRESH_ENCOUNTER_DECK),
    )
  })

  it('AC12 — a different run seed deals a different hand', () => {
    const a = dealHand(runWith(2026), 1, FRESH_ENCOUNTER_DECK)
    const b = dealHand(runWith(2027), 1, FRESH_ENCOUNTER_DECK)
    expect(a.hands[PlayerSide.Player]).not.toEqual(b.hands[PlayerSide.Player])
  })

  it('AC1 — a fresh deck opens on 20 in the draw pile and nothing spent', () => {
    const state = dealHand(runWith(2026), 1, FRESH_ENCOUNTER_DECK)
    expect(state.drawPile).toHaveLength(20)
    expect(state.spentPile).toEqual([])
    expect(state.reshuffled).toBe(false)
  })

  it('AC2 — a carried deck continues the encounter rather than restarting it', () => {
    const run = runWith(2026)
    const first = dealHand(run, 1, FRESH_ENCOUNTER_DECK)
    const second = dealHand({ ...run, handOfFight: 2 }, 2, closeHand(first))
    expect(second.drawPile).toHaveLength(7)
    expect(second.spentPile).toHaveLength(13)
  })

  it('alternates the dealer on the monotonic hand number, not the per-fight one', () => {
    const run = runWith(2026)
    expect(dealHand(run, 1, FRESH_ENCOUNTER_DECK).dealer).not.toBe(
      dealHand(run, 2, FRESH_ENCOUNTER_DECK).dealer,
    )
  })
})
```

Run: `npx vitest run src/app/__tests__/handDeal.test.ts`
Expected: exits 0, 0 failed.

### Task 8: Rewire `App.tsx` onto the seeded deal and the carried deck ✓

- Skill: react-frontend

**Files:**
- Modify: `src/App.tsx:33-46` (imports), `:100-102`, `:142-146`, `:148-180`, `:184-189`, `:231-248`

- [x] **Step 1: Replace the two card-layer imports**

```ts
import { FRESH_ENCOUNTER_DECK, closeHand, PlayerSide, type WarCouncilState } from './warCouncil'
```

and remove the now-unused `import { dealerForRound } from './app/dealerForRound'` — `handDeal.ts` owns that call now — adding instead:

```ts
import { dealHand } from './app/handDeal'
```

`RunState` is needed for the two new parameter types:

```ts
  type Hunt,
  type RunState,
} from './hunt'
```

- [x] **Step 2: Seed the opening deal off the run that was just built**

```ts
  const [dealt, setDealt] = useState<WarCouncilState>(() =>
    dealHand(run, 1, FRESH_ENCOUNTER_DECK),
  )
```

The lazy initialiser closes over the first render's `run`, which is the value the initialiser above it just produced — so the opening hand is dealt from the seed that run actually carries. Pure, so StrictMode's development double-invocation recomputes an identical hand rather than a different one, which `Math.random()` never guaranteed.

- [x] **Step 3: Give `dealNextHand` the run and the deck it must deal from**

```ts
  /** DLR-123 — takes the run EXPLICITLY rather than closing over `run`: every caller has just
   *  computed a newer one, and the render's `run` is stale by the time this fires. `carried` is
   *  `FRESH_ENCOUNTER_DECK` whenever an ENCOUNTER is starting (AC10) and the finished hand's
   *  `closeHand` otherwise — which is the whole of the deck's lifetime rule, in one parameter. */
  function dealNextHand(nextRun: RunState, carried: EncounterDeck) {
    const next = hand + 1
    setHand(next)
    setDealt(dealHand(nextRun, next, carried))
  }
```

Add `type EncounterDeck` to the `./warCouncil` import.

- [x] **Step 4: Carry the finished hand's deck into the next hand**

In `handleComplete`, the final line becomes:

```ts
    // DLR-123 AC2/AC4 — the SAME deck, minus this hand's 13. `closeHand` spends the decree and
    // everything else not in the draw pile, so the next hand deals on from where this one stopped
    // instead of from a fresh shuffle.
    dealNextHand(recorded, closeHand(result.finalState))
```

- [x] **Step 5: Reset the deck at every encounter boundary (AC10)**

```ts
  function leaveForNextFight() {
    const advanced = advanceRun(run)
    setRun(advanced)
    setPhase(RunPhase.Verdict)
    setTricks(NO_TRICKS)
    // AC10 — a new fight always begins on a fresh 33.
    dealNextHand(advanced, FRESH_ENCOUNTER_DECK)
  }
```

In `handleBeginRun`, name the run so the opening hand is dealt from its seed (D12):

```ts
  function handleBeginRun() {
    const begun = startRun(
      PLAYER_START_HEALTH,
      vault.startingGrants,
      Math.floor(Math.random() * 0x100000000),
    )
    setRun(begun)
    if (vault.startingGrants.length > 0) {
      commit(clearStartingGrants)
    }
    setHand(1)
    // DLR-123 D12 — RE-DEAL. This mints a run with a new `runSeed`, and now that the deal is
    // seeded off that value, leaving the mount-time hand in place would mean the opening hand of
    // a run was dealt from a seed the run does not have.
    setDealt(dealHand(begun, 1, FRESH_ENCOUNTER_DECK))
    setPhase(RunPhase.Verdict)
  }
```

and in `handleNewRun` the last line becomes:

```ts
    setDealt(dealHand(fresh, 1, FRESH_ENCOUNTER_DECK))
```

- [x] **Step 6: Confirm no `Math.random()` reaches a deal, and the file is inside budget**

Run: `npm run typecheck; Select-String -Path src\App.tsx -Pattern "Math.random"; (Get-Content src\App.tsx).Count`
Expected: typecheck exits 0; exactly **three** `Math.random` hits, all of them `Math.floor(Math.random() * 0x100000000)` feeding `startRun`, and none passed to a deal; the line count is **under 400**. If it is not, extract further into `src/app/handDeal.ts` rather than leaving the breach.

---

## Phase 3 — The felt: two counts and the reshuffle notice

This phase is presentational only — no rule changes, no engine changes. It is a safe stopping point because Phases 1 and 2 already satisfy AC1–AC6 and AC10–AC12 headlessly; this phase adds AC7, AC8 and AC9's surfaces. Layout per `mockup.html` in this plan folder (built but **unseen** — no developer reviewed it).

### Task 9: Add the four copy entries ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/labels.ts`

- [x] **Step 1: Append the entries**

```ts
/** DLR-123 AC8/AC9 — the spent pile's copy. "Spent", not "discard": `discard` already means the
 *  PLAYER'S swap everywhere in this codebase and on this felt, and DLR-123 was asked to resolve
 *  that collision. It is resolved by naming the NEW thing, so nothing existing had to be renamed.
 *  The flavour noun is the developer's — this is a descriptive placeholder. */
export const SPENT_PILE_LABEL = 'Spent'

/** AC8 — the live count. A count and nothing else: AC8 forbids the contents ever being
 *  inspectable, so no label here may hint at what is in the pile. */
export function spentCountText(spentCount: number): string {
  return `${spentCount} spent`
}

/** AC9's SECOND half — the standing statement that cards are NOT reshuffled between hands. It is
 *  on screen at every moment the notice below is not, so the absence of a reshuffle is stated
 *  rather than merely implied by the absence of a message. */
export const SPENT_STANDING_NOTE = 'Spent cards stay spent'

/** AC9's FIRST half — the reshuffle, announced at the moment it happens. */
export const RESHUFFLE_NOTE = 'Reshuffled — the deck is fresh'
```

- [x] **Step 2: Confirm the copy module is inside budget**

Run: `npm run typecheck; (Get-Content src\app\warCouncil\labels.ts).Count`
Expected: typecheck exits 0; the line count is under 400.

### Task 10: Build `DiscardPile.tsx` ✓

- Skill: game-ux

**Files:**
- Create: `src/app/warCouncil/DiscardPile.tsx`
- Test: `src/app/warCouncil/__tests__/DiscardPile.test.tsx`

- [x] **Step 1: Write the component**

```tsx
import {
  RESHUFFLE_NOTE,
  SPENT_PILE_LABEL,
  SPENT_STANDING_NOTE,
  spentCountText,
} from './labels'

interface DiscardPileProps {
  readonly spentCount: number
  /** AC9 — true only for a hand that was dealt from a reshuffle. */
  readonly reshuffled: boolean
}

/**
 * DLR-123 AC8/AC9 — the felt's spent pile: three face-down backs, a live count, and one line
 * that is either the standing "not reshuffling" statement or the reshuffle announcement.
 *
 * Renders BACKS ONLY and takes a COUNT rather than the cards. That is the enforcement point for
 * AC8's "its contents are never inspectable": a component handed `readonly Card[]` could render
 * one by mistake or leak one into the accessibility tree, and this one cannot, because it has
 * never been given them. It decides nothing else — a number and a boolean in, markup out.
 *
 * Sits beside `DecreePile` in the felt rail rather than in a corner plate, for `DecreePile`'s own
 * stated reason: the two piles are the same physical object to the player and a corner is where a
 * count gets occluded.
 */
export default function DiscardPile({ spentCount, reshuffled }: DiscardPileProps) {
  return (
    <div className="wc-pile wc-spent" role="group" aria-label={SPENT_PILE_LABEL}>
      <span className="wc-plate-label">{SPENT_PILE_LABEL}</span>
      <span className="wc-pile-cards" aria-hidden="true">
        <span className="wc-pile-back wc-b1" />
        <span className="wc-pile-back wc-b2" />
        <span className="wc-pile-back wc-spent-top" />
      </span>
      <span className="wc-plate-label">{spentCountText(spentCount)}</span>
      <p
        className={`wc-reshuffle-note${reshuffled ? ' wc-is-reshuffled' : ''}`}
        role="status"
      >
        {reshuffled ? RESHUFFLE_NOTE : SPENT_STANDING_NOTE}
      </p>
    </div>
  )
}
```

- [x] **Step 2: Write the component spec, querying by accessible role and label**

```tsx
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DiscardPile from '../DiscardPile'

describe('DiscardPile', () => {
  it('AC8 — names the pile and posts its live count', () => {
    render(<DiscardPile spentCount={13} reshuffled={false} />)
    const plate = screen.getByRole('group', { name: 'Spent' })
    expect(within(plate).getByText('13 spent')).toBeTruthy()
  })

  it('AC9 — states that cards are not reshuffled when none has happened', () => {
    render(<DiscardPile spentCount={13} reshuffled={false} />)
    expect(screen.getByRole('status').textContent).toBe('Spent cards stay spent')
  })

  it('AC9 — announces the reshuffle at the moment it happens', () => {
    render(<DiscardPile spentCount={0} reshuffled />)
    expect(screen.getByRole('status').textContent).toBe('Reshuffled — the deck is fresh')
  })

  it('AC8 — renders no card face and exposes nothing of the pile’s contents', () => {
    const { container } = render(<DiscardPile spentCount={26} reshuffled={false} />)
    expect(container.querySelectorAll('.wc-card')).toHaveLength(0)
    expect(screen.getByRole('group', { name: 'Spent' }).textContent).toBe(
      'Spent26 spentSpent cards stay spent',
    )
  })
})
```

Run: `npx vitest run src/app/warCouncil/__tests__/DiscardPile.test.tsx`
Expected: exits 0, 4 passed. If the fourth spec's concatenated `textContent` does not match exactly, correct the EXPECTATION to the real rendered text — do not add markup to make it match.

### Task 11: Style the spent plate and the notice ✓

- Skill: react-frontend

**Files:**
- Config: `src/app/warCouncil/warCouncilTable.css` — append `wc-spent`, `wc-spent-top`, `wc-reshuffle-note`

- [x] **Step 1: Append the rules**

```css
/* ---------- DLR-123: the spent pile, beside the decree on the felt rail ---------- */

/* `.wc-pile-back` is absolutely positioned so the two decorative backs can offset behind the
   decree's FACE. The spent pile has no face, so its top back must be in flow or the plate
   collapses to zero height. */
.wc-spent .wc-pile-back.wc-spent-top {
  position: relative;
}

.wc-reshuffle-note {
  margin: 0;
  max-width: 12ch;
  text-align: center;
  font-size: clamp(0.55rem, 1.1vmin, 0.68rem);
  line-height: 1.25;
  color: var(--wc-ink-dim, #9db0a5);
}

/* AC9 — the reshuffle reads as an event, the standing note as furniture. */
.wc-reshuffle-note.wc-is-reshuffled {
  max-width: 16ch;
  font-weight: 600;
  color: var(--wc-accent, #d8b26a);
}
```

- [x] **Step 2: Confirm the sheet is inside budget**

Run: `npm run lint; (Get-Content src\app\warCouncil\warCouncilTable.css).Count`
Expected: lint exits 0; the line count is under 400.

### Task 12: Render the spent plate on the felt rail ✓

- Skill: react-frontend

**Files:**
- Modify: `src/app/warCouncil/WarCouncilRound.tsx:337-345` and its import block

- [x] **Step 1: Add the plate to the felt rail, beneath the decree pile**

```tsx
        <div className="wc-felt-rail">
          <DecreePile
            decree={ui.round.decree}
            trumpSuit={ui.round.trumpSuit}
            drawPileCount={ui.round.drawPile.length}
            primed={isPrimed(ui.round.primedCards, ui.round.decree)}
          />
          {/* DLR-123 AC7/AC8 — both counts read straight off round state on every render, so they
              cannot lag it; `RoundUiState.round` already carries the whole engine state, which is
              why this ticket needed no reducer action and no new UI state. */}
          <DiscardPile
            spentCount={ui.round.spentPile.length}
            reshuffled={ui.round.reshuffled}
          />
        </div>
```

and add `import DiscardPile from './DiscardPile'` beside the existing `DecreePile` import.

- [x] **Step 2: Confirm the felt renders both counts and stays inside budget**

Run: `npm run typecheck; npx vitest run src/app/warCouncil/__tests__ --project dom; (Get-Content src\app\warCouncil\WarCouncilRound.tsx).Count`
Expected: typecheck exits 0; the dom specs report 0 failed; the line count is **under 400** (it is 382 before this task — if the addition pushes it over, move the felt rail's JSX into a small `FeltRail.tsx` rather than leaving the breach).

---

## Phase 4 — The invariants that make the cycle safe

One task, no production change. These are the properties that hold the whole design up and that nothing else asserts: that all 33 cards are conserved forever, that the draw pile can never run out mid-hand, that the cycle is 33 → 20 → 7 → reshuffle, and that a seeded encounter reproduces every deal and reshuffle.

### Task 13: Pin the whole-cycle invariants ✓

- Skill: react-frontend

**Files:**
- Test: `src/warCouncil/__tests__/deckCycle.test.ts`

- [x] **Step 1: Write the spec**

```ts
import { describe, expect, it } from 'vitest'
import { MAX_CARDS_PER_DISCARD } from '../../hunt'
import { createSeededRng } from '../../hunt'
import { applyDiscard } from '../discard'
import { createDeck } from '../deck'
import { dealRound } from '../deal'
import { CARDS_PER_DEAL, FRESH_ENCOUNTER_DECK, closeHand } from '../encounterDeck'
import { legalMoves } from '../legalMoves'
import { playCard } from '../playCard'
import { PlayerSide, RoundPhase, currentTurn, type RoundState } from '../types'

const DECK_SIZE = createDeck().length

/** Every card in the game, wherever it currently is. */
function census(state: RoundState): string[] {
  return [
    ...state.hands[PlayerSide.Player],
    ...state.hands[PlayerSide.Cpu],
    ...state.drawPile,
    ...state.spentPile,
    ...state.currentTrick.map((t) => t.card),
    state.decree,
  ].map((c) => `${c.suit}-${c.rank}`)
}

/** Play a hand out to its sixth trick, always taking the first legal move. Ability prompts are
 *  avoided by preferring a card that needs no `AbilityChoice`. */
function playOutHand(start: RoundState): RoundState {
  let state = start
  while (state.phase !== RoundPhase.Complete) {
    const side = currentTurn(state)
    const legal = legalMoves(state, side)
    const plain = legal.find((c) => c.rank !== 3 && c.rank !== 5) ?? legal[0]
    const result = playCard(state, side, plain)
    if (!result.ok) throw new Error(`illegal move: ${result.reason}`)
    state = result.state
  }
  return state
}

describe('the encounter deck cycle', () => {
  it('conserves all 33 cards, with no duplicate, at every point of every hand', () => {
    let deck = FRESH_ENCOUNTER_DECK
    for (let handOfFight = 1; handOfFight <= 4; handOfFight += 1) {
      const dealt = dealRound(PlayerSide.Player, createSeededRng(handOfFight), deck)
      expect(new Set(census(dealt)).size).toBe(DECK_SIZE)
      const played = playOutHand(dealt)
      expect(new Set(census(played)).size).toBe(DECK_SIZE)
      deck = closeHand(played)
      expect(deck.drawPile.length + deck.spentPile.length).toBe(DECK_SIZE)
    }
  })

  it('AC1/AC2/AC6 — the draw pile runs 20, 7, then reshuffles back to 20', () => {
    let deck = FRESH_ENCOUNTER_DECK
    const draws: number[] = []
    const reshuffles: boolean[] = []
    for (let handOfFight = 1; handOfFight <= 4; handOfFight += 1) {
      const dealt = dealRound(PlayerSide.Player, createSeededRng(handOfFight), deck)
      draws.push(dealt.drawPile.length)
      reshuffles.push(dealt.reshuffled)
      deck = closeHand(playOutHand(dealt))
    }
    expect(draws).toEqual([20, 7, 20, 7])
    // Exactly ONE reshuffle per cycle of two hands, and never on a fight's first hand.
    expect(reshuffles).toEqual([false, false, true, false])
  })

  it('D5 — the draw pile’s length never changes for the life of a hand, so it cannot run out', () => {
    const dealt = dealRound(PlayerSide.Cpu, createSeededRng(2026), FRESH_ENCOUNTER_DECK)
    const opening = dealt.drawPile.length
    let state = dealt
    while (state.phase !== RoundPhase.Complete) {
      expect(state.drawPile).toHaveLength(opening)
      const side = currentTurn(state)
      const legal = legalMoves(state, side)
      const plain = legal.find((c) => c.rank !== 3 && c.rank !== 5) ?? legal[0]
      const result = playCard(state, side, plain)
      if (!result.ok) throw new Error(`illegal move: ${result.reason}`)
      state = result.state
    }
    expect(state.drawPile).toHaveLength(opening)
  })

  it('AC5 — the player’s swap sends cards to the BOTTOM OF THE DRAW PILE, never to the spent pile', () => {
    const dealt = dealRound(PlayerSide.Cpu, createSeededRng(11), FRESH_ENCOUNTER_DECK)
    const thrown = dealt.hands[PlayerSide.Player].slice(0, MAX_CARDS_PER_DISCARD)
    const after = applyDiscard(dealt, PlayerSide.Player, thrown)
    expect(after.spentPile).toEqual(dealt.spentPile)
    expect(after.drawPile).toHaveLength(dealt.drawPile.length)
    expect(after.drawPile.slice(-thrown.length)).toEqual(thrown)
  })

  it('AC12 — a seeded encounter reproduces every deal, every skull and every reshuffle', () => {
    function threeHands(seed: number): RoundState[] {
      let deck = FRESH_ENCOUNTER_DECK
      const hands: RoundState[] = []
      for (let handOfFight = 1; handOfFight <= 3; handOfFight += 1) {
        const dealt = dealRound(PlayerSide.Player, createSeededRng(seed + handOfFight), deck)
        hands.push(dealt)
        deck = closeHand(playOutHand(dealt))
      }
      return hands
    }
    expect(threeHands(500)).toEqual(threeHands(500))
    expect(threeHands(500)[2].reshuffled).toBe(true)
  })
})
```

Run: `npx vitest run src/warCouncil/__tests__/deckCycle.test.ts`
Expected: exits 0, 5 passed. If `playOutHand` cannot avoid an ability prompt on some seed, change the SEED, not the assertion.

---

## Phase 5 — Final verification

The closing phase. No production changes — only sanity-checks that the cumulative work is clean.

### Task 14: Confirm the pure-core boundary still holds

- Skill: none — verification only, no code written

**Files:** *(none — read-only checks)*

- [x] **Step 1: Grep the two pure trees for React and DOM references**

Run: `Get-ChildItem src\warCouncil,src\hunt -Recurse -Include *.ts | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits.

- [x] **Step 2: Grep the two pure trees for a live `Math.random()` call**

Run: `Get-ChildItem src\warCouncil,src\hunt -Recurse -Include *.ts | Select-String -Pattern "Math\.random\("`
Expected: zero hits. Every existing mention of the name in those trees is prose inside a docblock and contains no `(`.

### Task 15: Confirm no tunable was hard-coded and no name drifted

- Skill: none — verification only, no code written

**Files:** *(none — read-only checks)*

- [x] **Step 1: Confirm the deal size is derived, never written as a literal**

Run: `Select-String -Path src\warCouncil\encounterDeck.ts,src\warCouncil\deal.ts -Pattern "\b13\b"`
Expected: zero hits. `CARDS_PER_DEAL` is `HAND_SIZE * 2 + 1`; a bare `13` in either file is a hard-coded tunable.

- [x] **Step 2: Confirm the slot machine's odds were not disturbed**

Run: `npx vitest run src/hunt/__tests__/slotOdds.test.ts`
Expected: exits 0; the `is 2.640625 cards on average` spec passes. This ticket touches no file the slot path reads, and this proves it rather than asserting it.

- [x] **Step 3: Confirm every file this contract touched is inside the 400-line budget**

Run: `Get-ChildItem src\App.tsx,src\app\handDeal.ts,src\app\warCouncil\WarCouncilRound.tsx,src\app\warCouncil\DiscardPile.tsx,src\app\warCouncil\labels.ts,src\app\warCouncil\warCouncilTable.css,src\warCouncil\encounterDeck.ts,src\warCouncil\deal.ts,src\warCouncil\playCard.ts,src\warCouncil\types.ts,src\hunt\seededRng.ts | ForEach-Object { "{0,5} {1}" -f (Get-Content $_.FullName).Count, $_.Name }`
Expected: every count is under 400. `(Get-Content).Count` is the array length — do **not** use `Measure-Object -Line`, which drops blank lines and hid a real breach on DLR-63.

### Task 16: Formatting, static gates, full suite, and build

- Skill: none — verification only, no code written

**Files:** *(none — read-only checks, plus Prettier scoped to this contract's own files)*

- [x] **Step 1: Format only the files this contract changed**

Run: `npx prettier --write src/warCouncil/encounterDeck.ts src/warCouncil/deal.ts src/warCouncil/playCard.ts src/warCouncil/types.ts src/warCouncil/index.ts src/hunt/seededRng.ts src/hunt/index.ts src/App.tsx src/app/handDeal.ts src/app/warCouncil/DiscardPile.tsx src/app/warCouncil/WarCouncilRound.tsx src/app/warCouncil/labels.ts src/app/warCouncil/warCouncilTable.css "src/warCouncil/__tests__/*.ts" "src/app/__tests__/*.ts" "src/app/warCouncil/__tests__/*.ts*" "src/hunt/__tests__/seededRng.test.ts"`
Expected: exits 0. **Never run `npm run format`** — it is `prettier --write` across the whole repo and rewrites ~58 pre-existing `.md` files nobody asked you to touch.

- [x] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npx vitest run --project node; npx vitest run --project dom; npm test`
Expected: all exit 0; Vitest reports 0 failed. The two per-project runs warm the Vite transform cache first — a cold `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond`, which is a worker-start timeout on the `dom` project and **not** a failing test. Baseline before this contract was 1624 passed of 1624 across 123 files; the count will be higher.

- [x] **Step 3: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 17: Write the PR description

- Skill: none — documentation hand-off, no code written

**Files:**
- Create: `.claude/contract/DLR-123-persistent-deck-across-hands/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include:
- A link to `plan.md` in this folder, and a note that `mockup.html` was built but went **unseen**.
- The change in one paragraph, and the deck arithmetic stated explicitly: 33-card deck; 13 per deal (6 + 6 + decree); draw pile 33 → 20 → 7 → reshuffle → 20; 26 cards seen per cycle; unseen pool 26 at hand one's deal and 13 at hand two's, so a specific card goes from ~1-in-4.3 to ~6-in-13 to be in the Quarry's hand.
- Every decision the developer must make (the `tasks.md` File map's "Developer decides or observes" list, verbatim) and every behaviour they must judge by playing.
- **Precisely what a browser would have checked**, since the browser pass was not requested this invocation.
- Verification results from Phase 5, with the counts quoted.
- A one-line note for future contributors: `spentPile` is the new pile, `discard` still means the player's swap, and the two must not be conflated.

---

## Self-review

**Spec coverage:**
- AC1 (fresh 33, 6 + 6 + 1, 20 left) — Tasks 2, 3; pinned by Task 13.
- AC2 (later hands deal from the same pile; no card returns) — Tasks 2, 3, 8; pinned by Task 13.
- AC3 (tricks to a face-down pile as they resolve) — Task 4.
- AC4 (the unspent decree is spent at hand end; 13 per hand) — Task 2 (`closeHand`), Task 8 (the driver's call).
- AC5 (swap and bury still go to the draw pile's bottom) — no production change; pinned by Task 13's fourth spec.
- AC6 (reshuffle below 13, a full reset) — Task 2 (`dealPileFor`), Task 3.
- AC7 (draw pile face-down with a live count) — already shipped in `DecreePile`; unchanged, and Task 12 keeps it beside the new plate.
- AC8 (spent pile face-down with a live count, never inspectable) — Tasks 9, 10, 12.
- AC9 (the reshuffle signalled; otherwise clear that nothing is reshuffled) — Tasks 1 (`reshuffled`), 3, 9, 10, 12.
- AC10 (reset at every encounter) — Task 8, Steps 5.
- AC11 (skulls per deal, unchanged) — no production change; pinned by Task 3's fourth new case.
- AC12 (determinism through deals, skulls and reshuffles) — Tasks 6, 7; pinned by Tasks 2, 7 and 13.
- Naming collision resolved — Task 1's `spentPile` docblock, Task 9's `SPENT_PILE_LABEL` docblock.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or a runnable command with an `Expected:` line. No step runs bare `vitest`, `npm run dev`, `npm run format`, or an `eslint-disable`, and none hand-edits `package-lock.json`.

**Type / name consistency:** `spentPile`, `reshuffled`, `EncounterDeck`, `DealPile`, `FRESH_ENCOUNTER_DECK`, `CARDS_PER_DEAL`, `isFreshDeck`, `closeHand`, `dealPileFor`, `dealSeedFor`, `dealHand`, `SPENT_PILE_LABEL`, `spentCountText`, `SPENT_STANDING_NOTE`, `RESHUFFLE_NOTE`, `wc-spent`, `wc-spent-top`, `wc-reshuffle-note`, `wc-is-reshuffled` — each is spelled identically in every task that names it and in `plan.md` Part 2 → Data shapes. `DiscardPile` is the component's name and `spentPile` the field's; that split is deliberate and is stated in Task 1's docblock.

**Phase boundary cleanliness:**
- Phase 1 ends type-checking: the required fields and all 13 construction sites move in one task (Task 1), the new module lands with no caller (Task 2), and the barrel is widened last (Task 5). No half-applied rename, no dead import, no spec importing a module that does not exist yet.
- Phase 2 ends type-checking: the engine is untouched, the seed helper and the driver helper each land with their specs, and `App.tsx` is rewired and re-measured in one task.
- Phase 3 ends type-checking: copy, component and stylesheet land before the felt renders the component (Task 12 is last), so no task references a label or a class that does not exist yet.
- Phase 4 adds one spec file and changes no production code, so it cannot break a boundary.
- Phase 5 writes nothing but `pr-description.md` and Prettier's scoped rewrite of this contract's own files.
