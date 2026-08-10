# Tasks: Spoils — sum the value of captured cards

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-10

**Goal:** Give the round engine a way to compute a score from cards actually captured, instead of only a trick count — `RoundState` grows a `capturedCards` field that `playCard.ts` fills in as tricks resolve, and a new pure `spoils(state, side)` sums those cards' values from T2's config, with Poison (rank 8) subtracting 1 and Treasure (rank 7) adding 1 per card captured.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/warCouncil/spoils.ts` — the `spoils(state, side, cardValue?)` function
- `src/warCouncil/__tests__/spoils.test.ts` — AC6 flat-value identity + AC7 rank-weighted/Poison-Treasure tests

**Modified:**
- `src/warCouncil/types.ts` — `RoundState` gains `capturedCards`; `CardRank` gains `Treasure: 7` and `Poison: 8`
- `src/warCouncil/deal.ts:13-24` — `dealRound` initializes `capturedCards` to `{ player: [], cpu: [] }`
- `src/warCouncil/__tests__/types.test.ts:4-18` — `baseState` fixture gains `capturedCards`
- `src/warCouncil/__tests__/playCard.test.ts:12-29` — `stateWith` fixture gains `capturedCards`; plus new assertions for AC2 and AC5
- `src/warCouncil/__tests__/legalMoves.test.ts:5-21` — `stateWith` fixture gains `capturedCards`
- `src/warCouncil/__tests__/abilities.test.ts:5-26` — `baseState` fixture gains `capturedCards`
- `src/warCouncil/__tests__/cpuPlayer.test.ts:20-37` — `stateWith` fixture gains `capturedCards`
- `src/app/warCouncil/__tests__/roundFixture.ts:6-42` — `makeRound` fixture gains `capturedCards`
- `src/warCouncil/playCard.ts:88-99` — trick-resolution branch appends captured cards to the winner's list
- `src/warCouncil/index.ts` — barrel export gains `spoils`
- `src/warCouncil/__tests__/deal.test.ts` — one assertion added confirming `capturedCards` starts `{ player: [], cpu: [] }`

**Deleted:** (none)

**Developer decides or observes:** (none — pure, isolated TypeScript with no consumer yet; every value this ticket needs is already fixed by T2's config or by the design/rules docs)

---

## Phase 1 — `RoundState` carries captured cards

`RoundState`'s shape changes (a new required field) and every constructor of that shape — one production site, six test fixtures — is updated in the same task, so the codebase type-checks the moment Task 1 completes. `playCard.ts`'s trick-resolution branch is then the one place that actually appends to the new field, using the `winner` value it already computes for `tricksWon`. Both tasks stay inside `src/warCouncil/`, no React, no DOM.

### Task 1: Add `capturedCards` to `RoundState` and thread it through every constructor ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/types.ts` (the `CardRank` object and the `RoundState` interface)
- Modify: `src/warCouncil/deal.ts:13-24`
- Modify: `src/warCouncil/__tests__/types.test.ts:4-18`
- Modify: `src/warCouncil/__tests__/playCard.test.ts:12-29`
- Modify: `src/warCouncil/__tests__/legalMoves.test.ts:5-21`
- Modify: `src/warCouncil/__tests__/abilities.test.ts:5-26`
- Modify: `src/warCouncil/__tests__/cpuPlayer.test.ts:20-37`
- Modify: `src/app/warCouncil/__tests__/roundFixture.ts:6-42`

- [x] **Step 1: Extend `CardRank` with `Treasure` and `Poison`, and update its comment**

In `src/warCouncil/types.ts`, replace:

```ts
// The five odd ranks each carry a named ability/rule — referenced by name at every
// branch that keys off one of them, rather than as a bare numeric literal.
export const CardRank = {
  Swan: 1,
  Fox: 3,
  Woodcutter: 5,
  Witch: 9,
  Monarch: 11,
} as const
```

with:

```ts
// Every rank with a named ability or scoring rule — referenced by name at every
// branch that keys off one of them, rather than as a bare numeric literal.
// Treasure (7) and Poison (8) are scoring interventions rather than play-time
// triggers (fox-in-the-forest.md → Poison cards; hybrid-design.md §1's component
// table) but are named here for the same reason.
export const CardRank = {
  Swan: 1,
  Fox: 3,
  Woodcutter: 5,
  Treasure: 7,
  Poison: 8,
  Witch: 9,
  Monarch: 11,
} as const
```

- [x] **Step 2: Add `capturedCards` to `RoundState`**

In `src/warCouncil/types.ts`, in the `RoundState` interface, add a new field immediately after `tricksWon`:

```ts
export interface RoundState {
  readonly dealer: PlayerSide
  readonly hands: Readonly<Record<PlayerSide, readonly Card[]>>
  readonly drawPile: readonly Card[]
  readonly decree: Card
  readonly trumpSuit: Suit
  readonly tricksWon: Readonly<Record<PlayerSide, number>>
  readonly capturedCards: Readonly<Record<PlayerSide, readonly Card[]>>
  readonly currentTrick: readonly TrickCard[]
  readonly leader: PlayerSide
  readonly tricksPlayed: number
  readonly phase: RoundPhase
}
```

- [x] **Step 3: Typecheck to see every constructor that now fails**

Run: `npm run typecheck`
Expected: non-zero exit, one error per `RoundState`/`WarCouncilState` object literal missing `capturedCards` — this confirms the audit's 7-site count and gives the exact error list to work through next.

- [x] **Step 4: Initialize `capturedCards` in `dealRound`**

In `src/warCouncil/deal.ts`, in the object returned by `dealRound`, add a `capturedCards` line immediately after `tricksWon`:

```ts
  return {
    dealer,
    hands: { [PlayerSide.Player]: playerHand, [PlayerSide.Cpu]: cpuHand },
    drawPile,
    decree,
    trumpSuit: decree.suit,
    tricksWon: { [PlayerSide.Player]: 0, [PlayerSide.Cpu]: 0 },
    capturedCards: { [PlayerSide.Player]: [], [PlayerSide.Cpu]: [] },
    currentTrick: [],
    leader: otherSide(dealer),
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
  }
```

- [x] **Step 5: Add `capturedCards` to every test-fixture factory**

In each of the six files below, find the `tricksWon: { player: 0, cpu: 0 },` line (or the `[PlayerSide.Player]: 0, [PlayerSide.Cpu]: 0` form in `roundFixture.ts`) inside the state-building factory function, and add a `capturedCards: { player: [], cpu: [] },` line immediately after it (matching whichever key style — string literal or `[PlayerSide.X]` — the surrounding object already uses in that file):

- `src/warCouncil/__tests__/types.test.ts` — inside `baseState`
- `src/warCouncil/__tests__/playCard.test.ts` — inside `stateWith`
- `src/warCouncil/__tests__/legalMoves.test.ts` — inside `stateWith`
- `src/warCouncil/__tests__/abilities.test.ts` — inside `baseState`
- `src/warCouncil/__tests__/cpuPlayer.test.ts` — inside `stateWith`
- `src/app/warCouncil/__tests__/roundFixture.ts` — inside `makeRound`, using `[PlayerSide.Player]: [], [PlayerSide.Cpu]: []` to match that file's existing key style

- [x] **Step 6: Typecheck clean**

Run: `npm run typecheck`
Expected: exits 0, no errors.

- [x] **Step 7: Run the affected scoped Vitest specs**

Run: `npx vitest run --project node src/warCouncil/__tests__/types.test.ts src/warCouncil/__tests__/deal.test.ts src/warCouncil/__tests__/legalMoves.test.ts src/warCouncil/__tests__/abilities.test.ts src/warCouncil/__tests__/cpuPlayer.test.ts`
Expected: exits 0, all existing assertions still pass unmodified (no assertion was loosened — only a new field was added to each fixture's return value, per AC8).

- [x] **Step 8: Add one assertion to `deal.test.ts` confirming the new field starts empty**

In `src/warCouncil/__tests__/deal.test.ts`, in the `'starts at tricksPlayed 0, both tricksWon 0, and phase AwaitingLead'` test, add after the existing `expect(state.tricksWon).toEqual({ player: 0, cpu: 0 })` line:

```ts
    expect(state.capturedCards).toEqual({ player: [], cpu: [] })
```

- [x] **Step 9: Run `deal.test.ts` to confirm the new assertion passes**

Run: `npx vitest run --project node src/warCouncil/__tests__/deal.test.ts`
Expected: exits 0, `Tests  6 passed` (5 existing + this step's new assertion inside an existing test, so the count of `it` blocks is unchanged — only the assertion count inside one grows).

### Task 2: `playCard.ts` appends captured cards to the trick winner ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/playCard.ts:88-99`
- Modify: `src/warCouncil/__tests__/playCard.test.ts:158-166` (extend the existing trump-resolution test with capture assertions — AC2)
- Modify: `src/warCouncil/__tests__/playCard.test.ts:1-11,169-219` (extend the existing full-round test with the 26-card invariant — AC5)

- [x] **Step 1: Append the resolved trick's cards to the winner's `capturedCards`, in trick order**

In `src/warCouncil/playCard.ts`, replace:

```ts
  // safe: length===1 already returned above, so this is exactly 2
  const completedTrick = currentTrick as [TrickCard, TrickCard]
  const winner = resolveTrickWinner(completedTrick, next.trumpSuit)
  const nextLeader = nextLeaderAfterTrick(completedTrick, winner)
  const tricksPlayed = next.tricksPlayed + 1
  const tricksWon = { ...next.tricksWon, [winner]: next.tricksWon[winner] + 1 }
  const phase = tricksPlayed === TRICKS_PER_ROUND ? RoundPhase.Complete : RoundPhase.AwaitingLead

  return {
    ok: true,
    state: { ...next, currentTrick: [], leader: nextLeader, tricksPlayed, tricksWon, phase },
  }
```

with:

```ts
  // safe: length===1 already returned above, so this is exactly 2
  const completedTrick = currentTrick as [TrickCard, TrickCard]
  const winner = resolveTrickWinner(completedTrick, next.trumpSuit)
  const nextLeader = nextLeaderAfterTrick(completedTrick, winner)
  const tricksPlayed = next.tricksPlayed + 1
  const tricksWon = { ...next.tricksWon, [winner]: next.tricksWon[winner] + 1 }
  const capturedCards = {
    ...next.capturedCards,
    [winner]: [...next.capturedCards[winner], completedTrick[0].card, completedTrick[1].card],
  }
  const phase = tricksPlayed === TRICKS_PER_ROUND ? RoundPhase.Complete : RoundPhase.AwaitingLead

  return {
    ok: true,
    state: {
      ...next,
      currentTrick: [],
      leader: nextLeader,
      tricksPlayed,
      tricksWon,
      capturedCards,
      phase,
    },
  }
```

- [x] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

- [x] **Step 3: Extend the existing trump-resolution test with a capture assertion (AC2)**

In `src/warCouncil/__tests__/playCard.test.ts`, in the `'a full trick resolves using the trump suit as of after the Fox exchange'` test, add after the existing `expect(afterFollow.state.tricksWon.cpu).toBe(1)` line:

```ts
    // AC2 — captured in trick order (lead card, then follow card), regardless of who led.
    expect(afterFollow.state.capturedCards.cpu).toEqual([
      { suit: 'keys', rank: 3 },
      { suit: 'moons', rank: 8 },
    ])
    expect(afterFollow.state.capturedCards.player).toEqual([])
```

- [x] **Step 4: Extend the full-round test with the 26-card invariant (AC5)**

In `src/warCouncil/__tests__/playCard.test.ts`, add `type Card` to the existing type-only import from `../types` at the top of the file. Then, in the `'deals and plays a full round to RoundPhase.Complete with 13 total tricks won'` test, declare an accumulator before the `while` loop and push into it each iteration, then assert on it after the loop:

```ts
  it('deals and plays a full round to RoundPhase.Complete with 13 total tricks won', () => {
    let state = dealRound('player', lcg(2024))
    let guard = 0
    const allPlayed: Card[] = []

    while (state.phase !== 'complete') {
      guard += 1
      if (guard > 500) throw new Error('runaway loop — round never completed')

      const turn =
        state.currentTrick.length === 0
          ? state.leader
          : state.currentTrick[0].side === 'player'
            ? 'cpu'
            : 'player'
      const options =
        state.currentTrick.length === 0
          ? state.hands[turn]
          : (() => {
              const led = state.currentTrick[0].card
              const followSuit = state.hands[turn].filter((c) => c.suit === led.suit)
              return followSuit.length > 0 ? followSuit : state.hands[turn]
            })()
      const chosen = options[0]
      allPlayed.push(chosen)

      const choice =
        chosen.rank === 3
          ? { kind: 'foxDecline' as const }
          : chosen.rank === 5
            ? { kind: 'woodcutterDiscard' as const, discard: state.drawPile[0] }
            : undefined

      const result = playCard(state, turn, chosen, choice)
      if (!result.ok) {
        throw new Error(`unexpected rejection: ${result.reason}`)
      }
      state = result.state
    }

    expect(state.tricksPlayed).toBe(13)
    expect(state.tricksWon.player + state.tricksWon.cpu).toBe(13)
    expect(state.phase).toBe('complete')

    // AC5 — the two captured lists together hold exactly the 26 cards actually
    // played, with no card appearing twice and none missing.
    const cardKey = (c: Card): string => `${c.suit}-${c.rank}`
    const capturedTotal = state.capturedCards.player.length + state.capturedCards.cpu.length
    expect(capturedTotal).toBe(26)
    const capturedKeys = [...state.capturedCards.player, ...state.capturedCards.cpu]
      .map(cardKey)
      .sort()
    const playedKeys = allPlayed.map(cardKey).sort()
    expect(capturedKeys).toEqual(playedKeys)
  })
```

- [x] **Step 5: Run the scoped Vitest spec for `playCard.ts`**

Run: `npx vitest run --project node src/warCouncil/__tests__/playCard.test.ts`
Expected: exits 0, all tests pass including the two extended assertions.

---

## Phase 2 — Spoils computation

`spoils.ts` is a new, self-contained pure function reading already-captured data — nothing it does can leave `src/warCouncil/` in a half-updated state, so this phase is a clean addition on top of Phase 1's now-complete `capturedCards` field.

### Task 3: Add `spoils(state, side, cardValue?)` and export it ✓

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/spoils.ts`
- Modify: `src/warCouncil/index.ts`

- [x] **Step 1: Write `spoils.ts`**

```ts
import { cardBaseValue, type Spoils } from '../hunt'
import { CardRank, type PlayerSide, type RoundState } from './types'

// §1's additive term — the trick's winner gains 1 per Treasure (7) captured and
// loses 1 per Poison (8) captured (fox-in-the-forest.md → Poison cards; §1's
// component table). `cardValue` defaults to T2's `cardBaseValue`; the override is
// only ever used in tests, mirroring `resolveStanding`'s injectable-table pattern
// in src/hunt/config.ts, so §3's flat-value identity is testable without mutating
// shared config.
export function spoils(
  state: RoundState,
  side: PlayerSide,
  cardValue: (rank: number) => number = cardBaseValue,
): Spoils {
  return state.capturedCards[side].reduce((total, card) => {
    const adjustment =
      card.rank === CardRank.Treasure ? 1 : card.rank === CardRank.Poison ? -1 : 0
    return total + cardValue(card.rank) + adjustment
  }, 0)
}
```

- [x] **Step 2: Export `spoils` from the barrel**

In `src/warCouncil/index.ts`, add:

```ts
export { spoils } from './spoils'
```

- [x] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

### Task 4: Test `spoils` — AC6 flat-value identity and AC7 rank-weighted example ✓

- Skill: react-frontend

**Files:**
- Test: `src/warCouncil/__tests__/spoils.test.ts`

- [x] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { spoils } from '../spoils'
import { PlayerSide, RoundPhase, type Card, type RoundState } from '../types'

function stateWithCaptured(
  capturedCards: Record<'player' | 'cpu', Card[]>,
  tricksWon: Record<'player' | 'cpu', number>,
): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [],
    decree: { suit: 'bells', rank: 2 },
    trumpSuit: 'bells',
    tricksWon,
    capturedCards,
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: tricksWon.player + tricksWon.cpu,
    phase: RoundPhase.AwaitingLead,
  }
}

describe('spoils — §3 flat-value identity (AC6)', () => {
  it('equals 2 × tricksWon under a flat card value of 1, with no Poison/Treasure in the capture set', () => {
    const captured = {
      player: [
        { suit: 'bells' as const, rank: 2 },
        { suit: 'keys' as const, rank: 3 },
        { suit: 'moons' as const, rank: 4 },
        { suit: 'bells' as const, rank: 5 },
      ],
      cpu: [],
    }
    const state = stateWithCaptured(captured, { player: 2, cpu: 0 })
    expect(spoils(state, 'player', () => 1)).toBe(2 * state.tricksWon.player)
  })
})

describe('spoils — rank-weighted default with Poison/Treasure (AC7)', () => {
  it('sums printed rank and folds in Poison(-1)/Treasure(+1) per capture', () => {
    const captured = {
      player: [
        { suit: 'bells' as const, rank: 4 }, // 4
        { suit: 'keys' as const, rank: 7 }, // Treasure: 7 + 1 = 8
        { suit: 'moons' as const, rank: 8 }, // Poison: 8 - 1 = 7
        { suit: 'bells' as const, rank: 11 }, // 11
      ],
      cpu: [],
    }
    const state = stateWithCaptured(captured, { player: 2, cpu: 0 })
    // hand-computed: 4 + (7+1) + (8-1) + 11 = 30
    expect(spoils(state, 'player')).toBe(30)
  })

  it('returns 0 for a side with no captured cards', () => {
    const state = stateWithCaptured({ player: [], cpu: [] }, { player: 0, cpu: 0 })
    expect(spoils(state, 'player')).toBe(0)
    expect(spoils(state, 'cpu')).toBe(0)
  })
})
```

- [x] **Step 2: Run the new spec**

Run: `npx vitest run --project node src/warCouncil/__tests__/spoils.test.ts`
Expected: exits 0, `Tests  3 passed`.

---

## Phase 3 — Final verification

No production changes — only sanity-checks that the cumulative work is clean.

### Task 5: Confirm the pure-core boundary still holds ✓

- [x] **Step 1: Grep `src/warCouncil/` and `src/hunt/` for React or DOM references**

Run: `Select-String -Path "src\warCouncil\**\*.ts","src\hunt\**\*.ts" -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage"`
Expected: zero hits. **Confirmed: zero hits.**

### Task 6: Confirm no bare Treasure/Poison literal and no stale comment remains ✓

- [x] **Step 1: Grep for a bare rank-7/8 comparison outside `CardRank`'s own definition**

Run: `Select-String -Path "src\warCouncil\**\*.ts" -Pattern "rank\s*===\s*7|rank\s*===\s*8" | Where-Object { $_.Path -notmatch 'types\.ts$' }`
Expected: zero hits — every Treasure/Poison check goes through `CardRank.Treasure`/`CardRank.Poison`, defined once in `types.ts`. **Confirmed: zero hits.**

- [x] **Step 2: Confirm the stale "five odd ranks" comment is gone**

Run: `Select-String -Path "src\warCouncil\types.ts" -Pattern "five odd ranks"`
Expected: zero hits. **Confirmed: zero hits.**

### Task 7: Static gates and full suite ✓

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports `0 failed`.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 8: Update the PR description ✓

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include:
- Link to `plan.md` in this folder.
- Summary: `RoundState` now retains captured cards per side; `playCard.ts` appends them on every resolved trick; a new `spoils(state, side)` sums their value from `src/hunt/config.ts`'s `cardBaseValue`, folding in Poison (-1) and Treasure (+1) adjustments.
- Note the two judgement calls flagged in `plan.md` → Risks for the developer to confirm: the `CardRank.Treasure`/`CardRank.Poison` extension, and `spoils`'s optional `cardValue` parameter.
- Verification results from Task 7 (typecheck, lint, test, build — all green).
- One-line note for future contributors: `spoils` reads `state.capturedCards`, not trick history — any future ticket that needs a per-trick replay view will need to add trick grouping, since this ticket deliberately stores a flat per-side list (per the ticket's own "Default taken").

---

## Self-review

**Spec coverage:**
- AC1 (`RoundState` retains captured cards, `tricksWon` unchanged) — Task 1.
- AC2 (`playCard.ts` appends both cards in trick order) — Task 2, Step 1 and Step 3.
- AC3 (`spoils(state, side)` reads value from T2's config) — Task 3.
- AC4 (Poison subtracts, Treasure adds, folded into `spoils`) — Task 3, tested in Task 4.
- AC5 (26-card invariant) — Task 2, Step 4.
- AC6 (flat-value identity) — Task 4.
- AC7 (rank-weighted hand-computed example with adjustments) — Task 4.
- AC8 (scoped Vitest + typecheck green; no weakened test) — every task's verification steps, plus Task 7; every fixture edit in Task 1 is additive only.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or command.

**Type / name consistency:** `capturedCards`, `spoils`, `CardRank.Treasure`, `CardRank.Poison`, and the `cardValue` parameter name are used identically across every task that touches them — confirmed against `plan.md` Part 2 → Data shapes.

**Phase boundary cleanliness:** Phase 1 ends with every `RoundState` constructor updated and the full scoped test set green — no half-applied field, no dead import (`type Card` is added to `playCard.test.ts` in the same task that uses it). Phase 2 adds one new self-contained file and one barrel export — nothing else in the tree references it yet, so there is nothing to leave half-wired. Phase 3 is verification-only, no production edits.
