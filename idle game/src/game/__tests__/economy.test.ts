import { describe, expect, it } from 'vitest'
import { createInitialState } from '../content'
import {
  applyOfflineProgress,
  computeDerivedMetrics,
  getPrestigeGainPreview,
  unlockCareer,
} from '../economy'
import { gameReducer } from '../reducer'

describe('economy', () => {
  it('grows money after unlocking a career and simulating time', () => {
    const base = createInitialState(0)
    const unlocked = unlockCareer(base, 'business')
    const simulated = gameReducer(unlocked, { type: 'advanceTime', ms: 180_000 })
    const metrics = computeDerivedMetrics(simulated)

    expect(metrics.totalStudents).toBeGreaterThan(0)
    expect(simulated.money).toBeGreaterThan(unlocked.money)
  })

  it('applies offline progress and caps it to a bounded window', () => {
    const base = unlockCareer(createInitialState(0), 'business')
    const loaded = {
      ...base,
      lastUpdatedAt: 0,
    }
    const { state, report } = applyOfflineProgress(loaded, 20 * 60 * 60 * 1000)

    expect(report).not.toBeNull()
    expect(report?.elapsedMs).toBe(8 * 60 * 60 * 1000)
    expect(state.money).toBeGreaterThan(base.money)
  })

  it('awards prestige after strong run and resets operational state', () => {
    let state = unlockCareer(createInitialState(0), 'business')
    state = unlockCareer({ ...state, money: 60_000 }, 'law')
    state = {
      ...state,
      money: 200_000,
      lifetimeTuition: 600_000,
      highestStudentCount: 420,
    }

    const preview = getPrestigeGainPreview(state)
    expect(preview).toBeGreaterThan(0)

    const reset = gameReducer(state, { type: 'prestigeReset', now: 1000 })
    expect(reset.legacyPoints).toBe(preview)
    expect(reset.careers.business.unlocked).toBe(false)
    expect(reset.campuses['campus-center'].opened).toBe(true)
  })
})
