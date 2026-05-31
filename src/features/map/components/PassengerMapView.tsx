import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useSearchParams } from 'react-router'
import type {
  Feature,
  FeatureCollection,
  Geometry,
  MultiLineString,
  Point,
  Polygon,
} from 'geojson'
import {
  convexUrl,
  fallbackMapStyle,
  mapInitialCenter,
  mapInitialZoom,
  mapMaxZoom,
} from '../../../lib/env'
import { useCurrentTime } from '../../../hooks/useCurrentTime'
import { loadMapLibre } from '../../../lib/maplibreLoader'
import { getMapRuntimePerformanceProfile } from '../../../lib/runtimePerformance'
import {
  buildCirclePolygon,
  getBoundsFromPoints,
  type LatLngPoint,
} from '../../../lib/mapGeometry'
import {
  getMinimumDistanceToRouteMeters,
} from '../../../lib/trackingSignal'
import type {
  BusRoute,
  PassengerMapSnapshot,
  TransportType,
} from '../../../types/domain'
import { usePassengerGeolocation } from '../hooks/usePassengerGeolocation'
import { usePassengerRouteLibrary } from '../hooks/usePassengerRouteLibrary'
import { usePassengerMapSnapshot } from '../hooks/usePassengerMapSnapshot'
import { usePassengerRouteSelection } from '../hooks/usePassengerRouteSelection'
import {
  buildPassengerMapReferencePoints,
  countPassengerMapReferencePointsByRoute,
  type PassengerMapReferencePoint,
} from '../lib/passengerMapReferencePoints'
import { PassengerMapHeader } from './PassengerMapHeader'
import {
  PassengerMapEmptyState,
  PassengerRouteInfoModal,
  PassengerRoutePickerModal,
} from './PassengerMapOverlays'
import { PassengerMapSidebar } from './PassengerMapSidebar'
import {
  decorateVehiclesWithRouteMeta,
  formatLastUpdateTime,
  getDisplayedVehicles,
  getNearbyQuickRouteEntriesFromSortedRoutes,
  getLocationStatusCopy,
  getRecommendedRouteEntry,
  getRouteGroups,
  getSortedRoutesByDistance,
  getVehicleStatsByRoute,
  normalizeRouteSearchTerm,
  routeMatchesSearch,
  sortRoutesByUtility,
  type PassengerMapVehicleView,
} from './passengerMapViewUtils'
import type {
  GeoJSONSource,
  Map as MapLibreMap,
  MapGeoJSONFeature,
  MapLayerMouseEvent,
  Popup as MapLibrePopup,
} from 'maplibre-gl'

const ROUTES_SOURCE_ID = 'passenger-map-routes'
const ROUTES_CASING_LAYER_ID = 'passenger-map-routes-casing'
const ROUTES_LAYER_ID = 'passenger-map-routes'
const VEHICLES_SOURCE_ID = 'passenger-map-vehicles'
const VEHICLE_HALO_LAYER_ID = 'passenger-map-vehicle-halo'
const VEHICLES_LAYER_ID = 'passenger-map-vehicles'
const SELECTED_VEHICLE_SOURCE_ID = 'passenger-map-selected-vehicle'
const REFERENCE_POINTS_SOURCE_ID = 'passenger-map-reference-points'
const REFERENCE_POINTS_LAYER_ID = 'passenger-map-reference-points'
const SELECTED_REFERENCE_POINT_SOURCE_ID = 'passenger-map-selected-reference-point'
const SELECTED_REFERENCE_POINT_LAYER_ID = 'passenger-map-selected-reference-point'
const USER_SOURCE_ID = 'passenger-map-user'
const USER_ACCURACY_SOURCE_ID = 'passenger-map-user-accuracy-source'
const USER_ACCURACY_LAYER_ID = 'passenger-map-user-accuracy'
const USER_POSITION_LAYER_ID = 'passenger-map-user-position'
const PASSENGER_MAP_REFRESH_INTERVAL_MS = 15_000
const PASSENGER_MAP_FOLLOW_RESUME_DELAY_MS = 3_000
const PASSENGER_MAP_REALTIME_ENABLED = false

type RouteFeatureProperties = {
  color: string
  lineOpacity: number
  lineWidth: number
  casingOpacity: number
  casingWidth: number
}

type VehicleFeatureProperties = {
  vehicleId: string
  isSelected: boolean
  operationalStatus: PassengerMapVehicleView['operationalStatus']
}

type UserFeatureProperties = {
  kind: 'position' | 'accuracy'
}

type ReferencePointFeatureProperties = {
  referencePointId: string
  kind: PassengerMapReferencePoint['kind']
}

function emptyFeatureCollection(): FeatureCollection<Geometry> {
  return { type: 'FeatureCollection', features: [] }
}

function toLngLat(point: LatLngPoint): [number, number] {
  return [point.lng, point.lat]
}

function getRouteBounds(routes: BusRoute[]) {
  return getBoundsFromPoints(
    routes.flatMap((route) => route.segments.flatMap((segment) => segment)),
  )
}

function buildRouteFeatureCollection(
  routes: BusRoute[],
  selectedRouteId: string | null,
): FeatureCollection<MultiLineString, RouteFeatureProperties> {
  const hasSelectedRoute = Boolean(selectedRouteId)

  return {
    type: 'FeatureCollection',
    features: routes.flatMap((route) => {
      const coordinates = route.segments
        .map((segment) => segment.map(toLngLat))
        .filter((segment) => segment.length > 0)

      if (coordinates.length === 0) return []

      const isSelected = route.id === selectedRouteId
      const isSecondary = hasSelectedRoute && !isSelected

      return [
        {
          type: 'Feature',
          id: route.id,
          geometry: { type: 'MultiLineString', coordinates },
          properties: {
            color: route.color,
            lineOpacity: hasSelectedRoute ? (isSelected ? 0.98 : 0.28) : 0.82,
            lineWidth: hasSelectedRoute ? (isSelected ? 7 : 4) : 4,
            casingOpacity: isSelected ? 0.24 : isSecondary ? 0.06 : 0.14,
            casingWidth: hasSelectedRoute ? (isSelected ? 11 : 7) : 7,
          },
        } satisfies Feature<MultiLineString, RouteFeatureProperties>,
      ]
    }),
  }
}

function buildVehicleFeatureCollection(
  vehicles: PassengerMapVehicleView[],
  selectedVehicleId: string | null,
): FeatureCollection<Point, VehicleFeatureProperties> {
  return {
    type: 'FeatureCollection',
    features: vehicles.map((vehicle) => ({
      type: 'Feature',
      id: vehicle.id,
      geometry: { type: 'Point', coordinates: toLngLat(vehicle.position) },
      properties: {
        vehicleId: vehicle.id,
        isSelected: vehicle.id === selectedVehicleId,
        operationalStatus: vehicle.operationalStatus,
      },
    })),
  }
}

function buildSelectedVehicleFeatureCollection(
  vehicle: PassengerMapVehicleView | null,
): FeatureCollection<Point, VehicleFeatureProperties> {
  if (!vehicle) {
    return { type: 'FeatureCollection', features: [] }
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: vehicle.id,
        geometry: { type: 'Point', coordinates: toLngLat(vehicle.position) },
        properties: {
          vehicleId: vehicle.id,
          isSelected: true,
          operationalStatus: vehicle.operationalStatus,
        },
      },
    ],
  }
}

function buildAccuracyFeatureCollection(
  position: LatLngPoint | null,
  accuracyMeters: number | null,
): FeatureCollection<Polygon, UserFeatureProperties> {
  if (!position || !accuracyMeters || accuracyMeters <= 0) {
    return { type: 'FeatureCollection', features: [] }
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        ...buildCirclePolygon(position, Math.min(accuracyMeters, 600)),
        id: 'user-accuracy',
        properties: { kind: 'accuracy' },
      },
    ],
  }
}

function buildUserFeatureCollection(
  position: LatLngPoint | null,
  accuracyMeters: number | null,
): FeatureCollection<Geometry, UserFeatureProperties> {
  if (!position) return { type: 'FeatureCollection', features: [] }

  const features: Array<Feature<Point | Polygon, UserFeatureProperties>> = [
    {
      type: 'Feature',
      id: 'user-position',
      geometry: { type: 'Point', coordinates: toLngLat(position) },
      properties: { kind: 'position' },
    },
  ]

  if (accuracyMeters && accuracyMeters > 0) {
    features.push({
      ...buildCirclePolygon(position, Math.min(accuracyMeters, 600)),
      id: 'user-accuracy',
      properties: { kind: 'accuracy' },
    })
  }

  return { type: 'FeatureCollection', features }
}

function buildReferencePointFeatureCollection(
  referencePoints: PassengerMapReferencePoint[],
): FeatureCollection<Point, ReferencePointFeatureProperties> {
  return {
    type: 'FeatureCollection',
    features: referencePoints.map((referencePoint) => ({
      type: 'Feature',
      id: referencePoint.id,
      geometry: { type: 'Point', coordinates: toLngLat(referencePoint.position) },
      properties: {
        referencePointId: referencePoint.id,
        kind: referencePoint.kind,
      },
    })),
  }
}

function buildSelectedReferencePointFeatureCollection(
  referencePoint: PassengerMapReferencePoint | null,
): FeatureCollection<Point, ReferencePointFeatureProperties> {
  if (!referencePoint) {
    return { type: 'FeatureCollection', features: [] }
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: referencePoint.id,
        geometry: { type: 'Point', coordinates: toLngLat(referencePoint.position) },
        properties: {
          referencePointId: referencePoint.id,
          kind: referencePoint.kind,
        },
      },
    ],
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getVehiclePopupSignalMeta(
  status: PassengerMapVehicleView['operationalStatus'],
) {
  switch (status) {
    case 'active_recent':
      return { label: 'Reciente', color: '#15803d' }
    case 'active_stale':
      return { label: 'Atrasada', color: '#c2410c' }
    case 'probably_stopped':
      return { label: 'Desactivada', color: '#dc2626' }
    default:
      return { label: 'Sin estado', color: '#475569' }
  }
}

function createVehiclePopupHtml(vehicle: PassengerMapVehicleView) {
  const signalMeta = getVehiclePopupSignalMeta(vehicle.operationalStatus)

  return `
    <div class="min-w-[164px] space-y-1.5">
      <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ruta</p>
      <p class="text-sm font-semibold leading-5 text-slate-900">${escapeHtml(vehicle.routeName)}</p>
      <p class="text-sm text-slate-700">Unidad <span class="font-semibold text-slate-900">${escapeHtml(vehicle.unitNumber)}</span></p>
      <p class="text-xs font-semibold" style="color:${signalMeta.color}">
        Ultima actualizacion ${escapeHtml(formatLastUpdateTime(vehicle.lastUpdate))} · ${escapeHtml(signalMeta.label)}
      </p>
    </div>
  `.trim()
}

function createReferencePointPopupHtml(referencePoint: PassengerMapReferencePoint) {
  const routeNames = referencePoint.routeNames.filter(
    (routeName, index) => referencePoint.routeNames.indexOf(routeName) === index,
  )

  return `
    <div class="min-w-[160px] space-y-1.5">
      <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">${escapeHtml(referencePoint.sourceLabel ?? 'Punto del mapa')}</p>
      <p class="text-sm font-semibold leading-5 text-slate-900">${escapeHtml(referencePoint.label)}</p>
      ${
        routeNames.length > 0
          ? `<p class="text-xs text-slate-600">${escapeHtml(routeNames.join(' · '))}</p>`
          : ''
      }
      ${
        referencePoint.kind === 'official_stop'
          ? `<p class="text-xs font-semibold text-sky-700">Reportes consolidados: ${referencePoint.reportCount ?? 0}</p>`
          : referencePoint.kind === 'route_colony'
            ? '<p class="text-xs font-semibold text-rose-700">Colonia marcada sobre el recorrido para ubicar mejor la ruta.</p>'
            : '<p class="text-xs font-semibold text-amber-700">Referencia aproximada para ubicar mejor el recorrido.</p>'
      }
    </div>
  `.trim()
}

function LocationTargetIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
    </svg>
  )
}


function PassengerMapContent({ snapshot }: { snapshot: PassengerMapSnapshot }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedRouteId = searchParams.get('route')
  const routes = snapshot.routes
  const routeGroups = useMemo(() => getRouteGroups(routes), [routes])
  const routeById = useMemo(
    () => new Map(routes.map((route) => [route.id, route] as const)),
    [routes],
  )
  const { hasHydratedSelection, selectedRouteId, setSelectedRouteId, clearSelectedRoute } =
    usePassengerRouteSelection(routes, requestedRouteId)
  const selectedRoute = selectedRouteId ? routeById.get(selectedRouteId) ?? null : null
  const selectedRouteKey = selectedRoute?.id ?? null
  const [routeCarouselTransportType, setRouteCarouselTransportType] =
    useState<TransportType>(routeGroups[0]?.transportType ?? 'urbano')
  const [hasTransportTypeFilter, setHasTransportTypeFilter] = useState(false)
  const [routeSearchTerm, setRouteSearchTerm] = useState('')
  const deferredRouteSearchTerm = useDeferredValue(routeSearchTerm)
  const [showOnlyRoutesWithVisibleVehicles, setShowOnlyRoutesWithVisibleVehicles] =
    useState(false)
  const [isRoutePickerOpen, setRoutePickerOpen] = useState(false)
  const [routeInfoRouteId, setRouteInfoRouteId] = useState<string | null>(null)
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
  const [selectedReferencePointId, setSelectedReferencePointId] = useState<string | null>(null)
  const [centerOnUserRequestCount, setCenterOnUserRequestCount] = useState(0)
  const [mapLoadStatus, setMapLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [mapLoadError, setMapLoadError] = useState<string | null>(null)
  const [shouldShowPinchHint, setShouldShowPinchHint] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return (
      window.matchMedia('(pointer: coarse)').matches &&
      window.sessionStorage.getItem('cabobus-passenger-pinch-hint') !== '1'
    )
  })
  const {
    permissionState,
    isRequestingPermission,
    position: userPosition,
    throttledPosition,
    accuracyMeters,
    errorMessage: userLocationError,
    requestPermission,
  } = usePassengerGeolocation()
  const vehiclesWithRouteMeta = useMemo(
    () =>
      PASSENGER_MAP_REALTIME_ENABLED
        ? decorateVehiclesWithRouteMeta(snapshot.activeVehicles, routes)
        : [],
    [routes, snapshot.activeVehicles],
  )
  const vehicleById = useMemo(
    () => new Map(vehiclesWithRouteMeta.map((vehicle) => [vehicle.id, vehicle] as const)),
    [vehiclesWithRouteMeta],
  )
  const vehicleStatsByRoute = useMemo(
    () => getVehicleStatsByRoute(vehiclesWithRouteMeta),
    [vehiclesWithRouteMeta],
  )
  const referencePoints = useMemo(
    () => buildPassengerMapReferencePoints(routes, snapshot.stops),
    [routes, snapshot.stops],
  )
  const referencePointById = useMemo(
    () => new Map(referencePoints.map((referencePoint) => [referencePoint.id, referencePoint] as const)),
    [referencePoints],
  )
  const referencePointCountByRoute = useMemo(
    () => countPassengerMapReferencePointsByRoute(referencePoints),
    [referencePoints],
  )
  const colonyReferencePointCountByRoute = useMemo(
    () => countPassengerMapReferencePointsByRoute(referencePoints, ['route_colony']),
    [referencePoints],
  )
  const normalizedDeferredRouteSearchTerm = useMemo(
    () => normalizeRouteSearchTerm(deferredRouteSearchTerm),
    [deferredRouteSearchTerm],
  )
  const routeDistanceById = useMemo(() => {
    const distances = new Map<string, number | null>()

    routes.forEach((route) => {
      distances.set(
        route.id,
        throttledPosition
          ? getMinimumDistanceToRouteMeters(throttledPosition, route.segments)
          : null,
      )
    })

    return distances
  }, [routes, throttledPosition])
  const routeGroupsByUtility = useMemo(
    () =>
      routeGroups.map((group) => ({
        ...group,
        routes: sortRoutesByUtility(group.routes, routeDistanceById, vehicleStatsByRoute),
      })),
    [routeDistanceById, routeGroups, vehicleStatsByRoute],
  )

  const resolvedRouteCarouselTransportType = routeGroups.some(
    (group) => group.transportType === routeCarouselTransportType,
  )
    ? routeCarouselTransportType
    : routeGroups[0]?.transportType ?? 'urbano'

  const activeTransportType =
    selectedRoute?.transportType ?? resolvedRouteCarouselTransportType

  const mapVisualRoutes = useMemo(() => {
    return routeGroups
      .filter((group) => group.transportType === activeTransportType)
      .flatMap((group) => group.routes)
  }, [routeGroups, activeTransportType])
  const displayedVehicles = useMemo(
    () =>
      getDisplayedVehicles(
        vehiclesWithRouteMeta,
        activeTransportType,
        selectedRoute?.id,
      ),
    [activeTransportType, selectedRoute?.id, vehiclesWithRouteMeta],
  )

  const sortedRoutesByDistance = useMemo(
    () => getSortedRoutesByDistance(routes, routeDistanceById),
    [routeDistanceById, routes],
  )

  const filteredRouteGroups = useMemo(
    () =>
      routeGroupsByUtility.map((group) => ({
        ...group,
        routes: group.routes.filter(
          (route) =>
            routeMatchesSearch(route, normalizedDeferredRouteSearchTerm) &&
            (!showOnlyRoutesWithVisibleVehicles ||
              (vehicleStatsByRoute.get(route.id)?.visible ?? 0) > 0),
        ),
      })),
    [
      normalizedDeferredRouteSearchTerm,
      routeGroupsByUtility,
      showOnlyRoutesWithVisibleVehicles,
      vehicleStatsByRoute,
    ],
  )
  const filteredActiveRouteGroup =
    filteredRouteGroups.find((group) => group.transportType === activeTransportType) ??
    filteredRouteGroups[0] ??
    null

  const filteredRoutesByDistance = useMemo(() => {
    const candidateRoutes = hasTransportTypeFilter
      ? sortedRoutesByDistance.filter(
          (entry) => entry.route.transportType === activeTransportType,
        )
      : sortedRoutesByDistance

    return candidateRoutes.filter(
      (entry) =>
        routeMatchesSearch(entry.route, normalizedDeferredRouteSearchTerm) &&
        (!showOnlyRoutesWithVisibleVehicles ||
          (vehicleStatsByRoute.get(entry.route.id)?.visible ?? 0) > 0),
    )
  }, [
    activeTransportType,
    hasTransportTypeFilter,
    normalizedDeferredRouteSearchTerm,
    showOnlyRoutesWithVisibleVehicles,
    sortedRoutesByDistance,
    vehicleStatsByRoute,
  ])

  const recommendedRoute = useMemo(
    () => getRecommendedRouteEntry(filteredRoutesByDistance, vehicleStatsByRoute),
    [filteredRoutesByDistance, vehicleStatsByRoute],
  )
  const nearbyRoutes = useMemo(
    () =>
      getNearbyQuickRouteEntriesFromSortedRoutes(
        filteredActiveRouteGroup?.routes ?? [],
        routeDistanceById,
        vehicleStatsByRoute,
      ),
    [filteredActiveRouteGroup?.routes, routeDistanceById, vehicleStatsByRoute],
  )
  const locationStatusCopy = useMemo(
    () =>
      getLocationStatusCopy({
        permissionState,
        isRequestingPermission,
        errorMessage: userLocationError,
      }),
    [isRequestingPermission, permissionState, userLocationError],
  )
  const selectedVehicle = useMemo(
    () => (selectedVehicleId ? vehicleById.get(selectedVehicleId) ?? null : null),
    [selectedVehicleId, vehicleById],
  )
  const selectedReferencePoint = useMemo(
    () =>
      selectedReferencePointId
        ? referencePointById.get(selectedReferencePointId) ?? null
        : null,
    [referencePointById, selectedReferencePointId],
  )
  const displayedReferencePoints = useMemo(() => {
    const visibleRouteIds = new Set(
      (selectedRoute ? [selectedRoute] : mapVisualRoutes).map((route) => route.id),
    )

    return referencePoints.filter((referencePoint) =>
      referencePoint.routeIds.some((routeId) => visibleRouteIds.has(routeId)),
    )
  }, [mapVisualRoutes, referencePoints, selectedRoute])
  const routeInfoRoute =
    routeInfoRouteId ? routeById.get(routeInfoRouteId) ?? null : null
  const {
    favoriteRouteIdSet,
    toggleFavoriteRoute,
    recordRouteUsage,
  } = usePassengerRouteLibrary(routes)


  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapLibreRef = useRef<Awaited<ReturnType<typeof loadMapLibre>> | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const popupRef = useRef<MapLibrePopup | null>(null)
  const attemptedFallbackStyleRef = useRef(false)
  const didFitInitialViewRef = useRef(false)
  const lastFittedViewKeyRef = useRef<string | null>(null)
  const isProgrammaticMapMoveRef = useRef(false)
  const isVehicleFollowPausedRef = useRef(false)
  const followResumeTimeoutRef = useRef<number | null>(null)
  const followedVehiclePositionRef = useRef<{
    vehicleId: string
    lat: number
    lng: number
  } | null>(null)
  const mapPerformanceProfile = useMemo(() => getMapRuntimePerformanceProfile(), [])
  const showPinchHint = mapLoadStatus === 'ready' && shouldShowPinchHint
  const routeFeatureCollection = useMemo(
    () => buildRouteFeatureCollection(mapVisualRoutes, selectedRouteKey),
    [mapVisualRoutes, selectedRouteKey],
  )
  const vehicleFeatureCollection = useMemo(
    () => buildVehicleFeatureCollection(displayedVehicles, selectedVehicleId),
    [displayedVehicles, selectedVehicleId],
  )
  const selectedVehicleFeatureCollection = useMemo(
    () => buildSelectedVehicleFeatureCollection(selectedVehicle),
    [selectedVehicle],
  )
  const referencePointFeatureCollection = useMemo(
    () => buildReferencePointFeatureCollection(displayedReferencePoints),
    [displayedReferencePoints],
  )
  const selectedReferencePointFeatureCollection = useMemo(
    () => buildSelectedReferencePointFeatureCollection(selectedReferencePoint),
    [selectedReferencePoint],
  )
  const userFeatureCollection = useMemo(
    () => buildUserFeatureCollection(userPosition, null),
    [userPosition],
  )
  const accuracyFeatureCollection = useMemo(
    () => buildAccuracyFeatureCollection(userPosition, accuracyMeters),
    [accuracyMeters, userPosition],
  )
  const displayedRouteBounds = useMemo(
    () => getRouteBounds(selectedRoute ? [selectedRoute] : mapVisualRoutes),
    [mapVisualRoutes, selectedRoute],
  )

  useEffect(() => {
    if (!showPinchHint || typeof window === 'undefined') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShouldShowPinchHint(false)
      window.sessionStorage.setItem('cabobus-passenger-pinch-hint', '1')
    }, 4200)

    return () => window.clearTimeout(timeoutId)
  }, [showPinchHint])



  const clearFollowResumeTimeout = useCallback(() => {
    if (
      typeof window !== 'undefined' &&
      followResumeTimeoutRef.current !== null
    ) {
      window.clearTimeout(followResumeTimeoutRef.current)
    }

    followResumeTimeoutRef.current = null
  }, [])

  const clearSelectedVehicle = useCallback(() => {
    clearFollowResumeTimeout()
    isVehicleFollowPausedRef.current = false
    followedVehiclePositionRef.current = null
    setSelectedVehicleId(null)
  }, [clearFollowResumeTimeout])

  const clearSelectedReferencePoint = useCallback(() => {
    setSelectedReferencePointId(null)
  }, [])

  const runProgrammaticMapMove = useCallback(
    (transition: (map: MapLibreMap) => void) => {
      const map = mapRef.current

      if (!map) {
        return
      }

      isProgrammaticMapMoveRef.current = true
      transition(map)

      if (!map.isMoving()) {
        isProgrammaticMapMoveRef.current = false
      }
    },
    [],
  )

  const focusRoute = useCallback(
    (routeId: string) => {
      const route = routeById.get(routeId)

      if (!route) return

      setRouteCarouselTransportType(route.transportType)
      clearSelectedVehicle()
      clearSelectedReferencePoint()
      setSelectedRouteId(route.id)
    },
    [clearSelectedReferencePoint, clearSelectedVehicle, routeById, setSelectedRouteId],
  )



  const focusRouteAndRevealMap = useCallback(
    (
      routeId: string,
      reason: 'selected' | 'searched' | 'recommended' | 'nearby' | 'quick_access',
    ) => {
      focusRoute(routeId)
      recordRouteUsage(routeId, reason)
    },
    [focusRoute, recordRouteUsage],
  )

  const openVehiclePopup = useCallback((vehicle: PassengerMapVehicleView) => {
    const map = mapRef.current
    const mapLibre = mapLibreRef.current

    if (!map || !mapLibre) {
      return
    }

    popupRef.current?.remove()
    popupRef.current = new mapLibre.Popup({
      closeButton: false,
      closeOnClick: false,
      closeOnMove: false,
      offset: 16,
      maxWidth: '220px',
    })
      .setLngLat([vehicle.position.lng, vehicle.position.lat])
      .setHTML(createVehiclePopupHtml(vehicle))
      .addTo(map)
  }, [])

  const openReferencePointPopup = useCallback(
    (referencePoint: PassengerMapReferencePoint) => {
      const map = mapRef.current
      const mapLibre = mapLibreRef.current

      if (!map || !mapLibre) {
        return
      }

      popupRef.current?.remove()
      popupRef.current = new mapLibre.Popup({
        closeButton: false,
        closeOnClick: true,
        closeOnMove: false,
        offset: 14,
        maxWidth: '220px',
      })
        .setLngLat([referencePoint.position.lng, referencePoint.position.lat])
        .setHTML(createReferencePointPopupHtml(referencePoint))
        .addTo(map)
    },
    [],
  )

  const focusVehicle = useCallback(
    (vehicleId: string) => {
      if (vehicleId === selectedVehicleId) {
        clearSelectedVehicle()
        return
      }

      const vehicle = vehicleById.get(vehicleId)

      if (!vehicle) return

      const vehicleRoute = routeById.get(vehicle.routeId)

      if (vehicleRoute) {
        setRouteCarouselTransportType(vehicleRoute.transportType)
        setHasTransportTypeFilter(true)
        setSelectedRouteId(vehicle.routeId)
      }

      clearSelectedReferencePoint()
      followedVehiclePositionRef.current = {
        vehicleId: vehicle.id,
        lat: vehicle.position.lat,
        lng: vehicle.position.lng,
      }
      clearFollowResumeTimeout()
      isVehicleFollowPausedRef.current = false
      setSelectedVehicleId(vehicle.id)
      runProgrammaticMapMove((map) => {
        map.flyTo({
          center: [vehicle.position.lng, vehicle.position.lat],
          zoom: Math.max(map.getZoom(), 15),
          duration: 0.55,
        })
      })
    },
    [
      clearFollowResumeTimeout,
      clearSelectedVehicle,
      clearSelectedReferencePoint,
      routeById,
      runProgrammaticMapMove,
      selectedVehicleId,
      setSelectedRouteId,
      vehicleById,
    ],
  )

  const handleVehicleLayerClick = useEffectEvent((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0] as MapGeoJSONFeature | undefined
    const vehicleId = feature?.properties?.vehicleId

    if (typeof vehicleId === 'string') {
      focusVehicle(vehicleId)
    }
  })

  const handleReferencePointLayerClick = useEffectEvent((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0] as MapGeoJSONFeature | undefined
    const referencePointId = feature?.properties?.referencePointId

    if (typeof referencePointId === 'string') {
      clearSelectedVehicle()
      setSelectedReferencePointId(referencePointId)
    }
  })

  const handleRouteLayerClick = useEffectEvent((event: MapLayerMouseEvent) => {
    const feature = event.features?.[0] as MapGeoJSONFeature | undefined
    const routeId = feature?.id ?? feature?.properties?.routeId

    if (typeof routeId === 'string') {
      focusRouteAndRevealMap(routeId, 'selected')
    }
  })

  const scheduleVehicleFollowResume = useEffectEvent(() => {
    if (typeof window === 'undefined' || !selectedVehicle) {
      return
    }

    clearFollowResumeTimeout()
    followResumeTimeoutRef.current = window.setTimeout(() => {
      if (!selectedVehicle) {
        return
      }

      isVehicleFollowPausedRef.current = false
      followedVehiclePositionRef.current = {
        vehicleId: selectedVehicle.id,
        lat: selectedVehicle.position.lat,
        lng: selectedVehicle.position.lng,
      }
      runProgrammaticMapMove((map) => {
        map.easeTo({
          center: [selectedVehicle.position.lng, selectedVehicle.position.lat],
          duration: 700,
          essential: true,
        })
      })
    }, PASSENGER_MAP_FOLLOW_RESUME_DELAY_MS)
  })

  const handleMapMoveEnd = useEffectEvent(() => {
    const wasProgrammaticMove = isProgrammaticMapMoveRef.current

    isProgrammaticMapMoveRef.current = false

    if (wasProgrammaticMove || !selectedVehicleId || !isVehicleFollowPausedRef.current) {
      return
    }

    scheduleVehicleFollowResume()
  })

  const handleUserMapMoveStart = useEffectEvent(() => {
    if (!selectedVehicleId || isProgrammaticMapMoveRef.current) {
      return
    }

    isVehicleFollowPausedRef.current = true
    clearFollowResumeTimeout()
  })

  const handleTransportTypeChange = useCallback(
    (transportType: TransportType) => {
      startTransition(() => {
        setRouteCarouselTransportType(transportType)
        setHasTransportTypeFilter(true)
        clearSelectedRoute()
        clearSelectedVehicle()
        clearSelectedReferencePoint()
      })
    },
    [clearSelectedRoute, clearSelectedReferencePoint, clearSelectedVehicle],
  )

  const handleResetView = useCallback(() => {
    startTransition(() => {
      clearSelectedRoute()
      setHasTransportTypeFilter(false)
      clearSelectedVehicle()
      clearSelectedReferencePoint()
      setRouteSearchTerm('')
      setShowOnlyRoutesWithVisibleVehicles(false)
    })
  }, [clearSelectedRoute, clearSelectedReferencePoint, clearSelectedVehicle])

  const handleOpenRoutePicker = useCallback(() => {
    setRoutePickerOpen(true)
  }, [])

  const handleCloseRoutePicker = useCallback(() => {
    setRoutePickerOpen(false)
  }, [])



  const handleRouteSearchTermChange = useCallback((value: string) => {
    startTransition(() => {
      setRouteSearchTerm(value)
    })
  }, [])

  const handleClearSearch = useCallback(() => {
    startTransition(() => {
      setRouteSearchTerm('')
    })
  }, [])

  const handleToggleShowOnlyRoutesWithVisibleVehicles = useCallback(() => {
    setShowOnlyRoutesWithVisibleVehicles((current) => !current)
  }, [])

  const handleRequestPermission = useCallback(() => {
    void requestPermission()
  }, [requestPermission])

  const handleFocusRecommended = useCallback(() => {
    if (recommendedRoute) {
      focusRouteAndRevealMap(recommendedRoute.route.id, 'recommended')
    }
  }, [focusRouteAndRevealMap, recommendedRoute])

  const handleToggleRoute = useCallback(
    (routeId: string) => {
      clearSelectedVehicle()
      clearSelectedReferencePoint()

      if (routeId === selectedRouteKey) {
        clearSelectedRoute()
        return
      }

      focusRouteAndRevealMap(
        routeId,
        normalizeRouteSearchTerm(routeSearchTerm) ? 'searched' : 'selected',
      )
    },
    [
      clearSelectedRoute,
      clearSelectedReferencePoint,
      clearSelectedVehicle,
      focusRouteAndRevealMap,
      routeSearchTerm,
      selectedRouteKey,
    ],
  )

  const handleRouteSelectFromPicker = useCallback(
    (routeId: string) => {
      focusRouteAndRevealMap(
        routeId,
        normalizeRouteSearchTerm(routeSearchTerm) ? 'searched' : 'selected',
      )
      setRoutePickerOpen(false)
    },
    [focusRouteAndRevealMap, routeSearchTerm],
  )

  const handleClearSelectionFromPicker = useCallback(() => {
    handleResetView()
    setRoutePickerOpen(false)
  }, [handleResetView])

  const handleCloseRouteInfo = useCallback(() => {
    setRouteInfoRouteId(null)
  }, [])




  useEffect(() => {
    if (!requestedRouteId) {
      return
    }

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('route')
    setSearchParams(nextSearchParams, { replace: true })
  }, [requestedRouteId, searchParams, setSearchParams])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    let cancelled = false
    let map: MapLibreMap | null = null
    let resizeMap: (() => void) | null = null
    let handleLoad: (() => void) | null = null
    let handleError: (() => void) | null = null

    void loadMapLibre()
      .then((maplibregl) => {
        if (cancelled || mapRef.current || !mapContainerRef.current) {
          return
        }

        mapLibreRef.current = maplibregl
        map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: mapPerformanceProfile.primaryStyle,
          center: mapInitialCenter,
          zoom: mapInitialZoom,
          maxZoom: mapMaxZoom,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          scrollZoom: false,
          fadeDuration: mapPerformanceProfile.fadeDuration,
          pixelRatio: mapPerformanceProfile.pixelRatio,
          maxTileCacheSize: mapPerformanceProfile.maxTileCacheSize,
          refreshExpiredTiles: mapPerformanceProfile.refreshExpiredTiles,
          trackResize: mapPerformanceProfile.trackResize,
          renderWorldCopies: mapPerformanceProfile.renderWorldCopies,
          canvasContextAttributes: mapPerformanceProfile.canvasContextAttributes,
        })

        handleLoad = () => {
          setMapLoadStatus('ready')
          setMapLoadError(null)
          map?.setRenderWorldCopies(false)

        }
        handleError = () => {
          if (!map) {
            return
          }

          if (
            !attemptedFallbackStyleRef.current &&
            typeof mapPerformanceProfile.primaryStyle === 'string'
          ) {
            attemptedFallbackStyleRef.current = true
            setMapLoadStatus('loading')
            setMapLoadError(
              'No fue posible cargar el estilo principal del mapa. Intentando mapa alterno.',
            )
            map.setStyle(fallbackMapStyle)
            return
          }

          setMapLoadStatus('error')
          setMapLoadError('No fue posible cargar el mapa base configurado ni el alterno.')
        }
        resizeMap = () => map?.resize()

        mapRef.current = map
        map.addControl(
          new maplibregl.AttributionControl({
            compact: true,
            customAttribution: mapPerformanceProfile.attribution,
          }),
          'bottom-right',
        )
        map.on('load', handleLoad)
        map.on('error', handleError)
        map.on('dragstart', handleUserMapMoveStart)
        map.on('zoomstart', handleUserMapMoveStart)
        map.on('moveend', handleMapMoveEnd)
        window.addEventListener('resize', resizeMap)
      })
      .catch(() => {
        if (!cancelled) {
          setMapLoadStatus('error')
          setMapLoadError('No fue posible cargar el motor del mapa en este dispositivo.')
        }
      })

    return () => {
      cancelled = true
      popupRef.current?.remove()
      popupRef.current = null
      if (resizeMap) {
        window.removeEventListener('resize', resizeMap)
      }
      if (map && handleLoad) {
        map.off('load', handleLoad)
      }
      if (map && handleError) {
        map.off('error', handleError)
      }
      if (map) {
        map.off('dragstart', handleUserMapMoveStart)
        map.off('zoomstart', handleUserMapMoveStart)
        map.off('moveend', handleMapMoveEnd)
      }
      map?.remove()
      mapRef.current = null
      mapLibreRef.current = null
      attemptedFallbackStyleRef.current = false
      setMapLoadStatus('loading')
    }
  }, [
    mapPerformanceProfile.attribution,
    mapPerformanceProfile.canvasContextAttributes,
    mapPerformanceProfile.fadeDuration,
    mapPerformanceProfile.maxTileCacheSize,
    mapPerformanceProfile.pixelRatio,
    mapPerformanceProfile.primaryStyle,
    mapPerformanceProfile.refreshExpiredTiles,
    mapPerformanceProfile.renderWorldCopies,
    mapPerformanceProfile.trackResize,
  ])

  useEffect(() => {
    const map = mapRef.current
    if (!map || mapLoadStatus !== 'ready') return

    if (!map.getSource(ROUTES_SOURCE_ID)) {
      map.addSource(ROUTES_SOURCE_ID, {
        type: 'geojson',
        data: emptyFeatureCollection(),
      })
      map.addLayer({
        id: ROUTES_CASING_LAYER_ID,
        type: 'line',
        source: ROUTES_SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#082f49',
          'line-width': ['coalesce', ['get', 'casingWidth'], 7],
          'line-opacity': ['coalesce', ['get', 'casingOpacity'], 0.14],
        },
      })
      map.addLayer({
        id: ROUTES_LAYER_ID,
        type: 'line',
        source: ROUTES_SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#0f766e'],
          'line-width': ['coalesce', ['get', 'lineWidth'], 4],
          'line-opacity': ['coalesce', ['get', 'lineOpacity'], 0.82],
        },
      })
      map.on('mouseenter', ROUTES_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', ROUTES_LAYER_ID, () => {
        map.getCanvas().style.cursor = ''
      })
      map.on('click', ROUTES_LAYER_ID, handleRouteLayerClick)
    }

    if (!map.getSource(VEHICLES_SOURCE_ID)) {
      map.addSource(VEHICLES_SOURCE_ID, {
        type: 'geojson',
        data: emptyFeatureCollection(),
      })
      map.addSource(SELECTED_VEHICLE_SOURCE_ID, {
        type: 'geojson',
        data: emptyFeatureCollection(),
      })
      map.addLayer({
        id: VEHICLE_HALO_LAYER_ID,
        type: 'circle',
        source: SELECTED_VEHICLE_SOURCE_ID,
        paint: {
          'circle-radius': 25,
          'circle-color': '#cbd5f5',
          'circle-opacity': 0.24,
        },
      })
      map.addLayer({
        id: VEHICLES_LAYER_ID,
        type: 'circle',
        source: VEHICLES_SOURCE_ID,
        paint: {
          'circle-radius': [
            'match',
            ['get', 'operationalStatus'],
            'active_recent',
            10,
            'active_stale',
            9,
            8,
          ],
          'circle-color': [
            'match',
            ['get', 'operationalStatus'],
            'active_recent',
            '#2dd4bf',
            'active_stale',
            '#f59e0b',
            '#fb7185',
          ],
          'circle-stroke-color': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            '#0f172a',
            '#0f766e',
          ],
          'circle-stroke-width': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            4,
            3,
          ],
          'circle-opacity': [
            'case',
            ['==', ['get', 'operationalStatus'], 'probably_stopped'],
            0.84,
            1,
          ],
        },
      })
      map.addLayer({
        id: `${SELECTED_VEHICLE_SOURCE_ID}-circle`,
        type: 'circle',
        source: SELECTED_VEHICLE_SOURCE_ID,
        paint: {
          'circle-radius': 14,
          'circle-color': '#2dd4bf',
          'circle-stroke-color': '#0f172a',
          'circle-stroke-width': 4,
        },
      })
      map.on('mouseenter', VEHICLES_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', VEHICLES_LAYER_ID, () => {
        map.getCanvas().style.cursor = ''
      })
      map.on('click', VEHICLES_LAYER_ID, handleVehicleLayerClick)
      map.on('click', `${SELECTED_VEHICLE_SOURCE_ID}-circle`, handleVehicleLayerClick)
    }

    if (!map.getSource(REFERENCE_POINTS_SOURCE_ID)) {
      map.addSource(REFERENCE_POINTS_SOURCE_ID, {
        type: 'geojson',
        data: emptyFeatureCollection(),
      })
      map.addSource(SELECTED_REFERENCE_POINT_SOURCE_ID, {
        type: 'geojson',
        data: emptyFeatureCollection(),
      })
      map.addLayer({
        id: SELECTED_REFERENCE_POINT_LAYER_ID,
        type: 'circle',
        source: SELECTED_REFERENCE_POINT_SOURCE_ID,
        paint: {
          'circle-radius': 18,
          'circle-color': '#cbd5f5',
          'circle-opacity': 0.28,
        },
      })
      map.addLayer({
        id: REFERENCE_POINTS_LAYER_ID,
        type: 'circle',
        source: REFERENCE_POINTS_SOURCE_ID,
        paint: {
          'circle-radius': [
            'match',
            ['get', 'kind'],
            'official_stop',
            7,
            'route_colony',
            7.5,
            6,
          ],
          'circle-color': [
            'match',
            ['get', 'kind'],
            'official_stop',
            '#f8fafc',
            'route_colony',
            '#f9a8d4',
            '#fde68a',
          ],
          'circle-stroke-color': [
            'match',
            ['get', 'kind'],
            'official_stop',
            '#0284c7',
            'route_colony',
            '#be185d',
            '#0f766e',
          ],
          'circle-stroke-width': [
            'match',
            ['get', 'kind'],
            'official_stop',
            3,
            'route_colony',
            3,
            2.5,
          ],
        },
      })
      map.on('mouseenter', REFERENCE_POINTS_LAYER_ID, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', REFERENCE_POINTS_LAYER_ID, () => {
        map.getCanvas().style.cursor = ''
      })
      map.on('click', REFERENCE_POINTS_LAYER_ID, handleReferencePointLayerClick)
      map.on(
        'click',
        SELECTED_REFERENCE_POINT_LAYER_ID,
        handleReferencePointLayerClick,
      )
    }

    if (!map.getSource(USER_SOURCE_ID)) {
      map.addSource(USER_SOURCE_ID, {
        type: 'geojson',
        data: emptyFeatureCollection(),
      })
      map.addSource(USER_ACCURACY_SOURCE_ID, {
        type: 'geojson',
        data: emptyFeatureCollection(),
      })
      map.addLayer({
        id: USER_ACCURACY_LAYER_ID,
        type: 'fill',
        source: USER_ACCURACY_SOURCE_ID,
        paint: {
          'fill-color': '#93c5fd',
          'fill-opacity': 0.12,
          'fill-outline-color': '#60a5fa',
        },
      })
      map.addLayer({
        id: USER_POSITION_LAYER_ID,
        type: 'circle',
        source: USER_SOURCE_ID,
        paint: {
          'circle-radius': 8,
          'circle-color': '#60a5fa',
          'circle-stroke-color': '#1d4ed8',
          'circle-stroke-width': 3,
        },
      })
    }
  }, [mapLoadStatus])

  useEffect(() => {
    if (mapLoadStatus !== 'ready') return

    ;(mapRef.current?.getSource(ROUTES_SOURCE_ID) as GeoJSONSource | undefined)?.setData(
      routeFeatureCollection,
    )
  }, [mapLoadStatus, routeFeatureCollection])

  useEffect(() => {
    if (mapLoadStatus !== 'ready') return

    ;(mapRef.current?.getSource(VEHICLES_SOURCE_ID) as GeoJSONSource | undefined)?.setData(
      vehicleFeatureCollection,
    )
    ;(mapRef.current?.getSource(SELECTED_VEHICLE_SOURCE_ID) as GeoJSONSource | undefined)?.setData(
      selectedVehicleFeatureCollection,
    )
  }, [
    mapLoadStatus,
    selectedVehicleFeatureCollection,
    vehicleFeatureCollection,
  ])

  useEffect(() => {
    if (mapLoadStatus !== 'ready') return

    ;(mapRef.current?.getSource(REFERENCE_POINTS_SOURCE_ID) as GeoJSONSource | undefined)?.setData(
      referencePointFeatureCollection,
    )
    ;(
      mapRef.current?.getSource(SELECTED_REFERENCE_POINT_SOURCE_ID) as
        | GeoJSONSource
        | undefined
    )?.setData(
      selectedReferencePointFeatureCollection,
    )
  }, [
    mapLoadStatus,
    referencePointFeatureCollection,
    selectedReferencePointFeatureCollection,
  ])

  useEffect(() => {
    if (mapLoadStatus !== 'ready') return

    ;(mapRef.current?.getSource(USER_SOURCE_ID) as GeoJSONSource | undefined)?.setData(
      userFeatureCollection,
    )
    ;(mapRef.current?.getSource(USER_ACCURACY_SOURCE_ID) as GeoJSONSource | undefined)?.setData(
      accuracyFeatureCollection,
    )
  }, [accuracyFeatureCollection, mapLoadStatus, userFeatureCollection])

  useEffect(() => {
    if (mapLoadStatus !== 'ready') return

    if (selectedVehicle) {
      openVehiclePopup(selectedVehicle)
      return
    }

    if (selectedReferencePoint) {
      openReferencePointPopup(selectedReferencePoint)
      return
    }

    popupRef.current?.remove()
    popupRef.current = null
  }, [
    mapLoadStatus,
    openReferencePointPopup,
    openVehiclePopup,
    selectedReferencePoint,
    selectedVehicle,
  ])

  useEffect(() => {
    const map = mapRef.current

    if (
      !map ||
      mapLoadStatus !== 'ready' ||
      !selectedVehicle ||
      isVehicleFollowPausedRef.current
    ) {
      if (!selectedVehicle) {
        followedVehiclePositionRef.current = null
      }

      return
    }

    const previousFollowedPosition = followedVehiclePositionRef.current
    const hasPositionChanged =
      previousFollowedPosition?.vehicleId !== selectedVehicle.id ||
      previousFollowedPosition?.lat !== selectedVehicle.position.lat ||
      previousFollowedPosition?.lng !== selectedVehicle.position.lng

    if (!hasPositionChanged) {
      return
    }

    followedVehiclePositionRef.current = {
      vehicleId: selectedVehicle.id,
      lat: selectedVehicle.position.lat,
      lng: selectedVehicle.position.lng,
    }

    runProgrammaticMapMove((activeMap) => {
      activeMap.easeTo({
        center: [selectedVehicle.position.lng, selectedVehicle.position.lat],
        duration: previousFollowedPosition ? 900 : 0,
        essential: true,
      })
    })
  }, [mapLoadStatus, runProgrammaticMapMove, selectedVehicle])

  useEffect(() => {
    return () => {
      clearFollowResumeTimeout()
    }
  }, [clearFollowResumeTimeout])

  useEffect(() => {
    const map = mapRef.current
    if (!map || mapLoadStatus !== 'ready') return

    if (selectedVehicle) {
      return
    }

    const viewKey = selectedRoute?.id ?? `transport:${activeTransportType}`
    const shouldFitView =
      !didFitInitialViewRef.current || lastFittedViewKeyRef.current !== viewKey

    if (shouldFitView && displayedRouteBounds) {
      runProgrammaticMapMove((activeMap) => {
        activeMap.fitBounds(displayedRouteBounds, {
          padding: {
            top: 72,
            bottom: selectedRoute ? 58 : 32,
            left: 24,
            right: 24,
          },
          maxZoom: selectedRoute ? 14.75 : 13.6,
        })
      })
      didFitInitialViewRef.current = true
      lastFittedViewKeyRef.current = viewKey
      return
    }

    if (!didFitInitialViewRef.current && userPosition) {
      runProgrammaticMapMove((activeMap) => {
        activeMap.flyTo({
          center: [userPosition.lng, userPosition.lat],
          zoom: 14,
          duration: 0.55,
        })
      })
      didFitInitialViewRef.current = true
      lastFittedViewKeyRef.current = viewKey
    }
  }, [
    activeTransportType,
    displayedRouteBounds,
    mapLoadStatus,
    selectedRoute,
    selectedVehicle,
    runProgrammaticMapMove,
    userPosition,
  ])

  useEffect(() => {
    const map = mapRef.current

    if (!map || mapLoadStatus !== 'ready' || centerOnUserRequestCount === 0) {
      return
    }

    if (!userPosition) {
      requestPermission()
      return
    }

    runProgrammaticMapMove((activeMap) => {
      activeMap.flyTo({
        center: [userPosition.lng, userPosition.lat],
        zoom: 15,
        duration: 0.55,
      })
    })
  }, [
    centerOnUserRequestCount,
    mapLoadStatus,
    requestPermission,
    runProgrammaticMapMove,
    userPosition,
  ])

  if (!hasHydratedSelection) {
    return (
      <PassengerMapEmptyState
        title="Cargando mapa"
        description="Recuperando la ultima ruta seleccionada para mostrar la vista del pasajero."
      />
    )
  }

  if (mapLoadStatus === 'error') {
    return (
      <PassengerMapEmptyState
        title="No se pudo cargar el mapa"
        description={
          mapLoadError ??
          'Revisa la configuracion del proveedor de mapas para mostrar la vista de pasajeros.'
        }
      />
    )
  }

  return (
    <>
      <main className="fixed inset-0 h-[100dvh] w-screen overflow-hidden bg-slate-100">
        <div ref={mapContainerRef} className="!absolute inset-0 z-0 h-full w-full" />

        {mapLoadStatus !== 'ready' ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/5 px-4 text-center">
            <div className="max-w-sm rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.6)] backdrop-blur">
              <p className="text-sm font-semibold text-slate-900">Cargando mapa</p>
              <p className="mt-1 text-sm text-slate-600">
                {mapPerformanceProfile.prefersLiteMap
                  ? 'MapLibre esta inicializando la base ligera del mapa para movil.'
                  : 'MapLibre esta inicializando la capa base y los estilos del mapa.'}
              </p>
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex justify-center">
          <div
            className={`transition-all duration-500 ${
              showPinchHint
                ? 'translate-y-0 opacity-100'
                : '-translate-y-2 opacity-0'
            }`}
          >
            <div className="passenger-pinch-hint rounded-full bg-white/94 px-4 py-2 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.6)] backdrop-blur">
              <div className="passenger-pinch-hint__gesture" aria-hidden="true">
                <span className="passenger-pinch-hint__finger passenger-pinch-hint__finger--left" />
                <span className="passenger-pinch-hint__finger passenger-pinch-hint__finger--right" />
              </div>
              <span className="text-xs font-semibold text-slate-700">
                Pellizca para acercar o alejar
              </span>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute right-4 top-[50%] z-40 flex -translate-y-1/2 flex-col gap-2">
          <div className="pointer-events-auto flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setCenterOnUserRequestCount((value) => value + 1)}
              className="relative flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-700 shadow-[0_8px_16px_-6px_rgba(15,23,42,0.15)] backdrop-blur transition hover:bg-slate-50"
              aria-label="Centrar mapa en mi ubicacion"
              title="Centrar mapa en mi ubicacion"
            >
              <LocationTargetIcon />
            </button>
          </div>
        </div>

        <PassengerMapHeader
          onOpenRoutes={handleOpenRoutePicker}
        />

        <PassengerMapSidebar
          isRealtimeEnabled={PASSENGER_MAP_REALTIME_ENABLED}
          routeGroups={routeGroupsByUtility}
          activeTransportType={activeTransportType}
          activeRouteGroup={filteredActiveRouteGroup}
          hasTransportTypeFilter={hasTransportTypeFilter}
          recommendedRoute={recommendedRoute}
          nearbyRoutes={nearbyRoutes}
          permissionState={permissionState}
          locationStatusCopy={locationStatusCopy}
          selectedRoute={selectedRoute}
          routeDistanceById={routeDistanceById}
          vehicleStatsByRoute={vehicleStatsByRoute}
          routeSearchTerm={routeSearchTerm}
          showOnlyRoutesWithVisibleVehicles={showOnlyRoutesWithVisibleVehicles}
          canResetView={Boolean(selectedRoute || hasTransportTypeFilter)}
          onRequestPermission={handleRequestPermission}
          onFocusRecommended={handleFocusRecommended}
          onRouteSearchTermChange={handleRouteSearchTermChange}
          onClearSearch={handleClearSearch}
          onToggleShowOnlyRoutesWithVisibleVehicles={handleToggleShowOnlyRoutesWithVisibleVehicles}
          onTransportTypeChange={handleTransportTypeChange}
          onResetView={handleResetView}
          onToggleRoute={handleToggleRoute}
          favoriteRouteIds={favoriteRouteIdSet}
          onToggleFavoriteRoute={toggleFavoriteRoute}
        />
      </main>

      <PassengerRoutePickerModal
        isOpen={isRoutePickerOpen}
        isRealtimeEnabled={PASSENGER_MAP_REALTIME_ENABLED}
        activeTransportType={activeTransportType}
        routeGroups={filteredRouteGroups}
        selectedRouteId={selectedRouteKey}
        routeSearchTerm={routeSearchTerm}
        routeDistanceById={routeDistanceById}
        vehicleStatsByRoute={vehicleStatsByRoute}
        referencePointCountByRoute={referencePointCountByRoute}
        colonyPointCountByRoute={colonyReferencePointCountByRoute}
        showOnlyRoutesWithVisibleVehicles={showOnlyRoutesWithVisibleVehicles}
        onClose={handleCloseRoutePicker}
        onRouteSearchTermChange={handleRouteSearchTermChange}
        onToggleShowOnlyRoutesWithVisibleVehicles={handleToggleShowOnlyRoutesWithVisibleVehicles}
        onTransportTypeChange={handleTransportTypeChange}
        onRouteSelect={handleRouteSelectFromPicker}
        onClearSelection={handleClearSelectionFromPicker}
        onClearSearch={handleClearSearch}
      />


      {routeInfoRoute ? (
        <PassengerRouteInfoModal route={routeInfoRoute} onClose={handleCloseRouteInfo} />
      ) : null}
    </>
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
  const currentTimeMs = useCurrentTime(PASSENGER_MAP_REFRESH_INTERVAL_MS)
  const snapshot = usePassengerMapSnapshot(
    PASSENGER_MAP_REALTIME_ENABLED ? currentTimeMs : undefined,
  )

  if (snapshot === undefined) {
    return (
      <PassengerMapEmptyState
        title="Cargando datos del mapa"
        description="Consultando rutas y referencias del mapa..."
      />
    )
  }

  return <PassengerMapContent snapshot={snapshot} />
}