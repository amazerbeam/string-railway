import { BuffRunKind } from './buffGalleryModel'
import { RUN_LABEL, RUN_SUIT } from './buffRunLabels'
import { SuitMark } from './SuitMark'

interface BuffRunTabProps {
  readonly kind: BuffRunKind
  readonly held: number
}

const RUN_CLASS: Readonly<Record<BuffRunKind, string>> = {
  [BuffRunKind.Bells]: 'wc-runtab-bells',
  [BuffRunKind.Keys]: 'wc-runtab-keys',
  [BuffRunKind.Moons]: 'wc-runtab-moons',
  // DLR-162 — the wild run borrows the suitless tab's styling: it too shows no suit mark
  // (`RUN_SUIT` is a `Partial` and has no wild row), and a fourth tab colour is a visual judgement
  // the developer owns rather than one to invent here.
  [BuffRunKind.Wild]: 'wc-runtab-suitless',
  [BuffRunKind.Suitless]: 'wc-runtab-suitless',
  [BuffRunKind.Press]: 'wc-runtab-press',
}

/**
 * A card-shaped CELL that labels a run, never a row — a suit header was tried on the mockup and
 * did not fit the panel's measured width. A **`<div>`, not a `<button>`**: it is not a control,
 * and `useRovingTabIndex` indexes `groupRef.current.querySelectorAll('button')` positionally, so
 * any extra button inside the group would silently break arrow-key traversal.
 *
 * `aria-hidden` — the held count is already in each card's own accessible name, and the visual
 * grouping is a sighted-scanning aid only. Solid border for `Press` (it names an ACTION), dashed
 * for the other four (they name the absence, or presence, of a target suit).
 */
export default function BuffRunTab({ kind, held }: BuffRunTabProps) {
  const suit = RUN_SUIT[kind]
  return (
    <div className={`wc-runtab ${RUN_CLASS[kind]}`} aria-hidden="true">
      {suit !== undefined && <SuitMark suit={suit} />}
      <span className="wc-runtab-label">{RUN_LABEL[kind]}</span>
      <span className="wc-runtab-count">{held} held</span>
    </div>
  )
}
