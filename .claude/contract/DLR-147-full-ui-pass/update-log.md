# DLR-147 — UI pass update log

Running record of every design decision made in the mockups, in words, so that whoever runs
`/fb-plan` on **DLR-148** or **DLR-149** does not have to reverse-engineer intent out of CSS.

**How to read this.** Each entry says *what changed*, *why*, and — where it matters — *what it cost
to find out*. Entries marked **CARRY** are decisions that must survive the port into `src/`; entries
marked **OPEN** are unresolved and need the developer or a rules call. Nothing here is a tuning
value: every size, colour and duration in both mockups is a placeholder, and they are listed once
under *Placeholders* at the end rather than repeated.

Newest entries go at the top of each surface's section.

---

## Shared — decisions that touch both surfaces

### The card is one component with two sizes
`.pc` renders the same face at two scales. `plate` is the condensed rendering used on the felt and
in the piles: it drops the rank name and tightens the corner index, because `game-ux` holds that a
played card is a record rather than a choice. **It keeps the art window**, though — the tinted
window is what tells you at a glance that the card on the table has a power, even at ~52px where the
figure inside is too small to identify. That is one answer to DLR-149's "must degrade to a small
size" criterion, and it is worth judging in the browser rather than accepting on paper.

### CARRY — paper grain must not be an SVG filter
The card texture began as `filter: url(#grain)` over an `feTurbulence`. With eleven cards on screen
this made Chrome's `Page.captureScreenshot` **time out at 120 seconds, three times**: every filtered
box is rasterised independently. It is now a tiled 64×64 base64 noise bitmap, which costs nothing
and is visually identical.

### CARRY — no `mix-blend-mode` on the grain overlay
Replacing the filter was not enough; the page still stalled. The remaining cost was
`mix-blend-mode: multiply` on the grain pseudo-element, which forces a compositing layer **per
card**. A plain low-opacity overlay is indistinguishable on parchment and free. Both of these are
the kind of thing that gets "helpfully" reintroduced during a React port, so both are commented in
the CSS at the point of use.

### CARRY — a card's size must not encode how many there are
Both grids used `repeat(auto-fit, minmax(<w>, 1fr))`. The `1fr` meant that filtering the buff
gallery down to three gold cards stretched those three across the whole panel. Both are now
`repeat(auto-fill, <fixed-width>)` with `justify-content: start`. Verified: buff cards hold 122px on
*All*, on *Gold* (2 cards) and on *Silver* (4 cards).

---

## DLR-148 — the buff gallery

### CORRECTION — the breakdown is open by default; you never click to read it
The gallery's readout was collapsed by default, so seeing what a card was worth cost a tap. That was
the wrong side of the trade: the breakdown **is** the point of the panel, and making it the thing you
have to ask for is what the panel exists to avoid. It now opens with the rows showing, on both
sheets. The collapse control stays as the escape hatch for getting the grid back, and says so —
*"tap to collapse and see the grid"*.

**The cost, measured rather than waved at.** At 1440×900 the expanded panel is **287px** and covers
**63% of the buff grid** (277px of 441px). The grid's top row and the riding pills stay visible; the
middle and lower rows sit behind it. That is the price of not clicking, and it is the right price —
but it is a real one, and it is the thing to watch when the pool grows.

**Why it is not in the dossier column instead.** There is genuinely dead space there — roughly
230×560px below "Tricks" — and moving the panel into it would free the grid completely. Rejected on a
measurement, not on taste: at ~230px these rows (condition, buff name, payout) wrap badly. The
standalone sheet's rail is that width and carries only compact one-liners for exactly this reason.
Putting the full breakdown there needs a different row design, which is a bigger change than this
warranted. Worth revisiting if the grid coverage starts to bite.


### CORRECTION — the readout stays up, and the struck-through rows come back
Two things the earlier version did better, both restored.

**The panel no longer needs re-hovering.** It appeared on hover and vanished on leave, so getting the
list back meant going and finding a card again — friction for a panel whose whole job is to be read
while you decide. It now **opens as soon as anything is riding**, defaults to the card that gains
most, and hovering another card simply **switches** it. Nothing closes it but `Escape` or an empty
trick. Hover became a comparison gesture instead of the only way in, which is what it should have
been: the ring and the numeral are on the card's face at all times, so the panel was never the thing
carrying the decision — it was the thing carrying the detail, and detail you have to re-summon is
detail you stop consulting.

**The "cannot fire on this card" rows are back, struck through and furthest from the card.** They
were cut when the model was corrected, on the reasoning that a Keys buff on a Bells card is not dead
— it is lighting the Keys cards, so listing it would read as failure. That was right about the buff
and wrong about the *card*: when you are looking at one card, what will **not** fire on it is exactly
what you give up by playing it, and that is a real part of the comparison.

The wording carries both facts, which is what neither earlier version did: *"Needs Bells — this card
is Keys. It is lighting your 2 Bells cards instead."* Struck through, so it reads as "not here"; the
second clause, so it never reads as "wasted". Where a buff genuinely reaches nothing it says so
instead.

**Verified.** At 1440×900 on both sheets: the panel auto-shows on the first activation, names the
best card, survives leaving a card, switches on hovering another, and the struck-through rows report
the right reach. Self-check green, console clean.


### CORRECTION — the hover readout was unreachable, and taking the ✕ out of it was pedantry
Two defects, one developer question: *"I can't hover and remove buffs?"* Both confirmed by driving
it rather than by reading the code.

**1. The panel opened on the card's `mouseenter` and closed on its `mouseleave`** — so moving the
pointer up to reach anything inside it was the exact gesture that destroyed it. There is a 9px gap to
cross and the panel is not a child of the card, so it was decorative: you could look at it and never
touch it. It now has a **hover bridge** — entering the panel holds it open, leaving either the card
or the panel schedules a 160ms close that entering the other cancels. Blur deliberately does **not**
schedule a close, because tabbing into the panel's ✕ moves focus off the card and would spring the
same trap on a keyboard user; `Escape` closes it.

**2. The ✕ had been removed from the per-card readout on the reasoning that "a buff is not ON this
card, so removing it here would take it off a place it never was."** That is true about the rule and
useless about the interaction: the buff is listed there, so that is where the hand goes. The control
is back. What the pedantry was right about is the **wording** — it says the buff comes off the
*trick*, and names what else goes dark (*"Take off the trick — 3 cards go dark"*), so nobody thinks
they are unloading a single card. The toast says the same after the fact.

The rail's "Riding this trick" list keeps its ✕ too, and that is not redundant: **a buff that reaches
zero cards never appears in any card's readout**, so the list is the only place it can be removed
from.

### CARRY — an invisible hit expander overflows its row, and it does not look like a touch bug
The ✕ is drawn at 18px with a 44px pseudo-element for the touch target. On a 33px row that expander
sticks out ~5px top and bottom, which caused two things that both read as something else entirely:

- **Inside a scrollable ancestor it inflates `scrollHeight`.** The readout grew a scrollbar with a
  single row in it — measured, 56px of "content" in a 50.5px box, where the visible children summed
  to exactly 50.5. The extra 5px was the invisible expander.
- **Stacked rows overlap.** 33px rows with 44px expanders overlap by 11px, so adjacent ✕ buttons
  quietly steal each other's taps. Nothing renders wrong; the wrong button just fires.

The fix is to expand the **row**, not just the control: rows are `min-height:44px`, so the expander
fits inside its own row and cannot reach a neighbour. The gallery's riding-list pills went further —
their ✕ is now a genuine 44×44 control with no pseudo-element at all, because side by side two
expanders would have overlapped across the gap between pills. Asserted afterwards by computing every
control's real hit rectangle and testing all pairs for intersection: 4 controls, all ≥44px, zero
overlaps.

### Verified after this correction
Driven at **1440×900** and emulated **430×860 mobile/touch** on both sheets. Hover a card, cross the
gap into the panel, expand it, remove a buff from inside it, watch the affected cards go dark, and
the panel stays open under the pointer throughout. On touch there is no hover at all: tapping a card
pins the readout, so removal is reachable without it. Both sheets' self-checks green, console clean.

### CORRECTION — a buff is activated for the TRICK, so nothing is selected and the whole hand answers
**This supersedes the two sections below it.** Both `mockup-buff-loading.html` and the fold into
`mockup-buff-gallery.html` originally asked the player to nominate a card and then load buffs onto
it. That was wrong, and not merely as extra work — **it described a rule the game does not have.**

Bell-Taker's condition is *"took the trick playing Bells"*. It does not attach to one Bells card.
Once it is riding it is live for whatever you play, and it pays on **any** Bells card in your hand.
Asking which card to buff has no answer, because the buff has already answered: all of them.

So the model is now:

- **Activating a buff takes one tap and no target.** It rides the trick immediately.
- **Every card in the hand it could fire on lights up**, and each card's ring reads *that card's own*
  count. Play a Bells Taker and both your Bells cards glow; play a Sidestep, which is suitless, and
  the whole hand glows.
- **The hand becomes the readout.** You look at it and see which of your cards are hot, which is
  exactly the decision you are about to make. The old flow made you commit to a card *before* you
  could see what it was worth — precisely backwards.
- **A buff's reach is a property of the buff against your hand**, not something the player assigns,
  so each row in "Riding this trick" states it: *"lights up 3 of your cards"*. A buff that reaches
  nothing says *"no card in your hand can fire it"* — and that is the **real** dead case: dead
  globally, not dead on one card.

**Timebomb is the one genuine exception, and it keeps a targeting step.** It primes a specific card
and lands at the next trick's resolution, so "choose a card" is the correct instruction there — and
it is now the *only* place either sheet says it. Activating it enters a priming mode, the hand takes
a dashed green outline, and the next card tapped carries the bomb. Cheat targets nothing at all: it
is a permission for the trick, and says so.

**Two consequences worth judging in the running app.** First, a suitless buff lights the entire hand,
at which point the glow stops discriminating and the numeral badge is doing all the work — that is
honest, but it is the case to look at. Second, the per-card breakdown now has **no remove control**:
a buff is not on that card, so a ✕ there would take it off a place it never was. Removal lives on the
"Riding this trick" list, which is where the buff actually is.

**Only playable cards light up.** A card that is illegal this trick cannot be played, so no buff can
fire on it — lighting it, or counting it in a buff's reach, would promise a payoff the rules cannot
deliver. The gallery's illegal 2 of Bells stays dark and is excluded from every reach figure.

### CARRY — one fact, one owner: the hard-coded primed card fought the chosen one
The gallery's hand markup carried `data-primed="yes"` on the 7 of Bells as a static demo of the bomb
mark. Once priming became a live flow there were **two sources of truth**: the mark said one card and
the riding list said another, and both were "right". The static attribute is gone, the bomb's SVG is
hoisted to a single `BOMB_SVG` constant shared by the initial render and by `paintRing`, and the mark
now follows the chosen card only.

### CARRY — an x-only overlap test says nothing once a layout restacks
The assertion that the readout never covers the game rail compared `panel.left < rail.right`. That is
correct while the two are side by side and **meaningless** at 430px, where the shell restacks to one
column and the rail sits *above* the hand — the check reported a collision that could not exist. Real
rectangle intersection (all four edges) showed the rail at y 120–294 and the panel at y 580–681, no
overlap. Test the geometry that actually matters, not the one axis that happened to matter once.

### The gallery grid had exactly two rows and silently absorbed a third child
Adding the riding list as a third child of `.gallery` — `grid-template-rows: auto minmax(0,1fr)` —
stretched it to **162px** of mostly-empty panel. A grid does not complain about extra children, it
distributes them. Three rows now. Worth remembering because nothing errors and nothing overflows;
the layout just quietly gets worse.

### Verified after the correction
Driven in Chrome at **1440×900**, **1280×720** and an emulated **430×860 mobile/touch** viewport, on
both sheets. The standalone sheet's self-check is green at every size. Behaviour checked by driving
it rather than reading it: activating a Bells Taker lights exactly the Bells cards and nothing else;
adding a Bells Feeder leaves them at 1 because Taker and Feeder sit on **opposite branches**, so the
peak is the max and not the sum; a suitless Sidestep lights every playable card; the illegal card
stays dark and out of the reach counts; hover and focus reveal a card's breakdown with nothing
selected and clear on leave; the Timebomb's priming mode targets a card and the mark and the riding
list agree; taking the Timebomb back off clears the mark. The gallery's pre-existing behaviour was
re-checked again: tier filters (12 → 2), the phase toggle, the fence, two-tap poise/fire, stack
consumption and focus restoration. No page or horizontal scroll anywhere. Console clean on both.

### Buff loading is folded into the gallery, and it answers this file's own open question 3
**SUPERSEDED in part** by the CORRECTION above: this section describes a flow where the player
nominates a card and loads buffs onto it. There is no such step. What survives is the fold itself,
the collapsed-by-default readout, the stage clamp and the two CARRY notes.
`mockup-buff-gallery.html` now carries the loading design, so the full screen matches the specialist
sheet. The hand rests at half its hover lift, the chosen card gains the ring and the load badge,
and firing a buff **puts it on that card** instead of vanishing it.

That last part is the point. This file's own open question was *"how does a spent card leave? Nothing
animates the pile losing a card, and the card is gone before the trick it was bought for has
resolved — so the player sees it vanish, then sees the payout, with nothing joining the two."* Folded
in, the buff leaves the grid and lands somewhere the player can point at, count, and **take back
off**. The two ends of that gap are now joined by an object rather than by memory.

**Firing now needs a chosen card, and says so.** With no card selected the commit is refused with
*"Choose the card you mean to play first — a buff rides a trick, not a pile"* rather than silently
working. That is the same refusal discipline the fence already uses: a blocked action names its
reason.

**Deselecting does not discard the load.** A buff belongs to the trick, so it re-scores against
whatever you pick next — verified live: three buffs riding a Bells card drop from peak 2 to peak 1
when a Moons card is selected instead, and the Bells rows move to the struck-through group.

### Two deliberate differences from `mockup-buff-loading.html`, both forced by measurement

**1. The readout is collapsed by default here.** In the standalone sheet the whole screen was about
loading, so the panel could be as tall as it liked. Here the stage is **471px at 1280×720** and the
full panel is ~300px of it — it would bury the very grid you tap to load from. Collapsed it is
**105px**: the card's name and rule, both branch totals, and a one-line count. The bar itself is the
expand control, so it is one target rather than a separate chevron.

**2. It is clamped to the stage, not the shell.** This file has always said *"the game rail: nothing
here is ever covered by the gallery"*, and the readout is bound by the same rule. Asserted rather
than eyeballed at every viewport: the panel's left edge never crosses the rail's right edge.

**The rail was the obvious home and it does not fit.** Measured at 1280×720 the rail column already
overflows itself by **6px** before anything is added — the earlier "0px overflow" reading no longer
holds at that height. Putting a growing list in there would have made a real defect worse.

### The fold made the win/lose vocabulary collision visible, and the fix was row order
Under a group header reading **"If you take the trick"**, this file's card list produced rows reading
**"win a trick with Bells"** — the header states the *mechanical* axis and the row answers on the
*outcome* axis. That is precisely the confusion `CLAUDE.md` warns about, and the fold put the two
half an inch apart.

The fix was not to rewrite the card list, which is deliberately the older and wider one including cut
families. The header already supplies the branch, so the row now **leads with the buff's name** and
carries the printed condition as its second line. The collision disappears without touching data this
sheet exists to load-test. Note this is the **opposite** order to `mockup-buff-loading.html`, which
leads with the condition — there the names repeat (a Blade Taker and a Momentum Taker on one suit
share a condition exactly) and the wording is already mechanical.

### One panel above a card at a time
The armed card shows its rule in a tooltip, deliberately — touch has no hover, and arming is a
gesture the player is already making. The readout occupies exactly that space, so both appeared at
once and sat on top of each other. The readout wins and **adopts the rule as its header**, so nothing
is lost and touch still reaches it.

### CARRY — a token-derived offset does not clear a child of a padded container
The panel's `bottom` was `calc(-1 * var(--lift-armed) + .6rem)`, which is correct arithmetic about
the card and wrong about the box: it is positioned against `.hand`, whose height **includes its own
padding**, so "the armed lift plus a gap" landed partway up the card rather than above it. The
clearance is now measured (`handBox.bottom - card.top + 9`) and asserted at 9px. Derive from a token
when the token describes the same box; measure when it does not.

### CARRY — `min(30rem, 100%)` resolves against the parent, and `overflow:hidden` hides the damage
The panel is a child of `.hand`, which spans the whole shell, rail included — so `100%` was the
*shell's* width, not the stage's. At 430px the panel came out **30px wider than the stage** and ran
past the viewport edge. It did not report as a horizontal scroll, because the shell is
`overflow: hidden`: the overflow was **silently clipped**. A no-scroll assertion is not a
no-overflow assertion. The width is now capped against the stage's measured box before the panel is
positioned.

### Verified
Driven in Chrome at **1440×900**, **1280×720** and an emulated **430×860 mobile/touch** viewport. No
page scroll and no horizontal scroll at any of them; the panel inside the stage and clear of the card
by 9px at all three; the rail never covered. The gallery's existing behaviour was re-checked rather
than assumed: **tier filters** (gold narrows 12 → 2), the **phase toggle**, the **fence**, the
two-tap poise/fire, stack consumption and focus restoration all still work. Loading, removing and
re-scoring on reselect were driven end to end. `prefers-reduced-motion` was verified by forcing all
five media blocks through the CSSOM — the cell stops and becomes a continuous rail, and the badge and
glow are untouched, so all three carriers survive. Console clean.

### NEW REQUIREMENT — loading buffs onto the card you are about to play
**SUPERSEDED in part** by the CORRECTION above. The ring, the badge, the half-hover lift, the
bottom-up readout and the two-branch scoring all stand. The card-selection step it is built around
does not: a buff is activated for the trick, and every card it can fire on lights up.
`mockup-buff-loading.html`. The act of choosing which buffs ride a trick, and seeing what that is
worth before committing. It is not the gallery (which owns the pool and its filters) and not the card
face; it borrows both.

**The rules point it had to settle, because the brief and `CLAUDE.md` appear to contradict.** The
root `CLAUDE.md` says in bold that **no buff attaches to a card** — a buff is activated for a trick
and checked when that trick resolves. The sheet shows buffs loading *onto a card* anyway, and that is
a presentation of the existing rule rather than a change to it, because **the card you are about to
play IS the trick those buffs will be checked against**.

It is also a *better* presentation than a detached tray, and this is the argument for it: nine of the
thirteen live templates are suit-gated on the card you play — Taker is "took the trick playing S",
Feeder is "did not take it, playing S" — so a Bells Taker riding a Moons card is dead weight, and
nothing on screen says so today. Attaching the readout to the card is what makes that visible. The
sheet shows it as a struck-through row reading *"Needs Keys — this card is Bells. It cannot fire."*

**One consequence, and it is the thing to judge in the running app: deselecting a card does NOT
discard the load.** A buff belongs to the trick, not the card, so changing your mind about which card
to play re-scores the same load against the new card — a buff can go live → inert → live as you shop
the hand. That is the honest reading. The alternative, emptying the load on deselect, is simpler and
lies about what a buff is.

**Timebomb is the one genuine exception and it already had a design.** It primes a card and lands at
the *next* trick's resolution, so it really does attach — it renders as the bomb mark from
`mockup-primed-card.html`, not as a scoring row. Cheat attaches to nothing (it is a permission for
the trick), so it renders as a trick-level row that states it has no condition to meet.

### The readout scores the trick TWICE, and this was a correctness fix rather than a flourish
The first build summed every firing buff into one total. That is wrong, and it was wrong on the very
first realistic load: **Taker and Feeder on the same suit can never both fire** — you either take the
trick or you do not. A single total added both *and* inflated the Overlap Bonus, which is derived
from how many actually fire. It reported **+6 Damage** for a load whose real ceiling was **+4**.

So the trick is scored on both branches — *if you take it* / *if you do not* — and both are shown,
**neither highlighted**. That is not a new idea; it is the constraint `mockup-trick-readout.html`
already settled: the readout must never lean toward an outcome, because the ruleset withholds the
Quarry's card and a leaning readout would leak it. Sidestep sits in the do-not-take branch, being a
dodge.

The Overlap Bonus gets its own row immediately above the totals, because it is part of the sum and
because it is **the thing the ring's rising energy is actually drawing**. That matters: it makes the
glow a readout rather than a decoration.

### The lift is half the hover, and the ladder is derived rather than typed
Every hand card rests at `--lift-rest`, which is `calc(--lift-hover / 2)`, so the screen reads as
"the cards are the subject" the moment it opens and hover still has somewhere to go. Retune
`--lift-hover` and rest and armed follow: **rest −5 → hover −10 → armed −24**. Never set `--lift-rest`
independently of it, and the self-check asserts the ladder stays monotonic by **measuring the
resolved transform**, not by parsing the token (see the trap below).

### The ring: a red glow that gains energy, a white cell that gains speed
An SVG stroke, not a rotating conic-gradient. The stroke follows the card's real border radius,
`vector-effect:non-scaling-stroke` holds its weight at every card size, and `pathLength="1000"`
normalises the perimeter so one set of dash figures works on any card. A conic-gradient needs
`@property` to animate and repaints the whole box each frame.

**There is deliberately no `filter:blur()`.** The buff gallery proved a per-card filter stalls
Chrome's rasteriser badly enough to time out screenshots; the halo is four stacked wide, soft, low
-opacity strokes plus a box-shadow, which costs nothing. Carry that into `src/`.

**Both energy and speed count the LIVE buffs only** — the best branch's firing count. Counting every
loaded buff would make a card glow for a load that pays nothing on it, which is the exact lie this
screen exists to stop telling.

**The 0.9s lap-time floor is not a placeholder.** The slope is (`3.2 − 0.5 × n` seconds, energy
saturating at five), and the developer should retune it freely. The floor is a flash-safety limit: a
bright cell passing a given point more than ~3 times a second is a hazard, and at a 0.9s lap it
passes once. Do not lower it.

### Three carriers for one fact, because glow is colour and speed is motion
`game-ux` forbids either being the only signal, so the load count also appears as a **numeral badge**
with tally dots on the card's bottom-right corner (top-right is the bomb's, top-left is the corner
index). Ink on parchment, measured at 14.10:1. Under `prefers-reduced-motion` the cell stops dead and
becomes a **continuous rail** at full brightness — the state still reads, it just stops moving —
which was verified by forcing the media rule through the CSSOM rather than assumed.

**What the greyscale screenshot actually showed.** The badge and the "THIS TRICK" caption carry the
state fine. The ring's *energy* channel contributes nothing in greyscale — it is reinforcement for
colour-sighted players only, which is acceptable but should be said out loud. One thing did fail: the
two branch groups were separated by a green-grey rule and a purple-grey rule, identical in greyscale.
They now differ in **form** — solid vs dotted — and the group headers carry it in words regardless.

### The readout is pinned, not hovered, because it contains controls
It holds an × per row. A hover tooltip with buttons in it is unreachable on touch, which is worse
than hidden text, so the panel is pinned open whenever a card is selected. Its left edge is set from
the card's **measured** centre and clamped to the stage, with the pointer moved independently so it
still finds the card when the panel has been clamped — a percentage would drift the moment the hand
changed size.

Its bottom clears `--lift-armed`, derived: the selected card rises *into* this slot, so a panel
pinned to `bottom:0` lands on top of the very card it describes. That happened.

### Every row NAMES its buff, because two cards can share a condition exactly
A Blade Taker and a Momentum Taker on the same suit both read "Take the trick, playing Bells". Without
the name they render as one sentence printed twice, which looks like a bug and makes the two ×
buttons ambiguous. The bold line is what you must do; the small line is which card is asking.

### Tap costs
Loading a buff is **one tap** once a card is chosen; removing it is one tap on the × on that buff's
own row — confirmation on the object, never a trip to a distant button. Playing is **two taps on the
card** (choose, then confirm on the same object), with the Play button as the secondary
keyboard-friendly path. `game-ux` is explicit both ways: the button may not be the only route, and a
distant button may not be the confirmation.

The refusal when no card is chosen is stated **once**, in the rail's header. The first pass repeated
it on every row and reproduced the buff gallery's own "wall of noise" defect.

### CARRY — `display:block` on the card, or it has width and no height
`.pc` is a `<span>`, and an **inline box ignores `width`, `height` and `aspect-ratio` outright**. The
card rendered 2×17px inside a 107px-wide button, which on screen reads as "the cards vanished" rather
than as a sizing bug. `position:relative` and `overflow:hidden` do **not** blockify an inline box.

### CARRY — `border-top:none` is a shorthand and it resets width and colour
It sets style to `none` but also resets width to `medium` (3px) and colour to `currentColor`. A later
rule changing only `border-top-style` resurrects both: `.row.dead` became a **3px dashed chalk bar**
across the panel, reading as a broken divider. Reset the style alone, or redeclare the whole border.

### CARRY — a custom property holding a `calc()` cannot be read back with parseFloat
`getPropertyValue('--lift-rest')` returns the literal string `calc(-10px / 2)`, so `parseFloat` gives
`NaN` and the assertion silently fails. Read the **resolved** value off a real element — here
`new DOMMatrix(getComputedStyle(el).transform).m42`. Measure, do not parse.

### Fitting is not passing
The narrow layout put **475px of cards into a 475px strip**. It fitted, and it was one padding change
away from wrapping. The bound came down to 14vw for ~21px of spare, and the self-check now demands
headroom rather than mere fit. Touch targets are asserted the same way, against the **hit** area
rather than the painted box: the × is drawn at 18px on purpose — a bigger disc would shout louder
than the condition beside it — and carries a 44px pseudo-element hit area instead.

### OPEN — red is what was asked for, and red is already spoken for
`--wc-alarm` means damage and hurt across this UI, so a red halo on **your** empowered card fights a
meaning the player has already learned. Brass is the alternative and already means "yours, selected,
active" — the armed card's existing outline is brass. Both are wired; the dev bar flips them live.
This is a colour judgement and it is the developer's.


### The gallery card text was overflowing, and the fix was to cut a line rather than shrink one
The card was designed at the size `mockup-buff-metal.html` shows it and then dropped into a grid that
only affords about **86px** of width at 1440. Three things broke at that width, and only the two
`PRESS` cards broke visibly, which is why it was nearly missed:

- **The top row wrapped into the name.** Suit mark, roman numeral, cadence chip and count no longer
  fit on one line, so the row grew a second one and pushed `h3` down into itself. It is now
  `flex-wrap:nowrap` with `overflow:hidden`, the suit mark down from `.85-1.25rem` to `.68-1.1rem`,
  gap from `.2rem` to `.14rem`, and both chips `white-space:nowrap`. **`nowrap` is the guarantee, not
  the smaller sizes** - the sizes buy headroom, the nowrap is what makes the row's height a constant.
- **The payoff bar wrapped upward.** This is the real defect. A bar pinned to `bottom:6%` that gains a
  second line grows *into* the condition text, which means no percentage above it can ever be safe.
  Cheat's `1 trick of no follow-suit` was the only string long enough to do it. Fixed twice over: the
  bar is `white-space:nowrap` so its height is fixed, **and** the copy shortened to `1 trick free`.
- **The condition text had no floor.** `.cond` was `top:47%` with no `bottom`, so it ran wherever it
  liked. It is now `top:50%; bottom:30%; overflow:hidden` - 50% because a two-line name reaches 47%
  of an 86px card and 47% started the condition 2px inside it; 30% because the bar's top edge sits at
  73%. Both measured on the rendered card, not guessed.

**The tier WORD is cut in the gallery.** It was the line that had to go, and it is the right one to
lose: tier was already carried four times over - the metal frame, the roman numeral, the tinted face,
and the rank pips that `Tier survives greyscale` added. The numeral is the greyscale-safe carrier, so
the word is redundant here. It stays on `mockup-buff-metal.html`, where the card is shown at full
size and has the room. The rule is kept in the file as `.tierword-unused` so restoring it is one
selector rename rather than a re-derivation.

**`1 trick free` is copy, and copy is the developer's.** The string was shortened to stop the bar
wrapping; the shorter wording itself has not been approved by anyone.

### CARRY - a bar pinned to the bottom of a card must never wrap
Any absolutely-positioned element anchored to a card's bottom edge grows *upward* when its content
wraps, silently invalidating every `top`/`bottom` percentage above it. `white-space:nowrap` on it is
not styling - it is what makes the rest of the card's vertical layout computable. Expect this again
in `src/` the first time a buff's reward string gets longer, and expect it to show on one card out of
thirteen rather than on all of them.

### CARRY - a card component sized on its own sheet is not sized for its grid
The buff card was settled on a full-size specialist sheet and then broke three separate rules the
moment the gallery gave it ~86px. Per `game-ux`, a tile bound is chosen against **the container's
measured width**, not the viewport's - measure the track the grid actually hands out, then assert
overflow on every card in every state, because the longest string is the only one that fails.


### The reward bar carries the suit colour, and its text was measured not chosen
The payoff bar (`+1 damage`, `+3 coins`) now takes the target suit's colour, so suit is stated twice
on the card — by the mark at the top and by the payoff at the foot. Buffs with no target suit keep
the neutral ink bar, which also makes the suitless group visibly different at a glance.

**White text fails on all three suits.** Measured against WCAG AA's 4.5:1 floor for text this size:
white on Bells is 2.99:1, on Keys 3.37:1, on Moons 3.51:1 — all three fail, and the middle two would
scrape only the 3:1 *large-text* allowance which does not apply here. Each bar therefore takes a dark
per-suit ink, and all three pass: **Bells `#1d1004` 6.22:1, Keys `#06212e` 4.92:1, Moons `#1c1030`
5.14:1**. Verified again in the browser from the live computed styles, not just on paper.

The suit colours are placeholders; **the contrast floor is not**. If any suit colour is retuned, the
bar's text has to be re-measured rather than eyeballed — the whole point is that the failing option
was the one that looked obvious.

One tension worth naming: the bar is about the *reward*, and colouring it by suit conflates two
facts. It reads well now, but if a buff ever needs reward-*type* colour — damage vs coins vs
multiplier — this bar is the slot that would want it, and suit would have to move.

### The primed-card mark — a bomb, added rather than substituted
`mockup-primed-card.html`. Scope is the **mark** only: what a card looks like once a Timebomb is
primed onto it, not the arming flow.

**A cartoon bomb** — black body with a rim light and a specular, a short fuse, and a spark that
fizzes — sat **half over the card's top-right corner**, so it reads as an object *placed on* the card
rather than as part of its printing. The corner is also the one part of a card that stays visible if
the hand is ever overlapped or fanned.

**The governing distinction: a skull REPLACES the art, a Timebomb is ADDED.** A skull is what the
card *is* for that trick, so it takes the whole face. A Timebomb is a temporary thing the player did
to a card that is otherwise still itself, so the card keeps its rank, suit, name and art and simply
gains a mark. A primed Swan is still a Swan.

**The green ring stays, and this is not decoration.** `--wc-timebomb` also drives
`--wc-hp-ticking-fill`, the ticking hearts on the health bar, so green already means "a Timebomb is
involved" everywhere else in the UI. The bomb is the icon; the green is the system colour, and the
ring is the thread tying this card to damage the player can already see coming on the bar. Dropping
it would cut that thread.

**The fizz is one small loop** on a `steps()` timing so it flickers rather than glides, and it stops
dead under `prefers-reduced-motion` with the spark simply left lit — the mark still reads, it just
stops moving. It survives greyscale on shape alone: a black silhouette on a pale card.

Open, and worth judging at real scale: a card can be **both skulled and primed**, which puts two loud
marks on one small object (shown in the third close-up). And **the mark says nothing about tier** — a
gold Timebomb hits for 12/6 and a bronze for 4/2 — though the ruleset's note that priming a second
card overwrites the first's tier means a per-card figure could end up lying.

### The skull and the readout are folded into the gallery
`mockup-buff-gallery.html` now carries both, so the full screen matches the specialist sheets:

- **The Quarry's led card is skulled**, and renders the skull face instead of the Swan it would
  otherwise show. The skull lives in the shared symbol sheet as `#skull-fig` and is referenced by
  `<use>`, so there is exactly one skull in the document however many skulled cards are on screen.
  The corner keeps `1`, the Bells glyph and the name *Swan*; the accessible name reads
  "1 of Bells — Swan, skulled".
- **The readout sits in the LEFT RAIL, not under the trick well.** This follows from the decision the
  rail exists for: the gallery covers the middle of the felt, so a readout placed under the trick
  would vanish at the exact moment the player is choosing a buff — which is when knowing the
  consequence matters most. In the rail it is visible in both states.
- **"Their intent" is gone from the dossier**, which now holds three panels rather than four. The
  readout replaces it.

**Measured after the change:** the rail does **not** overflow (0px) despite gaining the readout —
removing the intent panel from the dossier and the rail's `space-evenly` distribution absorbed it.
The gallery still fits, and there is no page scroll.

The rail's readout uses the same measured light-ground inks as the standalone sheet — body
`#1b1710`, label `#5f5647`, costs-you `#96301f`, worth-having `#6f5412` — because it is the same
off-white slip on the same parchment.

### NEW REQUIREMENT — the skulled card, and a consequence readout replacing "Their intent"
`mockup-trick-readout.html`. Two changes to the middle of the felt, both new scope.

**A skulled card renders a skull instead of its character art.** One bone skull on one dark wash,
**identical on every rank and every suit** — a skull is a property of the trick, not a character, so a
player should recognise one across the table without reading it. The corner index keeps rank, suit
glyph and rank name, because the trick is still won on rank and suit. Today a skull is a small glyph
on an otherwise ordinary card; this makes it the whole face.

**Below the trick sits a readout of what their card does to you**, and it **replaces the "Their
intent" panel** in the left dossier. It has up to three rows: `IF YOU WIN`, `IF YOU LOSE`, and a
`RULE` row when the card constrains what you may legally play or changes how the trick is decided.

**It renders only when there is something to say.** A clean low card produces **no panel at all**,
and neither does the state before the Quarry has played. The readout sits under the trick on every
single hand, so a row reading "nothing extra" would be permanent furniture — and permanent furniture
teaches a player to stop looking, which is exactly what would make it useless on the hand where it
matters. The sheet shows those two empty cases explicitly so the restraint is visible; in the game
that space is simply felt.

**It is an off-white slip, matching the cards** — the same parchment gradient and printed hairline,
so it reads as part of the deck rather than a HUD panel bolted onto the table.

**Its text colours are measured, and the measurement changed them.** On a light ground **both project
accent tokens fail WCAG AA outright**: `--wc-alarm` `#d1705f` falls to **3.03:1** and `--wc-brass`
`#c99a4e` to **2.29:1**. Each is replaced by a darker member of its own family, so it still reads as
"the red one" and "the gold one" rather than as a new colour:

| role | colour | on `#f6f2e8` |
|---|---|---|
| body | `#1b1710` | 15.96:1 |
| label, small caps | `#5f5647` | 6.46:1 |
| **costs you** | `#96301f` | 6.86:1 |
| **worth having** | `#6f5412` | 6.36:1 |

Verified live from computed styles, not just on paper. The values are placeholders; **the 4.5:1 floor
is not** — re-measure if the parchment is retuned. This is the second time on this ticket that the
obvious colour was the failing one.

**It is deliberately quiet, and the first pass was not.** That version gave each branch a filled pill
— green for *if you win*, red for *if you lose* — which read as a traffic light under the trick. The
green was not even a project colour; it was invented for the sheet. Labels are now plain small-caps
in `--wc-chalk-dim` with no chip at all, and colour appears **only on the consequence itself**:
`--wc-alarm` when the outcome costs you, `--wc-brass` when it is worth having. Both are existing
tokens, and nothing else in the panel is tinted.

**It never predicts the outcome, and that is a rules constraint rather than a style choice.**
`the-hunt.md` states the game will not tell you whether you are about to win even where it could work
it out, because that would hand you the Quarry's exact card and section 9's telegraph withholds it
deliberately. So both branches are stated and neither is emphasised. The mockup carries five worked
examples, each following the rank's real rule:

- **skulled Swan** — *win*: you eat the skull, and their Swan lost, so Aoife leads next; *lose*: Aoife
  eats the skull and the Swan does nothing, because it was on the winning side.
- **skulled Treasure (7)** — the rank does nothing, so only the skull branches.
- **led Monarch** — a RULE row: you may play only your Swan of that suit or your highest of it.
- **lone Witch (9)** — a RULE row: their 9 counts as trump, unless you play a Witch too and the two
  cancel.
- **a clean 4** — "nothing extra", stated honestly rather than padded with a filler sentence.

**The gap this leaves, and it is a real one.** "Their intent" existed for the state where *you* lead:
their card is face down, and the ruleset says whether the trick carries a skull is not yet decided
then — which is exactly when a telegraph was worth having. Three options, none chosen: the readout
carries the telegraph in that state; it shows the same slanted `~` estimate the damage readout
already uses; or it collapses and says nothing. The mockup shows the third so the emptiness is
visible rather than theoretical.

**Also unresolved:** a skull stays with its card when the card changes hands (the Quarry's Fox can
exchange a skulled card into the decree, and your Fox can take it into hand). So a card in *your* hand
can be skulled and would render as a skull card. Worth confirming that is wanted.

### The utility-card decisions are folded into the gallery
`mockup-buff-gallery.html` now carries all four, so the picker and the util-card sheet agree:

- **A fifth run, "Press".** The grouping key is no longer the target suit alone — it is
  `suit ?? (cadence === 'PRESS' ? 'press' : 'null')`. Cheat, Timebomb and Ward leave the "No suit"
  bucket, which now holds only the passive suitless buffs like Sidestep. The Press tab is **solid
  where the other four are dashed**, because it names an action rather than the absence of a suit.
  Flip the mid-trick / between-tricks toggle to watch the run appear.
- **The `PRESS` pill is raised** — a chip with a lit top edge, against the flat tint every passive
  cadence gets.
- **The Timebomb's payoff bar is split**, green over alarm: `+4 them` / `2 you`. Its accessible name
  now reads the full sentence — *"4 damage to them, and 2 to you if it lands on your side"* — so the
  risk is not a purely visual fact.
- **A PRESS card's poised label reads "TAP AGAIN TO SPEND"**; every other card still reads
  "TAP AGAIN TO ACTIVATE". For these two the second tap consumes the card and `Escape` will not
  bring it back.

**Cost, measured and accepted.** The fifth tab is a sixteenth grid cell. Mid-trick — the common case,
and the one where the fenced group must stay visible — the grid still fits exactly, **0px overflow**
with the fence in view. Between tricks, with all fifteen cards live and five tabs, the grid runs
**68px** over and the gallery scrolls internally. That is scoped overflow inside one panel rather
than a page scroll, and the fence is empty in that state, so nothing the player needs is hidden. If
that 68px is judged unacceptable the fix is a slightly narrower card, which is a tuning value and
therefore the developer's.

### The two utility cards on the picker — `mockup-util-cards.html`
Cheat and Timebomb are the only `PRESS` cards in the game: the only two you *spend* rather than wait
on. **Scope here is the picker only** — how you find them and tell them apart — not what happens once
one is committed. A first draft covered the whole in-game flow (the Cheat's live duration, the
Timebomb's targeting of a hand card) and was cut as out of scope; that flow is a separate ticket.

- **Proposed: a fourth run, "Press".** They currently share the "No target suit" bucket with
  Sidestep, which fires on its own. Those are different *kinds* of card, and a player scanning for
  "what can I act on right now" has to read the cadence pill on every one. The tab is solid rather
  than dashed, because unlike the other three it names an **action**, not the absence of a suit.
- **The `PRESS` pill is raised** — a chip with a lit top edge. WIN, LOSE, DODGE, WHEN and HAND END all
  describe something that happens *to* you; PRESS is the only cadence that is a verb you perform.
- **The Timebomb's payoff bar is split, green over alarm.** Its reward as written is `+4 damage`,
  which is half the card: the same figure is **2 to you** if the hit lands on your side
  (`TIMEBOMB_DAMAGE`, 4/2 bronze, 8/4 silver, 12/6 gold). A single-value bar makes the card look
  strictly better than it is at the exact moment a player is deciding whether to take it. The Cheat
  needs no split — its only downside is expiring unused.
- **Tier means different things on the two cards**, and the face is the only place that can be read:
  a Cheat's tier is **duration** (1/2/3 tricks), a Timebomb's is **damage**.
- **Poised reads "TAP AGAIN TO SPEND"**, not "activate" — for these two the second tap consumes the
  card, and `the-hunt.md` is explicit that `Escape` works before it and never after.
- **Fenced is their normal home.** Both can only be pressed between tricks, so most times a player
  opens the picker they are in the fence. It is designed as a resting state, not an error state.

Open, and logged in the sheet: whether "Press" should be a run or a fourth chip on the tier filter
rail; and that priming a second Timebomb overwrites the first's tier, so two different-tier Timebombs
in the picker advertise figures that will not both be honoured.

### The settled buff card is folded into the gallery
`mockup-buff-gallery.html` now renders its buffs with the design from `mockup-buff-metal.html`:
off-white face, metallic tier frame, roman-numeral rank, bare suit glyph in the suit's own colour,
suit-coloured payoff bar with the contrast-derived inks, tarnished-metal unusable state, and the
hover sheen travelling the rim. The pile layers took the metal gradient too, and the tier filter
chips became little metal swatches. The old tier-field card is overridden rather than excised, in one
clearly-headed block at the end of the stylesheet.

**Suit HEADERS were tried and do not fit, and the measurement is the interesting part.** The panel
gives the grid **416px**. The dense twelve-card grid needs **348px** — two rows of eight. Four stacked
suit groups, each a header plus its own row, needed roughly **800px**, which overflowed by 692 and
pushed the fenced "not usable now" group below the fold. That is a real loss: the fence being visible
without scrolling is one of this screen's points.

So the suit label costs a **cell, not a row**. Each suit run opens with a `.suittab` — a
card-shaped, dashed, suit-tinted tile carrying the glyph, the suit name and the held count, sitting
in the flow of the same dense grid. Twelve cards plus four tabs is sixteen cells, exactly two rows of
eight, and the fence stays put. Verified: grid overflow **0px**, fence visible without scrolling, no
page scroll.

This matters beyond layout. The bare suit glyph on each card is only sufficient *because* something
marks where each run begins — that is the trade the metal sheet's design rests on. A header would
have done it; a tab does it for a fifth of the vertical cost.

`CLAUDE.md` names this sheet as the one place a cut buff may still appear, so its fifteen-card set
(including Glutton, Hoarder, Keepsake and the Purse rewards) is deliberately unchanged — it is a grid
load test. `mockup-buff-metal.html` shows the real thirteen.

### The rim sheen — light travels along the frame on hover
Hovering a buff card sweeps a skewed band of white along its metal frame. The trick is stacking
order rather than geometry: the sheen sits at `z-index: 0`, **above the metal background but below
the face at `z-index: 1`**, so the light only ever crosses the *rim*. The face masks the rest for
free — no clip path, no second element, no mask image.

It fires **once per hover, never on a loop**. Fifteen cards shining in rotation is a fairground, and
a permanent animation is a permanent claim on the compositor. Under `prefers-reduced-motion` the band
does not travel at all; the static specular brightens instead, so the hover still *reads* rather than
simply vanishing for those users.

Verified by `animationstart` / `animationend` firing on a real hover, and caught visually mid-sweep
by temporarily stretching the duration to 8s — the hovered gold card's left rim is white-hot while an
identical gold card beside it sits at rest. Duration, angle, width and brightness are placeholders.

### CORRECTION — the sheets were showing cut cards, and it skewed the suit rationale
`CLAUDE.md` gained a *Cut buffs are cut until a ticket brings them back* section mid-session, and
checking `src/hunt/buffTemplates.ts` against it showed the buff sheets were built on the wrong
catalogue. DLR-145 pared `TEMPLATE_FAMILIES` to **thirteen mintable templates** — Taker (3 suits ×
Blade/Momentum), Feeder (3 suits × Blade), Sidestep (Blade/Momentum), plus Cheat and Timebomb — and
`MintableConditionKind` / `MintableRewardAxis` make everything outside that set *unconstructible*,
not merely unweighted.

`mockup-buff-metal.html` now renders **all thirteen and nothing else**. Gone: Mark of the 9, Glutton,
Hoarder, Unbloodied, Keepsake and Cornered (cut families), and every coin reward (Purse is a cut
axis). Verified in the browser — zero cut names and zero coin rewards on the sheet.

**This changed the argument, not just the data.** An earlier sheet claimed "roughly half of a real
loadout has no suit", counted off the full `BuffKind` union — which includes the eight cut families.
In the live pool **nine of thirteen target a suit**, and only Sidestep, Cheat and Timebomb do not. So
suit is the *dominant* axis, and showing it clearly is worth considerably more than the earlier sheet
suggested. That is an argument for the design, arrived at by being wrong first.

`mockup-buff-gallery.html` deliberately keeps showing cut cards to load-test the grid, and
`CLAUDE.md` names it as an explicit exception — leave it alone.

### DECIDED — the suit mark is the bare glyph; the medallion is cut
Both were built and compared side by side, and the bare glyph won on the developer's call. The
medallion rendered its glyph at **11px inside a 17px disc** — not enough room left for a bell to look
like a bell. Bare, the mark renders at **20px, 90% larger**, at full stroke weight, in its own suit
colour: amber bell, blue key, purple moon.

The argument for the disc was that a solid block of colour carries further across a gallery. That
turned out not to matter here, because **the suit sections already do the long-range scanning** — the
group header tells you where Bells starts, so the card is free to be legible instead of loud.

`mockup-buff-metal.html` is now **only** this design: the medallion markup, its CSS and the
comparison section are all removed, and the file is retitled *Buff card — the design*. It supersedes
`mockup-buff-suit.html`'s four options, which are kept only as the record of how the constraint was
found. Three references to the medallion remain in the file on purpose, recording that it was tried
and cut so nobody re-proposes it.

### Option B refined — off-white face, metallic tier frame (`mockup-buff-metal.html`)
Taking option B forward: the card face goes **neutral off-white** and tier moves entirely into a
**metallic frame** — bronze, silver, gold. This does more than look better; it **dissolves the
28.7-unit Bells/Bronze collision outright**. With the face neutral, the suit medallion is the only
saturated element on the card, so suit reads first and tier reads as *material* rather than as a
competing hue. The two axes stop sharing a channel.

It also unifies the two decks: buff cards are now off-white with a printed hairline and a dark
reward bar, exactly like the playing cards, so a buff and a card of the hand read as objects from
the same game rather than two different ones.

Each metal is a **five-stop gradient**, not a tint — light roll, mid, dark core, specular return,
shadowed edge — with a bright streak across the top-left and a dark roll on the bottom-right, so the
frame has two lit faces. Hover brightens the streak as the card rises; poised adds a brass ring;
unusable **desaturates the metal**, so a dead card reads as tarnished rather than merely faint.

**Tier rank is a roman numeral — I, II, III.** It replaced a cluster of unlabelled dots that sat
beside the suit medallion; the developer pointed straight at them and asked what they were, which is
the whole answer. A numeral is a rank you can say out loud, it stays shape-distinct in greyscale, and
it costs less width than three pips did. This matters because a metallic gradient reads as
light-and-dark in greyscale rather than as bronze/silver/gold — the metal alone was never going to
carry tier, and the numeral is what makes it survive without colour.

**Each face is tinted to its own metal** — warm cream under bronze, cool paper-white under silver,
pale straw under gold. Held deliberately close to white: the moment a face becomes saturated it
starts competing with the suit medallion again, which is the exact problem this design exists to
avoid.

**Duplicates are a pile again**, and the idea earns more here than it did in the gallery — the layers
behind carry the *same metal gradient* as the frame, so three bronze reads as three bronze-edged
cards rather than as a drop shadow.

The honest cost of the neutral face is that a full gallery no longer scans as three colour blocks —
ordering has to do that work now, which is why the ordering toggle survives into this sheet. And the
tier **word** at the foot is now arguably a fourth carrier on top of numeral, metal and tint; it is
left in as the unambiguous fallback but it is the first thing worth cutting.

### CARRY — a `<button>` may only contain phrasing content
The first render of the metal card scrambled completely: text scattered across the frame with no
face behind it. Two causes at once. `.face` was a `<span>`, which ignores `width`/`height` until it
is `display:block`; and the card is a `<button>`, whose content model is *phrasing content only*, so
the `<h4>` and `<p>` inside were hoisted out of the button by the parser before CSS ever ran. Every
element inside an interactive card has to be a `span` promoted to block. This is the same family of
trap as the two already logged above — the third time in this folder that making a card interactive
broke its layout.

### Target suit is unreadable, and colour cannot fix it — four options in `mockup-buff-suit.html`
A buff's target suit is currently buried in the condition sentence ("win a trick with Bells"), so it
cannot be scanned. Fixing that ran straight into a hard constraint, measured rather than assumed:
**the card's field colour is already spent on tier, and Bells sits 28.7 RGB units from the Bronze
field — effectively the same amber.** Moons/Silver (92.2) and Keys/Silver (121.9) are better but not
comfortable. So suit has to be carried by **glyph, shape or position**, with colour only reinforcing
it. That constraint, not taste, is what generated the four options.

Also worth stating because it shapes every option: only three families target a suit at all —
`Taker`, `Feeder` and `Keepsake` (the ones whose condition substitutes `{suit}` in `buffLabels.ts`).
`MarkOfRank` targets a *rank*, and everything else targets nothing, so **roughly half of a real
loadout has no suit** and the design has to say so rather than leave a gap.

- **A — Suit spine.** Full-height colour bar down the left edge with glyph and suit word. Reads as
  stripes down a column. Costs ~1.05rem of card width, taken from the already-tight condition line.
- **B — Suit medallion.** A suit-coloured disc in the top row. Free, no layout cost, reads per card —
  but a grid of discs forms no pattern to scan past.
- **C — Suit is the field.** Body carries the suit; tier demotes to a top band plus the rank pips.
  Unmissable for suit, and the honest cost is that **tier stops being glanceable**.
- **D — Ordering only.** Card untouched, gallery grouped into labelled suit sections. Free and makes
  scanning trivial, but a card seen outside its section carries no suit signal at all.

Ordering is a **separate** decision and the sheet toggles it independently: *suit-then-tier*,
*tier-then-suit* (what the gallery does today), or unordered. Suit-first answers "what pays if I go
for Bells this hand"; tier-first answers "what is my best buff". The first is closer to the question
actually being asked mid-trick, but that is a call for the developer.

### Duplicates render as a physical pile, not an edge sliver
Holding more than one copy of a buff now draws offset card edges behind the top card — the same
idiom the spent pile already uses on the felt, so the two kinds of pile in this game read as the
same kind of object. **One copy renders as a plain card, unchanged**: a pile of one is a card. Depth
caps at two backs, because past three you cannot count a pile by eye anyway — that is what the `×N`
badge is for, and it stays. The offsets are scaled to the card: the felt's spent pile shifts 3/6px
on a ~52px card, so a 122px buff card takes 5.5/11px to read as the same object. A poised card
lifts its whole pile with it rather than peeling the top card off its own stack.

### CARRY — a `<button>` stops stretching the moment it is not a direct grid item
The first attempt at the pile rendered every duplicated buff as a solid brown block. The cause: the
buff card is a `<button>`, which is `inline-block` by default and had been stretching only because
it was a direct grid item. Wrapping it in a `.stack` broke that, it collapsed toward content width,
and the absolutely-positioned layers covered it. `display: block; width: 100%` has to be restated on
the card inside the wrapper rather than inherited from the grid. The same trap is one layer up in
this file already — the hand card's `.pick` wrapper — so expect it a third time in `src/`.

### Hand cards explain themselves on demand
Hovering a hand card raises a tooltip naming the rank and stating its rule, transcribed from
`the-hunt.md`. It also appears on `:focus-visible` **and while the card is armed** — the last one is
load-bearing. Touch has no hover, and the first of the two taps already lifts the card, so the card
explains itself inside a flow the player is already in: no extra gesture, and no rule that only
mouse users can read. That is what keeps this inside `game-ux`'s rule against putting anything a
decision needs behind hover. Inert ranks say "No effect" in the same place a real rule would appear,
because silence reads as a broken tooltip. `aria-describedby` carries the same text, so the a11y
tree exposes it too.

### Hand cards have hover, focus, armed and illegal states
Hover lifts −10px and deepens the shadow; `:focus-visible` does the same and adds a brass outline;
armed lifts −24px, gains a brass ring, and shows a **PLAY** tag naming what the next tap does;
illegal drops to 0.42 opacity with a dashed edge and ignores the pointer. Felt cards get
`cursor: default` and no states at all.

The hand is **one roving-tabindex widget**, not six tab stops. Arrow keys traverse it and skip the
illegal card — verified: arrowing right from *1 of Bells* lands on *7 of Bells*, stepping over the
illegal *2 of Bells*. `Escape` cancels an arm.

### CARRY — the interactive card is a button that WRAPS the card, not the card itself
Two bugs, both found only on screen. `.pc` sets `overflow: hidden` to clip its art window, which
clipped the PLAY tag away entirely. And `.pc::after` is *already* the card's printed inner rule, so
hanging the tag on the same pseudo-element silently deleted that rule on armed cards. The wrapper
gets its own box and its own `::after`; the card underneath keeps clipping its own art.

### The felt's game state moved into a left rail
`BuffLoadoutPanel` mounted `position: absolute; bottom: 0; left: 50%` at 26rem wide and 80% of the
felt's height, so opening it covered the decree/trump card, the spent pile and the card the Quarry
had just played. The decree, the live trick and the spent pile now live in a rail down the left of
the felt, and the gallery occupies the rest. Nothing overlaps: it is a structural guarantee, not a
z-index.

### Buffs are cards, grouped by tier, with duplicates collapsed
Tier is the card's whole field rather than a stripe, so the collection sorts by colour before a word
is read. Duplicates collapse into one card carrying `×N` and a physical stack edge — 23 held becomes
15 objects to scan. A tier filter rail on the left carries live counts.

### Every buff card states its cadence
`src/hunt/buffs.ts` already classifies every buff as `Event`, `Threshold`, `Terminal` or `Activated`
via `BUFF_CADENCE`, and **the UI never said so**. That is why 21 near-identical rows read as noise:
they looked like 21 buttons when only three of them are actually pressed. Each card now leads with a
cadence word — `WIN` / `LOSE` / `DODGE` / `EAT` / `WHEN` / `HAND END` / `PRESS` — which also makes
the old "Not between tricks" refusal honest, since it only ever applied to the `PRESS` cards.

### Unusable buffs are fenced, not scattered
They sort to the end, sit lower, and collapse into one dashed group carrying the count and the
single shared reason. The first attempt rendered all eight with their own repeated refusal line and
read as a wall of noise.

### Tier survives greyscale
The claim that every state reads without colour failed its own test: bronze and silver were nearly
identical in greyscale, because tier existed only as a hue and the tier *word* was only in the
filter rail. Every card now carries 1/2/3 rank pips beside the cadence badge.

### Firing a buff spends a copy
`×3 → ×2 → gone`, with the header and tier counts following, and keyboard focus preserved across the
re-render. This makes the collapsed-duplicate model real rather than decorative.

---

## DLR-149 — the card faces

### Two signals: a painting means a character, the border means it acts
Adding art to the Treasure broke the original one-signal rule, so it split cleanly in two. A
painting marks a card with a *character* — the five acting ranks plus the Treasure. The border says
whether it *acts*: solid for the five that do, dashed plus a "no rule" mark for the Treasure, which
is illustrated but inert.

### The Treasure is painted, and each suit gets a different treasure
Harp for Bells, chalice for Keys, sword for Moons — matching the reference sheet. It keeps the
dashed border and the "no rule" chip, on a translucent ground so it stays legible over the art.

### Rank 8 stays on pips, deliberately
Not because it is inert — the Treasure is inert and painted — but because it has **no settled name**,
so there is no character to paint. Name it and it should get a picture.

### The deck splits three ways here, not two
Per `the-hunt.md`, only five ranks act (1, 3, 5, 9, 11). The Treasure (7) and rank 8 are **named but
do nothing**, and every other even rank is a plain number. This differs from the printed game, where
the 7 scores. A named card that does nothing is the worst case for a player: it looks special, so
they hunt for a rule that is not there — hence the explicit "No effect" treatment.

### Pips follow a printed-deck lattice
A 3×7 grid with explicit placement per rank, and **the lower half rotated 180°** so the card reads
the same from either end. Most visible on the moon, which is not symmetric.

### The corner index is rank + glyph on one line, name beneath
It was rank / name / glyph stacked three rows deep, which pushed the suit glyph into the art window
and clipped it. Flattening it made the corner about a third shorter, so the art moved *up* rather
than down — it gained space. The mirrored bottom-right index appears only where nothing else is
printed there, matching the reference deck.

### Pip and art clearance is asserted, not eyeballed
Corner collisions were introduced twice. The mockup now measures every pip and every art window
against both corner indices across all 33 cards and reports zero overlaps. Rank 8 needed its own
inset because its corner carries a name line and is taller than a plain card's.

### The suit glyphs were elaborated
Bell gains a crown loop, a rim and a clapper; key gains an inner ring and a third ward; moon gains
craters. All stay stroke-based on purpose — they run from ~14px as a pip to ~28px in the corner, and
strokes hold at both ends where fills clog. **Note for the port:** the real `SuitMark.tsx`
deliberately sets no `stroke-width` so call sites choose weight in CSS. The mockup sets one only
because it has no such component — do not copy that part across.

### Figures are layered, not flat
Three tones per suit with gradient fills, rim light and a cast shadow, lit from behind in a
suit-tinted vignette, with sparks for Bells, snow for Keys and stars for Moons. They remain
**compositional placeholders**: they set pose, crop and how much of the face a painting gets. Real
art drops into the same window as an `<img>` with no layout change.

---

## OPEN — needs a decision before or during the build


1. **Does suit outrank tier when a player picks a buff?** That single answer decides whether option
   C is right or absurd, and it is a game-design question rather than a UI one. Note the metal-frame
   sheet largely sidesteps it — with a neutral face, neither axis has to lose.
2. **Silver reads weakest against an off-white face**, since both are pale; bronze and gold have
   more contrast. Worth checking at gallery scale before committing the palette.
3. **Should suitless buffs group first or last?** Last is assumed in the sheet.
4. **Should non-`PRESS` buffs be tappable at all?** They fire on their own, but today they poise and
   confirm like buttons. A rules call, not a UI one.
5. **Rank 8 has three competing names.** `the-hunt.md` logs the rename as open,
   `src/warCouncil/types.ts` calls it `Poison`, the doc calls it Timebomb — which collides with the
   Timebomb *buff*. The mockups label it "rank 8" rather than inventing a fourth.
6. **Do unusable buffs re-sort live mid-trick**, moving cards under the player's finger, or only at
   trick boundaries? Only the running app settles this.
7. **Does the decree card need a tooltip too?** It is live state rather than a record — the trump —
   so its ability arguably matters as much as a hand card's. Left out for now because plate cards are
   deliberately non-interactive, and making one focusable weakens that rule.


From `mockup-buff-loading.html`:

8. **Should deselecting a card empty its load?** The sheet keeps it and re-scores against whatever
   you pick next, because a buff belongs to the trick rather than the card. Emptying it is simpler
   and lies. Only the running app settles whether keeping it feels like a helpful memory or like a
   load you cannot get rid of.
9. **Red or brass for the load ring?** Red was asked for; red already means damage and hurt
   (`--wc-alarm`) everywhere else, and brass already means yours-and-selected. Both are wired
   behind the dev bar's toggle.
10. **Does the two-branch total read as clarity or as arithmetic homework?** It is correct — a
   single total overstates, because Taker and Feeder cannot both fire — but it puts four figures
   where the brief asked for two. If it is too much, the fix is to show only the branch the player
   is steering toward, and that leaks the Quarry's card, which is why it was not done.
11. **Cheat is usable mid-trick and everything else is not.** This screen currently shows the
   whole pile as loadable, which is the mockup's inverted fence again (see the CARRY in
   `buff-resolution-and-lifetimes.md` §2). Whether this is a between-tricks planning screen or a
   live tray is still question 1's twin, and it is a rules ticket.
---

## Placeholders — every one is the developer's

Tier colours (bronze `#a9713c`, silver `#9aa7ac`, gold `#d0a53f`) · the three card art palettes ·
parchment tones · card sizes and the buff-grid track width · `--art-top`, how much of the face the
art takes · pip scale · grain opacity · the −10px hover lift, the −24px armed lift, the 5.5/11px pile
offsets, and the 140ms transition · the 14px drop on fenced buff cards · tooltip width and its 120ms fade.

From `mockup-buff-loading.html`: the load-ring colours (`--load-red` `#ff3326`, `--load-brass`
`#ffc257`) and their deep pair · the halo's four stroke widths and opacities · the energy slope
(saturating at five firing conditions) and the lap-time slope (`3.2 − 0.5n` seconds) · the load
badge's size and its tally dots · the readout's 30rem width and its .75rem clearance over the armed
card · every figure in that sheet's PAY table · `--card-w` at 7.4vw wide and 14vw narrow.

Two figures in that sheet are **not** placeholders and must survive any retuning: the **4.5:1**
contrast floor, and the **0.9s** lap-time floor on the travelling cell, which is a flash-safety limit
rather than a taste call.

None of these has been chosen by anyone. They are written down so they are visible, not so they are
adopted.

---

## Verification status

Checked in Chrome at **1440×900**, **1280×720**, and **500×844** (Chrome will not size a window
narrower than 500, so a true 390px phone is still unchecked). No page scroll at any of them; the
buff gallery scrolls only inside its own panel. Two-tap poise/fire, tier filters, arrow-key
traversal, `Escape`, stack consumption and the tooltip states are all verified by scripted
assertion rather than by eye.

**Caveat — read this before trusting the visual claims.** Chrome's screenshot channel degraded part
way through the session and then failed outright: `Page.captureScreenshot` timed out at 120s
repeatedly, including on a single-element capture, so it was the tool and not the page. Everything
after the duplicate-pile fix — specifically the **scaled pile offsets (5.5/11px)** and the
**hover-plus-armed frame** — is verified by measured geometry, computed style and the accessibility
tree, but **has not been seen rendered by anyone**. The last frame actually observed was the pile at
the earlier 3/6px offsets, which was correct. Put eyes on both before planning.

**`mockup-buff-loading.html` was verified separately and more cleanly**, because the screenshot
channel behaved this session. Checked in Chrome at **1440×900**, **1280×720** and **500×844**, with
its self-check green at every one: no page scroll, no horizontal scroll, the hand fitting its strip
with measured headroom, every text/ground pair over 4.5:1, every touch target at or over 44px
measured against the *hit* area rather than the painted box, and the lift ladder monotonic. The
roving tabindex, arrow traversal, `Home`/`End`, `Escape` and the two-tap commit were driven and
observed, not read off the source. `prefers-reduced-motion` was verified by forcing the media rule
through the CSSOM — the cell stops and becomes a continuous rail, and the badge and glow survive. The
greyscale screenshot **was taken**, and it failed one thing, recorded above and fixed: the two branch
groups were separated only by hue.

A second measurement trap worth knowing, because it produced three wrong readings before it was
spotted: reading `getComputedStyle(...).transform` immediately after adding a class returns the
*pre-transition* value, not the target. Any assertion about a transformed state has to wait out the
transition and then a frame or two, or it silently reports the old number.
