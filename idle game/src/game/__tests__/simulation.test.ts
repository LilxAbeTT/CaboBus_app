import { describe, expect, it } from 'vitest'
import { createInitialState } from '../content'
import { applyOfflineProgress, computeDerivedMetrics, getPrestigeGainPreview, unlockCareer } from '../economy'
import { formatCurrency, formatDuration, formatGameSummary } from '../format'
import { gameReducer } from '../reducer'
import { simulateTick } from '../simulate'

describe('simulation core wrappers', () => {
  it('simulate growth through the wrapper and current economy core', () => {
    const base = createInitialState(0)
    const unlocked = unlockCareer(base, 'business')
    const ticked = simulateTick(unlocked, 180_000)
    const metrics = computeDerivedMetrics(ticked)

    expect(metrics.totalStudents).toBeGreaterThan(0)
    expect(ticked.money).toBeGreaterThan(unlocked.money)
  })

  it('applies offline progress with a capped window', () => {
    const base = unlockCareer(createInitialState(0), 'business')
    const loaded = { ...base, lastUpdatedAt: 0 }
    const result = applyOfflineProgress(loaded, 20 * 60 * 60 * 1000)

    expect(result.report?.elapsedMs).toBe(8 * 60 * 60 * 1000)
    expect(result.state.money).toBeGreaterThan(base.money)
  })

  it('keeps prestige preview and reset consistent', () => {
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

  it('formats compact labels for HUD usage', () => {
    const state = createInitialState(0)
    const summary = formatGameSummary(state)

    expect(summary.title).toBe('Universidad idle')
    expect(formatCurrency(12_345)).toMatch(/^MXN /)
    expect(formatDuration(61_000)).toBe('1m 1s')
    expect(summary.activeCampusName.length).toBeGreaterThan(0)
  })
})
