import { buffConditionSentence, buffName } from '../warCouncil/buffLabels'
import CardFace from './ManageBuffsCardFace'
import type { HeldBuffStack } from './heldBuffs'
import '../warCouncil/warCouncilBuffCard.css'

/**
 * 2026-09-01 — one held card, as the shop's "What you hold" tray draws it.
 *
 * A `<li>` wrapping a plain, non-interactive face, and that is the whole reason this component
 * exists rather than reusing `BuffCard.tsx`: nothing on this screen can activate a buff, and a card
 * rendered as a button is an affordance that lies. The face itself is `ManageBuffsCardFace` — 37
 * lines of frame class, suit/wild/none slot, tier numeral, count badge, name, condition and payoff
 * that were duplicated line-for-line here until DLR-162's fix pass. That component was extracted in
 * DLR-162 and then not used here; this is that extraction finished.
 *
 * `warCouncilBuffCard.css` sizes `.wc-buffcard` as a GRID ITEM in the gallery, so it collapses to a
 * zero-width dot in any other container. `shopHeld.css` states the width explicitly for that
 * reason, through the `.shop-held-card .wc-buffcard` descendant selector this nesting preserves.
 */
export default function HeldBuffCard({ stack }: { readonly stack: HeldBuffStack }) {
  const { buff, count } = stack

  return (
    // The pile is described once, in full, on the list item — the tray has no hover and no tap, so
    // there is nowhere else for this to live, and the face below is `aria-hidden` throughout.
    <li
      className="shop-held-card"
      aria-label={`${buffName(buff)} — ${buffConditionSentence(buff)}${count > 1 ? `, ${count} held` : ''}`}
    >
      <CardFace buff={buff} count={count} />
    </li>
  )
}
