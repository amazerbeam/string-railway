_Part of [War Council UI](README.md)._

The dossier column is the screen's persistent-readout slot: what the Quarry is, what it holds and
what your streak is worth. DLR-53 established it; **DLR-80 replaced two of its three readouts**, and
**DLR-148 deleted the third** — "what it is about to play" is no longer a thing this screen shows.

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

**Since DLR-155 one row can also be marked** as the suit the Quarry is about to lead, from an
optional `leadSuit` prop — see [The lead telegraph](#the-lead-telegraph--the-suit-the-quarry-is-about-to-lead-dlr-155)
below. It does not weaken "it computes nothing" or the no-rank guarantee: the marked row draws the
same tally as any other, and the suit is decided upstream.

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

#### Both halves of the Feeder carry — DLR-150, 2026-08-27

`BankMeter` gained two more display-only props, `carriedIn` and `carryOut`, both `BuffCarry` and both
defaulted to `EMPTY_BUFF_CARRY`. `WarCouncilRound.tsx` fills them straight off
`ui.buffHand.accrual.carriedIn` and `.carryOut`. They render as two conditional lines beneath the
pending-bonus line, `.wc-bank-carried-in` (**"Carried in from last hand"**) and `.wc-bank-carry-out`
(**"Banking for next hand"**), each shown only when one of its two axes is non-zero, and both are
folded into the section's existing `aria-label` rather than added as new landmarks — so the readout
still carries one accessible name, not four.

**Both halves are on screen because the whole effect is a promise made in one hand and redeemed in
the next**, and an invisible promise is not one. The carry is *earned* in a hand that is going badly
and *spent* in the hand after it; a reader who only ever saw the second half would experience an
opening bonus with no cause.

**Neither line is folded into `cash`, `forced` or `shownMultiplier`, and that asymmetry with
`pendingBonus` is the point.** A pending bonus *is* payable at the next cash-out, so folding it into
the two cash-out figures is telling the truth. The carry pays **nothing** in the hand that earns it,
so folding `carryOut` in would be this component inventing a payout. `carriedIn` is likewise not
added on top: it was already seeded into `multiplierBonus`/`flatDamageBonus` by `startHandAccrual`,
so it is *already* inside the figures — the line names where it came from, and adding it again would
double-count it.

**`carriedIn` is deliberately persistent rather than a hand-start flourish.** It reads
`accrual.carriedIn`, which does not move for the hand's whole life, so a player who looks up at trick
4 still sees what their opening bonus was. AC6's wording ("an opening figure at the top of the next
hand") is satisfied either way; **whether it should instead be a one-off flourish is pacing
judgement and the developer's**, as is every colour, glyph, border weight and word in both lines —
all placeholder. The mechanic itself is [hunt/the-feeder-carry.md](../hunt/the-feeder-carry.md).

> **The `.wc-bank*` rules moved house in the same ticket.** They now live in
> `warCouncilBankMeter.css`, imported by `WarCouncilRound.tsx` alongside the others, because
> `warCouncilHunt.css` had reached its 400-line budget. No selector was renamed and no rule changed.

### The skull mark on a played card

> **DLR-148 changed what this looks like, and nothing else about it.** A skulled card now renders a
> **full skull face in place of the card art**, identical for every rank and suit, with the corner
> index — rank, suit glyph, rank name — intact, because the trick is still won on those. The small
> corner `☠` described below is gone, as is `.wc-skull-mark`. The prop, the pass-through and the
> accessible name are untouched. See
> [The felt rail, the trick readout, and the skull face](felt-rail-and-the-trick-readout.md).

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

### The telegraph had two readings, and never both at once — deleted DLR-148

> **Everything in this section describes deleted code, kept as the record of why the surface
> existed and what replaced it.** On 2026-08-26 DLR-148 deleted `IntentTelegraph.tsx`,
> `intentPreview.ts`, `previewQuarryIntent`, `intentAccessibleName` and `STANCE_PHRASE`, and both
> readings went with them — the live one *and* the speculative "If you lead that" preview. The
> [consequence readout](felt-rail-and-the-trick-readout.md) is the single surface that says what a
> trick will do now, and it speaks only about the card the Quarry has **already** led, never about
> an unplayed one. The state where the player leads deliberately says nothing at all.
>
> **`quarryIntent` itself survives in `src/warCouncil/`, with no production consumer**, as do
> `TelegraphFidelity` and `TELEGRAPH_FIDELITY` in `src/hunt/config.ts` and
> `src/warCouncil/__tests__/quarryIntent.test.ts`. That is a recorded decision — removing engine
> surface is a larger cut than a UI ticket's scope — not a live feature. **No screen reads it.**
>
> > **The last sentence stopped being true on DLR-155.** `quarryIntent` has a production consumer
> > again — `telegraphedLeadSuit`, which the holds panel uses to mark the suit the Quarry is about
> > to lead (see [The lead telegraph](#the-lead-telegraph--the-suit-the-quarry-is-about-to-lead-dlr-155)
> > below). Everything else above still holds: the felt telegraph and its speculative half are gone
> > and did not come back, `stance` still has no reader, and `TelegraphFidelity` /
> > `TELEGRAPH_FIDELITY` now live in `src/hunt/telegraphConfig.ts` rather than `config.ts`, which
> > re-exports them.
>
> One thing below outlived the deletion: **the Quarry's lead is still held uncommitted** on trick 1,
> because the commit is folded onto the carry-on tap on every later trick and trick 1 has no prior
> reveal to fold onto. `TrickWell`'s copy for that window lost its pointer at the telegraph — it read
> "They are about to lead. Read their intent first." and now reads "They are about to lead."

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

The fidelity was read from `TELEGRAPH_FIDELITY`, never decided here. That constant still exists, in
`src/hunt/telegraphConfig.ts` since DLR-155, and `quarryIntent` still defaults its `fidelity`
parameter from it — but **no UI reads it, and no UI shows anything it governs**: the lead telegraph
below takes `.suit` and discards `.stance` outright rather than consulting the dial, so the dial is
set wider (`SuitAndStance`) than anything actually drawn.

### The lead telegraph — the suit the Quarry is about to lead (DLR-155)

The felt telegraph did not come back. What came back is **much narrower and lives somewhere else**:
`QuarryShape`, the panel that already says what the Quarry holds, marks the row for the suit it is
about to **lead** with.

**Why it exists at all.** Almost every mintable buff is suit-scoped — Taker and Feeder are three
suits each — so when the player is not leading, the whole activation decision hinges on a fact the
screen did not show. The engine had computed that fact since DLR-52 and nothing had ever asked it.
This is the surface, not new engine work.

#### `telegraphedLeadSuit` — the whole rule, in one pure function

`quarryTelegraph.ts` exports `telegraphedLeadSuit(state, quarryToLead): Suit | null`. It returns
`null` when `QUARRY_LEAD_TELEGRAPH_ENABLED` is off, `null` when `quarryToLead` is false, and
otherwise `quarryIntent(state)?.suit ?? null`.

**It is a module rather than four lines in `WarCouncilRound.tsx` for three separate reasons**, and
all three are worth keeping: that file was at 397 of its 400-line budget; a three-condition gate with
a configuration flag in it is a testable invariant, and this project pushes those out of `.tsx` so
they can be asserted with no renderer; and it puts the single `quarryIntent()` call behind one named
door. That last one is the live risk — `quarryIntent` runs `chooseCpuCard` on every call, so the call
sits deliberately **outside** `QuarryShape`'s own row loop, once per round render, never per tile.

**`quarryToLead` is passed in, not re-derived.** `WarCouncilRound.tsx` already computes "the Quarry
has chosen its lead but has not committed it", and that boolean is *strictly stronger* than what the
telegraph needs: it additionally excludes a held reveal, an open ability prompt, an engine fault and
a finished round — every state in which a mark would be noise. A second copy of that condition here
is exactly the drift this codebase avoids elsewhere.

**`stance` is read and discarded by construction**, not by discipline — the function names `.suit`
and there is no path by which a stance could reach a caller. Nor can a rank: `QuarryIntent` carries
none, and neither does `SuitShape`.

No `useMemo` wraps the call. There is no profiling evidence, and this project treats speculative
memoisation as its own cost. `quarryIntent` is pure and safe under StrictMode's double-invoke by its
own docblock, and `chooseCpuCard` reaches no `Math.random`, so a second invoke returns the identical
suit — which is what lets the spec assert stability directly.

#### What the row renders

`QuarryShape` takes an **optional** `leadSuit?: Suit | null` — optional for the same reason
`cardAccessibleName`'s `marks` is, so every existing render site kept compiling and an un-telegraphed
panel stays a real state. Per row it computes `marked = row.suit === leadSuit`, three string
comparisons per render, and when marked adds `wc-shape-row-lead`, sets `tabIndex={0}`, and renders
two extra children.

**The component still computes nothing.** It is handed a suit and compares it to each row's own; it
does not know what a telegraph is.

**The sentence exists twice on purpose, from one owner.** `labels.ts`'s `quarryLeadTelegraphText(suit)`
builds `` `The Quarry will lead with ${SUIT_NAME[suit]}` `` and is called for both a `.wc-sr-only`
span (real text, so a screen reader gets it — not an `aria-label` on a group of `aria-hidden`
children, which Chrome prunes) and an `aria-hidden` `.wc-shape-tip` bubble. Two channels, one
builder, so they cannot drift into two copies of one phrase — the exact defect DLR-80 found between
`quarryShapeText` and this component. The visible bubble being `aria-hidden` is what stops the
sentence being announced twice.

**Only the marked row is a tab stop.** `tabIndex` is set when marked and omitted otherwise, so a
readout with nothing to say adds no tab stops; one appears when the Quarry is to lead and vanishes
when it leads. Three permanent stops on a pure readout was judged worse.

#### The treatment is CSS only

No React state, no hook, no effect — and therefore nothing to clean up and nothing that can be left
stuck open by a second mount. The `useCardTip` hook was considered and rejected: it exists to
position a bubble against a specific card's *measured* anchor, and this bubble anchors to a fixed
panel row, so it would have bought nothing and cost a second state owner.

`.wc-shape-row-lead` tints the row and rings it; `.wc-shape-row-lead .wc-shape-card` **enlarges** the
tile and adds a ring plus an outer glow in `--wc-alarm`. **The size change is the point, not
decoration** — this panel already spends hue on suit identity, so a second categorical axis cannot
also be a field colour, and growing the tiles keeps the mark legible in greyscale. It is also
deliberately unlike the buff-ride lighting on the player's own hand: this **grows** where a hand card
**lifts**, and takes alarm red where the hand takes brass and green.

The bubble is revealed by `:hover` inside `@media (hover: hover)` and by `:focus-visible` on the row,
with a `prefers-reduced-motion` override killing the transition. **Nothing a decision needs is
hover-only** — the glow and the enlarged tiles are always visible, and the tooltip only *names in
words* what the mark already shows.

> **The last row's bubble opens upward, and that is a fix rather than a flourish.** `.wc-dossier`
> carries `overflow: hidden` (guarding against a long rule-break sentence widening the grid past the
> viewport), so a tooltip hanging below the **bottommost** suit row had nowhere to go and would have
> been clipped — silently, since jsdom has no layout engine and every test would still have passed.
> `.wc-shape-row-lead:last-child .wc-shape-tip` flips it to `bottom: calc(100% + 0.3rem)`.
> Keyed to `:last-child` rather than to Moons, so it survives a change to `ALL_SUITS`' order.
> `__tests__/quarryShapeCss.test.ts` pins both the flip and the fact that `.wc-dossier`'s
> `overflow: hidden` is still there, so a later "fix" cannot quietly remove the guard instead.

**Every visual value here — tile size, ring width, glow radius, colour — is transcribed from the
approved mockup and is the developer's to retune.** Whether the mark reads at a glance, and whether
it competes with the hand's own lighting, are questions only playing answers.

### The hand-over panel states a tally, not an equation

`RoundOverPanel` renders this hand's own figures — tricks you took, tricks the Quarry took, health
lost, and health dealt to the Quarry — followed by either the terminal outcome or the single control
that deals the next hand.

`handSummary`'s two figures are a **delta against the encounter this hand started from**, computed by
`handSummaryFor(ui)` in **`roundHandSummary.ts`** and never re-derived in the panel.

> **It moved out of `WarCouncilRound.tsx` on DLR-155, unchanged.** That ticket's own two-line
> addition tipped the file to 402 lines against a 400-line blocking budget, so this derivation — the
> largest self-contained block with nothing to do with the telegraph — was lifted into its own module
> with its reasoning carried across verbatim, and the budget breach fixed inside the ticket that
> caused it. Same fields, same logic, same `RoundUiState` input; `WarCouncilRound.duelHealthBars.test.tsx`
> was re-run against the move. A reader looking for this code in `WarCouncilRound.tsx` will not find
> it there.

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
