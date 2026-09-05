_Part of [War Council UI](README.md)._

### The arming surface — DLR-174

Tapping a card in hand raises it **and** replaces the felt stage with a small surface: the raised
card pinned at its head with that card's live win/lose figures, and beneath it only those buffs that
could still pay if this card is played this trick. `ArmingSurface.tsx` renders it,
`armingSurfaceModel.ts` builds the view it renders, and `FeltRegion.tsx` decides that it — rather
than `BuffGallery` or `FeltStage` — holds the stage.

The property the whole design is judged on is the tap count, and it is a structural property rather
than a tuned one: the surface appears on the raise tap the player was already making, so **a plain
card still costs exactly two taps** (raise, play) and **a card with a buff costs four** (raise,
poise, arm, play). Nothing was added to the plain path.

#### The filter is one call to `projectBuffBranches`, and there is no second condition table

`armingReachOf(state, card, candidate)` in `armingSurfaceModel.ts` answers the module's one
question — _could this **held** buff pay if I play this card?_ — the same way `buffRideModel.ts`
answers it for an already-**active** buff, one step earlier. It takes the projection input
`rideInputFor(state)` already builds, appends the candidate to that input's `active` list, calls
`projectBuffBranches` from `src/warCouncil/buffProjection.ts`, and asks whether the candidate's id
appears in any of the four fired/mayFire sets across both branches. It returns `null` when it
appears in none, and that `null` is what drops the row.

**There is no `switch` over `BuffConditionKind` anywhere in this file, and that is the module's
central discipline** — inherited verbatim from `buffProjection.ts`'s own docblock, which forbids the
parallel table for a stated reason: a condition family restored later would silently never fire
through the copy. Here the failure would be worse than silent, because **a hidden buff reads as a
buff the player does not hold**. Two behaviours fall out of that one derivation rather than being
written:

- **"Could pay" includes "might pay."** While the player leads, the Quarry's card is face down, so a
  skull-reading buff lands in the projection's `mayFire` set rather than `fired`. The row is kept and
  `ArmingRow.mayFire` marks it; `ARMING_MAY_FIRE_TEXT` prints "may fire", never a figure.
- **The Low family is not narrowed to good outcomes.** Suit Low pays on a Low Victory *and* a Low
  Defeat, and unioning both projected branches is what keeps that true without an outcome-quality
  term existing anywhere in the file.

**Activated-cadence cards bypass the projection entirely.** `BUFF_CADENCE[buff.kind] ===
BuffCadence.Activated` returns `{ fires: true, mayFire: false }` before the projection is reached,
because `buffFires` returns `false` for every Activated kind **by design** — running Cheat, the
wildcard and the Curse through the filter would hide all three, including the Cheat the whole lock
path below depends on. It reads the cadence table rather than a hard-coded list of kinds, so
restoring a consumable needs no edit here.

**Availability is not this module's to decide either.** Every row's state comes from
`loadoutRefusalFor(state, buff)` — the existing single statement of "can this be activated right
now". A row refused for `WindowClosed` is dropped; every other refusal keeps its row, disabled, with
its reason. That is what makes "once the Quarry has led the surface offers a held Cheat and nothing
else" a *consequence* of `buffActivationWindowOpen` (Cheat's window is `canAct`, everything else's
is `discardWindowOpen`) rather than a special case written a second time — and it is why no
skull-condition buff can be armed in response to seeing a skull on the table, structurally rather
than by convention.

**`buffActivationWindowOpen` was read, never moved.** The arming window itself is unchanged by this
ticket. The surface states which window it is in by reading `discardWindowOpen` at surface level,
since `buffActivationWindowOpen`'s own signature is per-buff.

#### Three modes, and the surface says which in words

`ArmingMode` has three members and `buildArmingSurface` picks one:

| Mode            | When                                                             | What the surface shows                                                                       |
| --------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Card`          | a card is raised and is legal, or a held Cheat could unlock it     | the filtered rows, the win/lose slip, and the window statement                                 |
| `NoValidCards`  | a card is raised, it is illegal, and no Cheat is armable           | the reason (follow-suit binds) and the remedy (a Cheat breaks it, and you hold none)           |
| `CurseClaimed`  | a Curse is armed, so the hand tap is already claimed for marking   | that the tap is claimed and that one tap ends the mode — **stated, never signalled by emptiness** |

An empty `rows` array in `Card` mode is a fourth, legitimate state and is deliberately distinct from
`NoValidCards`: it prints "Nothing pays on this card". `ArmingWindow` is the two-member statement of
which window the surface is in (`BetweenTricks` / `CheatOnly`), printed on the surface's face.

All of the copy lives in `armingLabels.ts`, transcribed verbatim from the contract's `mockup.html`
rather than re-worded, because that is the developer's own authored copy already read on screen.

> **`armingLabels.ts` imports `ArmingWindow` type-only, and writes `ARMING_WINDOW_TEXT`'s keys as
> literal strings** (`'betweenTricks'` / `'cheatOnly'`) rather than as `ArmingWindow.BetweenTricks`.
> `armingSurfaceModel.ts` owns that type and also imports two strings back from `armingLabels.ts`, so
> a **value**-level import in both directions is a genuine circular dependency that throws a TDZ
> `ReferenceError` at module load. The type import still keeps the record checked against every
> window the model declares.

#### Raising and playing are two acts with two gates

This is the one behavioural widening the ticket took beyond its literal text, and it is load-bearing
in two files.

- **Raising** takes `cardRaiseWindowOpen`, which delegates to `loadoutDoorOpen` (`discardWindowOpen
  || canAct`). That reaches the **Quarry-to-lead gap**, which is roughly half of all between-tricks
  moments and where arming through the gallery has always been legal. Without the widening the
  ticket would have *removed* arming reach from half the tricks.
- **Playing** still requires `canAct`, unchanged. `handleTapCard`'s same-card branch returns early
  when `canAct` is false: the card stays raised and the play waits for the turn.

**The DOM had to be widened to match, and was not at first.** `WarCouncilTable.tsx`'s
`handInteractive` was built from `interactive` alone, so `HandFan` rendered every card `disabled` in
that gap and the raise the reducer already allowed was unreachable by click. `handInteractive` now
also reads `cardRaiseWindowOpen(ui) && !inFlight`, and
`__tests__/WarCouncilRound.armingGap.test.tsx` mounts the real tree and clicks a hand-card button in
that gap. A reducer-level spec could not have caught it — dispatching `TapCard` directly never goes
through a `disabled` button.

#### Legality is decided before a same-card tap counts as a play

`handleTapCard` tests `legalMovesFor(state)` **inside** the same-card branch, before falling through
to `commit`. The order is not cosmetic: `commit`'s rejection branch clears `armed` to `null`, and
`armingSurfaceOpen` reads `armed !== null`, so a second tap on a still-illegal card would have
unmounted the whole surface mid-shake instead of re-refusing on it. So:

- **illegal, no armable Cheat** — re-raises with its rejection refreshed, so the card shakes again;
- **illegal, a Cheat held but not yet armed** — stays raised as a silent lock;
- **legal, including a card whose Cheat *has* been armed** — falls through to `commit` unchanged,
  which is the lock's whole payoff and the reason the branch order mirrors the developer's mockup.

`legalMovesFor` in `armingWindows.ts` is the single reading of "what can be played right now",
folding `cheatArmed` in through the same option `commit` plays with. `WarCouncilTable.tsx`'s
fan-greying and the reducer's own refusal both call it; before the review pass each had re-typed the
identical expression by hand.

> **The plan's own state diagram contradicted the ticket, and the ticket won.** `tasks.md` had an
> illegal tap with no Cheat merely rejecting without opening the surface. The ticket's own text
> ("gives a rejection animation on the card **and** puts 'No valid cards to play' in the surface's
> head") and the developer's browser-checked mockup — whose `tapCard()` raises the card on every tap
> before adding the shake class — both say otherwise. **Every tap now raises**, and an illegal one
> with no Cheat sets `rejection` alongside `armed` so the card shakes *while* the surface states the
> reason. Do not "fix" this back to the diagram.

#### An illegal card is enabled-but-refusing, not disabled

`PlayingCard`'s `illegal` prop is now **purely presentational** — the grey — and a new optional
`disabled` carries "cannot be tapped at all" (the Quarry's turn, a held reveal, a card in flight).
Two facts, two props. A `disabled` button cannot be clicked, cannot take focus and cannot shake, so
an illegal hand card could neither refuse nor be reached by keyboard while the two were one prop.
`disabled` is optional and defaults to `false`, so none of `PlayingCard`'s construction sites needed
an edit; `HandFan` is the only component that passes `illegal` at all.

`HandFan`'s `isFocusable` widened accordingly: **every card in an interactive fan is focusable now**,
legal or not, where it used to hand the roving tabindex the engine's legal set. An illegal card is a
real tab stop that refuses out loud rather than a skipped one.

> **A `refusing` prop on `HandFan` was built and then removed inside the same contract.** `plan.md`'s
> data shape still names it; the code does not have it. It produced a `wc-is-refusing` class no CSS
> rule selected and no component read, and its derivation disagreed with the reducer's actual refusal
> on two counts — it omitted `!inFlight`, and it omitted the `unlockingCheat` term, so it read
> "refusing" even on the one trick where a held Cheat makes an illegal tap a lock. The criterion it
> was meant to serve is about the card being enabled, focusable and clickable, which
> `__tests__/handFanRefusal.test.tsx` covers directly.

#### `ui.loadout` changed meaning, and three consumers were reading it the old way

`ui.loadout` was "the gallery is open". It is now the **shared poise holder for whichever arming
surface is showing** — raising a card sets `loadout: { poised: null }` alongside `armed`. Both
surfaces therefore dispatch the same `TapBuff` into the same `handleTapBuff`, so there is exactly one
commit path, one misclick guard and one `Escape` ladder rather than a second reading of "which buff
is half-armed".

`galleryOpen(state)` in `armingWindows.ts` is now the single owner of "the gallery holds the stage"
(`loadoutOpen && cardRaiseWindowOpen && !armingSurfaceOpen`), read by the rail, the stage ternary and
the action bar's `aria-pressed` so the three cannot disagree. **It returns `false` whenever
`armingSurfaceOpen` is true** — the arming surface wins when both could show.

Three consumers were caught during review still reading the old meaning, and all three were real
defects:

- **`CancelSelection`** — the very transition the surface's second `Escape` press dispatches — did
  not clear `loadout`, so cancelling a raise rendered the full unfiltered gallery instead of the
  plain felt. It now clears it.
- **the hand's own interactivity gate** — `handInteractive`, above.
- **both `commit` exits** — the played-card path and the rejection path — now clear `loadout`, so a
  played card cannot leave the gallery popping open behind it.

`handleToggleLoadout` guards on `state.armed === null && state.loadout !== null`, so pressing Apply
Buff while a card is raised lowers the card and opens the full gallery: the button consistently means
"show me everything" rather than producing an ambiguous both-open state. **The gallery was retained,
not retired** — it is the only surface that shows the whole pool with its tier and suit filters, which
is a cross-trick planning tool rather than a per-trick one.

#### The riding strip has exactly one mount point

`BuffRidingList` renders in the arming surface's foot while the surface is open and in `BuffRideZone`
while it is not — one component, one `RidingBuffRow[]`, one mount point chosen by a ternary. Deleting
it from the ride zone would hide what is riding whenever no card happens to be raised; rendering it in
both places is the duplication every model in this module exists to prevent.

#### The three-file import cycle, and why it is safe

`armingWindows.ts` exists because inlining its four predicates pushed `roundUiState.ts` past its
400-line budget — the same split `roundUiSeed.ts` made for the same reason. `roundUiState.ts`
re-exports every name in it, so **there is one import path, not two**: import them from
`roundUiState.ts` exactly as before.

That re-export closes a genuine **value-level** cycle across three files: `armingWindows.ts` →
`buffHandlers.ts` → `roundUiState.ts` → `armingWindows.ts`. (`buffHandlers.ts` does not import from
`armingWindows.ts` at all; it is the re-export edge that closes the loop.) It resolves safely under
ESM live bindings because **every cross-module reference in the cycle is used only inside a function
body**, never at a module's top level — so each is resolved at call time, once every module in the
cycle has finished evaluating. Both reviewers verified this independently. The shape that does *not*
survive is a top-level value reference, which is exactly the case `armingLabels.ts`'s type-only import
avoids above.

#### Lifecycle, cost and the two developer-owned values

The surface adds **no `useEffect`, no timer, no listener, no observer and no
`requestAnimationFrame`**. Its only local state is the roving tabindex's own `focusedIndex`, already
inside `useRovingTabIndex`, and the rejection shake is a **CSS keyframe** keyed off the head
thumbnail's `illegal` class — so nothing needs cancelling and nothing can strand if the felt unmounts
mid-shake. StrictMode's double mount is a no-op.

The buff list is one `useRovingTabIndex` group over reused `BuffCard` children, so a buff card looks
and behaves identically in both surfaces. That hook indexes `querySelectorAll('button')`
**positionally**, which is why the "may fire" note and the row wrapper are a `<span>` and a `<div>`
rather than buttons. `Escape` unwinds one level: it drops a held poise first and clears the card
selection only on the second press.

The surface takes **its own distinct accessible name** (`ARMING_SURFACE_LABEL`, "Arm for this card")
and deliberately not `LOADOUT_PANEL_LABEL`, which seven existing specs reach the gallery by.

The expensive call is `projectBuffBranches`, and it is bounded: one call per *offered buff* for the
*single* raised card, only while a card is raised — not a pointer-frequency event. `buildArmingSurface`
takes `legal` and `riding` as parameters rather than recomputing them, so `lightsForHand` is not run a
second time per render. No `memo`/`useMemo`/`useCallback` was added; there is no profiling evidence
for any.

Two CSS custom properties in `warCouncilArming.css` are **the developer's to choose** and ship as
documented placeholders transcribed from the mockup:

| Property                | Placeholder                       | What it trades off                                                                                  |
| ----------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `--wc-arming-card-w`    | `clamp(5.4rem, 15vh, 11.5rem)`    | the buff-card size on this surface, keyed off **felt height** rather than viewport width, since the felt is the container that actually constrains it |
| `--wc-arming-reject-ms` | `280ms`                           | the rejection shake's length — too short and it is not read, too long and it delays the retry         |

Window states differ by **border style** (solid / dashed / dotted) as well as tone, so they read
without colour, and the shake is suppressed under `prefers-reduced-motion`.

#### What is not proved, and what a browser would have checked

jsdom has no layout engine, so no test in the suite proves the felt still fits with the surface in it.
The contract ran with its browser pass off. The eyes-on list: **no page scroll at 1920×960 and
1366×720 in all four states**; the plain path being **exactly two taps** and the buffed path
**exactly four**, counted; the greyscale screenshot **actually taken**, with armed vs. poised and the
two window statements still telling apart in it; and a clean console through a full trick with a buff
armed and removed.

Two things remain the developer's judgement rather than a test's: whether the rejection shake belongs
on the head thumbnail (where it is) or on the tapped hand card itself, and whether **Apply Buff
lowering a raised card** is the right reading of that button.

#### Tests

- `__tests__/armingSurfaceModel.test.ts` — the filter without a renderer, under the `node` project:
  a Bells Suit High buff present for a Bells card and absent for a Moons card; Suit Low present on
  both branches; Skull Low as "may fire" while leading; Cheat, the wildcard and the Curse present
  whenever their window is open despite carrying no condition.
- `__tests__/roundReducer.arming.test.ts` — the raise/play split, `CancelSelection` returning to the
  felt, the no-Cheat re-raise, the held-but-unarmed-Cheat lock, and the positive control where an
  armed Cheat lets the second tap commit.
- `__tests__/ArmingSurface.test.tsx` — the four states and the keyboard model.
- `__tests__/handFanRefusal.test.tsx` — an illegal card being enabled, focusable and clickable.
- `__tests__/WarCouncilRound.armingGap.test.tsx` — the Quarry-to-lead gap reachable through a real
  click on a real button.

> **Two window-exclusion specs proved nothing until review corrected them.** Both passed
> `offered: [cheat]` alone, so "every row is a Cheat" was true whether or not the exclusion worked —
> nothing else was ever given the chance to appear. Both now also pass a non-Cheat buff matching the
> raised card's own suit, so it would otherwise be per-card-relevant, and assert its row is absent.
