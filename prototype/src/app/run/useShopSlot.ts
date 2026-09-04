import { useState } from 'react'
import {
  createSeededRng,
  mintPullAwards,
  pullMachine,
  pullPriceFor,
  pullSlotMachine,
  SLOT_MACHINE_IDS,
  slotPullRefusalFor,
  slotSeedFor,
  slotVisitStockFor,
  spinSeedFor,
  type Coins,
  type RunState,
  type SlotMachineId,
  type SlotPullRefusal,
} from '../../hunt'
import { drawVaultReelPool, type VaultState } from '../../vault'
import type { SlotMachinePanelProps, SlotPullView } from './SlotMachinePanel'

/** Every `SlotMachinePanelProps` field except the two callbacks — `useShopSlot` derives these,
 *  `SlotMachinePanel` only renders them. */
export type ShopSlotView = Omit<SlotMachinePanelProps, 'onSelectMachine' | 'onPull'>

/** What `lastPull` was resolved FOR — the `(machineId, visitIndex)` pair it belongs to, so it can
 *  be shown only while both still match the current render. */
interface LastPullRecord {
  readonly machineId: SlotMachineId
  readonly visitIndex: number
  readonly view: SlotPullView
}

/**
 * DLR-116 — the shop screen's slot machine, wired up: seeds the strip and the spin, derives the
 * price and the refusal, and commits a pull through `pullSlotMachine`. `SlotMachinePanel` computes
 * nothing; this hook is where all of it lives, per `plan.md` Part 2 → Approach.
 *
 * Two `useState` values only — the chosen machine and the last pull — and NO `useEffect`, NO
 * timer, NO listener: there is nothing to clean up. The strip is derived during render, never
 * stored: `run.encounterIndex` IS the visit index (`plan.md` Part 1 → Assumptions made), so no new
 * field is needed and nothing here can disagree with `RunState`.
 *
 * `lastPull` is stored together with the `(machineId, visitIndex)` it was resolved for and
 * rendered only while both still match the current ones — what clears a stale result on a machine
 * switch or a fight advance WITHOUT an effect.
 */
export function useShopSlot(
  run: RunState,
  vault: VaultState,
  onRun: (update: (live: RunState) => RunState) => void,
): { view: ShopSlotView; selectMachine: (id: SlotMachineId) => void; pull: () => void } {
  const [machineId, setMachineId] = useState<SlotMachineId>(SLOT_MACHINE_IDS[0])
  const [lastPull, setLastPull] = useState<LastPullRecord | null>(null)

  const stripSeed = slotSeedFor(run.runSeed, machineId, run.encounterIndex)
  const machine = drawVaultReelPool(vault, machineId, createSeededRng(stripSeed))
  const pullPrice: Coins = pullPriceFor(run.slotPullsThisVisit)
  const pullRefusal: SlotPullRefusal | null = slotPullRefusalFor(slotVisitStockFor(run))

  const visibleLastPull: SlotPullView | null =
    lastPull !== null &&
    lastPull.machineId === machineId &&
    lastPull.visitIndex === run.encounterIndex
      ? lastPull.view
      : null

  function selectMachine(id: SlotMachineId) {
    setMachineId(id)
  }

  function pull() {
    // The refusal check that gates the mint below reads the RENDER's `run` (`pullRefusal` above,
    // recomputed here as `spinSeed`/`resolved` are) — a second, back-to-back activation before
    // React re-renders resolves identically either way, because everything downstream of `run` is
    // a pure function of `run` and the pull index. The actual double-spend guard is structural,
    // not this check: the commit below goes through `onRun`'s FUNCTIONAL updater, so it is checked
    // and applied against whatever `RunState` is truly live when React runs it — the same shape
    // `handleBuy`/`handleDrinkFlask` (`App.tsx`) already commit through.
    if (slotPullRefusalFor(slotVisitStockFor(run)) !== null) return

    const spinSeed = spinSeedFor(stripSeed, run.slotPullsThisVisit)
    const resolved = pullMachine(machine, createSeededRng(spinSeed))
    const view: SlotPullView = {
      symbols: resolved.symbols,
      outcome: resolved.outcome,
      // The SAME ids `pullSlotMachine` mints below, because both read `run.nextBuffId`.
      awards: mintPullAwards(resolved, run.nextBuffId),
      // DLR-160 AC10 — `resolved.awards` themselves, before minting, so `reelTiers` can read a
      // tier by template id without `SlotMachinePanel` re-deriving `resolvePull`'s match rule.
      rawAwards: resolved.awards,
    }
    setLastPull({ machineId, visitIndex: run.encounterIndex, view })
    onRun((live) => {
      if (slotPullRefusalFor(slotVisitStockFor(live)) !== null) return live
      return pullSlotMachine(live, resolved)
    })
  }

  return {
    view: {
      machineIds: SLOT_MACHINE_IDS,
      selectedMachineId: machineId,
      reel: machine.reel,
      pullPrice,
      pullRefusal,
      lastPull: visibleLastPull,
    },
    selectMachine,
    pull,
  }
}
