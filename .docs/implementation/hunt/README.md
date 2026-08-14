# Hunt — `src/hunt/`

**Status:** partial
**Built by:** DLR-48, DLR-49, DLR-50, DLR-51, DLR-52, DLR-53, DLR-63, DLR-66, DLR-67, DLR-69, DLR-70, DLR-80, DLR-81, PT-001

## Responsibility

Owns the Hunt run's vocabulary and every design-cited tunable the game turns on — since DLR-80 the
**hand size**, the **skull density and rank curve**, the **flat per-hit damage**, both health totals
and the simultaneous-depletion ruling, plus the Forage budget per encounter and the
encounters-per-run count — each read from one place so no later ticket duplicates a number or
invents an incompatible shape. It also owns `encounter.ts`, the only state in this codebase that
outlives a single `RoundState`. Its consumers in `src/warCouncil/`: the four DLR-80 keys —
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
Since DLR-80 the screen also reads `HAND_SIZE` for its trick counter. The Forage budget and the run
length are still unconsumed; later tickets wire those in.

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
| `PLAYER_START_HEALTH`                                 | **`10`** since 2026-08-14, down from DLR-80's 25 (which itself replaced DLR-66's 1,350, belonging to the retired Standing arithmetic). Small on purpose: a small integer held in the head against a CPU bar in the hundreds. **Provisional** — 25 left the player's bar never actually under threat inside a three-hand encounter                                                                                                                                                                                                                                                | `config.ts`           |
| `QUARRY_ENCOUNTER_HEALTH`, `quarryHealthForEncounter` | **`[400]`** since 2026-08-14 — one entry, **set from play rather than derived** (450 on 2026-08-13, trimmed alongside the cut in player health). **Provisional.** The accessor still throws `RangeError` rather than returning `undefined` (an out-of-range index would become `NaN` on the first subtraction and vanish from a bar with nothing logged); keeping it is what turns a stale `encounterIndex: 1` into a loud failure now that the array holds one entry                                                                                                            | `config.ts`           |
| `ENCOUNTER_PLAYER_RESTORE`                            | `0` — health restored entering the next encounter. New to DLR-65; exists as a tunable precisely because the breakdown names it the thing most likely to change                                                                                                                                                                                                                                                                                                                                                                                                                   | `config.ts`           |
| `SIMULTANEOUS_DEPLETION_WINNER`                       | `DuelSide.Quarry` — §5/§9, **Decided 2026-08-11**: both bars empty on the same Hunt and the player loses. Data rather than a hardcoded branch, so the ruling stays attributable (DLR-66 AC8). **Read by `encounter.ts`'s `resolveWinner` since DLR-70** — overturning §9's ruling is still an edit to this file alone                                                                                                                                                                                                                                                            | `config.ts`           |
| `DuelSide`                                            | `as const` union of `player` / `quarry` — the two sides that **hold health**, deliberately distinct from `src/warCouncil/`'s `PlayerSide` (`player`/`cpu`), which names the two **seats at a trick**. `src/hunt/` cannot import from `src/warCouncil/` without a cycle (DLR-66)                                                                                                                                                                                                                                                                                                  | `types.ts`            |
| `Health`                                              | A bare `number` alias — a side's remaining health, the pool damage depletes (§5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `types.ts`            |
| `IncomingDamage`                                      | `Readonly<Record<DuelSide, Damage>>` — one damage event **keyed by the side it is applied to**, never by the side that dealt it. The convention is carried across the module boundary deliberately, so the `PlayerSide` → `DuelSide` crossing happens exactly once, on the warCouncil side — in `bank.ts`'s `incomingFrom` since DLR-80, previously `scoring.ts`'s `duelSideDamage`                                                                                                                                                                                              | `types.ts`            |
| `EncounterState`                                      | `{ health: Readonly<Record<DuelSide, Health>>; damageEventsApplied: number; winner: DuelSide \| null }` — the fight against one Quarry, and the first state in this codebase that outlives one `RoundState`. Immutable: `applyDamage` returns a new one. **`huntsApplied` was renamed `damageEventsApplied` by DLR-80**, because damage now lands several times a hand and a Hunt-shaped counter would be wrong on its face. It is a counter and **not** a cap. Holds no `RoundState` and no `PlayerSide`                                                                        | `types.ts`            |
| `startEncounter`                                      | `(encounterIndex, playerHealth = PLAYER_START_HEALTH) => EncounterState` — both bars read from DLR-66's configured totals, never from literals. The index **selects** the Quarry's bar and sequences nothing; `ENCOUNTER_PLAYER_RESTORE` is deliberately unread (DLR-73's). Throws `RangeError` on a non-finite or non-positive starting health, and lets `quarryHealthForEncounter`'s own `RangeError` surface on a bad index (DLR-70)                                                                                                                                          | `encounter.ts`        |
| `applyDamage`                                         | `(encounter, incoming) => EncounterState` — **one damage event, applied as it happens**, which since DLR-80 may fire several times across a hand rather than once at its end. Renamed from `applyHunt`. `incoming` arrives already keyed by the side it depletes (`incomingFrom` performs the crossing), so this function inverts nothing and cannot get it backwards. Depletes **both** bars before inspecting either, which is what makes the simultaneous-depletion case reachable. Throws `RangeError` on an already-resolved encounter and on non-finite or negative damage | `encounter.ts`        |
| `isEncounterResolved`                                 | `(encounter) => boolean` — `winner !== null`, exported rather than left to callers so DLR-71's render guard and DLR-73's loop condition cannot disagree about what "resolved" means (DLR-70)                                                                                                                                                                                                                                                                                                                                                                                     | `encounter.ts`        |
| `FORAGE_BUDGET_PER_ENCOUNTER`                         | `4` — provisional Forage edits per encounter (§9)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `config.ts`           |
| `ENCOUNTERS_PER_RUN`                                  | `5` — provisional run length (§9 leaves this undecided; DLR-48 supplies a playable placeholder)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `config.ts`           |
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
- **File-size budget** — measured after DLR-80: `config.ts` 95, `encounter.ts` 138, `types.ts` 60,
  `index.ts` 25, all far
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
  itself; whatever Forage becomes, it edits printed ranks now.
- **Both health totals came from play and neither is settled.** `PLAYER_START_HEALTH = 10` and
  `QUARRY_ENCOUNTER_HEALTH[0] = 400`, both set 2026-08-14 and **neither yet played at that value**.
  The design refuses to derive the Quarry's: it depends on how large real cash-outs get, which is a
  function of play — too low and an encounter is over in two hands, too high and it is a grind. The
  measurement to take is the biggest cash-out per hand, and the thing to watch on the player's side
  is whether losses inside one hand now threaten the bar. See
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
