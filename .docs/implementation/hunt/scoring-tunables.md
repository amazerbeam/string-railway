_Part of [Hunt](README.md)._

### Standing band resolution — two tables, one per declaration

**DLR-66 replaced the single table with a mirrored pair.** `HUNT_MULTIPLIER_TABLES` is a
`Readonly<Record<HuntDeclaration, readonly StandingBand[]>>` — one six-row array per declaration,
each row carrying its own `minTricks`/`maxTricks`:

| Tricks | Win band       | Win | Lose band      | Lose |
| ------ | -------------- | --- | -------------- | ---- |
| 0–3    | Humble         | ×1  | Humble         | ×0.5 |
| 4      | Defeated       | ×2  | Defeated (4–6) | ×5   |
| 5      | Defeated       | ×3  | Defeated (4–6) | ×5   |
| 6      | Defeated       | ×4  | Defeated (4–6) | ×5   |
| 7      | Victorious     | ×5  | Victorious     | ×4   |
| 8      | Victorious     | ×5  | Victorious     | ×3   |
| 9      | Victorious     | ×5  | Victorious     | ×2   |
| 10–13  | Greedy         | ×0.5| Greedy         | ×1   |

**The two tables' row splits genuinely differ** — Win groups 7–9 into one row, Lose groups 4–6 —
which is the reason the boundaries are per-row data and never a shared boundary list or an
`if (declaration === Lose)` fixup. A shared list would make the boundaries identical *by
construction*, which is exactly the property the design forbids; a branch would put a rule in code
instead of in data. Both alternatives were considered and rejected on those grounds.

Their defining property is **exact complementarity**: `Lose(k) = Win(13 − k)` at all fourteen
splits. That is load-bearing rather than decorative — it is what makes the same-path rule hold, and
what makes a Quarry declaring the opposite path cancel to zero damage (hybrid-design's direction
section). `__tests__/config.test.ts` asserts it over *whatever pair is configured*, so a hand-edit
that breaks it fails loudly instead of silently deleting the property.

`standingTableFor(declaration)` is the only way a consumer outside this module gets a table.
Callers name a **declaration**; the module resolves it. Nothing under `src/app/` or
`src/warCouncil/` names `HUNT_MULTIPLIER_TABLES` or any table identifier, verified by grep in
DLR-66's Final verification.

`resolveStanding(tricks, table)` does a linear scan for the row whose `[minTricks, maxTricks]`
contains `tricks`, and throws a `RangeError` outside 0–13 (there is exactly one match inside that
range by construction in *both* tables, so an out-of-range call is a caller bug, not a data gap).

**The `table` parameter is now required, and that is deliberate.** It was optional, defaulting to
the retired single table. With two tables in play, re-pointing that default at the Win table would
let a Lose-path caller who omits the argument score off the wrong table and get a plausible number
with nothing failing anywhere. Requiring it turns every such omission into a compile error — which
is also how DLR-66 found its seven call sites, rather than by grepping for them. The injectability
DLR-48 established survives unchanged: `__tests__/config.test.ts` swaps in the whole alternative
pair (different multipliers *and* the Lose side's different boundaries), confirms the resolved
multipliers change, confirms the alternative pair is still an exact complement, and confirms the
real exports are unaffected — all without mutating shared module state.

### Card value per declaration

`cardValueFor(declaration)` returns `invertedCardValue` on Lose and `cardBaseValue` on Win — both
already on disk, both unchanged, both `(rank: number) => number`. It is the exact counterpart of
`standingTableFor` on the additive term, so the module's whole public story is: *name a
declaration, get both terms of the equation.*

**No modifier of any kind is applied** — no Treasure `+1`, no Poison `−1`. Both were
Decided-removed (§1, §9 2026-08-11) on the grounds that at ×5 a ±1 card modifier moves a Hunt by 5
out of 540, under 1%. **DLR-67 made that rule live**: `src/warCouncil/spoils.ts` now calls
`cardValueFor` and applies nothing on top, and its `sumCards` helper — which had gone on folding the
±1 in for one ticket after the design removed it — is deleted. See
[../war-council/scoring.md](../war-council/scoring.md).

### Card base value

`cardBaseValue(rank)` in `config.ts` is a one-line identity function (`rank => rank`) encoding the
§9/§3 decision that a card's Hunt value is its printed rank rather than a flat 1 — flat 1 would
collapse Spoils×Standing to the single-variable function `2k×f(k)`; rank-weighting keeps the two
terms of the scoring equation independent.

### The Lose path's rank inversion

`invertedCardValue(rank)` in `config.ts` returns `RANK_INVERSION_PIVOT - rank`, i.e. `12 − r`
(DLR-63 AC3). The pivot is a named constant rather than an inlined `12`, and it is **not** a tuning
value: `12` is `max(RANKS) + 1` for this deck's 1–11 range, which is what makes the inversion its own
inverse — rank 1 and rank 11 swap, rank 6 maps to itself, and every output stays inside 1–11 with no
zero and no negative. `__tests__/config.test.ts` asserts all four of those properties directly
(the full rank table, that the mapped set equals the original set, that applying it twice is the
identity, and that rank 11 inverts to something greater than zero).

The signature match with `cardBaseValue` is the load-bearing design choice. Both are
`(rank: number) => number`, so `spoils` takes each as an injectable parameter and reads the scheme
off the declaration rather than knowing anything about how a value is computed — see
[../war-council/scoring.md](../war-council/scoring.md). Nothing here divides, so no inverted value
can be `NaN` or `Infinity`.

> **The Lose-credit cap that used to sit here is gone.** `LOSE_CREDITS_PER_HUNT` (`3`, credits per
> Hunt, each spendable on one lost trick) was a placeholder whose derivation was computed against the
> retired Demand and the retired single multiplier table. §1 says the Lose path's pile swap "replaces
> it outright", and **DLR-67 deleted the constant along with the whole mechanic** rather than tuning
> a number nobody was going to keep. See
> [../war-council/declaration-and-lose-path.md](../war-council/declaration-and-lose-path.md).

### Forage budget and run length

`FORAGE_BUDGET_PER_ENCOUNTER` (`4`) and `ENCOUNTERS_PER_RUN` (`5`) are provisional values DLR-48
supplied, each with a comment citing its §9 row and its provisional status. Both are still read by
nothing.

> **The Demand curve that used to sit here is gone.** `DEMAND_CURVE` shipped as
> `{ base: null, growthPerEncounter: null }` — a deliberately unfilled shape, because §9 marked the
> row Undecided. DLR-67 deleted it, the `DemandCurve` interface, and `FIXED_DEMAND` with it: §9
> deleted the row outright rather than leaving it Undecided, because the duel direction replaces the
> target comparison itself. There is no longer a question to answer here.
