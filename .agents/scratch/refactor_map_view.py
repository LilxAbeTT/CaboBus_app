import re

with open('src/features/map/components/PassengerMapView.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    # Skip unused map env variables
    if line.strip().startswith('import { fallbackMapStyle, mapInitialCenter, mapInitialZoom, mapMaxZoom }'): continue
    if line.strip().startswith('import { loadMapLibre }'): continue
    if line.strip().startswith('import { getMapRuntimePerformanceProfile }'): continue
    if line.strip().startswith('import type { GeoJSONSource, Map as MapLibreMap'): continue

    # Start skipping from ROUTES_SOURCE_ID to createReferencePointPopupHtml
    if line.startswith("const ROUTES_SOURCE_ID = 'passenger-map-routes'"):
        skip = True
        # Insert our new imports here
        new_lines.append("""import { PassengerMapCanvas, type PassengerMapCanvasHandle } from './PassengerMapCanvas'
import {
  buildRouteFeatureCollection,
  buildVehicleFeatureCollection,
  buildSelectedVehicleFeatureCollection,
  buildAccuracyFeatureCollection,
  buildUserFeatureCollection,
  buildReferencePointFeatureCollection,
  buildSelectedReferencePointFeatureCollection,
  getRouteBounds
} from './passengerMapGeoJSON'
""")
        continue
    
    if skip and line.startswith('function LocationTargetIcon() {'):
        skip = False
    
    if skip:
        continue

    new_lines.append(line)

content = "".join(new_lines)

# Replace the refs and timeouts inside PassengerMapContent
content = re.sub(
    r'const mapContainerRef = useRef<HTMLDivElement \| null>\(null\)[\s\S]*?const mapPerformanceProfile = useMemo\(\(\) => getMapRuntimePerformanceProfile\(\), \[\]\)',
    """const mapCanvasRef = useRef<PassengerMapCanvasHandle>(null)
  const [isVehicleFollowPaused, setIsVehicleFollowPaused] = useState(false)
  const showPinchHint = mapLoadStatus === 'ready' && shouldShowPinchHint

  const handleMapLoadStatusChange = useCallback((status: 'loading' | 'ready' | 'error', error: string | null = null) => {
    setMapLoadStatus(status)
    setMapLoadError(error)
  }, [])

  const routeFeatureCollection = useMemo(
    () => buildRouteFeatureCollection(displayedRoutes, selectedRouteKey),
    [displayedRoutes, selectedRouteKey],
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
    () => getRouteBounds(selectedRoute ? [selectedRoute] : displayedRoutes),
    [displayedRoutes, selectedRoute],
  )""",
    content
)

# Replace clearFollowResumeTimeout and clearSelectedVehicle
content = re.sub(
    r'const clearFollowResumeTimeout = useCallback\(\(\) => \{[\s\S]*?\}, \[clearFollowResumeTimeout\]\)',
    """const clearSelectedVehicle = useCallback(() => {
    setIsVehicleFollowPaused(false)
    setSelectedVehicleId(null)
  }, [])""",
    content
)

content = re.sub(
    r'const runProgrammaticMapMove = useCallback\([\s\S]*?\}, \[\]\)',
    """const runProgrammaticMapMove = useCallback(
    (transition: (map: import('maplibre-gl').Map) => void) => {
      mapCanvasRef.current?.runProgrammaticMapMove(transition)
    },
    [],
  )""",
    content
)

# Remove openVehiclePopup and openReferencePointPopup
content = re.sub(r'const openVehiclePopup = useCallback\(\(vehicle: PassengerMapVehicleView\) => \{[\s\S]*?\}, \[\]\)\n\n', '', content)
content = re.sub(r'const openReferencePointPopup = useCallback\(\(referencePoint: PassengerMapReferencePoint\) => \{[\s\S]*?\}, \[\]\)\n\n', '', content)

# Fix focusVehicle logic
content = re.sub(r'clearFollowResumeTimeout\(\)', '', content)
content = re.sub(r'isVehicleFollowPausedRef\.current = false', 'setIsVehicleFollowPaused(false)', content)
content = re.sub(r'followedVehiclePositionRef\.current = \{[\s\S]*?\}', '', content)
content = content.replace('clearFollowResumeTimeout,\n', '')

# Remove all map layer click handlers and map move handlers
content = re.sub(r'const scheduleVehicleFollowResume = useEffectEvent\(\(\) => \{[\s\S]*?const handleUserMapMoveStart = useEffectEvent\(\(\) => \{[\s\S]*?\}\n\n', '', content)
content = re.sub(r'const handleVehicleLayerClick = useEffectEvent\(\(event: MapLayerMouseEvent\) => \{[\s\S]*?const handleRouteLayerClick = useEffectEvent\(\(event: MapLayerMouseEvent\) => \{[\s\S]*?\}\n\n', '', content)


# Remove the massive useEffect block for Maplibre initialization and all subsequent useEffects until "if (!hasHydratedSelection)"
content = re.sub(r'useEffect\(\(\) => \{\n    if \(!mapContainerRef\.current \|\| mapRef\.current\) return[\s\S]*?zoom: 15, duration: 0\.55, \}\)\n    \}\)\n  \}, \[\n    centerOnUserRequestCount,\n    mapLoadStatus,\n    requestPermission,\n    runProgrammaticMapMove,\n    userPosition,\n  \]\)\n\n', '', content)


# Replace JSX map rendering
content = re.sub(
    r'<div ref=\{mapContainerRef\} className="!absolute inset-0 z-0 h-full w-full" \/>[\s\S]*?\{mapLoadStatus !== \'ready\' \? \([\s\S]*?\) : null\}',
    """<PassengerMapCanvas
          ref={mapCanvasRef}
          mapLoadStatus={mapLoadStatus}
          onMapLoadStatusChange={handleMapLoadStatusChange}
          routeFeatureCollection={routeFeatureCollection}
          vehicleFeatureCollection={vehicleFeatureCollection}
          selectedVehicleFeatureCollection={selectedVehicleFeatureCollection}
          referencePointFeatureCollection={referencePointFeatureCollection}
          selectedReferencePointFeatureCollection={selectedReferencePointFeatureCollection}
          userFeatureCollection={userFeatureCollection}
          accuracyFeatureCollection={accuracyFeatureCollection}
          selectedVehicle={selectedVehicle}
          selectedReferencePoint={selectedReferencePoint}
          selectedRouteId={selectedRouteKey}
          activeTransportType={activeTransportType}
          displayedRouteBounds={displayedRouteBounds ?? null}
          userPosition={userPosition}
          centerOnUserRequestCount={centerOnUserRequestCount}
          isVehicleFollowPaused={isVehicleFollowPaused}
          onVehicleFollowPausedChange={setIsVehicleFollowPaused}
          onVehicleClick={focusVehicle}
          onReferencePointClick={(id) => {
            clearSelectedVehicle()
            setSelectedReferencePointId(id)
          }}
          onRouteClick={(id) => focusRouteAndRevealMap(id, 'selected')}
          onRequestPermission={requestPermission}
        />
        {mapLoadStatus !== 'ready' ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/5 px-4 text-center pointer-events-none">
            <div className="max-w-sm rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_35px_-28px_rgba(15,23,42,0.6)] backdrop-blur">
              <p className="text-sm font-semibold text-slate-900">Cargando mapa</p>
              <p className="mt-1 text-sm text-slate-600">
                Inicializando el motor de MapLibre y cargando estilos base.
              </p>
            </div>
          </div>
        ) : null}""",
    content
)

# Remove useEffectEvent from imports
content = content.replace('\n  useEffectEvent,', '')

with open('src/features/map/components/PassengerMapView.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
