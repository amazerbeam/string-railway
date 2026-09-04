Part of [Hunt](README.md).

A **wildcard** is a card the player spends. A **wild card** is what a buff becomes when one is spent
on it: the same card with its suit condition stripped, so it pays on a trick of any suit. The two
are different things and `buffWild.ts` keeps them apart with two predicates — `isWildcardCard(buff)`
asks the first question, `buffIsWild(buff)` (in `buffs.ts`) asks the second.

`buffWild.ts` is pure, like everything in `src/hunt/`: no React, no DOM, no `Math.random()`.

## Wildness is one optional flag on the condition

`BuffCondition` carries `wild?: boolean`. It is optional so every existing condition value stays
valid with no edit, and it is set **only** by `buffWild.ts` — never by a template, because a wild
card is not a card the machine can deal.

`buffIsWild(buff)` reads it, exactly as `buffTargetSuitOf` reads the suit, so no consumer reaches
into the payload directly.

## What a wild condition changes, and what it does not

`buffFires` in `buffEvaluation.ts` reads one local, `const wild = buffIsWild(buff)`, and the two
suited families become:

```ts
case 'suitHigh':
  return ctx.playerWentHigh && (wild || (suit !== null && ctx.playerSuits.includes(suit)))
case 'suitLow':
  return !ctx.playerWentHigh && (wild || (suit !== null && ctx.playerSuits.includes(suit)))
```

**A wild condition drops the suit term and nothing else.** `playerWentHigh` is the mechanical axis —
whether the player physically took the cards — and it is untouched: a wild Suit High card still has
to go high, a wild Suit Low card still has to go low.

## Minting by transformation, not from a template

`mintWildAtTier(kind, axis, tier, id)` reads the **same** `REWARD_TIER_VALUE` ladder
`mintFromTemplate` reads, so a wild silver Suit High card pays exactly what a suited silver one
pays. It throws a `RangeError` on an axis with no ladder rather than minting a zero-value card —
`mintFromTemplate`'s own discipline, because a plausible-looking zero is the bug that type-checks.

`wildenedBuff(target)` is the transformation: `target` with its suit condition removed, **keeping
its own id**, kind, tier and reward axis. That is load-bearing rather than incidental — it is the
same card, so `RunState.nextBuffId` does not advance on a spend and two runs on one seed stay
identical.

**A wild card is mintable only here and never from a template**, which is deliberate rather than an
omission. `BUFF_TEMPLATES` is the candidate pool for both the reel strip and the run's opening pile,
and it is what `familyAxisTotalsFor` normalises family weights over, so a wild template would dilute
every existing suited template's weight and put an undealable card into two draws. The consequence —
`templateForBuff` returns `undefined` for a wild card — is handled in `combineProductFor`, below.

## The spend, and its two refusals

`WildRefusal` is a reason **code**, not a sentence: `src/hunt/` holds no user-facing copy, and
`src/app/run/manageBuffsLabels.ts` words it.

| Refusal       | Why                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| `AlreadyWild` | the target is already wild; there is no second suit to take off                                               |
| `NoSuit`      | the target names no suit at all — Skull Low, either protective family, an activated card, or another wildcard |

`wildRefusalFor(target)` returns `AlreadyWild` before `NoSuit`, because a wild card reports no suit
and "already wild" is the more informative of the two true reasons — the same ordering argument
`combineRefusalFor` makes for gold over `NoPair`.

`spendWildcard(run, wildcardId, targetId)` removes the wildcard from the pile and replaces the
target with its wild self **in place**, so the pile's order — which is the player's mental order —
is preserved. It **throws** a `RangeError` naming its reason rather than returning `run` unchanged,
exactly as `combineBuffs` and `buyFromShop` do: a silent no-op on a destructive action is the
failure this tree refuses to allow. Reaching a throw is a driver bug, because no control is armable
while `wildRefusalFor` is non-null.

The wildcard itself is refused on the felt by `BuffActivationRefusal.ShopOnly` — see
[Activated cards](activated-cards.md).

## Wildness absorbs, so it cannot be merged away

The combine rule ([Combining cards](combining-cards.md)) gained exactly one clause: **the suits may
differ when one of the two cards is wild.** Rather than replace the pile model — which would take
the Manage Buffs screen, the felt's stacking and `buffStackKey`'s delegation with it — the rule
gained a second, looser key beside the exact one:

- `buffCombineKey` — kind, tier, suit, rank, **the wild flag**, reward axis, reward value. The exact
  key. The wild flag is included so that a key can never stack a wild card with a suitless one.
- `buffCombineFamilyKey` — the same list with the suit and the wild flag dropped. Family, tier,
  rank and reward stay mandatory; only the suit is relaxed.

`combinePairFor(buffs, key)` says which two cards a combine actually consumes, and both
`combineRefusalFor` and `combineBuffs` are written over it, so what a tile offers and what a commit
destroys cannot disagree. For a **wild** pile a suited partner sharing the family key is preferred
over a second wild copy: both produce the same card, and pairing wild-with-suited leaves the player
holding _more_ wild cards. A **suited** pile takes only the two-exact-copies branch, so one action
is listed once on the screen rather than twice. Lowest ids throughout, so repeated combines are
deterministic.

`combineProductFor(a, b, tier, id)` carries the absorbing rule as a single conditional at its head:

```ts
if (buffIsWild(a) || buffIsWild(b)) return mintWildAtTier(a.kind, a.reward.axis, tier, id)
```

**The product is wild exactly when an input was**, and no other branch in that module can produce a
suited card from a wild one. That is what makes wildness impossible to merge away by accident. It is
also the branch that handles `templateForBuff` returning `undefined` for a wild card: a wild pair
never goes through a template at all, which is why `combineRefusalFor`'s "no template for this card"
guard exempts it.

## Two conventions this established

**Mint by transformation.** Where a card changes into another card rather than being dealt, the
transformation keeps the id and reads the same reward ladder the mint reads. Nothing new enters the
candidate pool, nothing dilutes an existing weight, and a seeded run stays reproducible.

**An activated branch is written as a total `Record`.** Widening `BuffActivatedTemplateKind` is what
compile-forced the two Cheat-or-else-something binaries — `mintFromTemplate` and
`src/app/run/slotSymbols.ts`'s `slotSymbolFace` — to become total lookups, so a fourth activated
card fails to compile at each table rather than rendering `undefined`.
