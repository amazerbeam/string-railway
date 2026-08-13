Part of [War Council](README.md).

# Skulls — assignment, the predicate, and the shape readout

`skulls.ts` (DLR-80) owns everything about which of the Quarry's cards carry a skull, and what a
consumer may learn about them. Five exports, all pure, none of which takes a `RoundState` — they take
the hand and the skull list directly. That is deliberate and is what let the module be written and
tested a whole phase before `RoundState.skulledCards` existed; it also means every spec is a plain
function call with no fabricated state.

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
assignSkulls(hand, rng, density = SKULL_DENSITY, minRank = SKULL_MIN_RANK): readonly Card[]
```

Called by `dealRound` with the **Quarry's dealt hand only**. Three properties matter:

**It draws from the injected `rng`, never `Math.random`.** It shuffles the eligible cards with the
same `shuffle` the deal itself uses, threaded from the same caller-supplied `rng`, and slices off the
front. So a seeded deal reproduces its skulls as well as its cards — and a spec can fix a sequence and
assert an exact selection. `Math.random` appears exactly once in the whole program, in `App.tsx`, and
Phase 4's boundary grep asserts it is absent from `src/warCouncil/**` and `src/hunt/**`.

**The count is `Math.round(hand.length × density)`, clamped to the eligible cards.** At the shipped
values that is `Math.round(6 × 0.3)` = **2 of 6**. The clamp is not decoration: a hand of five rank-1s
has fewer eligible cards than the density asks for, and silently returning fewer is correct where
throwing would turn a legal deal into a crash.

**`density` and `minRank` are defaulted parameters, not values the module closes over.** This is the
same injectable idiom `startEncounter`'s `playerHealth` uses, and it exists so the open question about
skull *distribution* can be tested without mutating module state — a skew is a change at one call
site.

## The never-rank-1 rule — `skullableCards`

```ts
skullableCards(hand, minRank = SKULL_MIN_RANK): readonly Card[]
```

A filter, `rank >= minRank`, with `SKULL_MIN_RANK` at 2. A skulled rank 1 cannot lose its trick, so it
would be an undodgeable tax rather than a decision — excluding it is what leaves the foreknowledge the
shape readout gives you worth having.

It is exported separately rather than being inlined into `assignSkulls` so the eligibility rule can be
asserted on its own, including the degenerate all-rank-1 hand.

## The trick discriminator — `trickIsSkulled`

```ts
trickIsSkulled(skulledCards, trick): boolean
```

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
