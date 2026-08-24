import { CHEAT_SLOT_COUNT, type CheatCard, type CheatCardId } from '../../hunt'
import { CHEAT_EMPTY_SLOT_LABEL, CHEAT_RAIL_LABEL, cheatAccessibleName } from './labels'
import { CheatStage, type CheatSelection } from './roundUiState'
import './warCouncilCheats.css'

interface CheatSlotsProps {
  /** Rendered into the first `CHEAT_SLOT_COUNT` frames, head first. Never longer than the cap —
   *  `cheats.ts` enforces that; this component asserts nothing and computes nothing. */
  readonly cheats: readonly CheatCard[]
  readonly selection: CheatSelection | null
  /** The same gate the fan uses, so a Cheat cannot be armed into a moment where no card can
   *  be played. */
  readonly interactive: boolean
  readonly onTap: (id: CheatCardId) => void
  readonly onCancel: () => void
}

/**
 * AC1 — exactly `CHEAT_SLOT_COUNT` frames, on screen during every hand whether filled or empty,
 * as the second register of the felt-left plate beneath the decree pile.
 *
 * `onClick` STOPS PROPAGATION, and that is load-bearing rather than defensive: this mounts inside
 * `.wc-table` (indirectly, via `BuffLoadoutPanel`), which fires `handleCarryOn` on click whenever
 * the felt is waiting — so without it, arming a Cheat while a trick reveal is held would also
 * clear the reveal and commit the Quarry's lead as a side effect.
 *
 * Two controls is below `game-ux`'s roving-tabindex threshold of about five, so these are plain
 * tab stops. `Escape` cancels, matching the hand fan's own keyboard contract.
 */
export default function CheatSlots({
  cheats,
  selection,
  interactive,
  onTap,
  onCancel,
}: CheatSlotsProps) {
  const frames = Array.from({ length: CHEAT_SLOT_COUNT }, (_, i) => cheats[i] ?? null)

  return (
    <div
      className="wc-cheat-rail"
      role="group"
      aria-label={CHEAT_RAIL_LABEL}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        // DLR-114 — `stopPropagation` here is new fallout from the relocation into
        // `BuffLoadoutPanel`, mirroring the `onClick` stop two lines up for the identical reason:
        // this rail now nests inside the panel's own `Escape`-closes-the-whole-panel handler, and
        // without the stop, cancelling a Cheat selection would ALSO close the panel around it.
        if (e.key === 'Escape') {
          e.stopPropagation()
          onCancel()
        }
      }}
    >
      <span className="wc-plate-label">{CHEAT_RAIL_LABEL}</span>
      <div className="wc-cheat-slots">
        {frames.map((card, index) => {
          if (card === null) {
            return (
              <span
                key={`empty-${index}`}
                className="wc-cheat-slot is-empty"
                aria-label={CHEAT_EMPTY_SLOT_LABEL}
              />
            )
          }
          const stage = selection?.id === card.id ? selection.stage : null
          return (
            <button
              key={card.id}
              type="button"
              className={`wc-cheat-slot is-held${stage ? ` is-${stage}` : ''}`}
              aria-pressed={stage === CheatStage.Armed}
              aria-label={cheatAccessibleName(stage)}
              disabled={!interactive}
              onClick={() => onTap(card.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
