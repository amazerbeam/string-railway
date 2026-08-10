# Hunt — `src/hunt/`

**Status:** partial
**Built by:** DLR-48, DLR-49, DLR-50, DLR-51, DLR-52, DLR-53

## Responsibility

Owns the Hunt run's vocabulary and every §9-cited tunable that will drive its scoring — the
Standing band table, the card base value rule, the Demand curve's shape, the Forage budget per
encounter, and the encounters-per-run count — each read from one place so no later Hunt ticket
duplicates a number or invents an incompatible shape. Three exports now have real consumers in
`src/warCouncil/`: `cardBaseValue` via `spoils.ts` (DLR-49), `resolveStanding` via `scoring.ts`
(DLR-50, which migrated `tricksToPoints` onto it and built `scoreHunt` on top), and (DLR-51)
`QuarryCharacter` itself, whose first production consumer is `src/warCouncil/quarryRuleBreak.ts`'s
round-long rule-break mechanism. A fourth followed in DLR-52: `TELEGRAPH_FIDELITY`, read by
`cpuPlayer.ts`'s `quarryIntent` to decide how much of the Quarry's next move the telegraph reveals.
This module also now ships the Quarry's player-facing display data — a name and one sentence per
character (DLR-51), rendered since DLR-53 by `src/app/warCouncil/QuarryDossier.tsx` without
restating the rule.

**DLR-53 gave this module its first UI consumers.** Two new keys — `FIXED_DEMAND` and
`SLICE_QUARRY_CHARACTER` — are read by `src/App.tsx`, which builds the `Hunt` the round mount now
requires; and `resolveStanding`, `quarryCharacterInfo`, and the `Demand`/`Spoils`/`StandingBand`
types are read directly by the Hunt screen (see
[../war-council-ui/hunt-readouts-and-telegraph.md](../war-council-ui/hunt-readouts-and-telegraph.md)).
The Demand curve, the Forage budget, and the run length are still unconsumed; later Hunt tickets
(T9 run state, T11 Forage) wire those in.

## Key types & exports

| Export | Purpose | File |
|---|---|---|
| `Hunt` | One 13-trick round — `{ quarry, demand }`, scored once via Spoils × Standing checked against Demand (§1, §10) | `types.ts` |
| `Quarry` | The CPU opponent for one encounter — `{ character: QuarryCharacter }` (§4) | `types.ts` |
| `QuarryCharacter` | `as const` union of the five odd-rank characters: Swan, Fox, Woodcutter, Witch, Monarch | `types.ts` |
| `Spoils`, `Standing`, `Demand` | Each a bare `number` alias — the additive term, the multiplicative term, and the score target from §1's equation | `types.ts` |
| `Score` | A bare `number` alias for the equation's result — Spoils × Standing, the value `checkDemand` compares against the Demand (DLR-50) | `types.ts` |
| `StandingBandName` | `as const` union of the four band names: Humble, Defeated, Victorious, Greedy | `config.ts` |
| `StandingBand` | `{ minTricks, maxTricks, name, multiplier }` — one row of the Standing table; boundaries and multiplier are independently editable fields | `config.ts` |
| `STANDING_BANDS` | The 6-row Standing table (§9), originally transcribed from `warCouncil/scoring.ts`'s hard-coded bands and, since DLR-50, their only home | `config.ts` |
| `resolveStanding` | Resolves a trick count to its `StandingBand` by scanning a table (defaults to `STANDING_BANDS`) — since DLR-50, the only Standing lookup anywhere in `src/` | `config.ts` |
| `cardBaseValue` | `(rank) => rank` — a card's Hunt value is its printed rank, not a flat 1 (§3, §9) | `config.ts` |
| `DemandCurve`, `DEMAND_CURVE` | `{ base: number \| null; growthPerEncounter: number \| null }` — shape only, both fields deliberately `null` | `config.ts` |
| `FORAGE_BUDGET_PER_ENCOUNTER` | `4` — provisional Forage edits per encounter (§9) | `config.ts` |
| `ENCOUNTERS_PER_RUN` | `5` — provisional run length (§9 leaves this undecided; DLR-48 supplies a playable placeholder) | `config.ts` |
| `QuarryCharacterInfo` | Display data for one Quarry character — `{ character, name, description }`, player-facing text only, no rule-break logic (DLR-51) | `quarryCharacters.ts` |
| `QUARRY_CHARACTERS`, `quarryCharacterInfo` | `Partial<Record<QuarryCharacter, QuarryCharacterInfo>>` keyed map (Monarch only today) and its accessor, returning `undefined` for a character with no enforcement yet rather than fabricating a description (DLR-51) | `quarryCharacters.ts` |
| `TelegraphFidelity` | `as const` union of the two telegraph levels: `Suit`, `SuitAndStance` (DLR-52) | `config.ts` |
| `TELEGRAPH_FIDELITY` | `SuitAndStance` — how much of the Quarry's next move the telegraph reveals (§4); consumed by `src/warCouncil/cpuPlayer.ts`'s `quarryIntent` (DLR-52) | `config.ts` |
| `FIXED_DEMAND` | `220` — the slice's single Demand target, compared against `Spoils × Standing` by `checkDemand`. A **placeholder recorded at the DLR-53 planning gate**, not a chosen value; typed `Demand` (a `number`) so a `null` is a compile error rather than a silent "missed" verdict | `config.ts` |
| `SLICE_QUARRY_CHARACTER` | `Monarch` — the slice's Quarry. Not a tuning value: forced by the one character whose rule-break is actually enforced. Exists as a key so a later ticket has one place to change (DLR-53) | `config.ts` |

`index.ts` re-exports every symbol above as a barrel, split into `export type {...}` / `export
{...}` groups — the same pattern `src/warCouncil/index.ts` already uses. One exception is worth
knowing before editing that file: a name that is **both** an `as const` object and its own derived
type (`QuarryCharacter`, `StandingBandName`, `TelegraphFidelity`) appears only on the value
`export {...}` line, never also on `export type {...}`. Listing it in both raises
`TS2300: Duplicate identifier` under this project's `verbatimModuleSyntax`, and the single value-line
export already carries both meanings to consumers — `cpuPlayer.ts` imports `TelegraphFidelity` from
`../hunt` and uses it as a type annotation and a value in the same file.

## How it works

- [Scoring tunables](scoring-tunables.md) — Standing band resolution and why the table is an
  injectable parameter, the card base value rule, and the deliberately-`null` Demand curve alongside
  the two provisional run constants.
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
  inlined at a (currently nonexistent) call site; `DEMAND_CURVE`'s `null`/`null` is a deliberate,
  tested placeholder rather than an invented number, specifically because DoD 8 and §9 forbid
  choosing a value nobody has actually decided.
- **`resolveStanding` is the only Standing lookup point in `src/`.** DLR-48 introduced it alongside
  `src/warCouncil/scoring.ts`'s hard-coded `tricksToPoints` if-chain, leaving the six values
  deliberately duplicated for one ticket; DLR-50 then migrated `tricksToPoints` to
  `resolveStanding(tricks).multiplier` and ended the duplication. DLR-50's Final verification
  grepped `src/` for the old if-chain's comparison shape (`tricks <= 3`, `tricks === 4/5/6`,
  `tricks <= 9`) and found zero hits — no band boundary or multiplier survives as a literal outside
  `STANDING_BANDS`.
- **`resolveStanding` throws rather than defaulting.** A trick count outside 0–13 raises a
  `RangeError`, and neither `tricksToPoints` nor `scoreHunt` catches it. Since DLR-50 this is the
  live behaviour of the UI's scoring path too — see
  [../war-council/scoring.md](../war-council/scoring.md) for why a corrupt trick count is treated as
  a caller bug rather than scored as `0`.
- **File-size budget** — `config.ts` is 102 lines after DLR-53, `types.ts` 31, `index.ts` 18, all far
  under the project's 400-line limit. Measure with `(Get-Content <file>).Count`, **not**
  `(… | Measure-Object -Line).Lines`: the latter counts a blank line as zero and so undercounts every
  file by its blank-line count (`warCouncil.css` reports 317 that way and is actually 367).

## Deferred / not yet implemented

- **`Forage` deck edits (T11) still have zero consumers.** `FORAGE_BUDGET_PER_ENCOUNTER` is read by
  nothing. The scoring side is fully wired — `cardBaseValue` and `resolveStanding` through
  `src/warCouncil/`'s `spoils`/`scoreHunt` (see [../war-council/scoring.md](../war-council/scoring.md)),
  and, since DLR-53, onto the screen.
- **A Demand that *rises*.** DLR-53 gave the slice one fixed Demand (`FIXED_DEMAND`) so a single
  Hunt is playable end to end and reaches a real cleared/missed verdict. `DEMAND_CURVE` is still
  `{ base: null, growthPerEncounter: null }` and is read by no code — deciding, storing, and
  advancing a Demand *across encounters* is T9's run state, and DLR-53 deliberately did not start it
  (its final verification greps `config.ts` for `base: null` and expects exactly one hit).
- **`FIXED_DEMAND`'s value is nobody's decision yet.** 220 is a documented placeholder. At the
  printed multipliers a Hunt scores roughly `12k × f(k)` for `k` tricks won — ≈216 at 3 tricks, 48
  at 4, 120 at 5, 216 at 6, ≈504 at 7, ≈648 at 9, and 0 at 10+ — so 220 puts the Humble-3 and
  Defeated-6 lines on a knife edge while ~500 would make only Victorious clear. This is the number
  most likely to move after the first real playtest, and it sets what that playtest measures.
- **Choosing `DEMAND_CURVE`'s actual `base` and `growthPerEncounter` numbers.** §9 states plainly
  that no number in that row is a chosen value; both fields stay `null` until a future
  playtest/UI-driven ticket sets them.
- **Choosing `TELEGRAPH_FIDELITY`'s real value.** The constant is consumed and provably live
  (`quarryIntent` reads it, and a test proves `Suit` genuinely narrows the returned shape), and
  since DLR-53 the telegraph it governs is on screen before every commit. But `SuitAndStance` is
  DLR-52's conservative planning-gate default rather than a playtested decision — its own comment
  flags it as the value in this file most likely to move. See
  [../war-council/cpu-heuristic.md](../war-council/cpu-heuristic.md) and
  [../war-council-ui/hunt-readouts-and-telegraph.md](../war-council-ui/hunt-readouts-and-telegraph.md).
- **Tuning the Standing multipliers themselves.** §9's row is decided at the boundaries but not at
  the values. DLR-50 proved the table is genuinely live — a test raises Humble to ×18 in an injected
  copy and watches the break-even move, with no code change outside the fixture — but
  `STANDING_BANDS`' real multipliers are untouched and remain the developer's to choose.
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
