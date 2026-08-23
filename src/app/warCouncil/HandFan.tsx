import { type CSSProperties } from 'react'
import { containsCard, isPrimed, sameCard, type Card } from '../../warCouncil'
import { fanPlacement } from './fanLayout'
import { cardKey } from './labels'
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
  readonly onTap: (card: Card) => void
  readonly onCancel: () => void
}

type FanCardStyle = CSSProperties & { '--wc-fan-rot'?: string; '--wc-fan-lift'?: string }

/**
 * The fanned hand (AC1): every card in `hand` renders as a `PlayingCard`
 * positioned by `fanPlacement` — this component computes no geometry of
 * its own. Legality is always the engine's answer (`containsCard(legal,
 * card)`), never a local suit or rank comparison.
 *
 * The roving tabindex itself — exactly one card a tab stop, arrow keys among
 * the legal cards only (a `disabled` button cannot take focus, so an
 * illegal card is skipped rather than becoming a dead stop) — is
 * `useRovingTabIndex`, shared with `AbilityPrompt`'s choice row. Focus moves
 * imperatively inside that hook's keydown handler rather than from an
 * effect reacting to a focus-index state change — this component uses no
 * lifecycle effect of any kind.
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
          const placement = fanPlacement(index, hand.length, isArmed)
          // Only custom properties go inline — the actual `transform` is a single rule in
          // warCouncilCards.css that composes this base placement with the hover/active/armed
          // states. Setting `transform` here too would always win over those external rules
          // (an inline style beats any stylesheet selector without `!important`), which is
          // exactly why the hover and armed lift never used to render.
          const style: FanCardStyle = {
            '--wc-fan-rot': `rotate(${placement.rotateDeg}deg)`,
            '--wc-fan-lift': `translateY(${placement.liftPct}%)`,
            marginLeft: `${placement.overlapPx}px`,
            zIndex: placement.zIndex,
          }

          return (
            <PlayingCard
              key={cardKey(card)}
              card={card}
              variant="hand"
              armed={isArmed}
              illegal={
                !interactive || (!timebombArmed && !discardSelecting && !containsCard(legal, card))
              }
              primed={isPrimed(primedCards, card)}
              discardSelected={containsCard(discardSelection, card)}
              tabIndex={index === tabStopIndex ? 0 : -1}
              style={style}
              onTap={onTap}
            />
          )
        })}
      </div>
    </>
  )
}
