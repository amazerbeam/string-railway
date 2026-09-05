_Part of [War Council UI](README.md)._

# The Cheat slots — RETIRED, DLR-132, 2026-08-24

**`CheatSlots.tsx`, `warCouncilCheats.css` and every reducer branch behind them (`TapCheat`,
`CancelCheat`, `cheatSelection`) are deleted.** A Cheat is now an ordinary row in
the buff panel's roving-tabindex list (`BuffLoadoutPanel`'s then, `BuffGallery`'s grid since
DLR-148) — the same component, the same list, the same two-tap
poise-then-spend gesture every other buff card uses. There is no longer a dedicated widget to
document: what a Cheat *does* when spent is one branch in `handleTapBuff`, described alongside Ward's
in [action-bar-and-loadout.md](action-bar-and-loadout.md), and what governs *how long* it lasts is
`src/hunt/buffCatalog.ts`'s `CHEAT_DURATION_TRICKS`, described in
[Activated cards](../hunt/activated-cards.md).

This file is kept, empty of live content, so a link or a search that lands here finds the retirement
notice rather than a page describing a widget that no longer exists as though it still did.
