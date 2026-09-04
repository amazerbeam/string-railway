Part of [War Council](README.md).

# Skulls — assignment, the predicate, and the shape readout

`skulls.ts` (DLR-80; the draw reworked by PT-001) owns everything about which of the Quarry's cards
carry a skull, and what a consumer may learn about them. Six exports, all pure, none of which takes a
`RoundState` — they take the hand and the skull list directly. That is deliberate and is what let the
module be written and tested a whole phase before `RoundState.skulledCards` existed; it also means
every spec is a plain function call with no fabricated state.

## What a skull is, in data terms

A skull is not a field on a card. `Card` is unchanged — `{ suit, rank }`, structurally compared —
and the skulls are a **separate list of cards** carried on `RoundState.skulledCards`, written once by
`dealRound` and spread forward by every subsequent state.

That shape is load-bearing in two directions:

- **A card cannot lose its skull by moving.** A skulled card exchanged into the decree by the Fox,
  and later taken into the player's hand by their own Fox, is still in `skulledCards` — so it is
  still skulled. Had the skull been a field on a card in a hand, every path that copies a card would
  have had to remember to carry it.
- **Membership is by suit *and* rank together**, via `containsCard`, which is unique across the
  33-card deck. `isSkulled` is that call and nothing more.

## Assignment — `assignSkulls`

```ts
assignSkulls(hand, rng, density = SKULL_DENSITY, weights = SKULL_RANK_WEIGHTS): readonly Card[]
```

Called by `dealRound` with the **Quarry's dealt hand only**. Three properties matter:

**It draws from the injected `rng`, never `Math.random`.** Since PT-001 the selection is `weightedDraw`
(below) rather than a shuffle-and-slice, but the contract is unchanged and stricter: every random
number comes from the caller-supplied `rng`, so a seeded deal reproduces its skulls as well as its
cards. `Math.random` appears exactly once in the whole program, in `App.tsx`, and a boundary grep
asserts it is absent from `src/warCouncil/**` and `src/hunt/**`.

**The count is `Math.round(hand.length × density)`, clamped to the eligible cards.** At the shipped
values that is `Math.round(6 × 0.3)` = **2 of 6**. The clamp is not decoration: a hand of five rank-1s
has fewer eligible cards than the density asks for, and silently returning fewer is correct where
throwing would turn a legal deal into a crash.

**`density` and `weights` are two orthogonal dials, both defaulted parameters rather than values the
module closes over.** Density decides **how many** skulls a hand carries; the weight curve decides
**which ranks** they land on. This is the same injectable idiom `startEncounter`'s `playerHealth`
uses, and it is what lets a spec test a curve without mutating module state. PT-001 replaced the
fourth parameter `minRank: number` with `weights: SkullRankWeights` — a widening from a rank floor to
a full table. `dealRound` passes two arguments and relies on both defaults, so the swap needed no
change at the only production call site.

## The weighted draw — `weightedDraw`

```ts
weightedDraw(candidates, rng, weights, count): readonly Card[]
```

PT-001's core. Picks `count` distinct cards, each with probability proportional to its rank's weight,
**without replacement**: pick one, remove it from the pool, repeat. It is exported so its invariants
can be asserted directly rather than only through `assignSkulls`, but it is deliberately **not** in
`src/warCouncil/index.ts`'s barrel — nothing outside this module needs it.

**It consumes exactly one `rng` call per card drawn**, and that is the property the design turns on.
Two alternatives were rejected for it: *rejection sampling* (pick uniformly, keep with probability
`weight/maxWeight`) consumes an unbounded number of calls, so a seeded deal's skulls would depend on
how many rejections happened to occur — which breaks reproducibility rather than merely being untidy.
*Weight-expanded shuffling* (push each card in `weight` times, shuffle, take distinct) is
deterministic but scales its `rng` consumption with total weight and needs a de-duplication pass that
quietly distorts the distribution. Sequential selection is the tightest of the three, and a spec pins
the call count with a counting stub.

Three degenerate cases are handled rather than assumed away:

- **Zero total weight breaks the loop, it does not divide.** `rng() * total` with `total === 0` gives
  `0`, and the accumulate walk would then select nothing and spin. The loop tests `total <= 0` and
  breaks **before** computing the threshold, so an all-zero curve returns `[]` — "this Quarry carries
  no skulls" is a coherent configuration, not an error.
- **A rank missing from the table reads as zero, never as `NaN`.** Every one of the three lookup
  sites coerces through an explicit `?? 0`. `Record<number, number>` cannot force all eleven keys to
  be present, so a curve that omits a rank type-checks cleanly; this makes the omission mean
  "unskullable" instead of corrupting the running total.
- **Running out of candidates returns fewer than asked**, silently and correctly — the same posture
  as `assignSkulls`'s clamp.

The accumulate walk falls back to the **last** candidate if the threshold never drops below zero,
which is only reachable through floating-point drift: for any `rng() < 1`, subtracting every weight
in the pool must drive `rng() * total - total` negative by construction.

## The never-rank-1 rule — `skullableCards`

```ts
skullableCards(hand, weights = SKULL_RANK_WEIGHTS): readonly Card[]
```

A filter on **positive weight** — `(weights[card.rank] ?? 0) > 0`. Before PT-001 this was `rank >=
minRank` against a `SKULL_MIN_RANK` of 2; the rule did not change, but where it lives did. "Never
rank 1" is now `1: 0` in every shipped curve rather than a separate constant, which satisfies the
single-source-of-truth rule and, more usefully, extends the guarantee to **any curve added later**
instead of only the current one.

A skulled rank 1 cannot lose its trick, so it would be an unavoidable tax rather than a decision —
excluding it is what leaves the foreknowledge the shape readout gives you worth having.

It is exported separately rather than being inlined into `assignSkulls` so the eligibility rule can be
asserted on its own, including the degenerate all-rank-1 hand.

## The trick discriminator — `trickIsSkulled`

```ts
trickIsSkulled(skulledCards, trick): boolean
```

> **Since DLR-167 the player can make a skull too, and neither function here was taught about it.**
> `isSkulled` and `trickIsSkulled` keep their plain-list signatures and are **called with the union**
> of the dealt skulls and the cursed cards — `skullsOn(state)` in `curse.ts` is the one place the two
> lists are read as one. That is a **convention, not an enforced boundary**: a new reader that means
> "does this card show a skull" has to be told, because reading `skulledCards` alone type-checks and
> returns a plausible answer. See [The Curse](the-curse.md), which also names the two readers that
> deliberately do not use the union.

**True if _any_ card played into the trick is skulled** — `trick.some(...)`, not "the Quarry's card
is skulled".

Skulls are only ever dealt to the Quarry, so in practice the two readings agree. They come apart on
exactly one path: the Quarry's Fox can exchange a skulled card into the decree, and the player's Fox
can later take that decree into hand. Testing the trick rather than the seat survives that path with
no special case, where the seat reading would silently drop the skull the moment it changed hands.

That is a rules decision, not just an implementation one, and it is the developer's to overturn — it
is one line here. It is recorded as an open question in the ruleset.

## The shape readout — `suitShape`

```ts
suitShape(hand, skulledCards): readonly SuitShape[]   // { suit, held, skulled }
```

One row per suit, in `ALL_SUITS` order, **including a suit the Quarry has been stripped of** — that
row reads `held: 0, skulled: 0` rather than being omitted, so the readout's row count never changes
mid-hand and a reader can see that a suit is exhausted rather than inferring it from an absence.

`SuitShape` carries **no rank, and cannot** — there is no rank field on it to leak one. That is the
type doing the enforcement rather than the component: the acceptance criterion is that the readout
never reveals a rank, and the shape handed to the UI makes it unrepresentable. `QuarryShape.tsx`
renders exactly these rows and computes nothing.

The design's claim behind the split is that counting suits is bookkeeping and reading ranks is
judgement — so the readout removes the first and keeps the second.

## Cost

Every function here is bounded by the hand: at most six cards across three suits. `suitShape` is one
pass per suit, `isSkulled` a membership test over a two-element list, `trickIsSkulled` two of those.
Nothing is memoised and nothing needs to be.
