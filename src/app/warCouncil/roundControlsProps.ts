/**
 * DLR-114 — assembles `ActionBarProps` and `BuffGalleryProps` from the reducer's own state
 * plus the handful of values `WarCouncilRound.tsx` already derives once (interactive, the discard
 * refusal, the offered pile, the bar's own loadout refusal).
 *
 * Split out the moment the two controls' prop objects pushed `WarCouncilRound.tsx` over its
 * 400-line budget — the same reason `discardHandlers.ts` and `roundBars.ts` were split out before
 * it. This file decides nothing: every value it reads is either the reducer's own state or an
 * already-derived value the caller passes in via a single named-fields options object below —
 * unlike `playOptions` in `commitHandlers.ts`, which derives `PlayCardOptions` from `RoundUiState`
 * alone, these two also need caller-supplied values (`dispatch`, `handleTap`, the already-derived
 * refusals) that are not part of `RoundUiState`, so they cannot be reduced to a single state
 * argument the same way — hence the options object here, rather than that precedent's shape.
 *
 * Both take one options object rather than positional parameters deliberately: `ActionBarOptions`
 * alone carries same-shaped nullable refusal values (`loadoutRefusal`, `discardRefusal`) that would
 * transpose silently as positional arguments at the multi-line call site in `WarCouncilRound.tsx` —
 * TypeScript cannot catch two same-typed values swapped by position, but a mislabelled field is a
 * compile error.
 */
import { createElement, type ReactNode } from 'react'
import type { Buff, BuffActivationRefusal } from '../../hunt'
import {
  CardRank,
  isPrimed,
  RoundPhase,
  sameCard,
  type AbilityChoice,
  type Card,
  type DiscardRefusal,
} from '../../warCouncil'
import AbilityPrompt from './AbilityPrompt'
import type { ActionBarProps } from './ActionBar'
import type { BuffGalleryProps } from './BuffGallery'
import { loadoutRefusalFor } from './buffHandlers'
import { buildBuffGallery } from './buffGalleryModel'
import type { FeltRailProps } from './FeltRail'
import type { FeltStageProps } from './FeltStage'
import type { HandSummary } from './RoundOverPanel'
import RoundOverPanel from './RoundOverPanel'
import TrickWell from './TrickWell'
import { trickConsequence, trickConsequenceFacts } from './trickConsequenceModel'
import {
  discardSelecting,
  loadoutOpen,
  RoundUiActionKind,
  type RoundUiAction,
  type RoundUiState,
} from './roundUiState'

export interface BuffGalleryOptions {
  readonly ui: RoundUiState
  readonly dispatch: (action: RoundUiAction) => void
  readonly offered: readonly Buff[]
}

export function buffGalleryProps({ ui, dispatch, offered }: BuffGalleryOptions): BuffGalleryProps {
  return {
    // The ONE reading of the window, through the gate `buffActivationWindowOpen` already owns.
    // Twelve of the thirteen live cards are `discardWindowOpen` (between tricks); Cheat alone
    // is `canAct`, because the one moment a Cheat has value is FOLLOWING an already-committed
    // lead. This ticket reads that gate and does not move it.
    view: buildBuffGallery(offered, (buff) => loadoutRefusalFor(ui, buff)),
    poised: ui.loadout?.poised ?? null,
    onTapBuff: (id) => dispatch({ kind: RoundUiActionKind.TapBuff, id }),
    onCancelPoise: () => dispatch({ kind: RoundUiActionKind.CancelBuffPoise }),
    onClose: () => dispatch({ kind: RoundUiActionKind.CancelLoadout }),
  }
}

export interface ActionBarOptions {
  readonly ui: RoundUiState
  readonly dispatch: (action: RoundUiAction) => void
  readonly handleTap: (card: Card) => void
  readonly offered: readonly Buff[]
  readonly loadoutRefusal: BuffActivationRefusal | null
  readonly interactive: boolean
  readonly discardRefusal: DiscardRefusal | null
}

export function actionBarProps({
  ui,
  dispatch,
  handleTap,
  offered,
  loadoutRefusal,
  interactive,
  discardRefusal,
}: ActionBarOptions): ActionBarProps {
  return {
    offeredBuffs: offered,
    loadoutOpen: loadoutOpen(ui),
    loadoutRefusal,
    armed: ui.armed,
    cardsEnabled: interactive,
    discardsRemaining: ui.discardsRemaining,
    discardSelecting: discardSelecting(ui),
    discardSelectionSize: ui.discardSelection?.length ?? 0,
    discardRefusal,
    onToggleLoadout: () => dispatch({ kind: RoundUiActionKind.ToggleLoadout }),
    onPlayArmed: () => {
      if (ui.armed !== null) handleTap(ui.armed)
    },
    onTapSwap: () => dispatch({ kind: RoundUiActionKind.TapDiscard }),
    onCancelSwap: () => dispatch({ kind: RoundUiActionKind.CancelDiscard }),
  }
}

export interface FeltRailOptions {
  readonly ui: RoundUiState
  /** `true` while the gallery holds the stage — the rail's trick strip renders only then, since
   *  the stage's own `TrickWell` shows the cards otherwise. */
  readonly galleryOpen: boolean
}

export function feltRailProps({ ui, galleryOpen }: FeltRailOptions): FeltRailProps {
  return {
    decree: ui.round.decree,
    trumpSuit: ui.round.trumpSuit,
    drawPileCount: ui.round.drawPile.length,
    decreePrimed: isPrimed(ui.round.primedCards, ui.round.decree),
    spentCount: ui.round.spentPile.length,
    reshuffled: ui.round.reshuffled,
    trick: galleryOpen ? ui.round.currentTrick : null,
    skulledCards: ui.round.skulledCards,
    primedCards: ui.round.primedCards,
    // The ONE reading of the readout's facts — built here so the rail and any future consumer
    // cannot read the trick differently, mirroring `trickConsequenceFacts`'s own stated reason.
    consequence: trickConsequence(trickConsequenceFacts(ui)),
  }
}

export interface FeltStageOptions {
  readonly ui: RoundUiState
  readonly dispatch: (action: RoundUiAction) => void
  readonly offered: readonly Buff[]
  readonly quarryToLead: boolean
  readonly handSummary: HandSummary
  readonly displayHand: readonly Card[]
  readonly onCarryOn: () => void
  readonly onCancel: () => void
}

/**
 * The felt's own branch chain — fault, held reveal, round over, ability prompt, in-progress trick
 * — moved VERBATIM out of `WarCouncilRound.tsx` (DLR-148's 400-line pass). The ORDERING is
 * load-bearing and unchanged: the held reveal is checked BEFORE `roundComplete` so the deciding
 * sixth trick is shown at all, before the hand-over panel replaces it.
 *
 * Built with `createElement` rather than JSX — this file is `.ts`, not `.tsx`, matching every
 * other builder here (`actionBarProps`, `buffGalleryProps`), and `FeltStage.tsx`'s own docblock
 * explains why the branches live here rather than in a second component.
 */
export function feltStageProps({
  ui,
  dispatch,
  offered,
  quarryToLead,
  handSummary,
  displayHand,
  onCarryOn,
  onCancel,
}: FeltStageOptions): FeltStageProps {
  const roundComplete = ui.round.phase === RoundPhase.Complete
  let felt: ReactNode

  if (ui.cpuFault) {
    felt = createElement(
      'p',
      { className: 'wc-fault', role: 'alert' },
      'The engine rejected the opponent’s own move — reason: ',
      ui.cpuFault,
      '. That is a bug, not a rule, so play stops here rather than retrying.',
    )
  } else if (ui.resolvedTrick) {
    // Held regardless of `roundComplete` — the deciding sixth trick resolves and completes the
    // hand in the same reducer transition, so without this branch running first the winning card
    // of the final trick would never be shown.
    felt = createElement(TrickWell, {
      currentTrick: ui.round.currentTrick,
      resolvedTrick: ui.resolvedTrick,
      skulledCards: ui.round.skulledCards,
      primedCards: ui.round.primedCards,
      offeredBuffs: offered,
      quarryToLead,
      onCarryOn,
    })
  } else if (roundComplete) {
    felt = createElement(RoundOverPanel, {
      tricksWon: ui.round.tricksWon,
      handSummary,
      onFinish: onCarryOn,
    })
  } else if (ui.prompt) {
    const promptCard = ui.prompt
    felt = createElement(AbilityPrompt, {
      card: promptCard,
      decree: ui.round.decree,
      hand: displayHand.filter((c) => !sameCard(c, promptCard)),
      drawnCard: promptCard.rank === CardRank.Woodcutter ? (ui.round.drawPile[0] ?? null) : null,
      primedCards: ui.round.primedCards,
      onChoose: (choice: AbilityChoice) =>
        dispatch({ kind: RoundUiActionKind.ChooseAbility, choice }),
      onCancel,
    })
  } else {
    felt = createElement(TrickWell, {
      currentTrick: ui.round.currentTrick,
      resolvedTrick: null,
      skulledCards: ui.round.skulledCards,
      primedCards: ui.round.primedCards,
      offeredBuffs: offered,
      quarryToLead,
      onCarryOn,
    })
  }

  return { children: felt }
}
