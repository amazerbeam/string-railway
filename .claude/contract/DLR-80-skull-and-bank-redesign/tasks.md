# Tasks: The Hunt — skull-and-bank redesign

> **For agentic workers:** Use `/fb-apply` to walk this contract phase-by-phase. Steps use checkbox (`- [ ]`) syntax for tracking.

Status: IN PROGRESS
Started: 2026-08-13

**Goal:** Replace the Hunt's declaration-and-Standing scoring layer with six-trick hands, visible skulls that invert a trick, and a bank × streak multiplier that cashes on damage and at the end of the hand — deleting everything AC13 names from `src/`.

**Spec:** `plan.md` in this folder. Layout and interaction reference: `mockup.html` in this folder (approved 2026-08-13).

---

## File map

**Created:**

- `src/warCouncil/skulls.ts` — skull assignment, the never-rank-1 exclusion, the skull predicate, the per-suit shape, the skull-trick test
- `src/warCouncil/__tests__/skulls.test.ts` — specs for the above
- `src/warCouncil/bank.ts` — the four-outcome table, `resolveTrickBank`, the `PlayerSide → DuelSide` crossing
- `src/warCouncil/__tests__/bank.test.ts` — specs for the above
- `src/app/warCouncil/QuarryShape.tsx` — AC11's per-suit shape-and-skull readout
- `src/app/warCouncil/__tests__/QuarryShape.test.tsx`
- `src/app/warCouncil/BankMeter.tsx` — the bank, the streak, and what the streak would cash for
- `src/app/warCouncil/__tests__/BankMeter.test.tsx`

**Modified:**

- `src/hunt/config.ts` — add `HAND_SIZE`, `SKULL_DENSITY`, `SKULL_MIN_RANK`, `DAMAGE_PER_HIT`; `PLAYER_START_HEALTH` 1350 → 25; `QUARRY_ENCOUNTER_HEALTH` → one placeholder entry; delete the Standing, card-value and rounding surface
- `src/hunt/types.ts` — delete `HuntDeclaration`, `Spoils`, `Standing`; rename `EncounterState.huntsApplied` → `damageEventsApplied`
- `src/hunt/encounter.ts` — `applyHunt` → `applyDamage`, counter renamed
- `src/hunt/index.ts` — barrel follows every change above
- `src/warCouncil/types.ts` — `RoundState` gains `skulledCards` / `bank` / `multiplier` / `lastResolution`, loses `capturedCards` / `declaration`; `IllegalMoveReason` loses `HuntNotDeclared`; `DeclarationState`, `declaredPath`, `TRICKS_PER_ROUND` deleted
- `src/warCouncil/deal.ts` — deal `HAND_SIZE`, assign skulls, seed the bank
- `src/warCouncil/playCard.ts:27-127` — drop the declaration guard, resolve the bank on trick completion, end the hand at `HAND_SIZE`
- `src/warCouncil/cpuPlayer.ts:43-53` — AC12's skull dump
- `src/warCouncil/index.ts` — barrel follows
- `src/app/warCouncil/roundReducer.ts` — owns `EncounterState`, applies damage per trick, loses `Declare` and `CommitDamage`
- `src/app/warCouncil/WarCouncilRound.tsx` — no declare gate, no pending damage, no Standing; mounts the new readouts
- `src/app/warCouncilMount.ts` — docblocks corrected; prop shapes unchanged in name
- `src/App.tsx` — one encounter, no `MAX_HEALTH` change beyond reading the new config
- `src/app/warCouncil/labels.ts` — retired copy out, outcome and skull copy in
- `src/app/warCouncil/RoundOverPanel.tsx` — the hand-over panel, no `Spoils × Standing`
- `src/app/warCouncil/RoundStatusBand.tsx:33` — the hard-coded `13` becomes a read of `HAND_SIZE`
- `src/app/warCouncil/PlayingCard.tsx` — `skulled` prop, centred suit symbol, suit-coloured border
- `src/app/warCouncil/TrickWell.tsx` — passes `skulled` through to played cards
- `src/app/warCouncil/warCouncil.css` — re-home `.wc-sr-only`, add the dossier panel rules the new readouts need
- `src/app/warCouncil/warCouncilCards.css` — card face: centred symbol, suit border; drop `.wc-declare-option`
- `src/app/warCouncil/warCouncilHunt.css` — drop `.wc-ledger*`, `.wc-equation*`, `.wc-side*`, `.wc-verdict-detail`; add `.wc-shape*` and `.wc-bank*`
- `src/app/warCouncil/warCouncilHealthBars.css` — unchanged rules, verified against the new totals
- Test files listed per task below

**Deleted:**

- `src/warCouncil/declareHunt.ts` and `src/warCouncil/__tests__/declareHunt.test.ts`
- `src/warCouncil/spoils.ts` and `src/warCouncil/__tests__/spoils.test.ts`
- `src/warCouncil/scoring.ts` and `src/warCouncil/__tests__/scoring.test.ts`
- `src/warCouncil/__tests__/huntEnumeration.test.ts`
- `src/app/warCouncil/DeclareGate.tsx` and `src/app/warCouncil/__tests__/DeclareGate.test.tsx`
- `src/app/warCouncil/HuntLedger.tsx` and `src/app/warCouncil/__tests__/HuntLedger.test.tsx`
- `src/app/warCouncil/StandingTrack.tsx` and `src/app/warCouncil/__tests__/StandingTrack.test.tsx`
- `src/app/warCouncil/standingSegments.ts` and `src/app/warCouncil/__tests__/standingSegments.test.ts`
- `src/app/warCouncil/warCouncilDeclare.css`
- `src/app/warCouncil/warCouncilStandingTrack.css`

**Developer decides or observes:**

- `src/hunt/config.ts` → `QUARRY_ENCOUNTER_HEALTH[0]` — ships as the plainly-labelled placeholder `1000`. The real figure comes from the first play session (§8's third measurement: record your biggest cash-out each hand). Too low and the encounter is over in two hands; too high and it is a grind.
- `src/hunt/config.ts` → the skull rank distribution — uniform across ranks 2–11 today. §6 Q1: low-skew makes ambushes commoner, high-skew makes skulls announcements. `assignSkulls` takes it as a parameter.
- Whether the CPU should also avoid *leading* a skulled card. Out of scope by AC12; watch §8's first count (tricks deliberately dodged) for dodges that were free rather than decisions.
- Card and panel size bounds, the skull glyph, the suit-border weight, and how long a resolved trick holds on screen — `mockup.html` proposes, these are visual calls.
- Whether the player's health bar reads acceptably at 25 (nine discrete steps of 1) rather than 1,350. May want a different bar treatment.
- Whether the mid-hand encounter end feels abrupt — a big cash-out can end the fight on trick 3, cutting the hand off.
- Whether a skull that has changed hands should still make its trick a skull trick. `trickIsSkulled` tests the trick, not the seat, so a card the Quarry's Fox exchanged into the decree and the player's Fox later took still carries its skull. One line in `src/warCouncil/skulls.ts` if the skull should instead die with the exchange.
- Whether rank 8 keeps the name "Poison". It has no play-time ability and no scoring intervention since DLR-67, and the skull is now a separate marker — so the name is actively misleading beside a skull mechanic. Out of scope by the ticket (§6 Q3), and it will read as a bug in the play-test.
- Whether `.docs/game_rules/the-hunt.md` should in fact be rewritten by `/fb-apply`'s Step 6.5. The ticket defers it; the `implementation-doc-writer` skill mandates it. Say so before running `/fb-apply` if the ticket's deferral should win.

---

## Phase 1 — Additive engine foundations

Three purely additive changes: the new configuration keys, and the two pure modules that hold every rule this ticket introduces. Nothing existing is edited or deleted, so the project type-checks and every current test still passes at this boundary — a safe place to stop and read the new rules before anything is torn out. Both new modules land inside `eslint.config.js`'s pure-core boundary and take their randomness and their tunables as parameters, so neither imports React, touches a DOM global, or reaches `Math.random`.

### Task 1: Add the four new configuration keys to `src/hunt/config.ts` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/hunt/config.ts` — append after the existing `SLICE_QUARRY_CHARACTER` block
- Modify: `src/hunt/index.ts` — re-export the four new names
- Test: `src/hunt/__tests__/config.test.ts` — append a describe block; do not touch the existing ones yet

**Config:** `src/hunt/config.ts` — adds `HAND_SIZE`, `SKULL_DENSITY`, `SKULL_MIN_RANK`, `DAMAGE_PER_HIT`. All four values are settled by the spec's §5/§3.4; none is a developer decision.

- [x] **Step 1: Append the four keys to `src/hunt/config.ts`**

```ts
// §3.1/§5 — six cards each, six tricks. ONE constant, not two: every card dealt is played, so
// hand size and trick count cannot differ, and two constants that must be equal is a bug waiting
// for one of them to be edited. SETTLED (§5).
// UNIT: cards dealt to each side, and therefore tricks in a hand.
export const HAND_SIZE = 6

// §5 "Skull density, first CPU" — roughly 30% of the CPU's dealt cards carry a skull. SETTLED as
// a proportion; the count it produces is Math.round(HAND_SIZE * SKULL_DENSITY) = 2 of 6, which is
// 33%. AC2 requires this be named rather than written at its point of use.
// UNIT: proportion of the CPU's dealt hand, 0..1.
export const SKULL_DENSITY = 0.3

// §3.4 "never rank 1", stated as the lowest rank a skull may sit on. SETTLED — a skulled 1 cannot
// lose a trick, so no amount of foreknowledge helps and the dodge is unavailable. The distribution
// ACROSS the eligible ranks is §6 Q1's open question: uniform today, and `assignSkulls` takes it
// as a parameter so testing a skew is a change at one call site.
// UNIT: rank.
export const SKULL_MIN_RANK = 2

// §5 "Damage to the player" — 1, every time they take damage (AC10). SETTLED.
// UNIT: health points per damage event.
export const DAMAGE_PER_HIT: Damage = 1
```

- [x] **Step 2: Re-export the four keys from `src/hunt/index.ts`**

Add `HAND_SIZE`, `SKULL_DENSITY`, `SKULL_MIN_RANK`, `DAMAGE_PER_HIT` to the existing `export { … } from './config'` list. Leave every other export in place — they are stripped in Task 9, not here.

- [x] **Step 3: Add a spec that the four keys hold the spec's values and produce the intended skull count**

Append to `src/hunt/__tests__/config.test.ts`:

```ts
describe('DLR-80 configuration', () => {
  it('deals six cards and therefore six tricks', () => {
    expect(HAND_SIZE).toBe(6)
  })

  it('produces two skulls in a six-card hand, which is the spec’s roughly 30%', () => {
    const count = Math.round(HAND_SIZE * SKULL_DENSITY)
    expect(count).toBe(2)
    expect(count / HAND_SIZE).toBeCloseTo(0.333, 3)
  })

  it('excludes rank 1 from skulls', () => {
    expect(SKULL_MIN_RANK).toBe(2)
  })

  it('deals exactly one damage per damage event', () => {
    expect(DAMAGE_PER_HIT).toBe(1)
  })
})
```

- [x] **Step 4: Run the config spec and the type gate**

Run: `npx vitest run src/hunt/__tests__/config.test.ts; npm run typecheck`
Expected: both exit 0; Vitest reports 0 failed and the four new tests among the passing count.

### Task 2: Create `src/warCouncil/skulls.ts` ✓

- Skill: react-frontend

**Files:**

- Create: `src/warCouncil/skulls.ts`
- Test: `src/warCouncil/__tests__/skulls.test.ts`

Every export here takes the data it reads — a hand, a skull list, a trick — rather than a `RoundState`. That is what lets this module exist before `RoundState.skulledCards` does, and it means every spec below is a plain function call with no fabricated state.

- [x] **Step 1: Write the failing spec**

Create `src/warCouncil/__tests__/skulls.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { SKULL_DENSITY, SKULL_MIN_RANK } from '../../hunt'
import { assignSkulls, isSkulled, skullableCards, suitShape, trickIsSkulled } from '../skulls'
import { PlayerSide, Suit, type Card, type TrickCard } from '../types'

const HAND: readonly Card[] = [
  { suit: Suit.Bells, rank: 1 },
  { suit: Suit.Bells, rank: 6 },
  { suit: Suit.Bells, rank: 10 },
  { suit: Suit.Keys, rank: 1 },
  { suit: Suit.Keys, rank: 8 },
  { suit: Suit.Moons, rank: 2 },
]

/** A deterministic stand-in for Math.random — `shuffle` consumes it, so a fixed sequence
 *  makes every selection below reproducible without seeding anything global. */
function sequenceRng(values: readonly number[]): () => number {
  let i = 0
  return () => values[i++ % values.length]
}

describe('skullableCards', () => {
  it('excludes every rank 1 and keeps the rest', () => {
    const eligible = skullableCards(HAND)
    expect(eligible).toHaveLength(4)
    expect(eligible.every((c) => c.rank >= SKULL_MIN_RANK)).toBe(true)
  })

  it('returns nothing when every card is a rank 1', () => {
    expect(skullableCards([{ suit: Suit.Keys, rank: 1 }])).toHaveLength(0)
  })
})

describe('assignSkulls', () => {
  it('skulls Math.round(hand.length * density) cards', () => {
    const skulls = assignSkulls(HAND, sequenceRng([0.1, 0.7, 0.3, 0.9, 0.5]))
    expect(skulls).toHaveLength(Math.round(HAND.length * SKULL_DENSITY))
  })

  it('never skulls a rank 1', () => {
    const skulls = assignSkulls(HAND, sequenceRng([0.42]))
    expect(skulls.some((c) => c.rank === 1)).toBe(false)
  })

  it('only ever skulls cards drawn from the hand it was given', () => {
    const skulls = assignSkulls(HAND, sequenceRng([0.2, 0.8]))
    expect(skulls.every((s) => HAND.some((c) => c.suit === s.suit && c.rank === s.rank))).toBe(true)
  })

  it('is deterministic for one rng sequence', () => {
    const a = assignSkulls(HAND, sequenceRng([0.1, 0.7, 0.3, 0.9, 0.5]))
    const b = assignSkulls(HAND, sequenceRng([0.1, 0.7, 0.3, 0.9, 0.5]))
    expect(a).toEqual(b)
  })

  it('clamps to the eligible cards when the density would ask for more', () => {
    const oneEligible: readonly Card[] = [
      { suit: Suit.Bells, rank: 1 },
      { suit: Suit.Keys, rank: 1 },
      { suit: Suit.Moons, rank: 4 },
    ]
    expect(assignSkulls(oneEligible, sequenceRng([0.5]), 1)).toHaveLength(1)
  })

  it('skulls nothing at a density of zero', () => {
    expect(assignSkulls(HAND, sequenceRng([0.5]), 0)).toHaveLength(0)
  })
})

describe('isSkulled', () => {
  const skulls: readonly Card[] = [{ suit: Suit.Bells, rank: 6 }]

  it('matches on suit and rank together', () => {
    expect(isSkulled(skulls, { suit: Suit.Bells, rank: 6 })).toBe(true)
    expect(isSkulled(skulls, { suit: Suit.Keys, rank: 6 })).toBe(false)
    expect(isSkulled(skulls, { suit: Suit.Bells, rank: 7 })).toBe(false)
  })
})

describe('suitShape', () => {
  const skulls: readonly Card[] = [
    { suit: Suit.Bells, rank: 6 },
    { suit: Suit.Keys, rank: 8 },
  ]

  it('reports held and skulled counts per suit and no rank at all', () => {
    const shape = suitShape(HAND, skulls)
    expect(shape).toEqual([
      { suit: Suit.Bells, held: 3, skulled: 1 },
      { suit: Suit.Keys, held: 2, skulled: 1 },
      { suit: Suit.Moons, held: 1, skulled: 0 },
    ])
  })

  it('reports a zero row for a suit that has been stripped', () => {
    const shape = suitShape([{ suit: Suit.Moons, rank: 2 }], [])
    expect(shape.find((s) => s.suit === Suit.Bells)).toEqual({
      suit: Suit.Bells,
      held: 0,
      skulled: 0,
    })
  })
})

describe('trickIsSkulled', () => {
  const skulls: readonly Card[] = [{ suit: Suit.Bells, rank: 6 }]
  const trick = (a: Card, b: Card): readonly TrickCard[] => [
    { side: PlayerSide.Cpu, card: a },
    { side: PlayerSide.Player, card: b },
  ]

  it('is true when the opponent played the skull', () => {
    expect(trickIsSkulled(skulls, trick({ suit: Suit.Bells, rank: 6 }, { suit: Suit.Keys, rank: 9 }))).toBe(true)
  })

  it('is true when the skull changed hands and the player played it', () => {
    expect(trickIsSkulled(skulls, trick({ suit: Suit.Keys, rank: 9 }, { suit: Suit.Bells, rank: 6 }))).toBe(true)
  })

  it('is false for a clean trick', () => {
    expect(trickIsSkulled(skulls, trick({ suit: Suit.Keys, rank: 9 }, { suit: Suit.Moons, rank: 2 }))).toBe(false)
  })
})
```

- [x] **Step 2: Run the spec and watch it fail to collect**

Run: `npx vitest run src/warCouncil/__tests__/skulls.test.ts`
Expected: non-zero exit. The failure is `Failed to load` / `Cannot find module '../skulls'` — a collection error, not a test failure, because the module does not exist yet.

- [x] **Step 3: Write `src/warCouncil/skulls.ts`**

```ts
import { SKULL_DENSITY, SKULL_MIN_RANK } from '../hunt'
import { containsCard } from './cardUtils'
import { shuffle } from './shuffle'
import { ALL_SUITS, type Card, type Suit, type TrickCard } from './types'

/** AC11's row shape: what the Quarry holds in one suit, and how much of it is mined. Carries
 *  no rank, because §3.5's whole claim is that counting suits is bookkeeping and reading ranks
 *  is judgement — the readout removes the first and keeps the second. */
export interface SuitShape {
  readonly suit: Suit
  readonly held: number
  readonly skulled: number
}

/**
 * §3.4's never-rank-1 rule, as a filter. A skulled 1 cannot lose its trick, so it is an
 * undodgeable tax rather than a decision — excluding it is what leaves foreknowledge worth
 * having.
 */
export function skullableCards(hand: readonly Card[], minRank: number = SKULL_MIN_RANK): readonly Card[] {
  return hand.filter((card) => card.rank >= minRank)
}

/**
 * AC2 — the skulls carried by one dealt hand.
 *
 * Draws through `shuffle` from the INJECTED `rng`, never `Math.random`, so a seeded deal is
 * reproducible and every spec above is deterministic. `density` and `minRank` are defaulted
 * parameters rather than values this module closes over — the same injectable pattern
 * `startEncounter`'s `playerHealth` uses — so §6 Q1's rank skew can be tested without mutating
 * module state.
 *
 * The count is clamped to the eligible cards: a hand of five rank-1s cannot carry two skulls,
 * and silently returning fewer is correct where throwing would make a legal deal a crash.
 */
export function assignSkulls(
  hand: readonly Card[],
  rng: () => number,
  density: number = SKULL_DENSITY,
  minRank: number = SKULL_MIN_RANK,
): readonly Card[] {
  const eligible = skullableCards(hand, minRank)
  const wanted = Math.min(Math.round(hand.length * density), eligible.length)
  return shuffle(eligible, rng).slice(0, wanted)
}

/** Membership by suit and rank together, which identifies a card uniquely across the deck. */
export function isSkulled(skulledCards: readonly Card[], card: Card): boolean {
  return containsCard(skulledCards, card)
}

/** AC11 — one row per suit, in `ALL_SUITS` order, including a suit that has been stripped. */
export function suitShape(hand: readonly Card[], skulledCards: readonly Card[]): readonly SuitShape[] {
  return ALL_SUITS.map((suit) => {
    const held = hand.filter((card) => card.suit === suit)
    return {
      suit,
      held: held.length,
      skulled: held.filter((card) => isSkulled(skulledCards, card)).length,
    }
  })
}

/**
 * AC5/AC7's discriminator: a trick is a skull trick iff ANY card played into it is skulled.
 *
 * Skulls are dealt only to the Quarry, so in practice this reads "the Quarry's card is skulled"
 * — but the Quarry's Fox can exchange a skulled card into the decree and the player's Fox can
 * later take that decree into hand, so a player-held skull is expressible in one hand. Testing
 * the trick rather than the seat survives that path with no special case.
 */
export function trickIsSkulled(skulledCards: readonly Card[], trick: readonly TrickCard[]): boolean {
  return trick.some((played) => isSkulled(skulledCards, played.card))
}
```

- [x] **Step 4: Run the spec and the type gate**

Run: `npx vitest run src/warCouncil/__tests__/skulls.test.ts; npm run typecheck`
Expected: both exit 0; Vitest reports 0 failed.

### Task 3: Create `src/warCouncil/bank.ts` ✓

- Skill: react-frontend

**Files:**

- Create: `src/warCouncil/bank.ts`
- Test: `src/warCouncil/__tests__/bank.test.ts`

This module is the whole game in one function. AC8's end-of-hand cash-out folds into the sixth trick's resolution rather than being a second event, because a damage trick has already reset the bank to zero and `0 × 0` is zero — so exactly one of the two cash-outs can ever be non-zero, and there is one damage application per trick with no ordering question.

- [x] **Step 1: Write the failing spec, including the spec's own worked hand**

Create `src/warCouncil/__tests__/bank.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { DAMAGE_PER_HIT, DuelSide } from '../../hunt'
import { incomingFrom, isTaken, resolveTrickBank, TrickOutcome, trickOutcomeFor, type BankState } from '../bank'
import { PlayerSide, Suit, type TrickCard } from '../types'

const START: BankState = { bank: 0, multiplier: 0 }

function pair(leadRank: number, followRank: number): readonly [TrickCard, TrickCard] {
  return [
    { side: PlayerSide.Cpu, card: { suit: Suit.Bells, rank: leadRank } },
    { side: PlayerSide.Player, card: { suit: Suit.Bells, rank: followRank } },
  ]
}

describe('trickOutcomeFor', () => {
  it('maps §3.2’s four rows', () => {
    expect(trickOutcomeFor(true, false)).toBe(TrickOutcome.CleanWin)
    expect(trickOutcomeFor(false, true)).toBe(TrickOutcome.Dodge)
    expect(trickOutcomeFor(false, false)).toBe(TrickOutcome.CleanLoss)
    expect(trickOutcomeFor(true, true)).toBe(TrickOutcome.SkullWin)
  })

  it('takes the trick on a clean win and a dodge, and only those', () => {
    expect(isTaken(TrickOutcome.CleanWin)).toBe(true)
    expect(isTaken(TrickOutcome.Dodge)).toBe(true)
    expect(isTaken(TrickOutcome.CleanLoss)).toBe(false)
    expect(isTaken(TrickOutcome.SkullWin)).toBe(false)
  })
})

describe('resolveTrickBank', () => {
  it('AC4 — a clean win banks both ranks and climbs the multiplier', () => {
    const r = resolveTrickBank(START, pair(11, 9), true, false, false)
    expect(r.outcome).toBe(TrickOutcome.CleanWin)
    expect(r.bankAdded).toBe(20)
    expect(r.bank).toBe(20)
    expect(r.multiplier).toBe(1)
    expect(r.cashOut).toBe(0)
    expect(r.damageToPlayer).toBe(0)
  })

  it('AC5 — a dodged skull is identical to a clean win', () => {
    const clean = resolveTrickBank(START, pair(4, 2), true, false, false)
    const dodge = resolveTrickBank(START, pair(4, 2), false, true, false)
    expect(dodge.bankAdded).toBe(clean.bankAdded)
    expect(dodge.bank).toBe(clean.bank)
    expect(dodge.multiplier).toBe(clean.multiplier)
    expect(dodge.damageToPlayer).toBe(0)
    expect(dodge.outcome).toBe(TrickOutcome.Dodge)
  })

  it('AC6 — a clean loss costs one health and cashes the bank', () => {
    const r = resolveTrickBank({ bank: 43, multiplier: 3 }, pair(5, 4), false, false, false)
    expect(r.outcome).toBe(TrickOutcome.CleanLoss)
    expect(r.cashOut).toBe(129)
    expect(r.damageToPlayer).toBe(DAMAGE_PER_HIT)
    expect(r.bank).toBe(0)
    expect(r.multiplier).toBe(0)
    expect(r.bankAdded).toBe(0)
  })

  it('AC7 — winning a skull trick is identical to losing a clean one', () => {
    const before: BankState = { bank: 43, multiplier: 3 }
    const lost = resolveTrickBank(before, pair(5, 4), false, false, false)
    const ate = resolveTrickBank(before, pair(5, 4), true, true, false)
    expect(ate.cashOut).toBe(lost.cashOut)
    expect(ate.damageToPlayer).toBe(lost.damageToPlayer)
    expect(ate.bank).toBe(0)
    expect(ate.multiplier).toBe(0)
    expect(ate.outcome).toBe(TrickOutcome.SkullWin)
  })

  it('AC9 — the multiplier is the streak, and a hit resets it', () => {
    let s: BankState = START
    for (const won of [true, true, true]) s = resolveTrickBank(s, pair(3, 2), won, false, false)
    expect(s.multiplier).toBe(3)
    s = resolveTrickBank(s, pair(3, 2), false, false, false)
    expect(s.multiplier).toBe(0)
  })

  it('AC8 — the sixth trick cashes what the streak built', () => {
    const r = resolveTrickBank({ bank: 11, multiplier: 1 }, pair(9, 2), true, false, true)
    expect(r.bank).toBe(0)
    expect(r.multiplier).toBe(0)
    expect(r.cashOut).toBe(44)
    expect(r.cashedAtHandEnd).toBe(true)
  })

  it('AC8 — a sixth trick that takes damage cashes once, not twice', () => {
    const r = resolveTrickBank({ bank: 22, multiplier: 2 }, pair(9, 2), false, false, true)
    expect(r.cashOut).toBe(44)
    expect(r.cashedAtHandEnd).toBe(false)
    expect(r.bank).toBe(0)
    expect(r.multiplier).toBe(0)
  })

  it('reproduces §3.3’s worked hand exactly', () => {
    let s: BankState = START
    const steps: ReadonlyArray<[readonly [TrickCard, TrickCard], boolean, boolean, boolean]> = [
      [pair(11, 9), true, false, false],
      [pair(10, 7), true, false, false],
      [pair(4, 2), false, true, false],
      [pair(1, 1), false, false, false],
      [pair(8, 3), true, false, false],
      [pair(9, 2), true, false, true],
    ]
    const cashed: number[] = []
    for (const [cards, won, skull, last] of steps) {
      const r = resolveTrickBank(s, cards, won, skull, last)
      cashed.push(r.cashOut)
      s = r
    }
    expect(cashed).toEqual([0, 0, 0, 129, 0, 44])
  })
})

describe('incomingFrom', () => {
  it('keys damage by the side it depletes', () => {
    const r = resolveTrickBank({ bank: 10, multiplier: 2 }, pair(5, 4), false, false, false)
    expect(incomingFrom(r)).toEqual({ [DuelSide.Player]: 1, [DuelSide.Quarry]: 20 })
  })

  it('is all zeroes for a trick that neither cashed nor hit', () => {
    const r = resolveTrickBank(START, pair(5, 4), true, false, false)
    expect(incomingFrom(r)).toEqual({ [DuelSide.Player]: 0, [DuelSide.Quarry]: 0 })
  })
})
```

- [x] **Step 2: Run the spec and watch it fail to collect**

Run: `npx vitest run src/warCouncil/__tests__/bank.test.ts`
Expected: non-zero exit, `Cannot find module '../bank'`.

- [x] **Step 3: Write `src/warCouncil/bank.ts`**

```ts
import { DAMAGE_PER_HIT, DuelSide, type IncomingDamage } from '../hunt'
import { type TrickCard } from './types'

/** §3.2's four rows. Named rather than a pair of booleans at every branch, so the rule reads
 *  out of the code the way it reads out of the design's table. */
export const TrickOutcome = {
  CleanWin: 'cleanWin', // AC4 — take the trick
  Dodge: 'dodge', // AC5 — take the trick
  CleanLoss: 'cleanLoss', // AC6 — take the damage
  SkullWin: 'skullWin', // AC7 — take the damage
} as const
export type TrickOutcome = (typeof TrickOutcome)[keyof typeof TrickOutcome]

/** The two running figures a hand carries. §3.3: the bank only ever climbs; the multiplier is
 *  the number of tricks taken in a row. */
export interface BankState {
  readonly bank: number
  readonly multiplier: number
}

export interface TrickResolution extends BankState {
  readonly outcome: TrickOutcome
  /** Ranks added to the bank by this trick — both cards on a take, 0 on a hit. */
  readonly bankAdded: number
  /** Damage dealt to the Quarry by this trick: AC6/AC7's cash-out, AC8's forced one, or 0. */
  readonly cashOut: number
  /** 0 or `DAMAGE_PER_HIT`. */
  readonly damageToPlayer: number
  /** Which rule produced `cashOut` — AC8's end-of-hand cash rather than AC6/AC7's. Display only:
   *  the two can never both be non-zero, because a hit resets the bank to 0 first. */
  readonly cashedAtHandEnd: boolean
}

/** §3.2's table as a total function. The skull inverts the trick: on a clean trick you want to
 *  win it, on a skull trick you want to lose it. */
export function trickOutcomeFor(playerWon: boolean, skullTrick: boolean): TrickOutcome {
  if (playerWon) {
    return skullTrick ? TrickOutcome.SkullWin : TrickOutcome.CleanWin
  }
  return skullTrick ? TrickOutcome.Dodge : TrickOutcome.CleanLoss
}

const TAKEN: Readonly<Record<TrickOutcome, boolean>> = {
  [TrickOutcome.CleanWin]: true,
  [TrickOutcome.Dodge]: true,
  [TrickOutcome.CleanLoss]: false,
  [TrickOutcome.SkullWin]: false,
}

/** Whether an outcome banks the cards (AC4/AC5) or takes damage (AC6/AC7). A total `Record`
 *  rather than a comparison, so a fifth outcome becomes a missing-property compile error. */
export function isTaken(outcome: TrickOutcome): boolean {
  return TAKEN[outcome]
}

/**
 * One trick's whole effect on the bank, the streak, and both health bars.
 *
 * `finalTrick` folds AC8 in rather than modelling it as a second event. That is safe because
 * exactly one of the two cash-outs can ever fire: a hit sets bank and multiplier to zero, so
 * AC8's subsequent `0 × 0` is zero; a take leaves exactly one bank to cash. The result is one
 * damage application per trick, with `cashedAtHandEnd` recording which rule paid out.
 *
 * Pure arithmetic over two integer ranks — there is no division anywhere here, so no epsilon is
 * needed and no `NaN` is producible from the inputs this takes.
 */
export function resolveTrickBank(
  before: BankState,
  trickCards: readonly [TrickCard, TrickCard],
  playerWon: boolean,
  skullTrick: boolean,
  finalTrick: boolean,
): TrickResolution {
  const outcome = trickOutcomeFor(playerWon, skullTrick)

  let bank = before.bank
  let multiplier = before.multiplier
  let bankAdded = 0
  let cashOut = 0
  let damageToPlayer = 0

  if (isTaken(outcome)) {
    bankAdded = trickCards[0].card.rank + trickCards[1].card.rank
    bank += bankAdded
    multiplier += 1
  } else {
    cashOut = bank * multiplier
    damageToPlayer = DAMAGE_PER_HIT
    bank = 0
    multiplier = 0
  }

  const handEndCash = finalTrick ? bank * multiplier : 0
  if (finalTrick) {
    cashOut += handEndCash
    bank = 0
    multiplier = 0
  }

  return {
    outcome,
    bankAdded,
    cashOut,
    damageToPlayer,
    bank,
    multiplier,
    cashedAtHandEnd: handEndCash > 0,
  }
}

/**
 * THE one `PlayerSide` -> `DuelSide` crossing, replacing the retired `duelSideDamage`.
 *
 * Keyed by the side the damage is APPLIED TO: the player eats `damageToPlayer`, the Quarry eats
 * `cashOut`. Existing as one function is the point — a call site building this record by hand is
 * one transposition away from depleting the wrong bar, type-checking cleanly, and producing
 * plausible numbers indefinitely.
 */
export function incomingFrom(resolution: TrickResolution): IncomingDamage {
  return {
    [DuelSide.Player]: resolution.damageToPlayer,
    [DuelSide.Quarry]: resolution.cashOut,
  }
}
```

- [x] **Step 4: Run the spec and the type gate**

Run: `npx vitest run src/warCouncil/__tests__/bank.test.ts; npm run typecheck`
Expected: both exit 0; Vitest reports 0 failed, including the worked-hand spec producing `[0, 0, 0, 129, 0, 44]`.

---

## Phase 2 — The cut-over

The phase that cannot be split. `scoring.ts` imports six symbols AC13 deletes, `WarCouncilRound.tsx` imports four more, and `playCard` guards on a declaration that is going away — so there is no ordering in which the engine changes and the app still compiles. Tasks inside this phase therefore do **not** individually type-check; the phase boundary is the type-checking point, and a stop mid-phase leaves a broken build. The tasks are ordered so the engine is internally coherent before the app is rewired, and the last two tasks sweep the test fixtures that every earlier task invalidated.

### Task 4: Reshape `RoundState` in `src/warCouncil/types.ts`

- Skill: react-frontend

**Files:**

- Modify: `src/warCouncil/types.ts:28-146`

- [ ] **Step 1: Delete the retired declarations**

Remove, in `src/warCouncil/types.ts`: the `TRICKS_PER_ROUND` constant and its comment (lines 28-30), the `DeclarationState` interface and its docblock (lines 59-67), the `declaredPath` function and its docblock (lines 102-115), the `import { HuntDeclaration, … } from '../hunt'` reference to `HuntDeclaration` (keep the `QuarryCharacter` type import), and the `HuntNotDeclared` member from `IllegalMoveReason`.

- [ ] **Step 2: Replace the `RoundState` interface**

```ts
export interface RoundState {
  readonly dealer: PlayerSide
  readonly hands: Readonly<Record<PlayerSide, readonly Card[]>>
  readonly drawPile: readonly Card[]
  readonly decree: Card
  readonly trumpSuit: Suit
  readonly tricksWon: Readonly<Record<PlayerSide, number>>
  /** AC2 — the Quarry's dealt cards carrying a skull. Written once by `dealRound` and carried by
   *  every state spread thereafter, so a skull cannot appear or vanish mid-hand. A card that
   *  changes hands keeps its skull, which is what `trickIsSkulled` tests against. */
  readonly skulledCards: readonly Card[]
  /** AC4/AC5 — the summed ranks of every trick taken since the last cash-out. Only ever climbs
   *  until it cashes, which is the property the retired pending-damage figure lacked. */
  readonly bank: number
  /** AC9 — the number of tricks taken in a row. Zero on any damage taken. */
  readonly multiplier: number
  /** The resolution of the trick that just completed. `null` on a fresh deal and after a lead.
   *  The reducer reads it to apply damage; the felt reads it to say what happened. */
  readonly lastResolution: TrickResolution | null
  readonly currentTrick: readonly TrickCard[]
  readonly leader: PlayerSide
  readonly tricksPlayed: number
  readonly phase: RoundPhase
  /**
   * The encounter's round-long rule-break (§4). Written once by `dealRound` and carried by every
   * state spread, so it cannot toggle mid-hand. Absent means the base rules apply unchanged.
   */
  readonly quarryCharacter?: QuarryCharacter
}
```

Add `import type { TrickResolution } from './bank'` at the top. Delete the `capturedCards` field entirely — AC13 retires the capture piles, and the bank replaces the only thing they fed.

- [ ] **Step 3: Confirm the retired names are gone from this file**

Run: `Select-String -Path src\warCouncil\types.ts -Pattern "TRICKS_PER_ROUND|DeclarationState|declaredPath|capturedCards|HuntNotDeclared|HuntDeclaration"`
Expected: zero hits.

### Task 5: Deal six cards and assign the skulls — `src/warCouncil/deal.ts`

- Skill: react-frontend

**Files:**

- Modify: `src/warCouncil/deal.ts`
- Test: `src/warCouncil/__tests__/deal.test.ts`

- [ ] **Step 1: Rewrite `dealRound`**

```ts
import { HAND_SIZE } from '../hunt'
import { createDeck } from './deck'
import { shuffle } from './shuffle'
import { assignSkulls } from './skulls'
import { otherSide, PlayerSide, RoundPhase, type RoundState } from './types'
import type { QuarryCharacter } from '../hunt'

/**
 * One hand: `HAND_SIZE` cards each, one decree, the rest a draw pile. With the 33-card deck that
 * is 6 + 6 dealt, 1 decree and 20 left for the Woodcutter.
 *
 * Skulls are assigned to the Quarry's dealt hand only (AC2) and drawn through the SAME injected
 * `rng` the shuffle uses, so a seeded deal reproduces its skulls as well as its cards. A card the
 * Woodcutter later draws arrives unskulled: §3.4's density is a property of the deal.
 */
export function dealRound(
  dealer: PlayerSide,
  rng: () => number,
  quarryCharacter?: QuarryCharacter,
): RoundState {
  const shuffled = shuffle(createDeck(), rng)
  const playerHand = shuffled.slice(0, HAND_SIZE)
  const cpuHand = shuffled.slice(HAND_SIZE, HAND_SIZE * 2)
  const remaining = shuffled.slice(HAND_SIZE * 2)
  const decree = remaining[0]
  const drawPile = remaining.slice(1)

  return {
    dealer,
    hands: { [PlayerSide.Player]: playerHand, [PlayerSide.Cpu]: cpuHand },
    drawPile,
    decree,
    trumpSuit: decree.suit,
    tricksWon: { [PlayerSide.Player]: 0, [PlayerSide.Cpu]: 0 },
    skulledCards: assignSkulls(cpuHand, rng),
    bank: 0,
    multiplier: 0,
    lastResolution: null,
    currentTrick: [],
    leader: otherSide(dealer),
    tricksPlayed: 0,
    phase: RoundPhase.AwaitingLead,
    quarryCharacter,
  }
}
```

- [ ] **Step 2: Update `src/warCouncil/__tests__/deal.test.ts`**

Replace every `TRICKS_PER_ROUND` reference with `HAND_SIZE`, drop every `capturedCards` assertion, and add:

```ts
it('deals six cards to each side and leaves a decree plus twenty', () => {
  const state = dealRound(PlayerSide.Player, rng)
  expect(state.hands[PlayerSide.Player]).toHaveLength(HAND_SIZE)
  expect(state.hands[PlayerSide.Cpu]).toHaveLength(HAND_SIZE)
  expect(state.drawPile).toHaveLength(createDeck().length - HAND_SIZE * 2 - 1)
})

it('skulls only cards in the Quarry’s own hand, and never a rank 1', () => {
  const state = dealRound(PlayerSide.Player, rng)
  expect(state.skulledCards).toHaveLength(Math.round(HAND_SIZE * SKULL_DENSITY))
  for (const skull of state.skulledCards) {
    expect(skull.rank).toBeGreaterThanOrEqual(SKULL_MIN_RANK)
    expect(containsCard(state.hands[PlayerSide.Cpu], skull)).toBe(true)
  }
})

it('opens the bank and the streak at zero with nothing resolved', () => {
  const state = dealRound(PlayerSide.Player, rng)
  expect(state.bank).toBe(0)
  expect(state.multiplier).toBe(0)
  expect(state.lastResolution).toBeNull()
})
```

- [ ] **Step 3: Run the deal spec**

Run: `npx vitest run src/warCouncil/__tests__/deal.test.ts`
Expected: exits 0, 0 failed. (Other suites are still broken at this point in the phase — that is expected and is what the phase framing describes.)

### Task 6: Resolve the bank when a trick completes — `src/warCouncil/playCard.ts`

- Skill: react-frontend

**Files:**

- Modify: `src/warCouncil/playCard.ts:1-127`
- Test: `src/warCouncil/__tests__/playCard.test.ts`

- [ ] **Step 1: Drop the declaration guard**

Delete the `if (state.declaration === undefined) { return { ok: false, reason: IllegalMoveReason.HuntNotDeclared } }` block and its comment at `playCard.ts:30-36`. Nothing replaces it — there is no pre-trick decision left to gate on.

- [ ] **Step 2: Replace the trick-completion block**

Replace the `capturedCards` construction and the `TRICKS_PER_ROUND` phase check (lines 104-126) with:

```ts
  const tricksPlayed = next.tricksPlayed + 1
  const tricksWon = { ...next.tricksWon, [winner]: next.tricksWon[winner] + 1 }
  const finalTrick = tricksPlayed === HAND_SIZE

  // Every rule AC4-AC9 states lives in `resolveTrickBank`; this function decides nothing about
  // the outcome, it only reports who won and whether the trick was mined.
  const lastResolution = resolveTrickBank(
    { bank: next.bank, multiplier: next.multiplier },
    completedTrick,
    winner === PlayerSide.Player,
    trickIsSkulled(next.skulledCards, completedTrick),
    finalTrick,
  )

  return {
    ok: true,
    state: {
      ...next,
      currentTrick: [],
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

Update the imports: add `HAND_SIZE` from `'../hunt'`, `resolveTrickBank` from `'./bank'`, `trickIsSkulled` from `'./skulls'`, and `PlayerSide` as a value import (it is currently type-only); drop `TRICKS_PER_ROUND`.

- [ ] **Step 3: Clear `lastResolution` on a lead**

The early return for a one-card trick (line 96-98) becomes:

```ts
  if (currentTrick.length === 1) {
    return {
      ok: true,
      state: { ...next, currentTrick, lastResolution: null, phase: RoundPhase.AwaitingFollow },
    }
  }
```

A held resolution outliving the lead that follows it would let the felt describe the wrong trick.

- [ ] **Step 4: Update `src/warCouncil/__tests__/playCard.test.ts`**

Drop every `declaration:` field and every `capturedCards` assertion from the hand-built `RoundState` literals; add `skulledCards: []`, `bank: 0`, `multiplier: 0`, `lastResolution: null` to each. Delete the `HuntNotDeclared` test. Add:

```ts
it('ends the hand on the sixth trick, not the thirteenth', () => {
  // …play HAND_SIZE tricks…
  expect(state.phase).toBe(RoundPhase.Complete)
  expect(state.tricksPlayed).toBe(HAND_SIZE)
})

it('banks a clean win and clears the resolution on the next lead', () => {
  const won = playCard(/* … a trick the player wins clean … */)
  expect(won.ok && won.state.lastResolution?.outcome).toBe(TrickOutcome.CleanWin)
  const led = playCard(won.ok ? won.state : state, /* … */)
  expect(led.ok && led.state.lastResolution).toBeNull()
})

it('treats a trick containing a skulled card as a skull trick', () => {
  const skulled = { suit: Suit.Bells, rank: 6 }
  const state = { /* …RoundState with skulledCards: [skulled] and the Quarry leading it… */ }
  const result = playCard(state, PlayerSide.Player, /* a card that wins */)
  expect(result.ok && result.state.lastResolution?.outcome).toBe(TrickOutcome.SkullWin)
  expect(result.ok && result.state.lastResolution?.damageToPlayer).toBe(DAMAGE_PER_HIT)
})
```

- [ ] **Step 5: Run the playCard spec**

Run: `npx vitest run src/warCouncil/__tests__/playCard.test.ts`
Expected: exits 0, 0 failed.

### Task 7: Make the Quarry dump its skulls — `src/warCouncil/cpuPlayer.ts`

- Skill: react-frontend

**Files:**

- Modify: `src/warCouncil/cpuPlayer.ts:43-53`
- Test: `src/warCouncil/__tests__/cpuPlayer.test.ts`

- [ ] **Step 1: Write the failing spec**

Append to `src/warCouncil/__tests__/cpuPlayer.test.ts`:

```ts
describe('AC12 — the Quarry dumps skulls into tricks it is losing', () => {
  it('plays a skulled loser rather than a clean one', () => {
    const skulled = { suit: Suit.Bells, rank: 4 }
    const state = /* …player leads Bells 9; Quarry holds Bells 2 and the skulled Bells 4… */
    expect(chooseCpuCard(state, QUARRY_SIDE)).toEqual(skulled)
  })

  it('prefers dumping a skull over winning the trick', () => {
    const skulled = { suit: Suit.Bells, rank: 4 }
    const state = /* …player leads Bells 9; Quarry holds Bells 11 and the skulled Bells 4… */
    expect(chooseCpuCard(state, QUARRY_SIDE)).toEqual(skulled)
  })

  it('plays the lowest skulled loser when it holds several', () => {
    const state = /* …two skulled losers, ranks 2 and 4… */
    expect(chooseCpuCard(state, QUARRY_SIDE).rank).toBe(2)
  })

  it('falls back to the unchanged rule when no skulled card would lose', () => {
    const state = /* …no skulls in hand… */
    expect(chooseCpuCard(state, QUARRY_SIDE)).toEqual(/* the lowest winning card */)
  })

  it('leads unchanged — the lowest legal card, skull or not', () => {
    const state = /* …empty currentTrick, Quarry to lead, holding a skulled 2 and a clean 5… */
    expect(chooseCpuCard(state, QUARRY_SIDE).rank).toBe(2)
  })
})
```

Fill each `/* … */` with a concrete `RoundState` literal built from the file's existing fixture helper, carrying the new `skulledCards` / `bank` / `multiplier` / `lastResolution` fields. Also strip `declaration:` and `capturedCards:` from every pre-existing literal in this file.

- [ ] **Step 2: Run the spec and watch the new block fail**

Run: `npx vitest run src/warCouncil/__tests__/cpuPlayer.test.ts -t "AC12"`
Expected: non-zero exit; the five new tests fail on the current lowest-winner rule.

- [ ] **Step 3: Add the skull-dump branch to `chooseCpuCard`**

```ts
// Card selection only — always drawn from legalMoves()'s own output, so this can never produce
// an illegal card. Leading: the lowest legal card, unchanged. Following, in priority order:
//   1. AC12 — the lowest legal card that would LOSE the trick and carries a skull, so the player
//      is the one who wins it. Without this the mechanic is toothless and a play-test measures
//      nothing.
//   2. unchanged — the lowest legal card that would win.
//   3. unchanged — the lowest legal card at all.
// The LEAD is deliberately unchanged: DLR-80 names AC12 as the minimum CPU change, and avoiding
// a skulled lead is a second behaviour with its own feel consequences.
export function chooseCpuCard(state: RoundState, side: PlayerSide): Card {
  const legal = legalMoves(state, side)
  if (state.currentTrick.length === 0) {
    return lowestCard(legal)
  }
  const lead = state.currentTrick[0]
  const wouldWin = (card: Card) =>
    resolveTrickWinner([lead, { side, card }], state.trumpSuit) === side

  const skulledLosers = legal.filter(
    (card) => !wouldWin(card) && isSkulled(state.skulledCards, card),
  )
  if (skulledLosers.length > 0) {
    return lowestCard(skulledLosers)
  }

  const winners = legal.filter(wouldWin)
  return lowestCard(winners.length > 0 ? winners : legal)
}
```

Add `import { isSkulled } from './skulls'`.

- [ ] **Step 4: Run the CPU spec**

Run: `npx vitest run src/warCouncil/__tests__/cpuPlayer.test.ts`
Expected: exits 0, 0 failed.

### Task 8: Delete the retired engine modules and update the barrel

- Skill: react-frontend

**Files:**

- Delete: `src/warCouncil/declareHunt.ts`, `src/warCouncil/spoils.ts`, `src/warCouncil/scoring.ts`
- Delete: `src/warCouncil/__tests__/declareHunt.test.ts`, `src/warCouncil/__tests__/spoils.test.ts`, `src/warCouncil/__tests__/scoring.test.ts`, `src/warCouncil/__tests__/huntEnumeration.test.ts`
- Modify: `src/warCouncil/index.ts`

`huntEnumeration.test.ts` goes with them: it enumerates all fourteen 13-trick splits against the Standing bands, and neither the splits nor the bands exist any more. Its enumeration idea is worth keeping in mind for a future six-trick equivalent, but there is nothing here to port.

- [ ] **Step 1: Delete the seven files**

Run: `Remove-Item src\warCouncil\declareHunt.ts, src\warCouncil\spoils.ts, src\warCouncil\scoring.ts, src\warCouncil\__tests__\declareHunt.test.ts, src\warCouncil\__tests__\spoils.test.ts, src\warCouncil\__tests__\scoring.test.ts, src\warCouncil\__tests__\huntEnumeration.test.ts`
Expected: no output, exit 0.

- [ ] **Step 2: Rewrite `src/warCouncil/index.ts`**

```ts
export type { RoundState as WarCouncilState } from './types'

export {
  AbilityChoiceKind,
  ALL_SUITS,
  CardRank,
  currentTurn,
  IllegalMoveReason,
  otherSide,
  PlayerSide,
  RoundPhase,
  Suit,
} from './types'
export type { AbilityChoice, Card, PlayCardResult, RoundState, TrickCard } from './types'
export { containsCard, sameCard } from './cardUtils'
export { createDeck } from './deck'
export { shuffle } from './shuffle'
export { dealRound } from './deal'
export { legalMoves } from './legalMoves'
export { QUARRY_SIDE, monarchFollowApplies, monarchFollowSet } from './quarryRuleBreak'
export { resolveTrickWinner } from './resolveTrick'
export { playCard } from './playCard'
export { assignSkulls, isSkulled, skullableCards, suitShape, trickIsSkulled } from './skulls'
export type { SuitShape } from './skulls'
export { incomingFrom, isTaken, resolveTrickBank, TrickOutcome, trickOutcomeFor } from './bank'
export type { BankState, TrickResolution } from './bank'
export { chooseCpuMove, commitQuarryMove, quarryIntent, QuarryIntentStance } from './cpuPlayer'
export type { CpuMove, QuarryIntent } from './cpuPlayer'
```

- [ ] **Step 3: Confirm the retired engine names are gone from `src/warCouncil/`**

Run: `Get-ChildItem src\warCouncil -Recurse -Include *.ts | Select-String -Pattern "declareHunt|DeclareRejection|\bspoils\b|scoreHunt|huntDamage|pendingHuntDamage|duelSideDamage|HuntNotScorable|capturedCards|TRICKS_PER_ROUND|declaredPath"`
Expected: zero hits. `-Recurse -Include` rather than `-Path src\warCouncil\**` — the `-Path` form matches exactly one directory level and would silently miss `__tests__/`, which is the false green this check exists to avoid.

### Task 9: Strip and retune the `src/hunt/` module

- Skill: react-frontend

**Files:**

- Modify: `src/hunt/config.ts:1-203, 205-233`
- Modify: `src/hunt/types.ts:15-19, 42-53, 64-81`
- Modify: `src/hunt/encounter.ts`
- Modify: `src/hunt/index.ts`
- Test: `src/hunt/__tests__/config.test.ts`, `src/hunt/__tests__/encounter.test.ts`
- Config: `src/hunt/config.ts` — `PLAYER_START_HEALTH` 1350 → 25; `QUARRY_ENCOUNTER_HEALTH` → one placeholder entry (the value is a developer decision)

This is the config-and-shape task the plan's audit demands be atomic: the keys, their types, every consumer, and the fixtures change together, because a phase boundary in the middle of it leaves the app silently reading a value no rule authorises.

- [ ] **Step 1: Delete the retired config surface**

From `src/hunt/config.ts`, delete: `StandingBandName`, `StandingBand`, `HUNT_MULTIPLIER_TABLES`, `standingTableFor`, `resolveStanding`, `cardBaseValue`, `RANK_INVERSION_PIVOT`, `invertedCardValue`, `PaidPile`, `CardValueScheme`, `CARD_VALUE_SCHEMES`, `cardValueSchemeFor`, `cardValueFor`, `DamageRounding`, `DAMAGE_ROUNDING`, `roundDamage` — and the `HuntDeclaration` import. Keep `FORAGE_BUDGET_PER_ENCOUNTER`, `ENCOUNTERS_PER_RUN`, `TelegraphFidelity`, `TELEGRAPH_FIDELITY`, `SLICE_QUARRY_CHARACTER`, `ENCOUNTER_PLAYER_RESTORE`, `SIMULTANEOUS_DEPLETION_WINNER`, `quarryHealthForEncounter` and Task 1's four new keys.

- [ ] **Step 2: Replace both health constants**

```ts
// §5 "Player health" — DECIDED, and small on purpose: Balatro tracks 4 hands and 3 discards as
// integers held in the head against score requirements in the hundreds and thousands, and §5
// says the asymmetry here is the same shape. At 2-4 health lost a hand, 25 is roughly eight
// hands. Replaces DLR-66's 1,350, which belonged to the retired Standing arithmetic.
// UNIT: health points, depleted 1 at a time.
export const PLAYER_START_HEALTH: Health = 25

// PLACEHOLDER — THE DEVELOPER'S TO SET, from the first play session and not from this file.
// §5 states CPU health "cannot be derived honestly yet": it depends on how large real cash-outs
// get, which is a function of play rather than arithmetic. DLR-80's Dependencies & Risks
// authorises a plainly-labelled placeholder and forbids inventing the real figure.
// The anchor behind 1000, stated so it can be argued with rather than trusted: 25 player health
// is roughly eight hands; §3.3's worked hand deals 173 but wins five of six tricks, and a hand
// that trades evenly deals perhaps a third of that. Eight hands at ~125 is ~1,000.
// One entry, not two: the second encounter is out of scope for DLR-80.
// UNIT: health points, encounter 0.
export const QUARRY_ENCOUNTER_HEALTH: readonly Health[] = [1000]
```

- [ ] **Step 3: Strip `src/hunt/types.ts` and rename the encounter counter**

Delete `Spoils`, `Standing` and `HuntDeclaration`; rewrite the `Hunt` docblock so it no longer says "13-trick round" or "card value × Standing". In `EncounterState`, rename `huntsApplied` to `damageEventsApplied` with the docblock: *"How many damage events have been applied. Damage now lands several times a hand (AC6, AC8), so a Hunt-shaped counter would be wrong on its face. NOT a cap."*

- [ ] **Step 4: Rename `applyHunt` to `applyDamage` in `src/hunt/encounter.ts`**

Rename the export and update its docblock to describe one damage event rather than one finished Hunt; update the `RangeError` message from "Cannot apply a Hunt to an encounter already resolved" to "Cannot apply damage to an encounter already resolved"; update `huntsApplied` to `damageEventsApplied` at both the seed (line 39) and the increment (line 72). `startEncounter`, `isEncounterResolved`, `deplete`, `resolveWinner` and `assertApplicable` are unchanged — the single clamp point, the tie ruling and the NaN guard all survive verbatim.

- [ ] **Step 5: Rewrite `src/hunt/index.ts`**

```ts
export type { Hunt, Quarry, Damage, Health, IncomingDamage, EncounterState } from './types'
export { QuarryCharacter, DuelSide } from './types'

export {
  HAND_SIZE,
  SKULL_DENSITY,
  SKULL_MIN_RANK,
  DAMAGE_PER_HIT,
  FORAGE_BUDGET_PER_ENCOUNTER,
  ENCOUNTERS_PER_RUN,
  TelegraphFidelity,
  TELEGRAPH_FIDELITY,
  SLICE_QUARRY_CHARACTER,
  PLAYER_START_HEALTH,
  QUARRY_ENCOUNTER_HEALTH,
  quarryHealthForEncounter,
  ENCOUNTER_PLAYER_RESTORE,
  SIMULTANEOUS_DEPLETION_WINNER,
} from './config'

export { startEncounter, applyDamage, isEncounterResolved } from './encounter'

export type { QuarryCharacterInfo } from './quarryCharacters'
export { QUARRY_CHARACTERS, quarryCharacterInfo } from './quarryCharacters'
```

- [ ] **Step 6: Rewrite both `src/hunt/` specs**

In `src/hunt/__tests__/config.test.ts`, delete every describe block covering the Standing tables, the complementarity property, the card-value schemes, rank inversion and rounding; keep Task 1's block; add:

```ts
it('starts the player at twenty-five', () => {
  expect(PLAYER_START_HEALTH).toBe(25)
})

it('configures exactly one encounter', () => {
  expect(QUARRY_ENCOUNTER_HEALTH).toHaveLength(1)
  expect(() => quarryHealthForEncounter(1)).toThrow(RangeError)
})
```

In `src/hunt/__tests__/encounter.test.ts`, rename every `applyHunt` call to `applyDamage` and every `huntsApplied` read to `damageEventsApplied`; replace the hard-coded `1350`-scale figures with values derived from `PLAYER_START_HEALTH` and `QUARRY_ENCOUNTER_HEALTH[0]` so the spec does not re-break the next time the placeholder moves. Add:

```ts
it('resolves the moment a bar empties, even on a single event', () => {
  const start = startEncounter(0)
  const end = applyDamage(start, {
    [DuelSide.Player]: 0,
    [DuelSide.Quarry]: QUARRY_ENCOUNTER_HEALTH[0],
  })
  expect(isEncounterResolved(end)).toBe(true)
  expect(end.winner).toBe(DuelSide.Player)
  expect(end.damageEventsApplied).toBe(1)
})
```

- [ ] **Step 7: Run both hunt specs**

Run: `npx vitest run src/hunt/__tests__/config.test.ts src/hunt/__tests__/encounter.test.ts`
Expected: exits 0, 0 failed.

### Task 10: Sweep the remaining engine specs

- Skill: react-frontend

**Files:**

- Test: `src/warCouncil/__tests__/abilities.test.ts`, `src/warCouncil/__tests__/legalMoves.test.ts`, `src/warCouncil/__tests__/legalMovesQuarry.test.ts`, `src/warCouncil/__tests__/quarryRuleBreak.test.ts`, `src/warCouncil/__tests__/quarryIntent.test.ts`, `src/warCouncil/__tests__/types.test.ts`

Each of these builds `RoundState` literals that no longer type-check. None of them tests a rule this ticket changes — follow-suit, the Monarch rule-break, the telegraph and the turn helpers are all unchanged — so this is a mechanical fixture sweep, not a behaviour rewrite.

- [ ] **Step 1: Update every hand-built `RoundState` literal**

In each file: delete `declaration:` and `capturedCards:` fields; add `skulledCards: []`, `bank: 0`, `multiplier: 0`, `lastResolution: null`. Delete `src/warCouncil/__tests__/types.test.ts`'s `declaredPath` describe block entirely — the function is gone. In `quarryIntent.test.ts`, delete any assertion that depends on a declaration being present.

- [ ] **Step 2: Run the whole engine project**

Run: `npx vitest run --project node`
Expected: exits 0, 0 failed. This collects every `.test.ts` under `src/`, which at this point is the whole engine plus `src/hunt/` and `src/app/dealerForRound.test.ts`.

### Task 11: Update the shared app fixture — `roundFixture.ts`

- Skill: react-frontend

**Files:**

- Test: `src/app/warCouncil/__tests__/roundFixture.ts`

Every component spec builds its state from this file, so it changes once, here, before the components that read it.

- [ ] **Step 1: Reshape the fixture**

Drop `declaration` and `capturedCards` from the base `RoundState`; add `skulledCards: []`, `bank: 0`, `multiplier: 0`, `lastResolution: null`. Add two helpers the new component specs need:

```ts
/** A state mid-streak, for the bank readout. */
export function bankedRound(bank: number, multiplier: number): WarCouncilState

/** A state whose Quarry holds a known shape with known skulls, for the shape readout. */
export function skulledRound(skulls: readonly Card[]): WarCouncilState
```

- [ ] **Step 2: Confirm the fixture compiles against the new state shape**

Run: `npm run typecheck`
Expected: errors remain only in `src/app/warCouncil/*.tsx`, `roundReducer.ts`, `labels.ts` and `App.tsx` — the files Tasks 12-16 rewrite. Zero errors reported inside `roundFixture.ts` itself.

### Task 12: Give the reducer the encounter — `src/app/warCouncil/roundReducer.ts` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/roundReducer.ts`
- Test: `src/app/warCouncil/__tests__/roundReducer.test.ts`

- [x] **Step 1: Reshape the state, the seed and the action union**

```ts
export interface ResolvedTrick {
  readonly cards: readonly TrickCard[] // [lead, follow] — the engine's load-bearing order
  readonly winner: PlayerSide
  /** What the trick did to the bank, the streak and both bars. */
  readonly resolution: TrickResolution
}

export interface RoundUiState {
  readonly round: WarCouncilState
  readonly armed: Card | null
  readonly prompt: Card | null
  readonly resolvedTrick: ResolvedTrick | null
  readonly rejection: IllegalMoveReason | null
  readonly cpuFault: CpuFault | null
  /** The live encounter. Never null: seeded from the mount's prop and updated in place as each
   *  trick resolves, because AC6 and AC8 make the cash-out automatic and mid-hand. Replaces the
   *  nullable `applied`, which existed only to model "the player has pressed Apply". */
  readonly encounter: EncounterState
}

export interface RoundUiSeed {
  readonly round: WarCouncilState
  readonly encounter: EncounterState
}

export const RoundUiActionKind = {
  TapCard: 'tapCard',
  ChooseAbility: 'chooseAbility',
  CancelSelection: 'cancelSelection',
  CarryOn: 'carryOn',
} as const

/** Still a pure restructuring of its seed, so StrictMode's double-invocation of the lazy
 *  `useReducer` initialiser recomputes an identical value. */
export function createRoundUiState(seed: RoundUiSeed): RoundUiState {
  return {
    round: seed.round,
    armed: null,
    prompt: null,
    resolvedTrick: null,
    rejection: null,
    cpuFault: null,
    encounter: seed.encounter,
  }
}
```

Delete the `Declare` and `CommitDamage` action variants, `handleDeclare`, `handleCommitDamage`, and the `declareHunt` / `applyHunt` / `HuntDeclaration` imports.

- [x] **Step 2: Apply damage where the trick resolves**

Add one helper, and call it from both places a trick can complete (`commit`'s own resolution and `advanceQuarryFollow`'s):

```ts
/**
 * AC6/AC8 — one trick's damage, applied once, as it happens.
 *
 * Skips `applyDamage` entirely when the trick neither cashed nor hit: an all-zero event would
 * bump `damageEventsApplied` for nothing. Guards `isEncounterResolved` rather than catching the
 * `RangeError` it would otherwise throw — a throw inside a reducer during an event handler
 * unmounts the tree.
 */
function applyResolution(encounter: EncounterState, resolution: TrickResolution): EncounterState {
  if (isEncounterResolved(encounter)) return encounter
  if (resolution.cashOut === 0 && resolution.damageToPlayer === 0) return encounter
  return applyDamage(encounter, incomingFrom(resolution))
}
```

`deriveResolvedTrick` reads `after.lastResolution` for the `resolution` field and returns `null` when it is `null` — the engine has already decided both the winner and the outcome, so the reducer stops re-deriving the winner from a `tricksWon` diff.

- [x] **Step 3: Stop play when the encounter resolves**

`canAct` gains `!isEncounterResolved(state.encounter)`, and `handleCarryOn` returns the cleared state without committing a Quarry lead once the encounter has resolved. Without this the player keeps tapping into a fight that is already over, and `applyDamage` would refuse the next event.

- [x] **Step 4: Rewrite `src/app/warCouncil/__tests__/roundReducer.test.ts`**

Delete the `Declare` and `CommitDamage` describe blocks. Update `createRoundUiState` calls to the seed object. Add:

```ts
it('cashes the bank into the Quarry the moment a clean trick is lost', () => { /* … */ })
it('leaves both bars alone on a trick that neither cashed nor hit', () => { /* … */ })
it('stops accepting taps once a cash-out empties the Quarry’s bar mid-hand', () => { /* … */ })
it('carries the streak across tricks and resets it on damage', () => { /* … */ })
```

`carries the streak across tricks and resets it on damage`'s fixture originally sent Keys 3 to the Quarry — rank 3 is `CardRank.Fox`, and the Quarry is forced to play it as its only Keys card in trick 2, which resolves the Fox's ability (`chooseCpuMove` never leaves it unanswered) and silently swaps trump to Moons and the Quarry's last card to the decree, corrupting trick 3's matchup. Fixed by giving the Quarry Keys 6 instead — no ability, same forced-follow shape, trick 2 stays a plain clean win. Diagnosed and confirmed against `resolveTrickWinner`, `resolveTrickBank`, and `applyFoxExchange`, all of which behave correctly per their own passing specs; the fixture was the defect, not production code.

**File-size correction (found at the Task 16 gate, fixed here):** the rewritten file measured 428 lines (`(Get-Content <path>).Count`) — over the 400-line budget. Split at Task 16 Step 4's own verification pass: the four `the bank cash-out` tests, and the `tap`/`carryOn`/`uiFrom` helpers they need, moved to a new sibling `src/app/warCouncil/__tests__/roundReducer.bank.test.ts` (160 lines), duplicating the small helpers rather than importing them — the same "carved into its own file", duplicate-rather-than-import pattern `WarCouncilRound.duelHealthBars.test.tsx` already uses. `roundReducer.test.ts` itself is 308 lines afterward. All 23 tests (both files combined) still pass.

- [x] **Step 5: Run the reducer spec**

Run: `npx vitest run src/app/warCouncil/__tests__/roundReducer.test.ts`
Expected: exits 0, 0 failed.
Result: `Tests  23 passed (23)` before the file-size split; after the split, `npx vitest run src/app/warCouncil/__tests__/roundReducer.test.ts src/app/warCouncil/__tests__/roundReducer.bank.test.ts` — `Tests  23 passed (23)` across both files.

### Task 13: Rewire the mount — `WarCouncilRound.tsx`, `warCouncilMount.ts`, `App.tsx` ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/WarCouncilRound.tsx:1-303`
- Modify: `src/app/warCouncilMount.ts:6-24`
- Modify: `src/App.tsx:1-69`

- [x] **Step 1: Strip the retired reads from `WarCouncilRound.tsx`**

Delete: the `NO_PENDING` constant, the `pendingHuntDamage` call and the `dealt` record, the `duelSideDamage` / `applyHunt` projection, the `standingTableFor` / `resolveStanding` / `declaredPath` band derivation, the `DeclareGate` branch and its import, the `HuntLedger` mount and its import, `handleApply`, and every `ui.round.declaration !== undefined` term in `interactive` and `quarryToLead`.

- [x] **Step 2: Derive the new values**

```ts
  const [ui, dispatch] = useReducer(roundReducer, { round: initialState, encounter }, createRoundUiState)

  const encounterOver = isEncounterResolved(ui.encounter)
  const roundComplete = ui.round.phase === RoundPhase.Complete
  const interactive =
    !roundComplete &&
    !encounterOver &&
    ui.resolvedTrick === null &&
    ui.prompt === null &&
    ui.cpuFault === null &&
    currentTurn(ui.round) === PlayerSide.Player

  // Both bars read straight off the reducer's own encounter — there is no projection any more,
  // because damage has already landed by the time this renders. The pending segment retired with
  // `pendingHuntDamage`: it was the non-monotonic figure the redesign exists to remove.
  const bars = duelHealthBars(ui.encounter.health, ui.encounter.health, maxHealth)

  const shape = suitShape(ui.round.hands[PlayerSide.Cpu], ui.round.skulledCards)
```

The felt's branch order becomes: encounter over → terminal panel; `cpuFault` → the fault notice; `resolvedTrick` → `TrickWell` holding the reveal; `roundComplete` → `RoundOverPanel`; `prompt` → `AbilityPrompt`; otherwise `TrickWell`. `deriveHint` loses its `'Declare Win or Lose'` first line.

`encounterOver` is checked ahead of `resolvedTrick` (matching `mockup.html`'s own `render()`, which checks `S.terminal` before `S.resolved`): the trick that finishes the encounter never gets its own reveal beat, the terminal panel is what the player sees next. `handleCarryOn` checks `encounterOver` first and unconditionally for the same reason — otherwise the terminal panel's single control would need two taps the first time (one to clear a reveal the felt no longer shows, one to actually report the finished hand). `shape` (AC11) is consumed immediately via `quarryShapeText` (Task 14) in a `.wc-sr-only` paragraph beside the dossier — the visible per-suit rows are Phase 3's, but the accessible sentence exists now rather than only once the visual lands.

- [x] **Step 3: Correct `warCouncilMount.ts`'s docblocks**

`encounter` is now *"the encounter this hand starts from — the reducer owns it thereafter and applies each trick's damage as it lands"*, and `WarCouncilRoundResult.encounter` is *"the encounter after every damage event this hand produced"*. Neither type changes; both docblocks currently assert damage lands at trick 13, which is false.

- [x] **Step 4: Simplify `App.tsx`**

`SLICE_ENCOUNTER_INDEX` stays `0` and keeps its comment, minus the retired "not a multiplier, band boundary, health total or rounding rule" clause. `MAX_HEALTH` is unchanged in shape — it reads `PLAYER_START_HEALTH` and `quarryHealthForEncounter(0)`, both of which now return the new figures with no edit here. `handleComplete` is unchanged: it already stops dealing when `isEncounterResolved(result.encounter)`.

- [ ] **Step 5: Typecheck the app tree**

Run: `npm run typecheck`
Expected: errors remain only in `labels.ts`, `RoundOverPanel.tsx`, `RoundStatusBand.tsx` and the deleted components' specs — the files Tasks 14-16 handle.
Deferred to the Task 16 Step 4 gate per the Implementer's phase-end verification policy — confirmed there.

### Task 14: Rewrite the copy and the panels ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/labels.ts:1-135`
- Modify: `src/app/warCouncil/RoundOverPanel.tsx:1-163`
- Modify: `src/app/warCouncil/RoundStatusBand.tsx:33`
- Test: `src/app/warCouncil/__tests__/labels.test.ts`, `src/app/warCouncil/__tests__/RoundOverPanel.test.tsx`

- [x] **Step 1: Rewrite `labels.ts`**

Delete `STANDING_BAND_NAME`, `STANDING_TRACK_LABEL`, `HUNT_DECLARATION_NAME`, `DECLARE_REJECTION_MESSAGE`, `APPLY_DAMAGE_LABEL`, the `HuntNotDeclared` key of `ILLEGAL_MOVE_MESSAGE`, and the `DeclareRejection` / `HuntDeclaration` / `StandingBandName` imports. Rewrite `healthBarValueText` to drop its `pending` branch — the view carries no pending figure now. Add:

```ts
/** The four outcomes as the player is told them (§3.2). Placeholder copy: the wording is the
 *  developer's. */
export const TRICK_OUTCOME_MESSAGE: Readonly<Record<TrickOutcome, string>> = {
  [TrickOutcome.CleanWin]: 'Clean trick, taken. Both cards banked.',
  [TrickOutcome.Dodge]: 'Skull dodged. Both cards banked.',
  [TrickOutcome.CleanLoss]: 'Clean trick lost. 1 damage — the bank cashes.',
  [TrickOutcome.SkullWin]: 'You ate the skull. 1 damage — the bank cashes.',
}

export const SKULL_MARK_LABEL = 'Skull'
export const BANK_LABEL = 'Bank'
export const MULTIPLIER_LABEL = 'Streak'
export const HAND_OVER_LABEL = 'Deal the next hand'
export const QUARRY_SHAPE_LABEL = 'What the Quarry holds'

/** One sentence for a reader who cannot see the shape rows (AC11) — never a rank. */
export function quarryShapeText(shape: readonly SuitShape[]): string
```

`HEALTH_BAR_LABEL`, `ENCOUNTER_OUTCOME`, `FINISH_ROUND_LABEL`, `SUIT_NAME`, `RANK_NAME`, `cardAccessibleName`, `cardKey`, `STANCE_PHRASE` and `intentAccessibleName` all survive; `cardAccessibleName` gains a skulled suffix so a skulled card announces itself.

`cardAccessibleName`'s new `skulled` parameter defaults to `false` — every existing call site (`TrickWell.tsx`, `HandFan.tsx`, `AbilityPrompt.tsx`, `WarCouncilRound.tsx`'s own hint) keeps compiling unchanged; a Phase-3 caller that knows a displayed card is skulled passes it explicitly. `healthBarValueText` keeps its `lethal` branch (unaffected by the pending removal) and drops the "at risk"/"Nothing at risk yet" wording, since `pending` is now always `0` — the reducer already applies damage before this ever renders.

- [x] **Step 2: Rewrite `RoundOverPanel.tsx` as the hand-over panel**

Drop `SideEquation` and the whole `Spoils × Standing = Damage` block, the `HuntDamage` prop, and the two-stage `applied` / `onApply` control. New props: `tricksWon`, `handSummary` (health lost this hand, dealt to the Quarry this hand), `winner: DuelSide | null`, `onFinish`. Renders the tally, then either `ENCOUNTER_OUTCOME[winner]` or the single `FINISH_ROUND_LABEL` control. Layout per `mockup.html`'s hand-over panel.

The tally keeps the existing `.wc-tally` table markup (already styled, and named a survivor by the plan's CSS audit) rather than the mockup's `<dl>` — Task 14's own Files block carries no stylesheet, so the panel is built from classes the project already has: `.wc-over`, `.wc-tally`, `.wc-actions`, `.wc-decline`, `.wc-terminal`. `handSummary`'s two figures (`healthLost`, `dealtToQuarry`) are computed by the mount (`WarCouncilRound.tsx`, Task 13) as the delta against the encounter the hand started from — this component only formats them.

- [x] **Step 3: Read the trick number from config in `RoundStatusBand.tsx`**

```ts
  const trickNumber = Math.min(tricksPlayed + (roundComplete ? 0 : 1), HAND_SIZE)
```

Add `import { HAND_SIZE } from '../../hunt'`. This is the one hard-coded tunable the plan's audit found inside a component.

The band's own docblock referenced "trick 14" and a `HuntLedger` mount that no longer exists — both corrected in the same edit, since a stale comment in a file this task is already touching is worth fixing rather than leaving to mislead the next reader.

- [x] **Step 4: Update both specs**

Rewrite `RoundOverPanel.test.tsx` against the new props, querying by role and label. In `labels.test.ts`, delete the Standing and declaration describe blocks and add coverage of `TRICK_OUTCOME_MESSAGE`'s totality and `quarryShapeText` naming no rank.

- [x] **Step 5: Run both specs**

Run: `npx vitest run src/app/warCouncil/__tests__/labels.test.ts src/app/warCouncil/__tests__/RoundOverPanel.test.tsx`
Expected: exits 0, 0 failed.
Result: `Tests  24 passed (24)`.

### Task 15: Delete the retired UI and its stylesheets

- Skill: react-frontend

**Files:**

- Delete: `src/app/warCouncil/DeclareGate.tsx`, `src/app/warCouncil/HuntLedger.tsx`, `src/app/warCouncil/StandingTrack.tsx`, `src/app/warCouncil/standingSegments.ts`
- Delete: `src/app/warCouncil/__tests__/DeclareGate.test.tsx`, `src/app/warCouncil/__tests__/HuntLedger.test.tsx`, `src/app/warCouncil/__tests__/StandingTrack.test.tsx`, `src/app/warCouncil/__tests__/standingSegments.test.ts`
- Delete: `src/app/warCouncil/warCouncilDeclare.css`, `src/app/warCouncil/warCouncilStandingTrack.css`
- Modify: `src/app/warCouncil/warCouncilHunt.css`, `src/app/warCouncil/warCouncilCards.css`, `src/app/warCouncil/warCouncil.css`

- [x] **Step 1: Delete the ten files**

Run: `Remove-Item src\app\warCouncil\DeclareGate.tsx, src\app\warCouncil\HuntLedger.tsx, src\app\warCouncil\StandingTrack.tsx, src\app\warCouncil\standingSegments.ts, src\app\warCouncil\__tests__\DeclareGate.test.tsx, src\app\warCouncil\__tests__\HuntLedger.test.tsx, src\app\warCouncil\__tests__\StandingTrack.test.tsx, src\app\warCouncil\__tests__\standingSegments.test.ts, src\app\warCouncil\warCouncilDeclare.css, src\app\warCouncil\warCouncilStandingTrack.css`
Expected: no output, exit 0.
Result: no output, exit 0.

- [x] **Step 2: Re-home `.wc-sr-only` before it disappears**

`.wc-sr-only` was defined only in `warCouncilStandingTrack.css:140` and used only by `StandingTrack.tsx` — deleting the pair takes the project's sole screen-reader-only utility with it. Move the rule verbatim into `src/app/warCouncil/warCouncil.css`, beside the shell rules, so the new readouts can use it. A class that binds by string and resolves to nothing fails silently and is invisible to the compiler.

- [x] **Step 3: Prune the two surviving stylesheets**

From `warCouncilHunt.css`, delete every `.wc-ledger*` (4 selectors), `.wc-equation*` (5), `.wc-side*` (3) and `.wc-verdict-detail` rule. From `warCouncilCards.css`, delete `.wc-declare-option`. Leave `.wc-over`, `.wc-tally`, `.wc-decline`, `.wc-dossier*` and `.wc-telegraph*` in place — the hand-over panel and the dossier column still use them.

Also corrected three stale comments the deletions left behind, each caught by Step 5's own audit grep rather than by any task's Files list: `duelHealthBars.ts`'s docblock named the deleted `standingSegments`; my own new `.wc-sr-only` comment in `warCouncil.css` (Step 2) named the file it was re-homed FROM, which is exactly the string the audit forbids; and `warCouncilHealthBars.css`'s header cited `warCouncilStandingTrack.css` by name for its narrow-viewport breakpoint duplication. All three were reworded to keep their point without the literal deleted name — none of the three files is in any task's `**Files:**` block, but the audit's own zero-hits gate (Step 5) requires it, and the fix is prose-only, not logic.

- [x] **Step 4: Drop the two deleted stylesheet imports from `WarCouncilRound.tsx`**

Remove `import './warCouncilDeclare.css'` and `import './warCouncilStandingTrack.css'` (lines 51-52). A Vite build fails loudly on a missing CSS import, so leaving one is not a silent failure — but it is a broken build in the Final verification phase rather than here.

- [x] **Step 5: Confirm no reference to a deleted component or class survives**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "DeclareGate|HuntLedger|StandingTrack|standingSegments|wc-declare|wc-track|wc-ledger|wc-equation|wc-verdict-detail|warCouncilDeclare|warCouncilStandingTrack"`
Expected: zero hits.
Result: zero hits — confirmed after Task 16 rewrote `WarCouncilRound.test.tsx`'s own comment, the last surviving reference (to the deleted `DeclareGate.test.tsx`).

### Task 16: Sweep the remaining app specs ✓ — PHASE 2 GATE GREEN

- Skill: react-frontend

**Files:**

- Test: `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`, `src/app/warCouncil/__tests__/WarCouncilRound.duelHealthBars.test.tsx`, `src/app/warCouncil/__tests__/duelHealthBars.test.ts`, `src/app/warCouncil/__tests__/TrickWell.test.tsx`, `src/app/warCouncil/__tests__/HandFan.test.tsx`, `src/app/warCouncil/__tests__/AbilityPrompt.test.tsx`, `src/app/warCouncil/__tests__/QuarryDossier.test.tsx`, `src/app/warCouncil/__tests__/IntentTelegraph.test.tsx`, `src/app/warCouncil/__tests__/intentPreview.test.ts`
- Also touched, not in this list — see Notes: `src/app/warCouncil/__tests__/DuelHealthBars.test.tsx` (the component spec, distinct from `duelHealthBars.test.ts`'s pure-function spec — a real file this list omitted), `src/warCouncil/playCard.ts` and `src/warCouncil/abilities.ts` (temporary debug instrumentation added and removed during Task 12's diagnosis, net no change), `src/app/warCouncil/duelHealthBars.ts` and `src/app/warCouncil/warCouncilHealthBars.css` (one-line stale-comment fixes required by Task 15 Step 5's own zero-hits grep), `src/app/warCouncil/__tests__/roundReducer.bank.test.ts` (newly created — Task 12's own test file measured over the 400-line budget at this gate; see the note under Task 12 Step 4).

- [x] **Step 1: Rewrite the health-bar specs against the new totals**

`duelHealthBars.test.ts` and `WarCouncilRound.duelHealthBars.test.tsx` assert percentages against 1,350. Rewrite every figure to derive from `PLAYER_START_HEALTH` and `QUARRY_ENCOUNTER_HEALTH[0]` rather than restating a literal, so the specs survive the developer setting the real Quarry figure. Delete every assertion about the pending segment — no pending figure exists.

Also rewrote `DuelHealthBars.test.tsx` (the component spec — see the Files note above) on the same grounds: it asserted the same 1,350 literal and the same retired "at risk"/"Lethal this Hunt" copy Task 14 rewrote. Its lethal-pending and shrinking-pending-segment scenarios were dropped for the same reason `duelHealthBars.test.ts`'s were — this app never calls either function with `current !== projected` any more — except the CSS-custom-property mechanics test, kept because it pins plumbing (`--w` vs inline `width`) unrelated to the pending concept, with its expected percentage now read off the function's own return value rather than a restated literal.

- [x] **Step 2: Rewrite `WarCouncilRound.test.tsx`**

Delete the declare-gate flow, the Apply-the-damage two-stage assertions and the `huntsApplied` read. Add an end-to-end pass that plays a full six-trick hand and asserts: six tricks resolve, the bank readout climbs on a taken trick, a hit moves the player's bar by exactly 1, and `onComplete` fires once with the encounter carrying every event.

No bank-readout widget exists yet — Phase 3 owns it — so "the bank readout climbs on a taken trick" is exercised by its own observable consequence instead: a taken trick leaves both health bars untouched (own test), contrasted with a lost trick moving the player's bar by exactly `DAMAGE_PER_HIT` and cashing the bank into the Quarry (own test). The full six-trick pass (six tricks resolve; `onComplete` fires once with the encounter carrying every damage event) was written into `WarCouncilRound.duelHealthBars.test.tsx` instead of here — the driving-loop apparatus it needs pushed this file to 404 lines, one over budget, and that file was carved out for exactly this kind of apparatus on DLR-71. See Developer Decisions in the Implementer Report re: the missing bank readout.

- [x] **Step 3: Update the remaining component specs for the fixture change**

The other six specs only need `roundFixture`'s new shape, which Task 11 already provides — check each for a stray inline `RoundState` literal and update it.

Two needed a real fix rather than a pure fixture-shape check: `intentPreview.test.ts` still built its fixtures with the retired `declaration` field and imported the deleted `HuntDeclaration`; `TrickWell.test.tsx`'s hand-built `ResolvedTrick` fixture predated Task 12's reshape and was missing the now-required `resolution` field entirely (a compile error, not a runtime one). The other four (`HandFan`, `AbilityPrompt`, `QuarryDossier`, `IntentTelegraph`) needed no change — none touches `RoundState`.

- [x] **Step 4: Run both Vitest projects separately, then the phase gate**

Run: `npx vitest run --project node; npx vitest run --project dom; npm run typecheck; npm run lint`
Expected: all four exit 0; Vitest reports 0 failed in both projects. Running the projects separately first also warms the Vite transform cache, which is what stops a cold `npm test` reporting a `[vitest-pool-runner]` worker-start timeout that is infrastructure rather than a failing test.
Result: `node` project — `Tests  419 passed (419)`. `dom` project — `Tests  52 passed (52)`. `npm run typecheck` — exit 0, no output. `npm run lint` — exit 0, no output (0 warnings).

---

## Phase 3 — The new readouts

With the engine and the screen coherent again, this phase adds what makes the new rules legible: the per-suit shape readout (AC11), the bank and streak meter, and the skull mark on a face-up card (AC3). Every component here formats what it is handed and computes nothing. Layout follows `mockup.html`; the sizes, the glyph and the colours in it are placeholders the developer owns.

### Task 17: Put the suit on the card face and the skull on a mined card ✓

- Skill: react-frontend

**Files:**

- Modify: `src/app/warCouncil/PlayingCard.tsx`
- Modify: `src/app/warCouncil/TrickWell.tsx` — pass `skulled` through to the played cards
- Modify: `src/app/warCouncil/warCouncilCards.css`
- Test: `src/app/warCouncil/__tests__/PlayingCard.test.tsx` (create alongside, if the file does not exist)

- [x] **Step 1: Add the `skulled` prop and re-lay the face**

Add `readonly skulled?: boolean` to `PlayingCardProps`. Render the existing `SuitMark` centred and large rather than as a corner mark, move the rank to the top-left, and add the skull glyph top-right when `skulled` is true. The accessible name comes from `cardAccessibleName`, which Task 14 extended with the skulled suffix — the skull must be in the accessible name, not only in the glyph.

Done as written. `PlayingCardProps` gained `skulled?: boolean` (default `false`); `cardAccessibleName(card, skulled)` now carries the ", skulled" suffix into `aria-label`, and a `wc-skull-mark` glyph renders top-right when true (marked `aria-hidden` since the accessible name already carries it — no double announcement). `TrickWell.tsx` gained an optional `skulledCards?: readonly Card[]` prop (default `[]`, same defaulting pattern as `cardAccessibleName`'s own `skulled` parameter) and now computes `isSkulled(skulledCards, card)` for both the resolved-trick reveal and an in-progress led card. Wiring the real `ui.round.skulledCards` value through from `WarCouncilRound.tsx` happens in Task 20, where that file is already in scope.

- [x] **Step 2: Restyle the card in `warCouncilCards.css`**

Per `mockup.html`: the card's border takes the suit's colour through a `--wc-suit` custom property set by the `wc-suit-<suit>` class, and the centred `SuitMark` reads the same property. The suit therefore reads twice — symbol and edge — so it never depends on colour alone, which is `game-ux`'s state-without-colour rule. The border weight, the symbol's proportion of the card, and the glyph are the developer's to retune.

Done as written. The `.wc-card.wc-suit-*` rules now set `--wc-suit` instead of `color`; `.wc-card`'s border reads `var(--wc-suit, var(--wc-ink-soft))`; `.wc-card-suit` moved from a bottom-left corner index to centred/large (`translate(-50%, -50%)`, 56% of the card's width) and reads `color: var(--wc-suit, ...)` directly. Added `.wc-card .wc-skull-mark` (a dark disc under a light glyph, top-right) — sized/positioned as the developer's placeholder per the mockup's own note.

- [x] **Step 3: Write the component spec**

```tsx
it('names a skulled card as skulled', () => { /* getByRole('button', { name: /skulled/i }) */ })
it('does not call a clean card skulled', () => { /* … */ })
it('renders the suit mark for every suit', () => { /* … */ })
```

Done as written — `src/app/warCouncil/__tests__/PlayingCard.test.tsx` created with these three specs (the third checks `container.querySelector('.wc-suit-<suit> .wc-card-suit')` for every `ALL_SUITS` member).

- [x] **Step 4: Run the card specs**

Run: `npx vitest run src/app/warCouncil/__tests__/PlayingCard.test.tsx src/app/warCouncil/__tests__/TrickWell.test.tsx`
Expected: exits 0, 0 failed.
Result: deferred into the Phase 3 end-of-phase block (see Task 20 Step 4) — both files ran clean as part of `npx vitest run --project dom` (`Tests  62 passed (62)`).

### Task 18: Build the shape readout — `QuarryShape.tsx` ✓

- Skill: react-frontend, game-ux

**Files:**

- Create: `src/app/warCouncil/QuarryShape.tsx`
- Test: `src/app/warCouncil/__tests__/QuarryShape.test.tsx`
- Modify: `src/app/warCouncil/warCouncilHunt.css` — add `.wc-shape*`

- [x] **Step 1: Write the failing spec**

```tsx
it('reports cards held and skulls per suit', () => {
  render(<QuarryShape shape={[{ suit: Suit.Bells, held: 3, skulled: 1 }, /* … */]} />)
  expect(screen.getByLabelText(/Bells: 3 held, 1 skulled/i)).toBeTruthy()
})

it('never renders a rank', () => {
  const { container } = render(<QuarryShape shape={/* … */} />)
  expect(container.textContent).not.toMatch(/\b(7|9|11)\b/)
})

it('shows a suit the Quarry has been stripped of as zero', () => { /* … */ })
```

Done as written — `src/app/warCouncil/__tests__/QuarryShape.test.tsx` created with these three specs, each `/* … */` filled with a full three-suit `SuitShape[]` fixture built directly (the module has no dealt-hand fixture at this shape, so the array is written by hand, matching `SuitShape`'s own type).

- [x] **Step 2: Run the spec and watch it fail to collect**

Run: `npx vitest run src/app/warCouncil/__tests__/QuarryShape.test.tsx`
Expected: non-zero exit, `Cannot find module '../QuarryShape'`.
Result: the red/green pair collapsed into the Phase 3 end-of-phase run per the batching policy — the component was written directly at Step 3, and the spec passed clean in the same `--project dom` run (see Task 20 Step 4).

- [x] **Step 3: Write the component**

One row per suit: the suit mark, the held count, and one skull glyph per skulled card. Each row carries an `aria-label` from `quarryShapeText`'s per-suit form. Skulls are drawn as repeated glyphs rather than a number, so "two skulls in Bells" reads at a glance without counting a digit — and the count is at most six, so repetition is bounded. Computes nothing: it renders the `SuitShape[]` it is handed.

Done as written, with one clarification: `quarryShapeText` (in `labels.ts`, out of this task's file scope) only exports the whole-shape *sentence*, not a per-suit function — so each row's `aria-label` is built inline in `QuarryShape.tsx` from the identical per-row phrase `quarryShapeText` itself uses (`${SUIT_NAME[row.suit]}: ${row.held} held, ${skullsText}`), keeping the wording identical without editing a file outside scope. Each repeated skull glyph also carries its own `role="img"` + `aria-label={SKULL_MARK_LABEL}` (Task 14's export, otherwise unused until now), so a reader navigating object-by-object gets the same count a sighted player counts by eye, in addition to the row's own summary label.

- [x] **Step 4: Run the spec**

Run: `npx vitest run src/app/warCouncil/__tests__/QuarryShape.test.tsx; npm run typecheck`
Expected: both exit 0.
Result: deferred into the Phase 3 end-of-phase block — passed clean as part of `npx vitest run --project dom` (`Tests  62 passed (62)`) and `npm run typecheck` (exit 0, no output).

### Task 19: Build the bank meter — `BankMeter.tsx` ✓

- Skill: react-frontend, game-ux

**Files:**

- Create: `src/app/warCouncil/BankMeter.tsx`
- Test: `src/app/warCouncil/__tests__/BankMeter.test.tsx`
- Modify: `src/app/warCouncil/warCouncilHunt.css` — add `.wc-bank*`

- [x] **Step 1: Write the failing spec**

```tsx
it('shows the bank, the streak, and what the streak would cash for', () => {
  render(<BankMeter bank={43} multiplier={3} lastResolution={null} />)
  expect(screen.getByLabelText(/cashes for 129/i)).toBeTruthy()
})

it('says what the last trick did', () => {
  render(<BankMeter bank={0} multiplier={0} lastResolution={/* a CleanLoss resolution */} />)
  expect(screen.getByText(/the bank cashes/i)).toBeTruthy()
})

it('reads zero at the start of a hand', () => {
  render(<BankMeter bank={0} multiplier={0} lastResolution={null} />)
  expect(screen.getByLabelText(/cashes for 0/i)).toBeTruthy()
})
```

Done as written — `src/app/warCouncil/__tests__/BankMeter.test.tsx` created with these three specs; the `/* a CleanLoss resolution */` placeholder is a hand-built `TrickResolution` fixture (`outcome: TrickOutcome.CleanLoss, bankAdded: 0, cashOut: 40, damageToPlayer: 1, bank: 0, multiplier: 0, cashedAtHandEnd: false`) — `roundFixture.ts` has no `TrickResolution`-shaped helper, so this is constructed directly against the type, matching `TrickWell.test.tsx`'s own existing pattern for the same shape.

- [x] **Step 2: Run the spec and watch it fail to collect**

Run: `npx vitest run src/app/warCouncil/__tests__/BankMeter.test.tsx`
Expected: non-zero exit, `Cannot find module '../BankMeter'`.
Result: the red/green pair collapsed into the Phase 3 end-of-phase run per the batching policy — the component was written directly at Step 3, and the spec passed clean in the same `--project dom` run (see Task 20 Step 4).

- [x] **Step 3: Write the component**

Renders `bank`, `× multiplier`, and `bank * multiplier` as the figure this streak would cash for, plus `TRICK_OUTCOME_MESSAGE[lastResolution.outcome]` when a resolution is present. The take/hit distinction is carried by copy and by a form change, not by colour alone. The product is computed here rather than threaded through the engine because it is a display figure with no rule attached — `resolveTrickBank` owns the cash-out that actually lands.

Done as written. `isTaken(lastResolution.outcome)` (already exported by `bank.ts`) decides `wc-is-take`/`wc-is-hit` on the last-trick line, so the distinction is a class name plus the outcome's own copy, never colour alone. With no resolution yet, the line reads a literal placeholder ("Take tricks. Make them eat the skulls." — the mockup's own approved copy, transcribed rather than invented) since no label constant for that state exists in `labels.ts` and this task's file scope doesn't include it; this mirrors `IntentTelegraph.tsx`'s own precedent of literal empty-state copy living directly in the component.

- [x] **Step 4: Run the spec**

Run: `npx vitest run src/app/warCouncil/__tests__/BankMeter.test.tsx; npm run typecheck`
Expected: both exit 0.
Result: deferred into the Phase 3 end-of-phase block — passed clean as part of `npx vitest run --project dom` (`Tests  62 passed (62)`) and `npm run typecheck` (exit 0, no output).

### Task 20: Mount both readouts in the dossier column ✓

- Skill: react-frontend, game-ux

**Files:**

- Modify: `src/app/warCouncil/WarCouncilRound.tsx`
- Modify: `src/app/warCouncil/warCouncilHunt.css`
- Test: `src/app/warCouncil/__tests__/WarCouncilRound.test.tsx`

- [x] **Step 1: Mount them where `HuntLedger` was**

```tsx
      <aside className="wc-dossier">
        <QuarryDossier
          info={quarryCharacterInfo(hunt.quarry.character)}
          tricksWon={ui.round.tricksWon[PlayerSide.Cpu]}
        />
        <QuarryShape shape={shape} />
        <BankMeter
          bank={ui.round.bank}
          multiplier={ui.round.multiplier}
          lastResolution={ui.round.lastResolution}
        />
        <IntentTelegraph intent={intent} speculative={speculative} />
      </aside>
```

Done as written — the `wc-sr-only` accessible-only paragraph and its Phase-2 placeholder comment are gone, replaced by this exact block; the now-unused `quarryShapeText` import was dropped from `WarCouncilRound.tsx`'s import list (it stays exported from `labels.ts` and its own unit test in `labels.test.ts` is untouched). Also wired the real `ui.round.skulledCards` into both `TrickWell` call sites (Task 17's `skulled` plumbing), since this file is the only caller and is already in this task's scope.

- [x] **Step 2: Add a spec that both readouts are on screen and track play**

Append to `WarCouncilRound.test.tsx` a test that the shape readout renders for a dealt hand and that the bank readout's cash figure changes after a taken trick.

Done as written — appended `'renders the shape readout for the dealt hand, and the bank readout climbs on a taken trick (DLR-80 Task 20)'`, reusing the same Witch-beats-anything one-card-each construction the existing clean-take spec uses (deterministic regardless of the fixture's trump suit). Asserts the shape row's `aria-label` (`Bells: 1 held, none skulled`) before any card is played, the bank readout's `cashes for 0` before the trick, then `cashes for 11` (9 + 2 banked, ×1) immediately after the trick is taken — the real assertion the dispatch note asked this task to own, in place of Phase 2's own admitted proxy.

- [x] **Step 3: Check the file did not cross the 400-line budget**

Run: `(Get-Content src\app\warCouncil\WarCouncilRound.tsx).Count`
Expected: under 400. It was 303 lines and this phase removes more than it adds, so a number above 400 means something was added that belongs in a sibling component. Use `(Get-Content …).Count`, never `Measure-Object -Line` — that form drops blank lines and undercounts, which hid a real breach on DLR-63.
Result: `283`. (Read tool's own 1-indexed view showed a 284th trailing line; `Get-Content` — the rule's own prescribed measure — reports 283, well under 400.)

- [x] **Step 4: Run the DOM project and the type gate**

Run: `npx vitest run --project dom; npm run typecheck`
Expected: both exit 0, 0 failed.
Result: `npx vitest run --project dom` — `Test Files  12 passed (12)`, `Tests  62 passed (62)`, exit 0. `npm run typecheck` — exit 0, no output. (`npm run lint` also run as this phase's own general gate — exit 0, no output, 0 warnings.)

---

## Phase 4 — Final verification

No production changes. Only sanity checks that the cumulative work is clean, that AC13's deletions left nothing behind, and that AC14's five gates are green.

### Task 21: Confirm the pure-core boundary still holds ✓

- Skill: react-frontend

- [x] **Step 1: Grep the engine trees for React and DOM references**

Run: `Get-ChildItem src\warCouncil, src\hunt -Recurse -Include *.ts,*.tsx | Select-String -Pattern "from 'react'|\bwindow\.|\bdocument\.|localStorage|Math\.random"`
Expected: zero hits. `Math.random` is included because `assignSkulls` must draw from the injected `rng` — a direct call here would make a seeded deal irreproducible without failing any test.
Result: 2 hits, both inside comments explicitly documenting that `Math.random` is NOT used (`src/warCouncil/skulls.ts:27` — "Draws through `shuffle` from the INJECTED `rng`, never `Math.random`"; `src/warCouncil/__tests__/skulls.test.ts:15` — "A deterministic stand-in for Math.random"). No `from 'react'`, `window.`, `document.`, or `localStorage` hit, and no live `Math.random()` call. The boundary holds.

### Task 22: Confirm AC13's deletions left nothing behind ✓

- Skill: react-frontend

- [x] **Step 1: Grep the whole source tree for every retired name**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "HuntDeclaration|declareHunt|DeclarationState|declaredPath|StandingBand|standingTableFor|resolveStanding|HUNT_MULTIPLIER_TABLES|cardValueScheme|CardValueScheme|PaidPile|invertedCardValue|RANK_INVERSION_PIVOT|cardBaseValue|cardValueFor|DamageRounding|roundDamage|\bspoils\b|\bSpoils\b|capturedCards|scoreHunt|huntDamage|pendingHuntDamage|duelSideDamage|HuntNotScorable|applyHunt|huntsApplied|TRICKS_PER_ROUND"`
Expected: zero hits.
Result: initial run surfaced 12 hits. 3 were genuine leftovers from Phase 2's `applyHunt` → `applyDamage` rename in files this contract already modifies (`src/App.tsx:44`, `src/hunt/config.ts:24`, `src/hunt/encounter.ts:22`) — fixed as unambiguous stale-comment edits (no behaviour change; re-grep confirms gone). The remaining 9 split two ways: 4 are deliberate historical documentation this contract itself wrote, explicitly framed as retired (`RoundOverPanel.tsx:28` "Retired on DLR-80…", `warCouncilHunt.css:9` "old Standing readout…retired", `WarCouncilRound.tsx:84` "…it was the non-monotonic figure the redesign exists to remove", `src/warCouncil/bank.ts:112` "replacing the retired `duelSideDamage`") — kept, since they name what is gone rather than reference something still live. 5 are a genuine finding **outside this contract's file map**: `src/app/warCouncil/duelHealthBars.ts:29,31,43,47` and `DuelHealthBars.tsx:27` still say `applyHunt` in prose docblocks (the actual export is `applyDamage`); neither file appears in this contract's Modified list at any phase, so left unedited and reported below rather than silently fixed.

- [x] **Step 2: Grep source and copy for the literals configuration now owns**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx,*.css | Select-String -Pattern "\b(13|1350|1600)\b"`
Expected: zero hits outside `src/app/warCouncil/fanLayout.ts`'s `FAN_LIFT_FACTOR = 0.13`, which is a fan-geometry tunable and not a trick count. Any other hit is a hard-coded value that belongs in `src/hunt/config.ts`.
Result: 10 hits total. `fanLayout.ts:2` is the named exception. The other 9 are all benign on inspection: `fanLayout.test.ts` (6 hits) passes `13`/`12` as generic `count`/`index` arguments to the pure `fanPlacement(index, count, armed)` geometry function across a range of sizes — not a game-rule literal; `handOrder.test.ts:32` builds a 13-card array as generic stress-test input to `sortHandForDisplay`, which takes an arbitrary hand, not `HAND_SIZE`; `warCouncilCards.css:131` is `font-size: calc(var(--wc-card-w) * 0.13)`, a visual sizing ratio unrelated to trick count that only coincidentally shares the digits. No hit is a hard-coded trick-count, health, or damage literal that belongs in `src/hunt/config.ts`.

### Task 23: Confirm no file crossed the 400-line budget ✓

- Skill: react-frontend

- [x] **Step 1: Measure every file this contract created or grew**

Run: `Get-ChildItem src -Recurse -Include *.ts,*.tsx | ForEach-Object { [PSCustomObject]@{ File = $_.FullName; Lines = (Get-Content $_.FullName).Count } } | Where-Object { $_.Lines -gt 400 }`
Expected: no output. `(Get-Content …).Count` is the array length and therefore counts every line, blank ones included.
Result: no output — confirmed, zero files over 400 lines.

### Task 24: Static gates, the full suite, and the build

- Skill: react-frontend

- [x] **Step 1: Warm the transform cache by running the projects separately**

Run: `npx vitest run --project node; npx vitest run --project dom`
Expected: both exit 0, 0 failed. A cold `npm test` can fail with `[vitest-pool-runner]: Timeout waiting for worker to respond`, which is a worker-start timeout on the jsdom project and not a failing test — running the projects separately first is what avoids reporting infrastructure as a defect.
Result: `npx vitest run --project node` → `Test Files  27 passed (27)`, `Tests  419 passed (419)`, exit 0. `npx vitest run --project dom` → `Test Files  12 passed (12)`, `Tests  62 passed (62)`, exit 0. Both re-run clean again after Step 3's formatting pass, with identical counts.

- [ ] **Step 2: Typecheck, lint, and the unfiltered suite**

Run: `npm run typecheck; npm run lint; npm test`
Expected: all three exit 0; Vitest reports 0 failed. Quote the `Tests  N passed` summary line.
Result: **typecheck and lint run and green by the Implementer** — `npm run typecheck` exit 0, no output; `npm run lint` exit 0, no output, 0 warnings (both re-confirmed after Step 3's formatting pass). **The unfiltered `npm test` is delegated to QA** per this dispatch's division of labour — not run here, left unticked.

- [x] **Step 3: Check formatting of the files this contract changed**

Run: `npx prettier --check src\hunt\**\*.ts src\warCouncil\**\*.ts src\app\**\*.ts src\app\**\*.tsx src\App.tsx src\app\warCouncil\*.css`
Expected: exits 0. If it fails, run `npm run format` and re-check.
Result: first run failed, exit 1, 5 files needing reformatting (`src/warCouncil/__tests__/bank.test.ts`, `src/warCouncil/__tests__/skulls.test.ts`, `src/warCouncil/skulls.ts`, `src/app/warCouncil/QuarryShape.tsx`, `src/app/warCouncil/TrickWell.tsx`). Ran `npx prettier --write` scoped to the same file list (not the repo-wide `npm run format`, to avoid touching pre-existing non-conformant `.docs/**` files as a side effect) — re-check then passed, exit 0, "All matched files use Prettier code style!". Re-ran the node/dom Vitest projects, `npm run typecheck` and `npm run lint` afterward; all still green with identical pass counts, confirming the reformat was whitespace-only.

- [ ] **Step 4: Run the repo-wide format gate and report both results**

Run: `npm run format:check`
Expected: AC14 names this a gate. It currently fails on pre-existing `.docs/**` files no contract has touched (`web-project.md` → *Hard constraints on runners*). Report the actual result and name which failing files are pre-existing versus introduced here; do not "fix" the pre-existing failure as a side effect of this ticket.
Result: **delegated to QA** per this dispatch's division of labour — not run here, left unticked.

- [ ] **Step 5: Production build**

Run: `npm run build`
Expected: exits 0, `dist/` written, no bundler errors. Note that `build` runs `lint` first, so a lint regression surfaces here too.
Result: **delegated to QA** per this dispatch's division of labour — not run here, left unticked.

### Task 25: Write the PR description ✓

- Skill: none — a hand-off document, not code

- [x] **Step 1: Write `pr-description.md` in this plan folder**

Include:

- A link to `plan.md` and `mockup.html` in this folder.
- A summary of the change: six-trick hands, skulls, the bank and the streak multiplier, per-trick damage, and the AC13 deletion list.
- **Every decision the developer must make**, copied from the File map's *Developer decides or observes*: the Quarry's health placeholder, the skull rank distribution, whether the CPU should avoid leading skulls, the visual calls, and the `the-hunt.md` question.
- **Every behaviour they must judge by playing**, with what to look for: §8's four measurements — count the tricks you deliberately dodge (the falsifier for the whole design), count how often you were forced to eat a skull, record your biggest cash-out each hand (this is what sets the Quarry's real health), and whether the multiplier ever changed a decision.
- Verification results from Phase 4, quoted rather than summarised.
- A one-line note for future contributors on the new convention: every rule of the four-outcome loop lives in `src/warCouncil/bank.ts`, and a component that needs to know what a trick did reads `RoundState.lastResolution` rather than deriving it.

Result: written to `.claude/contract/DLR-80-skull-and-bank-redesign/pr-description.md`. Includes all nine "Developer decides or observes" items verbatim, all four of §8's measurements, Phase 4's quoted verification output, the three QA-delegated steps named explicitly as not run here, the two carry-forward findings from earlier phases (`roundReducer.test.ts` split, `quarryShapeText` duplication), and one new finding surfaced by Task 22 (the `applyHunt` leftovers in `duelHealthBars.ts`/`DuelHealthBars.tsx`, outside this contract's scope).

---

## Self-review

**Spec coverage:**

- AC1 — six cards, six tricks, re-deal — Tasks 1, 5, 6; `App.tsx` re-deal is unchanged and confirmed in Task 13.
- AC2 — ~30% skulls, never rank 1, named config — Tasks 1, 2, 5.
- AC3 — skulls visible before commitment — Tasks 17 (the mark on a face-up card), 18 (the shape readout), 20.
- AC4 / AC5 / AC6 / AC7 — the four outcomes — Task 3, wired in Task 6, applied in Task 12.
- AC8 — the sixth-trick cash-out — Task 3 (`finalTrick`), Task 6.
- AC9 — the streak multiplier and its reset — Task 3.
- AC10 — health 25, 1 damage per event, encounter ends at zero — Tasks 1, 9, 12 (mid-hand stop), 13.
- AC11 — the per-suit shape readout — Tasks 2 (`suitShape`), 18, 20.
- AC12 — the adversarial skull dump — Task 7.
- AC13 — every deletion — Tasks 4, 8, 9, 14, 15, verified in Task 22.
- AC14 — all five gates — Task 24.

**Placeholder scan:** No `TBD`, `TODO`, `implement later`, `appropriate error handling`, or "similar to Task N" references. Every step shows the exact code, the exact deletion list, or a runnable command with `Run:` / `Expected:`. Where a step names a fixture body as `/* … */`, the surrounding assertions state exactly what that fixture must produce, and the fixture helpers themselves are specified in Task 11.

**Type / name consistency:** `HAND_SIZE`, `SKULL_DENSITY`, `SKULL_MIN_RANK`, `DAMAGE_PER_HIT`, `QUARRY_ENCOUNTER_HEALTH`, `PLAYER_START_HEALTH`, `SuitShape`, `assignSkulls`, `skullableCards`, `isSkulled`, `suitShape`, `trickIsSkulled`, `BankState`, `TrickResolution`, `TrickOutcome`, `trickOutcomeFor`, `isTaken`, `resolveTrickBank`, `incomingFrom`, `applyDamage`, `damageEventsApplied`, `RoundUiSeed`, `TRICK_OUTCOME_MESSAGE`, `quarryShapeText`, `QuarryShape`, `BankMeter` and the `skulled` prop are each used identically in every task that names them, and each matches `plan.md` Part 2 → Data shapes. `RoundState`'s four new fields — `skulledCards`, `bank`, `multiplier`, `lastResolution` — are spelled the same in Tasks 4, 5, 6, 7, 10, 11, 12, 13 and 20.

**Phase boundary cleanliness:**

- **Phase 1** ends type-checking and with every pre-existing test still passing: nothing is edited or deleted, only added, and both new modules take their inputs as parameters so neither depends on a `RoundState` field that does not exist yet.
- **Phase 2** ends type-checking, lint-clean, and with both Vitest projects green (Task 16, Step 4). It does **not** type-check part-way through, by necessity — stated in the phase framing, and the reason the tasks are ordered engine-then-app.
- **Phase 3** ends type-checking with both projects green (Task 20, Step 4); each task inside it is additive to a codebase that already compiles, so this phase *does* hold at every task boundary.
- **Phase 4** makes no production change at all — every step is a grep, a measurement, a gate, or a document.
