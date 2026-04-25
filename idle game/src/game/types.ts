export type CampusId = 'campus-center' | 'campus-north' | 'campus-tech'

export type CareerId =
  | 'business'
  | 'law'
  | 'design'
  | 'software'
  | 'psychology'
  | 'architecture'

export type StaffRole =
  | 'professors'
  | 'admissions'
  | 'administrators'
  | 'maintenance'

export type FacilityId =
  | 'classrooms'
  | 'library'
  | 'lab'
  | 'studentCenter'

export type CampusNodeId =
  | 'welcome-hall'
  | 'careers-hub'
  | 'staff-hub'
  | 'expansion-hub'
  | 'prestige-hub'
  | FacilityId
  | CareerId
  | CampusId

export type GameTabId = 'campus' | 'careers' | 'staff' | 'expansion' | 'prestige'

export interface CareerConfig {
  id: CareerId
  name: string
  tier: 1 | 2 | 3
  color: string
  intro: string
  unlockCost: number
  upgradeBaseCost: number
  baseTuitionPerStudent: number
  demandWeight: number
  reputationImpact: number
}

export interface StaffConfig {
  role: StaffRole
  name: string
  hireBaseCost: number
  salaryPerSecond: number
  growth: number
  summary: string
}

export interface FacilityConfig {
  id: FacilityId
  name: string
  baseCost: number
  growth: number
  summary: string
}

export interface CampusConfig {
  id: CampusId
  name: string
  neighborhood: string
  openCost: number
  applicantBoost: number
  capacityBoost: number
  tuitionBoost: number
  color: string
}

export interface CareerState {
  unlocked: boolean
  level: number
  students: number
}

export interface GameState {
  version: number
  money: number
  reputation: number
  legacyPoints: number
  prestigeCount: number
  lifetimeTuition: number
  lifetimeStudentsEnrolled: number
  highestStudentCount: number
  totalSpent: number
  lastUpdatedAt: number
  selectedCampusId: CampusId
  selectedNodeId: CampusNodeId
  careers: Record<CareerId, CareerState>
  staff: Record<StaffRole, number>
  facilities: Record<FacilityId, number>
  campuses: Record<CampusId, { opened: boolean }>
}

export interface DerivedMetrics {
  applicantRate: number
  grantRate: number
  tuitionRate: number
  salaryRate: number
  upkeepRate: number
  netRate: number
  totalStudents: number
  totalCapacity: number
  openCampusCount: number
  unlockedCareerCount: number
  qualityMultiplier: number
  retentionMultiplier: number
  prestigeGainPreview: number
  campusTuitionMultiplier: number
  nextCareerTierUnlocked: 1 | 2 | 3
}

export interface OfflineProgressReport {
  elapsedMs: number
  moneyDelta: number
  studentsDelta: number
}

export interface GameTextSnapshot {
  mode: 'running'
  resources: {
    money: number
    reputation: number
    legacyPoints: number
    prestigeCount: number
  }
  rates: {
    applicantsPerSecond: number
    tuitionPerSecond: number
    netPerSecond: number
  }
  campuses: Array<{
    id: CampusId
    opened: boolean
  }>
  selectedCampusId: CampusId
  selectedNodeId: CampusNodeId
  students: {
    total: number
    capacity: number
  }
  careers: Array<{
    id: CareerId
    unlocked: boolean
    level: number
    students: number
  }>
}

export type GameAction =
  | { type: 'tick'; now: number }
  | { type: 'advanceTime'; ms: number }
  | { type: 'unlockCareer'; careerId: CareerId }
  | { type: 'upgradeCareer'; careerId: CareerId }
  | { type: 'hireStaff'; role: StaffRole }
  | { type: 'upgradeFacility'; facilityId: FacilityId }
  | { type: 'openCampus'; campusId: CampusId }
  | { type: 'selectCampus'; campusId: CampusId }
  | { type: 'selectNode'; nodeId: CampusNodeId }
  | { type: 'prestigeReset'; now: number }
  | { type: 'load'; state: GameState }
