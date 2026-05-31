import { memo, useState } from 'react'
import type { BusRoute, TransportType } from '../../../types/domain'
import type { PassengerGeolocationPermissionState } from '../hooks/usePassengerGeolocation'

import type {
  PassengerLocationStatusCopy,
  PassengerQuickRouteEntry,
  PassengerRouteDistanceEntry,
  PassengerRouteGroup,
} from './passengerMapViewUtils'
import {
  formatDistanceRange,
  getTransportTypeLabel,
} from './passengerMapViewUtils'

function SparkIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" />
      <path d="M5 16l.9 2.1L8 19l-2.1.9L5 22l-.9-2.1L2 19l2.1-.9L5 16Z" />
    </svg>
  )
}


function LocationIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s5-4.4 5-9a5 5 0 1 0-10 0c0 4.6 5 9 5 9Z" />
      <circle cx="12" cy="12" r="1.8" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className || "h-5 w-5"} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6"/>
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={className || "h-5 w-5"} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  )
}


function ArrowIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </svg>
  )
}


function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3.8 2.5 5.07 5.6.81-4.05 3.94.96 5.57L12 16.53 6.99 19.2l.96-5.57L3.9 9.68l5.6-.81L12 3.8Z" />
    </svg>
  )
}

export const PassengerMapSidebar = memo(function PassengerMapSidebar({
  isRealtimeEnabled,
  routeGroups,
  activeTransportType,
  activeRouteGroup,
  hasTransportTypeFilter,
  recommendedRoute,
  nearbyRoutes,
  permissionState,
  locationStatusCopy,
  selectedRoute,
  routeDistanceById,
  vehicleStatsByRoute,
  routeSearchTerm,
  showOnlyRoutesWithVisibleVehicles,
  canResetView,
  onRequestPermission,
  onFocusRecommended,
  onRouteSearchTermChange,
  onClearSearch,
  onToggleShowOnlyRoutesWithVisibleVehicles,
  onTransportTypeChange,
  onResetView,
  onToggleRoute,
  favoriteRouteIds,
  onToggleFavoriteRoute,
}: {
  isRealtimeEnabled: boolean
  routeGroups: PassengerRouteGroup[]
  activeTransportType: TransportType
  activeRouteGroup: PassengerRouteGroup | null
  hasTransportTypeFilter: boolean
  recommendedRoute: PassengerRouteDistanceEntry | null
  nearbyRoutes: PassengerQuickRouteEntry[]
  permissionState: PassengerGeolocationPermissionState
  locationStatusCopy: PassengerLocationStatusCopy
  selectedRoute: BusRoute | null
  routeDistanceById: Map<string, number | null>
  vehicleStatsByRoute: Map<string, { visible: number; stopped: number }>
  routeSearchTerm: string
  showOnlyRoutesWithVisibleVehicles: boolean
  canResetView: boolean
  onRequestPermission: () => void
  onFocusRecommended: () => void
  onRouteSearchTermChange: (value: string) => void
  onClearSearch: () => void
  onToggleShowOnlyRoutesWithVisibleVehicles: () => void
  onTransportTypeChange: (transportType: TransportType) => void
  onResetView: () => void
  onToggleRoute: (routeId: string) => void
  favoriteRouteIds: Set<string>
  onToggleFavoriteRoute: (routeId: string) => void
}) {
  const recommendedRouteDetails = permissionState === 'granted' ? recommendedRoute : null
  const hasRecommendedRoute = recommendedRouteDetails !== null

  const recommendedDistanceLabel =
    recommendedRouteDetails?.distanceMeters !== null && recommendedRouteDetails
      ? recommendedRouteDetails.distanceMeters <= 600
        ? 'Muy cerca de ti'
        : formatDistanceRange(recommendedRouteDetails.distanceMeters)
      : null
  const featuredRoute = selectedRoute ?? recommendedRouteDetails?.route ?? null
  const featuredDistanceMeters = featuredRoute
    ? routeDistanceById.get(featuredRoute.id) ?? null
    : null
  const featuredDistanceLabel =
    recommendedDistanceLabel ??
    (featuredDistanceMeters === null
      ? null
      : featuredDistanceMeters <= 600
        ? 'Muy cerca de ti'
        : formatDistanceRange(featuredDistanceMeters))
  const [openSuggestedLandmarksRouteId, setOpenSuggestedLandmarksRouteId] = useState<string | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const isSuggestedLandmarksOpen =
    featuredRoute !== null && openSuggestedLandmarksRouteId === featuredRoute.id

  const [touchStartY, setTouchStartY] = useState<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null) return
    const currentY = e.touches[0].clientY
    const diff = currentY - touchStartY
    if (diff > 40) {
      setIsMinimized(true)
      setTouchStartY(null)
    } else if (diff < -40) {
      setIsMinimized(false)
      setTouchStartY(null)
    }
  }

  const handleTouchEnd = () => {
    setTouchStartY(null)
  }

  return (
    <section className={`absolute bottom-0 left-0 right-0 z-[1200] flex max-h-[45vh] flex-col rounded-t-[1.5rem] bg-white/95 pb-4 pt-2 shadow-[0_-8px_30px_-12px_rgba(15,23,42,0.15)] backdrop-blur-md sm:bottom-4 sm:left-4 sm:right-auto sm:w-[380px] sm:max-h-none sm:rounded-2xl sm:pt-4 pointer-events-auto transition-transform duration-300 ease-in-out ${isMinimized ? 'translate-y-[calc(100%-1.75rem)] sm:translate-y-0' : 'translate-y-0'}`}>
      <div 
        className="mx-auto flex h-6 w-full items-center justify-center cursor-pointer sm:hidden"
        onClick={() => setIsMinimized(!isMinimized)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        aria-label={isMinimized ? "Expandir" : "Minimizar"}
      >
        <div className="h-1.5 w-12 rounded-full bg-slate-300 transition-colors hover:bg-slate-400" />
      </div>
      <div className={`flex-1 overflow-y-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isMinimized ? 'opacity-0 sm:opacity-100 transition-opacity' : 'opacity-100 transition-opacity'}`}>
        
        {featuredRoute ? (
          <div className="rounded-[1rem] border border-slate-100 bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="h-1.5 w-full" style={{ backgroundColor: featuredRoute.color }} />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {getTransportTypeLabel(featuredRoute.transportType)}
                  </span>
                  <h2 className="mt-0.5 truncate font-display text-xl font-semibold text-slate-900">
                    {featuredRoute.name}
                  </h2>
                  
                  <p className="mt-1 text-xs leading-5 text-slate-600 line-clamp-2">
                    {featuredRoute.passengerInfo.summary}
                  </p>

                  {(featuredRoute.passengerInfo.frequency || (featuredRoute.passengerInfo.startTime && featuredRoute.passengerInfo.endTime)) && (
                    <p className="mt-2 text-[11px] font-medium text-slate-500 bg-slate-50 inline-block px-2 py-1 rounded-md">
                      {[
                        featuredRoute.passengerInfo.frequency ? `Cada ${featuredRoute.passengerInfo.frequency}` : null,
                        featuredRoute.passengerInfo.startTime && featuredRoute.passengerInfo.endTime ? `${featuredRoute.passengerInfo.startTime} - ${featuredRoute.passengerInfo.endTime}` : null,
                      ].filter(Boolean).join(' • ')}
                    </p>
                  )}
                </div>
                {featuredDistanceLabel && (
                  <div className="flex flex-col items-end text-right ml-2 shrink-0">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Distancia</span>
                    <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded mt-1">{featuredDistanceLabel}</span>
                  </div>
                )}
              </div>

              {featuredRoute.passengerInfo.landmarks.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setOpenSuggestedLandmarksRouteId((current) =>
                      current === featuredRoute.id ? null : featuredRoute.id
                    )
                  }
                  className="mt-3 flex w-full items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                >
                  <span>Colonias y puntos de referencia</span>
                  <div className={`transition-transform duration-200 ${isSuggestedLandmarksOpen ? 'rotate-180' : ''}`}>
                    <ChevronDownIcon className="h-4 w-4" />
                  </div>
                </button>
              )}

              {isSuggestedLandmarksOpen && featuredRoute.passengerInfo.landmarks.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {featuredRoute.passengerInfo.landmarks.map((landmark) => (
                    <span
                      key={landmark}
                      className="rounded bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600"
                    >
                      {landmark}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-[1rem] border border-slate-100 bg-white p-3 shadow-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              <SparkIcon /> {hasTransportTypeFilter ? 'Explorar rutas' : 'Ruta cercana'}
            </span>
            <h2 className="mt-2 font-display text-lg text-slate-900">
              {locationStatusCopy.title}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {locationStatusCopy.description}
            </p>
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2">
          {hasRecommendedRoute && !selectedRoute ? (
            <button
              type="button"
              onClick={onFocusRecommended}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-teal-700"
            >
              Ver ruta cercana
              <ArrowIcon />
            </button>
          ) : null}

          {permissionState !== 'granted' && permissionState !== 'unsupported' ? (
            <button
              type="button"
              onClick={onRequestPermission}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              <LocationIcon />
              Activar mi ubicación
            </button>
          ) : null}
        </div>
      </div>

      {nearbyRoutes.length > 0 && !selectedRoute ? (
        <section className="mt-3 rounded-[1rem] border border-slate-100 bg-slate-50/50 p-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Rutas cercanas
            </p>
          </div>
          <div className="mt-2 grid gap-2">
            {nearbyRoutes.map((entry) => {
              return (
                <button
                  key={entry.route.id}
                  type="button"
                  onClick={() => onToggleRoute(entry.route.id)}
                  className="rounded-xl border border-white bg-white px-3 py-2 text-left shadow-sm transition hover:border-teal-300 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span
                      className="block h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: entry.route.color }}
                    />
                    <p className="truncate text-sm font-medium text-slate-900">{entry.route.name}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-medium text-slate-500">
                    {entry.distanceMeters === null
                      ? ''
                      : entry.distanceMeters <= 600
                        ? 'Cerca'
                        : formatDistanceRange(entry.distanceMeters)}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {!selectedRoute && (
        <div className="mt-4 flex flex-col gap-3 rounded-[1rem] bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <label className="flex-1 block">
              <span className="sr-only">Buscar ruta</span>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={routeSearchTerm}
                  onChange={(event) => onRouteSearchTermChange(event.target.value)}
                  placeholder="Buscar colonia..."
                  className="w-full rounded-xl border-none bg-white py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-teal-400"
                />
              </div>
            </label>
            <button
              type="button"
              onClick={onResetView}
              disabled={!canResetView}
              className="shrink-0 text-xs font-semibold text-slate-400 transition hover:text-slate-700 disabled:opacity-50 px-2"
            >
              Ver todo
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-lg bg-slate-200/50 p-1">
              {routeGroups.map((group) => (
                <button
                  key={group.transportType}
                  type="button"
                  onClick={() => onTransportTypeChange(group.transportType)}
                  className={`rounded-md px-3 py-1 text-[11px] font-semibold transition ${
                    group.transportType === activeTransportType
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {group.label}
                </button>
              ))}
            </div>

            <div className="flex gap-1.5">
              {isRealtimeEnabled ? (
                <button
                  type="button"
                  onClick={onToggleShowOnlyRoutesWithVisibleVehicles}
                  className={`inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-[10px] font-semibold uppercase tracking-wide transition ${
                    showOnlyRoutesWithVisibleVehicles
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-white text-slate-500 shadow-sm hover:text-slate-700'
                  }`}
                >
                  Solo activas
                </button>
              ) : null}

              {routeSearchTerm ? (
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="inline-flex h-7 items-center justify-center rounded-lg bg-white px-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 shadow-sm transition hover:text-slate-700"
                >
                  Limpiar
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {selectedRoute && routeGroups.length > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Otras rutas</span>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
            {routeGroups.map((group) => (
              <button
                key={group.transportType}
                type="button"
                onClick={() => onTransportTypeChange(group.transportType)}
                className={`rounded-md px-2.5 py-1 text-[10px] font-semibold transition ${
                  group.transportType === activeTransportType
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {group.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className={`-mx-3 mt-4 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isMinimized ? 'opacity-0 sm:opacity-100 transition-opacity' : 'opacity-100 transition-opacity'}`}>
        <div className="flex snap-x snap-mandatory gap-3">
        {activeRouteGroup?.routes
          .filter(route => route.id !== selectedRoute?.id)
          .map((route) => {
          const routeStats = vehicleStatsByRoute.get(route.id) ?? { visible: 0, stopped: 0 }
          const distanceMeters = routeDistanceById.get(route.id) ?? null
          const distanceLabel =
            distanceMeters === null
              ? null
              : distanceMeters <= 600
                ? 'Cerca de ti'
                : formatDistanceRange(distanceMeters)

          return (
            <article
              key={route.id}
              className="relative min-w-[12rem] max-w-[12rem] snap-start overflow-hidden rounded-[1rem] border border-slate-200 bg-white shadow-sm transition hover:border-teal-300 sm:min-w-[14rem] sm:max-w-[14rem]"
            >
              <div className="absolute left-0 top-0 h-full w-1.5" style={{ backgroundColor: route.color }} />
              <button 
                type="button" 
                onClick={() => onToggleRoute(route.id)}
                className="flex h-full w-full flex-col p-3 pl-4 text-left outline-none"
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <span className="block truncate font-display text-[15px] font-semibold text-slate-900 pr-1">
                    {route.name}
                  </span>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavoriteRoute(route.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        onToggleFavoriteRoute(route.id);
                      }
                    }}
                    className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
                      favoriteRouteIds.has(route.id)
                        ? 'bg-amber-50 text-amber-500'
                        : 'bg-slate-50 text-slate-300 hover:text-amber-500'
                    }`}
                  >
                    <StarIcon filled={favoriteRouteIds.has(route.id)} />
                  </div>
                </div>

                <div className="mt-auto pt-3 flex items-center justify-between text-[10px] font-medium text-slate-500">
                  <div className="flex items-center gap-2">
                    {distanceLabel ? (
                      <span>{distanceLabel}</span>
                    ) : null}
                    {isRealtimeEnabled && routeStats.visible > 0 ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-teal-600">
                        <SparkIcon /> {routeStats.visible}
                      </span>
                    ) : null}
                  </div>
                  <ChevronRightIcon className="h-4 w-4 text-slate-300" />
                </div>
              </button>
            </article>
          )
        })}

        {activeRouteGroup && activeRouteGroup.routes.length === 0 ? (
          <div className="w-full min-w-full rounded-[1.25rem] border border-dashed border-slate-200 bg-white/80 px-4 py-5 text-sm text-slate-500">
            No hay rutas que coincidan con tus filtros actuales.
          </div>
        ) : activeRouteGroup && activeRouteGroup.routes.filter(route => route.id !== selectedRoute?.id).length === 0 ? (
          <div className="w-full min-w-full rounded-[1.25rem] border border-dashed border-slate-200 bg-white/80 px-4 py-5 text-sm text-slate-500">
            No hay más rutas para mostrar.
          </div>
        ) : null}
        </div>
      </div>
    </section>
  )
})