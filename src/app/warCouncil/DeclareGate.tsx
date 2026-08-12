import { CardRank } from '../../warCouncil'
import { HuntDeclaration, invertedCardValue } from '../../hunt'
import { HUNT_DECLARATION_NAME } from './labels'

interface DeclareGateProps {
  readonly onDeclare: (path: HuntDeclaration) => void
}

/**
 * AC1 — the declare gate, the felt cascade's first branch (`WarCouncilRound.tsx`): the
 * player's full 13-card hand renders below this, disabled but visible, rather than under a
 * modal, so nothing hides the very hand the declaration is judged against.
 *
 * Two sibling controls is under `game-ux`'s five-control threshold, so these are ordinary
 * tab stops — no roving tabindex. Computes nothing: the illustrative "a 1 scores 11" reads
 * off `invertedCardValue` rather than a hand-written 11. The Demand and the Lose-credit pool
 * — both once quoted here by number — were retired on DLR-67.
 */
export default function DeclareGate({ onDeclare }: DeclareGateProps) {
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
            Cards invert — a {CardRank.Swan} scores {invertedCardValue(CardRank.Swan)}. Every trick
            you take still adds both its cards to your <b>Spoils</b>, at those inverted values.
          </span>
        </button>
      </div>
      <p className="wc-declare-foot">
        Standing still comes from your trick count either way — but the two paths band it
        differently.
      </p>
    </div>
  )
}
