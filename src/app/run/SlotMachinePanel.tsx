import { useRef, type KeyboardEvent } from 'react'
import {
  REEL_COUNT,
  type Buff,
  type BuffTemplate,
  type Coins,
  type SlotMachineId,
  type SlotOutcome,
  type SlotPullRefusal,
} from '../../hunt'
import { buffLine } from '../warCouncil/buffLabels'
import {
  SLOT_MACHINE_GROUP_LABEL,
  SLOT_MACHINE_NAME,
  SLOT_ODDS_GROUP_LABEL,
  SLOT_OUTCOME_LABEL,
  SLOT_PULL_LABEL,
  SLOT_REFUSAL_MESSAGE,
  SLOT_RESULT_GROUP_LABEL,
  SLOT_SECTION_LABEL,
  SLOT_SPINNING_LABEL,
  SLOT_STRIP_GROUP_LABEL,
  slotMachineAccessibleName,
  slotOddsRows,
  slotPullAccessibleName,
  slotPullPriceText,
  slotStripSummaryText,
} from './slotLabels'
import SlotReel from './SlotReel'
import SlotStripChips from './SlotStripChips'
import { SpinPhase, useSlotSpin } from './useSlotSpin'
import './shopSlot.css'
import './shopSlotCabinet.css'
import './shopSlotReel.css'

/** One resolved pull, already worded — every symbol and award reads through `slotLabels.ts` /
 *  `buffLabels.ts`, never a second grammar. */
export interface SlotPullView {
  readonly symbols: readonly BuffTemplate[]
  readonly outcome: SlotOutcome
  readonly awards: readonly Buff[]
}

export interface SlotMachinePanelProps {
  readonly machineIds: readonly SlotMachineId[]
  readonly selectedMachineId: SlotMachineId
  readonly onSelectMachine: (id: SlotMachineId) => void
  /** The chosen machine's strip, `REEL_POOL_SIZE` distinct templates, face-up. */
  readonly reel: readonly BuffTemplate[]
  readonly pullPrice: Coins
  readonly pullRefusal: SlotPullRefusal | null
  readonly onPull: () => void
  /** `null` before the first pull of this visit. */
  readonly lastPull: SlotPullView | null
}

/** Which reel windows are part of the match, so the payline can ring them. Derived from the landed
 *  symbols alone — the same comparison `resolvePull` makes, never a second rule. On an
 *  all-different pull nothing is ringed, because nothing matched. */
function matchedReels(symbols: readonly BuffTemplate[]): readonly boolean[] {
  return symbols.map((symbol) => symbols.filter((other) => other.id === symbol.id).length > 1)
}

/**
 * The shop screen's slot machine — an actual cabinet (developer direction, this pass): a lit
 * marquee naming the machine, three framed windows whose reels travel and stop one after another,
 * a payline across the middle, and a lever on the right that IS the pull control.
 *
 * Computes nothing about the GAME — every figure, refusal and label still arrives as a prop, the
 * `RunOutcomePanel` / `ShopPanel` discipline, and `useShopSlot` is still where seeding and
 * derivation live. What it does own is its own animation, through `useSlotSpin`, which is the one
 * holder of every timer here and clears them on unmount.
 *
 * Two things the cabinet must not cost, both `game-ux` floor:
 * - The face-up strip stays face-up, below the cabinet, never behind hover — it is what the pull
 *   decision is made on.
 * - The match reads without colour or motion: a matched window gets a ring and a payline pip, so a
 *   still greyscale frame of a landed pull still shows which reels agreed.
 *
 * The machine chooser is a `role="radiogroup"` with a roving tabindex: exactly one control is a tab
 * stop, arrow keys move AND select (wrapping), `Home`/`End` jump to the ends — WAI-ARIA's
 * automatic-activation radio behaviour. The empty collection is guarded BEFORE any indexing.
 */
export default function SlotMachinePanel({
  machineIds,
  selectedMachineId,
  onSelectMachine,
  reel,
  pullPrice,
  pullRefusal,
  onPull,
  lastPull,
}: SlotMachinePanelProps) {
  const chooserRef = useRef<HTMLDivElement>(null)
  const spin = useSlotSpin(REEL_COUNT)
  const spinning = spin.phase === SpinPhase.Spinning

  function focusMachineAt(index: number) {
    const buttons = chooserRef.current?.querySelectorAll<HTMLButtonElement>('button')
    buttons?.[index]?.focus()
  }

  function handleChooserKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (machineIds.length === 0) return
    const currentIndex = machineIds.indexOf(selectedMachineId)
    let nextIndex: number | null = null
    if (event.key === 'ArrowRight') {
      nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % machineIds.length
    } else if (event.key === 'ArrowLeft') {
      nextIndex =
        currentIndex === -1 ? 0 : (currentIndex - 1 + machineIds.length) % machineIds.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = machineIds.length - 1
    }
    if (nextIndex === null) return
    event.preventDefault()
    onSelectMachine(machineIds[nextIndex])
    focusMachineAt(nextIndex)
  }

  function handlePull() {
    if (pullRefusal !== null || spinning) return
    spin.start()
    onPull()
  }

  const matched = lastPull === null ? [] : matchedReels(lastPull.symbols)
  const showResult = lastPull !== null && spin.resultVisible
  const leverLabel = spinning ? SLOT_SPINNING_LABEL : slotPullAccessibleName(pullPrice, pullRefusal)

  return (
    <section
      className="shop-slot"
      aria-label={SLOT_SECTION_LABEL}
      data-spinning={spinning ? 'true' : undefined}
    >
      <div className="shop-slot-body">
        <div className="shop-cabinet">
          {/* The marquee. With one machine on the roster it is a NAMEPLATE — no radiogroup, no
              roving tabindex, nothing to tab through; the chooser and its whole keyboard model go
              away with the second machine. With two or more it becomes the chooser again, because
              picking a machine and reading which one you are at should be the same object. The
              branch is on `SLOT_MACHINE_IDS`, so restoring a machine restores the control. */}
          {machineIds.length === 1 && (
            <div className="shop-cabinet-marquee">
              <span className="shop-cabinet-bulbs" aria-hidden="true" />
              <span className="shop-cabinet-name is-plate">{SLOT_MACHINE_NAME[machineIds[0]]}</span>
            </div>
          )}
          {machineIds.length > 1 && (
            <div
              className="shop-cabinet-marquee"
              role="radiogroup"
              aria-label={SLOT_MACHINE_GROUP_LABEL}
              ref={chooserRef}
              onKeyDown={handleChooserKeyDown}
            >
              <span className="shop-cabinet-bulbs" aria-hidden="true" />
              {machineIds.map((id) => {
                const selected = id === selectedMachineId
                return (
                  <button
                    key={id}
                    type="button"
                    className="shop-cabinet-name"
                    role="radio"
                    aria-checked={selected}
                    aria-label={slotMachineAccessibleName(id, selected)}
                    tabIndex={selected ? 0 : -1}
                    disabled={spinning}
                    onClick={() => onSelectMachine(id)}
                  >
                    {SLOT_MACHINE_NAME[id]}
                  </button>
                )
              })}
            </div>
          )}

          <div className="shop-cabinet-neck" aria-hidden="true">
            <span />
            <span />
          </div>

          <div className="shop-cabinet-case">
            <div className="shop-cabinet-window">
              {Array.from({ length: REEL_COUNT }, (_, index) => (
                <SlotReel
                  key={index}
                  strip={reel}
                  landed={lastPull?.symbols[index] ?? null}
                  index={index}
                  reelCount={REEL_COUNT}
                  spinning={spinning}
                  settled={spin.settled(index)}
                  matched={showResult && matched[index] === true}
                  spinId={spin.spinId}
                />
              ))}
              {/* The payline sits over the windows, not between them, so the three symbols read as
                  one row. Its pips are what carries the match in greyscale. */}
              <span
                className="shop-cabinet-payline"
                data-live={showResult && matched.some(Boolean) ? 'true' : undefined}
                aria-hidden="true"
              >
                {Array.from({ length: REEL_COUNT }, (_, index) => (
                  <span
                    key={index}
                    className="shop-cabinet-pip"
                    data-on={showResult && matched[index] === true ? 'true' : undefined}
                  />
                ))}
              </span>
            </div>

            <p className="shop-cabinet-plate">
              {spinning
                ? SLOT_SPINNING_LABEL
                : `${SLOT_PULL_LABEL} — ${slotPullPriceText(pullPrice)}`}
            </p>

            {/* The lever is the pull control itself — a `<button>` throughout, so it keeps its tap
                target, its focus ring and Enter/Space for free. One tap, no confirm step. Mounted
                inside the case so its boss reads as bolted through the housing. */}
            <button
              type="button"
              className="shop-cabinet-lever"
              disabled={pullRefusal !== null || spinning}
              onClick={handlePull}
              aria-label={leverLabel}
            >
              <span className="shop-cabinet-lever-arm" aria-hidden="true">
                <span className="shop-cabinet-lever-knob" />
              </span>
              <span className="shop-cabinet-lever-mount" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="shop-slot-side">
          <div className="shop-slot-panel">
            <h3 className="shop-slot-panel-head">{SLOT_STRIP_GROUP_LABEL}</h3>
            {/* Face-up, always visible, never behind hover — it is what the pull decision needs.
                Chips rather than sentences; the full wording rides on each chip. */}
            <SlotStripChips reel={reel} />
            <p className="shop-slot-strip-summary">{slotStripSummaryText()}</p>
          </div>

          {/* The odds, as three rows rather than one dense sentence — the shape a payout table
              takes on a real cabinet, and readable at a glance. Every figure is still derived. */}
          <div className="shop-slot-panel">
            <h3 className="shop-slot-panel-head">{SLOT_ODDS_GROUP_LABEL}</h3>
            <ul className="shop-slot-odds">
              {slotOddsRows().map((row) => (
                <li key={row.outcome} data-outcome={row.outcome}>
                  <span className="shop-slot-odds-match">{row.match}</span>
                  <span className="shop-slot-odds-pays">{row.pays}</span>
                  <span className="shop-slot-odds-chance">{row.chance}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="shop-slot-result" role="group" aria-label={SLOT_RESULT_GROUP_LABEL}>
            {showResult ? (
              <>
                <p className="shop-slot-outcome" data-outcome={lastPull.outcome}>
                  {SLOT_OUTCOME_LABEL[lastPull.outcome]}
                </p>
                <ul className="shop-slot-awards">
                  {lastPull.awards.map((award) => (
                    <li key={award.id}>{buffLine(award)}</li>
                  ))}
                </ul>
              </>
            ) : (
              spinning && <p className="shop-slot-no-pull">{SLOT_SPINNING_LABEL}</p>
            )}
          </div>
        </div>
      </div>

      {/* The reason a pull is refused is a sentence on the face of the screen — but only when there
          IS one. Nothing renders to say nothing is wrong. */}
      {pullRefusal !== null && (
        <p className="shop-refusal" role="status">
          {SLOT_REFUSAL_MESSAGE[pullRefusal]}
        </p>
      )}
    </section>
  )
}
