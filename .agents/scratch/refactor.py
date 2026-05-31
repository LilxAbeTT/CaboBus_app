import re
import os

filepath = 'src/features/map/components/PassengerMapView.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add imports
import_addition = """
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
import { PassengerMapCanvas, type PassengerMapCanvasHandle } from './PassengerMapCanvas'
"""
content = content.replace("import {\n  decorateVehiclesWithRouteMeta,", import_addition + "\nimport {\n  decorateVehiclesWithRouteMeta,")

# 2. Remove GeoJSON imports/types/functions
# They start from "import type {\n  GeoJSONSource," down to "const PASSENGER_MAP_REALTIME_ENABLED = false\n"
content = re.sub(r"import type \{\n  GeoJSONSource,[\s\S]*?from 'maplibre-gl'\n", "", content)
content = re.sub(r"const ROUTES_SOURCE_ID = 'passenger-map-routes'[\s\S]*?const PASSENGER_MAP_FOLLOW_RESUME_DELAY_MS = 3_000\n", "", content)
content = re.sub(r"type RouteFeatureProperties = \{[\s\S]*?function createReferencePointPopupHtml.*?<\/div>\\n  \`\.trim\(\)\n\}", "", content)

# 3. Replace massive hooks inside PassengerMapContent
# We replace the refs definition area
refs_regex = r"const mapContainerRef = useRef<HTMLDivElement \| null>\(null\)[\s\S]*?const showPinchHint = mapLoadStatus === 'ready' && shouldShowPinchHint"
new_refs = """const mapCanvasRef = useRef<PassengerMapCanvasHandle>(null)
  const [isVehicleFollowPaused, setIsVehicleFollowPaused] = useState(false)
  const showPinchHint = mapLoadStatus === 'ready' && shouldShowPinchHint

  const handleMapLoadStatusChange = useCallback((status: 'loading' | 'ready' | 'error', error: string | null = null) => {
    setMapLoadStatus(status)
    setMapLoadError(error)
  }, [])"""
content = re.sub(refs_regex, new_refs, content)

# 4. Replace clearFollowResumeTimeout and clearSelectedVehicle
clear_funcs = r"const clearFollowResumeTimeout = useCallback\(\(\) => \{[\s\S]*?\}, \[clearFollowResumeTimeout\]\)"
new_clear = """const clearSelectedVehicle = useCallback(() => {
    setIsVehicleFollowPaused(false)
    setSelectedVehicleId(null)
  }, [])"""
content = re.sub(clear_funcs, new_clear, content)

# 5. runProgrammaticMapMove
run_move = r"const runProgrammaticMapMove = useCallback\([\s\S]*?\}, \[\]\)"
new_run_move = """const runProgrammaticMapMove = useCallback(
    (transition: (map: any) => void) => {
      mapCanvasRef.current?.runProgrammaticMapMove(transition)
    },
    [],
  )"""
content = re.sub(run_move, new_run_move, content)

# 6. Remove openVehiclePopup and openReferencePointPopup
content = re.sub(r"const openVehiclePopup = useCallback\(\(vehicle: PassengerMapVehicleView\) => \{[\s\S]*?\}, \[\]\)", "", content)
content = re.sub(r"const openReferencePointPopup = useCallback\(\(referencePoint: PassengerMapReferencePoint\) => \{[\s\S]*?\}, \[\]\)", "", content)

# 7. Remove the layer click handlers and handleMapMoveEnd
handlers = r"const handleVehicleLayerClick = useEffectEvent\(\(event: MapLayerMouseEvent\) => \{[\s\S]*?const handleUserMapMoveStart = useEffectEvent\(\(\) => \{[\s\S]*?\}\)"
content = re.sub(handlers, "", content)

# 8. Remove the massive Maplibre useEffect blocks
use_effects = r"useEffect\(\(\) => \{\n    if \(!mapContainerRef\.current \|\| mapRef\.current\) return[\s\S]*?zoom: 15, duration: 0\.55, \}\)\n    \}\)\n  \}, \[\n    centerOnUserRequestCount,\n    mapLoadStatus,\n    requestPermission,\n    runProgrammaticMapMove,\n    userPosition,\n  \]\)"
content = re.sub(use_effects, "", content)

# 9. Update the JSX for map rendering
jsx_map = r"<div ref=\{mapContainerRef\} className=\"!absolute inset-0 z-0 h-full w-full\" \/>[\s\S]*?\{mapLoadStatus !== 'ready' \? \([\s\S]*?\) : null\}"
new_jsx = """<PassengerMapCanvas
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
        ) : null}"""
content = re.sub(jsx_map, new_jsx, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
