import { describe, expect, it } from 'vitest'
import { BuffTier, mintFromTemplate, templateById, type Buff } from '../../../hunt'
import { PlayerSide, Suit } from '../../../warCouncil'
import { createRoundUiState, type RoundUiState } from '../roundUiState'
import { armingReachOf, buildArmingSurface, ArmingMode } from '../armingSurfaceModel'
import { card, discardsRemainingFixture, encounterFixture, makeRound } from './roundFixture'

function seededUi(
  overrides: Parameters<typeof makeRound>[0] = {},
  buffs: readonly Buff[] = [],
): RoundUiState {
  return createRoundUiState({
    round: makeRound(overrides),
    encounter: encounterFixture,
    baseDamageBonus: 0,
    discardsRemaining: discardsRemainingFixture,
    buffs,
  })
}

function raised(ui: RoundUiState, raisedCard: ReturnType<typeof card>): RoundUiState {
  return { ...ui, armed: raisedCard }
}

const bellsHigh = (id: number) =>
  mintFromTemplate(templateById('suitHigh:bells:magnitude')!, BuffTier.Bronze, id)
const bellsLow = (id: number) =>
  mintFromTemplate(templateById('suitLow:bells:multiplier')!, BuffTier.Bronze, id)
const skullLow = (id: number) =>
  mintFromTemplate(templateById('skullLow:magnitude')!, BuffTier.Bronze, id)
const cheat = (id: number) => mintFromTemplate(templateById('cheat')!, BuffTier.Bronze, id)
const wildcard = (id: number) => mintFromTemplate(templateById('wildcard')!, BuffTier.Bronze, id)
const curse = (id: number) => mintFromTemplate(templateById('curse')!, BuffTier.Bronze, id)

describe('armingReachOf', () => {
  it('reaches a Bells card for a held Bells Suit High buff and not a Moons card (correctness pin 1)', () => {
    const suitHigh = bellsHigh(1)
    const ui = seededUi({}, [suitHigh])
    expect(armingReachOf(ui, card(Suit.Bells, 2), suitHigh)).not.toBeNull()
    expect(armingReachOf(ui, card(Suit.Moons, 5), suitHigh)).toBeNull()
  })

  it('reaches its suit on both a skulled and a clean trick — no outcome-quality term narrows a Suit Low buff (correctness pin 2)', () => {
    const suitLow = bellsLow(1)
    const bells2 = card(Suit.Bells, 2)

    // Low Victory shape: the trick the candidate joins already carries a skull.
    const skulled = seededUi(
      {
        currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Keys, 6) }],
        leader: PlayerSide.Cpu,
      },
      [suitLow],
    )
    expect(armingReachOf(skulled, bells2, suitLow)).not.toBeNull()

    // Low Defeat shape: the same led card, but nothing is skulled.
    const clean = seededUi(
      {
        currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Keys, 6) }],
        leader: PlayerSide.Cpu,
      },
      [suitLow],
    )
    expect(armingReachOf(clean, bells2, suitLow)).not.toBeNull()
  })

  it('reports Skull Low as mayFire while the player leads, and never as a certain figure once the trick outcome is known (correctness pin 3)', () => {
    const skull = skullLow(1)
    const unskulledCard = card(Suit.Bells, 2)

    const leading = seededUi({ currentTrick: [] }, [skull])
    const reachWhileLeading = armingReachOf(leading, unskulledCard, skull)
    expect(reachWhileLeading).not.toBeNull()
    expect(reachWhileLeading!.mayFire).toBe(true)

    // Once the Quarry's card is on the table and the trick reads clean, Skull Low can never
    // fire on this card at all — absent, not a downgraded figure.
    const revealed = seededUi(
      {
        currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Keys, 6) }],
        leader: PlayerSide.Cpu,
        skulledCards: [],
      },
      [skull],
    )
    expect(armingReachOf(revealed, unskulledCard, skull)).toBeNull()
  })

  it('lists Cheat, the wildcard and Curse whenever their own window is open, despite carrying no condition (correctness pin 4)', () => {
    const ui = seededUi({ currentTrick: [] }, [])
    const anyCard = card(Suit.Bells, 2)
    for (const activated of [cheat(1), wildcard(2), curse(3)]) {
      const reach = armingReachOf(ui, anyCard, activated)
      expect(reach).toEqual({ fires: true, mayFire: false })
    }
  })
})

describe('buildArmingSurface', () => {
  it('is NoValidCards for an illegal card with no Cheat held', () => {
    const ui = raised(
      seededUi(
        {
          currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Keys, 6) }],
          leader: PlayerSide.Cpu,
        },
        [],
      ),
      card(Suit.Bells, 2), // off-suit, no Cheat to break follow-suit
    )
    const legal = ui.round.hands[PlayerSide.Player].filter((c) => c.suit === Suit.Keys)
    const view = buildArmingSurface({ ui, legal, offered: [], riding: [] })
    expect(view.mode).toBe(ArmingMode.NoValidCards)
    expect(view.refusal).not.toBeNull()
  })

  it('is Card, with the Cheat row carrying unlocksCard, when a held Cheat could break follow-suit', () => {
    const cheatCard = cheat(1)
    const ui = raised(
      seededUi(
        {
          currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Keys, 6) }],
          leader: PlayerSide.Cpu,
        },
        [cheatCard],
      ),
      card(Suit.Bells, 2),
    )
    const legal = ui.round.hands[PlayerSide.Player].filter((c) => c.suit === Suit.Keys)
    const view = buildArmingSurface({ ui, legal, offered: [cheatCard], riding: [] })
    expect(view.mode).toBe(ArmingMode.Card)
    const cheatRow = view.rows.find((row) => row.stack.buff.id === cheatCard.id)
    expect(cheatRow).toBeDefined()
    expect(cheatRow!.unlocksCard).toBe(true)
  })

  it('is CurseClaimed while a Curse is armed, and reports no card', () => {
    const curseCard = curse(1)
    const base = seededUi({}, [curseCard])
    const ui = { ...base, curseArmedBuff: curseCard }
    const legal = ui.round.hands[PlayerSide.Player]
    const view = buildArmingSurface({ ui, legal, offered: [curseCard], riding: [] })
    expect(view.mode).toBe(ArmingMode.CurseClaimed)
    expect(view.card).toBeNull()
    expect(view.damage).toBeNull()
  })

  it('lists only the buffs that could still pay on the raised card, for a legal card', () => {
    const suitHigh = bellsHigh(1)
    const ui = raised(seededUi({}, [suitHigh]), card(Suit.Bells, 2))
    const legal = ui.round.hands[PlayerSide.Player]
    const view = buildArmingSurface({ ui, legal, offered: [suitHigh], riding: [] })
    expect(view.mode).toBe(ArmingMode.Card)
    expect(view.rows).toHaveLength(1)
    expect(view.rows[0].stack.buff.id).toBe(suitHigh.id)
    expect(view.damage).not.toBeNull()
  })
})
