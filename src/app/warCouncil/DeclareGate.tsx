import { CardRank } from '../../warCouncil'
import { HuntDeclaration, invertedCardValue, type Demand } from '../../hunt'
import { HUNT_DECLARATION_NAME } from './labels'

interface DeclareGateProps {
  readonly demand: Demand
  readonly loseCredits: number
  readonly onDeclare: (path: HuntDeclaration) => void
}

/**
 * AC1 — the declare gate, the felt cascade's first branch (`WarCouncilRound.tsx`): the
 * player's full 13-card hand renders below this, disabled but visible, rather than under a
 * modal, so nothing hides the very hand the declaration is judged against.
 *
 * Two sibling controls is under `game-ux`'s five-control threshold, so these are ordinary
 * tab stops — no roving tabindex. Computes nothing: `demand` and `loseCredits` arrive
 * already resolved from the Hunt config, and the illustrative "a 1 scores 11" reads off
 * `invertedCardValue` rather than a second, hand-written 11.
 */
export default function DeclareGate({ demand, loseCredits, onDeclare }: DeclareGateProps) {
  return (
    <div className="wc-declare">
      <p className="wc-declare-eyebrow">Before the first trick</p>
      <h2>Thirteen cards. Which way are you playing this Hunt?</h2>
      <div className="wc-declare-choices">
        <button
          type="button"
          className="wc-declare-option"
          onClick={() => onDeclare(HuntDeclaration.Win)}
        >
          <span className="wc-declare-option-name">
            Play to {HUNT_DECLARATION_NAME[HuntDeclaration.Win]}
          </span>
          <span className="wc-declare-option-body">
            Cards score their printed rank. Every trick you take adds both cards to <b>Spoils</b>.
          </span>
        </button>
        <button
          type="button"
          className="wc-declare-option wc-is-lose"
          onClick={() => onDeclare(HuntDeclaration.Lose)}
        >
          <span className="wc-declare-option-name">
            Play to {HUNT_DECLARATION_NAME[HuntDeclaration.Lose]}
          </span>
          <span className="wc-declare-option-body">
            Cards invert — a {CardRank.Swan} scores {invertedCardValue(CardRank.Swan)}. You get{' '}
            <b>{loseCredits} credits</b>, each claiming one trick you lose.
          </span>
        </button>
      </div>
      <p className="wc-declare-foot">
        Standing still comes from your trick count either way, and the Demand is still {demand}.
      </p>
    </div>
  )
}
