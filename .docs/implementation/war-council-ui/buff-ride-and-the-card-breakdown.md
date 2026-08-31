Part of [War Council UI](README.md).

# The riding buffs, the lit hand, and the per-card breakdown — DLR-153

Before this ticket, activating a buff deleted a card from the pile and changed nothing else on
screen. Nine of the sixteen live templates are gated on the **suit of the card you end up playing**,
and the screen never said which of your cards that was. DLR-153 makes activation legible: every
legal-to-play card a riding buff could fire on lights up, a "riding this trick" list says how far
each activated buff reaches and lets you take it back off, and a per-card panel breaks one card's
two branches down row by row.

**The single rule the whole surface obeys: no firing rule is derived here.** Every figure comes out
of `projectBuffBranches` in `src/warCouncil/buffProjection.ts` — the same function that answers the
question by calling `firedBuffs` and `resolveFiredBuffs`, which is what the real trick resolution
calls. Neither `buffRideModel.ts` nor `buffBreakdownModel.ts` holds a `switch` over
`BuffConditionKind`, and neither performs accrual arithmetic; the only subtraction anywhere is a
delta between two accruals the projection returned, which `BuffProjection`'s own doc leaves to the
consumer. This is the defect the DLR-147 mockup shipped — a view-layer copy of the predicates that
reported +6 damage for a load whose ceiling was +4 — and it is the reason the module split looks the
way it does.

## `buffRideModel.ts` — the input, the per-card skull reading, and the light map

`rideInputFor(state)` assembles the projection's input from **`buffHandInputFor(state)`**, the same
value the real commit threads into `resolveTrickBank`. Because the preview and the commit read one
assembly, they cannot disagree about what is riding. It adds only `finalTrick` (`tricksPlayed + 1 ===
HAND_SIZE`, derived exactly as `cardDamage.ts` derives it) and the two facts `BuffProjectionFacts`
records as deliberately constant across branches, `playerHit` and `bankAfterTrick` — inert only
because Hoarder and Unbloodied are cut and unconstructible.

`skullReadingFor(state, candidate)` is the one place this module makes a real decision, and it makes
it **per candidate card rather than once per trick**:

- the candidate is itself in `round.skulledCards` → `true`. A card you hold that carries a skull
  makes the trick skulled whatever the Quarry plays, so the reading is knowable **even while you
  lead**.
- the Quarry has already led (`currentTrick.length === 1`) → `trickIsSkulled` over the visible trick
  plus the candidate.
- otherwise `null` — which means **"not knowable"**, never "no skull".

That per-card variance is why `lightsForHand` calls `projectBuffBranches` once per legal card instead
of calling `buffReach` once for the hand: `buffReach` takes a single hand-wide `skullTrick` and would
report a skulled candidate on a lead as a maybe. `buffReach` is therefore left in place in the engine
**unused** rather than deleted (see [the projection's own doc](../war-council/buff-projection.md)).

A card's `CardBuffLight` carries three fields. `count` is the **higher of the two branches' ceilings**
— `fired.length + mayFire.length` on each — which is the figure the badge and the halo both read.
`estimate` is true when either branch contributed a `mayFire` buff, which is what puts the badge into
the existing `~n` italic form. `projection` is the whole `BuffProjection`, kept so the breakdown can
be built from it without a second projection pass. A card with a count of 0 is never entered in the
map at all, and an absent key means dark.

**An illegal card never enters the map**, because the map is built from `legal` only — and `reachOf`
counts a buff's reach by walking that same map, never by a second projection pass. So an illegal card
cannot inflate a reach figure by construction rather than by a filter someone has to remember.
`ridingRowsFor` pairs each activated buff with its reach and with `isRevocableBuff(buff)`.

> **DLR-154 gave the list a fourteenth kind of row and one exception to the paragraph above.** A
> Timebomb row is built from `RoundUiState.timebombBuff` **directly**, and Timebombs are filtered
> out of the ordinary rows — because a Timebomb now outlives the trick boundary at which
> `openBuffWindow` clears `activatedThisTrick`, so a row sourced from that list would vanish while
> its two-trick fuse was still running. The row carries a `timebomb: TimebombRide | null` field
> holding the **derived** target (`primedCards.at(-1) ?? null`, never stored) and the fuse count,
> and it is revocable — Timebomb is the first Activated card that is. See
> [Priming a Timebomb](timebomb-priming-and-the-fuse.md).

`activatedBuffs(state)` resolves the ids in `activatedThisTrick` back to cards through the
**`offeredBuffs(state)` ∪ `spentThisTrick`** union `buffHandInputFor` already uses — a card consumed
at activation is no longer offered, and looking in the pile alone would silently drop it. An id the
union cannot resolve is skipped rather than throwing, because this path is reachable from a render.

`bestLitCard(hand, lights)` — which picked the default panel target, the highest-count lit card with
ties broken in hand order — **was deleted in Phase 8**. Hover-only removed the only concept that
needed a default, and with it the function's only consumer. It is not kept the way `buffReach` is:
`buffReach` carries a docblock stating why an unused engine export stays, and `bestLitCard` had no
such reason — a view helper nothing calls is dead code, not a restoration path.

## `buffBreakdownModel.ts` — one card, read bottom-up

`breakdownFor(state, legal, lights, card)` returns `null` for a card with no light — a panel with
nothing to report renders nothing at all, rather than a zero-filled object the component would have
to detect. It re-checks the card's membership of `legal` as well as its presence in `lights`, so a
card passed in error reads as "not a legal card" instead of silently as "dark".

The value it builds is ordered as the panel reads it, furthest from the card first:

- **Dead rows.** Every activated buff _not_ in this card's projection, struck through, with two
  clauses: `deadRowReasonText` ("Needs Bells — this card is Keys.") and `deadRowElsewhereText` (" It
  is lighting 2 of your Bells cards instead."). When the buff reaches nothing at all the second
  clause becomes the explicit zero-reach sentence, so a dead row never reads as merely "wasted here".
  A suitless buff — Sidestep — is never dead for a _suit_ reason and gets a suit-neutral sentence
  rather than a fabricated suit clash.
- **Two branch groups**, `Took` and `DidNotTake`. The members are named on the **mechanical** axis,
  because that is the axis every buff condition reads. Each group lists that branch's `fired` rows
  followed by its `mayFire` rows; a `mayFire` row prints "may fire" instead of a figure, because the
  Quarry's card is withheld and a certain figure there would either fabricate or leak.
- **The Overlap Bonus**, `max(0, firedCount - 1)` over the **higher** of the two branches' certain
  counts — the same "read the higher ceiling" discipline the badge applies. `null` when it is 0,
  because `game-ux` forbids a row reporting nothing.
- **Two totals rows**, nearest the card, **neither emphasised**. The type carries no "preferred" flag
  for exactly that reason: the ruleset withholds the Quarry's card, so a leaning readout would leak
  it. Damage and multiplier are `outcome.accrual` minus `state.buffHand.accrual`. `carryText` is
  non-null only when this branch diverts a Feeder's reward into the next hand's carry (DLR-150), read
  as a delta off the accrual and never recomputed.

**`BreakdownTotals.estimate` is what stops the totals row lying on a lead.** A branch's `outcomes`
holds one entry when the skull is known and two while it is not; `totalsFor` reads `outcomes[0]` (the
skull-false reading, matching the projection's own ordering) for the figures, and sets `estimate`
whenever `outcomes.length === 2`. The row then carries the note _"assumes the trick is not skulled —
not yet known"_. It reuses the qualified-figure signal `CardBuffLight.estimate` and
`BreakdownConditionRow.mayFire` already carry rather than inventing a second one. The two outcomes
can only disagree in their figures when a riding Feeder's carry depends on Dodge versus Clean Loss;
the condition rows above are unaffected either way, since `fired`/`mayFire` are already the union
across readings.

Every sentence on this surface lives in `buffRideLabels.ts`, which re-exports `buffName`,
`buffConditionSentence` and `buffPayoff` from `buffLabels.ts` rather than authoring second copies.
`BreakdownBranch` and `CardBuffLight` are imported **type-only** there, so the runtime dependency
graph has exactly one edge — into the labels file — and no cycle.

## Taking a buff back off the trick

`the-hunt.md` recorded the old rule as "activation commits on a second tap with no way to
un-activate". That is no longer true, and the change is implemented where the rule lives, in
`src/hunt/buffActivation.ts` — see
[the engine's own doc](../hunt/buff-activation-and-ap-costs.md). The UI half is three small pieces:

- `RoundUiActionKind.RemoveBuff` — a thirteenth action, distinct from `CancelBuffPoise`, which drops
  an _unspent_ poise where this reverses a _committed_ activation.
- `handleRemoveBuff(state, id)` in `buffHandlers.ts` — asks membership of `activatedThisTrick` and
  then `isRevocableBuff` **first**, and returns `state` itself on a no. (**DLR-154 put one branch
  ahead of both**: an id matching `state.timebombBuff` is handled by `removeRidingTimebomb`, which
  returns the card to the pile directly and clears the fuse, the armed and primed damage and the
  mark — `deactivateFromPile` would throw, because a riding Timebomb has usually outlived
  `activatedThisTrick`.) `deactivateFromPile` throws
  by design, and a throw inside a reducer during an event handler unmounts the tree; returning the
  same object rather than a copy also means an idle removal causes no re-render, mirroring
  `handleCancelBuffPoise`.
- `BuffRidingList.tsx` — one row per activated buff: its name, `buffReachText(reach)`, and either a
  remove button labelled _"Take Taker off the trick — 3 cards go dark"_ or, for a non-revocable card,
  a status line saying it has no condition to reach and is already spent. A greyed control with no
  reason is what this epic's own design record rejects, so the control is **absent** with the reason
  stated rather than present and dead.
- `CardBuffBreakdown.tsx` — **since Phase 8, every row of the breakdown carries the same control**,
  the struck-through dead rows included. It takes `riding` and `onRemove` as props and looks each
  row's `BuffId` up in `riding` to reach the reach figure `removeBuffLabel` needs; a row whose buff
  is not revocable, or which the lookup cannot resolve, renders no control rather than a dead one.
  `update-log.md`'s CORRECTION _"taking the ✕ out of it was pedantry"_ is the reason: the buff is
  named in front of the player, so that is where the hand goes. **This is not redundant with the
  riding list** — a buff that reaches zero cards appears in no card's breakdown at all, so the list
  is the only surface it can be removed from.

  The label is unchanged and still names the **trick**, never the card the panel happens to be
  showing: `removeBuffLabel` is the one sentence both components print, so neither can drift into
  implying a per-card removal that the engine does not have. The control is `.wc-buff-breakdown-remove`
  in `warCouncilBuffRide.css`, sized to the 44px target directly rather than through a
  pseudo-element expander — the panel's rows are dense enough that an invisible expander would
  overlap its neighbours' hit areas.

Removal announces through the hand's existing `aria-live="polite"` hint region rather than a second
live region. `useBuffRide` holds that announcement in component-local state, and
`WarCouncilRound.tsx` clears it through **one** wrapper around its reducer dispatch
(`dispatchClearingAnnouncement`) so every other hand action clears it — not just a card tap.
`ToggleLoadout`, `TapBuff`, applying damage and opening a discard selection all reach a hand action
between a removal and the next tap, and each used to leave the confirmation stranded in place of the
hand's real hint, both visually and to a screen reader.

## Three carriers on a lit card, and the lift ladder

`PlayingCard` gained two **optional** props, `buffCount` and `buffEstimate` — optional so the other
49 construction sites keep compiling, the precedent `primed`, `discardSelected` and `describedBy`
each set. `HandFan` gained a **required** `buffLightForCard` callback, deliberately not defaulted for
the reason `damageForCard`'s docblock gives: a defaulted stub is exactly how a readout silently stops
reading out. The fan gates the light behind the **same** `illegal` expression it already passes to
`PlayingCard`, rather than re-deriving legality.

A lit card carries three independent signals, so the state survives both greyscale and reduced
motion:

- **A halo** — `CardBuffHalo.tsx` renders one `aria-hidden` `<svg>` holding four stacked rounded
  `<rect>` strokes plus a `box-shadow` on the card itself. Its hue is `--wc-buff-halo: #ff3326` and
  `--wc-buff-halo-deep: #8e1409`, declared on `:root` in `warCouncil.css`. **Both were corrected in
  Phase 8**: the strokes had been borrowing `--wc-alarm` (`#d1705f`), which is the muted colour this
  screen uses to mean *damage*, so a lit card was speaking in the damage vocabulary. The two
  replacements are **transcribed** from the mockup's own `--load-red` / `--load-red-deep`, not chosen.
  This settles nothing about the epic's open red-versus-brass question — it corrects *which* red, and
  the hue remains a placeholder. Each stroke's width and opacity **start
  non-zero and grow** with the count, because a stroke scaled purely by the count is invisible at one
  buff. The count saturates at five. There is no `filter: blur()` and no `mix-blend-mode` anywhere
  near a card: both stalled Chrome's rasteriser badly enough on this epic to time out screenshots.
- **A travelling cell** — a fifth `<rect>` sharing the same geometry, animated by
  `stroke-dashoffset`. `pathLength="1000"` gives the stylesheet a fixed unit space independent of the
  rect's real perimeter, and `vector-effect: non-scaling-stroke` holds the weight constant as the
  card resizes across breakpoints. Not a rotating `conic-gradient`, which needs `@property` to
  animate and repaints the whole box every frame.
- **A numeral badge** — a real text node at the card's bottom-right (top-right is the skull's,
  top-left the corner index, bottom-left the primed mark), with the spoken form _"2 buffs could fire
  on this card"_ beside it. It renders `~n` in italic when the count is a ceiling, the grammar
  `wc-card-damage.wc-is-estimate` already uses.

The count reaches CSS as `--wc-buff-count` on the `<svg>`'s own style, where custom-property
inheritance makes it visible to every descendant. **No lap time, stroke width or opacity is computed
in TypeScript** — the stylesheet's `calc()`/`max()` do that arithmetic, which is what keeps the 0.9s
lap-time floor un-defeatable from the component. That floor is a **flash-safety limit, not a tuning
value**; the slope above it (`3.2s − 0.5s × count`) is a placeholder.

Under `prefers-reduced-motion: reduce` the animation is dropped and the dash pattern becomes a
continuous rail at full brightness; the halo and the badge are untouched, so all three carriers
survive.

The lift ladder became three tokens on `:root` in `warCouncil.css` — `--wc-lift-hover: -9%`,
`--wc-lift-rest: calc(var(--wc-lift-hover) / 2)` and `--wc-lift-armed: -20%` — replacing three
literal percentages in `warCouncilCards.css`. Both endpoints are **transcribed** from those literals,
not newly chosen; the resting lift is the new part, and it is derived so it can never be set
independently of hover.

## The hover bridge, and why blur does nothing

**Hover-only, since Phase 8 — this reverses the open-by-default reading DLR-153 shipped earlier the
same day.** `useBuffBreakdownTarget()` takes no argument and owns a plain `Card | null` that starts
at `null`. The panel is on screen only while a lit card is entered — `onEnterCard` from a mouse
`pointerenter`, from a keyboard `focus`, or from a **tap**; it switches straight to another lit card
entered; and it holds open across the gap, since leaving either the card row or the panel schedules a
close that entering the other cancels. `Escape` closes at once. The close delay is a **placeholder**
160ms transcribed from the mockup.

The reversal is worth recording because it overturns a documented correction. `update-log.md`'s
_"the readout stays up"_ argued open-by-default on the grounds that detail you must re-summon is
detail you stop consulting — a judgement formed on a standalone mockup sheet where **nothing sat
underneath the panel**. On the real felt the panel covers the played cards (the trade accepted below),
so open-by-default meant the trick was covered for the whole time a buff rode rather than only while
the player was reading. Hover-only confines the occlusion to the moments a player is deliberately
comparing cards. QA confirmed the improvement live: at rest the trick is now fully visible, which was
not true before.

**There is deliberately no `onBlur` field at all.** Tabbing into the panel moves focus off the card,
and a close-on-blur would spring exactly the trap the hover bridge exists to avoid, on a keyboard
user instead of a mouse one.

The state is one `Card | null` and nothing else. The three-shaped value the open-by-default version
needed — an `undefined` "no override" sentinel and an `{ escapedFrom }` shape holding a dismissal
open only until the default target moved on — is **gone with the default it existed to follow**, and
so is `bestLitCard`, its only consumer (below).

One `setTimeout`, held in a ref, cleared by every cancel path **and** by the effect's own cleanup, so
StrictMode's double mount cannot leave an orphan that closes the panel under the next mount. No
document-level listener: `Escape` arrives through the hand's existing `useRovingTabIndex` handler and
the panel's own `onKeyDown`.

The fan's seam mirrors `useCardTip`'s: `onPointerEnter` gates on `pointerType === 'mouse'` so a touch
tap does not register as a hover a touch device can never leave, and `onFocus` reaches the same
switch for a keyboard user — focus and blur being the two React events that bubble. **That gate is
why the touch path runs through the card tap instead**: `WarCouncilRound.tsx`'s tap handler also calls
`onEnterCard`, so on a device with no pointer a tap pins the readout. Nothing on that path closes it —
there is no pointer to move away and no `Escape` — so it stays until another lit card is tapped or the
trick moves on.

Hover and target state is **component-local `useState`, never reducer state**. It dies with the hand
row, no rule reads it, and putting it in `RoundUiState` would leak it into `debugState`, into every
`RoundUiSeed` fixture, and into the StrictMode double-dispatch argument `createRoundUiState` makes.

## Where it mounts, and the 400-line budget

`WarCouncilRound.tsx` stood at 346 of its 400-line budget, so prop assembly went into a new
`buffRideProps.ts`, the same split and the same stated reason `roundControlsProps.ts` exists for.
That file holds two things: `buffRideView`, a plain assembler, and `useBuffRide`, a hook bundling the
hover-bridge call, the breakdown lookup and the removal announcement behind one call site. **Phase 8
shrank both**: `BuffRideView.defaultTarget` and `BuffRideOptions.displayHand` went with the default
target they existed to compute, since hover-only reads a target the pointer names rather than one the
model picks.

**The stylesheets have the same budget.** `warCouncil.css` reached 412 lines in Phase 8's hue
correction, so the `--wc-hp-*` health-bar token block moved **byte-identical** into
`warCouncilHealthBars.css`, beside the rules that already consume it — the tokens now live with their
consumers rather than in the shared root, and nothing else about them changed. `warCouncil.css` is
393 after the move.

Both the riding list and the breakdown live in the **hand zone**, `.wc-buff-ride-zone`, not inside
the gallery. `BuffGallery` replaces `FeltStage` inside `.wc-table` and unmounts the moment the door
closes; anchoring to the hand — which renders unconditionally — is what keeps the panel visible after
the player closes the panel they activated from. `grid-area: hand` moved onto that zone; `.wc-hand`
in `warCouncilHand.css` was already dead CSS before this ticket and is left in place with a comment
saying so.

`CardBuffBreakdown` is `position: absolute`, anchored `bottom: 100%` against the zone, with
`max-height: min(34vh, 22rem)` and `overflow-y: auto` — a cap on the one element that can grow past
its budget, rather than a clip on an ancestor, since the shell's `overflow: hidden` would otherwise
turn an overflow into a silent crop. It reached that shape through two rejected ones: in normal flow
it joined the track the `hand` row sizes against and squeezed `.wc-table` from 533px to 173.7px for a
single riding buff, whereupon the felt's own unshrunk content painted through and the later sibling
won every hit-test. Out of flow and anchored upward, that row competition is gone at its root — and
the panel can never grow _downward_ into the hand or the action bar. It **can and does** grow over
the live trick, which is the accepted trade below.

## The panel covers the live trick, and that is accepted

**Decided 2026-08-27, by the developer, on DLR-153's AC17.** The panel is allowed to cover the
played-cards row while it is open. **Phase 8 narrowed when that applies without changing any of the
geometry below**: the panel was open by default the whole time a buff rode, so the occlusion was
permanent; hover-only confines it to the moments a lit card is entered, and at rest the trick is
fully visible. Every measurement here still holds while the panel is up. The developer's reasoning was that the cost is only payable while
the panel is deliberately open, and that it is not worth redesigning the panel's home against a
guess: _"if I can't see it I can't fix it, if it's an issue I'll fix it after."_ The behaviour is
sanctioned, not outstanding — but it is revisitable, so every measurement that made the call cheap
is kept here.

**What the panel actually does.** Anchored `bottom: 100%` against `.wc-buff-ride-zone`, it grows
upward over the felt and geometrically intersects `.wc-trick-row` at all three viewports QA drove —
1440x900, 1280x720, and an emulated ~500px single-column shell. At **1440x900 and at ~500px it also
wins the hit-test**, so while the panel is open the trick is not merely covered but unclickable.
At 1280x720 the intersection is visual only.

**Why the existing guard does not reach it.** `max-width: calc(100% - var(--wc-rail-w))` in
`warCouncilBuffRide.css` subtracts the rail's width, which is what protects the decree and the spent
pile — both sit inside `.wc-felt-rail`. `.wc-trick-row` is **not** in that rail; it is a sibling
under `.wc-table-inner`, so the subtraction never covered it. DLR-148's structural non-occlusion
guarantee (`.wc-table` as `grid-template-columns: var(--wc-rail-w) minmax(0, 1fr)`) is a guarantee
about the **gallery panel**, which is a grid column; the breakdown panel is out of flow and inherits
none of it.

**At the narrow shell it cannot be fixed by a number.** The panel's own `min-width` is 288px and the
clear space to the right of the trick row is roughly 117px, so no width bound, no rail-width tweak
and no `max-width` term makes it fit beside the trick. Anything that actually removes the overlap is
a **relocation**: a drawer, a fixed-height strip above the hand, or a felt zone of its own with the
trick row moved inside the rail so the existing subtraction covers it. That is a design decision and
the developer's, not a token retune — which is precisely why it was accepted rather than guessed at.

The two feel questions DLR-153 left open — a suitless buff lighting the whole hand, and whether two
branch totals read as clarity or homework — are **not** covered by this decision and remain in
Deferred in [the module README](README.md).
