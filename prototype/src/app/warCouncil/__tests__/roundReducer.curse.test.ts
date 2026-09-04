import { describe, expect, it } from 'vitest'
import { PlayerSide, RoundPhase, Suit, type Card, type WarCouncilState } from '../../../warCouncil'
import { DiscardRefusal, discardRefusalFor, legalMoves } from '../../../warCouncil'
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
  discardStock,
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

/**
 * DLR-167 fix pass — an armed Curse used to survive the Quarry's lead.
 *
 * `handleCarryOn` guarded on the fault, the prompt, the phase, a resolved encounter, the turn, a
 * card already on the table and an open Swap selection — but not on the Curse. Nothing else clears
 * `curseArmedBuff`, so the player could arm between tricks, press "Let them lead", SEE the lead, and
 * only then choose which card to mark. `roundUiState.ts`'s `buffActivationWindowOpen` names that
 * exact prohibition: "a read the card was never meant to buy."
 */
describe('an armed Curse must not survive the Quarry’s lead', () => {
  /** The between-tricks state with the Quarry next to lead — the moment "Let them lead" exists. */
  const quarryToLead = () => createRoundUiState(seedWith([curse], { leader: PlayerSide.Cpu }))

  it('carry-on lays the lead when nothing claims the hand tap', () => {
    const after = roundReducer(quarryToLead(), { kind: RoundUiActionKind.CarryOn })
    expect(after.round.currentTrick).toHaveLength(1)
    expect(after.round.currentTrick[0].side).toBe(PlayerSide.Cpu)
  })

  it('carry-on is REFUSED while a Curse is armed — the mark is made before the lead, or not at all', () => {
    const armed = spend(quarryToLead(), curse.id)
    expect(curseArmed(armed)).toBe(true)

    const after = roundReducer(armed, { kind: RoundUiActionKind.CarryOn })

    expect(after.round.currentTrick).toHaveLength(0)
    // The paid-for arm is neither spent nor silently dropped by the refusal.
    expect(curseArmed(after)).toBe(true)
  })

  it('carry-on lays the lead again once the mark has been made', () => {
    const armed = spend(quarryToLead(), curse.id)
    const marked = roundReducer(armed, {
      kind: RoundUiActionKind.TapCard,
      card: card(Suit.Moons, 5),
    })

    const after = roundReducer(marked, { kind: RoundUiActionKind.CarryOn })

    expect(after.round.currentTrick).toHaveLength(1)
  })
})

/**
 * DLR-167 fix pass — the Swap and an armed Curse both reinterpret the next hand tap, and
 * `handleToggleLoadout`'s docblock already states that two such controls must not be open at once.
 * With both live `handleTapCard` gave the tap to the Swap, so a PAID-FOR Curse became silently
 * unreachable until the selection committed or cancelled.
 *
 * The rule is stated once, in `discardRefusalFor`, which is the same call the Swap control's own
 * disabled state and refusal line make — so the greyed control and the reducer cannot disagree.
 */
describe('the Swap and an armed Curse cannot both claim the hand tap', () => {
  it('the Swap is available with no Curse armed', () => {
    expect(discardRefusalFor(discardStock(createRoundUiState(seedWith([curse]))))).toBeNull()
  })

  it('the Swap reports CurseArmed while a Curse waits for its card', () => {
    const armed = spend(createRoundUiState(seedWith([curse])), curse.id)
    expect(discardRefusalFor(discardStock(armed))).toBe(DiscardRefusal.CurseArmed)
  })

  it('tapping the Swap opens nothing, and does NOT spend the Curse', () => {
    const armed = spend(createRoundUiState(seedWith([curse])), curse.id)

    const after = roundReducer(armed, { kind: RoundUiActionKind.TapDiscard })

    expect(after.discardSelection).toBeNull()
    // REFUSED, not cleared: a Curse has already been paid for, so dropping it would cost the
    // player the card.
    expect(curseArmed(after)).toBe(true)
    expect(after.curseArmedBuff?.id).toBe(curse.id)
  })

  it('the Swap comes back once the mark has been made — a marked card claims no further tap', () => {
    const armed = spend(createRoundUiState(seedWith([curse])), curse.id)
    const marked = roundReducer(armed, {
      kind: RoundUiActionKind.TapCard,
      card: card(Suit.Moons, 5),
    })

    expect(curseLive(marked)).toBe(true)
    expect(discardRefusalFor(discardStock(marked))).toBeNull()
  })
})
