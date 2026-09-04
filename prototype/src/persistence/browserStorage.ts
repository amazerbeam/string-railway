import type { StorageLike } from './storageDriver'

/**
 * DLR-106 — THE only place in this codebase that names `localStorage`. Quarantining the browser
 * global to one function is what keeps `saveStore.ts` pure TypeScript, testable under Vitest's
 * `node` project, and free of the DOM.
 *
 * Returns `null` rather than throwing when storage is absent (node, a test run, SSR) or blocked
 * (private browsing, disabled cookies, an enterprise policy). Note the `try` covers the property
 * *read* itself, not just the calls on it: accessing `globalThis.localStorage` is what throws a
 * SecurityError in a blocked context, before any method is ever invoked.
 *
 * `null` is not an error state — it is "there is nowhere to put this", which `createSaveStore`
 * reports as `SaveReadOutcome.Unavailable` / `SaveWriteOutcome.Unavailable` rather than
 * pretending a save happened.
 */
export function browserLocalStorage(): StorageLike | null {
  try {
    const candidate = globalThis.localStorage
    return candidate ?? null
  } catch {
    return null
  }
}
