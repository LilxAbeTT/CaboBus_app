import { createPortal } from 'react-dom'
import { useEffect, useState, type ReactNode } from 'react'
import type { BusRoute, TransportType } from '../../../types/domain'
import type { PassengerRouteGroup } from './passengerMapViewUtils'
import { formatDistanceRange, getTransportTypeLabel } from './passengerMapViewUtils'

function useModalScrollLock() {
  useEffect(() => {
    const { body, documentElement } = document
    const scrollY = window.scrollY
    const previousBodyOverflow = body.style.overflow
    const previousBodyPosition = body.style.position
    const previousBodyTop = body.style.top
    const previousBodyWidth = body.style.width
    const previousBodyTouchAction = body.style.touchAction
    const previousHtmlOverflow = documentElement.style.overflow

    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'
    body.style.touchAction = 'none'
    documentElement.style.overflow = 'hidden'

    return () => {
      body.style.overflow = previousBodyOverflow
      body.style.position = previousBodyPosition
      body.style.top = previousBodyTop
      body.style.width = previousBodyWidth
      body.style.touchAction = previousBodyTouchAction
      documentElement.style.overflow = previousHtmlOverflow
      window.scrollTo({ top: scrollY, left: 0, behavior: 'auto' })
    }
  }, [])
}

function ModalPortal({ children }: { children: ReactNode }) {
  if (typeof document === 'undefined') return null
  return createPortal(children, document.body)
}

function ModalFrame({
  ariaLabel,
  onClose,
  children,
  className = 'panel w-full max-w-md px-5 py-5',
}: {
  ariaLabel: string
  onClose: () => void
  children: ReactNode
  className?: string
}) {
  useModalScrollLock()

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[1400] flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-[2px] sm:p-4 sm:items-center"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          className={className}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </ModalPortal>
  )
}

export function PassengerMapEmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <section className="panel px-4 py-5 sm:px-6 sm:py-6">
      <p className="eyebrow">Mapa</p>
      <h2 className="mt-3 font-display text-xl text-slate-900 sm:text-2xl">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
    </section>
  )
}

export function PassengerMapInfoModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalFrame ariaLabel="Ayuda del mapa" onClose={onClose}>
      <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200 sm:hidden" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Ayuda</p>
          <h2 className="mt-2 font-display text-2xl text-slate-900">Como usar el mapa</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          aria-label="Cerrar ayuda"
        >
          X
        </button>
      </div>

      <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
        <p>Abre Rutas si prefieres explorar la lista en lugar del mapa.</p>
        <p>Usa el boton de ubicacion para centrarte y sugerir rutas cercanas.</p>
        <p>Pellizca sobre el mapa para acercar o alejar la vista.</p>
      </div>
    </ModalFrame>
  )
}

export function PassengerRouteInfoModal({
  route,
  onClose,
}: {
  route: BusRoute
  onClose: () => void
}) {
  const routeDetails = route.passengerInfo
  const [showLandmarks, setShowLandmarks] = useState(false)
  const hasSchedule = Boolean(
    routeDetails.startTime || routeDetails.endTime || routeDetails.frequency,
  )
  const hasLandmarks = routeDetails.landmarks.length > 0

  return (
    <ModalFrame
      ariaLabel={`Informacion de ${route.name}`}
      onClose={onClose}
      className="panel max-h-[88svh] w-full max-w-lg overflow-hidden rounded-t-[1.8rem] rounded-b-none px-5 py-5 sm:max-h-[82svh] sm:rounded-[1.8rem]"
    >
      <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200 sm:hidden" />
      <div className="flex max-h-[calc(88svh-2rem)] flex-col overflow-hidden sm:max-h-[calc(82svh-2rem)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Ruta</p>
            <h2 className="mt-2 font-display text-2xl text-slate-900">{route.name}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {getTransportTypeLabel(route.transportType)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            aria-label="Cerrar informacion de ruta"
          >
            X
          </button>
        </div>

        <div className="mt-4 overflow-y-auto overscroll-contain pr-1">
          <div className="rounded-[1.2rem] border border-slate-200 bg-slate-50 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-700">
              Trayecto
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{routeDetails.summary}</p>
          </div>

          {hasSchedule ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {routeDetails.startTime ? (
                <div className="rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Inicio
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {routeDetails.startTime}
                  </p>
                </div>
              ) : null}
              {routeDetails.endTime ? (
                <div className="rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Finaliza
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {routeDetails.endTime}
                  </p>
                </div>
              ) : null}
              {routeDetails.frequency ? (
                <div className="rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Frecuencia
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {routeDetails.frequency}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {hasLandmarks ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowLandmarks((current) => !current)}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700"
              >
                {showLandmarks ? 'Ocultar colonias y puntos' : 'Ver colonias y puntos'}
              </button>

              {showLandmarks ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {routeDetails.landmarks.map((stop) => (
                    <span
                      key={stop}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
                    >
                      {stop}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </ModalFrame>
  )
}

export function PassengerRoutePickerModal({
  isOpen,
  activeTransportType,
  routeGroups,
  selectedRouteId,
  routeSearchTerm,
  routeDistanceById,
  vehicleStatsByRoute,
  showOnlyRoutesWithVisibleVehicles,
  onClose,
  onRouteSearchTermChange,
  onToggleShowOnlyRoutesWithVisibleVehicles,
  onTransportTypeChange,
  onRouteSelect,
  onClearSelection,
  onClearSearch,
}: {
  isOpen: boolean
  activeTransportType: TransportType
  routeGroups: PassengerRouteGroup[]
  selectedRouteId: string | null
  routeSearchTerm: string
  routeDistanceById: Map<string, number | null>
  vehicleStatsByRoute: Map<string, { visible: number; stopped: number }>
  showOnlyRoutesWithVisibleVehicles: boolean
  onClose: () => void
  onRouteSearchTermChange: (value: string) => void
  onToggleShowOnlyRoutesWithVisibleVehicles: () => void
  onTransportTypeChange: (transportType: TransportType) => void
  onRouteSelect: (routeId: string) => void
  onClearSelection: () => void
  onClearSearch: () => void
}) {
  if (!isOpen) {
    return null
  }

  const activeGroup =
    routeGroups.find((group) => group.transportType === activeTransportType) ??
    routeGroups[0] ??
    null

  return (
    <ModalFrame
      ariaLabel="Seleccionar ruta"
      onClose={onClose}
      className="panel max-h-[92svh] w-full max-w-xl overflow-hidden rounded-t-[1.8rem] rounded-b-none px-4 py-4 sm:max-h-[84svh] sm:rounded-[1.8rem] sm:px-5 sm:py-5"
    >
      <div className="mx-auto mb-3 h-1.5 w-14 rounded-full bg-slate-200 sm:hidden" />
      <div className="flex max-h-[calc(92svh-2rem)] flex-col overflow-hidden sm:max-h-[calc(84svh-2rem)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Rutas</p>
            <h2 className="mt-2 font-display text-2xl text-slate-900">
              Elige una ruta
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              El fondo ya no se mueve mientras exploras esta lista.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            aria-label="Cerrar selector de ruta"
          >
            X
          </button>
        </div>

        <div className="mt-4 inline-flex rounded-full bg-slate-100 p-1">
          {routeGroups.map((group) => (
            <button
              key={group.transportType}
              type="button"
              onClick={() => onTransportTypeChange(group.transportType)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                group.transportType === activeTransportType
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {group.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          <label className="block">
            <span className="sr-only">Buscar ruta</span>
            <input
              type="text"
              value={routeSearchTerm}
              onChange={(event) => onRouteSearchTermChange(event.target.value)}
              placeholder="Buscar ruta, colonia o punto clave"
              className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-teal-400"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onToggleShowOnlyRoutesWithVisibleVehicles}
              className={`inline-flex min-h-10 items-center justify-center rounded-full px-4 text-sm font-semibold transition ${
                showOnlyRoutesWithVisibleVehicles
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {showOnlyRoutesWithVisibleVehicles
                ? 'Solo rutas con unidades visibles'
                : 'Mostrar solo rutas con unidades visibles'}
            </button>

            {routeSearchTerm ? (
              <button
                type="button"
                onClick={onClearSearch}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Limpiar busqueda
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 overflow-y-auto overscroll-contain pr-1">
          <div className="space-y-3">
            {activeGroup?.routes.map((route) => {
              const isSelected = route.id === selectedRouteId
              const routeStats = vehicleStatsByRoute.get(route.id) ?? { visible: 0, stopped: 0 }
              const distanceMeters = routeDistanceById.get(route.id) ?? null

              return (
                <button
                  key={route.id}
                  type="button"
                  onClick={() => onRouteSelect(route.id)}
                  className={`w-full rounded-[1.3rem] border bg-white px-4 py-4 text-left shadow-sm transition ${
                    isSelected
                      ? 'border-slate-900 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.6)]'
                      : 'border-slate-200 hover:border-teal-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <span
                        className="block h-2.5 w-14 rounded-full"
                        style={{ backgroundColor: route.color }}
                      />
                      <span className="mt-3 block font-display text-lg text-slate-900">
                        {route.name}
                      </span>
                      <span className="mt-2 line-clamp-2 block text-sm leading-6 text-slate-600">
                        {route.passengerInfo.summary}
                      </span>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {distanceMeters === null
                        ? `${routeStats.visible} activas`
                        : distanceMeters <= 600
                          ? 'Cerca'
                          : formatDistanceRange(distanceMeters)}
                    </span>
                  </div>
                </button>
              )
            })}

            {activeGroup && activeGroup.routes.length === 0 ? (
              <div className="w-full rounded-[1.25rem] border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-slate-500">
                No hay rutas disponibles con los filtros actuales.
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClearSelection}
            className="text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            Ver mapa general
          </button>
          <p className="text-xs text-slate-500">Toca una ruta para enfocarla.</p>
        </div>
      </div>
    </ModalFrame>
  )
}
