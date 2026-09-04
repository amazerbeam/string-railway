/**
 * Every string the `ErrorBoundary` fallback renders. Separated from the component for the same
 * reason `runLabels.ts` and `vaultLabels.ts` are: the copy is greppable, the spec asserts against
 * the same constant the component renders rather than a second copy of it, and the developer can
 * retune the wording without reading JSX.
 *
 * These strings make exactly one promise about persistence and no more. The run is in memory only
 * and is gone; the Vault is written through `saveVault` on every `commit`, so it SHOULD be intact
 * — "should", not "is", because a write can come back `SaveWriteOutcome.Rejected` on a quota error
 * or in private browsing, and the Vault screen is where that is already reported.
 */
export const ERROR_FALLBACK_TITLE = 'Something went wrong'

export const ERROR_FALLBACK_LOST =
  'The Hunt hit an error it could not recover from, and the run you were in has been lost.'

export const ERROR_FALLBACK_VAULT =
  'Vault progress is written to storage as you bank it, so anything already banked should still be there. Nothing else carries between runs.'

export const ERROR_FALLBACK_DETAIL_LABEL = 'What went wrong'

export const ERROR_FALLBACK_RESTART_LABEL = 'Start a new run'

export const ERROR_FALLBACK_RELOAD_LABEL = 'Reload the page'
