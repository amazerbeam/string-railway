import { useEffect, useState } from 'react'
import { describeConfigFailures, parseRulesConfig } from '../rules/config'
import type { RulesConfig } from '../rules/config'

const RULES_URL = `${import.meta.env.BASE_URL}rules.json`

/**
 * Four states, not two. A silently failed config load means playing a
 * differently-tuned game than you think you are, which corrupts every
 * play-test conclusion drawn from the session — so `load-failed` and
 * `invalid` are distinct, and neither ever resolves to a default.
 *
 * "Empty" is modelled AS `invalid` rather than as a fifth case: a rules.json
 * with no keys is a validation failure with a specific list of missing keys,
 * which is more actionable than a generic blank state.
 */
export type RulesConfigState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly config: RulesConfig }
  | { readonly status: 'load-failed'; readonly message: string }
  | { readonly status: 'invalid'; readonly message: string }

export function useRulesConfig(): RulesConfigState {
  const [state, setState] = useState<RulesConfigState>({ status: 'loading' })

  useEffect(() => {
    // Released in the cleanup below. Without it, StrictMode's double mount
    // leaves the first request in flight and its resolution writes state
    // after teardown.
    const controller = new AbortController()

    async function load(): Promise<void> {
      try {
        const response = await fetch(RULES_URL, { signal: controller.signal })
        if (!response.ok) {
          setState({
            status: 'load-failed',
            message: `Could not load ${RULES_URL} — the server replied ${response.status} ${response.statusText}.`,
          })
          return
        }
        const raw: unknown = await response.json()
        const result = parseRulesConfig(raw)
        if (!result.ok) {
          setState({
            status: 'invalid',
            message: `${RULES_URL} loaded but is not valid: ${describeConfigFailures(result.failures)}`,
          })
          return
        }
        setState({ status: 'ready', config: result.config })
      } catch (error) {
        // An abort is our own teardown, not a failure to report — surfacing it
        // would show a spurious error on every StrictMode dev boot.
        if (controller.signal.aborted) {
          return
        }
        const detail = error instanceof Error ? error.message : String(error)
        setState({
          status: 'load-failed',
          message: `Could not load ${RULES_URL} — ${detail}`,
        })
      }
    }

    void load()

    return () => {
      controller.abort()
    }
  }, [])

  return state
}
