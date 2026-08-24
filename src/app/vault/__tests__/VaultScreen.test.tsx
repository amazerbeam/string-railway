/** @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BUFF_TEMPLATES, BuffTier, RunOutcome, type Coins } from '../../../hunt'
import {
  EMPTY_VAULT,
  VAULT_EXCHANGE_RATE,
  VAULT_ODDS_BOOST_MAX_STACKS,
  VAULT_ODDS_BOOST_PRICE,
  VAULT_STARTING_TIER_PRICE,
  VaultSpendRefusal,
  type VaultState,
} from '../../../vault'
import { SaveReadOutcome, SaveWriteOutcome } from '../../../persistence'
import type { VaultHandle } from '../useVault'
import VaultScreen from '../VaultScreen'
import {
  oddsBoostAccessibleName,
  startingTierAccessibleName,
  VAULT_EMPTY_TEXT,
  VAULT_FAMILY_SELECT_LABEL,
  VAULT_LEAVE_LABEL,
  VAULT_READ_PROBLEM,
  VAULT_REFUSAL_MESSAGE,
  VAULT_SPEND_GROUP_LABEL,
  VAULT_TEMPLATE_SELECT_LABEL,
  VAULT_WRITE_PROBLEM,
  vaultBalanceText,
  vaultDepositText,
  vaultDroppedText,
} from '../vaultLabels'

afterEach(cleanup)

// The template `VaultScreen` starts on by default: the first family's first template, in
// `BUFF_TEMPLATES`' own declaration order — the exact rule the component itself uses.
const firstTemplate = BUFF_TEMPLATES[0]
const secondFamilyTemplate = BUFF_TEMPLATES.find((t) => t.kind !== firstTemplate.kind)
if (secondFamilyTemplate === undefined) {
  throw new Error('test fixture assumes BUFF_TEMPLATES spans more than one family')
}

function makeHandle(
  overrides: Partial<VaultHandle> & { readonly vault?: VaultState },
): VaultHandle {
  return {
    vault: EMPTY_VAULT,
    loadOutcome: SaveReadOutcome.Loaded,
    droppedCount: 0,
    lastWriteOutcome: null,
    commit: vi.fn(),
    ...overrides,
  }
}

const baseLeftoverCoins: Coins = VAULT_EXCHANGE_RATE * 3 + 7

describe('VaultScreen — the deposit line (loss-only rule)', () => {
  it('reads the loss sentence and the balance on a lost run that converted something', () => {
    const handle = makeHandle({ vault: { ...EMPTY_VAULT, balance: 5 } })
    render(
      <VaultScreen
        handle={handle}
        outcome={RunOutcome.Lost}
        leftoverCoins={baseLeftoverCoins}
        onLeave={vi.fn()}
      />,
    )
    expect(screen.getByText(vaultDepositText(RunOutcome.Lost, baseLeftoverCoins))).toBeTruthy()
    expect(screen.getByText(vaultBalanceText(5))).toBeTruthy()
  })

  it('reads the non-lost sentence on a WINNING run, never the lost-run sentence (case 2)', () => {
    const handle = makeHandle({})
    render(
      <VaultScreen
        handle={handle}
        outcome={RunOutcome.Won}
        leftoverCoins={baseLeftoverCoins}
        onLeave={vi.fn()}
      />,
    )
    expect(screen.getByText(vaultDepositText(RunOutcome.Won, baseLeftoverCoins))).toBeTruthy()
    expect(screen.queryByText(vaultDepositText(RunOutcome.Lost, baseLeftoverCoins))).toBeNull()
  })

  it('reads the below-rate sentence on a lost run with too little leftover coin', () => {
    const handle = makeHandle({})
    const shortCoins: Coins = VAULT_EXCHANGE_RATE - 1
    render(
      <VaultScreen
        handle={handle}
        outcome={RunOutcome.Lost}
        leftoverCoins={shortCoins}
        onLeave={vi.fn()}
      />,
    )
    expect(screen.getByText(vaultDepositText(RunOutcome.Lost, shortCoins))).toBeTruthy()
  })
})

describe('VaultScreen — the empty and save-failure states', () => {
  it('shows the empty text, no alert, and disables every buy control on a first-ever run', () => {
    const handle = makeHandle({ loadOutcome: SaveReadOutcome.Empty })
    render(
      <VaultScreen handle={handle} outcome={RunOutcome.Lost} leftoverCoins={0} onLeave={vi.fn()} />,
    )
    expect(screen.getByText(VAULT_EMPTY_TEXT)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    const spendGroup = screen.getByRole('group', { name: VAULT_SPEND_GROUP_LABEL })
    for (const button of within(spendGroup).getAllByRole('button')) {
      expect(button).toHaveProperty('disabled', true)
    }
  })

  it.each([SaveReadOutcome.Corrupt, SaveReadOutcome.VersionMismatch])(
    'shows an alert with the matching read-problem sentence for %s',
    (loadOutcome) => {
      const handle = makeHandle({ loadOutcome })
      render(
        <VaultScreen
          handle={handle}
          outcome={RunOutcome.Lost}
          leftoverCoins={0}
          onLeave={vi.fn()}
        />,
      )
      const alert = screen.getByRole('alert')
      expect(alert.textContent).toBe(VAULT_READ_PROBLEM[loadOutcome])
    },
  )

  it('shows the storage-unavailable alert', () => {
    const handle = makeHandle({ loadOutcome: SaveReadOutcome.Unavailable })
    render(
      <VaultScreen handle={handle} outcome={RunOutcome.Lost} leftoverCoins={0} onLeave={vi.fn()} />,
    )
    expect(screen.getByRole('alert').textContent).toBe(
      VAULT_READ_PROBLEM[SaveReadOutcome.Unavailable],
    )
  })

  it('reports dropped entries', () => {
    const handle = makeHandle({ droppedCount: 2 })
    render(
      <VaultScreen handle={handle} outcome={RunOutcome.Lost} leftoverCoins={0} onLeave={vi.fn()} />,
    )
    expect(screen.getByText(vaultDroppedText(2))).toBeTruthy()
  })

  it('reports a failed write', () => {
    const handle = makeHandle({ lastWriteOutcome: SaveWriteOutcome.Rejected })
    render(
      <VaultScreen handle={handle} outcome={RunOutcome.Lost} leftoverCoins={0} onLeave={vi.fn()} />,
    )
    expect(screen.getByRole('alert').textContent).toBe(
      VAULT_WRITE_PROBLEM[SaveWriteOutcome.Rejected],
    )
  })
})

describe('VaultScreen — the two spends', () => {
  it('buys an odds boost with a functional commit that reduces balance and raises the stack', () => {
    const commit = vi.fn()
    const vault: VaultState = { ...EMPTY_VAULT, balance: VAULT_ODDS_BOOST_PRICE }
    const handle = makeHandle({ vault, commit })
    render(
      <VaultScreen handle={handle} outcome={RunOutcome.Lost} leftoverCoins={0} onLeave={vi.fn()} />,
    )
    fireEvent.click(screen.getByRole('button', { name: oddsBoostAccessibleName(0, null) }))
    expect(commit).toHaveBeenCalledTimes(1)
    const updater = commit.mock.calls[0][0]
    expect(typeof updater).toBe('function')
    const result = updater(vault)
    expect(result.balance).toBe(vault.balance - VAULT_ODDS_BOOST_PRICE)
    expect(result.oddsBoosts[firstTemplate.id]).toBe(1)
  })

  it.each(Object.values(BuffTier))(
    'buys a %s starting tier, reducing balance and queuing one grant',
    (tier) => {
      const commit = vi.fn()
      const vault: VaultState = { ...EMPTY_VAULT, balance: VAULT_STARTING_TIER_PRICE[tier] }
      const handle = makeHandle({ vault, commit })
      render(
        <VaultScreen
          handle={handle}
          outcome={RunOutcome.Lost}
          leftoverCoins={0}
          onLeave={vi.fn()}
        />,
      )
      fireEvent.click(screen.getByRole('button', { name: startingTierAccessibleName(tier, null) }))
      expect(commit).toHaveBeenCalledTimes(1)
      const updater = commit.mock.calls[0][0]
      expect(typeof updater).toBe('function')
      const result = updater(vault)
      expect(result.balance).toBe(vault.balance - VAULT_STARTING_TIER_PRICE[tier])
      expect(result.startingGrants).toEqual([{ templateId: firstTemplate.id, tier }])
    },
  )

  it('does not throw when two boost purchases land before a re-render, and no-ops the second past the cap', () => {
    // Regression for the Defender's CRITICAL 1: the outer guard reads `handle.vault`, which is
    // the stale render-time prop and never advances because `commit` is mocked here — exactly
    // the shape of two purchases landing before React re-renders. Composing the captured
    // updaters in sequence (feeding the first call's result back in as the second's `prev`)
    // proves the SECOND application re-derives its own refusal against what it actually sees,
    // rather than reaching `buyOddsBoost` unconditionally and hitting its internal throw.
    const commit = vi.fn()
    const vault: VaultState = {
      ...EMPTY_VAULT,
      balance: VAULT_ODDS_BOOST_PRICE * 2,
      oddsBoosts: { [firstTemplate.id]: VAULT_ODDS_BOOST_MAX_STACKS - 1 },
    }
    const handle = makeHandle({ vault, commit })
    render(
      <VaultScreen handle={handle} outcome={RunOutcome.Lost} leftoverCoins={0} onLeave={vi.fn()} />,
    )
    const button = screen.getByRole('button', {
      name: oddsBoostAccessibleName(VAULT_ODDS_BOOST_MAX_STACKS - 1, null),
    })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(commit).toHaveBeenCalledTimes(2)
    const [firstUpdater, secondUpdater] = commit.mock.calls.map((call) => call[0])

    let result: VaultState = vault
    expect(() => {
      result = firstUpdater(result)
    }).not.toThrow()
    expect(result.oddsBoosts[firstTemplate.id]).toBe(VAULT_ODDS_BOOST_MAX_STACKS)
    expect(result.balance).toBe(vault.balance - VAULT_ODDS_BOOST_PRICE)

    const afterFirst = result
    expect(() => {
      result = secondUpdater(result)
    }).not.toThrow()
    // No-op: refused because the stack is now maxed, so the second application returns the
    // same vault the first one produced rather than spending again.
    expect(result).toEqual(afterFirst)
  })

  it('does not throw when two starting-tier purchases land before a re-render, and no-ops the second once funds run out', () => {
    const commit = vi.fn()
    const tier = BuffTier.Bronze
    const vault: VaultState = { ...EMPTY_VAULT, balance: VAULT_STARTING_TIER_PRICE[tier] }
    const handle = makeHandle({ vault, commit })
    render(
      <VaultScreen handle={handle} outcome={RunOutcome.Lost} leftoverCoins={0} onLeave={vi.fn()} />,
    )
    const button = screen.getByRole('button', { name: startingTierAccessibleName(tier, null) })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(commit).toHaveBeenCalledTimes(2)
    const [firstUpdater, secondUpdater] = commit.mock.calls.map((call) => call[0])

    let result: VaultState = vault
    expect(() => {
      result = firstUpdater(result)
    }).not.toThrow()
    expect(result.balance).toBe(0)
    expect(result.startingGrants).toEqual([{ templateId: firstTemplate.id, tier }])

    const afterFirst = result
    expect(() => {
      result = secondUpdater(result)
    }).not.toThrow()
    // No-op: refused for lack of funds, so the second application returns the same vault the
    // first one produced rather than queuing a second grant.
    expect(result).toEqual(afterFirst)
  })

  it('refuses and disables a maxed boost', () => {
    const vault: VaultState = {
      ...EMPTY_VAULT,
      balance: VAULT_ODDS_BOOST_PRICE,
      oddsBoosts: { [firstTemplate.id]: VAULT_ODDS_BOOST_MAX_STACKS },
    }
    const handle = makeHandle({ vault })
    render(
      <VaultScreen handle={handle} outcome={RunOutcome.Lost} leftoverCoins={0} onLeave={vi.fn()} />,
    )
    const name = oddsBoostAccessibleName(VAULT_ODDS_BOOST_MAX_STACKS, VaultSpendRefusal.BoostMaxed)
    const button = screen.getByRole('button', { name })
    expect(button).toHaveProperty('disabled', true)
    expect(name).toContain(VAULT_REFUSAL_MESSAGE[VaultSpendRefusal.BoostMaxed])
  })
})

describe('VaultScreen — leaving', () => {
  it('calls onLeave from the leave control', () => {
    const onLeave = vi.fn()
    const handle = makeHandle({})
    render(
      <VaultScreen handle={handle} outcome={RunOutcome.Lost} leftoverCoins={0} onLeave={onLeave} />,
    )
    fireEvent.click(screen.getByRole('button', { name: VAULT_LEAVE_LABEL }))
    expect(onLeave).toHaveBeenCalledTimes(1)
  })

  it('calls onLeave on Escape', () => {
    const onLeave = vi.fn()
    const handle = makeHandle({})
    const { container } = render(
      <VaultScreen handle={handle} outcome={RunOutcome.Lost} leftoverCoins={0} onLeave={onLeave} />,
    )
    const shell = container.querySelector('.vault-screen') as Element
    fireEvent.keyDown(shell, { key: 'Escape' })
    expect(onLeave).toHaveBeenCalledTimes(1)
  })
})

describe('VaultScreen — narrowing family then card', () => {
  it('changes the card select options when the family changes, and acts on the new template', () => {
    const commit = vi.fn()
    const vault: VaultState = { ...EMPTY_VAULT, balance: VAULT_ODDS_BOOST_PRICE }
    const handle = makeHandle({ vault, commit })
    render(
      <VaultScreen handle={handle} outcome={RunOutcome.Lost} leftoverCoins={0} onLeave={vi.fn()} />,
    )

    const familySelect = screen.getByLabelText(VAULT_FAMILY_SELECT_LABEL) as HTMLSelectElement
    const cardSelectBefore = screen.getByLabelText(VAULT_TEMPLATE_SELECT_LABEL) as HTMLSelectElement
    const optionsBefore = Array.from(cardSelectBefore.options).map((o) => o.value)
    expect(optionsBefore).toContain(firstTemplate.id)

    fireEvent.change(familySelect, { target: { value: secondFamilyTemplate.kind } })

    const cardSelectAfter = screen.getByLabelText(VAULT_TEMPLATE_SELECT_LABEL) as HTMLSelectElement
    const optionsAfter = Array.from(cardSelectAfter.options).map((o) => o.value)
    expect(optionsAfter).toContain(secondFamilyTemplate.id)
    expect(optionsAfter).not.toContain(firstTemplate.id)

    fireEvent.click(screen.getByRole('button', { name: oddsBoostAccessibleName(0, null) }))
    expect(commit).toHaveBeenCalledTimes(1)
    const updater = commit.mock.calls[0][0]
    const result = updater(vault)
    expect(result.oddsBoosts[secondFamilyTemplate.id]).toBe(1)
  })
})
