import { describe, expect, it } from 'vitest'
import { PlayerSide, playCard, quarryIntent, Suit } from '../../../warCouncil'
import { HuntDeclaration } from '../../../hunt'
import { previewQuarryIntent } from '../intentPreview'
import { card, makeRound } from './roundFixture'

// DLR-63: `playCard` rejects with `HuntNotDeclared` before any card may be played, and
// `makeRound()`'s fixture default is deliberately undeclared. Every spec below reaches
// `playCard` through `previewQuarryIntent` itself, so the round must already be declared —
// Win, since none of these specs are concerned with the Lose path.
const WIN_DECLARED = { path: HuntDeclaration.Win } as const

describe('previewQuarryIntent', () => {
  it('returns a QuarryIntent naming a suit for a card the Quarry can answer', () => {
    const round = makeRound({ declaration: WIN_DECLARED })
    const intent = previewQuarryIntent(round, card(Suit.Keys, 8))
    expect(intent).not.toBeNull()
    expect(intent?.suit).toBeDefined()
  })

  it('agrees with quarryIntent(playCard(round, Player, card).state) — the module’s whole contract', () => {
    const round = makeRound({ declaration: WIN_DECLARED })
    const led = card(Suit.Keys, 8)
    const preview = previewQuarryIntent(round, led)
    const result = playCard(round, PlayerSide.Player, led)
    expect(result.ok).toBe(true)
    const live = result.ok ? quarryIntent(result.state) : null
    expect(preview).toEqual(live)
  })

  it('returns null for a card that is not a legal move', () => {
    // The Quarry (Cpu) is the leader and no card has been played yet, so
    // `currentTurn(round) === round.leader === Cpu` (see `currentTurn`) — it is not the
    // Player's turn to act. `playCard(round, PlayerSide.Player, …)` is therefore rejected
    // with NotYourTurn before any hypothetical follow can be derived.
    const round = makeRound({
      leader: PlayerSide.Cpu,
      declaration: WIN_DECLARED,
    })
    const intent = previewQuarryIntent(round, card(Suit.Bells, 2))
    expect(intent).toBeNull()
  })

  it('returns null for a Fox (rank 3) — playCard rejects it with MissingAbilityChoice', () => {
    const round = makeRound({ declaration: WIN_DECLARED })
    const intent = previewQuarryIntent(round, card(Suit.Keys, 3))
    expect(intent).toBeNull()
  })

  it('returns null for a Woodcutter (rank 5) — playCard rejects it with MissingAbilityChoice', () => {
    const round = makeRound({ declaration: WIN_DECLARED })
    const intent = previewQuarryIntent(round, card(Suit.Moons, 5))
    expect(intent).toBeNull()
  })

  it('is pure: calling it twice returns equal values and leaves round unchanged', () => {
    const round = makeRound({ declaration: WIN_DECLARED })
    const snapshotTakenBefore = structuredClone(round)
    const led = card(Suit.Keys, 8)
    const first = previewQuarryIntent(round, led)
    const second = previewQuarryIntent(round, led)
    expect(first).toEqual(second)
    expect(round).toEqual(snapshotTakenBefore)
  })
})
