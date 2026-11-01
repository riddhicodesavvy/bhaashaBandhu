// Trusted server policy: callers cannot choose their own budgets or identities.
export const rateBudgets = {
  transcribe: 20,
  analyze: 20,
  preview: 12,
  incident: 12,
  task: 12,
  retryTranslation: 6,
  write: 60,
  gateway: 300
} as const;
export type RateOperation = keyof typeof rateBudgets;
