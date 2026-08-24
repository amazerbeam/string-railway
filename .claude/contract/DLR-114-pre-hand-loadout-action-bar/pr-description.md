# PR: DLR-114 — Pre-hand loadout action bar

Plan: [`plan.md`](./plan.md)

## Summary

Replaces the felt's four separate rail plates (Cheat slots, the Envenom plate, the discard
plate, and the Apply Damage plate) with one bottom-of-screen action bar carrying all four
pre-trick decisions: **Apply Buff**, **Cards**, **Swap**, **Apply Damage**. Apply Buff opens a
new `BuffLoadoutPanel` — one glanceable line per owned, priced buff (name, condition, reward, AP
cost), the hand's remaining AP, and two-tap activation through `activateBuff`; the relocated
Cheat slots and Timebomb charge sit below a divider inside that same panel. `RunState.buffs`
reaches the card layer for the first time. `RoundUiState.apPool` is collapsed into
`RoundUiState.buffActivation`, so Apply Damage and buff activation spend from exactly one pool
rather than two independent numbers. Swap and Apply Damage keep their existing rules, unchanged,
relocated onto the new bar; Apply Damage gains its AP cost and a queued-payout readout naming the
frozen cash-out and the tricks still owed. The shell gains a fourth grid row (`actions`) for the
bar, below the hand.

A pure `isPricedBuff` / `activatableBuffs` filter in `src/hunt/buffActivation.ts` keeps
`BuffKind.Unassigned` placeholder content (what a fresh run's starting pile is seeded with) out of
`apCostOf`, which throws a `RangeError` on it — see the AP-pool note at the bottom of this
document.

## Developer decides or observes

- **Does the bar feel like one ritual, or four buttons in a row?** Play a hand: open Apply Buff,
  activate a buff, arm a Cheat from inside the panel, Swap, then Apply Damage. The whole ticket
  rests on this reading and no test can answer it.
- **Is two taps the right cost for activating a buff?** The poise stage is this plan's default
  (see `plan.md` → Assumptions made). One tap is cheaper and irreversible; two is the grammar
  every other control here uses.
- **Should condition-family buffs be offered at all before `buffAccrual.ts` has a caller?** Today
  activating one spends AP and does nothing else. A one-line change to `isPricedBuff` would hide
  them until they fire.
- **Should `seedStartingBuffPile` mint real content instead of four `Unassigned` placeholders?**
  Until it does, a fresh run with an empty Vault shows an empty buff list and only the relocated
  Cheat and Timebomb rows. That is a content decision, not this ticket's.
- **Every CSS value in `warCouncilActionBar.css` is a placeholder** copied from the sibling rail
  stylesheets. The polish ticket owns them.
- **The four AP figures behind the bar** (`STARTING_AP = 6`, `APPLY_DAMAGE_AP_COST = 3`,
  `REWARD_BASE`, `CONSUMABLE_AP_COST`) are agent-chosen and never played. This ticket is the first
  surface that makes them visible; the first hand played against them is the first evidence anyone
  has.

## Browser checks needed (unverified by anything in this contract)

The browser pass was off for this sprint-run dispatch. jsdom has no layout engine, so no Vitest
test in this contract can substitute for any of the following — they need a real browser:

1. **The shell still does not scroll with a fourth grid row**, at 1280×800, 1024×768, 1366×768
   and 390×844. The bar's `auto` row plus the hand's `auto` row must both fit while `.wc-table`'s
   `1fr` shrinks. This is the single highest-risk unverified claim in the ticket.
2. **The hand fan is not cropped or overlapped** by the bar at the short viewports above.
3. **The loadout panel does not overflow the felt** when the pile is large — the panel's own
   `max-height` / `overflow-y` must scope the scroll to the panel, never to the page.
4. **Every CSS custom property the new stylesheet references resolves**, rather than silently
   falling back: `--wc-brass`, `--wc-brass-dim`, `--wc-alarm`, `--wc-chalk`, `--wc-chalk-dim`,
   `--wc-chamber-lift`, `--wc-serif`, `--wc-ui-transition-ms`. All are declared in
   `warCouncil.css`, which the mount still imports — but that import order is exactly what a
   deleted stylesheet can break.
5. **No orphaned rule survives** the deletion of `warCouncilApplyDamage.css` and
   `warCouncilDiscard.css` — the felt rail must not leave a gap or a stray divider where four
   plates used to sit.
6. **A clean console** on mount, on opening the loadout, on activating a buff, and on pressing
   Apply Damage.
7. **The queued-payout note is legible on the button's face** rather than clipped by the button's
   own bounds.
8. **The four bar buttons meet the 44×44px hit-area floor** at the smallest viewport.

## Verification results

- **Typecheck:** `npm run typecheck` — 0 errors.
- **Lint:** `npm run lint` — 0 errors.
- **Full suite:** `npm test` — 112 files, 1453 tests, 0 failures.
- **Production build:** `npm run build` — exits 0.
- **Formatting (scoped):** `npx prettier --check` on the contract's changed files — 0.

## Note for future contributors

`RoundUiState` now has **exactly one** AP pool — `buffActivation.apPool` — not a separate
`apPool` field; both Apply Damage and buff activation spend from it. Before calling `apCostOf` on
any buff drawn from an owned pile (`RunState.buffs` / `RoundUiState.buffs`), it **must** first
pass through `activatableBuffs` — `apCostOf` throws a `RangeError` on the `BuffKind.Unassigned`
placeholders a fresh pile is seeded with.
