import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fallbackMapStyle,
  mapInitialCenter,
  mapInitialZoom,
  mapMaxZoom,
} from '../../../lib/env'
import { loadMapLibre } from '../../../lib/maplibreLoader'
import { getMapRuntimePerformanceProfile } from '../../../lib/runtimePerformance'
import {
  buildLineStringFeatures,
  buildPointFeatureCollection,
  getBoundsFromPoints,
} from '../../../lib/mapGeometry'
import type { BusRoute, Coordinates } from '../../../types/domain'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'

function getRouteBounds(route: BusRoute) {
  return route.segments.flatMap((segment) => segment)
}

function areCoordinatesEqual(
  left: Coordinates | null,
  right: Coordinates | null,
) {
  if (!left || !right) {
    return false
  }

  return left.lat === right.lat && left.lng === right.lng
}

const DRIVER_ROUTE_SOURCE_ID = 'driver-route'
const DRIVER_PRIMARY_SOURCE_ID = 'driver-primary-position'
const DRIVER_SHARED_SOURCE_ID = 'driver-shared-position'
const DRIVER_AUTO_FOLLOW_RESUME_DELAY_MS = 12000
const DRIVER_RECENTER_MIN_ZOOM = 15

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

export function DriverRouteMap({
  route,
  livePosition,
  lastSharedPosition,
}: {
  route: BusRoute | null
  livePosition: Coordinates | null
  lastSharedPosition: Coordinates | null
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const lastFittedRouteIdRef = useRef<string | null>(null)
  const attemptedFallbackStyleRef = useRef(false)
  const isProgrammaticMapMoveRef = useRef(false)
  const followResumeTimeoutRef = useRef<number | null>(null)
  const lastFollowedPositionRef = useRef<Coordinates | null>(null)
  const latestPrimaryPositionRef = useRef<Coordinates | null>(null)
  const [isMapReady, setMapReady] = useState(false)
  const [isAutoFollowEnabled, setAutoFollowEnabled] = useState(true)
  const mapPerformanceProfile = useMemo(() => getMapRuntimePerformanceProfile(), [])

  const primaryPosition = livePosition ?? lastSharedPosition ?? null
  const isPositionAvailable = Boolean(primaryPosition)
  const routeBoundsPoints = useMemo(
    () => (route ? getRouteBounds(route) : []),
    [route],
  )
  const routeFeatureCollection = useMemo(
    () => buildLineStringFeatures(route?.segments ?? []),
    [route],
  )
  const primaryFeatureCollection = useMemo(
    () =>
      buildPointFeatureCollection(
        route && (primaryPosition ?? route.segments[0]?.[0] ?? null)
          ? [
              {
                coordinates: primaryPosition ?? route.segments[0][0],
                properties: {
                  label: 'Tu ubicacion actual',
                },
              },
            ]
          : [],
      ),
    [primaryPosition, route],
  )
  const sharedFeatureCollection = useMemo(
    () =>
      buildPointFeatureCollection(
        lastSharedPosition &&
          primaryPosition &&
          !areCoordinatesEqual(lastSharedPosition, primaryPosition)
          ? [
              {
                coordinates: lastSharedPosition,
                properties: {
                  label: 'Ultima ubicacion compartida',
                },
              },
            ]
          : [],
      ),
    [lastSharedPosition, primaryPosition],
  )

  useEffect(() => {
    latestPrimaryPositionRef.current = primaryPosition
  }, [primaryPosition])

  const clearFollowResumeTimeout = useCallback(() => {
    if (
      followResumeTimeoutRef.current !== null &&
      typeof window !== 'undefined'
    ) {
      window.clearTimeout(followResumeTimeoutRef.current)
    }

    followResumeTimeoutRef.current = null
  }, [])

  const runProgrammaticMapMove = useCallback(
    (runner: (map: MapLibreMap) => void) => {
      const map = mapRef.current

      if (!map) {
        return
      }

      isProgrammaticMapMoveRef.current = true
      runner(map)
    },
    [],
  )

  const recenterOnDriver = useCallback(
    ({
      duration = 700,
      minimumZoom,
    }: {
      duration?: number
      minimumZoom?: number
    } = {}) => {
      const position = latestPrimaryPositionRef.current

      clearFollowResumeTimeout()
      setAutoFollowEnabled(true)

      if (!position) {
        return
      }

      lastFollowedPositionRef.current = position
      runProgrammaticMapMove((map) => {
        map.easeTo({
          center: [position.lng, position.lat],
          zoom:
            minimumZoom === undefined
              ? map.getZoom()
              : Math.max(map.getZoom(), minimumZoom),
          duration,
          essential: true,
        })
      })
    },
    [clearFollowResumeTimeout, runProgrammaticMapMove],
  )

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return
    }

    let cancelled = false
    let map: MapLibreMap | null = null
    let handleLoad: (() => void) | null = null
    let handleError: (() => void) | null = null
    let handleMoveStart: (() => void) | null = null
    let handleMoveEnd: (() => void) | null = null
    let resizeMap: (() => void) | null = null

    void loadMapLibre()
      .then((maplibregl) => {
        if (cancelled || mapRef.current || !mapContainerRef.current) {
          return
        }

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

        mapRef.current = map
        if (mapPerformanceProfile.showNavigationControl) {
          map.addControl(
            new maplibregl.NavigationControl({ visualizePitch: false }),
            'top-right',
          )
        }
        map.addControl(
          new maplibregl.AttributionControl({
            compact: true,
            customAttribution: mapPerformanceProfile.attribution,
          }),
          'bottom-right',
        )

        handleLoad = () => {
          setMapReady(true)
          map?.setRenderWorldCopies(false)
        }
        handleMoveStart = () => {
          if (
            isProgrammaticMapMoveRef.current ||
            !latestPrimaryPositionRef.current
          ) {
            return
          }

          clearFollowResumeTimeout()
          setAutoFollowEnabled(false)
        }
        handleMoveEnd = () => {
          const wasProgrammaticMove = isProgrammaticMapMoveRef.current

          isProgrammaticMapMoveRef.current = false

          if (
            wasProgrammaticMove ||
            !latestPrimaryPositionRef.current ||
            typeof window === 'undefined'
          ) {
            return
          }

          clearFollowResumeTimeout()
          followResumeTimeoutRef.current = window.setTimeout(() => {
            followResumeTimeoutRef.current = null
            recenterOnDriver()
          }, DRIVER_AUTO_FOLLOW_RESUME_DELAY_MS)
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
            map.setStyle(fallbackMapStyle)
          }
        }

        resizeMap = () => map?.resize()
        map.on('load', handleLoad)
        map.on('movestart', handleMoveStart)
        map.on('moveend', handleMoveEnd)
        map.on('error', handleError)
        window.addEventListener('resize', resizeMap)
      })
      .catch(() => {
        if (!cancelled) {
          setMapReady(false)
        }
      })

    return () => {
      cancelled = true
      if (map && handleLoad) {
        map.off('load', handleLoad)
      }
      if (map && handleError) {
        map.off('error', handleError)
      }
      if (map && handleMoveStart) {
        map.off('movestart', handleMoveStart)
      }
      if (map && handleMoveEnd) {
        map.off('moveend', handleMoveEnd)
      }
      if (resizeMap) {
        window.removeEventListener('resize', resizeMap)
      }
      map?.remove()
      mapRef.current = null
      lastFittedRouteIdRef.current = null
      attemptedFallbackStyleRef.current = false
      isProgrammaticMapMoveRef.current = false
      clearFollowResumeTimeout()
      setMapReady(false)
    }
  }, [
    clearFollowResumeTimeout,
    mapPerformanceProfile.attribution,
    mapPerformanceProfile.canvasContextAttributes,
    mapPerformanceProfile.fadeDuration,
    mapPerformanceProfile.maxTileCacheSize,
    mapPerformanceProfile.pixelRatio,
    mapPerformanceProfile.primaryStyle,
    mapPerformanceProfile.refreshExpiredTiles,
    mapPerformanceProfile.renderWorldCopies,
    mapPerformanceProfile.showNavigationControl,
    mapPerformanceProfile.trackResize,
    recenterOnDriver,
  ])

  useEffect(() => {
    const map = mapRef.current

    if (!map || !isMapReady) {
      return
    }

    if (!map.getSource(DRIVER_ROUTE_SOURCE_ID)) {
      map.addSource(DRIVER_ROUTE_SOURCE_ID, {
        type: 'geojson',
        data: routeFeatureCollection,
      })

      map.addLayer({
        id: `${DRIVER_ROUTE_SOURCE_ID}-casing`,
        type: 'line',
        source: DRIVER_ROUTE_SOURCE_ID,
        paint: {
          'line-color': '#082f49',
          'line-width': 9,
          'line-opacity': 0.16,
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      })

      map.addLayer({
        id: `${DRIVER_ROUTE_SOURCE_ID}-line`,
        type: 'line',
        source: DRIVER_ROUTE_SOURCE_ID,
        paint: {
          'line-color': route?.color ?? '#0f766e',
          'line-width': 6,
          'line-opacity': 0.92,
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
      })
    }

    if (!map.getSource(DRIVER_PRIMARY_SOURCE_ID)) {
      map.addSource(DRIVER_PRIMARY_SOURCE_ID, {
        type: 'geojson',
        data: primaryFeatureCollection,
      })

      map.addLayer({
        id: `${DRIVER_PRIMARY_SOURCE_ID}-halo`,
        type: 'circle',
        source: DRIVER_PRIMARY_SOURCE_ID,
        paint: {
          'circle-radius': 18,
          'circle-color': '#60a5fa',
          'circle-opacity': 0.18,
        },
      })

      map.addLayer({
        id: `${DRIVER_PRIMARY_SOURCE_ID}-circle`,
        type: 'circle',
        source: DRIVER_PRIMARY_SOURCE_ID,
        paint: {
          'circle-radius': 9,
          'circle-color': '#60a5fa',
          'circle-stroke-color': '#1d4ed8',
          'circle-stroke-width': 3,
        },
      })
    }

    if (!map.getSource(DRIVER_SHARED_SOURCE_ID)) {
      map.addSource(DRIVER_SHARED_SOURCE_ID, {
        type: 'geojson',
        data: sharedFeatureCollection,
      })

      map.addLayer({
        id: `${DRIVER_SHARED_SOURCE_ID}-circle`,
        type: 'circle',
        source: DRIVER_SHARED_SOURCE_ID,
        paint: {
          'circle-radius': 6,
          'circle-color': '#2dd4bf',
          'circle-stroke-color': '#0f766e',
          'circle-stroke-width': 2,
          'circle-opacity': 0.88,
        },
      })
    }
  }, [isMapReady, primaryFeatureCollection, route?.color, routeFeatureCollection, sharedFeatureCollection])

  useEffect(() => {
    const map = mapRef.current

    if (!map || !isMapReady) {
      return
    }

    ;(map.getSource(DRIVER_ROUTE_SOURCE_ID) as GeoJSONSource | undefined)?.setData(
      routeFeatureCollection,
    )
    ;(map.getSource(DRIVER_PRIMARY_SOURCE_ID) as GeoJSONSource | undefined)?.setData(
      primaryFeatureCollection,
    )
    ;(map.getSource(DRIVER_SHARED_SOURCE_ID) as GeoJSONSource | undefined)?.setData(
      sharedFeatureCollection,
    )

    if (map.getLayer(`${DRIVER_ROUTE_SOURCE_ID}-line`)) {
      map.setPaintProperty(
        `${DRIVER_ROUTE_SOURCE_ID}-line`,
        'line-color',
        route?.color ?? '#0f766e',
      )
    }
  }, [
    isMapReady,
    primaryFeatureCollection,
    route?.color,
    routeFeatureCollection,
    sharedFeatureCollection,
  ])

  useEffect(() => {
    const map = mapRef.current
    const bounds = getBoundsFromPoints(routeBoundsPoints)

    if (!map || !route || !bounds || primaryPosition) {
      return
    }

    if (lastFittedRouteIdRef.current !== route.id) {
      runProgrammaticMapMove((activeMap) => {
        activeMap.fitBounds(bounds, {
          padding: {
            top: 24,
            right: 24,
            bottom: 24,
            left: 24,
          },
          maxZoom: 14.75,
        })
      })
      lastFittedRouteIdRef.current = route.id
    }
  }, [primaryPosition, route, routeBoundsPoints, runProgrammaticMapMove])

  useEffect(() => {
    if (!isMapReady) {
      return
    }

    if (!primaryPosition) {
      lastFollowedPositionRef.current = null
      return
    }

    if (!isAutoFollowEnabled) {
      return
    }

    const previousPosition = lastFollowedPositionRef.current
    const hasPositionChanged =
      previousPosition?.lat !== primaryPosition.lat ||
      previousPosition?.lng !== primaryPosition.lng

    if (!hasPositionChanged) {
      return
    }

    lastFollowedPositionRef.current = primaryPosition
    runProgrammaticMapMove((map) => {
      map.easeTo({
        center: [primaryPosition.lng, primaryPosition.lat],
        duration: previousPosition ? 900 : 0,
        essential: true,
      })
    })
  }, [isAutoFollowEnabled, isMapReady, primaryPosition, runProgrammaticMapMove])

  useEffect(() => {
    return () => {
      clearFollowResumeTimeout()
    }
  }, [clearFollowResumeTimeout])

  const recenterButtonTitle = !isPositionAvailable
    ? 'Tu ubicacion aun no esta disponible'
    : isAutoFollowEnabled
      ? 'Centrado automatico activo'
      : 'Volver a centrar y seguir mi ubicacion'

  return (
    <div className="relative overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white">
      <div
        ref={mapContainerRef}
        className="h-[33svh] min-h-[260px] w-full sm:h-[40svh] xl:h-[calc(100svh-22rem)] xl:min-h-[360px]"
      />
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-start">
        <div className="pointer-events-auto">
          <button
            type="button"
            onClick={() =>
              recenterOnDriver({ duration: 550, minimumZoom: DRIVER_RECENTER_MIN_ZOOM })
            }
            disabled={!isPositionAvailable}
            className={`relative flex h-11 w-11 items-center justify-center rounded-xl border shadow-[0_14px_28px_-24px_rgba(15,23,42,0.6)] backdrop-blur transition ${
              isPositionAvailable
                ? isAutoFollowEnabled
                  ? 'border-sky-200 bg-white text-sky-700 hover:border-sky-300'
                  : 'border-sky-500 bg-sky-600 text-white hover:bg-sky-700'
                : 'cursor-not-allowed border-slate-200 bg-white/90 text-slate-300'
            }`}
            aria-label={recenterButtonTitle}
            title={recenterButtonTitle}
            aria-pressed={isAutoFollowEnabled}
          >
            <LocationTargetIcon />
          </button>
        </div>
      </div>
    </div>
  )
}
