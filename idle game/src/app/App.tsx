import { useEffect, useEffectEvent, useMemo, useReducer, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { campusOrder, careerOrder, facilityOrder, staffOrder } from '../game/content'
import {
  canUnlockCareer,
  computeDerivedMetrics,
  getCareerUpgradeCost,
  getFacilityUpgradeCost,
  getHireStaffCost,
  getOpenCampusCost,
} from '../game/economy'
import { gameReducer } from '../game/reducer'
import { loadGame, saveGame } from '../game/save'
import { buildTextSnapshot } from '../game/textState'
import type { CampusNodeId, GameAction, GameState } from '../game/types'
import { UniversityIdleScreen, type UniversityIdleAction, type UniversityTab } from '../ui'
import { buildViewState } from './view-model'
import '../styles/university-idle.css'

declare global {
  interface Window {
    render_game_to_text?: () => string
    advanceTime?: (ms: number) => void
  }
}

const initialLoad = loadGame(Date.now())

function dispatchBuyNode(state: GameState, nodeId: string): GameAction | null {
  if (facilityOrder.includes(nodeId as (typeof facilityOrder)[number])) {
    return { type: 'upgradeFacility', facilityId: nodeId as (typeof facilityOrder)[number] }
  }

  if (staffOrder.includes(nodeId as (typeof staffOrder)[number])) {
    return { type: 'hireStaff', role: nodeId as (typeof staffOrder)[number] }
  }

  if (campusOrder.includes(nodeId as (typeof campusOrder)[number])) {
    return { type: 'openCampus', campusId: nodeId as (typeof campusOrder)[number] }
  }

  if (careerOrder.includes(nodeId as (typeof careerOrder)[number])) {
    const careerId = nodeId as (typeof careerOrder)[number]
    return state.careers[careerId].unlocked
      ? { type: 'upgradeCareer', careerId }
      : { type: 'unlockCareer', careerId }
  }

  if (nodeId === 'prestige-hub') {
    return { type: 'prestigeReset', now: Date.now() }
  }

  return null
}

function pickAutoInvestAction(state: GameState): GameAction | null {
  for (const careerId of careerOrder) {
    if (!state.careers[careerId].unlocked && canUnlockCareer(state, careerId)) {
      return { type: 'unlockCareer', careerId }
    }
  }

  const metrics = computeDerivedMetrics(state)

  if (metrics.totalStudents >= metrics.totalCapacity * 0.84) {
    const classroomCost = getFacilityUpgradeCost(state, 'classrooms')
    if (state.money >= classroomCost) {
      return { type: 'upgradeFacility', facilityId: 'classrooms' }
    }
  }

  if (metrics.applicantRate < Math.max(1.2, metrics.totalStudents * 0.01)) {
    const admissionsCost = getHireStaffCost(state, 'admissions')
    if (state.money >= admissionsCost) {
      return { type: 'hireStaff', role: 'admissions' }
    }
  }

  const professorCost = getHireStaffCost(state, 'professors')
  if (state.money >= professorCost && state.staff.professors < 12 + metrics.openCampusCount * 6) {
    return { type: 'hireStaff', role: 'professors' }
  }

  const cheapFacility = facilityOrder
    .map((facilityId) => ({ facilityId, cost: getFacilityUpgradeCost(state, facilityId) }))
    .sort((left, right) => left.cost - right.cost)[0]
  if (cheapFacility && state.money >= cheapFacility.cost) {
    return { type: 'upgradeFacility', facilityId: cheapFacility.facilityId }
  }

  for (const campusId of campusOrder) {
    if (!state.campuses[campusId].opened && state.money >= getOpenCampusCost(campusId)) {
      return { type: 'openCampus', campusId }
    }
  }

  const upgradeableCareer = careerOrder
    .filter((careerId) => state.careers[careerId].unlocked)
    .map((careerId) => ({ careerId, cost: getCareerUpgradeCost(state, careerId) }))
    .filter((entry) => Number.isFinite(entry.cost) && state.money >= entry.cost)
    .sort((left, right) => left.cost - right.cost)[0]

  if (upgradeableCareer) {
    return { type: 'upgradeCareer', careerId: upgradeableCareer.careerId }
  }

  return null
}

export function App() {
  const [state, dispatch] = useReducer(gameReducer, initialLoad.state)
  const [activeTab, setActiveTab] = useState<UniversityTab>('campus')
  const [autoInvestEnabled, setAutoInvestEnabled] = useState(false)
  const [offlineReport, setOfflineReport] = useState(initialLoad.report)
  const stateRef = useRef(state)

  stateRef.current = state

  const tickGame = useEffectEvent(() => {
    dispatch({ type: 'tick', now: Date.now() })
  })

  const persistGame = useEffectEvent(() => {
    saveGame(stateRef.current)
  })

  const runAutoInvest = useEffectEvent(() => {
    if (!autoInvestEnabled) return
    const nextAction = pickAutoInvestAction(stateRef.current)
    if (nextAction) {
      dispatch(nextAction)
    }
  })

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      tickGame()
    }, 250)

    return () => window.clearInterval(intervalId)
  }, [tickGame])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      runAutoInvest()
    }, 1_500)

    return () => window.clearInterval(intervalId)
  }, [runAutoInvest])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      persistGame()
    }, 200)

    return () => window.clearTimeout(timeoutId)
  }, [persistGame, state])

  useEffect(() => {
    if (!offlineReport) return undefined

    const timeoutId = window.setTimeout(() => {
      setOfflineReport(null)
    }, 12_000)

    return () => window.clearTimeout(timeoutId)
  }, [offlineReport])

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        dispatch({ type: 'tick', now: Date.now() })
      } else {
        persistGame()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('beforeunload', persistGame)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', persistGame)
    }
  }, [persistGame])

  useEffect(() => {
    window.render_game_to_text = () => JSON.stringify(buildTextSnapshot(stateRef.current))
    window.advanceTime = (ms: number) => {
      flushSync(() => {
        dispatch({ type: 'advanceTime', ms })
      })
    }

    return () => {
      delete window.render_game_to_text
      delete window.advanceTime
    }
  }, [])

  const viewState = useMemo(() => {
    return buildViewState(state, {
      activeTab,
      autoInvestEnabled,
      offlineReport,
    })
  }, [activeTab, autoInvestEnabled, offlineReport, state])

  function handleAction(action: UniversityIdleAction) {
    switch (action.type) {
      case 'selectTab':
        setActiveTab(action.tab)
        return
      case 'toggleAutoInvest':
        setAutoInvestEnabled((current) => !current)
        return
      case 'selectNode': {
        const nodeId = action.nodeId as CampusNodeId
        dispatch({ type: 'selectNode', nodeId })
        if (campusOrder.includes(nodeId as (typeof campusOrder)[number])) {
          dispatch({ type: 'selectCampus', campusId: nodeId as (typeof campusOrder)[number] })
          setActiveTab('expansion')
        } else if (careerOrder.includes(nodeId as (typeof careerOrder)[number])) {
          setActiveTab('programs')
        } else if (staffOrder.includes(nodeId as (typeof staffOrder)[number])) {
          setActiveTab('staff')
        } else if (nodeId === 'prestige-hub') {
          setActiveTab('prestige')
        } else {
          setActiveTab('campus')
        }
        return
      }
      case 'buyNode': {
        const nextAction = dispatchBuyNode(stateRef.current, action.nodeId)
        if (nextAction) {
          dispatch(nextAction)
        }
        return
      }
      case 'expandCampus': {
        setActiveTab('expansion')
        const nextCampus = campusOrder.find((campusId) => !stateRef.current.campuses[campusId].opened)
        if (nextCampus) {
          dispatch({ type: 'selectNode', nodeId: nextCampus })
        }
        return
      }
      case 'prestige':
        dispatch({ type: 'prestigeReset', now: Date.now() })
        setActiveTab('campus')
        setOfflineReport(null)
        return
      default:
        return
    }
  }

  return <UniversityIdleScreen state={viewState} onAction={handleAction} />
}
