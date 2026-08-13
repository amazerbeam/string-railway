import { type CSSProperties } from 'react'
import { containsCard, sameCard, type Card } from '../../warCouncil'
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
  onTap,
  onCancel,
}: HandFanProps) {
  // Guards against `containsCard(legal, undefined)` — safe today only because `interactive`
  // is always false once `hand.length === 0`, and cheap enough not to rely on that staying true.
  const isFocusable = (index: number) =>
    hand[index] !== undefined && interactive && containsCard(legal, hand[index])

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
        className={`wc-fan${interactive ? '' : ' wc-is-inert'}`}
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
              illegal={!interactive || !containsCard(legal, card)}
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
