import type { AbilityChoice, Card, RoundState } from '../warCouncil'
import type { BuffId, CheatCardId, RunState, ShopItem, SlotMachineId } from '../hunt'
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

/** A Cheat to arm and the off-suit card to play with it. Named TOGETHER, deliberately: arming a
 *  Cheat and then playing a card that was follow-suit-legal anyway spends the card for nothing,
 *  which would report the Cheat as harmful rather than as unexercised. */
export interface CheatPlay {
  readonly cheatId: CheatCardId
  readonly card: Card
}

/** The simulated player. Every method is PURE: it reads state and returns a decision, and the
 *  driver decides whether the decision is legal. */
export interface SimPolicy {
  readonly name: string
  /** Which card to play, with its ability choice. Called only when `canAct(ui)` holds. */
  chooseCard(round: RoundState): CardChoice
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

  /** OPTIONAL — a Cheat to arm and the card to play with it, or `null`. Advisory: the driver
   *  re-checks `hasCheat`, re-checks that the Cheat actually armed, and gives it back unspent if
   *  the card does not commit. Optional for `chooseDiscard`'s reason. */
  wantsCheatPlay?(ui: RoundUiState): CheatPlay | null
}

/** What one hand did. */
export interface HandReport {
  readonly handOfFight: number
  readonly damageToQuarry: number
  readonly damageToPlayer: number
  readonly tricksWon: number
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
}
