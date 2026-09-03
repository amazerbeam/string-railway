/**
 * DLR-145 — split from `playHand.ts` once that file grew past its 400-line budget
 * (`react-frontend` skill / `CLAUDE.md`) adding the `spentThisTrick` union fix. Holds the three
 * between-tricks helpers `playHand`'s driver loop calls once per open window — `seedFor`,
 * `runDiscard`, `runCheatPlay`, `runBuffWindow` — and nothing else. `playHand.ts` keeps the driver
 * loop itself, which is the part that actually needs all of these in view at once.
 */
import { containsCard, discardRefusalFor, PlayerSide, type WarCouncilState } from '../warCouncil'
import {
  apCapacityFor,
  baseDamageBonusFor,
  BuffActivationRefusal,
  MAX_CARDS_PER_DISCARD,
  playerRankTiersFor,
  type ActionPoints,
  type RunState,
} from '../hunt'
import { loadoutRefusalFor } from '../app/warCouncil/buffHandlers'
import { roundReducer } from '../app/warCouncil/roundReducer'
import {
  cheatArmed,
  curseArmed,
  discardSelecting,
  discardStock,
  loadoutOpen,
  offeredBuffs,
  RoundUiActionKind,
  type RoundUiSeed,
  type RoundUiState,
} from '../app/warCouncil/roundUiState'
import type { BuffWindowObservation, SimPolicy } from './types'

/** ONE helper for `RoundUiSeed`, mirroring exactly what `App.tsx`'s mount passes — see `plan.md`'s
 *  construction-site audit for why a fourth inline literal is how a field gets forgotten. Exported
 *  (DLR-130 Phase 4) so `fixtures.ts` builds the identical seed rather than a divergent inline
 *  literal — the same reason this stayed a single helper in the first place. Re-exported from
 *  `playHand.ts` so no existing importer (`fixtures.ts`) needed to change on the DLR-145 split. */
export function seedFor(run: RunState, dealt: WarCouncilState): RoundUiSeed {
  return {
    round: dealt,
    encounter: run.encounter,
    discardsRemaining: run.discardsRemaining,
    buffs: run.buffs,
    baseDamageBonus: baseDamageBonusFor(run),
    rankTiers: playerRankTiersFor(run),
    apCapacity: apCapacityFor(run.apCapacityBonus),
    coins: run.coins,
    feederCarry: run.feederCarry,
    streak: run.streak,
    // DLR-163 AC5/AC8 — the two per-fight figures, seeded exactly as `App.tsx`'s mount seeds
    // them. Omitting these would default both to 0 on every hand, so a simulated fight would
    // silently lose every Swap cap raise and every Treasure bonus at each hand boundary.
    discardCapBonus: run.discardCapBonus,
    treasureDamageBonus: run.treasureDamageBonus,
  }
}

interface DiscardOutcome {
  readonly ui: RoundUiState
  /** `true` only when a swap actually committed and a budget charge was spent. */
  readonly committed: boolean
}

/**
 * One optional discard, in the same between-tricks window the buff activations use — `discardStock`
 * and `buffActivationStock` read the SAME `discardWindowOpen` predicate, so there is no second
 * timing gate to keep in step. Runs BEFORE the buff window because a swap changes the hand the buff
 * decision is made against.
 *
 * Every dispatch is preceded by re-asking the engine's own refusal predicate, and any path that
 * cannot commit cancels the selection rather than leaving it open — `runBuffWindow`'s own
 * discipline, and load-bearing here because an open selection reinterprets the next hand-card tap.
 */
export function runDiscard(initial: RoundUiState, policy: SimPolicy): DiscardOutcome {
  if (policy.chooseDiscard === undefined) return { ui: initial, committed: false }
  const wanted = policy.chooseDiscard(initial)
  if (wanted.length === 0) return { ui: initial, committed: false }
  if (discardRefusalFor(discardStock(initial)) !== null) return { ui: initial, committed: false }

  let ui = roundReducer(initial, { kind: RoundUiActionKind.TapDiscard })
  if (!discardSelecting(ui)) return { ui: initial, committed: false }

  for (const card of wanted.slice(0, MAX_CARDS_PER_DISCARD)) {
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card })
  }
  if (discardRefusalFor(discardStock(ui)) !== null) {
    return { ui: roundReducer(ui, { kind: RoundUiActionKind.CancelDiscard }), committed: false }
  }

  ui = roundReducer(ui, { kind: RoundUiActionKind.TapDiscard })
  return { ui, committed: !discardSelecting(ui) }
}

interface CheatPlayOutcome {
  readonly ui: RoundUiState
  /** `true` only when the trick the Cheat was spent on actually committed and consumed a trick of
   *  `cheatTricksRemaining` — i.e. `commit` (`commitHandlers.ts`) decremented it, which it does
   *  only on a SUCCESSFUL player commit. */
  readonly spent: boolean
  /** 2026-08-25 — the AP the Cheat's own `TapBuff` commit spent, captured BEFORE the `TapCard`
   *  arm/commit below it: under `ApRefreshCadence.PerTrick` those two dispatches can cross a
   *  trick boundary and refill `apPool`, which would make a before/after diff taken any later
   *  than this undercount every spend that happened before the refill. */
  readonly apSpent: ActionPoints
}

/**
 * One optional Cheat-armed play, driven through the ordinary two-tap row flow every buff now
 * uses: `TapBuff` (poise), `TapBuff` (commit — this is where the AP is spent and
 * `cheatTricksRemaining` is set), then `TapCard` (arm), `TapCard` (commit the card the policy
 * named).
 *
 * DLR-132 — there is no give-back. Before this ticket a rejected commit handed the Cheat back to
 * `ui.cheats` through `CancelCheat`; now the trick is only spent on a SUCCESSFUL `commit`
 * (`commitHandlers.ts`'s `wasArmed` decrement), so a rejected card simply leaves
 * `cheatTricksRemaining` untouched and the Cheat stays armed for a later attempt — the same AC7
 * discipline `commit`'s own docblock records.
 */
export function runCheatPlay(initial: RoundUiState, policy: SimPolicy): CheatPlayOutcome {
  const play = policy.wantsCheatPlay?.(initial) ?? null
  const cheat =
    play === null ? undefined : offeredBuffs(initial).find((buff) => buff.id === play.cheatId)
  if (play === null || cheat === undefined) {
    return { ui: initial, spent: false, apSpent: 0 }
  }

  let ui = initial
  if (!loadoutOpen(ui)) {
    ui = roundReducer(ui, { kind: RoundUiActionKind.ToggleLoadout })
  }
  ui = roundReducer(ui, { kind: RoundUiActionKind.TapBuff, id: play.cheatId }) // poise
  ui = roundReducer(ui, { kind: RoundUiActionKind.TapBuff, id: play.cheatId }) // commit
  if (loadoutOpen(ui)) {
    ui = roundReducer(ui, { kind: RoundUiActionKind.CancelLoadout })
  }
  // Captured HERE, before the TapCard dispatches below: those can cross a trick boundary and,
  // under ApRefreshCadence.PerTrick, refill apPool — a diff taken any later would undercount.
  const apSpent = initial.buffActivation.apPool - ui.buffActivation.apPool
  if (!cheatArmed(ui)) {
    return { ui, spent: false, apSpent }
  }

  const before = ui.cheatTricksRemaining
  ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: play.card }) // arm
  ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: play.card }) // commit
  return { ui, spent: ui.cheatTricksRemaining < before, apSpent }
}

interface WindowOutcome {
  readonly ui: RoundUiState
  readonly buffsActivated: number
  readonly deadCardRefusals: number
  /** 2026-08-25 — every AP this window spent, on buffs. Safe to diff `initial`/final `apPool`
   *  directly: no `TapCard` dispatch happens inside this window, so no per-trick refill can land
   *  between the spends counted and this diff. */
  readonly apSpent: ActionPoints
  /** Every buff `offeredBuffs(initial)` held at this window's OPEN, kind and refusal together —
   *  see `BuffWindowObservation`. Independent of `policy.chooseBuffs`: recorded from `initial`,
   *  before this window's own activation loop can spend AP and shift a later buff's refusal. */
  readonly observations: readonly BuffWindowObservation[]
}

/** One between-tricks window: the policy's buff activations. Every dispatch is preceded by
 *  re-asking the engine's own refusal predicate, and a refused action is skipped rather than
 *  dispatched — the driver treats every policy answer as advisory. DLR-156 Phase 4 — the Apply
 *  Damage press this window used to try is gone with the control itself. */
export function runBuffWindow(initial: RoundUiState, policy: SimPolicy): WindowOutcome {
  let ui = initial
  let buffsActivated = 0
  let deadCardRefusals = 0
  const observations: BuffWindowObservation[] = offeredBuffs(initial).map((buff) => ({
    kind: buff.kind,
    refusal: loadoutRefusalFor(initial, buff),
    axis: buff.reward.axis,
    tier: buff.tier,
  }))

  for (const id of policy.chooseBuffs(ui)) {
    const buff = offeredBuffs(ui).find((candidate) => candidate.id === id)
    if (buff === undefined) continue
    if (!loadoutOpen(ui)) {
      ui = roundReducer(ui, { kind: RoundUiActionKind.ToggleLoadout })
    }
    let refusal = loadoutRefusalFor(ui, buff)
    if (refusal === BuffActivationRefusal.NoEffectYet) {
      deadCardRefusals += 1
    }
    if (refusal !== null) continue
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapBuff, id }) // poise
    refusal = loadoutRefusalFor(ui, buff)
    if (refusal !== null) continue
    ui = roundReducer(ui, { kind: RoundUiActionKind.TapBuff, id }) // commit
    buffsActivated += 1
  }

  if (loadoutOpen(ui)) {
    ui = roundReducer(ui, { kind: RoundUiActionKind.CancelLoadout })
  }

  // DLR-167 — a spent Curse ARMS the next hand-card tap, so the mark has to be made inside this
  // same window: leaving it armed would make the driver's own `TapCard` mark a card instead of
  // playing it. Discharged here, never left dangling. `containsCard` is re-checked because every
  // policy answer in this driver is advisory.
  if (curseArmed(ui)) {
    const hand = ui.round.hands[PlayerSide.Player]
    const wanted = policy.chooseCurseTarget?.(ui) ?? null
    const target = wanted !== null && containsCard(hand, wanted) ? wanted : (hand[0] ?? null)
    if (target !== null) {
      ui = roundReducer(ui, { kind: RoundUiActionKind.TapCard, card: target })
    }
  }

  return {
    ui,
    buffsActivated,
    deadCardRefusals,
    apSpent: initial.buffActivation.apPool - ui.buffActivation.apPool,
    observations,
  }
}
