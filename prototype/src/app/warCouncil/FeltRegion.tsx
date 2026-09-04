/**
 * DLR-174 Task 11 — the `<section className="wc-table">` block moved OUT of `WarCouncilTable.tsx`
 * verbatim, plus the new three-way stage choice, so that file stays under its 400-line budget
 * after this ticket's added branch. Modelled on `BuffRideZone.tsx`, which did the identical job
 * for the hand zone on DLR-160: a pure MOVE of existing markup and its comments, with this ticket's
 * one new ternary added at the call site.
 */
import type { Buff } from '../../hunt'
import type { Card } from '../../warCouncil'
import ArmingSurface from './ArmingSurface'
import BuffGallery from './BuffGallery'
import type { BuffRideBundle } from './buffRideProps'
import FeltRail from './FeltRail'
import FeltStage from './FeltStage'
import type { HandSummary } from './RoundOverPanel'
import {
  armingSurfaceProps,
  buffGalleryProps,
  feltRailProps,
  feltStageProps,
} from './roundControlsProps'
import {
  armingSurfaceOpen,
  galleryOpen,
  type RoundUiAction,
  type RoundUiState,
} from './roundUiState'
// `FeltRail` and `BuffGallery` carry no self-import of their own stylesheet (`BuffGallery.tsx`
// is the one exception — it already imports both of its own sheets, so importing them again here
// is harmless but redundant); `FeltRail.tsx` has none at all, so this component — now the one
// that actually renders it — is where that import belongs. `ArmingSurface.tsx` self-imports
// `warCouncilArming.css` and needs nothing added here.
import './warCouncilFeltRail.css'

export interface FeltRegionProps {
  readonly ui: RoundUiState
  readonly dispatch: (action: RoundUiAction) => void
  readonly offered: readonly Buff[]
  readonly legal: readonly Card[]
  readonly quarryToLead: boolean
  readonly handSummary: HandSummary
  readonly buffRide: BuffRideBundle
  readonly onCarryOn: () => void
  readonly onCancel: () => void
}

export default function FeltRegion({
  ui,
  dispatch,
  offered,
  legal,
  quarryToLead,
  handSummary,
  buffRide,
  onCarryOn,
  onCancel,
}: FeltRegionProps) {
  return (
    // DLR-160 AC1 — the region click is GONE (it fired `handleCarryOn` for any click in the
    // play area while a trick was held or the Quarry pending, costing the buff-arming window).
    // `TrickWell.tsx` has a real button for both states. `wc-is-waiting` went with it.
    <section className="wc-table" aria-live="polite">
      {/* `loadoutOpen(ui)` alone is not enough: the panel's OWN toggle state survives a trick
          resolving under it (nothing clears `ui.loadout`), but `loadoutDoorOpen` — the same
          gate `handleToggleLoadout` reads — goes false on exactly the four states the gallery
          must never contend with (a held reveal, an open prompt, an engine fault, a complete
          round). Reading both is what makes "the gallery can only coexist with an empty or an
          in-progress trick" true, rather than merely asserted.

          DELIBERATE, not a leak: the drawer remembers it was open. Dismissing a held reveal
          (`handleCarryOn`) does not clear `ui.loadout`, so once the door reopens between tricks
          the gallery pops back without a new tap — that is the between-tricks window the
          gallery is meant to be available in. `CancelLoadout` is the only action that closes it
          outright; see `WarCouncilRound.loadoutReopen.test.tsx` for the pinned sequence. */}
      <FeltRail
        {...feltRailProps({ ui, stageReplaced: armingSurfaceOpen(ui) || galleryOpen(ui) })}
      />
      {armingSurfaceOpen(ui) ? (
        <ArmingSurface
          {...armingSurfaceProps({
            ui,
            dispatch,
            offered,
            legal,
            riding: buffRide.riding,
            removeDisabled: buffRide.buffMotionInFlight,
            onRemoveBuff: buffRide.handleRemoveBuff,
          })}
        />
      ) : galleryOpen(ui) ? (
        <BuffGallery {...buffGalleryProps({ ui, dispatch, offered })} />
      ) : (
        <FeltStage
          {...feltStageProps({
            ui,
            dispatch,
            offered,
            quarryToLead,
            handSummary,
            onCarryOn,
            onCancel,
          })}
        />
      )}
    </section>
  )
}
