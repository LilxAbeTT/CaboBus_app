import type {
  CampusConfig,
  CampusId,
  CareerConfig,
  CareerId,
  FacilityConfig,
  FacilityId,
  GameState,
  StaffConfig,
  StaffRole,
} from './types'

export const GAME_VERSION = 1
export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000

export const careerOrder: CareerId[] = [
  'business',
  'law',
  'design',
  'software',
  'psychology',
  'architecture',
]

export const staffOrder: StaffRole[] = [
  'professors',
  'admissions',
  'administrators',
  'maintenance',
]

export const facilityOrder: FacilityId[] = [
  'classrooms',
  'library',
  'lab',
  'studentCenter',
]

export const campusOrder: CampusId[] = [
  'campus-center',
  'campus-north',
  'campus-tech',
]

export const careerConfig: Record<CareerId, CareerConfig> = {
  business: {
    id: 'business',
    name: 'Administracion',
    tier: 1,
    color: '#0f766e',
    intro: 'La carrera de entrada. Llena aulas rapido y sostiene el flujo inicial.',
    unlockCost: 6_000,
    upgradeBaseCost: 3_200,
    baseTuitionPerStudent: 5.2,
    demandWeight: 1.25,
    reputationImpact: 0.35,
  },
  law: {
    id: 'law',
    name: 'Derecho',
    tier: 1,
    color: '#9a3412',
    intro: 'Aumenta reputacion y cobra colegiaturas ligeramente mejores.',
    unlockCost: 8_500,
    upgradeBaseCost: 4_500,
    baseTuitionPerStudent: 6.1,
    demandWeight: 1.15,
    reputationImpact: 0.4,
  },
  design: {
    id: 'design',
    name: 'Diseno Digital',
    tier: 2,
    color: '#be185d',
    intro: 'Una opcion creativa que crece bien con biblioteca y centro estudiantil.',
    unlockCost: 17_500,
    upgradeBaseCost: 8_700,
    baseTuitionPerStudent: 8.8,
    demandWeight: 0.95,
    reputationImpact: 0.65,
  },
  software: {
    id: 'software',
    name: 'Ingenieria de Software',
    tier: 2,
    color: '#1d4ed8',
    intro: 'Muy rentable, pero exige laboratorio y cuerpo docente fuerte.',
    unlockCost: 26_000,
    upgradeBaseCost: 12_500,
    baseTuitionPerStudent: 11.4,
    demandWeight: 0.88,
    reputationImpact: 0.82,
  },
  psychology: {
    id: 'psychology',
    name: 'Psicologia',
    tier: 3,
    color: '#7c3aed',
    intro: 'Sube el atractivo general del campus y mejora el prestigio final.',
    unlockCost: 42_000,
    upgradeBaseCost: 19_000,
    baseTuitionPerStudent: 13.9,
    demandWeight: 0.72,
    reputationImpact: 1.1,
  },
  architecture: {
    id: 'architecture',
    name: 'Arquitectura',
    tier: 3,
    color: '#b45309',
    intro: 'Carrera cara y aspiracional, ideal para el campus tech.',
    unlockCost: 58_000,
    upgradeBaseCost: 25_000,
    baseTuitionPerStudent: 16.8,
    demandWeight: 0.64,
    reputationImpact: 1.25,
  },
}

export const staffConfig: Record<StaffRole, StaffConfig> = {
  professors: {
    role: 'professors',
    name: 'Docentes',
    hireBaseCost: 1_600,
    salaryPerSecond: 3.8,
    growth: 1.16,
    summary: 'Aumentan la capacidad de alumnos y desbloquean carreras exigentes.',
  },
  admissions: {
    role: 'admissions',
    name: 'Admisiones',
    hireBaseCost: 1_050,
    salaryPerSecond: 2.2,
    growth: 1.13,
    summary: 'Generan aspirantes y convierten reputacion en matrículas.',
  },
  administrators: {
    role: 'administrators',
    name: 'Administrativos',
    hireBaseCost: 1_900,
    salaryPerSecond: 2.9,
    growth: 1.15,
    summary: 'Optimizan calidad, cobranza y reducen ineficiencias.',
  },
  maintenance: {
    role: 'maintenance',
    name: 'Mantenimiento',
    hireBaseCost: 1_280,
    salaryPerSecond: 2.1,
    growth: 1.12,
    summary: 'Bajan el desgaste operativo y ayudan a sostener reputacion.',
  },
}

export const facilityConfig: Record<FacilityId, FacilityConfig> = {
  classrooms: {
    id: 'classrooms',
    name: 'Aulas',
    baseCost: 4_500,
    growth: 1.28,
    summary: 'Suben la capacidad base de toda la red.',
  },
  library: {
    id: 'library',
    name: 'Biblioteca',
    baseCost: 6_200,
    growth: 1.3,
    summary: 'Mejora reputacion y la calidad percibida de las carreras.',
  },
  lab: {
    id: 'lab',
    name: 'Laboratorio',
    baseCost: 7_800,
    growth: 1.33,
    summary: 'Potencia docencia, carreras tecnicas y colegiaturas altas.',
  },
  studentCenter: {
    id: 'studentCenter',
    name: 'Centro estudiantil',
    baseCost: 5_900,
    growth: 1.29,
    summary: 'Mejora retencion y atrae mas aspirantes.',
  },
}

export const campusConfig: Record<CampusId, CampusConfig> = {
  'campus-center': {
    id: 'campus-center',
    name: 'Campus Centro',
    neighborhood: 'Distrito Historico',
    openCost: 0,
    applicantBoost: 1,
    capacityBoost: 70,
    tuitionBoost: 1,
    color: '#0f766e',
  },
  'campus-north': {
    id: 'campus-north',
    name: 'Campus Norte',
    neighborhood: 'Corredor Ejecutivo',
    openCost: 48_000,
    applicantBoost: 1.22,
    capacityBoost: 120,
    tuitionBoost: 1.08,
    color: '#b45309',
  },
  'campus-tech': {
    id: 'campus-tech',
    name: 'Campus Tech',
    neighborhood: 'Parque Innovacion',
    openCost: 110_000,
    applicantBoost: 1.36,
    capacityBoost: 185,
    tuitionBoost: 1.18,
    color: '#2563eb',
  },
}

export function createInitialState(now = Date.now()): GameState {
  return {
    version: GAME_VERSION,
    money: 22_000,
    reputation: 15,
    legacyPoints: 0,
    prestigeCount: 0,
    lifetimeTuition: 0,
    lifetimeStudentsEnrolled: 0,
    highestStudentCount: 0,
    totalSpent: 0,
    lastUpdatedAt: now,
    selectedCampusId: 'campus-center',
    selectedNodeId: 'welcome-hall',
    careers: {
      business: { unlocked: false, level: 0, students: 0 },
      law: { unlocked: false, level: 0, students: 0 },
      design: { unlocked: false, level: 0, students: 0 },
      software: { unlocked: false, level: 0, students: 0 },
      psychology: { unlocked: false, level: 0, students: 0 },
      architecture: { unlocked: false, level: 0, students: 0 },
    },
    staff: {
      professors: 1,
      admissions: 1,
      administrators: 0,
      maintenance: 0,
    },
    facilities: {
      classrooms: 1,
      library: 0,
      lab: 0,
      studentCenter: 0,
    },
    campuses: {
      'campus-center': { opened: true },
      'campus-north': { opened: false },
      'campus-tech': { opened: false },
    },
  }
}
