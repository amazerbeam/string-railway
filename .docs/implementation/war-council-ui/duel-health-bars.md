_Part of [War Council UI](README.md)._

**DLR-71** built this, and it is the ticket where the duel reached the screen. Before it, health
depleted correctly and no player could see it: `src/hunt/encounter.ts` resolved encounters under
Vitest while the app dealt one Hunt, stated two damage figures, and re-dealt. This is the surface
that closes that gap — **two health bars, one per side, each carrying its own pending damage** — plus
the commit that makes the damage land where a player can watch it.

### One derivation replaces two, and one widget replaces four readouts

The change's shape is easiest to see in what was deleted. `WarCouncilRound` used to call `scoreHunt`
**twice**, handing the player's half to `HuntLedger`, which then computed `spoils * band.multiplier`
**itself** — a second arithmetic path that bypassed `roundDamage` entirely. It was not producing
wrong numbers, but only because `DAMAGE_ROUNDING` happens to be a no-op on integer products; the
first ×0.5 band with an odd card sum would have made the ledger and the end panel disagree.

Both calls are gone. `WarCouncilRound` now makes **one** call to `pendingHuntDamage(ui.round)` per
render, which returns `null` while the Hunt is undeclared and otherwise the same `HuntOutcome` that
`huntDamage` returns on a finished Hunt — the two share the private `outcomeFor`, so there is no
second total that could drift (see [../war-council/scoring.md](../war-council/scoring.md)). That
outcome is crossed into the duel's vocabulary by `duelSideDamage`, the program's only
`PlayerSide` → `DuelSide` crossing, and the crossed record is fed to `applyHunt` against a **copy**
of the live encounter to get each side's projected post-Hunt health.

This is what makes the ticket's headline guarantee structural rather than a promise: **the number the
player watches climb through thirteen tricks is the number that lands**, because the clamp at zero,
the overkill discard and the rounding are each performed at exactly one point in the program and the
bar reads the result of that same point. It is not enforced by a test — a test asserts it, in
`__tests__/WarCouncilRound.duelHealthBars.test.tsx`, but it holds because there is no second path to
drift from. `applyHunt`'s own docblock asks for precisely this, naming a second projection routine as
the thing it exists to prevent.

`HuntLedger` consequently computes nothing at all now (see below).

### The geometry is pure, and the component only formats

`duelHealthBars.ts` takes three health records — `current`, `projected`, `max` — and returns one
`HealthBarView` per side: `secure`, `pending`, `current`, `max`, `securePct`, `pendingPct`, and a
`lethal` flag. It performs **no damage arithmetic and no clamping**, because `applyHunt` did both
before `projected` arrived. Its only computation is one subtraction recovering the already-clamped
pending figure for display, and two divisions by `max`.

That divisor is the module's one guard: a non-positive or non-finite `max` throws a `RangeError`
rather than emitting a `NaN` percentage, because **a `NaN` width collapses a bar to nothing and logs
nothing anywhere** — the same reasoning `standingSegments.ts` uses for an empty table, and the reason
the guard sits on the divisor rather than on the symptom. Both configured maxima are positive, so it
is a guard and not a live path.

It carries one **documented, unasserted precondition**: `projected[side] <= current[side]` for both
sides. A caller violating it renders a negative `pending` rather than being rejected. This is
deliberately documentation rather than a second throw — the module performs no clamping by design,
and duplicating `applyHunt`'s clamp here would be the second arithmetic path the whole ticket exists
to avoid. It holds today because every caller derives `projected` either as `current` itself (pending
forced to exactly zero) or via `applyHunt`, whose `deplete` is `Math.max(0, current - damage)` and so
never increases health. A future healing mechanic or a different projection source must preserve it.

`DuelHealthBars.tsx` then **computes nothing** — the same division of labour that lets
`RoundOverPanel` make that claim. It renders whatever length of `bars` array it is handed, which is
what makes §6's net-only fallback a one-line change **in `duelHealthBars`** (return a single view
whose `pending` is the net) rather than a rewrite in the component. AC8 asked that the fallback be
cheap, not that it be built; the array return is what makes it cheap, and the contract's
`pr-description.md` is the record.

Because it imports no React and touches no DOM global, `duelHealthBars.ts` runs in the cheap `node`
Vitest project beside `standingSegments.ts` and `handOrder.ts` — the same call, for the same reason:
**how a bar is drawn is not a game rule.**

> **A Windows resolution trap this pair created.** `duelHealthBars.ts` and `DuelHealthBars.tsx`
> differ only by leading-letter case. NTFS lookups are case-insensitive and Vite tries `.ts` before
> `.tsx` for an extensionless specifier, so `from './DuelHealthBars'` resolves to the **pure-logic
> file** — which has no default export — and fails at runtime with `Element type is invalid … got:
> undefined`. Every file importing both writes **explicit extensions**. `src/App.tsx` hit the same
> trap in a second shape: `./app` collides with `App.tsx` itself, so it imports
> `./app/warCouncilMount` directly rather than the barrel.

### Pending is carved out of current health, and it shrinks

The rendering grammar is the fighting-game **recoverable-damage** segment: pending is drawn as a
lighter segment carved out of the bar's own current health, not as a second widget. `secure +
pending` always equals `current`, so the filled length **is** current health and never grows.

That property is what makes the design's own worst case legible. A tenth trick collapsing the Win
path's multiplier from ×5 to ×0.5 takes pending from 540 to 60, and it shows as the grey segment
shrinking back into solid rather than as two numbers changing in opposite directions. §6's stated
risk was four moving figures reading as noise; two bars whose own lightness carries the distinction
answers it by form. A player distinguishes *health lost* from *health at risk* **inside one bar**
rather than by comparing two readouts.

Three states, and the accessible sentence says which:

| State                        | `aria-valuetext` reads                | Why the distinction matters                                                                             |
| ---------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Undeclared, or nothing at risk | `1350 of 1350. Nothing at risk yet.` | `pendingHuntDamage` returns `null` before a declaration — a different state from a Hunt threatening zero |
| Damage pending                | `1062 of 1350. 96 at risk this Hunt.` | `aria-valuenow` carries one number; the second has to live here                                          |
| Pending would empty the bar   | `96 of 1350. Lethal this Hunt.`       | Rather than making a screen-reader user compare two figures                                             |

Each bar is one `role="meter"` — the ARIA role for a bounded reading that is **not** a task's
progress — with `aria-valuemin`/`max`/`now` and that `aria-valuetext`. Both are directly queryable by
role and name, which is what the specs use. The lethal state is a `repeating-linear-gradient` hatch
**and** an inset `box-shadow` edge, not a colour swap, so it survives greyscale and
`prefers-reduced-motion`.

The two segment widths are set as **CSS custom properties** carrying ready-made percentage strings
(`--w`), never as an inline `width`. An inline style property outranks an external rule with no
`!important`, so writing `width` here would make the stylesheet's own transition and lethal state
permanently unreachable — the same defect `HandFan`'s transform split exists to avoid, recorded in
[layout-and-styling.md](layout-and-styling.md).

### The mirror is one CSS declaration, and it costs no vertical space

The pair takes the **existing** `status` row rather than a new grid row:
`[opponent plate] [player bar] [You · Trick · Them] [quarry bar]`. `DuelHealthBars` renders the trio
through a `centre` prop, so which bar anchors left and which right lives inside the component instead
of being reassembled by its caller.

The whole of the mirror is `.wc-hp[data-side='quarry'] .wc-hp-track { flex-direction: row-reverse }`
— both bars deplete **toward the centre**. Taking the existing row is what makes the arrangement cost
**zero** new vertical space in a `100dvh` no-scroll shell, which is the cost the design idea it came
from named as the real one.

It was paid for by **moving the Standing track out of the status band into the `wc-dossier` column**.
The track is the band's widest child and its least time-critical: it says which *table* is in force,
which changes once a Hunt, while the bars change every trick. Demoting it out of the per-trick zone
is the trade, and whether the track reads cramped in a `minmax(10rem, 17vw)` column is a developer
judgement recorded in [README.md](README.md)'s Deferred list.

Each bar carries `min-width: 0` and `flex: 1 1 <basis>` so it **compresses before it pushes**. That
is not caution: this band's documented failure mode is over-fullness at phone width, where DLR-53
measured its content at 744px against a 500px viewport with a readout at `left: 682` and no scrollbar
to reveal it, because `.wc-shell`'s `overflow: hidden` converts an overflow bug into an invisibility
bug. QA measured the bars' own `getBoundingClientRect()` at every named viewport for the same reason
— a no-scroll assertion is necessary and not sufficient.

### `HuntLedger` reshaped rather than retired, and why that was the safe call

`HuntLedger` is now the **Standing readout only**: its `Spoils` cell, its two operators and its
`Damage` cell are gone, along with the `spoils * band.multiplier` product described above. The bars
carry those numbers. It computes nothing.

Reshaping it rather than deleting it was a **deliberate choice made off an audit finding**, and the
reasoning is worth keeping because nothing type-checks it. The `wc-ledger*` class family had 24
occurrences across three files — and three of them were in `warCouncilStandingTrack.css`, which was
**outside this ticket's file list**: lines 136 and 167 select `.wc-ledger-cell.wc-is-compact`, the
Standing track's own narrow-viewport fallback. Retiring the class family would have silently deleted
the narrow-viewport Standing readout, because CSS binds by string and TypeScript sees none of it. So
`.wc-ledger`, `.wc-ledger-cell`, `.wc-ledger-key` and `.wc-ledger-value` were **kept**, and only
`.wc-ledger-op` — whose two operators left with the cells they separated — was deleted. A grep
expecting *at least three* `wc-is-compact` hits is the standing check.

### The commit is a reducer transition; the movement is a CSS transition

AC4 asked for the arithmetic **then** the bars moving, and the bars only move if something commits
the damage while the panel is still on screen. So the end panel is two-stage:

1. Both sides' `Spoils × Standing = Damage` as arithmetic, bars still at pre-Hunt health with their
   pending segments, and one control: **"Apply the damage"**.
2. `applied` is set, the bars re-render at the new health with zero pending, and the control becomes
   **"Deal the next Hunt"** — or, if a bar emptied, a terminal `role="status"` line stating the
   outcome and offering no next Hunt.

`RoundUiState` gained `applied: EncounterState | null` for this — **in the existing reducer, not a
second `useState`** — and `CommitDamage` calls `applyHunt` in the reducer, where the engine calls
already live and never in a component. Because `applied` is state and the bar's fill is a `width`
driven by a custom property, the movement AC4 asked for is a plain CSS `transition` on a declarative
re-render: **no effect, no timer, nothing to clean up**, and suppressed under
`prefers-reduced-motion` like the module's two existing animations.

The reducer branch carries **two guards** — `state.applied !== null` and
`isEncounterResolved(encounter)` — each returning the input state unchanged rather than letting
`applyHunt`'s `RangeError` escape, because **a throw inside a reducer during an event handler
unmounts the tree**. Neither is a live path: the panel only renders the control while
`applied === null`, and `App` stops dealing once the encounter resolves. They are there because two
comparisons are cheaper than a blank screen.

Once `applied` is set, `onComplete` hands the **already-applied** `EncounterState` up to App. That is
why `WarCouncilRoundResult.damage` became `encounter` rather than staying a damage record: handing up
the applied state makes applying one Hunt twice **unexpressible** rather than merely unlikely. App
sets it; it never re-applies.

`App.tsx` owns that `EncounterState` and carries it Hunt to Hunt, seeded from
`startEncounter(SLICE_ENCOUNTER_INDEX)` — see [../app/README.md](../app/README.md). The `key={round}`
remount that was already there is what resets `ui.applied` for the next Hunt while `encounter`
persists, which is the whole of the Hunt-to-Hunt continuity. Encounter-*to*-encounter sequencing is
still DLR-73's.

### What QA measured, rather than what the tests assert

`jsdom` has no layout engine, and this screen has had a layout defect caught by a real browser
**three times** with every component test passing. So the numbers below are browser measurements from
a full played Hunt, not spec assertions:

- **The no-drift guarantee, end to end.** Playing into the Greedy band, the player's bar read
  *"59 at risk"* and the panel stated `Opponent Damage: 59`; the Quarry's bar read *"30 at risk"* and
  the panel stated `You Damage: 30`. After "Apply the damage": `1350 → 1291` and `1350 → 1320`.
  Exact, both sides. "Deal the next Hunt" then carried `1291/1350` and `1320/1350` into the following
  Hunt.
- **Pending distinct from secure**, by computed style: secure `rgb(201,154,78)` against pending
  `rgb(139,154,148)`, with the pending segment's rendered width matching its `pendingPct`.
- **No shell scroll and both bars in bounds** at 1920×1080 (rightmost bar edge 1899.1), 1366×768,
  1024×640, and 500×844 phone portrait (rightmost edge 489, bars wrapped to two rows). The visible
  scrollbar at phone portrait is the felt's own scoped `.wc-table-inner` region, the documented
  exception.

> **The crossing is easy to get backwards, and the contract's own test sketch did.** The Quarry's bar
> depletes by what the **player** dealt — `duelSideDamage`'s `DuelSide.Quarry` entry reads
> `outcome.incoming[PlayerSide.Cpu]`, the damage applied *to* the Cpu seat — so it pairs with the end
> panel's *"You Damage"*, not *"Opponent Damage"*. The plan's test sketch had it the other way round
> and was corrected during implementation. This is exactly the typo `duelSideDamage`'s own docblock
> warns type-checks cleanly and produces plausible numbers forever, which is why the crossing is
> performed in one place and never by a component swapping two keys.
