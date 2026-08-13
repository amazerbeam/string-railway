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

### `BankMeter` — the bank, the streak, and what it would cash for

Renders `bank`, `× multiplier`, and their product as the figure this streak would cash for, plus
`TRICK_OUTCOME_MESSAGE[lastResolution.outcome]` when a resolution is present — so the meter says
*what just happened* as well as where you stand.

**The product is computed here**, which is the one apparent exception to "components compute
nothing" and is deliberate: it is a **display** figure with no rule attached to it.
`resolveTrickBank` owns the cash-out that actually lands, and this number is a preview of what the
next hit would pay. If the two ever disagreed, the engine's is the one that matters.

The take/hit distinction is carried by **copy and a class name, never colour alone**.

> **Why the bank replaced the pending-damage segment on the health bars.** The old readout was
> non-monotonic — a total could *fall* when you won a trick, because winning could move you into a
> worse Standing band. **The bank only ever climbs** until it cashes, which is safe to show
> continuously. It is deliberately a *different number in a different place* rather than a reuse of
> the bars' pending machinery, which would have carried the old shape forward.

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

`handSummary`'s two figures are the **mount's own delta** against the encounter this hand started
from, computed in `WarCouncilRound.tsx` and never re-derived in the panel.

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
