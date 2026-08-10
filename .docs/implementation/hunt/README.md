# Hunt — `src/hunt/`

**Status:** partial
**Built by:** DLR-48, DLR-49

## Responsibility

Owns the Hunt run's vocabulary and every §9-cited tunable that will drive its scoring — the
Standing band table, the card base value rule, the Demand curve's shape, the Forage budget per
encounter, and the encounters-per-run count — each read from one place so no later Hunt ticket
duplicates a number or invents an incompatible shape. `cardBaseValue` now has a real consumer —
`src/warCouncil/spoils.ts` (DLR-49) — but every other export (`resolveStanding`, the Demand curve,
the Forage budget, the run length) is still unconsumed; a later Hunt ticket (T4 Standing/Demand,
T11 Forage) wires those in.

## Key types & exports

| Export | Purpose | File |
|---|---|---|
| `Hunt` | One 13-trick round — `{ quarry, demand }`, scored once via Spoils × Standing checked against Demand (§1, §10) | `types.ts` |
| `Quarry` | The CPU opponent for one encounter — `{ character: QuarryCharacter }` (§4) | `types.ts` |
| `QuarryCharacter` | `as const` union of the five odd-rank characters: Swan, Fox, Woodcutter, Witch, Monarch | `types.ts` |
| `Spoils`, `Standing`, `Demand` | Each a bare `number` alias — the additive term, the multiplicative term, and the score target from §1's equation | `types.ts` |
| `StandingBandName` | `as const` union of the four band names: Humble, Defeated, Victorious, Greedy | `config.ts` |
| `StandingBand` | `{ minTricks, maxTricks, name, multiplier }` — one row of the Standing table; boundaries and multiplier are independently editable fields | `config.ts` |
| `STANDING_BANDS` | The 6-row Standing table (§9), transcribed from `warCouncil/scoring.ts`'s existing hard-coded bands | `config.ts` |
| `resolveStanding` | Resolves a trick count to its `StandingBand` by scanning a table (defaults to `STANDING_BANDS`) — the only place in `src/hunt/` doing this lookup | `config.ts` |
| `cardBaseValue` | `(rank) => rank` — a card's Hunt value is its printed rank, not a flat 1 (§3, §9) | `config.ts` |
| `DemandCurve`, `DEMAND_CURVE` | `{ base: number \| null; growthPerEncounter: number \| null }` — shape only, both fields deliberately `null` | `config.ts` |
| `FORAGE_BUDGET_PER_ENCOUNTER` | `4` — provisional Forage edits per encounter (§9) | `config.ts` |
| `ENCOUNTERS_PER_RUN` | `5` — provisional run length (§9 leaves this undecided; DLR-48 supplies a playable placeholder) | `config.ts` |

`index.ts` re-exports every symbol above as a barrel, split into `export type {...}` / `export
{...}` groups — the same pattern `src/warCouncil/index.ts` already uses.

## How it works

### Standing band resolution

`STANDING_BANDS` is a flat array of six `StandingBand` rows covering trick counts 0–13 with no gap
and no overlap: 0–3 Humble ×6, 4 Defeated ×1, 5 Defeated ×2, 6 Defeated ×3, 7–9 Victorious ×6,
10–13 Greedy ×0. `resolveStanding(tricks, table = STANDING_BANDS)` in `config.ts` does a linear
scan for the row whose `[minTricks, maxTricks]` contains `tricks`, and throws a `RangeError` for
anything outside 0–13 (there's always exactly one match inside that range by construction, so an
out-of-range call is treated as a caller bug, not a data gap). The table is a second, optional
parameter rather than a value the function closes over directly — this is what lets
`__tests__/config.test.ts` prove the function is genuinely table-driven (a test builds a mutated
copy of the table, confirms the resolved multiplier changes, then confirms the real
`STANDING_BANDS` export is unaffected) without ever mutating shared module state between tests.

### Card base value

`cardBaseValue(rank)` in `config.ts` is a one-line identity function (`rank => rank`) encoding the
§9/§3 decision that a card's Hunt value is its printed rank rather than a flat 1 — flat 1 would
collapse Spoils×Standing to the single-variable function `2k×f(k)`; rank-weighting keeps the two
terms of the scoring equation independent.

### Demand curve, Forage budget, and run length

`DEMAND_CURVE` ships as `{ base: null, growthPerEncounter: null }`, typed `DemandCurve` with both
fields `number | null` — not defaulted to `0` or any other number. §9 marks this row "Undecided,"
and DLR-48's own acceptance criteria supply provisional numbers for every other §9 row except this
one; a consumer must not coerce either field to `0`. `FORAGE_BUDGET_PER_ENCOUNTER` (`4`) and
`ENCOUNTERS_PER_RUN` (`5`) are the two constants DLR-48 does supply provisional values for, each
with a comment citing its §9 row and provisional status.

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
- **`resolveStanding` is the only new Standing lookup point.** `src/warCouncil/scoring.ts`'s
  existing `tricksToPoints` performs the identical trick-count → multiplier lookup over the same six
  values, but is explicitly left untouched by DLR-48 (AC7) — the two are intentionally duplicated
  until a future ticket (T4) migrates `scoring.ts` to call `resolveStanding` instead.
- **File-size budget** — `config.ts` is 74 lines, `types.ts` 28, `index.ts` 13, all far under the
  project's 400-line limit.

## Deferred / not yet implemented

- **Wiring into gameplay beyond `cardBaseValue`.** `Spoils` capture (DLR-49) is wired —
  `src/warCouncil/spoils.ts` calls `cardBaseValue` for every real call (see
  [../war-council/scoring.md](../war-council/scoring.md)'s Spoils section) — but `resolveStanding`,
  `Standing`/`Demand` checked against a running score (T4), and `Forage` deck edits (T11) are all
  still future tickets in the DLR-46 epic with zero consumers today.
- **Migrating `src/warCouncil/scoring.ts`'s `tricksToPoints` to call `resolveStanding`.** Deferred to
  T4 by DLR-48's own AC7; until then the same six Standing values are intentionally declared twice.
- **Choosing `DEMAND_CURVE`'s actual `base` and `growthPerEncounter` numbers.** §9 states plainly
  that no number in that row is a chosen value; both fields stay `null` until a future
  playtest/UI-driven ticket sets them.
- **The `Snare` in-round edit layer.** §3's in-round layer is explicitly blocked and out of scope
  for the whole DLR-46 epic — no type or stub exists for it anywhere in this module.
- **A settings UI or any runtime config editor, and any persistence.** Every value here is edited in
  source and picked up on page reload — sufficient for this prototype stage; nothing reads or writes
  `localStorage` or any other store.
