# DLR-126 — Engine: consumable-item activation flow

Plan and contract: [`plan.md`](./plan.md) · [`tasks.md`](./tasks.md) in this folder.

## What already existed, and what was actually built

The sprint-run preflight flagged this ticket as possibly already done by **DLR-108**. It was
checked before anything was written, and the flag was half right.

**Already there, reused unchanged:** the entire *generic* activation flow — `activateBuff`, the
`WindowClosed → AlreadyActive → InsufficientAp` refusal order, `apCostOf` as a derived two-table
lookup, the per-trick (`openBuffWindow`) and per-hand (`refreshBuffsForNewHand`) resets, and
DLR-114's two-tap poise/commit UI. None of it was rebuilt and no parallel mechanism was added.

**Not there at all:** anything that makes a consumable a *consumable*. All five had a `BuffKind`, an
`Activated` cadence, an AP price and UI copy — 20 references outside tests, every one a name, a
price, a cadence row or a label, and **zero behaviour**. Before this change, activating a Ward spent
2 AP, recorded its id for the trick, had that record wiped at the next trick boundary, and did
nothing; the card stayed in the pile forever and could be re-bought every trick, indefinitely.

So this change adds: a new leaf module `src/hunt/consumables.ts` (the five one-shot kinds, each
one's timing window, the four tier ladders transcribed from `v1-buff-card-list.md`, a typed
`ConsumableEffect`, the AC1 counted-stack view, `spendConsumable`, and Ward's absorption
arithmetic); `activateFromPile`, the single call that spends AP **and** removes the card so the two
cannot diverge; a `NoEffectYet` refusal; **Ward** wired live on a new `EncounterState.wardAbsorbs`,
absorbed inside `applyDamage` ahead of blue hearts; **Second Thoughts** wired live onto the discard
budget; and the spend riding up through `WarCouncilRoundResult.buffs` → `recordEncounter`'s new
optional ninth parameter → `RunState.buffs`, so it survives the felt's per-hand remount.

**AC4 is partially delivered, by design.** Puppeteer, Foresight and Spyglass ship with descriptor,
price, timing and a refusal, but no effect — each needs a player-choice surface no screen provides.
`CONSUMABLE_EFFECT_LIVE` is one boolean per card; the ticket that builds each surface flips its row
and changes nothing else.

**AC5 is answered:** yes, consumables draw through the same reel/tier mechanism as persistent buffs,
and DLR-112 needs no change to accommodate them. A consumable is an ordinary `Buff` with a real
bronze/silver/gold ladder, held in the same `RunState.buffs`; the counted "2x Protect 3" inventory is
a *derived view*, not a second store. What separates a consumable from a persistent buff is what
happens at the **spend**, not at the **draw** — and the draw is all DLR-112 owns.

## The Ward decision — kept all three tiers, retuned nothing

DLR-111 recommended deleting Ward's silver and gold rows because `DAMAGE_PER_HIT = 1` makes
absorbing 1, 3 and 5 the same outcome. **That premise does not survive contact with the code.**
`src/warCouncil/bank.ts:258` computes `damageToPlayer = (trickHit ? DAMAGE_PER_HIT : 0) +
trick.timebombToPlayer`, and `TIMEBOMB_DAMAGE`'s player column is **2 / 4 / 6** — so a player hit is
1, **or 3 / 5 / 7 when a Timebomb detonates against them**. Silver and gold Ward are the only cards
in the game that cover those, and deleting them would remove the only answer to the biggest hit the
game can deal.

All three rows ship at the transcribed 1/3/5. **`DAMAGE_PER_HIT` was not touched** — it moves the
whole game.

**Still yours to decide:** the distinguishing case is *self-inflicted* — the player primed that
Timebomb. If the Quarry never deals a multi-point hit, silver and gold Ward are close to dead
content, and the fix is a wider damage spread or a retire, not a Ward retune. That is a tuning read,
now decidable on evidence rather than on an approximation.

## Decisions you own

- **Ward's silver and gold tiers** — see above.
- **`'Not usable yet.'`**, the `NoEffectYet` copy row. Placed because the `Record` type forces one,
  not because it was designed. Unreachable in play today. Copy judgement is yours.
- **Ward absorbs ahead of blue hearts.** A reading, not a transcription — no source document orders
  the two guards. The argument: a Ward breaks on contact and a blue heart does not, so spending the
  perishable pool first is the only order under which a Ward is worth more than the heart behind it.
- **Ward SETS its absorption, downward too**, mirroring `activateShield` rather than stacking. Two
  guards held at once is a costing question nobody has answered.
- **Redundant spends are allowed and consume the item.** No consumable is ever *provably* redundant
  at the moment of use, so refusing would require the engine to predict the trick.
- **Spending is irreversible in the engine.** The two-tap poise/commit is the whole of the
  reversibility, consistent with DLR-108's existing model.
- **Puppeteer's `BeforeOwnCard` window is declared but not opened.** No reducer provides a window
  after the Quarry has led and before the player commits. Whoever builds it owns that change.

## Verification

All four gates green, run at the finished state.

| Gate | Command | Result |
|---|---|---|
| Types | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Tests | `npm test` | **1765 passed / 1765, 133 files, 0 failed** (baseline 1702 / 131) |
| Build | `npm run build` | exit 0, `dist/` written, 148 modules |
| Format (scoped) | `npx prettier --check` over this contract's files | exit 0 |

Line-count ceiling, measured with `(Get-Content <path>).Count`: `App.tsx` 394, `roundUiState.ts`
393, `WarCouncilRound.tsx` 392, `consumables.ts` 325, `encounter.ts` 326, `buffActivation.ts` 200,
`buffHandlers.ts` 140. All within 400.

Purity boundary confirmed: no React import, DOM global or `Math.random()` call in `src/hunt/` or
`src/warCouncil/`, and `src/hunt/consumables.ts` imports only `./buffs` and `./types` — it does not
import `./buffActivation`, so the module edge stays one-way.

## What a browser would have checked, and why it could not

The browser pass is opt-in and was not requested for this run. It would also have proved nothing:
**no path player-facing today can mint a consumable.** `grep -c "BuffKind.Ward"
src/hunt/buffTemplates.ts` returns **0**, and `seedStartingBuffPile` mints only `Unassigned`
placeholders — so not one new code path is reachable by playing. It becomes reachable when DLR-112
lands.

Once a consumable can be minted, the eyes-on agenda is:

- the loadout panel lists it with its AP price and its tier;
- one tap poises the row, a second spends it, `Escape` drops the poise;
- the row **disappears** after the spend and does **not** return on the next trick or the next hand;
- a Foresight row reads `Not usable yet.` and cannot be committed at all;
- a Ward's absorption is visible on the health bars when the next hit lands, and the Ward is gone
  afterwards even if it swallowed the hit whole;
- a Second Thoughts visibly raises the discard counter.

## Note for future contributors

`activateFromPile` is the entry point the felt calls — **not** `activateBuff`, which spends AP
without touching the pile. Adding a sixth consumable needs four things, and the compiler enumerates
all four: a row in `CONSUMABLE_TIMING`, a row in `CONSUMABLE_EFFECT_LIVE`, a tier ladder, and a
`ConsumableEffect` arm.
