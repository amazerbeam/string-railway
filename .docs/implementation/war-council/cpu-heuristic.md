_Part of [War Council](README.md)._

### The CPU heuristic (`cpuPlayer.ts`, SCRUM-26)

Five small pure functions, none of which ever invents a value outside what the engine itself
already treats as legal:

- **`chooseCpuCard(state, side)`** — card selection only. Reads `legalMoves(state, side)` and never
  re-derives legality itself. If `currentTrick` is empty (leading), picks the lowest-ranked legal
  card (tie-broken by `ALL_SUITS` declaration order — Bells < Keys < Moons — via an internal
  `compareCards`/`lowestCard` pair). If a card has already been led (following), filters
  `legalMoves()`'s output down to the cards that would win the trick — evaluated by calling the
  engine's own `resolveTrickWinner` for each candidate, never a re-implemented trump/suit
  comparison — and plays the lowest of those; if none would win, ducks with the lowest legal card
  at all.
- **`chooseCpuFoxChoice(handAfterFox, trumpSuit)`** — exchanges the Fox for the lowest card of the
  hand's most-held suit whenever that suit isn't already trump (concentrates trump in the CPU's
  strongest suit); declines if the strongest suit is already trump, or if the hand is empty (the
  Fox was the side's last card).
- **`chooseCpuWoodcutterChoice(handWithDrawn)`** — always discards the lowest-ranked card of the
  hand after the draw.
- **`chooseCpuMove(state, side)`** — composes the above: picks the card, then — only if its rank is
  `CardRank.Fox` or `CardRank.Woodcutter` — computes the matching ability choice, building the
  candidate hand the exact same way `playCard.ts` does internally (`[...handAfter, drawPile[0]]`
  for Woodcutter), so the two stay in lockstep. Returns a `CpuMove` (`{ card, choice? }`) that
  `playCard`/`submitWarCouncilCard` always accepts.

`chooseCpuMove` is **legality-generic per `PlayerSide`** — nothing in it assumes `side === Cpu` — so
the same function drives either side's turn. This is how the module's own test suite exercises "a
range of hands" for AC4 (60 seeded full 13-trick rounds via `dealRound` + `playCard`, alternating
which side is dealt as `Player`/`Cpu` by seed parity) without a second, throwaway decision function
for the non-CPU side.

The heuristic has **no awareness of any run-level state** — every decision is a pure function of the
current `RoundState` alone, by design (see [Deferred](README.md#deferred--not-yet-implemented)).

### The intent telegraph — previewing the Quarry's move before it lands (`cpuPlayer.ts`, DLR-52)

`chooseCpuMove` answers "what will the CPU play"; `playCard` puts the card on the table. Between
those two there was no point a UI could interrupt to show the player what the Quarry is *about* to
do. DLR-52 added that seam as two additional exports over the same unchanged heuristic — nothing
about card selection changed, and `chooseCpuCard`/`chooseCpuMove`/`playCard` were not edited.

**`quarryIntent(state, fidelity = TELEGRAPH_FIDELITY): QuarryIntent | null`** is the preview. It
calls the same `chooseCpuCard(state, QUARRY_SIDE)` the commit path calls, then returns only a
*shape* derived from the result — never the `Card` itself, which never leaves the function's scope.
That restriction is the point: §4's table keeps the Quarry's hand hidden, so naming the exact card
would leak a card from it. The intent is a `QuarryIntent` — `{ suit, stance? }` — where `stance` is
a three-way `QuarryIntentStance` (`Leading` / `Pressing` / `Ducking`). `Leading` is its own state
rather than being collapsed into press/duck, because a lead has no winner yet to press against.
Stance is derived by the private `deriveStance`, which re-runs the engine's own `resolveTrickWinner`
against `[lead, quarryCard]` — the same win/duck test `chooseCpuCard`'s internal winners-filter
already performs, so the preview and the actual choice cannot drift apart.

Because `chooseCpuCard` is deterministic and `quarryIntent` mutates nothing and reads nothing
outside `state` and config, calling it twice on one state returns the same answer — so it is safe to
render, re-render under StrictMode's double-invoke, and only then commit.

**`commitQuarryMove(state): PlayCardResult`** is the commit half: `chooseCpuMove(state,
QUARRY_SIDE)` then `playCard(state, QUARRY_SIDE, move.card, move.choice)`, returning `playCard`'s
result unchanged — including its `{ ok: false, reason }` shape, unswallowed. It exists so a caller
can play the Quarry's move without knowing the `QUARRY_SIDE` plumbing.

#### Both entry points guard their own preconditions

Neither function assumes the caller has checked whether asking is safe — the telegraph's expected
consumer is a UI polling on every render, including the render where a round finishes. `quarryIntent`
returns `null`, and `commitQuarryMove` returns `{ ok: false, reason }`, in the two states where
there is no Quarry move to describe:

| State | `quarryIntent` | `commitQuarryMove` |
|---|---|---|
| `state.phase === RoundPhase.Complete` | `null` | `{ ok: false, reason: IllegalMoveReason.RoundComplete }` |
| `currentTurn(state) !== QUARRY_SIDE` | `null` | `{ ok: false, reason: IllegalMoveReason.NotYourTurn }` |

The turn check covers two distinct wrong-answer cases that are easy to miss: `currentTrick` empty
but the *Player* is the leader (the Player is about to lead, not the Quarry), and `currentTrick`
holding exactly one card that `QUARRY_SIDE` played (the Quarry already led, so it is the Player's
turn to follow — without the check, `deriveStance` would compute the Quarry's stance against its own
card).

The guards are not merely defensive tidiness. `chooseCpuCard`'s internal `lowestCard(legal)` is
`[...cards].sort(...)[0]`, which is `undefined` at runtime on an empty array — and because this
project does not enable `noUncheckedIndexedAccess`, its declared `Card` return type hides that from
the compiler. An unguarded `quarryIntent` therefore threw a `TypeError` on `card.suit` once the
Quarry's hand emptied, which every round reaches. `src/app/warCouncil/roundReducer.ts`'s `advanceCpu`
had already needed its own `legalMoves(...).length === 0` guard against the same trap for the same
reason; these two functions now carry the equivalent check rather than leaving each new caller to
rediscover it. `commitQuarryMove`'s checks duplicate `playCard`'s own identical leading checks
deliberately — they have to run *before* `chooseCpuMove` is reached, which is where the crash
actually lives.

#### The telegraph's fidelity is config-driven, not hard-coded

How much the telegraph reveals is read from `src/hunt/config.ts`'s `TELEGRAPH_FIDELITY`, not decided
in this module — see [../hunt/README.md](../hunt/README.md). `quarryIntent` takes the fidelity as an
optional second parameter defaulting to that constant, mirroring the injectable-parameter pattern
`resolveStanding` established (and which `roundDamage` now follows for its rounding rule — though
`resolveStanding`'s own table stopped being *defaulted* in DLR-66 and is now required): a test can
prove the config genuinely drives the output by passing a different value, without mutating shared
module state between test cases. Under
`TelegraphFidelity.Suit` the returned object is `{ suit }` with **no `stance` key at all** — the key
is omitted, not set to `undefined` — so narrowing the fidelity genuinely narrows the shape a caller
receives rather than blanking a field. `quarryIntent.test.ts` asserts this with `'stance' in narrow`
rather than `toBeUndefined()`, since the latter cannot tell an absent key from a present one holding
`undefined`.
