# Tasks: War Council rules engine — Fox in the Forest, base 33-card deck

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-03

**Goal:** Build the War Council's rules engine as a pure, headless module under `src/warCouncil/` — deck, deterministic-shuffle-and-deal, legal-move validation, trick-winner resolution, the base game's odd-card abilities (Swan, Fox, Woodcutter, Witch, Monarch), and end-of-round scoring bands — replacing SCRUM-19's `WarCouncilState = unknown` placeholder with the real engine state.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/warCouncil/types.ts` — `Suit`, `Card`, `PlayerSide`, `RoundPhase`, `TrickCard`, `RoundState`, `currentTurn`, `AbilityChoiceKind`, `AbilityChoice`, `IllegalMoveReason`, `PlayCardResult`
- `src/warCouncil/cardUtils.ts` — `sameCard`, `containsCard`, `removeCard`, `cardsOfSuit`, `highestOfSuit`
- `src/warCouncil/deck.ts` — `createDeck`
- `src/warCouncil/shuffle.ts` — `shuffle`
- `src/warCouncil/deal.ts` — `dealRound`
- `src/warCouncil/scoring.ts` — `tricksToPoints`, `scoreRound`
- `src/warCouncil/legalMoves.ts` — `legalMoves`
- `src/warCouncil/resolveTrick.ts` — `resolveTrickWinner`
- `src/warCouncil/abilities.ts` — `applyFoxExchange`, `applyWoodcutterDraw`, `nextLeaderAfterTrick`
- `src/warCouncil/playCard.ts` — `playCard`
- `src/warCouncil/__tests__/types.test.ts` — `currentTurn` derivation
- `src/warCouncil/__tests__/cardUtils.test.ts`
- `src/warCouncil/__tests__/deck.test.ts`
- `src/warCouncil/__tests__/shuffle.test.ts`
- `src/warCouncil/__tests__/deal.test.ts`
- `src/warCouncil/__tests__/scoring.test.ts`
- `src/warCouncil/__tests__/legalMoves.test.ts`
- `src/warCouncil/__tests__/resolveTrick.test.ts`
- `src/warCouncil/__tests__/abilities.test.ts`
- `src/warCouncil/__tests__/playCard.test.ts`

**Modified:**
- `src/warCouncil/index.ts` — replaces `export type WarCouncilState = unknown` with `export type WarCouncilState = RoundState` and re-exports the public engine surface

**Deleted:** (none)

**Developer decides or observes:** (none — no tuning value, dependency, or app-visible behaviour in this ticket; every acceptance criterion is machine-verifiable by Vitest and `npm run typecheck`)

---

## Phase 1 — Foundational types, card utilities, and the deck

This phase creates the shared vocabulary every later phase builds on: the card/suit/side/phase types, the reducer's result and reason-code types, and the 33-card deck. It ends type-checking with no game logic yet — nothing here plays a card or resolves a trick.

### Task 1: Core types ✓

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/types.ts`
- Test: `src/warCouncil/__tests__/types.test.ts`

- [x] **Step 1: Write `types.ts`**

```ts
export const Suit = {
  Bells: 'bells',
  Keys: 'keys',
  Moons: 'moons',
} as const
export type Suit = (typeof Suit)[keyof typeof Suit]

export const ALL_SUITS: readonly Suit[] = [Suit.Bells, Suit.Keys, Suit.Moons]
export const RANKS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

export interface Card {
  readonly suit: Suit
  readonly rank: number
}

export const PlayerSide = {
  Player: 'player',
  Cpu: 'cpu',
} as const
export type PlayerSide = (typeof PlayerSide)[keyof typeof PlayerSide]

export function otherSide(side: PlayerSide): PlayerSide {
  return side === PlayerSide.Player ? PlayerSide.Cpu : PlayerSide.Player
}

export const RoundPhase = {
  AwaitingLead: 'awaitingLead',
  AwaitingFollow: 'awaitingFollow',
  Complete: 'complete',
} as const
export type RoundPhase = (typeof RoundPhase)[keyof typeof RoundPhase]

export interface TrickCard {
  readonly side: PlayerSide
  readonly card: Card
}

export interface RoundState {
  readonly dealer: PlayerSide
  readonly hands: Readonly<Record<PlayerSide, readonly Card[]>>
  readonly drawPile: readonly Card[]
  readonly decree: Card
  readonly trumpSuit: Suit
  readonly tricksWon: Readonly<Record<PlayerSide, number>>
  readonly currentTrick: readonly TrickCard[]
  readonly leader: PlayerSide
  readonly tricksPlayed: number
  readonly phase: RoundPhase
}

export function currentTurn(state: RoundState): PlayerSide {
  return state.currentTrick.length === 0 ? state.leader : otherSide(state.currentTrick[0].side)
}

export const AbilityChoiceKind = {
  FoxExchange: 'foxExchange',
  FoxDecline: 'foxDecline',
  WoodcutterDiscard: 'woodcutterDiscard',
} as const
export type AbilityChoiceKind = (typeof AbilityChoiceKind)[keyof typeof AbilityChoiceKind]

export type AbilityChoice =
  | { readonly kind: typeof AbilityChoiceKind.FoxExchange; readonly handCard: Card }
  | { readonly kind: typeof AbilityChoiceKind.FoxDecline }
  | { readonly kind: typeof AbilityChoiceKind.WoodcutterDiscard; readonly discard: Card }

export const IllegalMoveReason = {
  RoundComplete: 'roundComplete',
  NotYourTurn: 'notYourTurn',
  CardNotInHand: 'cardNotInHand',
  MustFollowLeadSuit: 'mustFollowLeadSuit',
  MustFollowMonarch: 'mustFollowMonarch',
  MissingAbilityChoice: 'missingAbilityChoice',
  UnexpectedAbilityChoice: 'unexpectedAbilityChoice',
  InvalidFoxExchangeCard: 'invalidFoxExchangeCard',
  InvalidWoodcutterDiscard: 'invalidWoodcutterDiscard',
} as const
export type IllegalMoveReason = (typeof IllegalMoveReason)[keyof typeof IllegalMoveReason]

export type PlayCardResult =
  | { readonly ok: true; readonly state: RoundState }
  | { readonly ok: false; readonly reason: IllegalMoveReason }
```

- [x] **Step 2: Write the test for `currentTurn`**

```ts
import { describe, expect, it } from 'vitest'
import { currentTurn, PlayerSide, RoundPhase, type RoundState } from '../types'

function baseState(overrides: Partial<RoundState> = {}): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [],
    decree: { suit: 'bells', rank: 2 },
    trumpSuit: 'bells',
    tricksWon: { player: 0, cpu: 0 },
    currentTrick: [],
    leader: PlayerSide.Cpu,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
    ...overrides,
  }
}

describe('currentTurn', () => {
  it('is the leader when no card has been played to the trick yet', () => {
    expect(currentTurn(baseState({ leader: PlayerSide.Cpu, currentTrick: [] }))).toBe('cpu')
  })

  it('is the other side once the lead card has been played', () => {
    const state = baseState({
      leader: PlayerSide.Player,
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'bells', rank: 4 } }],
    })
    expect(currentTurn(state)).toBe('cpu')
  })
})
```

- [x] **Step 3: Run the test and typecheck**

Run: `npx vitest run src/warCouncil/__tests__/types.test.ts; npm run typecheck`
Expected: 2 passed; typecheck exits 0.

### Task 2: Card utility helpers ✓

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/cardUtils.ts`
- Test: `src/warCouncil/__tests__/cardUtils.test.ts`

- [x] **Step 1: Write the failing test for `sameCard`, `containsCard`, `removeCard`, `cardsOfSuit`, `highestOfSuit`**

```ts
import { describe, expect, it } from 'vitest'
import { cardsOfSuit, containsCard, highestOfSuit, removeCard, sameCard } from '../cardUtils'
import type { Card } from '../types'

const bells4: Card = { suit: 'bells', rank: 4 }
const bells9: Card = { suit: 'bells', rank: 9 }
const keys2: Card = { suit: 'keys', rank: 2 }
const hand: Card[] = [bells4, bells9, keys2]

describe('cardUtils', () => {
  it('sameCard compares by suit and rank', () => {
    expect(sameCard(bells4, { suit: 'bells', rank: 4 })).toBe(true)
    expect(sameCard(bells4, bells9)).toBe(false)
  })

  it('containsCard finds a structurally equal card', () => {
    expect(containsCard(hand, { suit: 'keys', rank: 2 })).toBe(true)
    expect(containsCard(hand, { suit: 'moons', rank: 2 })).toBe(false)
  })

  it('removeCard returns a new array without mutating the original', () => {
    const result = removeCard(hand, bells9)
    expect(result).toEqual([bells4, keys2])
    expect(hand).toEqual([bells4, bells9, keys2])
  })

  it('removeCard is a no-op copy when the card is absent', () => {
    expect(removeCard(hand, { suit: 'moons', rank: 11 })).toEqual(hand)
  })

  it('cardsOfSuit filters by suit', () => {
    expect(cardsOfSuit(hand, 'bells')).toEqual([bells4, bells9])
  })

  it('highestOfSuit returns the highest rank of that suit, or undefined', () => {
    expect(highestOfSuit(hand, 'bells')).toEqual(bells9)
    expect(highestOfSuit(hand, 'moons')).toBeUndefined()
  })
})
```

- [x] **Step 2: Run the test and confirm it fails (module does not exist yet)**

Run: `npx vitest run src/warCouncil/__tests__/cardUtils.test.ts`
Expected: fails — `cardUtils.ts` does not exist yet, import cannot resolve.

- [x] **Step 3: Implement `cardUtils.ts`**

```ts
import type { Card, Suit } from './types'

export function sameCard(a: Card, b: Card): boolean {
  return a.suit === b.suit && a.rank === b.rank
}

export function containsCard(hand: readonly Card[], card: Card): boolean {
  return hand.some((c) => sameCard(c, card))
}

export function removeCard(hand: readonly Card[], card: Card): Card[] {
  const index = hand.findIndex((c) => sameCard(c, card))
  if (index === -1) return [...hand]
  return [...hand.slice(0, index), ...hand.slice(index + 1)]
}

export function cardsOfSuit(hand: readonly Card[], suit: Suit): Card[] {
  return hand.filter((c) => c.suit === suit)
}

export function highestOfSuit(hand: readonly Card[], suit: Suit): Card | undefined {
  return cardsOfSuit(hand, suit).reduce<Card | undefined>(
    (highest, c) => (!highest || c.rank > highest.rank ? c : highest),
    undefined,
  )
}
```

- [x] **Step 4: Run the test and confirm it passes, then typecheck**

Run: `npx vitest run src/warCouncil/__tests__/cardUtils.test.ts; npm run typecheck`
Expected: 6 passed; typecheck exits 0.

### Task 3: The base 33-card deck ✓

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/deck.ts`
- Test: `src/warCouncil/__tests__/deck.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { createDeck } from '../deck'

describe('createDeck', () => {
  it('has exactly 33 cards: 3 suits x ranks 1-11', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(33)
  })

  it('has no duplicate suit+rank pairs', () => {
    const keys = createDeck().map((c) => `${c.suit}-${c.rank}`)
    expect(new Set(keys).size).toBe(33)
  })

  it('has every rank 1-11 in every suit', () => {
    const deck = createDeck()
    for (const suit of ['bells', 'keys', 'moons'] as const) {
      const ranks = deck.filter((c) => c.suit === suit).map((c) => c.rank).sort((a, b) => a - b)
      expect(ranks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    }
  })
})
```

- [x] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/warCouncil/__tests__/deck.test.ts`
Expected: fails — `deck.ts` does not exist yet.

- [x] **Step 3: Implement `deck.ts`**

```ts
import { ALL_SUITS, RANKS, type Card } from './types'

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of ALL_SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank })
    }
  }
  return deck
}
```

- [x] **Step 4: Run the test and confirm it passes, then typecheck**

Run: `npx vitest run src/warCouncil/__tests__/deck.test.ts; npm run typecheck`
Expected: 3 passed; typecheck exits 0.

---

## Phase 2 — Deterministic shuffle, deal, and scoring

This phase adds round setup and end-of-round scoring, both of which depend only on Phase 1's types and the deck — no trick-taking logic yet. It ends type-checking with a fully dealable, fully scoreable round, still with no way to play a card.

### Task 4: Dependency-injected shuffle ✓

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/shuffle.ts`
- Test: `src/warCouncil/__tests__/shuffle.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { shuffle } from '../shuffle'

function fixedSequence(values: number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

describe('shuffle', () => {
  it('returns a permutation containing exactly the same elements', () => {
    const input = [1, 2, 3, 4, 5]
    const result = shuffle(input, fixedSequence([0.9, 0.1, 0.5, 0.2, 0.8]))
    expect([...result].sort()).toEqual([...input].sort())
  })

  it('does not mutate the input array', () => {
    const input = [1, 2, 3]
    shuffle(input, fixedSequence([0.5, 0.5, 0.5]))
    expect(input).toEqual([1, 2, 3])
  })

  it('is deterministic for a given rng sequence', () => {
    const input = [1, 2, 3, 4, 5]
    const rngValues = [0.9, 0.1, 0.5, 0.2, 0.8]
    const first = shuffle(input, fixedSequence(rngValues))
    const second = shuffle(input, fixedSequence(rngValues))
    expect(first).toEqual(second)
  })
})
```

- [x] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/warCouncil/__tests__/shuffle.test.ts`
Expected: fails — `shuffle.ts` does not exist yet.

- [x] **Step 3: Implement `shuffle.ts`**

```ts
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const temp = result[i]
    result[i] = result[j]
    result[j] = temp
  }
  return result
}
```

- [x] **Step 4: Run the test and confirm it passes, then typecheck**

Run: `npx vitest run src/warCouncil/__tests__/shuffle.test.ts; npm run typecheck`
Expected: 3 passed; typecheck exits 0.

### Task 5: Round setup — `dealRound` ✓

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/deal.ts`
- Test: `src/warCouncil/__tests__/deal.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { dealRound } from '../deal'
import { PlayerSide, RoundPhase } from '../types'

function lcg(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 9301 + 49297) % 233280
    return state / 233280
  }
}

describe('dealRound', () => {
  it('deals 13 cards to each side, a 6-card draw pile, and a decree card', () => {
    const state = dealRound(PlayerSide.Player, lcg(42))
    expect(state.hands.player).toHaveLength(13)
    expect(state.hands.cpu).toHaveLength(13)
    expect(state.drawPile).toHaveLength(6)
    expect(state.decree).toBeDefined()
  })

  it('accounts for all 33 cards with no duplicates across hands, pile, and decree', () => {
    const state = dealRound(PlayerSide.Cpu, lcg(7))
    const all = [...state.hands.player, ...state.hands.cpu, ...state.drawPile, state.decree]
    const keys = all.map((c) => `${c.suit}-${c.rank}`)
    expect(new Set(keys).size).toBe(33)
    expect(all).toHaveLength(33)
  })

  it('sets trumpSuit to the decree card\'s suit', () => {
    const state = dealRound(PlayerSide.Player, lcg(99))
    expect(state.trumpSuit).toBe(state.decree.suit)
  })

  it('sets the leader to the non-dealer side', () => {
    expect(dealRound(PlayerSide.Player, lcg(1)).leader).toBe('cpu')
    expect(dealRound(PlayerSide.Cpu, lcg(1)).leader).toBe('player')
  })

  it('starts at tricksPlayed 0, both tricksWon 0, and phase AwaitingLead', () => {
    const state = dealRound(PlayerSide.Player, lcg(3))
    expect(state.tricksPlayed).toBe(0)
    expect(state.tricksWon).toEqual({ player: 0, cpu: 0 })
    expect(state.phase).toBe(RoundPhase.AwaitingLead)
    expect(state.currentTrick).toEqual([])
  })

  it('is deterministic for the same dealer and rng', () => {
    const a = dealRound(PlayerSide.Player, lcg(55))
    const b = dealRound(PlayerSide.Player, lcg(55))
    expect(a).toEqual(b)
  })
})
```

- [x] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/warCouncil/__tests__/deal.test.ts`
Expected: fails — `deal.ts` does not exist yet.

- [x] **Step 3: Implement `deal.ts`**

```ts
import { createDeck } from './deck'
import { shuffle } from './shuffle'
import { otherSide, PlayerSide, RoundPhase, type RoundState } from './types'

export function dealRound(dealer: PlayerSide, rng: () => number): RoundState {
  const shuffled = shuffle(createDeck(), rng)
  const playerHand = shuffled.slice(0, 13)
  const cpuHand = shuffled.slice(13, 26)
  const remaining = shuffled.slice(26)
  const decree = remaining[0]
  const drawPile = remaining.slice(1)

  return {
    dealer,
    hands: { [PlayerSide.Player]: playerHand, [PlayerSide.Cpu]: cpuHand },
    drawPile,
    decree,
    trumpSuit: decree.suit,
    tricksWon: { [PlayerSide.Player]: 0, [PlayerSide.Cpu]: 0 },
    currentTrick: [],
    leader: otherSide(dealer),
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
  }
}
```

- [x] **Step 4: Run the test and confirm it passes, then typecheck**

Run: `npx vitest run src/warCouncil/__tests__/deal.test.ts; npm run typecheck`
Expected: 6 passed; typecheck exits 0.

### Task 6: End-of-round scoring bands ✓

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/scoring.ts`
- Test: `src/warCouncil/__tests__/scoring.test.ts`

- [x] **Step 1: Write the failing test — every possible trick split**

```ts
import { describe, expect, it } from 'vitest'
import { scoreRound, tricksToPoints } from '../scoring'

describe('tricksToPoints', () => {
  it.each([
    [0, 6], [1, 6], [2, 6], [3, 6],
    [4, 1],
    [5, 2],
    [6, 3],
    [7, 6], [8, 6], [9, 6],
    [10, 0], [11, 0], [12, 0], [13, 0],
  ])('tricks=%i -> %i points', (tricks, points) => {
    expect(tricksToPoints(tricks)).toBe(points)
  })
})

describe('scoreRound', () => {
  it('scores both sides from their tricksWon, summing to a locked pair for every split', () => {
    for (let playerTricks = 0; playerTricks <= 13; playerTricks++) {
      const cpuTricks = 13 - playerTricks
      const result = scoreRound({ player: playerTricks, cpu: cpuTricks })
      expect(result.player).toBe(tricksToPoints(playerTricks))
      expect(result.cpu).toBe(tricksToPoints(cpuTricks))
    }
  })
})
```

- [x] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/warCouncil/__tests__/scoring.test.ts`
Expected: fails — `scoring.ts` does not exist yet.

- [x] **Step 3: Implement `scoring.ts`**

```ts
import type { PlayerSide } from './types'

export function tricksToPoints(tricks: number): number {
  if (tricks <= 3) return 6
  if (tricks === 4) return 1
  if (tricks === 5) return 2
  if (tricks === 6) return 3
  if (tricks <= 9) return 6
  return 0
}

export function scoreRound(
  tricksWon: Readonly<Record<PlayerSide, number>>,
): Record<PlayerSide, number> {
  const result = {} as Record<PlayerSide, number>
  for (const side of Object.keys(tricksWon) as PlayerSide[]) {
    result[side] = tricksToPoints(tricksWon[side])
  }
  return result
}
```

- [x] **Step 4: Run the test and confirm it passes, then typecheck**

Run: `npx vitest run src/warCouncil/__tests__/scoring.test.ts; npm run typecheck`
Expected: 15 passed; typecheck exits 0.

---

## Phase 3 — Legal-move validation

This phase adds the follow-suit rule and the Monarch (11) forced-response constraint. It depends on Phase 1's types and `cardUtils` only — no trick resolution or ability application yet, so it type-checks standalone.

### Task 7: `legalMoves` ✓

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/legalMoves.ts`
- Test: `src/warCouncil/__tests__/legalMoves.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { legalMoves } from '../legalMoves'
import { PlayerSide, RoundPhase, type Card, type RoundState } from '../types'

function stateWith(hands: Record<'player' | 'cpu', Card[]>, currentTrick: RoundState['currentTrick']): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands,
    drawPile: [],
    decree: { suit: 'bells', rank: 2 },
    trumpSuit: 'bells',
    tricksWon: { player: 0, cpu: 0 },
    currentTrick,
    leader: PlayerSide.Player,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
  }
}

describe('legalMoves', () => {
  it('the leader may play any card in hand', () => {
    const hand: Card[] = [{ suit: 'bells', rank: 4 }, { suit: 'keys', rank: 7 }]
    const state = stateWith({ player: hand, cpu: [] }, [])
    expect(legalMoves(state, 'player')).toEqual(hand)
  })

  it('the follower must play the lead suit if they hold one', () => {
    const cpuHand: Card[] = [{ suit: 'keys', rank: 3 }, { suit: 'bells', rank: 8 }, { suit: 'moons', rank: 1 }]
    const state = stateWith(
      { player: [], cpu: cpuHand },
      [{ side: 'player', card: { suit: 'keys', rank: 9 } }],
    )
    expect(legalMoves(state, 'cpu')).toEqual([{ suit: 'keys', rank: 3 }])
  })

  it('the follower may play any card if they hold none of the lead suit', () => {
    const cpuHand: Card[] = [{ suit: 'bells', rank: 8 }, { suit: 'moons', rank: 1 }]
    const state = stateWith(
      { player: [], cpu: cpuHand },
      [{ side: 'player', card: { suit: 'keys', rank: 9 } }],
    )
    expect(legalMoves(state, 'cpu')).toEqual(cpuHand)
  })

  it('Monarch led: follower holding the suit must play its Swan and/or its highest card of that suit', () => {
    const cpuHand: Card[] = [
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 6 },
      { suit: 'bells', rank: 10 },
    ]
    const state = stateWith(
      { player: [], cpu: cpuHand },
      [{ side: 'player', card: { suit: 'keys', rank: 11 } }],
    )
    expect(legalMoves(state, 'cpu')).toEqual([{ suit: 'keys', rank: 1 }, { suit: 'keys', rank: 6 }])
  })

  it('Monarch led: when the Swan of that suit is also the highest, the set has one card, not a duplicate', () => {
    const cpuHand: Card[] = [{ suit: 'keys', rank: 1 }, { suit: 'bells', rank: 10 }]
    const state = stateWith(
      { player: [], cpu: cpuHand },
      [{ side: 'player', card: { suit: 'keys', rank: 11 } }],
    )
    expect(legalMoves(state, 'cpu')).toEqual([{ suit: 'keys', rank: 1 }])
  })

  it('Monarch led: follower with none of that suit may play any card', () => {
    const cpuHand: Card[] = [{ suit: 'bells', rank: 10 }, { suit: 'moons', rank: 3 }]
    const state = stateWith(
      { player: [], cpu: cpuHand },
      [{ side: 'player', card: { suit: 'keys', rank: 11 } }],
    )
    expect(legalMoves(state, 'cpu')).toEqual(cpuHand)
  })
})
```

- [x] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/warCouncil/__tests__/legalMoves.test.ts`
Expected: fails — `legalMoves.ts` does not exist yet.

- [x] **Step 3: Implement `legalMoves.ts`**

```ts
import { cardsOfSuit, highestOfSuit, sameCard } from './cardUtils'
import type { Card, PlayerSide, RoundState } from './types'

export function legalMoves(state: RoundState, side: PlayerSide): readonly Card[] {
  const hand = state.hands[side]

  if (state.currentTrick.length === 0) {
    return hand
  }

  const led = state.currentTrick[0].card

  if (led.rank === 11) {
    const suitCards = cardsOfSuit(hand, led.suit)
    if (suitCards.length === 0) {
      return hand
    }
    const swan = suitCards.find((c) => c.rank === 1)
    const highest = highestOfSuit(hand, led.suit)
    const options = [swan, highest].filter((c): c is Card => c !== undefined)
    return options.filter((c, i) => options.findIndex((o) => sameCard(o, c)) === i)
  }

  const followSuit = cardsOfSuit(hand, led.suit)
  return followSuit.length > 0 ? followSuit : hand
}
```

- [x] **Step 4: Run the test and confirm it passes, then typecheck**

Run: `npx vitest run src/warCouncil/__tests__/legalMoves.test.ts; npm run typecheck`
Expected: 6 passed; typecheck exits 0.

---

## Phase 4 — Trick-winner resolution

This phase adds trump/decree and Witch resolution, in isolation from ability application and the reducer. It ends type-checking with a fully correct "given two played cards and the current trump suit, who wins" function, independently tested against the Witch edge cases the rules doc calls out.

### Task 8: `resolveTrickWinner` ✓

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/resolveTrick.ts`
- Test: `src/warCouncil/__tests__/resolveTrick.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { resolveTrickWinner } from '../resolveTrick'
import type { Suit, TrickCard } from '../types'

function trick(leadSuit: Suit, leadRank: number, followSuit: Suit, followRank: number): [TrickCard, TrickCard] {
  return [
    { side: 'player', card: { suit: leadSuit, rank: leadRank } },
    { side: 'cpu', card: { suit: followSuit, rank: followRank } },
  ]
}

describe('resolveTrickWinner', () => {
  it('higher trump wins when both cards are trump suit', () => {
    expect(resolveTrickWinner(trick('bells', 4, 'bells', 9), 'bells')).toBe('cpu')
  })

  it('a single trump card beats a non-trump lead-suit card', () => {
    expect(resolveTrickWinner(trick('keys', 8, 'bells', 2), 'bells')).toBe('cpu')
  })

  it('neither trump: higher card in the lead suit wins', () => {
    expect(resolveTrickWinner(trick('keys', 3, 'keys', 10), 'bells')).toBe('cpu')
  })

  it('neither trump, follower off-suit: the lead card wins', () => {
    expect(resolveTrickWinner(trick('keys', 3, 'moons', 10), 'bells')).toBe('player')
  })

  it('a single Witch (rank 9) is treated as trump even off-suit', () => {
    expect(resolveTrickWinner(trick('keys', 3, 'moons', 9), 'bells')).toBe('cpu')
  })

  it('a single Witch loses to a genuine higher trump', () => {
    expect(resolveTrickWinner(trick('bells', 10, 'moons', 9), 'bells')).toBe('player')
  })

  it('two Witches neutralise each other: normal trump/lead-suit rule applies', () => {
    expect(resolveTrickWinner(trick('keys', 9, 'moons', 9), 'bells')).toBe('player')
  })

  it('two Witches, trump suit present: the trump-suit Witch wins', () => {
    expect(resolveTrickWinner(trick('keys', 9, 'bells', 9), 'bells')).toBe('cpu')
  })
})
```

- [x] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/warCouncil/__tests__/resolveTrick.test.ts`
Expected: fails — `resolveTrick.ts` does not exist yet.

- [x] **Step 3: Implement `resolveTrick.ts`**

```ts
import type { PlayerSide, Suit, TrickCard } from './types'

export function resolveTrickWinner(trick: readonly [TrickCard, TrickCard], trumpSuit: Suit): PlayerSide {
  const [lead, follow] = trick
  const witchCount = [lead, follow].filter((t) => t.card.rank === 9).length

  const isEffectiveTrump = (t: TrickCard): boolean =>
    t.card.suit === trumpSuit || (witchCount === 1 && t.card.rank === 9)

  const leadIsTrump = isEffectiveTrump(lead)
  const followIsTrump = isEffectiveTrump(follow)

  if (leadIsTrump || followIsTrump) {
    if (leadIsTrump && followIsTrump) {
      return lead.card.rank > follow.card.rank ? lead.side : follow.side
    }
    return leadIsTrump ? lead.side : follow.side
  }

  if (follow.card.suit === lead.card.suit) {
    return lead.card.rank > follow.card.rank ? lead.side : follow.side
  }
  return lead.side
}
```

- [x] **Step 4: Run the test and confirm it passes, then typecheck**

Run: `npx vitest run src/warCouncil/__tests__/resolveTrick.test.ts; npm run typecheck`
Expected: 8 passed; typecheck exits 0.

---

## Phase 5 — Odd-card ability effects

This phase implements the three ability effects that mutate state directly (Fox's decree exchange, Woodcutter's draw/discard, Swan's next-leader override), independent of the `playCard` reducer that will dispatch them. It ends type-checking with each ability effect independently tested against a hand-built `RoundState` fixture.

### Task 9: `applyFoxExchange`, `applyWoodcutterDraw`, `nextLeaderAfterTrick` ✓

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/abilities.ts`
- Test: `src/warCouncil/__tests__/abilities.test.ts`

- [x] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest'
import { applyFoxExchange, applyWoodcutterDraw, nextLeaderAfterTrick } from '../abilities'
import { PlayerSide, RoundPhase, type RoundState } from '../types'

function baseState(overrides: Partial<RoundState> = {}): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: {
      player: [{ suit: 'keys', rank: 3 }, { suit: 'moons', rank: 6 }],
      cpu: [{ suit: 'bells', rank: 8 }],
    },
    drawPile: [{ suit: 'moons', rank: 2 }, { suit: 'keys', rank: 5 }],
    decree: { suit: 'bells', rank: 4 },
    trumpSuit: 'bells',
    tricksWon: { player: 0, cpu: 0 },
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
    ...overrides,
  }
}

describe('applyFoxExchange', () => {
  it('swaps the decree for the given hand card and updates trumpSuit', () => {
    const state = baseState()
    const next = applyFoxExchange(state, 'player', { suit: 'moons', rank: 6 })
    expect(next.decree).toEqual({ suit: 'moons', rank: 6 })
    expect(next.trumpSuit).toBe('moons')
    expect(next.hands.player).toEqual([{ suit: 'keys', rank: 3 }, { suit: 'bells', rank: 4 }])
  })
})

describe('applyWoodcutterDraw', () => {
  it('draws the top of the draw pile into hand, then discards the chosen card to the bottom', () => {
    const state = baseState()
    const next = applyWoodcutterDraw(state, 'cpu', { suit: 'bells', rank: 8 })
    expect(next.hands.cpu).toEqual([{ suit: 'moons', rank: 2 }])
    expect(next.drawPile).toEqual([{ suit: 'keys', rank: 5 }, { suit: 'bells', rank: 8 }])
  })

  it('draw pile length is unchanged after a draw-then-discard', () => {
    const state = baseState()
    const next = applyWoodcutterDraw(state, 'player', { suit: 'keys', rank: 3 })
    expect(next.drawPile).toHaveLength(state.drawPile.length)
  })
})

describe('nextLeaderAfterTrick', () => {
  it('the winner leads next when no Swan is in the trick', () => {
    const trick = [
      { side: 'player' as const, card: { suit: 'bells', rank: 4 } },
      { side: 'cpu' as const, card: { suit: 'bells', rank: 9 } },
    ] as const
    expect(nextLeaderAfterTrick(trick, 'cpu')).toBe('cpu')
  })

  it('the losing Swan-player leads next instead of the winner', () => {
    const trick = [
      { side: 'player' as const, card: { suit: 'moons', rank: 1 } },
      { side: 'cpu' as const, card: { suit: 'moons', rank: 7 } },
    ] as const
    expect(nextLeaderAfterTrick(trick, 'cpu')).toBe('player')
  })

  it('two Swans in one trick: the loser leads next', () => {
    const trick = [
      { side: 'player' as const, card: { suit: 'bells', rank: 1 } },
      { side: 'cpu' as const, card: { suit: 'moons', rank: 1 } },
    ] as const
    expect(nextLeaderAfterTrick(trick, 'player')).toBe('cpu')
  })
})
```

- [x] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/warCouncil/__tests__/abilities.test.ts`
Expected: fails — `abilities.ts` does not exist yet.

- [x] **Step 3: Implement `abilities.ts`**

```ts
import { removeCard } from './cardUtils'
import type { Card, PlayerSide, RoundState, TrickCard } from './types'

export function applyFoxExchange(state: RoundState, side: PlayerSide, handCard: Card): RoundState {
  const handWithoutGivenCard = removeCard(state.hands[side], handCard)
  return {
    ...state,
    decree: handCard,
    trumpSuit: handCard.suit,
    hands: { ...state.hands, [side]: [...handWithoutGivenCard, state.decree] },
  }
}

export function applyWoodcutterDraw(state: RoundState, side: PlayerSide, discard: Card): RoundState {
  const [drawn, ...restOfPile] = state.drawPile
  const handWithDrawn = [...state.hands[side], drawn]
  const finalHand = removeCard(handWithDrawn, discard)
  return {
    ...state,
    hands: { ...state.hands, [side]: finalHand },
    drawPile: [...restOfPile, discard],
  }
}

export function nextLeaderAfterTrick(
  trick: readonly [TrickCard, TrickCard],
  winner: PlayerSide,
): PlayerSide {
  const swanLoser = trick.find((t) => t.card.rank === 1 && t.side !== winner)
  return swanLoser ? swanLoser.side : winner
}
```

- [x] **Step 4: Run the test and confirm it passes, then typecheck**

Run: `npx vitest run src/warCouncil/__tests__/abilities.test.ts; npm run typecheck`
Expected: 7 passed; typecheck exits 0. (Actual: 6 passed — the test file as specified in this task contains 6 cases, not 7; a task-description discrepancy, not a code defect. All 6 pass, typecheck exits 0.)

---

## Phase 6 — The `playCard` reducer and the full-round integration test

This phase wires Phases 3-5 into the single reducer-shaped entry point, then drives it through a full 13-trick round. It ends type-checking with a completely playable (headless) round: every legal play accepted, every illegal play rejected with a named reason, and a full round reaching `RoundPhase.Complete` at trick 13.

### Task 10: `playCard` ✓

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/playCard.ts`
- Test: `src/warCouncil/__tests__/playCard.test.ts`

- [x] **Step 1: Write the failing test — illegal plays are rejected with the correct reason**

```ts
import { describe, expect, it } from 'vitest'
import { playCard } from '../playCard'
import { AbilityChoiceKind, IllegalMoveReason, PlayerSide, RoundPhase, type RoundState } from '../types'

function stateWith(overrides: Partial<RoundState>): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [{ suit: 'moons', rank: 2 }, { suit: 'keys', rank: 6 }],
    decree: { suit: 'bells', rank: 4 },
    trumpSuit: 'bells',
    tricksWon: { player: 0, cpu: 0 },
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
    ...overrides,
  }
}

describe('playCard — rejections', () => {
  it('rejects a play on a completed round', () => {
    const state = stateWith({ phase: RoundPhase.Complete })
    const result = playCard(state, 'player', { suit: 'bells', rank: 2 })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.RoundComplete })
  })

  it('rejects a play out of turn', () => {
    const state = stateWith({ leader: PlayerSide.Cpu, hands: { player: [{ suit: 'bells', rank: 2 }], cpu: [] } })
    const result = playCard(state, 'player', { suit: 'bells', rank: 2 })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.NotYourTurn })
  })

  it('rejects a card not held', () => {
    const state = stateWith({ hands: { player: [], cpu: [] } })
    const result = playCard(state, 'player', { suit: 'bells', rank: 2 })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.CardNotInHand })
  })

  it('rejects a follow-up play that breaks suit when the lead suit is held', () => {
    const state = stateWith({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: 'cpu', card: { suit: 'keys', rank: 5 } }],
      hands: { player: [{ suit: 'keys', rank: 9 }, { suit: 'bells', rank: 2 }], cpu: [] },
    })
    const result = playCard(state, 'player', { suit: 'bells', rank: 2 })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.MustFollowLeadSuit })
  })

  it('rejects Fox (rank 3) played with no ability choice', () => {
    const state = stateWith({ hands: { player: [{ suit: 'keys', rank: 3 }], cpu: [] } })
    const result = playCard(state, 'player', { suit: 'keys', rank: 3 })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.MissingAbilityChoice })
  })
})

describe('playCard — the Fox (rank 3) mutates trump mid-trick, and it is illegal to ignore the new trump on the next play', () => {
  it('exchanging the decree updates trumpSuit and decree immediately', () => {
    const state = stateWith({
      hands: { player: [{ suit: 'keys', rank: 3 }, { suit: 'moons', rank: 7 }], cpu: [] },
    })
    const result = playCard(state, 'player', { suit: 'keys', rank: 3 }, {
      kind: AbilityChoiceKind.FoxExchange,
      handCard: { suit: 'moons', rank: 7 },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    expect(result.state.trumpSuit).toBe('moons')
    expect(result.state.decree).toEqual({ suit: 'moons', rank: 7 })
  })

  it('a full trick resolves using the trump suit as of after the Fox exchange', () => {
    const state = stateWith({
      leader: PlayerSide.Player,
      hands: {
        player: [{ suit: 'keys', rank: 3 }, { suit: 'moons', rank: 2 }],
        cpu: [{ suit: 'keys', rank: 6 }],
      },
    })
    const afterLead = playCard(state, 'player', { suit: 'keys', rank: 3 }, {
      kind: AbilityChoiceKind.FoxExchange,
      handCard: { suit: 'moons', rank: 2 },
    })
    expect(afterLead.ok).toBe(true)
    if (!afterLead.ok) throw new Error('expected ok')
    expect(afterLead.state.trumpSuit).toBe('moons')

    const afterFollow = playCard(afterLead.state, 'cpu', { suit: 'keys', rank: 6 })
    expect(afterFollow.ok).toBe(true)
    if (!afterFollow.ok) throw new Error('expected ok')
    // neither card is moons (the new trump) -> lead suit (keys) decides -> cpu's keys 6 beats player's Fox (keys 3)
    expect(afterFollow.state.tricksWon.cpu).toBe(1)
  })
})
```

> **Implementer deviation from the step's literal code:** the CPU's follow card was written as `{ suit: 'keys', rank: 5 }`. Rank 5 is the Woodcutter (Phase 5, `abilities.ts`), which mandatorily requires a `WoodcutterDiscard` ability choice when played — the test supplied none, so a spec-correct `playCard` rejected it with `MissingAbilityChoice` (confirmed against `plan.md`'s ability-dispatch description). This is a test-fixture defect (an accidental collision with an unrelated ability), not a `playCard.ts`/`legalMoves.ts` bug — changed the CPU's card to `{ suit: 'keys', rank: 6 }` (a plain, non-power card), which preserves the test's exact intent (post-Fox-exchange trump governs trick resolution) without invoking Woodcutter. Production code was not changed for this reason.

- [x] **Step 2: Run the test and confirm it fails**

Run: `npx vitest run src/warCouncil/__tests__/playCard.test.ts`
Expected: fails — `playCard.ts` does not exist yet.
Actual: failed as expected — `Error: Cannot find module '../playCard'`.

- [x] **Step 3: Implement `playCard.ts`**

```ts
import { applyFoxExchange, applyWoodcutterDraw, nextLeaderAfterTrick } from './abilities'
import { containsCard, removeCard, sameCard } from './cardUtils'
import { legalMoves } from './legalMoves'
import { resolveTrickWinner } from './resolveTrick'
import {
  AbilityChoiceKind,
  currentTurn,
  IllegalMoveReason,
  RoundPhase,
  type AbilityChoice,
  type Card,
  type PlayCardResult,
  type PlayerSide,
  type RoundState,
  type TrickCard,
} from './types'

export function playCard(
  state: RoundState,
  side: PlayerSide,
  card: Card,
  choice?: AbilityChoice,
): PlayCardResult {
  if (state.phase === RoundPhase.Complete) {
    return { ok: false, reason: IllegalMoveReason.RoundComplete }
  }
  if (currentTurn(state) !== side) {
    return { ok: false, reason: IllegalMoveReason.NotYourTurn }
  }
  if (!containsCard(state.hands[side], card)) {
    return { ok: false, reason: IllegalMoveReason.CardNotInHand }
  }

  const legal = legalMoves(state, side)
  if (!legal.some((c) => sameCard(c, card))) {
    const monarchLed = state.currentTrick.length === 1 && state.currentTrick[0].card.rank === 11
    return {
      ok: false,
      reason: monarchLed ? IllegalMoveReason.MustFollowMonarch : IllegalMoveReason.MustFollowLeadSuit,
    }
  }

  let next: RoundState = {
    ...state,
    hands: { ...state.hands, [side]: removeCard(state.hands[side], card) },
  }

  if (card.rank === 3) {
    if (!choice) {
      return { ok: false, reason: IllegalMoveReason.MissingAbilityChoice }
    }
    if (choice.kind === AbilityChoiceKind.FoxExchange) {
      if (!containsCard(next.hands[side], choice.handCard)) {
        return { ok: false, reason: IllegalMoveReason.InvalidFoxExchangeCard }
      }
      next = applyFoxExchange(next, side, choice.handCard)
    } else if (choice.kind !== AbilityChoiceKind.FoxDecline) {
      return { ok: false, reason: IllegalMoveReason.UnexpectedAbilityChoice }
    }
  } else if (card.rank === 5) {
    if (!choice || choice.kind !== AbilityChoiceKind.WoodcutterDiscard) {
      return { ok: false, reason: IllegalMoveReason.MissingAbilityChoice }
    }
    const handWithDrawn = [...next.hands[side], next.drawPile[0]]
    if (!containsCard(handWithDrawn, choice.discard)) {
      return { ok: false, reason: IllegalMoveReason.InvalidWoodcutterDiscard }
    }
    next = applyWoodcutterDraw(next, side, choice.discard)
  } else if (choice) {
    return { ok: false, reason: IllegalMoveReason.UnexpectedAbilityChoice }
  }

  const trickCard: TrickCard = { side, card }
  const currentTrick = [...next.currentTrick, trickCard]

  if (currentTrick.length === 1) {
    return { ok: true, state: { ...next, currentTrick, phase: RoundPhase.AwaitingFollow } }
  }

  const completedTrick = currentTrick as [TrickCard, TrickCard]
  const winner = resolveTrickWinner(completedTrick, next.trumpSuit)
  const nextLeader = nextLeaderAfterTrick(completedTrick, winner)
  const tricksPlayed = next.tricksPlayed + 1
  const tricksWon = { ...next.tricksWon, [winner]: next.tricksWon[winner] + 1 }
  const phase = tricksPlayed === 13 ? RoundPhase.Complete : RoundPhase.AwaitingLead

  return {
    ok: true,
    state: { ...next, currentTrick: [], leader: nextLeader, tricksPlayed, tricksWon, phase },
  }
}
```

- [x] **Step 4: Run the rejection tests and confirm they pass, then typecheck**

Run: `npx vitest run src/warCouncil/__tests__/playCard.test.ts; npm run typecheck`
Expected: all tests in the file so far passed; typecheck exits 0.
Actual: after the Step-1 fixture fix noted above, all 8 tests in the file passed (5 rejections + 2 Fox mid-trick + the Task 11 full-round test written in the same pass); `npm run typecheck` exits 0.

### Task 11: Full-round integration test — exactly 13 tricks (AC1, AC5) ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/__tests__/playCard.test.ts` (append)

- [x] **Step 1: Add the failing full-round test**

Add `import { dealRound } from '../deal'` to the file's existing top-of-file import block (alongside the Task 10 imports), not as a mid-file import — then append the rest below the existing `describe` blocks:

```ts
function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

describe('playCard — a full round plays out exactly 13 tricks', () => {
  it('deals and plays a full round to RoundPhase.Complete with 13 total tricks won', () => {
    let state = dealRound('player', lcg(2024))
    let guard = 0

    while (state.phase !== 'complete') {
      guard += 1
      if (guard > 500) throw new Error('runaway loop — round never completed')

      const turn = state.currentTrick.length === 0 ? state.leader : (state.currentTrick[0].side === 'player' ? 'cpu' : 'player')
      const options = state.currentTrick.length === 0
        ? state.hands[turn]
        : (() => {
            const led = state.currentTrick[0].card
            const followSuit = state.hands[turn].filter((c) => c.suit === led.suit)
            return followSuit.length > 0 ? followSuit : state.hands[turn]
          })()
      const chosen = options[0]

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
  })
})
```

- [x] **Step 2: Run the test and confirm it fails or passes as expected**

Run: `npx vitest run src/warCouncil/__tests__/playCard.test.ts`
Expected: initially exercises the just-built reducer end to end; if it fails, the failure message names which rejection reason fired and at which trick — fix `playCard.ts`/`legalMoves.ts` rather than the test, since the test's play strategy ("first legal option, decline Fox, discard the drawn card") is deliberately simple and always legal by construction.
Actual: passed on the first run against `playCard.ts` once the Task 10 fixture defect (above) was corrected — the full-round test's own play strategy needed no change.

- [x] **Step 3: Confirm the full test file passes, then typecheck**

Run: `npx vitest run src/warCouncil/__tests__/playCard.test.ts; npm run typecheck`
Expected: all tests in the file passed (rejections + Fox mid-trick mutation + full 13-trick round); typecheck exits 0.
Actual: `Test Files  1 passed (1)` / `Tests  8 passed (8)`; `npm run typecheck` exits 0 with no errors. `npm run lint` also run (phase touched `.ts` files) — exits 0, no warnings.

---

## Phase 7 — Barrel export and `WarCouncilState` wiring

This phase replaces the SCRUM-19 placeholder and exposes the engine's public surface. It ends type-checking with `src/battle/battleState.ts` compiling unchanged against the new, real `WarCouncilState` shape.

### Task 12: Update `src/warCouncil/index.ts` ✓

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/index.ts`

- [x] **Step 1: Replace the placeholder with the real barrel**

```ts
export type { RoundState as WarCouncilState } from './types'

export {
  AbilityChoiceKind,
  currentTurn,
  IllegalMoveReason,
  otherSide,
  PlayerSide,
  RoundPhase,
  Suit,
} from './types'
export type { AbilityChoice, Card, PlayCardResult, RoundState, TrickCard } from './types'
export { createDeck } from './deck'
export { shuffle } from './shuffle'
export { dealRound } from './deal'
export { legalMoves } from './legalMoves'
export { resolveTrickWinner } from './resolveTrick'
export { playCard } from './playCard'
export { scoreRound, tricksToPoints } from './scoring'
```

- [x] **Step 2: Typecheck the whole project, confirming `src/battle/battleState.ts` still compiles**

Run: `npm run typecheck`
Expected: exits 0, no errors — `BattleState.warCouncil` now resolves to the real `RoundState` shape instead of `unknown`.
Actual: exits 0, no errors. Also ran `npx vitest run src/warCouncil` (all 10 spec files, 63 tests, all passed) and `npm run lint` (exits 0, no warnings) as an additional double-check on this barrel-file change.

---

## Phase 8 — Final verification

No production changes in this phase — only sanity-checks that the engine is clean, the pure-core boundary still holds, and every gate is green.

### Task 13: Confirm the pure-core boundary still holds for `src/warCouncil/` ✓

- Skill: react-frontend

**Files:** (none — verification only)

- [x] **Step 1: Grep the engine tree for a React import or a DOM global**

Run: `Get-ChildItem -Path src\warCouncil -Recurse -Include *.ts | Select-String -Pattern 'from ''react''|from "react"|\bwindow\.|\bdocument\.|localStorage|sessionStorage'`
Expected: zero hits.
Actual: zero hits — command produced no output.

### Task 14: Confirm no `Math.random()` is reachable from `src/warCouncil/` ✓

- Skill: react-frontend

**Files:** (none — verification only)

- [x] **Step 1: Grep the engine tree for `Math.random`**

Run: `Get-ChildItem -Path src\warCouncil -Recurse -Include *.ts | Select-String -Pattern 'Math\.random'`
Expected: zero hits — every random source in this module is the caller-injected `rng` parameter.
Actual: zero hits — command produced no output.

### Task 15: Confirm every file stays under the 400-line budget ✓

- Skill: react-frontend

**Files:** (none — verification only)

- [x] **Step 1: Measure every new source file**

Run: `Get-ChildItem -Path src\warCouncil -Recurse -Include *.ts | ForEach-Object { "$($_.Name): $((Get-Content $_.FullName | Measure-Object -Line).Lines)" }`
Expected: every file well under 400 lines; `playCard.ts` (the largest) comfortably under 200.
Actual: largest file is `playCard.test.ts` at 128 lines; largest production file is `playCard.ts` at 83 lines. All 20 files (10 production + 10 test) are well under 400 lines. Full listing: abilities.test.ts 66, cardUtils.test.ts 32, deal.test.ts 46, deck.test.ts 19, legalMoves.test.ts 68, playCard.test.ts 128, resolveTrick.test.ts 35, scoring.test.ts 24, shuffle.test.ts 25, types.test.ts 29, abilities.ts 28, cardUtils.ts 21, deal.ts 23, deck.ts 10, index.ts 18, legalMoves.ts 21, playCard.ts 83, resolveTrick.ts 19, scoring.ts 18, shuffle.ts 10, types.ts 70.

### Task 16: Static gates and full suite ✓

- Skill: react-frontend

**Files:** (none — verification only)

- [x] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports all tests passed, including every `src/warCouncil/__tests__/*.test.ts` file plus the pre-existing smoke test and `BattlePhase` tests from SCRUM-19.
Actual: `npm run typecheck` exits 0, no errors. `npm run lint` exits 0, zero warnings. `npm test` — `Test Files  12 passed (12)` / `Tests  69 passed (69)`.

- [x] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.
Actual: exits 0 — `dist/index.html`, `dist/assets/index-CbmgodH0.css`, `dist/assets/index-PDNcSK7V.js` written, `✓ built in 508ms`, no bundler errors.

### Task 17: Update the PR description ✓

- Skill: react-frontend

**Files:**
- Create: `pr-description.md` (in this plan folder)

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary: implements the War Council rules engine — deck, deterministic-shuffle-and-deal, legal-move validation, trick-winner resolution (including the Witch and Monarch abilities), the Fox's mid-trick trump mutation, the Woodcutter and Swan abilities, and end-of-round scoring bands — replacing SCRUM-19's `WarCouncilState = unknown` placeholder with the real engine state.
- Note the scope call flagged in `plan.md` → Assumptions/Risks: all five non-Treasure odd-card abilities were implemented, not only the Fox trump-mutation ability AC2 names explicitly — flag this so the developer can confirm it's the scope they wanted, or ask for Woodcutter/Swan to be pulled back out.
- Note that Treasure's mid-round point award is deliberately not implemented — the card is playable, but awards no bonus, per the ticket's own instruction not to invent a Treasure-Muster rule.
- Verification results from Phase 8 (typecheck, lint, test counts, build).
- One-line note for future contributors: `playCard` is the only way to mutate `RoundState` — `legalMoves`, `resolveTrickWinner`, and the functions in `abilities.ts` are pure queries/helpers it calls, not independent entry points a future CPU ticket should call directly to mutate state.

---

## Self-review

**Spec coverage:**
- AC1 (full round, exactly 13 tricks, base 33-card deck only) — Tasks 3 (deck), 5 (deal), 11 (full-round integration test).
- AC2 (trick-taking, trump/decree, Fox's trump-mutation ability, enforced as legal-move constraints, illegal play rejected) — Tasks 7 (legalMoves), 8 (resolveTrickWinner), 9 (applyFoxExchange), 10 (playCard rejections + Fox mid-trick mutation test).
- AC3 (scoring bands, locked pair for every split) — Task 6.
- AC4 (no React import, no DOM access) — already established by SCRUM-19's ESLint boundary; re-confirmed by Task 13.
- AC5 (unit tests: full round, trump/decree, trump-mutation ability, scoring for every split) — Tasks 6, 8, 10, 11 respectively.
- Additional in-scope abilities beyond AC2's named one (Swan, Woodcutter, Witch, Monarch) — Tasks 7, 8, 9, 10 per plan.md's Assumptions.
- `WarCouncilState` wiring — Task 12.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code or command.

**Type / name consistency:** `Suit`, `Card`, `PlayerSide`, `RoundPhase`, `TrickCard`, `RoundState`, `AbilityChoiceKind`, `AbilityChoice`, `IllegalMoveReason`, `PlayCardResult` are spelled identically across Tasks 1-12 and `plan.md`'s Data shapes section. Every `IllegalMoveReason` value used in Task 10's tests matches a value defined in Task 1. The exported name `WarCouncilState` in Task 12 matches the one existing consumer at `src/battle/battleState.ts` (unchanged, confirmed by the audit in `plan.md`).

**Phase boundary cleanliness:** Phase 1 ends with `types.ts`, `cardUtils.ts`, and `deck.ts` all typechecking with no game logic yet. Phase 2 adds `shuffle.ts`, `deal.ts`, `scoring.ts` — independently typechecking, no dependency on Phases 3-6. Phase 3 (`legalMoves.ts`) and Phase 4 (`resolveTrick.ts`) each typecheck standalone against Phase 1's types. Phase 5 (`abilities.ts`) typechecks standalone against Phase 1's types and `cardUtils`. Phase 6 wires Phases 3-5 into `playCard.ts` and typechecks the full engine, ending with the full-round integration test passing. Phase 7 updates the barrel and re-typechecks the whole project including `src/battle/`. Phase 8 makes no production change — only verification and the PR description.
