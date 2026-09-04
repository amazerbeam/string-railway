export { SAVE_NAMESPACE, SAVE_KEY_SEPARATOR, SAVE_SCHEMA_VERSION } from './config'

export type { StorageLike } from './storageDriver'
export { createMemoryStorage } from './storageDriver'

export { browserLocalStorage } from './browserStorage'

export type { SaveEnvelope, SaveReadResult, SaveStore, SaveStoreOptions } from './saveStore'
export { SaveReadOutcome, SaveWriteOutcome, saveKeyFor, createSaveStore } from './saveStore'
