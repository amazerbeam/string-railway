_Part of [War Council UI](README.md)._

### The two `cpuFault` cases

`roundReducer.ts`'s private `advanceCpu` guards `legalMoves(round, PlayerSide.Cpu).length === 0`
_before_ calling `chooseCpuMove`, because `chooseCpuMove` **throws** rather than returning a rejection
when the CPU has no legal move — `cpuPlayer.ts` (`src/warCouncil/`, documented in
[../war-council/cpu-heuristic.md](../war-council/cpu-heuristic.md)) picks the lowest option from an
empty array, which is `undefined`, then reads `.rank` off it. Catching that case first sets
`cpuFault: 'noLegalMove'`.

The second case is a `playCard` rejection of the CPU's own chosen move — `cpuFault: result.reason`, a
bubbled `IllegalMoveReason` — which is unreachable through today's engine (`chooseCpuMove` is
documented to only ever return a move `playCard` accepts) and is carried as a defensive branch with
no test rather than faked with a contrived fixture.

`WarCouncilRound.tsx` renders either case as a `role="alert"` message naming the raw fault value and
**blocks further play rather than retrying** — it is an engine bug and must look like one. The two are
kept separate from a player's own illegal move precisely so a genuine engine fault is never laundered
into copy reading as though the player erred. There is no `try`/`catch` anywhere in the module.
