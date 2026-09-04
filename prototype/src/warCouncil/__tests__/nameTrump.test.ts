// DLR-163 AC1/AC2/AC3 — the 3 names a suit outright. Built through `dealRound` with a seeded
// generator, as the sibling engine specs do, so the state under test is one the engine itself
// could have produced.
import { describe, expect, it } from 'vitest'
import { createSeededRng } from '../../hunt'
import { applyNameTrump } from '../abilities'
import { dealRound } from '../deal'
import { FRESH_ENCOUNTER_DECK } from '../encounterDeck'
import { ALL_SUITS, PlayerSide, type RoundState, type Suit } from '../types'

function dealt(): RoundState {
  return dealRound(PlayerSide.Player, createSeededRng(4), FRESH_ENCOUNTER_DECK)
}

/** A suit that is NOT the one currently in force, so the rule actually fires. */
function otherSuit(state: RoundState): Suit {
  const suit = ALL_SUITS.find((s) => s !== state.trumpSuit)
  if (suit === undefined) throw new Error('no other suit')
  return suit
}

describe('applyNameTrump', () => {
  it('AC1 — names any suit and that suit becomes trump, taking nothing from hand', () => {
    const state = dealt()
    const named = otherSuit(state)
    const next = applyNameTrump(state, named)
    expect(next.trumpSuit).toBe(named)
    expect(next.hands[PlayerSide.Player]).toEqual(state.hands[PlayerSide.Player])
    expect(next.hands[PlayerSide.Cpu]).toEqual(state.hands[PlayerSide.Cpu])
  })

  it('AC2 — the decree becomes null and the card it replaced joins the spent pile', () => {
    const state = dealt()
    const replaced = state.decree
    const next = applyNameTrump(state, otherSuit(state))
    expect(next.decree).toBeNull()
    expect(next.spentPile).toEqual([...state.spentPile, replaced])
  })

  it('AC1 — naming the suit already in force returns the state UNCHANGED', () => {
    const state = dealt()
    expect(applyNameTrump(state, state.trumpSuit)).toBe(state)
  })

  it('AC2 — a second 3 on an already-null decree changes trump and spends nothing more', () => {
    const state = dealt()
    const once = applyNameTrump(state, otherSuit(state))
    const twice = applyNameTrump(once, otherSuit(once))
    expect(twice.decree).toBeNull()
    expect(twice.trumpSuit).toBe(otherSuit(once))
    expect(twice.spentPile).toEqual(once.spentPile)
  })
})
