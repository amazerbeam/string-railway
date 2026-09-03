/**
 * DLR-160 Task 14 — the `.wc-buff-ride-zone` block split out of `WarCouncilTable.tsx`, which sits
 * at its 400-line budget. PURE MOVE for the hand/riding/breakdown markup itself; the one thing
 * added here is `BreakdownTopContext.Provider`, wrapping the zone so `CardAbilityTip` (mounted
 * inside `HandFan`, below) can read the breakdown panel's measured top edge — see
 * `breakdownRectContext.ts` for why that number crosses this boundary at all.
 *
 * DLR-153 Assumption 6 — outside `.wc-table` deliberately: `BuffGallery` replaces the stage and
 * unmounts the moment the door closes, but the hand zone renders unconditionally, so anchoring the
 * riding list and the (hover-only, Phase 8) breakdown here is what keeps them reachable across the
 * gallery closing.
 * DLR-153 Fix 2 — a REAL positioning class, not an unclassed div: the panel's nearest positioned
 * ancestor used to be `.wc-table`, a SIBLING rather than a parent.
 */
import { skullsOn, type Card } from '../../warCouncil'
import { BreakdownTopContext } from './breakdownRectContext'
import type { BuffRideBundle } from './buffRideProps'
import BuffRidingList from './BuffRidingList'
import { cardDamagePreview } from './cardDamage'
import CardBuffBreakdown from './CardBuffBreakdown'
import HandFan from './HandFan'
import { cardKey } from './labels'
import { curseArmed, discardSelecting, type RoundUiState } from './roundUiState'

export interface BuffRideZoneProps {
  readonly ui: RoundUiState
  readonly legal: readonly Card[]
  readonly displayHand: readonly Card[]
  readonly handInteractive: boolean
  readonly hint: string
  readonly buffRide: BuffRideBundle
  readonly onTap: (card: Card) => void
  readonly onCancel: () => void
}

export default function BuffRideZone({
  ui,
  legal,
  displayHand,
  handInteractive,
  hint,
  buffRide,
  onTap,
  onCancel,
}: BuffRideZoneProps) {
  return (
    <div
      className="wc-buff-ride-zone"
      onMouseEnter={buffRide.breakdownTarget.onEnterPanel}
      onMouseLeave={buffRide.breakdownTarget.onLeaveCard}
    >
      <BreakdownTopContext.Provider value={buffRide.breakdownTop}>
        <HandFan
          hand={displayHand}
          legal={legal}
          armed={ui.armed}
          interactive={handInteractive}
          hint={buffRide.removedAnnouncement ?? hint}
          rejected={ui.rejection !== null}
          promptOpen={ui.prompt !== null}
          discardSelecting={discardSelecting(ui)}
          discardSelection={ui.discardSelection ?? []}
          // DLR-167 AC4/AC3 — both read straight off the reducer's own state and predicate, so the
          // fan computes neither. `skullsOn` is THE single union of the Quarry's dealt skulls and
          // the player's own curses.
          skulledCards={skullsOn(ui.round)}
          curseArmed={curseArmed(ui)}
          damageForCard={(card) => cardDamagePreview(ui, card)}
          buffLightForCard={(card) => buffRide.lights.get(cardKey(card)) ?? null}
          onCardEnter={buffRide.breakdownTarget.onEnterCard}
          onCardLeave={buffRide.breakdownTarget.onLeaveCard}
          onTap={onTap}
          onCancel={onCancel}
        />
        <BuffRidingList
          rows={buffRide.riding}
          onRemove={buffRide.handleRemoveBuff}
          disabled={buffRide.buffMotionInFlight}
        />
        <CardBuffBreakdown
          breakdown={buffRide.breakdown}
          riding={buffRide.riding}
          onEnter={buffRide.breakdownTarget.onEnterPanel}
          onLeave={buffRide.breakdownTarget.onLeavePanel}
          onEscape={buffRide.breakdownTarget.onEscape}
          onRemove={buffRide.handleRemoveBuff}
          onTopChange={buffRide.onBreakdownTopChange}
        />
      </BreakdownTopContext.Provider>
    </div>
  )
}
