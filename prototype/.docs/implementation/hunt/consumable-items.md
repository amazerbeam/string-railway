Part of [Hunt](README.md).

DLR-126 is the ticket that made a consumable a consumable. Everything DLR-108 built applies equally
to a Cheat and a Ward — a between-tricks window, a tiered AP price, three refusal codes,
and DLR-114's two-tap poise/commit. None of it makes a card **one-shot**. Before this ticket,
activating a Ward spent 2 AP, recorded its id in `activatedThisTrick`, had that record wiped by
`openBuffWindow` at the next trick boundary, and **did nothing at all** — the card stayed in
`RunState.buffs` forever and could be re-bought every trick, indefinitely, for as long as the pool
held out.

All five consumables already had a `BuffKind`, an `Activated` cadence in `BUFF_CADENCE`, a price row
in `CONSUMABLE_AP_COST`, and a label and a one-line description in `buffLabels.ts`. What none of them
had was an **effect** or any way to be **spent**.

## "Consumable" means two different things in this codebase — deliberately

`buffCosts.ts` has a `BuffConsumableKind` union and a `CONSUMABLE_AP_COST` table that is a **pricing
bucket** — it means "priced off the condition-family formula", nothing more.

`consumables.ts`'s `ConsumableItemKind` covers **five**: `Ward`, `Puppeteer`, `SecondThoughts`,
`Foresight`, `Spyglass`. That is the narrower thing — an item **held until used, then gone**. The
activated cards — Cheat, Shield and Curse — stay a **separate, closed union of their own**
(`ActivatedItemKind`): each is `Activated`, and each **arms felt state at the spend** — a Cheat sets
`cheatTricksRemaining`, `activateShield` raises `shieldHearts`, a Curse sets `curseArmedBuff` — which
is orthogonal to whether the card *also* leaves the pile. Before DLR-142 (2026-08-25) it never did:
`isConsumableItem` answered `false` for all of them unconditionally, so one could be spammed every
trick for as long as the pile held a copy. **DLR-142 makes it a developer-owned choice, defaulted
`true`** — see `ACTIVATED_CARD_SINGLE_USE` below.

The two unions are not a duplication to reconcile. They answer different questions, and
`isConsumableItem` in `consumables.ts` is the one that decides whether an activation also spends the
card. A test in `consumables.test.ts` pins every one of the five as priced by `apCostOf`, so the
narrower set can never drift out of the wider one.

## `ACTIVATED_CARD_SINGLE_USE` — DLR-142, a per-card revert switch

```ts
type ActivatedItemKind = typeof BuffKind.Cheat | typeof BuffKind.Shield | typeof BuffKind.Curse

export const ACTIVATED_CARD_SINGLE_USE: Readonly<Record<ActivatedItemKind, boolean>> = {
  [BuffKind.Cheat]: true,
  [BuffKind.Shield]: true,
  [BuffKind.Curse]: true,
}
```

`isConsumableItem(buff)` returns `true` for the five DLR-111 items (`isConsumableItemKind`,
unchanged) **OR** for Cheat / Shield / Curse when this table says so for that kind. The table is
deliberately **not** a merge into `ConsumableItemKind` — the developer rejected that shape because
reverting one card would then mean editing five separate tables in lock-step
(`CONSUMABLE_TIMING`, `CONSUMABLE_EFFECT_LIVE`, `ConsumableEffect`, `consumableEffectOf`'s switch,
plus the union itself). Reverting one card to "stays in the pile" is one line — `false` in this
table — and nothing else in the codebase changes; `isConsumableItem` is the table's only reader.
This follows the same pattern `AP_REFRESH_CADENCE` (`apConfig.ts`) already sets for a
developer-owned, easily-reversed behavioural switch.

> **The Wildcard is not in this table**, and that is not an omission. It is spent on the Manage
> Buffs screen rather than on the felt (`isShopOnlyBuff`, `BuffActivationRefusal.ShopOnly`), and
> `spendWildcard` removes it from the pile itself.

`spendConsumable`'s own guard was changed in DLR-142, from `isConsumableItemKind(found.kind)` to
`isConsumableItem(found)` — a fix discovered mid-implementation, not planned up front. Before the
fix, `isConsumableItem` said "yes, spend it" for the activated cards while `spendConsumable`'s guard
still said "no", so calling it on one threw `RangeError` instead of removing the card. The two must
read the same predicate, since one gates the call to the other.

## `CONDITION_CARD_SINGLE_USE` — DLR-145, the same switch for the three condition families

```ts
export const CONDITION_CARD_SINGLE_USE: Readonly<Record<ConsumedConditionKind, boolean>> = {
  [BuffKind.SuitHigh]: true,
  [BuffKind.SuitLow]: true,
  [BuffKind.SkullLow]: true,
}
```

A **sibling** of `ACTIVATED_CARD_SINGLE_USE`, not an extension of it, and not a merge into
`ConsumableItemKind`. The reason is the distinction at the top of this file: those five items have a
**timing window and an effect**, and a condition card has neither — it has a **trigger**. So neither
`CONSUMABLE_TIMING` nor `CONSUMABLE_EFFECT_LIVE` admits Suit High, Suit Low or Skull Low, and
`consumableTimingOf` and `consumableEffectOf` still **throw** on one, which is correct: nothing calls
them for a condition card.

`isConsumableItem` is now three clauses, and it is still the only reader of all three tables:

1. `true` for the five DLR-111 items (`isConsumableItemKind`);
2. otherwise `ACTIVATED_CARD_SINGLE_USE[kind]` for Cheat / Shield / Curse;
3. otherwise `CONDITION_CARD_SINGLE_USE[kind]` for Suit High / Suit Low / Skull Low.

`false` for every other condition family — the eight DLR-145 cut from the mintable pool are still
declared and still evaluated, and if one were ever minted again it would behave exactly as it always
did. Reverting one card to "stays in the pile" is one `false`, as above.

`spendConsumable` needed **no** change: it gates on `isConsumableItem`, which now admits the three.

**This is the change that turns a rented buff into a spent one**, and it is the whole point of the
Version 6 pass. Before it, a Suit High card was re-activated and re-paid every trick and the correct play was
to dump the whole action-point pool every trick, because the pool came back before the next one.
Action points went off in the same ticket for exactly that reason — see
[action points](action-points.md#action-points-are-switched-off--dlr-145-2026-08-25). The two are
coherent only together.

**A consumed card still fires on the trick it was spent on**, and that does not follow from this
table on its own — it needed `BuffActivationState.spentThisTrick`, without which a spent card pays
nothing at all, silently. See
[buff activation](buff-activation-and-ap-costs.md#spentthistrick--how-a-consumed-card-still-gets-paid--dlr-145-2026-08-25).

## `consumables.ts` is a leaf

It imports `./buffs` and `./types` and nothing else. In particular it does **not** import
`./buffActivation`, which imports it — the edge runs one way, so activation knows what a consumable
is and a consumable knows nothing about activation. `activateFromPile` therefore lives in
`buffActivation.ts` rather than beside `spendConsumable`, which is the only thing keeping the two
modules acyclic. A verification grep in the contract's final phase checks the import direction
directly.

## What each of the five does, and where the numbers came from

Every ladder is transcribed from `v1-buff-card-list.md` → *Utilities, consumables and activated
cards*, rows 1–5. None was chosen in code. Each table has exactly **one** production reader, so one
card has exactly one answer.

| Card | Effect | Bronze / Silver / Gold | Table |
|---|---|---|---|
| Ward | absorbs up to N on the next hit, then breaks regardless | 1 / 3 / 5 damage | `WARD_ABSORPTION` |
| Puppeteer | the Quarry's next legal move is player-chosen | 1 card, single tier | `PUPPETEER_FORCED_CARDS` |
| Second Thoughts | extra discard charges this fight | +1 / +2 / +3 | `SECOND_THOUGHTS_CHARGES` |
| Foresight | peek the draw pile | 1 / 3 / 5 cards | `FORESIGHT_CARDS` |
| Spyglass | rule out N candidates of a chosen suit | 1 / 2 / 3 | `SPYGLASS_CANDIDATES` |

`consumableEffectOf` returns a discriminated `ConsumableEffect` tagged by the `BuffKind` itself
rather than by a second parallel string union — so a consumable has one vocabulary and a reader
cannot hold a `kind` from one union while switching on the other. It is a total `switch` behind a
throwing `isConsumableItemKind` guard, so a sixth consumable added to `CONSUMABLE_TIMING` fails to
compile there rather than falling through to `undefined`.

**Only two of the five actually fire.** `CONSUMABLE_EFFECT_LIVE` is `true` for Ward and Second
Thoughts and `false` for Puppeteer, Foresight and Spyglass, whose effects each need a player-choice
surface no screen provides — offering the Quarry's legal moves, revealing N of the draw pile,
eliminating N candidates of a suit chosen at use time. The ticket that builds each surface flips one
boolean and changes nothing else.

## The counted inventory is a view, not a store

AC1 asked for consumables owned as a counted inventory — "2x Protect 3" — *distinct from* the
equipped buff pile. `consumableStacks(buffs)` derives that from `RunState.buffs` by grouping on
`(kind, tier)`, dropping every non-consumable, and preserving pile order by first appearance.

A genuinely separate store was rejected: it would fork ownership in two, and `activatableBuffs` —
the documented cure for the `Unassigned` trap that has been tripped three times — would only ever
see half of it. A bronze and a gold Ward are **two** stacks rather than one, because tier is what
the count is of; merging them would report "2x Ward" for two cards that absorb different amounts.

## Spending: one call, so AP and the card cannot diverge

`activateFromPile(state, buffs, buff, windowOpen)` in `buffActivation.ts` calls `activateBuff` first
— so a refused activation throws before the pile is touched and neither half lands — then returns
`{ activation, buffs }` with the card removed **only** when `isConsumableItem` is true. Since
DLR-142, that now includes a Cheat, a Shield or a Curse by default, and since DLR-145 a Suit High, a
Suit Low or a Skull Low card too — see `ACTIVATED_CARD_SINGLE_USE` and `CONDITION_CARD_SINGLE_USE` above for
the two toggles and how to revert one card. On the consumable branch `activateFromPile` also appends
the card to `activation.spentThisTrick`, which is what keeps it firing at this trick's resolution
after it has left the pile.

The pair-return is the point. Leaving the caller to make two calls has a silent and permanent
failure mode — AP spent, card kept, and the card back on the rail next trick — which is exactly the
class of bug `activateBuff`'s throw-rather-than-no-op contract already exists to prevent.

`spendConsumable` removes by **object identity**, not by `(kind, tier)`, so spending one of two
bronze Wards leaves the other's id in the pile. It throws when the id is absent or names a
non-consumable rather than returning the pile unchanged.

## `NoEffectYet` — a fourth refusal, read first

`BuffActivationRefusal` gained `NoEffectYet`, and `buffActivationRefusalFor` reads it **before**
`WindowClosed`. The order is deliberate: `NoEffectYet` is true of the **card**, not of the felt, so a
Foresight is refused even on a wide-open felt with a full pool — opening the window would not make
it usable. The three DLR-108 refusals keep their relative order below it.

`BuffActivationStock` gained `effectLive`, set by `buffActivationStockFor` from
`consumableEffectIsLive`, which answers `true` for **every** non-consumable — `NoEffectYet` is a
statement about unbuilt consumable surfaces only, and a Cheat's availability is still decided by
DLR-108's three refusals alone.

**This is not a redundancy check.** A Ward spent on a trick that turns out to be safe is a
legitimate player mistake and is allowed: no consumable is ever *provably* redundant at the moment
of use, so refusing would require the engine to predict the trick.

The same change removed a real duplication. `roundUiState.ts`'s `buffActivationStock` used to
restate the four-field stock literal rather than calling `buffActivationStockFor`, so a field added
to `BuffActivationStock` needed the same edit in two places and could be given two different
answers. It now delegates, and the felt's only contribution is the window.

## Timing — four cards share the discard window, one does not

`CONSUMABLE_TIMING` maps four of the five to `ConsumableTiming.BetweenTricks`, which is
`discardWindowOpen`'s existing window and needs no new gate.

**Puppeteer is `ConsumableTiming.BeforeOwnCard`** — after the Quarry has led and before the player
commits their own card, because there are no legal moves to steer until they have led.
`discardWindowOpen` requires `currentTrick.length === 0`, which is the opposite condition, so **no
reducer opens Puppeteer's window today**. The table states the requirement rather than forcing
Puppeteer through a window where it would be inert; `NoEffectYet` keeps it unspendable meanwhile.

## Ward on the encounter — a second guard, spent before blue hearts

`EncounterState` gained `wardAbsorbs: Damage`, seeded `NO_WARD` by `startEncounter` — which is what
clears it at an encounter boundary with no explicit clear step to forget, the same argument
`shieldHearts` already makes. It survives a hand; it does
not survive a fight.

`activateWard` mirrors `activateShield` verbatim: it **SETS** the tier's figure and never adds, sets
downward too (a bronze Ward after a gold one leaves 1, not 5), returns the encounter unchanged when
it is already resolved, and never throws for any `BuffTier`. The copied rule is deliberate — two
adjacent guards with opposite stacking rules is exactly the pair a later edit "makes consistent" by
mistake.

Inside `applyDamage` — the module's single damage funnel — the order is **Ward → blue hearts → red
health**. A Ward breaks on contact regardless of how much it ate; a blue heart is spent one point at
a time and survives with a remainder. Spending the perishable pool first is the only order under
which a Ward is ever worth more than the heart behind it. A hit of 4 against a bronze Ward and 2
blue hearts costs 1 red health and leaves both guards empty.

`absorbWithWard` is the arithmetic, mirroring `absorbWithShield` down to its two guards against a
non-finite or negative input, and returning **no** remaining-guard field — modelling a remainder
would invite a caller to carry one forward.

The Ward breaks by **taking part in a hit**, not by absorbing anything in particular: a hit at or
below N breaks it just as surely as one above N. A zero-damage event and a `quarryDown` event are
not hits taken and leave it standing, the same carve-out blue hearts already have.

**DLR-110's payout rule is unchanged.** A hit a Ward fully absorbed leaves red health untouched, so
`pendingApplyPayout` survived; a partially-absorbed hit that still dropped red health destroyed it
exactly as before.

## The spend survives the hand

`App.tsx` remounts the felt per hand on `key={hand}`, so a spend recorded only in `RoundUiState`
would resurrect the card. It rides up instead: `WarCouncilRoundResult` gained a **required** `buffs`
field — required so the compiler enumerates both `onComplete({…})` construction sites in
`WarCouncilRound.tsx` rather than letting one silently drop a spent card — and `recordEncounter`
gained an **optional ninth parameter** `buffs`, defaulted to `undefined` (keep `run.buffs`) so all
52 existing call sites are unchanged. `App.handleComplete` is the only caller that passes it.

`nextBuffId` is deliberately **not** decremented by a spend. Ids are minted forward-only; reissuing
a spent card's id would make two different cards indistinguishable to `activatedThisTrick` and
`firedThisHand`.

`WarCouncilMountProps.buffs`' own docblock used to say the pile "does NOT come back on
`WarCouncilRoundResult` — a hand spends action points, not cards". That was true, and this ticket
made it false; the comment was corrected rather than left.

## The known defect, and why it was not fixed here

**Ward's silver and gold tiers are nearly indistinguishable in play, and all three rows ship
anyway.** DLR-111 recommended deleting silver and gold because `DAMAGE_PER_HIT = 1` makes absorbing
1, 3 and 5 the same outcome. DLR-126 refuted the premise on the strength of a Timebomb detonation
making a player hit 3 / 5 / 7 — and **that refutation is gone with the mechanic** (DLR-166).

Today `streak.ts` computes `damageToPlayer` as `trickHit ? hitDamage : 0`, where `hitDamage` is
`QUARRY_TREASURE_DAMAGE` (2) on a Defeat that carried a Treasure and `DAMAGE_PER_HIT` (1) otherwise.
So a player hit is **1 or 2**, and two hit sizes still do not separate three Ward rungs. All three
rows ship because nothing has been decided about them, not because they are distinguishable.
`DAMAGE_PER_HIT` was not touched; it moves the whole game.

What remains open is a tuning question, not an engine one: the distinguishing case is
*self-inflicted*, so unless the Quarry gains a multi-point hit, silver and gold Ward stay close to
dead content.

## Nothing player-reachable mints a consumable yet

`mintGrants` generates none of the five, and neither does the opening pile: **`buffTemplates.ts` has
no Ward row at all**, so the five consumables are absent from the `BUFF_TEMPLATES` pool — 73
templates when this was written, **19 today** (16 condition plus 3 activated: Cheat, the Wildcard
and Curse) — that both the reel and — since
DLR-135, 2026-08-25 — the run's opening draw pull from. So no path a player can reach produces a
consumable, and not one line of this page is exercised by playing the game today.

> **The conclusion is unchanged; the reason has moved, 2026-08-25.** This paragraph used to end
> "`seedStartingBuffPile` mints only `Unassigned`", and that is no longer true — a fresh run opens
> holding four real bronze cards. The five consumables stay unreachable for a **different** reason:
> they have no template in the pool the draw reads. Filling that pool is what would change it, not
> filling the pile.

That is also the answer to **DLR-112's AC6**, which this ticket was asked to resolve: **yes,
consumables draw through the same reel/tier mechanism as persistent buffs, and DLR-112 needs no
change to accommodate them.** A consumable is an ordinary `Buff` — id, kind, tier, condition, reward
— held in the same `RunState.buffs`, carrying a real bronze/silver/gold ladder for a tiered reel to
land on. Puppeteer is single-tier in the source and a reel handles that by minting bronze. The
counted inventory is a derived view rather than a second store, so there is nothing for the draw
mechanism to learn. What separates a consumable from a persistent buff is what happens at the
**spend**, not at the **draw**.
