/**
 * play-tester (2026-09-02) — THE SKILLED POLICY: the strategy a good player would actually follow.
 *
 * Every policy before this one was a single-lever experiment bolted onto a card heuristic written
 * for the Quarry. This one is assembled from the rules — see `.docs/ai-play-tester/strategy-guide.md`
 * for the reasoning behind each clause and for what each lever is worth.
 *
 * The five parts, and the one sentence each rests on:
 *
 * 1. CARDS — `skilledCardPlay.ts`. A skull inverts a trick, so the outcome to aim for is BANKED,
 *    not WON, and when the Quarry has led its skull mark is face up, so the target is known.
 * 2. CHEATS — spent exactly when following would be a hurt whatever legal card is played and an
 *    off-suit card would bank it. Nothing else in the game converts a forced hurt into a bank.
 * 3. SWAP — throws the middle ranks. Clean tricks are won with high cards and skulled ones ducked
 *    with low ones; the middle does neither, and is where the Quarry's own skulls concentrate.
 * 4. BUFFS — fires everything available. Action points are off and the Overlap Bonus pays per extra
 *    card on the same trick, so holding one back costs multiplier for nothing.
 * 5. THE POT — the optimal-stopping rule stated properly. Pushing from a roll of `r` is worth it
 *    only while the chance of banking the next trick beats `r / (r + 1)`, and the estimate of that
 *    chance is the same one the card play uses to pick a lead, not a second guess.
 *
 * INFORMATION DISCIPLINE: this policy may read only what is on the player's screen. See
 * `skilledCardPlay.ts`'s docblock for the list and `skilledPolicy.test.ts` for the assertion.
 */
import {
  chooseCpuMove,
  discardRefusalFor,
  PlayerSide,
  potValue,
  sameCard,
  type Card,
  type RoundState,
} from '../warCouncil'
import {
  BuffKind,
  DuelSide,
  MAX_CARDS_PER_DISCARD,
  ShopItem,
  SLOT_FREE_PULLS_PER_VISIT,
  SLOT_MACHINE_IDS,
  flaskRefusalFor,
  flaskStockFor,
  refusalFor,
  shopStockFor,
  slotPullRefusalFor,
  slotVisitStockFor,
  buffCombineKey,
  combineRefusalFor,
  type BuffId,
  type RunState,
} from '../hunt'
import { discardStock, offeredBuffs, type RoundUiState } from '../app/warCouncil/roundUiState'
import { loadoutRefusalFor } from '../app/warCouncil/buffHandlers'
import { baselinePolicy } from './baselinePolicy'
import { sharpshooterPolicy } from './survivalistPolicy'
import {
  bestLeadBankOdds,
  canPayUnder,
  cheatEscape,
  chooseSkilledCard,
  deadness,
  isPromptFree,
  trickIntent,
  type TrickIntent,
} from './skilledCardPlay'
import type { CardChoice, CheatPlay, ShopAction, SimPolicy } from './types'

/**
 * The card, from the same `chooseSkilledCard` the buff plan reads — so what was armed for and what
 * is played cannot disagree. The prompt-free filter lives in `leadCandidates`, once, for that
 * reason; it used to live here and diverge from the plan on 30% of led tricks.
 *
 * `chooseCpuMove` is consulted only to inherit its `AbilityChoice` when it happens to name the same
 * card, since this policy answers no prompts of its own.
 */
function chooseCard(round: RoundState): CardChoice {
  const fallback = chooseCpuMove(round, PlayerSide.Player)
  const wanted = chooseSkilledCard(round)
  // FINAL SAFETY NET, and it only ever bites on a FOLLOW: `leadCandidates` has already filtered
  // prompts out of every lead, so the plan and the play still agree. A follow can still name a Fox
  // when only that card reaches the wanted outcome, and this policy has no
  // `AbilityChoice` to answer with — the driver then loops on an unanswered prompt and the hand
  // stalls. Falling back to the engine's own move keeps its matching choice with it.
  if (!isPromptFree(wanted)) return fallback
  return sameCard(wanted, fallback.card) ? fallback : { card: wanted }
}

/**
 * Spend a Cheat only on a forced hurt that an off-suit card would turn into a bank.
 *
 * `cheatEscape` answers the card half; this adds the ownership half — an activatable Cheat in the
 * pile. Both halves are needed, and naming them together is why `CheatPlay` carries the card as
 * well as the id: arming a Cheat and then playing a card follow-suit already allowed spends the
 * Cheat for nothing and would report it as harmful rather than as unexercised.
 */
function wantsCheatPlay(ui: RoundUiState): CheatPlay | null {
  const card = cheatEscape(ui.round)
  // A Cheat that unlocks a Fox opens a prompt this policy cannot answer, and the driver has no
  // `AbilityChoice` for a card the engine did not pick — which stalls the hand. DLR-163 — a Cheat
  // unlocking a Woodcutter is no longer a stall risk; that card carries no prompt.
  if (card === null || !isPromptFree(card)) return null
  const cheat = offeredBuffs(ui).find(
    (buff) => buff.kind === BuffKind.Cheat && loadoutRefusalFor(ui, buff) === null,
  )
  return cheat === undefined ? null : { cheatId: cheat.id, card }
}

// `canPayUnder` — THE buff rule — lives in `skilledCardPlay.ts` now, beside the `TrickIntent` it
// reads. Moved on the DLR-162..167 fix pass, when the wild-card correction pushed this file past
// its 400-line budget; the seam matches the split's own stated one, since the rule is a question
// about the intended trick and nothing else.

/** UNIT: cards. What may ride on a trick whose suit is a PREDICTION rather than a choice — the
 *  Quarry's lead. Not a tuning value so much as the shape of the bet: a blind trick should not be
 *  allowed to eat a pile that a chosen trick could spend precisely. */
const BLIND_TRICK_CAP = 3

function chooseBuffs(ui: RoundUiState): readonly BuffId[] {
  const intent = trickIntent(ui.round)
  if (intent === null) return []
  const usable = offeredBuffs(ui).filter(
    (buff) =>
      !RESERVED_KINDS.has(buff.kind) &&
      loadoutRefusalFor(ui, buff) === null &&
      canPayUnder(buff, intent),
  )
  const ordered = [...usable].sort((a, b) => b.reward.value - a.reward.value || a.id - b.id)
  const capped = intent.certain ? ordered : ordered.slice(0, BLIND_TRICK_CAP)
  return capped.map((buff) => buff.id)
}

/** Kinds the ordinary buff window must never spend. CHEAT, because it is not a damage card at all
 *  — it lifts follow-suit, and its one job is turning a FORCED hurt into a bank. `wantsCheatPlay`
 *  spends it at exactly that moment; armed as an ordinary buff it is gone before the moment
 *  arrives. */
const RESERVED_KINDS: ReadonlySet<BuffKind> = new Set([BuffKind.Cheat])

/** Diagnostic — the UNAIMED "fire everything the loadout accepts" rule. The control for
 *  `chooseBuffs` above: it arms Suit High and Suit Low of every suit together regardless of what the
 *  trick is going to be, which is what the trace showed spending four Keys cards on a Bells
 *  trick. Kept so that cost stays measurable rather than remembered. */
function chooseBuffsUnaimed(ui: RoundUiState): readonly BuffId[] {
  const chosen = new Set(baselinePolicy.chooseBuffs(ui))
  return offeredBuffs(ui)
    .filter((buff) => chosen.has(buff.id))
    .map((buff) => buff.id)
}

/**
 * Swap in service of the read, not on a fixed rule.
 *
 * The plan for a trick names a suit and a direction — go high on it, or go low for a Low Victory. A hand can only
 * deliver that plan if it holds the right END of that suit: a HIGH card to take the trick, a LOW one
 * to duck it. Holding neither, the plan cannot be played however well the buffs were chosen, and
 * that is precisely what the swap is for. The developer's example: the read said Bells was 100%
 * skulled, so the plan was to lose a Bells trick — and the hand held no low Bell to lose with.
 *
 * So: throw only when the hand CANNOT serve the read, and throw the cards furthest from serving it —
 * the dead middle ranks first (`deadness`), which are also where the Quarry's own skulls concentrate.
 * A hand that can already play the plan spends nothing, because the swap's budget is three a fight
 * and a blind redraw of a working hand is a downgrade.
 */
const HIGH_ENOUGH_TO_TAKE = 8
const LOW_ENOUGH_TO_DUCK = 4

/** Whether `card` can deliver `intent` — the right end of the right suit. */
function servesPlan(card: Card, intent: TrickIntent): boolean {
  if (String(card.suit) !== String(intent.suit)) return false
  return intent.willTake ? card.rank >= HIGH_ENOUGH_TO_TAKE : card.rank <= LOW_ENOUGH_TO_DUCK
}

function chooseDiscard(ui: RoundUiState): readonly Card[] {
  if (discardRefusalFor(discardStock(ui)) !== null) return []
  const intent = trickIntent(ui.round)
  if (intent === null) return []
  const hand = ui.round.hands[PlayerSide.Player]
  // The hand can already play the read — keep it.
  if (hand.some((card) => servesPlan(card, intent))) return []
  const throwable = hand.filter((card) => !servesPlan(card, intent))
  return [...throwable]
    .sort((a, b) => deadness(b) - deadness(a) || a.rank - b.rank)
    .slice(0, MAX_CARDS_PER_DISCARD)
}

/**
 * The stopping rule, stated as the arithmetic rather than as a threshold anybody picked.
 *
 * Cashing a pot of `total x roll` against pushing to `(total + d) x (roll + 1)` is worth it while
 * `p x (roll + 1) > roll`, i.e. while `p > roll / (roll + 1)` — 0.5 at the first trick, 0.75 at the
 * third, 0.83 at the fifth. `p` is estimated by `bestLeadBankOdds`, the same expression the card
 * play maximises when it picks a lead, so the push and the cards cannot disagree about how good the
 * hand is.
 *
 * A lethal pot is cashed regardless: overkill is discarded and the streak dies with the fight, so
 * pushing a pot that already kills risks everything to win nothing.
 */
function wantsApplyPot(ui: RoundUiState): boolean {
  const view = ui.resolution
  if (view === null) return true
  const { total, roll } = view.resolution
  if (potValue(total, roll) >= ui.encounter.health[DuelSide.Quarry]) return true
  const p = bestLeadBankOdds(ui.round)
  return p <= roll / (roll + 1)
}

export const skilledPolicy: SimPolicy = {
  name: 'skilled',
  chooseCard,
  chooseBuffs,
  chooseDiscard,
  wantsCheatPlay,
  wantsApplyPot,
  // Raise the health ceiling first, cards with what is left. Measured 500 runs at seed 1: 4.57
  // fights against 3.23 for the cards-first rule this policy used until 2026-09-02, because a
  // ceiling converts a fatal fight into a survivable one directly and a card only does it by
  // shortening the fight. `raiseCeilingFirst` is declared below; see `skilledCardsFirstPolicy` for
  // the rule it replaced, kept so the comparison stays re-runnable.
  nextShopAction: raiseCeilingFirst,
}

/**
 * play-tester (2026-09-02) — DIAGNOSTIC VARIANTS.
 *
 * `skilledPolicy` changes four things at once against the previous best, so a regression in its
 * figures cannot be attributed without turning each lever off on its own. Each of these differs from
 * `skilledPolicy` in EXACTLY ONE method and takes every other by reference.
 *
 * Declared AFTER `skilledPolicy` deliberately: a `const` spread before its initialiser runs reads
 * the temporal dead zone, which surfaces as an empty report rather than as a type error.
 */
export const skilledNoSwapPolicy: SimPolicy = {
  ...skilledPolicy,
  name: 'skilledNoSwap',
  chooseDiscard: undefined,
}

export const skilledNoCheatPolicy: SimPolicy = {
  ...skilledPolicy,
  name: 'skilledNoCheat',
  wantsCheatPlay: undefined,
}

/** The skilled buffs, swap, cheats and stopping rule on the OLD card heuristic — the control that
 *  says how much of any gap is the card play itself. */
export const skilledNaiveCardsPolicy: SimPolicy = {
  ...skilledPolicy,
  name: 'skilledNaiveCards',
  chooseCard: (round: RoundState) => chooseCpuMove(round, PlayerSide.Player),
}

/** Diagnostic — the skilled play firing every card it owns in every window, which empties the
 *  pile on the first trick of a fight. See `chooseBuffsUnaimed`. */
export const skilledUnaimedPolicy: SimPolicy = {
  ...skilledPolicy,
  name: 'skilledUnaimed',
  chooseBuffs: chooseBuffsUnaimed,
}

/**
 * play-tester (2026-09-02) — SHOP-ORDER VARIANTS OF THE SKILLED PLAY.
 *
 * `skilledPolicy` takes `sharpshooterPolicy`'s shop rule, which puts max health LAST — behind slot
 * pulls at 1 coin each, uncapped. Pulls therefore absorb every coin and the run's ceiling never
 * moves off `PLAYER_START_HEALTH`. That was measured on the OLD card play, so it needs re-asking
 * now that a fight's health cost is bimodal — median 0, p75 nine of ten. A bigger bar converts
 * fatal fights into free ones directly, which a card does not.
 *
 * `raiseCeilingFirst` buys the ceiling before anything else, spending what is left on cards.
 * `oneCeilingPerVisit` buys exactly one step a visit and puts the rest into cards — the middle
 * position, so the sweep has a point between the two extremes rather than only the ends.
 */
function raiseCeilingFirst(run: RunState): ShopAction | null {
  if (run.slotPullsThisVisit < SLOT_FREE_PULLS_PER_VISIT) {
    return { kind: 'pull', machineId: SLOT_MACHINE_IDS[0] }
  }
  if (flaskRefusalFor(flaskStockFor(run)) === null) return { kind: 'flask' }
  const stock = shopStockFor(run)
  if (refusalFor(stock, ShopItem.MaxHealth) === null) {
    return { kind: 'buy', item: ShopItem.MaxHealth }
  }
  if (refusalFor(stock, ShopItem.Heal) === null) return { kind: 'buy', item: ShopItem.Heal }
  if (slotPullRefusalFor(slotVisitStockFor(run)) === null) {
    return { kind: 'pull', machineId: SLOT_MACHINE_IDS[0] }
  }
  return null
}

/** UNIT: max-health purchases allowed per fight cleared. A cap, not a tuning value — it exists so
 *  the sweep has a middle position between "ceiling first" and "cards first". Paced against
 *  `encounterIndex` rather than against a per-visit counter, because `RunState` carries no
 *  per-visit purchase count and `nextShopAction` is re-asked after every action. */
const CEILING_STEPS_PER_FIGHT = 1

function oneCeilingPerVisit(run: RunState): ShopAction | null {
  if (run.slotPullsThisVisit < SLOT_FREE_PULLS_PER_VISIT) {
    return { kind: 'pull', machineId: SLOT_MACHINE_IDS[0] }
  }
  if (flaskRefusalFor(flaskStockFor(run)) === null) return { kind: 'flask' }
  const stock = shopStockFor(run)
  const allowed = (run.encounterIndex + 1) * CEILING_STEPS_PER_FIGHT
  if (run.maxHealthPurchases < allowed && refusalFor(stock, ShopItem.MaxHealth) === null) {
    return { kind: 'buy', item: ShopItem.MaxHealth }
  }
  if (refusalFor(stock, ShopItem.Heal) === null) return { kind: 'buy', item: ShopItem.Heal }
  if (slotPullRefusalFor(slotVisitStockFor(run)) === null) {
    return { kind: 'pull', machineId: SLOT_MACHINE_IDS[0] }
  }
  return null
}

/** Diagnostic — the CARDS-first shop rule `skilledPolicy` used until 2026-09-02, kept so the gap
 *  the ceiling buys stays measurable rather than remembered. */
export const skilledCardsFirstPolicy: SimPolicy = {
  ...skilledPolicy,
  name: 'skilledCardsFirst',
  nextShopAction: sharpshooterPolicy.nextShopAction,
}

export const skilledCeilingPacedPolicy: SimPolicy = {
  ...skilledPolicy,
  name: 'skilledCeilingPaced',
  nextShopAction: oneCeilingPerVisit,
}

/**
 * play-tester (2026-09-02) — COMBINING, the Manage Buffs screen (shipped 2026-09-02, DLR-159).
 *
 * `ShopAction` had no member for it until today, so no measurement this project has taken ever
 * exercised the upgrade path. These two variants do, at both extremes, so the question is answered
 * by measurement rather than by the paper argument below.
 *
 * The paper argument says combining should LOSE, and it is worth stating so the numbers can
 * contradict it. Two bronze flat-damage cards fired on one trick give `(1 + 2) x 2 = 6`, because the
 * second card earns the Overlap Bonus; the single silver they merge into gives `(1 + 3) x 1 = 4`.
 * The multiplier axis is the same shape — two bronze Momentum reach a multiplier of 6, one silver
 * reaches 4. So combining trades two cards that can both fire for one that fires once, and it wins
 * only if the pile is the binding constraint rather than the trick.
 *
 * That caveat is why this is measured and not assumed: the median cards fired on ONE trick is 1,
 * which says the pile is thinner in play than its run totals suggest.
 */
function everyCombine(run: RunState): ShopAction | null {
  const keys = new Set(run.buffs.map(buffCombineKey))
  for (const key of keys) {
    if (combineRefusalFor(run.buffs, key) === null) return { kind: 'combine', key }
  }
  return null
}

/** Combine everything possible FIRST, then the ordinary shop rule. Combining costs no coins, so it
 *  never competes with a purchase — only with keeping the pair. */
function combineThenShop(run: RunState): ShopAction | null {
  return everyCombine(run) ?? raiseCeilingFirst(run)
}

export const skilledCombinePolicy: SimPolicy = {
  ...skilledPolicy,
  name: 'skilledCombine',
  nextShopAction: combineThenShop,
}

/** The cards-first shop rule WITH combining, so the upgrade path is measured against a big pile as
 *  well as against a small one — combining is likeliest to pay where cards are plentiful. */
export const skilledCardsCombinePolicy: SimPolicy = {
  ...skilledPolicy,
  name: 'skilledCardsCombine',
  nextShopAction: (run: RunState) => everyCombine(run) ?? sharpshooterPolicy.nextShopAction(run),
}
