# The roll-over UI — how it works

Companion to [`roll-over-damage-model.md`](roll-over-damage-model.md), which owns the arithmetic and
the rules. **This file owns the surface**: what the player sees, in what order, on which screen, and
why each decision was taken. Where the two disagree, the model doc wins on numbers and this one wins
on presentation.

The working article is [`mockup.html`](mockup.html) in this folder — open it in a browser, it is
self-contained. The developer signed it off on 2026-08-27 ("the UI is perfect"), so what follows is
a **specification of approved behaviour**, not a set of options.

**Status of the numbers.** Every duration, size bound and colour in the mockup is a PLACEHOLDER and
is marked as one in the file. The behaviour below is settled; the values are not, and the mockup's
dev rail exists so they can be set by playing rather than by reading. Two that matter most:
`--beat`, currently 520ms, which paces the whole build-up; and how long the resolution screen holds
after a choice before returning to the table.

---

## 1. The shape of it: two screens, not one panel

The trick is **decided on the table** and **priced on a screen of its own**.

```
THE TABLE                                THE RESOLUTION SCREEN
felt, hand, action bar                   the trick, the ledger, the pot, the choice
  |                                        |
  | tap a card, tap it again               | apply  ->  pot dealt, both reset
  | it flies to the table                  | roll   ->  both stand, roll +1
  | the trick resolves, a winner is named  | (hurt) ->  onward, nothing to decide
  |------------------ hand off ----------->|
  |<------------------ return -------------|
```

The split is the load-bearing decision on this surface and it was made for three reasons:

1. **The table stops moving.** A readout that opens between the felt and the hand pushes both of
   them every time it changes size — and it changes size on a screen whose entire job is to make one
   number move. The build-up ends up competing with the layout it lives in.
2. **The decision gets the viewport.** Apply-or-roll fires up to six times a hand; the model doc
   calls that frequency "the main interaction-cost risk" in the whole change. A bet taken that often
   should not be two buttons in a strip shared with Buffs, Cards and Swap.
3. **Nothing competes with the cards on the table, and nothing competes with the number on the
   resolution screen.** `game-ux` says the cards take visual precedence and the UI serves them. That
   is true of the table, and it is the reason the arithmetic is not on it.

**It is a second full-viewport shell, not a modal over the felt.** A dialog centred on the table
leaves the felt visible round the edges, which reads as "you are still there" while every control on
it is dead.

**The cards come across.** The two played cards are cloned onto the resolution screen at the top,
above the ledger, so the number stays attached to the thing that earned it. Cloned, not moved — the
player is returning to that table in a moment, and a trick well that lost its cards while the screen
was up reads as a bug on the way back.

---

## 2. The table: playing a card

**Two taps, both on the card.** First tap arms it — the card rises clear of its neighbours, gains a
brass ring, and prints `PLAY` beneath itself. Second tap plays it. `game-ux`: confirmation belongs on
the object being acted on, never on a button across the screen.

**The hand is one widget, not six tab stops.** Roving tabindex, arrow keys to move, `Enter`/`Space`
to activate, `Escape` to disarm.

**Cards that cannot be played say so on their face** — dimmed with a dashed edge, and their
accessible name states why ("cannot be played, Bells was led"). They are not removed and they are
not silently inert.

**Every card a riding buff could fire on wears the count.** A numeral in a ring at the corner, plus a
glow. The numeral is the carrier; the glow only reinforces it, so the state survives a greyscale
screenshot. A buff belongs to the trick and not to a card, so the count is that card's own — you
look at the hand and see which of your cards are hot, which is exactly the decision you are making.

### The flight

The card **travels** from the hand to the table. It does not appear there.

- It is cloned into a fixed layer above everything, so it is never clipped by the hand's or the
  felt's overflow.
- It moves on an **arc**, lifting clear before it travels, which is what makes it read as *placed*
  rather than dragged through its neighbours.
- The gap it left in the hand **collapses after it lands**, never during, so the hand does not
  reflow under the player's finger mid-flight.

**The landing must not depend on `onfinish` alone.** This is a real defect that was found and fixed,
not a nicety. A background tab does not run animations — `currentTime` stays at 0, `onfinish` never
fires, and every step after it is dead: the trick never resolves and the hand stops responding for
the rest of the session. The landing is backed by a timer *and* a `visibilitychange` hook, and made
idempotent. **Anything in `src/` that awaits a Web Animations finish needs the same treatment.**

### Deciding the trick

The winner is named **before a single number moves**. The player should never watch damage accrue
while still unsure who won. The taking side gets a raised outline and the verdict prints in words
("You took it" / "Aoife took it") — form and language, so a greyscale screenshot still says who won.

Only then does the screen hand off.

---

## 3. The resolution screen: the build-up

One cluster, centred: the trick, the verdict, the readout. A header line at the top names the trick
and its outcome (`Trick 3 of 6 · banked`, or `· the streak is broken`); the choice sits at the
bottom.

> Those three blocks are **one grid child**, not three. They are read as one sentence — *you took it,
> here is what it is worth*. Split across three rows, a grid distributes them evenly down the screen,
> which is not composition.

### Each term lands on its own beat

The readout opens at **zero** and every term of the formula arrives one at a time, each one visibly
hitting the number. The formula, from the model doc:

```
trick damage = (baseDamage + buffDamage) × buffMult
```

A worked run — three Bell-Takers riding, a trick taken playing Bells, opening total 12 at roll 2:

| beat | term | damage | mult | the number |
|---|---|---|---|---|
| 1 | Base damage **+1** | 1 | ×1 | **1** |
| 2 | Bell-Taker (Blade) bronze **+1 DMG** | 2 | ×1 | **2** |
| 3 | Bell-Taker (Momentum) bronze **+2 MULT** | 2 | ×3 | **6** |
| 4 | Bell-Taker (Momentum) bronze **+2 MULT** | 2 | ×5 | **10** |
| 5 | **Overlap Bonus +2 MULT** (3 fired − 1) | 2 | ×7 | **14** |
| 6 | Banked — total 12→26, roll 2→3 | | | **pot 78** |

Three things about that sequence are deliberate:

- **A Momentum card never touches the damage number.** It moves the multiplier and the *product*
  recomputes. That is why the panel reads `DAMAGE × MULT = THIS TRICK` rather than showing one
  figure — the player can see which register each card moved.
- **The Overlap Bonus gets its own beat.** It is the game's only combo and it is currently invisible;
  `buff-resolution-and-lifetimes.md` calls it "the cheapest available moment of drama on this
  screen".
- **The plaque leaves the riding strip as its beat lands**, so the ledger is visibly fed by the
  strip rather than being a second list of the same thing.

### The impact

Per beat: the number scales and settles, a ring punches outward from it, the panel takes a small
knock, and the term that just landed is thrown up over the number and fades. The knock is small and
only on the beat, so it reads as force rather than as a broken layout.

Under `prefers-reduced-motion` the **beat still happens** — one term at a time is information, not
decoration, and removing the stagger would remove the derivation. What goes is the travel, the scale
and the ring; the impact becomes a colour-and-weight flash, which still marks which number moved.

### The ledger window — two rows, fixed

**The window is exactly two rows tall, always.** It does not grow with the sixth beat and it does
not collapse on the first.

- A panel that changes height mid-sequence drags everything around it up and down on every beat —
  motion the beat itself then has to compete with. Reserving the space costs one empty row on a bare
  trick and buys a readout that never moves. Measured across a full six-beat run: **80px, start to
  finish.**
- Above two rows it **scrolls**, and this is the file's only scrolling region. The reason is that the
  ledger is the one surface whose length the player controls — a trick can fire anywhere from one
  term to six — and the alternatives are shrinking the type past reading size or moving the layout.
- **It follows the beat.** The window is always parked on the newest term. Without this the third
  term onward lands below the fold and the sequence silently stops being a derivation: the number
  keeps jumping and the reason is off-screen.
- The top edge **fades** while the box overflows, so a scrolled-away row does not simply vanish.
- Row height is pinned to a token rather than left to content, so two rows is exactly two rows
  whatever a card is called.

> **The follow is an instant jump, and that must not be changed to smooth.** The first cut used
> `behavior:'smooth'`, which rides the same compositor as the card flight: measured over a full run,
> `scrollTop` never left 0 and every term after the second landed out of sight with no sign anything
> had happened. Smooth scrolling is an effect that can silently not run; an assignment cannot.
> Nothing is lost — the row already announces itself by sliding in from the left.

---

## 4. The choice

Both halves of the bet are on screen with what the model doc says the decision needs: the pot as it
stands, what it becomes if the next trick also banks, and the roll being wagered.

**Apply Damage** — solid-edged, states the pot in full. Deals it, resets total and roll to zero.

**Roll over** — dashed-edged (the same idiom the rest of this UI uses for *provisional*), carries the
new roll as a badge, and states the payout as a **floor**: `108+`, because the player may fire
nothing on the next trick. Directly beneath it, in the alarm colour: `0 if you do not`. Stating the
floor and the risk in the same control is what turns this from a nag into a bet.

The two are told apart by **shape and words first** — solid vs dashed, "dealt now" vs "if you take
trick 4". Colour only reinforces.

**Both exits hold before leaving.** Applying 78 damage and cutting straight back to the felt would
show the player the number they chose for zero frames, so the payout lands, the header changes to
name what happened ("Dealt to Aoife" / "Rolled over"), and only then does the screen return.

### The branch with no choice

A trick that hurts the player offers nothing to decide (model doc, AC 7). The screen still has
something to say — how much was lost — so it gets a **way out** rather than a decision: the pot
crosses to zero in the alarm colour, the ledger states the health taken and the pot lost with *no
two-thirds consolation*, and a single **Onward** button returns to the table.

---

## 5. What was verified, and where the limits are

Checked in Chrome against the running page, not asserted:

- **No page scroll** on either screen at 1440×900, 1280×720, 1024×640, 1024×600, 900×700, 800×700
  and 700×640.
- **Both branches run end to end** with correct arithmetic — banked gives 1 → 2 → 6 → 10 → 14, pot
  78, roll ×4; hurt takes a health, wipes the 24 pot and offers no prompt.
- **Ledger height constant** at 80px across all six beats, with the newest term always visible.
- **Greyscale screenshot taken.** Blade and Momentum are told apart by glyph and by the `DMG`/`MULT`
  words; the two prompt buttons by solid vs dashed edge; the winning side by outline and by the
  printed verdict.

**One residual, stated rather than hidden.** On the *table* screen, with the prompt open at 640px of
viewport height or less, the trick well overhangs the felt's lip by 7–55px. The measurement is
pessimistic — the test shrinks the shell while the `clamp()` bounds still read the full viewport, so
a genuinely small window fares better. At 600px of height this layout wants a structural change
rather than a tuning one, and that is the developer's call. The resolution screen has **zero**
overflow at every size tested.

**jsdom has no layout engine**, so none of the above is provable in Vitest. Layout claims belong to a
browser pass. What *is* testable and should be: focus movement and activation in the hand, `Escape`
to disarm, the ledger's two-row cap and its follow-to-newest behaviour, and that the flight lands
even when the animation never runs.

---

## 6. Carrying it into `src/`

Things in the mockup that exist because of a failure, and will fail the same way again if dropped:

| Carry | Why |
|---|---|
| `display:block` on the card face | It is a `<span>`; width does not apply to an inline box. Every hand card rendered 2px wide while the felt's `<div>` plates looked perfect. |
| Timer + `visibilitychange` backstop on any awaited animation | A hidden tab freezes WAAPI at time 0; the await never returns and the hand locks up permanently. |
| Instant ledger follow, never `scroll-behavior:smooth` | Same compositor, same silent failure — beats land out of sight. |
| No `filter:url()` and no `mix-blend-mode` on a card | Inherited from DLR-147: a per-card filter stalled Chrome's rasteriser hard enough to time out screenshots. |
| The numeral on a loaded card, not just the glow | The only carrier that survives greyscale and reduced motion. |
| Sizing the well in container units | A `vw` bound is blind to the viewport that breaks it, and `vh` prices the card against a height the stage does not have. |

The mockup's CSS is a draft of the real stylesheet rather than something to re-author. Its
`:root` block is copied from `src/app/warCouncil/warCouncil.css` and the additions are marked.

---

## 7. Still open

Both are the developer's, and both want playing rather than deciding:

1. **Does the screen change six times a hand wear out?** It may want to be quicker, or to skip
   itself on a bare trick where there is nothing to decide. This is the model doc's own open
   question about whether the prompt blocks, asked again about a whole screen.
2. **`--beat`.** Five impacts at 520ms is about three seconds per trick, six times a hand. It is the
   single number most worth setting from a play-through.

The model doc's own unresolved sections — the dominance of holding buffs back, and whether the roll
survives a hit — are **design** questions and are not affected by anything here.
