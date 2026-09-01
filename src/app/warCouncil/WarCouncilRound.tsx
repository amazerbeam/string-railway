import { useReducer } from 'react'
import type { WarCouncilMountProps } from '../warCouncilMount'
import { CardArtSheet } from './CardArtSheet'
import { createRoundUiState } from './roundUiState'
import { roundReducer } from './roundReducer'
import { SuitSymbolSheet } from './SuitMark'
import TrickResolutionScreen from './TrickResolutionScreen'
import WarCouncilTable from './WarCouncilTable'

/**
 * The round mount, implementing SCRUM-37's `WarCouncilMountProps`. Owns exactly one piece of
 * state — the reducer below, seeded by a lazy initializer that is a pure restructuring of
 * `{ round: initialState, encounter }` (DLR-53 AC3: the Quarry's opening lead is left
 * uncommitted so it can be telegraphed before it lands; `WarCouncilTable`'s `handleCarryOn`
 * commits it). That initializer, like the reducer itself, is pure, so StrictMode's development
 * double-invocation simply recomputes an identical value. There is no effect anywhere in this
 * component: every other transition is a tap, a keypress, or a callback fired from one of the
 * felt's own controls.
 *
 * DLR-156 Task 14 — this component used to render the whole felt itself; it now owns nothing but
 * the reducer and the switch between the two full-viewport screens the felt can show:
 * `WarCouncilTable` (the felt, the hand, the action bar) while nothing is resolving, and
 * `TrickResolutionScreen` (the build-up and the apply-or-roll choice) the moment a trick resolves
 * (`ui.resolution !== null`, set by `commit` in `commitHandlers.ts`). Every derivation the felt
 * needs was moved WHOLESALE to `WarCouncilTable.tsx` — no behaviour changed in that move.
 *
 * `encounter` (the prop) is this hand's OPENING figure — `warCouncilMount.ts`'s own docblock — and
 * it is read in exactly one place: seeding the reducer. Everything else reads the reducer's own
 * state, which holds BOTH the live encounter (`ui.encounter`, updated in place as each trick's
 * damage lands, AC6/AC8) and the frozen baseline (`ui.openingEncounter`) that `handSummary` is a
 * delta against.
 *
 * The baseline is state rather than the prop because the prop is not stable for this component's
 * whole life. On the hand that ends the encounter, `handleCarryOn` calls `onComplete`, and `App`
 * adopts that encounter and returns early WITHOUT changing the `key` that would remount this
 * component — so the prop becomes the live value while the terminal panel is still on screen. A
 * prop-based delta therefore zeroed itself under the player, which is what the tally regression in
 * `WarCouncilRound.duelHealthBars.test.tsx` pins.
 */
export default function WarCouncilRound({
  initialState,
  hunt,
  encounter,
  maxHealth,
  runLabel,
  coins,
  quarryLabel,
  blastGuardHeld,
  discardsRemaining,
  baseDamageBonus,
  buffs,
  apCapacity,
  rankTiers,
  feederCarry,
  streak,
  onComplete,
}: WarCouncilMountProps) {
  const [ui, dispatch] = useReducer(
    roundReducer,
    {
      round: initialState,
      encounter,
      blastGuardHeld,
      discardsRemaining,
      baseDamageBonus,
      buffs,
      apCapacity,
      rankTiers,
      coins,
      feederCarry,
      streak,
    },
    createRoundUiState,
  )

  return (
    <>
      {/* Rendered here, ABOVE the switch, rather than inside either screen: both need the same
          sprite defs (a played card renders on both), and only one of the two screens is ever
          mounted at a time, so hoisting avoids a duplicate-id risk for no cost. */}
      <SuitSymbolSheet />
      <CardArtSheet />
      {ui.resolution !== null ? (
        <TrickResolutionScreen resolution={ui.resolution} dispatch={dispatch} />
      ) : (
        <WarCouncilTable
          ui={ui}
          dispatch={dispatch}
          hunt={hunt}
          maxHealth={maxHealth}
          runLabel={runLabel}
          coins={coins}
          quarryLabel={quarryLabel}
          onComplete={onComplete}
        />
      )}
    </>
  )
}
