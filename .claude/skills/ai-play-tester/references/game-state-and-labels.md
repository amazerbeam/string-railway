# Game state dump and accessible labels

**Scope note:** the screen list, file locations, and "no central store" shape below are structural — they describe how `src/` is organised and change only when the app's architecture changes. The exact fields on `window.__DEBUG_STATE__` and the exact label strings are owned by the current source in each file named below — read those files rather than trusting a copy of a string here, since labels get worded and re-worded by feature work this reference doesn't track.

## No central store

There is no Redux/Zustand/context store under `src/`. State is plain `useState`/`useReducer`, split across two places:

- `src/App.tsx` — owns `run: RunState` (coins, encounter HP, encounterIndex/Count, outcome, buffs, flask charges), `phase: RunPhase` (`Start | Verdict | Warned | Shop | Map | Vault`, plus a default "in an encounter" branch), `hand`/`dealt` (the seed for the next round), and `vaultHandle` from `useVault()`.
- `src/app/warCouncil/WarCouncilRound.tsx` — owns the live round `useReducer` (`roundReducer` from `src/app/warCouncil/roundReducer.ts`, state shape `RoundUiState` in `src/app/warCouncil/roundUiState.ts`): hand, tricks, decree, bank, multiplier, armed card, prompt state, buff activation, discard selection, AP bookkeeping. `App` cannot see this state — it only exists inside `WarCouncilRound`.

That split is why the debug dump is two independent dev-only `useEffect`s merging into the same `window.__DEBUG_STATE__` object rather than one effect in one place — one in `App.tsx` for run/phase/vault, one in `WarCouncilRound.tsx` for the live round `ui`. Check both are present before trusting the dump is complete.

## Screens (rendered by `App.tsx`, no router)

In render-order precedence:
1. `RunPhase.Start` → `RunPathScreen` (start screen)
2. `encounterOver && RunPhase.Map` → `RunPathScreen` (map)
3. `encounterOver && RunPhase.Shop` → `ShopPanel` (shop + slot machine)
4. `encounterOver && RunPhase.Vault` → `VaultScreen`
5. `encounterOver` (any other phase) → `RunOutcomePanel` (verdict/warned — the stopping point for a full run)
6. default → `WarCouncilRound` (the card-play screen — where most of a playthrough happens)

## Where accessible labels live

Every interactive control already carries an `aria-label`/`role` built by a `*AccessibleName`/`*_LABEL` function in a sibling `*Labels.ts` file — read the builder, not a hardcoded string, since wording changes independently of this reference:

| Screen/control | Component | Label source |
|---|---|---|
| Action bar (Apply Buff / Cards / Swap / Apply Damage) | `src/app/warCouncil/ActionBar.tsx` | `src/app/warCouncil/actionBarLabels.ts` |
| Playing cards | `src/app/warCouncil/PlayingCard.tsx` | `cardAccessibleName` in `src/app/warCouncil/labels.ts` |
| Buff loadout panel (dialog) | `src/app/warCouncil/BuffLoadoutPanel.tsx` | `buffRowAccessibleName`, `LOADOUT_PANEL_LABEL` in `src/app/warCouncil/buffLabels.ts` |
| Ability prompt (e.g. Fox/Woodcutter choice) | `src/app/warCouncil/AbilityPrompt.tsx` | inline `aria-label="Choose what the card does"` |
| Hand fan | `src/app/warCouncil/HandFan.tsx` | inline `aria-label="Your hand"` |
| Shop purchases / flask | `src/app/run/ShopPanel.tsx` | `src/app/run/shopLabels.ts` |
| Slot machine picker / pull | `src/app/run/SlotMachinePanel.tsx` | `src/app/run/slotLabels.ts` |
| Vault screen controls | `src/app/vault/VaultScreen.tsx` | `src/app/vault/vaultLabels.ts` |

See `round-driver.md` for a copy-paste driver that acts on this state and these labels, and for the click/timing pitfalls that made a naive driver unreliable.

## Reading the dump

One `javascript_tool` call, e.g.:

```js
window.__DEBUG_STATE__
```

returns the merged object. If either half (`App`'s run/phase/vault mirror, or `WarCouncilRound`'s round mirror) is missing or stale-looking (e.g. `round` present while the screen shown is the shop), don't trust it for that screen — re-orient with `read_page` instead of acting on stale data.
