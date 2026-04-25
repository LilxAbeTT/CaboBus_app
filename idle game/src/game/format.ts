import { campusConfig } from './content'
import { computeDerivedMetrics } from './economy'
import type { GameState } from './types'

function formatCompactNumber(value: number) {
  const abs = Math.abs(value)

  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1)}B`
  }

  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }

  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`
  }

  if (Number.isInteger(value)) {
    return `${value}`
  }

  return value.toFixed(1)
}

export function formatCurrency(value: number) {
  return `MXN ${formatCompactNumber(value)}`
}

export function formatRate(value: number) {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${formatCompactNumber(value)}/s`
}

export function formatPercentage(value: number) {
  return `${formatCompactNumber(value)}%`
}

export function formatDuration(ms: number) {
  const safe = Math.max(0, Math.floor(ms))
  const totalSeconds = Math.floor(safe / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }

  return `${seconds}s`
}

export interface GameSummary {
  title: string
  cashLabel: string
  reputationLabel: string
  incomeLabel: string
  expenseLabel: string
  netLabel: string
  campusesLabel: string
  careersLabel: string
  studentsLabel: string
  legacyLabel: string
  activeCampusName: string
}

export function formatGameSummary(state: GameState): GameSummary {
  const metrics = computeDerivedMetrics(state)
  const activeCampusName = campusConfig[state.selectedCampusId]?.name ?? state.selectedCampusId

  return {
    title: 'Universidad idle',
    cashLabel: formatCurrency(state.money),
    reputationLabel: `${formatCompactNumber(state.reputation)}/100`,
    incomeLabel: formatRate(metrics.tuitionRate),
    expenseLabel: formatRate(-(metrics.salaryRate + metrics.upkeepRate)),
    netLabel: formatRate(metrics.netRate),
    campusesLabel: `${metrics.openCampusCount} campus(es)`,
    careersLabel: `${metrics.unlockedCareerCount} carrera(s)`,
    studentsLabel: formatCompactNumber(metrics.totalStudents),
    legacyLabel: formatCompactNumber(state.legacyPoints),
    activeCampusName,
  }
}

export { formatCompactNumber }
