# Every card movement in the game — the inventory

DLR-157 AC1. Assembled on 2026-09-01 by reading the code, not by trusting the ticket's seed list.
**The seed list is incomplete and wrong in two places** — see *Where the seed list was wrong* at the
bottom.

A "movement" here is any moment a card changes which place it belongs to. A card that changes
appearance without changing place (a Timebomb mark, a buff halo, an arming lift) is not a movement
and is recorded as such rather than omitted.

## Legend

- **Face** — `down` = a card back, `up` = a readable face. `down→up` means the movement reveals the
  card, and so must carry a flip (AC6).
- **Verdict** — `animate` / `instant (reason)` / `no movement` / `unreachable`. AC2 forbids silence.

## The places a card can be

| Place | DOM anchor today | Face |
|---|---|---|
| Player hand slot | `.wc-fan-slot` → `[data-buff-anchor="<cardKey>"] button` | up |
| Quarry hand | `.wc-stack` / `.wc-stack-back` (capped at `MAX_VISIBLE_OPPONENT_BACKS`) | down |
| Trick well | `.wc-trick-row` | up |
| Draw pile | `.wc-pile` in `DecreePile.tsx` (`"<n> in the pile"`) | down |
| Spent pile | `.wc-pile.wc-spent` in `DiscardPile.tsx` | down |
| Decree plate | `.wc-pile` in `DecreePile.tsx` | up |
| Buff gallery | `.wc-gallery-grid` cards (`BuffCard.tsx`) | up |
| Riding strip | `.wc-buff-riding-row` (`BuffRidingList.tsx`) — rows, not cards | up |
| Ability prompt | `.wc-prompt-row`, incl. the Woodcutter's `.wc-drawn-wrap` | up |
| Resolution screen | `.wc-resolve-card-slot` | up |
| Shop held tray | `.shop-held-cards` (`ShopHeld.tsx` / `HeldBuffCard.tsx`) | up |

**There is no discard pile.** `DiscardPile.tsx` renders the *spent* pile, and discarded cards go to
the **bottom of the draw pile** (`applyDiscard`, `discard.ts:95`). See M9.

---

## In the encounter

| # | Movement | From → to | Trigger | Face | Alone or with others | Code path | Verdict |
|---|---|---|---|---|---|---|---|
| M1 | Player plays a card | hand slot → trick well | second tap on an armed card | up→up | alone | `WarCouncilTable.handleTap` → `useCardFlight.fly` | **already animated** (DLR-156) — re-pointed at the shared primitive, behaviour unchanged |
| M2 | Quarry plays a card | Quarry hand back → trick well | CPU advance, on its lead or its follow | down→up (**flip**) | alone | `quarryAdvance.ts` → `playCard` | animate |
| M3 | Trick closes — the two played cards | trick well → spent pile | the second card commits | up→down (**flip**) | a pair, staggered | `playCard.ts:161` / `:184` | animate |
| M4 | Trick closes — the player's refill | draw pile → hand slot | the same commit as M3 | down→up (**flip**) | 0–1 card, staggered after M3 | `playCard.ts:153-174` (DLR-146 floor of 4) | animate |
| M5 | Deal — the player's hand | draw pile → hand slots | a new hand begins | down→up (**flip**) | `HAND_SIZE` cards, staggered | `dealRound` (`deal.ts`) | animate |
| M6 | Deal — the Quarry's hand | draw pile → Quarry hand backs | the same deal | down→down | `HAND_SIZE` cards, staggered | `dealRound` | animate |
| M7 | Deal — the decree | draw pile → decree plate | the same deal, last | down→up (**flip**) | alone, on the closing beat | `dealRound` | animate |
| M8 | Reshuffle | spent pile → draw pile | the draw pile cannot cover the next deal or draw | down→down | the whole pile | `dealPileFor`, and `drawCards` mid-hand | animate **as one pile-to-pile move**, not as 20–26 individual cards |
| M9 | Discard / swap — outbound | hand slots → **bottom of the draw pile** | the player confirms a discard | up→down (**flip**) | 1–`MAX_CARDS_PER_DISCARD`, staggered | `applyDiscard` (`discard.ts:95`), `discardHandlers.ts` | animate |
| M10 | Discard / swap — inbound | draw pile → hand slots | the same commit as M9 | down→up (**flip**) | same count, staggered after M9 | `applyDiscard` → `drawCards` | animate |
| M11 | Fox (rank 3) exchange | hand card → decree plate, **and** decree card → hand | the Fox prompt is answered | up→up both ways | a simultaneous pair, crossing | `applyFoxExchange` (`abilities.ts:5`) | animate |
| M12 | Woodcutter (rank 5) — the draw | draw pile → the prompt's "Drawn" slot | the Woodcutter prompt opens | down→up (**flip**) | alone | `applyWoodcutterDraw` → `AbilityPrompt.tsx:141` | animate |
| M13 | Woodcutter — the return | the chosen card → **bottom of the draw pile** | the prompt is answered | up→down (**flip**) | alone | `applyWoodcutterDraw` (`abilities.ts:36`) | animate |
| M14 | End of hand — everything is spent | decree + both hands + anything on the table → spent pile | the hand ends | up/down→down | up to 13 cards at once | `closeHand` (`encounterDeck.ts:48`) | animate as a **single sweep**, one stagger group, not 13 flights |
| M15 | A buff is activated | gallery card → riding strip row | tapping a gallery card | up→up | alone | `buffHandlers.ts`, `buffRideProps.ts` (DLR-153) | animate |
| M16 | A buff is removed | riding strip row → gallery card | `handleRemoveBuff`, or `Escape` while priming | up→up | alone | `buffRideProps.handleRemoveBuff` (DLR-154 FIX 3) | animate — the exact reverse of M15 |
| M17 | The trick crosses to the resolution screen | trick well → `.wc-resolve-card-slot` | the trick resolves | up→up | a pair | `TrickResolutionScreen.tsx` | **instant** — `ui-notes.md` §1 specifies these cards are *cloned, not moved*; the felt must still hold them for the return, so nothing actually leaves a place and there is no movement to draw |
| M18 | The ledger plaque leaves the riding strip | riding strip → the ledger row | each resolution beat | — | one per beat | `ResolutionLedger.tsx`, `useBeatSequence.ts` | **instant** — it is a plaque, not a card, and its beat-paced entrance is already the animation `ui-notes.md` §3 specifies; a second flight would compete with the beat |
| M19 | Timebomb priming | — | marking a hand card | — | — | `timebomb.ts`, `TimebombMark.tsx` | **no movement** — the mark is applied to a card in place; DLR-154 |
| M20 | Arming a card | — | first tap on a hand card | — | — | `roundReducer.handleTapCard` | **no movement** — the card lifts within its own slot; `ui-notes.md` §2 |

## Outside the encounter, in the run

| # | Movement | From → to | Trigger | Face | Alone or with others | Code path | Verdict |
|---|---|---|---|---|---|---|---|
| M21 | The slot machine pays a buff | payline → the held tray | a winning pull | reel symbol → up (**reveal**) | alone | `useShopSlot.ts`, `SlotMachinePanel.tsx` | animate |
| M22 | A held buff enters the tray | offer → `.shop-held-cards` | a purchase | up→up | alone | `ShopPanel.tsx` → `ShopHeld.tsx` | animate |
| M23 | The reels spin | — | a pull | — | — | `useSlotSpin.ts` | **already animated**, and not a card movement — reel strips, with their own reduced-motion cross-fade path |

## Unreachable in play — recorded, not covered

AC9. Each of these is a movement the code could perform but no player can currently reach.

| # | Movement | Why it is unreachable | What would make it reachable |
|---|---|---|---|
| M24 | A consumable is used | Ward, Second Thoughts, Puppeteer, Foresight and Spyglass have timings and tier tables in `src/hunt/consumables.ts` but **no template and no slot weight** — DLR-145 cut them | a ticket restoring a consumable to `TEMPLATE_FAMILIES` in `src/hunt/buffTemplates.ts` |
| M25 | A Shield card moves | the Shield is named unobtainable in DLR-133 | the ticket that makes the Shield drawable |
| M26 | A cut condition card moves | the eight cut families (Mark of the *R*, Glutton, Hoarder, Unbloodied, Debt Collector, Keepsake, Miser, Cornered) keep their `BuffKind` entry and price but are unconstructible — `MintableConditionKind` narrows the type | a row in `TEMPLATE_FAMILIES` plus a type widening |
| M27 | A Purse or Second Wind reward card moves | both reward axes were cut on DLR-145; no card pays on either | the same restoration ticket |

None of M24–M27 introduces a *new kind* of movement — each is a buff card travelling gallery↔strip
(M15/M16) or shop↔tray (M22). Restoring any of them therefore needs no new motion work, only the
template row. That is the point of recording them: the primitive already covers the shape.

---

## Where the seed list was wrong

Two of the ticket's ten seed rows do not describe what the code does, and one is under-counted.

1. **Seed row 6 — "selected hand cards → discard pile".** There is no discard pile. `applyDiscard`
   puts the discarded cards on the **bottom of the draw pile** (`discard.ts:95`), and the component
   named `DiscardPile.tsx` renders the **spent** pile. Animating them toward the pile the seed list
   names would send the cards to the wrong place on screen.
2. **Seed row 3 — "trick closes → both played cards to spent pile" via `closeHand`.** `closeHand`
   runs at the end of a **hand**, not a trick, and spends thirteen cards at once (M14). The
   per-trick move to the spent pile is `playCard.ts:161`/`:184`, and it fires **simultaneously with
   the player's refill draw** (M4) in the same commit — two movements in opposite directions on one
   beat, which the seed list treats as one row.
3. **Seed row 4 — "deal at hand start: draw pile → both hands".** The deal also turns the **decree**
   (M7), which is a third destination and the only one that reveals a card the player will have to
   reason about all hand.

Everything else in the seed list is confirmed. The seed list also omits the two buff movements'
reverse (M16), both run-level movements (M21, M22), and every unreachable case (M24–M27).

## What this means for the primitive

The inventory forces four capabilities that DLR-156's `useCardFlight` does not have today:

- **A flip.** M2, M3, M4, M5, M7, M9, M10, M12 and M13 all change face. Nine of nineteen live
  movements — the flip is the common case, not the exception.
- **Staggered groups.** M3+M4 (opposite directions, one beat), M5/M6 (six each), M9+M10, M14 (up to
  thirteen). A single `fly` per card fired at once is the failure mode AC5 names.
- **Anchors resolved by name, not by element.** M4, M5, M6, M7, M10 and M12 all land in a slot that
  **does not exist until the state commits**, so the caller cannot hand the primitive two live
  elements the way `handleTap` does. The primitive needs to resolve a place by key at the moment it
  measures.
- **Pile-to-pile as one object.** M8 and M14 must not become 20–33 flights. A pile moves as a pile.
