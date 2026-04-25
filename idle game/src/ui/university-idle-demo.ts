import type { UniversityIdleViewState, UniversityTab } from './university-idle-types'

export function createDemoUniversityIdleState(): UniversityIdleViewState {
  return {
    title: 'Aldea Universitaria',
    subtitle: 'Gestion idle de campus, carreras, personal y expansion.',
    activeTab: 'campus',
    lastSyncLabel: 'Actualizado hace 8 s',
    statusPills: ['Sesion local', 'Progreso offline activo', 'Prestigio disponible'],
    stats: [
      { label: 'Efectivo', value: '$128.4K', hint: '+$1.8K/s', tone: 'good' },
      { label: 'Ingresos', value: '$2.4K/s', hint: 'Matriculas y colegiaturas', tone: 'accent' },
      { label: 'Gasto', value: '$620/s', hint: 'Docentes, personal y mantenimiento', tone: 'warning' },
      { label: 'Alumnos', value: '1,248', hint: 'Capacidad 1,560', tone: 'neutral' },
      { label: 'Reputacion', value: '72', hint: 'Aumenta captacion y precio', tone: 'good' },
      { label: 'Legado', value: '11', hint: 'Bonos permanentes', tone: 'accent' },
    ],
    campus: {
      name: 'Campus Centro',
      subtitle: 'Nodo principal de operacion con expansion por capas.',
      focusLabel: 'Selecciona un edificio para ver su impacto operativo.',
      nodes: [
        {
          id: 'core-rectory',
          label: 'Rectoria',
          kind: 'core',
          anchor: { x: 0.5, y: 0.24 },
          tier: 1,
          unlocked: true,
          selected: true,
          primary: true,
          effectLabel: '+7% reputacion y desbloqueo de investigacion',
          note: 'Centro de control del campus',
        },
        {
          id: 'program-admin',
          label: 'Administracion',
          kind: 'program',
          anchor: { x: 0.24, y: 0.38 },
          tier: 1,
          unlocked: true,
          costLabel: '$4.5K',
          effectLabel: '+12% captacion de estudiantes',
          note: 'Carrera rentable temprana',
        },
        {
          id: 'program-law',
          label: 'Derecho',
          kind: 'program',
          anchor: { x: 0.74, y: 0.38 },
          tier: 2,
          unlocked: true,
          costLabel: '$8.2K',
          effectLabel: '+20% ingreso por alumno',
          note: 'Precio mas alto por prestigio',
        },
        {
          id: 'staff-faculty',
          label: 'Docentes',
          kind: 'staff',
          anchor: { x: 0.19, y: 0.63 },
          tier: 1,
          unlocked: true,
          costLabel: '$3.1K',
          effectLabel: '-11% costo por alumno',
          note: 'Mejora capacidad de carga',
        },
        {
          id: 'staff-admissions',
          label: 'Admisiones',
          kind: 'staff',
          anchor: { x: 0.52, y: 0.63 },
          tier: 1,
          unlocked: true,
          costLabel: '$2.7K',
          effectLabel: '+15% captacion pasiva',
          note: 'Reduce friccion de entrada',
        },
        {
          id: 'upgrade-library',
          label: 'Biblioteca',
          kind: 'upgrade',
          anchor: { x: 0.82, y: 0.63 },
          tier: 2,
          unlocked: false,
          costLabel: '$12K',
          effectLabel: '+1 slot de carrera avanzada',
          note: 'Mejora investigacion y retencion',
        },
        {
          id: 'expansion-north',
          label: 'Campus Norte',
          kind: 'expansion',
          anchor: { x: 0.31, y: 0.84 },
          tier: 3,
          unlocked: false,
          costLabel: '$45K',
          effectLabel: 'Desbloquea otra sede',
          note: 'Escala el negocio a otra zona',
        },
        {
          id: 'prestige-legacy',
          label: 'Legado',
          kind: 'expansion',
          anchor: { x: 0.68, y: 0.84 },
          tier: 4,
          unlocked: false,
          costLabel: '11 legado',
          effectLabel: '+6% bonos permanentes',
          note: 'Reinicio con progreso compuesto',
        },
      ],
    },
    panels: [
      {
        id: 'campus-overview',
        tab: 'campus',
        eyebrow: 'Centro operativo',
        title: 'Lectura rapida del campus',
        description:
          'Usa el canvas para tocar edificios y abrir sus mejoras. La seleccion futura puede conectarse al simulador sin cambiar esta UI.',
        items: [
          { label: 'Campus activos', value: '1', note: 'Base inicial' },
          { label: 'Carreras desbloqueadas', value: '2', note: 'Rama rentable temprana' },
          { label: 'Bloques disponibles', value: '8', note: 'Crecimiento por fases' },
        ],
        actions: [
          { label: 'Expandir sede', action: { type: 'expandCampus' }, tone: 'primary' },
          { label: 'Auto-invertir', action: { type: 'toggleAutoInvest' }, tone: 'secondary' },
        ],
      },
      {
        id: 'programs-panel',
        tab: 'programs',
        eyebrow: 'Carreras',
        title: 'Oferta academica',
        description:
          'Cada carrera puede tener precios, cupos y margenes diferentes. La UI ya distingue crecimiento, carga y prioridad.',
        items: [
          { label: 'Administracion', value: '+12% captacion', note: 'Alta rotacion' },
          { label: 'Derecho', value: '+20% ingreso', note: 'Mayor prestigio' },
          { label: 'Software', value: 'Proxima', note: 'Bloque de expansion' },
        ],
        actions: [{ label: 'Agregar carrera', action: { type: 'selectTab', tab: 'campus' }, tone: 'ghost' }],
      },
      {
        id: 'staff-panel',
        tab: 'staff',
        eyebrow: 'Personal',
        title: 'Docentes y soporte',
        description:
          'Esta vista deja listo el espacio para mostrar contratacion, salarios y mejoras sin reestructurar el layout.',
        items: [
          { label: 'Docentes', value: '18', note: 'Capacidad estable' },
          { label: 'Administrativos', value: '7', note: 'Soporte de admision' },
          { label: 'Mantenimiento', value: '3', note: 'Costo operativo controlado' },
        ],
      },
      {
        id: 'expansion-panel',
        tab: 'expansion',
        eyebrow: 'Expansion',
        title: 'Nuevas sedes',
        description:
          'La composicion visual ya contempla sedes multiples y un estilo claro para desbloqueos grandes.',
        items: [
          { label: 'Campus Norte', value: 'Bloqueado', note: '$45K' },
          { label: 'Campus Tech', value: 'Bloqueado', note: '$120K' },
        ],
        actions: [{ label: 'Preparar sede', action: { type: 'expandCampus' }, tone: 'primary' }],
      },
      {
        id: 'prestige-panel',
        tab: 'prestige',
        eyebrow: 'Prestigio',
        title: 'Reset con legado',
        description:
          'La capa visual reserva espacio para progreso permanente, bonos y confirmacion de reinicio.',
        items: [
          { label: 'Legado disponible', value: '11', note: 'Bonos permanentes' },
          { label: 'Multiplicador', value: 'x1.18', note: 'Captacion e ingresos' },
        ],
        actions: [{ label: 'Prestigiar', action: { type: 'prestige' }, tone: 'primary' }],
      },
    ],
    footerNote: 'Visual layer lista para integrarse con la simulacion y la persistencia local.',
  }
}

export function getDemoTabSequence(): UniversityTab[] {
  return ['campus', 'programs', 'staff', 'expansion', 'prestige']
}
