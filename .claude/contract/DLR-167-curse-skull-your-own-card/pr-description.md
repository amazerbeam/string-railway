# DLR-167 — Curse: an activated buff card that puts a skull on one of your own cards

Plan: [`plan.md`](./plan.md) · Layout and interaction reference: [`mockup.html`](./mockup.html)

## What this adds

Skulls used to be dealt only to the Quarry, so the player had no way to make one. **Curse** gives
them the lever: draw it from the slot machine like any other card, activate it in the ordinary
between-tricks window, then tap a card in your own hand. That card carries a skull — and because the
engine already decides "this is a skull trick" by asking whether *any* card in the trick is skulled,
playing the marked card flips that trick's meaning with no new rule and no new outcome. Losing it
becomes a **dodge**: it banks, and costs no health.

- **`BuffKind.Curse`**, an `ACTIVATED_TEMPLATES` row (persisted id `'curse'`, additive, no
  `SAVE_SCHEMA_VERSION` bump), a `BuffActivatedTemplateKind` widening, and a `CONSUMABLE_AP_COST`
  price row. The mintable pool moves **18 → 19**. Spent on use; **not** revocable.
- **`RoundState.cursedCards`**, owned by a new `src/warCouncil/curse.ts`. `skullsOn(round)` is
  **THE single place a dealt skull and a player's curse are read as one** — twelve readers were
  converted to it; six Quarry-side readers deliberately were not, and each carries a one-line comment
  saying why (they reason about the *Quarry's own dealt* skulls, which a curse is not).
- **The lapse** is one line in `playCard`: `cursedCards: []` on the state returned at every trick's
  resolution, written *after* `skullTrick` is computed. Covers "the card was played" and "it never
  was" identically, with no fuse counter.
- **The payoff** (bronze +1 damage, silver +2, gold +2 and +1 multiplier) is **derived inside
  `resolveTrickBank`** from `trick.buffs.active`, beside the existing `trickBonusFor` and
  `streakProtectionFor` derivations. No `TrickFacts` field was added. Only a **banked** trick reaches
  that branch at all, which is what makes the reward self-gating — no "only on a dodge" condition
  exists anywhere.
- **The card face in hand** reuses `PlayingCard`'s existing `skulled` branch and its `wc-is-skulled`
  class unchanged. `HandFan` gains `skulledCards` and `curseArmed` props; **no new CSS**.
- **Sidestep's copy is corrected**: its condition sentence now reads *"a skull trick you do not
  take"* and its face word is `SKULL LOSS`. No buff attaches to a card; a buff rides the trick.

## Decisions the developer must make

| What | Where | What shipped |
|---|---|---|
| Curse's three action-point prices | `src/hunt/buffCosts.ts` → `CONSUMABLE_AP_COST.curse` | `{ bronze: 2, silver: 3, gold: 4 }`, copied from Shield's ladder shape. **Nobody chose these.** Worth pricing against the card's asymmetry: a misread Curse costs the card, the points **and** the whole streak at once. (Note `AP_ENABLED` is currently `false`, so nothing is spent today either way.) |
| Curse's two slot weights | `src/hunt/slotWeights.ts` | `3` on Skirmisher, `1` on Strongbox — Cheat's numbers, on the reading that Curse is likewise an in-hand tactical play. **Nobody chose these.** A row is forced by the type system; the plan did not name this file. |
| Sidestep's replacement copy | `src/app/warCouncil/buffLabels.ts` | `'a skull trick you do not take'` and `SKULL LOSS`. AC10 says only what the copy must **stop** saying. DLR-165 will rewrite both again. |
| Curse's own copy | `src/app/warCouncil/buffLabels.ts` | Family word `Curse`, condition sentence `'put a skull on a card in your hand'`, refusal message `'A Curse is already waiting for a card.'` All placeholder. |
| Curse's reel glyph | `src/app/run/SlotGlyph.tsx` | An arrow coming **down** onto a skull, so it reads distinctly from the Helmet's dome-over-skull with colour removed. Drawn here, not designed. |

## Behaviours only playing settles

- Whether the skull on a card **you are holding** reads as *yours* rather than as something you were
  dealt. The dealt-skull face is reused exactly (AC4's requirement). The mockup's dashed red edge on
  a cursed card was **not** built — no CSS file was in this contract's declared file set. Say if you
  want it.
- Whether arming Curse and then marking feels like **one action or two**: two taps in the loadout
  panel to spend, then one on the card. Compare with how a Cheat feels.
- Whether the **wasted-Curse** case reads as friction or as a feel-bad — cursing into a trick whose
  Quarry card turns out to already be skulled.

## Verification

- `npm run typecheck` — clean.
- Scoped Vitest across `src/warCouncil`, `src/hunt`, `src/sim`, `src/app/warCouncil`:
  **`Test Files 170 passed (170)` / `Tests 2047 passed (2047)`**.
- `npx prettier --check` on every changed file — clean after one `--write` pass.
- Pure-core boundary grep over `src/hunt`, `src/warCouncil`, `src/sim` for `from 'react'`, `window.`,
  `document.`, `localStorage` — **zero hits**.
- Storage boundary — the only `globalThis.localStorage` hits are the two sanctioned ones in
  `src/persistence/browserStorage.ts`. This contract persists nothing new.
- Every touched file measured with `(Get-Content <path>).Count` — all **≤ 400**. Tightest:
  `src/hunt/consumables.ts` 398, `src/hunt/index.ts` 397, `src/hunt/buffTemplates.ts` 396. The next
  ticket to touch any of those three will breach and should plan a split.
- `npm run lint`, `npm test` (unfiltered) and `npm run build` are the central QA pass's, not run here.

## For future contributors

**`skullsOn(round)` is the single place a dealt skull and a player's curse are read as one.** If you
are asking "is this a skull trick" or "does this card show a skull", call it. Six readers
deliberately do not — `cpuPlayer`'s card choice, `suitShape`'s Quarry-shape readout in
`WarCouncilTable`, and three `suitShape` calls in `sim/skilledCardPlay.ts` — because they reason
about the Quarry's own dealt skulls. Each carries the comment saying so.

One known gap, left deliberately: the felt's **held trick reveal** renders from the state *after*
the trick resolved, and `playCard` has already lifted the mark by then (AC7), so a cursed card does
not show its skull in that reveal. The resolution screen's own `skulledInTrick` is built from the
pre-play state and **does** carry it.

## Note on the Timebomb

The Timebomb was removed by DLR-166 before this ticket ran. `plan.md` was written when it was still
on disk and cites it repeatedly as the pattern to mirror — that code no longer exists. Curse's
targeting surface was built on its own terms from the plan's spec and the mockup, using the live
`discardSelecting` hand-tap precedent. **No part of the Timebomb was resurrected**, and the
`TimebombLive` refusal the plan expected to pair with does not exist: `CurseLive` refuses only a
second Curse.
