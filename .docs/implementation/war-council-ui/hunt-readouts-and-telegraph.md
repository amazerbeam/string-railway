_Part of [War Council UI](README.md)._

DLR-53 turned the round screen into the **Hunt screen**: the same 13-trick felt, plus §4's
persistent readouts, the Quarry's telegraphed intent shown before every commit, and an end panel
that shows the scoring equation as arithmetic. Nothing here computes a rule — every number
originates in `src/hunt/config.ts` and reaches a component already derived by the engine.

> **DLR-67 retired the Demand from every readout on this screen.** The ledger's Demand cell, the end
> panel's Demand line, and its cleared/missed verdict are gone; the third ledger cell reads **Damage**
> where it read "Score"; and the end panel now states the equation **once per side**.

### The `hunt` prop is what makes "no hard-coded number" structural

`WarCouncilMountProps` carries a **required** `hunt: Hunt`. Since DLR-67 that is `{ quarry }` alone —
it was `{ quarry, demand }` at DLR-53 and `{ quarry, demand, loseCredits }` at DLR-63. `src/App.tsx`
builds it once at module scope from `SLICE_QUARRY_CHARACTER` and passes it down.

Required rather than optional remains deliberate: a required→required change breaks every
construction site at compile time rather than silently rendering `undefined`. That property earned
its keep on DLR-67, which narrowed the type — every construction site failed to compile, which is how
they were found rather than by grepping for them.

The pay-off is that **no component in this module ever sees a numeric literal standing in for a
multiplier, a band boundary, or a card value.** A multiplier always arrives as `band.multiplier` or
`huntDamage[side].standing`; the declare gate's worked example reads
`invertedCardValue(CardRank.Swan)` rather than a typed 11. That is checked by grep in the contract's
final verification, but the reason it holds is structural — there is no path by which a component
could invent one.

### The two persistent readouts

**`HuntLedger.tsx`** mounts as the last child of `RoundStatusBand`'s `<header className="wc-status">`,
beside the existing opponent plate and three-cell scoreboard — the Standing band is read off the
player's trick count, so the two belong in one glance. Since DLR-67 it renders **three** cells rather
than five: running Spoils, the Standing band, and the **Damage** they make. It takes two props
(`spoils`, `band`) and computes exactly one thing, the product `spoils * band.multiplier`.

**`WarCouncilRound.tsx` derives both sides once per render and reuses the record three ways** —
DLR-67 replaced DLR-53's separate `spoils` + `resolveStanding` calls with:

```ts
const huntDamage: Readonly<Record<PlayerSide, HuntDamage>> = {
  [PlayerSide.Player]: scoreHunt(ui.round, PlayerSide.Player),
  [PlayerSide.Cpu]: scoreHunt(ui.round, PlayerSide.Cpu),
}
```

The status band reads `huntDamage[PlayerSide.Player]`'s `spoils` and `band`; the end panel takes the
whole record; and `onComplete` reports each side's `damage`. **One derivation, three consumers**, so
the number the player reads and the number the mount reports cannot diverge.

Note what disappeared with it: the `?? HuntDeclaration.Win` fallback DLR-66 named at this call site is
now `declaredPath`'s job inside the engine, so the component names no declaration at all and cannot
drift from `spoils`' own reading of it.

Each `scoreHunt` reduces over at most 26 captured cards and scans a six-row table — bounded,
whole-collection rather than incremental, which is correct at these sizes. The derivation grew from
one `spoils` + one `resolveStanding` to two `scoreHunt` calls, which is the same bounded-work
argument. **No `useMemo`**, per the module's standing rule.

**One visible consequence, and DLR-68 made it asymmetric.** Because `band.multiplier` is fractional on
both tables (each carries a ×0.5 band), a rendered product can be a half-step — e.g. `6.5`. DLR-68
wired `roundDamage` into `scoreHunt`, so **the end panel's Damage is now a whole number** — but
`HuntLedger.tsx` computes its **own** `spoils * band.multiplier` for the mid-round preview and that
expression is still unrounded. The two readouts can therefore disagree by 0.5 for the same state.

That duplicated equation is a real defect and a known one: the fix is to pass the engine's
already-computed `damage` down rather than re-derive it in a component, which would make the ledger
rounded too and delete the divergence at source. DLR-68 left it deliberately — the duplicate sits in a
UI file its scope did not cover — and it is worth its own ticket. **Anything that parses either readout
must still not assume an integer**, since the mid-round one can be a half-step; a spec matching a
multiplier's `aria-label` with a bare `\d+` was corrected on DLR-67 for exactly this.

### The Standing track — the whole table as a profile (DLR-68)

`StandingTrack.tsx` replaced the ledger's single `Standing` cell in the roomy layout. The cell stated
*"Defeated ×3"*: where you are, and nothing about where you could go — so a player deciding whether to
take the next trick had to remember the table. The track shows all of it.

**The x-axis is trick count.** Each bracket is as wide as its trick span (`flex-grow: span`), so 0–3
is four positions wide and 7 is one — position on the track means something, which is what lets a
single marker say where you are. **Height is the multiplier**, scaled against the table's largest, so
the ramp through 4-5-6 and the cliff at 10 are *shapes* rather than six numerals to compare.

That encoding does double duty. `game-ux` requires state to read without colour alone, and this
sheet's standing rule forbids introducing a new colour token — height carrying the value satisfies
both, leaving the existing `--wc-brass` / `--wc-alarm` tokens to mark only the peak, the cliff, and
the current bracket. The current bracket takes a lifted fill **and** a solid brass rail, so it survives
a greyscale screenshot and a colour-vision difference.

**Each bracket is pipped once per trick it covers**, at the developer's request, because a flat bracket
otherwise loses real information: across 0–3 the multiplier is frozen at ×1 while card value climbs
0 → 12 → 24 → 36, and the bar alone cannot say which of those four tricks you are on. The current
trick's pip carries a full-height dashed rule and a brass foot.

> **The pips are nested inside their segment, not laid across the track as one row.** The segment row
> has five flex gaps where a 14-pip row would have thirteen; those do not divide the same width, so a
> track-wide row drifts out of register with the bracket edges — worst at the two ends, which is
> exactly where the pips were asked for. Nesting makes alignment exact whatever the gaps do. An earlier
> mockup also had a **separate needle element** marking the current trick; it was removed for the same
> misalignment reason, and because two markers for one position is one too many.

**All the geometry is in a pure helper.** `standingSegments(table, tricks)` returns each row's `span`,
`heightPct`, `isPeak`, `isCliff`, `isCurrent` and `currentPipIndex`; the component only maps that array
to markup and decides nothing. So the logic worth testing is unit-testable with no renderer, and the
component spec is left to assert what is genuinely presentational.

The helper **writes no multiplier and no band boundary of its own** — spans come from each row's own
trick range, heights from the multiplier ratio, peak and cliff from the table's own extremes. Retuning
`src/hunt/config.ts` redraws the track, *including at a different row count*. Every visual value lives
in CSS, including the `min-height` floor that keeps a ×0.5 bar visible, so none is invented in a `.ts`
file.

**Its error posture is deliberately the opposite of the engine's.** An out-of-range trick count yields
no current segment and renders with no marker, rather than throwing — this is a readout drawn on every
render, including before the first trick, and a throw would blank the screen. An **empty table** does
throw `RangeError`: `Math.max()` of nothing is `-Infinity`, and dividing by it yields a `NaN` height
that would collapse every bar with nothing logged anywhere. Both branches are asserted. Compare
`huntDamage`, which throws because it *commits damage*; this only displays.

**The narrow-viewport collapse is pure CSS, and that is the point.** `HuntLedger` renders the track
*and* the old compact cell together, and the existing `@media (max-width: 44rem), (max-height: 34rem)`
block shows exactly one — so there is no `matchMedia`, no resize listener, no effect, and nothing to
clean up. `display: none` also removes the hidden one from the accessibility tree. It collapses rather
than wrapping because that breakpoint's own comment already records `.wc-status` being over-full at
that width: below the floor the bar carries no more than it did before DLR-68, and the compact cell
still states the one decision-critical fact.

> **The two readouts take deliberately different accessible labels** — the track says `Standing track:
> <band>, multiplier <n>, at <k> tricks won`, the cell keeps `Standing band: <band>, multiplier <n>`.
> jsdom applies no CSS, so **both are in the accessibility tree during a component test**, and identical
> labels would make a `getByLabelText(/Standing band/)` query match twice and throw. A future
> contributor tidying away the "duplicate" readout needs to know the breakpoint is doing the choosing.

The track is a **readout, not a control** — nothing to focus, nothing to activate — so `game-ux`'s
roving-tabindex rule does not apply, and the absence of keyboard handling is deliberate rather than an
omission.

**What no Vitest test can prove about it:** that the status band does not scroll or crop. jsdom has no
layout engine. That check was performed in a browser at seven viewport sizes and is recorded in the
contract's `qa-viewports.md`; the six visual values (three fills, the `clamp()` bounds, the height, the
`min-height` floor, the pip opacity) and whether 44rem/34rem is the right place to collapse remain the
developer's judgement.

The player's Spoils is shown and the Quarry's is not: §4's visibility table makes "your running
Spoils" open and says nothing about theirs, so showing it would be an unasked-for reveal. The live
in-play product is an *addition* to the ticket's AC2 rather than a requirement of it — it is what
turns four separate readouts into one legible equation, and it is flagged in the contract as
something the developer may red-line.

**`QuarryDossier.tsx`** occupies a new `dossier` grid zone beside the felt, rendering the
character's name, its round-long rule-break sentence, and its public trick count. The sentence is
`quarryCharacterInfo(...)`'s `description` verbatim — the component **restates no rule of its own**,
because enforcement lives in `src/warCouncil/quarryRuleBreak.ts` and a UI paraphrase would be a
second source of truth for a rule. When `quarryCharacterInfo` returns `undefined` (that function's
documented contract for a character with no enforcement yet) the component returns `null` rather
than putting a rule on screen no code applies.

The character is read from `hunt.quarry.character`, not `ui.round.quarryCharacter`: the encounter's
identity belongs to the encounter, where §4 puts it, while the round state's copy is what the
*engine* enforces against. In the shipped slice both trace to the same `SLICE_QUARRY_CHARACTER`
constant, so they cannot drift.

### The telegraph has two readings, and never both at once

AC3 asks for the Quarry's next-trick intent "before the player commits, every trick". Because
`quarryIntent(state)` returns `null` unless it is currently the Quarry's turn, that splits the round
into two genuinely different cases — and the follow case is the one that shaped the design.

**When the Quarry leads**, the lead is *held uncommitted* so it can be read before it lands. This is
the reducer change described below. In the render before the commit, `currentTurn` is the Quarry and
`currentTrick` is empty, so `quarryIntent(ui.round)` returns the lead intent with no extra state at
all.

**When the Quarry follows**, a follow is a function of the lead and does not exist until a lead is
chosen. Telegraphing it *after* the player commits would make it a caption on a decision already
made — precisely the "die roll resolved after you commit" that §4's visibility table cites
telegraphing as existing to eliminate. So the telegraph runs against the card the player currently
has **armed** — the first of the existing two-tap arm-then-confirm interaction, which is a
selection, not a commitment. `intentPreview.ts`'s `previewQuarryIntent(round, card, fidelity?)`
plays the card into a throwaway state via the pure `playCard` and asks `quarryIntent` about the
result:

```ts
const speculative = ui.armed !== null
const intent: QuarryIntent | null =
  ui.armed !== null ? previewQuarryIntent(ui.round, ui.armed) : quarryIntent(ui.round)
```

`previewQuarryIntent` returns `null` — never throws — whenever there is no answer to give: an
illegal card, or a Fox or Woodcutter awaiting its `AbilityChoice` (`playCard` rejects those with
`MissingAbilityChoice`, so no hypothetical state exists until the ability prompt is answered), or a
resulting state where the player won and leads again. The telegraph is then *absent* rather than
wrong. Its own spec proves the two properties the render path depends on: the preview equals the
live `quarryIntent(playCard(...).state)` reading, and calling it twice leaves `round` unchanged
(snapshot equality against a `structuredClone`).

**The intent is derived on every render and never stored in reducer state.** `RoundUiState` gained
no field. A stored copy could only go stale against `ui.round`, and `quarryIntent` is documented
pure and safe to call any number of times including under StrictMode's double-invoke — so a derived
call is both simpler and more obviously correct.

`intentPreview.ts` deliberately sits in `src/app/warCouncil/` rather than in the lint-enforced pure
tree: "what would they do if I led this" is a UI-layer question composed from two engine calls, not
an engine rule. It is still React-free and DOM-free, runs in the cheap `node` Vitest project, and
its purity is a **review-enforced** check rather than a lint-enforced one — worth knowing before
adding an import to it.

**`IntentTelegraph.tsx`** renders suit and stance only, never the card, so §4's hidden-hand row is
never violated — and whether `stance` is present at all is `TELEGRAPH_FIDELITY`'s decision, not this
component's, so the component handles an absent stance without assuming it. The visible eyebrow and
line are both `aria-hidden` and the whole box carries one `aria-label` built by
`intentAccessibleName(intent, speculative)`, so a screen reader hears one coherent sentence rather
than two announced fragments. `role="status"` announces a changed intent without stealing focus from
the hand. The speculative reading is prefixed "If you lead that card: …", so the two modes never
sound identical to someone who cannot see the difference in the border.

### The reducer stops auto-committing the Quarry's lead

This is the one behaviour change, and it is what makes the lead telegraphable at all. Before
DLR-53, `roundReducer.ts` committed the Quarry's lead the instant it could — inside
`createRoundUiState` for trick 1, and inside `handleCarryOn` for every later trick. By the time
anything rendered, the card was already on the table and the telegraph had been overtaken by the
truth it was meant to preview.

Three changes, no shape change — `RoundUiState`, `RoundUiAction`, and `RoundUiActionKind` are
untouched:

- **`createRoundUiState` is now a pure restructuring of its argument**, with no `advanceCpu` call.
  As a lazy `useReducer` initialiser that React double-invokes under StrictMode, this makes it
  strictly *more* idempotent than it was.
- **`advanceCpu` split in two.** `advanceQuarryFollow` keeps the old body — it still needs
  `chooseCpuMove`'s chosen card to derive the resolved trick's reveal — and is called only from
  `commit`, in the same transition as the player's lead. `advanceQuarryLead` is new and commits
  through the engine's own `commitQuarryMove`, the commit half of the split DLR-52 introduced for
  exactly this; a lead never completes a trick, so there is no reveal to derive and no need to know
  which card was chosen. Both name the seat as `QUARRY_SIDE` rather than `PlayerSide.Cpu`. Both keep
  the empty-legal-set guard, because either path reaches `chooseCpuCard`, whose `lowestCard([])`
  would *throw* rather than return a rejection.
- **`handleCarryOn` no longer early-returns when `resolvedTrick === null`.** It clears a held reveal
  *and* commits a pending Quarry lead in one transition. That is what keeps the telegraph free of
  interaction cost: the Quarry's next lead is already readable beside the held reveal, so the tap
  that clears the reveal is the same tap that lets them lead. Only trick 1 has no prior reveal to
  fold onto, so it costs one extra tap; every other trick stays at three.

Its guard chain is load-bearing:

```ts
cleared.cpuFault !== null ||
cleared.prompt !== null ||
cleared.round.phase === RoundPhase.Complete ||
currentTurn(cleared.round) !== QUARRY_SIDE ||
cleared.round.currentTrick.length > 0
```

**`currentTrick.length > 0` is what keeps this to *leads* only.** A Quarry follow is committed
inside `commit`, and must never be reachable from here. And because `phase === Complete` is checked
before the turn check, `commitQuarryMove`'s own `RoundComplete` / `NotYourTurn` rejections are
structurally unreachable from this call site — `advanceQuarryLead` still handles them, as a guard
against a future engine change rather than a live path.

`TrickWell` gained a fourth branch for this state, between the resolved-trick branch and the
in-progress-trick branch: an empty trick row, "They are about to lead. Read their intent first.",
and a **"Let them lead"** button. It is a real `<button>` for the same reason the carry-on control
is — while the Quarry holds the turn every hand card is disabled, so it is the only thing a
keyboard-only player can reach. `handleHintClick` was lifted to the component body so both branches
share the one handler and its `event.stopPropagation()` guard against the felt's own `onClick`. The
felt's waiting class and `onClick` both now key off `ui.resolvedTrick || quarryToLead`, so a pending
lead behaves exactly like a held reveal.

### The end panel states the equation once per side

`RoundOverPanel.tsx` has been rewritten twice. DLR-53 replaced a `Record<PlayerSide, number>` points
tally with a single `huntScore: HuntScore` plus `demand` and `outcome`, rendering one equation and a
cleared/missed verdict. **DLR-67 rewrote it again**, and this is the contract's one *addition* rather
than a deletion: its prop is now `huntDamage: Readonly<Record<PlayerSide, HuntDamage>>`, and it
renders the same `.wc-equation` group **twice**, one per side, inside a `.wc-sides` row.

Each side's group is labelled for that side — `"You: Spoils times Standing equals Damage"`,
`"You Spoils: N"`, `"You Standing multiplier: times N"`, `"You Damage: N"`, and the mirror for
"Opponent" — followed by a `{tricks} tricks — {band}.` detail line. **Naming the side in every
`aria-label` is load-bearing**, not decoration: two structurally identical groups on one panel would
otherwise give a `getByLabelText` query two matches, and a screen-reader user two indistinguishable
readings.

The higher total carries a `wc-is-ahead` class rendering as a **heavier border** — form rather than
colour, so the distinction survives for a colour-blind player. A tie marks neither side.

The Demand paragraph and the verdict paragraph are gone. So is the asymmetry that justified them:
§1's equation is no longer one-sided, so showing both sides is now what the design claims rather than
more than it claims.

`WarCouncilRound.tsx` hands over the record it already derived, so the panel formats and decides
nothing — it computes not even the ahead comparison's inputs, only which of two given numbers is
larger.

`WarCouncilRoundResult` **was** changed this time: its `score` field became `damage`, built from the
same record. DLR-53 deliberately left the payload alone as speculative shape; DLR-67 changed it
because DLR-68's own acceptance criteria already named the field `damage`, so this adopted the epic's
vocabulary one ticket early rather than inventing a second one. That bet paid off — DLR-68 shipped with
`damage` as written, so no second rename was needed.

### Falsy numbers render, blanks do not

Both the ledger's product and the end panel's Damage render as a bare `{damage}` expression rather
than behind any truthiness gate — the classic React render hole, where `0 && …` renders nothing at
all.

**Since DLR-66 no shipped band reaches this state**: the retired single table's Greedy row was ×0, and
the lowest multiplier in either new table is ×0.5, so a `0` product now requires a Spoils of `0`. The
regression guard is kept and still meaningful — the render hole is a property of the JSX, not of the
table — but its spec had to **construct** a `multiplier: 0` band rather than look one up, since
`resolveStanding` no longer returns one. That is the honest form of the test: it asserts the component
renders a falsy number, without pretending the table still produces one.
