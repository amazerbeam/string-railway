import { describe, expect, it } from 'vitest'
import { PlayerSide, Suit, type Card, type WarCouncilState } from '../../../warCouncil'
import { apCostOf, BuffTier, cheatBuff, STARTING_AP } from '../../../hunt'
import {
  createRoundUiState,
  loadoutOpen,
  RoundUiActionKind,
  type RoundUiSeed,
} from '../roundUiState'
import { loadoutBarRefusalFor } from '../buffHandlers'
import { roundReducer } from '../roundReducer'
import { makeRound, encounterFixture } from './roundFixture'

const cheat = cheatBuff(BuffTier.Bronze, 1)
const card = (suit: Suit, rank: number): Card => ({ suit, rank })

function seed(overrides: Partial<WarCouncilState> = {}): RoundUiSeed {
  return {
    round: makeRound(overrides),
    encounter: encounterFixture,
    cheats: [],
    timebombCharges: 0,
    blastGuardHeld: false,
    bankClimbBonus: 0,
    discardsRemaining: 2,
    buffs: [cheat],
  }
}

const open = (s = createRoundUiState(seed())) =>
  roundReducer(s, { kind: RoundUiActionKind.ToggleLoadout })

describe('the loadout panel — opening and closing', () => {
  it('ToggleLoadout opens it when the buff window is open', () => {
    expect(loadoutOpen(open())).toBe(true)
  })

  it('ToggleLoadout closes an open panel and drops any poise', () => {
    const poised = roundReducer(open(), { kind: RoundUiActionKind.TapBuff, id: cheat.id })
    const closed = roundReducer(poised, { kind: RoundUiActionKind.ToggleLoadout })
    expect(loadoutOpen(closed)).toBe(false)
    expect(closed.buffActivation.apPool).toBe(STARTING_AP)
  })

  it('opening clears an armed card, so the next hand-card tap is never ambiguous', () => {
    const armed = roundReducer(createRoundUiState(seed()), {
      kind: RoundUiActionKind.TapCard,
      card: card(Suit.Bells, 7),
    })
    expect(armed.armed).not.toBeNull()
    expect(open(armed).armed).toBeNull()
  })

  it('is refused mid-trick when neither side can act — the trick is complete and awaits its own resolution', () => {
    const midTrick = createRoundUiState(
      seed({ currentTrick: [{ side: PlayerSide.Player, card: card(Suit.Bells, 2) }] }),
    )
    expect(loadoutOpen(open(midTrick))).toBe(false)
  })

  it('opens mid-trick while the player is following an already-committed lead (DLR-114 door widening)', () => {
    // The Quarry has led; the trick is non-empty so `discardWindowOpen` is false, but it is the
    // player's own turn to follow, so `canAct` is true. This is exactly the reach the pre-DLR-114
    // felt-rail plates offered and the panel's relocation must not have narrowed: arming a Cheat
    // or Timebomb has value only while following an already-committed lead.
    const followingLead = createRoundUiState(
      seed({
        leader: PlayerSide.Cpu,
        currentTrick: [{ side: PlayerSide.Cpu, card: card(Suit.Bells, 9) }],
      }),
    )
    expect(loadoutOpen(open(followingLead))).toBe(true)
    // The bar's own reading agrees with the transition it gates — same discipline every other
    // stock function in this codebase documents.
    expect(loadoutBarRefusalFor(followingLead)).toBeNull()
  })

  it('CancelLoadout closes without spending', () => {
    const closed = roundReducer(open(), { kind: RoundUiActionKind.CancelLoadout })
    expect(loadoutOpen(closed)).toBe(false)
    expect(closed.buffActivation.apPool).toBe(STARTING_AP)
  })
})

describe('activating a buff — poise, then commit', () => {
  it('the first tap poises and spends nothing', () => {
    const poised = roundReducer(open(), { kind: RoundUiActionKind.TapBuff, id: cheat.id })
    expect(poised.loadout?.poised).toBe(cheat.id)
    expect(poised.buffActivation.apPool).toBe(STARTING_AP)
    expect(poised.buffActivation.activatedThisTrick).toEqual([])
  })

  it('the second tap on the same buff spends its AP cost and records it', () => {
    const poised = roundReducer(open(), { kind: RoundUiActionKind.TapBuff, id: cheat.id })
    const done = roundReducer(poised, { kind: RoundUiActionKind.TapBuff, id: cheat.id })
    expect(done.buffActivation.apPool).toBe(STARTING_AP - apCostOf(cheat))
    expect(done.buffActivation.activatedThisTrick).toEqual([cheat.id])
    expect(loadoutOpen(done)).toBe(true)
    expect(done.loadout?.poised).toBeNull()
  })

  it('a second activation of the same buff in the same trick is refused, not double-charged', () => {
    const once = roundReducer(
      roundReducer(open(), { kind: RoundUiActionKind.TapBuff, id: cheat.id }),
      { kind: RoundUiActionKind.TapBuff, id: cheat.id },
    )
    const again = roundReducer(
      roundReducer(once, { kind: RoundUiActionKind.TapBuff, id: cheat.id }),
      { kind: RoundUiActionKind.TapBuff, id: cheat.id },
    )
    expect(again.buffActivation.apPool).toBe(once.buffActivation.apPool)
    expect(again.buffActivation.activatedThisTrick).toEqual([cheat.id])
  })

  it('an id not in the offered pile is a no-op, never a throw', () => {
    const opened = open()
    expect(() => roundReducer(opened, { kind: RoundUiActionKind.TapBuff, id: 999 })).not.toThrow()
    expect(
      roundReducer(opened, { kind: RoundUiActionKind.TapBuff, id: 999 }).loadout?.poised,
    ).toBeNull()
  })

  it('an Unassigned placeholder is never offered and never priced', () => {
    const withPlaceholders = createRoundUiState({ ...seed(), buffs: [] })
    const opened = roundReducer(withPlaceholders, { kind: RoundUiActionKind.ToggleLoadout })
    expect(() => roundReducer(opened, { kind: RoundUiActionKind.TapBuff, id: 1 })).not.toThrow()
  })
})

describe('the per-trick activation window', () => {
  it('clears activatedThisTrick when a trick resolves, and leaves the pool alone', () => {
    const done = roundReducer(
      roundReducer(open(), { kind: RoundUiActionKind.TapBuff, id: cheat.id }),
      { kind: RoundUiActionKind.TapBuff, id: cheat.id },
    )
    expect(done.buffActivation.activatedThisTrick).toEqual([cheat.id])

    // Play a card and let the Quarry answer, so a trick resolves.
    const closed = roundReducer(done, { kind: RoundUiActionKind.ToggleLoadout })
    const lead = closed.round.hands[PlayerSide.Player][0]
    const armedCard = roundReducer(closed, { kind: RoundUiActionKind.TapCard, card: lead })
    const played = roundReducer(armedCard, { kind: RoundUiActionKind.TapCard, card: lead })

    expect(played.resolvedTrick).not.toBeNull()
    expect(played.buffActivation.activatedThisTrick).toEqual([])
    expect(played.buffActivation.apPool).toBe(done.buffActivation.apPool)
  })
})
