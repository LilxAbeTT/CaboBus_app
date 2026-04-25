export const UNIVERSITY_IDLE_TABS = [
  'campus',
  'programs',
  'staff',
  'expansion',
  'prestige',
] as const

export type UniversityTab = (typeof UNIVERSITY_IDLE_TABS)[number]

export const UNIVERSITY_NODE_KINDS = [
  'core',
  'program',
  'staff',
  'upgrade',
  'expansion',
] as const

export type UniversityNodeKind = (typeof UNIVERSITY_NODE_KINDS)[number]

export interface UniversityAnchorPoint {
  x: number
  y: number
}

export interface UniversityIdleStat {
  label: string
  value: string
  hint: string
  tone?: 'neutral' | 'good' | 'warning' | 'accent'
}

export interface UniversityIdleActionButton {
  label: string
  action: UniversityIdleAction
  tone?: 'primary' | 'secondary' | 'ghost'
}

export interface UniversityIdlePanelItem {
  label: string
  value: string
  note?: string
}

export interface UniversityIdlePanelSection {
  id: string
  tab: UniversityTab
  eyebrow: string
  title: string
  description: string
  items: UniversityIdlePanelItem[]
  actions?: UniversityIdleActionButton[]
}

export interface UniversityCampusNode {
  id: string
  label: string
  kind: UniversityNodeKind
  anchor: UniversityAnchorPoint
  tier: number
  unlocked: boolean
  selected?: boolean
  primary?: boolean
  costLabel?: string
  effectLabel?: string
  note?: string
}

export interface UniversityCampusState {
  name: string
  subtitle: string
  focusLabel: string
  nodes: UniversityCampusNode[]
}

export interface UniversityIdleViewState {
  title: string
  subtitle: string
  activeTab: UniversityTab
  lastSyncLabel: string
  statusPills: string[]
  stats: UniversityIdleStat[]
  campus: UniversityCampusState
  panels: UniversityIdlePanelSection[]
  footerNote?: string
}

export type UniversityIdleAction =
  | { type: 'selectTab'; tab: UniversityTab }
  | { type: 'selectNode'; nodeId: string }
  | { type: 'buyNode'; nodeId: string }
  | { type: 'toggleAutoInvest' }
  | { type: 'prestige' }
  | { type: 'expandCampus' }

