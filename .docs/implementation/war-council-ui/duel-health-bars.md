_Part of [War Council UI](README.md)._

**DLR-71** built this, and it is the ticket where the duel reached the screen. **DLR-80 then retired
the bars' pending segment and rescaled them.** **DLR-86 retired the bars themselves**: there is no
track, no width and no percentage any more — each side is a row of countable hearts, one per health
point. **DLR-101 then added a fifth heart state and a second projection source**, so booked Timebomb
shows on whichever bar owes it. **DLR-115 added a second pip _type_** — the shield cluster — beside
the five states rather than as a sixth one. Read the history below with that in mind; the mirror
survives all five tickets, the geometry does not.

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

DLR-80 left `WarCouncilRound` passing `ui.encounter.health` as **both** `current` and `projected`,
because there was nothing to project: damage has already landed by the time this renders. The
reducer applies each trick's damage as the trick resolves, so the display shows the real, current,
already-clamped figure. The guarantee the old design needed a shared arithmetic path to make ("the
number you watch is the number that lands") became trivially true — there was only one number.

`securePct` and `pendingPct` survived that ticket as dead-but-correct geometry, with `pending`
pinned at zero. **DLR-86 deleted both**, because a row of fixed-size glyphs has no width to
communicate and nothing divides by `max` any more. `secure` and `pending` themselves stayed: DLR-86
gave them a live consumer again, described next.

### DLR-86 brought a projection back, in a grammar that cannot lie the old one's way

The Quarry's row now previews what the current streak would cash for. That is the same *shape* of
reading DLR-80 deleted, and the redesign note it was deleted over still binds — so the differences
are the point:

- **It is monotonic.** The old pending figure was `Spoils × Standing` off the current trick count, so
  winning a trick could make the number you were watching fall. The bank only ever climbs until it
  cashes, so the preview only ever grows until it lands.
- **It is Quarry-side only, and it is a different visual grammar** — dimmed, flashing hearts, never a
  solid segment carved out of health you still have.
- **It never touches the stated figure.** `aria-valuenow` and the current-of-max reading are the
  already-landed health, unchanged. The preview is additive (see
  [accessibility.md](accessibility.md)).

The projection in `duelHealthBars.ts` is the whole of it — the
Quarry's health minus `bank × multiplier`, floored at zero, the player untouched. (It was
`projectedFromStreak(current, bank, multiplier)` as DLR-86 shipped it; **DLR-101 renamed it to
`projectedDepletion` and gave it a fourth argument** — see below. Nothing about the streak half of
its reading changed.) The floor is
**not** a second damage clamp; it exists solely so the module's documented `projected <= current`
precondition holds under an overkill streak, which a negative projection would violate and turn into
a negative `pending`. `applyDamage` remains the single clamp point.

### One heart per health point, partitioned five ways

`duelHealthBars` returns `hearts: readonly HeartState[]` of length exactly `max`, and every heart is
in one of **five** states — `whole`, `atRisk`, `ticking`, `breaking`, `broken`. It was four until
DLR-101 added `ticking`. The partition is four comparisons per index and no branches beyond them:

| Index falls under        | State      | Means                                                     |
| ------------------------ | ---------- | --------------------------------------------------------- |
| `i < secure`             | `whole`    | survives everything currently on screen                    |
| `i < atRiskEnd`          | `atRisk`   | standing, but the banked streak would take it **if it cashes** |
| `i < current`            | `ticking`   | standing, but **booked Timebomb has already claimed it**     |
| `i < current + breaking` | `breaking` | the event **currently on screen** just took it             |
| otherwise                | `broken`   | already gone                                               |

`atRiskEnd` is `current - ticking`, and `ticking` is `Math.min(overlays.ticking[side], pending)` — the
one clamp DLR-101 added, and the only arithmetic `duelHealthBars` performs on Timebomb. Keeping it a
single `Math.min` is what keeps "overkill leaves no trace" **one rule** rather than two that can
drift: the heart row's own length discards the rest, exactly as it already did for `breaking`.

**`ticking` sits innermost, between the at-risk band and the already-broken hearts.** Timebomb lands
at the resolution of the next trick and is unconditional; the streak preview is speculative and
evaporates if the streak breaks. Ordering it the other way round would draw the certain loss as
further away than the uncertain one.

**With `ticking` at zero every index resolves exactly as it did before DLR-101**, which is what makes
the fifth state additive rather than a rewrite — `App.tsx`'s three-argument call site and every
pre-existing assertion kept their meaning byte for byte.

**Overkill needs no clamp.** A cash-out of 16 into a Quarry holding 10 leaves `current = 0` and
`breaking = 16`; every index `0..9` satisfies `i < 0 + 16`, so all ten hearts break and the array's
own length discards the surplus. That reproduces `applyDamage`'s "surplus damage is discarded"
without writing a second rule that could drift from it.

**Rendering from `max` rather than a fixed count is load-bearing**, not tidiness:
`QUARRY_ENCOUNTER_HEALTH` is `[10, 14, 18]`, so the Quarry's row is three different lengths within a
single run and no UI change tracks it.

### DLR-101 — booked Timebomb reaches the felt, and the engine was not touched to do it

A primed card books a delayed hit that lands at the resolution of the next trick. Until DLR-101
**nothing on the felt showed it existed**: in the session the ticket came from, 4 damage was booked
against the Quarry, the bar still read 14/14, and the player concluded the mechanic was broken. The
engine was already right — `encounter.pendingTimebomb` carried the side and the amount — so the whole
of this change is a **derivation**, and **no engine behaviour changed**. The one engine-side edit is
additive: `timebombDamageFor` was promoted from module-private to a `src/hunt` export, so the copy
layer reads the figure from its single owner instead of choosing between two constants at the call
site.

Four surfaces changed, all downstream of committed state:

- **The projection learned about Timebomb.** `projectedDepletion(current, bank, multiplier,
  pendingTimebombs)` subtracts each side's booked Timebomb from **both** bars, and the streak's
  `bank × multiplier` from the Quarry as before. The rename was chosen over a defaulted fourth
  parameter on the old name, because "from streak" would then have described half of what the
  function does, and a second sibling projection function is the drift this module's docblocks
  already argue against.
- **The heart row gained `ticking`**, described in the partition above.
- **The meter's text stopped calling a booked hit "at risk".** `healthBarValueText` now emits the
  two figures as **separate clauses** — `14 of 14. 3 at risk. 4 ticking.` — reading `pending -
  ticking` for the first and `ticking` for the second, and omitting either clause at zero. The rule
  it is following is `accessibility.md`'s own: a meter whose text is less true than its picture is
  worse than one with no picture.
- **The reveal that books the hit names it.** `TrickWell`'s resolved-trick line gains a
  `.wc-timebomb-clause` span when `resolution.timebombTarget` is non-null, built by `timebombBookedText`
  in `labels.ts`, naming the side and the amount.

**`ticking` hearts are static, and that is a decision rather than an omission.** `atRisk` flashes
because it is conditional and evaporates if the streak breaks; a booked hit is committed and nothing
on the felt stops it, so a flashing committed heart would say the wrong thing about certainty. The
consequence is that the state needs **no entry in the `prefers-reduced-motion` block** and loses
nothing when motion is off — the same structural reduced-motion guarantee the other four states
already had, reached by not adding motion in the first place.

`--wc-hp-ticking-fill: var(--wc-timebomb)` and `--wc-hp-ticking-opacity: 0.78` are declared in
`warCouncil.css` beside the other `--wc-hp-*` tokens, and `[data-state='ticking']` in
`warCouncilHealthBars.css` is the only rule that reads them. The fill is an **alias** of the existing
Timebomb-mark colour rather than a new colour value, so the heart can be retuned without disturbing
the card mark.

**Three things here are not settled, and the docs should not read as though they are:**

- **The ticket's open design question — its own heart state versus reusing `atRisk` — was decided by
  the plan's default, not by the developer.** This contract ran inside an unattended sprint run that
  skipped the plan-approval and mockup gates, so nobody looked at it. Reverting is deliberately
  cheap: delete the `Ticking` member, delete the `[data-state='ticking']` block, drop `ticking` from
  the derivation. The confirmation is still the developer's.
- **`--wc-hp-ticking-opacity: 0.78` is a placeholder nobody chose**, picked only to sit clearly above
  `--wc-hp-atrisk-opacity: 0.55` and clearly below solid. So is whether green-on-green reads against
  `--wc-felt`.
- **All the new copy is placeholder**, as everything in `labels.ts` is.

> **The ticking hearts have never been seen painting in a real browser.** QA could not reach the shop
> to buy an Timebomb charge in the live app, so the state was proven by unit and component tests and
> by calling the real pure functions through a dynamic import against the live-served modules —
> strong evidence that the derivation and the DOM binding are correct, but **not a visual
> confirmation**. Whether five states still separate at a glance on the third fight's 18-glyph row,
> with a live streak and a booked hit on screen at once, is unmeasured.

> **A naming rule was crossed, quietly.** `timebomb-and-the-delayed-hit.md` names `pendingTimebombs`
> among seven identifiers a Final-verification grep forbids, to stop a `Timebomb…` name being read as
> a list of marked cards beside `CardRank.Poison`. DLR-101 introduced `pendingTimebombs` as the
> parameter name on `projectedDepletion` and as a local in `roundBars.ts`. Neither is a
> card-membership list, so the hazard the rule guards against is not present — but the identifier is
> on the list, and the grep is scoped such that it did not catch this. Worth a rename or an
> explicit narrowing of the rule.

### DLR-115 — blue hearts reach the row as a second pip _type_, not a sixth state

The health row now draws **two kinds of pip over one shared state vocabulary**. `HealthBarView`
carries `shielded: Health` (the scalar, possibly fractional) and `shieldPips: readonly HeartState[]`
beside its existing `hearts`, and `duelHealthBars.ts` exports a second `as const` map next to
`HeartState`:

```ts
export const PipType = { Health: 'health', Shield: 'shield' } as const
```

**`HeartState` still has exactly its original five members, deliberately.** That is a `game-ux`
ruling taken on this ticket, not an implementation convenience: the row already carries five
readings and has never been seen at 14–18 glyphs with a live streak and a booked hit on it at once,
so a sixth flat peer state would push it past the point where it reads at a glance. Type × state
caps what can be on screen instead — and a shield pip draws from a **strictly smaller** subset of the
same vocabulary rather than introducing words of its own.

Both dimensions reach the DOM as attributes — `data-type="health" | "shield"` alongside the existing
`data-state` — and `warCouncilHealthBars.css` selects on the **product**. Every pre-existing
`.wc-hp-heart[data-state=…]` selector was re-qualified with `[data-type='health']` in the same pass,
which is what stops a shield pip inheriting a red rule by accident. `PipType`'s values are
string-bound exactly as `HeartState`'s are: that map and the stylesheet are the only two places they
may be written.

**Only `Whole` and `Ticking` are ever produced for a shield pip**, and no dead branch was written for
the other three. A spent blue heart simply stops being drawn — there is no shield graveyard, which
mirrors the row's own "overkill leaves no trace" rule — so `Breaking` and `Broken` are structurally
unreachable for that array rather than merely unused today.

**Half a pip rounds up into a whole one**, by exactly the `i < value` rule the red row already uses:
the cluster is `Math.ceil(shielded)` long and pip `i` stands while `i < shielded - shieldClaimed`.
One rounding rule for the whole row rather than a second one for blue. A fractional shield is
expressible because `DAMAGE_ROUNDING = None` admits a half-point hit, and `duelHealthBars` guards
`shielded` as a non-negative finite number with a `RangeError` naming the value — the same
guard-rather-than-live-path reasoning its `max` guard already documents, one failure mode along
(`Array.from({ length: NaN })` yields `[]` and logs nothing anywhere).

**`HealthBarOverlays.shield` is a scalar, not a per-side record.** `EncounterState.shieldHearts` is
one, and DLR-110 made shields player-only, so a `Record<DuelSide, Health>` would have invented a
Quarry shield nobody has designed. `duelHealthBars` reads the overlay **only** for
`DuelSide.Player`; the Quarry gets `NO_SHIELD_HEARTS` regardless of what the caller passes, so a
caller cannot conjure one by mistake.

The pip **type** is carried by which array a pip is in rather than by widening the element type to
`{ type, state }`. That was a blast-radius decision and is recorded as one: the widened element is
the same model, but it would have rewritten `ShopPanel.tsx`, `App.tsx` and roughly twenty existing
assertions in `duelHealthBars.test.ts` for no behavioural gain.

#### The fix that came with it: the ticking-Timebomb preview used to lie

`projectedDepletion` knew nothing about `shieldHearts`, so once a shield stood it previewed **red
hearts breaking that blue hearts would in fact absorb** — the preview contradicting what
`applyDamage` would do. It now takes a **required fifth parameter**, `shieldHearts`, and routes the
player's booked Timebomb through `absorbWithShield` before subtracting from red health. Required
rather than defaulted on purpose: a `= NO_SHIELD_HEARTS` default would let a future caller silently
reintroduce the same lie. There is exactly one call site (`roundBars.ts`), so it cost one line.

**The defect fix and the shield's state dimension are one piece of work, not two.** The same
`absorbWithShield` call answers both questions at once — how much damage reaches red health, and how
much of the shield a booked Timebomb has **already claimed**, which is the one shield pip state that
is live today. Fixing the preview is what gave blue hearts something to be in a state about.

`projectedDepletion` and `duelHealthBars` each call `absorbWithShield` once. **That is two calls, not
two rules** — both delegate to DLR-110's single statement in `src/hunt/shield.ts`, whose absorption
order this ticket neither re-derives nor restates. Threading the `ShieldAbsorption` result from one
into the other was rejected: it would put a derived engine value in a render-geometry function's
argument list and make the caller responsible for keeping the two in step.

#### The DOM, the glyph, and the spoken form

The cluster renders **inside the same `role="meter"` element** as the health pips, wrapped in one
`.wc-hp-shield-run` span, not as a second meter beside it — a second meter would make a screen reader
announce the shield as a separate bounded value it is not. It comes **after** the health pips in DOM
order, which under the player's normal (non-reversed) flex direction puts it **inboard**, nearest the
centre where damage arrives. The whole row then reads outward-to-inward in depletion order: the
further toward the centre, the sooner it is lost. `aria-valuenow`/`aria-valuemax` stay **red-only** —
the shield is a buffer on top of that bound, and folding it in would make a 10/10 player with a
shield read as 12/10.

`HeartMark.tsx` gained an `hp-shield` `<symbol>` and a `ShieldMark` component, following
`HEART_SYMBOL_ID`'s two-places rule verbatim. The glyph is a **shield pentagon, not a blue heart**:
this module's own stated rule is that shape carries the reading before colour does, and a blue heart
beside a red heart is a colour swap. `HeartMark`'s own signature is unchanged, which is why
`ShopPanel.tsx` and `App.tsx` were not touched.

`healthBarValueText` grew one clause, inserted between the standing and at-risk clauses so the
sentence reads outermost protection to innermost certainty:

```
"10 of 10." + " 2 shielded." | " 2 shielded, 1 of them ticking." + " 3 at risk." + " 4 ticking." + " Lethal."
```

The claimed count is derived from `view.shieldPips` itself
(`shieldPips.filter((s) => s === HeartState.Ticking).length`) rather than from a second absorption
call — one derivation, read twice. **"of them" is load-bearing**: without it, `2 shielded, 1
ticking. 3 ticking.` reads as two unrelated ticking counts.

Three new custom properties live in `warCouncil.css`'s `:root` and are read only by the two shield
rules in `warCouncilHealthBars.css`: `--wc-hp-shield-fill: #4f8fc0`,
`--wc-hp-shield-ticking-opacity: 0.78` (set to the same figure as `--wc-hp-ticking-opacity` so the
two "already claimed" readings match), and `--wc-hp-shield-gap: 0.5rem`, which is the only thing
making the two clusters read as two. Both shield states are **static**, so neither needs an entry in
the `prefers-reduced-motion` block — the same structural guarantee `ticking` reached by not adding
motion in the first place.

#### What is true about this that the code does not say

> **No blue pip has ever been reachable in play, and none has ever been seen.** Nothing in the app
> layer calls `activateShield`, so `encounter.shieldHearts` is `0` for the whole of a real run. Every
> assertion behind this feature is a unit or component test against a constructed state. The
> derivation and the DOM binding are proven; the appearance is not evidence of any kind.

> **All three CSS values and the glyph choice are the developer's, and none has been seen against a
> real row.** `#4f8fc0` has never sat next to `--wc-hp-secure-fill: #cc3f4a` or `--wc-hp-broken`;
> `0.78` copies an opacity that was itself flagged as a placeholder nobody chose, so two unseen
> numbers now agree with each other, which is a reason to move them together rather than evidence
> either is right; and whether the cluster belongs inboard (past the broken-heart graveyard) or at
> the anchored screen edge is a look-at-it decision.

> **A known residual, deliberately out of scope: the `breaking` overlay still over-draws when a
> shield partially absorbs a landed hit.** `resolvedTrick.resolution.damageToPlayer` is the **gross**
> damage while `encounter.shieldHearts` is the **post-absorption** remainder, and the absorbed amount
> is not recoverable from the two once the shield was exhausted — a hit of 3 into 2 blue hearts drops
> red health by 1 but draws 3 breaking red pips. Fixing it exactly needs `ResolvedTrick` to record
> the absorption, which is engine/state work this ticket's scope boundaries put out of bounds. It is
> unreachable today for the same reason the point above gives, and becomes visible the moment Shield
> is wired. Recorded in `roundBars.ts`'s own docblock.

### `roundBars.ts` — a split forced by a line budget, which bought a testable derivation

`barsForRound(ui, maxHealth)` in `roundBars.ts` is the round screen's whole bar assembly: it reads
`ui.encounter.pendingTimebomb` once, passes it to `projectedDepletion` and again as the `ticking`
overlay, and passes `incomingFrom(ui.resolvedTrick.resolution)` — or `NO_BREAKING` — as `breaking`.
**DLR-115 added a fourth reading of the same shape**: `ui.encounter.shieldHearts` goes both to
`projectedDepletion` (as its required fifth argument) and again as the `shield` overlay. All four are
**read rather than remembered**, for one reason — a copy would need an effect, and an effect would
need to survive StrictMode.

It exists because **`WarCouncilRound.tsx` was at 399 of its hard 400-line budget** and this change
added lines to it; the file is now 380. That is the same forcing function that produced
`quarryAdvance.ts`, `commitHandlers.ts` and `discardHandlers.ts` out of the same component, so the
split follows an established local pattern rather than inventing one. The payoff beyond the budget
is real: the assembly is pure — no React, no DOM, no effect — and for the first time it can be
exercised without a renderer, which `roundBars.test.ts` now does.

### `breaking` is the trick held on screen, not a remembered previous health

The obvious way to animate a delta is to mirror last render's health in a `useState` and diff it.
DLR-86 rejected that, and the reason generalises: **the damage event is already on screen.**
`roundReducer` never applies damage without setting `resolvedTrick` in the same transition — `commit`
calls `applyResolution` only when `deriveResolvedTrick` returned one — so the held reveal *is* the
damage event, exactly. `barsForRound` passes `incomingFrom(ui.resolvedTrick.resolution)` as the
overlays object's `breaking` field, or `NO_BREAKING` when no reveal is held. (It was passed
positionally from `WarCouncilRound` itself until DLR-101 moved the assembly out and named the
overlays.)

The payoff is that this whole feature is a pure function of committed state: **no `useState`, no
`useEffect`, no ref, no timer, no `requestAnimationFrame`, and no memoisation is added anywhere** —
so there is nothing to release in a cleanup, nothing that double-fires under StrictMode's development
double-mount, and no module-level mutable state to reset between tests. It also ties the crack to the
cards that caused it, which was the finding the ticket came from.

The consequence worth knowing: **the crack lives exactly as long as the player leaves the reveal
up**, and clears on the same tap that clears it. That is a pacing choice, and whether it reads as
punchy or as missed is a developer judgement listed in [README.md](README.md)'s Deferred list.

**AC4 — the preview converting into the break — needed no code at all.** A cash-out zeroes `bank` and
`multiplier` and sets `resolvedTrick` in one reducer transition, so the same hearts at the same
indices go `atRisk → breaking` in a single render. Nothing sequences it, because nothing has to.

### The scale changed by ~54×, and it is the developer's to judge

`PLAYER_START_HEALTH` went from **1,350 to 25** at DLR-80, so the player's bar became the denominator
of a small integer count: it moves in discrete steps of 1 rather than draining smoothly. The Quarry's
bar was unchanged in kind at that point — a placeholder in the thousands absorbing `bank ×
multiplier`.

**Both totals have since fallen to 10**, and the Quarry's is the larger change of the two. The player
went 25 → **10** on 2026-08-14; the Quarry went 1,000 → 450 → 400 → **10**, the last step at PT-002,
when the bank stopped counting card values and a hand's damage fell from about 84 to about 7. So the
two bars are no longer a small integer against a large one: **each now has exactly ten steps of 1**,
and the mirrored pair is symmetric in scale for the first time.

Every spec asserting a bar percentage against 1,350 was rewritten to **derive** its figures from
`PLAYER_START_HEALTH` and `QUARRY_ENCOUNTER_HEALTH[0]` rather than restating a literal — which is why
none of them needed editing when either total moved again.

**Whether a bar treatment tuned for a continuous drain reads well for a ten-step count is a visual
question, and it is open** — now for both bars rather than only the player's.

### The geometry is pure, and the component only formats

`duelHealthBars.ts` takes three health records — `current`, `projected`, `max` — plus a **defaulted
fourth** argument of overlays, and returns one `HealthBarView` per side: `secure`, `pending`,
`ticking`, `current`, `max`, a `lethal` flag, the `hearts` array, and — since DLR-115 — `shielded`
and the `shieldPips` array. It performs **no damage arithmetic and no clamping**, because
`applyDamage` did both before `projected` arrived. The fourth argument is optional and each of its
fields defaults — `breaking` to `NO_BREAKING`, `ticking` to `src/hunt`'s `NO_PENDING_TIMEBOMB`,
`shield` to `NO_SHIELD_HEARTS` — which is why every three-argument call site has compiled unchanged
through DLR-86, DLR-101 and DLR-115.

**DLR-101 turned that fourth argument from a positional record into a `HealthBarOverlays` options
object** (`{ breaking?, ticking? }`), and the reason is the one `bank.ts`'s `TrickFacts` already
states: both fields are `Readonly<Record<DuelSide, Damage>>`, so as two positional parameters they
were silently transposable and a swap would have type-checked cleanly and drawn a plausible but
wrong picture. Naming them makes a transposition a compile error. **This is now the module's
convention** — a future overlay is a named field on that object, never a fifth positional parameter.
**DLR-115 was the first ticket to follow it**: `shield` joined `HealthBarOverlays` as a third named
field rather than widening the call signature.

`HealthBarView.pending` deliberately kept its meaning as the **whole** pending band — at-risk plus
ticking — because `pending` is what drives `lethal`, and lethal must count committed Timebomb. `ticking`
is the committed subset, and a caller wanting the at-risk figure alone derives `pending - ticking`.
Redefining `pending` to exclude Timebomb would have changed the meaning of a field pre-existing tests
already assert on, and would have made a revert of the fifth state touch the geometry.

The module's one guard **was repurposed rather than removed**, and the move is worth stating because
it is the same reasoning one failure mode along. `max` used to be a divisor, and the guard existed
because **a `NaN` width collapses a bar to nothing and logs nothing anywhere** — the same reasoning
the retired `standingSegments.ts` used for an empty table. The division is now gone entirely, so that
failure is structurally absent rather than guarded. What replaced it is a bad **array length**, so
`max` is now checked as a positive finite **integer**: `Number.isInteger(sideMax) || sideMax <= 0`
rejects `0`, negatives, `NaN`, `Infinity` **and a fraction** in one predicate, all five of which would
otherwise render a wrong or absent row with no error anywhere. Integrality is genuinely new —
`assertApplicable` in `src/hunt/encounter.ts` permits fractional *damage* under `DAMAGE_ROUNDING =
None`, so a fractional total is expressible in the type even though every configured value is an
integer today. Both configured maxima are positive integers, so it remains a guard and not a live
path.

It carries one **documented, unasserted precondition**: `projected[side] <= current[side]` for both
sides. A caller violating it renders a negative `pending` rather than being rejected. This is
deliberately documentation rather than a second throw — the module performs no clamping by design,
and duplicating `applyDamage`'s clamp here would be a second arithmetic path this split exists
to avoid. It holds today because every caller derives `projected` in one of three ways, all of which
uphold it: as `current` itself (pending forced to exactly zero — the tests and every DLR-80-era call
site), via `applyDamage`, whose `deplete` is `Math.max(0, current - damage)` and so never increases
health, or — since DLR-86, and under the name `projectedDepletion` since DLR-101 — via that
projection, whose zero floor exists for precisely this reason. **DLR-101 extended the floor to both
sides**: it previously floored only the Quarry and left the player's projection as `current`
untouched, which was safe only while nothing could deplete the player's bar in advance. Booked
Timebomb can, so both sides now floor. A future healing mechanic or a different projection source must
preserve the precondition itself.

`DuelHealthBars.tsx` then **computes nothing** — the same division of labour that lets
`RoundOverPanel` make that claim. Since DLR-86 it maps `view.hearts` to elements and binds a `<use
href>`; it does not know what a bank is. It renders whatever length of `bars` array it is handed, which is
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

The whole of the mirror is `.wc-hp[data-side='quarry'] .wc-hp-hearts { flex-direction: row-reverse }`
— both sides deplete **toward the centre**. (The class was `.wc-hp-track` until DLR-86 renamed it: it
is a row of countable glyphs now, not a depletion track, and a stale name in a string-bound
stylesheet is exactly the trap this project's correctness notes warn about.) Taking the existing row is what makes the arrangement cost
**zero** new vertical space in a `100dvh` no-scroll shell, which is the cost the design idea it came
from named as the real one.

It was paid for by **moving the Standing track out of the status band into the `wc-dossier` column**.
The track is the band's widest child and its least time-critical: it says which *table* is in force,
which changes once a Hunt, while the bars change every trick. Demoting it out of the per-trick zone
is the trade, and whether the track reads cramped in a `minmax(10rem, 17vw)` column is a developer
judgement recorded in [README.md](README.md)'s Deferred list.

**DLR-86 kept that property and pushed it down a level.** The heart row is `flex-wrap: nowrap` with
`min-width: 0`, and each `.wc-hp-heart` is `flex: 0 1 var(--wc-hp-heart-size)` with a `min-width`
floor — so at the third fight's 18 hearts the **glyphs shrink** rather than the row wrapping. A
wrapping row would add height to a band the shell sizes `auto`, which is the one thing a
`100dvh` no-scroll shell cannot absorb. Whether 18 hearts stay *legible* once shrunk is a browser
measurement plus a developer judgement, not a test — see the QA numbers below.

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
  `rgb(139,154,148)`. _(DLR-71/DLR-80-era measurement — the segment it measured no longer exists.)_
- **No shell scroll and both bars in bounds** at 1920×1080 (rightmost bar edge 1899.1), 1366×768,
  1024×640, and 500×844 phone portrait (rightmost edge 489, bars wrapped to two rows). The visible
  scrollbar at phone portrait is the felt's own scoped `.wc-table-inner` region, the documented
  exception.

**DLR-86 re-measured the same screen against the heart rows**, and these numbers supersede the width
figures above:

- **The count is config-driven end to end.** Fight 1 rendered 10 hearts a side; taking the fight
  through to "Next fight" rendered **14** on the Quarry (`QUARRY_ENCOUNTER_HEALTH[1]`), and fight 3
  rendered **18** — none of it a literal anywhere in the diff.
- **No document scroll** at 1920×1080, 1366×768 and 500×844, console clean at all three. The 390 px
  case could not be reached: the browser tooling clamped the window to ~500 px wide on this machine,
  so 500×844 is the narrowest directly observed reading and 390 px remains unverified.
- **The 18-heart case measures 11.5 × 11.5 px per heart at 1366×768.** That is the number the
  legibility question turns on, and the judgement is the developer's.
- **The preview and the break were driven live**, not inferred: at multiplier 1 the Quarry showed
  exactly one `atRisk` heart with `aria-valuetext` reading `10 of 10. 1 at risk.`; on the cash the
  Quarry showed 10 `breaking` and 0 `atRisk` in the same read, while the player's row broke one and
  its `aria-valuenow` went 10 → 9.

> **The crossing is easy to get backwards, and a previous contract's test sketch did.** The Quarry's
> bar depletes by what the **player** dealt. Since DLR-80 that reading is `incomingFrom`'s
> `DuelSide.Quarry` entry, which carries the resolution's `cashOut` — the bank the player just cashed
> — while `DuelSide.Player` carries `damageToPlayer`. A component swapping the two keys would
> type-check cleanly and produce plausible numbers indefinitely, because both are non-negative
> integers and neither bar can tell whose damage it received. That is why the crossing is performed
> in exactly one place and never by a component.
