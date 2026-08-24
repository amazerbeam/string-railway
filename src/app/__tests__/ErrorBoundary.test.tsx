import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import ErrorBoundary from '../ErrorBoundary'
import {
  ERROR_FALLBACK_DETAIL_LABEL,
  ERROR_FALLBACK_LOST,
  ERROR_FALLBACK_RELOAD_LABEL,
  ERROR_FALLBACK_RESTART_LABEL,
  ERROR_FALLBACK_TITLE,
  ERROR_FALLBACK_VAULT,
} from '../errorLabels'

afterEach(cleanup)

// Shaped like the real thing this boundary exists to catch: `apCostOf`'s deliberate RangeError on
// an unpriced BuffKind, which the `Unassigned` placeholder trap reached three times during the V5
// build. This spec ADDS a throw in a test double; it does not touch any production throw.
const BOOM = 'apCostOf: no AP price for buff kind "unassigned"'

/**
 * React logs a caught error and its component stack to `console.error` by design. Suppressed for
 * the duration of ONE test and restored in the same test's `finally` — never a global console mock,
 * and never a module mock. There is no other mocking in this codebase and one noisy spec is not a
 * reason to start.
 */
function withSuppressedReactErrorLog(body: () => void): void {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    body()
  } finally {
    spy.mockRestore()
  }
}

describe('ErrorBoundary', () => {
  it('renders its children untouched while nothing throws', () => {
    render(
      <ErrorBoundary>
        <p>the felt</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('the felt')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: ERROR_FALLBACK_TITLE })).toBeNull()
  })

  it('renders the fallback instead of unmounting the tree when a child throws', () => {
    function Boom(): never {
      throw new RangeError(BOOM)
    }
    withSuppressedReactErrorLog(() => {
      render(
        <ErrorBoundary>
          <p>the felt</p>
          <Boom />
        </ErrorBoundary>,
      )
      // The fallback is on screen — not a blank page.
      expect(screen.getByRole('heading', { name: ERROR_FALLBACK_TITLE })).toBeTruthy()
      expect(screen.getByText(ERROR_FALLBACK_LOST)).toBeTruthy()
      expect(screen.getByText(ERROR_FALLBACK_VAULT)).toBeTruthy()
      expect(screen.getByRole('alert')).toBeTruthy()
      // The failed subtree is gone, which is what React does and what the fallback replaces.
      expect(screen.queryByText('the felt')).toBeNull()
    })
  })

  it('shows the error message as technical detail, never the stack', () => {
    function Boom(): never {
      throw new RangeError(BOOM)
    }
    withSuppressedReactErrorLog(() => {
      const { container } = render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      )
      expect(screen.getByText(ERROR_FALLBACK_DETAIL_LABEL)).toBeTruthy()
      expect(screen.getByText(BOOM, { exact: false })).toBeTruthy()
      expect(container.textContent).not.toContain('at Boom')
    })
  })

  it('offers exactly two controls, both named by their label constants', () => {
    function Boom(): never {
      throw new RangeError(BOOM)
    }
    withSuppressedReactErrorLog(() => {
      render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      )
      expect(screen.getAllByRole('button')).toHaveLength(2)
      expect(screen.getByRole('button', { name: ERROR_FALLBACK_RESTART_LABEL })).toBeTruthy()
      expect(screen.getByRole('button', { name: ERROR_FALLBACK_RELOAD_LABEL })).toBeTruthy()
    })
  })

  it('clears the error and remounts its children when the restart control is used', () => {
    // Closure-scoped, NOT module-scoped: module-level mutable state leaks between the tests in a
    // file and survives HMR.
    let explode = true
    function Flaky() {
      if (explode) throw new RangeError(BOOM)
      return <p>the felt</p>
    }
    withSuppressedReactErrorLog(() => {
      render(
        <ErrorBoundary>
          <Flaky />
        </ErrorBoundary>,
      )
      expect(screen.getByRole('heading', { name: ERROR_FALLBACK_TITLE })).toBeTruthy()
      explode = false
      fireEvent.click(screen.getByRole('button', { name: ERROR_FALLBACK_RESTART_LABEL }))
      expect(screen.getByText('the felt')).toBeTruthy()
      expect(screen.queryByRole('heading', { name: ERROR_FALLBACK_TITLE })).toBeNull()
    })
  })

  it('normalises a non-Error throw so the detail line is always renderable', () => {
    function Boom(): never {
      // Deliberate: the boundary must survive a throw of something that is not an Error, which
      // JavaScript permits. `@typescript-eslint/only-throw-error` is not configured on this
      // project, so no disable comment is needed here.
      throw 'a bare string'
    }
    withSuppressedReactErrorLog(() => {
      render(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      )
      expect(screen.getByText('a bare string', { exact: false })).toBeTruthy()
    })
  })
})
