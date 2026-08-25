import { useRef, type KeyboardEvent } from 'react'
import {
  apCostOf,
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
  SLOT_NO_PULL_YET,
  SLOT_OUTCOME_LABEL,
  SLOT_PULL_LABEL,
  SLOT_REFUSAL_MESSAGE,
  SLOT_RESULT_GROUP_LABEL,
  SLOT_SECTION_LABEL,
  SLOT_STRIP_GROUP_LABEL,
  slotMachineAccessibleName,
  slotOddsText,
  slotPullAccessibleName,
  slotPullPriceText,
  slotSymbolText,
} from './slotLabels'
import './shopSlot.css'

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

/**
 * DLR-116 — the slot machine section of the shop screen: choose one of the two machines, read its
 * face-up strip and the posted odds, pull, and see the outcome and the cards won. Layout per this
 * contract's `mockup.html`, `.slot` section.
 *
 * Computes NOTHING — every figure, refusal and label arrives as a prop, the `RunOutcomePanel` /
 * `ShopPanel` discipline. `useShopSlot` is where the seeding, the derivation, and the two pieces
 * of presentation state live.
 *
 * The machine chooser is a `role="radiogroup"` with a roving tabindex: exactly one control is a
 * tab stop, arrow keys move AND select (wrapping), `Home`/`End` jump to the ends — the shape
 * `ShopCategoryTabs.tsx` used before it was deleted on this same ticket, adapted from manual
 * activation (tabs) to automatic activation (radios), which is the correct WAI-ARIA behaviour for
 * a radio group. The empty collection is guarded BEFORE any indexing — the second instance of the
 * `Unassigned`-class trap this contract's plan names, with a third expected.
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

  return (
    <section className="shop-slot" aria-label={SLOT_SECTION_LABEL}>
      {machineIds.length > 0 && (
        <div
          className="shop-slot-machines"
          role="radiogroup"
          aria-label={SLOT_MACHINE_GROUP_LABEL}
          ref={chooserRef}
          onKeyDown={handleChooserKeyDown}
        >
          {machineIds.map((id) => {
            const selected = id === selectedMachineId
            return (
              <button
                key={id}
                type="button"
                className="shop-slot-machine"
                role="radio"
                aria-checked={selected}
                aria-label={slotMachineAccessibleName(id, selected)}
                tabIndex={selected ? 0 : -1}
                onClick={() => onSelectMachine(id)}
              >
                {SLOT_MACHINE_NAME[id]}
              </button>
            )
          })}
        </div>
      )}

      <p className="shop-slot-odds">{slotOddsText()}</p>

      {/* Face-up, always visible, never behind hover — it is what the pull decision needs. */}
      <ul className="shop-slot-strip" aria-label={SLOT_STRIP_GROUP_LABEL}>
        {reel.map((template, index) => (
          <li key={index} className="shop-slot-symbol">
            {slotSymbolText(template)}
          </li>
        ))}
      </ul>

      <div className="shop-slot-pull">
        {/* One tap, no confirm step — this screen's most repeated action. */}
        <button
          type="button"
          className="shop-slot-pull-button"
          disabled={pullRefusal !== null}
          onClick={onPull}
          aria-label={slotPullAccessibleName(pullPrice, pullRefusal)}
        >
          {`${SLOT_PULL_LABEL} — ${slotPullPriceText(pullPrice)}`}
        </button>
        <p className="shop-refusal" role="status">
          {pullRefusal === null ? '' : SLOT_REFUSAL_MESSAGE[pullRefusal]}
        </p>
      </div>

      <div className="shop-slot-result" role="group" aria-label={SLOT_RESULT_GROUP_LABEL}>
        {lastPull === null ? (
          // An empty result area cannot be mistaken for a broken one — the rule SHOP_CATEGORY_EMPTY
          // already set for the shop's empty shelf.
          <p className="shop-slot-no-pull">{SLOT_NO_PULL_YET}</p>
        ) : (
          <>
            <p className="shop-slot-outcome">{SLOT_OUTCOME_LABEL[lastPull.outcome]}</p>
            <ul className="shop-slot-result-symbols">
              {lastPull.symbols.map((template, index) => (
                <li key={index}>{slotSymbolText(template)}</li>
              ))}
            </ul>
            <ul className="shop-slot-awards">
              {lastPull.awards.map((award) => (
                <li key={award.id}>{buffLine(award, apCostOf(award))}</li>
              ))}
            </ul>
          </>
        )}
      </div>
    </section>
  )
}
