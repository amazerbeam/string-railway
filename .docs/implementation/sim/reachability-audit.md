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

## What it measured, at 2026-08-24 (updated the same day by DLR-132)

**Six of the game's twenty `BuffKind`s cannot be minted at all — down from eight.**

| Reachable — 13 kinds | Unreachable — 6 kinds |
|---|---|
| Taker, Feeder, Mark of the *R*, Sidestep, Glutton, Hoarder, Unbloodied, Debt Collector, Keepsake, Miser, Cornered, **Cheat, Timebomb** | Ward, Puppeteer, Second Thoughts, Foresight, Spyglass, **Shield** |

`BUFF_TEMPLATES` holds **73** templates as of DLR-132 (71 condition families plus `ACTIVATED_TEMPLATES`'s
two activated cards) — up from 71. `mintFromTemplate`'s `form: 'activated'` branch delegates to
`cheatBuff`/`timebombBuff`, and both templates carry a positive slot weight on both machines
(`SLOT_FAMILY_WEIGHTS`), so both are drawable by a pull like any condition family. **`cheatBuff` and
`timebombBuff` now have production callers**: DLR-107's migration recorded that its intermediate
state — a representation nothing read — would last "until the activation ticket and the UI ticket
land"; DLR-132 is that ticket. The five remaining consumables (Ward, Puppeteer, Second Thoughts,
Foresight, Spyglass) and Shield are **explicitly out of this ticket's scope** (DLR-120 established
this ticket owns Cheat and Timebomb only) and stay unreachable — `shieldBuff` still has zero
production callers.

**Four of the eight `ShopItem`s are off the shelf, unchanged by DLR-132.** `SHOP_ITEMS` is
`[ApCapacity, SwanTier, WitchTier, Heal]`; `Cheat`, `Timebomb`, `BlastGuard` and `Whetstone` are
still priced by `priceOf` and still handled by `buyFromShop`, but the purchase mechanism the last two
depend on (`RunState.blastGuardHeld`, `RunState.whetstones`) is unchanged, while the Cheat and
Timebomb branches now mint a buff into the pile rather than writing a field this ticket deleted
(`cheats`, `timebombCharges`). **All four remain unbuyable via `SHOP_ITEMS`** — Cheat and Timebomb are
reachable now only through the slot machine, not the shop.

**A fresh run holds one buff it can activate — its starting Cheat.**
`activatableBuffs(startRun().buffs).length` is `1`: three of the four seeded cards are `Unassigned`
and filtered out, and the fourth is a bronze Cheat, seeded as an ordinary pile member by
`RUN_STARTING_CHEATS` rather than a rail grant. This was previously described as "0" because the
Cheat lived outside `RunState.buffs` entirely, on a deleted `cheats` field.

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
