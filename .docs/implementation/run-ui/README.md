# Run verdict and shop UI — `src/app/run/`

**Status:** implemented
**Built by:** DLR-82, DLR-84

## Responsibility

The two full-viewport surfaces the run layer owns, and every user-visible string it produces.

- **The verdict** (DLR-82) — shown whenever a fight or the run resolves: a headline, a supporting
  line, the deciding hand's trick split as a bar row, the carried health and coins, the run
  position, and the forward controls.
- **The shop** (DLR-84) — reached by choice from the verdict: who is coming next, the purse, two
  priced purchases with a stated reason under any that cannot be made, and one control that leaves
  for the next fight.

It also owns the "Fight 2 of 3" readout the card layer renders in its status band, and the
`NEXT_FIGHT_LABEL` the shop's leave button now carries.

The module exists because of a play session. The terminal state before DLR-82 was a
`<p role="status">` sentence inside a tally table on the felt, with no control on it — visually
near-identical to the ordinary between-hands panel. The developer's note was that *"the player
didn't know when she beat the opponent or lose"*. The fix taken is a change of **channel** — a
distinct full-screen surface with a headline — rather than a change of wording, because rewording a
sentence in the same place would not fix "did not notice it".

**This module computes nothing.** Every figure, every refusal and every branch arrives as a prop
from `App.tsx`.

## Key types & exports

| Export                                                    | Purpose                                                                                                                                                                              | File           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `RunOutcomePanel` (default)                               | The verdict surface. Three distinguishable states plus the warned variant; renders what it is handed                                                                                  | `RunOutcomePanel.tsx` |
| `TrickTally`                                              | `{ taken: number; lost: number }` — the deciding hand's trick split, as two counts                                                                                                    | `RunOutcomePanel.tsx` |
| `runProgressText(index, count)`                           | 0-based index in, 1-based fight number out: `(0, 3)` → `'Fight 1 of 3'`. Read by `App.tsx` for the status band, the shop, and by the panel for its own position line                  | `runLabels.ts` |
| `runHeadline(outcome)`                                    | `FIGHT WON` / `YOU WIN` / `YOU LOSE`. An exhaustive `switch`, not a `Record` — a `Record` would need an unreachable entry to stay total                                                | `runLabels.ts` |
| `runVerdictDetail(outcome, index, count, carried)`        | The supporting line: where the run stands, and what health is carried into the next fight                                                                                            | `runLabels.ts` |
| `tricksTakenText(taken, lost)`                            | The bar row's accessible name — states both figures, so the split never depends on colour                                                                                            | `runLabels.ts` |
| `unspentCoinsText(coins)`                                 | The warning sentence, naming the balance being walked past. Decides only the **words** — `canBuyAnything` decides whether to warn (DLR-84)                                            | `runLabels.ts` |
| `CONTINUE_LABEL`, `SHOP_LABEL`                            | The verdict's two forward controls. The shop is **opt-in** (DLR-84)                                                                                                                  | `runLabels.ts` |
| `VISIT_SHOP_LABEL`, `CONTINUE_ANYWAY_LABEL`               | The warning's own pair. All four must differ — a component test tells the warned verdict from the plain one by button name (DLR-84)                                                   | `runLabels.ts` |
| `TRICKS_TAKEN_LABEL`, `CARRIED_HEALTH_LABEL`, `NEXT_FIGHT_LABEL`, `NEW_RUN_LABEL` | The fixed strings. `NEXT_FIGHT_LABEL` was **re-sited to the shop's leave button** by DLR-84 — same value, new consumer                         | `runLabels.ts` |
| `ShopPanel` (default)                                     | The shop surface. Maps `SHOP_ITEMS`, reads a `refusals` record, fires two callbacks (DLR-84)                                                                                          | `ShopPanel.tsx` |
| `SHOP_ITEM_NAME`, `SHOP_ITEM_BLURB`, `PURCHASE_REFUSAL_MESSAGE` | The catalogue's copy and the three refusal sentences. All three `Record`s are **total over their union**, so a new item or reason code is a compile error here (DLR-84)          | `shopLabels.ts` |
| `priceText`, `shopItemAccessibleName`, `nextOpponentText` | Prices read from `priceOf` and never quoted; the accessible name folds in the refusal; the opponent line reads sensibly with an `undefined` name (DLR-84)                              | `shopLabels.ts` |
| `SHOP_TITLE`, `SHOP_COINS_LABEL`, `SHOP_HEALTH_LABEL`, `SHOP_SLOTS_LABEL`, `SHOP_PURSE_GROUP_LABEL`, `SHOP_NOTHING_TO_BUY_HINT` | The shop's fixed strings (DLR-84)                                                          | `shopLabels.ts` |

**All copy in both files is placeholder — the developer's to rewrite**, marked as such in each
file's header.

## How it works

- [The verdict panel](verdict-panel.md) — the three outcomes and how they read without colour, the
  `Continue` / `Shop` pair and why the shop is opt-in, the unspent-coin warning as an in-place swap
  rather than a modal, the grouped trick bars and why they cannot be chronological, and the shell
  (DLR-82, DLR-84).
- [The shop screen](shop-screen.md) — why it computes nothing and what the `refusals` prop buys, the
  three ways a refusal reads, the purse row, why no price is ever a literal, and the keyboard
  contract (DLR-84).

## Rules & invariants enforced

- **Neither panel computes anything.** `outcome`, `canContinue`, `carriedHealth`, `coins`,
  `warning`, `refusals`, the counts and the tallies are all props. The only local expressions are
  the verdict attribute string and the bar array built from two counts.
- **No rule is re-derived at a call site.** The shop's disabled controls read the same `refusalFor`
  result that `buyFromShop` throws on and that `canBuyAnything` folds — one predicate, four readers.
  See [../hunt/coins-and-the-shop.md](../hunt/coins-and-the-shop.md).
- **No effect, no timer, no listener** anywhere in the module — every control is a plain `onClick`,
  and the two `Escape` handlers are `onKeyDown` on elements React already owns. The warning is
  deliberately an in-place swap rather than a modal precisely so it needs no focus trap and no
  document-level key listener.
- **All copy lives in `runLabels.ts` / `shopLabels.ts`**, never inline in a component, matching
  `warCouncil/labels.ts`'s convention. Each surface owns its own file, so the felt and the shop can
  be reworded independently.
- **No tuning value is quoted.** Prices come from `priceOf`, the heal figure is interpolated from
  `HEAL_HEALTH_RESTORED`; a final-verification grep guards it.
- **No `100vh` / `100vw`** anywhere in `run.css` or `shop.css`; a final-verification grep guards it.
- **A state never reads in colour alone** — the refused purchase card is dashed-edged as well as
  dimmed, the warning is a dashed bracket, and a lost trick bar is hatched and outlined as well as
  red.
- Component tests query by **accessible role and label** (`getByRole('button', { name })`,
  `getByRole('group', { name })`), per this project's testing posture. No `data-testid` exists here.
- File sizes: `run.css` 173, `RunOutcomePanel.tsx` 155, `shop.css` 148, `ShopPanel.tsx` 127,
  `runLabels.ts` 77, `shopLabels.ts` 56 — all far under the 400-line budget.

## Deferred / not yet implemented

- **The trick bars are not in play order** — the engine keeps no per-trick history. See
  [the verdict panel](verdict-panel.md).
- **The bars show the deciding hand only**, not the whole fight; no per-fight trick accumulator
  exists.
- **The felt's hand tally does not carry onto the verdict.** DLR-82 deleted the terminal panel that
  showed health lost and health dealt; only the trick split moved across. If those two figures are
  wanted here they join `TrickTally` — flagged in the contract as the developer's call.
- **All copy is placeholder**, across both surfaces, and every `clamp()` bound and hue in both
  stylesheets is an unchosen tuning value.
- **The shop names "The Monarch" on every fight.** `QUARRY_CHARACTERS` holds one entry; DLR-85 owns
  the roster and must update this module's copy in the same change — `nextOpponentText` already
  handles an `undefined` name, so no signature changes.
- **DLR-85's run map has no home yet, but it has a host.** DLR-84 settled the overlap the two
  tickets share: the map mounts into `ShopPanel`, reached by the same `Shop` control, which that
  ticket may widen or re-label. Nothing here draws a path or names a roster.
- **Whether the warning is a safety net or a nag** is unmeasured. At a 1-coin payout against 1-coin
  prices it fires on every visit where anything is unspent. A threshold, or removing it, is one line
  in `App.tsx`.
- **Whether `Escape` in the shop should advance the run** — it currently does, because it is wired
  to the same `onLeave` as the leave button. The developer's call.
- **Whether a full surface beats an overlay** over the frozen felt is a feel question the contract
  answered one way (full surface, because the observation was "she did not notice") and left open to
  revision.
- **No animation or transition** into either surface — each replaces what preceded it immediately.
