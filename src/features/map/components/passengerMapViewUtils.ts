import type {
  BusRoute,
  PassengerMapVehicle,
  TransportType,
} from '../../../types/domain'
import type { PassengerGeolocationPermissionState } from '../hooks/usePassengerGeolocation'
import {
  getServiceOperationalStatus,
  type ServiceOperationalStatus,
} from '../../../../shared/tracking'

export interface PassengerRouteGroup {
  transportType: TransportType
  label: string
  routes: BusRoute[]
}

export interface PassengerRouteDistanceEntry {
  route: BusRoute
  distanceMeters: number | null
}

export interface PassengerLocationStatusCopy {
  title: string
  description: string
}

export type PassengerMapVehicleView = PassengerMapVehicle & {
  isVisibleInOverview: boolean
  transportType: TransportType
}

export function formatLastUpdate(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

export function getTransportTypeLabel(transportType: TransportType) {
  return transportType === 'urbano' ? 'Urbano' : 'Colectivo'
}

export function getSignalBadgeClass(status: ServiceOperationalStatus) {
  switch (status) {
    case 'active_recent':
      return 'bg-emerald-100 text-emerald-700'
    case 'active_stale':
      return 'bg-amber-100 text-amber-700'
    case 'probably_stopped':
      return 'bg-rose-100 text-rose-700'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}

export function getMarkerStyle(status: ServiceOperationalStatus) {
  switch (status) {
    case 'active_stale':
      return {
        radius: 9,
        color: '#b45309',
        fillColor: '#f59e0b',
        fillOpacity: 0.92,
        weight: 3,
      }
    case 'probably_stopped':
      return {
        radius: 8,
        color: '#be123c',
        fillColor: '#fb7185',
        fillOpacity: 0.78,
        weight: 3,
      }
    default:
      return {
        radius: 10,
        color: '#0f766e',
        fillColor: '#2dd4bf',
        fillOpacity: 1,
        weight: 3,
      }
  }
}

export function getRouteGroups(routes: BusRoute[]): PassengerRouteGroup[] {
  const groupedRoutes = new Map<TransportType, BusRoute[]>()

  routes.forEach((route) => {
    const currentGroup = groupedRoutes.get(route.transportType) ?? []
    currentGroup.push(route)
    groupedRoutes.set(route.transportType, currentGroup)
  })

  return (['urbano', 'colectivo'] as const)
    .map((transportType) => ({
      transportType,
      label: getTransportTypeLabel(transportType),
      routes: (groupedRoutes.get(transportType) ?? []).sort((left, right) =>
        left.name.localeCompare(right.name, 'es'),
      ),
    }))
    .filter((group) => group.routes.length > 0)
}

export function formatDistanceRange(distanceMeters: number) {
  if (distanceMeters < 150) return '0 a 150 m'
  if (distanceMeters < 300) return '150 a 300 m'
  if (distanceMeters < 600) return '300 a 600 m'
  if (distanceMeters < 1_000) return '600 m a 1 km'
  if (distanceMeters < 2_000) return '1 a 2 km'
  if (distanceMeters < 4_000) return '2 a 4 km'
  return 'mas de 4 km'
}

export function parseRouteDirection(direction: string) {
  const normalizedDirection = direction.replace(/\s+/g, ' ').trim()
  const startTimeMatch = normalizedDirection.match(
    /Inicio:\s*(.+?)(?=Finaliza:|Frecuencia:|$)/i,
  )
  const endTimeMatch = normalizedDirection.match(
    /Finaliza:\s*(.+?)(?=Frecuencia:|$)/i,
  )
  const frequencyMatch = normalizedDirection.match(/Frecuencia:\s*(.+)$/i)
  const pathSummary = normalizedDirection
    .replace(/^Trayecto:\s*/i, '')
    .replace(/Inicio:\s*.+$/i, '')
    .trim()
    .replace(/[.,]\s*$/, '')

  const stops = pathSummary
    .split(/\s+-\s+|,\s*/)
    .map((stop) => stop.trim())
    .filter(
      (stop, index, allStops) =>
        stop.length > 0 && allStops.indexOf(stop) === index,
    )

  return {
    summary: pathSummary,
    stops,
    startTime: startTimeMatch?.[1]?.trim() ?? null,
    endTime: endTimeMatch?.[1]?.trim() ?? null,
    frequency: frequencyMatch?.[1]?.trim() ?? null,
  }
}

export function getRouteDistanceTone(distanceMeters: number | null) {
  if (distanceMeters === null) return 'bg-slate-100 text-slate-600'
  if (distanceMeters <= 600) return 'bg-emerald-100 text-emerald-700'
  if (distanceMeters <= 2_000) return 'bg-amber-100 text-amber-700'
  return 'bg-slate-100 text-slate-600'
}

export function getLocationStatusCopy({
  permissionState,
  isRequestingPermission,
  errorMessage,
}: {
  permissionState: PassengerGeolocationPermissionState
  isRequestingPermission: boolean
  errorMessage: string | null
}): PassengerLocationStatusCopy {
  if (isRequestingPermission) {
    return {
      title: 'Solicitando tu ubicacion',
      description: 'Acepta el permiso para ver rutas cercanas y ubicarte en el mapa.',
    }
  }

  if (permissionState === 'granted') {
    return {
      title: 'Tu ubicacion esta activa',
      description: 'Las rutas cercanas se calculan en tiempo real segun tu posicion.',
    }
  }

  if (permissionState === 'denied') {
    return {
      title: 'La ubicacion esta bloqueada',
      description:
        errorMessage ??
        'Activa el permiso del navegador para ver rutas cercanas y usar el boton de ubicacion.',
    }
  }

  if (permissionState === 'unsupported') {
    return {
      title: 'Tu navegador no soporta ubicacion',
      description: 'Puedes seguir usando el mapa, pero no se mostraran rutas cercanas a ti.',
    }
  }

  if (permissionState === 'loading') {
    return {
      title: 'Ubicando tu posicion',
      description: 'Estamos preparando el permiso y la primera lectura del mapa.',
    }
  }

  return {
    title: 'Ubicacion pendiente',
    description: 'Esperando permiso o una primera lectura de ubicacion.',
  }
}

export function decorateVehiclesWithRouteMeta(
  vehicles: PassengerMapVehicle[],
  routes: BusRoute[],
  nowMs: number,
): PassengerMapVehicleView[] {
  const routeTransportTypeById = new Map(
    routes.map((route) => [route.id, route.transportType] as const),
  )

  return vehicles.map((vehicle) => {
    const operationalStatus = getServiceOperationalStatus(vehicle.lastUpdate, nowMs)

    return {
      ...vehicle,
      operationalStatus,
      isVisibleInOverview: operationalStatus !== 'probably_stopped',
      transportType: routeTransportTypeById.get(vehicle.routeId) ?? 'urbano',
    }
  })
}

export function getDisplayedVehicles(
  vehicles: PassengerMapVehicleView[],
  activeTransportType: TransportType,
) {
  return vehicles.filter(
    (vehicle) =>
      vehicle.transportType === activeTransportType && vehicle.isVisibleInOverview,
  )
}

export function getDisplayedRoutes(
  routeGroups: PassengerRouteGroup[],
  activeTransportType: TransportType,
) {
  return (
    routeGroups.find((group) => group.transportType === activeTransportType)?.routes ??
    []
  )
}

export function getVehicleStatsByRoute(vehicles: PassengerMapVehicleView[]) {
  const statsByRouteId = new Map<string, { visible: number; stopped: number }>()

  vehicles.forEach((vehicle) => {
    const current = statsByRouteId.get(vehicle.routeId) ?? { visible: 0, stopped: 0 }

    if (vehicle.isVisibleInOverview) current.visible += 1
    if (vehicle.operationalStatus === 'probably_stopped') current.stopped += 1

    statsByRouteId.set(vehicle.routeId, current)
  })

  return statsByRouteId
}

export function getSortedRoutesByDistance(
  routes: BusRoute[],
  routeDistanceById: Map<string, number | null>,
) {
  return routes
    .map((route) => ({
      route,
      distanceMeters: routeDistanceById.get(route.id) ?? null,
    }))
    .filter((entry) => entry.distanceMeters !== null)
    .sort((left, right) => (left.distanceMeters ?? 0) - (right.distanceMeters ?? 0))
}

export function getRouteBoundsPoints(routes: BusRoute[]) {
  return routes.flatMap((route) =>
    route.segments.flatMap((segment) =>
      segment.map((point) => [point.lat, point.lng] as [number, number]),
    ),
  )
}
