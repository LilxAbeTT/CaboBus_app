import { createInitialState } from './content'
import {
  hireStaff,
  openCampus,
  prestigeReset,
  simulateTime,
  unlockCareer,
  upgradeCareer,
  upgradeFacility,
} from './economy'
import type { GameAction, GameState } from './types'

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'load':
      return action.state
    case 'tick': {
      const deltaMs = Math.max(0, action.now - state.lastUpdatedAt)
      return simulateTime(state, deltaMs, action.now)
    }
    case 'advanceTime':
      return simulateTime(state, action.ms, state.lastUpdatedAt + action.ms)
    case 'unlockCareer':
      return unlockCareer(state, action.careerId)
    case 'upgradeCareer':
      return upgradeCareer(state, action.careerId)
    case 'hireStaff':
      return hireStaff(state, action.role)
    case 'upgradeFacility':
      return upgradeFacility(state, action.facilityId)
    case 'openCampus':
      return openCampus(state, action.campusId)
    case 'selectCampus':
      return {
        ...state,
        selectedCampusId: action.campusId,
      }
    case 'selectNode':
      return {
        ...state,
        selectedNodeId: action.nodeId,
      }
    case 'prestigeReset':
      return prestigeReset(state, action.now)
    default:
      return state
  }
}

export function createGameState(now = Date.now()) {
  return createInitialState(now)
}
