import type { Client } from './types'

/** Plan parameters. `annualReturn` is a percentage (8.5 = 8.5%). */
export interface Plan {
  initial: number
  monthly: number
  annualReturn: number
  years: number
}

export interface ProjectionPoint {
  year: number
  deposited: number
  value: number
}

export function planFromClient(c: Client): Plan {
  return {
    initial: Number(c.initial_investment),
    monthly: Number(c.monthly_deposit),
    annualReturn: Number(c.expected_annual_return),
    years: c.investment_years,
  }
}

/**
 * Future value with monthly compounding and end-of-month deposits:
 * FV = P(1+i)^n + PMT·((1+i)^n − 1)/i, where i = r/12.
 */
export function futureValue(plan: Plan, months: number): number {
  const i = plan.annualReturn / 100 / 12
  if (i === 0) return plan.initial + plan.monthly * months
  const growth = (1 + i) ** months
  return plan.initial * growth + (plan.monthly * (growth - 1)) / i
}

export function totalDeposited(plan: Plan, months: number): number {
  return plan.initial + plan.monthly * months
}

/** Year-by-year projection from year 0 to the end of the plan. */
export function projectionSeries(plan: Plan): ProjectionPoint[] {
  return Array.from({ length: plan.years + 1 }, (_, year) => ({
    year,
    deposited: Math.round(totalDeposited(plan, year * 12)),
    value: Math.round(futureValue(plan, year * 12)),
  }))
}

/** Whole months since the client joined, capped at the plan length. */
export function monthsElapsed(c: Client, now = new Date()): number {
  const start = new Date(c.created_at)
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  return Math.max(0, Math.min(months, c.investment_years * 12))
}

export interface ClientSnapshot {
  monthsElapsed: number
  depositedToDate: number
  currentValue: number
  projectedValue: number
  projectedDeposited: number
}

export function clientSnapshot(c: Client, now = new Date()): ClientSnapshot {
  const plan = planFromClient(c)
  const m = monthsElapsed(c, now)
  return {
    monthsElapsed: m,
    depositedToDate: totalDeposited(plan, m),
    currentValue: futureValue(plan, m),
    projectedValue: futureValue(plan, plan.years * 12),
    projectedDeposited: totalDeposited(plan, plan.years * 12),
  }
}
