_Part of [War Council UI](README.md)._

**DLR-71** built this, and it is the ticket where the duel reached the screen. **DLR-80 then retired
the bars' pending segment and rescaled them**, so read this file with that in mind: the mirror, the
geometry and the CSS transition survive unchanged, and the projection machinery does not.

### The pending segment is gone, and that was the point of the redesign

The bars used to carry each side's **pending damage** as a lighter segment carved out of its own
current health — the fighting-game recoverable-damage grammar — projected by applying
`pendingHuntDamage`'s figure to a copy of the encounter every render.

**DLR-80 deleted all of it**, along with `pendingHuntDamage` itself. The reason is the whole of the
redesign in miniature: that figure was **non-monotonic**. It was `Spoils × Standing` read off the
*current* trick count, so winning a trick could move you into a worse Standing band and make the
number you were watching *fall*. A readout that goes backwards when you do well is the thing the
redesign exists to remove.

What replaced it is not a bar segment at all. **The bank only ever climbs** until it cashes, and it
lives in its own readout in the dossier column — see
[hunt-readouts-and-telegraph.md](hunt-readouts-and-telegraph.md). Reusing the bars' pending machinery
would have carried the old shape forward into a mechanic that does not need it.

So `WarCouncilRound` now passes `ui.encounter.health` as **both** `current` and `projected`:

```ts
const bars = duelHealthBars(ui.encounter.health, ui.encounter.health, maxHealth)
```

There is nothing to project, because **damage has already landed by the time this renders**. The
reducer applies each trick's damage as the trick resolves, so the bar shows the real, current,
already-clamped figure rather than a preview of one. The guarantee the old design needed a shared
arithmetic path to make ("the number you watch is the number that lands") is now trivially true:
there is only one number.

`secure`/`pending`/`securePct`/`pendingPct` therefore still exist in `HealthBarView` but the pending
half is always zero. That is a simplification a later ticket could take further by narrowing the
type; it was left alone here because the geometry is correct as it stands and nothing renders a
zero-width segment.

### The scale changed by ~54×, and it is the developer's to judge

`PLAYER_START_HEALTH` went from **1,350 to 25**, so the player's bar is now the denominator of a
small integer count: it moves in **nine or so discrete steps of 1** rather than draining smoothly.
The Quarry's bar is unchanged in kind — a placeholder 1,000 absorbing `bank × multiplier`.

Every spec asserting a bar percentage against 1,350 was rewritten to **derive** its figures from
`PLAYER_START_HEALTH` and `QUARRY_ENCOUNTER_HEALTH[0]` rather than restating a literal, so they
survive the developer setting the Quarry's real figure.

**Whether a bar treatment tuned for a continuous drain reads well for a nine-step count is a visual
question, and it is open.**

### The geometry is pure, and the component only formats

`duelHealthBars.ts` takes three health records — `current`, `projected`, `max` — and returns one
`HealthBarView` per side: `secure`, `pending`, `current`, `max`, `securePct`, `pendingPct`, and a
`lethal` flag. It performs **no damage arithmetic and no clamping**, because `applyDamage` did both
before `projected` arrived. Its only computation is one subtraction recovering the already-clamped
pending figure for display, and two divisions by `max`.

That divisor is the module's one guard: a non-positive or non-finite `max` throws a `RangeError`
rather than emitting a `NaN` percentage, because **a `NaN` width collapses a bar to nothing and logs
nothing anywhere** — the same reasoning the retired `standingSegments.ts` used for an empty table, and the reason
the guard sits on the divisor rather than on the symptom. Both configured maxima are positive, so it
is a guard and not a live path.

It carries one **documented, unasserted precondition**: `projected[side] <= current[side]` for both
sides. A caller violating it renders a negative `pending` rather than being rejected. This is
deliberately documentation rather than a second throw — the module performs no clamping by design,
and duplicating `applyDamage`'s clamp here would be a second arithmetic path this split exists
to avoid. It holds today because every caller derives `projected` either as `current` itself (pending
forced to exactly zero, which is what every caller passes since DLR-80) or via `applyDamage`, whose `deplete` is `Math.max(0, current - damage)` and so
never increases health. A future healing mechanic or a different projection source must preserve it.

`DuelHealthBars.tsx` then **computes nothing** — the same division of labour that lets
`RoundOverPanel` make that claim. It renders whatever length of `bars` array it is handed, which is
what makes §6's net-only fallback a one-line change **in `duelHealthBars`** (return a single view
whose `pending` is the net) rather than a rewrite in the component. AC8 asked that the fallback be
cheap, not that it be built; the array return is what makes it cheap, and the contract's
`pr-description.md` is the record.

Because it imports no React and touches no DOM global, `duelHealthBars.ts` runs in the cheap `node`
Vitest project beside `handOrder.ts` — the same call, for the same reason:
**how a bar is drawn is not a game rule.**

> **A Windows resolution trap this pair created.** `duelHealthBars.ts` and `DuelHealthBars.tsx`
> differ only by leading-letter case. NTFS lookups are case-insensitive and Vite tries `.ts` before
> `.tsx` for an extensionless specifier, so `from './DuelHealthBars'` resolves to the **pure-logic
> file** — which has no default export — and fails at runtime with `Element type is invalid … got:
> undefined`. Every file importing both writes **explicit extensions**. `src/App.tsx` hit the same
> trap in a second shape: `./app` collides with `App.tsx` itself, so it imports
> `./app/warCouncilMount` directly rather than the barrel.

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

> **The crossing is easy to get backwards, and a previous contract's test sketch did.** The Quarry's
> bar depletes by what the **player** dealt. Since DLR-80 that reading is `incomingFrom`'s
> `DuelSide.Quarry` entry, which carries the resolution's `cashOut` — the bank the player just cashed
> — while `DuelSide.Player` carries `damageToPlayer`. A component swapping the two keys would
> type-check cleanly and produce plausible numbers indefinitely, because both are non-negative
> integers and neither bar can tell whose damage it received. That is why the crossing is performed
> in exactly one place and never by a component.
