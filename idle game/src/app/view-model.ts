import { campusConfig, campusOrder, careerConfig, careerOrder, facilityConfig, facilityOrder, staffConfig, staffOrder } from '../game/content'
import {
  canUnlockCareer,
  computeDerivedMetrics,
  getCareerUnlockCost,
  getCareerUpgradeCost,
  getFacilityUpgradeCost,
  getHireStaffCost,
  getOpenCampusCost,
} from '../game/economy'
import type { CareerId, GameState, OfflineProgressReport } from '../game/types'
import type {
  UniversityCampusNode,
  UniversityIdlePanelSection,
  UniversityIdleViewState,
  UniversityTab,
} from '../ui'

export interface ViewModelOptions {
  activeTab: UniversityTab
  autoInvestEnabled: boolean
  offlineReport: OfflineProgressReport | null
}

function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

function formatSignedCurrencyRate(value: number) {
  const prefix = value >= 0 ? '+' : '-'
  return `${prefix}${formatCompactCurrency(Math.abs(value))}/s`
}

function formatSignedCurrency(value: number) {
  const prefix = value >= 0 ? '+' : '-'
  return `${prefix}${formatCompactCurrency(Math.abs(value))}`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value)
}

function formatRelativeMs(value: number) {
  if (value < 5_000) return 'ahora'
  if (value < 60_000) return `hace ${Math.floor(value / 1000)} s`
  if (value < 3_600_000) return `hace ${Math.floor(value / 60_000)} min`
  return `hace ${Math.floor(value / 3_600_000)} h`
}

function getTierGateOpen(state: GameState, careerId: CareerId) {
  const tier = careerConfig[careerId].tier
  if (tier === 1) return true
  if (tier === 2) return state.facilities.library >= 2
  return state.facilities.library >= 4 && state.facilities.lab >= 4
}

function buildCareerNodes(state: GameState): CareerId[] {
  const unlocked = careerOrder
    .filter((careerId) => state.careers[careerId].unlocked)
    .sort((left, right) => state.careers[right].students - state.careers[left].students)

  const locked = careerOrder.filter((careerId) => !state.careers[careerId].unlocked)
  const featured: CareerId[] = []

  for (const careerId of unlocked) {
    if (featured.length >= 2) break
    featured.push(careerId)
  }

  for (const careerId of locked) {
    if (featured.length >= 2) break
    featured.push(careerId)
  }

  return featured
}

function buildCampusNodes(state: GameState): UniversityCampusNode[] {
  const metrics = computeDerivedMetrics(state)
  const featuredCareers = buildCareerNodes(state)
  const nextCampusId =
    campusOrder.find((campusId) => !state.campuses[campusId].opened) ?? state.selectedCampusId

  const baseNodes: UniversityCampusNode[] = [
    {
      id: 'welcome-hall',
      label: 'Rectoria',
      kind: 'core',
      anchor: { x: 0.5, y: 0.22 },
      tier: 1,
      unlocked: true,
      selected: state.selectedNodeId === 'welcome-hall',
      primary: true,
      effectLabel: `Red activa con ${metrics.openCampusCount} campus y ${metrics.unlockedCareerCount} carreras.`,
      note: 'Centro de decision de toda la red universitaria.',
    },
    {
      id: 'classrooms',
      label: 'Aulas',
      kind: 'upgrade',
      anchor: { x: 0.14, y: 0.62 },
      tier: 1,
      unlocked: true,
      selected: state.selectedNodeId === 'classrooms',
      costLabel: formatCompactCurrency(getFacilityUpgradeCost(state, 'classrooms')),
      effectLabel: `Nivel ${state.facilities.classrooms}. Capacidad total ${formatNumber(metrics.totalCapacity)}.`,
      note: facilityConfig.classrooms.summary,
    },
    {
      id: 'library',
      label: 'Biblioteca',
      kind: 'upgrade',
      anchor: { x: 0.37, y: 0.68 },
      tier: 2,
      unlocked: state.facilities.library > 0,
      selected: state.selectedNodeId === 'library',
      costLabel: formatCompactCurrency(getFacilityUpgradeCost(state, 'library')),
      effectLabel: `Nivel ${state.facilities.library}. Tier 2 ${state.facilities.library >= 2 ? 'abierto' : 'cerrado'}.`,
      note: facilityConfig.library.summary,
    },
    {
      id: 'lab',
      label: 'Laboratorio',
      kind: 'upgrade',
      anchor: { x: 0.63, y: 0.68 },
      tier: 2,
      unlocked: state.facilities.lab > 0,
      selected: state.selectedNodeId === 'lab',
      costLabel: formatCompactCurrency(getFacilityUpgradeCost(state, 'lab')),
      effectLabel: `Nivel ${state.facilities.lab}. Mejora carreras tecnicas y prestigio.`,
      note: facilityConfig.lab.summary,
    },
    {
      id: 'studentCenter',
      label: 'Centro estudiantil',
      kind: 'upgrade',
      anchor: { x: 0.86, y: 0.62 },
      tier: 1,
      unlocked: state.facilities.studentCenter > 0,
      selected: state.selectedNodeId === 'studentCenter',
      costLabel: formatCompactCurrency(getFacilityUpgradeCost(state, 'studentCenter')),
      effectLabel: `Nivel ${state.facilities.studentCenter}. Retencion x${metrics.retentionMultiplier}.`,
      note: facilityConfig.studentCenter.summary,
    },
  ]

  const careerAnchors = [
    { x: 0.22, y: 0.39 },
    { x: 0.78, y: 0.39 },
  ]

  const careerNodes = featuredCareers.map((careerId, index) => {
    const careerState = state.careers[careerId]
    const definition = careerConfig[careerId]
    const unlockable = canUnlockCareer(state, careerId)
    const upgradeCost = careerState.unlocked ? getCareerUpgradeCost(state, careerId) : null
    const costLabel = careerState.unlocked
      ? formatCompactCurrency(upgradeCost ?? 0)
      : formatCompactCurrency(getCareerUnlockCost(careerId))

    return {
      id: careerId,
      label: definition.name,
      kind: 'program' as const,
      anchor: careerAnchors[index] ?? careerAnchors[0],
      tier: definition.tier,
      unlocked: careerState.unlocked || unlockable,
      selected: state.selectedNodeId === careerId,
      costLabel,
      effectLabel: careerState.unlocked
        ? `Nivel ${careerState.level}. ${formatNumber(careerState.students)} alumnos activos.`
        : getTierGateOpen(state, careerId)
          ? `Carrera lista para abrir. Tier ${definition.tier}.`
          : `Requiere infraestructura para Tier ${definition.tier}.`,
      note: definition.intro,
    } satisfies UniversityCampusNode
  })

  const expansionNode: UniversityCampusNode = {
    id: nextCampusId,
    label: campusConfig[nextCampusId].name,
    kind: 'expansion',
    anchor: { x: 0.3, y: 0.85 },
    tier: nextCampusId === 'campus-tech' ? 4 : 3,
    unlocked: state.campuses[nextCampusId].opened,
    selected: state.selectedNodeId === nextCampusId,
    costLabel: state.campuses[nextCampusId].opened
      ? undefined
      : formatCompactCurrency(getOpenCampusCost(nextCampusId)),
    effectLabel: state.campuses[nextCampusId].opened
      ? `${campusConfig[nextCampusId].neighborhood}. Campus operativo.`
      : `Expande capacidad +${formatNumber(campusConfig[nextCampusId].capacityBoost)} y mejora ingresos.`,
    note: `Impulso de captacion x${campusConfig[nextCampusId].applicantBoost.toFixed(2)}.`,
  }

  const prestigeNode: UniversityCampusNode = {
    id: 'prestige-hub',
    label: 'Legado',
    kind: 'expansion',
    anchor: { x: 0.7, y: 0.85 },
    tier: 4,
    unlocked: metrics.prestigeGainPreview > 0,
    selected: state.selectedNodeId === 'prestige-hub',
    costLabel:
      metrics.prestigeGainPreview > 0 ? `${metrics.prestigeGainPreview} legado` : undefined,
    effectLabel:
      metrics.prestigeGainPreview > 0
        ? `Prestigio disponible. Reinicia para ganar ${metrics.prestigeGainPreview} puntos.`
        : 'Sigue creciendo la red para desbloquear el primer prestigio.',
    note: 'Bonos permanentes a captacion, colegiaturas y arranque.',
  }

  return [baseNodes[0], ...careerNodes, ...baseNodes.slice(1), expansionNode, prestigeNode]
}

function buildCampusPanels(state: GameState, autoInvestEnabled: boolean): UniversityIdlePanelSection[] {
  const metrics = computeDerivedMetrics(state)
  const nextFacilityId =
    facilityOrder
      .slice()
      .sort((left, right) => getFacilityUpgradeCost(state, left) - getFacilityUpgradeCost(state, right))[0] ??
    'classrooms'

  return [
    {
      id: 'campus-overview',
      tab: 'campus',
      eyebrow: 'Centro operativo',
      title: 'Resumen del rectorado',
      description:
        'El campus seleccionado concentra la vista, pero la economia corre para toda la red. Usa el canvas para saltar a mejoras clave.',
      items: [
        { label: 'Campus activos', value: formatNumber(metrics.openCampusCount), note: 'Cada sede agrega capacidad y demanda.' },
        { label: 'Capacidad', value: formatNumber(metrics.totalCapacity), note: `${formatNumber(metrics.totalStudents)} alumnos ocupan tu red.` },
        { label: 'Auto inversion', value: autoInvestEnabled ? 'Activa' : 'Manual', note: autoInvestEnabled ? 'Compra mejoras graduales.' : 'Control total de compras.' },
      ],
      actions: [
        { label: `Mejorar ${facilityConfig[nextFacilityId].name}`, action: { type: 'buyNode', nodeId: nextFacilityId }, tone: 'primary' },
        { label: autoInvestEnabled ? 'Parar auto inversion' : 'Activar auto inversion', action: { type: 'toggleAutoInvest' }, tone: 'secondary' },
      ],
    },
  ]
}

function buildProgramPanels(state: GameState): UniversityIdlePanelSection[] {
  return careerOrder.map((careerId) => {
    const definition = careerConfig[careerId]
    const careerState = state.careers[careerId]
    const unlocked = careerState.unlocked
    const canUnlock = canUnlockCareer(state, careerId)
    const nextCost = unlocked
      ? formatCompactCurrency(getCareerUpgradeCost(state, careerId))
      : formatCompactCurrency(getCareerUnlockCost(careerId))

    return {
      id: `career-${careerId}`,
      tab: 'programs',
      eyebrow: `Tier ${definition.tier}`,
      title: definition.name,
      description: definition.intro,
      items: [
        { label: 'Estado', value: unlocked ? 'Activa' : canUnlock ? 'Lista para abrir' : 'Bloqueada', note: unlocked ? `Nivel ${careerState.level}` : `Costo ${nextCost}` },
        { label: 'Alumnos', value: unlocked ? formatNumber(careerState.students) : '--', note: 'Se alimenta con admisiones y capacidad.' },
        { label: 'Colegiatura', value: formatCompactCurrency(definition.baseTuitionPerStudent), note: 'Base por alumno y por segundo.' },
      ],
      actions: [
        {
          label: unlocked ? `Mejorar ${nextCost}` : `Abrir ${nextCost}`,
          action: { type: 'buyNode', nodeId: careerId },
          tone: unlocked || canUnlock ? 'primary' : 'ghost',
        },
      ],
    }
  })
}

function buildStaffPanels(state: GameState): UniversityIdlePanelSection[] {
  return staffOrder.map((role) => {
    const definition = staffConfig[role]
    return {
      id: `staff-${role}`,
      tab: 'staff',
      eyebrow: 'Personal',
      title: definition.name,
      description: definition.summary,
      items: [
        { label: 'Plantilla', value: formatNumber(state.staff[role]), note: 'El costo crece de forma progresiva.' },
        { label: 'Contratacion', value: formatCompactCurrency(getHireStaffCost(state, role)), note: 'Pago unico por nuevo integrante.' },
        { label: 'Salario', value: `${formatCompactCurrency(definition.salaryPerSecond)}/s`, note: 'Impacta el gasto total.' },
      ],
      actions: [
        {
          label: `Contratar ${formatCompactCurrency(getHireStaffCost(state, role))}`,
          action: { type: 'buyNode', nodeId: role },
          tone: 'primary',
        },
      ],
    }
  })
}

function buildExpansionPanels(state: GameState): UniversityIdlePanelSection[] {
  return campusOrder
    .filter((campusId) => campusId !== 'campus-center')
    .map((campusId) => {
      const definition = campusConfig[campusId]
      return {
        id: `campus-${campusId}`,
        tab: 'expansion',
        eyebrow: definition.neighborhood,
        title: definition.name,
        description: 'Abrir una nueva sede eleva demanda, capacidad y potencial de prestigio.',
        items: [
          { label: 'Estado', value: state.campuses[campusId].opened ? 'Abierto' : 'Cerrado', note: state.campuses[campusId].opened ? 'Ya suma a la red.' : `Costo ${formatCompactCurrency(getOpenCampusCost(campusId))}` },
          { label: 'Capacidad extra', value: formatNumber(definition.capacityBoost), note: 'Asientos adicionales para crecer.' },
          { label: 'Ingreso', value: `x${definition.tuitionBoost.toFixed(2)}`, note: 'Multiplicador de colegiatura.' },
        ],
        actions: state.campuses[campusId].opened
          ? [{ label: 'Enfocar campus', action: { type: 'selectNode', nodeId: campusId }, tone: 'secondary' }]
          : [{ label: `Abrir ${formatCompactCurrency(getOpenCampusCost(campusId))}`, action: { type: 'buyNode', nodeId: campusId }, tone: 'primary' }],
      }
    })
}

function buildPrestigePanel(state: GameState): UniversityIdlePanelSection {
  const metrics = computeDerivedMetrics(state)
  return {
    id: 'prestige-core',
    tab: 'prestige',
    eyebrow: 'Meta progreso',
    title: 'Legado universitario',
    description:
      'El prestigio reinicia la operacion diaria, pero conserva puntos permanentes para que cada vuelta arranque mas fuerte.',
    items: [
      { label: 'Legado actual', value: formatNumber(state.legacyPoints), note: 'Bonos permanentes ya acumulados.' },
      { label: 'Prestigio disponible', value: formatNumber(metrics.prestigeGainPreview), note: 'Se calcula por ingresos, alumnos y expansion.' },
      { label: 'Run actual', value: formatCompactCurrency(state.lifetimeTuition), note: `Pico de ${formatNumber(state.highestStudentCount)} alumnos.` },
    ],
    actions: [
      {
        label:
          metrics.prestigeGainPreview > 0
            ? `Prestigiar +${metrics.prestigeGainPreview}`
            : 'Prestigio bloqueado',
        action: { type: 'prestige' },
        tone: metrics.prestigeGainPreview > 0 ? 'primary' : 'ghost',
      },
    ],
  }
}

export function buildViewState(
  state: GameState,
  options: ViewModelOptions,
): UniversityIdleViewState {
  const metrics = computeDerivedMetrics(state)
  const selectedCampus = campusConfig[state.selectedCampusId]
  const statusPills = [
    `${metrics.unlockedCareerCount}/6 carreras`,
    `${metrics.openCampusCount}/3 campus`,
    options.autoInvestEnabled ? 'Auto inversion activa' : 'Control manual',
  ]

  if (metrics.prestigeGainPreview > 0) {
    statusPills.push(`Prestigio +${metrics.prestigeGainPreview}`)
  }

  if (options.offlineReport) {
    statusPills.push(`Offline ${formatRelativeMs(options.offlineReport.elapsedMs)}`)
  }

  const panels = [
    ...buildCampusPanels(state, options.autoInvestEnabled),
    ...buildProgramPanels(state),
    ...buildStaffPanels(state),
    ...buildExpansionPanels(state),
    buildPrestigePanel(state),
  ]

  const footerNote = options.offlineReport
    ? `Progreso offline aplicado: ${formatSignedCurrency(options.offlineReport.moneyDelta)} y ${formatNumber(options.offlineReport.studentsDelta)} alumnos netos durante ${formatRelativeMs(options.offlineReport.elapsedMs)}.`
    : 'Guardado local automatico, progreso offline hasta 8 horas y hooks listos para prueba automatizada.'

  return {
    title: 'Campus Idle',
    subtitle:
      'Construye una red universitaria rentable: abre carreras, contrata personal, mejora instalaciones y expande sedes sin usar motor 3D.',
    activeTab: options.activeTab,
    lastSyncLabel: `Simulando ${formatRelativeMs(Date.now() - state.lastUpdatedAt)}`,
    statusPills,
    stats: [
      { label: 'Efectivo', value: formatCompactCurrency(state.money), hint: formatSignedCurrencyRate(metrics.netRate), tone: metrics.netRate >= 0 ? 'good' : 'warning' },
      { label: 'Ingresos', value: `${formatCompactCurrency(metrics.tuitionRate + metrics.grantRate)}/s`, hint: `${formatCompactCurrency(metrics.tuitionRate)}/s colegiaturas`, tone: 'accent' },
      { label: 'Gasto', value: `${formatCompactCurrency(metrics.salaryRate + metrics.upkeepRate)}/s`, hint: `${formatCompactCurrency(metrics.salaryRate)}/s salarios`, tone: 'warning' },
      { label: 'Alumnos', value: formatNumber(metrics.totalStudents), hint: `Capacidad ${formatNumber(metrics.totalCapacity)}`, tone: 'neutral' },
      { label: 'Reputacion', value: formatNumber(state.reputation), hint: `${formatNumber(metrics.applicantRate)} aspirantes/s`, tone: 'good' },
      { label: 'Legado', value: formatNumber(state.legacyPoints), hint: `x${(1 + state.legacyPoints * 0.02).toFixed(2)} captacion`, tone: 'accent' },
    ],
    campus: {
      name: selectedCampus.name,
      subtitle: `${selectedCampus.neighborhood} · vista de control de red`,
      focusLabel: 'Toca un nodo del campus o usa las pestañas inferiores para invertir.',
      nodes: buildCampusNodes(state),
    },
    panels,
    footerNote,
  }
}
