_Part of [Hunt](README.md)._

Everything on this page was added by **DLR-66** and has **no consumer anywhere in `src/` yet**. That
is by design, not an oversight: DLR-66's job was to make every number the rest of the DLR-65 epic
needs exist in one file, provably swappable in a single edit. T3 owns the damage arithmetic that
will call `roundDamage`; T5 owns the health state that will read the totals below. Until those land,
the app still scores `Spoils × Standing` against a fixed Demand and no health bar exists.

### The two sides — `DuelSide`

`DuelSide` in `types.ts` is an `as const` union of `player` and `quarry`, with `Health` as a bare
`number` alias beside it.

It is **deliberately not** `src/warCouncil/types.ts`'s `PlayerSide` (`player` | `cpu`), and the
distinction is worth holding onto because the two will need mapping later. `PlayerSide` names the
engine's two *seats at a trick*; `DuelSide` names the two sides that *hold health*. The import
direction settles it regardless of preference: `src/warCouncil/` already imports `src/hunt/`, so
`src/hunt/` cannot import back without a cycle. The design's vocabulary (§10) also calls the
opponent the Quarry rather than the CPU.

**T5 will have to map `DuelSide.Quarry` ↔ `PlayerSide.Cpu`.** No code conflates them today — a grep
confirms `DuelSide` appears only inside `src/hunt/`. If that mapping ends up in more than one place,
a later ticket should unify the two unions rather than spreading the translation.

### The rounding rule

Both tables carry a ×0.5 band, so `card value × Standing` is fractional for the first time in this
codebase — an odd card sum under a ×0.5 band produces a half-point product. §9 records the rounding
row as **Undecided** and offers a dissolution rather than an answer: double every multiplier in both
tables and both health totals, and every product is an integer with nothing left to round. That is
the same table in a different presentation, not a different table.

DLR-66 ships a **stated default** rather than a `null`, because the epic says the row cannot be
deferred past its second phase:

- `DamageRounding` — a closed two-value union, `HalfAwayFromZero` and `None`. Two values because
  that is exactly what §9 describes: one rule, and the doubled presentation that needs no rule.
- `DAMAGE_ROUNDING` — `HalfAwayFromZero`. **The developer's to overturn**, and cheaply: switching to
  the doubled presentation is this constant plus both tables plus both health totals, every one of
  them in `config.ts`.
- `roundDamage(raw, rule = DAMAGE_ROUNDING)` — applies it.

Two implementation details carry real weight:

**It is `Math.sign(raw) * Math.round(Math.abs(raw))`, never bare `Math.round`.** JavaScript's
`Math.round` breaks ties toward `+∞`, so `Math.round(-0.5)` is `-0` — which would make the constant's
name a lie. Damage should never be negative, but the function is written to be correct rather than
to depend on that, and a test pins both `-0.5 → -1` and `0.5 → 1`.

**The rule is a defaulted parameter, not something the function closes over.** This is the same
injectable pattern `resolveStanding`'s table uses, and for the same reason: a test proves both
settings without mutating module state, so no test can leak a rounding mode into the next one.

`roundDamage` throws a `RangeError` on a non-finite input rather than rounding it. A `NaN` rounded
into a health bar renders nothing and logs nothing, which is the failure mode that never gets
reported — so it fails loudly at the one place a fractional multiplier enters the system.

### Health, the restore, and the depletion ruling

| Export | Value | Status |
|---|---|---|
| `PLAYER_START_HEALTH` | `1350` | §9 "Player health P" — **Decided 2026-08-11**, the developer's value |
| `QUARRY_ENCOUNTER_HEALTH` | `[1350, 1600]` | The first bar is §9's Decided Quarry health `H`; the 1,600 second encounter is **new to DLR-65** |
| `ENCOUNTER_PLAYER_RESTORE` | `0` | **New to DLR-65** — the epic states no restore |
| `SIMULTANEOUS_DEPLETION_WINNER` | `DuelSide.Quarry` | §5 / §9 — **Decided 2026-08-11**: both bars empty on the same Hunt and the player loses |

**`P = H` is a design property, not a coincidence.** The player's health equals the Quarry's
first-encounter health deliberately: that equality is what puts the win/lose boundary exactly on the
6/7 line the declaration commits to. §5 states the property survives any later rescaling of health,
so a future tuning pass that moves both numbers together keeps it — and one that moves only one
breaks it silently.

**Which character carries the 1,600 second bar is an assumption**, not a decision. The epic
describes that encounter only by its health total; the Monarch is named because it is the only
character with round-long enforcement on disk (`src/warCouncil/quarryRuleBreak.ts`).

`ENCOUNTER_PLAYER_RESTORE` exists as a tunable *precisely because* it is `0`. The epic's breakdown
names it the single thing most likely to change, so it is a named constant rather than an absent
mechanism — testing a restore is then a one-line edit instead of a new feature.

`quarryHealthForEncounter(index)` throws a `RangeError` rather than returning `undefined` for an
index it has no health for. Same posture as `resolveStanding`: an out-of-range index would otherwise
become `NaN` on T5's first subtraction and vanish from a health bar with no error logged anywhere.
The sequence is a `readonly Health[]` rather than a fixed two-tuple so a third encounter is one more
entry, not a type change.

`SIMULTANEOUS_DEPLETION_WINNER` is data rather than a branch so that T5 reads an attributed ruling
instead of writing an unexplained `if`.
