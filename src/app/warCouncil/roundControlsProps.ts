/**
 * DLR-114 — assembles `ActionBarProps` and `BuffLoadoutPanelProps` from the reducer's own state
 * plus the handful of values `WarCouncilRound.tsx` already derives once (interactive, the Apply
 * Damage cash/refusal, the discard refusal, the offered pile, the bar's own loadout refusal).
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
 * alone carries three same-shaped nullable refusal values (`loadoutRefusal`, `applyRefusal`,
 * `discardRefusal`) that would transpose silently as positional arguments at the multi-line call
 * site in `WarCouncilRound.tsx` — TypeScript cannot catch two same-typed values swapped by
 * position, but a mislabelled field is a compile error.
 */
import { apCostOf, type Buff, type BuffActivationRefusal } from '../../hunt'
import type { ApplyDamageRefusal, Card, DiscardRefusal } from '../../warCouncil'
import type { ActionBarProps } from './ActionBar'
import type { BuffLoadoutPanelProps } from './BuffLoadoutPanel'
import { loadoutRefusalFor } from './buffHandlers'
import {
  discardSelecting,
  loadoutOpen,
  RoundUiActionKind,
  type RoundUiAction,
  type RoundUiState,
} from './roundUiState'

export interface BuffLoadoutPanelOptions {
  readonly ui: RoundUiState
  readonly dispatch: (action: RoundUiAction) => void
  readonly offered: readonly Buff[]
}

export function buffLoadoutPanelProps({
  ui,
  dispatch,
  offered,
}: BuffLoadoutPanelOptions): BuffLoadoutPanelProps {
  return {
    buffs: offered,
    activation: ui.buffActivation,
    poised: ui.loadout?.poised ?? null,
    refusalFor: (buff) => loadoutRefusalFor(ui, buff),
    apCostFor: apCostOf,
    onTapBuff: (id) => dispatch({ kind: RoundUiActionKind.TapBuff, id }),
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
  readonly applyCash: number
  readonly applyRefusal: ApplyDamageRefusal | null
  readonly discardRefusal: DiscardRefusal | null
}

export function actionBarProps({
  ui,
  dispatch,
  handleTap,
  offered,
  loadoutRefusal,
  interactive,
  applyCash,
  applyRefusal,
  discardRefusal,
}: ActionBarOptions): ActionBarProps {
  return {
    apPool: ui.buffActivation.apPool,
    offeredBuffs: offered,
    loadoutOpen: loadoutOpen(ui),
    loadoutRefusal,
    armed: ui.armed,
    cardsEnabled: interactive,
    discardsRemaining: ui.discardsRemaining,
    discardSelecting: discardSelecting(ui),
    discardSelectionSize: ui.discardSelection?.length ?? 0,
    discardRefusal,
    applyCashValue: applyCash,
    applyPoised: ui.applyPoised,
    applyRefusal,
    pendingPayout: ui.encounter.pendingApplyPayout,
    onToggleLoadout: () => dispatch({ kind: RoundUiActionKind.ToggleLoadout }),
    onPlayArmed: () => {
      if (ui.armed !== null) handleTap(ui.armed)
    },
    onTapSwap: () => dispatch({ kind: RoundUiActionKind.TapDiscard }),
    onCancelSwap: () => dispatch({ kind: RoundUiActionKind.CancelDiscard }),
    onTapApplyDamage: () => dispatch({ kind: RoundUiActionKind.TapApplyDamage }),
    onCancelApplyDamage: () => dispatch({ kind: RoundUiActionKind.CancelApplyDamage }),
  }
}
