Part of [the run UI module](README.md). **DLR-159.**

# The Manage Buffs screen — combining piles

A full-viewport screen reached from the shop, showing every buff card the player holds, grouped into
counted piles of identical copies, with the piles that can be combined first and the ones that cannot
after them carrying their reason. The rule it drives — what "identical" means, what a combine
destroys and what it mints — is `src/hunt/`'s, documented at
[../hunt/combining-cards.md](../hunt/combining-cards.md). This file is the screen.

## It is its own `RunPhase`, not a view flag inside `ShopPanel`

`RunPhase` gained `ManageBuffs`, `AppScreen` gained `'manageBuffs'`, `screenFor` gained a case, and
`App.tsx` gained one branch guarded as `encounterOver && phase === RunPhase.ManageBuffs`. The Vault
and the Map are both full screens reached from elsewhere in the run and both are phases; a
shop-local boolean would also have made the new screen **invisible to `screenFor`**, and therefore to
the dev-only debug mirror the browser play-tester reads (`debugState.ts`'s `screen` union was widened
to match in the same pass, which is the check that keeps the mirror and the render from disagreeing).

It is reachable **only** from the shop and returns **only** to the shop: `ShopHeld.tsx`'s tray heading
carries the control that sets the phase, and the screen's own back control sets it to `RunPhase.Shop`.
`App.tsx` finished the contract at **399 lines** against the 400-line blocking budget — the branch was
kept to about eight lines by having `useManageBuffs` return the panel's whole props object, exactly
as `useShopSlot` does for the slot machine.

## Four files, and the panel decides almost nothing

| File | Owns |
|---|---|
| `manageBuffs.ts` | the pure view model — grouping, refusals, ordering, the produced-card preview |
| `useManageBuffs.ts` | the run write, and the produced pile's key |
| `manageBuffsLabels.ts` | every word the screen prints |
| `ManageBuffsPanel.tsx` + `CombineGroupCard.tsx` | the shell, the bands, and one pile tile |

`manageBuffsView(buffs)` reuses `heldBuffStacks` for the grouping rather than writing a second one —
the shop's held-cards tray and this screen show the same piles of the same cards, and the only thing
this screen adds is whether a pile can be combined. `HeldBuffStack` gained a required `ids` field for
it (every held copy's id, ascending); `count` stayed rather than becoming `ids.length`, so the tray
reads a count without having to know it is reading a list. There was exactly one construction site to
widen, and no test hand-builds a stack literal.

Each group carries its `refusal` from `combineRefusalFor` and, when that is `null`, a `produces`
preview — **a real minted card with a throwaway id of `-1`**, so the tile can print the produced
card's own name, tier numeral and payoff sentence rather than a tier word and a guess at what it will
pay. The preview never reaches a run; the real card is minted by `combineBuffs` from
`run.nextBuffId`.

**The ordering is ready piles first, then refused ones**, keeping `heldBuffStacks`'s tier-descending,
key-ascending order within each band. That is the loadout grid's own rule — what you can act on sits
where you look first, and what you cannot moves to the end carrying its reason — and it is a total
order, so identical holdings always draw an identical screen regardless of the order the cards were
won in. That is also what makes the component specs stable.

`useManageBuffs(run, setRun)` holds no state of its own. Its `combine(key)` derives the **produced
pile's key from the pile being spent, before the write** — the functional update has not run yet, and
reading `run` after `setRun` would read the stale one. Two cards of tier T always produce one card of
`nextBuffTierAfter(T)` of the same card, so the key is knowable in advance. It throws a `RangeError`
if asked to combine a pile the screen does not have ready.

## The screen: three zones, two taps, no scroll

A three-row full-viewport grid — `height: 100dvh`, `overflow: hidden`, `grid-template-rows: auto
minmax(0, 1fr) auto` — with the status strip pinned to the top edge, the two bands of piles in the
middle, and the ledger on the bottom edge.

- **Top:** the title, the count of cards held, the count of piles ready, the rule stated once
  (_"Two of the same card at the same tier become one of the next tier. It costs no coins — it costs
  a card."_), and the back control.
- **Middle:** a `Ready to combine · N` band and a `Nothing to combine · N` band, each a labelled
  `role="group"` grid. A band renders only when it has members. An empty pile renders one sentence.
- **Bottom:** a `role="status"` line and the standing reminder that _"Every combine spends 2 cards
  and returns 1."_

**A refused tile is an `<li>`, never a `<button>`** — nothing on it can be acted on, and a card
rendered as a button that cannot act is an affordance that lies. Its reason is on its face, not
behind a hover.

**A ready tile is a `<button>`, and the gesture is two taps on the tile itself.** The first arms it
and replaces its lower half with the confirmation: what is destroyed (`2 × Bronze Moon Low`), what
is made (`1 × Silver Moon Low — +3 damage`), the pile count as `21 → 20 cards`, and `Combine` /
`Cancel` as the tile's own controls. `Combine` carries `autoFocus`, so the gesture's second tap lands
on a control that already has focus. The second tap commits. Confirmation is on the object rather
than at a distant button, and the felt already teaches this arm-then-commit rhythm for activating a
buff.

**The pile count is what the screen states, deliberately.** Card count is the binding resource since
action points were removed, so the confirmation names the cost as the resource it actually spends.
Nothing in the copy argues that combining is good value — see the tension below.

## Announcing what was made

After a commit the panel marks the pile the new card landed in with a persistent **"Just made"**
badge and writes one `role="status"` sentence naming both halves (_"Two Bronze Moon Low cards became
one Silver Moon Low — +3 damage."_). The badge is a **form change and stands until the next
combine** — not a flash, not a colour, and not on a timer: an announcement that has faded by the time
the player looks is the same as no announcement.

## Keyboard, focus, and the residual

The ready grid runs under `useRovingTabIndex` — one tab stop, arrows to move, `Home`/`End`,
`Enter`/`Space` to arm and commit. `Escape` cancels an armed tile, and cancels the screen itself when
nothing is armed. **The roving collection is the ready piles only**, since a refused tile carries no
button at all.

While a pile is armed, arrow-key movement is withheld: the tile has become its own two-button
confirmation face with focus on `Combine`, and roving would steal focus off it. `Escape` still works.

A cancel or a commit swaps or removes the node that had focus, so the panel restores it: a ref holds
the keys to try in order, a tick of state schedules one effect, and the effect reads and clears the
ref, focusing the first tile that exists — falling back to the grid, then to the back control. After
a commit it prefers the tile that was armed (a pile of more than two copies is still there, just
shorter by two) and falls back to the produced pile's tile.

> **Residual, raised at review and accepted.** After a **mouse-driven** commit with multiple ready
> piles, `useRovingTabIndex`'s internal `focusedIndex` bookkeeping can name a different tile than the
> one that actually holds DOM focus, so the next arrow press can jump from an unexpected place. Only
> the pointer path reaches it; the keyboard path keeps the two in step. Not fixed in this contract.

The screen registers no listener, no observer, no timer and no `requestAnimationFrame` — `Escape` and
the arrow keys are plain `onKeyDown` handlers, and the one effect it does register only writes DOM
focus, so there is nothing for a cleanup to release and nothing for StrictMode's double mount to
double.

## Copy and styling

Every word lives in `manageBuffsLabels.ts`, including a **total** `Record<CombineRefusal, string>` —
_"Already gold — nothing above it"_ and _"Only one — nothing to pair it with"_ — so a third refusal
code would fail to compile rather than render blank on the face of a card. A ready and a refused tile
each get their accessible name from one function, so what a sighted player reads and what a screen
reader announces cannot drift.

`CombineGroupCard` reuses `warCouncilBuffCard.css` wholesale, so a pile here is visibly the same
object as the card on the felt, and tier stays legible in greyscale through the roman numeral rather
than the metallic hue. `manageBuffs.css` owns only the shell, the bands, the strip and the
confirmation face, on `warCouncil.css`'s own `--wc-*` tokens rather than a fourth palette. **Every
`clamp()` bound in it is a placeholder the developer owns**, except the tile width, which reuses
`--wc-buffcard-w` — a `.wc-buffcard` takes its width from being a grid item in the loadout gallery,
so dropped into an `<li>` here it would collapse to a zero-width dot without one.

### The three tier/suit lookup tables now live in one place

`TIER_NUMERAL`, `TIER_CLASS` and `SUIT_CLASS` were carried separately by `BuffCard.tsx` (the felt)
and `HeldBuffCard.tsx` (the shop tray). This screen would have been the third copy, which is what
made the duplication real — a new suit or tier meant three synchronised edits with no compiler check
tying them together — so they were extracted to
`src/app/warCouncil/buffCardVisuals.ts` and all three now import them. It is a lookup table, not a
component: each of the three still renders its own card face.

## Nobody has seen it

**No browser pass ran on this contract.** jsdom has no layout engine, so nothing proves the shell
does not scroll at a real viewport, that a dozen tiles at the reused width read as neither cramped
nor sparse, or that the armed confirmation face is legible over the card behind it. The wording of
the confirmation, the two refusal sentences, the "Just made" badge and the `21 → 20 cards` line are
all the developer's to approve.

## The tension this screen ships with

**At today's reward ladder most combines measure as a downgrade** — two bronze damage cards fired on
one trick pay 6 where the silver they combine into pays 4, because two cards earn the Overlap Bonus
and one does not. The ticket names it, accepts it, and defers the ladder pass; nothing on this screen
compensates for it or nudges the player either way. It is the single most likely thing to feel wrong
in play and is not a defect. The arithmetic is in
[../hunt/combining-cards.md](../hunt/combining-cards.md); it is recorded in
`.docs/game_rules/the-hunt.md`'s Known tensions.
