_Part of [War Council UI](README.md)._

The dossier column is the screen's persistent-readout slot: what the Quarry is, what it holds, what
your streak is worth, and what it is about to play. DLR-53 established it; **DLR-80 replaced two of
its three readouts.**

> **DLR-80 deleted the Hunt ledger, the Standing track, and the declare gate.** `HuntLedger.tsx`,
> `StandingTrack.tsx`, `standingSegments.ts` and `DeclareGate.tsx` are gone, along with
> `warCouncilStandingTrack.css` and `warCouncilDeclare.css`. In their slot sit two new components:
> **`QuarryShape`** (what the Quarry holds, per suit, with skulls) and **`BankMeter`** (the bank, the
> streak, and what the streak would cash for). The end panel no longer states a scoring equation,
> because there is no longer an equation to state — damage lands per trick as it happens.

Nothing here computes a rule. Every number originates in `src/hunt/config.ts` or is derived by the
engine and reaches a component already finished.

### The `hunt` prop is what makes "no hard-coded number" structural

`WarCouncilMountProps` carries a **required** `hunt: Hunt`, which is `{ quarry }`. `src/App.tsx`
builds it once at module scope from `SLICE_QUARRY_CHARACTER` and passes it down.

Required rather than optional is deliberate: a required→required change breaks every construction
site at compile time rather than silently rendering `undefined`. The property earned its keep twice —
on DLR-67, which narrowed the type, and again on DLR-80, whose reducer and mount reshape was caught
at compile time at every call site rather than by grep.

The pay-off is that **no component in this module ever sees a numeric literal standing in for a
tunable.** DLR-80 closed the last hole in that claim: `RoundStatusBand.tsx` had been clamping the
trick counter with a hard-coded `13`, and it now reads `HAND_SIZE`.

### `QuarryShape` — what the Quarry holds, never what it is

One row per suit: the suit mark, how many cards the Quarry holds in it, and **one skull glyph per
skulled card**.

Skulls are drawn as **repeated glyphs rather than a count**, so "two skulls in Bells" reads at a
glance without parsing a digit. The repetition is bounded — a suit can hold at most six cards — so
this cannot degrade.

**It computes nothing.** It renders the `readonly SuitShape[]` it is handed, which
`WarCouncilRound.tsx` derives by calling the engine's `suitShape(hand, skulledCards)`. The type
carries `{ suit, held, skulled }` and **no rank field at all**, so the never-reveal-a-rank rule is
enforced by the shape of the data rather than by the discipline of the component — see
[../war-council/skulls.md](../war-council/skulls.md).

A suit the Quarry has been stripped of renders as a **zero row** rather than being omitted, so the
row count is stable for the whole hand and an exhausted suit is legible as such.

**Accessibility.** Each row carries an `aria-label` built by `labels.ts`'s `suitShapeRowText` — the
single owner of that phrase, which `quarryShapeText` also builds its joined sentence from — and each
skull glyph is a `role="img"` carrying `SKULL_MARK_LABEL`. So the readout reads without colour and
without counting glyphs visually.

### `BankMeter` — the tricks, the multiplier, and what it would cash for

Renders `bank`, `× multiplier`, and their product as the figure this streak would cash for, plus
`TRICK_OUTCOME_MESSAGE[lastResolution.outcome]` when a resolution is present — so the meter says
*what just happened* as well as where you stand.

**The product is computed here**, which is the one apparent exception to "components compute
nothing" and is deliberate: it is a **display** figure with no rule attached to it.
`resolveTrickBank` owns the cash-out that actually lands, and this number is a preview of what the
next hit would pay. If the two ever disagreed, the engine's is the one that matters.

The take/hit distinction is carried by **copy and a class name, never colour alone**.

**PT-002 changed the words, not the layout.** The bank now counts tricks rather than card values, so
the left term is labelled **`TRICKS_LABEL`** (`'Tricks'`, renamed from `BANK_LABEL`/`'Bank'`) and the
right **`MULTIPLIER_LABEL`** (`'Multiplier'`, was `'Streak'`). The three spans, the `×` glyph and every
`.wc-bank-*` class name are byte-for-byte unchanged — the classes are string-bound to
`warCouncilHunt.css` and renaming them would buy nothing a player can see. All four
`TRICK_OUTCOME_MESSAGE` strings were rewritten in the same pass, because two of them said "Both cards
banked", which became false the moment cards stopped being what is banked.

**Two separate terms is a requirement, not an accident of the engine's shape.** They hold the same
number for the whole of a streak now, and collapsing the readout to one figure would foreclose the
planned one-time-use **"+1 ×"** item — which needs a term the shop can push independently of the
trick count.

**Accessibility — the region and the figures are named separately, and both from the constants.** The
figures paragraph carries `` `${TRICKS_LABEL} ${bank}, ${MULTIPLIER_LABEL} ${multiplier}, cashes for
${cash}` ``, and the wrapping `<section>` is named `` `${TRICKS_LABEL} and ${MULTIPLIER_LABEL}` ``.
That second one was a hardcoded `"Bank and streak"` literal until PT-002's review pass: every span
inside the section is `aria-hidden`, so the section's own label is the only accessible name it
carries, and it had survived the rename to sit directly around a paragraph reading "Tricks …
Multiplier …". `BankMeter.test.tsx` now pins it with `getByRole('region', { name: … })`, so it cannot
drift silently again.

> **Why the bank replaced the pending-damage segment on the health bars.** The old readout was
> non-monotonic — a total could *fall* when you won a trick, because winning could move you into a
> worse Standing band. **The bank only ever climbs** until it cashes, which is safe to show
> continuously. It is deliberately a *different number in a different place* rather than a reuse of
> the bars' pending machinery, which would have carried the old shape forward.

#### Pending buff bonus — the accrual folded into the figures before it is spent, 2026-08-25

`BankMeter` gained an optional `pendingBonus: CashOutBonus` prop, filled by
`WarCouncilRound.tsx`'s `payableCashOutBonus(ui.buffHand.accrual)`. Before this, a fired Momentum or
Blade buff's contribution was invisible on the felt: `buffAccrual.ts` tracked it correctly, but
nothing rendered it, so the reader only saw its effect the moment it was actually spent at a
cash-out. This is a **display-only** fix — the payout timing itself is unchanged: Momentum and Blade
are still only *spent* (`markCashOutPaid`) at a real cash-out, not the instant a buff fires.

**The pending bonus is folded into the SAME two numbers a live cash-out would use, not shown as a
third figure.** `shownMultiplier = multiplier + pendingBonus.multiplierBonus` (Momentum sits inside
the product, matching `resolveTrickBank`'s R3 step 2), and both `cash` and `forced` add
`pendingBonus.flatDamageBonus` on top (Blade lands after the product, matching R3 step 4 and, for
`forced`, after §7's two-thirds floor). A `+N` badge (`.wc-bank-pending-bonus`) sits beside the
multiplier figure itself, and a `.wc-bank-pending` line spells out both axes explicitly beneath the
two cash-out figures, shown only when at least one axis is non-zero (`hasPendingBonus`).

`pendingBonus` defaults to `{ multiplierBonus: 0, flatDamageBonus: 0 }` (a module-level
`NO_PENDING_BONUS` constant) when omitted, so every existing call site — and every existing test —
reads exactly as it did before this prop existed.

### The skull mark on a played card

`PlayingCard` takes a `skulled?: boolean` (defaulting to `false`) and, when true, renders a skull
glyph on the face. `TrickWell` passes it through by testing each played card against
`ui.round.skulledCards`.

The mark is a **form, not a colour**: a glyph plus an accessible name. `cardAccessibleName` takes the
same `skulled` flag and appends a suffix, so a skulled card announces itself rather than relying on a
sighted reading of the glyph.

The card face was re-laid in the same pass — the suit mark centred and enlarged, the rank moved to
the top-left, and the border taking the suit's colour through a `--wc-suit` custom property. **The
suit therefore reads twice**, as a symbol and as an edge, so it never depends on colour alone.

### The trick-resolution sentence names its own figure

**DLR-97** closed a "hard to tell if I did damage or took damage" playtest note by having
`TrickWell.tsx`'s resolution `<p className="wc-table-line">` read the two fields `bank.ts` already
computes onto `ResolvedTrick.resolution` — `cashOut` and `damageToPlayer` — and append a clause
naming whichever is non-zero: "They take N." when `cashOut > 0`, "You take N." when
`damageToPlayer > 0`. Neither field is new; this is a prop-read added to an existing sentence, not a
new derivation, so `roundReducer.ts` and `bank.ts` are untouched. Recognition over recall was the
`game-ux` heuristic: the health-bar break animation fires in the status band while the resolved
trick sits at the felt centre, so naming the figure at the point of resolution closes the gap
between the two zones without needing a new transient UI state.

### The telegraph has two readings, and never both at once

Unchanged by DLR-80. The Quarry's next-trick intent must be readable *before* the player commits,
and because `quarryIntent(state)` returns `null` unless it is currently the Quarry's turn, that
splits a hand into two genuinely different cases.

**When the Quarry leads**, the lead is *held uncommitted* so it can be read before it lands. In the
render before the commit, `currentTurn` is the Quarry and `currentTrick` is empty, so
`quarryIntent(ui.round)` returns the lead intent with no extra state at all.

**When the Quarry follows**, a follow is a function of the lead and does not exist until a lead is
chosen. Telegraphing it *after* the player commits would make it a caption on a decision already
made — precisely the "die roll resolved after you commit" that telegraphing exists to eliminate. So
the telegraph runs against the card the player currently has **armed** — the first of the two-tap
arm-then-confirm interaction, which is a selection rather than a commitment.
`intentPreview.ts`'s `previewQuarryIntent(round, card, fidelity?)` plays the card into a throwaway
state via the pure `playCard` and asks `quarryIntent` about the result.

The fidelity is read from `TELEGRAPH_FIDELITY`, never decided here.

### The hand-over panel states a tally, not an equation

`RoundOverPanel` renders this hand's own figures — tricks you took, tricks the Quarry took, health
lost, and health dealt to the Quarry — followed by either the terminal outcome or the single control
that deals the next hand.

`handSummary`'s two figures are a **delta against the encounter this hand started from**, computed in
`WarCouncilRound.tsx` and never re-derived in the panel.

**Both sides of that subtraction come from the reducer** — `ui.openingEncounter` frozen at mount
against `ui.encounter` live — and that is a correction, not an implementation detail. The baseline
used to be the mount's `encounter` **prop**, which is correct only while the prop is stable, and on
the one hand that matters it is not:

`handleCarryOn` calls `onComplete`; `src/App.tsx`'s `handleComplete` adopts that encounter with
`setEncounter` and then **returns early without changing `round`** — and `round` is the `key` on
`<WarCouncilRound>`. So on the encounter-ending hand the component is never remounted, the prop
becomes the live value underneath a terminal panel that is still on screen, and both deltas collapse
to zero. The figures were right when the panel appeared and **zeroed themselves on the player's next
click** — observed in play as a "The Hunt is over" panel reporting `Health lost 0` and `Dealt to the
Quarry 0` for a hand that had just emptied the Quarry's bar.

Freezing the baseline in reducer state makes the tally independent of anything the parent does after
the hand is over. It survives because every reducer return spreads the previous state, so a
write-once field carries forward untouched. `WarCouncilRound.duelHealthBars.test.tsx`'s
`keeps its figures after onComplete` pins it by rerendering with exactly the encounter `onComplete`
returned — the same move `App` makes — and asserting the figures do not move.

> **`encounter` (the prop) is now read in exactly one place: seeding the reducer.** That is the
> property worth preserving. Any future read of it during render re-opens this defect, because the
> prop is not stable for this component's whole life.

> **The two-stage close is gone.** The panel used to state `Spoils × Standing = Damage` per side and
> offer an *Apply the damage* control, then a second press to deal on. Damage now lands as each trick
> resolves, so there is nothing left to commit — the panel reports what already happened.

### Falsy numbers render, blanks do not

The bank, the streak and the cash figure all render as bare `{value}` expressions rather than behind
any truthiness gate — the classic React render hole, where `0 && …` renders nothing at all.

**Zero is a completely ordinary value here, unlike under the old scoring layer**: a fresh deal has a
bank of 0 and a streak of 0, and a hand that has just taken damage has both again. So this is no
longer an edge case guarded against defensively — it is the state the meter is in at the start of
every hand, and `BankMeter.test.ts` asserts it directly.
