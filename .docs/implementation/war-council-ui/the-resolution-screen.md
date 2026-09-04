Part of [War Council UI](README.md).

# The trick resolution screen — the build-up, the pot, and the apply-or-roll choice

Built by DLR-156, replacing the Apply Damage plate DLR-94/DLR-109/DLR-143 built into the action bar.
**The button is gone**, along with its five refusal reasons, its AP cost, and the delayed-payout
queue behind it. In its place, **every resolved trick hands off to a surface of its own** that
carries the two played cards across, derives the trick's damage one term at a time, and asks whether
to cash the pot or push it.

> **DLR-160 rebuilt this surface around what a play session could not read.** It was a second
> full-viewport screen; it is now a **corner panel over the still-mounted felt**. It said only who
> physically took the trick; it now names which of the four outcomes it was, in the game's own
> words. It showed nothing about the skull, the decree, whether the pot would already end the fight,
> or why an armed buff paid nothing; all four are on it. And **dismissing it no longer advances into
> the next trick** — see [the exits](#where-it-is-set-and-where-it-is-cleared) below, which is the
> single most consequential change on the ticket.

The arithmetic this screen narrates is the engine's, not its own — see
[war-council/the-streak-and-the-pot.md](../war-council/the-streak-and-the-pot.md). This page is about
the surface.

## The shape: a panel over the felt (DLR-160), not two screens

`WarCouncilRound.tsx` used to be a **switch** — exactly one of the two was mounted:

```
ui.resolution === null   ->  <WarCouncilTable>        the felt, the hand, the action bar
ui.resolution !== null   ->  <TrickResolutionScreen>  the trick, the ledger, the pot, the choice
```

**DLR-160 turned that either/or into an "and".** The table renders unconditionally and the panel
mounts beside it when `ui.resolution !== null`, pinned to the bottom-right corner and leaving the
felt visible behind it. Nothing new needed disabling: `canAct` is already false while
`resolvedTrick !== null`, so the felt behind the panel was already inert.

Three consequences worth knowing:

- **The table is no longer torn down and remounted at every trick.** `useTableCardMotion` and
  `useCardMotionDriver` keep their identity across a resolution — strictly fewer mounts than before,
  not more.
- **`SuitSymbolSheet` and `CardArtSheet` still hoist above both**, and now must: both surfaces are
  mounted at once, so the sprite defs would otherwise be duplicated by id rather than merely
  redundant.
- **The two played cards are still cloned, not moved** — but for a different reason than DLR-156
  gave. The felt _is_ mounted now and renders its own copy from the same `resolvedTrick`; the panel
  owns its rendering independently, and no DOM node is ever handed between them.

The panel's box lives in its own stylesheet, `warCouncilResolvePanel.css`, split out of
`warCouncilResolve.css` when that file reached 389 of the 400-line budget. That file owns only the
box; every rule for the content inside it stayed put. `max-height: calc(100dvh - 2 × inset)` plus
`overflow: hidden` keeps it inside the viewport at any height, and the ledger stays its one
scrolling region.

## `RoundUiState.resolution` — one nullable field

```ts
readonly resolution: ResolutionView | null
```

**One nullable field rather than a boolean plus a payload**, exactly as `discardSelection` and
`loadout` are, so "screen closed but holding a stale trick" is unexpressible.

`ResolutionView` carries the panel's whole content. **It lives in `resolutionView.ts` since
DLR-160** — moved out of `roundUiState.ts`, which had reached its 400-line budget, and re-exported
from there so no importer changed.

| Field                           | What it carries                                                                                                                                                                                      |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cards`, `winner`, `resolution` | the two played cards, who physically took it, the engine's own `TrickResolution`                                                                                                                     |
| `beats`                         | the ordered build-up, derived once at the hand-off                                                                                                                                                   |
| `trickNumber`                   | 1-based, for the header                                                                                                                                                                              |
| `nextPotFloor`                  | `potValue(total + BASE_DAMAGE, roll + 1)` — **the bare rule**, because the player may fire nothing next trick. What the Roll over button states as a floor (`108+`); inherits `potValue`'s own guard |
| `skulledInTrick` (DLR-160)      | the cards **in this trick** carrying a skull, filtered out of `RoundState.skulledCards`. Empty on a clean trick                                                                                      |
| `decree` (DLR-160)              | the decree card in force as the trick resolved                                                                                                                                                       |
| `deadBuffs` (DLR-160)           | buffs armed for this trick that did not fire, already resolved to `Buff`s                                                                                                                            |
| `potIsLethal` (DLR-160)         | whether applying this pot would end the fight                                                                                                                                                        |

All four DLR-160 fields are filled by the same sole producer, `resolutionViewFor`, which already had
everything they need in scope: `state.round.skulledCards`, `state.round.decree`,
`state.buffActivation`, and — new on this ticket — the **post-fold encounter** passed in from the
call site, never `state.encounter`. The distinction matters: the trick's own damage (a skull's
health loss on a Defeat) has already landed by then, and the pot has not.

Every new required field also had to be added to the three untyped literal fixtures the config audit
found (`roundReducer.resolution.test.ts`, `TrickResolutionScreen.test.tsx` ×2) — there is no type
annotation on those, so `npm run typecheck` is the only thing that catches a missed one.

## Where it is set, and where it is cleared

`commitHandlers.ts`'s `resolutionViewFor` builds the whole view on the **`null` → non-null edge of
`resolvedTrick`** — the same edge `foldBuffOutcome` and `openWindowOnTrickResolved` already fire on.
There are two such sites, because a trick can complete either on the player's own commit or on the
Quarry's follow, and both are wired.

Two reducer actions clear it, and they are the panel's only exits:

| Action     | What it does                                                                                                                   | Which button                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `ApplyPot` | `applyPot(streak)` → the pot to the Quarry through `applyDamage(incomingFromPot(dealt))`, `total`/`roll` to zero, panel closed | **Apply Damage**                                |
| `RollOver` | leaves `total`/`roll` exactly as they stand and closes the panel                                                               | **Roll over**, and the hurt branch's **Onward** |

### DLR-160: closing the panel no longer lays the Quarry's card

**This is the defect the play session called unplayable, and it had two independent halves.**

1. Both `ApplyPot` and `RollOver` **tail-called `handleCarryOn`**, which calls `advanceQuarryLead`
   whenever the Quarry is next to lead. So dismissing the panel committed the Quarry's lead in the
   _same dispatch_ — the between-tricks window closed before the player ever saw the felt again, and
   no buff could be armed for the coming trick.
2. `WarCouncilTable.tsx` put an `onClick` on the whole `.wc-table` section whenever a trick was
   held, the Quarry was about to lead, or the encounter was over. **Any stray click in the play area
   committed the lead.**

Both are gone. The two actions now **close the panel and stop**, and the region click was deleted
along with the `.wc-is-waiting` cursor class that advertised it. `CarryOn` — reached only from the
well's own explicit control — keeps sole responsibility for laying the lead.

No game rule moved: `the-hunt.md` §4 already granted the window "before a trick's first card is
laid". The code was closing it early.

**One carve-out survives, and it is load-bearing.** `clearResolvedTrick` drops the felt's held
reveal so the table renders the between-tricks state — but **not** when the choice itself ended the
encounter. `WarCouncilTable`'s own `handleCarryOn` wrapper checks `encounterOver` first and reports
`onComplete` _without_ dispatching `CarryOn`, so it needs a held reveal to read that from. Clearing
`resolvedTrick` unconditionally would strand a mid-hand kill with no control left to reach
`onComplete` at all, now that the region click is gone. Both actions therefore branch on
`isEncounterResolved` before clearing.

Both of `TrickWell.tsx`'s carry-on controls stopped being hint-styled text (`wc-table-hint
wc-is-carry-on`) and became real buttons with a `≥44px` hit area (`.wc-carry-btn`), and their copy
no longer names a tap on the table that does nothing.

`TapApplyDamage`, `CancelApplyDamage`, `RoundUiState.applyPoised` and `applyDamageStock` were deleted
with the plate.

Both handlers are **total and guarded**: a `null` resolution is a no-op returning `state` unchanged
rather than a throw, because a throw inside an event handler unmounts the tree (the discipline
`primeTapped` already documents). `applyPotAction` also repeats `applyResolution`'s
`isEncounterResolved` short-circuit, so applying a pot into an already-dead Quarry closes the screen
inertly rather than reaching `applyDamage`'s `RangeError`.

DLR-156 Assumption 11: the cut, unconstructible Debt Collector family's `applyDamagePressed` trigger
moved here, because this is the only place a cash-out can now happen.

## The build-up — `resolutionBeats.ts`, pure and rendererless

`resolutionBeatsFor(resolution, fired, before)` turns the engine's decision into an ordered
`readonly ResolutionBeat[]`. It **runs no rule of its own** — the discipline `buffProjection.ts`'s
docblock sets out and `cardDamage.ts` already follows. `resolveTrickBank` has already computed
`trickDamage` and picked which buffs fired; this module only replays those already-decided terms so
the screen can narrate them.

It is pure and takes no renderer, but lives in `src/app/warCouncil/` rather than `src/warCouncil/`
because it produces **worded labels**, and the engine holds no user-facing copy. The wording itself
is one file over again, in `resolutionLabels.ts`.

Each beat carries the running `damage` and `mult` registers **after** it lands plus their product, so
the component renders a value rather than computing one, and the whole sequence is assertable in a
`.test.ts` with no renderer.

### The order

A **banked** trick opens on `Base` (`BASE_DAMAGE + baseDamageBonus`), then one beat per id in
`resolution.firedBuffIds`, in that order, classified `Blade` or `Momentum` by the fired buff's own
reward axis — any other axis contributes nothing to this trick's damage and gets no beat. Then the
**Overlap Bonus on its own beat**, but only when it is non-zero: `overlapBonusFor(1)` is 0, so a
single fired buff never produces one. The sequence closes on `Banked`, which adds nothing itself and
carries the final figures forward unchanged, so the last beat's `running` always equals
`trickDamage.dealt`.

**A Momentum card never touches the damage number.** It moves the multiplier and the product
recomputes, which is why the readout reads `DAMAGE × MULT` rather than one figure — the player can
see which register each card moved.

### The three one-beat branches

A trick with `trickDamage === null` produces exactly **one** beat, and there are two shapes of it:

- **`Hurt`** — states the health taken and the pot that was lost with it. There is no two-thirds
  consolation to state. **Since DLR-161 the figure is the pot _actually_ lost**: `potValue(before)`
  minus `potValue(after)`, clamped at zero. It used to be the whole pre-trick pot, which was correct
  only while every hurt trick wiped the streak — with a Skull Helmet or a Skull Tether firing, the
  streak partly survives and the old figure narrated a loss that did not happen. The clamp is there
  because a **gold** protective card can leave a surviving figure _larger_ than it was (a gold Helmet
  and a Tether on `total 8, roll 2` take the pot from 16 to 18), and this beat reports loss, not gain.
  The module still runs no rule of its own beyond that clamp — it subtracts two figures the engine
  decided, and the correction is right for a Swan rung too, with no knowledge of protection.
- ~~**`Absorbed`**~~ — a **replaced clean loss** (DLR-90's primed card the Quarry wins cleanly) reset
  nothing: no health taken, `total` and `roll` standing. **DLR-166 removed the rule and the beat**,
  since only a Defeat resets a streak or costs health now. It got its own beat kind rather than a
  cosmetic variant of `Hurt`,
  because `Hurt`'s wording named a pot that was never touched. **This was a real engine/screen pair
  worth knowing about**: the one outcome where the player loses a trick and nothing at all happens.

An id in `firedBuffIds` with no matching `Buff` is **dropped** rather than rendering `undefined`,
mirroring `buffFiredLabels.ts`'s own `resolveFired`.

## `useBeatSequence` — the clock

Walks `beats` one per `--wc-beat`, and **still staggers under `prefers-reduced-motion`**: one term at
a time _is_ the derivation, so removing the stagger would remove the information. What reduced motion
suppresses is only the travel, scale and ring classes the component applies.

Two effects, each with its own cleanup: one `matchMedia` change listener, and one `setTimeout`
advancing `landed` by one. **The timer effect is keyed off `landed` itself**, a value in state, so
StrictMode's double invoke-then-cleanup-then-invoke mount recomputes an identical schedule instead of
double-scheduling. The initial reduced-motion read is computed lazily in `useState`'s initialiser
rather than synchronously in an effect body, which `react-hooks/set-state-in-effect` flags.

The pace is **read from the stylesheet**, not duplicated as a TypeScript literal: `beatIntervalMs()`
reads `--wc-beat` off the document's computed style and falls back to `520` only when the property
cannot be read at all — which is always true in jsdom, since it computes no custom properties.
`cardMotionConfig.ts` reads `--wc-flight` by the same pattern, for the card's flight.

## What the panel says about the trick — a page of its own

The four-outcome word and its reason, the skull on the card face, the decree chip in the header, the
struck-through rows for buffs that were armed and did not fire, and the lethal marking on the Apply
control are all **DLR-160** and are documented together in
[reading a resolved trick](reading-a-resolved-trick.md) — because the felt's own trick well states
the first of them too, out of the same module, a beat earlier. `ResolutionBreakdown.tsx` is the seam
between the two: it renders the unchanged `ResolutionLedger` below, then the dead rows.

## `ResolutionLedger` — two rows, always, and an instant follow

The window is **exactly two rows tall at all times**. It does not grow with the sixth beat and it
does not collapse on the first: its height is `calc(2 * var(--wc-ledger-row))`, pinned to a token
rather than to content, so two rows is exactly two rows whatever a card is called. A panel that
changes height mid-sequence drags everything around it up and down on every beat — motion the beat
itself then has to compete with. Reserving the space costs one empty row on a bare trick and buys a
readout that never moves.

Above two rows it scrolls, and this is the **only scrolling region in the change**; `game-ux`'s
no-scroll floor is met by scoping the overflow here rather than to the shell. The top edge fades
while the box overflows, so a scrolled-away row does not simply vanish.

> **The follow is a plain assignment — `el.scrollTop = el.scrollHeight` — and it must never become
> `behavior: 'smooth'` or `scrollIntoView`.** Both ride the same compositor as the card flight, and
> the mockup measured the smooth version silently never running: `scrollTop` stayed at 0 for a whole
> run and every term after the second landed out of sight with no sign anything had happened. An
> effect that can silently not run is not acceptable here; an assignment cannot.

The effect registers no listener, timer or observer, so it has **no cleanup to write** — the one
place in this change where that is true. Row keys join the beat index to the beat kind, because a
kind repeats within a trick (two Momentum cards, say) and the _order_ is what makes a row unique.

## DLR-160 AC5 — the type hierarchy was upside down

The two figure groups sit side by side under the breakdown: `.wc-resolve-big`, "this trick" — what
the beats just added up to — and `.wc-resolve-potline`, the `total × roll = pot` product the
apply-or-roll choice is actually about.

**The subordinate one was the large one.** `.wc-resolve-big-value` carried
`clamp(2.1rem, 6.2vmin, 3.6rem)` _and_ the impact animation, while every figure in the pot line was
unstyled — so a trick contribution of 1 rendered at roughly three times the size of a pot of 12, and
the beat landed on the number the player could no longer do anything about.

Both moved, and the animation moved with the size:

|                                                  | Before                                                 | After                                                  |
| ------------------------------------------------ | ------------------------------------------------------ | ------------------------------------------------------ |
| `.wc-resolve-big-value` — this trick             | `clamp(2.1rem, 6.2vmin, 3.6rem)` + `wc-resolve-impact` | `clamp(0.85rem, 1.9vmin, 1.1rem)`, no animation        |
| `.wc-resolve-figure-value` — total, roll and pot | unstyled                                               | `clamp(1.6rem, 4.4vmin, 2.6rem)` + `wc-resolve-impact` |

All three of the pot line's figures take the large treatment **together** rather than the pot alone,
because the line reads as a product leading up to the pot; the pot is last, and it is the figure the
buttons below restate. **Both bounds are placeholders the developer has not chosen** — the inversion
is the decision this ticket made, the exact sizes are not.

`.wc-resolve-big-value` keeps `key={landed}`, so React still remounts the node on every beat; what it
no longer does is replay an animation on that remount.

## The choice

Both halves of the bet are on screen with what the decision needs: the pot as it stands, what it
becomes if the next trick also banks, and the roll being wagered.

- **Apply Damage** — solid-edged, states the pot in full, "dealt now · total and roll reset".
- **Roll over** — dashed-edged (the idiom the rest of this UI uses for _provisional_), states the
  payout as a **floor** (`108+`, because the player may fire nothing next trick), and directly
  beneath it, in the alarm colour, `0 if you do not`. Stating the floor and the risk in the same
  control is what turns this from a nag into a bet.

The two are told apart by **shape and words first** — solid versus dashed, "dealt now" versus "if you
take trick 4". Colour only reinforces, so the pair survives a greyscale screenshot. The accessible
name of each button states its whole consequence, and the pot line is a `role="group"` labelled
`Total N, roll N, pot N`.

**The branch with no choice.** A hurt trick offers nothing to decide, so it gets a **way out** rather
than a decision: one **Onward** button, dispatching the same `RollOver` action (there is nothing left
to reset). Its subtext branches on `absorbed` — "total and roll stand — nothing changed" when a
card absorbed the loss, "trick N+1 starts from nothing" when the streak actually broke — and
so does the header line, which reads `banked`, `the streak is broken`, or `nothing changed`.

## The card's flight — `useCardMotion`

> **DLR-157 renamed and generalised this hook.** `useCardFlight` and the `CardFlight` interface no
> longer exist: `useCardMotion.move(requests, onAllLanded)` is now the game's only card-motion
> primitive, and this movement is one of nineteen that go through it. Its behaviour here is
> unchanged — same second-tap gate, same deferred dispatch, same three landing paths — but the
> orchestration moved out of `WarCouncilTable.tsx` into `useTableCardMotion.ts`, the two
> `document.querySelector` calls became named anchors, and `--wc-flight` moved into
> `warCouncilMotion.css`. See [card motion](card-motion.md) for the whole system.

AC15: the played card **travels** from the hand to the table rather than appearing there.

The **second** tap on an already-armed card is the one that plays it, so that is the tap the flight
is wired to: the dispatch that commits the card is **deferred to the landing callback**, so the trick
resolves only once the card visibly arrives. Every other tap — arming, cancelling, marking a
Curse, toggling a discard, and the 3's second tap that opens a prompt rather than
playing — dispatches immediately, exactly as before. The rank check mirrors the reducer's own so a
flight is never started for a card that is not about to leave the hand.

The card is **cloned into a fixed layer** above everything (`.wc-card-flyer`), so it is never clipped
by the hand's or the felt's overflow, and it moves on an **arc**, lifting clear before it travels,
which is what makes it read as _placed_ rather than dragged through its neighbours. The original stays
in the layout but is hidden, so the gap in the hand collapses **after** the landing, never during.

> **The landing must not depend on `onfinish` alone. This is a real defect that was found and fixed,
> not a nicety.** A background tab does not run Web Animations: `currentTime` stays at 0, `onfinish`
> never fires, and everything after an awaited finish is dead — the trick never resolves and the hand
> stops responding for the rest of the session. `land()` is therefore **idempotent and reachable
> three ways**: `onfinish`, a `setTimeout` matched to `--wc-flight`, and a `visibilitychange`
> handler. All three, plus the cloned node and the animation itself, are released in the effect's
> cleanup. **Anything in `src/` that awaits a Web Animations finish needs the same treatment.**

Unmount tears the flight down through `teardown()`, which marks the guard closed **without** calling
`onLanded` — so a stray timer or `visibilitychange` firing after unmount lands nothing.

Two more properties matter:

- **Web Animations support is feature-detected, not environment-sniffed.** An environment with no
  `Element.prototype.animate` (jsdom by default) lands immediately rather than leaving the tap
  silently unresolved. Every spec that wants the real three-path race stubs `animate` itself, which
  is what makes that branch false for them.
- **The hand is disabled for the whole flight.** `inFlight` feeds the shared `interactive` predicate,
  so the fan, the action bar and the hint all agree that flight blocks acting, and `handleTap`
  refuses re-entry as a belt-and-braces guard. A review pass found that a still-enabled hand let a
  second tap on a _different_ card land mid-flight and read as a fresh arm; the deferred dispatch is
  closed over the card that started the flight, which makes it stale-aware regardless.
- **No target to fly to is a fall-back, not a failure.** If either the card element or the trick well
  cannot be found, the commit dispatches exactly as it did before rather than stranding the tap on a
  flight that could never start.

## The tunables are transcribed placeholders — with one exception

Declared in `src/app/warCouncil/warCouncilResolve.css` and read from there, except where the table
says otherwise:

| Property                   | Value        | What it prices                                                                                                                  |
| -------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `--wc-beat`                | `520ms`      | one term's beat                                                                                                                 |
| `--wc-resolve-hold`        | `700ms`      | how long the panel holds after a choice before returning                                                                        |
| `--wc-flight`              | `380ms`      | the card's travel from hand to table — declared in `warCouncilMotion.css` since DLR-157, alongside its five other motion tokens |
| `--wc-ledger-row`          | `2.5rem`     | the pinned ledger row height                                                                                                    |
| `--wc-trick-dwell`         | **`1000ms`** | how long the felt holds the landed card, and now the just-landed outcome line, before the panel appears                         |
| `--wc-resolve-panel-w`     | `22rem`      | the panel's width (DLR-160, `warCouncilResolvePanel.css`)                                                                       |
| `--wc-resolve-panel-inset` | `1.1rem`     | how far it sits off the bottom-right corner (DLR-160, same file)                                                                |

**Exactly one of these is a decided value.** `--wc-trick-dwell` went `800ms → 1000ms` on **DLR-160**,
transcribed from the developer's own words at the approval gate — _"wait a second before moving to
the resolution screen"_ — and it is doing more work than it was: with the outcome line now landing in
the trick well, this is the window in which that line is read, which is why 800ms was short for its
new job. It stays a placeholder in the sense that the one-line retune is still available.

**Every other row is a placeholder nobody has chosen**, transcribed verbatim from the approved mockup
and marked `PLACEHOLDER` in the stylesheet. `--wc-beat` is the one that matters most — five impacts
at 520ms is about three seconds a trick, six times a hand — and `ui-notes.md` §7 calls it the single
number most worth setting from a play-through. The panel's two new values trade its own legibility
against how much felt stays visible behind it, which is a judgement only a real screen settles.

Three more placeholder bounds ship with the panel and are named where they live: the three `clamp()`
font sizes of [the type inversion](#dlr-160-ac5--the-type-hierarchy-was-upside-down) above, and the
lethal marking's colour and wording ([reading a resolved trick](reading-a-resolved-trick.md)).

## The post-choice hold — built in a DLR-156 follow-up

`ui-notes.md` §4 specifies that **both exits hold before leaving**: applying a large pot and cutting
straight back to the felt shows the player the number they chose for zero frames, so the payout
should land, the header should change to name what happened, and only then should the screen return.

**This section previously said that did not happen; it does now.** `useResolveHold.ts` owns the
whole of it. `settle(key, onSettle)` arms one timer and calls `onSettle` exactly once after
`--wc-resolve-hold`, and a second call while already held is a **no-op** — the double-press guard,
on top of the `disabled` the buttons already carry. The effect is keyed off `pending`, a value in
state, so StrictMode's double mount recomputes an identical schedule rather than double-scheduling,
and unmounting mid-hold clears the timer through the same cleanup.

`TrickResolutionScreen` reads `held` and swaps the header word — `appliedHoldLabel()` on Apply,
`rolledOverHoldLabel(nextRoll)` on Roll over — while disabling all three controls. The hurt branch's
single exit keeps `outcomeWord`, because it offers no choice and the header already said what
happened.

The hook is deliberately component-local and reducer-free: `src/sim/playHand.ts` dispatches
`ApplyPot`/`RollOver` straight at the reducer with no component in between, so the simulator never
waits on a timer. **`--wc-resolve-hold`'s 700ms is still an unchosen placeholder.**

## What is untested, and what a browser would have checked

**No browser pass was run on this ticket.** Everything below is a verification gap rather than a
build gap — the feature is reachable in the app.

jsdom has no layout engine, so neither screen can be proven not to scroll under Vitest. What _is_
covered: the beat derivation for every branch (`resolutionBeats.test.ts`), the ledger's two-row cap
and its follow-to-newest (`ResolutionLedger.test.tsx`), the screen's two branches and their
accessible names (`TrickResolutionScreen.test.tsx`), the beat clock and its reduced-motion branch
(`useBeatSequence.test.tsx`), the flight landing even when the animation never runs
(`useCardMotion.test.tsx`), and both reducer actions (`roundReducer.resolution.test.ts`).

What a browser would have checked: that neither screen scrolls at the seven viewport sizes the mockup
was measured at; that the ledger holds a constant height across a full six-beat run; that a greyscale
screenshot still tells the two prompt buttons apart and still names the winning side; and that the
whole sequence reads at 520ms rather than dragging.

**DLR-160 ran with its browser pass off as well, and it changed the shape of this surface**, so
nothing on the list above has since been seen either — and the list grew. What a browser would now
also have to check: that the panel in the bottom-right corner leaves enough felt to be worth leaving;
that the ledger plus two struck-through dead rows still fit a panel that got smaller, at 640px of
viewport height; that the pot now reads as the larger figure and the trick's contribution as
subordinate; that 1000ms is long enough to read the trick well's outcome line before the panel
covers the corner; and that a rank tooltip clears an open breakdown panel on all five ability ranks
(jsdom has no layout engine, so the AC4 specs pin the contract, not the geometry).

**One residual layout defect is recorded rather than fixed.** On the _table_ screen at 640px of
viewport height or less, the trick well overhangs the felt's lip by 7–55px with the prompt open. The
measurement is pessimistic — the mockup's test shrinks the shell while its `clamp()` bounds still
read the full viewport — and at 600px the layout wants a structural change rather than a tuning one.
The resolution screen itself had zero overflow at every size tested. Whether this becomes its own
ticket is the developer's call.

## The open question this screen was built to answer

**Does a whole screen firing up to six times a hand wear out?** The old button might be pressed once
or never; this prompt is mandatory and blocks. `spec.md` and `ui-notes.md` §7 both mark it
play-and-see, and this ticket deliberately ships the blocking, always-shown version. The candidate
fixes — skipping a bare trick where there is nothing to decide, or a faster non-blocking variant —
are named and not built.

**DLR-160 answered half of it without meaning to.** It is no longer a whole screen: the panel takes a
corner and the felt stays behind it, which is the milder version of "a faster non-blocking variant"
short of actually letting play continue underneath. It still blocks, it still appears after every
trick, and whether _that_ wears out is still only answerable by playing. The second question DLR-160
adds is whether the pre-fight stop it introduced ([the run map and the path screen](../run-ui/run-map-and-the-path-screen.md))
earns the extra screen it puts in the run flow.
