Part of [War Council UI](README.md).

DLR-148 re-homed the felt's game state so the buff gallery cannot occlude it, added a **consequence
readout** that says what the card the Quarry just led will do to the player either way, gave a
skulled card a **skull face** in place of a corner glyph, and **deleted the intent telegraph
outright**.

## The felt is a grid of two columns now, and that is what AC1 actually is

`.wc-table` was `grid-template-columns: 1fr auto 1fr` — two spacer columns keeping the trick centred
— with `BuffLoadoutPanel` **absolutely positioned over the middle** at `bottom: 0; left: 50%`. It is
now:

```
grid-template-columns: var(--wc-rail-w) minmax(0, 1fr)     /*  game rail | stage  */
```

`FeltRail.tsx` is the left column and is **always mounted**: decree pile, the trick, the consequence
readout, the spent pile. `FeltStage.tsx` is the right column and holds either the gallery or the
felt's own narrative states. "Opening the buff surface never occludes the decree, the spent pile, or
the Quarry's played card" is therefore a **structural guarantee, not a z-index promise** — nothing
the stage renders can cover a sibling grid column. That is the whole point of doing it as a grid
change: a stacking promise is a thing to re-verify at every viewport, and a column is not.

> **`.wc-felt-rail` had no CSS rule at all before this ticket.** A comment in `warCouncilTable.css`
> said its rules "MOVE to `.wc-felt-rail`, declared in `warCouncilCheats.css`" — and
> `warCouncilCheats.css` had been deleted with the felt-rail plates. The class had been on a `<div>`
> in `WarCouncilRound.tsx` styling nothing since. A pre-existing string-bound defect of exactly the
> kind this module's invariants warn about; the re-home gives it real rules in
> `warCouncilFeltRail.css` and corrects the stale comment.

**The gallery and the felt's other states can never contend**, and that is checked rather than
asserted. The stage renders the gallery only when `loadoutOpen(ui) && loadoutDoorOpen(ui)`, and
`loadoutDoorOpen` is `discardWindowOpen || canAct` — false on every one of the four states the
gallery must not fight with (a held reveal, an open prompt, an engine fault, a complete round).
Reading `loadoutOpen` alone would not be enough: the panel's own toggle state deliberately survives
a trick resolving under it, so the drawer **remembers it was open** and pops back when the door
reopens between tricks, without a second tap. Only `CancelLoadout` closes it outright.
`__tests__/WarCouncilRound.loadoutReopen.test.tsx` pins that sequence.

> **DLR-174 put that two-term expression behind one name, and added a third contender to the stage.**
> The stage is now a three-way choice made in `FeltRegion.tsx` — the per-card arming surface, the
> gallery, or the felt stage — and `galleryOpen(state)` (declared in `armingWindows.ts`, re-exported
> from `roundUiState.ts`) is the single statement of the condition above, with
> `!armingSurfaceOpen(state)` added so the arming surface wins when both could show. The rail's own
> option was renamed `galleryOpen` → **`stageReplaced`** for the matching reason: the condensed trick
> strip belongs in the rail while **either** surface holds the stage, which is what puts the Quarry's
> lead in view while the player arms against it. Everything above about the door still holds exactly
> as written. See [the arming surface](arming-a-buff-from-the-card.md).

**The trick's cards render in exactly one place at a time.** Gallery closed, the stage's `TrickWell`
shows them as it always did; gallery open, a condensed strip renders in the rail
(`FeltRailProps.trick` is `null` in the first case). **The readout is in the rail in both states** —
under the trick well it would vanish at the exact moment the player is choosing a buff, which is
when the consequence matters most. The approved mockup rendered the trick in the rail *and* the
stage simultaneously; that is the one place the port deliberately deviates, because two simultaneous
renderings of one fact is a worse answer than one that moves. The cost is that the played card
changes size and position when the gallery opens, and whether that reads as a move or a loss is a
developer judgement nobody has made.

### `FeltStage` is a box; the branch chain moved to `roundControlsProps.ts`

`WarCouncilRound.tsx` was **415 lines, already over the blocking 400-line budget** before this ticket
touched it. The re-home paid it back: the felt's branch chain — fault, held reveal, round over,
ability prompt, in-progress trick — moved **verbatim** into `roundControlsProps.ts`'s
`feltStageProps`, built with `createElement` because that file is `.ts` and every other builder in it
(`actionBarProps`, `buffGalleryProps`) is written the same way. `FeltStage` itself is a thin layout
wrapper and nothing more: extracting the *chain* into a second component would have moved five
pieces of round state with it for no gain, while extracting the *box* is what bought the lines back.
`WarCouncilRound.tsx` is 352 lines now.

**The chain's ordering is load-bearing and unchanged**: the held reveal is checked **before**
`roundComplete`, because the deciding sixth trick resolves and completes the hand in the same
reducer transition, and without that ordering the winning card of the final trick would never be
shown at all. This is the same inversion DLR-82 recorded; moving the chain preserved it.

## The consequence readout, and why its silence is structural

`trickConsequenceModel.ts`'s `trickConsequence(facts)` takes the led `TrickCard | null`, whether it
is skulled, the trump suit and how many Witches are already face up, and returns a
`TrickConsequenceView` or **`null`**. It returns `null` in three cases, from **one guard**:

1. the trick is empty;
2. the **player** led — the readout only ever speaks about the Quarry's card;
3. the led card produced no clauses.

So "no placeholder row, no empty panel, and nothing at all before the Quarry has played" is true
because **there is nothing to render**, not because a component checked. `TrickConsequence.tsx`
returns `null` when its `view` is `null` and has no other branch.

The clauses come from the rank table in `.docs/game_rules/the-hunt.md`, not from prose invented here:

| Led card | Produces |
| --- | --- |
| Skulled, any rank | `IF YOU WIN` — you eat the skull (costly); `IF YOU LOSE` — they eat it, you bank the trick and the multiplier climbs (worthwhile) |
| Skulled **Swan** | the pair above, plus the leader clause **on the win branch only** |
| Unskulled **Swan** | `IF YOU WIN` — the leader clause alone |
| **Monarch** | a `RULE` row — your follow is narrowed to your Swan of that suit or your highest card of it |
| **Witch**, and exactly one Witch face up | a `RULE` row — their Witch counts as trump unless you play a Witch too, and the two cancel |
| everything else | nothing |

Two absences are decisions, not gaps. **The Swan's leader clause is win-branch only**, because on
the lose branch their Swan won and the leader does not change. **The Fox and the Woodcutter produce
no clause at all**: both resolve the instant the card is played, before the follow, so by the time
the card is face up in the trick there is nothing left for them to do to the follower.

**The readout never says which branch will happen, and cannot.** It has no access to the Quarry's
hand, both branches are always stated, and `TrickConsequence.tsx` renders every row with the same
element, the same class list and the same attributes — nothing marks one branch as more important.
Colour lands on the **consequence text only**, through each clause's own `tone`; the branch label is
never coloured. This is the same discipline the per-card `W/L` damage preview already keeps, for the
same stated reason.

**Clause kinds and clause words are separate modules**, matching how `buffLabels.ts` and `labels.ts`
already split. `trickConsequenceModel.ts` decides which clauses apply; `consequenceLabels.ts` holds
the sentences, keyed over the closed clause union so a member added later is a **compile error**
rather than an `undefined` on screen, and builds `consequenceAccessibleName` so a reader who cannot
see the slip gets the same claim.

`trickConsequenceFacts(state)` builds the facts from round state **in one place**, so the rail and
its spec cannot read the trick differently — and `roundControlsProps.ts`'s `feltRailProps` is the
single caller of `trickConsequence(trickConsequenceFacts(ui))`.

**The readout speaks the outcome axis** — "If you win", "If you lose" — while the gallery's cadence
pill speaks the mechanical one. The two surfaces sit on the same felt and must not be given the same
words; see [the buff gallery](buff-gallery.md) for the other half of that split.

## The skull is a face now, not a corner glyph

`PlayingCard.tsx` previously drew a small `☠` in the corner **in addition to** the card's centred
pip. It now **replaces** the art: when `skulled`, the pip is not rendered and a
`.wc-card-skull-face` wrapper draws `<use href="#wc-skull" />` instead. The face is **identical for
every rank and suit**, and the corner index keeps rank, suit glyph and rank name — the trick is
still won on those.

The symbol lives once, in `SuitMark.tsx`'s `SuitSymbolSheet`, so N skulled cards cost **one path**
rather than N and every one is byte-identical. The bone shapes fill `currentColor`; the eye sockets,
nasal cavity and teeth gaps take `--wc-skull-shadow`, a fixed dark regardless of suit, tier or
greyscale, because they are shadow rather than a suit-coloured signal.

Two things did **not** change. `cardAccessibleName(card, { skulled })` already appended ", skulled"
and is untouched, so the mark still reads as a form plus a name rather than a colour. And a
Timebomb's `primed` marker is still **added** to the card rather than replacing anything — the two
markers are not symmetrical, and the mark from `mockup-primed-card.html` is a later ticket's.

Because a skull stays with its card when it changes hands — the Quarry's Fox can exchange a skulled
card into the decree — the face has to hold in the player's own hand and on the decree pile, not
only in the trick well. It does, because it is a property of `PlayingCard` and every surface renders
through it.

## The intent telegraph is gone, both halves

`IntentTelegraph.tsx`, `intentPreview.ts`, `previewQuarryIntent`, `intentAccessibleName` and
`STANCE_PHRASE` are **deleted**, along with their three specs. Both readings went: the live one
("Their intent"), and the speculative *"If you lead that…"* preview against a card the player had
merely armed. The consequence readout is the single surface that says what a trick will do, and the
state where the player leads deliberately says nothing at all rather than saying nothing by accident.
`TrickWell.tsx`'s copy for the Quarry-to-lead window lost its pointer at the panel — it read "They
are about to lead. Read their intent first." and now reads "They are about to lead." — because there
is no longer a panel to point at.

`QuarryDossier.tsx` was **not** modified. The ticket's scope list named it for "removing Their
intent", but "Their intent" was `IntentTelegraph`, a sibling rendered inside the same
`<aside className="wc-dossier">` by `WarCouncilRound.tsx`; the dossier never contained it.

> **`quarryIntent` stays in the engine, with no production consumer.** `src/warCouncil/cpuPlayer.ts`
> still exports it, `src/hunt/config.ts` still declares `TelegraphFidelity` and
> `TELEGRAPH_FIDELITY`, and `src/warCouncil/__tests__/quarryIntent.test.ts` still covers it. This is
> a **recorded decision, not an oversight**: removing engine surface is a larger cut than a UI
> ticket's scope and would strand a config value in the lint-enforced pure tree. Treat it as
> present-but-unconsumed — **no player-facing telegraph exists**, and any doc describing one is
> describing something that was deleted on 2026-08-26.
>
> > **Superseded on DLR-155, 2026-08-31.** `quarryIntent` has a production consumer again —
> > `telegraphedLeadSuit`, which marks the Quarry's lead **suit** in the holds panel, not on the
> > felt — and the two constants moved to `src/hunt/telegraphConfig.ts`, re-exported from
> > `config.ts`. **The felt readout this file describes is unchanged**, and nothing on the felt
> > previews an unplayed card.
