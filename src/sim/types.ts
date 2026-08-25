import type { AbilityChoice, Card, RoundState } from '../warCouncil'
import type {
  BuffActivationRefusal,
  BuffId,
  BuffKind,
  BuffRewardAxis,
  BuffTemplate,
  BuffTier,
  RunState,
  ShopItem,
  SlotMachineId,
} from '../hunt'
import type { RoundUiState } from '../app/warCouncil/roundUiState'

/** A card and, for a Fox or a Woodcutter, the ability choice that must accompany it. Exactly
 *  `CpuMove`'s shape, so `chooseCpuMove` satisfies it without a wrapper. */
export interface CardChoice {
  readonly card: Card
  readonly choice?: AbilityChoice
}

/** One between-fights action a policy wants. Executed defensively: the driver re-asks the
 *  engine's own refusal predicate and skips a refused action rather than throwing. */
export type ShopAction =
  | { readonly kind: 'buy'; readonly item: ShopItem }
  | { readonly kind: 'pull'; readonly machineId: SlotMachineId }
  | { readonly kind: 'flask' }

/** A Cheat buff to spend from the pile and the off-suit card to play with it. Named TOGETHER,
 *  deliberately: arming a Cheat and then playing a card that was follow-suit-legal anyway spends
 *  the card for nothing, which would report the Cheat as harmful rather than as unexercised.
 *  DLR-132 — `cheatId` is now a `BuffId`: the Cheat is an ordinary pile member spent through
 *  `TapBuff`, not a rail card with its own id space. */
export interface CheatPlay {
  readonly cheatId: BuffId
  readonly card: Card
}

/** The simulated player. Every method is PURE: it reads state and returns a decision, and the
 *  driver decides whether the decision is legal. */
export interface SimPolicy {
  readonly name: string
  /** Which card to play, with its ability choice. Called only when `canAct(ui)` holds.
   *
   *  `ui` is OPTIONAL and additive (2026-08-25): a policy that coordinates its card with the buffs
   *  it armed this trick needs `buffActivation.activatedThisTrick`, which `RoundState` does not
   *  carry. A one-parameter implementation still satisfies this type, so `baselinePolicy` and every
   *  other existing policy are unchanged and keep ignoring it. */
  chooseCard(round: RoundState, ui?: RoundUiState): CardChoice
  /** Whether to press Apply Damage in this between-tricks window. */
  wantsApplyDamage(ui: RoundUiState): boolean
  /** Which owned buffs to activate in this between-tricks window, in the order to activate them. */
  chooseBuffs(ui: RoundUiState): readonly BuffId[]
  /** The next shop action, or `null` to leave the shop. Re-asked after every executed action. */
  nextShopAction(run: RunState): ShopAction | null
  /** OPTIONAL — cards to discard in this between-tricks window; `[]` or an absent method means
   *  none. Advisory like every other answer here: the driver re-asks `discardRefusalFor`, caps the
   *  selection at `MAX_CARDS_PER_DISCARD`, and cancels rather than committing an empty one.
   *
   *  Optional rather than required so `baselinePolicy` needs no stub. A stub would turn that
   *  module's docblock claim — that the baseline never discards because nothing on the shelf makes
   *  it worth doing — from "does not consider it" into "considers it and declines", changing what
   *  its printed figures mean while changing none of them. */
  chooseDiscard?(ui: RoundUiState): readonly Card[]

  /** OPTIONAL — a Cheat to spend and the card to play with it, or `null`. Advisory: the driver
   *  re-checks the buff is still offered, re-checks the spend actually armed it, and — DLR-132 —
   *  leaves `cheatTricksRemaining` untouched (there is no give-back any more) if the named card's
   *  play does not commit, the same AC7 discipline `commit` itself follows. Optional for
   *  `chooseDiscard`'s reason. */
  wantsCheatPlay?(ui: RoundUiState): CheatPlay | null
}

/** One buff, as it stood the moment a between-tricks window opened — BEFORE that window's own
 *  activations run, so an earlier activation in the same window never biases a later buff's
 *  `refusal` (e.g. spending AP first would make a later buff read `InsufficientAp` for a reason
 *  that has nothing to do with the buff itself). `refusal: null` means it was activatable right
 *  then, whether or not the policy chose to. Recorded independently of `policy.chooseBuffs` —
 *  unlike `buffsActivated`, a kind the policy never even attempts still shows up here, which is
 *  what makes this answer "which buffs CAN'T be used" rather than "which buffs got used". */
export interface BuffWindowObservation {
  readonly kind: BuffKind
  readonly refusal: BuffActivationRefusal | null
  /** 2026-08-25 — the reward axis of the card that was offered, so "which axes does the player even
   *  get shown" can be asked alongside "which axes pay off". See `BuffFireOutcome.axis`. */
  readonly axis: BuffRewardAxis
  /** The offered card's tier. See `BuffFireOutcome.tier`. */
  readonly tier: BuffTier
}

/** One buff that was ACTIVATED for one trick (spent its AP, `activatedThisTrick` included its id),
 *  and whether `buffFires` actually paid it off on that trick — see `buffFires`
 *  (`src/hunt/buffEvaluation.ts`), the pure condition check this mirrors. `refusal`/`fired` are
 *  deliberately separate questions: `BuffWindowObservation` asks "could this be pressed", this asks
 *  "given it WAS pressed, did its condition ever come true" — a buff can be legally activated every
 *  trick and still never fire, if what it needs (e.g. Cornered's health threshold, Miser's coin
 *  threshold) cannot yet be true this early in a run. One row per activation-trick pairing, so a
 *  buff activated on three tricks in one hand contributes three rows. */
export interface BuffFireOutcome {
  readonly kind: BuffKind
  readonly fired: boolean
  /** 2026-08-25 — WHICH quantity this card pays on when it fires: `Magnitude` (flat damage),
   *  `Coins`, `ApRefund`, or `Multiplier`. A card is a condition CROSSED WITH a reward axis
   *  (`buffTemplates.ts` → `TEMPLATE_FAMILIES`), so "did Taker help" is not answerable without it:
   *  Bell-Taker on Magnitude and Bell-Taker on Coins share a trigger and pay in different
   *  currencies. Read off `buff.reward.axis` at activation time, beside `kind`, for the reason
   *  `kind` itself is captured there — `activatedThisTrick` clears when the trick resolves. */
  readonly axis: BuffRewardAxis
  /** The tier that supplied `axis`'s value — bronze/silver/gold. Opening-pile cards are all bronze
   *  (`startingPile.ts`), so this separates an opening card from a slot-won upgrade. */
  readonly tier: BuffTier
  /** The reward's actual figure at this tier on this axis (`REWARD_TIER_VALUE`) — e.g. Magnitude
   *  bronze is 1 damage, gold is 5. Carried so a query can weight a fire by what it was worth
   *  rather than counting every fire equally. UNIT: depends on `axis`. */
  readonly rewardValue: number
  /** 2026-08-25 — WHICH trick of the hand this activation belonged to (`round.tricksPlayed` as the
   *  trick resolved). The flat `buffFireOutcomes` array cannot otherwise be grouped back into
   *  tricks, and the Overlap Bonus (`buffAccrual.ts` → `overlapBonusFor`) pays
   *  `max(0, firedCount - 1)` multiplier points for buffs firing on ONE trick — so "how many fired
   *  together" is a different, and mechanically rewarded, question from "how many fired this hand".
   *  UNIT: trick ordinal within the hand, 1-based. */
  readonly trickOfHand: number
}

/** What one hand did. */
export interface HandReport {
  readonly handOfFight: number
  readonly damageToQuarry: number
  readonly damageToPlayer: number
  readonly tricksWon: number
  /** Total tricks resolved this hand — won or lost alike, `round.tricksPlayed` at the hand's end.
   *  The denominator a per-trick rate (e.g. damage per trick) needs: `tricksWon` alone undercounts
   *  a hand where tricks were lost, and a lost trick can still move `damageToQuarry` (bank-climb
   *  and buff effects are not gated on winning the trick). UNIT: tricks. */
  readonly tricksPlayed: number
  /** Apply Damage payouts (`PayoutOutcome.Paid`) that actually landed on the Quarry this hand —
   *  already counted inside `damageToQuarry`, broken out here so a queued payout's fate can be
   *  told apart from a payout that never queued at all. UNIT: damage. */
  readonly applyDamagePaid: number
  /** Apply Damage value that was queued and then never landed — the delta a `Reduced` event cut
   *  (`cashOut - remaining`) plus the full `cashOut` an `Evaporated` event lost outright. Sums
   *  telescope across a payout reduced more than once: each event's `cashOut` already reflects
   *  every earlier reduction, so `applyDamagePaid + applyDamageLost` recovers the sum of every
   *  press's frozen `cashOut` for the hand. UNIT: damage. */
  readonly applyDamageLost: number
  readonly buffsActivated: number
  readonly apSpent: number
  readonly applyDamagePresses: number
  readonly coinsFromBuffs: number
  /** Priced buffs in the pile at the hand's START — `activatableBuffs(run.buffs).length`, the same
   *  production predicate the loadout panel reads, so the simulator and the felt cannot disagree
   *  about what "the player holds a usable buff" means. `0` means there was nothing to activate for
   *  the whole hand, whatever the AP pool said. Measured at the start because the shop is only
   *  reachable between fights, so a buff cannot arrive mid-hand today; a ticket that changes that
   *  makes this an understatement. UNIT: cards. */
  readonly activatableBuffsHeld: number
  /** Discard actions COMMITTED this hand, never merely offered. UNIT: discard actions. */
  readonly discardsUsed: number
  /** Cheats armed AND spent this hand — an arm that is given back unspent is not counted.
   *  UNIT: cards. */
  readonly cheatsArmed: number
  /** True when `MAX_ACTIONS_PER_HAND` was hit — a driver bug signal, never a game outcome. */
  readonly stalled: boolean
  /** A `cpuFault` the reducer reported, or `null`. Also a bug signal. */
  readonly fault: string | null
  /** Every buff offered in every between-tricks window this hand, kind and refusal state as it
   *  stood at that window's open — see `BuffWindowObservation`. A buff still offered in a later
   *  window of the same hand is recorded again: that later window is a second, independent chance
   *  to activate it. `[]` for a hand with no window opened before it ended. */
  readonly buffWindowObservations: readonly BuffWindowObservation[]
  /** Every activation-trick pairing this hand and whether it fired — see `BuffFireOutcome`. `[]`
   *  for a hand where nothing was ever activated. */
  readonly buffFireOutcomes: readonly BuffFireOutcome[]
}

/** How a run ended. `stalled` is a driver failure, deliberately distinct from `lost`. */
export const RunEnding = {
  Won: 'won',
  Lost: 'lost',
  Stalled: 'stalled',
} as const
export type RunEnding = (typeof RunEnding)[keyof typeof RunEnding]

/** What one run did. */
export interface RunReport {
  readonly seed: number
  readonly ending: RunEnding
  /** 0-based index of the fight the run ended on. */
  readonly fightReached: number
  readonly fightsWon: number
  readonly hands: readonly HandReport[]
  readonly coinsEarned: number
  readonly coinsSpent: number
  readonly slotPulls: number
  readonly buffsOwnedAtEnd: number
  /** Activations refused `NoEffectYet` — the unreachable-consumable count the brief asks for. */
  readonly deadCardRefusals: number
}

/** Everything one batch measured. */
export interface SimSummary {
  readonly policyName: string
  readonly baseSeed: number
  readonly runs: readonly RunReport[]
}

export interface SimOptions {
  readonly runs: number
  readonly baseSeed: number
  /** play-tester (2026-08-25) — OPTIONAL what-if weighting for the run's opening buff pile
   *  (`src/sim/openingPileVariants.ts`). Absent means the production draw, unchanged, which is what
   *  every existing caller gets. Present means each run's opening pile is redrawn under this
   *  weighting from the SAME seed, so a variant batch differs from its baseline only by the
   *  weighting. Deliberately on `SimOptions` and not on `SimPolicy`: the opening pile is game
   *  configuration, not a decision the simulated player makes. */
  readonly openingPileWeightOf?: (template: BuffTemplate) => number
}
