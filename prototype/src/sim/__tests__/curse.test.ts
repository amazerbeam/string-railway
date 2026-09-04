import { describe, expect, it } from 'vitest'
import { PlayerSide, skullsOn, trickIsSkulled } from '../../warCouncil'
import { BuffKind, BuffTier } from '../../hunt'
import { fixtureHandWithCursedCard } from '../fixtures'

/** DLR-167 — the simulator can reach a cursed trick, so the card can be measured. */
describe('fixtureHandWithCursedCard', () => {
  it('marks exactly one card in the player`s own hand', () => {
    const ui = fixtureHandWithCursedCard()
    expect(ui.round.cursedCards).toHaveLength(1)
    expect(ui.round.hands[PlayerSide.Player]).toContainEqual(ui.round.cursedCards[0])
  })

  it('spends the Curse out of the pile and drops the arm', () => {
    const ui = fixtureHandWithCursedCard()
    expect(ui.buffs.some((buff) => buff.kind === BuffKind.Curse)).toBe(false)
    expect(ui.curseArmedBuff).toBeNull()
    expect(ui.buffActivation.spentThisTrick.map((b) => b.kind)).toContain(BuffKind.Curse)
  })

  it('makes the coming trick a SKULL trick once that card is played', () => {
    const ui = fixtureHandWithCursedCard()
    const cursed = ui.round.cursedCards[0]
    expect(trickIsSkulled(skullsOn(ui.round), [{ side: PlayerSide.Player, card: cursed }])).toBe(
      true,
    )
  })

  it('is deterministic — the same seed produces the same marked card', () => {
    expect(fixtureHandWithCursedCard(1307).round.cursedCards).toEqual(
      fixtureHandWithCursedCard(1307).round.cursedCards,
    )
  })

  it('carries the tier it was asked for onto the riding Curse', () => {
    const ui = fixtureHandWithCursedCard(1307, BuffTier.Gold)
    const riding = ui.buffActivation.spentThisTrick.find((b) => b.kind === BuffKind.Curse)
    expect(riding?.tier).toBe(BuffTier.Gold)
  })
})
