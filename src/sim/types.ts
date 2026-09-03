import type { AbilityChoice, Card, RoundState, StreakState } from '../warCouncil'
import type {
  BuffActivationRefusal,
  BuffCarry,
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
  /** play-tester (2026-09-02) — the Manage Buffs screen's combine, keyed by `buffCombineKey`: two
   *  identical cards at the same tier become one of the next tier. Added because `ShopAction` had
   *  no member for it, so no measurement this project has ever taken exercised the upgrade path at
   *  all. Executed defensively like every other action — the driver re-asks `combineRefusalFor`. */
  | { readonly kind: 'combine'; readonly key: string }

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

  /** DLR-167 — OPTIONAL: which card in hand a spent Curse should put its skull on. Called only
   *  after a Curse has actually been spent and `curseArmed(ui)` holds. Advisory like every other
   *  answer here: the driver re-checks the card is in hand and falls back to the FIRST card if the
   *  policy names none, because an armed Curse claims the next hand tap and leaving it armed would
   *  silently swallow the driver's own play. That fallback is mechanics-resolution, NOT strategy —
   *  teaching a policy WHEN and WHERE to Curse is a tuning question DLR-167 does not ask for.
   *  Optional for `chooseDiscard`'s stated reason. */
  chooseCurseTarget?(ui: RoundUiState): Card | null

  /** DLR-156 review fix — OPTIONAL, called only when the resolution screen offers a real choice
   *  (`ui.resolution !== null` and the trick was not a hurt one — a hurt trick's only exit is
   *  `RollOver`/"Onward", never a choice). `true` presses Apply Damage (`RoundUiActionKind.ApplyPot`);
   *  `false` rolls the pot over (`RoundUiActionKind.RollOver`).
   *
   *  Optional for `chooseDiscard`'s own reason: a stub would turn "this policy does not consider
   *  the push" into "considers it and declines every time", which is a different claim about what
   *  the printed figures mean. When a policy supplies no method, `playHand.ts`'s driver applies the
   *  MODELLING DEFAULT documented there — apply whenever a pot stands, never rolling the dice — a
   *  deliberate floor, not a claim about optimal play. */
  wantsApplyPot?(ui: RoundUiState): boolean
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
  /** DLR-150 — whether the trick this activation resolved on was a LOSS on the OUTCOME axis (a
   *  clean loss, or an eaten skull), as opposed to a Win (a clean win, or a dodge). A FEEDER firing
   *  on a Loss banks its reward into the hand's carry instead of paying it this hand; every other
   *  family and every Win pays as before. Recorded so "did this fire carry or pay" is answerable
   *  without re-deriving the skull inversion, which `bank.ts`'s `TAKEN` table states exactly once. */
  readonly trickWasLoss: boolean
  /** play-tester (2026-09-02) — the SUIT this card's condition is keyed to, or `null` for a family
   *  that is not suit-parameterised (Sidestep) and for the activated cards. A Taker keyed to Bells
   *  means nothing in a trace unless the suit actually led is beside it. */
  readonly target: string | null
}

/** play-tester (2026-09-02) — the four outcomes of `the-hunt.md` §7, counted, plus where the hurt
 *  ones happened. `cleanWin` and `dodge` BANK; `cleanLoss` and `skullWin` HURT, and cost exactly 1
 *  health each. `hurtLeading + hurtFollowing` therefore equals `cleanLoss + skullWin`. */
export interface TrickOutcomeCounts {
  readonly cleanWin: number
  readonly dodge: number
  readonly cleanLoss: number
  readonly skullWin: number
  /** Hurt tricks the player was LEADING into — a bet on an unseen answer. */
  readonly hurtLeading: number
  /** Hurt tricks the player was FOLLOWING — the lead was face up, so the outcome was chooseable
   *  unless no legal card reached it. */
  readonly hurtFollowing: number
}

/** play-tester (2026-09-02) — the read taken before the buff window arms anything. */
export interface TrickIntentRecord {
  /** The suit expected to decide the trick — chosen when the player leads, predicted from
   *  `suitShape`'s posted counts when the Quarry does. */
  readonly suit: string
  /** Whether the plan was to TAKE the trick (a clean suit) or to LOSE it (a skull-heavy one, where
   *  a dodge banks). Taker pays only on the first, Feeder and Sidestep only on the second. */
  readonly willTake: boolean
  /** False when the Quarry leads: the suit is a prediction, so fewer cards ride on it. */
  readonly certain: boolean
  /** Who lays the first card. */
  readonly playerLeads: boolean
  /** The share of the Quarry's holding in `suit` that is skulled — the figure `willTake` turns on. */
  readonly skullOdds: number
  /** How much of that suit the Quarry holds, and how much of it is skulled. Straight off the
   *  screen's own readout. */
  readonly held: number
  readonly skulled: number
  /** The card the plan meant to lead — `suit` and `rank` — or `null` when the Quarry leads. */
  readonly plannedSuit: string | null
  readonly plannedRank: number | null
}

/** play-tester (2026-09-02) — one card sitting in the pile, unspent, when a buff window opened. */
export interface HeldBuff {
  readonly kind: string
  readonly tier: string
  readonly axis: string
  readonly value: number
  readonly target: string | null
}

/** play-tester (2026-09-02) — one card as it was played into a trick. */
export interface TrickCardRecord {
  readonly side: string
  readonly suit: string
  readonly rank: number
  /** Skulls are dealt only to the Quarry, so in practice this marks its card — and a skull inverts
   *  what winning the trick is worth (`the-hunt.md` §7). */
  readonly skulled: boolean
}

/** play-tester (2026-09-02) — one trick's damage, broken into the terms that produced it, so
 *  "what did firing those cards actually buy" is answerable. Mirrors `TrickDamage`
 *  (`src/warCouncil/streak.ts`), which is the engine's own statement of the equation:
 *  `dealt = (base + buffDamage) x buffMult`. Join to `BuffFireOutcome` on `trick` /
 *  `trickOfHand` to see which cards produced these terms. */
export interface TrickDamageRecord {
  /** 1-based trick ordinal within the hand. */
  readonly trick: number
  readonly outcome: string
  /** play-tester (2026-09-02) — the two cards, in the engine's load-bearing lead-then-follow order,
   *  with the lead's skull mark. Without these a trace says which buffs were spent but not what was
   *  played, and a Taker keyed to Bells only means anything beside the suit actually led. */
  readonly cards: readonly TrickCardRecord[]
  /** The suit that was trump as this trick resolved — after any Fox exchange made in it. */
  readonly trumpSuit: string
  /** play-tester (2026-09-02) — what the player PREDICTED this trick would be, at the moment the
   *  buff window opened and before any card was laid. Recorded so a trace shows the reasoning
   *  behind an arming decision and, when the prediction was wrong, shows that too. `null` when no
   *  window opened. */
  readonly intent: TrickIntentRecord | null
  /** play-tester (2026-09-02) — every activatable card in the pile as this trick's buff window
   *  opened, BEFORE any of it was armed. `fired` says what was spent; this says what was available,
   *  and the difference is what the player chose to hold back. Without it a trace cannot
   *  distinguish "had nothing" from "had plenty and armed none of it". */
  readonly held: readonly HeldBuff[]
  /** Whether the player laid the FIRST card. Leading is a bet on an unseen answer; following is a
   *  decision made with the lead's skull mark face up. */
  readonly playerLed: boolean
  /** BASE_DAMAGE plus the run's `baseDamageBonus`. */
  readonly base: number
  /** Flat damage from the cards fired on THIS trick. */
  readonly buffDamage: number
  /** 1 + Momentum points fired on this trick + the Overlap Bonus. */
  readonly buffMult: number
  readonly overlapBonus: number
  /** `(base + buffDamage) x buffMult` — what this trick added to the streak's total. 0 on a hurt
   *  trick, which computes none. */
  readonly dealt: number
  /** The streak AFTER this trick. `roll` multiplies `total` to make the pot. */
  readonly total: number
  readonly roll: number
  /** The pot dealt to the Quarry at this trick, or `null` if it rolled over. */
  readonly potApplied: number | null
}

/** play-tester (2026-09-02) — see `HandReport.cheatMoments`. */
export interface CheatMoments {
  readonly forced: number
  readonly escapable: number
  readonly held: number
  readonly taken: number
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
  readonly buffsActivated: number
  readonly apSpent: number
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
  /** DLR-150 — the Feeder carry this hand OPENED on, seeded from `RunState.feederCarry`
   *  (`accrual.carriedIn`). Zero on the first hand of every fight, because the carry is wiped at
   *  the fight boundary. UNIT: bonus points, per axis. */
  readonly feederCarriedIn: BuffCarry
  /** DLR-150 — the Feeder carry this hand BANKED for the next one (`accrual.carryOut`) — rewards
   *  from Feeders that fired on a LOSS, which paid nothing in this hand. UNIT: bonus points,
   *  per axis. */
  readonly feederCarryOut: BuffCarry
  /** play-tester (2026-09-02) — the player's health and ceiling as this hand OPENED, read off the
   *  hand's frozen `openingEncounter` and `RunState.maxPlayerHealth`. `damageToPlayer` says what a
   *  hand cost; these say what it was spent out of, which is the difference between a hand that
   *  cost 4 of 20 and one that cost 4 of 4. UNIT: health points. */
  readonly playerHealthAtStart: number
  readonly maxPlayerHealthAtStart: number

  /** play-tester (2026-09-02) — this hand's tricks by outcome, plus which SEAT the hurt ones were
   *  taken in. `damageToPlayer` says how much health a hand cost; this says which of the four
   *  outcomes (`the-hunt.md` §7) cost it, and whether the player was leading blind or following
   *  with the lead face up. Without the seat split a card-play change cannot be attributed: the
   *  follow is a decision made with the skull mark visible, the lead is a bet. */
  readonly trickOutcomes: TrickOutcomeCounts
  /** play-tester (2026-09-02) — one row per resolved trick, in order. The readable trace of a hand:
   *  what the cards fired on each trick were worth, and what the streak did with it. */
  readonly trickDamage: readonly TrickDamageRecord[]
  /** play-tester (2026-09-02) — the Cheat's whole case, counted. A Cheat lifts follow-suit, so its
   *  one job is turning a FORCED hurt into a bank: on a skulled lead every legal card would take
   *  the trick and eat the skull, or on a clean lead none of them wins. `forced` counts the
   *  situation arising at all, `escapable` counts the subset an off-suit card would actually fix,
   *  `held` the subset where a Cheat was in the pile, and `taken` what was spent. The gaps between
   *  those four say whether the card is rare, useless, or simply never owned. */
  readonly cheatMoments: CheatMoments

  /** play-tester (2026-09-02) — every pot APPLIED this hand, in the order they were dealt, each
   *  as `potValue(total, roll)` read off the resolution the moment Apply was pressed. `[]` for a
   *  hand that never cashed. `damageToQuarry` already carries the hand's total, but it cannot
   *  distinguish one 36-damage cash from six 6-damage ones — which is exactly the question the
   *  roll-over bet asks. UNIT: damage per applied pot. */
  readonly potsApplied: readonly number[]
  /** DLR-156 AC8 — the streak this hand OPENED on, seeded from `RunState.streak`. Zero on the
   *  first hand of every fight, because the streak is wiped at the fight boundary. */
  readonly streakIn: StreakState
  /** DLR-156 AC8 — the streak this hand ENDED on, after every trick it played. */
  readonly streakOut: StreakState
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
  /** play-tester (2026-09-02) — combines COMMITTED this run. Each spends two cards and returns
   *  one, so the pile shrinks by one per combine. UNIT: combines. */
  readonly combines: number
  /** play-tester (2026-09-02) — buff cards MINTED into the pile over the whole run, summed as the
   *  pile-length delta each slot pull actually produced rather than re-derived from the machine's
   *  posted odds. `buffsOwnedAtEnd` is what SURVIVED; this is what ARRIVED, and the gap between the
   *  two is what the player spent. UNIT: cards. */
  readonly buffsAcquired: number
  /** play-tester (2026-09-02) — of `coinsSpent`, the share that went into slot pulls. Tracked as
   *  the charge `pullSlotMachine` actually took, never from a price table. UNIT: coins. */
  readonly coinsSpentOnPulls: number
  /** play-tester (2026-09-02) — of `coinsSpent`, the share spent on each shelf item, keyed by
   *  `ShopItem`. Only items actually bought appear, so an unshelved item is an absent key rather
   *  than a zero that reads as "offered and declined". UNIT: coins. */
  readonly coinsSpentByItem: Readonly<Partial<Record<ShopItem, number>>>
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
