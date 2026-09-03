import type { MouseEvent } from 'react'
import type { Buff } from '../../hunt'
import { isSkulled, PlayerSide, type Card, type TrickCard } from '../../warCouncil'
import { buffFiredText } from './buffFiredLabels'
import { PlaceKind } from './cardPlacement'
import { cardAccessibleName, cardKey } from './labels'
import { useMotionAnchor, useMotionAnchors } from './motionAnchorContext'
import PlayingCard from './PlayingCard'
import { TRICK_OUTCOME_WHY, TRICK_OUTCOME_WORD, trickOutcomeKindFor } from './resolutionOutcome'
import type { ResolvedTrick } from './roundUiState'

// Copy, not an engine string leaking into the UI — "Them" is never PlayerSide.Cpu rendered raw.
const SIDE_LABEL: Readonly<Record<PlayerSide, string>> = {
  [PlayerSide.Player]: 'You',
  [PlayerSide.Cpu]: 'Them',
}

interface TrickWellProps {
  readonly currentTrick: readonly TrickCard[]
  readonly resolvedTrick: ResolvedTrick | null
  /** AC3's second half — once a card is face up here, it announces its own skull. Defaults to
   *  `[]` so a caller that predates this (there is none left after this task, but the pattern
   *  matches `cardAccessibleName`'s own default) keeps compiling. */
  readonly skulledCards?: readonly Card[]
  /** DLR-119 — the pile this trick's `firedBuffIds` are resolved against. Defaults to `[]`, the
   *  same defaulting `skulledCards` already carries, so a caller that predates
   *  this keeps compiling and simply narrates nothing. */
  readonly offeredBuffs?: readonly Buff[]
  /** DLR-160 AC2 — the cards in THIS trick that carry a skull, so the well words the outcome on
   *  the same two facts `TrickResolutionScreen` does. Defaults to `[]`. */
  readonly skulledInTrick?: readonly Card[]
  readonly quarryToLead: boolean
  readonly onCarryOn: () => void
}

/**
 * The faintly-marked well at the centre of the felt (AC2). Four states:
 * a held resolved trick with its winner marked, the Quarry's chosen-but-not-yet-committed
 * lead (AC3), an in-progress trick with its lead card, or an empty well. `playCard` clears
 * `currentTrick` the instant the second card lands, so the resolved trick must be held
 * separately here — without it, the winning card would never be visible.
 */
export default function TrickWell({
  currentTrick,
  resolvedTrick,
  skulledCards = [],
  offeredBuffs = [],
  skulledInTrick = [],
  quarryToLead,
  onCarryOn,
}: TrickWellProps) {
  // A real, keyboard-reachable control rather than relying on the enclosing felt's own
  // pointer tap: while a trick is held (or the Quarry's lead is pending), every hand card
  // is disabled and nothing else in the tree is focusable, so this is the only way a
  // keyboard-only player can carry on. A plain `<button type="button" onClick>` — the same
  // shape `RoundOverPanel`'s "Finish the round" control already uses — gets native
  // focusability, the implicit button role, and native Enter/Space activation for free,
  // with no manual key handler and therefore no double-dispatch risk to guard against in
  // the first place. Shared by both branches below.
  function handleHintClick(event: MouseEvent<HTMLButtonElement>) {
    // Guards against bubbling to the felt's own onClick — a genuine concern for either
    // element choice, unrelated to native-vs-custom activation.
    event.stopPropagation()
    onCarryOn()
  }

  // DLR-157 — one place, four render branches below. Called unconditionally, before any of the
  // four early returns, and the same ref is attached to whichever single `.wc-trick-row` the
  // active branch renders.
  //
  // DOCUMENTED CARVE-OUT (QA/Defender review, DLR-157) — `cardPlacement.ts` never slots
  // `PlaceKind.TrickWell` (`placeCards(..., PlaceKind.TrickWell, /* slotted */ false)`), so every
  // movement into or out of the well resolves to this ONE row anchor regardless of which card it
  // names. For M3+M4 (both played cards leaving in the same commit, below the collapse threshold
  // so two distinct requests are emitted) this means both requests clone the SAME row element —
  // each flying clone shows the whole row, not the one card it represents. The real fix is
  // slotting `TrickWell` the way `PlayerHand` already is, which would also require re-deriving
  // `useTableCardMotion`'s M1 destination (today a deliberately unslotted `{ kind: TrickWell }`,
  // since the well has no per-card slot until the state that creates one has already committed)
  // and updating every `cardPlacement.test.ts`/`cardMotionPlan.test.ts` fixture that names this
  // place — out of reach for this fix pass without touching the pure core's already-reviewed
  // invariants for a cosmetic flight defect (the card still LANDS in the right place and the
  // right end state either way; only the clone's mid-flight appearance is wrong). Tracked as a
  // follow-up rather than fixed here.
  const trickWellRef = useMotionAnchor({ kind: PlaceKind.TrickWell })
  // AC7 — a played card currently flying INTO the well renders invisible-but-laid-out until it
  // lands, so the row it joins does not reflow.
  const { arriving } = useMotionAnchors()

  if (resolvedTrick) {
    const firedText = buffFiredText(resolvedTrick.resolution.firedBuffIds, offeredBuffs)
    // DLR-160 AC2 — the SAME two facts `TrickResolutionScreen` derives its own outcome word from,
    // read out of the SAME module, so a skull trick cannot be worded one way on the felt and
    // another on the panel.
    const outcomeKind = trickOutcomeKindFor(
      resolvedTrick.winner === PlayerSide.Player,
      resolvedTrick.cards.some((played) => isSkulled(skulledInTrick, played.card)),
    )

    return (
      <>
        <div className="wc-trick-row" ref={trickWellRef}>
          {resolvedTrick.cards.map((played) => (
            <span
              key={`${played.side}-${played.card.suit}-${played.card.rank}`}
              className={`wc-played${played.side === resolvedTrick.winner ? ' wc-is-winner' : ''}${arriving.has(cardKey(played.card)) ? ' wc-is-in-flight' : ''}`}
            >
              <span className="wc-played-side">{SIDE_LABEL[played.side]}</span>
              <PlayingCard
                card={played.card}
                variant="table"
                winner={played.side === resolvedTrick.winner}
                skulled={isSkulled(skulledCards, played.card)}
              />
            </span>
          ))}
        </div>
        {/* DLR-160 AC2 (developer red-line, 2026-09-02) — the well used to say only who
            physically took it, which is exactly the half that misleads on a skull trick. Same
            module the resolution panel reads, so one trick cannot be worded two ways. */}
        <p className="wc-well-outcome">{TRICK_OUTCOME_WORD[outcomeKind]}</p>
        <p className="wc-table-line">
          {TRICK_OUTCOME_WHY[outcomeKind]}.
          {resolvedTrick.resolution.damageToPlayer > 0 &&
            ` You take ${resolvedTrick.resolution.damageToPlayer}.`}
        </p>
        {firedText !== null && <p className="wc-buff-fired">{firedText}</p>}
        <button type="button" className="wc-carry-btn" onClick={handleHintClick}>
          Carry on
        </button>
      </>
    )
  }

  if (quarryToLead) {
    // The Quarry's lead is chosen but not committed. DLR-148 deleted the intent telegraph — this
    // copy used to point at it ("Read their intent first") and there is no longer a panel to
    // point at, so the line says only what is still true: a lead is coming and nothing more. The
    // control is a real button for the same reason the carry-on control is: while the Quarry
    // holds the turn every hand card is disabled, so this is the only thing a keyboard-only
    // player can reach.
    return (
      <>
        <div className="wc-trick-row" ref={trickWellRef} />
        {/* PLACEHOLDER COPY — the developer's to retune. */}
        <p className="wc-table-line">They are about to lead.</p>
        <button type="button" className="wc-carry-btn" onClick={handleHintClick}>
          Let them lead
        </button>
      </>
    )
  }

  if (currentTrick.length > 0) {
    const led = currentTrick[0]
    return (
      <>
        <div className="wc-trick-row" ref={trickWellRef}>
          <span className={`wc-played${arriving.has(cardKey(led.card)) ? ' wc-is-in-flight' : ''}`}>
            <span className="wc-played-side">{SIDE_LABEL[led.side]}</span>
            <PlayingCard
              card={led.card}
              variant="table"
              skulled={isSkulled(skulledCards, led.card)}
            />
          </span>
        </div>
        <p className="wc-table-line">
          {led.side === PlayerSide.Player ? 'You led' : 'They led'} {cardAccessibleName(led.card)}.
        </p>
      </>
    )
  }

  return (
    <>
      <div className="wc-trick-row" ref={trickWellRef} />
      <p className="wc-table-line">The table is yours — lead.</p>
    </>
  )
}
