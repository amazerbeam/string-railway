# Hunt — `src/hunt/`

**Status:** partial
**Built by:** DLR-48, DLR-49, DLR-50, DLR-51, DLR-52, DLR-53, DLR-63, DLR-66, DLR-67, DLR-69, DLR-70, DLR-80, DLR-81, DLR-82, DLR-83, DLR-84, PT-001, PT-002

## Responsibility

Owns the Hunt run's vocabulary and every design-cited tunable the game turns on — since DLR-80 the
**hand size**, the **skull density and rank curve**, the **flat per-hit damage**, both health totals
and the simultaneous-depletion ruling, plus the Forage budget per encounter and the
encounters-per-run count — each read from one place so no later ticket duplicates a number or
invents an incompatible shape. It also owns `encounter.ts` and — since DLR-82 — `run.ts`, the
two pieces of state in this codebase that outlive a single `RoundState`, one nested inside the
other: an encounter is one fight, a run is the sequence of them and the health carried through. Its consumers in `src/warCouncil/`: the four DLR-80 keys —
`HAND_SIZE` via `deal.ts` and `playCard.ts`, `SKULL_DENSITY` and `SKULL_RANK_WEIGHTS` via `skulls.ts`,
and `DAMAGE_PER_HIT` via `bank.ts` — plus (DLR-52) `TELEGRAPH_FIDELITY`, read by `cpuPlayer.ts`'s
`quarryIntent` to decide how much of the Quarry's next move the telegraph reveals. **`QuarryCharacter`
is no longer a `src/warCouncil/` consumer at all**: DLR-81 removed the round-long rule-break and the
`quarryCharacter` state field with it, so the engine never sees a character. This module also ships
the Quarry's player-facing display data — **a name only** since DLR-81 — rendered by
`src/app/warCouncil/QuarryDossier.tsx`.

**DLR-53 gave this module its first UI consumers.** `SLICE_QUARRY_CHARACTER` is read by
`src/App.tsx`, which builds the `Hunt` the round mount requires, and `quarryCharacterInfo` is read
directly by the Hunt screen (see
[../war-council-ui/hunt-readouts-and-telegraph.md](../war-council-ui/hunt-readouts-and-telegraph.md)).
Since DLR-80 the screen also reads `HAND_SIZE` for its trick counter. The Forage budget is still
unconsumed; a later ticket wires it in. **The run length stopped being unconsumed at DLR-82** — it
is now derived from `QUARRY_ENCOUNTER_HEALTH.length` and drives a real sequence of fights.

**DLR-82 added the run, and it is the ticket that gave this module a second lifetime above the
encounter.** `run.ts` holds `RunState` — a position in the configured sequence plus the encounter
being fought at it — and four transitions that decide when a run is won, lost, or merely waiting on
the player. `QUARRY_ENCOUNTER_HEALTH` widened from one entry to **three, rising** (`[10, 14, 18]`),
and `ENCOUNTERS_PER_RUN` stopped being a free-standing `5` beside a one-entry array and became an
alias of that array's length. `startEncounter`'s injectable `playerHealth` parameter — present since
DLR-70 and never called with an argument until now — is what makes the carry between fights nearly
free. See [The run — sequencing encounters](run-sequence.md).

**DLR-83 gave the run something to carry besides health, and it is this module's first
player-only advantage.** `cheats.ts` is a new pure module holding `CheatCard` and the two-slot cap;
`RunState` gained `cheats` and a monotonic `nextCheatId`; `startRun` grants from configuration and
`advanceRun` carries them across a fight boundary through the spread it already had. The one
breaking change in the ticket is `recordEncounter`'s **required third parameter** — the survivors a
hand reports upward — chosen over a second transition precisely so the compiler enumerates the call
sites rather than trusting a caller to remember both. The *rule* a Cheat buys lives in
`src/warCouncil/legalMoves.ts`, not here. See [Cheats — the held card and the slot cap](cheats-and-slots.md).

**DLR-84 gave the run an economy, and it is the ticket that finally called DLR-83's two unread
foundations.** `shop.ts` is a new pure module holding a two-item catalogue, a price lookup, and
**one predicate** — `refusalFor` — that decides whether a purchase may be made; `RunState` gained
`coins`, seeded to 0 and credited by `recordEncounter` at the single moment a fight is won; and
`buyFromShop` deducts a price and then either mints a Cheat through `addCheat` (using
`nextCheatId`, which now advances) or raises player health by `HEAL_HEALTH_RESTORED`, clamped by
`Math.min`. Four transcribed tunables came with it. The convention the ticket introduces is worth
carrying forward: **`refusalFor` is read by the transition that throws, the button that greys, the
driver guard that no-ops, and the warning that fires — and is never re-derived at a call site.** See
[Coins and the shop](coins-and-the-shop.md).

**DLR-63 added the Lose path's vocabulary, and DLR-80 deleted the last of it.** `config.ts` gained
rank inversion and the credit cap; DLR-67 removed the cap, and DLR-80 removed the inversion along
with the declaration union that selected it. Nothing of the Win/Lose direction remains in this
module.

**DLR-80 replaced this module's entire scoring surface, and it is by far the largest deletion it has
taken.** Sixteen exports from `config.ts` and three types went at once: both Standing multiplier
tables and everything that read them, the whole card-value apparatus (`cardBaseValue`,
`invertedCardValue`, `RANK_INVERSION_PIVOT`, `CardValueScheme` and its accessors), and the damage
rounding pair. Four keys replaced them — `HAND_SIZE`, `SKULL_DENSITY`, `SKULL_MIN_RANK`
(since replaced by `SKULL_RANK_WEIGHTS`, PT-001), `DAMAGE_PER_HIT` — and `PLAYER_START_HEALTH`
dropped from 1,350 to 25 (and since to **10**) while
`QUARRY_ENCOUNTER_HEALTH` narrowed from two entries to one **placeholder**. `applyHunt` became
`applyDamage` and `EncounterState.huntsApplied` became `damageEventsApplied`, because damage now
lands several times a hand rather than once at the end of a 13-trick Hunt — a Hunt-shaped name and
counter would have been wrong on their face. See
[the hand, the skulls, and the damage constants](hand-and-skull-tunables.md).

**DLR-66 opened the DLR-65 duel redesign, and it was the first ticket to change this module's shape
rather than add to it.** It replaced the single `STANDING_BANDS` table with two per-declaration
tables and made `resolveStanding`'s table parameter required. **All of it was deleted by DLR-80**;
the entry is kept because the health vocabulary it introduced in the same ticket — `DuelSide`,
`Health`, both totals, the restore and the depletion ruling — survives and is still load-bearing.

**DLR-70 gave the module its first _behaviour_ rather than more vocabulary, and it is where three of
DLR-66's inert constants finally got a reader.** `encounter.ts` is a new file and the first thing in
the codebase holding state that outlives one `RoundState`: an immutable `EncounterState` with both
health bars and a damage-event count, one transition, a single clamp point, and the three end
conditions with the tie read from `SIMULTANEOUS_DEPLETION_WINNER`. `PLAYER_START_HEALTH`,
`quarryHealthForEncounter` and that ruling all have production readers; `ENCOUNTER_PLAYER_RESTORE`
still does not, deliberately. It shipped with **no app caller at all** — the duel resolved under
Vitest and nowhere else — and **DLR-71 wired it up**. **DLR-80 then changed when it fires**: the
transition is now `applyDamage`, called once per trick that cashes or hits rather than once per Hunt
on a confirmation press, and the reducer rather than `App.tsx` owns the live `EncounterState`. See
[The encounter state and the end conditions](encounter-state-and-end-conditions.md).

**DLR-67 was the epic's first deletion ticket.** `FIXED_DEMAND`, `DEMAND_CURVE`, the `DemandCurve`
interface, `LOSE_CREDITS_PER_HUNT` and the `Demand` type alias all went; `Hunt` narrowed from three
required fields to `{ quarry }`; and `Score` was renamed `Damage`. `Hunt` and `Damage` both survive
DLR-80 unchanged.

## Key types & exports

| Export                                                | Purpose                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | File                  |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| `Hunt`                                                | The encounter's framing — `{ quarry }` since DLR-67. Unchanged by DLR-80, though what a "Hunt" contains is not: hands are six tricks and damage lands per trick                                                                                                                                                                                                                                                                                                                                                                                                                  | `types.ts`            |
| `HAND_SIZE`                                           | `6` — cards a side, **and therefore tricks in a hand**. Deliberately one constant, not two: every card dealt is played, so they cannot differ. Replaced `src/warCouncil/types.ts`'s `TRICKS_PER_ROUND` (DLR-80)                                                                                                                                                                                                                                                                                                                                                                  | `config.ts`           |
| `SKULL_DENSITY`                                       | `0.3` — the proportion of the Quarry's dealt hand carrying a skull; `Math.round(6 × 0.3)` = **2 of 6**. Stated as a proportion so it scales with the hand size (DLR-80)                                                                                                                                                                                                                                                                                                                                                                                                          | `config.ts`           |
| `SkullRankWeights`                                    | `Readonly<Record<number, number>>` — a relative weight per rank; `0` means never, and only the ratios matter. **Replaced `SKULL_MIN_RANK`** (PT-001): "no skull on a rank 1" is now `1: 0` in every curve, which extends the rule to any curve added later rather than only to the current draw                                                                                                                                                                                                                                                                                  | `config.ts`           |
| `SKULL_WEIGHTS_UNIFORM`, `_RAMP`, `_HUMP`, `_AMBUSH`  | The four shipped curves. **Only `_HUMP` has a reader; the other three are exported and unread ON PURPOSE** — they are the difficulty and variety lever for a later opponent, so a boss can differ by its skull curve rather than by a rule-break. **Do not delete them as dead code** (PT-001)                                                                                                                                                                                                                                                                                   | `config.ts`           |
| `SKULL_RANK_WEIGHTS`                                  | The curve in force — `SKULL_WEIGHTS_HUMP`, weight on the middle ranks. **Provisional:** chosen by the developer 2026-08-14 from a rendered comparison and a 300,000-hand simulation, but not yet played, so the weights are expected to move. Changing this one reference play-tests a different shape (PT-001)                                                                                                                                                                                                                                                                  | `config.ts`           |
| `DAMAGE_PER_HIT`                                      | `1` — health points the player loses per damage event, flat. Does not scale with the cards, the streak, or the hand. Typed `Damage` (DLR-80)                                                                                                                                                                                                                                                                                                                                                                                                                                     | `config.ts`           |
| `Quarry`                                              | The CPU opponent for one encounter — `{ character: QuarryCharacter }` (§4)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `types.ts`            |
| `QuarryCharacter`                                     | `as const` union of the five odd-rank characters: Swan, Fox, Woodcutter, Witch, Monarch                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `types.ts`            |
| `Damage`                                              | A bare `number` alias — health points removed from a bar by one event. Renamed from `Score` by DLR-67. Since DLR-80 a value of this type is either `DAMAGE_PER_HIT` (to the player) or a `bank × multiplier` cash-out (to the Quarry), always a non-negative **integer** — the rounding rule that used to be needed went with the ×0.5 multiplier bands                                                                                                                                                                                                                          | `types.ts`            |
| `PLAYER_START_HEALTH`                                 | **`10`** since 2026-08-14, down from DLR-80's 25 (which itself replaced DLR-66's 1,350, belonging to the retired Standing arithmetic). Small on purpose: an integer held in the head. **Provisional** — 25 left the player's bar never actually under threat inside a three-hand encounter. Since PT-002 the Quarry's bar is also 10, so the two are no longer asymmetric                                                                                                                                                                                                                                                | `config.ts`           |
| `QUARRY_ENCOUNTER_HEALTH`, `quarryHealthForEncounter` | **`[10, 14, 18]`** since DLR-82 — **three entries, rising**, one per fight of the run. Entry 0 keeps PT-002's `10`, set from play rather than derived (450 on 2026-08-13, 400 alongside the cut in player health, then 10 when the bank stopped counting card values and a hand's damage fell from ~84 to ~7.2). Entries 1–2 are a **documented placeholder**: AC1 fixed the _shape_ (≥3, rising, not all equal), the _numbers_ are the developer's. The accessor still throws `RangeError` rather than returning `undefined` — an out-of-range index would become `NaN` on the first subtraction and vanish from a bar with nothing logged — and DLR-82 widened only the range of indices that do **not** throw; its signature and contract are unchanged | `config.ts`           |
| `ENCOUNTER_PLAYER_RESTORE`                            | `0` — health restored entering the next encounter. New to DLR-65; exists as a tunable precisely because the breakdown names it the thing most likely to change                                                                                                                                                                                                                                                                                                                                                                                                                   | `config.ts`           |
| `SIMULTANEOUS_DEPLETION_WINNER`                       | `DuelSide.Quarry` — §5/§9, **Decided 2026-08-11**: both bars empty on the same Hunt and the player loses. Data rather than a hardcoded branch, so the ruling stays attributable (DLR-66 AC8). **Read by `encounter.ts`'s `resolveWinner` since DLR-70** — overturning §9's ruling is still an edit to this file alone                                                                                                                                                                                                                                                            | `config.ts`           |
| `DuelSide`                                            | `as const` union of `player` / `quarry` — the two sides that **hold health**, deliberately distinct from `src/warCouncil/`'s `PlayerSide` (`player`/`cpu`), which names the two **seats at a trick**. `src/hunt/` cannot import from `src/warCouncil/` without a cycle (DLR-66)                                                                                                                                                                                                                                                                                                  | `types.ts`            |
| `Health`                                              | A bare `number` alias — a side's remaining health, the pool damage depletes (§5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `types.ts`            |
| `IncomingDamage`                                      | `Readonly<Record<DuelSide, Damage>>` — one damage event **keyed by the side it is applied to**, never by the side that dealt it. The convention is carried across the module boundary deliberately, so the `PlayerSide` → `DuelSide` crossing happens exactly once, on the warCouncil side — in `bank.ts`'s `incomingFrom` since DLR-80, previously `scoring.ts`'s `duelSideDamage`                                                                                                                                                                                              | `types.ts`            |
| `EncounterState`                                      | `{ health: Readonly<Record<DuelSide, Health>>; damageEventsApplied: number; winner: DuelSide \| null }` — the fight against one Quarry, and the first state in this codebase that outlives one `RoundState`. Immutable: `applyDamage` returns a new one. **`huntsApplied` was renamed `damageEventsApplied` by DLR-80**, because damage now lands several times a hand and a Hunt-shaped counter would be wrong on its face. It is a counter and **not** a cap. Holds no `RoundState` and no `PlayerSide`                                                                        | `types.ts`            |
| `startEncounter`                                      | `(encounterIndex, playerHealth = PLAYER_START_HEALTH) => EncounterState` — both bars read from DLR-66's configured totals, never from literals. The index **selects** the Quarry's bar and sequences nothing — sequencing is `run.ts`'s (DLR-82), which calls this once per fight and passes the health carried out of the last. `ENCOUNTER_PLAYER_RESTORE` remains deliberately unread. Throws `RangeError` on a non-finite or non-positive starting health, and lets `quarryHealthForEncounter`'s own `RangeError` surface on a bad index (DLR-70)                                                                                                                                          | `encounter.ts`        |
| `applyDamage`                                         | `(encounter, incoming) => EncounterState` — **one damage event, applied as it happens**, which since DLR-80 may fire several times across a hand rather than once at its end. Renamed from `applyHunt`. `incoming` arrives already keyed by the side it depletes (`incomingFrom` performs the crossing), so this function inverts nothing and cannot get it backwards. Depletes **both** bars before inspecting either, which is what makes the simultaneous-depletion case reachable. Throws `RangeError` on an already-resolved encounter and on non-finite or negative damage | `encounter.ts`        |
| `isEncounterResolved`                                 | `(encounter) => boolean` — `winner !== null`, exported rather than left to callers so DLR-71's render guard and the run loop's condition cannot disagree about what "resolved" means. Since DLR-82 both readers exist: `App.tsx`'s verdict switch and `run.ts`'s `outcomeFor` (DLR-70)                                                                                                                                                                                                                                                                                                                                                                                     | `encounter.ts`        |
| `FORAGE_BUDGET_PER_ENCOUNTER`                         | `4` — provisional Forage edits per encounter (§9)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `config.ts`           |
| `ENCOUNTERS_PER_RUN`                                  | **`QUARRY_ENCOUNTER_HEALTH.length`** since DLR-82 — **derived, never chosen.** It was a free-standing `5` sitting beside a one-entry array; anything that had trusted it would have thrown `RangeError` out of `quarryHealthForEncounter(1)`. The array is the single source of truth for run length (AC1), so the two cannot disagree                                                                                                                                                                                                                                          | `config.ts`           |
| `RunState`                                            | `{ encounterIndex, encounterCount, encounter, outcome, cheats, nextCheatId, coins }` — a position in the configured sequence plus the encounter being fought at it. **Holds no separate player-health field**: the carried figure is `encounter.health[DuelSide.Player]`, and a second copy beside it is a number that drifts (DLR-82). `coins` was added by DLR-84 and is carried by the same spread                                                                                                                                                                                                                                                                     | `run.ts`              |
| `RunOutcome`                                          | `as const` union — `InProgress` / `Won` / `Lost`. `InProgress` covers **both** "the fight is live" and "the fight is won, the next one waits"; the difference is `encounter.winner` read through `canAdvanceRun`, not a fourth outcome (DLR-82)                                                                                                                                                                                                                                                                                                                                | `run.ts`              |
| `startRun`                                            | `(playerHealth = PLAYER_START_HEALTH) => RunState` — fight 0, both bars from configuration. Propagates `startEncounter`'s and `quarryHealthForEncounter`'s `RangeError`s rather than catching them, so a mis-configured curve fails loudly at startup (DLR-82)                                                                                                                                                                                                                                                                                                                 | `run.ts`              |
| `recordEncounter`                                     | `(run, encounter, cheats) => RunState` — adopts the encounter a hand reported upward and re-derives the outcome. **The single place AC4 and AC5 are decided.** Throws `RangeError` on a run that has already ended, which would otherwise be silently resurrected (DLR-82). **DLR-83 added the third parameter and made it required rather than optional** — the hand owns the Cheats for its lifetime and hands the survivors back, and an optional parameter would let a caller silently drop a spend so the run quietly refilled the slot. The one breaking signature change in that ticket | `run.ts`              |
| `CheatCard`, `CheatCardId`                            | A held Cheat — `{ id }` and deliberately nothing else, plus its numeric id alias. An **object rather than a counter** so a spend names a specific card, React gets a stable key, and DLR-84 has somewhere to hang a price. No kind, no name, no cost (DLR-83)                                                                                                                                                                                                                                                                                                                  | `cheats.ts`           |
| `grantCheats`, `addCheat`, `removeCheat`, `hasCheat`  | The four slot transitions. The first three **throw `RangeError` rather than clamping or no-op'ing** — an over-cap grant, a third card, and a spend of something not held are each a loud failure by design. `addCheat` has **no production caller yet**: it exists so the cap is stated once, and DLR-84's purchase is what will call it (DLR-83)                                                                                                                                                                                                                               | `cheats.ts`           |
| `CHEAT_SLOT_COUNT`                                    | `2` — slots the player holds, for the whole run. **Transcribed from the ticket, not chosen**: it says "exactly two" twice and defends the cap at length. A key so the number is stated once, **not** so it is easy to raise (DLR-83)                                                                                                                                                                                                                                                                                                                                           | `config.ts`           |
| `RUN_STARTING_CHEATS`                                 | `2` — Cheats granted once, at the start of a run. **A labelled placeholder, and the developer's to choose**: the ticket requires the grant come from configuration and names no number; `2` fills both slots so the mechanic is exercisable. Must stay within `0..CHEAT_SLOT_COUNT` — `grantCheats` throws outside it rather than clamping (DLR-83)                                                                                                                                                                                                                            | `config.ts`           |
| `Coins`                                               | A bare `number` alias — the run's spendable currency. A whole number, never fractional and never negative: `buyFromShop` refuses a purchase it cannot pay for rather than going below zero (DLR-84)                                                                                                                                                                                                                                                                                                                                                                            | `types.ts`            |
| `COINS_PER_ENCOUNTER_WIN`                             | `1` — what beating an opponent pays. **Transcribed from the ticket**, not chosen. Credited by `recordEncounter`, the one place a fight is known to have been won (DLR-84)                                                                                                                                                                                                                                                                                                                                                                                                     | `config.ts`           |
| `CHEAT_PRICE`, `HEAL_PRICE`                           | `1` each — the shop's two prices. Both transcribed, and **deliberately two keys rather than one shared price**: the ticket predicts the player buying Heal every visit and names re-pricing the Cheat as the answer, which is only one line if they are separate (DLR-84)                                                                                                                                                                                                                                                                                                     | `config.ts`           |
| `HEAL_HEALTH_RESTORED`                                | `4` — health restored by one Heal, **before** the clamp to `PLAYER_START_HEALTH`. Transcribed. **The only source of healing in the game**: there is no flask and no rest site, and `ENCOUNTER_PLAYER_RESTORE` stays deliberately unread beside it (DLR-84)                                                                                                                                                                                                                                                                                                                    | `config.ts`           |
| `ShopItem`, `SHOP_ITEMS`                              | The two-member catalogue — `Cheat` / `Heal` — and the ordered list of it. **THE statement of what the shop sells**: the screen maps `SHOP_ITEMS` and never lists the two items itself (DLR-84)                                                                                                                                                                                                                                                                                                                                                                                | `shop.ts`             |
| `PurchaseRefusal`                                     | `as const` union of three reason **codes** — `SlotsFull` / `AlreadyFullHealth` / `NotEnoughCoins`. Codes, not sentences: `src/hunt/` holds no user-facing copy, and `src/app/run/shopLabels.ts` maps each to words (DLR-84)                                                                                                                                                                                                                                                                                                                                                    | `shop.ts`             |
| `ShopStock`                                           | `{ coins, cheatCount, playerHealth, maxPlayerHealth }` — everything the refusal rules need and nothing else. **Deliberately not a `RunState`**: this module states the shop's rules and must not learn the run's shape. Built by `shopStockFor` (DLR-84)                                                                                                                                                                                                                                                                                                                       | `shop.ts`             |
| `priceOf`                                             | `(item) => Coins` — an exhaustive `switch`, not a `Record`, so a third item is a compile error here rather than an `undefined` price at runtime (DLR-84)                                                                                                                                                                                                                                                                                                                                                                                                                      | `shop.ts`             |
| `refusalFor`                                          | `(stock, item) => PurchaseRefusal \| null` — **THE single statement of whether a purchase is available**, and the ticket's load-bearing arrangement. Read by `buyFromShop` (which throws), by `App.tsx`'s derived `refusals` prop (which greys the control and prints the reason), by `App.tsx`'s purchase guard (which no-ops), and by `canBuyAnything`. Item-specific reasons come **before** the coin check — the durable reason wins — and a non-finite balance refuses rather than letting `NaN >= 1` read as "not enough coins" by accident (DLR-84)                    | `shop.ts`             |
| `canBuyAnything`                                      | `(stock) => boolean` — `SHOP_ITEMS.some()` over `refusalFor`, **never a second reading of the rules**. What the verdict's `Continue` warning fires on: affordability, not a non-zero balance, because a warning a player cannot act on is noise (DLR-84)                                                                                                                                                                                                                                                                                                                       | `shop.ts`             |
| `shopStockFor`                                        | `(run, maxPlayerHealth = PLAYER_START_HEALTH) => ShopStock` — projects a run into the four figures the rules need, so no screen assembles a `ShopStock` by hand and gets one field wrong (DLR-84)                                                                                                                                                                                                                                                                                                                                                                             | `run.ts`              |
| `buyFromShop`                                         | `(run, item, maxPlayerHealth = PLAYER_START_HEALTH) => RunState` — deduct the price, then mint a Cheat through `addCheat` (advancing `nextCheatId`) or raise player health by `HEAL_HEALTH_RESTORED` clamped by `Math.min`. **Throws a `RangeError` naming the refusal** rather than returning the run unchanged — a silent no-op is the "took payment for nothing" failure `addCheat` already refuses. Writes into `encounter.health[Player]` because that **is** the carried figure, and deliberately not through `applyDamage`, which refuses a resolved encounter (DLR-84) | `run.ts`              |
| `canAdvanceRun`                                       | `(run) => boolean` — "the Quarry is down and there is another fight". One statement, so the screen offering the control and the transition performing it cannot disagree (DLR-82)                                                                                                                                                                                                                                                                                                                                                                                             | `run.ts`              |
| `advanceRun`                                          | `(run) => RunState` — the next fight, opened on the health carried out of the last one via `startEncounter`'s injectable parameter. Restores nothing. Throws rather than returning the run unchanged, which would present a stuck screen as success (DLR-82)                                                                                                                                                                                                                                                                                                                   | `run.ts`              |
| `QuarryCharacterInfo`                                 | Display data for one Quarry character — `{ character, name }`. **No rule field**: DLR-81 removed `description` with the power it described, and a test pins the key set                                                                                                                                                                                                                                                                                                                                                                                                          | `quarryCharacters.ts` |
| `QUARRY_CHARACTERS`, `quarryCharacterInfo`            | `Partial<Record<QuarryCharacter, QuarryCharacterInfo>>` keyed map (Monarch only) and its accessor, returning `undefined` for a character with no entry rather than fabricating one (DLR-51)                                                                                                                                                                                                                                                                                                                                                                                      | `quarryCharacters.ts` |
| `TelegraphFidelity`                                   | `as const` union of the two telegraph levels: `Suit`, `SuitAndStance` (DLR-52)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `config.ts`           |
| `TELEGRAPH_FIDELITY`                                  | `SuitAndStance` — how much of the Quarry's next move the telegraph reveals (§4); consumed by `src/warCouncil/cpuPlayer.ts`'s `quarryIntent` (DLR-52)                                                                                                                                                                                                                                                                                                                                                                                                                             | `config.ts`           |
| `SLICE_QUARRY_CHARACTER`                              | `Monarch` — the slice's Quarry, and **an identity label only**: it selects a name for the dossier and has no mechanical effect (DLR-81). Not a tuning value; forced by the one character with a `QUARRY_CHARACTERS` entry. Exists as a key so a later ticket has one place to change (DLR-53)                                                                                                                                                                                                                                                                                    | `config.ts`           |

`index.ts` re-exports every symbol above as a barrel, split into `export type {...}` / `export
{...}` groups — the same pattern `src/warCouncil/index.ts` already uses. One exception is worth
knowing before editing that file: a name that is **both** an `as const` object and its own derived
type (`QuarryCharacter`, `TelegraphFidelity` and `DuelSide`) appears only on the value
`export {...}` line, never also on `export type {...}`. Listing it in both raises
`TS2300: Duplicate identifier` under this project's `verbatimModuleSyntax`, and the single value-line
export already carries both meanings to consumers — `cpuPlayer.ts` imports `TelegraphFidelity` from
`../hunt` and uses it as a type annotation and a value in the same file.

## How it works

- [The hand, the skulls, and the damage constants](hand-and-skull-tunables.md) — `HAND_SIZE` and why
  it is one constant rather than two, the skull density and the count it produces, the **four rank
  curves and which one is in force**, why the rank floor became a zero weight, the flat per-hit
  damage, both health totals, the `DuelSide` vs `PlayerSide` distinction, and the full list of what
  DLR-80 deleted from this module (DLR-80, PT-001; supersedes the retired `scoring-tunables.md` and
  `duel-health-and-damage.md`).
- [The encounter state and the end conditions](encounter-state-and-end-conditions.md) — `EncounterState`
  and its one transition, the single clamp point where surplus damage is discarded and health stops at
  zero, the three end conditions and why the tie reads a config constant, the four refusals, why there
  is no Hunt cap, and how long an encounter actually runs (3–4 Hunts at the fast end, 18–23 at the
  tail). **Live in the app since DLR-71** — `App.tsx` carries the state, the reducer applies the damage.
- [The run — sequencing encounters](run-sequence.md) — `RunState` and its four transitions, where a
  run's end is decided and why the loss check comes first, the carry that restores nothing, and why
  run length is derived from the health curve rather than stated beside it (DLR-82).
- [Cheats — the held card, the two-slot cap, and the run's grant](cheats-and-slots.md) — what a
  Cheat is and why it is an object rather than a counter, the four transitions and why three of them
  throw, how the reducer calls them without ever throwing, the minted ids, and the two configuration
  keys — one transcribed, one a placeholder (DLR-83).
- [Coins and the shop — the run's economy, and the one predicate that guards it](coins-and-the-shop.md)
  — the coin and its single payout site, the two-item catalogue and its three refusal codes, why
  `ShopStock` is not a `RunState`, the `refusalFor` convention and its four readers, the purchase
  and its clamp, and the four transcribed tunables (DLR-84).
- [The Quarry and the telegraph](quarry-and-telegraph.md) — the per-character display data and why
  it is `Partial`, and `TELEGRAPH_FIDELITY`: how much of the Quarry's next move the player is allowed
  to see (§4).

## Rules & invariants enforced

- **Pure-core boundary, shared with `src/warCouncil/`** — `eslint.config.js`'s existing
  `no-restricted-imports` / `no-restricted-globals` block (previously scoped only to
  `src/warCouncil/**/*.{ts,tsx}`) now also lists `src/hunt/**/*.{ts,tsx}` in the same `files` array,
  rather than a second copy of the block. This module may not import `react`/`react-dom` and may
  not reference DOM/network globals. Enforced by ESLint (`npm run lint`), re-grepped explicitly in
  DLR-48's Final verification (zero React/DOM/`localStorage` hits inside `src/hunt/`).
- **No fabricated tunable values** — every export in `config.ts` is read from a named constant, not
  inlined at a call site, because DoD 8 and §9 forbid choosing a value nobody has actually decided.
  DLR-67 added no key and chose no number: every constant in its diff was a deletion. **DLR-80 added
  four keys and chose no number either** — all four are settled by its design spec — and it made the
  one genuinely undecided value, `QUARRY_ENCOUNTER_HEALTH[0]`, a _labelled_ placeholder carrying its
  own reasoning in a comment rather than an unmarked figure.
- **File-size budget** — measured after DLR-84: `config.ts` 217, `run.ts` 216, `encounter.ts` 140,
  `shop.ts` 75, `types.ts` 73, `cheats.ts` 58, `index.ts` 53, all far
  under the project's 400-line limit. (`config.ts` shrank by roughly two-thirds when DLR-80 deleted
  the Standing tables and the card-value apparatus, so DLR-66's split contingency is moot.) Measure
  with `(Get-Content <file>).Count` or
  `[System.IO.File]::ReadAllLines(<file>).Length`, **not** `(… | Measure-Object -Line).Lines`: the
  latter counts a blank line as zero and so undercounts every file by its blank-line count.
  **DLR-63 is the ticket that proved this is not a pedantic footnote** — `warCouncilHunt.css` was
  reported at 367 lines by three separate measurements and was actually **423**, breaching the
  400-line ceiling undetected until the final review round, which then split it (see
  [../war-council-ui/layout-and-styling.md](../war-council-ui/layout-and-styling.md)). `CLAUDE.md`
  and `.claude/workflow/web-project.md` still prescribe the undercounting form.

## Deferred / not yet implemented

- **`Forage` deck edits still have zero consumers.** `FORAGE_BUDGET_PER_ENCOUNTER` is read by
  nothing, and DLR-80 explicitly scoped Forage and the shop out — **and with them, player-held
  skulls**. The design's "Forage value edits under inversion" question died with rank inversion
  itself; whatever Forage becomes, it edits printed ranks now. **PT-002 narrowed what that is worth**:
  a rank decides who wins a trick and nothing else, since the bank counts tricks rather than card
  values — so a "raise this card's value" edit is a trick-winning edit, not a scoring one.
- **The run's health curve is a placeholder beyond its first entry** (DLR-82).
  `QUARRY_ENCOUNTER_HEALTH` is `[10, 14, 18]`: entry 0 is PT-002's played figure, entries 1 and 2
  satisfy AC1's shape (three, rising, not all equal) and are **the developer's numbers to set**. The
  ticket's own arithmetic predicts the player losing around fight three at these values and calls
  that correct — a fight costs roughly four health and the player starts with ten, and the gap is
  what the shop and the flask exist to close. **Half of that answer now exists**: DLR-84's shop sells
  4 health for a coin, and the curve was deliberately **not** retuned in response, because whether
  that is enough of an answer is a play-session question. **Raising `PLAYER_START_HEALTH` in response
  is explicitly the wrong move** and the ticket says so. Whether to soften the ramp or add fights is
  open.
- **Both health totals came from play and neither is settled.** `PLAYER_START_HEALTH = 10` and
  `QUARRY_ENCOUNTER_HEALTH[0] = 10`, both set 2026-08-14 and **neither yet played at that value**.
  The design refuses to derive the Quarry's: it depends on how large real cash-outs get, which is a
  function of play — too low and an encounter is over in two hands, too high and it is a grind. **At
  10 it is measurably the former**: an encounter lasts ~1.9 hands and ~37% of damage is discarded as
  overkill, which was known and accepted when the number was set (PT-002). The measurement to take is
  the biggest cash-out per hand, and the thing to watch on the player's side is whether losses inside
  one hand now threaten the bar. See
  [the hand, the skulls, and the damage constants](hand-and-skull-tunables.md) for the full history
  of both numbers.
- **The skull rank curve is chosen but unplayed** (PT-001). `SKULL_RANK_WEIGHTS` is the hump curve —
  weight on the middle ranks — chosen from a simulation rather than from a session. The mechanism is
  settled and the numbers are not: whether hump is right, and whether its weights want moving, both
  answer only to playing. Reverting to `SKULL_WEIGHTS_UNIFORM` is a one-line change here.
- **No opponent carries its own curve** (PT-001). `SKULL_WEIGHTS_UNIFORM`, `_RAMP` and `_AMBUSH` are
  exported with **no production reader, deliberately** — they exist so a later opponent can be given a
  different curve as a difficulty and variety lever, which is a cheaper axis than the character
  rule-breaks DLR-81 removed. Wiring one up needs `Quarry`/`Hunt` to carry a curve and `dealRound` to
  thread it through to `assignSkulls`; none of that is built. **Do not delete the three as dead code.**
- **How many Cheats a run starts with is the developer's, and unchosen** (DLR-83).
  `RUN_STARTING_CHEATS = 2` is a labelled placeholder — it fills both slots so the mechanic can be
  exercised at all. `1` makes "when do I spend it" a sharper question from the first fight, which is
  the question the ticket says a play session must answer; `0` satisfies the letter of the grant and
  makes the ticket unplayable. `CHEAT_SLOT_COUNT = 2` beside it is **not** open — it is transcribed
  from the ticket, which defends the cap at length.
- **Buying a Cheat is BUILT** (DLR-84) — this entry and the one that followed it are both closed.
  `addCheat` and `nextCheatId` were laid down unread by DLR-83 and flagged as this ticket's
  foundations; `buyFromShop` now calls both, and `nextCheatId` advances on every purchase so a spent
  card's id cannot be re-issued as a colliding React key. **Selling and replacing are still absent**
  and nothing is designed for either. What remains deliberately out of scope here is narrower than
  "an economy": no third item, no price curve, no reroll, no rotating shelf, and no payout basis
  beyond beating an opponent — overkill damage as currency was named by PT-002 and is still not
  built.
- **Whether the shop's prices are right is the developer's, and unmeasured** (DLR-84).
  `COINS_PER_ENCOUNTER_WIN`, `CHEAT_PRICE` and `HEAL_PRICE` are all `1` and `HEAL_HEALTH_RESTORED`
  is `4` — every one transcribed from the ticket, none invented. The ticket's own prediction is that
  the player will take Heal on every visit, because a heal is a guaranteed 4 health against a fight
  costing about 4 while a Cheat is worth about 1 health directly. **If Heal is bought every single
  time, the Cheat is mispriced rather than uninteresting**, and the two prices are separate keys so
  the fix is one line.
- **Whether 4 health per fight is the right answer to the fight-three wall** (DLR-84). The heal makes
  a run measurably easier and **nothing else was retuned in response** — `QUARRY_ENCOUNTER_HEALTH`
  and `PLAYER_START_HEALTH` are both untouched, deliberately, because the right response to a new
  economy is a play session rather than a pre-emptive rebalance.
- **Coins are not persisted, and this ticket did not change that** (DLR-84). They die on reload with
  the rest of `RunState`; cross-run carry-over is explicitly out of scope. The first ticket that adds
  a save file inherits a `coins` field with no migration story.
- **The Demand is gone, and there is nothing left to decide about it.** DLR-67 deleted
  `FIXED_DEMAND`, `DEMAND_CURVE`, the `DemandCurve` interface and the `Demand` alias outright. §9
  deleted the Demand base/growth row rather than marking it Undecided, because the duel direction
  replaces the comparator itself — a side's total is damage to the other's health, not a score
  checked against a target. Nothing in this module names a Demand any more.
- **The Lose-credit cap is gone with its mechanic.** `LOSE_CREDITS_PER_HUNT` was a placeholder whose
  derivation was already void; §1 says the Lose path's **pile swap replaces the credit mechanism
  outright**, so DLR-67 deleted the constant rather than tuning it. The pile swap itself is **DLR-69's**
  (corrected by DLR-68, which was previously named here and does not own it).
- **Choosing `TELEGRAPH_FIDELITY`'s real value.** The constant is consumed and provably live
  (`quarryIntent` reads it, and a test proves `Suit` genuinely narrows the returned shape), and
  since DLR-53 the telegraph it governs is on screen before every commit. But `SuitAndStance` is
  DLR-52's conservative planning-gate default rather than a playtested decision — its own comment
  flags it as the value in this file most likely to move. See
  [../war-council/cpu-heuristic.md](../war-council/cpu-heuristic.md) and
  [../war-council-ui/hunt-readouts-and-telegraph.md](../war-council-ui/hunt-readouts-and-telegraph.md).
- **The `Snare` in-round edit layer.** §3's in-round layer is explicitly blocked and out of scope
  for the whole DLR-46 epic — no type or stub exists for it anywhere in this module.
- **Names for four of the five Quarry characters.** `QUARRY_CHARACTERS` has an entry only for the
  Monarch; the Witch, Fox, Woodcutter, and Swan have no name here. A one-encounter build needs one
  opponent, so this is not blocking.
- **No character has a power, and no power is designed.** DLR-81 removed the only one that existed.
  Powers are intended for a **final boss** rather than for every opponent — a later ticket designs
  the mechanic before anything is added back here, and must add copy and enforcement together. See
  [../war-council/README.md](../war-council/README.md)'s Deferred section.
- **Nothing _schedules_ a Quarry character.** `src/App.tsx` reads `SLICE_QUARRY_CHARACTER` into the
  `Hunt` it builds, so every encounter shows the Monarch's name on its dossier. That is one
  constant, not a schedule — which character appears in which encounter is still a later ticket's
  run-scheduling work. Historical note: while the rule-break existed, this constant also made a
  known-stale UI string reachable — resolved by the removal, see
  [../war-council-ui/README.md](../war-council-ui/README.md)'s Deferred section.
- **A settings UI or any runtime config editor, and any persistence.** Every value here is edited in
  source and picked up on page reload — sufficient for this prototype stage; nothing reads or writes
  `localStorage` or any other store.
