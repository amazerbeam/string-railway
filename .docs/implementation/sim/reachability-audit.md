Part of [the headless run simulator](README.md).

# The reachability audit — which cards the game declares against which a player can obtain

`reachability.ts` answers one question the rest of the codebase cannot: **does a card that exists in
code have any path into a player's hands?** It exists because that question kept being answered in a
comment, and a comment carried the wrong answer forward through six tickets.

It lives in `src/sim/` rather than in `src/hunt/` because reachability is a property of the **whole
run** — a card exists *and* some path mints it — and no single module owns both halves. `src/sim/` is
the only tree whose subject is the whole run.

## What it computes

A pure, data-only module: it builds no `RoundState`, drives no reducer, and calls no `rng`.

| Export | Answers |
|---|---|
| `mintableBuffKinds()` | every `BuffKind` some production path can put in the buff pile — derived from `BUFF_TEMPLATES` plus whatever `startRun()` actually seeds |
| `unreachableBuffKinds()` | its complement over `BuffKind`, less `Unassigned` |
| `unshelvedShopItems()` | every `ShopItem` the game still prices that `SHOP_ITEMS` does not offer |

Nothing is hand-listed. A family added to `BUFF_TEMPLATES` or an item returned to `SHOP_ITEMS` is
admitted automatically, with no edit here — which is the property that makes the audit worth
trusting a year from now. `Unassigned` is excluded throughout: it is `seedStartingBuffPile`'s
placeholder, filtered out of every offer by `activatableBuffs`, and it is not a card.

## What it measured, at 2026-08-24

**Eight of the game's twenty `BuffKind`s cannot be minted at all.**

| Reachable — 11 kinds | Unreachable — 8 kinds |
|---|---|
| Taker, Feeder, Mark of the *R*, Sidestep, Glutton, Hoarder, Unbloodied, Debt Collector, Keepsake, Miser, Cornered | Ward, Puppeteer, Second Thoughts, Foresight, Spyglass, **Cheat, Timebomb, Shield** |

`BUFF_TEMPLATES` holds exactly **71** templates and every one is a condition family. The seven
consumable/activated templates were deferred by DLR-112 to DLR-126; DLR-126 landed, answered the
question **affirmatively** — a consumable is an ordinary `Buff`, the draw mechanism needs no change —
and never came back to add them. `cheatBuff`, `timebombBuff` and `shieldBuff` have **zero production
callers**: DLR-107's migration of Cheat and Timebomb into the ordinary buff pile recorded that its
intermediate state would last "until the activation ticket and the UI ticket land", and DLR-108 and
DLR-114 both landed without finishing it.

**Four of the eight `ShopItem`s are off the shelf.** `SHOP_ITEMS` is `[ApCapacity, SwanTier,
WitchTier, Heal]`; `Cheat`, `Timebomb`, `BlastGuard` and `Whetstone` are still priced by `priceOf`,
still handled by `buyFromShop`, still tested, and unbuyable. Combined with `startRun()` seeding
`timebombCharges: 0`, `blastGuardHeld: false` and `whetstones: 0`, **no play path can produce a
Timebomb charge, a Blast Guard or a Whetstone.**

**A fresh run holds nothing it can activate.** `activatableBuffs(startRun().buffs).length` is `0` —
the four seeded cards are all `Unassigned`. The one activated card a player can reach is the **Cheat
slot**, and only because `RUN_STARTING_CHEATS` seeds one.

## Why the spec pins the gaps as *passing* assertions

`__tests__/reachability.test.ts` asserts that `unreachableBuffKinds()` **contains** `Ward`. That
reads as an endorsement and is the opposite of one: every such case carries a comment naming the gap,
the tickets behind it, and the decision that would clear it. The mechanism is DLR-125's, established
for `Keepsake` — a defect pinned by a test cannot be silently inherited, and closing the gap turns
the test red **at exactly the line that describes it**.

If one of these fails, the correct first assumption is that somebody closed a gap. Read the comment
on the failing line, confirm that is what happened, and update the expectation. Do not loosen the
assertion — that is the whole point of the file.

One case is a genuine identity rather than a restatement: `mintableBuffKinds().size +
unreachableBuffKinds().size + 1` equals the number of `BuffKind` values. The two sets partition the
union, so a kind added to the game cannot fall out of both and go uncounted.

## What it is for

The audit is half of the evidence behind DLR-120's finding that the game's 0-win result is an
**integration** problem before it is a balance one. The other half is
[the policy seam](the-policy-seam.md)'s measurement that 67–71% of hands are played with nothing
activatable at all, and that pulling every lever a run does grant moves the exchange by ~0.02 damage
a hand. Both are recorded in `.docs/game_rules/the-hunt.md`'s Known tensions; neither is a licence to
retune anything.
