import type { CSSProperties } from 'react'
import type { BuffTemplate } from '../../hunt'
import { SuitMark } from '../warCouncil/SuitMark'
import SlotGlyph from './SlotGlyph'
import { slotSymbolFace, type SlotSymbolFace } from './slotSymbols'
import { reelStopMs } from './slotSpinConfig'

interface SlotReelProps {
  /** The machine's whole strip — what this window travels through. */
  readonly strip: readonly BuffTemplate[]
  /** Where this reel comes to rest. `null` before the first pull, when the window simply shows the
   *  strip's own entry at this position rather than a landed result. */
  readonly landed: BuffTemplate | null
  readonly index: number
  readonly reelCount: number
  readonly spinning: boolean
  readonly settled: boolean
  /** `true` when this window's symbol is part of the pull's match — drawn as a ring and a payline
   *  pip, never as a hue alone. */
  readonly matched: boolean
  /** Bumped per pull, so a second pull onto the same symbol still travels. */
  readonly spinId: number
}

/** The suits come from `SuitMark`, the other three marks from `SlotGlyph` — the same two sources
 *  the strip chips read, so a chip and a window can never disagree about what a symbol looks like. */
function Glyph({ face }: { readonly face: SlotSymbolFace }) {
  if (face.glyph.kind === 'suit') {
    return <SuitMark suit={face.glyph.suit} className="shop-reel-glyph-mark" />
  }
  return <SlotGlyph kind={face.glyph.kind} className="shop-reel-glyph-mark" />
}

function ReelSymbol({ face }: { readonly face: SlotSymbolFace }) {
  return (
    <span className="shop-reel-symbol" aria-hidden="true">
      <span
        className="shop-reel-glyph"
        data-glyph={face.glyph.kind === 'suit' ? face.glyph.suit : face.glyph.kind}
      >
        <Glyph face={face} />
      </span>
      <span className="shop-reel-family">{face.family}</span>
      {/* An activated card has no reward axis at all, so nothing is drawn — never a blank row
          holding its place. */}
      {face.axis !== null && <span className="shop-reel-axis">{face.axis}</span>}
    </span>
  )
}

/**
 * One window of the cabinet, and the column of symbols that travels behind it.
 *
 * The travel is a pure CSS transform on a column built as `[...strip, ...strip, ...strip, landed]`
 * — three whole passes of the strip and then the symbol this reel actually stopped on. Animating
 * the transform (rather than swapping a symbol on a `setInterval`) makes the motion the
 * compositor's job and keeps it smooth while React is idle, and it means the reel physically
 * arrives at its result instead of cutting to it.
 *
 * `key={spinId}` on the travelling column is load-bearing: it remounts the column per pull, which
 * restarts the travel from the top even when a second pull lands on the same three symbols.
 * Without it React sees an unchanged transform and nothing moves.
 */
export default function SlotReel({
  strip,
  landed,
  index,
  reelCount,
  spinning,
  settled,
  matched,
  spinId,
}: SlotReelProps) {
  // The empty-collection guard, BEFORE any indexing — the third instance of the `Unassigned`-class
  // trap `SlotMachinePanel`'s docblock names. A machine whose strip has not been drawn yet shows a
  // dark, still window rather than throwing on `strip[NaN]`.
  const resting = landed ?? (strip.length === 0 ? null : strip[index % strip.length])
  if (resting === null) {
    return (
      <div className="shop-reel" data-empty="true">
        <span className="shop-reel-gloss" aria-hidden="true" />
      </div>
    )
  }

  const travelling = spinning && !settled
  const column: readonly SlotSymbolFace[] = [
    ...strip.map(slotSymbolFace),
    ...strip.map(slotSymbolFace),
    ...strip.map(slotSymbolFace),
    slotSymbolFace(resting),
  ]
  // Each symbol is exactly one window tall, so the resting offset is "one window per symbol above
  // the last" — handed to CSS as a custom property it turns into the translate.
  const finalOffset = column.length - 1

  return (
    <div
      className="shop-reel"
      data-matched={matched ? 'true' : undefined}
      data-spinning={travelling ? 'true' : undefined}
    >
      <div
        key={spinId}
        className="shop-reel-column"
        style={
          {
            '--reel-offset': String(finalOffset),
            '--reel-duration': `${reelStopMs(index, reelCount)}ms`,
          } as CSSProperties
        }
      >
        {column.map((face, position) => (
          <ReelSymbol key={`${face.id}-${position}`} face={face} />
        ))}
      </div>
      <span className="shop-reel-gloss" aria-hidden="true" />
    </div>
  )
}
