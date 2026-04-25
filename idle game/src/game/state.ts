import { createInitialState } from './content'
import { computeDerivedMetrics } from './economy'
import type { CampusId, GameState } from './types'

export { createInitialState as createInitialGameState }

export function getTotalStudents(state: GameState) {
  return computeDerivedMetrics(state).totalStudents
}

export function getTotalGraduates(state: GameState) {
  return Math.max(0, state.lifetimeStudentsEnrolled - getTotalStudents(state))
}

export function getUnlockedCampusCount(state: GameState) {
  return computeDerivedMetrics(state).openCampusCount
}

export function getUnlockedCareerCount(state: GameState) {
  return computeDerivedMetrics(state).unlockedCareerCount
}

export function getActiveCampusId(state: GameState) {
  return state.selectedCampusId
}

export function withUpdatedActiveCampus(state: GameState, campusId: CampusId): GameState {
  return {
    ...state,
    selectedCampusId: campusId,
  }
}
