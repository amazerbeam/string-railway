import { describe, expect, it } from 'vitest'
import { PlayerSide, playCard, quarryIntent, Suit } from '../../../warCouncil'
import { previewQuarryIntent } from '../intentPreview'
import { card, makeRound } from './roundFixture'

describe('previewQuarryIntent', () => {
  it('returns a QuarryIntent naming a suit for a card the Quarry can answer', () => {
    const round = makeRound()
    const intent = previewQuarryIntent(round, card(Suit.Keys, 8))
    expect(intent).not.toBeNull()
    expect(intent?.suit).toBeDefined()
  })

  it('agrees with quarryIntent(playCard(round, Player, card).state) — the module’s whole contract', () => {
    const round = makeRound()
    const led = card(Suit.Keys, 8)
    const preview = previewQuarryIntent(round, led)
    const result = playCard(round, PlayerSide.Player, led)
    expect(result.ok).toBe(true)
    const live = result.ok ? quarryIntent(result.state) : null
    expect(preview).toEqual(live)
  })

  it('returns null for a card that is not a legal move', () => {
    // The player is not to act here — the Quarry (leader) is mid-lead and the player must
    // follow, not lead a fresh card — so `playCard(round, PlayerSide.Player, …)` is rejected
    // with NotYourTurn before any hypothetical follow can be derived.
    const round = makeRound({
      leader: PlayerSide.Cpu,
      currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Moons, 9) }],
    })
    const intent = previewQuarryIntent(round, card(Suit.Bells, 2))
    expect(intent).toBeNull()
  })

  it('returns null for a Fox (rank 3) — playCard rejects it with MissingAbilityChoice', () => {
    const round = makeRound()
    const intent = previewQuarryIntent(round, card(Suit.Keys, 3))
    expect(intent).toBeNull()
  })

  it('returns null for a Woodcutter (rank 5) — playCard rejects it with MissingAbilityChoice', () => {
    const round = makeRound()
    const intent = previewQuarryIntent(round, card(Suit.Moons, 5))
    expect(intent).toBeNull()
  })

  it('is pure: calling it twice returns equal values and leaves round unchanged', () => {
    const round = makeRound()
    const snapshotTakenBefore = structuredClone(round)
    const led = card(Suit.Keys, 8)
    const first = previewQuarryIntent(round, led)
    const second = previewQuarryIntent(round, led)
    expect(first).toEqual(second)
    expect(round).toEqual(snapshotTakenBefore)
  })
})
