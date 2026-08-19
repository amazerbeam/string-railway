Part of [War Council UI](README.md).

# The Envenom charge plate, the card mark, and the reducer split that had to come first

DLR-90. The player-facing half of Envenom: a plate in the felt rail, a three-tap arm-and-mark
sequence mirroring the Cheat's, and a badge that follows the marked card to every surface it renders
on. Plus the file split that had to happen before any of it could be written, because
`roundReducer.ts` was at 382 lines of a blocking 400-line budget.

The rule the mark triggers is the engine's — see
[the Envenom mark](../war-council/the-envenom-mark.md) — and the charge it spends is `src/hunt/`'s.

**DLR-91 made this reducer the place poison is actually paid**, which it was not before: the hit used to
be settled at a hand boundary by `src/hunt/`'s `beginNextHand`, and both that function and the
`applyPendingEnvenom` it called are now deleted. Nothing about the plate, the taps or the badge changed;
`applyResolution` (below) and the commit path did.

## The split came first, and it is a pure move

`roundReducer.ts` had 18 lines of headroom before a line of this feature was written, and the feature
needed two handlers, a commit branch and a restructured `applyResolution`. Two extractions, both
verified by every existing spec passing with **no assertion edited** — only import lines:

| New file           | Holds                                                                                            | Lines |
| ------------------ | ------------------------------------------------------------------------------------------------ | ----- |
| `roundUiState.ts`  | `ResolvedTrick`, `CheatStage`, `CheatSelection`, `CpuFault`, `RoundUiActionKind`, `RoundUiAction`, `RoundUiState`, `RoundUiSeed`, `createRoundUiState`, `cheatArmed` — plus DLR-90's `EnvenomStage` and `envenomArmed` | 158 |
| `roundHint.ts`     | `deriveHint`, moved out of `WarCouncilRound.tsx`                                                  | 33 |

The seam is deliberate rather than arbitrary: **`roundUiState.ts` is what a component imports** — the
state shape, the action kinds, the predicates it renders from — and `roundReducer.ts` is the
transition function nothing but the mount needs. Nothing in `roundUiState.ts` decides anything.

**Nothing is re-exported from `roundReducer.ts`.** All ten importers — four production files and six
specs — were repointed instead. A barrel re-export would leave two valid paths to the same type and
the next reader would not know which is canonical, which is the ambiguity this project's
single-source-of-truth rule exists to prevent. A grep confirms only `roundReducer` itself is still
imported from `./roundReducer`.

`deriveHint`'s extraction bought something beyond headroom: it was **always** a pure function of
committed state, but as a private helper inside a component it could only be exercised through a
renderer — so a cascade with six branches had no direct test. It has one now, asserting the priority
order against the exported copy constants rather than against quoted sentences, since every one of
those strings is placeholder.

## The selection is one nullable field, cycled by one action

```ts
readonly envenomCharges: number        // mirrored from the mount prop, decremented on a mark
readonly envenomStage: EnvenomStage | null   // Poised | Armed | nothing
```

`envenomStage` is **one nullable field rather than two booleans**, for `CheatSelection`'s stated
reason: `poised` and `armed` are stages of one selection, and two fields would admit the invalid pair
"poised AND armed". It carries no id, unlike `CheatSelection` — charges are fungible, and the card
marked is the identity.

`TapEnvenom` cycles `null → Poised → Armed → null`, and the third tap **gives the charge back
unspent**, exactly as `handleTapCheat` does. `CancelEnvenom` (and `Escape`) clears the stage and
spends nothing. `handleTapEnvenom` refuses entirely when `canAct(state)` is false or no charge is
held — the same gate the Cheat rail and the hand fan use, so a charge cannot be armed into a moment
where no card can be marked.

`envenomArmed(state)` is **exported** so the mount's tappability and the reducer's branch read the
same predicate. Two readings of "is Envenom armed" is exactly how a greyed card and a reducer branch
drift apart.

### Marking and Cheat-arming clear each other

Both reinterpret a hand-card tap, so allowing both at once would make the next tap ambiguous. Poising
Envenom clears `cheatSelection` **and** drops any card armed-to-play; poising a Cheat clears
`envenomStage`. Specs cover both directions plus the armed-card drop.

`commit()`'s `settled` object also clears `envenomStage`, alongside the `cheatSelection: null` that
was already there. **That line was missing when the feature first landed and the Defender caught it**
— without it, poising Envenom and then playing an ordinary unrelated card left the stage stuck at
`Poised` through the trick's resolution and into the next trick, so the plate kept its styling, the
hint kept showing, and **the next plate tap jumped straight to `Armed`** — silently consuming one of
the three taps the misclick guard exists to require. A regression spec now plays an unrelated card and
asserts the following tap starts over at `Poised`.

### While armed, every card in hand is a legal target — including illegal ones

`handleTapCard` routes to `commitEnvenom` immediately after the `canAct` guard, and **legality is
deliberately not checked**. Marking is not a move, and the design's whole point is marking a card the
player expects to lose with.

That obligation reaches `HandFan`, which `disabled`s illegal cards in ordinary play. It takes two new
props — `envenomedCards` and `envenomArmed` — and while armed:

- `illegal` becomes `!interactive || (!envenomArmed && !containsCard(legal, card))`;
- `isFocusable` drops its `containsCard` term.

Both widen **together**, which is what stops the disabled set and the focusable set drifting apart.
The focusable half is the one that matters for a keyboard-only player: without it, the very card the
item exists for would be unreachable by arrow keys. `useRovingTabIndex` recomputes its tab stop from
`isFocusable` fresh every render rather than through an effect, so the set changing across an
arm/disarm transition cannot go stale. A spec drives the arrow keys onto an illegal card while armed.

The fan also takes a marking-mode class so the stylesheet can distinguish "pick a card to poison"
from ordinary play — presentational only, changing nothing about behaviour or the accessible tree,
exactly as `wc-is-inert` already does.

### `applyResolution`'s ordering is load-bearing — and since DLR-91 it is pay, clear, re-book

It previously returned early when a resolution was all-zero, to avoid bumping `damageEventsApplied`
for nothing. It no longer returns early, because **a replaced clean loss is exactly an all-zero event
that still owes a booking**. DLR-91 then added the middle step, because this is now where a queued hit is
paid rather than merely booked:

```ts
if (isEncounterResolved(encounter)) return encounter
const incoming = incomingFrom(resolution)
const paid =
  incoming[DuelSide.Player] === 0 && incoming[DuelSide.Quarry] === 0
    ? encounter
    : applyDamage(encounter, incoming)
const cleared = hasPendingEnvenom(paid) ? { ...paid, pendingEnvenom: NO_PENDING_ENVENOM } : paid
return resolution.envenomTarget === null ? cleared : queueEnvenom(cleared, resolution.envenomTarget)
```

**Three steps, and each ordering is a rule:**

- **The damage lands first, and `queueEnvenom` then refuses an already-resolved encounter.** That is how
  a marked trick whose own cash-out empties the Quarry's bar discards its booking rather than carrying a
  hit into a fight that is over (D5's discard half). Booking first would do the opposite.
- **The queue is cleared before the new booking, not after.** A trick that both *pays* a poison and
  *carries* a mark would otherwise have its own fresh mark wiped by the clear.
- **The all-zero skip now reads the whole `incomingFrom` record** rather than `cashOut` and
  `damageToPlayer` separately, because the Quarry's total is a sum of two sources since DLR-91 and
  reading one of them would miss a poison-only event.

**Where the pending figures come from is the other half of the change.** A `poisonOptions(state)` helper
projects `state.encounter.pendingEnvenom` and `state.poisonGuardHeld` into a `PlayCardOptions`, and it is
read by **both** `playCard` call sites — the player's follow in `commit` and the Quarry's in
`advanceQuarryFollow`. One statement of "what is pending", because two readings is exactly how a hit gets
paid twice or skipped. `commit` and the CPU-advance path each also set
`poisonGuardHeld: resolution.poisonGuardSpent ? false : state.poisonGuardHeld` — **the Guard is spent at
both settle points**, and the reducer never re-derives whether the Guard mattered, because
`resolveTrickBank` already reported it. See [Poison Guard](../hunt/poison-guard.md).

## The plate — `EnvenomCharge.tsx`

67 lines, and a **sibling** of `CheatSlots` rather than a generalisation of it: the two consumables
keep independent copy and independent components, so `CheatSlots` stays at 77 lines and retuning one
never risks the other.

- **At zero charges it renders inert rather than absent**, so the rail's shape is stable across a
  purchase — the same reason `CheatSlots` renders empty frames.
- **The three stages differ in form, not colour alone** — a class per stage driving a ring and a lift
  — and the count is rendered as text as well as by the glyph.
- **`aria-pressed`** reports the armed state; `envenomAccessibleName(stage, charges)` puts the count
  in the accessible name, because a player who cannot see the plate needs to know how many are held,
  and because `getByRole('button', { name })` is how the specs tell the three stages apart.
- **`Escape` on the container cancels**, matching the Cheat rail's and the hand fan's contract. It is
  a plain synthetic `onKeyDown` on the rendered element — **not** a document-level listener, so there
  is no effect and nothing to clean up. This module still holds no effect of any kind.
- One control is far below the roving-tabindex threshold, so it is a plain tab stop.

### `stopPropagation` is load-bearing, and it is asserted

The plate stops click propagation for the same reason `CheatSlots` does, and it is not defensive
tidiness: the plate mounts inside `.wc-table`, which fires `handleCarryOn` on click whenever the felt
is waiting. Without it, **arming a charge while a trick reveal was held would also clear the reveal
and commit the Quarry's lead** as a side effect.

Two specs pin it — one at the component level (a click handler on a wrapper must not fire) and one at
the mount level, where it actually matters.

## The mark — one rendering path, four surfaces

`PlayingCard` gains `envenomed?: boolean` beside `skulled` — a second optional boolean with its own
`<span>` and its own class, in the **same component and the same `className` cascade**. Not a second
rendering path, which the acceptance criteria explicitly forbid.

`.wc-venom-mark` sits in a **different corner** from `.wc-skull-mark` so a card carrying both stays
legible, and it reads in form as well as colour — a ringed badge rather than a bare tinted glyph. The
mark is `aria-hidden`, so it is announced once through the accessible name rather than twice.

**The glyph `⚗` and its hue are placeholders**, chosen only so there is something to render. Both are
the developer's.

`cardAccessibleName(card, skulled?)` became `cardAccessibleName(card, marks?: CardMarks)` — an object
rather than a second positional boolean, because `cardAccessibleName(card, true, false)` is one
transposition away from announcing the wrong marker, **on the exact surface a player who cannot see
the card depends on**. `marks` is optional, so every call site naming an unmarked card kept compiling
unchanged; only two sites actually passed the second argument. Skull is announced before poison,
matching the order the two marks are drawn in.

All four surfaces that render a card get it:

| Surface        | Prop                                | Why it is in scope                                        |
| -------------- | ----------------------------------- | --------------------------------------------------------- |
| `HandFan`      | `envenomedCards` (required)         | where the mark is made                                    |
| `TrickWell`    | `envenomedCards?` (defaults `[]`)   | the mark must survive being played                        |
| `AbilityPrompt` | `envenomedCards?` (defaults `[]`)  | a marked card offered as a Fox exchange or Woodcutter discard |
| `DecreePile`   | `envenomed?` (defaults `false`)     | the Fox can exchange a marked card **into** the decree     |

**`DecreePile` is the one all three reviewers caught.** Its prop was built correctly and then never
passed at the mount, so a marked card exchanged into the decree silently lost both its badge and its
"poisoned" accessible name — on a plate that renders continuously through the hand. It now receives
`envenomed={isEnvenomed(ui.round.envenomedCards, ui.round.decree)}`, and the regression spec drives
the **reachable** path rather than the prop: mark a card, lead the Fox, exchange the marked card in,
assert the decree still announces it. A prop-only unit test would have passed against the defect,
which is why it is written that way.

## The hint

Two branches in `roundHint.ts`, placed **above** the Cheat's: while marking, "pick a card to poison"
is the most specific true thing, and the reducer makes the pair unreachable anyway. The spec pins the
stated priority regardless of that unreachability, because the cascade's order is the contract.

## Budgets

Measured with `(Get-Content <path>).Count`: `roundReducer.ts` 359, `roundUiState.ts` 158,
`roundHint.ts` 33, `WarCouncilRound.tsx` 340, `EnvenomCharge.tsx` 67, `warCouncilEnvenom.css` 97 — all
inside the 400-line budget, and the split is what bought the room.

Two spec files sit at the edge and are worth knowing before appending to either:
`WarCouncilRound.test.tsx` at **398** has no headroom at all, and `roundReducer.envenom.test.ts` is at
365. That is why DLR-90's mounted-felt cases went into a new file,
`WarCouncilRound.envenom.test.tsx`, rather than onto the end of the existing one.
