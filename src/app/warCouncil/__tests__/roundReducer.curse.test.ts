import { describe, expect, it } from 'vitest'
import { PlayerSide, RoundPhase, Suit, type Card, type WarCouncilState } from '../../../warCouncil'
import { legalMoves } from '../../../warCouncil'
import {
  AP_ENABLED,
  apCostOf,
  BuffActivationRefusal,
  BuffKind,
  BuffTier,
  cheatBuff,
  curseBuff,
  type Buff,
} from '../../../hunt'
import { loadoutRefusalFor } from '../buffHandlers'
import { roundReducer } from '../roundReducer'
import {
  createRoundUiState,
  curseArmed,
  curseLive,
  RoundUiActionKind,
  type RoundUiSeed,
  type RoundUiState,
} from '../roundUiState'
import { makeRound, encounterFixture } from './roundFixture'

const card = (suit: Suit, rank: number): Card => ({ suit, rank })

const curse = curseBuff(BuffTier.Silver, 1)
const secondCurse = curseBuff(BuffTier.Bronze, 2)
const cheat = cheatBuff(BuffTier.Bronze, 3)

function seedWith(buffs: readonly Buff[], round: Partial<WarCouncilState> = {}): RoundUiSeed {
  return {
    round: makeRound(round),
    encounter: encounterFixture,
    baseDamageBonus: 0,
    discardsRemaining: 2,
    buffs: [...buffs],
  }
}

/** Opens the loadout and spends `id` with the two-tap poise/commit gesture. */
function spend(state: RoundUiState, id: number): RoundUiState {
  let next = roundReducer(state, { kind: RoundUiActionKind.ToggleLoadout })
  next = roundReducer(next, { kind: RoundUiActionKind.TapBuff, id })
  return roundReducer(next, { kind: RoundUiActionKind.TapBuff, id })
}

describe('spending a Curse arms it (AC3)', () => {
  it('costs the AP, removes the card from the pile, and arms the mode', () => {
    const state = createRoundUiState(seedWith([curse]))
    const poolBefore = state.buffActivation.apPool

    const armed = spend(state, curse.id)

    expect(curseArmed(armed)).toBe(true)
    expect(armed.curseArmedBuff?.id).toBe(curse.id)
    // `spendAp` honours `AP_ENABLED`, which is off (DLR-145 took action points off the buff layer),
    // so the pool is untouched today. Asserted through the flag rather than hard-coded, so this
    // spec still pins the spend if the flag is ever turned back on.
    expect(armed.buffActivation.apPool).toBe(AP_ENABLED ? poolBefore - apCostOf(curse) : poolBefore)
    expect(armed.buffs.some((b) => b.id === curse.id)).toBe(false)
  })

  it('leaves every other card unarmed', () => {
    const state = createRoundUiState(seedWith([cheat]))
    expect(curseArmed(spend(state, cheat.id))).toBe(false)
  })
})

describe('a live Curse refuses a second one (CurseLive)', () => {
  it('refuses a second Curse while one is armed', () => {
    const state = createRoundUiState(seedWith([curse, secondCurse]))
    const armed = spend(state, curse.id)

    expect(loadoutRefusalFor(armed, secondCurse)).toBe(BuffActivationRefusal.CurseLive)
  })

  it('still allows a card that does not claim the hand tap', () => {
    const state = createRoundUiState(seedWith([curse, cheat]))
    const armed = spend(state, curse.id)

    expect(loadoutRefusalFor(armed, cheat)).toBeNull()
  })

  it('keeps refusing once the mark has been made, because the card is already skulled', () => {
    const state = createRoundUiState(seedWith([curse, secondCurse]))
    const armed = spend(state, curse.id)
    const marked = roundReducer(armed, {
      kind: RoundUiActionKind.TapCard,
      card: card(Suit.Moons, 5),
    })

    expect(curseArmed(marked)).toBe(false)
    expect(curseLive(marked)).toBe(true)
    expect(loadoutRefusalFor(marked, secondCurse)).toBe(BuffActivationRefusal.CurseLive)
  })

  it('refuses nothing on a felt with no Curse live at all', () => {
    const state = createRoundUiState(seedWith([curse]))
    expect(loadoutRefusalFor(state, curse)).toBeNull()
  })
})

describe('the tap that marks rather than plays (AC3)', () => {
  it('marks the tapped card and drops the arm', () => {
    const state = createRoundUiState(seedWith([curse]))
    const armed = spend(state, curse.id)

    const marked = roundReducer(armed, {
      kind: RoundUiActionKind.TapCard,
      card: card(Suit.Moons, 5),
    })

    expect(marked.round.cursedCards).toEqual([card(Suit.Moons, 5)])
    expect(marked.curseArmedBuff).toBeNull()
    // The tap MARKED rather than armed a play.
    expect(marked.armed).toBeNull()
  })

  it('marks a card that is ILLEGAL to play — marking is not a move', () => {
    // Armed in the between-tricks window (AC2's existing gate), and only THEN does the Quarry lead
    // Bells — which puts follow-suit in force and makes every non-Bells card unplayable.
    const armedBetweenTricks = spend(createRoundUiState(seedWith([curse])), curse.id)
    const armed: RoundUiState = {
      ...armedBetweenTricks,
      round: {
        ...armedBetweenTricks.round,
        leader: PlayerSide.Cpu,
        currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Bells, 4) }],
        phase: RoundPhase.AwaitingFollow,
      },
    }
    const target = card(Suit.Moons, 5)
    expect(
      legalMoves(armed.round, PlayerSide.Player).some(
        (c) => c.suit === target.suit && c.rank === target.rank,
      ),
    ).toBe(false)

    const marked = roundReducer(armed, { kind: RoundUiActionKind.TapCard, card: target })
    expect(marked.round.cursedCards).toEqual([target])
  })

  it('a tap on a card NOT in hand drops the arm rather than throwing', () => {
    const state = createRoundUiState(seedWith([curse]))
    const armed = spend(state, curse.id)

    const missed = roundReducer(armed, {
      kind: RoundUiActionKind.TapCard,
      card: card(Suit.Keys, 11),
    })

    expect(missed.round.cursedCards).toEqual([])
    expect(missed.curseArmedBuff).toBeNull()
  })

  it('a second tap on the same card is a no-op, not a throw', () => {
    const state = createRoundUiState(seedWith([curse]))
    const armed = spend(state, curse.id)
    const marked = roundReducer(armed, {
      kind: RoundUiActionKind.TapCard,
      card: card(Suit.Moons, 5),
    })
    // Re-arming is impossible (CurseLive), so re-tapping simply plays as usual — the mark stands.
    const again = roundReducer(marked, {
      kind: RoundUiActionKind.TapCard,
      card: card(Suit.Moons, 5),
    })

    expect(again.round.cursedCards).toEqual([card(Suit.Moons, 5)])
  })
})

describe('AC8 — a Curse cannot be taken back off the trick', () => {
  it('leaves the pool and the pile untouched when RemoveBuff names it', () => {
    const state = createRoundUiState(seedWith([curse]))
    const armed = spend(state, curse.id)

    const after = roundReducer(armed, { kind: RoundUiActionKind.RemoveBuff, id: curse.id })

    expect(after.buffActivation.apPool).toBe(armed.buffActivation.apPool)
    expect(after.buffs.some((b) => b.id === curse.id)).toBe(false)
    expect(after.buffActivation.activatedThisTrick).toContain(curse.id)
  })

  it('still lists the Curse as riding this trick', () => {
    const state = createRoundUiState(seedWith([curse]))
    const armed = spend(state, curse.id)
    expect(armed.buffActivation.activatedThisTrick).toContain(curse.id)
    expect(armed.buffActivation.spentThisTrick.map((b) => b.kind)).toContain(BuffKind.Curse)
  })
})
