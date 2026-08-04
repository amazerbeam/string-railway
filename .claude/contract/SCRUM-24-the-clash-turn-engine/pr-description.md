# PR: The Clash — turn engine

Plan: [`plan.md`](./plan.md)

## Summary

Adds the Clash turn engine (`applyClashAction`, `startClash`) and the round-opener alternation
(`openingSideForRound`) to `src/vanguard/`:

- Strict alternation between sides while both still have Muster to spend.
- Once one side is exhausted, the other spends its leftover Muster uncontested — no more
  alternation, but the other side is locked out (`ClashRejectionReason.NotYourTurn`) rather than
  silently permitted to act out of turn.
- A per-action Breach check runs after every accepted action and can end the round mid-exchange,
  independent of whose Muster is left.
- Muster left unspent at the round's natural end (`ClashStatus.Complete`) is simply never banked —
  there is no field in the `Complete` state variant to hold a carried-over value.

## Config defaults

Both config defaults this ticket needed were transcribed directly from the ticket's own acceptance
criteria — nothing was left for the developer to choose:

- `CLASH_FIRST_ROUND_OPENER = PlayerSide.Cpu` (`src/vanguard/config.ts`) — AC3's stated round-1
  opener.
- Unspent Muster being lost, not carried over, at `ClashStatus.Complete` — AC5.

## Judgement calls for developer awareness

Surfaced in `plan.md` Part 2 → Risks, already folded into the approved design, no action needed —
noted here only for visibility:

- The `ClashState` discriminated-union shape (`InProgress` / `Breached` / `Complete`, each variant
  carrying only the fields that make sense for that status).
- The existence of the `ClashRejectionReason.ClashAlreadyResolved` rejection, returned when an
  action is submitted against a state that is no longer `InProgress`.
- A side with Muster left but nothing affordable or legal to spend it on has no built-in escape
  from this ticket — that's out of scope; action selection is a future ticket.

## Verification

Run this phase, by the Implementer:

- `npm run typecheck` — exit 0, no errors.
- `npm run lint` — exit 0, no errors.
- Sanity greps (Tasks 6–7): zero React/DOM references in `clash.ts` / `clashOpener.ts`;
  `CLASH_FIRST_ROUND_OPENER` appears only in its `config.ts` declaration and its one consumer in
  `clashOpener.ts`; every new identifier (`ClashState`, `ClashStatus`, `ClashRejectionReason`,
  `ClashActionResult`, `applyClashAction`, `startClash`, `openingSideForRound`) is spelled
  identically everywhere it's used.

Not run by the Implementer, per this project's `/fb-apply` pipeline rules — the unfiltered suite
and the production build belong to QA alone. QA's Final-verification pass should confirm:

- `npm test` (unfiltered) — 0 failed.
- `npm run build` — exits 0, `dist/` written, no bundler errors.

## Note for future contributors

Any future orchestrator wiring `ClashState` into `BattleState` should read
`.docs/implementation/vanguard.md`'s Deferred section first — this ticket deliberately does not
touch `src/battle/`.
