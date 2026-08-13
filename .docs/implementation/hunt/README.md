# Hunt — `src/hunt/`

**Status:** partial
**Built by:** DLR-48, DLR-49, DLR-50, DLR-51, DLR-52, DLR-53, DLR-63, DLR-66, DLR-67, DLR-69, DLR-70

## Responsibility

Owns the Hunt run's vocabulary and every §9-cited tunable that drives its scoring — since DLR-66 the
**two mirrored Standing multiplier tables**, the card base value rule and its per-declaration
accessor, the ×0.5 rounding rule, both health totals and the simultaneous-depletion ruling, plus the
Forage budget per encounter and the encounters-per-run count — each read
from one place so no later Hunt ticket duplicates a number or invents an incompatible shape. Three exports now have real consumers in
`src/warCouncil/`: the card-value accessors via `spoils.ts` (DLR-49 first wired `cardBaseValue`;
DLR-67 moved it to the per-declaration `cardValueFor`; DLR-69 widened it again to
`cardValueSchemeFor`, which carries the paid pile alongside the value function), `resolveStanding` via `scoring.ts`
(DLR-50, which built `scoreHunt` on it), and (DLR-51)
`QuarryCharacter` itself, whose first production consumer is `src/warCouncil/quarryRuleBreak.ts`'s
round-long rule-break mechanism. A fourth followed in DLR-52: `TELEGRAPH_FIDELITY`, read by
`cpuPlayer.ts`'s `quarryIntent` to decide how much of the Quarry's next move the telegraph reveals.
This module also now ships the Quarry's player-facing display data — a name and one sentence per
character (DLR-51), rendered since DLR-53 by `src/app/warCouncil/QuarryDossier.tsx` without
restating the rule.

**DLR-53 gave this module its first UI consumers**, and `SLICE_QUARRY_CHARACTER` is read by
`src/App.tsx`, which builds the `Hunt` the round mount requires; `resolveStanding`,
`quarryCharacterInfo`, and the `Spoils`/`StandingBand` types are read directly by the Hunt screen
(see [../war-council-ui/hunt-readouts-and-telegraph.md](../war-council-ui/hunt-readouts-and-telegraph.md)).
The Forage budget and the run length are still unconsumed; later Hunt tickets (T11 Forage) wire
those in.

**DLR-63 added the Lose path's vocabulary; DLR-67 removed half of it again.** `config.ts` gained the
rank inversion (`RANK_INVERSION_PIVOT`, `invertedCardValue`) — which survives and is now load-bearing
— plus the credit cap `LOSE_CREDITS_PER_HUNT`, which is gone with the mechanic it capped.
`invertedCardValue` was given `cardBaseValue`'s exact `(rank: number) => number` signature
deliberately, so it drops into `spoils`'s injectable value parameter with no new plumbing — see
[../war-council/scoring.md](../war-council/scoring.md). The declaration union itself
(`HuntDeclaration`) lives here rather than in `src/warCouncil/` because it is Hunt vocabulary that
both the engine and the screen name.

**DLR-66 opened the DLR-65 duel redesign, and it is the first ticket to change this module's shape
rather than add to it.** The single `STANDING_BANDS` table is gone, replaced by
`HUNT_MULTIPLIER_TABLES` — one table per declaration, with genuinely differing row splits — and
`resolveStanding`'s table parameter became **required**, which is what forced its seven call sites to
name a declaration explicitly. Twelve new value exports and one new type landed alongside it: the
per-declaration card-value accessor, the rounding pair, both health totals with their accessor, the
restore, the depletion ruling, and the `DuelSide`/`Health` vocabulary. **Only the tables and the two
accessors have consumers** — everything to do with damage or health is exported and inert until T3
and T5, so nothing about the duel is playable yet. The contract deliberately excluded DLR-67's
deletions (`FIXED_DEMAND`, `DEMAND_CURVE`, `LOSE_CREDITS_PER_HUNT`, the credit mechanism) so its own
diff read as an addition plus one table replacement.

**DLR-70 gave the module its first *behaviour* rather than more vocabulary, and it is where three of
DLR-66's inert constants finally got a reader.** `encounter.ts` is a new file and the first thing in
the codebase holding state that outlives one `RoundState`: an immutable `EncounterState` with both
health bars and an applied-Hunt count, one `applyHunt` transition, a single clamp point, and the three
end conditions with the tie read from `SIMULTANEOUS_DEPLETION_WINNER`. `PLAYER_START_HEALTH`,
`quarryHealthForEncounter` and that ruling all have production readers now; `ENCOUNTER_PLAYER_RESTORE`
still does not, deliberately (DLR-73's). It shipped with **no app caller at all** — the duel resolved
under Vitest and nowhere else — and **DLR-71 wired it up**: `src/App.tsx` seeds an `EncounterState` from
`startEncounter` and carries it Hunt to Hunt, `roundReducer.ts` calls `applyHunt`, and both
`isEncounterResolved` call sites are live, so health now depletes on screen and an encounter ends where
a player can see it. See
[The encounter state and the end conditions](encounter-state-and-end-conditions.md).

**DLR-67 is the epic's deletion ticket, and it is where this module got smaller.** `FIXED_DEMAND`,
`DEMAND_CURVE`, the `DemandCurve` interface, `LOSE_CREDITS_PER_HUNT` and the `Demand` type alias are
all gone; `Hunt` narrowed from three required fields to `{ quarry }`; and `Score` was renamed
`Damage`. It also closed the gap DLR-66 opened: `cardValueFor`'s no-modifier rule now has a consumer
and is enforced, because `src/warCouncil/spoils.ts` calls it.

## Key types & exports

| Export | Purpose | File |
|---|---|---|
| `Hunt` | One 13-trick round — `{ quarry }` since DLR-67. Each side's `card value × Standing` is damage to the other (§1, §10). Narrowed from `{ quarry, demand, loseCredits }` when the Demand and the Lose-credit pool were both retired | `types.ts` |
| `HuntDeclaration` | `as const` union of the two declarable paths, `Win` / `Lose`, chosen off the dealt hand before the first trick (DLR-63 AC1) | `types.ts` |
| `Quarry` | The CPU opponent for one encounter — `{ character: QuarryCharacter }` (§4) | `types.ts` |
| `QuarryCharacter` | `as const` union of the five odd-rank characters: Swan, Fox, Woodcutter, Witch, Monarch | `types.ts` |
| `Spoils`, `Standing` | Each a bare `number` alias — the additive and the multiplicative term of §1's equation. The `Demand` alias was deleted by DLR-67 along with the target it named | `types.ts` |
| `Damage` | A bare `number` alias for the equation's result — a side's card value × its Standing for one Hunt, what depletes the other side's health (§1's vocabulary table). Renamed from `Score` by DLR-67: there is no target to score against any more. Since DLR-68 every value of this type is **rounded** (`roundDamage` is applied inside `scoreHunt`) and is labelled with the side it depletes. Since DLR-70 it is also **applied**: `applyHunt` subtracts it from a bar via `encounter.ts`. No screen shows the result — DLR-71's | `types.ts` |
| `StandingBandName` | `as const` union of the four band names: Humble, Defeated, Victorious, Greedy | `config.ts` |
| `StandingBand` | `{ minTricks, maxTricks, name, multiplier }` — one row of the Standing table; boundaries and multiplier are independently editable fields | `config.ts` |
| `HUNT_MULTIPLIER_TABLES` | `Readonly<Record<HuntDeclaration, readonly StandingBand[]>>` — the duel direction's **two mirrored tables**, one per declaration, replacing the retired single `STANDING_BANDS` (DLR-66 AC1). The two tables' row splits genuinely differ (Win groups 7–9, Lose groups 4–6), which is why boundaries are per-row data and never a shared list | `config.ts` |
| `standingTableFor` | `(declaration) => readonly StandingBand[]` — the declaration-aware accessor, and the **only** way a consumer outside this module gets a table (DLR-66 AC2) | `config.ts` |
| `resolveStanding` | Resolves a trick count to its `StandingBand` by scanning a **caller-supplied** table. The `table` parameter is **required** since DLR-66 — a default would let a Lose-path caller silently score off the Win table. Still throws `RangeError` outside 0–13; still the only Standing lookup anywhere in `src/` | `config.ts` |
| `cardBaseValue` | `(rank) => rank` — a card's Hunt value is its printed rank, not a flat 1 (§3, §9) | `config.ts` |
| `cardValueFor` | `(declaration) => (rank: number) => number` — returns `cardBaseValue` on Win and `invertedCardValue` on Lose (DLR-66 AC6). The counterpart of `standingTableFor` on the additive term. **No modifier of any kind** — the Treasure `+1` and Poison `−1` are Decided-removed (§1, §9), and since DLR-67 that rule is **enforced**: the value path applies nothing on top. Since DLR-69 it is **derived from `CARD_VALUE_SCHEMES`** rather than a `declaration === Lose` ternary, so the declaration → value mapping exists exactly once; its name and signature are unchanged, which is what left its out-of-module consumers untouched. This is the **value half only** — a caller that also needs the pile wants `cardValueSchemeFor` | `config.ts` |
| `PaidPile` | `as const` union of `own` / `other` — whose capture pile a side is paid for, stated **relative** to that side, which is why it needs no `PlayerSide` and keeps `src/hunt/` free of any `src/warCouncil/` import. Resolving `other` into a concrete seat is `spoils.ts`'s job, via `otherSide` (DLR-69) | `config.ts` |
| `CardValueScheme` | `{ readonly value: (rank) => number; readonly paidPile: PaidPile }` — the two halves of §1's card-value rule bound into one object so **neither can be read without the other**. Deliberately not two parameters: a caller injecting the Lose value function while the pile defaulted from an undeclared state would apply inverted values to the *own* pile, which is exactly the DLR-67 interim DLR-69 retired (DLR-69) | `config.ts` |
| `cardValueSchemeFor` | `(declaration) => CardValueScheme` — the third sibling of `standingTableFor` and `cardValueFor`: name a declaration once, get both halves of the card-value rule. Backed by a module-private total `Readonly<Record<HuntDeclaration, CardValueScheme>>` — Win pairs `cardBaseValue` with `own`, Lose pairs `invertedCardValue` with `other`. A **total record, not a ternary**, so a third `HuntDeclaration` member is a missing-property compile error rather than a silent fall through to printed rank and the own pile (DLR-69 AC6). The record itself is not exported — this accessor is the only way in, unlike `HUNT_MULTIPLIER_TABLES`, which is exported and then documented as unusable outside this module | `config.ts` |
| `DamageRounding`, `DAMAGE_ROUNDING` | `as const` union of `HalfAwayFromZero` / `None`, and the shipped default (`HalfAwayFromZero`). §9 records this row Undecided and offers doubling both tables and both health totals as the dissolution; DLR-66 ships a stated default rather than a `null`. **The developer's to overturn** | `config.ts` |
| `roundDamage` | `(raw, rule = DAMAGE_ROUNDING) => number` — `Math.sign(raw) * Math.round(Math.abs(raw))`, never bare `Math.round` (JS breaks ties toward `+∞`, so `Math.round(-0.5)` is `-0`). Throws `RangeError` on a non-finite input. Shipped inert by DLR-66; **`scoreHunt` has been its caller since DLR-68** | `config.ts` |
| `PLAYER_START_HEALTH` | `1350` — §9 "Player health P", **Decided 2026-08-11**. Equal to the Quarry's first-encounter health by design: `P = H` puts the win/lose boundary exactly on the 6/7 line the declaration commits to | `config.ts` |
| `QUARRY_ENCOUNTER_HEALTH`, `quarryHealthForEncounter` | `[1350, 1600]` in encounter order, and an accessor that throws `RangeError` rather than returning `undefined` (an out-of-range index would become `NaN` on the first subtraction). A `readonly Health[]`, so a third encounter is one more entry, not a type change. Called by `startEncounter` since DLR-70, which relies on that throw rather than duplicating the check | `config.ts` |
| `ENCOUNTER_PLAYER_RESTORE` | `0` — health restored entering the next encounter. New to DLR-65; exists as a tunable precisely because the breakdown names it the thing most likely to change | `config.ts` |
| `SIMULTANEOUS_DEPLETION_WINNER` | `DuelSide.Quarry` — §5/§9, **Decided 2026-08-11**: both bars empty on the same Hunt and the player loses. Data rather than a hardcoded branch, so the ruling stays attributable (DLR-66 AC8). **Read by `encounter.ts`'s `resolveWinner` since DLR-70** — overturning §9's ruling is still an edit to this file alone | `config.ts` |
| `DuelSide` | `as const` union of `player` / `quarry` — the two sides that **hold health**, deliberately distinct from `src/warCouncil/`'s `PlayerSide` (`player`/`cpu`), which names the two **seats at a trick**. `src/hunt/` cannot import from `src/warCouncil/` without a cycle (DLR-66) | `types.ts` |
| `Health` | A bare `number` alias — a side's remaining health, the pool damage depletes (§5) | `types.ts` |
| `IncomingDamage` | `Readonly<Record<DuelSide, Damage>>` — one Hunt's damage **keyed by the side it is applied to**, never by the side that dealt it. `HuntOutcome.incoming`'s convention carried across the module boundary deliberately, so the `PlayerSide` → `DuelSide` crossing happens exactly once, on the warCouncil side, in `duelSideDamage` (DLR-70) | `types.ts` |
| `EncounterState` | `{ health: Readonly<Record<DuelSide, Health>>; huntsApplied: number; winner: DuelSide \| null }` — a sequence of Hunts fought until a bar empties (§5), and the first state in this codebase that outlives one `RoundState`. Immutable: `applyHunt` returns a new one, so a caller previews a Hunt by applying it to a copy rather than projecting health through a second arithmetic path. `huntsApplied` is a counter and **not** a cap (DLR-70 AC7). Holds no `RoundState` and no `PlayerSide` (DLR-70) | `types.ts` |
| `startEncounter` | `(encounterIndex, playerHealth = PLAYER_START_HEALTH) => EncounterState` — both bars read from DLR-66's configured totals, never from literals. The index **selects** the Quarry's bar and sequences nothing; `ENCOUNTER_PLAYER_RESTORE` is deliberately unread (DLR-73's). Throws `RangeError` on a non-finite or non-positive starting health, and lets `quarryHealthForEncounter`'s own `RangeError` surface on a bad index (DLR-70) | `encounter.ts` |
| `applyHunt` | `(encounter, incoming) => EncounterState` — one finished Hunt's damage applied **once**, never per trick. Depletes **both** bars before inspecting either, which is what makes the simultaneous-depletion case reachable at all. Throws `RangeError` on an already-resolved encounter, and on non-finite or negative damage — finite and non-negative but deliberately **not** integral, since `DAMAGE_ROUNDING = None` legitimately yields half-point totals (DLR-70) | `encounter.ts` |
| `isEncounterResolved` | `(encounter) => boolean` — `winner !== null`, exported rather than left to callers so DLR-71's render guard and DLR-73's loop condition cannot disagree about what "resolved" means (DLR-70) | `encounter.ts` |
| `RANK_INVERSION_PIVOT` | `12` — the pivot the Lose path's inversion turns on. **Not a tuning value**: it is `max(RANKS) + 1` for the 1–11 deck, which is what makes the inversion its own mirror (rank 1 ↔ 11) and keeps every output in 1–11 with no zero and no negative. Named rather than inlined so a future deck-size change has one place to look (DLR-63) | `config.ts` |
| `invertedCardValue` | `(rank) => 12 − rank` — a card's value on the Lose path (DLR-63 AC3). Deliberately the same `(rank: number) => number` signature as `cardBaseValue`, so both drop into a `CardValueScheme`'s `value` field with no new plumbing. Unchanged by DLR-69 in name, signature and body — which is what kept the two out-of-scope `DeclareGate` files compiling untouched | `config.ts` |
| `FORAGE_BUDGET_PER_ENCOUNTER` | `4` — provisional Forage edits per encounter (§9) | `config.ts` |
| `ENCOUNTERS_PER_RUN` | `5` — provisional run length (§9 leaves this undecided; DLR-48 supplies a playable placeholder) | `config.ts` |
| `QuarryCharacterInfo` | Display data for one Quarry character — `{ character, name, description }`, player-facing text only, no rule-break logic (DLR-51) | `quarryCharacters.ts` |
| `QUARRY_CHARACTERS`, `quarryCharacterInfo` | `Partial<Record<QuarryCharacter, QuarryCharacterInfo>>` keyed map (Monarch only today) and its accessor, returning `undefined` for a character with no enforcement yet rather than fabricating a description (DLR-51) | `quarryCharacters.ts` |
| `TelegraphFidelity` | `as const` union of the two telegraph levels: `Suit`, `SuitAndStance` (DLR-52) | `config.ts` |
| `TELEGRAPH_FIDELITY` | `SuitAndStance` — how much of the Quarry's next move the telegraph reveals (§4); consumed by `src/warCouncil/cpuPlayer.ts`'s `quarryIntent` (DLR-52) | `config.ts` |
| `SLICE_QUARRY_CHARACTER` | `Monarch` — the slice's Quarry. Not a tuning value: forced by the one character whose rule-break is actually enforced. Exists as a key so a later ticket has one place to change (DLR-53) | `config.ts` |

`index.ts` re-exports every symbol above as a barrel, split into `export type {...}` / `export
{...}` groups — the same pattern `src/warCouncil/index.ts` already uses. One exception is worth
knowing before editing that file: a name that is **both** an `as const` object and its own derived
type (`QuarryCharacter`, `StandingBandName`, `TelegraphFidelity`, and since DLR-66 `DuelSide` and
`DamageRounding`) appears only on the value
`export {...}` line, never also on `export type {...}`. Listing it in both raises
`TS2300: Duplicate identifier` under this project's `verbatimModuleSyntax`, and the single value-line
export already carries both meanings to consumers — `cpuPlayer.ts` imports `TelegraphFidelity` from
`../hunt` and uses it as a type annotation and a value in the same file.

## How it works

- [Scoring tunables](scoring-tunables.md) — the two mirrored multiplier tables and why their
  boundaries are per-row data, the required table parameter, the per-declaration card-value
  accessor, the Lose path's rank inversion, and the two provisional run constants.
- [The duel's health and damage constants](duel-health-and-damage.md) — the `DuelSide` vocabulary,
  the ×0.5 rounding rule and why it is not bare `Math.round`, both health totals, the restore, and
  the simultaneous-depletion ruling. Three of them gained their first reader in DLR-70; the restore
  is still unread.
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
  DLR-67 added no key and chose no number: every constant in its diff was a deletion.
- **`resolveStanding` is the only Standing lookup point in `src/`.** DLR-48 introduced it alongside
  `src/warCouncil/scoring.ts`'s hard-coded `tricksToPoints` if-chain, leaving the six values
  deliberately duplicated for one ticket; DLR-50 then migrated `tricksToPoints` to
  `resolveStanding(tricks).multiplier` and ended the duplication. DLR-50's Final verification
  grepped `src/` for the old if-chain's comparison shape (`tricks <= 3`, `tricks === 4/5/6`,
  `tricks <= 9`) and found zero hits.
- **No band boundary or multiplier survives as a literal outside this module**, and DLR-66 restated
  the check against the pair: zero `STANDING_BANDS` hits anywhere in `src/`, zero
  `minTricks`/`maxTricks` hits outside `src/hunt/`, and `HUNT_MULTIPLIER_TABLES` named in exactly
  three files — `config.ts`, `index.ts`, and `__tests__/config.test.ts`. The one place the table
  values are written down as literals is that test file, deliberately: a test deriving its expected
  multiplier from the code under test asserts nothing, so the transcription lives once and every
  other fixture derives from it.
- **No consumer outside this module names a table by identifier.** Callers name a *declaration* and
  `standingTableFor` resolves it — the invariant that lets the whole pair be swapped in one edit.
- **`resolveStanding` throws rather than defaulting.** A trick count outside 0–13 raises a
  `RangeError`, and `scoreHunt` does not catch it. Since DLR-50 this is the
  live behaviour of the UI's scoring path too — see
  [../war-council/scoring.md](../war-council/scoring.md) for why a corrupt trick count is treated as
  a caller bug rather than scored as `0`.
- **File-size budget** — measured after DLR-70: `config.ts` 270, `encounter.ts` 138, `types.ts` 81,
  `index.ts` 43, all far
  under the project's 400-line limit. (DLR-66's contingency, had `config.ts` passed 400, was to split
  the table pair and `standingTableFor` into `src/hunt/standingTables.ts` and re-export through the
  barrel; on the measured count it did not fire.) Measure with `(Get-Content <file>).Count` or
  `[System.IO.File]::ReadAllLines(<file>).Length`, **not** `(… | Measure-Object -Line).Lines`: the
  latter counts a blank line as zero and so undercounts every file by its blank-line count.
  **DLR-63 is the ticket that proved this is not a pedantic footnote** — `warCouncilHunt.css` was
  reported at 367 lines by three separate measurements and was actually **423**, breaching the
  400-line ceiling undetected until the final review round, which then split it (see
  [../war-council-ui/layout-and-styling.md](../war-council-ui/layout-and-styling.md)). `CLAUDE.md`
  and `.claude/workflow/web-project.md` still prescribe the undercounting form.

## Deferred / not yet implemented

- **`Forage` deck edits (T11) still have zero consumers.** `FORAGE_BUDGET_PER_ENCOUNTER` is read by
  nothing. The scoring side is fully wired — `cardValueSchemeFor` and `standingTableFor` through
  `src/warCouncil/`'s `spoils`/`scoreHunt` (see [../war-council/scoring.md](../war-council/scoring.md)),
  and, since DLR-53, onto the screen. §9's deferred "Forage value edits under inversion" question is
  still open and was explicitly out of DLR-69's scope — there is no Forage in this epic.
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
- **The Standing multipliers are no longer an open row.** §9 records "The multipliers" as **Decided
  2026-08-11 — two mirrored tables**: designed rather than transcribed, and capped at ×5 on either
  path. DLR-66 shipped that pair. They remain the developer's to *overturn* — as any settled design
  value is — and the alternative pair the epic names is proven to be a one-file swap by
  `__tests__/config.test.ts`. But the ticket-level caveat is worth carrying: **a table swap is a
  design change wearing tuning clothes.** The alternative pair moves both peaks to the extremes and
  reverses the Knizia property §1 is built on. DLR-66 made the experiment cheap; it did not make it
  neutral.
- ~~**The rounding rule, both health totals, the restore, and the depletion ruling are exported and
  entirely unconsumed.**~~ **Mostly closed — DLR-68 and DLR-70.** `roundDamage` gained its first
  caller in DLR-68 (`scoreHunt`), and DLR-70's `encounter.ts` is the first production reader of
  `PLAYER_START_HEALTH`, `quarryHealthForEncounter` (and so `QUARRY_ENCOUNTER_HEALTH`), and
  `SIMULTANEOUS_DEPLETION_WINNER`. **`ENCOUNTER_PLAYER_RESTORE` is the one that remains unread**, and
  deliberately so: it applies *between* encounters, which is DLR-73's scope, and putting a second
  reader on a key whose semantics that ticket has not fixed would be worse than leaving it inert. See
  [The encounter state and the end conditions](encounter-state-and-end-conditions.md).
- **The duel is reachable now, and one encounter is all of it.** DLR-70 closed the arithmetic — health,
  the single clamp, the three end conditions — and closed nothing about visibility; **DLR-71 closed
  that**. `src/App.tsx` imports `startEncounter` and `isEncounterResolved`, the round reducer imports
  `applyHunt`, and two health bars carry each side's pending damage every trick, so a Hunt's damage now
  lands somewhere a player can watch and an encounter ends. What is still missing is the **sequence**:
  nothing advances the encounter index, so the second Quarry at 1,600 health is unreachable, the
  between-encounter restore has no reader, and there is no outcome screen — the end panel states the
  result in place. All **DLR-73's**.
- **`DAMAGE_ROUNDING`'s value is a stated default, not a settled decision.** §9 records the row
  Undecided and offers doubling both tables and both health totals as a dissolution that deletes the
  question. `HalfAwayFromZero` with health at 1,350 / 1,600 is what ships; switching to the doubled
  presentation is `DAMAGE_ROUNDING`, both tables, and both health totals — all in `config.ts` — plus
  one fixture.
- ~~**`cardValueFor`'s no-modifier rule is exported but not enforced.**~~ **Closed by DLR-67.**
  `src/warCouncil/spoils.ts` calls the accessor and applies nothing on top; its `sumCards`
  helper and the Treasure `+1` / Poison `−1` fold are deleted. The app no longer applies ±1. DLR-69
  re-verified it by grep across the three value-path source files and added a regression guard to the
  contract's own closing checks.
- ~~**`DuelSide` and `PlayerSide` are two side-vocabularies that will need mapping.**~~ **Closed by
  DLR-70**, and closed the way this bullet asked for: the mapping landed in **exactly one place**.
  `duelSideDamage(outcome)` in `src/warCouncil/scoring.ts` is the only `PlayerSide` → `DuelSide`
  crossing in the program, and it lives on the warCouncil side because that is the side permitted to
  know both vocabularies — `src/hunt/` still cannot import `src/warCouncil/`. The two unions were not
  unified, and should not be: they name different things (seats at a trick vs. sides holding health),
  and one adapter is cheaper than collapsing the distinction. A second crossing appearing anywhere is
  the thing to grep for — see [../war-council/scoring.md](../war-council/scoring.md).
- **The `Snare` in-round edit layer.** §3's in-round layer is explicitly blocked and out of scope
  for the whole DLR-46 epic — no type or stub exists for it anywhere in this module.
- **Display data for four of the five Quarry characters.** `QUARRY_CHARACTERS` (DLR-51) has an
  entry only for the Monarch; the Witch, Fox, Woodcutter, and Swan have neither a description here
  nor round-long enforcement in `src/warCouncil/quarryRuleBreak.ts`. A later ticket closes both gaps
  together — see [../war-council/README.md](../war-council/README.md)'s Deferred section.
- **Nothing *schedules* a Quarry character.** DLR-53 ended the "no character is ever active" state:
  `src/App.tsx` passes `SLICE_QUARRY_CHARACTER` as `dealRound`'s third argument, so every round in
  the shipped app runs with the Monarch's rule-break enforced and its dossier on screen. But that is
  one constant, not a schedule — which character appears in which encounter is still a later
  ticket's run-scheduling work. One consequence worth knowing: making the Monarch active also made a
  known-stale UI string reachable — see
  [../war-council-ui/README.md](../war-council-ui/README.md)'s Deferred section.
- **A settings UI or any runtime config editor, and any persistence.** Every value here is edited in
  source and picked up on page reload — sufficient for this prototype stage; nothing reads or writes
  `localStorage` or any other store.
