Part of [the Hunt module](README.md). **DLR-159.**

# Combining two identical cards into one of the next tier

Between fights the player may take two cards that are **the same card at the same tier** and turn
them into one card of the next tier up. Two bronze become one silver; two silver become one gold; a
gold has nowhere left to go. It costs no coins — the only thing it spends is the card count.

The whole rule is `src/hunt/buffCombine.ts`: an identity key, a ladder step, two refusal codes and
one run transition. The screen that drives it is
[../run-ui/manage-buffs-screen.md](../run-ui/manage-buffs-screen.md); this file is the rule.

## It lives in its own file, not in `runTransitions.ts`

`runTransitions.ts` holds every other transition that writes a run, and one more would have breached
this project's 400-line file budget in the same commit — it stood at 396 lines when this contract was
planned. `buffCombine.ts` is inside the same lint-enforced pure tree — no React, no DOM, no
`Math.random()` — and the produced card's id comes from `RunState.nextBuffId`, exactly as
`withMintedBuff` mints a bought one.

## `buffCombineKey` is now THE answer to "are these the same card"

`buffCombineKey(buff)` joins **kind, tier, target suit, target rank, reward axis and reward value**
into one string. Two cards share it exactly when a player could not tell them apart.

**That composition used to live in the app layer.** `buffStackKey` in
`src/app/warCouncil/buffGalleryModel.ts` — the rule that collapses duplicates into a counted `×N` on
the felt's loadout grid, and the rule the shop's held-cards tray already imported — is now a
one-line delegation to `buffCombineKey`. The exported name, signature and composed string are
unchanged, so its four call sites and its existing spec kept compiling untouched.

The point of the move is that **what stacks on the felt and what combines in the shop cannot
drift**. Two answers to that question is exactly the kind of duplication this codebase writes long
docblocks to prevent, and the import direction is the legal one: `src/app/` may import `src/hunt/`,
never the reverse.

## The ladder step is borrowed, not restated

`nextBuffTierAfter(tier)` is a one-line delegation to `rankTiers.ts`'s `nextTierAfter`, so
`TIER_LADDER` stays the codebase's one statement of tier order and of "there is no rung above gold".
`AbilityTier` and `BuffTier` are structurally the same three-member string union, which is what makes
the delegation type-check; `buffCombine.test.ts` pins the two unions member-for-member, exactly as
`buffs.test.ts` pins `BuffTargetSuit` against the card layer's `Suit`. **That is a deliberate
coupling** — if the two unions ever diverge, that test is what says so.

## Two refusal codes, and gold is checked first

`combineRefusalFor(buffs, key)` returns `null` when the pile named by `key` can be combined right
now, and otherwise one of two codes. `src/hunt/` holds reason **codes** and no user-facing copy —
`src/app/run/manageBuffsLabels.ts` maps them to words, the same split `PURCHASE_REFUSAL_MESSAGE`
already established for the shop.

| Code | Means |
|---|---|
| `CombineRefusal.AtMaxTier` | the pile is gold, and there is no rung above it |
| `CombineRefusal.NoPair` | fewer than two copies of this exact card at this exact tier — or a card whose template this build no longer has |

The order of the checks is deliberate and carries a comment in the source saying so: **gold is
tested before the pair count**, so a _lone_ gold copy — which is truthfully both `AtMaxTier` and
`NoPair` — reads as "already at the top" rather than "you only have one". Of the two true reasons,
that is the informative one.

The template guard is the third clause. `templateForBuff` returns `undefined` for a card this build
has no template for, and that becomes a `NoPair` the screen can word rather than a throw the player
would meet as a crash. It cannot arise from a live pile today; it exists so a future pruning of the
mintable pool cannot turn the screen into a crash.

## `combineBuffs` destroys two copies and mints one

`combineBuffs(run, key)` returns a run with:

- the **two lowest ids** of that pile removed — `copiesOf` sorts ascending, so repeated combines on
  one pile are deterministic and testable;
- one card of the next tier **appended** to `RunState.buffs`;
- `nextBuffId` advanced by one.

It **throws a `RangeError` naming the refusal** rather than returning the run unchanged, matching
`buyFromShop` and `pullSlotMachine`: a silent no-op on a destructive action is worse than a crash.
Reaching the throw is a driver bug, because the tile is not armable while `combineRefusalFor` is
non-null. A second, unreachable `RangeError` guards the case where the refusal check and the mint
disagree — stated rather than asserted away, so a future edit to the refusal cannot quietly mint a
wrong card.

**`COPIES_PER_COMBINE = 2` is not a tunable.** The rule is about a _pair_; the constant exists only
so the refusal and the transition cannot disagree about the number.

## The produced card goes through the minting path, which is the whole of the Cheat/Timebomb rule

The new card is minted by `mintFromTemplate(template, tier, run.nextBuffId)`, from the template
derived off the destroyed card. It is therefore **indistinguishable from one the slot machine could
have dealt** — same kind, same condition, same `reward.value` off `REWARD_TIER_VALUE` — which is what
makes a combined silver stack with a slot-dealt silver on the felt.

It is also the entire reason Cheat and Timebomb combine correctly with no branch that knows they are
special. An activated template already routes through `mintFromTemplate`'s `cheatBuff` /
`timebombBuff` arms, so a combined Cheat lifts follow-suit for more tricks and a combined Timebomb
carries the next damage pair, by their own tier ladders rather than by `REWARD_TIER_VALUE`.

**Hand-building the produced card would have been the bug.** Spreading the destroyed card and
overwriting its tier and reward value reads simpler and produces a Cheat whose duration never changed
and a Timebomb whose damage pair never changed, because those cards' tier meaning does not live in
`REWARD_TIER_VALUE` at all.

## Deriving a card's template — the id grammar is written once

`buffTemplates.ts` gained the reverse lookup the mint needs:

- `templateIdForBuff(buff)` — an **activated** card's id is the bare kind; a **condition** card's is
  the `<kind>[:<suit>]:<axis>` grammar, recomposed from `buff.reward.axis` and the condition's target
  suit, the only two fields that vary within a family.
- `templateForBuff(buff)` — that id through `templateById`, so `undefined` for a template this build
  no longer has. Callers must handle `undefined` rather than assert: a pruned family is not a
  programming error, and it is exactly what DLR-113's `reconcileVault` already tests a stale save
  against.

The grammar itself moved into a private `templateIdFor(kind, axis, paramLabel)` that **both**
`makeTemplate` (the generator) and `templateIdForBuff` (the reverse lookup) call. That format is
persisted — `TemplateGrant` puts it on disk for the Vault — so a second copy of the expression is
precisely how the writer and the reader would silently drift apart.

## What this does not do

- **No coin is charged and no combine is capped.** There is no price anywhere in the module and
  nothing counts combines per visit.
- **Nothing splits a card back down a tier.** The transition is one-way.
- **Nothing combines across templates, suits, tiers or reward axes** — the key is the whole rule.
- **The mintable pool is untouched by this ticket, at 16 templates.** No cut condition family and no
  cut reward axis was restored or widened by this work. (DLR-161 later took it to **18** with two new
  families of its own; combining needed no edit for them, because the key is `(templateId, tier)`.)
- **Nothing is persisted.** `RunState.buffs` and `nextBuffId` are never written to storage, so the
  produced card survives whatever the run survives by construction — no `SAVE_SCHEMA_VERSION` bump
  and no new storage access exists in this contract.

## The tension this ships with, and does not fix

**At today's reward ladder most combines measure as a downgrade.** Two bronze damage cards fired on
one trick pay `(1 + 1 + 1) × (1 + 1) = 6` — base damage 1 plus a bronze Blade each, times one plus the
Overlap Bonus of `+1` for the second card firing. The single silver they combine into pays
`(1 + 3) × 1 = 4`, because one card earns no Overlap Bonus. The ticket names this, accepts it, and
explicitly defers the ladder pass; nothing in this contract compensates for it — no price, no bonus,
and no nudge in the screen's copy toward or away from combining. It is the single most likely thing
to feel wrong in play, and it is not a defect in this work. Recorded in
`.docs/game_rules/the-hunt.md`'s Known tensions.
