import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import { useCurrentTime } from '../../../hooks/useCurrentTime'
import { convexUrl } from '../../../lib/env'
import {
  formatElapsedSignalTime,
  getOperationalStatusLabel,
} from '../../../lib/trackingSignal'
import type {
  ActiveServiceStatus,
  BusRoute,
  PassengerMapSnapshot,
  PassengerMapVehicle,
  TransportType,
} from '../../../types/domain'
import type { ServiceOperationalStatus } from '../../../../shared/tracking'
import { usePassengerRouteSelection } from '../hooks/usePassengerRouteSelection'
import { usePassengerMapSnapshot } from '../hooks/usePassengerMapSnapshot'

function formatLastUpdate(value: string) {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

function getStatusLabel(status: ActiveServiceStatus) {
  switch (status) {
    case 'active':
      return 'Activo'
    case 'paused':
      return 'Pausado'
    case 'completed':
      return 'Finalizado'
    default:
      return status
  }
}

function getTransportTypeLabel(transportType: TransportType) {
  return transportType === 'urbano' ? 'Urbano' : 'Colectivo'
}

function getFilteredVehicles<T extends PassengerMapVehicle>(
  activeVehicles: T[],
  selectedRouteId: string | null,
): T[] {
  if (!selectedRouteId) {
    return activeVehicles
  }

  return activeVehicles.filter((vehicle) => vehicle.routeId === selectedRouteId)
}

type PassengerMapVehicleSignal = PassengerMapVehicle & {
  signalAgeLabel: string
  isVisibleInOverview: boolean
}

function decorateVehiclesWithSignalState(
  vehicles: PassengerMapVehicle[],
  currentTimeMs: number,
): PassengerMapVehicleSignal[] {
  return vehicles.map((vehicle) => {
    return {
      ...vehicle,
      signalAgeLabel: formatElapsedSignalTime(vehicle.lastUpdate, currentTimeMs),
      isVisibleInOverview: vehicle.operationalStatus !== 'probably_stopped',
    }
  })
}

function getVisibleVehicles(
  vehicles: PassengerMapVehicleSignal[],
  selectedRouteId: string | null,
): PassengerMapVehicleSignal[] {
  const filteredVehicles = getFilteredVehicles(vehicles, selectedRouteId)

  if (selectedRouteId) {
    return filteredVehicles
  }

  return filteredVehicles.filter((vehicle) => vehicle.isVisibleInOverview)
}

function getSignalBadgeClass(status: ServiceOperationalStatus) {
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

function getMarkerStyle(status: ServiceOperationalStatus) {
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

function getRouteGroups(routes: BusRoute[]) {
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

function PassengerMapEmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <section className="panel px-4 py-5 sm:px-6 sm:py-6">
      <p className="eyebrow">Passenger map</p>
      <h2 className="mt-3 font-display text-xl text-slate-900 sm:text-2xl">
        {title}
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        {description}
      </p>
    </section>
  )
}

function PassengerMapContent({
  snapshot,
  currentTimeMs,
}: {
  snapshot: PassengerMapSnapshot
  currentTimeMs: number
}) {
  const routes = snapshot.routes
  const routeGroups = useMemo(() => getRouteGroups(routes), [routes])
  const {
    hasHydratedSelection,
    selectedRouteId,
    setSelectedRouteId,
    clearSelectedRoute,
  } = usePassengerRouteSelection(routes)
  const selectedRoute =
    routes.find((route) => route.id === selectedRouteId) ?? null
  const vehiclesWithSignalState = useMemo(
    () => decorateVehiclesWithSignalState(snapshot.activeVehicles, currentTimeMs),
    [currentTimeMs, snapshot.activeVehicles],
  )
  const filteredVehicles = getFilteredVehicles(
    vehiclesWithSignalState,
    selectedRoute?.id ?? null,
  )
  const visibleVehicles = getVisibleVehicles(
    vehiclesWithSignalState,
    selectedRoute?.id ?? null,
  )
  const overviewHiddenVehicles = filteredVehicles.filter(
    (vehicle) => !vehicle.isVisibleInOverview,
  )
  const recentVisibleVehicles = visibleVehicles.filter(
    (vehicle) => vehicle.operationalStatus === 'active_recent',
  )
  const staleVisibleVehicles = visibleVehicles.filter(
    (vehicle) => vehicle.operationalStatus === 'active_stale',
  )
  const probablyStoppedVehicles = filteredVehicles.filter(
    (vehicle) => vehicle.operationalStatus === 'probably_stopped',
  )
  const primaryVehicle = visibleVehicles[0] ?? null
  const primaryRoute =
    selectedRoute ??
    routes.find((route) => route.id === filteredVehicles[0]?.routeId) ??
    routes[0] ??
    null
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const routeLayerRef = useRef<L.LayerGroup | null>(null)
  const vehicleLayerRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return
    }

    const map = L.map(mapContainerRef.current, {
      scrollWheelZoom: false,
      zoomControl: false,
    })

    mapRef.current = map
    routeLayerRef.current = L.layerGroup().addTo(map)
    vehicleLayerRef.current = L.layerGroup().addTo(map)

    L.control.zoom({ position: 'topright' }).addTo(map)

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    map.setView([23.058, -109.701], 13)

    return () => {
      map.remove()
      mapRef.current = null
      routeLayerRef.current = null
      vehicleLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const routeLayer = routeLayerRef.current
    const vehicleLayer = vehicleLayerRef.current

    if (!map || !routeLayer || !vehicleLayer) {
      return
    }

    routeLayer.clearLayers()
    vehicleLayer.clearLayers()

    if (!snapshot) {
      return
    }

    const boundsPoints: Array<[number, number]> = []

    snapshot.routes.forEach((route) => {
      const isSelectedRoute = route.id === selectedRoute?.id
      const isSecondaryRoute = Boolean(selectedRoute) && !isSelectedRoute

      route.segments.forEach((segment) => {
        const path = segment.map((point) => [point.lat, point.lng] as [number, number])
        if (!selectedRoute || isSelectedRoute) {
          path.forEach((point) => boundsPoints.push(point))
        }

        L.polyline(path, {
          color: route.color,
          weight: isSelectedRoute ? 7 : 4,
          opacity: isSecondaryRoute ? 0.22 : 0.9,
        })
          .addTo(routeLayer)
          .bindPopup(`${route.name} - ${route.direction}`)
      })
    })

    visibleVehicles.forEach((vehicle) => {
      const markerPosition: [number, number] = [vehicle.position.lat, vehicle.position.lng]
      boundsPoints.push(markerPosition)

      L.circleMarker(markerPosition, {
        ...getMarkerStyle(vehicle.operationalStatus),
      })
        .addTo(vehicleLayer)
        .bindPopup(
          `<strong>${vehicle.unitNumber}</strong><br/>${vehicle.routeName}<br/>Estado: ${getOperationalStatusLabel(vehicle.operationalStatus)}<br/>Actualizado: ${formatLastUpdate(vehicle.lastUpdate)}<br/>${vehicle.signalAgeLabel}`,
        )
    })

    if (boundsPoints.length > 0) {
      map.fitBounds(L.latLngBounds(boundsPoints).pad(0.15))
    }
  }, [selectedRoute, snapshot, visibleVehicles])

  if (!hasHydratedSelection) {
    return (
      <PassengerMapEmptyState
        title="Cargando preferencias del mapa"
        description="Restaurando la ultima ruta seleccionada para enfocar la visualizacion."
      />
    )
  }

  return (
    <section className="space-y-6">
      <article className="panel px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="eyebrow">Rutas disponibles</p>
            <h2 className="font-display text-lg text-slate-900 sm:text-xl">
              Enfoque por ruta real
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              La vista general sigue disponible, pero ahora puedes enfocarte en
              una ruta para limpiar el mapa y ver solo su operacion activa.
            </p>
          </div>
          <button
            type="button"
            onClick={clearSelectedRoute}
            disabled={!selectedRoute}
            className="flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-400 hover:text-teal-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            Ver todas las rutas
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {routeGroups.map((group) => (
            <section key={group.transportType} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {group.label}
                </p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {group.routes.length} rutas
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.routes.map((route) => {
                  const isSelected = route.id === selectedRoute?.id
                  const routeVehicles = vehiclesWithSignalState.filter(
                    (vehicle) => vehicle.routeId === route.id,
                  )
                  const routeVisibleVehicles = routeVehicles.filter(
                    (vehicle) => vehicle.isVisibleInOverview,
                  )
                  const routeProbablyStoppedVehicles = routeVehicles.filter(
                    (vehicle) => vehicle.operationalStatus === 'probably_stopped',
                  ).length

                  return (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => setSelectedRouteId(route.id)}
                      className={`route-catalog-button text-left ${
                        isSelected ? 'route-catalog-button--active' : ''
                      }`}
                    >
                      <span
                        className="h-2.5 w-14 rounded-full"
                        style={{ backgroundColor: route.color }}
                      />
                      <span className="mt-3 block font-display text-lg text-slate-900">
                        {route.name}
                      </span>
                      <span className="mt-2 block text-sm leading-6 text-slate-600">
                        {route.direction}
                      </span>
                      <span className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {routeVisibleVehicles.length} visible
                        {routeVisibleVehicles.length === 1 ? '' : 's'}
                      </span>
                      {routeProbablyStoppedVehicles > 0 ? (
                        <span className="mt-2 inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                          {routeProbablyStoppedVehicles} probablemente detenida
                          {routeProbablyStoppedVehicles === 1 ? '' : 's'}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      </article>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <article className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <p className="eyebrow">Passenger map</p>
            <h2 className="font-display text-lg text-slate-900 sm:text-xl">
              {selectedRoute ? `Ruta enfocada: ${selectedRoute.name}` : 'Vista general del mapa'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {selectedRoute
                ? 'La ruta seleccionada se resalta, las demas se atenuan y se mantienen visibles sus unidades recientes, desactualizadas o probablemente detenidas.'
                : 'La vista general muestra unidades con senal reciente o desactualizada y deja fuera del mapa principal las probablemente detenidas.'}
            </p>
          </div>
          <span className="w-fit rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-teal-700">
            Convex live
          </span>
        </div>
        <div
          ref={mapContainerRef}
          className="h-[52svh] min-h-[320px] w-full max-sm:max-h-[430px] sm:h-[480px]"
        />
        </article>

        <aside className="space-y-4">
          <article className="panel px-4 py-4 sm:px-5 sm:py-5">
            <p className="eyebrow">Ruta enfocada</p>
            {primaryRoute ? (
              <>
                <h3 className="mt-3 font-display text-xl text-slate-900 sm:text-2xl">
                  {primaryRoute.name}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {primaryRoute.direction}
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  Tipo: {getTransportTypeLabel(primaryRoute.transportType)}
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                No hay rutas activas cargadas todavia.
              </p>
            )}
          </article>

          <article className="panel px-4 py-4 sm:px-5 sm:py-5">
            <p className="eyebrow">Unidad visible</p>
            {primaryVehicle ? (
              <>
                <h3 className="mt-3 font-display text-xl text-slate-900 sm:text-2xl">
                  {primaryVehicle.unitNumber}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Operador: {primaryVehicle.driverName}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Estado: {getStatusLabel(primaryVehicle.status)}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Ultima actualizacion: {formatLastUpdate(primaryVehicle.lastUpdate)}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Tiempo desde la senal: {primaryVehicle.signalAgeLabel}
                </p>
                <p className="mt-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getSignalBadgeClass(
                      primaryVehicle.operationalStatus,
                    )}`}
                  >
                    {getOperationalStatusLabel(primaryVehicle.operationalStatus)}
                  </span>
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                {selectedRoute
                  ? 'No hay unidades activas para la ruta seleccionada.'
                  : 'No hay unidades activas visibles por ahora.'}
              </p>
            )}
          </article>

          <article className="panel px-4 py-4 sm:px-5 sm:py-5">
            <p className="eyebrow">Resumen visual</p>
            <p className="mt-3 text-sm text-slate-600">
              {selectedRoute
                ? `Se muestran ${visibleVehicles.length} unidad${visibleVehicles.length === 1 ? '' : 'es'} visible${visibleVehicles.length === 1 ? '' : 's'} sobre ${selectedRoute.name}.`
                : `Vista general con ${routes.length} rutas y ${visibleVehicles.length} unidad${visibleVehicles.length === 1 ? '' : 'es'} visible${visibleVehicles.length === 1 ? '' : 's'}.`}
            </p>
            <p className="mt-3 text-sm text-slate-600">
              Recientes: {recentVisibleVehicles.length}. Desactualizadas:{' '}
              {staleVisibleVehicles.length}. Probablemente detenidas:{' '}
              {probablyStoppedVehicles.length}
              {selectedRoute ? '.' : ` (fuera del mapa principal: ${overviewHiddenVehicles.length}).`}
            </p>
          </article>
        </aside>
      </section>
    </section>
  )
}

export function PassengerMapView() {
  if (!convexUrl) {
    return (
      <PassengerMapEmptyState
        title="Convex aun no esta configurado"
        description="Inicia Convex con un despliegue local para cargar la URL del backend en Vite y habilitar el mapa con datos reales."
      />
    )
  }

  return <PassengerMapConnectedView />
}

function PassengerMapConnectedView() {
  const currentTimeMs = useCurrentTime(15_000)
  const snapshot = usePassengerMapSnapshot(currentTimeMs)

  if (snapshot === undefined) {
    return (
      <PassengerMapEmptyState
        title="Cargando datos del mapa"
        description="Consultando rutas activas y unidades visibles desde Convex."
      />
    )
  }

  return <PassengerMapContent snapshot={snapshot} currentTimeMs={currentTimeMs} />
}
