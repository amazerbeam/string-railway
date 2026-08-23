/**
 * DLR-106 AC1 — the seam between "the thing that holds bytes" and "the thing that decides what
 * those bytes mean". These are the only three members of the Web Storage API this module uses.
 *
 * Injecting this interface instead of naming `localStorage` directly is forced, not stylistic:
 * `vite.config.ts` runs every `*.test.ts` under the `node` project, where `localStorage` does
 * not exist. A store that reached for the global could not be unit-tested without moving its
 * spec to `.test.tsx` and dragging in jsdom to test something with no DOM in it at all.
 */
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

/**
 * A Map-backed StorageLike. The substrate of every spec in this module, and a legitimate
 * explicit fallback for a caller that would rather hold state for the session than not at all.
 *
 * A fresh Map per call, with NO shared default instance exported — module-level mutable state
 * survives HMR and leaks between every test in one file, which is exactly the trap
 * `.claude/workflow/web-project.md` names under Correctness traps.
 */
export function createMemoryStorage(): StorageLike {
  const entries = new Map<string, string>()
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value)
    },
    removeItem: (key) => {
      entries.delete(key)
    },
  }
}
