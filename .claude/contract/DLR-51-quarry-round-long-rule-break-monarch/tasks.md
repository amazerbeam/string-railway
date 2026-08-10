# Tasks: The Quarry's round-long rule-break — the mechanism, plus the Monarch

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: COMPLETE
Started: 2026-08-10

**Goal:** Give a Hunt one Quarry character whose printed ability applies for the whole round rather than the single card that prints it, and implement the Monarch end to end in the engine — `RoundState` carries the character, `dealRound` sets it once, and `legalMoves` narrows the player's follow to their Swan or highest card of the suit every time the Quarry leads a suit they hold.

**Spec:** `plan.md` in this folder.

---

## File map

**Created:**

- `src/hunt/quarryCharacters.ts` — display data for §4's cast (name + one player-facing sentence), Monarch only
- `src/hunt/__tests__/quarryCharacters.test.ts` — the Monarch entry resolves; an unimplemented character resolves to `undefined`
- `src/warCouncil/quarryRuleBreak.ts` — `QUARRY_SIDE`, `monarchFollowSet`, `monarchFollowApplies`
- `src/warCouncil/__tests__/quarryRuleBreak.test.ts` — the follow set and the applicability predicate in isolation
- `src/warCouncil/__tests__/legalMovesQuarry.test.ts` — the round-long Monarch's effect on `legalMoves`, in a **new** file so `legalMoves.test.ts` stays byte-identical (AC 5)

**Modified:**

- `src/warCouncil/types.ts:57-69` — `RoundState` gains `readonly quarryCharacter?: QuarryCharacter`
- `src/warCouncil/deal.ts:5-25` — `dealRound` gains an optional third parameter and writes the field
- `src/warCouncil/legalMoves.ts:1-26` — the Monarch branch calls `monarchFollowSet` and gains the round-long disjunct
- `src/warCouncil/playCard.ts:36-46` — the rejection-reason branch consults `monarchFollowApplies`
- `src/warCouncil/index.ts` — re-export the three `quarryRuleBreak` symbols
- `src/hunt/index.ts` — re-export `QuarryCharacterInfo`, `QUARRY_CHARACTERS`, `quarryCharacterInfo`
- `src/warCouncil/__tests__/deal.test.ts` — two cases for the new parameter
- `src/warCouncil/__tests__/playCard.test.ts` — one case for the round-long rejection reason
- `src/warCouncil/__tests__/cpuPlayer.test.ts:197-249` — a seeded full-round simulation with the Monarch active (AC 6)

**Deleted:** (none)

**Not to be touched:** `src/warCouncil/abilities.ts` (AC 2 — the single-card abilities are unchanged), `src/warCouncil/__tests__/legalMoves.test.ts` (AC 5 — must pass unmodified), `src/hunt/config.ts` (the Monarch's rule-break has no numeric aspect), anything under `src/app/**`.

**Developer decides or observes:**

- **The Monarch's player-facing sentence** — proposed: *"Every time the Monarch leads a suit you hold, you must play your Swan of that suit or your highest card of it."* Transcribed from §4; copy is the developer's call, including whether it should also name the liability. Task 1 ships that sentence; changing it is a one-line edit.
- **The rule reading: "highest of the suit" recomputed live, not fixed at deal time** (`plan.md` → Risks, bullet 1). Task 4's third test pins the consequence — shedding your Swan and top card of a suit narrows you to your new highest rather than freeing the suit. Reversing this reading changes `RoundState`'s shape, so it is a re-plan, not a tweak.
- **Nothing in the running app exercises this on close** — `dealRound`'s two callers in `App.tsx` keep passing two arguments because character scheduling is T9's. Correct for an `engine`-not-`playable` ticket; there is no "open the app and look" step in this contract.
- **DLR-50's changes are uncommitted** and touch `src/warCouncil/index.ts` and `src/hunt/index.ts`, which this contract also edits. The additions are disjoint export lines so nothing conflicts, but the developer may want to commit DLR-50 first.
- **[Residual — Defender, round 1] `src/app/warCouncil/labels.ts:33-34`'s copy for `IllegalMoveReason.MustFollowMonarch`** now describes only the pre-existing single-card trigger ("The Monarch was led…"), but `playCard.ts` (this contract) widened that reason code to also fire on the round-long trigger, where an ordinary card was led and the Monarch character is simply active. The message is factually wrong for that second case. Currently unreachable — `App.tsx` never passes a `quarryCharacter` to `dealRound` — so no live defect ships today, but the next ticket that wires character scheduling into a real round will silently ship this incorrect copy. `src/app/**` is out of scope for this `engine`-labeled contract (`plan.md`, `tasks.md` both exclude it), and the fix is a copy-wording call (rewrite the string to be trigger-neutral, or split the reason code) — the developer's to make, not an agent's to invent. Not fixed in this contract; flag for the ticket that next touches character scheduling/UI (or fix directly at any time — it's a one-line copy edit once the wording is chosen).

---

## Phase 1 — The round-long rule-break in round state and legal-move generation

Everything the ticket calls the mechanism, built bottom-up: the display data first (no dependents), then the state field and its only writer, then the rule module, then the two consumers. Each task leaves the tree type-checking — a new module with no importer compiles fine, and the two consumer edits come after the module they import exists. The phase boundary is safe because by its end the field, the rule, the legal-move narrowing, and the rejection reason are all consistent; stopping earlier would leave a field nothing reads, which type-checks but is not internally meaningful.

### Task 1: Add the Quarry character display data in `src/hunt/quarryCharacters.ts` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/hunt/quarryCharacters.ts`
- Modify: `src/hunt/index.ts`
- Test: `src/hunt/__tests__/quarryCharacters.test.ts`

- [x] **Step 1: Write the new module**

Create `src/hunt/quarryCharacters.ts` with exactly this content:

```ts
import { QuarryCharacter } from './types'

/**
 * Display data for one Quarry character — §4's cast. Player-facing text only; the
 * rule-break itself is enforced in `src/warCouncil/quarryRuleBreak.ts`, so a UI layer
 * renders these fields without restating the rule (DLR-51 AC7).
 */
export interface QuarryCharacterInfo {
  readonly character: QuarryCharacter
  readonly name: string
  /** One sentence, addressed to the player — transcribed from §4's worked example. */
  readonly description: string
}

/**
 * Partial by design: only the Monarch's rule-break is enforced (DLR-51). The other four
 * characters of §4's cast are T13's, and an entry here without matching enforcement in
 * `quarryRuleBreak.ts` would put a rule on screen that no code applies.
 */
export const QUARRY_CHARACTERS: Readonly<Partial<Record<QuarryCharacter, QuarryCharacterInfo>>> = {
  [QuarryCharacter.Monarch]: {
    character: QuarryCharacter.Monarch,
    name: 'The Monarch',
    description:
      'Every time the Monarch leads a suit you hold, you must play your Swan of that suit or your highest card of it.',
  },
}

/**
 * Display data for `character`, or `undefined` when its rule-break is not implemented
 * yet — a caller shows no panel rather than crashing mid-round.
 */
export function quarryCharacterInfo(character: QuarryCharacter): QuarryCharacterInfo | undefined {
  return QUARRY_CHARACTERS[character]
}
```

- [x] **Step 2: Re-export from the module barrel**

In `src/hunt/index.ts`, append after the existing `./config` export block:

```ts
export type { QuarryCharacterInfo } from './quarryCharacters'
export { QUARRY_CHARACTERS, quarryCharacterInfo } from './quarryCharacters'
```

- [x] **Step 3: Write the spec**

Create `src/hunt/__tests__/quarryCharacters.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { QUARRY_CHARACTERS, quarryCharacterInfo } from '../quarryCharacters'
import { QuarryCharacter } from '../types'

describe('quarryCharacterInfo', () => {
  it('resolves the Monarch to a name and a one-sentence player-facing description', () => {
    const info = quarryCharacterInfo(QuarryCharacter.Monarch)
    expect(info?.name).toBe('The Monarch')
    expect(info?.description).toBe(
      'Every time the Monarch leads a suit you hold, you must play your Swan of that suit or your highest card of it.',
    )
  })

  it('resolves to undefined for a character whose rule-break is not implemented yet', () => {
    expect(quarryCharacterInfo(QuarryCharacter.Witch)).toBeUndefined()
    expect(quarryCharacterInfo(QuarryCharacter.Fox)).toBeUndefined()
    expect(quarryCharacterInfo(QuarryCharacter.Woodcutter)).toBeUndefined()
    expect(quarryCharacterInfo(QuarryCharacter.Swan)).toBeUndefined()
  })

  it('keys every entry by its own character, so a lookup cannot return another character', () => {
    for (const [key, info] of Object.entries(QUARRY_CHARACTERS)) {
      expect(info?.character).toBe(key)
    }
  })
})
```

- [x] **Step 4: Run the new spec and the fast gate**

Run: `npx vitest run src/hunt/__tests__/quarryCharacters.test.ts; npm run typecheck`
Expected: Vitest reports 3 passed, 0 failed; `typecheck` exits 0 with no errors.

### Task 2: Carry the active character on `RoundState` and set it at deal time ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/types.ts:57-69`, `src/warCouncil/deal.ts:1-26`
- Test: `src/warCouncil/__tests__/deal.test.ts`

- [x] **Step 1: Add the optional field to `RoundState`**

In `src/warCouncil/types.ts`, add a type-only import at the top of the file (the module has no imports today):

```ts
import type { QuarryCharacter } from '../hunt'
```

Then add the field as the last member of `interface RoundState`, after `readonly phase: RoundPhase`:

```ts
  /**
   * The encounter's round-long rule-break (§4). Written once by `dealRound` and carried
   * by every state spread in `playCard`/`abilities`, so it cannot toggle mid-round
   * (DLR-51 AC1). Absent means no character is active and the base rules apply unchanged
   * — optional so the specs' hand-built `RoundState` literals still compile.
   */
  readonly quarryCharacter?: QuarryCharacter
```

- [x] **Step 2: Give `dealRound` an optional third parameter**

In `src/warCouncil/deal.ts`, add the type-only import and widen the signature. Replace lines 1-5:

```ts
import { createDeck } from './deck'
import { shuffle } from './shuffle'
import { otherSide, PlayerSide, RoundPhase, TRICKS_PER_ROUND, type RoundState } from './types'
import type { QuarryCharacter } from '../hunt'

// `quarryCharacter` is the encounter's round-long rule-break (§4), set here and nowhere
// else. Optional: which character an encounter draws is T9's run scheduling, so every
// caller today deals a characterless round with the base rules.
export function dealRound(
  dealer: PlayerSide,
  rng: () => number,
  quarryCharacter?: QuarryCharacter,
): RoundState {
```

and add `quarryCharacter,` as the last property of the returned object literal, after `phase: RoundPhase.AwaitingLead,`.

- [x] **Step 3: Add the deal-time cases to the existing spec**

In `src/warCouncil/__tests__/deal.test.ts`, add `QuarryCharacter` to the imports (`import { QuarryCharacter } from '../../hunt'`) and append inside the existing `describe('dealRound', …)` block:

```ts
  it('deals a characterless round when no Quarry character is given', () => {
    expect(dealRound(PlayerSide.Player, lcg(11)).quarryCharacter).toBeUndefined()
  })

  it('records the Quarry character it was dealt with', () => {
    const state = dealRound(PlayerSide.Player, lcg(11), QuarryCharacter.Monarch)
    expect(state.quarryCharacter).toBe(QuarryCharacter.Monarch)
  })

  it('leaves the rest of the deal identical whether a character is active or not', () => {
    const plain = dealRound(PlayerSide.Player, lcg(11))
    const withMonarch = dealRound(PlayerSide.Player, lcg(11), QuarryCharacter.Monarch)
    expect(withMonarch.hands).toEqual(plain.hands)
    expect(withMonarch.decree).toEqual(plain.decree)
    expect(withMonarch.drawPile).toEqual(plain.drawPile)
  })
```

- [x] **Step 4: Run the deal spec and the fast gate**

Run: `npx vitest run src/warCouncil/__tests__/deal.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed and 3 more passing tests than before this task; `typecheck` exits 0.

### Task 3: Add the rule-break module in `src/warCouncil/quarryRuleBreak.ts` ✓

- Skill: `react-frontend`

**Files:**

- Create: `src/warCouncil/quarryRuleBreak.ts`
- Modify: `src/warCouncil/index.ts`
- Test: `src/warCouncil/__tests__/quarryRuleBreak.test.ts`

- [x] **Step 1: Write the module**

Create `src/warCouncil/quarryRuleBreak.ts` with exactly this content. `monarchFollowSet`'s body is lifted from `legalMoves.ts:13-22` so the single-card path keeps its exact current output, including the `[swan, highest]` order two existing assertions depend on:

```ts
import { QuarryCharacter } from '../hunt'
import { cardsOfSuit, highestOfSuit, sameCard } from './cardUtils'
import { CardRank, PlayerSide, type Card, type RoundState, type Suit } from './types'

// The seat the Quarry plays — `src/hunt/types.ts` defines the Quarry as "The CPU opponent
// for one encounter" (§4). Named so T9/T13 have a single place to change if a future mode
// ever seats the Quarry as the player.
export const QUARRY_SIDE: PlayerSide = PlayerSide.Cpu

/**
 * The base Monarch follow set (`fox-in-the-forest.md` → Suit card reference, rank 11): the
 * Swan of `suit` then the highest card of `suit`, deduplicated when they are the same card.
 * Empty when `hand` holds none of `suit` — a caller reads empty as "unconstrained in that
 * suit", never as "no legal move". "Highest" is recomputed from `hand` at the moment of the
 * follow, matching the printed rule (plan.md → Risks).
 */
export function monarchFollowSet(hand: readonly Card[], suit: Suit): readonly Card[] {
  const suitCards = cardsOfSuit(hand, suit)
  if (suitCards.length === 0) {
    return []
  }
  const swan = suitCards.find((c) => c.rank === CardRank.Swan)
  const highest = highestOfSuit(hand, suit)
  const options = [swan, highest].filter((c): c is Card => c !== undefined)
  return options.filter((c, i) => options.findIndex((o) => sameCard(o, c)) === i)
}

/**
 * True when the encounter's round-long rule-break narrows `side`'s follow options on the
 * current trick (§4's Monarch): the Monarch is the active character, `side` is not the
 * Quarry, and the Quarry led this trick. Consulted by both `legalMoves` and `playCard`'s
 * rejection-reason branch so the legal set and the reason code cannot disagree.
 */
export function monarchFollowApplies(state: RoundState, side: PlayerSide): boolean {
  if (state.quarryCharacter !== QuarryCharacter.Monarch) {
    return false
  }
  if (side === QUARRY_SIDE) {
    return false
  }
  const lead = state.currentTrick[0]
  return lead !== undefined && lead.side === QUARRY_SIDE
}
```

- [x] **Step 2: Re-export from the module barrel**

In `src/warCouncil/index.ts`, add after the existing `export { legalMoves } from './legalMoves'` line:

```ts
export { QUARRY_SIDE, monarchFollowApplies, monarchFollowSet } from './quarryRuleBreak'
```

- [x] **Step 3: Write the spec**

Create `src/warCouncil/__tests__/quarryRuleBreak.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { QuarryCharacter } from '../../hunt'
import { monarchFollowApplies, monarchFollowSet, QUARRY_SIDE } from '../quarryRuleBreak'
import { PlayerSide, RoundPhase, type Card, type RoundState } from '../types'

function stateWith(overrides: Partial<RoundState>): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: [], cpu: [] },
    drawPile: [],
    decree: { suit: 'bells', rank: 2 },
    trumpSuit: 'bells',
    tricksWon: { player: 0, cpu: 0 },
    capturedCards: { player: [], cpu: [] },
    currentTrick: [],
    leader: PlayerSide.Player,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
    ...overrides,
  }
}

const hand: Card[] = [
  { suit: 'keys', rank: 1 },
  { suit: 'keys', rank: 6 },
  { suit: 'keys', rank: 9 },
  { suit: 'moons', rank: 2 },
]

describe('monarchFollowSet', () => {
  it('narrows to the Swan then the highest card of the suit, in that order', () => {
    expect(monarchFollowSet(hand, 'keys')).toEqual([
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 9 },
    ])
  })

  it('returns one card, not a duplicate, when the Swan is also the highest of the suit', () => {
    expect(monarchFollowSet([{ suit: 'keys', rank: 1 }], 'keys')).toEqual([
      { suit: 'keys', rank: 1 },
    ])
  })

  it('returns the highest alone when the hand holds no Swan of the suit', () => {
    expect(monarchFollowSet(hand, 'moons')).toEqual([{ suit: 'moons', rank: 2 }])
  })

  it('returns empty when the hand holds none of the suit — unconstrained, not stuck', () => {
    expect(monarchFollowSet(hand, 'bells')).toEqual([])
  })
})

describe('monarchFollowApplies', () => {
  // Annotated, not inferred: a bare array literal widens `suit` to `string`, which is not
  // assignable to `Suit` once it leaves the contextually-typed argument position.
  const quarryLed: RoundState['currentTrick'] = [
    { side: QUARRY_SIDE, card: { suit: 'keys', rank: 4 } },
  ]

  it('fires for the player when the Monarch is active and the Quarry led', () => {
    const state = stateWith({
      quarryCharacter: QuarryCharacter.Monarch,
      leader: QUARRY_SIDE,
      currentTrick: quarryLed,
    })
    expect(monarchFollowApplies(state, PlayerSide.Player)).toBe(true)
  })

  it('does not fire when no character is active', () => {
    const state = stateWith({ leader: QUARRY_SIDE, currentTrick: quarryLed })
    expect(monarchFollowApplies(state, PlayerSide.Player)).toBe(false)
  })

  it('does not constrain the Quarry itself', () => {
    const state = stateWith({
      quarryCharacter: QuarryCharacter.Monarch,
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'keys', rank: 4 } }],
    })
    expect(monarchFollowApplies(state, QUARRY_SIDE)).toBe(false)
  })

  it('does not fire when the player led the trick', () => {
    const state = stateWith({
      quarryCharacter: QuarryCharacter.Monarch,
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'keys', rank: 4 } }],
    })
    expect(monarchFollowApplies(state, PlayerSide.Player)).toBe(false)
  })

  it('does not fire before a card has been led', () => {
    const state = stateWith({ quarryCharacter: QuarryCharacter.Monarch, currentTrick: [] })
    expect(monarchFollowApplies(state, PlayerSide.Player)).toBe(false)
  })

  it('does not fire for a character whose rule-break is not the Monarch', () => {
    const state = stateWith({
      quarryCharacter: QuarryCharacter.Witch,
      leader: QUARRY_SIDE,
      currentTrick: quarryLed,
    })
    expect(monarchFollowApplies(state, PlayerSide.Player)).toBe(false)
  })
})
```

- [x] **Step 4: Run the new spec and the fast gate**

Run: `npx vitest run src/warCouncil/__tests__/quarryRuleBreak.test.ts; npm run typecheck`
Expected: Vitest reports 10 passed, 0 failed; `typecheck` exits 0.

### Task 4: Make `legalMoves` consult the rule-break as an additional condition ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/legalMoves.ts:1-26`
- Test: `src/warCouncil/__tests__/legalMovesQuarry.test.ts`

- [x] **Step 1: Write the failing spec for the round-long narrowing**

Create `src/warCouncil/__tests__/legalMovesQuarry.test.ts`. It is a **new** file so `legalMoves.test.ts` stays byte-identical — that unmodified file is itself AC 5's evidence:

```ts
import { describe, expect, it } from 'vitest'
import { QuarryCharacter } from '../../hunt'
import { legalMoves } from '../legalMoves'
import { PlayerSide, RoundPhase, type Card, type RoundState } from '../types'

function playerFacing(
  playerHand: Card[],
  led: Card,
  quarryCharacter?: QuarryCharacter,
): RoundState {
  return {
    dealer: PlayerSide.Player,
    hands: { player: playerHand, cpu: [] },
    drawPile: [],
    decree: { suit: 'bells', rank: 2 },
    trumpSuit: 'bells',
    tricksWon: { player: 0, cpu: 0 },
    capturedCards: { player: [], cpu: [] },
    currentTrick: [{ side: PlayerSide.Cpu, card: led }],
    leader: PlayerSide.Cpu,
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingFollow,
    quarryCharacter,
  }
}

const ordinaryLead: Card = { suit: 'keys', rank: 4 }

describe('legalMoves — the Monarch as a round-long rule-break', () => {
  it('narrows the player to the Swan and the highest of the suit on an ordinary Quarry lead', () => {
    const hand: Card[] = [
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 6 },
      { suit: 'keys', rank: 9 },
      { suit: 'moons', rank: 2 },
    ]
    const state = playerFacing(hand, ordinaryLead, QuarryCharacter.Monarch)
    expect(legalMoves(state, PlayerSide.Player)).toEqual([
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 9 },
    ])
  })

  it('frees the player entirely once they hold none of the led suit', () => {
    const hand: Card[] = [
      { suit: 'moons', rank: 2 },
      { suit: 'bells', rank: 7 },
    ]
    const state = playerFacing(hand, ordinaryLead, QuarryCharacter.Monarch)
    expect(legalMoves(state, PlayerSide.Player)).toEqual(hand)
  })

  it('recomputes the highest from the current hand rather than fixing it at deal time', () => {
    // Having shed the keys Swan and the keys 9, the player is constrained to their new
    // highest of the suit — not freed in it. plan.md → Risks, bullet 1.
    const hand: Card[] = [
      { suit: 'keys', rank: 4 },
      { suit: 'keys', rank: 6 },
      { suit: 'moons', rank: 2 },
    ]
    const state = playerFacing(hand, ordinaryLead, QuarryCharacter.Monarch)
    expect(legalMoves(state, PlayerSide.Player)).toEqual([{ suit: 'keys', rank: 6 }])
  })

  it('leaves the same position unconstrained when no character is active (AC5)', () => {
    const hand: Card[] = [
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 6 },
      { suit: 'keys', rank: 9 },
      { suit: 'moons', rank: 2 },
    ]
    const state = playerFacing(hand, ordinaryLead)
    expect(legalMoves(state, PlayerSide.Player)).toEqual([
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 6 },
      { suit: 'keys', rank: 9 },
    ])
  })

  it('does not constrain the Quarry when the player leads an ordinary card', () => {
    const cpuHand: Card[] = [
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 6 },
      { suit: 'keys', rank: 9 },
    ]
    const state: RoundState = {
      ...playerFacing([], ordinaryLead, QuarryCharacter.Monarch),
      hands: { player: [], cpu: cpuHand },
      currentTrick: [{ side: PlayerSide.Player, card: ordinaryLead }],
      leader: PlayerSide.Player,
    }
    expect(legalMoves(state, PlayerSide.Cpu)).toEqual(cpuHand)
  })

  it('still applies the single-card Monarch ability to the Quarry when the player leads one', () => {
    const cpuHand: Card[] = [
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 6 },
      { suit: 'keys', rank: 9 },
    ]
    const state: RoundState = {
      ...playerFacing([], ordinaryLead, QuarryCharacter.Monarch),
      hands: { player: [], cpu: cpuHand },
      currentTrick: [{ side: PlayerSide.Player, card: { suit: 'keys', rank: 11 } }],
      leader: PlayerSide.Player,
    }
    expect(legalMoves(state, PlayerSide.Cpu)).toEqual([
      { suit: 'keys', rank: 1 },
      { suit: 'keys', rank: 9 },
    ])
  })
})
```

- [x] **Step 2: Run it and confirm it fails for the right reason**

Run: `npx vitest run src/warCouncil/__tests__/legalMovesQuarry.test.ts`
Expected: non-zero exit. The three round-long cases fail (the first returns all three keys cards instead of two); the three that describe today's behaviour already pass.

- [x] **Step 3: Add the disjunct and delegate the set construction**

Replace the whole of `src/warCouncil/legalMoves.ts` with:

```ts
import { cardsOfSuit } from './cardUtils'
import { monarchFollowApplies, monarchFollowSet } from './quarryRuleBreak'
import { CardRank, type Card, type PlayerSide, type RoundState } from './types'

export function legalMoves(state: RoundState, side: PlayerSide): readonly Card[] {
  const hand = state.hands[side]

  if (state.currentTrick.length === 0) {
    return hand
  }

  const led = state.currentTrick[0].card

  // Two independent conditions produce the same narrowing: the single-card ability, which
  // fires on the led card's rank, and the encounter's round-long rule-break (§4). The
  // round-long version is an additional condition, not a replacement (DLR-51 AC2) — the
  // ability in abilities.ts is untouched.
  if (led.rank === CardRank.Monarch || monarchFollowApplies(state, side)) {
    const options = monarchFollowSet(hand, led.suit)
    return options.length > 0 ? options : hand
  }

  const followSuit = cardsOfSuit(hand, led.suit)
  return followSuit.length > 0 ? followSuit : hand
}
```

Note the import line changes: `highestOfSuit` and `sameCard` move to `quarryRuleBreak.ts` and must be dropped here, or `noUnusedLocals` fails the typecheck.

- [x] **Step 4: Run both legal-move specs and the fast gate**

Run: `npx vitest run src/warCouncil/__tests__/legalMovesQuarry.test.ts src/warCouncil/__tests__/legalMoves.test.ts; npm run typecheck`
Expected: Vitest reports 12 passed, 0 failed — 6 new plus the 6 pre-existing cases in the unmodified `legalMoves.test.ts`; `typecheck` exits 0.

- [x] **Step 5: Confirm `legalMoves.test.ts` was not modified (AC 5)**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git status --porcelain src/warCouncil/__tests__/legalMoves.test.ts`
Expected: no output — the file is untouched in the working tree.

### Task 5: Report a round-long Monarch rejection as `MustFollowMonarch` in `playCard` ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/playCard.ts:1-46`
- Test: `src/warCouncil/__tests__/playCard.test.ts`

- [x] **Step 1: Write the failing case**

In `src/warCouncil/__tests__/playCard.test.ts`, add `import { QuarryCharacter } from '../../hunt'` and append inside the existing `describe('playCard — rejections', …)` block:

```ts
  it('names the Monarch when a round-long rule-break, not the led card, narrowed the follow', () => {
    const state = stateWith({
      quarryCharacter: QuarryCharacter.Monarch,
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: 'cpu', card: { suit: 'keys', rank: 4 } }],
      hands: {
        player: [
          { suit: 'keys', rank: 1 },
          { suit: 'keys', rank: 6 },
          { suit: 'keys', rank: 9 },
        ],
        cpu: [],
      },
    })
    const result = playCard(state, 'player', { suit: 'keys', rank: 6 })
    expect(result).toEqual({ ok: false, reason: IllegalMoveReason.MustFollowMonarch })
  })
```

- [x] **Step 2: Run it and confirm it fails for the right reason**

Run: `npx vitest run src/warCouncil/__tests__/playCard.test.ts -t "names the Monarch"`
Expected: non-zero exit, reporting `mustFollowLeadSuit` received where `mustFollowMonarch` was expected — the rejection is correct, the reason code is not.

- [x] **Step 3: Consult the shared predicate instead of re-deriving the led rank**

In `src/warCouncil/playCard.ts`, add to the imports:

```ts
import { monarchFollowApplies } from './quarryRuleBreak'
```

Then replace lines 38-45 — the `monarchLed` local and the return that reads it — with:

```ts
    // The Monarch constraint can be in force for either reason: the led card is a Monarch,
    // or the encounter's round-long rule-break is (§4). Both must name the same reason, so
    // this asks the same predicate legalMoves used rather than re-deriving it.
    const monarchConstrained =
      (state.currentTrick.length === 1 &&
        state.currentTrick[0].card.rank === CardRank.Monarch) ||
      monarchFollowApplies(state, side)
    return {
      ok: false,
      reason: monarchConstrained
        ? IllegalMoveReason.MustFollowMonarch
        : IllegalMoveReason.MustFollowLeadSuit,
    }
```

`CardRank` is already imported in this file; no new reason code is added, so `IllegalMoveReason` and its UI copy at `src/app/warCouncil/labels.ts:33` need no change.

- [x] **Step 4: Run the play spec and the fast gate**

Run: `npx vitest run src/warCouncil/__tests__/playCard.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed and one more passing test than before this task; `typecheck` exits 0.

---

## Phase 2 — Prove the CPU still plays legally under the rule-break

AC 6 is the ticket's named hard-defect gate: a round-long constraint that ever yields an empty legal set stalls a round, and the ticket asks for that to be proven rather than argued. This phase adds no production code — only a seeded simulation over the cumulative Phase 1 work — so the boundary is safe by construction, and it also pins AC 1's "never toggling mid-round" by walking a whole round and asserting the field every trick.

### Task 6: Simulate full rounds with the Monarch active ✓

- Skill: `react-frontend`

**Files:**

- Modify: `src/warCouncil/__tests__/cpuPlayer.test.ts` (append after the existing simulation block at lines 205-249)
- Test: `src/warCouncil/__tests__/cpuPlayer.test.ts`

- [x] **Step 1: Append the simulation block**

Add `QuarryCharacter` (`import { QuarryCharacter } from '../../hunt'`), `legalMoves` (`import { legalMoves } from '../legalMoves'`), and `monarchFollowApplies` (`import { monarchFollowApplies } from '../quarryRuleBreak'`) to the file's imports, then append at the end of the file. Both sides are driven by `chooseCpuMove` deliberately — the existing harness at lines 205-249 does the same, and driving the *constrained* side through the CPU's chooser is what proves the narrowed set is always non-empty and always accepted by `playCard`:

```ts
describe('the Monarch rule-break — simulated full rounds (DLR-51 AC6)', () => {
  const seeds = Array.from({ length: 60 }, (_, i) => i + 1)

  it.each(seeds)(
    'completes 13 tricks with the Monarch active, never stalling or playing illegally (seed %i)',
    (seed) => {
      let state = dealRound(
        seed % 2 === 0 ? PlayerSide.Player : PlayerSide.Cpu,
        lcg(seed),
        QuarryCharacter.Monarch,
      )
      let guard = 0

      while (state.phase !== RoundPhase.Complete) {
        guard += 1
        if (guard > 100) throw new Error('runaway loop — round never completed')
        const turn = currentTurn(state)
        const legal = legalMoves(state, turn)
        if (legal.length === 0) {
          throw new Error(`empty legal-move set for ${turn} at seed ${seed}, trick ${state.tricksPlayed}`)
        }
        const move = chooseCpuMove(state, turn)
        const result = playCard(state, turn, move.card, move.choice)
        if (!result.ok) throw new Error(`illegal play at seed ${seed}: ${result.reason}`)
        // AC1 — the character never toggles mid-round.
        expect(result.state.quarryCharacter).toBe(QuarryCharacter.Monarch)
        state = result.state
      }

      expect(state.tricksPlayed).toBe(13)
      expect(state.tricksWon.player + state.tricksWon.cpu).toBe(13)
    },
  )

  it('actually fires the constraint, and only ever against the player, across the sample', () => {
    let constrainedTurns = 0
    let narrowedTurns = 0

    for (const seed of seeds) {
      let state = dealRound(PlayerSide.Cpu, lcg(seed), QuarryCharacter.Monarch)
      let guard = 0
      while (state.phase !== RoundPhase.Complete) {
        guard += 1
        if (guard > 100) throw new Error('runaway loop — round never completed')
        const turn = currentTurn(state)
        if (monarchFollowApplies(state, turn)) {
          constrainedTurns += 1
          expect(turn).toBe(PlayerSide.Player)
          if (legalMoves(state, turn).length < state.hands[turn].length) narrowedTurns += 1
        }
        const move = chooseCpuMove(state, turn)
        const result = playCard(state, turn, move.card, move.choice)
        if (!result.ok) throw new Error(`illegal play at seed ${seed}: ${result.reason}`)
        state = result.state
      }
    }

    expect(constrainedTurns).toBeGreaterThan(0)
    expect(narrowedTurns).toBeGreaterThan(0)
  })
})
```

- [x] **Step 2: Run the CPU spec and the fast gate**

Run: `npx vitest run src/warCouncil/__tests__/cpuPlayer.test.ts; npm run typecheck`
Expected: Vitest reports 0 failed, with 61 more passing tests than before this task (60 seeded cases plus the aggregate); `typecheck` exits 0.

---

## Phase 3 — Final verification

The closing phase. No production changes — only sanity checks that the cumulative work is clean, the purity boundary still holds, no rank literal was hard-coded, and the developer has something to paste into a PR.

### Task 7: Confirm the pure-core boundary still holds ✓

- Skill: `none — verification only, no code written`

**Files:**

- Test: none — read-only greps over `src/warCouncil/` and `src/hunt/`

- [x] **Step 1: Grep both pure trees for React imports and DOM globals**

Run: `Get-ChildItem -Path src\warCouncil,src\hunt -Recurse -Filter *.ts | Select-String -Pattern "from 'react|\bwindow\.|\bdocument\.|localStorage|sessionStorage|fetch\("`
Expected: zero hits. Both trees are covered by the ESLint override at `eslint.config.js:24`; this grep is the second, review-level check that skill guidance calls for.

Result: zero hits.

- [x] **Step 2: Confirm `src/hunt/` still imports nothing from `src/warCouncil/`**

Run: `Get-ChildItem -Path src\hunt -Recurse -Filter *.ts | Select-String -Pattern "^import .*warCouncil"`
Expected: zero hits — the `warCouncil → hunt` edge stays one-way, so the new type-only import creates no cycle.

Result: zero hits.

### Task 8: Confirm nothing tunable was hard-coded and every file is within budget ✓

- Skill: `none — verification only, no code written`

**Files:**

- Test: none — read-only greps and line counts

- [x] **Step 1: Grep the changed engine files for bare rank literals**

Run: `Select-String -Path src\warCouncil\quarryRuleBreak.ts,src\warCouncil\legalMoves.ts,src\warCouncil\playCard.ts,src\hunt\quarryCharacters.ts -Pattern "rank === 1\b|rank === 11\b|rank > 1\b"`
Expected: zero hits — the Swan and the Monarch are referenced through `CardRank.Swan` and `CardRank.Monarch`, never as numbers. (The Monarch's rule-break has no tunable numeric aspect at all, so `src/hunt/config.ts` is correctly untouched — AC 8.)

Result: zero hits.

- [x] **Step 2: Confirm `src/hunt/config.ts` and `src/warCouncil/abilities.ts` are unchanged**

Run: `$env:Path = "C:\Program Files\Git\cmd;$env:Path"; git status --porcelain src/hunt/config.ts src/warCouncil/abilities.ts src/warCouncil/__tests__/legalMoves.test.ts src/app`
Expected: no output. `abilities.ts` untouched is AC 2's evidence, `legalMoves.test.ts` untouched is AC 5's, and an untouched `src/app` confirms the ticket stayed inside the engine.

Result: no output.

- [x] **Step 3: Measure every file this contract created or grew**

Run: `Get-ChildItem src\hunt\quarryCharacters.ts,src\hunt\__tests__\quarryCharacters.test.ts,src\warCouncil\quarryRuleBreak.ts,src\warCouncil\__tests__\quarryRuleBreak.test.ts,src\warCouncil\__tests__\legalMovesQuarry.test.ts,src\warCouncil\legalMoves.ts,src\warCouncil\playCard.ts,src\warCouncil\types.ts,src\warCouncil\deal.ts,src\warCouncil\__tests__\cpuPlayer.test.ts | ForEach-Object { "$($_.Name) $((Get-Content $_.FullName | Measure-Object -Line).Lines)" }`
Expected: every count under 400. Anything at 400 or above is blocking and must be split in this contract, not deferred.

Result: `quarryCharacters.ts` 32, `quarryCharacters.test.ts` 23, `quarryRuleBreak.ts` 40, `quarryRuleBreak.test.ts` 90, `legalMovesQuarry.test.ts` 104, `legalMoves.ts` 20, `playCard.ts` 110, `types.ts` 96, `deal.ts` 33, `cpuPlayer.test.ts` 287 — all well under 400.

### Task 9: Static gates and full suite ✓

- Skill: `none — verification only, no code written`

**Files:**

- Test: the whole suite

- [x] **Step 1: Warm the Vitest cache one project at a time**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0. This is the documented guard against the cold-cache `[vitest-pool-runner]` worker timeout on the `dom` project, which is infrastructure and not a test failure.

Result: `node` project — 21 files, 302 tests passed. `dom` project — 3 files, 22 tests passed. Both exit 0.

- [x] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. Quote the `Tests  N passed` line.

Result: `typecheck` exit 0, no errors. `lint` exit 0, no errors/warnings. `npm test` exit 0 — `Test Files  24 passed (24)` / `Tests  324 passed (324)`.

- [x] **Step 3: Formatting of the files this contract touched**

Run: `npx prettier --check src/hunt/quarryCharacters.ts src/hunt/index.ts src/hunt/__tests__/quarryCharacters.test.ts src/warCouncil/quarryRuleBreak.ts src/warCouncil/legalMoves.ts src/warCouncil/playCard.ts src/warCouncil/types.ts src/warCouncil/deal.ts src/warCouncil/index.ts src/warCouncil/__tests__/quarryRuleBreak.test.ts src/warCouncil/__tests__/legalMovesQuarry.test.ts src/warCouncil/__tests__/deal.test.ts src/warCouncil/__tests__/playCard.test.ts src/warCouncil/__tests__/cpuPlayer.test.ts`
Expected: exits 0. Scoped deliberately — the repo-wide `npm run format:check` fails on pre-existing `.docs/**` files this contract must not touch. If a file this contract wrote fails the check (Prettier is configured at `printWidth: 100`, `semi: false`, `singleQuote: true` in `.prettierrc.json`, and the code blocks above are hand-wrapped rather than machine-formatted), run `npx prettier --write` on **that file only** and re-run this check. Do not widen the write to the repo.

Result: first pass found 2 hand-wrapped files out of style — `src/warCouncil/playCard.ts` and `src/warCouncil/__tests__/cpuPlayer.test.ts`. Ran `npx prettier --write` on each of those two files only, per the exception this step grants, then re-ran `typecheck` (clean) and the two affected specs (`playCard.test.ts` + `cpuPlayer.test.ts`, 145 passed) to confirm the reformat changed no behaviour. Re-running the full scoped check: `All matched files use Prettier code style!` — exit 0.

- [x] **Step 4: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors.

Result: exit 0. `50 modules transformed`, `dist/index.html`, `dist/assets/index-*.css`, `dist/assets/index-*.js` written, `✓ built in 389ms`, no errors.

### Task 10: Write the PR description ✓

- Skill: `none — documentation hand-off, no code written`

**Files:**

- Create: `.claude/contract/DLR-51-quarry-round-long-rule-break-monarch/pr-description.md`

- [x] **Step 1: Write `pr-description.md` in this plan folder for the developer to paste**

Include:

- A link to `plan.md` in this folder, and the DLR-51 issue key.
- Summary of the change: one optional `RoundState` field, one new rule-break module, one added disjunct in `legalMoves`, one reason-code fix in `playCard`, and the Monarch's display data — with `abilities.ts`, `src/hunt/config.ts`, and `src/app/**` untouched.
- Every decision the developer must make: the Monarch's on-screen sentence (copy), and the live-recompute vs. fixed-at-deal rule reading with the consequence spelled out.
- The note that nothing in the running app exercises this until T7 and T9 land, so there is no play-test step for this ticket.
- Verification results from Tasks 4, 5, 6, 7, 8 and 9 — actual numbers from the runs, not restated expectations.
- A one-line note for future contributors: a new round-long character is added by giving it an entry in `QUARRY_CHARACTERS` **and** enforcement in `quarryRuleBreak.ts`; the `Partial<Record<…>>` makes the unimplemented four visible, and T13 closes it.

---

## Self-review

**Spec coverage:**

- AC 1 — round-long rule-break as first-class round state, set at deal time, never toggling — Tasks 2 (field + writer) and 6 (per-trick assertion across 60 seeded rounds).
- AC 2 — `legalMoves` consults it, `abilities.ts` unchanged, additional condition not a replacement — Task 4 (the `||` disjunct), Task 8 Step 2 (`abilities.ts` provably untouched).
- AC 3 — the Monarch implemented; fires on every Quarry lead of a suit the player holds; the shed-both liability is real — Tasks 3 (predicate + set) and 4 (tests 1, 2, 3).
- AC 4 — narrowing test and release-when-exhausted test — Task 4, Step 1, tests 1 and 2, with test 3 pinning the recompute reading.
- AC 5 — no character active behaves exactly as today, existing suite passes unchanged — Task 4 test 4, Task 4 Step 5 (`git status --porcelain` on the untouched spec), Task 8 Step 2.
- AC 6 — the rule-break constrains the player, and the CPU plays only legal moves across a full simulated round — Task 6 (both cases), Task 4 tests 5 and 6.
- AC 7 — character exposed as name + one-sentence description — Task 1 (module, barrel, spec).
- AC 8 — nothing tunable inline — Task 8 Step 1's grep; `src/hunt/config.ts` untouched because the Monarch's rule-break has no numeric aspect (`plan.md` → audit).
- AC 9 — scoped Vitest run, `typecheck`, `lint` green — Task 9.
- In-scope bullet "both new symbols re-exported from the barrels" — Task 1 Step 2 and Task 3 Step 2.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, or a runnable command with its `Run:` and `Expected:` lines. No step runs bare `vitest`, `npm run dev`, or edits `package-lock.json`; no step invents a tuning value or reaches for an `eslint-disable`.

**Type / name consistency:** `quarryCharacter` (the `RoundState` field and `dealRound`'s third parameter), `QuarryCharacter` (the existing hunt enum), `QuarryCharacterInfo`, `QUARRY_CHARACTERS`, `quarryCharacterInfo`, `QUARRY_SIDE`, `monarchFollowSet`, `monarchFollowApplies`, and `monarchConstrained` (the renamed local in `playCard.ts`) are spelled identically in every task that names them and match `plan.md` → Data shapes. `IllegalMoveReason.MustFollowMonarch` is reused, never redefined. The Monarch's description string is written once in Task 1 and asserted verbatim in the same task's spec.

**Phase boundary cleanliness:**

- **Phase 1** ends with the field, its writer, the rule module, both consumers, and both barrels consistent — no dead export, no half-applied rename (`monarchLed` → `monarchConstrained` happens inside one task), and no spec importing a module that does not exist yet, since Task 4's spec is created in the same task that makes it pass. Each task's own Step 4 leaves `npm run typecheck` clean.
- **Phase 2** adds only test code over finished production code, so the tree type-checks before and after it.
- **Phase 3** is read-only greps, gates, and one document written outside `src/`; nothing in it can change behaviour.
