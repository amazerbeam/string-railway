import { useReducer, type ReactNode } from 'react'
import type { RoundState } from '../../warCouncil'
import type { WarCouncilMountProps } from '../warCouncilMount'
import { CardArtSheet } from './CardArtSheet'
import { MotionAnchorProvider } from './MotionAnchors'
import { createRoundUiState } from './roundUiState'
import { roundReducer } from './roundReducer'
import { SuitSymbolSheet } from './SuitMark'
import { useCardMotionDriver } from './useCardMotionDriver'
import { useTrickDwell } from './useTrickDwell'
import WarCouncilTable from './WarCouncilTable'
import './warCouncilMotion.css'

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
 * the reducer and `WarCouncilTable` (the felt, the hand, the action bar, and — since DLR-160's
 * widening — the pot card that shows a resolution's build-up and its apply-or-roll choice), ALWAYS
 * mounted. Every derivation the felt needs was moved WHOLESALE to `WarCouncilTable.tsx` — no
 * behaviour changed in that move.
 *
 * DLR-160 AC11, widened by the same ticket's own follow-up — before this, the resolution screen
 * was a SECOND full-viewport screen, then a fixed corner overlay, then a flex child of
 * `.wc-dossier`. It is now folded INTO `WarCouncilTable`'s own pot card (`PotCard.tsx`) rather than
 * layered over the table at all — this component's only remaining job for it is computing WHEN it
 * should show (`showResolution` below) and handing the gated value down as a prop; `WarCouncilTable`
 * decides how.
 *
 * DLR-156 play-test fix 1 — `useTrickDwell` is the ONE exception to this component being the
 * effect-free reducer owner the rest of this docblock describes: `ui.resolution` going non-null
 * used to reveal `TrickResolutionScreen` in the very next paint, before the felt ever rendered
 * the just-played card sitting in the well (`ui.resolvedTrick`, set in the SAME transition). The
 * dwell holds the felt showing that card for one beat first, so it is seen landing before the
 * panel appears over it — it delays whether the panel renders, never the reducer transition
 * itself. See `useTrickDwell.ts`'s own docblock for why the timer lives there rather than here or
 * in the reducer.
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
  encounter,
  maxHealth,
  runLabel,
  coins,
  quarryLabel,
  discardsRemaining,
  baseDamageBonus,
  buffs,
  apCapacity,
  rankTiers,
  feederCarry,
  streak,
  discardCapBonus,
  treasureDamageBonus,
  onComplete,
}: WarCouncilMountProps) {
  const [ui, dispatch] = useReducer(
    roundReducer,
    {
      round: initialState,
      encounter,
      discardsRemaining,
      baseDamageBonus,
      buffs,
      apCapacity,
      rankTiers,
      coins,
      feederCarry,
      streak,
      // DLR-163 AC5/AC8 — the two per-fight figures this hand opens on.
      discardCapBonus,
      treasureDamageBonus,
    },
    createRoundUiState,
  )

  const showResolution = useTrickDwell(ui.resolution !== null)

  return (
    // DLR-157 — one registry per round, so the table and the resolution screen resolve every
    // place a card can be against the same anchor map.
    <MotionAnchorProvider>
      {/* `useCardMotionDriver` reads the registry `MotionAnchorProvider` owns, so it must run in
          a component BELOW the provider — this component itself renders the provider, so the
          driver cannot be called in its own body. */}
      <RoundMotionDriver round={ui.round}>
        {/* Rendered here, ABOVE the switch, rather than inside either screen: both need the same
            sprite defs (a played card renders on both). Since DLR-160's Task 13, the table and
            the resolution panel mount SIMULTANEOUSLY (the panel overlays the table rather than
            replacing it), so this hoisting is no longer "for no cost" — it is what prevents a
            real duplicate-id collision between two mounted copies of the same sprite defs. */}
        <SuitSymbolSheet />
        <CardArtSheet />
        {/* DLR-160 AC11, widened — the table is ALWAYS mounted; the resolution now folds into its
            own pot card rather than overlaying it as a second element. The felt needs nothing new
            disabling: `canAct` is already false while `ui.resolvedTrick !== null`, so no hand card
            is tappable while the pot card's foot is showing. And the table is no longer torn down
            and remounted at every trick, which means `useTableCardMotion` and `useCardMotionDriver`
            keep their identity across a resolution. `showResolution` is the ONE gate — the trick
            dwell — for whether the pot card shows its body/foot at all. */}
        <WarCouncilTable
          ui={ui}
          dispatch={dispatch}
          maxHealth={maxHealth}
          runLabel={runLabel}
          coins={coins}
          quarryLabel={quarryLabel}
          resolution={ui.resolution !== null && showResolution ? ui.resolution : null}
          onComplete={onComplete}
        />
      </RoundMotionDriver>
    </MotionAnchorProvider>
  )
}

/** DLR-157 — mounts `useCardMotionDriver` as a descendant of `MotionAnchorProvider`, so it can
 *  resolve the registry the provider owns. Renders nothing of its own; `round` is the only thing
 *  it watches. */
function RoundMotionDriver({
  round,
  children,
}: {
  readonly round: RoundState
  readonly children: ReactNode
}) {
  useCardMotionDriver(round)
  return children
}
