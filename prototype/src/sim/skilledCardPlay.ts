/**
 * play-tester (2026-09-02) — HOW A SKILLED PLAYER PICKS A CARD.
 *
 * Split from `skilledPolicy.ts` so neither file carries the whole of a strategy: this module owns
 * the trick-by-trick card decision and knows nothing about buffs, the shop, or the pot.
 *
 * WHY THIS EXISTS. Every simulated player before it took its card from `chooseCpuMove`, which was
 * written for the QUARRY. That heuristic's go-low branch filters its own candidate cards for a skull
 * — correct for the Quarry, which is the only side ever dealt one, and a permanent no-op for the
 * player, who holds none. Reused for the player it collapses to "always try to win, else play
 * lowest". Since a skull INVERTS a trick (`the-hunt.md` §7), winning a skull trick is a point of
 * health where losing it banks for free — so the shared heuristic walks into roughly a third of all
 * tricks the wrong way round, every hand, on purpose.
 *
 * INFORMATION DISCIPLINE — the load-bearing rule of this module. A policy runs inside the engine
 * and could simply read `state.hands[Quarry]`, which would make every figure it produces
 * meaningless. It may read only what a player at the screen can see:
 *
 * - the cards face up in the current trick, and their skull marks (`the-hunt.md` §3 — a played
 *   skull shows as the whole card face);
 * - its own hand;
 * - `suitShape`, which is literally the function `QuarryShape.tsx` renders — per suit, how many
 *   cards the Quarry HOLDS and how many are skulled, and NO ranks;
 * - the trump suit, the decree, and the public trick counters.
 *
 * `quarrySkullOdds` below is the ONLY route this file has to the Quarry's hand, and it returns
 * ratios built from `suitShape` alone. `skilledPolicy.test.ts` pins that no rank ever leaks.
 */
import {
  CardRank,
  isSkulled,
  legalMoves,
  PlayerSide,
  resolveTrickWinner,
  skullsOn,
  suitShape,
  type Card,
  type RoundState,
  type Suit,
} from '../warCouncil'
import { BuffKind, buffIsWild, buffTargetSuitOf, type Buff } from '../hunt'

/** The deck's rank extremes, used to turn a rank into a rough "will this win" probability. Named
 *  rather than written as literals at three call sites, and derived from the deck's own bounds. */
const LOWEST_RANK = 1
const HIGHEST_RANK = 11
/** The rank a card is least useful at — it neither wins a clean trick nor ducks a skulled one, and
 *  it is where `SKULL_RANK_WEIGHTS` concentrates the Quarry's skulls (`the-hunt.md` §3). */
const DEAD_RANK = (LOWEST_RANK + HIGHEST_RANK) / 2

/** How far a card is from being useful at either end. 0 for a Swan or a Monarch, largest in the
 *  middle. The discard rule and the "I am going to be hurt anyway, so throw junk" branch both
 *  order by this, so the two cannot disagree about which card is dead weight. */
export function deadness(card: Card): number {
  return -Math.abs(card.rank - DEAD_RANK)
}

function byRank(a: Card, b: Card): number {
  return a.rank - b.rank || a.suit.localeCompare(b.suit)
}

function lowest(cards: readonly Card[]): Card {
  return [...cards].sort(byRank)[0]
}

/** The most expendable legal card — closest to the dead middle, lowest rank to break a tie. Used
 *  only when the trick is lost whatever is played, so the choice is purely "what do I keep". */
function junkiest(cards: readonly Card[]): Card {
  // DESCENDING by `deadness`: the junkiest card is the one CLOSEST to the dead middle, which is the
  // LARGEST deadness score. Ascending picks the most useful card in hand and throws it.
  return [...cards].sort((a, b) => deadness(b) - deadness(a) || byRank(a, b))[0]
}

/**
 * Per suit, the share of the Quarry's holding in it that is skulled — read from `suitShape`, the
 * screen's own readout, so this is inference from posted counts and never from ranks.
 *
 * A suit the Quarry is VOID in falls back to the ratio across its whole hand: void means it may
 * legally discard anything, including a skull, which `the-hunt.md` §3 names as one of the two
 * cases the rank curve does not protect against.
 */
export function quarrySkullOdds(state: RoundState): Readonly<Record<string, number>> {
  // DLR-167 — `skulledCards`, NOT `skullsOn`: this reasons about the QUARRY's own dealt skulls.
  // A skull the player just put on their own card is not something the Quarry knows or is shown.
  const shape = suitShape(state.hands[PlayerSide.Cpu], state.skulledCards)
  const held = shape.reduce((sum, row) => sum + row.held, 0)
  const skulled = shape.reduce((sum, row) => sum + row.skulled, 0)
  const overall = held === 0 ? 0 : skulled / held
  const odds: Record<string, number> = {}
  for (const row of shape) {
    odds[row.suit] = row.held === 0 ? overall : row.skulled / row.held
  }
  return odds
}

/** A rough chance that leading `card` takes the trick. Rank against the deck's span, with a trump
 *  card given the upper half outright — deliberately crude, because the exact figure needs the
 *  Quarry's ranks and this module is not allowed to know them. */
function leadWinOdds(card: Card, trumpSuit: Suit): number {
  const byRankAlone = (card.rank - LOWEST_RANK) / (HIGHEST_RANK - LOWEST_RANK)
  return card.suit === trumpSuit ? 0.5 + 0.5 * byRankAlone : byRankAlone
}

/**
 * The chance that leading `card` ends in a BANKED trick — the only quantity worth maximising,
 * since a bank is the outcome that pays and costs no health whichever way the cards fell.
 *
 * A trick banks two ways (`the-hunt.md` §7): win it clean, or lose it skulled. So the estimate is
 * `win x clean + lose x skulled`, which is what makes leading LOW into a skull-heavy suit and HIGH
 * into a clean one fall out of one expression rather than out of two hand-written branches.
 */
export function leadBankOdds(
  card: Card,
  trumpSuit: Suit,
  odds: Readonly<Record<string, number>>,
): number {
  const skull = odds[card.suit] ?? 0
  const win = leadWinOdds(card, trumpSuit)
  return win * (1 - skull) + (1 - win) * skull
}

/** The best banking chance any card in `hand` offers as a lead. The pot's stopping rule reads this
 *  as its estimate of surviving one more trick, so the push and the card play agree about how good
 *  the hand is rather than each guessing separately. */
export function bestLeadBankOdds(state: RoundState): number {
  const hand = state.hands[PlayerSide.Player]
  if (hand.length === 0) return 0
  const odds = quarrySkullOdds(state)
  return Math.max(...hand.map((card) => leadBankOdds(card, state.trumpSuit, odds)))
}

/** Whether `card`, played as the follow, would take the trick. Evaluated at bronze exactly as
 *  `chooseCpuCard` evaluates its own candidates — the ladder belongs to `playCard`, which resolves
 *  the trick for real. */
function followWins(state: RoundState, card: Card): boolean {
  const lead = state.currentTrick[0]
  return (
    resolveTrickWinner([lead, { side: PlayerSide.Player, card }], state.trumpSuit) ===
    PlayerSide.Player
  )
}

/**
 * The follow, with the lead face up — where the health is won or lost.
 *
 * The lead's skull mark is visible, so the target outcome is known rather than estimated: a skulled
 * lead is a trick to go LOW on (a Low Victory banks it), a clean lead is one to go HIGH on. Within
 * the cards that reach the target outcome, take the cheapest — the lowest card that stays under for
 * a Low Victory, so the high cards stay available for clean tricks later; the lowest card that
 * takes it for a High Victory, for the same reason in reverse.
 *
 * When no legal card reaches the target the trick is a hurt whatever is played (1 health,
 * `the-hunt.md` §7), so the choice collapses to what to throw away, and it throws the junkiest.
 * That is the moment a Cheat is worth spending, which `skilledPolicy.ts` handles before this runs.
 */
export function chooseFollow(state: RoundState, legal: readonly Card[]): Card {
  const skullTrick = isSkulled(skullsOn(state), state.currentTrick[0].card)
  const reaching = legal.filter((card) => followWins(state, card) !== skullTrick)
  // The prompt preference is applied AFTER the outcome filter, never before: ducking a skull
  // matters more than avoiding an ability prompt, so a Fox is played when only a Fox reaches the
  // outcome — the driver answers that prompt from the engine's own choice.
  if (reaching.length === 0) return junkiest(preferPromptFree(legal))
  return lowest(preferPromptFree(reaching))
}

/**
 * A Fox opens an `AbilityChoice` prompt this strategy has no answer for, so it does not lead one.
 * THE single statement of that exclusion: `trickIntent` and `chooseSkilledCard` both lead through
 * `leadCandidates`, so the plan and the play cannot pick different cards.
 *
 * DLR-163 — the Woodcutter is NO LONGER excluded. Its rule became a Swap-pile raise that carries
 * no choice, so a policy may lead or follow with one freely; the 5 was one of the two strongest
 * levers in the deck that every measured figure had been playing around.
 *
 * They could, and did: `trickIntent` planned over the whole hand while the policy filtered prompts
 * out of the play, so 30% of led tricks were played in a different suit from the one the buffs were
 * armed for — every one of those a wasted stack, and a "Misread" in the trace that was this
 * module's fault rather than a bad read.
 *
 * Falls back to the unfiltered legal set when every legal card carries a prompt: a hand of nothing
 * but Foxes must still play one.
 */
export function isPromptFree(card: Card): boolean {
  return card.rank !== CardRank.Fox
}

/** Prefer the prompt-free cards, but never return an empty set — a hand of nothing but Foxes must
 *  still play one, and the driver answers that prompt from the engine's own choice. */
function preferPromptFree(cards: readonly Card[]): readonly Card[] {
  const free = cards.filter(isPromptFree)
  return free.length > 0 ? free : cards
}

export function leadCandidates(state: RoundState): readonly Card[] {
  return preferPromptFree(legalMoves(state, PlayerSide.Player))
}

/** The lead: the card with the best chance of banking, per `leadBankOdds`. */
export function chooseLead(state: RoundState, legal: readonly Card[]): Card {
  const odds = quarrySkullOdds(state)
  let best = legal[0]
  let bestScore = -1
  for (const card of legal) {
    const score = leadBankOdds(card, state.trumpSuit, odds)
    if (score > bestScore) {
      bestScore = score
      best = card
    }
  }
  return best
}

/** The whole card decision, leading or following. */
export function chooseSkilledCard(state: RoundState): Card {
  if (state.currentTrick.length === 0) return chooseLead(state, leadCandidates(state))
  return chooseFollow(state, legalMoves(state, PlayerSide.Player))
}

/**
 * Whether following is a hurt no matter which LEGAL card is played — a forced hurt. Exported so the
 * driver can COUNT the situation independently of whether a Cheat was held to escape it, which is
 * what separates "the moment is rare" from "the player never has the card".
 */

/**
 * Whether following would be a hurt no matter which LEGAL card is played, while some card in hand
 * that follow-suit forbids would bank it. That pair of facts is exactly what a Cheat is for, and
 * nothing else in the game converts a forced hurt into a bank.
 *
 * Returns the card to play with the Cheat, or `null`. Reads `ignoreFollowSuit` through the engine's
 * own `legalMoves` rather than assembling an off-suit list here, so what the Cheat actually unlocks
 * and what this asks for cannot drift apart.
 */
/**
 * What this trick is going to be, decided BEFORE the buff window arms anything.
 *
 * The window opens only while `currentTrick` is empty, so no card is on the table yet — but two
 * things are already known and neither was being used:
 *
 * 1. WHO LEADS. `state.leader` says it outright. If it is the player, the suit is entirely the
 *    player's choice, so a Suit High card keyed to a suit the player is about to lead is not a bet.
 * 2. WHAT THE QUARRY IS LIKELY TO LEAD. `suitShape` posts how many cards it holds per suit, so the
 *    suit it holds most of is the suit it most likely leads — inference from the screen's own
 *    readout, never from its ranks.
 *
 * `willTake` names the MECHANICAL act the plan aims at: on a suit the readout says is skull-heavy
 * the plan is to go LOW, because that is a Low Victory and it banks. That single flag is what makes
 * Suit High and Suit Low mutually exclusive rather than both armed — exactly one of them can fire on
 * any trick, so arming both guarantees half the cards are wasted.
 */
export interface TrickIntent {
  readonly suit: Suit
  readonly willTake: boolean
  /** False when the Quarry leads: the suit is a prediction, so fewer cards should ride on it. */
  readonly certain: boolean
  readonly playerLeads: boolean
  /** The share of the Quarry's holding in `suit` that is skulled — what `willTake` turns on. */
  readonly skullOdds: number
  readonly held: number
  readonly skulled: number
  /** The card the plan intends to lead, or `null` when the Quarry leads. Carried so a trace can
   *  show the plan and the play side by side — they must agree, and a gap between them is a bug in
   *  this module rather than a bad read. */
  readonly plannedCard: Card | null
}

export function trickIntent(state: RoundState): TrickIntent | null {
  if (state.currentTrick.length !== 0) return null
  const odds = quarrySkullOdds(state)
  if (state.leader === PlayerSide.Player) {
    const candidates = leadCandidates(state)
    if (candidates.length === 0) return null
    const card = chooseLead(state, candidates)
    const skull = odds[card.suit] ?? 0
    // DLR-167 — `skulledCards`, NOT `skullsOn`: the QUARRY's own dealt skulls, as above.
    const row = suitShape(state.hands[PlayerSide.Cpu], state.skulledCards).find(
      (r) => r.suit === card.suit,
    )
    return {
      suit: card.suit,
      willTake: skull < 0.5,
      certain: true,
      playerLeads: true,
      skullOdds: skull,
      held: row?.held ?? 0,
      skulled: row?.skulled ?? 0,
      plannedCard: card,
    }
  }
  // The Quarry leads. Its likeliest suit is the one it holds most of — `suitShape`'s counts, which
  // are posted on screen, and no rank is read.
  // DLR-167 — `skulledCards`, NOT `skullsOn`: the QUARRY's own dealt skulls, as above.
  const shape = suitShape(state.hands[PlayerSide.Cpu], state.skulledCards)
  let likeliest = shape[0]
  for (const row of shape) if (row.held > likeliest.held) likeliest = row
  if (likeliest.held === 0) return null
  const skull = likeliest.held === 0 ? 0 : likeliest.skulled / likeliest.held
  return {
    suit: likeliest.suit as Suit,
    willTake: skull < 0.5,
    certain: false,
    playerLeads: false,
    skullOdds: skull,
    held: likeliest.held,
    skulled: likeliest.skulled,
    plannedCard: null,
  }
}

/**
 * THE buff rule: decide what the trick is going to BE, then arm only cards that can pay on it.
 *
 * MOVED here from `skilledPolicy.ts` on the DLR-162..167 fix pass, beside the `TrickIntent` it
 * reads and nothing else. It knows about buff KINDS but nothing about the pile, the pool or the
 * shop, so it sits inside this module's stated remit rather than widening it.
 *
 * Three errors this replaces, all of them visible in one trick of the published trace — the player
 * held 21 cards, armed 4, and every one of the 4 was keyed to Keys on a trick played in Bells:
 *
 * 1. ARMING A SUIT THE TRICK WILL NOT TOUCH. The window opens before either card is laid, but
 *    `state.leader` already says who leads, and when it is the player the suit is entirely their
 *    own choice. `trickIntent` picks the lead FIRST and arms to match, so a suit-keyed card is
 *    aimed at the suit actually about to be played rather than at whatever the pile holds most of.
 * 2. ARMING SUIT HIGH AND SUIT LOW TOGETHER. Suit High needs the player to go HIGH, Suit Low needs
 *    them to go LOW — exactly one can fire, so arming both is a guaranteed 50% waste of the
 *    scarcest resource in the run. `intent.willTake` picks the side and arms only that one.
 * 3. ARMING SKULL LOW WHEN PLAYING TO GO HIGH. Skull Low pays only on a Low Victory, which is a
 *    trick the player did not take, so it cannot pay on a trick being played to take.
 *
 * When the QUARRY leads, the suit is a prediction from `suitShape`'s posted counts rather than a
 * choice, so `intent.certain` is false and the caller caps the stack — a blind trick should not eat
 * the pile. Cheat is never armed through this at all; see `skilledPolicy.ts`'s `RESERVED_KINDS`.
 */
export function canPayUnder(buff: Buff, intent: TrickIntent): boolean {
  // DLR-162 fix pass — a WILD card has had its suit taken off and pays on ANY suit, so the suit
  // term does not apply to it. `buffTargetSuitOf` returns `null` for one, which `String(null)`
  // turned into the literal `'null'` — never equal to a real suit, so every wild Suit High and Suit
  // Low was silently refused arming and every simulator figure involving one understated it.
  const suitMatches = buffIsWild(buff) || String(buffTargetSuitOf(buff)) === String(intent.suit)
  switch (buff.kind) {
    case BuffKind.SuitHigh:
      return intent.willTake && suitMatches
    case BuffKind.SuitLow:
      return !intent.willTake && suitMatches
    case BuffKind.SkullLow:
      // A Low Victory is a trick the player did not take, so Skull Low can only pay when the plan
      // is to go low.
      return !intent.willTake
    default:
      return false
  }
}

export function forcedHurt(state: RoundState): boolean {
  if (state.currentTrick.length === 0) return false
  const skullTrick = isSkulled(skullsOn(state), state.currentTrick[0].card)
  return !legalMoves(state, PlayerSide.Player).some(
    (card) => followWins(state, card) !== skullTrick,
  )
}

export function cheatEscape(state: RoundState): Card | null {
  if (state.currentTrick.length === 0) return null
  const skullTrick = isSkulled(skullsOn(state), state.currentTrick[0].card)
  const reaches = (card: Card): boolean => followWins(state, card) !== skullTrick
  if (legalMoves(state, PlayerSide.Player).some(reaches)) return null
  const unlocked = legalMoves(state, PlayerSide.Player, { ignoreFollowSuit: true }).filter(reaches)
  return unlocked.length === 0 ? null : lowest(unlocked)
}
