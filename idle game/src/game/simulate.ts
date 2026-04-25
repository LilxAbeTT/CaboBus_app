import { computeDerivedMetrics, simulateTime } from './economy'
import type { CampusId, GameState } from './types'

export function simulateTick(state: GameState, deltaMs: number) {
  return simulateTime(state, deltaMs, state.lastUpdatedAt + deltaMs)
}

export function getCurrentStudentCount(state: GameState) {
  return computeDerivedMetrics(state).totalStudents
}

export function setActiveCampus(state: GameState, campusId: CampusId): GameState {
  return {
    ...state,
    selectedCampusId: campusId,
  }
}

export { canUnlockCareer, hireStaff, openCampus, prestigeReset, unlockCareer, upgradeCareer, upgradeFacility } from './economy'
