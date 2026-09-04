import { Component, type ReactNode } from 'react'
import './errorBoundary.css'
import {
  ERROR_FALLBACK_DETAIL_LABEL,
  ERROR_FALLBACK_LOST,
  ERROR_FALLBACK_RELOAD_LABEL,
  ERROR_FALLBACK_RESTART_LABEL,
  ERROR_FALLBACK_TITLE,
  ERROR_FALLBACK_VAULT,
} from './errorLabels'

interface ErrorBoundaryProps {
  readonly children: ReactNode
}

interface ErrorBoundaryState {
  /** The caught error, or `null` while the subtree is healthy. The error itself rather than a
   *  `hasError` boolean, because that is what lets the fallback show `error.message`. */
  readonly error: Error | null
}

/**
 * DLR-131 — the net under `src/`'s 98 deliberate `throw` sites across 37 files. Those throws are
 * correct and stay exactly as they are: `apCostOf` throws on an unpriced `BuffKind`,
 * `cheatDurationTricksOf` throws rather than returning a plausible small integer, `drawReelPool` throws
 * on an empty strip. This adds the backstop, not a softer floor.
 *
 * **THIS IS THE ONLY CLASS IN `src/` AND IT MUST STAY ONE.** React has no hook equivalent for
 * `getDerivedStateFromError` or `componentDidCatch` — in React 19 there is no way to write an error
 * boundary as a function component at all. "Modernising" this file into a function silently deletes
 * the mechanism while everything still type-checks, lints, and renders.
 *
 * **Mounted at the ROOT ONLY, around `<App />` in `src/main.tsx` — not per screen.** React runs a
 * `useState` functional updater during the render of the component that OWNS that state, and
 * DLR-116/DLR-118 deliberately moved the shop's and the Vault's spend guards inside those updaters.
 * So when `buyFromShop` or `buyOddsBoost` throws, it throws while React is rendering `App`, above
 * every screen — a per-screen boundary is structurally incapable of catching the exact crash that
 * prompted this ticket. A per-screen boundary also could not honestly offer to keep the run: all
 * run state lives in `App` and the screens are pure views of it, so re-entering a crashed screen
 * with the same state re-throws at once.
 *
 * **What this does NOT catch, stated so nobody assumes otherwise:** throws inside an event handler,
 * a `setTimeout`, or a rejected promise. Those escape to `window.onerror` and still blank the
 * screen. That is a second reason the in-the-updater guard convention matters — it is what brings a
 * guarded spend under this net in the first place.
 *
 * `componentDidCatch` is deliberately absent. React already prints the error and its component
 * stack itself, this prototype has no telemetry sink, and `console.log`/`console.debug` are
 * forbidden in shipped code — an empty override or a duplicate log would both be worse than the
 * omission. Add it only when there is somewhere real to send an error.
 *
 * Holds no effect, no listener, no timer and no module-level state, so there is nothing to clean up
 * and nothing for StrictMode's development double-render to double-fire.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  /** `caught` is `unknown` because JavaScript permits throwing anything. Normalised to an `Error`
   *  so `error.message` is always a renderable string — a widening, not a swallow: the thrown
   *  value's `String()` form is exactly what reaches the screen. */
  static getDerivedStateFromError(caught: unknown): ErrorBoundaryState {
    return { error: caught instanceof Error ? caught : new Error(String(caught)) }
  }

  handleRestart = () => {
    // React destroyed the failed subtree when this boundary swapped to the fallback, so clearing
    // the error mounts `App` fresh: a new run, with the Vault re-read from storage. That is exactly
    // what ERROR_FALLBACK_RESTART_LABEL promises and nothing more.
    this.setState({ error: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  render(): ReactNode {
    const { error } = this.state
    if (error === null) return this.props.children

    return (
      <main className="error-fallback" role="alert">
        <div className="error-fallback__panel">
          <h1 className="error-fallback__title">{ERROR_FALLBACK_TITLE}</h1>
          <p className="error-fallback__body">{ERROR_FALLBACK_LOST}</p>
          <p className="error-fallback__body error-fallback__body--quiet">{ERROR_FALLBACK_VAULT}</p>
          <p className="error-fallback__detail">
            <span className="error-fallback__detail-label">{ERROR_FALLBACK_DETAIL_LABEL}</span>
            {error.message}
          </p>
          <div className="error-fallback__actions">
            <button
              type="button"
              className="error-fallback__action error-fallback__action--primary"
              onClick={this.handleRestart}
            >
              {ERROR_FALLBACK_RESTART_LABEL}
            </button>
            <button type="button" className="error-fallback__action" onClick={this.handleReload}>
              {ERROR_FALLBACK_RELOAD_LABEL}
            </button>
          </div>
        </div>
      </main>
    )
  }
}
