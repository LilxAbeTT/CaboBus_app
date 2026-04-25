import { careerOrder } from './content'
import { computeDerivedMetrics } from './economy'
import type { GameState, GameTextSnapshot } from './types'

export function buildTextSnapshot(state: GameState): GameTextSnapshot {
  const metrics = computeDerivedMetrics(state)

  return {
    mode: 'running',
    resources: {
      money: Math.round(state.money),
      reputation: Math.round(state.reputation * 10) / 10,
      legacyPoints: state.legacyPoints,
      prestigeCount: state.prestigeCount,
    },
    rates: {
      applicantsPerSecond: metrics.applicantRate,
      tuitionPerSecond: metrics.tuitionRate,
      netPerSecond: metrics.netRate,
    },
    campuses: Object.entries(state.campuses).map(([id, value]) => ({
      id: id as GameState['selectedCampusId'],
      opened: value.opened,
    })),
    selectedCampusId: state.selectedCampusId,
    selectedNodeId: state.selectedNodeId,
    students: {
      total: Math.round(metrics.totalStudents),
      capacity: Math.round(metrics.totalCapacity),
    },
    careers: careerOrder.map((careerId) => ({
      id: careerId,
      unlocked: state.careers[careerId].unlocked,
      level: state.careers[careerId].level,
      students: Math.round(state.careers[careerId].students),
    })),
  }
}
