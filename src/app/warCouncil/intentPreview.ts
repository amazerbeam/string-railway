import {
  PlayerSide,
  playCard,
  quarryIntent,
  type Card,
  type QuarryIntent,
  type WarCouncilState,
} from '../../warCouncil'
import type { TelegraphFidelity } from '../../hunt'

/**
 * The Quarry's intent for the trick the player is *about* to lead — what `quarryIntent`
 * would say once `card` has been led. Pure: builds a throwaway state through `playCard`
 * and never mutates `round`, so it is safe to call during render and under StrictMode's
 * double-invoke.
 *
 * This is what makes DLR-53 AC3 true for the following case. A follow is a function of the
 * lead, so it does not exist until a lead is chosen; asking after the player commits would
 * make the telegraph a caption on a decision already made, which is exactly the
 * "die roll resolved after you commit" that `forbidden-solitaire.md` §5/§10.5 — the
 * citation §4's visibility table rests on — says telegraphing exists to eliminate.
 *
 * Returns `null` — never throws — whenever there is no answer to give:
 * - `playCard` rejected `card`: it is not a legal move, or it is a Fox or a Woodcutter
 *   awaiting its `AbilityChoice`, so no hypothetical state exists yet.
 * - The resulting state is not the Quarry's turn (the player won the trick and leads
 *   again). `quarryIntent` makes that check its own responsibility and returns `null`.
 */
export function previewQuarryIntent(
  round: WarCouncilState,
  card: Card,
  fidelity?: TelegraphFidelity,
): QuarryIntent | null {
  const result = playCard(round, PlayerSide.Player, card)
  if (!result.ok) {
    return null
  }
  return quarryIntent(result.state, fidelity)
}
