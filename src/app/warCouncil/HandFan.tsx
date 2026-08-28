import { useId } from 'react'
import { containsCard, isPrimed, sameCard, type Card } from '../../warCouncil'
import type { CardDamagePreview } from './cardDamage'
import type { CardBuffLight } from './buffRideModel'
import { cardDamageGlyphText, cardDamageText, cardKey } from './labels'
import PlayingCard from './PlayingCard'
import { useRovingTabIndex } from './useRovingTabIndex'

interface HandFanProps {
  readonly hand: readonly Card[]
  readonly legal: readonly Card[]
  readonly armed: Card | null
  readonly interactive: boolean
  readonly hint: string
  readonly rejected: boolean
  readonly promptOpen: boolean
  /** DLR-90 AC2 — the marks, so the fan can draw them. Passed rather than derived: this component
   *  computes nothing about a card's state, exactly as it takes `legal` from the engine rather
   *  than comparing suits itself. */
  readonly primedCards: readonly Card[]
  /** DLR-90 AC2 — a hand-card tap MARKS rather than plays. While true, every held card is a valid
   *  target INCLUDING one illegal to play: marking is not a move, and the item exists precisely to
   *  give a card the player expects to lose with a reason to be played. Read from the reducer's own
   *  `timebombArmed` predicate, never re-derived here. */
  readonly timebombArmed: boolean
  /** DLR-100 — the discard selection is open. Mirrors `timebombArmed`'s role: while true, every
   *  held card is a valid tap target, including one illegal to play, because discarding is not a
   *  move. Read from the reducer's own `discardSelecting` predicate, never re-derived here. */
  readonly discardSelecting: boolean
  /** DLR-100 — the cards currently toggled into the open selection, so the fan can mark them. */
  readonly discardSelection: readonly Card[]
  /** DLR-117 — this card's win/lose preview, or `null` when there is nothing to preview.
   *  REQUIRED and deliberately NOT defaulted, for the reason `projectedDepletion`'s fifth
   *  parameter is required (`duelHealthBars.ts`): a defaulted stub is exactly how a preview
   *  silently stops previewing. Asked as a callback rather than taken as an array so this
   *  component still computes nothing about a card's state, exactly as it takes `legal` from
   *  the engine rather than comparing suits itself. */
  readonly damageForCard: (card: Card) => CardDamagePreview | null
  /** DLR-153 — this card's lit state, or `null` when no riding buff reaches it. REQUIRED and
   *  deliberately NOT defaulted, for the reason `damageForCard`'s docblock gives: a defaulted stub
   *  is exactly how a readout silently stops reading out. A callback rather than an array so this
   *  component still computes nothing about a card's state. */
  readonly buffLightForCard: (card: Card) => CardBuffLight | null
  /** DLR-153 AC13/AC14 — switches the breakdown's target to THIS card on a real mouse hover or
   *  keyboard focus. REQUIRED and deliberately NOT defaulted, mirroring `buffLightForCard`'s own
   *  docblock: a defaulted stub here is exactly how a hovered card silently stops switching the
   *  breakdown, which is the regression this fix closes — `onEnterCard` existed on the hook from
   *  the start but was never wired to a single production card. Gated on `playable` at the call
   *  site below (DLR-153 hand-gate fix), the SAME gate `buffCount` uses — rules-legality only, NOT
   *  `interactive` — so a card that is genuinely illegal to play (AC3) never becomes the
   *  breakdown's target, but a card between tricks (when `interactive` is false) still can. */
  readonly onCardEnter: (card: Card) => void
  /** The paired leave, wired for every card regardless of `illegal` — it only ever cancels or
   *  schedules a close the hook already owns, so calling it for a card that was never the target
   *  is inert. */
  readonly onCardLeave: () => void
  readonly onTap: (card: Card) => void
  readonly onCancel: () => void
}

/**
 * The hand row (AC1): every card in `hand` renders as a `PlayingCard` in a
 * plain flex row — this component computes no geometry of its own, and no
 * longer carries any placement style at all. Legality is always the engine's
 * answer (`containsCard(legal, card)`), never a local suit or rank comparison.
 *
 * DLR-149 follow-up — the fan is retired. It used to rotate each card, arc it
 * on a lift curve, pull it left over its neighbour with a negative margin and
 * stack the slots by `z-index`. The overlap made a slice of every card's
 * visible face hit-test to the WRONG card: aiming at the left edge of the card
 * beside an armed one landed on the armed card, which plays it rather than
 * changing the selection. The row is gapped instead (`warCouncilHand.css`), so
 * a card's face and its tap target are the same rectangle. The armed card's
 * stacking is owned once, by CSS (`.wc-fan .wc-card.wc-is-armed`), because it
 * only matters while that card is scaled past its resting box.
 *
 * The roving tabindex itself — exactly one card a tab stop, arrow keys among
 * the legal cards only (a `disabled` button cannot take focus, so an
 * illegal card is skipped rather than becoming a dead stop) — is
 * `useRovingTabIndex`, shared with `AbilityPrompt`'s choice row. Focus moves
 * imperatively inside that hook's keydown handler rather than from an
 * effect reacting to a focus-index state change — this component uses no
 * lifecycle effect of any kind.
 *
 * DLR-117 wraps each card in a `.wc-fan-slot` column so the damage strip can sit beneath the
 * card rather than on its face — all four corners of the face are taken (rank, skull, primed
 * mark, ability pip) and the centre is the suit mark. `useRovingTabIndex`'s `focusIndex` uses
 * `groupRef.current.querySelectorAll('button')`, a DESCENDANT query, so the extra element
 * leaves the arrow-key order and count exactly as they were; the strip is a `<span>` and
 * never enters that list.
 */
export default function HandFan({
  hand,
  legal,
  armed,
  interactive,
  hint,
  rejected,
  promptOpen,
  primedCards,
  timebombArmed,
  discardSelecting,
  discardSelection,
  damageForCard,
  buffLightForCard,
  onCardEnter,
  onCardLeave,
  onTap,
  onCancel,
}: HandFanProps) {
  // Guards against `containsCard(legal, undefined)` — safe today only because `interactive`
  // is always false once `hand.length === 0`, and cheap enough not to rely on that staying true.
  // While timebombArmed or discardSelecting, every held card is a valid target — including one
  // illegal to play — so the `containsCard` term drops out rather than gating focusability a
  // second way.
  const isFocusable = (index: number) =>
    hand[index] !== undefined &&
    interactive &&
    (timebombArmed || discardSelecting || containsCard(legal, hand[index]))

  const { groupRef, tabStopIndex, handleKeyDown } = useRovingTabIndex(
    hand.length,
    isFocusable,
    onCancel,
  )

  // Mirrors the mockup's own hint-class cascade exactly: a rejection always wins, an armed
  // card is the only other state that gets the "live" treatment, and every other hint (a
  // resolved trick, an open prompt, or whose turn it is) renders in the plain style.
  const hintClassName = `wc-hand-hint${rejected ? ' wc-is-reject' : armed ? ' wc-is-live' : ''}`

  // Stable per mount and unique across mounts, so two fans could coexist without their
  // description ids colliding. `cardKey` is unique within one hand.
  const damageIdBase = useId()

  return (
    <>
      <p className={hintClassName} aria-live="polite">
        {hint}
      </p>
      <div
        ref={groupRef}
        // `wc-is-inert` marks "no card here is tappable right now" — which is a different
        // thing from "this card is an illegal choice", and the stylesheet suppresses the
        // illegal grey inside it for that reason. Purely presentational: every card is
        // `disabled` either way, so nothing about behaviour or the accessible tree changes.
        // `wc-is-marking` is the same idea for DLR-90's own mode — presentational only,
        // changing nothing about behaviour or the accessible tree, so the stylesheet can
        // distinguish "pick a card to prime" from ordinary play.
        className={`wc-fan${interactive ? '' : ' wc-is-inert'}${timebombArmed ? ' wc-is-marking' : ''}${discardSelecting ? ' wc-is-discarding' : ''}`}
        role="group"
        aria-label="Your hand"
        // While a Fox/Woodcutter prompt is open, AbilityPrompt renders every remaining hand
        // card again as a live, enabled choice with the same accessible name — hiding the
        // now-inert fan here is what keeps a flat accessible-tree scan from meeting each
        // name twice. Every other non-interactive state (the CPU's turn, a held trick) has
        // no such duplicate, so the fan stays announced then.
        aria-hidden={promptOpen || undefined}
        onKeyDown={handleKeyDown}
      >
        {hand.map((card, index) => {
          const isArmed = armed !== null && sameCard(armed, card)
          const damage = damageForCard(card)
          const damageId = `${damageIdBase}-${cardKey(card)}`
          // DLR-153 — rules-legality ONLY: may this card be PLAYED this trick? This is the
          // question AC3 asks ("an illegal card never lights"), and it is deliberately NOT the
          // same question `illegal` below asks, which ALSO folds in whether the player may tap
          // right now (`interactive`). Condition buffs are activatable ONLY between tricks, which
          // is exactly the window `interactive` is false in — gating the light on `interactive`
          // made the lit hand unreachable in the one window it exists for. `playable` is what the
          // light, the buff count/estimate, and the hover/focus breakdown target all gate on now;
          // `illegal` still folds in `interactive` for `PlayingCard`'s own tappability, unchanged.
          const playable = timebombArmed || discardSelecting || containsCard(legal, card)
          const illegal = !interactive || !playable
          const light = buffLightForCard(card)

          return (
            <div
              key={cardKey(card)}
              className="wc-fan-slot"
              // DLR-153 — lets `useBuffBreakdownAnchor` find this card's own DOM node to measure
              // its centre against, without a second ref map threaded down from `WarCouncilRound`.
              data-buff-anchor={cardKey(card)}
              // DLR-153 Fix 1 — the actual seam AC13/AC14's hover bridge needs. `onPointerEnter`/
              // `onFocus` mirror `useCardTip`'s own `pointerType === 'mouse'` gate: a touch tap
              // must not also register as a stuck hover a touch device can never "leave", and a
              // keyboard user reaches the same switch through focus, which React bubbles here from
              // the card's own button (focus/blur are the two React events that DO bubble). Gated
              // on `playable`, NOT `!illegal` — condition buffs activate only between tricks, when
              // `interactive` (and so `illegal`) is false, and the breakdown is exactly what a
              // player reads while deciding what to activate in that window.
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse' && playable) onCardEnter(card)
              }}
              onFocus={() => {
                if (playable) onCardEnter(card)
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === 'mouse') onCardLeave()
              }}
            >
              <PlayingCard
                card={card}
                variant="hand"
                armed={isArmed}
                illegal={illegal}
                primed={isPrimed(primedCards, card)}
                discardSelected={containsCard(discardSelection, card)}
                tabIndex={index === tabStopIndex ? 0 : -1}
                describedBy={damage === null ? undefined : damageId}
                buffCount={playable && light !== null ? light.count : undefined}
                buffEstimate={playable && light !== null ? light.estimate : undefined}
                onTap={onTap}
              />
              {damage !== null && (
                <span
                  id={damageId}
                  className={`wc-card-damage${damage.exact ? '' : ' wc-is-estimate'}`}
                >
                  <span aria-hidden="true">{cardDamageGlyphText(damage)}</span>
                  <span className="wc-sr-only">{cardDamageText(damage)}</span>
                </span>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
