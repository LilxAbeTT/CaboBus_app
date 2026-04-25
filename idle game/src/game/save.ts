import { GAME_VERSION, createInitialState } from './content'
import { applyOfflineProgress } from './economy'
import type { GameState, OfflineProgressReport } from './types'

const STORAGE_KEY = 'campus-idle-save-v1'

export function saveGame(state: GameState) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function loadGame(now = Date.now()): {
  state: GameState
  report: OfflineProgressReport | null
} {
  if (typeof window === 'undefined') {
    return {
      state: createInitialState(now),
      report: null,
    }
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY)
  if (!rawValue) {
    return {
      state: createInitialState(now),
      report: null,
    }
  }

  try {
    const parsed = JSON.parse(rawValue) as GameState
    if (parsed.version !== GAME_VERSION) {
      return {
        state: createInitialState(now),
        report: null,
      }
    }

    return applyOfflineProgress(parsed, now)
  } catch {
    return {
      state: createInitialState(now),
      report: null,
    }
  }
}
