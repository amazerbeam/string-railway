import { QuarryCharacter, type Health, type Damage, type Coins } from './types'

// §5 "Player health" — DECIDED, and small on purpose: Balatro tracks 4 hands and 3 discards as
// integers held in the head against score requirements in the hundreds and thousands, and §5
// says the asymmetry here is the same shape.
// SET BY THE DEVELOPER 2026-08-14, down from 25. At 2-4 health lost a hand, 25 was roughly eight
// hands and the player's bar was never actually under threat inside a three-hand encounter —
// which made losing a trick cheap enough that throwing trick 1 (no bank to forfeit yet) was close
// to free. 10 makes a hand's worth of losses matter. Replaces DLR-66's 1,350, which belonged to
// the retired Standing arithmetic.
// UNIT: health points, depleted 1 at a time.
export const PLAYER_START_HEALTH: Health = 10

/** DLR-85 AC3 — whether a path entry is an ordinary opponent (a tick) or a stage boss
 *  (a filled block). The ONLY two node types; the ticket puts rewards, shops and events
 *  off the path explicitly. */
export const OpponentKind = {
  Ordinary: 'ordinary',
  Boss: 'boss',
} as const
export type OpponentKind = (typeof OpponentKind)[keyof typeof OpponentKind]

/**
 * DLR-85 AC4 — the ordinary opponents, in run order. THE DEVELOPER'S LIST, 2026-08-15,
 * replacing the deck-rank names (Swan, Fox, Woodcutter, Witch, Monarch) the design used
 * until now. Ten women and ten men. `as const` so an index read is a string literal
 * rather than a possibly-undefined element.
 *
 * Fadas are ordinary Unicode and need NO special handling. The ticket records plain
 * anglicisations as a fallback; nothing here implements one, because nothing needs to.
 */
export const ORDINARY_OPPONENT_NAMES = [
  'Aoife',
  'Cillian',
  'Niamh',
  'Eoin',
  'Saoirse',
  'Rónán',
  'Maeve',
  'Fergus',
  'Órla',
  'Declan',
  'Sinéad',
  'Pádraig',
  'Bríd',
  'Lorcán',
  'Clodagh',
  'Tadhg',
  'Róisín',
  'Cormac',
  'Aisling',
  'Oisín',
] as const

/** The five stage bosses, in order. Diarmuid closes the run and is the boss the design
 *  intends to ignore follow-suit — that power is a later ticket's, not this one's. */
export const STAGE_BOSS_NAMES = [
  'Bréanainn',
  'Muireann',
  'Conchobhar',
  'Gráinne',
  'Diarmuid',
] as const

/** One encounter of the run: who it is, what they are, and how much health they hold. */
export interface RunEncounterConfig {
  readonly name: string
  readonly kind: OpponentKind
  readonly health: Health
}

// How many ordinary opponents precede each stage boss. From the developer's sketch
// (2026-08-15): four ticks then a block, five times over. `runPath` NEVER reads this — a
// stage is derived from where a boss actually sits, so changing this reshapes the run
// without touching the path model.
// UNIT: ordinary opponents per stage. VALUE: the developer's.
export const ORDINARY_PER_STAGE = 4

// The health curve's three tunables. PLACEHOLDER VALUES: twenty-five hand-written figures
// would be twenty-five tuning decisions, so the SHAPE is here and the NUMBERS are the
// DEVELOPER'S — see this contract's tasks.md, "Developer decides or observes".
//
// BASE and STEP are chosen to reproduce DLR-82's existing curve EXACTLY at indices 0..2:
// 10, 14, 18. Entry 0's 10 is the developer's measured value (2026-08-14, PT-002, where
// the encounter lasted ~1.9 hands and random legal play won 63.8%) and this formula does
// not disturb it. BOSS_HEALTH_MULTIPLIER is the only genuinely new number.
//
// The run is NOT expected to be winnable on these values — Oisín holds 86 and Diarmuid
// 129 against a player starting on 10. DLR-82 already recorded that the answer is the
// shop and later stories, NOT raising PLAYER_START_HEALTH.
// UNIT: health points; health points per ordinary step; unitless multiplier.
export const ORDINARY_HEALTH_BASE: Health = 10
export const ORDINARY_HEALTH_STEP: Health = 4
export const BOSS_HEALTH_MULTIPLIER = 1.5

/**
 * `[ORDINARY_PER_STAGE × Ordinary, Boss]`, repeated until either roster list runs out —
 * so the two name lists are the run's length ceiling and no index can go out of range.
 *
 * An ordinary opponent's health is BASE + STEP × (how many ordinary opponents precede it);
 * a boss's is that same figure times the multiplier, `Math.round`ed so no fractional
 * health can reach a heart row that renders whole hearts.
 */
function buildRunEncounters(): readonly RunEncounterConfig[] {
  const encounters: RunEncounterConfig[] = []
  let ordinariesUsed = 0
  for (const bossName of STAGE_BOSS_NAMES) {
    for (let i = 0; i < ORDINARY_PER_STAGE; i += 1) {
      const name = ORDINARY_OPPONENT_NAMES[ordinariesUsed]
      if (name === undefined) break
      encounters.push({
        name,
        kind: OpponentKind.Ordinary,
        health: ORDINARY_HEALTH_BASE + ORDINARY_HEALTH_STEP * ordinariesUsed,
      })
      ordinariesUsed += 1
    }
    encounters.push({
      name: bossName,
      kind: OpponentKind.Boss,
      health: Math.round(
        (ORDINARY_HEALTH_BASE + ORDINARY_HEALTH_STEP * ordinariesUsed) * BOSS_HEALTH_MULTIPLIER,
      ),
    })
  }
  return encounters
}

/**
 * THE run's sequence — AC2's "the same source the run itself reads", literally rather than
 * approximately. Its length IS the run's length, its `kind` positions decide the stages,
 * and its `health` figures are what QUARRY_ENCOUNTER_HEALTH projects.
 *
 * MUST stay declared above QUARRY_ENCOUNTER_HEALTH: that projection reads this at module
 * init, and a forward reference evaluates as `undefined` and throws on `.map`.
 *
 * Still a plain array. Replacing the builder with twenty-five explicit literals later is a
 * local edit with no consumer change.
 */
export const RUN_ENCOUNTERS: readonly RunEncounterConfig[] = buildRunEncounters()

// The Quarry's health, one entry per encounter, in run order — now a PROJECTION of
// RUN_ENCOUNTERS rather than a hand-written literal (DLR-85). A second array beside the
// roster is the source that drifts: a fourth name with only three healths would render a
// fourth node for a fight that throws the moment the player reached it.
// Opens 10, 14, 18 exactly as it did before DLR-85.
// UNIT: health points, indexed 0..n-1 by encounter.
export const QUARRY_ENCOUNTER_HEALTH: readonly Health[] = RUN_ENCOUNTERS.map((e) => e.health)

/**
 * THE range guard for the run's sequence, in one place. Throws a `RangeError` rather than
 * returning `undefined` for the reason this module already gave: an out-of-range index
 * becomes `NaN` on the first subtraction and vanishes from a health bar with no error
 * logged anywhere. A bad index is a caller bug.
 */
export function runEncounterAt(index: number): RunEncounterConfig {
  const encounter = RUN_ENCOUNTERS[index]
  if (encounter === undefined) {
    throw new RangeError(
      `No opponent configured for encounter ${index} (${RUN_ENCOUNTERS.length} configured)`,
    )
  }
  return encounter
}

/** Unchanged signature and behaviour; the guard now lives in `runEncounterAt` so it is
 *  stated once rather than twice. */
export function quarryHealthForEncounter(index: number): Health {
  return runEncounterAt(index).health
}

// Health restored to the player entering the next encounter. NEW TO DLR-65 — the epic states
// no restore, and the breakdown names this the single thing most likely to change, so it
// exists as a tunable precisely so testing a restore is a one-line edit.
// UNIT: health points, added once between encounters. VALUE: the developer's.
export const ENCOUNTER_PLAYER_RESTORE: Health = 0

// §9 "Forage budget per encounter" — decided, provisional (developer decision,
// 2026-08-09 per DLR-48 AC3): 4 edits.
export const FORAGE_BUDGET_PER_ENCOUNTER = 4

// §9 "Encounters per run" — DERIVED, never chosen. `QUARRY_ENCOUNTER_HEALTH` is the single source
// of truth for run length (DLR-82 AC1); a free-standing number beside it is the second source that
// drifts, and any value larger than the array is a RangeError from `quarryHealthForEncounter`
// waiting to happen. Replaces DLR-48 AC3's provisional 5, which sat beside a one-entry array.
export const ENCOUNTERS_PER_RUN = QUARRY_ENCOUNTER_HEALTH.length

// DLR-83 AC1/AC2 — exactly two slots. TRANSCRIBED FROM THE TICKET, not chosen: its Dependencies
// section defends the cap at length ("the skull is the only thing stopping 'take every trick'
// from being correct, so unlimited Cheats would remove the game's only inversion"). A key so the
// number is stated once, NOT so it is easy to raise.
// UNIT: slots available to the player, for the whole run.
export const CHEAT_SLOT_COUNT = 2

// DLR-83 AC3 — how many Cheats a run opens with. SET BY THE DEVELOPER 2026-08-17, down from 2:
// a run should start empty-handed, with Cheats earned or bought rather than granted free.
// Must be 0..CHEAT_SLOT_COUNT; `grantCheats` throws outside that range rather than clamping.
// UNIT: Cheat cards granted once, at the start of a run.
export const RUN_STARTING_CHEATS = 0

// DLR-84 AC1 — what beating an opponent pays. TRANSCRIBED FROM THE TICKET (developer's
// specification, 2026-08-15), not chosen here. Credited by `recordEncounter`, which is the one
// place a fight is known to have been won.
// UNIT: coins, credited once per encounter won.
export const COINS_PER_ENCOUNTER_WIN: Coins = 1

// DLR-84 AC3 — the shop's two prices. Both TRANSCRIBED, both 1, and deliberately TWO keys rather
// than one shared price: the ticket predicts the player buying Heal every visit and names
// re-pricing the Cheat as the one-line answer, which is only one line if they are separate.
// UNIT: coins per purchase.
export const CHEAT_PRICE: Coins = 1
export const HEAL_PRICE: Coins = 1

// DLR-84 AC4 — health restored by one Heal, BEFORE the clamp to PLAYER_START_HEALTH. TRANSCRIBED.
// No longer the only source of healing: DLR-93 landed the flask below, a FREE charge-limited heal
// sized as a proportion of the maximum rather than a flat figure. There is still no rest site, and
// `ENCOUNTER_PLAYER_RESTORE` above stays deliberately unread — the flask is a separate,
// player-triggered mechanic, not that tunable finally being wired in.
// UNIT: health points, added once on purchase.
export const HEAL_HEALTH_RESTORED: Health = 4

// DLR-93 AC1 — how many flask charges a run opens with, and the figure a stage-boss kill refills
// to. TRANSCRIBED from version-4-scope.md §2 ("Carried as a single charge ... refilled to one
// charge each time a stage boss is beaten"). NOT an open tuning value: the epic explicitly defers
// re-tuning the charge count ("revisit only if it plays too thin"). ONE key rather than a separate
// refill figure, because the run's full-flask amount is one number — a second key beside it is the
// one that gets raised without the other.
// UNIT: flask charges.
export const FLASK_STARTING_CHARGES = 1

// DLR-93 AC2 — the proportion of MAXIMUM health one flask restores, before the clamp. TRANSCRIBED
// from version-4-scope.md §2 ("Restores 60% of the player's maximum health — 6 points at today's
// provisional 10"). A PROPORTION in 0..1, exactly like SKULL_DENSITY below, NOT a 0..100
// percentage — AC2's formula is Math.round(maxPlayerHealth * FLASK_HEAL_PERCENT).
// Deliberately a percentage of the maximum rather than a flat figure like HEAL_HEALTH_RESTORED
// above: it must stay an emergency heal if PLAYER_START_HEALTH moves again, as it already has once.
// UNIT: proportion of maximum health, 0..1.
export const FLASK_HEAL_PERCENT = 0.6

// DLR-90 AC1 — the Envenom price. TRANSCRIBED from version-4-scope.md's own heading ("2 coins"),
// which prices it at twice Poison Guard's cost because unlike Guard this is a guaranteed,
// unconditional hit rather than insurance against a risk. NOT chosen here and NOT a tuning value
// open today. A separate key from CHEAT_PRICE and HEAL_PRICE for the reason those two are already
// separate: re-pricing one item must not move another.
// UNIT: coins per purchase.
export const ENVENOM_PRICE: Coins = 2

// DLR-91 D2 (2026-08-19) — poison's two figures. TWO keys, not one shared number: the player-side
// hit is HALVED because it also forces the streak's cash-out (D3), which the Quarry has no
// equivalent of. A single shared key is the bug that type-checks, reads correctly, and pays the
// wrong side. Renamed from ENVENOM_DAMAGE for exactly that reason — a bare name sitting beside
// ENVENOM_PLAYER_DAMAGE is an invitation to reach for the wrong one.
//
// The Quarry's 4 is TRANSCRIBED from version-4-scope.md §1: "the same figure the doc already uses
// for 'one fight's worth of damage' (the-hunt.md §9) and for the shop's own Heal".
// The player's 2 is DEVELOPER-CHOSEN, 2026-08-19. Not transcribed and not an open tuning value.
// UNIT: health points, applied once, to one side, at the resolution of the next trick.
export const ENVENOM_QUARRY_DAMAGE: Damage = 4
export const ENVENOM_PLAYER_DAMAGE: Damage = 2

// DLR-91 AC1 — TRANSCRIBED from version-4-scope.md §1's own heading ("Fight-long — new item:
// Poison Guard, 1 coin"), which prices it level with HEAL_PRICE because both are a 1-coin-for-4-HP
// trade run in opposite directions. NOT chosen here and NOT an open tuning value. Its own key for
// the reason CHEAT_PRICE and HEAL_PRICE are already separate: re-pricing one item must not move
// another.
// UNIT: coins per purchase.
export const POISON_GUARD_PRICE: Coins = 1

// DLR-92 AC1 — the Whetstone's price. TRANSCRIBED from version-4-scope.md §1's own heading
// ("Run-permanent — new item: Whetstone (placeholder name), 4 coins"), which prices it as "the
// shop's one real splurge": four times a Heal, and reachable early only via the quick-kill payout
// rather than by grinding 1-coin fight wins. NOT chosen here and NOT an open tuning value. Its own
// key for the reason every other item's price already has one: re-pricing one item must not move
// another.
// UNIT: coins per purchase.
export const WHETSTONE_PRICE: Coins = 4

// DLR-95 AC2 — the quick-kill payout's tier curve: COINS PER CARD left unplayed, indexed by
// (hand of the fight − 1). TRANSCRIBED from version-4-scope.md §4 ("×2 in the first hand, ×1 in
// the second, ×0.5 in the third, ×0 from the fourth on"), which marks the curve "Confirmed as
// final" — NOT an open tuning value.
//
// A hand beyond this array's length pays 0, which IS AC5's taper: the array's LENGTH is the rule,
// so extending or shortening the curve is one edit here and no code change. ONE key rather than a
// separate coins-per-card rate beside it — the ×1 second-hand tier IS the design's "1 coin per
// card" base, and two numbers that must multiply out to the documented figure is the pair that
// drifts.
//
// All three values are exactly representable in binary, so `cards × multiplier` is exact and this
// needs none of the numerator/denominator treatment FORCED_CASH_OUT_* required below.
// UNIT: coins per card left unplayed in the player's hand at the kill.
export const QUICK_KILL_TIER_MULTIPLIERS: readonly number[] = [2, 1, 0.5]

export const TelegraphFidelity = {
  Suit: 'suit', // narrowest — only the lead suit is telegraphed
  SuitAndStance: 'suitAndStance', // §4's stated default — suit plus pressing/ducking
} as const
export type TelegraphFidelity = (typeof TelegraphFidelity)[keyof typeof TelegraphFidelity]

// §4's visibility table / DLR-52 AC4 — the Quarry's next-trick intent is telegraphed at this
// fidelity, never as the exact card, so §4's hidden-hand row is never violated. Conservative
// default named at the DLR-52 planning gate; the single value most likely to move after T8's
// playtest.
export const TELEGRAPH_FIDELITY: TelegraphFidelity = TelegraphFidelity.SuitAndStance

// Which opponent the single encounter is fought against. Purely an IDENTITY LABEL — it selects
// a name for the dossier panel and nothing else. No character carries a mechanical power:
// DLR-81 deleted the Monarch's round-long rule-break, and powers are deferred to a final-boss
// ticket rather than given to every opponent. Forced by what QUARRY_CHARACTERS holds, so not a
// tuning value; it exists as a key so the later roster ticket has one place to change.
export const SLICE_QUARRY_CHARACTER: QuarryCharacter = QuarryCharacter.Monarch

// §3.1/§5 — six cards each, six tricks. ONE constant, not two: every card dealt is played, so
// hand size and trick count cannot differ, and two constants that must be equal is a bug waiting
// for one of them to be edited. SETTLED (§5).
// UNIT: cards dealt to each side, and therefore tricks in a hand.
export const HAND_SIZE = 6

// §5 "Skull density, first CPU" — roughly 30% of the CPU's dealt cards carry a skull. SETTLED as
// a proportion; the count it produces is Math.round(HAND_SIZE * SKULL_DENSITY) = 2 of 6, which is
// 33%. AC2 requires this be named rather than written at its point of use.
// UNIT: proportion of the CPU's dealt hand, 0..1.
export const SKULL_DENSITY = 0.3

// §5 "Damage to the player" — 1, every time they take damage (AC10). SETTLED.
// UNIT: health points per damage event.
export const DAMAGE_PER_HIT: Damage = 1

// version-4-scope §3 / DLR-94 AC4 — a FORCED cash-out (a hit the player did not choose) pays this
// fraction of `bank × multiplier`. A cash-out the player CHOSE (`voluntaryCashOut.ts`) and the
// end-of-hand one both pay in full; this is the "you got caught before you applied" cost, and it
// is what makes Apply Damage a decision rather than a button with no wrong answer.
// SETTLED by the design on 2026-08-19. UNIT: dimensionless ratio, numerator over denominator.
//
// TWO CONSTANTS RATHER THAN ONE FLOAT, and that is arithmetic rather than style. `2 / 3` is
// 0.6666666666666666, so `3 * (2 / 3)` is 1.9999999999999998 and floors to 1 where the rule says
// 2 — wrong for every multiple of 3. Keeping them separate lets `forcedCashValue` multiply before
// it divides, so the dividend is an exact integer.
export const FORCED_CASH_OUT_NUMERATOR: number = 2
export const FORCED_CASH_OUT_DENOMINATOR: number = 3
