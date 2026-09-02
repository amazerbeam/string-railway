Part of [the headless run simulator](README.md).

# What a run records, and what the report prints

`HandReport` and `RunReport` (`types.ts`) are cumulative: a field added to answer one question stays
so the next question can reuse it. Nothing here is ever renamed or repurposed — `report.test.ts` and
every captured batch depend on the existing shape.

## The per-trick trace

Added 2026-09-02, and the reason the four defects in [the skilled
strategy](the-skilled-strategy.md) were findable at all: before it, a report could say a hand dealt
9 damage but not which cards produced it or whether they could ever have paid.

`HandReport.trickDamage` holds one `TrickDamageRecord` per resolved trick, in order:

| Field                                                     | What it answers                                                                                                                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cards`, `trumpSuit`, `playerLed`                         | what was actually played, in lead-then-follow order, with the lead's skull mark                                                                                            |
| `intent`                                                  | the read taken **before** anything was armed — the suit expected to decide the trick, whether the plan was to take or lose it, and the `suitShape` counts behind that call |
| `held`                                                    | every activatable card in the pile as the window opened, before any of it was armed                                                                                        |
| `base`, `buffDamage`, `buffMult`, `overlapBonus`, `dealt` | the damage equation's own terms, mirroring `TrickDamage` in `src/warCouncil/streak.ts`                                                                                     |
| `total`, `roll`, `potApplied`                             | the streak after the trick, and the pot if it was cashed                                                                                                                   |

`intent` and `held` are **cleared as each trick is recorded**. A window does not open for every
trick — `discardWindowOpen` is false while an ability prompt is pending — and without the reset the
previous trick's read stayed attached to the next one, which read as the strategy predicting the
wrong seat on 27% of tricks when it had made no prediction at all. That was a recording defect, not
a strategy one, and it is the reason the reset carries a comment rather than being tidied away.

Joining `trickDamage` to `buffFireOutcomes` on `trick` / `trickOfHand` gives the whole picture of a
trick: what was held, what was armed, what paid, and what the arithmetic produced.

## The other cumulative fields

- **`trickOutcomes`** — the four outcomes counted, plus `hurtLeading` / `hurtFollowing`.
  `damageToPlayer` says what a hand cost; this says which outcome cost it and whether the player was
  leading blind or following with the mark face up. The split is what showed leading to be where
  health goes: 13,324 hurt tricks while leading against 8,560 while following.
- **`potsApplied`** — every pot dealt this hand. `damageToQuarry` cannot distinguish one 36-damage
  cash from six 6-damage ones, which is exactly the question the roll-over bet asks.
- **`cheatMoments`** — `forced` / `escapable` / `held` / `taken`. Counted in the driver from
  `forcedHurt` and `cheatEscape` **independently of the seated policy**, since a count taken through
  the policy would only ever measure that policy. Counted _before_ `runCheatPlay`, which `continue`s
  when it spends one — counting after silently drops every moment the Cheat actually worked.
- **`playerHealthAtStart` / `maxPlayerHealthAtStart`** — what a hand's cost was spent out of. The
  difference between a hand costing 4 of 20 and 4 of 4.
- **`buffsAcquired`, `coinsSpentOnPulls`, `coinsSpentByItem`, `combines`** (`RunReport`) — where the
  money went. All measured as the delta the engine actually applied, never re-derived from a price
  table or from the machine's posted odds.

## What the report adds

`formatSummary` gained four sections. **Tricks** prints the banked/hurt split with the seat
breakdown. **The Cheat** prints the four `cheatMoments` totals, whose gaps say whether the card is
rare, useless, or simply never owned. **Card supply** prints cards won, cards left unspent, combines,
the share of condition cards that paid — broken down per family, since Taker, Feeder and Sidestep
answer to different conditions — and how many cards fired on one trick, which is a different and
separately rewarded question from how many fired in a hand, because the Overlap Bonus pays per extra
card on a single trick. **The pot** prints pots cashed per hand, pot size, and the roll standing at
each hand's end.

Cheat and Timebomb are excluded from the paid-share figures: neither carries a condition, so neither
can ever read as paid, and counting them would report two cards as permanent failures.

## Two measurement defects fixed in the same pass

Both had silently capped every figure recorded before 2026-09-02.

- **The policies rationed themselves against action points, which have been off since 2026-08-25.**
  `chooseBuffs` budgeted through `apCostOf`'s raw price table against a pool of `STARTING_AP`, while
  the engine charges nothing and refuses nothing. Nothing could arm more than about six cards on a
  trick — measured, the player reached 196 activatable cards, every one reporting no refusal, and
  still fired six. `apBudgetCostOf` reads through `apCostFor` instead, so flipping `AP_ENABLED` back
  on restores the rationing with no edit.
- **`SHOP_PURCHASE_ORDER` was hand-written and had gone stale twice** — it bought Swan and Witch
  rungs, off the shelf since 2026-09-01, and had never heard of the max-health purchase added
  2026-09-02. `refusalFor` stays total over `ShopItem`, so an unshelved item is still buyable by a
  caller and nothing failed. It now derives from `SHOP_ITEMS`, so the next shelf change reaches every
  policy for free.
