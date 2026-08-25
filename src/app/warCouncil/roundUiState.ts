/**
 * The felt's UI state, its seed, its actions, and the pure predicates over it — everything the
 * reducer operates ON, separated from the reducer that operates on it.
 *
 * Split out of `roundReducer.ts` on DLR-90: that file had reached 382 of its 400-line budget
 * before Timebomb's handlers were written. The seam is deliberate rather than arbitrary — this file
 * is what a COMPONENT imports (the state shape, the action kinds, the predicates it renders from),
 * and `roundReducer.ts` is the transition function nothing but the mount needs. Nothing here
 * decides anything.
 */
import {
  currentTurn,
  PlayerSide,
  RoundPhase,
  type AbilityChoice,
  type ApplyDamageStock,
  type Card,
  type DiscardStock,
  type IllegalMoveReason,
  type TrickCard,
  type TrickResolution,
  type WarCouncilState,
} from '../../warCouncil'
import {
  activatableBuffs,
  buffActivationStockFor,
  BuffKind,
  hasPendingApplyPayout,
  isEncounterResolved,
  ALL_BRONZE,
  startBuffActivation,
  STARTING_AP,
  type ActionPoints,
  type Buff,
  type BuffActivationState,
  type BuffActivationStock,
  type BuffId,
  type Coins,
  type EncounterState,
  type RankTierTable,
  type TimebombDamage,
  type TrickPayoutEvent,
} from '../../hunt'
import { startBuffHand, type BuffHandState } from './buffRoundState'

export interface ResolvedTrick {
  readonly cards: readonly TrickCard[] // [lead, follow] — the engine's load-bearing order
  readonly winner: PlayerSide
  /** What the trick did to the bank, the streak and both bars. */
  readonly resolution: TrickResolution
  /** DLR-119 — what the fold that produced this trick's damage did to a queued Apply Damage
   *  payout. `null` on every trick that neither settled nor destroyed one. Set by `commit`, which
   *  is where the fold happens; `deriveResolvedTrick` runs BEFORE the fold and always writes
   *  `null`. */
  readonly payout: TrickPayoutEvent | null
  /** DLR-132 — the damage pair a Timebomb booked by THIS trick will detonate for, or `null` when
   *  the trick booked none. Carried on the app-layer `ResolvedTrick` rather than on the engine's
   *  `TrickResolution`, deliberately: a Timebomb's tier is the spent CARD's, which `src/warCouncil/`
   *  never sees and must not learn. `commit` is what knows it, and `commit` is what builds this. */
  readonly timebombDamage: TimebombDamage | null
}

export interface RoundUiState {
  readonly round: WarCouncilState
  readonly armed: Card | null // tapped once, lifted, awaiting its second tap
  readonly prompt: Card | null // a Fox or Woodcutter awaiting its AbilityChoice
  readonly resolvedTrick: ResolvedTrick | null // held on screen until CarryOn
  readonly rejection: IllegalMoveReason | null // the player's own illegal move — recoverable
  readonly cpuFault: CpuFault | null // a corrupt CPU turn — a bug, shown not swallowed
  /** The live encounter. Never null: seeded from the mount's prop and updated in place as each
   *  trick resolves, because AC6 and AC8 make the cash-out automatic and mid-hand. Replaces the
   *  nullable `applied`, which existed only to model "the player has pressed Apply". */
  readonly encounter: EncounterState
  /** This hand's OPENING encounter, frozen at mount and never written again — the baseline the
   *  hand-over panel's tally is a delta against.
   *
   *  It is state rather than the mount's `encounter` prop deliberately. On the hand that ends the
   *  encounter, `App` sets its own encounter from `onComplete` and then returns early WITHOUT
   *  changing the `key` that would remount this component — so the prop becomes the live value
   *  underneath a panel that is still on screen, and a prop-based delta silently collapses to
   *  zero. Freezing the baseline here makes the tally independent of anything the parent does
   *  after the hand is over. */
  readonly openingEncounter: EncounterState
  /** DLR-132 — tricks of no-follow-suit still owed by an activated Cheat. `0` when none is live. A
   *  COUNT, not a stage: `CHEAT_DURATION_TRICKS` makes a Cheat's tier its duration, and a boolean
   *  could only ever express bronze. Set by `handleTapBuff` at the spend, to
   *  `cheatDurationTricksOf(buff)`; decremented by `commit` on each successful player commit. */
  readonly cheatTricksRemaining: number
  /** DLR-132 — the damage pair of a Timebomb that has been PAID FOR and is waiting for a hand card
   *  to prime, or `null`. Carries the pair rather than a boolean because the figure depends on the
   *  spent card's tier and nothing downstream can recover it. Set by `handleTapBuff` at the spend;
   *  cleared to `null` the moment a hand-card tap primes a card (`primeTapped`). */
  readonly timebombArmedDamage: TimebombDamage | null
  /** DLR-132 — the damage pair a primed card will detonate for, or `null` when nothing is primed
   *  this hand. Held for the hand; a second Timebomb primed in the same hand overwrites it
   *  (`plan.md` → Assumptions — only one tier is remembered per hand). */
  readonly primedTimebombDamage: TimebombDamage | null
  /** DLR-91 AC4 — mirrored from the mount's opening prop and flipped to `false` the moment a
   *  resolved trick reports `blastGuardSpent`. Run state carried for the life of the hand, the
   *  same contract `blastGuardHeld` and `discardsRemaining` below document. */
  readonly blastGuardHeld: boolean
  /** DLR-92 AC4 — the bank-climb bonus in force for this hand, mirrored from the mount's opening
   *  prop. Read-only for the hand's whole life: no action ever writes it, because a hand cannot
   *  spend or change a Whetstone — only the shop between hands can. */
  readonly bankClimbBonus: number
  /** DLR-122 AC2/AC3 — the player's bought ability ladder, in force for this hand, mirrored from
   *  the mount's opening prop. Read-only for the hand's whole life for `bankClimbBonus`'s stated
   *  reason: no action ever writes it, because a hand cannot buy a tier — only the shop between
   *  fights can. */
  readonly rankTiers: RankTierTable
  /** DLR-94 — the Apply Damage plate has been tapped once and awaits its confirming second tap.
   *  The hand's OWN transient: dies on remount, never touches `RunState`.
   *
   *  A single BOOLEAN, unlike the two-tap poise-then-spend gesture every buff row (Cheat and
   *  Timebomb included) uses: Apply Damage's second tap IS the action, so "poised" is the only
   *  state there is to be in. */
  readonly applyPoised: boolean
  /** DLR-95 AC2 — the player's hand size at the FIRST transition after which the encounter reads
   *  resolved, frozen from then on. `null` until then, and `null` for a hand that never ends the
   *  fight.
   *
   *  FROZEN rather than re-derived at `onComplete` time, and that is load-bearing. The live hand
   *  length happens to give the same answer today only because `canAct` goes false once the
   *  encounter resolves, so nothing further can be played — correctness that rests on an unrelated
   *  predicate staying false is correctness that breaks silently. The same reasoning
   *  `openingEncounter` above already documents. */
  readonly unplayedAtResolve: number | null
  /** DLR-100 AC5 — mirrored from the mount's opening prop, decremented on each committed discard.
   *  Run state carried for the life of the hand — the same contract `blastGuardHeld` documents. */
  readonly discardsRemaining: number
  /** DLR-100 — the hand's OWN transient: dies on remount, never touches `RunState`. `null` when
   *  the discard rail is closed; an array (possibly empty) while it is open, holding the hand
   *  cards currently toggled in. ONE field rather than a boolean-plus-array pair: two independent
   *  fields would admit "closed but holding a stale selection". */
  readonly discardSelection: readonly Card[] | null
  /** DLR-114 — the run's owned buff pile at the START of this hand, mirrored from the mount's
   *  prop. Run state carried for the life of the hand — the same contract `blastGuardHeld`
   *  documents. NEVER written by an action: a hand spends action points, not cards. DLR-132 —
   *  Cheat and Timebomb are pile members like every other buff, so this is the only field that
   *  carries either one into or out of a hand. */
  readonly buffs: readonly Buff[]
  /** DLR-114 — the hand's action-point pool AND this trick's activations, as one value.
   *  REPLACES DLR-109's separate `apPool: ActionPoints`, which was a second number claiming to be
   *  the same pool: Apply Damage spent from that one and `activateBuff` spends from this one, and
   *  two pools diverge the first time one is spent without the other. Seeded by
   *  `startBuffActivation()` at mount, which IS the per-hand refresh because `App.tsx` remounts
   *  the felt per hand (`key={hand}`) — the identical argument the old `apPool` seed made. */
  readonly buffActivation: BuffActivationState
  /** DLR-114 — `null` when the loadout panel is closed; an object while it is open, holding the
   *  buff awaiting its confirming second tap (or `null` for "open, nothing poised"). ONE nullable
   *  field rather than a boolean-plus-id pair: two fields would admit "closed but holding a stale
   *  poise". Mirrors `discardSelection`'s `null` / `[]` shape exactly. The hand's OWN transient —
   *  dies on remount, never touches `RunState`. */
  readonly loadout: LoadoutSelection | null
  /** DLR-125 — this hand's buff bookkeeping. See `buffRoundState.ts`'s module docblock for why it
   *  is a separate module. */
  readonly buffHand: BuffHandState
  /** DLR-125 — the run's purse at the START of this hand, for Miser. Read-only for the hand's
   *  whole life, exactly as `bankClimbBonus` is: a hand cannot spend coins, only the shop can. */
  readonly coins: Coins
}

/** DLR-114 — `null` when the loadout panel is closed; an object (with `poised: null`) while it is
 *  open. ONE nullable field rather than a boolean-plus-id pair: two fields would admit "closed but
 *  holding a stale poise". Mirrors `discardSelection`'s `null` / `[]` shape exactly. */
export interface LoadoutSelection {
  readonly poised: BuffId | null
}

export interface RoundUiSeed {
  readonly round: WarCouncilState
  readonly encounter: EncounterState
  readonly blastGuardHeld: boolean
  readonly bankClimbBonus: number
  readonly discardsRemaining: number
  readonly buffs: readonly Buff[]
  /** DLR-116 — the per-hand AP pool including capacity bought in the shop. OPTIONAL and defaulted
   *  to STARTING_AP so every existing seed fixture reproduces the pre-DLR-116 pool exactly; the
   *  driver passes apCapacityFor(run.apCapacityBonus). */
  readonly apCapacity?: ActionPoints
  /** DLR-122 — the player's bought ability ladder. OPTIONAL and defaulted to `ALL_BRONZE` so every
   *  existing seed fixture reproduces the pre-DLR-122 game exactly; an absent table IS "nothing
   *  bought", which is what AC1 requires play identically to today. The driver passes
   *  `playerRankTiersFor(run)`. */
  readonly rankTiers?: RankTierTable
  /** DLR-125 — the run's purse at the START of this hand, for Miser. OPTIONAL and defaulted to 0
   *  so all 38 existing `createRoundUiState` fixtures reproduce today's game exactly. */
  readonly coins?: Coins
}

// `chooseCpuMove` throws rather than returning a rejection when the CPU has no legal
// move (`lowestCard([])` is `undefined`, then `card.rank` throws), so the reducer guards
// before calling it and names that case separately from a `playCard` rejection.
export type CpuFault = IllegalMoveReason | 'noLegalMove'

export const RoundUiActionKind = {
  TapCard: 'tapCard',
  ChooseAbility: 'chooseAbility',
  CancelSelection: 'cancelSelection',
  CarryOn: 'carryOn',
  TapApplyDamage: 'tapApplyDamage',
  CancelApplyDamage: 'cancelApplyDamage',
  TapDiscard: 'tapDiscard',
  CancelDiscard: 'cancelDiscard',
  ToggleLoadout: 'toggleLoadout',
  CancelLoadout: 'cancelLoadout',
  TapBuff: 'tapBuff',
} as const
export type RoundUiActionKind = (typeof RoundUiActionKind)[keyof typeof RoundUiActionKind]

export type RoundUiAction =
  | { readonly kind: typeof RoundUiActionKind.TapCard; readonly card: Card }
  | { readonly kind: typeof RoundUiActionKind.ChooseAbility; readonly choice: AbilityChoice }
  | { readonly kind: typeof RoundUiActionKind.CancelSelection }
  | { readonly kind: typeof RoundUiActionKind.CarryOn }
  | { readonly kind: typeof RoundUiActionKind.TapApplyDamage }
  | { readonly kind: typeof RoundUiActionKind.CancelApplyDamage }
  | { readonly kind: typeof RoundUiActionKind.TapDiscard }
  | { readonly kind: typeof RoundUiActionKind.CancelDiscard }
  | { readonly kind: typeof RoundUiActionKind.ToggleLoadout }
  | { readonly kind: typeof RoundUiActionKind.CancelLoadout }
  | { readonly kind: typeof RoundUiActionKind.TapBuff; readonly id: BuffId }

/** Still a pure restructuring of its seed, so StrictMode's double-invocation of the lazy
 *  `useReducer` initialiser recomputes an identical value. */
export function createRoundUiState(seed: RoundUiSeed): RoundUiState {
  return {
    round: seed.round,
    armed: null,
    prompt: null,
    resolvedTrick: null,
    rejection: null,
    cpuFault: null,
    encounter: seed.encounter,
    openingEncounter: seed.encounter,
    cheatTricksRemaining: 0,
    timebombArmedDamage: null,
    primedTimebombDamage: null,
    blastGuardHeld: seed.blastGuardHeld,
    bankClimbBonus: seed.bankClimbBonus,
    rankTiers: seed.rankTiers ?? ALL_BRONZE,
    applyPoised: false,
    unplayedAtResolve: null,
    discardsRemaining: seed.discardsRemaining,
    discardSelection: null,
    buffs: seed.buffs,
    buffActivation: startBuffActivation(seed.apCapacity ?? STARTING_AP),
    loadout: null,
    buffHand: startBuffHand(),
    coins: seed.coins ?? 0,
  }
}

/** `true` when the next committed card should ignore follow-suit. EXPORTED so the mount computes
 *  its `legal` set from the SAME predicate the reducer commits with — two readings of "is the
 *  Cheat armed" is exactly how a fan's greying and a rejection reason drift apart. DLR-132 — a
 *  live Cheat is now a COUNT of tricks still owed, not a two-stage selection. */
export function cheatArmed(state: RoundUiState): boolean {
  return state.cheatTricksRemaining > 0
}

/** `true` when the next tapped hand card should be MARKED (primed) rather than played. EXPORTED so
 *  the mount's tappability and the reducer's branch read the SAME predicate — two readings of "is
 *  Timebomb armed" is exactly how a greyed card and a reducer branch drift apart. DLR-132 — armed
 *  now means "paid for and carrying a damage pair", not a two-stage selection. */
export function timebombArmed(state: RoundUiState): boolean {
  return state.timebombArmedDamage !== null
}

/** The felt is waiting on the player's own card — nothing is held, nothing is prompting, the
 *  engine has not faulted, the hand and the fight are both still live, and it is their turn.
 *
 *  EXPORTED and moved here from `roundReducer.ts` on DLR-94, because `WarCouncilRound.tsx` was
 *  recomputing the identical six clauses inline as `interactive`. Two readings of one gate is how
 *  a greyed control and a reducer branch drift apart — the same reason `cheatArmed` and
 *  `timebombArmed` below are exported rather than recomputed in the component. */
export function canAct(state: RoundUiState): boolean {
  return (
    state.round.phase !== RoundPhase.Complete &&
    !isEncounterResolved(state.encounter) &&
    state.resolvedTrick === null &&
    state.prompt === null &&
    state.cpuFault === null &&
    currentTurn(state.round) === PlayerSide.Player
  )
}

/** The plain values `applyDamageRefusalFor` needs, assembled in ONE place so the reducer's guard
 *  and the plate's disabled state cannot read availability differently.
 *
 *  This is where the app layer's shape is translated into the pure module's — `hasPendingApplyPayout`
 *  and `canAct` are read HERE and nowhere else, which is what lets `voluntaryCashOut.ts` take four
 *  plain values and stay ignorant of both `EncounterState` and `RoundUiState`. */
export function applyDamageStock(state: RoundUiState): ApplyDamageStock {
  return {
    bank: state.round.bank,
    multiplier: state.round.multiplier,
    trickInFlight: state.round.currentTrick.length > 0,
    payoutPending: hasPendingApplyPayout(state.encounter),
    apPool: state.buffActivation.apPool,
    canAct: canAct(state),
  }
}

/** `true` while the loadout panel is open — the sibling of `discardSelecting`, and read by both
 *  the bar's `aria-pressed` and the reducer's mutual-exclusion guards so the two cannot disagree. */
export function loadoutOpen(state: RoundUiState): boolean {
  return state.loadout !== null
}

/** The buffs this hand may actually be offered: the owned pile with `BuffKind.Unassigned`
 *  placeholder content filtered out by `activatableBuffs`, so `apCostOf`'s `RangeError` can never
 *  reach a render. Stated ONCE here so the panel's rows and `handleTapBuff`'s guard cannot
 *  disagree about which buffs exist. */
export function offeredBuffs(state: RoundUiState): readonly Buff[] {
  return activatableBuffs(state.buffs)
}

/** `true` once the mode is open — mirrors `timebombArmed`'s "is a hand-card tap reinterpreted" role,
 *  but for a MULTI-card selection rather than a single armed target. */
export function discardSelecting(state: RoundUiState): boolean {
  return state.discardSelection !== null
}

/** AC1 — the moment the action is available, independent of whose turn it is. Deliberately does
 *  NOT read `canAct`/`currentTurn`: this is what reaches the Quarry-to-lead gap, where `canAct` is
 *  false because the Quarry, not the player, is next to move — but the trick has not started. */
export function discardWindowOpen(state: RoundUiState): boolean {
  return (
    state.round.phase !== RoundPhase.Complete &&
    !isEncounterResolved(state.encounter) &&
    state.round.currentTrick.length === 0 &&
    state.resolvedTrick === null &&
    state.prompt === null &&
    state.cpuFault === null
  )
}

/** The plain values `discardRefusalFor` needs, assembled in ONE place so the reducer's guard and
 *  the rail control's disabled state cannot read availability differently — the same discipline
 *  `applyDamageStock` above documents. */
export function discardStock(state: RoundUiState): DiscardStock {
  return {
    discardsRemaining: state.discardsRemaining,
    selecting: discardSelecting(state),
    selectionSize: state.discardSelection?.length ?? 0,
    windowOpen: discardWindowOpen(state),
  }
}

/** AC1 — the Apply Buff window is the DISCARD window for every condition/consumable card. No
 *  second timing gate is built for those: this reads `discardWindowOpen` and nothing else, exactly
 *  as `discardStock` above does, so the two actions cannot disagree about when the felt is between
 *  tricks.
 *
 *  DLR-132 — Cheat and Timebomb are the one exception, and it is inherited rather than new: their
 *  retired felt-rail widgets (`CheatSlots`, `TimebombCharge`) were never gated on
 *  `discardWindowOpen` at all — each read its own `interactive` prop, which was `canAct(ui)` — for
 *  the reason both docblocks gave: "cannot be armed into a moment where no card can be played."
 *  Folding both into the ordinary row list must not narrow that reach to *between* tricks, because
 *  the ONE moment either card has value is FOLLOWING an already-committed lead — exactly the
 *  moment `discardWindowOpen` is false and `canAct` is true. Gating them on `discardWindowOpen`
 *  like every other row would make a Cheat's follow-suit break unreachable at the only trick it
 *  could matter, which is a functional regression, not a stricter rule.
 *
 *  EXPORTED so `handleTapBuff`'s COMMITTING tap threads the SAME window into `activateFromPile` —
 *  `activateBuff` re-checks the window itself and throws on a refusal, so a caller that asked this
 *  one question via `loadoutRefusalFor` and then a DIFFERENT one at the commit is exactly the
 *  "two readings of one gate" failure this codebase's every other stock function is written to
 *  prevent; here it would surface as a thrown `RangeError` on the second tap. */
export function buffActivationWindowOpen(state: RoundUiState, buff: Buff): boolean {
  return buff.kind === BuffKind.Cheat || buff.kind === BuffKind.Timebomb
    ? canAct(state)
    : discardWindowOpen(state)
}

/** DLR-126 — the stock's remaining four fields are DELEGATED to `buffActivationStockFor` rather
 *  than restated here. This function previously built the literal itself, which meant a field
 *  added to `BuffActivationStock` needed the same edit in two places and could be given two
 *  different answers. The felt's only contribution is the window; everything else is
 *  `src/hunt/`'s own state to read. */
export function buffActivationStock(
  state: RoundUiState,
  activation: BuffActivationState,
  buff: Buff,
): BuffActivationStock {
  return buffActivationStockFor(activation, buff, buffActivationWindowOpen(state, buff))
}
