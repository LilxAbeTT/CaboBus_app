import {
  campusConfig,
  campusOrder,
  careerConfig,
  careerOrder,
  createInitialState,
  facilityConfig,
  staffConfig,
  staffOrder,
} from './content'
import type {
  CampusId,
  CareerId,
  DerivedMetrics,
  FacilityId,
  GameState,
  OfflineProgressReport,
  StaffRole,
} from './types'

const MIN_REPUTATION = 5
const MAX_REPUTATION = 99

function round2(value: number) {
  return Math.round(value * 100) / 100
}

export function getOpenCampusCount(state: GameState) {
  return campusOrder.reduce((count, campusId) => {
    return count + Number(state.campuses[campusId].opened)
  }, 0)
}

export function getUnlockedCareerCount(state: GameState) {
  return careerOrder.reduce((count, careerId) => {
    return count + Number(state.careers[careerId].unlocked)
  }, 0)
}

export function getHireStaffCost(state: GameState, role: StaffRole) {
  const definition = staffConfig[role]
  return Math.round(definition.hireBaseCost * definition.growth ** state.staff[role])
}

export function getFacilityUpgradeCost(state: GameState, facilityId: FacilityId) {
  const definition = facilityConfig[facilityId]
  return Math.round(definition.baseCost * definition.growth ** state.facilities[facilityId])
}

export function getCareerUnlockCost(careerId: CareerId) {
  return careerConfig[careerId].unlockCost
}

export function getCareerUpgradeCost(state: GameState, careerId: CareerId) {
  const careerState = state.careers[careerId]
  if (!careerState.unlocked) {
    return Infinity
  }

  return Math.round(
    careerConfig[careerId].upgradeBaseCost * 1.24 ** Math.max(0, careerState.level - 1),
  )
}

export function getOpenCampusCost(campusId: CampusId) {
  return campusConfig[campusId].openCost
}

export function getPrestigeGainPreview(state: GameState) {
  const unlockedCareerValue = careerOrder.reduce((value, careerId) => {
    const careerState = state.careers[careerId]
    if (!careerState.unlocked) return value
    return value + 0.5 + careerState.level * 0.2 + careerConfig[careerId].tier * 0.35
  }, 0)

  const campusValue = Math.max(0, getOpenCampusCount(state) - 1) * 2.2
  const tuitionValue = Math.sqrt(Math.max(0, state.lifetimeTuition) / 85_000)
  const studentValue = state.highestStudentCount / 180
  const rawValue = tuitionValue + campusValue + unlockedCareerValue + studentValue

  return Math.max(0, Math.floor(rawValue - state.prestigeCount * 0.45))
}

function getLegacyApplicantBoost(state: GameState) {
  return 1 + state.legacyPoints * 0.02
}

function getLegacyTuitionBoost(state: GameState) {
  return 1 + state.legacyPoints * 0.012
}

function getLegacyCostDiscount(state: GameState) {
  return Math.max(0.82, 1 - state.legacyPoints * 0.004)
}

export function computeDerivedMetrics(state: GameState): DerivedMetrics {
  const openCampusIds = campusOrder.filter((campusId) => state.campuses[campusId].opened)
  const openCampusCount = openCampusIds.length
  const unlockedCareerIds = careerOrder.filter((careerId) => state.careers[careerId].unlocked)
  const unlockedCareerCount = unlockedCareerIds.length
  const campusApplicantBoost = openCampusIds.reduce((value, campusId) => {
    return value * campusConfig[campusId].applicantBoost
  }, 1)
  const campusTuitionMultiplier = openCampusIds.reduce((value, campusId) => {
    return value * campusConfig[campusId].tuitionBoost
  }, 1)
  const campusCapacity = openCampusIds.reduce((value, campusId) => {
    return value + campusConfig[campusId].capacityBoost
  }, 0)

  const teachingPowerPerProfessor = 22 + state.facilities.lab * 3 + state.legacyPoints * 0.25
  const totalCapacity =
    Math.max(0, state.staff.professors * teachingPowerPerProfessor) +
    state.facilities.classrooms * 90 +
    campusCapacity

  const qualityMultiplier =
    (1 +
      state.facilities.library * 0.06 +
      state.facilities.lab * 0.05 +
      state.staff.administrators * 0.018) *
    getLegacyTuitionBoost(state)

  const retentionMultiplier =
    1 + state.facilities.studentCenter * 0.06 + state.staff.maintenance * 0.012

  const applicantRate =
    (0.2 +
      state.staff.admissions * 0.32 +
      unlockedCareerCount * 0.04 +
      openCampusCount * 0.06) *
    (1 + state.reputation / 120) *
    campusApplicantBoost *
    getLegacyApplicantBoost(state) *
    (1 + state.facilities.studentCenter * 0.04)

  const grantRate = 15 + openCampusCount * 5 + state.legacyPoints * 0.65

  const salaryRate = staffOrder.reduce((value, role) => {
    return value + state.staff[role] * staffConfig[role].salaryPerSecond
  }, 0)

  const maintenanceDiscount = Math.min(0.32, state.staff.maintenance * 0.022)
  const upkeepRate =
    (openCampusCount * 9 +
      state.facilities.classrooms * 2.8 +
      state.facilities.library * 2.6 +
      state.facilities.lab * 3.4 +
      state.facilities.studentCenter * 2.4) *
    (1 - maintenanceDiscount)

  const totalStudents = careerOrder.reduce((value, careerId) => {
    return value + state.careers[careerId].students
  }, 0)

  const tuitionRate = unlockedCareerIds.reduce((value, careerId) => {
    const careerState = state.careers[careerId]
    const definition = careerConfig[careerId]
    const careerLevelMultiplier = 1 + (careerState.level - 1) * 0.14
    const tierMultiplier =
      definition.tier === 1 ? 1 : definition.tier === 2 ? 1.15 + state.facilities.lab * 0.01 : 1.3

    return (
      value +
      careerState.students *
        definition.baseTuitionPerStudent *
        careerLevelMultiplier *
        tierMultiplier *
        qualityMultiplier *
        campusTuitionMultiplier
    )
  }, 0)

  return {
    applicantRate: round2(applicantRate),
    grantRate: round2(grantRate),
    tuitionRate: round2(tuitionRate),
    salaryRate: round2(salaryRate),
    upkeepRate: round2(upkeepRate),
    netRate: round2(tuitionRate + grantRate - salaryRate - upkeepRate),
    totalStudents: round2(totalStudents),
    totalCapacity: round2(totalCapacity),
    openCampusCount,
    unlockedCareerCount,
    qualityMultiplier: round2(qualityMultiplier),
    retentionMultiplier: round2(retentionMultiplier),
    prestigeGainPreview: getPrestigeGainPreview(state),
    campusTuitionMultiplier: round2(campusTuitionMultiplier),
    nextCareerTierUnlocked:
      state.facilities.lab >= 4 && state.facilities.library >= 4
        ? 3
        : state.facilities.library >= 2
          ? 2
          : 1,
  }
}

function getCareerWeights(state: GameState) {
  const unlockedCareerIds = careerOrder.filter((careerId) => state.careers[careerId].unlocked)
  const weights = new Map<CareerId, number>()

  if (unlockedCareerIds.length === 0) {
    return weights
  }

  let total = 0

  for (const careerId of unlockedCareerIds) {
    const definition = careerConfig[careerId]
    const careerState = state.careers[careerId]
    const facilityBoost =
      definition.tier === 1
        ? 1
        : definition.tier === 2
          ? 1 + state.facilities.library * 0.05
          : 1 + state.facilities.lab * 0.06 + state.facilities.library * 0.03
    const value = definition.demandWeight * (1 + Math.max(0, careerState.level - 1) * 0.18) * facilityBoost
    weights.set(careerId, value)
    total += value
  }

  for (const [careerId, value] of weights.entries()) {
    weights.set(careerId, value / total)
  }

  return weights
}

function getCareerCapacity(
  state: GameState,
  careerId: CareerId,
  totalCapacity: number,
  weight: number,
) {
  const careerState = state.careers[careerId]
  const definition = careerConfig[careerId]
  const campusFocusBoost =
    state.selectedCampusId === 'campus-tech' && definition.tier >= 2
      ? 1.08
      : state.selectedCampusId === 'campus-center' && definition.tier === 1
        ? 1.05
        : 1
  const careerScale = 1 + Math.max(0, careerState.level - 1) * 0.1
  const tierScale = definition.tier === 1 ? 1.08 : definition.tier === 2 ? 0.96 : 0.84

  return totalCapacity * weight * careerScale * tierScale * campusFocusBoost
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function stepSimulation(state: GameState, deltaMs: number, now: number): GameState {
  if (deltaMs <= 0) {
    return {
      ...state,
      lastUpdatedAt: now,
    }
  }

  const seconds = deltaMs / 1000
  const nextState: GameState = {
    ...state,
    careers: structuredClone(state.careers),
    staff: { ...state.staff },
    facilities: { ...state.facilities },
    campuses: structuredClone(state.campuses),
    lastUpdatedAt: now,
  }

  const metrics = computeDerivedMetrics(nextState)
  const weights = getCareerWeights(nextState)
  const retentionLoss = 0.00048 / metrics.retentionMultiplier
  let applicantsPool = metrics.applicantRate * seconds
  let studentsDelta = 0

  for (const careerId of careerOrder) {
    const careerState = nextState.careers[careerId]
    if (!careerState.unlocked) {
      careerState.students = 0
      continue
    }

    const weight = weights.get(careerId) ?? 0
    const capacityForCareer = getCareerCapacity(nextState, careerId, metrics.totalCapacity, weight)
    const levelDemandBoost = 1 + Math.max(0, careerState.level - 1) * 0.1
    const admitFlow = Math.min(
      applicantsPool * weight * levelDemandBoost,
      Math.max(0, capacityForCareer - careerState.students),
    )
    const churn = careerState.students * retentionLoss * seconds
    careerState.students = clamp(careerState.students + admitFlow - churn, 0, capacityForCareer)
    applicantsPool = Math.max(0, applicantsPool - admitFlow * 0.85)
    studentsDelta += admitFlow - churn
  }

  const totalStudents = careerOrder.reduce((value, careerId) => {
    return value + nextState.careers[careerId].students
  }, 0)

  nextState.lifetimeStudentsEnrolled += Math.max(0, studentsDelta)
  nextState.highestStudentCount = Math.max(nextState.highestStudentCount, totalStudents)

  const updatedMetrics = computeDerivedMetrics(nextState)
  const netGain = updatedMetrics.netRate * seconds
  const reputationTarget =
    10 +
    updatedMetrics.openCampusCount * 7 +
    updatedMetrics.unlockedCareerCount * 2.2 +
    nextState.facilities.library * 2.8 +
    nextState.facilities.studentCenter * 2.1 +
    nextState.staff.maintenance * 0.9 +
    Math.min(18, totalStudents / 60)

  nextState.money = Math.max(0, nextState.money + netGain)
  nextState.reputation = clamp(
    nextState.reputation + (reputationTarget - nextState.reputation) * Math.min(1, seconds * 0.06),
    MIN_REPUTATION,
    MAX_REPUTATION,
  )
  nextState.lifetimeTuition += updatedMetrics.tuitionRate * seconds

  return nextState
}

export function simulateTime(state: GameState, deltaMs: number, now: number): GameState {
  if (deltaMs <= 0) {
    return state
  }

  const totalDuration = Math.max(0, deltaMs)
  let elapsed = 0
  let currentState = state

  while (elapsed < totalDuration) {
    const remaining = totalDuration - elapsed
    const step = remaining > 120_000 ? 30_000 : remaining > 30_000 ? 5_000 : 1_000
    elapsed += step
    currentState = stepSimulation(currentState, step, currentState.lastUpdatedAt + step)
  }

  return {
    ...currentState,
    lastUpdatedAt: now,
  }
}

export function applyOfflineProgress(
  state: GameState,
  now = Date.now(),
): { state: GameState; report: OfflineProgressReport | null } {
  const elapsedMs = Math.min(Math.max(0, now - state.lastUpdatedAt), 8 * 60 * 60 * 1000)

  if (elapsedMs < 5_000) {
    return {
      state: {
        ...state,
        lastUpdatedAt: now,
      },
      report: null,
    }
  }

  const beforeMoney = state.money
  const beforeStudents = computeDerivedMetrics(state).totalStudents
  const simulated = simulateTime(state, elapsedMs, now)
  const afterStudents = computeDerivedMetrics(simulated).totalStudents

  return {
    state: simulated,
    report: {
      elapsedMs,
      moneyDelta: round2(simulated.money - beforeMoney),
      studentsDelta: round2(afterStudents - beforeStudents),
    },
  }
}

export function canUnlockCareer(state: GameState, careerId: CareerId) {
  const careerState = state.careers[careerId]
  if (careerState.unlocked) return false

  const definition = careerConfig[careerId]
  const tierGate =
    definition.tier === 1 ||
    (definition.tier === 2 && state.facilities.library >= 2) ||
    (definition.tier === 3 && state.facilities.library >= 4 && state.facilities.lab >= 4)

  return state.money >= definition.unlockCost * getLegacyCostDiscount(state) && tierGate
}

export function unlockCareer(state: GameState, careerId: CareerId): GameState {
  if (!canUnlockCareer(state, careerId)) {
    return state
  }

  const cost = Math.round(getCareerUnlockCost(careerId) * getLegacyCostDiscount(state))
  return {
    ...state,
    money: state.money - cost,
    totalSpent: state.totalSpent + cost,
    selectedNodeId: 'careers-hub',
    careers: {
      ...state.careers,
      [careerId]: {
        unlocked: true,
        level: 1,
        students: 0,
      },
    },
  }
}

export function upgradeCareer(state: GameState, careerId: CareerId): GameState {
  const cost = getCareerUpgradeCost(state, careerId)
  if (!Number.isFinite(cost) || state.money < cost) {
    return state
  }

  return {
    ...state,
    money: state.money - cost,
    totalSpent: state.totalSpent + cost,
    selectedNodeId: 'careers-hub',
    careers: {
      ...state.careers,
      [careerId]: {
        ...state.careers[careerId],
        level: state.careers[careerId].level + 1,
      },
    },
  }
}

export function hireStaff(state: GameState, role: StaffRole): GameState {
  const baseCost = getHireStaffCost(state, role)
  const cost = Math.round(baseCost * getLegacyCostDiscount(state))
  if (state.money < cost) {
    return state
  }

  return {
    ...state,
    money: state.money - cost,
    totalSpent: state.totalSpent + cost,
    selectedNodeId: 'staff-hub',
    staff: {
      ...state.staff,
      [role]: state.staff[role] + 1,
    },
  }
}

export function upgradeFacility(state: GameState, facilityId: FacilityId): GameState {
  const baseCost = getFacilityUpgradeCost(state, facilityId)
  const cost = Math.round(baseCost * getLegacyCostDiscount(state))
  if (state.money < cost) {
    return state
  }

  return {
    ...state,
    money: state.money - cost,
    totalSpent: state.totalSpent + cost,
    selectedNodeId: facilityId,
    facilities: {
      ...state.facilities,
      [facilityId]: state.facilities[facilityId] + 1,
    },
  }
}

export function openCampus(state: GameState, campusId: CampusId): GameState {
  if (state.campuses[campusId].opened) {
    return {
      ...state,
      selectedCampusId: campusId,
      selectedNodeId: 'expansion-hub',
    }
  }

  const cost = Math.round(getOpenCampusCost(campusId) * getLegacyCostDiscount(state))
  if (state.money < cost) {
    return state
  }

  return {
    ...state,
    money: state.money - cost,
    totalSpent: state.totalSpent + cost,
    selectedCampusId: campusId,
    selectedNodeId: 'expansion-hub',
    campuses: {
      ...state.campuses,
      [campusId]: {
        opened: true,
      },
    },
  }
}

export function prestigeReset(state: GameState, now = Date.now()): GameState {
  const gain = getPrestigeGainPreview(state)
  if (gain <= 0) {
    return state
  }

  const initial = createInitialState(now)
  return {
    ...initial,
    legacyPoints: state.legacyPoints + gain,
    prestigeCount: state.prestigeCount + 1,
  }
}
