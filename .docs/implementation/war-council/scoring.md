_Part of [War Council](README.md)._

### End-of-round scoring

`scoring.ts` is intentionally independent of the trick engine — `tricksToPoints` is a fixed lookup
over an integer 0–13 (`0–3 → 6`, `4 → 1`, `5 → 2`, `6 → 3`, `7–9 → 6`, `10–13 → 0`), and
`scoreRound` applies it directly to both sides' final `tricksWon` via a plain two-field object
literal (`{ player: tricksToPoints(tricksWon.player), cpu: tricksToPoints(tricksWon.cpu) }`) — no
loop, no cast, since there are exactly two sides.
