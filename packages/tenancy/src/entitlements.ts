/**
 * Plan limits, deliberately small for now: one table and one check. Billing is not implemented;
 * operators set `organizations.plan`.
 */
export interface PlanLimits {
  clients: number
  socialAccounts: number
  members: number
  monthlyPublishes: number
  monthlyAiGenerations: number
}

const TRIAL: PlanLimits = {clients: 3, socialAccounts: 3, members: 5, monthlyPublishes: 60, monthlyAiGenerations: 100}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  trial: TRIAL,
  growth: {clients: 25, socialAccounts: 50, members: 25, monthlyPublishes: 1500, monthlyAiGenerations: 2000},
  agency: {clients: 250, socialAccounts: 500, members: 200, monthlyPublishes: 15000, monthlyAiGenerations: 20000},
}

export type LimitKey = keyof PlanLimits

export function limitsFor(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] ?? TRIAL
}

/** Whether one more `key` fits the plan, given current usage. Unknown plans get trial limits. */
export function withinLimit(plan: string, key: LimitKey, currentUsage: number): boolean {
  return currentUsage < limitsFor(plan)[key]
}
