/**
 * DLR-156 AC3/AC14's `ResolutionView`, moved here on DLR-160 because `roundUiState.ts` reached its
 * 400-line budget. Re-exported from `roundUiState.ts` so no importer changes.
 */
import type { Buff } from '../../hunt'
import type { Card, PlayerSide, TrickCard, TrickResolution } from '../../warCouncil'
import type { ResolutionBeat } from './resolutionBeats'

/** DLR-156 AC3/AC14 — the resolution screen's whole content. */
export interface ResolutionView {
  /** AC14 — the two played cards, CLONED onto the screen (`ui-notes.md` §1). */
  readonly cards: readonly TrickCard[]
  readonly winner: PlayerSide
  readonly resolution: TrickResolution
  /** AC16 — the ordered beats, derived ONCE at the hand-off, never per render. */
  readonly beats: readonly ResolutionBeat[]
  /** The trick's ordinal, for the header line. 1-based. */
  readonly trickNumber: number
  /** AC2 — what the pot becomes if the next trick also banks, at the bare rule:
   *  `potValue(total + BASE_DAMAGE, roll + 1)`, because the player may fire nothing next trick. */
  readonly nextPotFloor: number
  /** DLR-160 AC2 — the cards in THIS trick that carry a skull, filtered from
   *  `RoundState.skulledCards` at the hand-off. Empty on a clean trick. */
  readonly skulledInTrick: readonly Card[]
  /** DLR-160 AC7 — the decree in force as the trick resolved. */
  readonly decree: Card
  /** DLR-160 AC3 — buffs armed for this trick that did not fire, resolved to `Buff`s at the
   *  hand-off from the same `offeredBuffs + spentThisTrick` union the beats use. */
  readonly deadBuffs: readonly Buff[]
  /** DLR-160 AC6 — `true` when applying this pot would end the fight. Derived through
   *  `applyDamage`/`isEncounterResolved`, never by comparing two numbers. */
  readonly potIsLethal: boolean
}
