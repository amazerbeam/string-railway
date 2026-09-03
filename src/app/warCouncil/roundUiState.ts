/**
 * The felt's UI state, its seed, its actions, and the pure predicates over it — everything the
 * reducer operates ON, separated from the reducer that operates on it.
 *
 * Split out of `roundReducer.ts` on DLR-90, once that file neared its 400-line budget.
 * The seam is deliberate rather than arbitrary — this file
 * is what a COMPONENT imports (the state shape, the action kinds, the predicates it renders from),
 * and `roundReducer.ts` is the transition function nothing but the mount needs. Nothing here
 * decides anything.
 */
import {
  currentTurn,
  PlayerSide,
  RoundPhase,
  type AbilityChoice,
  type Card,
  type DiscardStock,
  type IllegalMoveReason,
  type Suit,
  type TrickCard,
  type TrickResolution,
  type WarCouncilState,
} from '../../warCouncil'
import {
  activatableBuffs,
  buffActivationStockFor,
  BuffKind,
  isEncounterResolved,
  type Buff,
  type BuffActivationState,
  type BuffActivationStock,
  type BuffId,
  type Coins,
  type EncounterState,
  type RankTierTable,
} from '../../hunt'
import type { BuffHandState } from './buffRoundState'
import type { ResolutionView } from './resolutionView'

export interface ResolvedTrick {
  readonly cards: readonly TrickCard[] // [lead, follow] — the engine's load-bearing order
  readonly winner: PlayerSide
  /** What the trick did to the bank, the streak and both bars. */
  readonly resolution: TrickResolution
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
  /** DLR-92 AC4 — the base-damage bonus in force for this hand, mirrored from the mount's opening
   *  prop. Read-only for the hand's whole life: no action ever writes it, because a hand cannot
   *  spend or change a Whetstone — only the shop between hands can. */
  readonly baseDamageBonus: number
  /** DLR-122 AC2/AC3 — the player's bought ability ladder, in force for this hand, mirrored from
   *  the mount's opening prop. Read-only for the hand's whole life for `baseDamageBonus`'s stated
   *  reason: no action ever writes it, because a hand cannot buy a tier — only the shop between
   *  fights can. */
  readonly rankTiers: RankTierTable
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
   *  Run state carried for the life of the hand: the hand owns it for its whole life and hands the
   *  survivor back through `WarCouncilRoundResult`. */
  readonly discardsRemaining: number
  /** DLR-163 AC5 — the fight's Swap cap bonus, mirrored from the mount's opening prop and climbed
   *  by each Woodcutter the player commits. Run state carried for the life of the hand and handed
   *  back through `WarCouncilRoundResult` — the same contract `discardsRemaining` documents. */
  readonly discardCapBonus: number
  /** DLR-163 AC8 — base damage earned this FIGHT so far. Mirrored from the mount's opening prop
   *  and climbed by each banked trick that carried a Treasure. Unlike `baseDamageBonus` above,
   *  which is a Whetstone figure a hand cannot change, this one IS written during a hand. */
  readonly treasureDamageBonus: number
  /** DLR-163 AC6 — the Swap pile climbed on the last committed card, so the control marks where
   *  the addition went. Set by `commit` and cleared by the next commit, NOT by a timer: a
   *  timeout-driven flash would need cleanup, would double-fire under StrictMode's development
   *  double-mount, and would strand the mark if the felt unmounted mid-flash. */
  readonly swapJustRaised: boolean
  /** DLR-163 AC7 — the suit a skull was minted into on the last committed transition, or `null`.
   *  Set by `commit` from a comparison of `skulledCards` before and after, and cleared by the
   *  next commit — a plain value, not a ref, so StrictMode's double render recomputes the same
   *  answer and no timer needs cancelling. */
  readonly skullArrivedIn: Suit | null
  /** DLR-100 — the hand's OWN transient: dies on remount, never touches `RunState`. `null` when
   *  the discard rail is closed; an array (possibly empty) while it is open, holding the hand
   *  cards currently toggled in. ONE field rather than a boolean-plus-array pair: two independent
   *  fields would admit "closed but holding a stale selection". */
  readonly discardSelection: readonly Card[] | null
  /** DLR-114 — the run's owned buff pile at the START of this hand, mirrored from the mount's
   *  prop. Run state carried for the life of the hand — the same contract `discardsRemaining`
   *  documents. NEVER written by an action: a hand spends action points, not cards. DLR-132 —
   *  Cheat is a pile member like every other buff, so this is the only field that
   *  carries it into or out of a hand. */
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
   *  whole life, exactly as `baseDamageBonus` is: a hand cannot spend coins, only the shop can. */
  readonly coins: Coins
  /** DLR-156 AC3/AC14 — the resolution screen's whole content, or `null` while the felt is up.
   *  ONE nullable field rather than a boolean-plus-payload pair, exactly as `discardSelection`
   *  and `loadout` are, so "screen closed but holding a stale trick" is unexpressible. Set by
   *  `commit` on the `null` -> non-null edge of `resolvedTrick`; cleared by `ApplyPot` and
   *  `RollOver`. */
  readonly resolution: ResolutionView | null
  /** DLR-167 AC3 — the Curse that has been PAID FOR and is waiting for a hand card, or `null`.
   *  Holds the `Buff` itself rather than a figure, because `curseRewardOf` needs the TIER when the
   *  cursed trick resolves. The hand's OWN transient: dies on remount, never touches `RunState`. */
  readonly curseArmedBuff: Buff | null
}

// `ResolutionView` lives in `resolutionView.ts` now (DLR-160 — this file was at its 400-line
// budget) and is re-exported here so no importer has to know the seam moved.
export type { ResolutionView } from './resolutionView'

/** DLR-114 — `null` when the loadout panel is closed; an object (with `poised: null`) while it is
 *  open. ONE nullable field rather than a boolean-plus-id pair: two fields would admit "closed but
 *  holding a stale poise". Mirrors `discardSelection`'s `null` / `[]` shape exactly. */
export interface LoadoutSelection {
  readonly poised: BuffId | null
}

// `RoundUiSeed` and `createRoundUiState` live in `roundUiSeed.ts` now (DLR-150 — this file was at
// its 400-line budget) and are re-exported here so no importer has to know the seam moved.
export type { RoundUiSeed } from './roundUiSeed'
export { createRoundUiState } from './roundUiSeed'

// `chooseCpuMove` throws rather than returning a rejection when the CPU has no legal
// move (`lowestCard([])` is `undefined`, then `card.rank` throws), so the reducer guards
// before calling it and names that case separately from a `playCard` rejection.
export type CpuFault = IllegalMoveReason | 'noLegalMove'

export const RoundUiActionKind = {
  TapCard: 'tapCard',
  ChooseAbility: 'chooseAbility',
  CancelSelection: 'cancelSelection',
  CarryOn: 'carryOn',
  TapDiscard: 'tapDiscard',
  CancelDiscard: 'cancelDiscard',
  ToggleLoadout: 'toggleLoadout',
  CancelLoadout: 'cancelLoadout',
  TapBuff: 'tapBuff',
  /** AC18 — `Escape` unwinds ONE level: this drops an unspent poise and leaves the panel open.
   *  `CancelLoadout` keeps meaning "close outright", which is what the bar's toggle dispatches. */
  CancelBuffPoise: 'cancelBuffPoise',
  /** DLR-153 AC10 — take an activated CONDITION buff back off the trick. Distinct from
   *  `CancelBuffPoise`, which drops an UNSPENT poise: this reverses a COMMITTED activation, which
   *  the ruleset had no way to do before this ticket (`the-hunt.md`, "no way to un-activate"). */
  RemoveBuff: 'removeBuff',
  /** DLR-156 AC5 — deal the pot, zero the streak, close the resolution screen. */
  ApplyPot: 'applyPot',
  /** DLR-156 AC6 — leave the streak standing, close the resolution screen. Also the hurt
   *  branch's only exit ("Onward"), where the streak is already zero. */
  RollOver: 'rollOver',
} as const
export type RoundUiActionKind = (typeof RoundUiActionKind)[keyof typeof RoundUiActionKind]

export type RoundUiAction =
  | { readonly kind: typeof RoundUiActionKind.TapCard; readonly card: Card }
  | { readonly kind: typeof RoundUiActionKind.ChooseAbility; readonly choice: AbilityChoice }
  | { readonly kind: typeof RoundUiActionKind.CancelSelection }
  | { readonly kind: typeof RoundUiActionKind.CarryOn }
  | { readonly kind: typeof RoundUiActionKind.TapDiscard }
  | { readonly kind: typeof RoundUiActionKind.CancelDiscard }
  | { readonly kind: typeof RoundUiActionKind.ToggleLoadout }
  | { readonly kind: typeof RoundUiActionKind.CancelLoadout }
  | { readonly kind: typeof RoundUiActionKind.TapBuff; readonly id: BuffId }
  | { readonly kind: typeof RoundUiActionKind.CancelBuffPoise }
  | { readonly kind: typeof RoundUiActionKind.RemoveBuff; readonly id: BuffId }
  | { readonly kind: typeof RoundUiActionKind.ApplyPot }
  | { readonly kind: typeof RoundUiActionKind.RollOver }

/** `true` when the next committed card should ignore follow-suit. EXPORTED so the mount computes
 *  its `legal` set from the SAME predicate the reducer commits with — two readings of "is the
 *  Cheat armed" is exactly how a fan's greying and a rejection reason drift apart. DLR-132 — a
 *  live Cheat is now a COUNT of tricks still owed, not a two-stage selection. */
export function cheatArmed(state: RoundUiState): boolean {
  return state.cheatTricksRemaining > 0
}

/** DLR-167 AC3 — a Curse has been paid for and the next hand tap MARKS rather than plays. */
export function curseArmed(state: RoundUiState): boolean {
  return state.curseArmedBuff !== null
}

/** Either half of "a hand tap is already claimed by a Curse" — armed and waiting, or a card already
 *  marked. Both the disabled row and the reducer branch read THIS, never one half, so a row's
 *  greyed state and the reducer's guard cannot disagree. */
export function curseLive(state: RoundUiState): boolean {
  return curseArmed(state) || state.round.cursedCards.length > 0
}

/** The felt is waiting on the player's own card — nothing is held, nothing is prompting, the
 *  engine has not faulted, the hand and the fight are both still live, and it is their turn.
 *
 *  EXPORTED and moved here from `roundReducer.ts` on DLR-94, because `WarCouncilRound.tsx` was
 *  recomputing the identical six clauses inline as `interactive`. Two readings of one gate is how
 *  a greyed control and a reducer branch drift apart — the same reason `cheatArmed` above is
 *  exported rather than recomputed in the component. */
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

/** `true` once the mode is open — "is a hand-card tap reinterpreted", for a MULTI-card selection
 *  rather than an ordinary play. */
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
 *  the rail control's disabled state cannot read availability differently. */
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
 *  DLR-132 — **Cheat** is the one exception, and it is inherited rather than new: its retired
 *  felt-rail widget (`CheatSlots`) was never gated on `discardWindowOpen` at all — it read its own
 *  `interactive` prop, which was `canAct(ui)` — for the reason its docblock gave: "cannot be armed
 *  into a moment where no card can be played." Folding it into the ordinary row list must not
 *  narrow that reach to *between* tricks, because the ONE moment a Cheat has value is FOLLOWING an
 *  already-committed lead — exactly the moment `discardWindowOpen` is false and `canAct` is true.
 *  Gating Cheat on `discardWindowOpen` would make its follow-suit break unreachable at the only
 *  trick it could matter, which is a functional regression, not a stricter rule.
 *
 *  2026-08-26 — the exception is Cheat's ALONE. Every other activated row takes the ordinary
 *  between-tricks window: a card that arms an effect BEFORE the player commits has no business
 *  being armable after the Quarry has led, because that would let the player see the lead first —
 *  a read the card was never meant to buy.
 *
 *  EXPORTED so `handleTapBuff`'s COMMITTING tap threads the SAME window into `activateFromPile` —
 *  `activateBuff` re-checks the window itself and throws on a refusal, so a caller that asked this
 *  one question via `loadoutRefusalFor` and then a DIFFERENT one at the commit is exactly the
 *  "two readings of one gate" failure this codebase's every other stock function is written to
 *  prevent; here it would surface as a thrown `RangeError` on the second tap. */
export function buffActivationWindowOpen(state: RoundUiState, buff: Buff): boolean {
  return buff.kind === BuffKind.Cheat ? canAct(state) : discardWindowOpen(state)
}

/** DLR-126 — the stock's remaining fields are DELEGATED to `buffActivationStockFor` rather
 *  than restated here. This function previously built the literal itself, which meant a field
 *  added to `BuffActivationStock` needed the same edit in two places and could be given two
 *  different answers. The felt's only contribution is the window;
 *  everything else is `src/hunt/`'s own state to read. */
export function buffActivationStock(
  state: RoundUiState,
  activation: BuffActivationState,
  buff: Buff,
): BuffActivationStock {
  // DLR-167 — the felt's own `curseLive` fact joins the window as the second thing only this layer
  // can know. `buffActivationStockFor` folds in the KIND term, so this passes the plain fact.
  return buffActivationStockFor(
    activation,
    buff,
    buffActivationWindowOpen(state, buff),
    curseLive(state),
  )
}
