Part of [War Council UI](README.md).

# The Timebomb charge plate — RETIRED, DLR-132, 2026-08-24

**`TimebombCharge.tsx`, `warCouncilTimebomb.css`, `TimebombStage` and every reducer branch behind
them (`handleTapTimebomb`, `commitTimebomb`, `TapTimebomb`, `CancelTimebomb`) are deleted.** A
Timebomb is now an ordinary card in the buff panel's roving-tabindex collection (`BuffLoadoutPanel`'s
row list then, `BuffGallery`'s grid since DLR-148 — which also puts it in the `Press` run and gives
it the only split payoff bar, stating both what it deals and what it can cost you), spent by the same
two-tap poise-then-spend gesture every other buff card uses. Spending it arms
`RoundUiState.timebombArmedDamage`; the very next tap on a hand card primes that card via
`primeTapped` (folded into `handleTapCard`, replacing the old three-tap plate cycle). See
[action-bar-and-loadout.md](action-bar-and-loadout.md) for the spend, and
[the buff-pile objects](../hunt/cheat-and-timebomb-buffs.md) for the tiered damage pair a Timebomb
now carries.

The rule the mark triggers is still the engine's — see
[the Timebomb mark](../war-council/the-timebomb-mark.md). The charge count this file used to describe
(`RunState.timebombCharges`) is deleted; a Timebomb is a pile member now, with no capacity cap.

This file is kept, empty of live content, so a link or a search that lands here finds the retirement
notice rather than a page describing a widget that no longer exists as though it still did.
