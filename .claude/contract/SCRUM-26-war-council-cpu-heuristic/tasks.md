# Tasks: War Council CPU — heuristic card player

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: IN PROGRESS
Started: 2026-08-04

**Goal:** Give the War Council card engine a CPU that always plays a legal card via a stated,
deterministic heuristic — including the Fox's trump-mutating exchange and the Woodcutter's
draw/discard — plus a thin battle-level function that plugs it into `submitWarCouncilCard`.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**
- `src/warCouncil/cpuPlayer.ts` — pure card-selection and ability-choice heuristics for the CPU.
- `src/warCouncil/__tests__/cpuPlayer.test.ts` — unit tests for the heuristic plus the AC4
  simulated-full-round coverage.
- `src/battle/playCpuWarCouncilTurn.ts` — battle-level composition of the heuristic with
  `submitWarCouncilCard`.
- `src/battle/__tests__/playCpuWarCouncilTurn.test.ts` — tests for the battle-level wrapper.

**Modified:**
- `src/warCouncil/index.ts` — export `chooseCpuMove` and the `CpuMove` type.
- `src/battle/battleAction.ts` — add `BattleRejectionReason.NotCpuTurn`.
- `src/battle/index.ts` — export `playCpuWarCouncilTurn`.

**Deleted:** (none)

**Developer decides or observes:** (none — no configuration value, persisted shape, or
UI/feel judgement is introduced by this contract; see `plan.md` Part 2 → Risks and judgement
calls for the two ability-choice defaults and the tie-break order, which are documented
assumptions, not open developer decisions.)

---

## Phase 1 — Pure card-selection and ability-choice heuristics

Introduces `src/warCouncil/cpuPlayer.ts`, built up one exported function at a time, each covered
by its own unit tests before the next function is added. Every function in this phase is pure
TypeScript with no DOM or React access. The phase ends with `chooseCpuMove` composing all three
sub-decisions and re-exported from `src/warCouncil/index.ts` — a safe stopping point, since
nothing outside `src/warCouncil/` has changed yet and the module type-checks on its own.

### Task 1: Add `chooseCpuCard` (leading and following heuristic)

- Skill: react-frontend

**Files:**
- Create: `src/warCouncil/cpuPlayer.ts`
- Test: `src/warCouncil/__tests__/cpuPlayer.test.ts`

- [ ] **Step 1: Write the failing tests for `chooseCpuCard`**

```ts
import { describe, expect, it } from 'vitest'
import { chooseCpuCard } from '../cpuPlayer'
import { PlayerSide, RoundPhase, type RoundState } from '../types'

function stateWith(overrides: Partial<RoundState>): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [
      { suit: 'moons', rank: 2 },
      { suit: 'keys', rank: 6 },
    ],
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

describe('chooseCpuCard — leading', () => {
  it('plays the lowest-ranked card in hand when leading', () => {
    const state = stateWith({
      hands: {
        player: [],
        cpu: [
          { suit: 'moons', rank: 7 },
          { suit: 'bells', rank: 2 },
          { suit: 'keys', rank: 2 },
        ],
      },
    })
    expect(chooseCpuCard(state, PlayerSide.Cpu)).toEqual({ suit: 'bells', rank: 2 })
  })
})

describe('chooseCpuCard — following', () => {
  it('wins as cheaply as possible when a winning legal card is available', () => {
    const state = stateWith({
      leader: PlayerSide.Player,
      trumpSuit: 'bells',
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'keys', rank: 5 } }],
      hands: {
        player: [],
        cpu: [
          { suit: 'keys', rank: 9 },
          { suit: 'keys', rank: 6 },
          { suit: 'bells', rank: 2 },
        ],
      },
    })
    expect(chooseCpuCard(state, PlayerSide.Cpu)).toEqual({ suit: 'keys', rank: 6 })
  })

  it('ducks with the lowest legal card when no legal card would win', () => {
    const state = stateWith({
      leader: PlayerSide.Player,
      trumpSuit: 'bells',
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'keys', rank: 9 } }],
      hands: {
        player: [],
        cpu: [
          { suit: 'keys', rank: 2 },
          { suit: 'keys', rank: 4 },
        ],
      },
    })
    expect(chooseCpuCard(state, PlayerSide.Cpu)).toEqual({ suit: 'keys', rank: 2 })
  })

  it('respects the Monarch-led legal set, ducking with the swan when neither legal card can win', () => {
    const state = stateWith({
      leader: PlayerSide.Player,
      trumpSuit: 'bells',
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'keys', rank: 11 } }],
      hands: {
        player: [],
        cpu: [
          { suit: 'keys', rank: 1 },
          { suit: 'keys', rank: 4 },
          { suit: 'keys', rank: 8 },
          { suit: 'moons', rank: 2 },
        ],
      },
    })
    // legalMoves restricts a Monarch follow to {swan-of-suit, highest-of-suit} = keys 1, keys 8.
    // Neither can beat a led keys 11 (11 is the maximum rank), so this ducks with the lower of
    // the two — keys 4 is illegal here even though it's the lowest card in hand overall.
    expect(chooseCpuCard(state, PlayerSide.Cpu)).toEqual({ suit: 'keys', rank: 1 })
  })
})
```

- [ ] **Step 2: Run and confirm the red state**

Run: `npx vitest run src/warCouncil/__tests__/cpuPlayer.test.ts`
Expected: fails to collect — `chooseCpuCard` has no implementation module yet (`../cpuPlayer`
does not resolve). This is the expected red state: the test is wired to code that doesn't exist.

- [ ] **Step 3: Implement `chooseCpuCard`**

```ts
import { legalMoves } from './legalMoves'
import { resolveTrickWinner } from './resolveTrick'
import { ALL_SUITS, type Card, type PlayerSide, type RoundState, type Suit } from './types'

function suitOrder(suit: Suit): number {
  return ALL_SUITS.indexOf(suit)
}

function compareCards(a: Card, b: Card): number {
  return a.rank - b.rank || suitOrder(a.suit) - suitOrder(b.suit)
}

function lowestCard(cards: readonly Card[]): Card {
  return [...cards].sort(compareCards)[0]
}

// Card selection only — always drawn from legalMoves()'s own output, so this can
// never produce an illegal card. Leading: lowest legal card. Following: the lowest
// legal card that would win the trick (per the engine's own resolveTrickWinner),
// or the lowest legal card at all if none would win.
export function chooseCpuCard(state: RoundState, side: PlayerSide): Card {
  const legal = legalMoves(state, side)
  if (state.currentTrick.length === 0) {
    return lowestCard(legal)
  }
  const lead = state.currentTrick[0]
  const winners = legal.filter(
    (card) => resolveTrickWinner([lead, { side, card }], state.trumpSuit) === side,
  )
  return lowestCard(winners.length > 0 ? winners : legal)
}
```

- [ ] **Step 4: Run and confirm green, then typecheck**

Run: `npx vitest run src/warCouncil/__tests__/cpuPlayer.test.ts; npm run typecheck`
Expected: Vitest reports all tests in the file passed; `npm run typecheck` exits 0.

### Task 2: Add `chooseCpuFoxChoice`

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/cpuPlayer.ts`
- Modify: `src/warCouncil/__tests__/cpuPlayer.test.ts`

- [ ] **Step 1: Write the failing tests for `chooseCpuFoxChoice`**

Edit the two import lines at the top of `cpuPlayer.test.ts`:

```ts
import { chooseCpuCard, chooseCpuFoxChoice } from '../cpuPlayer'
import { AbilityChoiceKind, PlayerSide, RoundPhase, type Card, type RoundState } from '../types'
```

Append at the end of the file:

```ts
describe('chooseCpuFoxChoice', () => {
  it('exchanges, offering the lowest card of the most-held non-trump suit', () => {
    const handAfterFox: Card[] = [
      { suit: 'keys', rank: 7 },
      { suit: 'keys', rank: 2 },
      { suit: 'moons', rank: 10 },
    ]
    expect(chooseCpuFoxChoice(handAfterFox, 'bells')).toEqual({
      kind: AbilityChoiceKind.FoxExchange,
      handCard: { suit: 'keys', rank: 2 },
    })
  })

  it('declines when the most-held suit is already trump', () => {
    const handAfterFox: Card[] = [
      { suit: 'bells', rank: 7 },
      { suit: 'bells', rank: 2 },
      { suit: 'moons', rank: 10 },
    ]
    expect(chooseCpuFoxChoice(handAfterFox, 'bells')).toEqual({
      kind: AbilityChoiceKind.FoxDecline,
    })
  })

  it('declines when the Fox was the last card in hand', () => {
    expect(chooseCpuFoxChoice([], 'bells')).toEqual({ kind: AbilityChoiceKind.FoxDecline })
  })
})
```

- [ ] **Step 2: Run and confirm the red state**

Run: `npx vitest run src/warCouncil/__tests__/cpuPlayer.test.ts`
Expected: fails to collect — `chooseCpuFoxChoice` is not exported from `../cpuPlayer` yet.

- [ ] **Step 3: Implement `chooseCpuFoxChoice`**

Add to `cpuPlayer.ts`: extend the `type` import from `./types` to include `AbilityChoiceKind`
(a value import) and `type AbilityChoice`, and add `cardsOfSuit` from `./cardUtils`:

```ts
import { cardsOfSuit } from './cardUtils'
import { legalMoves } from './legalMoves'
import { resolveTrickWinner } from './resolveTrick'
import {
  ALL_SUITS,
  AbilityChoiceKind,
  type AbilityChoice,
  type Card,
  type PlayerSide,
  type RoundState,
  type Suit,
} from './types'
```

Append below `chooseCpuCard`:

```ts
// Exchanges the Fox for the lowest card of the CPU's most-held suit whenever
// that suit isn't already trump — concentrates trump in the CPU's strongest
// suit. Declines when the strongest suit is already trump, or when the Fox
// was the last card in hand (nothing left to offer).
export function chooseCpuFoxChoice(handAfterFox: readonly Card[], trumpSuit: Suit): AbilityChoice {
  if (handAfterFox.length === 0) {
    return { kind: AbilityChoiceKind.FoxDecline }
  }
  const strongestSuit = ALL_SUITS.map((suit) => cardsOfSuit(handAfterFox, suit)).reduce(
    (best, cards) => (cards.length > best.length ? cards : best),
  )
  if (strongestSuit[0].suit === trumpSuit) {
    return { kind: AbilityChoiceKind.FoxDecline }
  }
  return { kind: AbilityChoiceKind.FoxExchange, handCard: lowestCard(strongestSuit) }
}
```

- [ ] **Step 4: Run and confirm green, then typecheck**

Run: `npx vitest run src/warCouncil/__tests__/cpuPlayer.test.ts; npm run typecheck`
Expected: Vitest reports all tests in the file passed; `npm run typecheck` exits 0.

### Task 3: Add `chooseCpuWoodcutterChoice`

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/cpuPlayer.ts`
- Modify: `src/warCouncil/__tests__/cpuPlayer.test.ts`

- [ ] **Step 1: Write the failing test for `chooseCpuWoodcutterChoice`**

Edit the `cpuPlayer` import line:

```ts
import { chooseCpuCard, chooseCpuFoxChoice, chooseCpuWoodcutterChoice } from '../cpuPlayer'
```

Append at the end of the file:

```ts
describe('chooseCpuWoodcutterChoice', () => {
  it('discards the lowest-ranked card of the post-draw hand', () => {
    const handWithDrawn: Card[] = [
      { suit: 'keys', rank: 7 },
      { suit: 'moons', rank: 2 },
      { suit: 'bells', rank: 10 },
    ]
    expect(chooseCpuWoodcutterChoice(handWithDrawn)).toEqual({
      kind: AbilityChoiceKind.WoodcutterDiscard,
      discard: { suit: 'moons', rank: 2 },
    })
  })
})
```

- [ ] **Step 2: Run and confirm the red state**

Run: `npx vitest run src/warCouncil/__tests__/cpuPlayer.test.ts`
Expected: fails to collect — `chooseCpuWoodcutterChoice` is not exported from `../cpuPlayer` yet.

- [ ] **Step 3: Implement `chooseCpuWoodcutterChoice`**

Append below `chooseCpuFoxChoice` in `cpuPlayer.ts`:

```ts
// Always discards the lowest-ranked card of the hand after the draw — the
// simplest deterministic "keep your best cards" default. Every candidate is
// drawn from the post-draw hand, so the discard is always legal.
export function chooseCpuWoodcutterChoice(handWithDrawn: readonly Card[]): AbilityChoice {
  return { kind: AbilityChoiceKind.WoodcutterDiscard, discard: lowestCard(handWithDrawn) }
}
```

- [ ] **Step 4: Run and confirm green, then typecheck**

Run: `npx vitest run src/warCouncil/__tests__/cpuPlayer.test.ts; npm run typecheck`
Expected: Vitest reports all tests in the file passed; `npm run typecheck` exits 0.

### Task 4: Add `chooseCpuMove` and export it from `src/warCouncil/index.ts`

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/cpuPlayer.ts`
- Modify: `src/warCouncil/__tests__/cpuPlayer.test.ts`
- Modify: `src/warCouncil/index.ts`

- [ ] **Step 1: Write the failing tests for `chooseCpuMove`**

Edit the import lines at the top of `cpuPlayer.test.ts` — add `playCard` and `chooseCpuMove`
(`dealRound` is not needed until Task 5 and is deliberately not imported here, to avoid an
unused-import failure between this task and that one):

```ts
import { playCard } from '../playCard'
import {
  chooseCpuCard,
  chooseCpuFoxChoice,
  chooseCpuMove,
  chooseCpuWoodcutterChoice,
} from '../cpuPlayer'
```

Append at the end of the file:

```ts
describe('chooseCpuMove', () => {
  it('returns no ability choice for a plain card', () => {
    const state = stateWith({ hands: { player: [], cpu: [{ suit: 'bells', rank: 6 }] } })
    expect(chooseCpuMove(state, PlayerSide.Cpu)).toEqual({ card: { suit: 'bells', rank: 6 } })
  })

  it('produces a Fox move accepted by playCard', () => {
    const state = stateWith({
      hands: {
        player: [],
        cpu: [
          { suit: 'keys', rank: 3 },
          { suit: 'keys', rank: 7 },
          { suit: 'moons', rank: 2 },
        ],
      },
    })
    const move = chooseCpuMove(state, PlayerSide.Cpu)
    expect(move.card).toEqual({ suit: 'keys', rank: 3 })
    const result = playCard(state, PlayerSide.Cpu, move.card, move.choice)
    expect(result.ok).toBe(true)
  })

  it('produces a Woodcutter move accepted by playCard', () => {
    const state = stateWith({
      hands: {
        player: [],
        cpu: [
          { suit: 'keys', rank: 5 },
          { suit: 'keys', rank: 7 },
        ],
      },
    })
    const move = chooseCpuMove(state, PlayerSide.Cpu)
    expect(move.card).toEqual({ suit: 'keys', rank: 5 })
    const result = playCard(state, PlayerSide.Cpu, move.card, move.choice)
    expect(result.ok).toBe(true)
  })
})
```

- [ ] **Step 2: Run and confirm the red state**

Run: `npx vitest run src/warCouncil/__tests__/cpuPlayer.test.ts`
Expected: fails to collect — `chooseCpuMove` is not exported from `../cpuPlayer` yet.

- [ ] **Step 3: Implement `chooseCpuMove`, add `CpuMove`, and re-export from the package index**

Add `removeCard` to the `cardUtils` import and `CardRank` to the `types` import in `cpuPlayer.ts`:

```ts
import { cardsOfSuit, removeCard } from './cardUtils'
import { legalMoves } from './legalMoves'
import { resolveTrickWinner } from './resolveTrick'
import {
  ALL_SUITS,
  AbilityChoiceKind,
  CardRank,
  type AbilityChoice,
  type Card,
  type PlayerSide,
  type RoundState,
  type Suit,
} from './types'

export interface CpuMove {
  readonly card: Card
  readonly choice?: AbilityChoice
}
```

(Place the `CpuMove` interface directly below the imports, before `suitOrder`.) Append below
`chooseCpuWoodcutterChoice`:

```ts
// Composes card selection with the matching ability choice, mirroring the same
// hand-shape construction playCard.ts itself uses internally, so the two stay
// in lockstep. Every value this can produce is drawn from a set the engine
// itself already treats as legal.
export function chooseCpuMove(state: RoundState, side: PlayerSide): CpuMove {
  const card = chooseCpuCard(state, side)
  const handAfter = removeCard(state.hands[side], card)

  if (card.rank === CardRank.Fox) {
    return { card, choice: chooseCpuFoxChoice(handAfter, state.trumpSuit) }
  }
  if (card.rank === CardRank.Woodcutter) {
    const handWithDrawn = [...handAfter, state.drawPile[0]]
    return { card, choice: chooseCpuWoodcutterChoice(handWithDrawn) }
  }
  return { card }
}
```

In `src/warCouncil/index.ts`, add two lines at the end of the file:

```ts
export { chooseCpuMove } from './cpuPlayer'
export type { CpuMove } from './cpuPlayer'
```

- [ ] **Step 4: Run and confirm green, then typecheck**

Run: `npx vitest run src/warCouncil/__tests__/cpuPlayer.test.ts; npm run typecheck`
Expected: Vitest reports all tests in the file passed; `npm run typecheck` exits 0.

- [ ] **Step 5: Measure `cpuPlayer.ts`**

Run: `(Get-Content src\warCouncil\cpuPlayer.ts | Measure-Object -Line).Lines`
Expected: well under 400 (the file holds five small pure functions plus one interface).

---

## Phase 2 — Simulation coverage for AC4

Adds the seeded-simulation tests the brief's AC4 asks for directly, driving the real engine
(`dealRound` + `playCard`) through `chooseCpuMove` for both sides across many full 13-trick
rounds. No production code changes in this phase — it verifies behaviour Phase 1 already built,
so the codebase stays exactly as type-safe as it was at the end of Phase 1.

### Task 5: Add simulated full-round tests to `cpuPlayer.test.ts`

- Skill: react-frontend

**Files:**
- Modify: `src/warCouncil/__tests__/cpuPlayer.test.ts`

- [ ] **Step 1: Write the simulation tests**

Edit the imports: add `dealRound` (deferred from Task 4) and extend the `types` import with
`CardRank` and `currentTurn`:

```ts
import { dealRound } from '../deal'
import { playCard } from '../playCard'
import {
  chooseCpuCard,
  chooseCpuFoxChoice,
  chooseCpuMove,
  chooseCpuWoodcutterChoice,
} from '../cpuPlayer'
import {
  AbilityChoiceKind,
  CardRank,
  currentTurn,
  PlayerSide,
  RoundPhase,
  type Card,
  type RoundState,
} from '../types'
```

Append at the end of the file:

```ts
function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

describe('chooseCpuMove — simulated full rounds (AC4)', () => {
  const seeds = Array.from({ length: 60 }, (_, i) => i + 1)

  it.each(seeds)('plays a full 13-trick round with zero illegal plays (seed %i)', (seed) => {
    let state = dealRound(seed % 2 === 0 ? PlayerSide.Player : PlayerSide.Cpu, lcg(seed))
    let guard = 0

    while (state.phase !== RoundPhase.Complete) {
      guard += 1
      if (guard > 100) throw new Error('runaway loop — round never completed')
      const turn = currentTurn(state)
      const move = chooseCpuMove(state, turn)
      const result = playCard(state, turn, move.card, move.choice)
      if (!result.ok) throw new Error(`illegal play at seed ${seed}: ${result.reason}`)
      state = result.state
    }

    expect(state.tricksPlayed).toBe(13)
    expect(state.tricksWon.player + state.tricksWon.cpu).toBe(13)
  })

  it('exercises both the Fox exchange and the Woodcutter discard across the seeded sample', () => {
    let foxPlays = 0
    let woodcutterPlays = 0

    for (const seed of seeds) {
      let state = dealRound(seed % 2 === 0 ? PlayerSide.Player : PlayerSide.Cpu, lcg(seed))
      let guard = 0
      while (state.phase !== RoundPhase.Complete) {
        guard += 1
        if (guard > 100) throw new Error('runaway loop — round never completed')
        const turn = currentTurn(state)
        const move = chooseCpuMove(state, turn)
        if (move.card.rank === CardRank.Fox) foxPlays += 1
        if (move.card.rank === CardRank.Woodcutter) woodcutterPlays += 1
        const result = playCard(state, turn, move.card, move.choice)
        if (!result.ok) throw new Error(`illegal play at seed ${seed}: ${result.reason}`)
        state = result.state
      }
    }

    expect(foxPlays).toBeGreaterThan(0)
    expect(woodcutterPlays).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run and confirm green, then typecheck**

Run: `npx vitest run src/warCouncil/__tests__/cpuPlayer.test.ts; npm run typecheck`
Expected: Vitest reports all tests in the file passed (62 total: 3 leading/following + 3 Fox +
1 Woodcutter + 3 chooseCpuMove + 60 seeded rounds + 1 ability-exercised check = 71 — confirm the
printed count matches the file's actual `it`/`it.each` total rather than assuming 71); zero
`illegal play` errors thrown; `npm run typecheck` exits 0.

- [ ] **Step 3: Measure `cpuPlayer.test.ts`**

Run: `(Get-Content src\warCouncil\__tests__\cpuPlayer.test.ts | Measure-Object -Line).Lines`
Expected: under 400. If it is at or over, split the simulation describe block into a sibling
file (e.g. `cpuPlayerSimulation.test.ts`) before continuing — do not disable the check.

---

## Phase 3 — Battle-level composition

Plugs the heuristic into `src/battle/` so the battle module has something to call on the CPU's
turn, following the exact shape of the existing `submitWarCouncilCard`/`beginClash` actions. Ends
with `playCpuWarCouncilTurn` exported from `src/battle/index.ts` and fully tested — a safe
stopping point since it introduces no new state-mutation path of its own, only composition of
two already-tested primitives (`chooseCpuMove`, `submitWarCouncilCard`).

### Task 6: Add `BattleRejectionReason.NotCpuTurn`

- Skill: react-frontend

**Files:**
- Modify: `src/battle/battleAction.ts`

- [ ] **Step 1: Add the new reason**

```ts
export const BattleRejectionReason = {
  NotWarCouncilPhase: 'notWarCouncilPhase',
  NotMusterConversionPhase: 'notMusterConversionPhase',
  NotClashPhase: 'notClashPhase',
  NotCpuTurn: 'notCpuTurn',
} as const
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: exits 0.

### Task 7: Add `playCpuWarCouncilTurn` and export it from `src/battle/index.ts`

- Skill: react-frontend

**Files:**
- Create: `src/battle/playCpuWarCouncilTurn.ts`
- Modify: `src/battle/index.ts`
- Test: `src/battle/__tests__/playCpuWarCouncilTurn.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest'
import { startBattle } from '../startBattle'
import { submitWarCouncilCard } from '../submitWarCouncilCard'
import { playCpuWarCouncilTurn } from '../playCpuWarCouncilTurn'
import { BattlePhase } from '../battlePhase'
import { BattleRejectionReason } from '../battleAction'
import { AbilityChoiceKind, CardRank, currentTurn, legalMoves, PlayerSide } from '../../warCouncil'
import type { AbilityChoice } from '../../warCouncil'
import type { BattleState } from '../battleState'

function lcg(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// A fixed, non-adaptive single-turn helper — the same shape as
// battleTestHelpers.ts's autoPlayWarCouncilRound, scoped to one turn so this
// file can interleave it with playCpuWarCouncilTurn. Not CPU decision-making.
function submitFirstLegalCard(state: BattleState, side: PlayerSide): BattleState {
  if (state.phase !== BattlePhase.WarCouncilRound) throw new Error('expected WarCouncilRound')
  const card = legalMoves(state.warCouncil, side)[0]
  const choice: AbilityChoice | undefined =
    card.rank === CardRank.Fox
      ? { kind: AbilityChoiceKind.FoxDecline }
      : card.rank === CardRank.Woodcutter
        ? { kind: AbilityChoiceKind.WoodcutterDiscard, discard: state.warCouncil.drawPile[0] }
        : undefined
  const result = submitWarCouncilCard(state, side, card, choice)
  if (!result.ok) throw new Error(`setup move rejected: ${result.reason}`)
  return result.state
}

describe('playCpuWarCouncilTurn — rejections', () => {
  it('rejects when the battle is not in the WarCouncilRound phase', () => {
    const opened = startBattle(lcg(1))
    const resolved: BattleState = {
      phase: BattlePhase.Resolved,
      round: 1,
      vanguard: opened.vanguard,
      winner: PlayerSide.Player,
    }
    const result = playCpuWarCouncilTurn(resolved)
    expect(result).toEqual({ ok: false, reason: BattleRejectionReason.NotWarCouncilPhase })
  })

  it('rejects when it is not the CPU\'s turn', () => {
    const opened = startBattle(lcg(2))
    expect(currentTurn(opened.warCouncil)).toBe(PlayerSide.Cpu)
    const afterCpuLead = submitFirstLegalCard(opened, PlayerSide.Cpu)
    expect(currentTurn(afterCpuLead.warCouncil)).toBe(PlayerSide.Player)

    const result = playCpuWarCouncilTurn(afterCpuLead)
    expect(result).toEqual({ ok: false, reason: BattleRejectionReason.NotCpuTurn })
  })
})

describe('playCpuWarCouncilTurn — plays a legal CPU move', () => {
  it('submits a move accepted by submitWarCouncilCard and advances the round', () => {
    const state = startBattle(lcg(3))
    expect(currentTurn(state.warCouncil)).toBe(PlayerSide.Cpu)

    const result = playCpuWarCouncilTurn(state)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('expected ok')
    if (result.state.phase !== BattlePhase.WarCouncilRound) throw new Error('expected WarCouncilRound')
    expect(result.state.warCouncil.currentTrick.length).toBe(1)
  })
})

describe('playCpuWarCouncilTurn — drives a full round to MusterConversion', () => {
  it('completes 13 tricks alternating playCpuWarCouncilTurn (cpu) with a fixed script (player)', () => {
    let state: BattleState = startBattle(lcg(4))
    let guard = 0

    while (state.phase === BattlePhase.WarCouncilRound) {
      guard += 1
      if (guard > 100) throw new Error('runaway loop — round never completed')

      if (currentTurn(state.warCouncil) === PlayerSide.Cpu) {
        const result = playCpuWarCouncilTurn(state)
        if (!result.ok) throw new Error(`cpu turn rejected: ${result.reason}`)
        state = result.state
      } else {
        state = submitFirstLegalCard(state, PlayerSide.Player)
      }
    }

    expect(state.phase).toBe(BattlePhase.MusterConversion)
  })
})
```

- [ ] **Step 2: Run and confirm the red state**

Run: `npx vitest run src/battle/__tests__/playCpuWarCouncilTurn.test.ts`
Expected: fails to collect — `../playCpuWarCouncilTurn` does not exist yet.

- [ ] **Step 3: Implement `playCpuWarCouncilTurn` and export it**

```ts
// src/battle/playCpuWarCouncilTurn.ts
import { currentTurn, PlayerSide, chooseCpuMove } from '../warCouncil'
import { BattlePhase } from './battlePhase'
import { BattleRejectionReason } from './battleAction'
import type { BattleActionResult } from './battleAction'
import type { BattleState } from './battleState'
import { submitWarCouncilCard } from './submitWarCouncilCard'

export function playCpuWarCouncilTurn(state: BattleState): BattleActionResult {
  if (state.phase !== BattlePhase.WarCouncilRound) {
    return { ok: false, reason: BattleRejectionReason.NotWarCouncilPhase }
  }
  if (currentTurn(state.warCouncil) !== PlayerSide.Cpu) {
    return { ok: false, reason: BattleRejectionReason.NotCpuTurn }
  }
  const move = chooseCpuMove(state.warCouncil, PlayerSide.Cpu)
  return submitWarCouncilCard(state, PlayerSide.Cpu, move.card, move.choice)
}
```

In `src/battle/index.ts`, add one line at the end of the file:

```ts
export { playCpuWarCouncilTurn } from './playCpuWarCouncilTurn'
```

- [ ] **Step 4: Run and confirm green, then typecheck**

Run: `npx vitest run src/battle/__tests__/playCpuWarCouncilTurn.test.ts; npm run typecheck`
Expected: Vitest reports all tests in the file passed; `npm run typecheck` exits 0.

---

## Phase 4 — Final verification

No production changes — only sanity-checks that the cumulative work is clean. This project has
no enforced pure-core import boundary yet (per `.claude/workflow/web-project.md`) and this
contract introduces no configuration key or tunable, so the two boundary/tunable-grep checks from
the standard template are omitted rather than run against nothing.

### Task 8: Static gates and full suite

- Skill: react-frontend

**Files:** (none — verification only)

- [ ] **Step 1: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed across the whole suite (including every
existing `warCouncil`, `vanguard`, and `battle` spec, not just this contract's new files).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

### Task 9: Update the PR description

- Skill: react-frontend

**Files:**
- Create: `.claude/contract/SCRUM-26-war-council-cpu-heuristic/pr-description.md`

- [ ] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:
- Link to `plan.md` in this folder.
- Summary: adds a pure, deterministic heuristic CPU card player for the War Council engine
  (`src/warCouncil/cpuPlayer.ts`) plus a thin `src/battle/playCpuWarCouncilTurn.ts` composition
  function; zero illegal plays verified across 60 seeded full 13-trick rounds, including the Fox
  and Woodcutter ability paths.
- The two ability-choice defaults and the tie-break suit order are documented assumptions (see
  `plan.md` Part 1 → Assumptions made) — flag them for a quick sanity read, not as open questions.
- Verification results from Task 8 (typecheck / lint / test / build).
- One-line note for future contributors: `chooseCpuMove` is legality-generic per `PlayerSide` —
  it can drive either side's turn, which is how the AC4 simulation tests exercise "a range of
  hands" without a second decision function.

---

## Self-review

**Spec coverage:**
- Plan.md In scope → "pure heuristic function... always drawn from legalMoves()" — Tasks 1, 4.
- Plan.md In scope → "stated, documented rule for... Fox... and... Woodcutter" — Tasks 2, 3.
- Plan.md In scope → "thin src/battle/ composition function" — Tasks 6, 7.
- Plan.md In scope → "unit tests for the heuristic's card and ability-choice logic" — Tasks 1–4.
- Plan.md In scope → "simulation tests driving 50+ seeded full 13-trick rounds... confirming...
  Fox and... Woodcutter paths are actually exercised" — Task 5.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or
"similar to Task N" references. Every step shows exact code or a `Run:`/`Expected:` command pair.

**Type / name consistency:** `chooseCpuCard`, `chooseCpuFoxChoice`, `chooseCpuWoodcutterChoice`,
`chooseCpuMove`, `CpuMove`, `BattleRejectionReason.NotCpuTurn`, and `playCpuWarCouncilTurn` are
each introduced exactly once (Tasks 1, 2, 3, 4, 4, 6, 7 respectively) and referenced identically
in every later task and in `plan.md` Part 2 → Data shapes.

**Phase boundary cleanliness:** Phase 1 ends with `cpuPlayer.ts` fully implemented, exported from
`src/warCouncil/index.ts`, typechecking cleanly, and no import from `src/battle/` — internally
consistent on its own. Phase 2 adds tests only, no production code, so the type-check state is
identical to the end of Phase 1. Phase 3 ends with `playCpuWarCouncilTurn` implemented, exported,
and tested, touching only `src/battle/` files plus the one new `BattleRejectionReason` member —
no half-applied rename, no dead import. Phase 4 makes no production change at all.
