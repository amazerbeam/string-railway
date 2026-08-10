_Part of [War Council UI](README.md)._

DLR-53 turned the round screen into the **Hunt screen**: the same 13-trick felt, plus §4's
persistent readouts, the Quarry's telegraphed intent shown before every commit, and an end panel
that shows `Spoils × Standing = Score` as arithmetic. Nothing here computes a rule — every number
originates in `src/hunt/config.ts` and reaches a component already derived by the engine.

### The `hunt` prop is what makes "no hard-coded number" structural

`WarCouncilMountProps` gained a **required** `hunt: Hunt` (`{ quarry: { character }, demand }` —
`src/hunt/types.ts`'s own name for the pairing). `src/App.tsx` builds it once at module scope from
`FIXED_DEMAND` and `SLICE_QUARRY_CHARACTER` and passes it down; `WarCouncilRound.tsx` reads
`hunt.demand` and `hunt.quarry.character` and hands them on.

Required rather than optional is deliberate: an optional Demand would let a caller render a Hunt
with nothing to clear and no verdict to reach. Being required also means every construction site
breaks at compile time rather than silently rendering `undefined` — which matters, because
`checkDemand` comparing a score against `undefined` would return "missed" for every Hunt with no
error anywhere. `FIXED_DEMAND` is typed `Demand` (a `number`) for the same reason: `null` is a
compile error, not a silent wrong verdict.

The pay-off is that **no component in this module ever sees a numeric literal standing in for a
multiplier, a band boundary, or a Demand.** A multiplier always arrives as `band.multiplier` or
`huntScore.standing`; a Demand always as `hunt.demand`. That is checked by grep in the contract's
final verification, but the reason it holds is structural — there is no path by which a component
could invent one.

### The two persistent readouts

**`HuntLedger.tsx`** mounts as the last child of `RoundStatusBand`'s `<header className="wc-status">`,
beside the existing opponent plate and three-cell scoreboard — the Standing band is read off the
player's trick count, so the two belong in one glance. It renders §1's equation in progress:
`Spoils × Standing = Score / Demand`. It computes exactly one thing, the product
`spoils * band.multiplier`; every input arrives already derived. `WarCouncilRound.tsx` derives
those inputs each render:

```ts
const runningSpoils = spoils(ui.round, PlayerSide.Player)
const band = resolveStanding(ui.round.tricksWon[PlayerSide.Player])
```

`spoils` reduces over at most 26 captured cards and `resolveStanding` scans a six-row table — both
bounded, both whole-collection rather than incremental, which is correct at these sizes. **No
`useMemo`**, per the module's standing rule.

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

### The end panel shows the arithmetic, not just the result

`RoundOverPanel.tsx` was rewritten in place. Its props changed *shape*, not just gained fields:
`score: Record<PlayerSide, number>` (from `scoreRound`) was replaced by `huntScore: HuntScore` (from
`scoreHunt`), plus `demand` and `outcome`. It renders, in order: a heading; a `role="group"` labelled
"Spoils times Standing equals Score" holding the three parts and their `×` / `=` operators, each
value carrying its own `aria-label`; a line naming the trick count, the band, and the Demand; the
verdict; and the trick tally with the unchanged "Finish the round" control.

`WarCouncilRound.tsx` computes both at the call site — `scoreHunt(ui.round, PlayerSide.Player)` and
`checkDemand(huntScore.score, hunt.demand)` — so the panel formats and decides nothing.

Two details worth knowing before editing it:

- **The opponent's *points* row was dropped, its trick count kept.** §1's equation is one-sided and
  the Quarry has no Demand to clear, so a two-side points tally would be stating something the
  design does not claim.
- **The panel's Demand label reads `Demand for this Hunt: N`, not `The Demand: N`.** `HuntLedger` is
  still mounted in the status band while the panel is on the felt, so identical accessible names
  would make a `getByLabelText` query ambiguous across the two components. Same fact, deliberately
  distinct wording.

`scoreRound` and `tricksToPoints` are **not** orphaned by this: `WarCouncilRound`'s `onComplete`
payload still uses `scoreRound(ui.round.tricksWon)`, because `WarCouncilRoundResult` was deliberately
left unchanged — putting the `HuntScore` and outcome in the completion payload would be speculative
shape for the run loop nobody has written yet.

### Falsy numbers render, blanks do not

A Greedy band (10+ tricks) has `multiplier: 0`, which makes both the ledger's product and the end
panel's Score `0`. Both render the value as a bare `{score}` / `{huntScore.score}` expression rather
than behind any truthiness gate — the classic React render hole, where `0 && …` renders nothing at
all. Both are covered by a spec that asserts the zero case explicitly.
