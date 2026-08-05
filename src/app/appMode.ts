export const AppMode = {
  Campaign: 'campaign',
  Test: 'test',
} as const
export type AppMode = (typeof AppMode)[keyof typeof AppMode]
